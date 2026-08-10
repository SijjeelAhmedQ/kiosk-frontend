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
  | 'speaking'      // the kiosk is talking back
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

export interface VoiceSessionConfig {
  /** ws:// URL of the relay — never OpenAI directly; the key is server-side. */
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
