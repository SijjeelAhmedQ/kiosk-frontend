/**
 * The microphone and the speaker, in the one format the Realtime API speaks:
 * 16-bit signed PCM, mono, 24 kHz, base64 over the socket.
 *
 * Two decisions here are worth knowing before changing anything.
 *
 * **The AudioContext is created at 24 kHz**, not at the hardware's rate. The
 * browser then resamples the microphone on its way into the graph, which is a
 * better resampler than anything worth hand-writing — and it means capture and
 * playback share one clock. `actualRate` is checked anyway: a browser is
 * allowed to refuse the request, and silently sending 48 kHz audio labelled as
 * 24 kHz makes the model hear a chipmunk talking at double speed.
 *
 * **The worklets are built from source strings**, not separate files.
 * `audioWorklet.addModule` takes a URL, and every way of producing that URL
 * from a bundler is a way for the bundler to get it wrong — a blob URL is the
 * one route that behaves identically in `vite dev`, in a production build, and
 * when this file is copied into the other app.
 */

/** What the Realtime API wants, and what everything below assumes. */
export const SAMPLE_RATE = 24_000;

/**
 * Captures 2048 frames (~85 ms) before posting.
 *
 * The graph hands a worklet 128 frames at a time — 5 ms — and posting each one
 * puts ~190 messages a second on the port and ~190 tiny WebSocket frames on the
 * wire. Buffering to 85 ms costs latency nobody can hear and cuts both by 16.
 */
