import { sendRequest } from "@/utils/api";

/**
 * Серверный черновик визарда релиза (ajax_vue/ajax/quiz/draft.php).
 * Сохраняем только текстовое состояние шагов (quizN_state) — бинарники (аудио/обложки)
 * в черновик не входят, после восстановления файлы нужно приложить заново.
 */

export type QuizServerDraft = {
  stepData: Record<string, any>;
  currentStep: number;
  maxReachableStep: number;
  updatedAt: string;
};

type DraftPayload = Omit<QuizServerDraft, "updatedAt">;

const DRAFT_ENDPOINT = "/ajax_vue/ajax/quiz/draft.php";

/**
 * Черновик «со смыслом»: пользователь выбрал хоть что-то на шаге 1
 * или дошёл до следующих шагов. Начальный нулевой quiz1_state не сохраняем.
 */
export const isDraftStateMeaningful = (stepData: Record<string, any> | null | undefined): boolean => {
  if (!stepData) return false;
  if (Object.keys(stepData).some((k) => /^quiz[2-8]_state$/.test(k))) return true;
  const q1 = stepData["quiz1_state"];
  if (!q1 || typeof q1 !== "object") return false;
  return ["singleCount", "albumCount", "clipCount", "cardCount"].some(
    (f) => Number(q1[f]) > 0,
  );
};

export const loadServerDraft = async (): Promise<QuizServerDraft | null> => {
  try {
    const response: any = await sendRequest("get", DRAFT_ENDPOINT, {});
    const draft = response?.data?.draft;
    if (!draft || typeof draft !== "object") return null;
    if (!isDraftStateMeaningful(draft.stepData)) return null;
    return draft as QuizServerDraft;
  } catch {
    return null;
  }
};

export const deleteServerDraft = async (): Promise<void> => {
  try {
    await sendRequest("post", DRAFT_ENDPOINT, { action: "delete" });
  } catch {
    /* ignore */
  }
};

let saveTimer: number | null = null;
let pendingGetter: (() => DraftPayload | null) | null = null;
let savingEnabled = true;

/** Стоп автосейва (после успешного создания заказа — черновик удалён сервером). */
export const disableServerDraftSaving = (): void => {
  savingEnabled = false;
  cancelServerDraftSave();
};

export const enableServerDraftSaving = (): void => {
  savingEnabled = true;
};

const flushSave = async (): Promise<void> => {
  if (!pendingGetter) return;
  const payload = pendingGetter();
  pendingGetter = null;
  if (!payload || !isDraftStateMeaningful(payload.stepData)) return;
  try {
    await sendRequest("post", DRAFT_ENDPOINT, payload);
  } catch {
    /* сеть моргнула — следующий автосейв повторит */
  }
};

/**
 * Автосохранение с дебаунсом ~1.5 сек. Снимок состояния берётся в момент отправки
 * (getter), чтобы не сериализовывать стор на каждое изменение.
 */
export const scheduleServerDraftSave = (getter: () => DraftPayload | null): void => {
  if (!savingEnabled) return;
  pendingGetter = getter;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    void flushSave();
  }, 1500);
};

/** Немедленная отправка отложенного сохранения (закрытие вкладки/уход со страницы). */
export const flushServerDraftSave = (): void => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingGetter || !savingEnabled) return;
  const payload = pendingGetter();
  pendingGetter = null;
  if (!payload || !isDraftStateMeaningful(payload.stepData)) return;
  try {
    // keepalive — успевает уйти при закрытии вкладки
    void fetch(DRAFT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore */
  }
};

/** Отмена запланированного автосейва без отправки (сброс формы/выход). */
export const cancelServerDraftSave = (): void => {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingGetter = null;
};

/** Человекочитаемое «сохранён N минут назад» из updatedAt (серверное время МСК). */
export const formatDraftAge = (updatedAt: string): string => {
  const ts = Date.parse(updatedAt.replace(" ", "T") + "+03:00");
  if (Number.isNaN(ts)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  const h = Math.floor(diffMin / 60);
  return `${h} ч ${diffMin % 60} мин назад`;
};
