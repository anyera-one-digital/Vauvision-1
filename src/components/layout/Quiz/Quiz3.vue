<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElInput, ElMessage, ElSelect, ElOption, ElDatePicker } from 'element-plus';
import { sendRequest } from '@/utils/api';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import CloseSVG from "@/uikit/icon/CloseSVG.vue";
import ClipSVG from "@/uikit/icon/ClipSVG.vue";
import dayjs from 'dayjs';
import { openDB } from 'idb';
import {
  normalizeQuizUrl,
  validateContractSocialLink,
  getContractSocialLinkErrorMessage,
} from '@/utils/quizSocialUrls';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [];
}>();

// Ключи для хранения
const STORAGE_KEY = 'quiz3_state';
const DB_NAME = 'quizDB';
const FILES_DB_NAME = 'filesDB';
const DB_VERSION = 2;

// Состояние для отображения важной информации
const showImportantBlock = ref(false);

// Состояние загрузки данных
const isLoading = ref(true);
const dataLoaded = ref(false);

// Базы данных
const quizDB = ref<any>(null);
const filesDB = ref<any>(null);
const dbInitialized = ref(false);
const filesDBInitialized = ref(false);

// Данные профиля из API
const profile = ref<any>({
  region: 'Russia'
});

// Данные формы - используем reactive для реактивности
const formData = reactive({
  performerName: '',
  releaseName: '',
  platforms: '', // Теперь строка, а не массив
  otherPlatform: '',
  releaseDate: '',
  hasProfanity: '',
  profanityTracks: '',
  coverFile: null as File | null,
  coverFileId: null as string | null,
  vkLink: '',
  email: ''
});

// Отдельные ref для отображения информации о файле
const coverFileName = ref('');
const coverFileSize = ref(0);

// Ошибки валидации
const errors = reactive({
  performerName: '',
  releaseName: '',
  platforms: '',
  otherPlatform: '',
  releaseDate: '',
  hasProfanity: '',
  profanityTracks: '',
  coverFile: '',
  vkLink: '',
  email: ''
});

// Состояния для загрузки файлов
const isUploading = ref(false);
const dragOver = ref(false);

// Таймер для debounce сохранения
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Флаг для отслеживания, было ли уже загружено состояние из IndexedDB
const isStateLoaded = ref(false);

// Опции для выбора площадки (только два варианта)
const platformOptions = [
  { label: 'Все площадки', value: 'all' },
  { label: 'Другое', value: 'other' }
];

const profanityOptions = [
  { label: 'Да', value: 'yes' },
  { label: 'Нет', value: 'no' }
];

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz3: Initializing databases...');
    
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz3: Upgrading DB from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('quizState')) {
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz3: Created quizState store');
        }
      },
    });
    
    filesDB.value = await openDB(FILES_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz3: Upgrading Files DB from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('type', 'type');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz3: Created files store');
        }
      },
    });
    
    dbInitialized.value = true;
    filesDBInitialized.value = true;
    console.log('Quiz3: Databases initialized successfully');
    
  } catch (error) {
    console.error('Quiz3: Error initializing databases:', error);
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
    console.log(`Quiz3: ${dbType} DB not initialized`);
    return fallback;
  }
  
  try {
    if (!db.objectStoreNames || !db.objectStoreNames.contains(storeName)) {
      console.log(`Quiz3: Store ${storeName} not found in ${dbType} DB. Available stores:`, 
                  db.objectStoreNames ? Array.from(db.objectStoreNames) : []);
      return fallback;
    }
    
    return await operation();
  } catch (error) {
    console.error(`Quiz3: Error in ${dbType} DB operation:`, error);
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
      console.log(`Quiz3: File saved to DB with ID: ${fileId}`);
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
      console.log(`Quiz3: File removed from DB with ID: ${fileId}`);
    },
    null,
    'files'
  );
};

