import { openDB } from "@/utils/inMemoryIdb";
import { SESSION_STORAGE_KEYS_PRESERVE_ON_QUIZ_RESET } from "@/composables/labelArtistsMenu";
import { useQuizSessionStore } from "@/composables/quizSessionStore";

export const QUIZ_ORDER_COMPLETED_SESSION_KEY = "quiz_order_completed";

type ResetQuizDraftOptions = {
  preserveSessionKeys?: string[];
};

const QUIZ_LOCAL_KEY_PARTS = ["quiz", "form", "draft", "state"];
const QUIZ_DB_NAME = "quizDB";
const QUIZ_DB_VERSION = 2;
const QUIZ_STORE_NAME = "quizState";
const QUIZ_FILES_DB_NAME = "filesDB";
const QUIZ_AUDIO_DB_NAME = "audioDB";

const collectStorageKeysByParts = (
  storage: Storage,
  parts: readonly string[],
): string[] => {
  const lowerParts = parts.map((part) => part.toLowerCase());
  const keys: string[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const keyLower = key.toLowerCase();
    if (lowerParts.some((part) => keyLower.includes(part))) {
      keys.push(key);
    }
  }

  return keys;
};

const clearQuizStateStore = async (): Promise<void> => {
  try {
    const db = await openDB(QUIZ_DB_NAME, QUIZ_DB_VERSION);
    if (db.objectStoreNames.contains(QUIZ_STORE_NAME)) {
      await db.clear(QUIZ_STORE_NAME);
    }
    db.close();
  } catch {
    // ignore
  }
};

const clearBinaryStore = async (
  dbName: string,
  storeName: string,
): Promise<void> => {
  try {
    const db = await openDB(dbName, QUIZ_DB_VERSION);
    if (db.objectStoreNames.contains(storeName)) {
      await db.clear(storeName);
    }
    db.close();
  } catch {
    // ignore
  }
};

export const resetQuizDraft = async (
  options: ResetQuizDraftOptions = {},
): Promise<void> => {
  const quizSessionStore = useQuizSessionStore();

  const preservedSessionKeys = new Set<string>([
    ...SESSION_STORAGE_KEYS_PRESERVE_ON_QUIZ_RESET,
    ...(options.preserveSessionKeys ?? []),
  ]);

  const localKeys = collectStorageKeysByParts(localStorage, QUIZ_LOCAL_KEY_PARTS);
  for (const key of localKeys) {
    localStorage.removeItem(key);
  }

  const sessionPreservedValues = new Map<string, string>();
  for (const key of preservedSessionKeys) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) {
        sessionPreservedValues.set(key, value);
      }
    } catch {
      // ignore
    }
  }
  const sessionKeys = collectStorageKeysByParts(
    sessionStorage,
    QUIZ_LOCAL_KEY_PARTS,
  );
  for (const key of sessionKeys) {
    if (preservedSessionKeys.has(key)) continue;
    sessionStorage.removeItem(key);
  }

  for (const [key, value] of sessionPreservedValues.entries()) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  await Promise.allSettled([
    clearQuizStateStore(),
    clearBinaryStore(QUIZ_FILES_DB_NAME, "files"),
    clearBinaryStore(QUIZ_AUDIO_DB_NAME, "audio"),
  ]);

  quizSessionStore.resetSession();

  window.dispatchEvent(new CustomEvent("quiz-data-updated"));
};

export const markQuizOrderCompleted = (): void => {
  try {
    sessionStorage.setItem(QUIZ_ORDER_COMPLETED_SESSION_KEY, "1");
  } catch {
    // ignore
  }
};
