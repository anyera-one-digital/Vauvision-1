<template>
  <div class="quiz__form quiz__form_seven">
    <h4 class="quiz__form_head">Договор</h4>
    <p class="quiz__form_description">Пожалуйста, проверьте договор. Если всё верно, то переходите к следующему шагу и оплате. Если нужно что-то исправить, то вернитесь назад. Для перехода на следующий шаг пролистайте вниз страницы.</p>
    
    <div v-if="isLoading" class="quiz__form_loading">
      <div class="loading-spinner"></div>
      <span>Загрузка договора...</span>
    </div>
    
    <div v-else-if="!contractData" class="quiz__form_error">
      <p class="error">Данные договора не найдены. Пожалуйста, вернитесь на предыдущий шаг и сгенерируйте договор.</p>
    </div>
    
    <div v-else class="quiz__form_agreement">
      <!-- Отображаем ВСЕ картинки из полученного массива images -->
      <div v-for="(img, index) in contractData.images" :key="index" class="quiz__form_agreement_page">
        <img :src="getFullImageUrl(img)" :alt="`Страница ${index + 1} договора`" loading="lazy" @error="handleImageError" />
        <p class="quiz__form_agreement_page_number">Страница {{ index + 1 }} из {{ contractData.images.length }}</p>
      </div>
    </div>
    
    <div class="quiz__form_checkboxes">
      <div class="form__checkbox_group" :class="{ 'error': errors.acceptTerms }">
        <el-checkbox
          v-model="formData.acceptTerms"
          @change="() => handleCheckboxChange('acceptTerms')"
          size="large"
        >
          <span class="checkbox__text">
            Я принимаю условия <a href="https://vauvision.com/upload/pdf/offer2.pdf" target="_blank" class="checkbox__link">публичной оферты</a>
          </span>
        </el-checkbox>
        <div v-if="errors.acceptTerms" class="error text_very">
          {{ errors.acceptTerms }}
        </div>
      </div>
      
      <div class="form__checkbox_group" :class="{ 'error': errors.acceptPrivacy }">
        <el-checkbox
          v-model="formData.acceptPrivacy"
          @change="() => handleCheckboxChange('acceptPrivacy')"
          size="large"
        >
          <span class="checkbox__text">
            Я даю согласие на обработку <a href="https://vauvision.com/upload/pdf/personaldata.pdf" target="_blank" class="checkbox__link">персональных данных</a>
          </span>
        </el-checkbox>
        <div v-if="errors.acceptPrivacy" class="error text_very">
          {{ errors.acceptPrivacy }}
        </div>
      </div>
      
      <div class="form__checkbox_group">
        <el-checkbox
          v-model="formData.acceptMarketing"
          @change="() => handleCheckboxChange('acceptMarketing')"
          size="large"
        >
          <span class="checkbox__text">
            Я даю согласие на получение <a href="https://vauvision.com/upload/pdf/offer.pdf" target="_blank" class="checkbox__link">рекламных рассылок и специальных предложений</a>
          </span>
        </el-checkbox>
      </div>
    </div>
    
    <div class="quiz__form_bottom">
      <div class="quiz__form_buttons">
        <button 
          class="form__back button__second button" 
          @click="goBack"
        >
          <span><BackSVG /></span>
          <span>Назад</span>
        </button>
        <button 
          class="quiz__form_button button__black button"
          @click="handleContinue"
          :disabled="!isReadyForNextStep"
          :class="{ 'button__disabled': !isReadyForNextStep }"
        >
          <span>подписать договор и оплатить</span>
        </button>
      </div>
      
      <div class="quiz__form_hint" v-if="!isReadyForNextStep">
        <p class="text_small">Обязательно примите условия договора для продолжения</p>
      </div>
    </div>

    <!-- Кастомный попап для подписи -->
    <SignaturePopup
      v-if="showSignaturePopup"
      @close="closeSignaturePopup"
      @submit="handleSignatureSubmit"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElCheckbox, ElMessage } from 'element-plus';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import SignaturePopup from '@/components/layout/Signature.vue';
import { openDB } from '@/utils/inMemoryIdb';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [data: any];
}>();

// Интерфейсы
interface ContractData {
  doc_pdf: string;
  doc_docx: string;
  images: string[];
  element_id?: string;
}

// Ключи для хранения
const STORAGE_KEY = 'quiz7_state';
const DB_NAME = 'quizDB';
const DB_VERSION = 2; // Увеличено до 2

const quizDB = ref<any>(null);
const dataLoaded = ref(false);
const isLoading = ref(true);

// Состояние попапа
const showSignaturePopup = ref(false);

// Данные договора из Quiz6
const contractData = ref<ContractData | null>(null);

// Таймер для debounce сохранения
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Данные формы
const formData = reactive({
  acceptTerms: false,
  acceptPrivacy: false,
  acceptMarketing: false,
  signature: '' // Добавляем поле для подписи
});

// Ошибки валидации
const errors = reactive({
  acceptTerms: '',
  acceptPrivacy: '',
  acceptMarketing: ''
});

