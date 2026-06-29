<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useKaraokeT } from './useKaraokeT'
import type { LyricLine } from './types'

const props = defineProps<{
  artistName: string
  trackName: string
  lyrics: LyricLine[]
  audioUrl?: string
}>()

defineEmits<{ (e: 'new-project'): void }>()

const { t } = useKaraokeT()

const format = ref<'lrc' | 'ttml'>('ttml')
const lyrics = ref<LyricLine[]>(props.lyrics.map((l) => ({ ...l })))
const audioRef = ref<HTMLAudioElement | null>(null)
const isPreviewPlaying = ref(false)
const previewHighlight = ref<number | null>(null)
let previewTimer: ReturnType<typeof setInterval> | null = null

const MIN_DURATION = 0.01
const MIN_GAP = 0.05

function formatLrcTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}
function formatTtmlTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateLRC(lines: LyricLine[]): string {
  return lines
    .filter((l) => l.startTime !== null)
    .map((l) => `[${formatLrcTime(l.startTime as number)}]${l.text}`)
    .join('\n')
}

function generateTTML(artistName: string, trackName: string, lines: LyricLine[]): string {
  const synced = lines.filter((l) => l.startTime !== null && l.endTime !== null)
  let ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:itunes="http://itunes.apple.com/lyric-ttml-extensions" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="en-US">
  <head>
    <metadata>
      <ttm:title>${escapeXml(trackName)}</ttm:title>
    </metadata>
    <ttm:agent xml:id="voice1" type="person">
      <ttm:name type="full">${escapeXml(artistName)}</ttm:name>
    </ttm:agent>
  </head>
  <body>
    <div>\n`
  for (const line of synced) {
    ttml += `<p begin="${formatTtmlTime(line.startTime as number)}" end="${formatTtmlTime(line.endTime as number)}">${escapeXml(line.text)}</p>\n  `
  }
  ttml += `
    </div>
  </body>
</tt>`
  return ttml
}

const content = computed(() =>
  format.value === 'lrc'
    ? generateLRC(lyrics.value)
    : generateTTML(props.artistName, props.trackName, lyrics.value),
)

const syncedCount = computed(
  () => lyrics.value.filter((l) => l.startTime !== null && l.endTime !== null).length,
)
const stars = computed(() => {
  const total = lyrics.value.length
  if (syncedCount.value === total) return 3
  if (syncedCount.value >= total * 0.8) return 2
  return 1
})

function startPreviewTracking() {
  if (previewTimer) return
  previewTimer = setInterval(() => {
    const tm = audioRef.value?.currentTime ?? 0
    const idx = lyrics.value.findIndex(
      (l) => l.startTime !== null && l.endTime !== null && tm >= l.startTime && tm <= l.endTime,
    )
    previewHighlight.value = idx >= 0 ? idx : null
  }, 50)
}
function togglePreview() {
  if (isPreviewPlaying.value) {
    stopPreview()
    return
  }
  if (!audioRef.value) return
  isPreviewPlaying.value = true
  audioRef.value.play()
  startPreviewTracking()
}
function stopPreview() {
  if (previewTimer) { clearInterval(previewTimer); previewTimer = null }
  audioRef.value?.pause()
  isPreviewPlaying.value = false
  previewHighlight.value = null
}

function handleFineTune(index: number, field: 'startTime' | 'endTime', delta: number) {
  const line = lyrics.value[index]
  const current = line[field]
  if (current === null) return
  let next = Math.max(0, current + delta)
  if (field === 'startTime') {
    if (index > 0) {
      const prevEnd = lyrics.value[index - 1].endTime
      if (prevEnd !== null) next = Math.max(next, prevEnd + MIN_GAP)
    }
    if (line.endTime !== null) next = Math.min(next, line.endTime - MIN_DURATION)
  } else {
    if (line.startTime !== null) next = Math.max(next, line.startTime + MIN_DURATION)
    if (index < lyrics.value.length - 1) {
      const nextStart = lyrics.value[index + 1].startTime
      if (nextStart !== null) next = Math.min(next, nextStart - MIN_GAP)
    }
  }
  lyrics.value[index] = { ...line, [field]: next }
}

function handlePlayFromTiming(startTime: number | null) {
  if (startTime === null || !audioRef.value) return
  audioRef.value.currentTime = startTime
  audioRef.value.play()
  isPreviewPlaying.value = true
  startPreviewTracking()
}

function handleDownload() {
  const blob = new Blob([content.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.artistName} - ${props.trackName}.${format.value}`
  a.click()
  URL.revokeObjectURL(url)
}

