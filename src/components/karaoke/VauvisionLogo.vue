<script setup lang="ts">
import logo from '@/assets/img/karaoke/vauvision-logo.png'

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <a class="kk-logo" :class="`kk-logo--${size}`" href="https://vauvision.com" target="_blank" rel="noopener noreferrer">
    <img :src="logo" alt="VAUVISION" />
  </a>
</template>

<style scoped>
.kk-logo { display: inline-flex; align-items: center; }
.kk-logo img { width: auto; object-fit: contain; }
.kk-logo--sm img { height: 22px; }
.kk-logo--md img { height: 30px; }
.kk-logo--lg img { height: 46px; }
</style>
