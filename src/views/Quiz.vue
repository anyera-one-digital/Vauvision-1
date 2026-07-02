<template>
<Header></Header>
<section class="personal">
  <div class="container personal__container">
    <Menu />
    <div class="personal__block">
      <div class="quiz__flex">
        <div class="quiz__content">
          <div class="quiz__preview" v-if="!showForm">
            <h4 class="quiz__preview_heading">Форма размещения треков Vauvision</h4>
            <p class="quiz__preview_description">Пожалуйста, заполните все пункты максимально подробно – это позволит нам сделать нашу работу качественно.</p>
            <p class="quiz__preview_attention">Внимание!</p>
            <ul class="quiz__preview_list">
              <li class="quiz__preview_item">
                <p class="quiz__preview_desc">Рекомендуется закладывать минимум 3 рабочих дня на загрузку релиза.</p>
              </li>
              <li>
                <p class="quiz__preview_desc">Треки выходят на площадках в 00:00 выбранной даты (по Москве).</p>
              </li>
              <li>
                <p class="quiz__preview_desc">Для редактирования размера обложек (формат JPEG, от 1500x1500 пикселей) используйте вкладку «Обложка» на нашем <a href="https://vauvision.com/photos" target="_blank" rel="noopener noreferrer">сайте</a>
                </p>
              </li>
              <li>
                <p class="quiz__preview_desc">Для редактирования формата треков (.wav, 16 bit, 44.1 Khz) <a href="https://online-audio-converter.com" target="_blank">используйте конвертер</a></p>
              </li>
              <li>
                <p>После заполнения этой формы, пожалуйста, напишите сообщение в формате <strong>"Ваш псевдоним - Название релиза - ДИСТРИБУЦИЯ"</strong> в сообщения паблика 
                  <a href="https://vk.com/vauvisionlabel" target="_blank" rel="noopener noreferrer">vk.com/vauvisionlabel</a>, либо <a href="https://t.me/vauvision_bot" target="_blank" rel="noopener noreferrer">телеграмм</a>.
                </p>
              </li>
              <li>
                <p>Перед загрузкой клипа прочтите 
                  <RouterLink :to="Tr.i18nRoute({ name: 'faq' })">
                    <span>инструкцию</span>
                  </RouterLink>.
                </p>
              </li>
            </ul>
            <!-- Незавершённый черновик с сервера -->
            <div v-if="serverDraft" class="quiz__draft_banner">
              <p class="quiz__draft_title">У вас есть незавершённый черновик релиза</p>
              <p class="quiz__draft_desc">
                Сохранён {{ formatDraftAge(serverDraft.updatedAt) }}. Заполненные поля восстановятся,
                аудиофайлы и обложку нужно будет приложить заново.
              </p>
            </div>
            <div class="quiz__preview_buttons">
              <template v-if="serverDraft">
                <button class="quiz__preview_button button__black button" :disabled="isRestoringDraft" @click="restoreDraftAndStart">
                  <span>{{ isRestoringDraft ? 'Восстановление…' : 'Продолжить черновик' }}</span>
                </button>
                <button class="quiz__restart_button button__red button" @click="startOver">
                  <span>Начать заново</span>
                </button>
              </template>
              <button v-else class="quiz__preview_button button__black button" @click="showQuizForm"><span>Продолжить</span></button>
            </div>
          </div>

          <QuizForm 
            v-if="showForm" 
            :current-step="currentStep" 
            :payment-return-status="paymentReturnStatus"
            @update:current-step="goToStep"
            @go-back="handleGoBack"
            ref="quizFormRef"
          />
        </div>
      </div>
    </div>
  </div>
</section>
</template>

<script lang="ts" setup>
import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import QuizForm from "@/components/layout/QuizForm.vue";
import { useQuizSessionStore } from "@/composables/quizSessionStore";
import { resetQuizDraft } from "@/utils/quizDraftReset";
import { openDB } from "@/utils/inMemoryIdb";
import {
  loadServerDraft,
  deleteServerDraft,
  scheduleServerDraftSave,
  flushServerDraftSave,
  cancelServerDraftSave,
  enableServerDraftSaving,
  formatDraftAge,
  type QuizServerDraft,
} from "@/utils/quizServerDraft";
import {
  parsePaymentQueryParam,
  paymentQueryNeedsNormalization,
  type QuizPaymentReturnStatus,
} from '@/utils/quizPaymentQuery';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tr from "@/i18n/translation";

