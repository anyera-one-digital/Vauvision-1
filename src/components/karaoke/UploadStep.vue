<script setup lang="ts">
import { ref } from 'vue'
import { useKaraokeT } from './useKaraokeT'

const emit = defineEmits<{ (e: 'next', file: File, url: string): void }>()

const { t } = useKaraokeT()

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff']

function isAudioFile(file: File): boolean {
  if (file.type && file.type.startsWith('audio/')) return true
  const name = file.name.toLowerCase()
  return AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext))
}

const isDragging = ref(false)
const fileName = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

function handleFile(file: File) {
  if (!isAudioFile(file)) {
    window.alert(t.value.upload.invalid)
    return
  }
  fileName.value = file.name
  const url = URL.createObjectURL(file)
  setTimeout(() => emit('next', file, url), 500)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}
</script>

<template>
  <div class="kk-upload">
    <div class="kk-upload__emoji">🎵</div>
    <h2 class="kk-upload__title">{{ t.upload.title }}</h2>
    <p class="kk-upload__subtitle">{{ t.upload.subtitle }}</p>

    <input
      ref="inputRef"
      type="file"
      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aiff,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac"
      hidden
      @change="onChange"
    />

    <div
      class="kk-dropzone"
      :class="{ 'is-dragging': isDragging, 'is-selected': fileName }"
      @click="inputRef?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop="onDrop"
    >
      <div class="kk-dropzone__inner">
        <template v-if="fileName">
          <svg class="kk-dropzone__icon is-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
          <p class="kk-dropzone__name">{{ fileName }}</p>
          <p class="kk-dropzone__ok">✓</p>
        </template>
        <template v-else>
          <svg class="kk-dropzone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
          <p class="kk-dropzone__hint">{{ t.upload.dropzone }}</p>
        </template>
      </div>
    </div>
  </div>
</template>
