<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import ClipSVG from "@/uikit/icon/ClipSVG.vue";
import CloseSVG from "@/uikit/icon/CloseSVG.vue";
import { ElInput, ElSelect, ElOption, ElMessage } from 'element-plus';
import { openDB } from '@/utils/inMemoryIdb';
import {
  parseQuizUrl,
  normalizeCommaSeparatedUrls,
} from '@/utils/quizSocialUrls';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [data: FormData];
}>();

interface FormData {
  genre: string;
  tiktokStartSeconds: string;
  appleMusicTextFile: File | null;
  hasDrugsMention: string;
  drugsTracks: string;
  karaokeFile: File[];
  appleMusicLinks: string;
  spotifyLinks: string;
  vkLinks: string;
  yandexMusicLinks: string;
  socialLinks: string;
}

interface Errors {
  genre: string;
  tiktokStartSeconds: string;
  appleMusicTextFile: string;
  hasDrugsMention: string;
  drugsTracks: string;
  karaokeFile: string;
  appleMusicLinks: string;
  spotifyLinks: string;
  vkLinks: string;
  yandexMusicLinks: string;
  socialLinks: string;
  fileConsistency: string;
}

// Ключи для хранения
const STORAGE_KEY = 'quiz5_state';
const DB_NAME = 'quizDB';
const FILES_DB_NAME = 'filesDB';
const DB_VERSION = 2; // Увеличиваем версию до 2

// Состояние загрузки данных
const isLoading = ref(true);
const dataLoaded = ref(false);

// Базы данных
const quizDB = ref<any>(null);
const filesDB = ref<any>(null);
const dbInitialized = ref(false);
const filesDBInitialized = ref(false);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const formData = ref<FormData>({
  genre: '',
  tiktokStartSeconds: '',
  appleMusicTextFile: null,
  hasDrugsMention: '',
  drugsTracks: '',
  karaokeFile: [],
  appleMusicLinks: '',
  spotifyLinks: '',
  vkLinks: '',
  yandexMusicLinks: '',
  socialLinks: ''
});

const errors = ref<Errors>({
  genre: '',
  tiktokStartSeconds: '',
  appleMusicTextFile: '',
  hasDrugsMention: '',
  drugsTracks: '',
  karaokeFile: '',
  appleMusicLinks: '',
  spotifyLinks: '',
  vkLinks: '',
  yandexMusicLinks: '',
  socialLinks: '',
  fileConsistency: ''
});

// Используем отдельные переменные для каждой области drag-and-drop
const appleMusicDragOver = ref(false);
const karaokeDragOver = ref(false);
const appleMusicTextFileRef = ref<HTMLInputElement | null>(null);
const karaokeFileRef = ref<HTMLInputElement | null>(null);

const drugsOptions = [
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Нет' }
];

// Состояния для файлов
const appleMusicFileName = ref('');
const appleMusicFileSize = ref(0);
const appleMusicFileId = ref<string | null>(null);
const karaokeFilesInfo = ref<Array<{ name: string; size: number; fileId: string }>>([]);

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz5: Initializing stores...');
    
    // База для текстовых данных состояний
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz5: Upgrading store from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('quizState')) {
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz5: Created quizState store');
        }
      },
    });
    
    // База для файлов
    filesDB.value = await openDB(FILES_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz5: Upgrading Files store from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('type', 'type');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz5: Created files store');
        }
      },
    });
    
    dbInitialized.value = true;
    filesDBInitialized.value = true;
    console.log('Quiz5: stores initialized successfully');
    
  } catch (error) {
    console.error('Quiz5: Error initializing databases:', error);
    dbInitialized.value = false;
    filesDBInitialized.value = false;
  }
};

// Безопасное выполнение операций с БД
const safeDBOperation = async <T>(
  operation: () => Promise<T>, 
  fallback: T,
  dbType: 'quiz' | 'files' = 'quiz'
): Promise<T> => {
  const db = dbType === 'quiz' ? quizDB.value : filesDB.value;
  const initialized = dbType === 'quiz' ? dbInitialized.value : filesDBInitialized.value;
  const storeName = dbType === 'quiz' ? 'quizState' : 'files';
  
  if (!initialized || !db) {
    console.log(`Quiz5: ${dbType} store not initialized`);
    return fallback;
  }
  
  try {
    if (!db.objectStoreNames || !db.objectStoreNames.contains(storeName)) {
      console.log(`Quiz5: Store ${storeName} not found in ${dbType} in-memory store. Available stores:`, 
                  db.objectStoreNames ? Array.from(db.objectStoreNames) : []);
      return fallback;
    }
    
    return await operation();
  } catch (error) {
    console.error(`Quiz5: Error in ${dbType} DB operation:`, error);
    return fallback;
  }
};

// Сохранение файла в IndexedDB
const saveFileToDB = async (file: File, fileId: string): Promise<void> => {
  await safeDBOperation(
    async () => {
      const blob = new Blob([file], { type: file.type });
      await filesDB.value.put('files', {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        data: blob,
        timestamp: Date.now()
      });
      console.log(`Quiz5: File saved to store with ID: ${fileId}`);
    },
    null,
    'files'
  );
};

