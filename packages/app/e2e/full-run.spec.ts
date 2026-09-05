import { type Page, expect, test } from '@playwright/test'

/** Buy the first shop unit into the first empty slot, if both exist and there is gold. */
async function buySomething(page: Page): Promise<void> {
  for (let slot = 0; slot < 5; slot++) {
    const target = page.getByTestId(`team-slot-${slot}`)
    if ((await target.locator('[data-defid]').count()) > 0) continue
    const card = page.getByTestId('shop-card-0')
    if ((await card.count()) === 0) return
    await page.getByTestId('shop-slot-0').click()
    await target.click()
    return
  }
}

test('a whole run can be played from the menu to the run-end screen', async ({ page }) => {
  await page.goto('/?speed=instant')
  await page.getByTestId('seed-input').fill('42')
  await page.getByTestId('new-run').click()
  await expect(page.getByTestId('turn')).toHaveText('1')

  for (let turn = 0; turn < 25; turn++) {
    if ((await page.getByTestId('run-end').count()) > 0) break
    await buySomething(page)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('battle-result')).toBeVisible()
    await page.getByTestId('continue').click()
  }

  await expect(page.getByTestId('run-end')).toBeVisible()
  await expect(page.getByTestId('run-end')).toHaveText(/You win!|Run over/)
  await page.screenshot({ path: 'test-results/full-run-end.png' })

  await page.getByTestId('back-to-menu').click()
  await expect(page.getByTestId('new-run')).toBeVisible()
  await expect(page.getByTestId('continue-run')).toHaveCount(0) // finishing a run clears the save
})
