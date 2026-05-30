import { readFileSync } from 'node:fs'
import QRCode from 'qrcode'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const VERIFY_BASE = process.env.PUBLIC_VERIFY_BASE ?? 'http://localhost:5173'

function loadFont(name: string): Uint8Array {
  // Windows dev; for Linux/macOS deployment, bundle fonts in backend/assets/fonts/
  return readFileSync(`C:/Windows/Fonts/${name}`)
}

export async function generateCertificatePdf(result: {
  artKey: { keyCode: string; integrityHash: string; issuedAt: string }
  artwork: { title: string; medium: string | null; year: number | null }
  artist: { displayName: string }
}) {
  const { artKey, artwork, artist } = result
  const verifyUrl = `${VERIFY_BASE}/verify/${encodeURIComponent(artKey.keyCode)}`

  // Generate QR code as PNG data URL → raw bytes
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, color: { dark: '#000', light: '#fff' } })
  const qrBase64 = qrDataUrl.split(',')[1]
  const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0))

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const FONT_REGULAR = loadFont('arial.ttf')
  const FONT_BOLD = loadFont('arialbd.ttf')
  const FONT_MONO = loadFont('cour.ttf')

  const font = await pdfDoc.embedFont(FONT_REGULAR)
  const fontBold = await pdfDoc.embedFont(FONT_BOLD)
  const mono = await pdfDoc.embedFont(FONT_MONO)

  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const qrImage = await pdfDoc.embedPng(qrBytes)

  const DARK = rgb(0.1, 0.1, 0.1)
  const MUTED = rgb(0.4, 0.4, 0.4)
  const ACCENT = rgb(0.05, 0.3, 0.6)

  let y = height - 60

  // Header
  page.drawText('DUO MESH ART KEY', { x: 60, y, size: 18, font: fontBold, color: ACCENT })
  y -= 28
  page.drawText('Certificate of Authenticity / Сертификат подлинности', { x: 60, y, size: 11, font, color: MUTED })
  y -= 36

  // Divider line
  page.drawLine({ start: { x: 60, y }, end: { x: width - 60, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 28

  // Artwork title
  page.drawText('Работа / Artwork', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(artwork.title, { x: 60, y, size: 13, font: fontBold, color: DARK })
  y -= 22

  // Artist
  page.drawText('Художник / Artist', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(artist.displayName, { x: 60, y, size: 12, font, color: DARK })
  y -= 22

  // Medium + Year
  const meta = [artwork.medium, artwork.year].filter(Boolean).join(' · ')
  if (meta) {
    page.drawText(meta, { x: 60, y, size: 10, font, color: MUTED })
    y -= 20
  }
  y -= 8

  // Divider
  page.drawLine({ start: { x: 60, y }, end: { x: width - 60, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 28

  // Key Code
  page.drawText('Ключ / Key Code', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(artKey.keyCode, { x: 60, y, size: 12, font: mono, color: ACCENT })
  y -= 24

  // Integrity Hash
  page.drawText('SHA-256 Integrity Hash', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(artKey.integrityHash, { x: 60, y, size: 8, font: mono, color: MUTED })
  y -= 28

  // Issue date
  page.drawText('Выдан / Issued', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(new Date(artKey.issuedAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }), { x: 60, y, size: 11, font, color: DARK })
  y -= 28

  // Divider
  page.drawLine({ start: { x: 60, y }, end: { x: width - 60, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 28

  // QR code
  page.drawText('Verify / Проверка', { x: 60, y, size: 9, font: fontBold, color: MUTED })
  y -= 16
  page.drawText(verifyUrl, { x: 60, y, size: 8, font: mono, color: MUTED })
  y -= 100
  page.drawImage(qrImage, { x: 60, y, width: 90, height: 90 })
  y -= 28

  // Footer
  page.drawText('Verified by DUO MESH ART KEY — cryptographically signed provenance chain.', { x: 60, y, size: 7, font, color: MUTED })
  y -= 14
  page.drawText('Проверено DUO MESH ART KEY — криптографически подписанная цепочка владения.', { x: 60, y, size: 7, font, color: MUTED })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