const RECORDER_SOURCE = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.filled++] = channel[i];
      if (this.filled === this.buffer.length) {
        // Transfer a copy: the buffer keeps filling the moment this returns.
        const chunk = this.buffer.slice(0);
        this.port.postMessage(chunk, [chunk.buffer]);
        this.filled = 0;
      }
    }
    return true;
  }
}
registerProcessor('fk-recorder', RecorderProcessor);
`;

/**
 * Plays a queue of chunks gaplessly, and can be emptied on the instant.
 *
 * Emptying is the whole reason this is a worklet rather than a chain of
 * AudioBufferSourceNodes: when the customer interrupts, the sentence the kiosk
 * is halfway through has to stop *now*, and scheduled source nodes are already
 * committed to the audio clock.
 */
const PLAYER_SOURCE = `
class PlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.speaking = false;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data === 'clear') {
        this.queue = [];
        this.offset = 0;
      } else {
        this.queue.push(data);
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];
    let written = 0;

    while (written < output.length && this.queue.length) {
      const chunk = this.queue[0];
      const take = Math.min(output.length - written, chunk.length - this.offset);
      output.set(chunk.subarray(this.offset, this.offset + take), written);
      written += take;
      this.offset += take;
      if (this.offset === chunk.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }

    // Anything not filled stays silent, which is what an empty queue sounds
    // like. Tell the main thread when that changes so the UI can drop out of
    // its "speaking" state exactly when the sound stops.
    const speaking = written > 0;
    if (speaking !== this.speaking) {
      this.speaking = speaking;
      this.port.postMessage(speaking ? 'speaking' : 'idle');
    }
    return true;
  }
}
registerProcessor('fk-player', PlayerProcessor);
`;

const moduleUrl = (source: string): string =>
  URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));

/** Float samples (-1..1) to the little-endian 16-bit the API expects. */
function toPcm16(input: Float32Array): ArrayBuffer {
  const out = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    // Clamp before scaling: anything past ±1 wraps to the opposite extreme
    // once it is an int16, which is heard as a click rather than as clipping.
    const s = Math.max(-1, Math.min(1, input[i]));
    out.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out.buffer;
}

/** ...and back, for the audio the model sends down. */
function fromPcm16(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const out = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // In 8 KB slices: String.fromCharCode(...bytes) on a whole buffer blows the
  // argument limit and throws on longer chunks.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

interface VoiceAudioOptions {
  /** Base64 PCM16 ready to go up the socket. */
  onChunk: (base64: string) => void;
  /** True while the speaker is actually producing sound. */
  onSpeakingChange?: (speaking: boolean) => void;
}

/**
 * One microphone, one speaker, one audio clock.
 *
 * Created per voice session and thrown away with it — a kiosk that has been
 * idle for an hour should not be holding the mic open.
 */
export class VoiceAudio {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private recorder: AudioWorkletNode | null = null;
  private player: AudioWorkletNode | null = null;
  private muted = false;

  /** Milliseconds of assistant audio handed to the speaker since it last went
   *  quiet. The interruption message needs a position, and this is the only
   *  side that knows one. */
  private enqueuedMs = 0;
  private startedAt = 0;

  constructor(private readonly options: VoiceAudioOptions) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // A kiosk has its speaker a foot from its microphone, so without
        // cancellation the model hears itself, treats it as the customer
        // talking, and interrupts its own sentence.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.context = context;
    if (context.state === 'suspended') await context.resume();

    const recorderUrl = moduleUrl(RECORDER_SOURCE);
    const playerUrl = moduleUrl(PLAYER_SOURCE);
    try {
      await context.audioWorklet.addModule(recorderUrl);
      await context.audioWorklet.addModule(playerUrl);
    } finally {
      URL.revokeObjectURL(recorderUrl);
      URL.revokeObjectURL(playerUrl);
    }

    const resample = context.sampleRate !== SAMPLE_RATE
      ? makeResampler(context.sampleRate, SAMPLE_RATE)
      : null;
    if (resample) {
      console.warn(
        `[voice] The browser gave a ${context.sampleRate} Hz context; resampling to ${SAMPLE_RATE} Hz in software.`,
      );
    }

    this.recorder = new AudioWorkletNode(context, 'fk-recorder');
    this.recorder.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (this.muted) return;
      const samples = resample ? resample(event.data) : event.data;
      this.options.onChunk(bytesToBase64(toPcm16(samples)));
    };

    this.player = new AudioWorkletNode(context, 'fk-player', { outputChannelCount: [1] });
    this.player.port.onmessage = (event: MessageEvent<string>) => {
      const speaking = event.data === 'speaking';
      if (!speaking) this.enqueuedMs = 0;
      this.options.onSpeakingChange?.(speaking);
    };

    context.createMediaStreamSource(this.stream).connect(this.recorder);
    // The recorder is not connected to the destination: it would echo the
    // customer back at themselves through the kiosk's own speaker.
    this.player.connect(context.destination);
  }

  /** Queue a chunk of the model's reply. */
  play(base64: string): void {
    if (!this.player) return;
    const samples = fromPcm16(base64ToBytes(base64));
    if (this.enqueuedMs === 0) this.startedAt = performance.now();
    this.enqueuedMs += (samples.length / SAMPLE_RATE) * 1000;
    this.player.port.postMessage(samples, [samples.buffer]);
  }

  /**
   * Stop talking immediately, and say how far the sentence had got.
   *
   * The number is wall-clock rather than a count of samples the speaker
   * actually consumed: the worklet knows the exact figure but only after a
   * round trip, and the model needs this in the same tick it is interrupted.
   * Elapsed time is right to within one 128-frame block while audio is
   * playing, and is capped at what was queued so a late interrupt cannot claim
   * more was heard than existed.
   */
  interrupt(): number {
    this.player?.port.postMessage('clear');
    const queued = this.enqueuedMs;
    const played = queued === 0 ? 0 : performance.now() - this.startedAt;
    this.enqueuedMs = 0;
    return Math.max(0, Math.round(Math.min(played, queued)));
  }

  /** Keep the socket open but stop sending — used while a tool runs. */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  async stop(): Promise<void> {
    this.recorder?.port.close();
    this.player?.port.close();
    this.recorder?.disconnect();
    this.player?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.context?.close().catch(() => undefined);
    this.context = null;
    this.stream = null;
    this.recorder = null;
    this.player = null;
  }
}

/**
 * Linear resampling, for the browser that would not give us a 24 kHz context.
 *
 * Good enough and no more: this is a fallback path for speech, where the
 * alternative is no audio at all. Chrome — which is what the kiosk runs —
 * honours the requested rate and never reaches this.
 */
function makeResampler(from: number, to: number): (input: Float32Array) => Float32Array {
  const ratio = from / to;
  return (input) => {
    const out = new Float32Array(Math.floor(input.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, input.length - 1);
      const weight = position - left;
      out[i] = input[left] * (1 - weight) + input[right] * weight;
    }
    return out;
  };
}