// Загрузка файла из IndexedDB
const loadFileFromDB = async (fileId: string): Promise<{ file: File; fileName: string; fileSize: number } | null> => {
  return safeDBOperation(
    async () => {
      const stored = await filesDB.value.get('files', fileId);
      if (stored) {
        const file = new File([stored.data], stored.fileName, { type: stored.fileType });
        return {
          file,
          fileName: stored.fileName,
          fileSize: stored.fileSize
        };
      }
      return null;
    },
    null,
    'files'
  );
};

// Удаление файла из IndexedDB
const removeFileFromDB = async (fileId: string) => {
  await safeDBOperation(
    async () => {
      await filesDB.value.delete('files', fileId);
      console.log(`Quiz5: File removed from store with ID: ${fileId}`);
    },
    null,
    'files'
  );
};

// Генерация ID для файла
const generateFileId = (type: 'apple' | 'karaoke'): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Сохранение состояния в IndexedDB
const saveStateToDB = async () => {
  if (isLoading.value || !dataLoaded.value || !dbInitialized.value) {
    return;
  }
  
  await safeDBOperation(
    async () => {
      const stateToSave = {
        id: STORAGE_KEY,
        formData: {
          genre: formData.value.genre,
          tiktokStartSeconds: formData.value.tiktokStartSeconds,
          hasDrugsMention: formData.value.hasDrugsMention,
          drugsTracks: formData.value.drugsTracks,
          appleMusicLinks: formData.value.appleMusicLinks,
          spotifyLinks: formData.value.spotifyLinks,
          vkLinks: formData.value.vkLinks,
          yandexMusicLinks: formData.value.yandexMusicLinks,
          socialLinks: formData.value.socialLinks
        },
        appleMusicFileInfo: appleMusicFileId.value ? {
          name: appleMusicFileName.value,
          size: appleMusicFileSize.value,
          fileId: appleMusicFileId.value
        } : null,
        karaokeFileInfo: karaokeFilesInfo.value.length > 0 ? {
          name: karaokeFilesInfo.value[0].name,
          size: karaokeFilesInfo.value[0].size,
          fileId: karaokeFilesInfo.value[0].fileId
        } : null,
        karaokeFilesInfo: karaokeFilesInfo.value.length > 0 ? [...karaokeFilesInfo.value] : null,
        timestamp: Date.now()
      };
      
      await quizDB.value.put('quizState', stateToSave);
      console.log('Quiz5: State saved to in-memory store');
      
      // Отправляем событие об обновлении данных для QuizMenu
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  if (!dbInitialized.value) {
    console.log('Quiz5: store not initialized, skipping load');
    return;
  }
  
  await safeDBOperation(
    async () => {
      const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
      
      if (savedState) {
        console.log('Quiz5: Loading from in-memory store:', savedState);
        
        // Восстанавливаем основные данные формы
        if (savedState.formData) {
          formData.value.genre = savedState.formData.genre || '';
          formData.value.tiktokStartSeconds = savedState.formData.tiktokStartSeconds || '';
          formData.value.hasDrugsMention = savedState.formData.hasDrugsMention || '';
          formData.value.drugsTracks = savedState.formData.drugsTracks || '';
          formData.value.appleMusicLinks = savedState.formData.appleMusicLinks || '';
          formData.value.spotifyLinks = savedState.formData.spotifyLinks || '';
          formData.value.vkLinks = savedState.formData.vkLinks || '';
          formData.value.yandexMusicLinks = savedState.formData.yandexMusicLinks || '';
          formData.value.socialLinks = savedState.formData.socialLinks || '';
        }
        
        // Восстанавливаем Apple Music файл
        if (savedState.appleMusicFileInfo) {
          const fileInfo = savedState.appleMusicFileInfo;
          appleMusicFileName.value = fileInfo.name || '';
          appleMusicFileSize.value = fileInfo.size || 0;
          appleMusicFileId.value = fileInfo.fileId || null;
          
          if (appleMusicFileId.value && filesDBInitialized.value) {
            const fileData = await loadFileFromDB(appleMusicFileId.value);
            if (fileData) {
              formData.value.appleMusicTextFile = fileData.file;
              appleMusicFileName.value = fileData.fileName;
              appleMusicFileSize.value = fileData.fileSize;
              console.log('Quiz5: Apple Music file loaded');
            }
          }
        }
        
        // Восстанавливаем Karaoke файлы (новый формат + обратная совместимость)
        const savedKaraokeFiles = Array.isArray(savedState.karaokeFilesInfo)
          ? savedState.karaokeFilesInfo
          : savedState.karaokeFileInfo
            ? [savedState.karaokeFileInfo]
            : [];

        formData.value.karaokeFile = [];
        karaokeFilesInfo.value = [];

        if (savedKaraokeFiles.length > 0 && filesDBInitialized.value) {
          for (const savedFileInfo of savedKaraokeFiles) {
            if (!savedFileInfo?.fileId) continue;
            const fileData = await loadFileFromDB(savedFileInfo.fileId);
            if (fileData) {
              formData.value.karaokeFile.push(fileData.file);
              karaokeFilesInfo.value.push({
                name: fileData.fileName,
                size: fileData.fileSize,
                fileId: savedFileInfo.fileId
              });
            }
          }

          if (karaokeFilesInfo.value.length > 0) {
            console.log(`Quiz5: Loaded karaoke files: ${karaokeFilesInfo.value.length}`);
          }
        }
      }
    },
    null
  );
  
  validateFileConsistency();
};

const isValidArtistCardLink = (link: string): boolean => {
  if (link.toLowerCase() === 'нужны новые карточки') return true;

  const parsedUrl = parseQuizUrl(link);
  return Boolean(
    parsedUrl
    && ['http:', 'https:'].includes(parsedUrl.protocol)
    && parsedUrl.hostname,
  );
};

// Проверка всех обязательных полей
const isContinueButtonEnabled = computed(() => {
  // 1. Жанр (обязательное поле)
  if (!formData.value.genre.trim()) return false;
  if (formData.value.genre.length > 100) return false;
  
  // 2. Упоминание наркотических средств (обязательное поле)
  if (!formData.value.hasDrugsMention) return false;
  
  // 3. Если есть упоминание наркотиков, то должны быть указаны номера треков
  if (formData.value.hasDrugsMention === 'yes') {
    if (!formData.value.drugsTracks.trim()) return false;
    
    const tracksArray = formData.value.drugsTracks.split(',').map(s => s.trim());
    const isValidTracks = tracksArray.every(s => {
      const num = Number(s);
      return !isNaN(num) && num > 0 && num <= 100 && Number.isInteger(num);
    });
    if (!isValidTracks) return false;
  }
  
  // 4. Ссылки на соцсети (обязательное поле)
  if (!formData.value.socialLinks.trim()) return false;
  
  // Временное отключение URL-валидации соцсетей.
  // Если понадобится вернуть проверку, раскомментируйте строку ниже:
  // if (!areAllQuizSocialUrlsValid(formData.value.socialLinks)) return false;
  
  // 5. Проверка секунд для TikTok (если заполнено)
  if (formData.value.tiktokStartSeconds.trim()) {
    const secondsArray = formData.value.tiktokStartSeconds.split(',').map(s => s.trim());
    const isValidSeconds = secondsArray.every(s => {
      const num = Number(s);
      return !isNaN(num) && num >= 0 && num <= 5999 && Number.isInteger(num);
    });
    if (!isValidSeconds) return false;
  }
  
  // 6. Проверка файлов (если загружены)
  if (formData.value.appleMusicTextFile) {
    const allowedExtensions = ['.docx'];
    const fileName = formData.value.appleMusicTextFile.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidExtension) return false;
    if (formData.value.appleMusicTextFile.size > 10 * 1024 * 1024) return false;
  }
  
  if (formData.value.karaokeFile.length > 0) {
    const allowedExtensions = ['.ttml'];
    const hasInvalidFile = formData.value.karaokeFile.some(file => {
      const fileName = file.name.toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      return !isValidExtension || file.size > 10 * 1024 * 1024;
    });

    if (hasInvalidFile) return false;
  }
  
  // 7. Проверка консистентности файлов
  const hasAppleMusicFile = !!formData.value.appleMusicTextFile;
  const hasKaraokeFile = formData.value.karaokeFile.length > 0;
  if ((hasAppleMusicFile && !hasKaraokeFile) || (!hasAppleMusicFile && hasKaraokeFile)) {
    return false;
  }
  
  // 8. Проверка ссылок на карточки (если заполнены)
  const validateLinks = (links: string) => {
    if (links.trim()) {
      const linkArray = links.split(',').map(s => s.trim());
      const hasInvalidLink = linkArray.some(link => {
        return !isValidArtistCardLink(link);
      });
      return !hasInvalidLink;
    }
    return true;
  };
  
  if (!validateLinks(formData.value.appleMusicLinks)) return false;
  if (!validateLinks(formData.value.spotifyLinks)) return false;
  if (!validateLinks(formData.value.vkLinks)) return false;
  if (!validateLinks(formData.value.yandexMusicLinks)) return false;
  
  return true;
});

const validateField = (fieldName: keyof FormData) => {
  switch (fieldName) {
    case 'genre':
      if (!formData.value.genre.trim()) {
        errors.value.genre = 'Укажите жанр';
      } else if (formData.value.genre.length > 100) {
        errors.value.genre = 'Жанр не должен превышать 100 символов';
      } else {
        errors.value.genre = '';
      }
      break;

    case 'tiktokStartSeconds':
      if (formData.value.tiktokStartSeconds.trim()) {
        const secondsArray = formData.value.tiktokStartSeconds.split(',').map(s => s.trim());
        const isValid = secondsArray.every(s => {
          const num = Number(s);
          return !isNaN(num) && num >= 0 && num <= 5999 && Number.isInteger(num);
        });
        
        if (!isValid) {
          errors.value.tiktokStartSeconds = 'Укажите корректные секунды (целые числа от 0 до 5999, разделенные запятыми)';
        } else {
          errors.value.tiktokStartSeconds = '';
        }
      } else {
        errors.value.tiktokStartSeconds = '';
      }
      break;

    case 'hasDrugsMention':
      if (!formData.value.hasDrugsMention) {
        errors.value.hasDrugsMention = 'Выберите ответ';
      } else {
        errors.value.hasDrugsMention = '';
      }
      break;

    case 'drugsTracks':
      if (formData.value.hasDrugsMention === 'yes') {
        if (!formData.value.drugsTracks.trim()) {
          errors.value.drugsTracks = 'Укажите номера треков с упоминанием наркотических средств';
        } else {
          const tracksArray = formData.value.drugsTracks.split(',').map(s => s.trim());
          const isValid = tracksArray.every(s => {
            const num = Number(s);
            return !isNaN(num) && num > 0 && num <= 100 && Number.isInteger(num);
          });
          
          if (!isValid) {
            errors.value.drugsTracks = 'Укажите корректные номера треков (целые числа от 1 до 100, разделенные запятыми)';
          } else {
            errors.value.drugsTracks = '';
          }
        }
      } else {
        errors.value.drugsTracks = '';
      }
      break;

    case 'appleMusicLinks':
    case 'spotifyLinks':
    case 'vkLinks':
    case 'yandexMusicLinks':
      const value = formData.value[fieldName];
      if (value.trim()) {
        const links = value.split(',').map(s => s.trim());
        const hasInvalidLink = links.some(link => {
          return !isValidArtistCardLink(link);
        });
        
        if (hasInvalidLink) {
          errors.value[fieldName] = 'Укажите корректные ссылки или "Нужны новые карточки"';
        } else {
          errors.value[fieldName] = '';
        }
      } else {
        errors.value[fieldName] = '';
      }
      break;

    case 'socialLinks':
      if (formData.value.socialLinks.trim()) {
        formData.value.socialLinks = normalizeCommaSeparatedUrls(formData.value.socialLinks);
      }

      // Временное отключение URL-валидации соцсетей.
      // Если понадобится вернуть проверку, раскомментируйте блок ниже:
      // {
      //   const validationError = getSocialLinksValidationError(formData.value.socialLinks);
      //   errors.value.socialLinks = validationError
      //     ? getSocialLinksErrorMessage(validationError)
      //     : '';
      // }
      errors.value.socialLinks = '';
      break;
  }
  
  validateFileConsistency();
  debouncedSave();
};

const validateFileConsistency = () => {
  const hasAppleMusicFile = !!formData.value.appleMusicTextFile;
  const hasKaraokeFile = formData.value.karaokeFile.length > 0;
  
  if ((hasAppleMusicFile && !hasKaraokeFile) || (!hasAppleMusicFile && hasKaraokeFile)) {
    errors.value.fileConsistency = 'Для добавления текста трека необходимо прикрепить оба файла: docx и ttml';
  } else {
    errors.value.fileConsistency = '';
  }
};

const validateForm = (): boolean => {
  validateField('genre');
  validateField('tiktokStartSeconds');
  validateField('hasDrugsMention');
  validateField('drugsTracks');
  validateField('appleMusicLinks');
  validateField('spotifyLinks');
  validateField('vkLinks');
  validateField('yandexMusicLinks');
  validateField('socialLinks');
  
  if (formData.value.appleMusicTextFile) {
    const allowedExtensions = ['.docx'];
    const fileName = formData.value.appleMusicTextFile.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidExtension) {
      errors.value.appleMusicTextFile = 'Неверный формат файла. Разрешены только файлы .docx';
    } else if (formData.value.appleMusicTextFile.size > 10 * 1024 * 1024) {
      errors.value.appleMusicTextFile = 'Размер файла не должен превышать 10 МБ';
    } else {
      errors.value.appleMusicTextFile = '';
    }
  } else {
    errors.value.appleMusicTextFile = '';
  }
  
  if (formData.value.karaokeFile.length > 0) {
    const allowedExtensions = ['.ttml'];
    const invalidFile = formData.value.karaokeFile.find(file => {
      const fileName = file.name.toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      return !isValidExtension || file.size > 10 * 1024 * 1024;
    });

    if (invalidFile) {
      const invalidExtension = !allowedExtensions.some(ext => invalidFile.name.toLowerCase().endsWith(ext));
      errors.value.karaokeFile = invalidExtension
        ? 'Неверный формат файла. Разрешены только файлы .ttml'
        : 'Размер каждого файла не должен превышать 10 МБ';
    } else {
      errors.value.karaokeFile = '';
    }
  } else {
    errors.value.karaokeFile = '';
  }
  
  validateFileConsistency();
  
  const hasErrors = Object.values(errors.value).some(error => error !== '');
  return !hasErrors;
};

