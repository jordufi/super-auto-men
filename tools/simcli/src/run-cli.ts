// `npm run sim -- run --script file.json`: plays a scripted run and prints every turn.
// Script: { "seed": 42, "turns": [ { "actions": [ShopAction...], "opponent": ["ant","sloth:2/2"] }, ... ] }
import { readFileSync } from 'node:fs'
import type { BattleEvent, ShopAction, ShopState } from '@sam/sim'
import { applyAction, endTurnAndBattle, startRun, unitsOf } from '@sam/sim'
import { CONTENT, teamFromSpec } from '@sam/content'
import { formatBattle, formatShopEvent, namer } from './format'

interface Script {
  seed: number
  turns: { actions: ShopAction[]; opponent: string[] }[]
}

function shopLines(s: ShopState): string[] {
  const shop = s.shop.map((x, i) => {
    const base = x.kind === 'unit' ? CONTENT.getUnit(x.defId).base : null
    const stats = base ? ` ${x.atk ?? base.atk}/${x.hp ?? base.hp}` : ''
    return `[${i}]${x.frozen ? '*' : ''} ${namer.name(x.defId)}${stats}`
  })
  const team = unitsOf(s.team).map((u) => `${namer.name(u.defId)} ${u.atk}/${u.hp} L${u.level}`)
  return [
    `Turn ${s.turn} · gold ${s.gold} · lives ${s.lives} · trophies ${s.trophies}`,
    `  shop: ${shop.join(' · ') || '(empty)'}   (* = frozen)`,
    `  team: ${team.join(' · ') || '(empty)'}`,
  ]
}

export function runScript(file: string, seedOverride?: number): void {
  const script = JSON.parse(readFileSync(file, 'utf8')) as Script
  const seed = seedOverride ?? script.seed
  const run = startRun(seed, CONTENT)
  console.log(`Run · seed ${seed}`)
  for (const turn of script.turns) {
    if (run.state.phase !== 'shop') break
    console.log('')
    for (const line of shopLines(run.state)) console.log(line)
    for (const action of turn.actions) {
      const before = run.state
      const events = applyAction(run, action, CONTENT)
      const ok = run.state !== before
      console.log(`  > ${JSON.stringify(action)}${ok ? '' : '   (refused)'}`)
      for (const e of events) console.log(`      ${formatShopEvent(e)}`)
      if (ok) console.log(`      gold ${run.state.gold} · team: ${teamLine(run.state)}`)
    }
    const result = endTurnAndBattle(run, teamFromSpec(turn.opponent, 1, 'Bot'), CONTENT)
    if (!result) break
    console.log('')
    console.log(
      formatBattle(result.log, result.log.teams[0] ? run.state.turn - 1 : 0, namer)
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n'),
    )
    console.log(`  => ${run.state.lastResult === 'a' ? 'WIN' : run.state.lastResult === 'b' ? 'LOSS' : 'DRAW'} · lives ${run.state.lives} · trophies ${run.state.trophies} · phase ${run.state.phase}`)
  }
  console.log('')
  console.log(`Final: ${run.state.phase} · turn ${run.state.turn} · lives ${run.state.lives} · trophies ${run.state.trophies}`)
}

function teamLine(s: ShopState): string {
  return unitsOf(s.team).map((u) => `${namer.name(u.defId)} ${u.atk}/${u.hp}`).join(' · ') || '(empty)'
}

export type { BattleEvent }
