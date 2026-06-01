type RoleId = 'ARTIST' | 'COLLECTOR' | 'GUEST'

interface RoleSelectorProps {
  onSelect: (role: RoleId) => void
}

const ROLES: Array<{ id: RoleId; icon: string; title: string; desc: string }> = [
  {
    id: 'ARTIST',
    icon: '🎨',
    title: 'Художник / Artist',
    desc: 'Выставляйте 3D-работы в виртуальной галерее, создавайте цифровые сертификаты ArtKey / Exhibit 3D artworks in a virtual gallery, create digital ArtKey certificates',
  },
  {
    id: 'COLLECTOR',
    icon: '💎',
    title: 'Коллекционер / Collector',
    desc: 'Собирайте коллекции цифрового искусства, следите за художниками, получайте сертификаты / Collect digital art, follow artists, receive certificates',
  },
  {
    id: 'GUEST',
    icon: '👁️',
    title: 'Зритель / Viewer',
    desc: 'Исследуйте галереи, смотрите 3D-экспонаты, никаких обязательств / Explore galleries, view 3D exhibits, no commitments',
  },
]

export function RoleSelector({ onSelect }: RoleSelectorProps) {
  return (
    <div className="space-y-4">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2
          className="font-display"
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--text)',
          }}
        >
          Кто ты? / Who are you?
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Выберите свою роль в DUO MESH / Choose your role in DUO MESH
        </p>
      </div>

      <div className="grid gap-3">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
            className="flex items-start gap-4 p-4 text-left cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              width: '100%',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'translateX(0)',
              boxShadow: '0 0 0 0 rgba(var(--accent-rgb),0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.backgroundColor = 'rgba(var(--accent-rgb), 0.04)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(var(--accent-rgb),0.08)'
              e.currentTarget.style.transform = 'translateX(4px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.backgroundColor = 'var(--surface)'
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(var(--accent-rgb),0)'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
          >
            <span style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: '2px' }}>{role.icon}</span>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{role.title}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>{role.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