const goBack = () => {
  emit('go-back');
};

const goNext = async () => {
  if (validateForm()) {
    await saveStateToDB();
    emit('go-next', formData.value);
  }
};

const handleAppleMusicFileClick = () => {
  appleMusicTextFileRef.value?.click();
};

const handleKaraokeFileClick = () => {
  karaokeFileRef.value?.click();
};

const validateKaraokeFiles = (files: File[]): string => {
  const allowedExtensions = ['.ttml'];

  for (const file of files) {
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return 'Неверный формат файла. Разрешены только файлы .ttml';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'Размер каждого файла не должен превышать 10 МБ';
    }
  }

  return '';
};

const replaceKaraokeFiles = async (files: File[]): Promise<boolean> => {
  if (!filesDBInitialized.value) {
    throw new Error('Files DB not initialized');
  }

  const validationError = validateKaraokeFiles(files);
  if (validationError) {
    errors.value.karaokeFile = validationError;
    return false;
  }

  for (const fileInfo of karaokeFilesInfo.value) {
    await removeFileFromDB(fileInfo.fileId);
  }

  const nextKaraokeFilesInfo: Array<{ name: string; size: number; fileId: string }> = [];

  for (const file of files) {
    const fileId = generateFileId('karaoke');
    await saveFileToDB(file, fileId);
    nextKaraokeFilesInfo.push({
      name: file.name,
      size: file.size,
      fileId
    });
  }

  formData.value.karaokeFile = files;
  karaokeFilesInfo.value = nextKaraokeFilesInfo;
  errors.value.karaokeFile = '';
  validateField('karaokeFile');
  validateFileConsistency();
  await saveStateToDB();
  return true;
};

const handleAppleMusicFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    try {
      if (!filesDBInitialized.value) {
        throw new Error('Files DB not initialized');
      }
      
      const fileId = generateFileId('apple');
      
      if (appleMusicFileId.value) {
        await removeFileFromDB(appleMusicFileId.value);
      }
      
      await saveFileToDB(file, fileId);
      
      formData.value.appleMusicTextFile = file;
      appleMusicFileName.value = file.name;
      appleMusicFileSize.value = file.size;
      appleMusicFileId.value = fileId;
      
      validateField('appleMusicTextFile');
      validateFileConsistency();
      await saveStateToDB();
      
      ElMessage.success('Файл успешно загружен');
    } catch (error) {
      console.error('Quiz5: Error uploading file:', error);
      ElMessage.error('Ошибка при загрузке файла');
    }
  }
};

const handleKaraokeFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    try {
      const uploaded = await replaceKaraokeFiles(Array.from(input.files));
      if (uploaded) {
        ElMessage.success('Файл успешно загружен');
      }
    } catch (error) {
      console.error('Quiz5: Error uploading file:', error);
      ElMessage.error('Ошибка при загрузке файла');
    }
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  if (target.classList.contains('apple-music-upload')) {
    appleMusicDragOver.value = true;
  } else if (target.classList.contains('karaoke-upload')) {
    karaokeDragOver.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  if (target.classList.contains('apple-music-upload')) {
    appleMusicDragOver.value = false;
  } else if (target.classList.contains('karaoke-upload')) {
    karaokeDragOver.value = false;
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  
  if (event.dataTransfer?.files.length) {
    const droppedFiles = Array.from(event.dataTransfer.files);
    const file = droppedFiles[0];
    const target = event.currentTarget as HTMLElement;
    
    if (target.classList.contains('apple-music-upload')) {
      appleMusicDragOver.value = false;
      const allowedExtensions = ['.docx'];
      const fileName = file.name.toLowerCase();
      const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValidExtension) {
        errors.value.appleMusicTextFile = 'Неверный формат файла. Разрешены только файлы .docx';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        errors.value.appleMusicTextFile = 'Размер файла не должен превышать 10 МБ';
        return;
      }
      
      try {
        if (!filesDBInitialized.value) {
          throw new Error('Files DB not initialized');
        }
        
        const fileId = generateFileId('apple');
        
        if (appleMusicFileId.value) {
          await removeFileFromDB(appleMusicFileId.value);
        }
        
        await saveFileToDB(file, fileId);
        
        formData.value.appleMusicTextFile = file;
        appleMusicFileName.value = file.name;
        appleMusicFileSize.value = file.size;
        appleMusicFileId.value = fileId;
        errors.value.appleMusicTextFile = '';
        
        await saveStateToDB();
        ElMessage.success('Файл успешно загружен');
      } catch (error) {
        console.error('Quiz5: Error uploading file:', error);
        ElMessage.error('Ошибка при загрузке файла');
      }
      
    } else if (target.classList.contains('karaoke-upload')) {
      karaokeDragOver.value = false;
      const karaokeValidationError = validateKaraokeFiles(droppedFiles);
      if (karaokeValidationError) {
        errors.value.karaokeFile = karaokeValidationError;
        return;
      }
      
      try {
        const uploaded = await replaceKaraokeFiles(droppedFiles);
        if (uploaded) {
          ElMessage.success('Файл успешно загружен');
        }
      } catch (error) {
        console.error('Quiz5: Error uploading file:', error);
        ElMessage.error('Ошибка при загрузке файла');
      }
    }
    
    validateFileConsistency();
  }
};