const route = useRoute();
const router = useRouter();
const quizSessionStore = useQuizSessionStore();

// Состояния для переключения
const showForm = ref(false);
const currentStep = ref(1);

// Серверный черновик (баннер «Продолжить черновик» на превью)
const serverDraft = ref<QuizServerDraft | null>(null);
const isRestoringDraft = ref(false);

/** Возврат с оплаты на шаг 8 — показ PaymentStatus в QuizForm */
const paymentReturnStatus = computed<QuizPaymentReturnStatus | null>(() =>
  parsePaymentQueryParam(route.query.payment),
);

/** Чистый payment=success|error в адресной строке (без error?InvId=…). */
const normalizePaymentQueryInUrl = async (): Promise<void> => {
  const raw = route.query.payment;
  if (!paymentQueryNeedsNormalization(raw)) return;

  const status = parsePaymentQueryParam(raw);
  if (!status) return;

  const query = { ...route.query, payment: status };
  await router.replace({ ...route, query });
};

/** Убирает параметры возврата с оплаты перед новым квизом. */
const clearPaymentQueryFromUrl = async (): Promise<void> => {
  if (!route.query.payment && !route.query.InvId) return;

  const query = { ...route.query };
  delete query.payment;
  delete query.InvId;
  await router.replace({ name: route.name ?? 'release', query });
};

const applyPaymentReturnScreen = (): void => {
  if (!parsePaymentQueryParam(route.query.payment)) return;
  quizSessionStore.setCurrentStep(8);
  quizSessionStore.setMaxReachableStep(8);
  showForm.value = true;
  currentStep.value = 8;
};

/** Прямой заход на экран статуса оплаты: /release?payment=success|error */
watch(
  () => route.query.payment,
  async (p) => {
    const status = parsePaymentQueryParam(p);
    if (!status) return;

    if (paymentQueryNeedsNormalization(p)) {
      await normalizePaymentQueryInUrl();
      return;
    }

    applyPaymentReturnScreen();
  },
  { immediate: true },
);

// Перед входом в форму — проверка паспорта и реквизитов (как на прод-сборке).
// true = можно продолжать, false = отправили в настройки.
const ensureProfileReady = async (): Promise<boolean> => {
  try {
    const { fetchReleaseProfileReadiness } = await import(
      '@/utils/releaseProfileReadiness'
    );
    const readiness = await fetchReleaseProfileReadiness();
    if (!readiness.ok) {
      await router.push(
        Tr.i18nRoute({
          name: 'setting',
          query: {
            releaseBlocked: '1',
            focus: readiness.focus,
          },
        }),
      );
      return false;
    }
  } catch {
    /* без сети / ошибка проверки — не блокируем оформление */
  }
  return true;
};

const showQuizForm = async () => {
  if (!(await ensureProfileReady())) return;
  await clearPaymentQueryFromUrl();
  cancelServerDraftSave();
  quizSessionStore.resetSession();
  quizSessionStore.setCurrentStep(1);
  quizSessionStore.setMaxReachableStep(1);
  await resetQuizDraft();
  enableServerDraftSaving();
  currentStep.value = 1;
  showForm.value = true;
};

// «Начать заново» при существующем черновике: удаляем его и стартуем с нуля
const startOver = async () => {
  serverDraft.value = null;
  void deleteServerDraft();
  await showQuizForm();
};

// «Продолжить черновик»: вливаем сохранённое состояние шагов и открываем форму.
// Файлы (аудио/обложка) в черновик не входят — возвращаем пользователя на шаг 2,
// дальше он проходит шаги последовательно с уже заполненными полями.
const restoreDraftAndStart = async () => {
  const draft = serverDraft.value;
  if (!draft || isRestoringDraft.value) return;
  isRestoringDraft.value = true;
  try {
    if (!(await ensureProfileReady())) return;
    await clearPaymentQueryFromUrl();
    cancelServerDraftSave();
    quizSessionStore.resetSession();
    await resetQuizDraft();

    // Тот же канал, что используют шаги: in-memory idb → quizSessionStore
    const db = await openDB('quizDB', 2, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('quizState')) {
          d.createObjectStore('quizState', { keyPath: 'id' });
        }
      },
    });
    for (const [key, value] of Object.entries(draft.stepData)) {
      if (!value || typeof value !== 'object') continue;
      await db.put('quizState', { ...(value as object), id: (value as any).id ?? key });
    }

    const resumeStep = Math.min(draft.maxReachableStep || 1, 2);
    quizSessionStore.setCurrentStep(resumeStep);
    quizSessionStore.setMaxReachableStep(resumeStep);
    enableServerDraftSaving();
    currentStep.value = resumeStep;
    showForm.value = true;
    serverDraft.value = null;
  } finally {
    isRestoringDraft.value = false;
  }
};

