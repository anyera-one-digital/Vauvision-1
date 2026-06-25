<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { useQuizSessionStore } from '@/composables/quizSessionStore';

const props = withDefaults(
  defineProps<{
    currentStep: number;
    /** Все шаги доступны (возврат с оплаты / превью экрана статуса) */
    unlockAllSteps?: boolean;
  }>(),
  { unlockAllSteps: false }
);

const emit = defineEmits<{
  'go-to-step': [step: number];
}>();

const quizSessionStore = useQuizSessionStore();
const isLoading = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const isMobileMenuLayout = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1439px)').matches;

const scrollActiveStepIntoView = (): void => {
  if (!isMobileMenuLayout()) return;
  nextTick(() => {
    const root = menuRef.value;
    if (!root) return;
    const active = root.querySelector('.quiz__menu_button.active') as HTMLElement | null;
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
};

const availableSteps = computed<boolean[]>(() => {
  if (props.unlockAllSteps) {
    return [true, true, true, true, true, true, true, true];
  }
  const max = quizSessionStore.state.maxReachableStep;
  return Array.from({ length: 8 }, (_, idx) => idx + 1 <= max);
});

const canGoToStep = (step: number): boolean => {
  if (step === props.currentStep) return true;
  if (step < props.currentStep) return true;
  if (props.unlockAllSteps) return true;
  return quizSessionStore.canNavigateToStep(step);
};

const goToStep = (step: number) => {
  if (canGoToStep(step)) {
    emit('go-to-step', step);
  }
};

const getStepTitle = (step: number): string => {
  const titles = [
    'Шаг 1. Оформление заказа',
    'Шаг 2. Загрузить трек',
    'Шаг 3. Информация о треке',
    'Шаг 4. Данные паспорта',
    'Шаг 5. Жанр и текст',
    'Шаг 6. Дополнительная информация',
    'Шаг 7. Договор',
    'Шаг 8. Финал'
  ];
  return titles[step - 1];
};

watch(() => props.currentStep, () => {
  scrollActiveStepIntoView();
});

watch(
  () => props.unlockAllSteps,
  () => {
    scrollActiveStepIntoView();
  }
);

onMounted(() => {
  scrollActiveStepIntoView();
});
</script>

<template>
<div ref="menuRef" class="quiz__menu">
  <div v-if="isLoading" class="quiz__menu_loading">
    <span>Загрузка...</span>
  </div>
  <button 
    v-else
    v-for="step in 8" 
    :key="step"
    class="quiz__menu_button button" 
    :class="[
      { active: currentStep === step },
      { available: canGoToStep(step) && step !== currentStep },
      { disabled: !canGoToStep(step) && step !== currentStep }
    ]" 
    @click="goToStep(step)"
    :disabled="!canGoToStep(step) && step !== currentStep"
  >
    <span>{{ getStepTitle(step) }}</span>
  </button>
</div>
</template>

<style lang="scss" scoped>
.quiz__menu {
  display: flex;
  width: 330px;
  flex: 0 0 auto;
  flex-direction: column;
  border-right: 1px solid var(--border);

  @media (max-width: 1439px) {
    padding: 0;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
    overflow-y: hidden;
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
  }

  &_loading {
    padding: 20px;
    text-align: center;
    color: var(--text-gray);
  }

  &_button {
    display: flex;
    padding: 14px 30px;
    align-items: center;
    gap: 8px;
    position: relative;
    color: var(--text-gray);
    background-color: var(--bg);
    text-transform: none;
    transition:
      color 0.15s linear,
      background-color 0.15s linear;
    border: none;
    cursor: pointer;

    &::after {
      content: "";
      width: 3px;
      height: 100%;
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1;
      background-color: var(--yellow);
      opacity: 0;
      transition: opacity 0.15s linear;
    }

    &.available {
      color: var(--text);
      cursor: pointer;

      &:hover {
        color: var(--text);
        background-color: var(--bg-color);
      }
    }

    &.disabled {
      color: var(--text-gray);
      cursor: not-allowed;
      opacity: 0.5;
      pointer-events: none;
    }

    &.active {
      color: var(--text);
      background-color: var(--bg-color);

      &::after {
        opacity: 1;
      }
    }

    @media (max-width: 1439px) {
      flex: 0 0 auto;
      padding: 10px 20px;
      white-space: nowrap;
      text-overflow: ellipsis;
      border: 1px solid var(--border);
      border-radius: 30px;

      &::after {
        display: none;
      }

      span {
        flex: 0 0 auto;
        white-space: nowrap;
        word-break: keep-all;
      }

      &.available {
        border-color: var(--border);
      }

      &.disabled {
        border-color: var(--border-light);
      }

      &.active {
        border-color: var(--yellow);
      }
    }

    @media (max-width: 767px) {
      padding: 12px 15px;
    }
  }
}
</style>