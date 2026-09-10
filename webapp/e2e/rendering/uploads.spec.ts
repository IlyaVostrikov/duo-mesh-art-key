import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'

test('local upload intent uses multipart and preserves the uploaded file hash', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/uploads/presigned', route => route.fulfill({
    json: { transport: 'local', uploadUrl: '/api/uploads' },
  }))
  await page.route('**/api/uploads', route => {
    uploads++
    expect(route.request().method()).toBe('POST')
    expect(route.request().headers()['content-type']).toContain('multipart/form-data')
    return route.fulfill({ status: 201, json: {
      files: [{ name: 'test.glb', url: '/api/uploads/test/test.glb', size: 3, type: 'model/gltf-binary' }],
    } })
  })
  await page.goto('/e2e/rendering/harness.html')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/upload.ts'
    const { uploadFiles } = await import(modulePath)
    return uploadFiles([new File([new Uint8Array([1, 2, 3])], 'test.glb', { type: 'model/gltf-binary' })], 'fixture-token')
  })
  expect(uploads).toBe(1)
  expect(result.files[0].url).toMatch(/^http:\/\/.*\/api\/uploads\/test\/test.glb$/)
  expect(result.hashes['test.glb']).toBe(createHash('sha256').update(Buffer.from([1, 2, 3])).digest('hex'))
})

test('upload authorization failures do not fall back to local storage', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/uploads/presigned', route => route.fulfill({
    status: 403, json: { error: { code: 'FORBIDDEN', message: 'Forbidden' } },
  }))
  await page.route('**/api/uploads', route => { uploads++; return route.fulfill({ status: 500 }) })
  await page.goto('/e2e/rendering/harness.html')
  const error = await page.evaluate(async () => {
    const modulePath = '/src/lib/upload.ts'
    const { uploadFile } = await import(modulePath)
    try {
      await uploadFile(new File(['test'], 'test.glb'), 'fixture-token')
      return null
    } catch (error) {
      return (error as Error).message
    }
  })
  expect(error).toBe('Forbidden')
  expect(uploads).toBe(0)
})