// Функция для переключения шагов
const goToStep = (step: number) => {
  if (!quizSessionStore.canNavigateToStep(step)) return;
  currentStep.value = step;
  quizSessionStore.setCurrentStep(step);
};

// Функция для возврата к превью
const handleGoBack = () => {
  flushServerDraftSave(); // сохраняем последний ввод в черновик
  showForm.value = false;
  currentStep.value = 1;
  quizSessionStore.resetSession();
  // показываем баннер черновика, если есть что продолжать
  void loadServerDraft().then((draft) => {
    if (!showForm.value) {
      serverDraft.value = draft;
    }
  });
};

// Автосейв серверного черновика: изменения состояния шагов/навигации → debounce → draft.php
watch(
  [
    () => quizSessionStore.state.stepData,
    () => quizSessionStore.state.currentStep,
    () => quizSessionStore.state.maxReachableStep,
  ],
  () => {
    if (!showForm.value) return;
    if (parsePaymentQueryParam(route.query.payment)) return; // экран возврата с оплаты
    if (Object.keys(quizSessionStore.state.stepData).length === 0) return;
    scheduleServerDraftSave(() => ({
      stepData: JSON.parse(JSON.stringify(quizSessionStore.state.stepData)),
      currentStep: quizSessionStore.state.currentStep,
      maxReachableStep: quizSessionStore.state.maxReachableStep,
    }));
  },
  { deep: true },
);

const handleBeforeUnload = () => {
  // не теряем последние ~1.5 сек ввода при закрытии вкладки
  flushServerDraftSave();
  quizSessionStore.resetSession();
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  // Черновик показываем только на превью (не при возврате с оплаты)
  if (!parsePaymentQueryParam(route.query.payment)) {
    void loadServerDraft().then((draft) => {
      if (!showForm.value) {
        serverDraft.value = draft;
      }
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  flushServerDraftSave();
});
</script>

<style lang="scss" scoped>
.personal {
  margin: 0 0 auto;

    &__block {
    @media (max-width: 1919px) {
      width: calc(100% - 230px);
    }

    @media (max-width: 1439px) {
      width: 100%;
    }
  }
}



.quiz__preview {
  display: flex;
  padding: 40px;
  flex-direction: column;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 1023px) {
    padding: 30px 20px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_description,
  &_attention {
    padding: 30px 0 0;
    max-width: 860px;

    @media (max-width: 1439px) {
      padding: 15px 0 0;
    }
  }

  &_attention {
    color: var(--color);
  }

  &_heading {
    max-width: 860px;
  }

  &_list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    counter-reset: quiz-counter;
    list-style: none;
    padding: 20px 0 0;
    padding-left: 0;
    max-width: 860px;

    li {
      position: relative;
      padding-left: 30px;
      counter-increment: quiz-counter;

      &::before {
        content: counter(quiz-counter) ".";
        position: absolute;
        left: 0;
        top: 2.3px;
      }
    }
  }

  &_buttons {
    padding: 60px 0 0;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    max-width: 860px;

    @media (max-width: 1439px) {
      padding: 50px 0 0;
    }

    @media (max-width: 1023px) {
      gap: 15px;
    }

    @media (max-width: 767px) {
      padding: 30px 0 0;
      flex-direction: column;
    }
  }

  &_button,
  .quiz__restart_button {
    @media (max-width: 767px) {
      width: 100%;
    }
  }
}

.quiz__restart_button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.quiz__draft_banner {
  margin-top: 30px;
  padding: 16px 20px;
  max-width: 860px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--color);
  background-color: var(--bg-gray);

  @media (max-width: 767px) {
    margin-top: 20px;
    padding: 14px 15px;
  }
}

.quiz__draft_title {
  font-weight: 600;
}

.quiz__draft_desc {
  padding-top: 6px;
  font-size: 14px;
  opacity: 0.85;
}

@media (max-width: 1439px) {
  .personal__container {
    padding: 0;
  }
}
</style>