import { Link } from '@tanstack/react-router'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

const PROVEN = [
  { what: 'Хеш-целостность записи', en: 'Record hash integrity', detail: 'SHA-256 хеш канонического JSON полезной нагрузки пересчитывается и сверяется с записанным. Изменение payload немедленно обнаруживается.', detailEn: 'SHA-256 hash of canonical JSON payload is recomputed and checked against stored hash. Any payload change is immediately detected.' },
  { what: 'Подлинность Ed25519 подписи', en: 'Ed25519 signature validity', detail: 'Каждая подпись проверяется математически: Ed25519 (RFC 8032) над SHA-256 хешем записи. Невозможно подделать без приватного ключа.', detailEn: 'Every signature is verified mathematically: Ed25519 (RFC 8032) over SHA-256 hash of the record. Cannot be forged without the private key.' },
  { what: 'Неразрывность цепи', en: 'Hash chain continuity', detail: 'Каждая запись содержит prevRecordHash = хеш предыдущей записи. Разрыв цепи немедленно обнаруживается — нельзя вставить, удалить или переставить записи.', detailEn: 'Each record contains prevRecordHash = hash of previous record. Chain break is immediately detected — records cannot be inserted, deleted, or reordered.' },
  { what: 'Временной якорь (RFC 3161)', en: 'Timestamp anchor (RFC 3161)', detail: 'Genesis-хеш отправляется в независимый Time-Stamp Authority. Токен подтверждает существование хеша на указанный момент времени.', detailEn: 'Genesis hash is submitted to an independent Time-Stamp Authority. The token proves the hash existed at the stated time.' },
]

const TRUST = [
  { what: 'Ключ принадлежит художнику', en: 'Key belongs to the named artist', detail: 'Платформа заверяет, что Ed25519 ключ был сгенерирован при онбординге художника и привязан к его аккаунту. Публичный ключ доступен для независимой проверки.', detailEn: 'The platform attests that the Ed25519 key was generated at artist onboarding and linked to their account. The public key is available for independent verification.' },
  { what: 'Приватный ключ под контролем', en: 'Private key custody', detail: 'MVP: приватные ключи хранятся на сервере в зашифрованном виде (AES-256-GCM). Платформа обязуется не использовать ключ без ведома художника. Roadmap: некастодиальная модель (ключи в браузере).', detailEn: 'MVP: private keys are stored server-side, encrypted (AES-256-GCM). Platform commits to never use the key without artist consent. Roadmap: non-custodial (keys in browser).' },
  { what: 'Платформа — честный эмитент', en: 'Platform is an honest issuer', detail: 'Co-signature платформы означает «выпущено через DUO MESH». Это не криптографическое доказательство — это reputation-based attestation.', detailEn: 'Platform co-signature means "issued through DUO MESH." This is not cryptographic proof — it is a reputation-based attestation.' },
]

const NOT_CLAIMED = [
  { what: 'Физическая подлинность', en: 'Physical authenticity', detail: 'Криптография доказывает целостность цифровых записей, но не подтверждает, что работа — подлинник. Это предмет искусствоведческой экспертизы.', detailEn: 'Cryptography proves digital record integrity, but does not confirm the artwork is authentic. That requires art-historical expertise.' },
  { what: 'Неизменность файла работы', en: 'Immutability of artwork file', detail: 'Хеш integrityHash связывает ArtKey с конкретным файлом, но проверить можно только имея доступ к файлу. Офлайн-верификатор позволяет пересчитать хеш независимо.', detailEn: 'The integrityHash links the ArtKey to a specific file, but verification requires file access. The offline verifier allows independent hash recomputation.' },
  { what: 'Юридическое право собственности', en: 'Legal ownership', detail: 'Provenance-цепочка — это криптографическая история передачи. Она не является правоустанавливающим документом. Юридический титул регулируется законами юрисдикции.', detailEn: 'The provenance chain is a cryptographic transfer history. It is not a legal title document. Legal ownership is governed by jurisdictional law.' },
  { what: 'Рыночная стоимость', en: 'Market value', detail: 'Никакие криптографические доказательства не гарантируют и не предсказывают рыночную стоимость работы.', detailEn: 'No cryptographic proof guarantees or predicts the market value of an artwork.' },
]

