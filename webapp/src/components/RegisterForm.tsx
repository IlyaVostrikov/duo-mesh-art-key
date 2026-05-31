import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { registerRequestSchema, type RegisterRequest } from '@duo-mesh/contracts'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError } from '@/lib/api'
import { useAuth } from '@/lib/use-auth'
import {
  type AuthDraft,
  type FieldErrors,
  type RoleId,
  clearFieldError,
  errorId,
  FormAlert,
  hasErrors,
  toFieldErrors,
} from '@/components/auth-helpers'

export function RegisterForm({
  draft,
  onDraftChange,
  role,
}: {
  draft: AuthDraft
  onDraftChange: (draft: Partial<AuthDraft>) => void
  role: RoleId
}) {
  const auth = useAuth()
  const navigate = useNavigate()
  const displayNameId = useId()
  const displayNameErrorId = useId()
  const emailId = useId()
  const emailErrorId = useId()
  const passwordId = useId()
  const passwordErrorId = useId()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: draft,
    onSubmit: async ({ value }) => {
      setFormError(null)

      const result = registerRequestSchema.safeParse(value)
      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues))
        return
      }

      setFieldErrors({})

      try {
        await auth.register({ ...result.data, role } as RegisterRequest)
        if (role === 'ARTIST') {
          navigate({ to: '/onboarding/artist' })
        } else if (role === 'COLLECTOR') {
          navigate({ to: '/dashboard' })
        } else {
          navigate({ to: '/gallery' })
        }
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
          name="displayName"
          children={(field) => (
            <Field data-invalid={hasErrors(fieldErrors.displayName)}>
              <FieldLabel htmlFor={displayNameId}>Имя / Name</FieldLabel>
              <Input
                id={displayNameId}
                name={field.name}
                value={field.state.value ?? ''}
                autoComplete="name"
                aria-invalid={hasErrors(fieldErrors.displayName)}
                aria-describedby={errorId(fieldErrors.displayName, displayNameErrorId)}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  const value = event.target.value
                  field.handleChange(value)
                  onDraftChange({ displayName: value })
                  clearFieldError('displayName', setFieldErrors)
                  setFormError(null)
                }}
              />
              <FieldError id={displayNameErrorId} errors={fieldErrors.displayName} />
            </Field>
          )}
        />

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
                autoComplete="new-password"
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
              {isSubmitting ? 'Загрузка... / Working...' : 'Создать аккаунт / Create account'}
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  )
}
