import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

const BUILDING_BLOCKS = [
  {
    num: '01',
    title: 'Отпечаток — SHA-256',
    enTitle: 'Fingerprint — SHA-256',
    simple: 'Файл → 64 символа. Тот же файл — тот же отпечаток. Измените пиксель — отпечаток станет другим. Восстановить файл из отпечатка нельзя.',
    simpleEn: 'File → 64 characters. Same file — same fingerprint. Change a pixel — entirely different. Cannot reverse.',
    artkey: 'integrityHash работы. Подмена ломает совпадение с реестром.',
    artkeyEn: 'Artwork integrityHash. Substitution breaks the registry match.',
    precise: 'SHA-256: 256 бит, устойчива к коллизиям, лавинный эффект.',
    preciseEn: 'SHA-256: 256-bit, collision-resistant, avalanche effect.',
  },
  {
    num: '02',
    title: 'Подпись — Ed25519',
    enTitle: 'Signature — Ed25519',
    simple: 'Приватный ключ подписывает, публичный проверяет. Подделать подпись без приватного ключа нельзя.',
    simpleEn: 'Private key signs, public key verifies. Cannot forge without the private key.',
    artkey: 'Художник подписывает выпуск. Без его ключа никто не выпустит запись от его имени.',
    artkeyEn: 'Artist signs issuance. Without their key, no one can issue in their name.',
    precise: 'Ed25519 (RFC 8032): эллиптические кривые, 64-байт подпись, привязана к содержимому.',
    preciseEn: 'Ed25519 (RFC 8032): elliptic-curve, 64-byte signature, bound to content.',
  },
  {
    num: '03',
    title: 'Цепочка — Hash Chain',
    enTitle: 'Chain — Hash Chain',
    simple: 'Каждая запись содержит отпечаток предыдущей. Чтобы подменить прошлое — нужно переписать всё последующее.',
    simpleEn: 'Each record hashes the previous one. To alter the past, rewrite everything after.',
    artkey: 'Provenance: мастерская → коллекционер → галерея. Удаление звена разрывает цепь математически.',
    artkeyEn: 'Provenance: studio → collector → gallery. Removing a link mathematically breaks the chain.',
    precise: null,
    preciseEn: null,
  },
  {
    num: '04',
    title: 'Якорь — RFC 3161',
    enTitle: 'Anchor — RFC 3161',
    simple: 'Цепочка в нашей базе не мешает нам переписать историю задним числом. Внешний якорь времени — мешает.',
    simpleEn: 'Our chain alone doesn\'t prevent us from rewriting history. An external time anchor does.',
    artkey: 'Корень цепочки заверяется независимой службой времени и публикуется в transparency log.',
    artkeyEn: 'Chain root is timestamped by an independent TSA and published to a transparency log.',
    precise: null,
    preciseEn: null,
  },
]

const LIFECYCLE = [
  { step: '1', title: 'Отпечаток', enTitle: 'Fingerprint', desc: 'Файл → SHA-256', descEn: 'File → SHA-256' },
  { step: '2', title: 'Выпуск', enTitle: 'Issuance', desc: 'Подпись художника → genesis', descEn: 'Artist signature → genesis' },
  { step: '3', title: 'Цепочка', enTitle: 'Chain', desc: 'Передачи сцеплены хешами', descEn: 'Transfers linked by hashes' },
  { step: '4', title: 'Якорь', enTitle: 'Anchor', desc: 'Независимая метка времени', descEn: 'Independent timestamp' },
  { step: '5', title: 'Проверка', enTitle: 'Verify', desc: 'Пересчёт + публичные ключи', descEn: 'Recompute + public keys' },
]

const PROVEN = [
  { what: 'Целостность', enWhat: 'Integrity', detail: 'Работа и записи не изменены.', detailEn: 'Artwork and records unaltered.' },
  { what: 'Авторство', enWhat: 'Authorship', detail: 'Кто подписал выпуск и передачи.', detailEn: 'Who signed issuance and transfers.' },
  { what: 'Порядок и время', enWhat: 'Order & time', detail: 'Последовательность и когда.', detailEn: 'Sequence and when.' },
]

const TRUST = [
  { what: 'Атомы ↔ биты', enWhat: 'Atoms ↔ bits', detail: 'Связь цифрового отпечатка с физической работой.', detailEn: 'Linking digital fingerprint to physical work.' },
  { what: 'Личность', enWhat: 'Identity', detail: 'Что художник — тот, за кого себя выдаёт.', detailEn: 'That the artist is who they claim to be.' },
]

