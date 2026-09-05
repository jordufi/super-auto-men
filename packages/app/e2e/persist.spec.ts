import { expect, test } from '@playwright/test'

test('a run survives a reload', async ({ page }) => {
  await page.goto('/?seed=42&speed=instant')
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('shop-slot-0').click()
    await page.getByTestId(`team-slot-${i}`).click()
    await page.getByTestId('end-turn').click()
    await page.getByTestId('continue').click()
  }
  await expect(page.getByTestId('turn')).toHaveText('3')
  const team = await page.locator('[data-testid^="team-slot-"] [data-defid]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-defid')),
  )
  const gold = await page.getByTestId('gold').textContent()

  await page.goto('/') // plain reload: no seed param, so the menu decides
  await page.getByTestId('continue-run').click()
  await expect(page.getByTestId('turn')).toHaveText('3')
  await expect(page.getByTestId('gold')).toHaveText(gold!)
  const restored = await page.locator('[data-testid^="team-slot-"] [data-defid]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-defid')),
  )
  expect(restored).toEqual(team)
})

test('the menu offers no Continue before anything has been played', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('continue-run')).toHaveCount(0)
})