// Инициализация IndexedDB
const initDB = async () => {
  try {
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz7: Upgrading store from version ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('quizState')) {
            db.deleteObjectStore('quizState');
          }
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz7: Created new quizState store');
        }
      },
    });
  } catch (error) {
    console.error('Quiz7: Error initializing DB:', error);
  }
};

// Загрузка данных договора из Quiz6
const loadContractData = async (): Promise<ContractData | null> => {
  try {
    // Загружаем состояние Quiz6
    const quiz6State = await quizDB.value.get('quizState', 'quiz6_state');
    
    if (quiz6State && quiz6State.contractData) {
      console.log('Loaded contract data from Quiz6:', quiz6State.contractData);
      return quiz6State.contractData;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading contract data:', error);
    return null;
  }
};

// Сохранение состояния в IndexedDB
const saveStateToDB = async () => {
  if (!dataLoaded.value) return;
  
  try {
    const stateToSave = {
      id: STORAGE_KEY,
      formData: { 
        acceptTerms: Boolean(formData.acceptTerms),
        acceptPrivacy: Boolean(formData.acceptPrivacy),
        acceptMarketing: Boolean(formData.acceptMarketing)
      },
      contractData: contractData.value ? {
        doc_pdf: String(contractData.value.doc_pdf),
        doc_docx: String(contractData.value.doc_docx),
        images: Array.isArray(contractData.value.images) ? [...contractData.value.images] : [],
        element_id: String(contractData.value.element_id || ''),
      } : null,
      signature: formData.signature || null,
      timestamp: Date.now()
    };
    
    await quizDB.value.put('quizState', stateToSave);
    console.log('Quiz7 state saved to in-memory store', {
      hasContract: !!stateToSave.contractData,
      imagesCount: stateToSave.contractData?.images?.length || 0,
      hasSignature: !!stateToSave.signature
    });
  } catch (error) {
    console.error('Error saving Quiz7 state to IndexedDB:', error);
  }
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  try {
    const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
    if (savedState) {
      console.log('Loading Quiz7 from in-memory store:', savedState);
      
      // Восстанавливаем данные формы
      if (savedState.formData) {
        formData.acceptTerms = savedState.formData.acceptTerms || false;
        formData.acceptPrivacy = savedState.formData.acceptPrivacy || false;
        formData.acceptMarketing = savedState.formData.acceptMarketing || false;
      }
      
      // Восстанавливаем данные договора
      if (savedState.contractData) {
        contractData.value = savedState.contractData;
      }
      
      // Восстанавливаем подпись
      if (savedState.signature) {
        formData.signature = savedState.signature;
        console.log('Restored signature from store, length:', savedState.signature.length);
      }
    }
  } catch (error) {
    console.error('Error loading Quiz7 state from IndexedDB:', error);
  }
};

// Получение полного URL изображения
const getFullImageUrl = (url: string): string => {
  if (!url) return '';
  // Если URL уже абсолютный (начинается с http), возвращаем как есть
  if (url.startsWith('http')) return url;
  // Если URL начинается с /, добавляем базовый URL
  if (url.startsWith('/')) return url;
  // Если относительный путь, добавляем слеш в начале
  return '/' + url;
};

// Обработчик ошибки загрузки изображения
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  console.error('Failed to load image:', img.src);
  img.style.border = '2px solid red';
  img.alt = 'Ошибка загрузки изображения';
};

// Правила валидации
const validationRules = {
  acceptTerms: (value: boolean) => {
    if (!value) return 'Необходимо принять условия оферты';
    return '';
  },
  acceptPrivacy: (value: boolean) => {
    if (!value) return 'Необходимо дать согласие на обработку персональных данных';
    return '';
  },
  acceptMarketing: (_: boolean) => {
    return '';
  }
};

// Валидация конкретного поля
const validateField = async (fieldName: keyof typeof errors): Promise<boolean> => {
  const value = formData[fieldName as keyof typeof formData];
  const validator = validationRules[fieldName as keyof typeof validationRules];
  
  if (validator) {
    errors[fieldName] = validator(value as boolean);
    debouncedSave();
    return !errors[fieldName];
  }
  
  return true;
};

// Валидация всей формы
const validateForm = async (): Promise<boolean> => {
  let isValid = true;
  
  const requiredFields: (keyof typeof errors)[] = ['acceptTerms', 'acceptPrivacy'];
  
  for (const field of requiredFields) {
    if (!await validateField(field)) {
      isValid = false;
    }
  }
  
  debouncedSave();
  return isValid;
};

// Вычисляемое свойство для проверки готовности к продолжению
const isReadyForNextStep = computed(() => {
  return formData.acceptTerms && formData.acceptPrivacy && !!contractData.value;
});

// Обработчик изменений чекбоксов
const handleCheckboxChange = async (fieldName: keyof typeof formData) => {
  await validateField(fieldName as keyof typeof errors);
  
  if (fieldName === 'acceptTerms' && formData.acceptTerms) {
    errors.acceptTerms = '';
  }
  if (fieldName === 'acceptPrivacy' && formData.acceptPrivacy) {
    errors.acceptPrivacy = '';
  }
  
  debouncedSave();
};

