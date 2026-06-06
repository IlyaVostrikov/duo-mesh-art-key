/**
 * DUO MESH ART KEY — Certificate of Authenticity PDF generator
 *
 * Two-page A4 certificate matching the HTML/CSS design handoff.
 * Font sizes scaled ~30% from CSS screen minimums to fit A4 print.
 * Embeds artwork poster image when available.
 *
 * NOTE: pdf-lib positions text by BASELINE (not visual top).
 * All draw helpers account for this — y is treated as visual-top.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import QRCode from 'qrcode'
import { PDFDocument, rgb, type PDFPage, type PDFFont, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const VERIFY_BASE = process.env.PUBLIC_VERIFY_BASE ?? 'http://localhost:5173'

// ─── Design tokens (from certificate.css) ───

const C = {
  paper: rgb(0.957, 0.953, 0.945),   // --paper #f4f3f1
  sheet: rgb(0.980, 0.976, 0.969),   // --sheet #faf9f7
  paper2: rgb(0.925, 0.914, 0.894),  // --paper-2 #ece9e4
  ink: rgb(0.086, 0.078, 0.059),     // --ink #16140f
  noir: rgb(0.047, 0.043, 0.039),    // --noir #0c0b0a
  onNoir: rgb(0.937, 0.925, 0.902),  // --on-noir #efece6
} as const

const O = { i2: 0.62, i3: 0.40, i4: 0.26, hair: 0.16, soft: 0.08, on3: 0.30, nHair: 0.16 } as const

type Ink = { c: RGB; o?: number }

const ik = (o?: number): Ink => ({ c: C.ink as RGB, ...(o != null ? { o } : {}) })
const onN = (o?: number): Ink => ({ c: C.onNoir as RGB, ...(o != null ? { o } : {}) })

// Preset inks
const I1  = ik()
const I2  = ik(O.i2)
const I3  = ik(O.i3)
const I4  = ik(O.i4)
const IH  = ik(O.hair)
const IS  = ik(O.soft)

const ON  = onN()
const ON3 = onN(O.on3)
const ONH = onN(O.nHair)

// ─── Fonts ───

const FONT_DIR = resolve(import.meta.dir, '../../assets/fonts')

interface Fonts { sans: PDFFont; sansB: PDFFont; mono: PDFFont }

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  const emb = async (n: string) => { const p = resolve(FONT_DIR, n); if (!existsSync(p)) return null; try { return await doc.embedFont(readFileSync(p)) } catch { return null } }
  const sans  = await emb('PTSans-Regular.ttf')
  const sansB = await emb('PTSans-Bold.ttf')
  const mono  = await emb('PTMono-Regular.ttf') ?? await emb('SpaceMono-Regular.ttf')
  const sys = async (ns: string[]) => { for (const n of ns) { const p = resolve('C:/Windows/Fonts', n); if (!existsSync(p)) continue; try { return await doc.embedFont(readFileSync(p)) } catch { continue } } throw new Error('No font') }
  return {
    sans:  sans  ?? await sys(['arial.ttf']),
    sansB: sansB ?? await sys(['arialbd.ttf', 'arial.ttf']),
    mono:  mono  ?? await sys(['cour.ttf', 'consola.ttf', 'arial.ttf']),
  }
}

// ─── Draw context ───

interface Ctx { page: PDFPage; f: Fonts; x: number; y: number; w: number; gap(pts: number): void }

/**
 * pdf-lib positions text by BASELINE (ascenders extend upward from y).
 * We want y to mean "visual top of text" so spacing between sections is
 * predictable.  The ascender (~cap height) is roughly 0.72× font-size.
 */
function baseline(font: PDFFont, size: number, topY: number): number {
  return topY - font.heightAtSize(size) * 0.72
}

function ln(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, thick: number, ink: Ink) {
  ctx.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: thick, color: ink.c, opacity: ink.o })
}
function hl(ctx: Ctx, ink = IH) { ln(ctx, ctx.x, ctx.y, ctx.x + ctx.w, ctx.y, 0.75, ink) }

