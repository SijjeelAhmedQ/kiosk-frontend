/** Flip to false once the FastAPI backend is running. */
export const USE_MOCK = true;

/** Simulate network latency so loading states are exercised in dev. */
export const mockDelay = <T>(data: T, ms = 400): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));
