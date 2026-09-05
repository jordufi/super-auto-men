// Sprite files are named after the unit id. Units without a file fall back to a lettered tile
// (see UnitSprite). `sprites/` in the repo root stays as the owner's source folder.
const files = import.meta.glob('./*.{png,jpg,webp}', { eager: true, query: '?url', import: 'default' })

export const SPRITES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace(/^\.\/|\.\w+$/g, ''), url as string]),
)

export function getSprite(defId: string): string | undefined {
  return SPRITES[defId]
}
