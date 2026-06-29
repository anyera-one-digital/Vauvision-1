import { ref, watch } from 'vue'
import type { KaraokeLang } from './translations'

export type KaraokeTheme = 'light' | 'dark'

const LANG_KEY = 'vauvision-language'
const THEME_KEY = 'vauvision-theme'

function readLang(): KaraokeLang {
  try {
    const s = localStorage.getItem(LANG_KEY)
    if (s === 'ru' || s === 'en' || s === 'es') return s
  } catch {
    /* localStorage unavailable */
  }
  return 'ru'
}

function readTheme(): KaraokeTheme {
  try {
    const s = localStorage.getItem(THEME_KEY)
    if (s === 'light' || s === 'dark') return s
  } catch {
    /* localStorage unavailable */
  }
  return 'light'
}

// Module-level singletons → shared reactive store across all Karaoke components
// (mirrors the original React AppContext).
const language = ref<KaraokeLang>(readLang())
const theme = ref<KaraokeTheme>(readTheme())

watch(language, (v) => {
  try { localStorage.setItem(LANG_KEY, v) } catch { /* ignore */ }
})
watch(theme, (v) => {
  try { localStorage.setItem(THEME_KEY, v) } catch { /* ignore */ }
})

export function useKaraokeApp() {
  return {
    language,
    theme,
    setLanguage: (l: KaraokeLang) => { language.value = l },
    setTheme: (t: KaraokeTheme) => { theme.value = t },
    toggleTheme: () => { theme.value = theme.value === 'light' ? 'dark' : 'light' },
  }
}
