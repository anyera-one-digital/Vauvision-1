<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useKaraokeT } from './useKaraokeT'
import VauvisionLogo from './VauvisionLogo.vue'

defineEmits<{ (e: 'start'): void }>()

const { t } = useKaraokeT()

const showWave = ref(false)
const showText = ref(false)
const showButton = ref(false)
const timers: Array<ReturnType<typeof setTimeout>> = []

onMounted(() => {
  timers.push(setTimeout(() => (showWave.value = true), 300))
  timers.push(setTimeout(() => (showText.value = true), 800))
  timers.push(setTimeout(() => (showButton.value = true), 1200))
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="kk-onboarding">
    <div class="kk-onboarding__logo">
      <VauvisionLogo size="lg" />
    </div>
    <h1 class="kk-onboarding__title">{{ t.onboarding.title }}</h1>
    <h2 class="kk-onboarding__subtitle">{{ t.onboarding.subtitle }}</h2>

    <div class="kk-wave" :class="{ 'is-shown': showWave }">
      <svg width="280" height="80" viewBox="0 0 280 80">
        <defs>
          <linearGradient id="kkWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3" />
            <stop offset="50%" stop-color="var(--accent-yellow)" stop-opacity="0.8" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.3" />
          </linearGradient>
        </defs>
        <path class="wave-path wave-1" d="M0,40 Q35,10 70,40 T140,40 T210,40 T280,40" fill="none" stroke="url(#kkWaveGradient)" stroke-width="2" />
        <path class="wave-path wave-2" d="M0,40 Q35,70 70,40 T140,40 T210,40 T280,40" fill="none" stroke="url(#kkWaveGradient)" stroke-width="2" />
        <path class="wave-path wave-3" d="M0,40 Q35,20 70,40 T140,40 T210,40 T280,40" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-opacity="0.4" />
      </svg>
    </div>

    <ul class="kk-features" :class="{ 'is-shown': showText }">
      <li v-for="(feature, i) in t.onboarding.features" :key="i" class="kk-feature">
        <span class="kk-feature__num">{{ i + 1 }}</span>
        {{ feature }}
      </li>
    </ul>

    <button class="kk-start-btn" :class="{ 'is-shown': showButton }" @click="$emit('start')">
      {{ t.onboarding.start }}
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>

    <div class="kk-hints" :class="{ 'is-shown': showButton }">
      <div class="kk-hint">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
        WAV / MP3
      </div>
      <div class="kk-hint">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        TTML
      </div>
      <div class="kk-hint">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        LRC
      </div>
    </div>
  </div>
</template>
