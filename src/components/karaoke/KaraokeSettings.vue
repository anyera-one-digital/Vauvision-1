<script setup lang="ts">
import { ref } from 'vue'
import { useKaraokeApp } from './useKaraokeApp'
import { useKaraokeT } from './useKaraokeT'
import type { KaraokeLang } from './translations'

const { language, setLanguage, theme, toggleTheme } = useKaraokeApp()
const { t } = useKaraokeT()

const isOpen = ref(false)

const langs: { code: KaraokeLang; name: string; flag: string }[] = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]
</script>

<template>
  <button class="kk-set-btn" :title="t.settings.title" @click="isOpen = true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
      <circle cx="12" cy="12" r="3" stroke-width="2" />
      <path stroke-width="2" stroke-linecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  </button>

  <div v-if="isOpen" class="kk-modal-overlay" @click="isOpen = false">
    <div class="kk-modal kk-card" @click.stop>
      <button class="kk-modal__close" @click="isOpen = false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <h3 class="kk-modal__title" style="margin-bottom: 24px">{{ t.settings.title }}</h3>

      <!-- Theme -->
      <div class="kk-set-block">
        <label class="kk-set-label">{{ t.settings.theme }}</label>
        <button class="kk-set-theme" @click="toggleTheme">
          <span class="kk-set-theme__left">
            <svg v-if="theme === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style="color: var(--accent-yellow)"><circle cx="12" cy="12" r="5" stroke-width="2" /><path stroke-width="2" stroke-linecap="round" d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" style="color: var(--accent)"><path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            <span>{{ theme === 'light' ? t.settings.light : t.settings.dark }}</span>
          </span>
          <span class="kk-set-switch" :class="{ 'is-dark': theme === 'dark' }"><span class="kk-set-switch__knob" /></span>
        </button>
      </div>

      <!-- Language -->
      <div class="kk-set-block">
        <label class="kk-set-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10" stroke-width="2" /><path stroke-width="2" d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" /></svg>
          {{ t.settings.language }}
        </label>
        <div class="kk-set-langs">
          <button
            v-for="l in langs"
            :key="l.code"
            class="kk-set-lang"
            :class="{ 'is-active': language === l.code }"
            @click="setLanguage(l.code)"
          >
            <span class="kk-set-lang__flag">{{ l.flag }}</span>
            <span class="kk-set-lang__name">{{ l.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
