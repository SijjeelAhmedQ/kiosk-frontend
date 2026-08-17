/**
 * Where the voice relay lives.
 *
 * Derived from the same base URL axios uses rather than configured separately:
 * the relay is a route on the Friends Kitchen backend, so pointing the app at a different
 * backend has to move the microphone with it. Getting these out of step gives
 * the worst kind of bug — a Friends Kitchen terminal ordering from one restaurant and talking to
 * another.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '/api/v1';

/** Absolute http(s) base, resolving a relative VITE_API_BASE_URL against the page. */
const absoluteBase = (): string =>
  API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;

/** ws:// for http, wss:// for https — a page on https cannot open a ws:// socket. */
const wsBase = (): string => absoluteBase().replace(/^http/, 'ws');

/** The Realtime relay: one socket, straight through to OpenAI. */
export const VOICE_SOCKET_URL = `${wsBase()}/realtime/voice`;

/** The OpenRouter pipeline: utterances up, sentences of audio back. */
export const VOICE_PIPELINE_URL = `${wsBase()}/voice/pipeline`;

/**
 * The socket for whichever stack the backend is running.
 *
 * They are separate routes rather than one negotiating endpoint because the
 * protocols are not compatible — the relay forwards frames it does not read,
 * the pipeline speaks its own event vocabulary. Which of the two is live is the
 * backend's decision, and the health check is where it says so.
 */
export const voiceSocketUrl = (provider: string | null | undefined): string =>
  provider === 'openai' ? VOICE_SOCKET_URL : VOICE_PIPELINE_URL;

export const VOICE_HEALTH_URL = `${absoluteBase()}/realtime/health`;
