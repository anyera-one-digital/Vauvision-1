<script setup lang="ts">
import { ref, computed } from 'vue'
import Header from '@/components/layout/Header.vue'
import Menu from '@/components/layout/Menu.vue'
import OnboardingStep from '@/components/karaoke/OnboardingStep.vue'
import UploadStep from '@/components/karaoke/UploadStep.vue'
import InfoStep from '@/components/karaoke/InfoStep.vue'
import SyncStep from '@/components/karaoke/SyncStep.vue'
import ExportStep from '@/components/karaoke/ExportStep.vue'
import VauvisionLogo from '@/components/karaoke/VauvisionLogo.vue'
import KaraokeSettings from '@/components/karaoke/KaraokeSettings.vue'
import { useKaraokeApp } from '@/components/karaoke/useKaraokeApp'
import type { KaraokeStep, LyricLine } from '@/components/karaoke/types'

const { theme } = useKaraokeApp()

const step = ref<KaraokeStep>('onboarding')

const audioUrl = ref<string | null>(null)
const artistName = ref('')
const trackName = ref('')
const lyrics = ref<LyricLine[]>([])

const steps: KaraokeStep[] = ['upload', 'info', 'sync', 'export']
const currentStepIndex = computed(() => steps.indexOf(step.value))

function onUploadNext(_file: File, url: string) {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
  audioUrl.value = url
  step.value = 'info'
}
function onInfoNext(artist: string, track: string, lines: LyricLine[]) {
  artistName.value = artist
  trackName.value = track
  lyrics.value = lines
  step.value = 'sync'
}
function onSyncComplete(synced: LyricLine[]) {
  lyrics.value = synced
  step.value = 'export'
}
function resetProject() {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
  audioUrl.value = null
  artistName.value = ''
  trackName.value = ''
  lyrics.value = []
  step.value = 'onboarding'
}
</script>

<template>
  <Header />
  <section class="karaoke-page">
    <div class="container karaoke-page__container">
      <Menu />
      <div class="karaoke-page__block">
        <div class="karaoke-app" :data-theme="theme">
          <header v-if="step !== 'onboarding'" class="kk-header">
            <div class="kk-header__bar">
              <span class="kk-header__spacer" />
              <VauvisionLogo size="md" />
              <KaraokeSettings />
            </div>
            <div class="kk-steps">
              <div
                v-for="(s, i) in steps"
                :key="s"
                class="kk-step-dot"
                :class="{ 'is-active': s === step, 'is-done': i < currentStepIndex }"
              />
            </div>
          </header>

          <div class="kk-content">
            <OnboardingStep v-if="step === 'onboarding'" @start="step = 'upload'" />
            <UploadStep v-else-if="step === 'upload'" @next="onUploadNext" />
            <InfoStep
              v-else-if="step === 'info'"
              @next="onInfoNext"
              @back="step = 'upload'"
            />
            <SyncStep
              v-else-if="step === 'sync' && audioUrl"
              :audio-url="audioUrl"
              :lyrics="lyrics"
              @complete="onSyncComplete"
              @back="step = 'info'"
            />
            <ExportStep
              v-else-if="step === 'export'"
              :artist-name="artistName"
              :track-name="trackName"
              :lyrics="lyrics"
              :audio-url="audioUrl || undefined"
              @new-project="resetProject"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.karaoke-page__container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.karaoke-page__block {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  padding: 24px 0 40px;
}
@media (max-width: 768px) {
  .karaoke-page__container { flex-direction: column; }
  .karaoke-page__block { padding: 16px 0; }
}
</style>
