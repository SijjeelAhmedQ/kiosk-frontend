/**
 * Deciding when the customer has stopped talking.
 *
 * On the Realtime path this is the server's job — `turn_detection` on the
 * session, and the model gets the audio as a continuous stream. OpenRouter has
 * no session and no stream: transcription takes one complete utterance, so
 * something in the page has to say where an utterance ends. This is that thing.
 *
 * It is energy-based, not a neural detector, and that is a deliberate trade. A
 * counter is loud in a *steady* way — extractor fans, a fryer, a room of
 * conversation — and a floor that adapts to steady noise separates a voice
 * eighteen inches from the microphone from all of it, at no download cost and
 * no inference latency. What it cannot do is tell one voice from another, which
 * matters far less than it sounds: the person ordering is the person nearest
 * the mic, and echo cancellation has already removed our own speaker.
 *
 * Three details do most of the work:
 *
 * **A pre-roll buffer.** Speech is only recognised as speech a frame or two in,
 * by which point the first consonant is already past. Those frames are kept and
 * prepended, so "two burgers" is not transcribed as "oo burgers".
 *
 * **Hangover, not a hair trigger.** People pause mid-order — "I'll have… the
 * chicken one". Ending the utterance at the first quiet frame cuts them off and
 * sends half a sentence to be transcribed. 700ms of silence is long enough to
 * be a finished thought and short enough not to feel like lag.
 *
 * **A raised gate while we are talking.** Echo cancellation is good, not
 * perfect, and a kiosk has its speaker a foot from its microphone. Without the
 * guard, the reply's own tail reads as the customer interrupting, and the
 * session talks itself into a loop.
 */

import { SAMPLE_RATE } from './audio';

export interface VadOptions {
  /** RMS below this is never speech, however quiet the room gets. */
  floor: number;
  /** How far above the measured noise floor a frame has to be to count. */
  ratio: number;
  /** Consecutive loud frames before the utterance is considered started. */
  startFrames: number;
  /** Silence that ends an utterance. */
  hangoverMs: number;
  /** Audio kept from before the trigger, so the first word survives. */
  prerollMs: number;
  /** Anything shorter is a cough, a chair, a door. */
  minUtteranceMs: number;
  /** A hard stop, so a stuck-open mic still produces a turn. */
  maxUtteranceMs: number;
  /** Threshold multiplier applied while our own voice is playing. */
  echoGuard: number;
}

const DEFAULTS: VadOptions = {
  floor: 0.008,
  ratio: 3,
  startFrames: 2,
  hangoverMs: 700,
  prerollMs: 300,
  minUtteranceMs: 250,
  maxUtteranceMs: 20_000,
  echoGuard: 2.5,
};

interface VadEvents {
  /** The customer started talking. Fired once per utterance, at the start. */
  onSpeechStart: () => void;
  /** They finished. The frames are the whole utterance, pre-roll included. */
  onUtterance: (frames: Float32Array[]) => void;
}

/** Root-mean-square of one frame — loudness, in the only sense that matters. */
function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export class VoiceDetector {
  private readonly options: VadOptions;

  /** The room, as measured. Starts pessimistic and settles within a second. */
  private noiseFloor = 0.01;

  private speaking = false;
  private loudRun = 0;
  private quietMs = 0;
  private utteranceMs = 0;

  private preroll: Float32Array[] = [];
  private prerollMs = 0;
  private frames: Float32Array[] = [];

  /** True while our own reply is coming out of the speaker. */
  private echoing = false;
  /** True while the session is not accepting input at all. */
  private gated = false;

  constructor(private readonly events: VadEvents, options: Partial<VadOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /**
   * Stop and start listening.
   *
   * Closed while a turn is being processed and re-opened when the reply is
   * done, so a customer's "…and a Coke" two seconds later opens a fresh
   * utterance rather than being appended to one already sent.
   */
  setGated(gated: boolean): void {
    if (gated === this.gated) return;
    this.gated = gated;
    if (gated) this.reset();
  }

  /** Raise the bar while Friends Kitchen is talking, so it does not hear itself. */
  setEchoing(echoing: boolean): void {
    this.echoing = echoing;
  }

  reset(): void {
    this.speaking = false;
    this.loudRun = 0;
    this.quietMs = 0;
    this.utteranceMs = 0;
    this.frames = [];
    this.preroll = [];
    this.prerollMs = 0;
  }

  /** How many frames off the tail are pure hangover, keeping ~150ms of it. */
  private silentTailFrames(): number {
    const KEEP_MS = 150;
    let dropMs = this.quietMs - KEEP_MS;
    if (dropMs <= 0) return 0;

    let count = 0;
    for (let i = this.frames.length - 1; i >= 0 && dropMs > 0; i--) {
      const frameMs = (this.frames[i].length / SAMPLE_RATE) * 1000;
      if (frameMs > dropMs) break;
      dropMs -= frameMs;
      count++;
    }
    return count;
  }

  push(samples: Float32Array): void {
    if (this.gated) return;

    const frameMs = (samples.length / SAMPLE_RATE) * 1000;
    const level = rms(samples);
    const threshold =
      Math.max(this.options.floor, this.noiseFloor * this.options.ratio) *
      (this.echoing ? this.options.echoGuard : 1);
    const loud = level > threshold;

    if (!this.speaking) {
      // Track the room only between utterances, and only downward-ish: letting
      // the floor climb while someone is mid-sentence is how a detector goes
      // deaf halfway through a long order.
      if (!loud) this.noiseFloor = this.noiseFloor * 0.95 + level * 0.05;

      // A rolling window of what came just before, trimmed to the pre-roll
      // budget so an idle kiosk is not quietly growing an array all afternoon.
      this.preroll.push(samples);
      this.prerollMs += frameMs;
      while (this.prerollMs > this.options.prerollMs && this.preroll.length > 1) {
        const dropped = this.preroll.shift()!;
        this.prerollMs -= (dropped.length / SAMPLE_RATE) * 1000;
      }

      this.loudRun = loud ? this.loudRun + 1 : 0;
      if (this.loudRun < this.options.startFrames) return;

      this.speaking = true;
      this.frames = this.preroll.slice();
      this.utteranceMs = this.prerollMs;
      this.preroll = [];
      this.prerollMs = 0;
      this.events.onSpeechStart();
      return;
    }

    // ---- mid-utterance -----------------------------------------------------
    this.frames.push(samples);
    this.utteranceMs += frameMs;
    this.quietMs = loud ? 0 : this.quietMs + frameMs;

    const finished = this.quietMs >= this.options.hangoverMs;
    const overrun = this.utteranceMs >= this.options.maxUtteranceMs;
    if (!finished && !overrun) return;

    // Trailing silence adds nothing to a transcript and is billed by the
    // second, so most of the hangover is trimmed off the end. A beat is left
    // behind: transcribers clip the final consonant of audio that stops dead.
    const spoken = this.utteranceMs - this.quietMs;
    const frames = this.frames.slice(0, this.frames.length - this.silentTailFrames());
    this.reset();

    if (spoken >= this.options.minUtteranceMs && frames.length) {
      this.events.onUtterance(frames);
    }
  }
}
