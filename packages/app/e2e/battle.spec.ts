import { expect, test } from '@playwright/test'

test('instant speed shows the result straight away', async ({ page }) => {
  await page.goto('/?seed=42&screen=battle&speed=instant')
  await expect(page.getByTestId('battle-screen')).toBeVisible()
  await expect(page.getByTestId('battle-result')).toHaveText(/Victory|Defeat|Draw/, { timeout: 5000 })
})

test('at 1x the battle plays out, and Skip jumps to the end', async ({ page }) => {
  await page.goto('/?seed=42&screen=battle&speed=1')
  await expect(page.getByTestId('battle-screen')).toBeVisible()
  await expect(page.getByTestId('battle-result')).toHaveCount(0)
  await page.getByTestId('skip').click()
  await expect(page.getByTestId('battle-result')).toHaveText(/Victory|Defeat|Draw/)
})

test('Continue goes back to the shop for the next turn', async ({ page }) => {
  await page.goto('/?seed=42&screen=battle&speed=instant')
  await page.getByTestId('continue').click()
  await expect(page.getByTestId('turn')).toHaveText('2')
  await expect(page.getByTestId('gold')).toContainText('10')
})

test('a battle played from the shop replays on the battle screen', async ({ page }) => {
  await page.goto('/?seed=42&speed=instant')
  await page.getByTestId('shop-slot-0').click()
  await page.getByTestId('team-slot-0').click()
  await page.getByTestId('end-turn').click()
  await expect(page.getByTestId('battle-screen')).toBeVisible()
  await expect(page.getByTestId('battle-result')).toBeVisible()
})

test('the top bar shows the pre-battle run while the fight replays, not the outcome', async ({ page }) => {
  // `endTurnAndBattle` advances the run before the log is played, so the screen must render the
  // snapshot taken before the result landed or it spoils the fight it is replaying.
  await page.goto('/?seed=42&speed=1')
  await page.getByTestId('shop-slot-0').click()
  await page.getByTestId('team-slot-0').click()
  await page.getByTestId('end-turn').click()
  await expect(page.getByTestId('battle-screen')).toBeVisible()
  await expect(page.getByTestId('turn')).toHaveText('1')
  await expect(page.getByTestId('trophies')).toHaveText('0/10')
  await expect(page.getByTestId('lives')).toHaveText('5')

  // Only once the result overlay is up does the run's new standing appear.
  await page.getByTestId('skip').click()
  await expect(page.getByTestId('battle-result')).toBeVisible()
})
