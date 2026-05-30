import { Hono } from 'hono'
import { ArtKeyService } from '../services/art-key.service'
import { generateCertificatePdf } from '../services/certificate-pdf'

type ArtKeyRouteEnv = {
  Variables: {
    artKeyService: ArtKeyService
  }
}

export function createArtKeyRoutes() {
  const routes = new Hono<ArtKeyRouteEnv>()

  // Public: download PDF certificate
  routes.get('/:keyCode/certificate.pdf', async (c) => {
    const svc = c.get('artKeyService')
    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)

    try {
      const pdf = await generateCertificatePdf(result)
      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="artkey-${result.artKey.keyCode}.pdf"`,
        },
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      return c.json({ error: 'PDF_GENERATION_FAILED', message: 'Could not generate certificate' }, 500)
    }
  })

  // Public: verify an ArtKey by keyCode
  routes.get('/:keyCode', async (c) => {
    const svc = c.get('artKeyService')
    const result = await svc.verify(c.req.param('keyCode'))
    if (!result) return c.json({ error: 'NOT_FOUND', message: 'ArtKey not found' }, 404)
    return c.json(result)
  })

  return routes
}
