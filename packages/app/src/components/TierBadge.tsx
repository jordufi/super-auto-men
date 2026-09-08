import type { ReactNode } from 'react'

/** Tier 1-6 as dice pips, so the shop tier is readable without any text. */
export function TierBadge({ tier }: { tier: number }): ReactNode {
  return (
    <div className="tier-badge" data-testid="tier" data-tier={tier} title={`Tier ${tier}`}>
      {Array.from({ length: tier }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}
