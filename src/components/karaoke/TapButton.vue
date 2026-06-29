<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  disabled?: boolean
  isHolding?: boolean
  audioElement?: HTMLAudioElement | null
}>()

const emit = defineEmits<{
  (e: 'press-start'): void
  (e: 'press-end'): void
}>()

interface Particle {
  x: number
  y: number
  angle: number
  speed: number
  size: number
  color: string
  life: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const particles: Particle[] = []

const audioLevel = ref(0)
const isPressed = ref(false)
const isPressedRef = { value: false }
const holdDuration = ref(0)
let holdStart = 0

let holdInterval: ReturnType<typeof setInterval> | null = null
let streamInterval: ReturnType<typeof setInterval> | null = null
let vibrationInterval: ReturnType<typeof setInterval> | null = null
let levelRaf = 0
let particleRaf = 0
let analyser: AnalyserNode | null = null
let audioCtx: AudioContext | null = null

const active = computed(() => isPressed.value || props.isHolding)

/* ---------- audio analyser ---------- */
function setupAudio() {
  if (audioCtx || !props.audioElement) return
  try {
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    const source = ctx.createMediaElementSource(props.audioElement)
    an.fftSize = 256
    source.connect(an)
    an.connect(ctx.destination)
    audioCtx = ctx
    analyser = an
  } catch {
    /* media element may already be connected */
  }
}

function analyze() {
  if (analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    const avg = data.slice(0, 30).reduce((a, b) => a + b, 0) / 30
    audioLevel.value = avg / 255
  }
  levelRaf = requestAnimationFrame(analyze)
}

/* ---------- particle canvas ---------- */
function animateParticles() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += Math.cos(p.angle) * p.speed
    p.y += Math.sin(p.angle) * p.speed
    p.life -= 0.02
    p.speed *= 0.98
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fillStyle = p.color.replace('1)', `${p.life})`)
    ctx.fill()
    ctx.shadowBlur = 10
    ctx.shadowColor = p.color
    ctx.fill()
    ctx.shadowBlur = 0
  }
  particleRaf = requestAnimationFrame(animateParticles)
}

function createParticles(type: 'start' | 'end') {
  const canvas = canvasRef.value
  if (!canvas) return
  const cx = canvas.offsetWidth / 2
  const cy = canvas.offsetHeight / 2
  const colors =
    type === 'start'
      ? ['rgba(171, 17, 21, 1)', 'rgba(226, 182, 63, 1)', 'rgba(221, 221, 221, 1)']
      : ['rgba(226, 182, 63, 1)', 'rgba(171, 17, 21, 1)', 'rgba(255, 255, 255, 1)']
  const count = type === 'start' ? 16 : 24
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    particles.push({
      x: cx,
      y: cy,
      angle,
      speed: type === 'start' ? 6 + Math.random() * 4 : 8 + Math.random() * 6,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    })
  }
}

function createStreamParticles() {
  const canvas = canvasRef.value
  if (!canvas) return
  const cx = canvas.offsetWidth / 2
  const cy = canvas.offsetHeight / 2
  const colors = [
    'rgba(226, 182, 63, 1)',
    'rgba(171, 17, 21, 1)',
    'rgba(221, 221, 221, 1)',
    'rgba(255, 255, 255, 1)',
  ]
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 60 + Math.random() * 20
    particles.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      angle: angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5,
      speed: 2 + Math.random() * 2,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0.8 + Math.random() * 0.4,
    })
  }
  if (Math.random() < 0.3) {
    const a = Math.random() * Math.PI * 2
    particles.push({
      x: cx,
      y: cy,
      angle: a,
      speed: 4 + Math.random() * 4,
      size: 1.5 + Math.random() * 2,
      color: 'rgba(255, 255, 255, 1)',
      life: 0.6 + Math.random() * 0.3,
    })
  }
}

/* ---------- press handling ---------- */
function clearIntervals() {
  if (holdInterval) { clearInterval(holdInterval); holdInterval = null }
  if (streamInterval) { clearInterval(streamInterval); streamInterval = null }
  if (vibrationInterval) { clearInterval(vibrationInterval); vibrationInterval = null }
}

function pressStart() {
  if (props.disabled || isPressedRef.value) return
  isPressed.value = true
  isPressedRef.value = true
  holdDuration.value = 0
  holdStart = Date.now()
  createParticles('start')

  holdInterval = setInterval(() => {
    holdDuration.value = (Date.now() - holdStart) / 1000
  }, 50)
  streamInterval = setInterval(createStreamParticles, 80)

  if (navigator.vibrate) {
    navigator.vibrate(15)
    vibrationInterval = setInterval(() => navigator.vibrate(8), 400)
  }
  emit('press-start')
}

function pressEnd() {
  if (props.disabled || !isPressedRef.value) return
  isPressed.value = false
  isPressedRef.value = false
  clearIntervals()
  createParticles('end')
  const held = (Date.now() - holdStart) / 1000
  if (held > 1) setTimeout(() => createParticles('end'), 100)
  holdDuration.value = 0
  if (navigator.vibrate) navigator.vibrate([15, 50, 25])
  emit('press-end')
}

