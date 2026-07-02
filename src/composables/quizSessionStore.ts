import { reactive } from "vue";
import { uploadDraftFile, deleteDraftFile } from "@/utils/quizDraftFiles";

type StepDataMap = Record<string, any>;
type BinaryEntry = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  data: Blob;
  timestamp: number;
};

type BinaryStoreName = "audio" | "files";

const createInitialState = () => ({
  currentStep: 1,
  maxReachableStep: 1,
  stepData: {} as StepDataMap,
  binary: {
    audio: new Map<string, BinaryEntry>(),
    files: new Map<string, BinaryEntry>(),
  } as Record<BinaryStoreName, Map<string, BinaryEntry>>,
});

const state = reactive(createInitialState());

const clampStep = (step: number): number => Math.min(8, Math.max(1, Number(step) || 1));

export const useQuizSessionStore = () => {
  const setCurrentStep = (step: number): void => {
    state.currentStep = clampStep(step);
  };

  const completeStep = (step: number): void => {
    const nextReachable = clampStep(step + 1);
    if (nextReachable > state.maxReachableStep) {
      state.maxReachableStep = nextReachable;
    }
  };

  const setMaxReachableStep = (step: number): void => {
    state.maxReachableStep = clampStep(step);
  };

  const canNavigateToStep = (step: number): boolean => {
    const target = clampStep(step);
    return target <= state.maxReachableStep;
  };

  const setStepData = (key: string, value: any): void => {
    state.stepData[key] = value;
  };

  const getStepData = <T = any>(key: string): T | null => {
    return (state.stepData[key] as T) ?? null;
  };

  const deleteStepData = (key: string): void => {
    delete state.stepData[key];
  };

  const clearStepData = (): void => {
    Object.keys(state.stepData).forEach((key) => delete state.stepData[key]);
  };

  const resetSession = (): void => {
    setCurrentStep(1);
    setMaxReachableStep(1);
    clearStepData();
    state.binary.audio.clear();
    state.binary.files.clear();
  };

  const invalidateFromStep = (step: number): void => {
    const start = clampStep(step);
    for (let i = start; i <= 8; i++) {
      deleteStepData(`quiz${i}_state`);
    }
    if (start <= 3) {
      state.binary.files.clear();
    }
    if (start <= 2) {
      state.binary.audio.clear();
    }
    if (state.maxReachableStep > start) {
      state.maxReachableStep = start;
    }
    if (state.currentStep > start) {
      state.currentStep = start;
    }
  };

  const putBinary = (storeName: BinaryStoreName, entry: BinaryEntry): void => {
    state.binary[storeName].set(entry.id, entry);
    // Файл уходит и в серверный черновик — переживает F5 (при восстановлении заливка отключена)
    uploadDraftFile(storeName, entry);
  };

  const getBinary = (storeName: BinaryStoreName, id: string): BinaryEntry | null => {
    return state.binary[storeName].get(id) ?? null;
  };

  const deleteBinary = (storeName: BinaryStoreName, id: string): void => {
    state.binary[storeName].delete(id);
    // Пользователь убрал файл — из серверного черновика тоже.
    // Массовые очистки (resetSession/clearBinaryStore) сервер НЕ трогают:
    // они происходят при каждом выходе из визарда, а черновик должен пережить уход.
    deleteDraftFile(id);
  };

  const clearBinaryStore = (storeName: BinaryStoreName): void => {
    state.binary[storeName].clear();
  };

  return {
    state,
    setCurrentStep,
    completeStep,
    setMaxReachableStep,
    canNavigateToStep,
    setStepData,
    getStepData,
    deleteStepData,
    clearStepData,
    resetSession,
    invalidateFromStep,
    putBinary,
    getBinary,
    deleteBinary,
    clearBinaryStore,
  };
};
