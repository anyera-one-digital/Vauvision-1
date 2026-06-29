import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { karaokeTranslations, type KaraokeLang, type KaraokeTranslations } from './translations'

/**
 * Maps the cabinet's active vue-i18n locale onto the Karaoke tool's own
 * translation bundle. Falls back to Russian for any unsupported locale.
 */
export function useKaraokeT() {
  const { locale } = useI18n()

  const lang = computed<KaraokeLang>(() => {
    const base = String(locale.value || 'ru').slice(0, 2).toLowerCase()
    return (['ru', 'en', 'es'] as const).includes(base as KaraokeLang)
      ? (base as KaraokeLang)
      : 'ru'
  })

  const t = computed<KaraokeTranslations>(() => karaokeTranslations[lang.value])

  return { t, lang }
}
