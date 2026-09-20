// The HUD and button icons, drawn in the wood-and-gold palette. Replaces the emoji, which render
// in a different style on every OS. Each is a 32x32 vector with its own ink outline.
import type { ReactNode } from 'react'

export type IconName =
  | 'coin'
  | 'heart'
  | 'hourglass'
  | 'trophy'
  | 'dice'
  | 'bag'
  | 'snowflake'
  | 'swords'
  | 'play'
  | 'paw'

const INK = '#4b2e12'

const ART: Record<IconName, ReactNode> = {
  coin: (
    <>
      <circle cx="16" cy="16" r="13" fill="#ffcf4a" stroke={INK} strokeWidth="2.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#d9961a" strokeWidth="2" />
      <path
        d="M16 9.500v13M12.500 13.500c0-2.500 7-2.500 7 0s-7 2-7 4.500 7 2.500 7 0"
        fill="none"
        stroke="#9a6208"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8 12a9 9 0 0 1 6-5" fill="none" stroke="#fff3b0" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  heart: (
    <>
      <path
        d="M16 28.500C4 19.500 2 13.500 2 10 2 5.500 5.500 3 9 3c3 0 5.500 1.700 7 4.500C17.500 4.700 20 3 23 3c3.500 0 7 2.500 7 7 0 3.500-2 9.500-14 18.500Z"
        fill="#e8382f"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M7.500 9c.8-1.600 2.300-2.300 4-1.800" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2.200" strokeLinecap="round" />
    </>
  ),
  hourglass: (
    <>
      <path
        d="M9 3.500c0 7 5 9 7 12.500-2 3.500-7 5.500-7 12.500h14c0-7-5-9-7-12.500 2-3.500 7-5.500 7-12.500Z"
        fill="#e4f6fd"
        stroke={INK}
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
      <path d="M12 26.500c1-3.500 3-4.500 4-6 1 1.500 3 2.500 4 6Z" fill="#f5b52e" />
      <path d="M16 15.500v4" stroke="#f5b52e" strokeWidth="1.800" />
      <path d="M7 3h18M7 29h18" stroke={INK} strokeWidth="3.800" strokeLinecap="round" />
      <path d="M7 3h18M7 29h18" stroke="#d79a4e" strokeWidth="1.400" strokeLinecap="round" />
    </>
  ),
  trophy: (
    <>
      <path
        d="M9.500 6H4c0 5.500 2 8.500 6.500 9M22.500 6H28c0 5.500-2 8.500-6.500 9"
        fill="none"
        stroke={INK}
        strokeWidth="2.500"
        strokeLinecap="round"
      />
      <path d="M9 3.500h14v8.500c0 5-3 8-7 8s-7-3-7-8Z" fill="#ffcf4a" stroke={INK} strokeWidth="2.500" strokeLinejoin="round" />
      <path d="M16 20v5" stroke={INK} strokeWidth="3.500" />
      <rect x="10" y="25" width="12" height="4.500" rx="1.800" fill="#d9961a" stroke={INK} strokeWidth="2.500" />
      <path d="M12.500 7v6" stroke="#fff3b0" strokeWidth="2.200" strokeLinecap="round" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="6" fill="#fff" stroke={INK} strokeWidth="2.500" />
      <g fill={INK}>
        <circle cx="11" cy="11" r="2.400" />
        <circle cx="21" cy="11" r="2.400" />
        <circle cx="16" cy="16" r="2.400" />
        <circle cx="11" cy="21" r="2.400" />
        <circle cx="21" cy="21" r="2.400" />
      </g>
    </>
  ),
  bag: (
    <>
      <path d="M11 6.500l5 3 5-3-2-3.500h-6Z" fill="#a86f31" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M11 9.500C5 14.500 3 19 3 23c0 4 4 6 13 6s13-2 13-6c0-4-2-8.500-8-13.500-3 2-7 2-10 0Z"
        fill="#d79a4e"
        stroke={INK}
        strokeWidth="2.500"
        strokeLinejoin="round"
      />
      <path
        d="M16 16.500v10M12.800 19.500c0-2.500 6.400-2.500 6.400 0s-6.400 2-6.400 4.500 6.400 2.500 6.400 0"
        fill="none"
        stroke="#fff3b0"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  snowflake: (
    <>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3v26M4.700 9.500l22.600 13M4.700 22.500l22.600-13M11.500 5.500L16 9l4.500-3.500M11.500 26.500L16 23l4.500 3.500" stroke={INK} strokeWidth="6" />
        <path d="M16 3v26M4.700 9.500l22.600 13M4.700 22.500l22.600-13M11.500 5.500L16 9l4.500-3.500M11.500 26.500L16 23l4.500 3.500" stroke="#eaf8ff" strokeWidth="2.600" />
      </g>
    </>
  ),
  swords: (
    <>
      <g fill="none" strokeLinecap="round">
        <path d="M6 6l16 16M26 6L10 22" stroke={INK} strokeWidth="6.500" />
        <path d="M6 6l16 16M26 6L10 22" stroke="#e8ecf2" strokeWidth="3" />
        <path d="M19 25l6-6M13 25l-6-6" stroke={INK} strokeWidth="6.500" />
        <path d="M19 25l6-6M13 25l-6-6" stroke="#d9961a" strokeWidth="3" />
      </g>
      <g fill="#d9961a" stroke={INK} strokeWidth="2">
        <circle cx="26" cy="26" r="2.800" />
        <circle cx="6" cy="26" r="2.800" />
      </g>
    </>
  ),
  play: <path d="M9 5l17 11L9 27Z" fill="#fff" stroke={INK} strokeWidth="2.500" strokeLinejoin="round" />,
  paw: (
    <g fill="#fff8e0" stroke={INK} strokeWidth="2.200" strokeLinejoin="round">
      <path d="M16 15c-5 0-9 4.500-9 8 0 3 2.500 4.500 5 4.500 1.700 0 2.500-.8 4-.8s2.300.8 4 .8c2.500 0 5-1.500 5-4.500 0-3.500-4-8-9-8Z" />
      <ellipse cx="6.500" cy="14" rx="2.800" ry="3.600" transform="rotate(-20 6.500 14)" />
      <ellipse cx="12" cy="8.500" rx="2.800" ry="3.800" transform="rotate(-8 12 8.500)" />
      <ellipse cx="20" cy="8.500" rx="2.800" ry="3.800" transform="rotate(8 20 8.500)" />
      <ellipse cx="25.500" cy="14" rx="2.800" ry="3.600" transform="rotate(20 25.500 14)" />
    </g>
  ),
}

export function Icon({ name, size = 32 }: { name: IconName; size?: number }): ReactNode {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {ART[name]}
    </svg>
  )
}
