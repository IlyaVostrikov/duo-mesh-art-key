import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { loginRequestSchema, type LoginRequest } from '@duo-mesh/contracts'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/lib/api'
import { useAuth } from '@/lib/use-auth'
import {
  type AuthDraft,
  type FieldErrors,
  clearFieldError,
  errorId,
  FormAlert,
  hasErrors,
  toFieldErrors,
} from '@/components/auth-helpers'

export function LoginForm({
  draft,
  onDraftChange,
}: {
  draft: AuthDraft
  onDraftChange: (draft: Partial<AuthDraft>) => void
}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const emailId = useId()
  const emailErrorId = useId()
  const passwordId = useId()
  const passwordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: draft.email,
      password: draft.password,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const result = loginRequestSchema.safeParse(value)
      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues))
        return
      }

      setFieldErrors({})

      try {
        await auth.login(result.data as LoginRequest)
        navigate({ to: '/dashboard' })
      } catch (caughtError) {
        if (caughtError instanceof ApiRequestError) {
          setFormError(caughtError.message)
          return
        }
        setFormError('Unexpected auth error')
      }
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="gap-4">
        <form.Field
          name="email"
          children={(field) => (
            <Field data-invalid={hasErrors(fieldErrors.email)}>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <Input
                id={emailId}
                name={field.name}
                value={field.state.value}
                type="text"
                inputMode="email"
                autoComplete="email"
                aria-invalid={hasErrors(fieldErrors.email)}
                aria-describedby={errorId(fieldErrors.email, emailErrorId)}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const value = event.target.value
                  field.handleChange(value)
                  onDraftChange({ email: value })
                  clearFieldError('email', setFieldErrors)
                  setFormError(null)
                }}
              />
              <FieldError id={emailErrorId} errors={fieldErrors.email} />
            </Field>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <Field data-invalid={hasErrors(fieldErrors.password)}>
              <FieldLabel htmlFor={passwordId}>Пароль / Password</FieldLabel>
              <Input
                id={passwordId}
                name={field.name}
                value={field.state.value}
                type="password"
                autoComplete="current-password"
                aria-invalid={hasErrors(fieldErrors.password)}
                aria-describedby={errorId(fieldErrors.password, passwordErrorId)}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const value = event.target.value
                  field.handleChange(value)
                  onDraftChange({ password: value })
                  clearFieldError('password', setFieldErrors)
                  setFormError(null)
                }}
              />
              <FieldError id={passwordErrorId} errors={fieldErrors.password} />
            </Field>
          )}
        />

        <FormAlert message={formError} />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Загрузка... / Working...' : 'Войти / Login'}
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  )
}
