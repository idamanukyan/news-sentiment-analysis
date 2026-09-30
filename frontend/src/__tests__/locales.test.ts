import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/** Recursively collect dotted key paths from a nested translation object. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path]
  })
}

function loadLocale(lng: string): Record<string, unknown> {
  const p = resolve(__dirname, `../../public/locales/${lng}/translation.json`)
  return JSON.parse(readFileSync(p, 'utf-8'))
}

describe('locale key parity', () => {
  const en = keyPaths(loadLocale('en')).sort()

  for (const lng of ['de', 'hy']) {
    it(`${lng} has exactly the same keys as en`, () => {
      const other = keyPaths(loadLocale(lng)).sort()
      const missing = en.filter((k) => !other.includes(k))
      const extra = other.filter((k) => !en.includes(k))
      expect(missing, `keys missing from ${lng}: ${missing.join(', ')}`).toEqual([])
      expect(extra, `keys in ${lng} not in en: ${extra.join(', ')}`).toEqual([])
    })
  }

  it('every locale has a DE label in the language switcher', () => {
    for (const lng of ['en', 'de', 'hy']) {
      expect((loadLocale(lng) as any).languageSwitch.de).toBeDefined()
    }
  })
})
