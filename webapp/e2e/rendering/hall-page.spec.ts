import { test, expect } from '@playwright/test'
test('hall canvas and title fit the viewport inside the page transition', async ({page})=>{
 const hall={slug:'review',title:'Hall viewport check',description:null,coverImageUrl:null,viewCount:0,theme:null,customization:null,layoutConfig:null,artist:{id:'00000000-0000-4000-8000-000000000001',displayName:'Test artist',avatarUrl:null,verified:false},artworks:[]}
 await page.route('**/api/halls',route=>route.fulfill({json:[hall]}))
 await page.goto('/hall/review')
 const canvas=page.locator('#root canvas')
 await expect(canvas).toBeVisible()
 await expect.poll(async()=>Math.round((await canvas.boundingBox())!.y), { timeout: 15000 }).toBe(0)
 await expect(page.getByRole('heading',{name:hall.title})).toBeInViewport()
})
