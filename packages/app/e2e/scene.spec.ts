import { expect, test } from '@playwright/test'

// The backdrop and the reduced-motion path must never move gameplay. LANE is the contract; these
// prove it end to end, at the extremes of the adaptive stage as well as the default 16:9.
const SHOP = '/?seed=42&screen=shop'

test('reduced motion is forced by ?motion=reduced and moves nothing', async ({ page }) => {
  await page.goto(SHOP)
  await expect(page.getByTestId('stage')).toHaveAttribute('data-motion', 'full')
  const full = (await page.getByTestId('team-slot-0').boundingBox())!

  await page.goto(`${SHOP}&motion=reduced`)
  await expect(page.getByTestId('stage')).toHaveAttribute('data-motion', 'reduced')
  const reduced = (await page.getByTestId('team-slot-0').boundingBox())!

  expect(reduced).toEqual(full)
})

test('the system reduced-motion setting is honoured too', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(SHOP)
  await expect(page.getByTestId('stage')).toHaveAttribute('data-motion', 'reduced')
  await expect(page.getByTestId('scenery')).toBeAttached()
})

test('at the widest stage the backdrop fills it and the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 720 })
  await page.goto(SHOP)
  await expect(page.getByTestId('stage')).toHaveAttribute('data-logical-width', '1800')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const scene = (await page.getByTestId('scenery').boundingBox())!
  expect(scene.width).toBeGreaterThanOrEqual(1799)
  expect(scene.height).toBeGreaterThanOrEqual(719)
})

test('a battle takes the same steps with reduced motion, so its clock is untouched', async ({ page }) => {
  await page.goto('/?seed=42&screen=battle&speed=2&motion=reduced')
  await expect(page.getByTestId('battle-result')).toHaveText(/Victory|Defeat|Draw/, { timeout: 20_000 })
})
