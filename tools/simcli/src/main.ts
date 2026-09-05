// Headless battle printer and scripted-run player (ARCHITECTURE.md §10.1).
//   npm run sim -- --seed 42 --a ant,cricket,horse --b beaver,duck --turn 3
//   npm run sim -- run --seed 42 --script tools/simcli/examples/basic-run.json
//   npm run sim -- list
import { simulate } from '@sam/sim'
import { CONTENT, teamFromString } from '@sam/content'
import { formatBattle, namer } from './format'
import { runScript } from './run-cli'

function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const flags: Record<string, string> = {}
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[arg.slice(2)] = next
      i++
    } else {
      flags[arg.slice(2)] = 'true'
    }
  }
  return { positional, flags }
}

const USAGE = `usage:
  npm run sim -- --seed <n> --turn <n> --a ant,cricket --b sloth:3/3
  npm run sim -- run --seed <n> --script <file.json>`

function main(): void {
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const command = positional[0] ?? 'battle'
  if (flags['help']) {
    console.log(USAGE)
    return
  }
  if (command === 'run') {
    if (!flags['script']) throw new Error('run needs --script <file.json>')
    runScript(flags['script'], flags['seed'] !== undefined ? Number(flags['seed']) : undefined)
    return
  }
  if (!flags['a'] && !flags['b']) {
    console.log(USAGE)
    return
  }
  const seed = Number(flags['seed'] ?? '1')
  const turn = Number(flags['turn'] ?? '1')
  const a = teamFromString(flags['a'] ?? '', 0)
  const b = teamFromString(flags['b'] ?? '', 1)
  console.log(formatBattle(simulate(a, b, seed, turn, CONTENT), turn, namer))
}

main()
