import { createError, setResponseStatus, setHeader, type H3Event } from 'h3';
import { ZodError } from 'zod';
/** @param statusCode - Protocol status. @param message - Human-readable safe reason. @returns A protocol error for the boundary handler. */
export function mpError(statusCode: number, message: string) { return createError({ statusCode, message }); }
/** @param event - Micropub response. @param error - Sanitized application failure. @returns Standard Micropub JSON error, without stack traces or tokens. */
export function errorResponse(event: H3Event, error: unknown): { error: string; error_description: string } {
  const failure = error as { statusCode?: number; message?: string };
  const status = error instanceof ZodError ? 400 : failure.statusCode || 500;
  setResponseStatus(event, status);
  if (status === 401) setHeader(event, 'WWW-Authenticate', 'Bearer');
  return { error: status === 401 ? 'invalid_token' : status === 403 ? 'insufficient_scope' : 'invalid_request',
    error_description: error instanceof ZodError ? 'Content exceeds the supported field limits.' : status >= 500 ? 'Publishing service temporarily unavailable.' : failure.message || 'Invalid request.' };
}
