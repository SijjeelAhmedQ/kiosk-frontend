/**
 * The Realtime protocol, one class.
 *
 * It owns the socket to the relay, the microphone, and the loop the whole
 * feature turns on:
 *
 *     speech ──▶ model ──▶ function_call ──▶ tool runs here in the page
 *                                              │
 *          spoken confirmation ◀── model ◀── function_call_output
 *
 * Nothing above this line knows about WebSockets or PCM; nothing below it knows
 * about carts or coupons. The app supplies `tools` and an instruction string,
 * and gets back status, a transcript, and a list of what was done.
 *
 * Turn-taking is the server's job — `turn_detection` on the session means
 * OpenAI decides when the customer has stopped talking, which is far better
 * than a push-to-talk button at a Friends Kitchen terminal where people trail off mid-sentence.
 */

import { VoiceAudio } from './audio';
import type {
  VoiceSessionClient,
  VoiceSessionConfig,
  VoiceSessionHandlers,
  VoiceTool,
} from './types';

/** Server event names changed at GA and the old ones still appear in older
 *  docs and SDK samples. Accepting both costs one array and removes a class of
 *  "the mic works but nothing plays" bug reports. */
const AUDIO_DELTA = ['response.output_audio.delta', 'response.audio.delta'];
const TRANSCRIPT_DELTA = [
  'response.output_audio_transcript.delta',
  'response.audio_transcript.delta',
];

export class RealtimeVoiceSession implements VoiceSessionClient {
  private socket: WebSocket | null = null;
  private audio: VoiceAudio | null = null;
  private closing = false;
  /** Set once the session is beyond saving, so the teardown that follows does
   *  not overwrite the reason with a cheerful "idle". */
  private failed = false;

  /** Tools are re-read on every call, never captured: the executors close over
   *  React state, and a session that outlives a render must not keep calling
   *  yesterday's closure. `useVoiceSession` swaps this on each render. */
  private tools: VoiceTool[];

  /** The assistant message being spoken, so an interruption can truncate the
   *  right conversation item rather than the last one of any kind. */
  private speakingItemId: string | null = null;

  private assistantText = '';
  private assistantTurnId: string | null = null;

  /** True once `session.update` has gone up, so typed input has somewhere to land. */
  private configured = false;
  /** Typed while the socket was still opening — see the pipeline client. */
  private pendingText: string[] = [];

  constructor(
    private readonly config: VoiceSessionConfig,
    private readonly handlers: VoiceSessionHandlers,
  ) {
    this.tools = config.tools;
  }

  /** Point the session at a fresh set of executors (same definitions). */
  setTools(tools: VoiceTool[]): void {
    this.tools = tools;
  }

  /** End the session with a reason the UI can show. */
  private fail(message: string): void {
    this.failed = true;
    this.handlers.onError(message);
    this.handlers.onStatus('error');
  }

