import { useQuizSessionStore } from "@/composables/quizSessionStore";

type UpgradeStore = {
  createIndex: (_name: string, _keyPath: string) => void;
};

type UpgradeDb = {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string, _options?: { keyPath?: string }) => UpgradeStore;
  deleteObjectStore: (name: string) => void;
};

type UpgradeCallback = (db: UpgradeDb, oldVersion: number, newVersion: number) => void;

type OpenDbOptions = {
  upgrade?: UpgradeCallback;
};

type MemoryDbData = {
  version: number;
  stores: Map<string, Map<string, any>>;
};

const memoryDatabases = new Map<string, MemoryDbData>();

const createStore = (): Map<string, any> => new Map<string, any>();

const ensureDb = (dbName: string): MemoryDbData => {
  let db = memoryDatabases.get(dbName);
  if (!db) {
    db = {
      version: 0,
      stores: new Map(),
    };
    memoryDatabases.set(dbName, db);
  }
  return db;
};

const makeObjectStoreNames = (stores: Map<string, Map<string, any>>) => ({
  contains: (name: string): boolean => stores.has(name),
});

const makeUpgradeDb = (stores: Map<string, Map<string, any>>): UpgradeDb => ({
  objectStoreNames: makeObjectStoreNames(stores),
  createObjectStore: (name: string): UpgradeStore => {
    if (!stores.has(name)) {
      stores.set(name, createStore());
    }
    return {
      createIndex: () => {
        /* index noop in memory adapter */
      },
    };
  },
  deleteObjectStore: (name: string): void => {
    stores.delete(name);
  },
});

const getMapStore = (db: MemoryDbData, storeName: string): Map<string, any> => {
  let store = db.stores.get(storeName);
  if (!store) {
    store = createStore();
    db.stores.set(storeName, store);
  }
  return store;
};

const buildDbApi = (dbName: string, db: MemoryDbData) => {
  const sessionStore = useQuizSessionStore();

  const isBinaryDb =
    dbName === "audioDB" || dbName === "filesDB" || dbName === "quiz-audio-memory";
  const binaryStoreName = dbName === "audioDB" ? "audio" : "files";

  return {
    objectStoreNames: makeObjectStoreNames(db.stores),
    async get(storeName: string, key: string) {
      if (isBinaryDb && (storeName === "audio" || storeName === "files")) {
        return sessionStore.getBinary(binaryStoreName as "audio" | "files", key);
      }
      return getMapStore(db, storeName).get(key) ?? null;
    },
    async put(storeName: string, value: any) {
      if (isBinaryDb && (storeName === "audio" || storeName === "files")) {
        if (value?.id) {
          sessionStore.putBinary(binaryStoreName as "audio" | "files", value);
        }
        return value;
      }
      const key = value?.id;
      if (key == null) return value;
      getMapStore(db, storeName).set(String(key), value);
      sessionStore.setStepData(String(key), value);
      return value;
    },
    async delete(storeName: string, key: string) {
      if (isBinaryDb && (storeName === "audio" || storeName === "files")) {
        sessionStore.deleteBinary(binaryStoreName as "audio" | "files", key);
        return;
      }
      getMapStore(db, storeName).delete(String(key));
      sessionStore.deleteStepData(String(key));
    },
    async clear(storeName: string) {
      if (isBinaryDb && (storeName === "audio" || storeName === "files")) {
        sessionStore.clearBinaryStore(binaryStoreName as "audio" | "files");
        return;
      }
      const store = getMapStore(db, storeName);
      for (const key of store.keys()) {
        sessionStore.deleteStepData(String(key));
      }
      store.clear();
    },
    close() {
      /* noop in memory adapter */
    },
  };
};

export const openDB = async (
  dbName: string,
  version: number,
  options: OpenDbOptions = {},
) => {
  const db = ensureDb(dbName);
  const oldVersion = db.version;
  const nextVersion = Number(version) || 1;

  if (nextVersion > oldVersion) {
    if (options.upgrade) {
      options.upgrade(makeUpgradeDb(db.stores), oldVersion, nextVersion);
      db.version = nextVersion;
    } else {
      // В in-memory режиме не повышаем версию без upgrade:
      // иначе можно получить "версию 2 без созданных сторов".
      db.version = oldVersion;
    }
  }

  return buildDbApi(dbName, db);
};