// Генерация ID для файла
const generateFileId = (): string => {
  return `cover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
          performerName: formData.performerName || '',
          releaseName: formData.releaseName || '',
          platforms: formData.platforms || '',
          otherPlatform: formData.otherPlatform || '',
          releaseDate: formData.releaseDate || '',
          hasProfanity: formData.hasProfanity || '',
          profanityTracks: formData.profanityTracks || '',
          vkLink: formData.vkLink || '',
          email: formData.email || ''
        },
        coverFileInfo: formData.coverFileId ? {
          name: coverFileName.value,
          size: coverFileSize.value,
          fileId: formData.coverFileId
        } : null,
        showImportantBlock: showImportantBlock.value,
        timestamp: Date.now()
      };
      
      await quizDB.value.put('quizState', stateToSave);
      console.log('Quiz3: State saved to IndexedDB');
      
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  if (!dbInitialized.value) {
    console.log('Quiz3: DB not initialized, skipping load');
    return;
  }
  
  await safeDBOperation(
    async () => {
      const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
      
      if (savedState) {
        console.log('Quiz3: Loading from IndexedDB:', savedState);
        
        if (savedState.formData) {
          formData.performerName = savedState.formData.performerName || '';
          formData.releaseName = savedState.formData.releaseName || '';
          formData.platforms = savedState.formData.platforms || '';
          formData.otherPlatform = savedState.formData.otherPlatform || '';
          formData.releaseDate = savedState.formData.releaseDate || '';
          formData.hasProfanity = savedState.formData.hasProfanity || '';
          formData.profanityTracks = savedState.formData.profanityTracks || '';
          formData.vkLink = savedState.formData.vkLink || '';
          formData.email = savedState.formData.email || '';
        }
        
        if (savedState.showImportantBlock !== undefined) {
          showImportantBlock.value = savedState.showImportantBlock;
        }
        
        if (savedState.coverFileInfo) {
          const fileInfo = savedState.coverFileInfo;
          coverFileName.value = fileInfo.name || '';
          coverFileSize.value = fileInfo.size || 0;
          formData.coverFileId = fileInfo.fileId || null;
          
          if (formData.coverFileId && filesDBInitialized.value) {
            const fileData = await loadFileFromDB(formData.coverFileId);
            if (fileData) {
              formData.coverFile = fileData.file;
              coverFileName.value = fileData.fileName;
              coverFileSize.value = fileData.fileSize;
              console.log('Quiz3: Cover file loaded from DB');
            }
          }
        }
        
        isStateLoaded.value = true;
      }
    },
    null
  );
};

// Загрузка данных с сервера
const loadUserData = async () => {
  try {
    console.log('Quiz3: Loading user data...');
    const response = await sendRequest("post", '/ajax_vue/ajax/getData.php', {});
    console.log('Quiz3: getData response:', response.data);
    
    const data = response.data as any;
    
    if (data.profile) {
      profile.value = data.profile;
      console.log('Quiz3: User profile loaded:', data.profile);
    }
    
    if (data.user?.email) {
      formData.email = data.user.email;
      console.log('Quiz3: User email loaded:', data.user.email);
    }
    
    if (data.user?.login) {
      if (!formData.performerName) {
        formData.performerName = data.user.login;
        console.log('✅ Quiz3: Performer name loaded from user.login:', data.user.login);
      }
    } else {
      console.log('❌ Quiz3: user.login not found in response');
    }
    
  } catch (error) {
    console.error('Quiz3: Ошибка загрузки данных пользователя:', error);
  }
};

// Вычисляемое свойство для проверки готовности к продолжению
const isReadyForNextStep = computed(() => {
  const requiredFields = [
    formData.performerName?.trim() || '',
    formData.releaseName?.trim() || '',
    formData.platforms !== '',
    formData.releaseDate?.trim() || '',
    formData.hasProfanity?.trim() || '',
    formData.coverFile !== null,
    validateContractSocialLink(formData.vkLink, profile.value.region).ok,
    formData.email?.trim() || ''
  ];
  
  if (formData.platforms === 'other') {
    requiredFields.push((formData.otherPlatform?.trim() || '').length > 0);
  }
  
  if (formData.hasProfanity === 'yes') {
    requiredFields.push((formData.profanityTracks?.trim() || '').length > 0);
  }
  
  return requiredFields.every(Boolean);
});

const handleVkLinkBlur = () => {
  if (formData.vkLink.trim()) {
    formData.vkLink = normalizeQuizUrl(formData.vkLink);
  }
  validateForm();
};

// Валидация email
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Валидация всей формы
const validateForm = () => {
  let isValid = true;
  
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = '';
  });
  
  if (!formData.performerName?.trim()) {
    errors.performerName = 'Псевдоним артиста обязателен для заполнения';
    isValid = false;
  } else if (formData.performerName.trim().length < 2) {
    errors.performerName = 'Псевдоним артиста должен содержать минимум 2 символа';
    isValid = false;
  }
  
  if (!formData.releaseName?.trim()) {
    errors.releaseName = 'Название релиза обязательно для заполнения';
    isValid = false;
  } else if (formData.releaseName.trim().length < 2) {
    errors.releaseName = 'Название релиза должно содержать минимум 2 символа';
    isValid = false;
  }
  
  if (!formData.platforms) {
    errors.platforms = 'Выберите площадку для загрузки';
    isValid = false;
  }
  
  if (formData.platforms === 'other' && !formData.otherPlatform?.trim()) {
    errors.otherPlatform = 'Напишите в свободной форме, на какие площадки нужно (или не нужно) загрузить релиз';
    isValid = false;
  }
  
  if (!formData.releaseDate) {
    errors.releaseDate = 'Выберите желаемую дату выхода';
    isValid = false;
  } else {
    const selectedDate = dayjs(formData.releaseDate);
    const today = dayjs().startOf('day');
    
    if (selectedDate.isBefore(today)) {
      errors.releaseDate = 'Дата релиза не может быть в прошлом';
      isValid = false;
    }
  }
  
  if (!formData.hasProfanity) {
    errors.hasProfanity = 'Укажите, есть ли в треках мат';
    isValid = false;
  }
  
  if (formData.hasProfanity === 'yes' && !formData.profanityTracks?.trim()) {
    errors.profanityTracks = 'Укажите номера треков с матом';
    isValid = false;
  }
  
  if (!formData.coverFile) {
    errors.coverFile = 'Обложка релиза обязательна для загрузки';
    isValid = false;
  }
  
  if (formData.vkLink.trim()) {
    formData.vkLink = normalizeQuizUrl(formData.vkLink);
  }

  const vkLinkValidation = validateContractSocialLink(formData.vkLink, profile.value.region);
  if (!vkLinkValidation.ok) {
    errors.vkLink = getContractSocialLinkErrorMessage(
      vkLinkValidation.error,
      profile.value.region,
    );
    isValid = false;
  }
  
  if (!formData.email?.trim()) {
    errors.email = 'Электронная почта обязательна для заполнения';
    isValid = false;
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Введите корректный адрес электронной почты';
    isValid = false;
  }
  
  return isValid;
};

// Общая функция для обработки файла
const processCoverFile = async (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    errors.coverFile = 'Недопустимый формат файла. Разрешенные форматы: JPG, JPEG, PNG';
    ElMessage.error('Недопустимый формат изображения');
    return;
  }
  
  const maxSize = 12 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.coverFile = 'Файл слишком большой. Максимальный размер: 12MB';
    ElMessage.error('Файл превышает максимальный допустимый размер');
    return;
  }
  
  isUploading.value = true;
  
  const img = new Image();
  img.onload = async () => {
    if (img.width < 1500 || img.height < 1500) {
      errors.coverFile = 'Изображение слишком маленькое. Минимальный размер: 1500x1500 пикселей';
      ElMessage.error('Изображение не соответствует требованиям по размеру');
      isUploading.value = false;
      return;
    }
    
    if (img.width > 4000 || img.height > 4000) {
      errors.coverFile = 'Изображение слишком большое. Максимальный размер: 4000x4000 пикселей';
      ElMessage.error('Изображение не соответствует требованиям по размеру');
      isUploading.value = false;
      return;
    }
    
    if (Math.abs(img.width - img.height) > 1) {
      errors.coverFile = 'Изображение должно быть квадратным (одинаковая ширина и высота)';
      ElMessage.error('Изображение должно быть квадратным');
      isUploading.value = false;
      return;
    }
    
    try {
      if (!filesDBInitialized.value) {
        throw new Error('Files DB not initialized');
      }
      
      const fileId = generateFileId();
      
      if (formData.coverFileId) {
        await removeFileFromDB(formData.coverFileId);
      }
      
      await saveFileToDB(file, fileId);
      
      errors.coverFile = '';
      formData.coverFile = file;
      formData.coverFileId = fileId;
      coverFileName.value = file.name;
      coverFileSize.value = file.size;
      
      await saveStateToDB();
      
      ElMessage.success('Обложка успешно загружена');
    } catch (error) {
      console.error('Quiz3: Error saving cover:', error);
      ElMessage.error('Ошибка при сохранении обложки');
    } finally {
      isUploading.value = false;
    }
  };
  
  img.onerror = () => {
    errors.coverFile = 'Не удалось загрузить изображение. Проверьте файл';
    ElMessage.error('Ошибка загрузки изображения');
    isUploading.value = false;
  };
  
  img.src = URL.createObjectURL(file);
};

const handleCoverUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  processCoverFile(file);
};

const handleCoverButtonClick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/jpg,image/png';
  input.style.display = 'none';
  input.onchange = handleCoverUpload;
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  dragOver.value = false;
  
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  processCoverFile(file);
};

const removeUploadedCover = async () => {
  if (formData.coverFileId) {
    await removeFileFromDB(formData.coverFileId);
  }
  
  formData.coverFile = null;
  formData.coverFileId = null;
  coverFileName.value = '';
  coverFileSize.value = 0;
  errors.coverFile = '';
  
  await saveStateToDB();
  
  ElMessage.info('Обложка удалена');
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000;
};

const goBack = async () => {
  if (showImportantBlock.value) {
    showImportantBlock.value = false;
    await saveStateToDB();
  } else {
    emit('go-back');
  }
};

const handleContinue = async () => {
  if (validateForm()) {
    showImportantBlock.value = true;
    await saveStateToDB();
  }
};

const handleAccept = async () => {
  await saveStateToDB();
  emit('go-next');
};

// Debounced save
const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (dataLoaded.value && dbInitialized.value) {
      saveStateToDB();
    }
  }, 500);
};

// Watchers с debounce
watch(() => formData.performerName, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.releaseName, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.platforms, (newValue) => {
  if (newValue !== 'other') {
    formData.otherPlatform = '';
  }
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.otherPlatform, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.releaseDate, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.hasProfanity, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.profanityTracks, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.vkLink, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => formData.email, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => coverFileName.value, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(() => coverFileSize.value, () => {
  if (dataLoaded.value) debouncedSave();
});
watch(showImportantBlock, () => {
  if (dataLoaded.value) debouncedSave();
});

// Логика очистки зависимых полей
watch(() => formData.hasProfanity, (newValue) => {
  if (newValue === 'no') {
    formData.profanityTracks = '';
  }
});

onMounted(async () => {
  console.log('Quiz3: Component mounted, initializing...');
  isLoading.value = true;
  
  try {
    await initDB();
    await loadStateFromDB();
    await loadUserData();
    dataLoaded.value = true;
    console.log('Quiz3: Initialization complete');
    console.log('Quiz3: Final form data:', {
      performerName: formData.performerName,
      platforms: formData.platforms,
      email: formData.email,
      coverFile: formData.coverFile ? 'File exists' : 'No file'
    });
  } catch (error) {
    console.error('Quiz3: Error during initialization:', error);
    ElMessage.error('Ошибка при загрузке данных');
  } finally {
    isLoading.value = false;
  }
});

const handleBeforeUnload = async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  await saveStateToDB();
};

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
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
<div class="quiz__form quiz__form_three" v-if="!showImportantBlock">
  <h4 class="quiz__form_head">Информация о треке</h4>
  
  <!-- Индикатор загрузки -->
  <div v-if="isLoading" class="quiz__form_loading">
    <span>Загрузка данных...</span>
  </div>
  
  <div v-else class="quiz__form_single">
    <div class="form__flex">
      <!-- Псевдоним артиста -->
      <div class="form__group">
        <label for="performerName" class="form__label button">впишите псевдоним артиста<span>*</span></label>
        <p class="form__hint text_small">Укажите имя артиста (ваш псевдоним). Даже если трек совместный, укажите только один свой псевдоним.</p>
        <el-input
          id="performerName"
          v-model="formData.performerName"
          type="text"
          :class="{ 'error': errors.performerName }"
          placeholder="Введите псевдоним артиста"
          :disabled="isUploading"
          @blur="validateForm"
          @input="errors.performerName = ''"
          size="large"
        />
        <div v-if="errors.performerName" class="error text_very">
          {{ errors.performerName }}
        </div>
      </div>
      
      <!-- Название релиза -->
      <div class="form__group">
        <label for="releaseName" class="form__label button">впишите название релиза<span>*</span></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Если вы выбрали несколько релизов (например, 2 сингла), впишите их названия через запятую.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Перечислять названия треков с альбома не нужно.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Писать названия транслитом нельзя (например, нельзя писать "privet", либо "Привет", либо "Hello").</p>
          </li>
        </ul>
        <el-input
          id="releaseName"
          v-model="formData.releaseName"
          type="text"
          :class="{ 'error': errors.releaseName }"
          placeholder="Введите название релиза"
          :disabled="isUploading"
          @blur="validateForm"
          @input="errors.releaseName = ''"
          size="large"
        />
        <div v-if="errors.releaseName" class="error text_very">
          {{ errors.releaseName }}
        </div>
      </div>
      
      <!-- Площадки для загрузки (только два варианта) -->
      <div class="form__group">
        <label class="form__label button">Куда загружать релиз?<span>*</span></label>
        <el-select
          v-model="formData.platforms"
          placeholder="Выберите площадку"
          :class="{ 'error': errors.platforms }"
          size="large"
          @change="validateForm"
        >
          <el-option
            v-for="platform in platformOptions"
            :key="platform.value"
            :label="platform.label"
            :value="platform.value"
          />
        </el-select>
        <div v-if="errors.platforms" class="error text_very">
          {{ errors.platforms }}
        </div>
        
        <!-- Другое поле для других платформ (обязательное) -->
        <div v-if="formData.platforms === 'other'" class="form__group_inner">
          <label class="form__label button text_small">Укажите площадки<span>*</span></label>
          <el-input
            v-model="formData.otherPlatform"
            type="text"
            placeholder="Например: VK Музыка, Apple Music, Spotify"
            :class="{ 'error': errors.otherPlatform }"
            @blur="validateForm"
            @input="errors.otherPlatform = ''"
            size="large"
          />
          <div v-if="errors.otherPlatform" class="error text_very">
            {{ errors.otherPlatform }}
          </div>
        </div>
      </div>
      
      <!-- Желаемая дата выхода -->
      <div class="form__group">
        <label class="form__label button">Желаемая дата выхода<span>*</span></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Если все равно, ставьте ближайшую пятницу. Выбирайте дату с учётом официальных праздников (особенно в Новый Год)! Во время них модерация не проверяет релизы.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Заложите минимум 3 полных рабочих дня (выходные и праздники не считаются). Если релиз важный, то рекомендуем заложить 7-10 рабочих дней: на случай возвратов, ошибок и вопросов со стороны модерации...</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Если дата релиза важна, то рекомендуется заложить минимум 7 дней на загрузку. Также площадка <a href="https://music.apple.com/" target="_blank">Apple Music</a> сообщает, что отображение релиза на их площадке может занять до 5 рабочих дней с момента прохождения модерации. Рекомендуем учитывать это при выборе даты релиза.</p>
          </li>
        </ul>
        <el-date-picker
          v-model="formData.releaseDate"
          type="date"
          placeholder="Выберите дату"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledDate"
          :class="{ 'error': errors.releaseDate }"
          size="large"
          style="width: 100%;"
          @change="validateForm"
        />
        <div v-if="errors.releaseDate" class="error text_very">
          {{ errors.releaseDate }}
        </div>
      </div>
      
      <!-- Наличие мата -->
      <div class="form__group">
        <label class="form__label button">в треках есть мат?<span>*</span></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Укажите номера треков, в которых есть мат. Если загружаете один трек, то ставьте 1.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Важно про мат! Мат считается на всех языках, вульгарная лексика также принимается за мат. В данном случае не существует "литературного" мата, считаются все "неприличные" слова. Невнимательное заполнение данного поля может задержать выход релиза.</p>
          </li>
        </ul>
        <el-select
          v-model="formData.hasProfanity"
          placeholder="Выберите ответ"
          :class="{ 'error': errors.hasProfanity }"
          size="large"
          @change="validateForm"
        >
          <el-option
            v-for="option in profanityOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div v-if="errors.hasProfanity" class="error text_very">
          {{ errors.hasProfanity }}
        </div>
        
        <!-- Поле для номеров треков с матом -->
        <div v-if="formData.hasProfanity === 'yes'" class="form__group_inner">
          <p class="form__hint text_small">Укажите номера треков</p>
          <el-input
            v-model="formData.profanityTracks"
            type="text"
            placeholder="Например: 1, 3, 5"
            :class="{ 'error': errors.profanityTracks }"
            @blur="validateForm"
            @input="errors.profanityTracks = ''"
            size="large"
          />
          <div v-if="errors.profanityTracks" class="error text_very">
            {{ errors.profanityTracks }}
          </div>
        </div>
      </div>
      
      <!-- Загрузка обложки -->
      <div class="form__group">
        <label class="form__label button">Прикрепите обложку релиза<span>*</span></label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">Для обложек, созданных с помощью AI, необходимо добавлять уникальные элементы: псевдоним и/или название релиза.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Обложка должна быть квадратная, размером от 1500х1500 до 4000х4000 пикселей, в формате JPG, размером не больше 10-12 мегабайт.</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">На обложке нельзя использовать нецензурные надписи. Нецензурные жесты должны быть сильно размыты, заблюрены или закрыты. Из надписей допускаются только псевдонимы артистов и название релиза, на 100% совпадающие по языку и написанию с тем, как они указаны в релизе. Несоблюдение этих критериев может задержать выход релиза.</p>
          </li>
          <!-- <li class="form__hint_item">
            <p class="form__hint text_small">Правильные размеры обложки вы можете сделать тут в разделе «Обложка»: <a href="vauvision.com/photos" target="_blank" rel="noopener noreferrer">vauvision.com/photos</a></p>
          </li> -->
          <li class="form__hint_item">
            <p class="form__hint text_bold_red">Для редактирования размера обложек (формат JPEG, от 1500x1500 пикселей) используйте вкладку «Обложка» на нашем <a href="https://vauvision.com/photos" target="_blank" rel="noopener noreferrer">сайте</a>
                </p>
          </li>
        </ul>
        
        <!-- Блок для загрузки файла с поддержкой drag-and-drop -->
        <div 
          class="quiz__form_cover_upload"
          :class="{ 'drag-over': dragOver }"
          @click="handleCoverButtonClick"
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
              Формат файла (jpg; png; jpeg). Изображение должно быть хорошего качества.
            </p>
          </div>
        </div>
        
        <!-- Информация о загруженном файле -->
        <div v-if="formData.coverFile" class="quiz__form_single_name">
          <div class="quiz__form_single_name_left">
            <p class="quiz__form_single_name_text">{{ coverFileName }}</p>
            <p class="quiz__form_single_name_size text_small">{{ formatFileSize(coverFileSize) }}</p>
          </div>
          <div class="quiz__form_single_name_svg" @click="removeUploadedCover">
            <CloseSVG />
          </div>
        </div>
        
        <div v-if="errors.coverFile" class="error text_very quiz__form_single_error">
          {{ errors.coverFile }}
        </div>
      </div>
      
      <!-- Ссылка на страницу для проверки и подписания договора -->
      <div class="form__group">
        <label for="vkLink" class="form__label button">
          Ссылка на вашу страницу для проверки и подписания договора<span>*</span>
        </label>
        <p class="form__hint text_small">
          <template v-if="profile.region === 'Russia'">
            Не указывайте ссылку на ваш паблик – только на личную страницу. Пример: <a href="https://vk.com/" target="_blank" rel="noopener noreferrer">vk.com/username</a>.
          </template>
          <template v-else>
            Не указывайте ссылку на ваш паблик – только на личную страницу. Пример: <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">instagram.com/username</a> или
            <a href="https://t.me" target="_blank" rel="noopener noreferrer">t.me/username</a>.
          </template>
        </p>
        <el-input
          id="vkLink"
          v-model="formData.vkLink"
          type="text"
          :class="{ 'error': errors.vkLink }"
          :placeholder="profile.region === 'Russia' ? 
            'vk.com/username или vk.ru/username' : 
            'instagram.com/username или t.me/username'"
          :disabled="isUploading"
          @blur="handleVkLinkBlur"
          @input="errors.vkLink = ''"
          size="large"
        />
        <div v-if="errors.vkLink" class="error text_very">
          {{ errors.vkLink }}
        </div>
      </div>
      
      <!-- Email -->
      <div class="form__group">
        <label for="email" class="form__label button">Введите вашу электронную почту<span>*</span></label>
        <el-input
          id="email"
          v-model="formData.email"
          type="email"
          :class="{ 'error': errors.email }"
          placeholder="Введите ваш email"
          :disabled="isUploading"
          @blur="validateForm"
          @input="errors.email = ''"
          size="large"
        />
        <div v-if="errors.email" class="error text_very">
          {{ errors.email }}
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
        @click="handleContinue"
        :disabled="!isReadyForNextStep || isLoading || isUploading"
      >
        <span v-if="!isLoading">Продолжить</span>
        <span v-else>Загрузка...</span>
      </button>
    </div>
  </div>
</div>

<!-- Блок с важной информацией -->
<div class="quiz__form quiz__important" v-if="showImportantBlock">
  <h4 class="quiz__important_head">Игнорирование требований приведёт к увеличению сроков отгрузки релиза.</h4>
  <h4 class="quiz__important_head">ПОЖАЛУЙСТА, ПРОВЕРЬТЕ ВНИМАТЕЛЬНО СООТВЕТСТВИЕ ТРЕБОВАНИЯМ. ПРИ НЕОБХОДИМОСТИ ВЕРНИТЕСЬ НА ШАГ НАЗАД.</h4>
  <ul class="quiz__important_list">
    <li class="quiz__important_item">
      <p class="quiz__important_description">Обложка должна быть квадратная, размером от 1500х1500 до 4000х4000 пикселей, в формате JPG, размером не больше 10-12 мегабайт.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Не должно быть изображений наготы, запрещённых веществ и символов.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">На обложке не должно быть никаких надписей, кроме названия релиза и псевдоним(-ов) артиста. Названия на обложке должны на 100% совпадать с названием релиза/псевдонимом, до каждой буквы, запятой и пробела, иначе модерация отклонит такую обложку.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Разрешаются обложки без надписей вообще.</p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Также приглашаем изучить рекомендации (носящие обязательный характер) от <a href="https://artists.apple.com/ru-ru/support/1120-cover-art" target="_blank">Apple Music</a></p>
    </li>
    <li class="quiz__important_item">
      <p class="quiz__important_description">Для редактирования размера обложки <a href="https://vauvision.com/photos" target="_blank" rel="noopener noreferrer">используйте сайт</a> на вкладке «Обложка»</p>
    </li>
  </ul>
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
        @click="handleAccept"
        :disabled="!isReadyForNextStep || isLoading || isUploading"
      >
        <span>принимаю</span>
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

.text_bold_red {
  font-weight: 800;
  color: var(--color);

  a {
    text-decoration: underline;
  }
}
</style>