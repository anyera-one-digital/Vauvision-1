<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useKaraokeT } from './useKaraokeT'
import TapButton from './TapButton.vue'
import type { LyricLine } from './types'

const props = defineProps<{
  audioUrl: string
  lyrics: LyricLine[]
}>()

const emit = defineEmits<{
  (e: 'complete', syncedLyrics: LyricLine[]): void
  (e: 'back'): void
}>()

const { t } = useKaraokeT()

const MIN_DURATION = 0.01 // 10ms minimum line duration
const MIN_GAP = 0.05 // 50ms minimum gap between lines

const audioRef = ref<HTMLAudioElement | null>(null)
const lyricsContainer = ref<HTMLElement | null>(null)

const lyrics = ref<LyricLine[]>(props.lyrics.map((l) => ({ ...l })))
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const canUndo = ref(false)
const isHolding = ref(false)
const showTutorial = ref(true)

const isComplete = computed(() => currentIndex.value >= lyrics.value.length)
const progress = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
)

const tutorialSteps = computed(() => [
  t.value.sync.tutorial.step1,
  t.value.sync.tutorial.step2,
  t.value.sync.tutorial.step3,
  t.value.sync.tutorial.step4,
  t.value.sync.tutorial.step5,
])

function onTimeUpdate() {
  if (audioRef.value) currentTime.value = audioRef.value.currentTime
}
function onLoadedMetadata() {
  if (audioRef.value) duration.value = audioRef.value.duration
}
function onEnded() {
  isPlaying.value = false
}

watch(isPlaying, (playing) => {
  if (playing) audioRef.value?.play()
  else audioRef.value?.pause()
})

