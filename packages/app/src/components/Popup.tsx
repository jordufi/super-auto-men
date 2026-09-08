// A floating number over a unit. Animates transform/opacity only.
import type { ReactNode } from 'react'
import type { Popup as PopupData } from '../replay/fold'

const COLORS: Record<PopupData['kind'], string> = {
  damage: '#ff5f4a',
  buff: '#5ee06a',
  status: '#7fd7ff',
}

export function Popup({ popup }: { popup: PopupData }): ReactNode {
  return (
    <div
      data-testid="popup"
      className="popup"
      style={{
        position: 'absolute',
        left: '50%',
        top: -30,
        transform: 'translateX(-50%)',
        color: COLORS[popup.kind],
        WebkitTextStroke: '3px var(--ink)',
        paintOrder: 'stroke fill',
        fontWeight: 800,
        fontSize: 32,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {popup.text}
    </div>
  )
}
