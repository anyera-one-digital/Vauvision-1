<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKaraokeT } from './useKaraokeT'
import type { LyricLine } from './types'

const emit = defineEmits<{
  (e: 'next', artistName: string, trackName: string, lyrics: LyricLine[]): void
  (e: 'back'): void
}>()

const { t } = useKaraokeT()

const artistName = ref('')
const trackName = ref('')
const lyricsText = ref('')
const showHint = ref(false)

const lineCount = computed(
  () => lyricsText.value.split('\n').filter((l) => l.trim()).length,
)
const canProceed = computed(
  () => artistName.value.trim() && trackName.value.trim() && lyricsText.value.trim(),
)

// Clean and format a lyric line.
// Removes trailing special characters BUT keeps parentheses so ad-libs
// like "(сон)" / "(BOMB)" stay intact at the end of a line.
function formatLyricLine(text: string): string {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/[^\p{L}\p{N})(]+$/gu, '')
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  return cleaned
}

function handleSubmit() {
  if (!canProceed.value) return
  const lines: LyricLine[] = lyricsText.value
    .split('\n')
    .filter((line) => line.trim())
    .map((text) => ({ text: formatLyricLine(text), startTime: null, endTime: null }))
  emit('next', artistName.value.trim(), trackName.value.trim(), lines)
}
</script>

<template>
  <div class="kk-info scrollbar-hide">
    <h2 class="kk-info__title">{{ t.info.title }}</h2>

    <div class="kk-field">
      <label class="kk-label">{{ t.info.artist }}</label>
      <input v-model="artistName" class="kk-input" :placeholder="t.info.artistPlaceholder" />
    </div>

    <div class="kk-field">
      <label class="kk-label">{{ t.info.track }}</label>
      <input v-model="trackName" class="kk-input" :placeholder="t.info.trackPlaceholder" />
    </div>

    <div class="kk-field">
      <div class="kk-field__row">
        <label class="kk-label">{{ t.info.lyrics }}</label>
        <button class="kk-info__hint-toggle" type="button" @click="showHint = !showHint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><circle cx="12" cy="12" r="10" stroke-width="2" /><path stroke-linecap="round" stroke-width="2" d="M12 16v-4M12 8h.01" /></svg>
          {{ t.info.hintTitle }}
        </button>
      </div>
      <textarea v-model="lyricsText" class="kk-textarea" :placeholder="t.info.lyricsPlaceholder" />
      <span class="kk-count">{{ lineCount }} {{ t.info.linesCount }}</span>
    </div>

    <div v-if="showHint" class="kk-hintbox">
      <h4>{{ t.info.hintTitle }}</h4>
      <ul>
        <li v-for="(rule, i) in t.info.hintRules" :key="i">{{ rule }}</li>
      </ul>
      <pre>{{ t.info.hintExample }}</pre>
    </div>

    <div class="kk-info__footer">
      <button class="kk-btn kk-btn--secondary" style="width: auto; flex: 0 0 auto" @click="$emit('back')">
        {{ t.info.back }}
      </button>
      <button class="kk-btn" :disabled="!canProceed" @click="handleSubmit">
        {{ t.info.next }}
      </button>
    </div>
  </div>
</template>
