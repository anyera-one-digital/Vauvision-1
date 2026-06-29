<script setup lang="ts">
import { computed } from 'vue'
import logoBlack from '@/assets/img/karaoke/vauvision-logo.png'
import logoWhite from '@/assets/img/karaoke/vauvision-logo-white.png'
import { useKaraokeApp } from './useKaraokeApp'

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const { theme } = useKaraokeApp()
const src = computed(() => (theme.value === 'dark' ? logoWhite : logoBlack))
</script>

<template>
  <a class="kk-logo" :class="`kk-logo--${size}`" href="https://vauvision.com" target="_blank" rel="noopener noreferrer">
    <img :src="src" alt="VAUVISION" />
  </a>
</template>

<style scoped>
.kk-logo { display: inline-flex; align-items: center; max-width: 100%; }
.kk-logo img { width: auto; max-width: 100%; object-fit: contain; }
.kk-logo--sm img { height: 22px; }
.kk-logo--md img { height: 30px; }
.kk-logo--lg img { height: 46px; }
</style>