const removeUploadedAppleMusicFile = async () => {
  if (appleMusicFileId.value) {
    await removeFileFromDB(appleMusicFileId.value);
  }
  
  formData.value.appleMusicTextFile = null;
  appleMusicFileName.value = '';
  appleMusicFileSize.value = 0;
  appleMusicFileId.value = null;
  
  if (appleMusicTextFileRef.value) {
    appleMusicTextFileRef.value.value = '';
  }
  
  errors.value.appleMusicTextFile = '';
  validateFileConsistency();
  await saveStateToDB();
  
  ElMessage.info('Файл удален');
};

const removeUploadedKaraokeFile = async (index?: number) => {
  if (typeof index === 'number') {
    const fileInfo = karaokeFilesInfo.value[index];
    if (!fileInfo) return;

    await removeFileFromDB(fileInfo.fileId);
    karaokeFilesInfo.value.splice(index, 1);
    formData.value.karaokeFile.splice(index, 1);
  } else {
    for (const fileInfo of karaokeFilesInfo.value) {
      await removeFileFromDB(fileInfo.fileId);
    }
    karaokeFilesInfo.value = [];
    formData.value.karaokeFile = [];
  }

  if (formData.value.karaokeFile.length === 0 && karaokeFileRef.value) {
    karaokeFileRef.value.value = '';
  }

  errors.value.karaokeFile = '';
  validateFileConsistency();
  await saveStateToDB();

  ElMessage.info('Файл удален');
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debounced save
const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    if (dataLoaded.value && dbInitialized.value) {
      await saveStateToDB();
    }
  }, 500);
};

