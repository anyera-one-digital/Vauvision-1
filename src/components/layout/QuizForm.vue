<script lang="ts" setup>
import { ref, reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import QuizMenu from "@/components/layout/Quiz/QuizMenu.vue";
import Quiz1 from "@/components/layout/Quiz/Quiz1.vue";
import Quiz2 from "@/components/layout/Quiz/Quiz2.vue";
import Quiz3 from "@/components/layout/Quiz/Quiz3.vue";
import Quiz4 from "@/components/layout/Quiz/Quiz4.vue";
import Quiz5 from "@/components/layout/Quiz/Quiz5.vue";
import Quiz6 from "@/components/layout/Quiz/Quiz6.vue";
import Quiz7 from "@/components/layout/Quiz/Quiz7.vue";
import Quiz8 from "@/components/layout/Quiz/Quiz8.vue";
import { useQuizSessionStore } from "@/composables/quizSessionStore";
import PaymentStatus from "@/components/layout/Quiz/PaymentStatus.vue";

const emit = defineEmits<{
  "go-back": [];
  "update:current-step": [step: number];
}>();

const props = withDefaults(
  defineProps<{
    currentStep?: number;
    /** Возврат с оплаты: показать PaymentStatus вместо Quiz8 на шаге 8 */
    paymentReturnStatus?: "success" | "error" | null;
  }>(),
  { currentStep: 1, paymentReturnStatus: null },
);

// Глобальное состояние для хранения данных между шагами
interface TrackData {
  id: string;
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  trackName: string;
  referralCode: string;
  audioFile: File | null;
  audioFileName: string;
  audioFileSize: number;
  uploaded: boolean;
}

interface AlbumTrackData {
  id: string;
  trackNumber: number;
  trackName: string;
  audioFile: File | null;
  audioFileName: string;
  audioFileSize: number;
  uploaded: boolean;
}

interface AlbumData {
  id: string;
  albumName: string;
  performerName: string;
  musicAuthor: string;
  textAuthor: string;
  referralCode: string;
  tracks: AlbumTrackData[];
}

const currentStep = ref(props.currentStep);
const quizSessionStore = useQuizSessionStore();
quizSessionStore.setCurrentStep(props.currentStep);

const paymentRetryUsdt = ref("");
const paymentRetryCard = ref("");

const QUIZ_LAST_PAYMENT_LINKS_KEY = "quiz_last_payment_links";

const loadPaymentRetryLinks = () => {
  paymentRetryUsdt.value = "";
  paymentRetryCard.value = "";
  try {
    const raw = sessionStorage.getItem(QUIZ_LAST_PAYMENT_LINKS_KEY);
    if (!raw) return;
    const j = JSON.parse(raw) as { usdt?: string; card?: string };
    if (typeof j.usdt === "string") paymentRetryUsdt.value = j.usdt;
    if (typeof j.card === "string") paymentRetryCard.value = j.card;
  } catch {
    /* ignore */
  }
};

watch(
  () => [props.currentStep, props.paymentReturnStatus] as const,
  ([step, st]) => {
    if (step === 8 && (st === "success" || st === "error"))
      loadPaymentRetryLinks();
  },
  { immediate: true },
);

watch(
  () => props.currentStep,
  (v) => {
    currentStep.value = v;
    quizSessionStore.setCurrentStep(v);
    if (v > quizSessionStore.state.maxReachableStep) {
      quizSessionStore.setMaxReachableStep(v);
    }
  },
);

// Референсы для дочерних компонентов
const quiz1Ref = ref<InstanceType<typeof Quiz1> | null>(null);

// Глобальное состояние
const quizState = reactive({
  singleCount: 0,
  albumCount: 0,
  clipCount: 0,
  cardCount: 0,
  singleTracks: [] as TrackData[],
  albumTracks: [] as AlbumData[],
  prices: {
    single: 2590,
    album: 2590,
    clip: 2590,
    card: 2590,
  },
});

// Общая сумма
const totalSum = ref(0);

// Функции для управления состоянием
const updateCounts = (
  type: "single" | "album" | "clip" | "card",
  count: number,
) => {
  quizState[`${type}Count`] = count;

  if (type === "single") {
    updateSingleTracks(count);
  } else if (type === "album") {
    updateAlbumTracks(count);
  }

  calculateTotalSum();
};

const updateSingleTracks = (count: number) => {
  const currentCount = quizState.singleTracks.length;

  if (count > currentCount) {
    // Добавляем новые треки
    for (let i = currentCount; i < count; i++) {
      quizState.singleTracks.push({
        id: `single-${Date.now()}-${Math.random()}`,
        performerName: "",
        musicAuthor: "",
        textAuthor: "",
        trackName: "",
        referralCode: "",
        audioFile: null,
        audioFileName: "",
        audioFileSize: 0,
        uploaded: false,
      });
    }
  } else if (count < currentCount) {
    // Удаляем лишние треки
    quizState.singleTracks.splice(count);
  }
};

const updateAlbumTracks = (count: number) => {
  const currentCount = quizState.albumTracks.length;

  if (count > currentCount) {
    // Добавляем новые альбомы
    for (let i = currentCount; i < count; i++) {
      quizState.albumTracks.push({
        id: `album-${Date.now()}-${Math.random()}`,
        albumName: "",
        performerName: "",
        musicAuthor: "",
        textAuthor: "",
        referralCode: "",
        tracks: [],
      });
    }
  } else if (count < currentCount) {
    // Удаляем лишние альбомы
    quizState.albumTracks.splice(count);
  }
};

const calculateTotalSum = () => {
  totalSum.value =
    quizState.singleCount * quizState.prices.single +
    quizState.albumCount * quizState.prices.album +
    quizState.clipCount * quizState.prices.clip +
    quizState.cardCount * quizState.prices.card;
};

const updateSingleTrack = (index: number, data: Partial<TrackData>) => {
  if (index >= 0 && index < quizState.singleTracks.length) {
    Object.assign(quizState.singleTracks[index], data);
  }
};

const updateAlbum = (index: number, data: Partial<AlbumData>) => {
  if (index >= 0 && index < quizState.albumTracks.length) {
    Object.assign(quizState.albumTracks[index], data);
  }
};

const addAlbumTrack = (albumIndex: number, trackData: AlbumTrackData) => {
  if (albumIndex >= 0 && albumIndex < quizState.albumTracks.length) {
    quizState.albumTracks[albumIndex].tracks.push(trackData);
  }
};

const removeAlbumTrack = (albumIndex: number, trackIndex: number) => {
  if (albumIndex >= 0 && albumIndex < quizState.albumTracks.length) {
    if (
      trackIndex >= 0 &&
      trackIndex < quizState.albumTracks[albumIndex].tracks.length
    ) {
      quizState.albumTracks[albumIndex].tracks.splice(trackIndex, 1);
    }
  }
};

const areAllSingleTracksComplete = (): boolean => {
  if (quizState.singleCount === 0) return true;

  return quizState.singleTracks.every(
    (track) =>
      track.performerName.trim().length >= 2 &&
      track.musicAuthor.trim().length >= 2 &&
      track.textAuthor.trim().length >= 2 &&
      track.trackName.trim().length >= 2 &&
      track.audioFile !== null &&
      track.uploaded,
  );
};

const areAllAlbumsComplete = (): boolean => {
  if (quizState.albumCount === 0) return true;

  return quizState.albumTracks.every(
    (album) =>
      album.albumName.trim().length >= 2 &&
      album.performerName.trim().length >= 2 &&
      album.musicAuthor.trim().length >= 2 &&
      album.textAuthor.trim().length >= 2 &&
      album.tracks.length > 0 &&
      album.tracks.every(
        (track) =>
          track.trackName.trim().length >= 2 &&
          track.audioFile !== null &&
          track.uploaded,
      ),
  );
};

const goToStep = (step: number, options: { preserveForward?: boolean } = {}) => {
  if (!quizSessionStore.canNavigateToStep(step)) return;
  if (step < currentStep.value && !options.preserveForward) {
    quizSessionStore.invalidateFromStep(step + 1);
    quizSessionStore.setMaxReachableStep(step);
  }
  currentStep.value = step;
  quizSessionStore.setCurrentStep(step);
  emit("update:current-step", step);
};

const completeStepAndGoNext = (completedStep: number) => {
  quizSessionStore.completeStep(completedStep);
  goToStep(completedStep + 1, { preserveForward: true });
};

const handleGoBack = () => {
  if (currentStep.value === 1) {
    // Если на первом шаге, возвращаемся к превью
    emit("go-back");
  } else {
    // Иначе переходим на предыдущий шаг
    goToStep(currentStep.value - 1);
  }
};

const handleFinish = () => {
  ElMessage.success("Процесс загрузки завершен!");
  console.log("Данные для отправки:", {
    singleCount: quizState.singleCount,
    albumCount: quizState.albumCount,
    clipCount: quizState.clipCount,
    cardCount: quizState.cardCount,
    singleTracks: quizState.singleTracks,
    albumTracks: quizState.albumTracks,
    totalSum: totalSum.value,
  });
};

// Метод для полной очистки при рестарте
const fullReset = async () => {
  console.log("🔄 Полная очистка QuizForm");

  // Сбрасываем шаг на 1
  currentStep.value = 1;
  quizSessionStore.resetSession();

  try {
    sessionStorage.removeItem(QUIZ_LAST_PAYMENT_LINKS_KEY);
  } catch {
    /* ignore */
  }

  // Сбрасываем глобальное состояние
  quizState.singleCount = 0;
  quizState.albumCount = 0;
  quizState.clipCount = 0;
  quizState.cardCount = 0;
  quizState.singleTracks = [];
  quizState.albumTracks = [];
  totalSum.value = 0;

  // Сбрасываем Quiz1 если он существует
  if (quiz1Ref.value) {
    await quiz1Ref.value.fullReset();
  }

  console.log("✅ Полная очистка QuizForm завершена");
};

// Экспортируем методы и состояние для родителя
defineExpose({
  fullReset,
  quizState,
  totalSum,
  updateCounts,
  updateSingleTrack,
  updateAlbum,
  addAlbumTrack,
  removeAlbumTrack,
  areAllSingleTracksComplete,
  areAllAlbumsComplete,
  calculateTotalSum,
});
</script>

<template>
  <div class="quiz__forms">
    <QuizMenu :current-step="currentStep" @go-to-step="goToStep" />

    <!-- Шаг 1 -->
    <Quiz1
      v-if="currentStep === 1"
      ref="quiz1Ref"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(1)"
    />

    <!-- Шаг 2 -->
    <Quiz2
      v-if="currentStep === 2"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(2)"
    />

    <!-- Шаг 3 -->
    <Quiz3
      v-if="currentStep === 3"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(3)"
    />

    <!-- Шаг 4 -->
    <Quiz4
      v-if="currentStep === 4"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(4)"
    />

    <!-- Шаг 5 -->
    <Quiz5
      v-if="currentStep === 5"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(5)"
    />

    <!-- Шаг 6 -->
    <Quiz6
      v-if="currentStep === 6"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(6)"
    />

    <!-- Шаг 7 -->
    <Quiz7
      v-if="currentStep === 7"
      @go-back="handleGoBack"
      @go-next="completeStepAndGoNext(7)"
    />

    <!-- Шаг 8: возврат с оплаты -->
    <PaymentStatus
      v-if="
        currentStep === 8 &&
        (paymentReturnStatus === 'success' || paymentReturnStatus === 'error')
      "
      :status="paymentReturnStatus!"
      :usdt-payment-url="paymentRetryUsdt || undefined"
      :card-payment-url="paymentRetryCard || undefined"
    />

    <!-- Шаг 8: оформление / выбор оплаты в ЛК -->
    <Quiz8
      v-if="
        currentStep === 8 &&
        paymentReturnStatus !== 'success' &&
        paymentReturnStatus !== 'error'
      "
      @go-back="handleGoBack"
      @finish="handleFinish"
    />
  </div>
</template>

<style lang="scss" scoped>
.quiz__forms {
  display: flex;
  width: 100%;
  padding: 50px 20px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 1919px) {
    padding: 40px 20px;
  }

  @media (max-width: 1439px) {
    flex-direction: column;
    gap: 40px;
  }

  @media (max-width: 767px) {
    border: 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
}
</style>
