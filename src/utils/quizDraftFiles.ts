/**
 * Серверное хранилище файлов черновика визарда (ajax_vue/ajax/quiz/draft_file.php).
 * Аудио/обложка/доп.файлы заливаются в фоне при добавлении и восстанавливаются вместе
 * с текстовым черновиком — F5 и закрытие вкладки их больше не теряют.
 * Живут 24 часа (как текстовый черновик), чистятся вместе с ним.
 */

export type DraftFileMeta = {
  fileId: string;
  store: "audio" | "files";
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type DraftBinaryEntry = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  data: Blob;
  timestamp: number;
};

const ENDPOINT = "/ajax_vue/ajax/quiz/draft_file.php";

// Во время восстановления черновика putBinary вызывается для файлов, которые
// и так пришли с сервера — повторная заливка не нужна.
let syncEnabled = true;

export const setDraftFileSyncEnabled = (enabled: boolean): void => {
  syncEnabled = enabled;
};

// Одна активная отправка на fileId: повторный put того же id (замена файла)
// ждёт завершения предыдущей, чтобы не гнать блобы параллельно вперемешку.
const activeUploads = new Map<string, Promise<void>>();

const doUpload = async (store: "audio" | "files", entry: DraftBinaryEntry): Promise<void> => {
  const form = new FormData();
  form.append("fileId", entry.id);
  form.append("store", store);
  form.append("fileName", entry.fileName || "file");
  form.append("fileType", entry.fileType || "");
  form.append("file", entry.data, entry.fileName || "file");
  const response = await fetch(ENDPOINT, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`draft file upload failed: ${response.status}`);
  }
};

/** Фоновая заливка файла в черновик (best-effort: сбой ≠ ошибка визарда). */
export const uploadDraftFile = (store: "audio" | "files", entry: DraftBinaryEntry): void => {
  if (!syncEnabled || !entry?.id || !(entry.data instanceof Blob) || entry.data.size === 0) return;
  const chained = (activeUploads.get(entry.id) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => doUpload(store, entry))
    // сеть моргнула — один повтор; не вышло — файл просто не переживёт F5 (как раньше)
    .catch(() => doUpload(store, entry))
    .catch(() => undefined)
    .finally(() => {
      if (activeUploads.get(entry.id) === chained) activeUploads.delete(entry.id);
    });
  activeUploads.set(entry.id, chained);
};

export const deleteDraftFile = (fileId: string): void => {
  if (!syncEnabled || !fileId) return;
  void fetch(ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", fileId }),
  }).catch(() => undefined);
};

export const listDraftFiles = async (): Promise<DraftFileMeta[]> => {
  try {
    const response = await fetch(`${ENDPOINT}?action=list`, { credentials: "include" });
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json?.files) ? json.files : [];
  } catch {
    return [];
  }
};

const downloadDraftFile = async (meta: DraftFileMeta): Promise<DraftBinaryEntry | null> => {
  try {
    const response = await fetch(`${ENDPOINT}?fileId=${encodeURIComponent(meta.fileId)}`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;
    return {
      id: meta.fileId,
      fileName: meta.fileName || "file",
      fileSize: meta.fileSize || blob.size,
      fileType: meta.fileType || blob.type || "application/octet-stream",
      data: blob,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
};

/**
 * Восстановить файлы черновика в память сессии (приёмник — quizSessionStore.putBinary).
 * Возвращает id восстановленных файлов — по ним решаем, на какой шаг можно вернуть.
 */
export const restoreDraftFiles = async (
  put: (store: "audio" | "files", entry: DraftBinaryEntry) => void,
): Promise<Set<string>> => {
  const files = await listDraftFiles();
  const restored = new Set<string>();
  const queue = [...files];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    for (;;) {
      const meta = queue.shift();
      if (!meta) return;
      const entry = await downloadDraftFile(meta);
      if (entry) {
        put(meta.store === "files" ? "files" : "audio", entry);
        restored.add(meta.fileId);
      }
    }
  });
  await Promise.all(workers);
  return restored;
};

/**
 * Собрать id файлов, на которые ссылается текстовое состояние черновика
 * (audioFileId в quiz2, coverFileInfo.fileId в quiz3, fileId доп.услуг в quiz5 и т.п.).
 */
export const collectDraftFileRefs = (stepData: Record<string, any> | null | undefined): Set<string> => {
  const refs = new Set<string>();
  const walk = (value: any): void => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      for (const [key, v] of Object.entries(value)) {
        if (typeof v === "string" && v && /fileid$/i.test(key)) refs.add(v);
        else walk(v);
      }
    }
  };
  walk(stepData);
  return refs;
};
