export const CONTENT_VERSION = '0.0.0'

export { CONTENT, UNITS, FOODS, getUnit, getFood, shopPool, foodPool } from './registry'
export { CUSTOM } from './custom'
export { describeAbility, describeFood } from './describe'
export { teamFromSpec, teamFromString } from './spec'
export { BOTS, botTeam, botUnits } from './bots'
export type { BotUnit } from './bots'
export type { CustomFnId } from './custom'
export {
  UnitDefSchema,
  FoodDefSchema,
  EffectSchema,
  TargetSchema,
  TriggerSchema,
  TARGET_KINDS,
} from './schema'