function onTouchStart(e: TouchEvent) { e.preventDefault(); pressStart() }
function onTouchEnd(e: TouchEvent) { e.preventDefault(); pressEnd() }
function onGlobalEnd() { if (isPressedRef.value) pressEnd() }

function resizeCanvas() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  canvas.width = canvas.offsetWidth * 2
  canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  animateParticles()
  analyze()
  props.audioElement?.addEventListener('play', setupAudio)
  document.addEventListener('mouseup', onGlobalEnd)
  document.addEventListener('touchend', onGlobalEnd)
  document.addEventListener('touchcancel', onGlobalEnd)
})

onBeforeUnmount(() => {
  clearIntervals()
  cancelAnimationFrame(levelRaf)
  cancelAnimationFrame(particleRaf)
  window.removeEventListener('resize', resizeCanvas)
  props.audioElement?.removeEventListener('play', setupAudio)
  document.removeEventListener('mouseup', onGlobalEnd)
  document.removeEventListener('touchend', onGlobalEnd)
  document.removeEventListener('touchcancel', onGlobalEnd)
  audioCtx?.close().catch(() => {})
})

/* ---------- derived visuals ---------- */
const audioScale = computed(() => 1 + audioLevel.value * 0.08)
const finalScale = computed(() => audioScale.value * (active.value ? 0.92 : 1))
const holdIntensity = computed(() => Math.min(holdDuration.value / 3, 1))
const glowIntensity = computed(() =>
  active.value ? 0.6 + holdIntensity.value * 0.4 : 0.4 + audioLevel.value * 0.4,
)
const glowScale = computed(() =>
  active.value ? 1.2 + holdIntensity.value * 0.3 : 1 + audioLevel.value * 0.2,
)
const buttonShadow = computed(() =>
  active.value
    ? `0 0 0 2px rgba(226, 182, 63, ${0.6 + holdIntensity.value * 0.4}),
       inset 0 2px 8px rgba(0, 0, 0, 0.3),
       0 4px ${20 + holdIntensity.value * 20}px rgba(226, 182, 63, ${0.3 + holdIntensity.value * 0.2})`
    : undefined,
)
const energyDash = computed(() => `${holdIntensity.value * 565} 565`)
</script>

<template>
  <div class="tap-button-container">
    <canvas ref="canvasRef" class="tap-canvas" />

    <div class="tap-rings">
      <div
        class="tap-ring tap-ring-1"
        :class="{ holding: active }"
        :style="{ transform: `scale(${audioScale})`, animationDuration: active ? `${1.5 - holdIntensity}s` : '3s' }"
      />
      <div
        class="tap-ring tap-ring-2"
        :class="{ holding: active }"
        :style="{ transform: `scale(${audioScale})`, animationDuration: active ? `${2 - holdIntensity * 0.8}s` : '4s' }"
      />
      <div
        class="tap-ring tap-ring-3"
        :class="{ holding: active }"
        :style="{ transform: `scale(${audioScale})`, animationDuration: active ? `${2.5 - holdIntensity * 0.8}s` : '5s' }"
      />
    </div>

    <svg v-if="active" class="tap-energy" :style="{ transform: 'rotate(-90deg)' }">
      <circle
        cx="50%"
        cy="50%"
        r="90"
        fill="none"
        stroke="rgba(226, 182, 63, 0.8)"
        stroke-width="3"
        stroke-linecap="square"
        :stroke-dasharray="energyDash"
        :style="{ filter: 'drop-shadow(0 0 6px rgba(226, 182, 63, 0.6))', transition: 'stroke-dasharray 0.1s ease' }"
      />
    </svg>

    <div class="tap-glow" :class="{ holding: active }" :style="{ opacity: glowIntensity, transform: `scale(${glowScale})` }" />

    <button
      class="tap-button-2026"
      :class="{ disabled: disabled, holding: active }"
      :disabled="disabled"
      :style="{ transform: `scale(${finalScale})`, boxShadow: buttonShadow }"
      @mousedown="pressStart"
      @mouseup="pressEnd"
      @mouseleave="isPressed && pressEnd()"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @touchcancel="pressEnd"
    >
      <span class="tap-button-inner">
        <span class="tap-text" :class="{ holding: active }">{{ active ? '●' : 'ЖАТЬ' }}</span>
        <span v-if="!active" class="tap-subtext">зажми</span>
      </span>
      <div class="tap-shine" />
      <template v-if="active">
        <div class="tap-holding-pulse" />
        <div class="tap-holding-pulse" :style="{ animationDelay: '0.4s' }" />
        <div v-if="holdIntensity > 0.5" class="tap-holding-pulse" :style="{ animationDelay: '0.8s' }" />
      </template>
    </button>
  </div>
</template>

<style scoped>
.tap-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}
.tap-energy {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