// Text draw — y is VISUAL TOP
function T(ctx: Ctx, text: string, x: number, y: number, font: PDFFont, size: number, ink = I1) {
  ctx.page.drawText(text, { x, y: baseline(font, size, y), size, font, color: ink.c, ...(ink.o != null ? { opacity: ink.o } : {}) })
}
function s(ctx: Ctx, text: string, x: number, y: number, size: number, ink?: Ink)  { T(ctx, text, x, y, ctx.f.sans,  size, ink) }
function sb(ctx: Ctx, text: string, x: number, y: number, size: number, ink?: Ink) { T(ctx, text, x, y, ctx.f.sansB, size, ink) }
function m(ctx: Ctx, text: string, x: number, y: number, size: number, ink?: Ink)  { T(ctx, text, x, y, ctx.f.mono,  size, ink) }

function sc(ctx: Ctx, text: string, y: number, size: number, ink?: Ink) { s(ctx, text, ctx.x + (ctx.w - ctx.f.sans.widthOfTextAtSize(text, size)) / 2, y, size, ink) }
function mc(ctx: Ctx, text: string, y: number, size: number, ink?: Ink) { m(ctx, text, ctx.x + (ctx.w - ctx.f.mono.widthOfTextAtSize(text, size)) / 2, y, size, ink) }

/** Height of a block of text — approximate bottom of descenders from the visual top */
function textBlockHeight(font: PDFFont, size: number): number {
  return font.heightAtSize(size)
}

// ─── Page shell ───

const A4 = { w: 595, h: 842 }
const MARGIN   = 40   // ~14mm
const SHEET_X  = MARGIN
const SHEET_W  = A4.w - MARGIN * 2
const SHEET_Y  = A4.h - MARGIN            // top edge of sheet
const SHEET_H  = A4.h - MARGIN * 2        // 762pt
const SHEET_BOT = SHEET_Y - SHEET_H       // 40
const KEYLINE  = 12
const PAD_T    = 32                        // top padding inside keyline
const PAD_S    = 26                        // side padding
const CONTENT_X = SHEET_X + PAD_S
const CONTENT_W = SHEET_W - PAD_S * 2      // 463pt

function makeSheet(doc: PDFDocument): { page: PDFPage; startY: number } {
  const page = doc.addPage([A4.w, A4.h])

  // Paper background (full page)
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: C.paper })

  // Sheet (white rectangle)
  page.drawRectangle({ x: SHEET_X, y: SHEET_BOT, width: SHEET_W, height: SHEET_H, color: C.sheet, borderColor: C.ink, borderWidth: 0.75, opacity: O.hair })

  // Inner keyline
  page.drawRectangle({ x: SHEET_X + KEYLINE, y: SHEET_BOT + KEYLINE, width: SHEET_W - KEYLINE * 2, height: SHEET_H - KEYLINE * 2, borderColor: C.ink, borderWidth: 0.75, opacity: O.soft })

  // Corner registration marks (16px L-shapes)
  function cm(cx: number, cy: number, h: 1 | -1, v: 1 | -1) {
    const st = { thickness: 1.4, color: C.ink, opacity: O.i3 }
    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + 16 * h, y: cy }, ...st })
    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy - 16 * v }, ...st })
  }
  cm(SHEET_X + KEYLINE,       SHEET_Y - KEYLINE,       1, -1)
  cm(SHEET_X + SHEET_W - KEYLINE, SHEET_Y - KEYLINE,       -1, -1)
  cm(SHEET_X + KEYLINE,       SHEET_Y - SHEET_H + KEYLINE, 1,  1)
  cm(SHEET_X + SHEET_W - KEYLINE, SHEET_Y - SHEET_H + KEYLINE, -1,  1)

  // startY = visual top of content area (below sheet top, keyline, and pad)
  return { page, startY: SHEET_Y - PAD_T }
}

function makeCtx(page: PDFPage, f: Fonts, startY: number): Ctx {
  return { page, f, x: CONTENT_X, y: startY, w: CONTENT_W, gap(pts: number) { this.y -= pts } }
}

// ─── Image loader ───

async function loadPosterImage(doc: PDFDocument, url: string | null | undefined) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) { console.warn('[cert-pdf] poster fetch failed:', res.status, url.slice(0, 80)); return null }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 64) { console.warn('[cert-pdf] poster too small:', buf.length); return null }
    // Detect format by magic bytes
    if (buf[0] === 0x89 && buf[1] === 0x50) return await doc.embedPng(buf)
    if (buf[0] === 0xFF && buf[1] === 0xD8) return await doc.embedJpg(buf)
    // WebP RIFF header
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      console.warn('[cert-pdf] WebP not supported by pdf-lib, converting would need sharp')
      return null
    }
    return await doc.embedPng(buf)
  } catch (e) { console.warn('[cert-pdf] poster load error:', e); return null }
}

