<script lang="ts" setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { openDB } from 'idb';

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

const DB_NAME = 'quizDB';
const DB_VERSION = 2;
const STORE_NAME = 'quizState';

const availableSteps = ref<boolean[]>([true, false, false, false, false, false, false, false]);
const isLoading = ref(false);
const dbInitialized = ref(false);
const quizDB = ref<any>(null);
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

const initDB = async (): Promise<void> => {
  try {
    console.log('QuizMenu: Initializing IndexedDB...');
    
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          console.log('QuizMenu: Created quizState store');
        }
      },
    });
    
    dbInitialized.value = true;
    console.log('QuizMenu: IndexedDB initialized');
  } catch (error) {
    console.error('QuizMenu: Error initializing IndexedDB:', error);
    dbInitialized.value = false;
  }
};

const safeGet = async (key: string): Promise<any> => {
  if (!dbInitialized.value || !quizDB.value) return null;
  try {
    if (!quizDB.value.objectStoreNames?.contains(STORE_NAME)) return null;
    return await quizDB.value.get(STORE_NAME, key);
  } catch {
    return null;
  }
};

const isStepCompleted = async (step: number): Promise<boolean> => {
  if (!dbInitialized.value) return false;
  
  try {
    switch (step) {
      case 1: {
        const state = await safeGet('quiz1_state');
        if (!state) return false;
        return (state.singleCount || 0) > 0 || (state.albumCount || 0) > 0;
      }
      
      case 2: {
        const state = await safeGet('quiz2_state');
        const counts = await safeGet('quiz1_state');
        if (!state) return false;
        
        let singlesOk = true;
        if (counts?.singleCount > 0) {
          singlesOk = state.singleTracks?.length === counts.singleCount &&
            state.singleTracks?.every((t: any) => t.trackName && t.performerName && t.musicAuthor && t.textAuthor && (t.uploaded || t.hasAudioUploaded));
        }
        
        let albumsOk = true;
        if (counts?.albumCount > 0) {
          albumsOk = state.albums?.length === counts.albumCount &&
            state.albums?.every((a: any) => a.albumName && a.tracks?.length > 0 &&
              a.tracks.every((t: any) => t.trackName && t.performerName && t.musicAuthor && t.textAuthor && t.uploaded));
        }
        
        return singlesOk && albumsOk;
      }
      
      case 3: {
        const state = await safeGet('quiz3_state');
        if (!state?.formData) return false;
        const f = state.formData;
        return !!(f.performerName && f.releaseName && f.email && f.platforms?.length && f.releaseDate && f.hasProfanity && f.vkLink && state.coverFileInfo?.name);
      }
      
      case 4: {
        const state = await safeGet('quiz4_state');
        if (!state?.formData) return false;
        const p = state.formData;
        
        const common = !!(p.lastName && p.firstName && p.middleName && p.passportNumber && p.passportIssuedBy && p.passportIssueDate && p.registrationAddress && p.citizenship);
        const citizenshipOk = p.citizenship !== 'other' || p.otherCitizenship;
        
        if (p.userType === 'entrepreneur') {
          return (
            common &&
            citizenshipOk &&
            !!(
              p.entrepreneurFullName &&
              p.entrepreneurEmail &&
              p.legalAddress &&
              p.inn &&
              p.ogrn &&
              p.accountNumber &&
              p.bankName &&
              p.bankInn &&
              p.bankBik &&
              p.correspondentAccount
            )
          );
        }
        return common && citizenshipOk;
      }
      
      case 5: {
        const state = await safeGet('quiz5_state');
        if (!state?.formData) return false;
        const g = state.formData;
        const required = !!(g.genre && g.hasDrugsMention && g.socialLinks);
        if (g.hasDrugsMention === 'yes') return required && !!g.drugsTracks;
        return required;
      }
      
      case 6: {
        const state = await safeGet('quiz6_state');
        if (!state?.formData) return false;
        const a = state.formData;
        const platformsOk = a.platforms?.length > 0;
        const otherOk = !a.platforms?.includes('other') || a.otherPlatform;
        return platformsOk && otherOk && a.confirmNoRightsViolation === true;
      }
      
      case 7: {
        const state = await safeGet('quiz7_state');
        if (!state?.formData) return false;
        return state.formData.acceptTerms === true && state.formData.acceptPrivacy === true;
      }
      
      case 8: {
        const state = await safeGet('quiz8_state');
        return !!state;
      }
      
      default: return false;
    }
  } catch (error) {
    console.error(`QuizMenu: Error checking step ${step}:`, error);
    return false;
  }
};

const loadStepsAvailability = async () => {
  if (props.unlockAllSteps) {
    availableSteps.value = [true, true, true, true, true, true, true, true];
    isLoading.value = false;
    return;
  }

  if (!dbInitialized.value) return;
  
  isLoading.value = true;
  try {
    const newSteps = [true, false, false, false, false, false, false, false];
    
    if (await isStepCompleted(1)) {
      newSteps[1] = true;
      if (await isStepCompleted(2)) {
        newSteps[2] = true;
        if (await isStepCompleted(3)) {
          newSteps[3] = true;
          if (await isStepCompleted(4)) {
            newSteps[4] = true;
            if (await isStepCompleted(5)) {
              newSteps[5] = true;
              if (await isStepCompleted(6)) {
                newSteps[6] = true;
                if (await isStepCompleted(7)) {
                  newSteps[7] = true;
                }
              }
            }
          }
        }
      }
    }
    
    availableSteps.value = newSteps;
  } catch (error) {
    console.error('QuizMenu: Error loading steps:', error);
  } finally {
    isLoading.value = false;
  }
};

const canGoToStep = (step: number): boolean => {
  if (step === props.currentStep) return true;
  if (step < props.currentStep) return true;
  return availableSteps.value[step - 1];
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

const handleDataUpdate = () => {
  loadStepsAvailability();
};

onMounted(async () => {
  await initDB();
  await loadStepsAvailability();
  scrollActiveStepIntoView();
  window.addEventListener('quiz-data-updated', handleDataUpdate);
});

watch(() => props.currentStep, () => {
  loadStepsAvailability();
  scrollActiveStepIntoView();
});

watch(
  () => props.unlockAllSteps,
  () => {
    loadStepsAvailability();
    scrollActiveStepIntoView();
  }
);

watch(isLoading, (loading) => {
  if (!loading) scrollActiveStepIntoView();
});

onUnmounted(() => {
  window.removeEventListener('quiz-data-updated', handleDataUpdate);
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