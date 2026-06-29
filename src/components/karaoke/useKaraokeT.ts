import { computed } from 'vue'
import { karaokeTranslations, type KaraokeTranslations } from './translations'
import { useKaraokeApp } from './useKaraokeApp'

/**
 * Resolves the Karaoke translation bundle for the tool's current language
 * (managed by useKaraokeApp + the in-tool settings panel).
 */
export function useKaraokeT() {
  const { language } = useKaraokeApp()
  const t = computed<KaraokeTranslations>(() => karaokeTranslations[language.value])
  return { t, lang: language }
}
