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
            <div class="quiz__preview_buttons">
              <!-- <button 
                v-if="hasSavedData"
                class="quiz__restart_button button__red button" 
                @click="restartFromBeginning"
                :disabled="isRestarting"
              >
                <span>{{ isRestarting ? 'Очистка данных...' : 'Сбросить' }}</span>
              </button> -->
              <button class="quiz__preview_button button__black button" @click="showQuizForm"><span>Продолжить</span></button>
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

// Перед входом в форму — проверка паспорта и реквизитов (как на прод-сборке)
const showQuizForm = async () => {
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
      return;
    }
  } catch {
    /* без сети / ошибка проверки — не блокируем оформление */
  }
  await clearPaymentQueryFromUrl();
  quizSessionStore.resetSession();
  quizSessionStore.setCurrentStep(1);
  quizSessionStore.setMaxReachableStep(1);
  await resetQuizDraft();
  currentStep.value = 1;
  showForm.value = true;
};

// Функция для переключения шагов
const goToStep = (step: number) => {
  if (!quizSessionStore.canNavigateToStep(step)) return;
  currentStep.value = step;
  quizSessionStore.setCurrentStep(step);
};

// Функция для возврата к превью
const handleGoBack = () => {
  showForm.value = false;
  currentStep.value = 1;
  quizSessionStore.resetSession();
};

const handleBeforeUnload = () => {
  quizSessionStore.resetSession();
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
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

@media (max-width: 1439px) {
  .personal__container {
    padding: 0;
  }
}
</style>