// Semantic trust-model tones — each mapped to CSS custom properties on the section block
const toneColors = {
  green: { bg: 'var(--tone-green-bg)', border: 'var(--tone-green-border)', text: 'var(--tone-green-text)', dot: 'var(--tone-green-dot)' },
  amber: { bg: 'var(--tone-amber-bg)', border: 'var(--tone-amber-border)', text: 'var(--tone-amber-text)', dot: 'var(--tone-amber-dot)' },
  gray:  { bg: 'var(--tone-gray-bg)', border: 'var(--tone-gray-border)', text: 'var(--tone-gray-text)', dot: 'var(--tone-gray-dot)' },
} as const

const toneVars = {
  green: { '--tone-green-bg': '#d4edda', '--tone-green-border': '#c3e6cb', '--tone-green-text': '#155724', '--tone-green-dot': '#28a745' } as Record<string, string>,
  amber: { '--tone-amber-bg': '#fff3cd', '--tone-amber-border': '#ffeaa7', '--tone-amber-text': '#856404', '--tone-amber-dot': '#f0ad4e' } as Record<string, string>,
  gray:  { '--tone-gray-bg': 'var(--surface)', '--tone-gray-border': 'var(--border)', '--tone-gray-text': 'var(--text-secondary)', '--tone-gray-dot': 'var(--text-muted)' } as Record<string, string>,
}

export function TrustModel() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-12">
      <RevealOnScroll direction="up">
        <h1 className="font-display text-3xl mb-2">Trust Model</h1>
        <p className="text-muted-foreground mb-10 text-lg">
          Что доказывает криптография, что требует доверия к платформе, и что остаётся за рамками системы.
        </p>
      </RevealOnScroll>

      <RevealOnScroll direction="up" delay={60}>
        <SectionBlock
          title="Математически доказано"
          enTitle="Mathematically Proven"
          tone="green"
          description="Эти утверждения проверяются пересчётом без доверия к серверу."
          enDescription="These claims are verified by recomputation without trusting the server."
          items={PROVEN}
        />
      </RevealOnScroll>

      <RevealOnScroll direction="up" delay={100}>
        <SectionBlock
          title="Требует доверия к DUO MESH"
          enTitle="Requires Trust in DUO MESH"
          tone="amber"
          description="Платформа утверждает — проверяется репутацией, а не криптографией."
          enDescription="Platform attests — verified by reputation, not cryptography."
          items={TRUST}
        />
      </RevealOnScroll>

      <RevealOnScroll direction="up" delay={140}>
        <SectionBlock
          title="Не утверждается"
          enTitle="Not Claimed"
          tone="gray"
          description="Система не претендует на эти свойства. Честный маркетинг."
          enDescription="The system makes no claim to these properties. Honest marketing."
          items={NOT_CLAIMED}
        />
      </RevealOnScroll>

      <RevealOnScroll direction="up" delay={180}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
          <Link to="/how-it-works" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>
            ArtKey — как это работает / How It Works →
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  )
}

function SectionBlock({
  title, enTitle, tone, description, enDescription, items,
}: {
  title: string
  enTitle: string
  tone: 'green' | 'amber' | 'gray'
  description: string
  enDescription: string
  items: Array<{ what: string; en: string; detail: string; detailEn: string }>
}) {
  const c = toneColors[tone]
  const vars = toneVars[tone]

  return (
    <div
      style={{
        ...vars,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius)',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: c.text, margin: 0 }}>
          {title}
        </h2>
        <span style={{ color: c.text, opacity: 0.6, fontSize: '0.875rem' }}>{enTitle}</span>
      </div>
      <p style={{ color: c.text, opacity: 0.75, fontSize: '0.8125rem', marginBottom: '16px' }}>
        {description}<br />{enDescription}
      </p>

      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < items.length - 1 ? '14px' : '0' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: c.dot, flexShrink: 0, marginTop: '6px',
          }} />
          <div>
            <strong style={{ color: c.text, fontSize: '0.9375rem' }}>
              {item.what}
            </strong>
            <span style={{ color: c.text, opacity: 0.6, fontSize: '0.8125rem', marginLeft: '6px' }}>
              {item.en}
            </span>
            <p style={{ color: c.text, opacity: 0.8, fontSize: '0.8125rem', marginTop: '2px', lineHeight: 1.55 }}>
              {item.detail}<br />
              <span style={{ opacity: 0.65 }}>{item.detailEn}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