  async start({ microphone = true }: { microphone?: boolean } = {}): Promise<void> {
    this.closing = false;
    this.failed = false;
    this.configured = false;
    this.handlers.onStatus('connecting');

    this.audio = new VoiceAudio({
      onChunk: (audio) => this.send({ type: 'input_audio_buffer.append', audio }),
      onSpeakingChange: (speaking) => {
        if (speaking) this.handlers.onStatus('speaking');
        else if (!this.closing) this.handlers.onStatus('listening');
      },
    });

    // The speaker first, and on its own: it needs no permission, so a refused
    // microphone leaves a session that still takes typed orders and still
    // answers out loud, rather than no session at all.
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
      // 4401/4402/4403 are the relay's own codes — it has already sent a
      // `relay.error` explaining itself, so do not talk over it.
      if (event.code >= 4400 && event.code <= 4403) this.failed = true;
      else this.fail('The voice session ended unexpectedly.');
      void this.stop();
    };
  }

  async stop(): Promise<void> {
    this.closing = true;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    await this.audio?.stop();
    this.audio = null;
    this.speakingItemId = null;
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

  /**
   * Order in writing.
   *
   * A text item in the same conversation the audio goes into, so the model
   * carries one thread either way — a customer can say "two burgers" and then
   * type "no onions" and be understood.
   */
  sendText(text: string): void {
    const typed = text.trim();
    if (!typed) return;

    // Typing over a reply is interrupting it, exactly as talking over it is.
    if (this.speakingItemId) {
      const playedMs = this.audio?.interrupt() ?? 0;
      this.send({
        type: 'conversation.item.truncate',
        item_id: this.speakingItemId,
        content_index: 0,
        audio_end_ms: playedMs,
      });
      this.speakingItemId = null;
    }

    // Shown from here rather than waiting for the server to echo it: the
    // customer typed it, so a bubble a round trip late reads as lag.
    this.handlers.onTurn({
      id: `typed-${Date.now()}`,
      role: 'user',
      text: typed,
      done: true,
    });

    if (!this.configured) {
      this.pendingText.push(typed);
      this.handlers.onStatus('connecting');
      return;
    }

    this.pushText(typed);
    this.send({ type: 'response.create' });
    this.handlers.onStatus('thinking');
  }

  /** Add a typed line to the conversation without asking for an answer yet. */
  private pushText(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
  }

  /**
   * Put something in front of the model and have it speak.
   *
   * Used for events the customer did not cause — an errand finishing, an order
   * being rejected — so the voice can mention them without being asked.
   */
  say(context: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{ type: 'input_text', text: context }],
      },
    });
    this.send({ type: 'response.create' });
  }

  private send(event: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  /** The session's opening statement: who it is, what it can do, how to listen. */
  private configureSession(): void {
    this.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: this.config.instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            // Server-side VAD rather than push-to-talk: people at a Friends Kitchen terminal pause
            // mid-order ("I'll have… a Big Mac"), and a button would cut them
            // off. `create_response` lets the model answer the moment they
            // finish, with no round trip to decide that it should.
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,
              create_response: true,
              interrupt_response: true,
            },
            // Only so the on-screen transcript can show what was heard. The
            // model itself works from the audio, not from this text.
            //
            // gpt-4o-transcribe rather than whisper-1: whisper takes no useful
            // steer on which script to write, and it labels Urdu as Hindi often
            // enough that a customer speaking Urdu watches Devanagari appear.
            // This one follows `prompt`, which is where that instruction goes.
            transcription: {
              model: 'gpt-4o-transcribe',
              ...(this.config.transcriptionPrompt
                ? { prompt: this.config.transcriptionPrompt }
                : {}),
            },
          },
          output: {
            format: { type: 'audio/pcm', rate: 24000 },
            ...(this.config.voice ? { voice: this.config.voice } : {}),
          },
        },
        tools: this.tools.map(({ name, description, parameters }) => ({
          type: 'function',
          name,
          description,
          parameters,
        })),
        tool_choice: 'auto',
      },
    });
    this.configured = true;

    // Someone who typed while this was connecting has already said what they
    // want. Greeting them first and answering second is one turn too many.
    if (this.pendingText.length) {
      const queued = this.pendingText;
      this.pendingText = [];
      // All the lines, then one answer: asking after each would have it reply
      // to "a burger" before it has read "and no pickles".
      for (const text of queued) this.pushText(text);
      this.send({ type: 'response.create' });
      this.handlers.onStatus('thinking');
      return;
    }

    if (this.config.greeting) {
      this.send({
        type: 'response.create',
        response: { instructions: `Greet the customer: ${this.config.greeting}` },
      });
    }
  }

  private receive(raw: string): void {
    let event: any;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    const type: string = event.type ?? '';

    // ---- the relay's own two messages ------------------------------------
    if (type === 'relay.ready') return;
    if (type === 'relay.error') {
      this.fail(event.message ?? 'The voice service refused the session.');
      return;
    }

    // ---- session lifecycle ------------------------------------------------
    if (type === 'session.created') {
      this.configureSession();
      this.handlers.onStatus('listening');
      return;
    }

    if (type === 'error') {
      // An API-level error is usually one bad field in session.update, and the
      // session survives it — so this reports without tearing anything down.
      const message = event.error?.message ?? 'The voice model reported an error.';
      console.error('[voice] realtime error', event.error);
      this.handlers.onError(message);
      return;
    }

    // ---- the customer talking --------------------------------------------
    if (type === 'input_audio_buffer.speech_started') {
      this.handlers.onStatus('hearing');
      // Barge-in. The model stops generating on its own; this stops the audio
      // already queued locally, and tells it how much of the sentence was
      // actually heard so its memory of the conversation matches the room's.
      const playedMs = this.audio?.interrupt() ?? 0;
      if (this.speakingItemId) {
        this.send({
          type: 'conversation.item.truncate',
          item_id: this.speakingItemId,
          content_index: 0,
          audio_end_ms: playedMs,
        });
        this.speakingItemId = null;
      }
      return;
    }

    if (type === 'input_audio_buffer.speech_stopped') {
      this.handlers.onStatus('thinking');
      return;
    }

    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = (event.transcript ?? '').trim();
      if (text) {
        this.handlers.onTurn({ id: event.item_id, role: 'user', text, done: true });
      }
      return;
    }

    // ---- Friends Kitchen talking ------------------------------------------------
    if (type === 'response.output_item.added' && event.item?.type === 'message') {
      this.speakingItemId = event.item.id;
      this.assistantTurnId = event.item.id;
      this.assistantText = '';
      return;
    }

    if (AUDIO_DELTA.includes(type)) {
      this.audio?.play(event.delta);
      return;
    }

    if (TRANSCRIPT_DELTA.includes(type)) {
      this.assistantText += event.delta ?? '';
      this.handlers.onTurn({
        id: this.assistantTurnId ?? event.item_id,
        role: 'assistant',
        text: this.assistantText,
        done: false,
      });
      return;
    }

    if (type === 'response.done') {
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
      void this.runToolCalls(event.response?.output ?? []);
    }
  }

  /**
   * Run whatever the model asked for and report back.
   *
   * `response.done` carries the finished call — name, arguments and `call_id`
   * complete — which is why the streaming `response.function_call_arguments.*`
   * events are ignored: acting on both would run every tool twice.
   *
   * Calls run in order, not in parallel. "Two burgers and remove the fries"
   * arrives as two calls whose order is the customer's intent, and a cart is
   * exactly the sort of state that will not survive them landing backwards.
   */
  private async runToolCalls(output: any[]): Promise<void> {
    const calls = output.filter((item) => item?.type === 'function_call');
    if (!calls.length) return;

    this.handlers.onStatus('thinking');

    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        // A model that emits invalid JSON gets told so; it repairs the call
        // far more often than it repeats the mistake.
        this.reportResult(call.call_id, { ok: false, error: 'Arguments were not valid JSON.' });
        this.handlers.onAction({
          callId: call.call_id,
          name: call.name,
          arguments: {},
          ok: false,
          detail: 'Bad arguments',
        });
        continue;
      }

      this.handlers.onAction({
        callId: call.call_id,
        name: call.name,
        arguments: args,
        ok: null,
        detail: null,
      });

      const tool = this.tools.find((t) => t.name === call.name);
      if (!tool) {
        this.reportResult(call.call_id, { ok: false, error: `No such tool: ${call.name}.` });
        this.handlers.onAction({
          callId: call.call_id,
          name: call.name,
          arguments: args,
          ok: false,
          detail: 'Unknown tool',
        });
        continue;
      }

      try {
        const result = await tool.run(args);
        this.reportResult(call.call_id, result ?? { ok: true });
        this.handlers.onAction({
          callId: call.call_id,
          name: call.name,
          arguments: args,
          ok: true,
          detail: summarize(result),
        });
      } catch (err) {
        // A thrown tool is a failed step, not a failed session: hand the model
        // the reason and let it tell the customer.
        const message = err instanceof Error ? err.message : String(err);
        this.reportResult(call.call_id, { ok: false, error: message });
        this.handlers.onAction({
          callId: call.call_id,
          name: call.name,
          arguments: args,
          ok: false,
          detail: message,
        });
      }
    }

    // One response for the batch: asking after each call makes Friends Kitchen
    // narrate every step of "a burger, fries and a Coke" separately.
    this.send({ type: 'response.create' });
  }

  private reportResult(callId: string, result: unknown): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
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
  if (name === 'NotReadableError') {
    return 'The microphone is in use by another program.';
  }
  return `Could not start the microphone: ${err instanceof Error ? err.message : String(err)}`;
}
