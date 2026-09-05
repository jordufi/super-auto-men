import { type Locator, type Page, expect, test } from '@playwright/test'

// Seed 42 makes the shop deterministic, so these assertions are stable.
const SHOP = '/?seed=42'

async function dragTo(page: Page, from: Locator, to: Locator): Promise<void> {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  // Several steps: the first move must cross the 6px threshold, the rest track the pointer.
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
}

const unitIn = (page: Page, slot: number): Locator =>
  page.getByTestId(`team-slot-${slot}`).locator('[data-defid]')

test.beforeEach(async ({ page }) => {
  await page.goto(SHOP)
  await expect(page.getByTestId('turn')).toHaveText('1')
})

test('drag a shop unit onto an empty team slot buys it', async ({ page }) => {
  const defId = await page.getByTestId('shop-card-0').getAttribute('data-defid')
  await dragTo(page, page.getByTestId('shop-slot-0'), page.getByTestId('team-slot-0'))
  await expect(unitIn(page, 0)).toHaveAttribute('data-defid', defId!)
  await expect(page.getByTestId('gold')).toContainText('7')
})

test('dragging a team unit onto another slot moves it', async ({ page }) => {
  await dragTo(page, page.getByTestId('shop-slot-0'), page.getByTestId('team-slot-0'))
  const defId = (await unitIn(page, 0).getAttribute('data-defid'))!
  await dragTo(page, page.getByTestId('team-slot-0'), page.getByTestId('team-slot-1'))
  await expect(unitIn(page, 1)).toHaveAttribute('data-defid', defId)
  await expect(page.getByTestId('team-slot-0').locator('[data-defid]')).toHaveCount(0)
})

test('dragging a team unit onto Sell gives gold back', async ({ page }) => {
  await dragTo(page, page.getByTestId('shop-slot-0'), page.getByTestId('team-slot-0'))
  await expect(page.getByTestId('gold')).toContainText('7')
  await dragTo(page, page.getByTestId('team-slot-0'), page.getByTestId('sell'))
  await expect(page.getByTestId('team-slot-0').locator('[data-defid]')).toHaveCount(0)
  await expect(page.getByTestId('gold')).toContainText('8')
})

test('a tap still selects and buys (Phase 8 behaviour survives)', async ({ page }) => {
  await page.getByTestId('shop-slot-1').click()
  await page.getByTestId('team-slot-2').click()
  await expect(unitIn(page, 2)).toBeVisible()
  await expect(page.getByTestId('gold')).toContainText('7')
})
