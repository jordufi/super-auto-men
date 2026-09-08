// The white "what this unit does" card. Used twice: as the hover/hold tooltip on a unit card,
// and as the call-out the battle screen shows while an ability fires.
import type { ReactNode } from 'react'
import type { Trigger } from '@sam/sim'
import { UnitSprite } from './UnitSprite'
import { TierBadge } from './TierBadge'

/** The raw trigger names are code identifiers; players get plain words. */
const TRIGGER_LABEL: Record<Trigger, string> = {
  onBuy: 'Buy',
  onSell: 'Sell',
  onLevelUp: 'Level up',
  onEatFood: 'Eats food',
  onFriendEatsFood: 'Friend eats food',
  onStartOfTurn: 'Start of turn',
  onEndOfTurn: 'End of turn',
  onShopRoll: 'Roll',
  onStartOfBattle: 'Start of battle',
  onBeforeAttack: 'Before attack',
  onAfterAttack: 'After attack',
  onHurt: 'Hurt',
  onFaint: 'Faint',
  onKnockOut: 'Knock out',
  onFriendFaints: 'Friend faints',
  onFriendSummoned: 'Friend summoned',
  onFriendAheadAttacks: 'Friend ahead attacks',
  onEnemySummoned: 'Enemy summoned',
}

/** Falls back to the raw name so a trigger added later still renders something. */
export function triggerLabel(trigger: string): string {
  return TRIGGER_LABEL[trigger as Trigger] ?? trigger
}

export interface AbilityCardProps {
  name: string
  tier: number
  text: string | null
  trigger?: string
  /** When set, the unit's sprite is drawn in the corner, as in the reference art. */
  defId?: string
  size?: 'tooltip' | 'callout'
}

export function AbilityCard({
  name,
  tier,
  text,
  trigger,
  defId,
  size = 'tooltip',
}: AbilityCardProps): ReactNode {
  const big = size === 'callout'
  return (
    <div
      className="ability-card"
      style={{ width: big ? 470 : 320, padding: big ? '12px 20px 16px' : '10px 14px 12px' }}
    >
      {defId && (
        <div style={{ position: 'absolute', left: 10, top: 8 }}>
          <UnitSprite defId={defId} size={big ? 60 : 46} />
        </div>
      )}
      <div
        style={{
          color: '#e2571c',
          fontWeight: 800,
          fontSize: big ? 34 : 27,
          letterSpacing: 0.5,
        }}
      >
        {name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 8px' }}>
        <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.35 }} />
        <TierBadge tier={tier} />
        <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.35 }} />
      </div>
      {trigger && (
        <div style={{ opacity: 0.6, fontSize: big ? 17 : 16 }}>{triggerLabel(trigger)}</div>
      )}
      <div style={{ fontWeight: 700, fontSize: big ? 23 : 20 }}>{text ?? 'No ability.'}</div>
    </div>
  )
}