// ═══════════════════════════════════════════════════════════════
// PAGE 1: Masthead → Title → Body (artwork + registry) → Crypto
// ═══════════════════════════════════════════════════════════════

function drawMasthead(ctx: Ctx) {
  const { page, f: fu, x, w } = ctx
  const rx = x + w
  const y = ctx.y  // visual top of masthead

  // ── Left: brand lockup ──
  // Glyph circle (14px → 7pt radius at print scale)
  const gr = 7
  const gy = y - gr  // visual center
  page.drawCircle({ x: x + gr, y: gy - 1, size: gr, borderColor: C.ink, borderWidth: 1.6 })
  page.drawCircle({ x: x + gr, y: gy - 1, size: 3.6, color: C.ink })

  sb(ctx, 'DUO MESH', x + 18, y, 11)
  m(ctx, 'ART KEY · PROVENANCE', x + 18, y - 16, 7.5, I3)

  // ── Right: doc label + edition ──
  const doc = 'Certificate of Authenticity / Сертификат подлинности'
  s(ctx, doc, rx - fu.sans.widthOfTextAtSize(doc, 9.5), y, 9.5, I2)
  m(ctx, 'EDITION № 0001 · 1 / 1', rx - fu.mono.widthOfTextAtSize('EDITION № 0001 · 1 / 1', 7.5), y - 18, 7.5, I3)

  // Masthead bottom: gap + hairline
  ctx.gap(32); hl(ctx); ctx.gap(8)
}

function drawTitle(ctx: Ctx) {
  ctx.gap(16)

  // Kicker
  mc(ctx, 'Доказуемая подлинность произведения', ctx.y, 7.5, I3)
  ctx.gap(16)

  // H1 — two lines
  sc(ctx, 'Сертификат', ctx.y, 22)
  sc(ctx, 'подлинности', ctx.y - 28, 22)

  // EN subtitle
  sc(ctx, 'Certificate of Authenticity', ctx.y - 52, 9, I3)

  ctx.gap(60); ctx.gap(16); hl(ctx); ctx.gap(8)
}

async function drawBody(
  ctx: Ctx,
  artwork: { title: string; medium: string | null; year: number | null; posterUrl?: string | null },
  artist: { displayName: string },
  issuedDate: string,
  doc: PDFDocument,
) {
  const { page, f: fu, x, w } = ctx
  const colGap = 24
  const c1 = w * 0.46                  // left column width (artwork frame)
  const c2 = c1 + colGap               // right column start x
  const c2w = w - c2                   // right column width

  const y0 = ctx.y                     // visual top of grid
  const fh = 220                       // artwork frame height
  const fx = x
  const fy = y0 - fh                   // frame top

  // ── Artwork frame ──
  const posterImg = await loadPosterImage(doc, artwork.posterUrl)

  if (posterImg) {
    const imgW = posterImg.width, imgH = posterImg.height
    const scale = Math.min(c1 / imgW, fh / imgH)
    const dw = imgW * scale, dh = imgH * scale
    const dx = fx + (c1 - dw) / 2
    const dy = fy + (fh - dh) / 2
    page.drawImage(posterImg, { x: dx, y: dy, width: dw, height: dh })
    page.drawRectangle({ x: fx, y: fy, width: c1, height: fh, borderColor: C.ink, borderWidth: 0.75, opacity: O.hair })
  } else {
    // Placeholder: subtle paper-2 background
    page.drawRectangle({ x: fx, y: fy, width: c1, height: fh, color: C.paper2, borderColor: C.ink, borderWidth: 0.75, opacity: O.hair })
    const ph = 'Изображение работы'
    s(ctx, ph, fx + (c1 - fu.sans.widthOfTextAtSize(ph, 8.5)) / 2, fy + fh / 2 + 4, 8.5, I3)
  }

  // Frame corner marks (L-shapes, 13px, offset -7px from frame edge)
  function fcm(cx: number, cy: number, h: 1 | -1, v: 1 | -1) {
    const st = { thickness: 1.5, color: C.ink, opacity: 0.55 }
    const off = -7, len = 13
    page.drawLine({ start: { x: cx + off * h, y: cy + off * v }, end: { x: cx + off * h + len * h, y: cy + off * v }, ...st })
    page.drawLine({ start: { x: cx + off * h, y: cy + off * v }, end: { x: cx + off * h, y: cy + off * v - len * v }, ...st })
  }
  fcm(fx,      y0, 1, -1)
  fcm(fx + c1, y0, -1, -1)
  fcm(fx,      fy, 1,  1)
  fcm(fx + c1, fy, -1,  1)

  // Plate below frame
  const plate = `«${artwork.title}» · ${artist.displayName} · ${artwork.year ?? '2026'}`
  mc(ctx, plate, fy - 24, 8.5, I3)

  // ── Registry column ──
  let ry = y0
  function reg(lab: string, val: string, valSize: number, muted = false) {
    m(ctx, lab, c2, ry, 7.5, I3)
    s(ctx, val, c2, ry - 12, valSize, muted ? I3 : I1)
    ry -= 36
    if (ry > fy + 14) ln(ctx, c2, ry + 8, c2 + c2w, ry + 8, 0.5, IS)
  }
  reg('Работа / Artwork',                          artwork.title,    16)
  reg('Художник / Artist',                         artist.displayName, 13)
  reg('Владелец / Owner',                          'имя приобретателя', 12, true)
  reg('Тираж · техника / Edition · medium',         `${artwork.medium ?? 'Единственный экземпляр'} · 1 / 1`, 12, true)
  reg('Выдан / Issued',                            issuedDate,        12)

  ctx.y = fy - 40
  ctx.gap(24)
}

