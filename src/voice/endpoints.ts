/**
 * Where the voice relay lives.
 *
 * Derived from the same base URL axios uses rather than configured separately:
 * the relay is a route on the kiosk backend, so pointing the app at a different
 * backend has to move the microphone with it. Getting these out of step gives
 * the worst kind of bug — a kiosk ordering from one restaurant and talking to
 * another.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '/api/v1';

/** Absolute http(s) base, resolving a relative VITE_API_BASE_URL against the page. */
const absoluteBase = (): string =>
  API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;

/** ws:// for http, wss:// for https — a page on https cannot open a ws:// socket. */
export const VOICE_SOCKET_URL = `${absoluteBase().replace(/^http/, 'ws')}/realtime/voice`;

export const VOICE_HEALTH_URL = `${absoluteBase()}/realtime/health`;
