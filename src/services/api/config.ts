/** Flip to true to run Friends Kitchen standalone off src/data/menu.ts. */
export const USE_MOCK = false;

/** Simulate network latency so loading states are exercised in dev. */
export const mockDelay = <T>(data: T, ms = 400): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));