function drawCrypto(ctx: Ctx, keyCode: string, hash: string) {
  const { page, w, x } = ctx
  const bh = 106                     // band height
  const y0 = ctx.y                   // visual top of band
  const pad = 22

  // Dark band background
  page.drawRectangle({ x, y: y0 - bh, width: w, height: bh, color: C.noir })
  // Inner hairline border
  page.drawRectangle({ x: x + 7, y: y0 - bh + 7, width: w - 14, height: bh - 14, borderColor: C.onNoir, borderWidth: 0.75, opacity: O.nHair })

  // ── Left: Key block ──
  const lx = x + pad
  m(ctx, 'Ключ / Key Code', lx, y0 - 8, 7.5, ON3)

  // Key icon (circle + line)
  const kx = lx, ky = y0 - 48
  page.drawCircle({ x: kx + 12, y: ky + 7, size: 12, borderColor: C.onNoir, borderWidth: 1.5, opacity: 0.85 })
  ln(ctx, kx + 15, ky + 9, kx + 22, ky + 3, 1.5, { c: C.onNoir, o: 0.85 })

  m(ctx, keyCode, lx + 34, y0 - 44, 14, ON)

  // ── Divider ──
  const dx = x + w * 0.44
  ln(ctx, dx, y0 - bh + 16, dx, y0 - 16, 0.75, ONH)

  // ── Right: Hash block ──
  const hx = dx + 20
  m(ctx, 'SHA-256 Integrity Hash', hx, y0 - 8, 7.5, ON3)
  const split = 36
  m(ctx, hash.slice(0, split), hx, y0 - 30, 9, ON)
  m(ctx, hash.slice(split),     hx, y0 - 46, 9, ON)

  ctx.y = y0 - bh - 16
  ctx.gap(26)
}

// ═══════════════════════════════════════════════════════════════
// PAGE 2: Guarantee → Provenance → Verify → Signatures → Closing
// ═══════════════════════════════════════════════════════════════

function drawGuarantee(ctx: Ctx) {
  ctx.gap(20)
  mc(ctx, 'Что подтверждает этот ключ', ctx.y, 7.5, I3)
  ctx.gap(26)

  const cw = (ctx.w - 36) / 3   // column width
  const cg = 18                  // gap between columns
  const y0 = ctx.y               // visual top of 3-column grid

  const cols = [
    ['01 — Подлинность', 'Оригинал, доказанный математикой', 'Работа сведена к единственному отпечатку SHA-256. Изменить его незаметно невозможно — это и есть доказательство оригинала, а не обещание.'],
    ['02 — Владение',    'Неразрывная история передач',      'Каждая смена владельца фиксируется и связывается с предыдущей записью. Цепочка от художника до вас не переписывается и не прерывается.'],
    ['03 — Проверка',    'Подтверждение за секунды',          'Один скан кода ниже открывает живую provenance-историю работы. Подлинность можно проверить в любой точке мира, не доверяя на слово.'],
  ]

  let maxH = 0
  for (let i = 0; i < 3; i++) {
    const cx = ctx.x + i * (cw + cg)
    const [num, h3, body] = cols[i]

    m(ctx, num, cx, y0, 7.5, I3)
    s(ctx, h3, cx, y0 - 14, 12, I1)

    // Simple word-wrap for paragraph
    let line = '', ly = y0 - 32
    for (const w of body.split(' ')) {
      const test = line ? `${line} ${w}` : w
      if (ctx.f.sans.widthOfTextAtSize(test, 10) > cw && line) {
        s(ctx, line, cx, ly, 10, I2)
        line = w
        ly -= 16
      } else { line = test }
    }
    if (line) s(ctx, line, cx, ly, 10, I2)
    const colH = y0 - (ly - textBlockHeight(ctx.f.sans, 10))
    if (colH > maxH) maxH = colH
  }

  ctx.gap(maxH + 14)
  ctx.gap(20); hl(ctx); ctx.gap(8)
}

