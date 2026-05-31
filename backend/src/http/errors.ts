import type { ApiErrorCode, ApiErrorResponse } from '@duo-mesh/contracts'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }
}

type ValidationHookResult = { success: true } | { success: false; error: ZodError }

export function validationErrorResponse(details: unknown) {
  return errorResponse('VALIDATION_ERROR', 'Invalid request payload', details)
}

export function validationErrorHook(result: ValidationHookResult, c: Context) {
  if (!result.success) {
    return c.json(validationErrorResponse(result.error.issues), 400)
  }
}

export function handleError(error: Error, c: Context) {
  if (error instanceof AppError) {
    return c.json(errorResponse(error.code, error.message, error.details), error.status)
  }

  if (error instanceof ZodError) {
    return c.json(validationErrorResponse(error.issues), 400)
  }

  if (error instanceof HTTPException) {
    return c.json(errorResponse('BAD_REQUEST', error.message), error.status)
  }

  console.error(error)
  return c.json(errorResponse('INTERNAL_ERROR', 'Unexpected server error'), 500)
}

// ─── Common error subclasses (status + code baked in) ───

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, 'FORBIDDEN', message)
  }
}