watch(currentIndex, async () => {
  await nextTick()
  const el = lyricsContainer.value?.children[currentIndex.value] as HTMLElement | undefined
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

function handlePressStart() {
  if (!isPlaying.value || isComplete.value) return
  isHolding.value = true
  let startTime = currentTime.value
  if (currentIndex.value > 0) {
    const prevEnd = lyrics.value[currentIndex.value - 1].endTime
    if (prevEnd !== null && startTime < prevEnd + MIN_GAP) startTime = prevEnd + MIN_GAP
  }
  lyrics.value[currentIndex.value] = {
    ...lyrics.value[currentIndex.value],
    startTime,
    endTime: null,
  }
}

function handlePressEnd() {
  if (!isPlaying.value || isComplete.value || !isHolding.value) return
  isHolding.value = false
  const startTime = lyrics.value[currentIndex.value].startTime
  let endTime = currentTime.value
  if (startTime !== null && endTime < startTime + MIN_DURATION) endTime = startTime + MIN_DURATION
  lyrics.value[currentIndex.value] = { ...lyrics.value[currentIndex.value], endTime }
  currentIndex.value += 1
  canUndo.value = true
}

function handleUndo() {
  if (currentIndex.value === 0) return
  lyrics.value[currentIndex.value - 1] = {
    ...lyrics.value[currentIndex.value - 1],
    startTime: null,
    endTime: null,
  }
  currentIndex.value -= 1
  canUndo.value = currentIndex.value > 0
  isHolding.value = false
}

function handleReset() {
  if (audioRef.value) audioRef.value.currentTime = 0
  lyrics.value = props.lyrics.map((l) => ({ ...l }))
  currentIndex.value = 0
  isPlaying.value = false
  canUndo.value = false
  isHolding.value = false
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}
function formatTimeShort(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function tutorialHtml(raw: string) {
  return raw
    .replace(/<accent>/g, '<accent class="kk-accent">')
    .replace(/<\/accent>/g, '</accent>')
}

onMounted(() => {
  const audio = audioRef.value
  if (!audio) return
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadedmetadata', onLoadedMetadata)
  audio.addEventListener('ended', onEnded)
})
onBeforeUnmount(() => {
  const audio = audioRef.value
  if (!audio) return
  audio.removeEventListener('timeupdate', onTimeUpdate)
  audio.removeEventListener('loadedmetadata', onLoadedMetadata)
  audio.removeEventListener('ended', onEnded)
})
</script>

<template>
  <div class="kk-sync">
    <audio ref="audioRef" :src="audioUrl" preload="auto" />

    <!-- Tutorial -->
    <div v-if="showTutorial" class="kk-modal-overlay" @click="showTutorial = false">
      <div class="kk-modal kk-card" @click.stop>
        <button class="kk-modal__close" @click="showTutorial = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 class="kk-modal__title">{{ t.sync.tutorial.title }}</h3>
        <div class="kk-tut-steps">
          <div v-for="(step, i) in tutorialSteps" :key="i" class="kk-tut-step">
            <div class="kk-tut-step__num">{{ i + 1 }}</div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="kk-tut-step__text" v-html="tutorialHtml(step)" />
          </div>
        </div>
        <button class="kk-btn" style="margin-top: 24px" @click="showTutorial = false">
          {{ t.sync.tutorial.got_it }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="kk-statsbar kk-card">
      <div class="kk-statsbar__row">
        <div class="kk-statsbar__time">{{ formatTimeShort(currentTime) }} / {{ formatTimeShort(duration) }}</div>
        <div class="kk-statsbar__count"><span>{{ currentIndex }}</span>/{{ lyrics.length }}</div>
      </div>
      <div class="kk-progress"><div class="kk-progress__fill" :style="{ width: `${progress}%` }" /></div>
    </div>

    <!-- Lyrics -->
    <div class="kk-lyrics scrollbar-hide">
      <div ref="lyricsContainer" class="kk-lyrics__inner">
        <div
          v-for="(line, i) in lyrics"
          :key="i"
          class="lyrics-line"
          :class="{ active: i === currentIndex && !isHolding, editing: i === currentIndex && isHolding, done: i < currentIndex }"
        >
          <svg v-if="i < currentIndex" class="kk-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          {{ line.text }}
          <span v-if="line.startTime !== null && line.endTime !== null && i < currentIndex" class="kk-line-time">
            {{ formatTime(line.startTime) }} → {{ formatTime(line.endTime) }}
          </span>
          <span v-else-if="i === currentIndex && isHolding && line.startTime !== null" class="kk-line-time kk-line-time--live">
            {{ formatTime(line.startTime) }} → ...
          </span>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="kk-controls">
      <div class="kk-controls__row">
        <button class="kk-ctrl-btn" @click="showTutorial = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><circle cx="12" cy="12" r="10" stroke-width="2" /><path stroke-linecap="round" stroke-width="2" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
        </button>
        <button class="kk-ctrl-btn" @click="handleReset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        <button class="kk-play-btn" @click="isPlaying = !isPlaying">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor" style="margin-left: 3px"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <button class="kk-undo-btn" :disabled="!canUndo || currentIndex === 0" @click="handleUndo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v6h6M3 13a9 9 0 103-7.7L3 8" /></svg>
          <span>{{ t.sync.undo }}</span>
        </button>
      </div>

      <button v-if="isComplete" class="kk-btn" style="padding: 18px" @click="emit('complete', lyrics)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
        {{ t.sync.complete }}
      </button>
      <div v-else style="display: flex; flex-direction: column; align-items: center">
        <TapButton
          :disabled="!isPlaying"
          :is-holding="isHolding"
          :audio-element="audioRef"
          @press-start="handlePressStart"
          @press-end="handlePressEnd"
        />
        <p v-if="!isPlaying" class="kk-sync__hint">{{ t.sync.hint }}</p>
      </div>

      <button class="kk-back-btn" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        {{ t.sync.back }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.kk-tut-steps { display: flex; flex-direction: column; }
:deep(.kk-accent) { color: var(--accent); font-weight: 500; }
</style>