const goBack = () => {
  emit('go-back');
};

const handleContinue = async () => {
  const formValid = await validateForm();
  
  if (!formValid) {
    ElMessage.warning({
      message: 'Пожалуйста, примите обязательные условия договора',
      duration: 3000
    });
    
    const firstErrorField = document.querySelector('.error');
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  if (!contractData.value) {
    ElMessage.error('Данные договора не найдены');
    return;
  }
  
  showSignaturePopup.value = true;
  document.documentElement.classList.add('noscroll');
};

const closeSignaturePopup = () => {
  showSignaturePopup.value = false;
  document.documentElement.classList.remove('noscroll');
};

const handleSignatureSubmit = async (signatureData: string) => {
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(signatureData)) {
    ElMessage.error('Некорректный формат подписи. Подпишите договор ещё раз.');
    return;
  }

  console.log('Подпись получена в Quiz7, длина:', signatureData.length);
  
  // Сохраняем подпись в состоянии
  formData.signature = signatureData;
  
  // Сохраняем в БД перед переходом
  await saveStateToDB();
  
  // Собираем данные для отправки в Quiz8
  const dataToSend = {
    contract: contractData.value ? {
      doc_pdf: contractData.value.doc_pdf,
      doc_docx: contractData.value.doc_docx,
      images: [...contractData.value.images],
      element_id: String(contractData.value.element_id || ''),
    } : null,
    formData: {
      acceptTerms: formData.acceptTerms,
      acceptPrivacy: formData.acceptPrivacy,
      acceptMarketing: formData.acceptMarketing
    },
    signature: signatureData,
    timestamp: new Date().toISOString()
  };
  
  console.log('Данные договора с подписью:', {
    hasContract: !!dataToSend.contract,
    imagesCount: dataToSend.contract?.images?.length || 0,
    hasSignature: !!dataToSend.signature
  });
  
  closeSignaturePopup();
  
  // Передаем данные в родительский компонент
  emit('go-next', dataToSend);
};

// Debounced save
const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    if (dataLoaded.value) {
      saveStateToDB();
    }
  }, 500);
};

// Watchers для чекбоксов
watch(() => formData.acceptTerms, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.acceptPrivacy, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.acceptMarketing, () => {
  if (dataLoaded.value) debouncedSave();
});

// Загрузка состояния при монтировании компонента
onMounted(async () => {
  try {
    await initDB();
    
    await loadStateFromDB();
    
    if (!contractData.value) {
      const data = await loadContractData();
      if (data) {
        contractData.value = data;
        await saveStateToDB();
      }
    }
    
    dataLoaded.value = true;
    
    console.log('Quiz7 mounted, signature present:', !!formData.signature);
    
  } catch (error) {
    console.error('Error in onMounted:', error);
    ElMessage.error('Ошибка при загрузке данных договора');
  } finally {
    isLoading.value = false;
  }
});

// Сохраняем состояние при покидании страницы
const handleBeforeUnload = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveStateToDB();
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveStateToDB();
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

<style lang="scss" scoped>
.quiz__form {
  width: calc(100% - 330px);
  padding: 0 40px 0 60px;

  @media (max-width: 1439px) {
    width: 100%;
    padding: 0;
  }

  @media (max-width: 767px) {
    padding: 0;
  }

  &_head {
    margin-bottom: 20px;
  }

  &_description {
    color: var(--text-gray);
    margin-bottom: 40px;
  }

  &_loading {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 16px;
  }

  &_error {
    text-align: center;
    padding: 40px;
    background-color: #fef0f0;
    border: 1px solid #fde2e2;
    border-radius: 4px;
    margin-bottom: 20px;

    .error {
      color: #f56c6c;
      font-size: 16px;
    }
  }

  &_bottom {
    display: flex;
    padding: 60px 0 0;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    @media (max-width: 767px) {
      padding: 40px 0 0;
      align-items: flex-start;
      flex-direction: column-reverse;
      gap: 40px;
    }
  }

  &_buttons {
    display: flex;
    align-items: center;
    gap: 30px;
  }

  &_agreement {
    display: flex;
    padding: 20px 0 0;
    flex-direction: column;
    gap: 20px;
  }

  &_agreement_page {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    background-color: #f5f5f5;
    min-height: 200px;

    img {
      width: 100%;
      height: auto;
      display: block;
    }

    &_number {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
  }

  &_checkboxes {
    display: flex;
    padding: 20px 0 0;
    flex-direction: column;
    gap: 10px;
  }
}

.form__checkbox_group .el-checkbox {
  display: flex;
  min-height: auto;
  align-items: center;
  gap: 10px;
  color: var(--text-gray);
}

.form__group .form__checkbox_group .el-checkbox {
  padding: 10px 0 0;
}

.checkbox__link {
  color: var(--color);
  text-decoration: underline;
}

.error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(64, 158, 255, 0.2);
  border-radius: 50%;
  border-top-color: var(--color);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>