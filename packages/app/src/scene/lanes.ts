// Where the rows sit on the stage. The painted backdrops are composed against these numbers, so
// they are the contract between the art and the screens: change one and a unit stops standing on
// its patch of ground. tests/lanes.test.ts locks them.
export const LANE = {
  team: 275,
  shop: 465,
  height: 160,
} as const

/** Top of the battle board. Units stand ~107px below it, on the arena floor of the battle scene. */
export const BATTLE_TOP = 440
