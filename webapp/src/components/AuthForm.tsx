import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ROLE_LABELS } from '@/lib/labels'
import { RoleSelector } from '@/components/RoleSelector'
import { RegisterForm } from '@/components/RegisterForm'
import { LoginForm } from '@/components/LoginForm'
import { type RoleId, type AuthDraft, emptyDraft } from '@/components/auth-helpers'

type Step = 'role' | 'register' | 'login'

export function AuthForm() {
  const [step, setStep] = useState<Step>('role')
  const [selectedRole, setSelectedRole] = useState<RoleId>('GUEST')
  const [draft, setDraft] = useState<AuthDraft>(emptyDraft)

  function updateDraft(nextDraft: Partial<AuthDraft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...nextDraft }))
  }

  function handleRoleSelect(role: RoleId) {
    setSelectedRole(role)
    setStep('register')
  }

  return (
    <Card className="w-full" aria-label="Authentication">
      <CardHeader>
        <CardTitle>Доступ / Account access</CardTitle>
        <CardDescription>
          {step === 'role'
            ? 'Выберите роль перед созданием аккаунта / Select your role before creating an account.'
            : step === 'register'
              ? 'Создать новый аккаунт / Create a new account.'
              : 'Продолжить с существующей сессией / Continue with an existing session.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div key={step} style={{ animation: 'fadeIn 0.35s var(--ease) both' }}>
        {step === 'role' && <RoleSelector onSelect={handleRoleSelect} />}

        {step === 'register' && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-2 px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgba(198,255,58,0.06)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
              }}
            >
              <span>{ROLE_LABELS[selectedRole]}</span>
            </div>
            <RegisterForm draft={draft} onDraftChange={updateDraft} role={selectedRole} />
            <button
              type="button"
              onClick={() => setStep('role')}
              className="w-full text-sm"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Назад / Back
            </button>
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-4">
            <LoginForm draft={draft} onDraftChange={updateDraft} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('role')}
                className="text-sm flex-1"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Назад / Back
              </button>
              <button
                type="button"
                onClick={() => setStep('register')}
                className="text-sm"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Нет аккаунта? / No account?
              </button>
            </div>
          </div>
        )}

        {step !== 'login' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setStep('login')}
              className="text-sm"
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Уже есть аккаунт? Войти / Already have account? Login
            </button>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