function drawProvenance(ctx: Ctx) {
  const { page, f: fu, x, w } = ctx
  ctx.gap(22)
  mc(ctx, 'Цепочка владения / Provenance', ctx.y, 7.5, I3)
  ctx.gap(24)

  const tw = Math.min(w * 0.82, 480)
  const tx0 = x + (w - tw) / 2
  const ty = ctx.y - 14                    // y of connector line (= center of medallions)

  // Horizontal connector line
  ln(ctx, tx0 + tw * 0.07, ty, tx0 + tw * 0.93, ty, 0.75, IH)

  const ns = tw / 2                        // spacing between nodes
  const nodes = [
    { hash: '0x1a · genesis', role: 'Художник',       sub: 'iv · выпуск ключа',   live: true },
    { hash: '0x9c · 2026',    role: 'Приобретатель',   sub: 'текущий владелец',    live: true },
    { hash: '— · открыто',     role: 'Будущая передача', sub: 'цепочка продолжится', live: false },
  ]

  for (let i = 0; i < 3; i++) {
    const nx = tx0 + i * ns, n = nodes[i]
    const R = 16  // medallion radius

    // Hash chip above medallion
    m(ctx, n.hash, nx - fu.mono.widthOfTextAtSize(n.hash, 7) / 2, ty + 18, 7, I3)

    // Medallion circle
    page.drawCircle({ x: nx, y: ty, size: R, borderColor: C.ink, borderWidth: 1.4, opacity: n.live ? 1 : O.i3, color: C.sheet })

    // Role + sub below medallion
    s(ctx, n.role, nx - fu.sans.widthOfTextAtSize(n.role, 10.5) / 2, ty - R - 12, 10.5, I1)
    s(ctx, n.sub,  nx - fu.sans.widthOfTextAtSize(n.sub, 8)  / 2, ty - R - 24, 8, I3)
  }

  ctx.gap(60)
  ctx.gap(16); hl(ctx); ctx.gap(8)
}

async function drawVerify(ctx: Ctx, verifyUrl: string) {
  const { page, x } = ctx
  ctx.gap(22)

  // ── QR badge ──
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 130, margin: 2, color: { dark: '#000', light: '#fff' } })
  const qrImage = await page.doc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'))
  const qs = 80, qpad = 8
  const qrBox = qs + qpad * 2         // 96pt
  const qrY = ctx.y - qrBox           // top of QR badge

  page.drawRectangle({ x, y: qrY, width: qrBox, height: qrBox, borderColor: C.ink, borderWidth: 0.75, opacity: O.hair, color: C.sheet })
  page.drawImage(qrImage, { x: x + qpad, y: qrY + qpad, width: qs, height: qs })

  // ── Right: verify text ──
  const tx = x + qrBox + 20
  m(ctx, 'Verify / Проверка', tx, ctx.y, 7.5, I3)
  s(ctx, 'Наведите камеру на код — откроется живая', tx, ctx.y - 18, 12.5, I1)
  s(ctx, 'история владения этой работой.',           tx, ctx.y - 34, 12.5, I1)
  m(ctx, `duomesh.art/verify/${verifyUrl.split('/').pop()}`, tx, ctx.y - 54, 8.5, I2)

  ctx.y = qrY - 12
  ctx.gap(24); hl(ctx); ctx.gap(8)
}