// Watchers для всех полей
watch(() => formData.value.genre, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.tiktokStartSeconds, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.hasDrugsMention, (newValue) => {
  if (newValue !== 'yes') {
    formData.value.drugsTracks = '';
    errors.value.drugsTracks = '';
  }
  validateField('hasDrugsMention');
  validateField('drugsTracks');
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.value.drugsTracks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.appleMusicLinks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.spotifyLinks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.vkLinks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.yandexMusicLinks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => formData.value.socialLinks, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => appleMusicFileName.value, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => appleMusicFileSize.value, () => { 
  if (dataLoaded.value) debouncedSave(); 
});

watch(() => karaokeFilesInfo.value, () => {
  if (dataLoaded.value) debouncedSave();
}, { deep: true });

// При монтировании загружаем состояние
onMounted(async () => {
  console.log('Quiz5: Component mounted');
  isLoading.value = true;
  
  try {
    await initDB();
    await loadStateFromDB();
    dataLoaded.value = true;
  } catch (error) {
    console.error('Quiz5: Error in onMounted:', error);
    ElMessage.error('Ошибка при загрузке данных');
  } finally {
    isLoading.value = false;
  }
});

// Сохраняем состояние при покидании страницы
const handleBeforeUnload = async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  await saveStateToDB();
};

