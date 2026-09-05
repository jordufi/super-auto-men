// A floating number over a unit. Animates transform/opacity only.
import type { ReactNode } from 'react'
import type { Popup as PopupData } from '../replay/fold'

const COLORS: Record<PopupData['kind'], string> = {
  damage: 'var(--atk)',
  buff: 'var(--hp)',
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
        top: -10,
        transform: 'translateX(-50%)',
        color: COLORS[popup.kind],
        fontWeight: 800,
        fontSize: 30,
        textShadow: '0 2px 0 #000',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {popup.text}
    </div>
  )
}
