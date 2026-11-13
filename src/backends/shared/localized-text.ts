/**
 * The two rules a backend's own copy needs, in one place (D15).
 *
 * A backend writes its user-facing strings itself (D2: the host dictionary is
 * not readable from a backend), in the shape `src/i18n.ts` uses —
 * `{{name}}` placeholders and, where a language marks number, plural forms
 * (`one` / `few` / `many` / `other`) selected on the `count` parameter. The
 * *mechanism* is shared so two
 * backends cannot disagree about what `{{name}}` or `count` means; the
 * *dictionary* stays with each backend.
 */
import type { BackendLocale } from '../../agent/backend.js'

/** One string in the languages the TUI ships: a plain template, or the plural
 *  forms selected on the `count` parameter. `other` is the only mandatory
 *  form — zh needs `one`+`other`, en needs `one`+`other`, ru needs
 *  `one`+`few`+`many`+`other` — and a missing form falls back to `other`. */
export type LocalizedText = string | {
  readonly one?: string
  readonly few?: string
  readonly many?: string
  readonly other: string
}

/** Values substituted into a template (`{{name}}`). */
export type TextParams = Readonly<Record<string, string | number>>

/** Substitute `{{name}}` with the values of this call; a name the caller did
 *  not supply is left verbatim, so a typo stays visible on screen instead of
 *  turning into a blank (the rule `t()` applies). */
export function fillTemplate(template: string, params: TextParams): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

// CLDR-backed and built into Node: zh always selects `other` (the language has
// no grammatical number), en selects `one` exactly at 1, ru selects `one` for
// 1/21/31, `few` for 2–4 and `many` for 0 and 5–20.
const pluralRules: Record<BackendLocale, Intl.PluralRules> = {
  zh: new Intl.PluralRules('zh'),
  en: new Intl.PluralRules('en'),
  ru: new Intl.PluralRules('ru'),
}

/**
 * The text of one entry in `locale`, with the `count` parameter choosing the
 * plural form (a non-finite or absent `count` reads as 0, i.e. `other`).
 * Undefined when the entry has no text in that language.
 */
export function pickLocalizedText(text: LocalizedText | undefined, locale: BackendLocale, params: TextParams): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  const count = Number(params.count)
  const category = pluralRules[locale].select(Number.isFinite(count) ? count : 0)
  switch (category) {
    case 'one':
      return text.one ?? text.other
    case 'few':
      return text.few ?? text.other
    case 'many':
      return text.many ?? text.other
    default:
      return text.other
  }
}