onBeforeUnmount(stopPreview)
</script>

<template>
  <div class="kk-export scrollbar-hide">
    <audio v-if="audioUrl" ref="audioRef" :src="audioUrl" />

    <div class="kk-export__success">
      <div class="kk-export__check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 class="kk-export__title">{{ t.export.done }}</h2>
      <div class="kk-stars">
        <svg v-for="i in 3" :key="i" class="kk-star" :class="{ filled: i <= stars }" viewBox="0 0 24 24" :fill="i <= stars ? 'currentColor' : 'none'" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
      <p class="kk-export__meta">{{ artistName }} — {{ trackName }}</p>
      <p class="kk-export__sub">{{ t.export.synced }} {{ syncedCount }} {{ t.export.of }} {{ lyrics.length }} {{ t.export.lines }}</p>
    </div>

    <div class="kk-format">
      <button class="kk-format__btn" :class="{ 'is-active': format === 'ttml' }" @click="format = 'ttml'">TTML</button>
      <button class="kk-format__btn" :class="{ 'is-active': format === 'lrc' }" @click="format = 'lrc'">LRC</button>
    </div>

    <button v-if="audioUrl" class="kk-preview-btn" @click="togglePreview">
      <svg v-if="isPreviewPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
      <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      {{ isPreviewPlaying ? t.export.stop : t.export.preview }}
    </button>

    <div class="kk-tune kk-card">
      <div class="kk-tune__head">
        <span>{{ t.export.timings }}</span>
      </div>
      <div class="kk-tune__list scrollbar-hide">
        <div
          v-for="(line, i) in lyrics"
          :key="i"
          class="kk-tune__row"
          :class="{ 'is-highlight': previewHighlight === i }"
          @click="handlePlayFromTiming(line.startTime)"
        >
          <div class="kk-tune__text">
            <svg v-if="line.startTime !== null" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            <span>{{ line.text }}</span>
          </div>
          <div class="kk-tune__times">
            <div class="kk-tune__grp">
              <span style="color: #16a34a; font-size: 10px">▶</span>
              <span class="kk-tune__val">{{ line.startTime !== null ? formatLrcTime(line.startTime) : '--:--' }}</span>
              <template v-if="line.startTime !== null">
                <button class="kk-tune__nudge" @click.stop="handleFineTune(i, 'startTime', -0.1)">−</button>
                <button class="kk-tune__nudge" @click.stop="handleFineTune(i, 'startTime', 0.1)">+</button>
              </template>
            </div>
            <span style="color: var(--text-muted)">→</span>
            <div class="kk-tune__grp">
              <span style="color: #ab1115; font-size: 10px">■</span>
              <span class="kk-tune__val">{{ line.endTime !== null ? formatLrcTime(line.endTime) : '--:--' }}</span>
              <template v-if="line.endTime !== null">
                <button class="kk-tune__nudge" @click.stop="handleFineTune(i, 'endTime', -0.1)">−</button>
                <button class="kk-tune__nudge" @click.stop="handleFineTune(i, 'endTime', 0.1)">+</button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="kk-export__actions">
      <button class="kk-btn" @click="handleDownload">
        <svg class="kk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        {{ t.export.download }} .{{ format.toUpperCase() }}
      </button>
      <button class="kk-btn kk-btn--secondary" @click="$emit('new-project')">
        <svg class="kk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        {{ t.export.newProject }}
      </button>
    </div>
  </div>
</template>
