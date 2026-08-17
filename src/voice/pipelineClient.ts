/**
 * The OpenRouter voice session, one class.
 *
 * Same job as `realtimeClient.ts` and the same public surface, over a protocol
 * that is not the same shape at all. The Realtime API is a conversation: one
 * socket, audio flowing both ways, the server deciding whose turn it is.
 * OpenRouter has no such thing, so this path is a loop the page drives:
 *
 *     mic ─▶ VAD ─▶ one utterance ─▶ backend ─▶ transcribe ─▶ chat
 *                                                              │
 *          speaker ◀── PCM ◀── speak ◀── text          function_call
 *                                                              │
 *                                          runs here in the page, result back
 *
 * What lives here and nowhere else on this path:
 *
 * **Turn-taking.** `vad.ts` decides when the customer finished. The Realtime
 * API did that server-side from the audio stream; there is no stream now.
 *
 * **Barge-in.** The reply is already-rendered audio sitting in a local queue,
 * so cutting in is: empty the queue, tell the backend to stop generating. Both
 * happen in the same tick the customer's voice is detected, which is what makes
 * it feel like interrupting a person rather than pressing stop.
 *
 * **The fallback voice.** A TTS call can fail on its own while the socket and
 * the model are fine. Rather than drop that sentence, the browser's own speech
 * synthesiser reads it. It sounds worse; a kiosk that goes silent mid-order is
 * worse still.
 *
 * Nothing above this line knows any of that. `useVoiceSession` builds this or
 * `RealtimeVoiceSession` from one field on the health check and drives them
 * identically.
 */

import { VoiceAudio, samplesToBase64 } from './audio';
import { VoiceDetector } from './vad';
import type {
  VoiceSessionClient,
  VoiceSessionConfig,
  VoiceSessionHandlers,
  VoiceTool,
} from './types';

export class PipelineVoiceSession implements VoiceSessionClient {
  private socket: WebSocket | null = null;
  private audio: VoiceAudio | null = null;
  private vad: VoiceDetector | null = null;

  private closing = false;
  private failed = false;

  /** Re-read on every call, never captured: executors close over React state,
   *  and a session that outlives a render must not call yesterday's closure. */
  private tools: VoiceTool[];

  /** True between committing an utterance and the reply finishing. */
  private awaitingReply = false;
  /** True once the reply has started coming out of the speaker. */
  private playing = false;

  private assistantTurnId: string | null = null;
  private assistantText = '';

  /** True once `session.update` has gone up, so typed input has somewhere to land. */
  private configured = false;
  /**
   * Typed before the socket finished opening.
   *
   * A customer who taps the dock and immediately starts typing is the common
   * case, not the edge one — the window animates in faster than a WebSocket
   * handshake — and dropping that first line is the one failure they would
   * never think to retry.
   */
  private pendingText: string[] = [];
  private typedSeq = 0;