const GLOSSARY = [
  { term: 'SHA-256', def: 'Необратимый цифровой отпечаток данных.', enDef: 'Irreversible digital fingerprint.' },
  { term: 'Ed25519', def: 'Схема цифровой подписи на эллиптических кривых.', enDef: 'Elliptic-curve signature scheme.' },
  { term: 'Hash chain', def: 'Записи, сцепленные отпечатками.', enDef: 'Records linked by fingerprints.' },
  { term: 'RFC 3161', def: 'Независимая метка времени.', enDef: 'Independent timestamp attestation.' },
  { term: 'Transparency log', def: 'Публичный журнал, не переписываемый задним числом.', enDef: 'Public append-only log.' },
  { term: 'Provenance', def: 'Документированная история владения.', enDef: 'Documented ownership history.' },
]

export function HowItWorks() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru')
  const isRu = lang === 'ru'

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 20px 120px' }}>

      {/* ═══ Lang toggle ═══ */}
      <RevealOnScroll direction="up">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '5px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {lang === 'ru' ? 'En' : 'Ru'}
          </button>
        </div>
      </RevealOnScroll>

      {/* ═══ Hero ═══ */}
      <RevealOnScroll direction="up" delay={40}>
        <div style={{ marginBottom: '72px' }}>
          <Typography variant="h1" style={{ marginBottom: '20px', maxWidth: '700px' }}>
            {isRu ? 'ArtKey — как это работает' : 'ArtKey — How It Works'}
          </Typography>
          <Typography variant="lead" tone="muted" style={{ maxWidth: '600px' }}>
            {isRu
              ? 'Документация о криптографической технологии подлинности DUO MESH. Два слоя: простыми словами — для всех, и точно — для тех, кто хочет проверить нас сам.'
              : 'Documentation of DUO MESH cryptographic authenticity. Two layers: simple for everyone, precise for independent verification.'}
          </Typography>
        </div>
      </RevealOnScroll>

      {/* ═══ What is ArtKey ═══ */}
      <RevealOnScroll direction="up" delay={60}>
        <Card style={{
          marginBottom: '72px', padding: '36px', borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)',
        }}>
          <CardContent style={{ padding: 0 }}>
            <Typography variant="body" style={{ fontSize: '1.0625rem', lineHeight: 1.8, maxWidth: '680px' }}>
              {isRu
                ? 'ArtKey — цифровой паспорт подлинности. Та же криптография, что защищает банки, обновления ПО и сертификаты сайтов. Три доказательства, пересчитываемые математически: работа не подменена, выпуск подписан художником, история владения не прерывалась. Проверить можете вы — не доверяя нам на слово.'
                : 'ArtKey is a digital authenticity passport. The same cryptography that secures banking, software updates, and website certificates. Three mathematically recomputable proofs: the work is unaltered, issuance was signed by the artist, ownership history is unbroken. You can verify — without trusting us.'}
            </Typography>
          </CardContent>
        </Card>
      </RevealOnScroll>

      {/* ═══ Why ═══ */}
      <RevealOnScroll direction="up" delay={80}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
            <Typography variant="h3">
              {isRu ? 'Зачем это нужно' : 'Why This Matters'}
            </Typography>
            <Typography variant="bodySm" tone="muted">
              {isRu ? 'Why This Matters' : 'Зачем это нужно'}
            </Typography>
          </div>
          <Typography variant="body" tone="muted" style={{ maxWidth: '640px', lineHeight: 1.75 }}>
            {isRu
              ? 'Подлинность в искусстве — репутация, бумаги, эксперты. На доверии. Бумагу подделывают. Эксперты ошибаются. Галереи закрываются. ArtKey добавляет слой, который нельзя подделать — переводя часть вопроса из «поверьте» в «проверьте».'
              : 'Authenticity in art rests on reputation, papers, experts. On trust. Paper is forged. Experts err. Galleries close. ArtKey adds an unforgeable layer — shifting part of the question from "trust me" to "verify me."'}
          </Typography>
        </div>
      </RevealOnScroll>

      {/* ═══ Building Blocks — 2×2 grid ═══ */}
      <RevealOnScroll direction="up" delay={100}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
            <Typography variant="h3">
              {isRu ? 'Строительные блоки' : 'Building Blocks'}
            </Typography>
          </div>
          <Typography variant="bodySm" tone="muted" style={{ marginBottom: '36px', maxWidth: '520px' }}>
            {isRu
              ? 'Четыре криптографических инструмента. Все работают десятилетиями: банки, мессенджеры, интернет.'
              : 'Four cryptographic tools. All proven over decades: banking, messengers, the internet.'}
          </Typography>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px',
          }}>
            {BUILDING_BLOCKS.map((block) => (
              <Card key={block.num} style={{ padding: '28px 28px 20px', position: 'relative', overflow: 'hidden' }}>
                {/* Large number watermark */}
                <span style={{
                  position: 'absolute', top: '-8px', right: '12px',
                  fontFamily: 'var(--font-brand)', fontSize: '5rem', fontWeight: 700,
                  color: 'var(--accent)', opacity: 0.06, lineHeight: 1,
                  pointerEvents: 'none', userSelect: 'none',
                }}>
                  {block.num}
                </span>

                <CardContent style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Typography variant="h5" style={{ position: 'relative' }}>
                    <span style={{ color: 'var(--accent)', marginRight: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 500 }}>
                      {block.num}
                    </span>
                    {isRu ? block.title : block.enTitle}
                  </Typography>

                  <Typography variant="bodySm" style={{ lineHeight: 1.65 }}>
                    {isRu ? block.simple : block.simpleEn}
                  </Typography>

                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)', borderLeft: '2px solid var(--accent)',
                  }}>
                    <Typography variant="bodyXs" style={{ lineHeight: 1.55 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {isRu ? 'ArtKey: ' : 'ArtKey: '}
                      </span>
                      {isRu ? block.artkey : block.artkeyEn}
                    </Typography>
                  </div>

                  {block.precise && (
                    <Typography variant="caption" tone="muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      {isRu ? block.precise : block.preciseEn}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      {/* ═══ Lifecycle — horizontal steps ═══ */}
      <RevealOnScroll direction="up" delay={120}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '28px' }}>
            <Typography variant="h3">
              {isRu ? 'Жизненный цикл' : 'Lifecycle'}
            </Typography>
            <Typography variant="bodySm" tone="muted">
              {isRu ? 'Lifecycle' : 'Жизненный цикл'}
            </Typography>
          </div>

          <div style={{
            display: 'flex', gap: '0',
            borderRadius: 'var(--radius)', overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {LIFECYCLE.map((item, idx) => (
              <div key={item.step} style={{
                flex: 1, padding: '28px 20px 24px',
                background: idx === 0 ? 'var(--surface)' : 'var(--bg)',
                borderLeft: idx > 0 ? '1px solid var(--border)' : 'none',
                textAlign: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: idx === 0 ? 'var(--accent)' : 'var(--surface)',
                  border: idx === 0 ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
                  color: idx === 0 ? 'var(--bg)' : 'var(--text-muted)',
                }}>
                  {item.step}
                </div>
                <Typography variant="bodySmMedium" style={{ marginBottom: '4px' }}>
                  {isRu ? item.title : item.enTitle}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {isRu ? item.desc : item.descEn}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      {/* ═══ How to verify ═══ */}
      <RevealOnScroll direction="up" delay={140}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
            <Typography variant="h3">
              {isRu ? 'Как проверить самому' : 'How to Verify'}
            </Typography>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { n: '1', t: isRu ? 'Пересчитайте отпечаток' : 'Recompute fingerprint', d: isRu ? 'SHA-256 файла работы → сверка с реестром' : 'SHA-256 of artwork file → check registry' },
              { n: '2', t: isRu ? 'Проверьте подписи' : 'Verify signatures', d: isRu ? 'Каждую — публичным ключом подписавшего' : 'Each — with signer\'s public key' },
              { n: '3', t: isRu ? 'Проверьте цепочку и время' : 'Verify chain & time', d: isRu ? 'Связь записей + метка времени по порядку' : 'Record linkage + timestamp order' },
            ].map((item) => (
              <Card key={item.n} style={{ padding: '24px', textAlign: 'center' }}>
                <CardContent style={{ padding: 0 }}>
                  <Typography variant="bodySmMedium" tone="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {isRu ? 'Шаг' : 'Step'} {item.n}
                  </Typography>
                  <Typography variant="h6" style={{ marginBottom: '6px' }}>{item.t}</Typography>
                  <Typography variant="bodySm" tone="muted">{item.d}</Typography>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card style={{ marginTop: '20px', padding: '24px', background: 'var(--surface)' }}>
            <CardContent style={{ padding: 0 }}>
              <Typography variant="bodySm" style={{ lineHeight: 1.7 }}>
                {isRu
                  ? 'Provenance можно выгрузить как подписанный JSON и проверить офлайн, независимым верификатором, без обращения к нашему серверу. Спецификация канонизации и хеширования открыта.'
                  : 'Provenance exports as signed JSON — verifiable offline with an independent verifier, no server contact needed. Canonicalization and hashing spec is open.'}
              </Typography>
            </CardContent>
          </Card>
        </div>
      </RevealOnScroll>

      {/* ═══ Proves / Doesn't — side by side ═══ */}
      <RevealOnScroll direction="up" delay={160}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '24px' }}>
            <Typography variant="h3">
              {isRu ? 'Что доказывает и что нет' : 'Proves & Doesn\'t'}
            </Typography>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Proves */}
            <Card style={{
              padding: '28px', borderColor: 'rgba(40,167,69,0.2)',
              background: 'linear-gradient(160deg, rgba(40,167,69,0.04) 0%, transparent 60%)',
            }}>
              <CardContent style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Badge variant="secondary" style={{
                  background: 'rgba(40,167,69,0.1)', color: '#28a745',
                  border: '1px solid rgba(40,167,69,0.2)', width: 'fit-content',
                }}>
                  {isRu ? 'Доказывает математически' : 'Mathematically proven'}
                </Badge>
                {PROVEN.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <div style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: '#28a745', flexShrink: 0,
                      }} />
                      <Typography variant="bodySmMedium">{isRu ? item.what : item.enWhat}</Typography>
                    </div>
                    <Typography variant="bodyXs" tone="muted" style={{ paddingLeft: '13px' }}>
                      {isRu ? item.detail : item.detailEn}
                    </Typography>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Requires trust */}
            <Card style={{
              padding: '28px', borderColor: 'rgba(240,173,78,0.2)',
              background: 'linear-gradient(160deg, rgba(240,173,78,0.04) 0%, transparent 60%)',
            }}>
              <CardContent style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Badge variant="secondary" style={{
                  background: 'rgba(240,173,78,0.1)', color: '#f0ad4e',
                  border: '1px solid rgba(240,173,78,0.2)', width: 'fit-content',
                }}>
                  {isRu ? 'Требует доверия' : 'Requires trust'}
                </Badge>
                {TRUST.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <div style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: '#f0ad4e', flexShrink: 0,
                      }} />
                      <Typography variant="bodySmMedium">{isRu ? item.what : item.enWhat}</Typography>
                    </div>
                    <Typography variant="bodyXs" tone="muted" style={{ paddingLeft: '13px' }}>
                      {isRu ? item.detail : item.detailEn}
                    </Typography>
                  </div>
                ))}
                <Typography variant="bodyXs" style={{ color: '#856404', opacity: 0.7, fontStyle: 'italic', paddingTop: '4px' }}>
                  {isRu
                    ? 'Первое звено — на доверии. ArtKey убирает доверие из всего остального.'
                    : 'First link relies on trust. ArtKey removes trust from everything else.'}
                </Typography>
              </CardContent>
            </Card>
          </div>
        </div>
      </RevealOnScroll>

      {/* ═══ Why not blockchain ═══ */}
      <RevealOnScroll direction="up" delay={180}>
        <div style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
            <Typography variant="h3">
              {isRu ? 'Почему не блокчейн' : 'Why Not Blockchain'}
            </Typography>
          </div>
          <Card style={{ padding: '28px', background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <CardContent style={{ padding: 0 }}>
              <Typography variant="body" tone="muted" style={{ lineHeight: 1.75 }}>
                {isRu
                  ? 'Подписи, хеш-цепочка и внешний якорь дают те же гарантии целостности — без распределённого консенсуса, токена и майнинга. Без энергозатрат и зависимости от чужой сети. Блокчейн решает задачу «доверие между незнакомцами без центра». У нас центр есть — платформа. Её возможную нечестность нейтрализуем подписями и внешним якорем. Для задачи «паспорт работы» это более прямой и дешёвый путь.'
                  : 'Signatures, hash chains, and an external anchor provide the same integrity guarantees — without distributed consensus, tokens, or mining. Without energy costs or network dependency. Blockchain solves "trust between strangers without a center." We have a center — the platform. Its potential dishonesty is neutralized by signatures and an external anchor. For an "artwork passport," this is more direct and cheaper.'}
              </Typography>
            </CardContent>
          </Card>
        </div>
      </RevealOnScroll>

      {/* ═══ Glossary ═══ */}
      <RevealOnScroll direction="up" delay={200}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px' }}>
            <Typography variant="h3">
              {isRu ? 'Глоссарий' : 'Glossary'}
            </Typography>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2px',
            background: 'var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {GLOSSARY.map((item) => (
              <div key={item.term} style={{
                padding: '16px 20px', background: 'var(--bg)',
              }}>
                <Typography variant="code" style={{ color: 'var(--accent)', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                  {item.term}
                </Typography>
                <Typography variant="bodyXs" tone="muted" style={{ lineHeight: 1.5 }}>
                  {isRu ? item.def : item.enDef}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>

      {/* ═══ Footer nav ═══ */}
      <RevealOnScroll direction="up" delay={240}>
        <div style={{
          display: 'flex', gap: '32px', flexWrap: 'wrap',
          paddingTop: '24px', borderTop: '1px solid var(--border)',
        }}>
          <Link to="/trust" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← {isRu ? 'Модель доверия' : 'Trust Model'}
          </Link>
          <Link to="/verify" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
            {isRu ? 'Проверить ArtKey' : 'Verify an ArtKey'} →
          </Link>
        </div>
      </RevealOnScroll>

    </div>
  )
}
