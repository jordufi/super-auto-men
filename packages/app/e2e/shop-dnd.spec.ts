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

test('a unit that ate a food shows the item it is holding', async ({ page }) => {
  // Seed 1 puts honey in the turn-1 shop. Find it by defId, not by index: buying splices the
  // shop, so every slot after the bought one renumbers.
  await page.goto('/?seed=1')
  const honey = page
    .locator('[data-testid^="shop-slot-"]')
    .filter({ has: page.locator('[data-defid="honey"]') })
  await expect(honey).toHaveCount(1)

  await page.getByTestId('shop-slot-0').click()
  await page.getByTestId('team-slot-0').click()
  await expect(unitIn(page, 0)).toBeVisible()
  await expect(page.getByTestId('team-slot-0').getByTestId('statuses')).toHaveCount(0)

  await honey.click()
  await page.getByTestId('team-slot-0').click()
  await expect(page.getByTestId('team-slot-0').getByTestId('statuses')).toHaveAttribute(
    'data-statuses',
    'honey',
  )
})

test('every shop slot shows what it costs, and dims what you cannot afford', async ({ page }) => {
  await page.goto('/?seed=1')
  await expect(page.getByTestId('gold')).toContainText('10')
  const prices = page.locator('[data-testid^="price-"]')
  await expect(prices).toHaveCount(4) // 3 units + 1 food on turn 1
  for (const p of await prices.all()) {
    await expect(p).toHaveAttribute('data-cost', '3')
    await expect(p).toHaveAttribute('data-affordable', 'true')
  }

  // Spend down to 1 gold: every slot is now unaffordable and says so.
  await page.getByTestId('shop-slot-0').click()
  await page.getByTestId('team-slot-0').click()
  await page.getByTestId('shop-slot-0').click()
  await page.getByTestId('team-slot-1').click()
  for (let i = 0; i < 3; i++) await page.getByTestId('roll').click()
  await expect(page.getByTestId('gold')).toContainText('1')
  for (const p of await page.locator('[data-testid^="price-"]').all()) {
    await expect(p).toHaveAttribute('data-affordable', 'false')
  }
})

/**
 * Press-and-hold to read a card. These drive REAL touch input through CDP rather than dispatching
 * pointer events by hand: only real input reproduces pointer-capture retargeting, which is what
 * silently dismissed the tooltip mid-hold. Hand-dispatched events pass either way, so they are
 * worse than useless here.
 */
test.describe('press and hold to read a card', () => {
  test.use({ hasTouch: true, isMobile: true })

  async function touchInput(page: Page) {
    const cdp = await page.context().newCDPSession(page)
    const send = (type: string, x?: number, y?: number): Promise<unknown> =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: x!, y: y! }],
      } as never)
    return {
      down: (x: number, y: number) => send('touchStart', x, y),
      move: (x: number, y: number) => send('touchMove', x, y),
      up: () => send('touchEnd'),
    }
  }

  const tooltips = (page: Page): Promise<number> => page.getByTestId('ability-tooltip').count()

  /** Tap the card to select it, then press and hold it with a finger that drifts. */
  async function tapThenHold(page: Page, cardId: string): Promise<Record<string, number>> {
    const t = await touchInput(page)
    const b = (await page.getByTestId(cardId).boundingBox())!
    const x = b.x + b.width / 2
    const y = b.y + b.height / 2

    await t.down(x, y)
    await page.waitForTimeout(60)
    await t.up()
    await page.waitForTimeout(250)
    const afterTap = await tooltips(page)

    await t.down(x, y)
    await page.waitForTimeout(150)
    const holding = await tooltips(page)
    await t.move(x + 5, y + 3) // a resting finger is never perfectly still
    await page.waitForTimeout(250)
    const drifted = await tooltips(page)
    await t.up()
    await page.waitForTimeout(200)
    const released = await tooltips(page)

    return { afterTap, holding, drifted, released }
  }

  test('a shop card shows its text while held, even once it is selected', async ({ page }) => {
    await page.goto('/?seed=42')
    expect(await tapThenHold(page, 'shop-card-0')).toEqual({
      afterTap: 0, // a tap alone leaves nothing hanging over the board
      holding: 1,
      drifted: 1, // the drift must not be mistaken for the finger leaving
      released: 0,
    })
  })

  test('a team unit shows its text while held, even once it is selected', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('shop-slot-0').click()
    await page.getByTestId('team-slot-0').click()
    await page.waitForTimeout(200)
    const card = await page
      .getByTestId('team-slot-0')
      .locator('[data-defid]')
      .getAttribute('data-testid')
    expect(await tapThenHold(page, card!)).toEqual({
      afterTap: 0,
      holding: 1,
      drifted: 1,
      released: 0,
    })
  })
})
