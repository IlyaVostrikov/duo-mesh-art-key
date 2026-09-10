import { test, expect } from '@playwright/test'

test('detail loads query URLs, survives failure and replaces the scene', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/e2e/rendering/harness.html')
  const viewer = page.locator('model-viewer')
  await expect.poll(() => viewer.evaluate((el: any) => el.loaded && el.modelIsVisible)).toBe(true)
  await expect(page.getByRole('status').filter({ hasText: '3D model' })).toHaveCount(0)
  // Loaded/visible can both be true while an incompatible Three version produces NaN transforms.
  await expect.poll(() => viewer.evaluate((el: any) => {
    const sceneKey = Object.getOwnPropertySymbols(el).find(key => key.description === 'scene')
    const scene = sceneKey ? el[sceneKey] : null
    return scene && scene.matrixWorld.elements.every(Number.isFinite)
  })).toBe(true)
  await page.getByText('Missing model', { exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByText('Unsupported model', { exact: true }).click()
  await expect(viewer).toHaveCount(0)
  await page.getByText('Replace model', { exact: true }).click()
  await expect.poll(() => viewer.evaluate((el: any) => el.loaded && el.modelIsVisible)).toBe(true)
  expect(errors).toEqual([])
})

test('hall keeps model bounds stable and recovers from a failed replacement', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/e2e/rendering/harness.html?hall')
  // Observe the actual rendered scene, not the network request finishing.
  const bounds = () => page.evaluate(() => {
    const scene = (window as any).__testScene
    let model: any
    scene?.traverse((node: any) => { if (node.name === 'Avocado') model = node })
    return model ? model.matrixWorld.toArray() : null
  })
  await expect.poll(bounds).not.toBeNull()
  const initial = await bounds()
  await page.getByText('Hover sculpture', { exact: true }).click()
  expect(await bounds()).toEqual(initial)
  await page.getByText('Missing model', { exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByText('Replace model', { exact: true }).click()
  await expect.poll(bounds).not.toBeNull()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})
