/** The vocabulary the voice layer and the app share. */

/** A JSON Schema object describing one tool's arguments. */
export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Something the model can do to this app.
 *
 * `run` executes in the browser, not on a server — that is the point of the
 * whole design. "Add a Coke" has to move the React cart the customer is looking
 * at, and only code inside the page can do that.
 *
 * Whatever `run` returns is JSON-encoded and handed back to the model as the
 * result of the call, so return the facts it needs to speak a confirmation:
 * what was added, what the total is now, what went wrong. A tool that returns
 * nothing leaves the model guessing, and a guessing model invents a price.
 */
export interface VoiceTool<Args = any> {
  name: string;
  description: string;
  parameters: JsonSchema;
  run: (args: Args) => unknown | Promise<unknown>;
}

export type VoiceStatus =
  | 'idle'          // not connected; the mic is off
  | 'connecting'    // socket opening, or waiting on mic permission
  | 'listening'     // live, and nobody is talking
  | 'hearing'       // the customer is speaking right now
  | 'thinking'      // the model is composing, or a tool is running
  | 'speaking'      // Friends Kitchen is talking back
  | 'error';        // `error` says what happened; the session is over

/** One line of the conversation, as the on-screen transcript shows it. */
export interface VoiceTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** False while the text is still streaming in. */
  done: boolean;
}

/** A tool call the customer can see happening. */
export interface VoiceAction {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  /** null while it is still running. */
  ok: boolean | null;
  detail: string | null;
}

/**
 * Which stack is behind the microphone. Chosen by the backend, not the page —
 * it depends on which key the server holds, and the page must not be told
 * either of them.
 *
 *   openai      one socket to the Realtime API. Speech in, speech out.
 *   openrouter  transcribe, chat, speak — three calls a turn, stitched
 *               together by the backend, with turn-taking done in the page.
 */
export type VoiceProvider = 'openai' | 'openrouter';

/** What a session reports back to React. Both providers raise the same five. */
export interface VoiceSessionHandlers {
  onStatus: (status: VoiceStatus) => void;
  onTurn: (turn: VoiceTurn) => void;
  onAction: (action: VoiceAction) => void;
  onError: (message: string) => void;
  /** Whether the microphone is capturing. False in a typed-only session. */
  onMicChange: (active: boolean) => void;
}

/**
 * The surface `useVoiceSession` drives, and the whole of what the two
 * implementations have to agree on. Everything below it — sockets, PCM,
 * whether turn-taking happens here or on a server — is theirs alone.
 */
export interface VoiceSessionClient {
  /**
   * Open the session. Without the microphone it is still a full session —
   * typed input, spoken replies, the same tools — which is what a customer in
   * a loud room, or one who would rather not say their order out loud, gets
   * without ever being asked for permission.
   */
  start: (options?: { microphone?: boolean }) => Promise<void>;
  stop: () => Promise<void>;
  /** Add the microphone to a session that began typed. */
  startMicrophone: () => Promise<void>;
  /**
   * Order in writing. Queued if the socket is still opening, so the first
   * thing a customer types is never the thing that gets dropped.
   */
  sendText: (text: string) => void;
  /** Have the voice mention something the customer did not ask about. */
  say: (context: string) => void;
  /** Point the session at fresh executors, same definitions. */
  setTools: (tools: VoiceTool[]) => void;
}

export interface VoiceSessionConfig {
  /** Which client to build. Comes from the health check. */
  provider?: VoiceProvider;
  /** ws:// URL of the relay — never the model vendor directly; keys stay server-side. */
  url: string;
  /** The system prompt: who this voice is and how it should behave. */
  instructions: string;
  tools: VoiceTool[];
  /** Spoken the moment the session opens. Omit for a silent start. */
  greeting?: string;
  /**
   * Context for the speech-to-text that draws the transcript: what is likely to
   * be said, and which script to write it in. Nothing the model reasons over —
   * it hears the audio — so this only shapes what appears on screen.
   */
  transcriptionPrompt?: string;
  /** marin | cedar | alloy | … Defaults to whatever the relay is configured for. */
  voice?: string;
}
