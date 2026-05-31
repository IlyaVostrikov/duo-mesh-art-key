import type { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export type RoleId = 'ARTIST' | 'COLLECTOR' | 'GUEST'
export type FieldName = 'displayName' | 'email' | 'password'
export type FormError = { message?: string }
export type FieldErrors = Partial<Record<FieldName, FormError[]>>
export type AuthDraft = {
  email: string
  password: string
  displayName: string
}

export const emptyDraft: AuthDraft = {
  email: '',
  password: '',
  displayName: '',
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <Alert variant="destructive">
      <AlertTitle>Ошибка / Authentication failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function toFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0]
    if (!isFieldName(field)) return errors

    errors[field] = [...(errors[field] ?? []), { message: issue.message }]
    return errors
  }, {})
}

export function clearFieldError(
  field: FieldName,
  setFieldErrors: (updater: (errors: FieldErrors) => FieldErrors) => void,
) {
  setFieldErrors((currentErrors) => {
    if (!currentErrors[field]?.length) return currentErrors
    const nextErrors = { ...currentErrors }
    delete nextErrors[field]
    return nextErrors
  })
}

export function hasErrors(errors: FormError[] | undefined) {
  return Boolean(errors?.length)
}

export function errorId(errors: FormError[] | undefined, id: string) {
  return hasErrors(errors) ? id : undefined
}

function isFieldName(field: unknown): field is FieldName {
  return field === 'displayName' || field === 'email' || field === 'password'
}