// Сохраняем состояние при изменении видимости вкладки
const handleVisibilityChange = async () => {
  if (document.visibilityState === 'hidden') {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    await saveStateToDB();
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
<!-- Template остается без изменений - таким же как в вашем файле -->
<div class="quiz__form quiz__form_five">
  <h4 class="quiz__form_head">жанр и текст</h4>
  
  <!-- Индикатор загрузки -->
  <div v-if="isLoading" class="quiz__form_loading">
    <span>Загрузка данных...</span>
  </div>
  
  <div v-else class="quiz__form_single">
    <div class="form__flex">
      <div class="form__group">
        <label for="genre" class="form__label button">Какой жанр указать?<span>*</span></label>
        <el-input
          id="genre"
          v-model="formData.genre"
          type="text"
          :class="{ 'error': errors.genre }"
          placeholder="Например: Поп, Хип-хоп, Рок"
          @blur="validateField('genre')"
          @input="errors.genre = ''"
          size="large"
        />
        <div v-if="errors.genre" class="error text_very">
          {{ errors.genre }}
        </div>
      </div>
      
      <div class="form__group">
        <label for="tiktokStartSeconds" class="form__label button">С какой секунды воспроизводить трек в Tik Tok?</label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Укажите секунды через запятую в порядке загруженных ранее треков.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Если вам нужно начать отрывок, например, с 1:24 (одной минуты и двадцать червёртой секунды), то укажите 84. Это число появилось из логики, что в 1 минуте 60 секунд, следовательно, вам нужна 60+24=84 секунда.</p>
          </li>
        </ul>
        <el-input
          id="tiktokStartSeconds"
          v-model="formData.tiktokStartSeconds"
          type="text"
          :class="{ 'error': errors.tiktokStartSeconds }"
          placeholder="Например: 0, 30, 84, 120"
          @blur="validateField('tiktokStartSeconds')"
          @input="errors.tiktokStartSeconds = ''"
          size="large"
        />
        <div v-if="errors.tiktokStartSeconds" class="error text_very">
          {{ errors.tiktokStartSeconds }}
        </div>
      </div>
      
      <div class="form__group">
        <label class="form__label button">Текст (ПО ЖЕЛАНИЮ)</label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Если у вас несколько текстов, то поместите их все в один файл .docx, перед каждым текстом подпишите его название.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">В тексте должно быть только то, что произносится в песне. Не нужно подписей: «Припев», «Куплет» и подобных.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Куплеты и припевы должны быть разделены пробелом, каждая строчка с большой буквы, в конце строчек без знаков препинания. Мат не нужно сокращать или цензурить ***.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">В тексте нужно полностью прописать все, что проговаривается, включая интро и аутро. Бэки, эдлибы можно не указывать.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">ВАЖНО: Если вы хотите добавить текст трека - ОБЯЗАТЕЛЬНО нужно прикреплять и файл docx, и караоке-файл (ниже), иначе текст не будет добавлен на площадки.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">При добавлении только одного из файлов вы не будете допущены на следующую страницу загрузочной формы. Если вы не хотите добавлять текст, то оставьте оба поля ПУСТЫМИ.</p>
          </li>
        </ul>
        <input 
          type="file" 
          ref="appleMusicTextFileRef" 
          @change="handleAppleMusicFileChange" 
          accept=".docx" 
          style="display: none"
        />
        <div 
          class="quiz__form_cover_upload apple-music-upload"
          :class="{ 'drag-over': appleMusicDragOver }"
          @click="handleAppleMusicFileClick"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div class="quiz__form_cover_upload_icon">
            <ClipSVG />
          </div>
          <div class="quiz__form_cover_upload_content">
            <div class="quiz__form_cover_upload_button text_small">
              Прикрепите файл или перетащите сюда
            </div>
            <p class="quiz__form_cover_upload_hint text_small">
              Формат файла (docx)
            </p>
          </div>
        </div>
        <div v-if="formData.appleMusicTextFile" class="quiz__form_single_name">
          <div class="quiz__form_single_name_left">
            <p class="quiz__form_single_name_text">{{ appleMusicFileName }}</p>
            <p class="quiz__form_single_name_size text_small">{{ formatFileSize(appleMusicFileSize) }}</p>
          </div>
          <div class="quiz__form_single_name_svg" @click="removeUploadedAppleMusicFile">
            <CloseSVG />
          </div>
        </div>
        <div v-if="errors.appleMusicTextFile" class="error text_very quiz__form_single_error">
          {{ errors.appleMusicTextFile }}
        </div>
      </div>
      
      <div class="form__group">
        <label class="form__label button">КАРАОКЕ ТЕКСТ МОЖНО <a href="https://vauvisionkaraoke.ru/" target="_blank">СДЕЛАТЬ ТУТ</a></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Чтобы сделать караоке файл, зайдите на наш сайт, следуйте инструкции на сайте и создайте необходимые файлы. Обязательно подпишите их по названию треков, к которым они относятся.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">При создании караоке файлов важно, чтобы изначальный текст был верно отредактирован, как указано в предыдущем пункте.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Если вы сделаете караоке файл из текста, где есть лишние слова (напр. "Припев", "Куплет" и проч.), то караоке файл будет отклонён площадками и это может задержать выход релиза.</p>
          </li>
        </ul>
        <input 
          type="file" 
          ref="karaokeFileRef" 
          @change="handleKaraokeFileChange" 
          multiple
          accept=".ttml" 
          style="display: none"
        />
        <div 
          class="quiz__form_cover_upload karaoke-upload"
          :class="{ 'drag-over': karaokeDragOver }"
          @click="handleKaraokeFileClick"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div class="quiz__form_cover_upload_icon">
            <ClipSVG />
          </div>
          <div class="quiz__form_cover_upload_content">
            <div class="quiz__form_cover_upload_button text_small">
              Прикрепите файл или перетащите сюда
            </div>
            <p class="quiz__form_cover_upload_hint text_small">
              Формат файла (ttml)
            </p>
          </div>
        </div>
        <div v-for="(file, index) in karaokeFilesInfo" :key="file.fileId" class="quiz__form_single_name">
          <div class="quiz__form_single_name_left">
            <p class="quiz__form_single_name_text">{{ file.name }}</p>
            <p class="quiz__form_single_name_size text_small">{{ formatFileSize(file.size) }}</p>
          </div>
          <div class="quiz__form_single_name_svg" @click="removeUploadedKaraokeFile(index)">
            <CloseSVG />
          </div>
        </div>
        <div v-if="errors.karaokeFile" class="error text_very quiz__form_single_error">
          {{ errors.karaokeFile }}
        </div>
        <div v-if="errors.fileConsistency" class="error text_very quiz__form_single_error">
          {{ errors.fileConsistency }}
        </div>
      </div>
      
      <div class="form__group">
        <label class="form__label button">ЕСТЬ ЛИ У ВАС В РЕЛИЗЕ УПОМИНАНИЕ НАРКОТИЧЕСКИХ СРЕДСТВ?<span>*</span></label>
        <p class="form__hint text_small">В тексте или названии любого из треков. Независимо от контекста: любое упоминание веществ, способы употребления или производства, в том числе сленговые названия. Алкоголь и сигареты не считаются.</p>
        <el-select
          v-model="formData.hasDrugsMention"
          placeholder="Выберите ответ"
          :class="{ 'error': errors.hasDrugsMention }"
          size="large"
          @change="validateField('hasDrugsMention')"
        >
          <el-option
            v-for="option in drugsOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div v-if="errors.hasDrugsMention" class="error text_very">
          {{ errors.hasDrugsMention }}
        </div>
        
        <div v-if="formData.hasDrugsMention === 'yes'" class="form__group_inner">
          <p class="form__hint text_small">Укажите номера треков*</p>
          <el-input
            v-model="formData.drugsTracks"
            type="text"
            placeholder="Например: 1, 3, 5"
            :class="{ 'error': errors.drugsTracks }"
            @blur="validateField('drugsTracks')"
            @input="errors.drugsTracks = ''"
            size="large"
          />
          <div v-if="errors.drugsTracks" class="error text_very">
            {{ errors.drugsTracks }}
          </div>
        </div>
      </div>
      
      <div class="form__group">
        <label class="form__label button">ССЫЛКИ НА КАРТОЧКИ АРТИСТОВ</label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Укажите через запятую ссылки на карточки всех артистов, указанных в загружаемом релизе. Если карточек нет, укажите "Нужны новые карточки".</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Указание карточек повышает шансы, что релиз попадёт по адресу, но НЕ ГАРАНТИРУЕТ этого. Распределение по карточкам совершают алгоритмы, поэтому есть вероятность ошибок. В случае ошибки, исправить её можно через нашу поддержку.</p>
          </li>
        </ul>
        <el-input
          v-model="formData.appleMusicLinks"
          type="text"
          :class="{ 'error': errors.appleMusicLinks }"
          placeholder="Ссылки в Apple Music через запятую"
          @blur="validateField('appleMusicLinks')"
          @input="errors.appleMusicLinks = ''"
          size="large"
        />
        <el-input
          v-model="formData.spotifyLinks"
          type="text"
          :class="{ 'error': errors.spotifyLinks }"
          placeholder="Ссылки в Spotify через запятую"
          @blur="validateField('spotifyLinks')"
          @input="errors.spotifyLinks = ''"
          size="large"
        />
        <el-input
          v-model="formData.vkLinks"
          type="text"
          :class="{ 'error': errors.vkLinks }"
          placeholder="Ссылки в VK через запятую"
          @blur="validateField('vkLinks')"
          @input="errors.vkLinks = ''"
          size="large"
        />
        <el-input
          v-model="formData.yandexMusicLinks"
          type="text"
          :class="{ 'error': errors.yandexMusicLinks }"
          placeholder="Ссылки в Yandex Music через запятую"
          @blur="validateField('yandexMusicLinks')"
          @input="errors.yandexMusicLinks = ''"
          size="large"
        />
        <div v-if="errors.appleMusicLinks" class="error text_very">
          {{ errors.appleMusicLinks }}
        </div>
        <div v-if="errors.spotifyLinks" class="error text_very">
          {{ errors.spotifyLinks }}
        </div>
        <div v-if="errors.vkLinks" class="error text_very">
          {{ errors.vkLinks }}
        </div>
        <div v-if="errors.yandexMusicLinks" class="error text_very">
          {{ errors.yandexMusicLinks }}
        </div>
      </div>
      
      <div class="form__group">
        <label for="socialLinks" class="form__label button">ССЫЛКИ НА СОЦИАЛЬНЫЕ СЕТИ АРТИСТОВ<span>*</span></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Паблик в VK, страница в Instagram*, профиль в TikTok, YouTube и проч.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Модерация может запросить ссылки на соц. сети артиста. Важно, чтобы название паблика/аккаунта совпадало с псевдонимом артиста. Верификация не обязательна. Непредоставление этой информации может задержать выход релиза.</p>
          </li>
        </ul>
        <el-input
          id="socialLinks"
          v-model="formData.socialLinks"
          type="text"
          :class="{ 'error': errors.socialLinks }"
          placeholder="vk.com/artist, instagram.com/artist, t.me/artist"
          @blur="validateField('socialLinks')"
          @input="errors.socialLinks = ''"
          size="large"
        />
        <br>
        <p class="form__hint text_very">*деятельность компании Meta Platforms Inc., которой принадлежит Инстаграм / Фейсбук, запрещена на территории РФ в части реализации данной (-ых) социальной (-ых) сети (-ей) на основании осуществления ею экстремистской деятельности</p>
        <div v-if="errors.socialLinks" class="error text_very">
          {{ errors.socialLinks }}
        </div>
      </div>
    </div>
  </div>
  
  <div class="quiz__form_bottom">
    <div class="quiz__form_buttons">
      <button 
        class="form__back button__second button" 
        @click="goBack"
        :disabled="isLoading"
      >
        <span><BackSVG /></span>
        <span>Назад</span>
      </button>
      <button 
        class="quiz__form_button button__black button"
        @click="goNext"
        :disabled="!isContinueButtonEnabled || isLoading"
      >
        <span>Продолжить</span>
      </button>
    </div>
  </div>
</div>
</template>

<style lang="scss" scoped>
.quiz__form_single {
  padding: 20px 0 0;
}

.quiz__form_loading {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}

.quiz__form_single_name {
  display: flex;
  width: 100%;
  padding: 20px;
  margin: 30px 0 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background-color: #EDFBE2;

  @media (max-width: 767px) {
    padding: 15px;
    align-items: flex-start;
  }

  &_svg {
    display: flex;
    width: 24px;
    height: 24px;
    cursor: pointer;
    transform: rotate(0deg);
    transition: transform 0.15s linear;

    &:hover {
      transform: rotate(90deg);
    }

    svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &_left {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &_size {
    color: var(--text-gray);
  }
}

.quiz__form_single_error {
  margin-top: 10px;
  color: #f56c6c;
  padding: 8px 12px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
}
</style>