function drawSignatures(ctx: Ctx, artistName: string) {
  const { page, f: fu, x, w } = ctx
  ctx.gap(20)

  // Three equal-ish columns: signature | seal | signature
  const colW = (w - 40) / 3
  const sy = ctx.y

  // ── Left: Artist ──
  ln(ctx, x, sy, x + colW, sy, 1, I1)
  m(ctx, 'Художник / Artist', x, sy - 10, 7.5, I3)
  s(ctx, artistName,          x, sy - 22, 11, I1)
  m(ctx, 'genesis-ключ · автор', x, sy - 34, 8, I3)

  // ── Center: Wax seal ──
  const sx2 = x + colW + 20 + (w - 2 * colW - 40) / 2
  const scy = sy - 8
  page.drawCircle({ x: sx2, y: scy, size: 45, borderColor: C.ink, borderWidth: 0.75, opacity: O.i4 })
  page.drawCircle({ x: sx2, y: scy, size: 35, borderColor: C.ink, borderWidth: 0.75, opacity: O.hair })
  page.drawCircle({ x: sx2, y: scy, size: 13, borderColor: C.ink, borderWidth: 1.6 })
  page.drawCircle({ x: sx2, y: scy, size: 6,  color: C.ink })
  const sealT = '· DUO MESH ART KEY · CRYPTOGRAPHICALLY SIGNED ·'
  m(ctx, sealT, sx2 - fu.mono.widthOfTextAtSize(sealT, 6) / 2, scy - 53, 6, I2)

  // ── Right: Registry ──
  const rx = x + w
  ln(ctx, rx - colW, sy, rx, sy, 1, I1)
  m(ctx, 'Реестр / Registry', rx - fu.mono.widthOfTextAtSize('Реестр / Registry', 7.5), sy - 10, 7.5, I3)
  s(ctx, 'DUO MESH',           rx - fu.sans.widthOfTextAtSize('DUO MESH', 11),           sy - 22, 11, I1)
  m(ctx, 'provenance authority', rx - fu.mono.widthOfTextAtSize('provenance authority', 8), sy - 34, 8, I3)

  ctx.gap(60)
}

function drawClosing(ctx: Ctx) {
  const { page, f: fu, x, w } = ctx
  ctx.gap(16); hl(ctx, IS); ctx.gap(14)

  // Verified badge (checkmark circle)
  const cr = 7
  const cy2 = ctx.y - cr
  page.drawCircle({ x: x + cr, y: cy2, size: cr, borderColor: C.ink, borderWidth: 1.3 })
  // Checkmark path: two lines forming a check
  ln(ctx, x + 3, cy2 + 3, x + 6,  cy2 + 5.5, 1.3, { c: C.ink })
  ln(ctx, x + 6, cy2 + 5.5, x + 10.5, cy2 + 0.5, 1.3, { c: C.ink })

  m(ctx, 'VERIFIED BY DUO MESH ART KEY — CRYPTOGRAPHICALLY SIGNED PROVENANCE CHAIN', x + 20, ctx.y, 8, I2)
  m(ctx, '© 2026 DUO MESH', x + w - fu.mono.widthOfTextAtSize('© 2026 DUO MESH', 8), ctx.y, 8, I3)
}

// ─── Main export ───

export async function generateCertificatePdf(result: {
  artKey:  { keyCode: string; integrityHash: string; issuedAt: string }
  artwork: { title: string; medium: string | null; year: number | null; posterUrl?: string | null }
  artist:  { displayName: string }
}) {
  const { artKey, artwork, artist } = result
  const verifyUrl = `${VERIFY_BASE}/verify/${encodeURIComponent(artKey.keyCode)}`
  const issuedDate = new Date(artKey.issuedAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })

  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const f = await loadFonts(doc)

  // ─── Page 1: Masthead → Title → Body → Crypto ───
  const s1 = makeSheet(doc)
  const c1 = makeCtx(s1.page, f, s1.startY)
  drawMasthead(c1)
  drawTitle(c1)
  await drawBody(c1, artwork, artist, issuedDate, doc)
  drawCrypto(c1, artKey.keyCode, artKey.integrityHash)

  // ─── Page 2: Guarantee → Provenance → Verify → Signatures → Closing ───
  const s2 = makeSheet(doc)
  const c2 = makeCtx(s2.page, f, s2.startY)
  drawGuarantee(c2)
  drawProvenance(c2)
  await drawVerify(c2, verifyUrl)
  drawSignatures(c2, artist.displayName)
  drawClosing(c2)

  return Buffer.from(await doc.save())
}
