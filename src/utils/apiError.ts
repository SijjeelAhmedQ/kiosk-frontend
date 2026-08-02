import type { ApiError } from '@/types';

/**
 * Pulls a message out of whatever a rejected request threw.
 *
 * The axios interceptor normalises failures into ApiError, which is a plain
 * object rather than an Error — so `action.error.message` inside a thunk is
 * undefined and the useful text is lost. Thunks call this and hand the result
 * to `rejectWithValue` instead.
 */
export const errorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  const apiError = error as ApiError | undefined;
  if (apiError?.message) return apiError.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/** True when a request failed for a specific business reason, e.g. 'COUPON_EXPIRED'. */
export const hasErrorCode = (error: unknown, code: string): boolean =>
  (error as ApiError | undefined)?.code === code;