  /**
   * Tool calls arrive as separate socket messages but must run in order:
   * "two burgers and take the fries off" is two calls whose sequence is the
   * customer's intent, and a cart will not survive them landing backwards.
   * Chaining onto one promise is what keeps that true across messages.
   */
  private toolChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: VoiceSessionConfig,
    private readonly handlers: VoiceSessionHandlers,
  ) {
    this.tools = config.tools;
  }

  setTools(tools: VoiceTool[]): void {
    this.tools = tools;
  }

  private fail(message: string): void {
    this.failed = true;
    this.handlers.onError(message);
    this.handlers.onStatus('error');
  }

  private send(event: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  // ------------------------------------------------------------------ //
  // Lifecycle
  // ------------------------------------------------------------------ //

  async start({ microphone = true }: { microphone?: boolean } = {}): Promise<void> {
    this.closing = false;
    this.failed = false;
    this.awaitingReply = false;
    this.playing = false;
    this.configured = false;
    this.handlers.onStatus('connecting');

    this.vad = new VoiceDetector({
      onSpeechStart: () => this.onSpeechStart(),
      onUtterance: (frames) => this.onUtterance(frames),
    });

    this.audio = new VoiceAudio({
      onSamples: (samples) => this.vad?.push(samples),
      onSpeakingChange: (speaking) => this.onSpeakingChange(speaking),
    });

    // The speaker first, and on its own. It needs no permission, so a session
    // that gets this far can always at least answer — which is what makes a
    // refused microphone a degraded session rather than no session.
    try {
      await this.audio.start({ microphone: false });
    } catch (err) {
      this.fail(`Could not start audio: ${err instanceof Error ? err.message : String(err)}`);
      await this.stop();
      return;
    }

    if (microphone) {
      try {
        await this.audio.startMicrophone();
      } catch (err) {
        // Reported, not fatal. The composer still takes a typed order, and
        // saying so is the difference between a broken kiosk and a quieter one.
        this.handlers.onError(`${micProblem(err)} You can still type your order.`);
      }
    }
    this.handlers.onMicChange(this.audio.microphoneOpen);

    const socket = new WebSocket(this.config.url);
    this.socket = socket;

    socket.onmessage = (event) => this.receive(event.data as string);

    socket.onerror = () => {
      if (this.closing) return;
      this.fail('Could not reach the voice service. Is the backend running, and is its port right?');
    };

    socket.onclose = (event) => {
      if (this.closing) return;
      // 4401/4402/4403 are the backend's own codes — it has already sent a
      // `relay.error` explaining itself, so do not talk over it.
      if (event.code >= 4400 && event.code <= 4403) this.failed = true;
      else this.fail('The voice session ended unexpectedly.');
      void this.stop();
    };
  }

  async stop(): Promise<void> {
    this.closing = true;
    window.speechSynthesis?.cancel();

    const socket = this.socket;
    this.socket = null;
    socket?.close();

    await this.audio?.stop();
    this.audio = null;
    this.vad = null;
    this.assistantTurnId = null;
    this.configured = false;
    this.pendingText = [];
    this.handlers.onMicChange(false);
    this.handlers.onStatus(this.failed ? 'error' : 'idle');
  }

  /** Add the microphone to a session that began typed. */
  async startMicrophone(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.startMicrophone();
      this.handlers.onMicChange(true);
    } catch (err) {
      this.handlers.onError(micProblem(err));
      this.handlers.onMicChange(false);
    }
  }

  /** Order in writing. Identical to speaking from the backend's point of view. */
  sendText(text: string): void {
    const typed = text.trim();
    if (!typed) return;

    // Typing over a reply is interrupting it, exactly as talking over it is.
    if (this.playing || this.awaitingReply) {
      this.audio?.interrupt();
      window.speechSynthesis?.cancel();
      this.send({ type: 'response.cancel' });
      this.playing = false;
      this.awaitingReply = false;
      this.assistantTurnId = null;
    }

    // Shown from here rather than echoed back by the server: the customer
    // typed it, so a bubble that appears a round trip later reads as lag.
    this.typedSeq += 1;
    this.handlers.onTurn({
      id: `typed-${this.typedSeq}`,
      role: 'user',
      text: typed,
      done: true,
    });

    if (this.configured) {
      this.send({ type: 'input_text', text: typed });
      this.beginReply();
    } else {
      this.pendingText.push(typed);
      this.handlers.onStatus('connecting');
    }
  }

  /** Put something in front of the model and have it speak — an errand
   *  finishing, an order being rejected. */
  say(context: string): void {
    this.send({ type: 'context', text: context, speak: true });
    this.beginReply();
  }

  private configureSession(): void {
    this.send({
      type: 'session.update',
      session: {
        instructions: this.config.instructions,
        transcription_prompt: this.config.transcriptionPrompt,
        voice: this.config.voice,
        tools: this.tools.map(({ name, description, parameters }) => ({
          name,
          description,
          parameters,
        })),
      },
    });
    this.configured = true;

    // Someone who typed while this was connecting has already said what they
    // want. Greeting them first and answering second is one turn too many.
    if (this.pendingText.length) {
      for (const text of this.pendingText) this.send({ type: 'input_text', text });
      this.pendingText = [];
      this.beginReply();
      return;
    }

    if (this.config.greeting) {
      this.send({
        type: 'response.create',
        instructions: `Greet the customer: ${this.config.greeting}`,
      });
      this.beginReply();
    }
  }

  // ------------------------------------------------------------------ //
  // Turn-taking
  // ------------------------------------------------------------------ //

  /** Stop listening and show that something is happening. */
  private beginReply(): void {
    this.awaitingReply = true;
    this.vad?.setGated(true);
    this.handlers.onStatus('thinking');
  }

  /** Open the microphone again. Called once a reply is finished or abandoned. */
  private endReply(): void {
    this.awaitingReply = false;
    this.vad?.setGated(false);
    if (!this.closing && !this.failed && !this.playing) this.handlers.onStatus('listening');
  }

  private onSpeechStart(): void {
    // Cutting in. The queued audio is already rendered and sitting locally, so
    // it stops here; the backend is told separately to stop writing more.
    if (this.playing || this.awaitingReply) {
      this.audio?.interrupt();
      window.speechSynthesis?.cancel();
      this.send({ type: 'response.cancel' });
      this.playing = false;
      this.awaitingReply = false;
      this.assistantTurnId = null;
    }
    this.handlers.onStatus('hearing');
  }

  private onUtterance(frames: Float32Array[]): void {
    this.send({ type: 'input_audio.commit', audio: samplesToBase64(frames) });
    this.beginReply();
  }

  private onSpeakingChange(speaking: boolean): void {
    this.playing = speaking;
    this.vad?.setEchoing(speaking);

    if (speaking) {
      // Sound coming out means the reply has started, so the microphone can
      // reopen — that reopening is what makes interrupting possible at all.
      this.vad?.setGated(false);
      this.handlers.onStatus('speaking');
      return;
    }

    if (this.closing || this.failed) return;
    this.handlers.onStatus(this.awaitingReply ? 'thinking' : 'listening');
  }

  // ------------------------------------------------------------------ //
  // Inbound
  // ------------------------------------------------------------------ //

  private receive(raw: string): void {
    let event: any;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    switch (event.type as string) {
      case 'relay.ready':
        return;

      case 'relay.error':
        this.fail(event.message ?? 'The voice service refused the session.');
        return;

      case 'session.created':
        this.configureSession();
        if (!this.awaitingReply) this.handlers.onStatus('listening');
        return;

      case 'error':
        // A turn-level failure. The session survives it, so this reports
        // without tearing anything down — but the mic has to reopen, or the
        // customer is left talking to something that stopped listening.
        console.error('[voice] pipeline error', event.message);
        this.handlers.onError(event.message ?? 'The voice service reported a problem.');
        this.endReply();
        return;

      case 'transcript.user':
        this.handlers.onTurn({ id: event.item_id, role: 'user', text: event.text, done: true });
        return;

      case 'transcript.empty':
        // Heard something, made nothing of it. Saying so out loud would talk
        // over a room; going back to listening is the whole response.
        this.endReply();
        return;

      case 'response.started':
        this.assistantTurnId = event.item_id;
        this.assistantText = '';
        return;

      case 'response.text.delta':
        this.assistantText += event.delta ?? '';
        this.handlers.onTurn({
          id: this.assistantTurnId ?? event.item_id,
          role: 'assistant',
          text: this.assistantText,
          done: false,
        });
        return;

      case 'response.audio.delta':
        this.audio?.play(event.delta);
        return;

      case 'response.audio.failed':
        // The sentence exists, the voice for it does not. Read it with the
        // browser's own synthesiser rather than skipping it.
        this.speakLocally(event.text ?? '');
        return;

      case 'response.function_call':
        this.toolChain = this.toolChain.then(() => this.runTool(event));
        return;

      case 'response.done':
        if (this.assistantTurnId && this.assistantText) {
          this.handlers.onTurn({
            id: this.assistantTurnId,
            role: 'assistant',
            text: this.assistantText,
            done: true,
          });
        }
        this.assistantTurnId = null;
        this.assistantText = '';
        this.endReply();
        return;
    }
  }

  // ------------------------------------------------------------------ //
  // Tools
  // ------------------------------------------------------------------ //

  private async runTool(event: any): Promise<void> {
    const callId: string = event.call_id;
    const name: string = event.name;

    let args: Record<string, unknown> = {};
    try {
      args = event.arguments ? JSON.parse(event.arguments) : {};
    } catch {
      // A model that emits invalid JSON gets told so; it repairs the call far
      // more often than it repeats the mistake.
      this.reportResult(callId, { ok: false, error: 'Arguments were not valid JSON.' });
      this.handlers.onAction({ callId, name, arguments: {}, ok: false, detail: 'Bad arguments' });
      return;
    }

    this.handlers.onAction({ callId, name, arguments: args, ok: null, detail: null });

    const tool = this.tools.find((candidate) => candidate.name === name);
    if (!tool) {
      this.reportResult(callId, { ok: false, error: `No such tool: ${name}.` });
      this.handlers.onAction({ callId, name, arguments: args, ok: false, detail: 'Unknown tool' });
      return;
    }

    try {
      const result = await tool.run(args);
      this.reportResult(callId, result ?? { ok: true });
      this.handlers.onAction({
        callId,
        name,
        arguments: args,
        ok: true,
        detail: summarize(result),
      });
    } catch (err) {
      // A thrown tool is a failed step, not a failed session: hand the model
      // the reason and let it tell the customer.
      const message = err instanceof Error ? err.message : String(err);
      this.reportResult(callId, { ok: false, error: message });
      this.handlers.onAction({ callId, name, arguments: args, ok: false, detail: message });
    }
  }

  private reportResult(callId: string, result: unknown): void {
    this.send({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify(result),
    });
  }

  /** The understudy voice, for when the good one is unavailable. */
  private speakLocally(text: string): void {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Slightly quick: this voice is here because something went wrong, and its
    // default pace makes an already-late sentence feel later.
    utterance.rate = 1.05;
    synth.speak(utterance);
  }
}

/** Turn a tool's return value into the one line the UI shows beside it. */
function summarize(result: unknown): string | null {
  if (result == null) return null;
  if (typeof result === 'string') return result.slice(0, 80);
  if (typeof result === 'object') {
    const record = result as Record<string, unknown>;
    for (const key of ['message', 'name', 'summary', 'error']) {
      if (typeof record[key] === 'string') return (record[key] as string).slice(0, 80);
    }
  }
  return null;
}

/** getUserMedia's failures, in words a person at a Friends Kitchen terminal could act on. */
function micProblem(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') {
    return 'Microphone access was blocked. Allow it in the browser and press the mic again.';
  }
  if (name === 'NotFoundError') return 'No microphone was found on this machine.';
  if (name === 'NotReadableError') return 'The microphone is in use by another program.';
  return `Could not start the microphone: ${err instanceof Error ? err.message : String(err)}`;
}
