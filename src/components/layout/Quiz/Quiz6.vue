<template>
<div class="quiz__form quiz__form_six">
  <h4 class="quiz__form_head">дополнительная информация</h4>
  
  <div v-if="!isLoading">
    <div class="form__flex" :class="{ 'blur-content': uploadingFiles || isGeneratingContract }">
      <!-- Откуда узнали -->
      <div class="form__group">
        <label class="form__label button">откуда вы о нас узнали?<span>*</span></label>
        <el-select
          v-model="formData.platforms"
          multiple
          placeholder="Выберите площадки"
          :class="{ 'error': errors.platforms }"
          size="large"
          @change="validateForm"
          :disabled="uploadingFiles || isGeneratingContract"
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
        <div v-if="formData.platforms.includes('other')" class="form__group_inner">
          <el-input
            v-model="formData.otherPlatform"
            type="text"
            placeholder="Укажите другие площадки"
            :class="{ 'error': errors.otherPlatform }"
            @blur="validateForm"
            @input="errors.otherPlatform = ''"
            size="large"
            :disabled="uploadingFiles || isGeneratingContract"
          />
          <div v-if="errors.otherPlatform" class="error text_very">
            {{ errors.otherPlatform }}
          </div>
        </div>
      </div>

      <!-- Дополнительные комментарии -->
      <div class="form__group">
        <label for="additionalComments" class="form__label button">дополнительные комментарии</label>
        <p class="form__hint text_small">Почти закончили! Напишите все, что считаете важным. Если вы пропустили какую-то информацию, у вас есть особые пожелания - самое время рассказать о них.</p>
        <el-input
          v-model="formData.additionalComments"
          type="textarea"
          :rows="4"
          placeholder="Ваши комментарии и пожелания..."
          @input="errors.additionalComments = ''"
          size="large"
          :disabled="uploadingFiles || isGeneratingContract"
        />
      </div>

      <!-- Промо-план релиза -->
      <div class="form__group">
        <label for="promoPlan" class="form__label button">Промо-план релиза для редакторов площадок</label>
        <el-input
          v-model="formData.promoPlan"
          type="textarea"
          :rows="4"
          placeholder="Информация об артисте, релизе, планах по рекламе..."
          @input="errors.promoPlan = ''"
          size="large"
          :disabled="uploadingFiles || isGeneratingContract"
        />
      </div>

      <!-- Ссылка на Bandlink -->
      <div class="form__group">
        <label for="bandlinkUrl" class="form__label button">ССЫЛКА НА ВАШ ПРЕДСТОЯЩИЙ РЕЛИЗ В BANDLINK (НЕОБЯЗАТЕЛЬНО)</label>
        <p class="form__hint text_small">Если у вас есть верифицированный профиль <a href="https://band.link/" target="_blanc">Band.link</a>, то зайдите туда, перейдите в раздел «Страницы» и нажмите «Создать Bandlink». Создайте страницу релиза, указав псевдоним и название будущего релиза. Далее нажмите «Превью страницы» и скопируйте получившуюся ссылку. Её и нужно вставить в поле слева. Если у вас нет профиля в <a href="https://band.link/" target="_blanc">Band.link</a>, пропустить это поле.</p>
        <el-input
          v-model="formData.bandlinkUrl"
          type="text"
          :class="{ 'error': errors.bandlinkUrl }"
          placeholder="https://band.link/..."
          @blur="validateUrlField('bandlinkUrl')"
          @input="errors.bandlinkUrl = ''"
          size="large"
          :disabled="uploadingFiles || isGeneratingContract"
        />
        <div v-if="errors.bandlinkUrl" class="error text_very">
          {{ errors.bandlinkUrl }}
        </div>
      </div>

      <!-- Промокод -->
      <div class="form__group">
        <label for="promoCode" class="form__label button">промокод</label>
        <div class="form__promo_input">
          <el-input
            v-model="formData.promoCode"
            type="text"
            placeholder="Если есть, то введите. Если нет, то не вводите"
            :disabled="promoApplied || uploadingFiles || isGeneratingContract"
            @input="handlePromoInput"
            size="large"
            style="flex: 1;"
          />
          <el-button 
            v-if="promoApplied && !uploadingFiles && !isGeneratingContract"
            type="info" 
            @click="removePromoCode"
            size="default"
          >
            Отменить
          </el-button>
          <span v-if="promoLoading" class="promo_loading">Проверка...</span>
        </div>
        <div v-if="promoDiscount > 0" class="promo_discount_info">
          Применена скидка {{ promoDiscount }}%
        </div>
      </div>

      <!-- Бонусы -->
      <div class="form__group">
        <label for="bonuses" class="form__label button">Бонусы</label>
        <ul class="form__hint_list">
          <li class="form__hint_item">
            <p class="form__hint text_small">У вас на балансе {{ userBonuses }} бонусов. 1 бонус = 1 {{ currencySymbol }}. За один заказ можно списать не более 50% от суммы заказа после скидки по промокоду (если есть).</p>
          </li>
          <li class="form__hint_item">
            <p class="form__hint text_small">Новые бонусы рассчитываются от финальной стоимости с учётом скидки.</p>
          </li>
        </ul>
        <div class="form__bonus_input">
          <el-input-number
            v-model="formData.usedBonuses"
            :min="0"
            :max="maxBonuses"
            :step="1"
            :precision="0"
            placeholder="Введите количество бонусов"
            @change="handleBonusesChange"
            @input="validateField('usedBonuses')"
            size="large"
            style="width: 200px;"
            :disabled="uploadingFiles || isGeneratingContract"
          />
          <span class="form__bonus_hint">к списанию по правилам: до {{ maxBonuses }} (на балансе {{ userBonuses }})</span>
        </div>
        <div v-if="errors.usedBonuses" class="error text_very">
          {{ errors.usedBonuses }}
        </div>
        <div v-if="finalAmount < 1 && formData.usedBonuses > 0" class="warning text_very">
          ⚠️ Минимальная сумма к оплате — 1 {{ currencySymbol }}. Бонусы будут скорректированы.
        </div>
      </div>

      <!-- Итого к оплате -->
      <div class="form__group">
        <div class="quiz__form_sum">
          <p class="quiz__form_sum_text">Итого к оплате:</p>
          <div class="quiz__form_total_wrapper">
            <div class="quiz__form_price_container">
              <h4 class="quiz__form_total"><span>{{ formatPrice(finalAmount) }}</span> {{ currencySymbol }}</h4>
              <span v-if="hasDiscount" class="quiz__form_original_price_strikethrough">{{ formatPrice(originalTotalAmount) }} {{ currencySymbol }}</span>
            </div>
            <div v-if="promoDiscount > 0" class="quiz__form_discount_info">
              Скидка по промокоду: {{ promoDiscount }}%
            </div>
            <p v-if="finalAmount < 1" class="quiz__form_error_price">
              Сумма не может быть меньше 1 {{ currencySymbol }}
            </p>
          </div>
        </div>
        <div class="quiz__form_sum_bonus">
          <p class="quiz__form_sum_bonus_text">Будет начислено бонусов:</p>
          <div class="quiz__form_sum_bonus_total">
            <span>{{ formatPrice(Math.round(finalAmount * 0.07)) }}</span>
          </div>
        </div>
      </div>

      <!-- Подтверждение -->
      <div class="form__group">
        <div class="form__checkbox_group">
          <el-checkbox
            v-model="formData.confirmNoRightsViolation"
            :class="{ 'error': errors.confirmNoRightsViolation }"
            @change="validateField('confirmNoRightsViolation')"
            :disabled="uploadingFiles || isGeneratingContract"
          >
            Я подтверждаю, что мои треки не нарушают права других авторов музыки и текста
          </el-checkbox>
        </div>
        <div v-if="errors.confirmNoRightsViolation" class="error text_very">
          {{ errors.confirmNoRightsViolation }}
        </div>
      </div>
    </div>
    
    <!-- БЛОК ЗАГРУЗКИ ПЕРЕНЕСЕН ВНИЗ НАД КНОПКАМИ -->
    <!-- Индикатор загрузки файлов и генерации договора -->
    <div v-if="uploadingFiles || isGeneratingContract" class="quiz__form_contract_loading">
      <div class="loading-spinner"></div>
      <p v-if="uploadingFiles">Отправка файлов на сервер... {{ uploadedCount }}/{{ totalFilesCount }}</p>
      <p v-else-if="isGeneratingContract">Генерация договора... Это может занять несколько секунд</p>
    </div>
    
    <!-- Прогресс загрузки файлов -->
    <div v-if="uploadingFiles" class="upload_progress">
      <div class="upload_progress_bar">
        <div class="upload_progress_bar_fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>
      <p class="upload_progress_count">Отправлено {{ uploadedCount }} из {{ totalFilesCount }}</p>
    </div>
    
    <div class="quiz__form_bottom">
      <div class="quiz__form_buttons">
        <button 
          class="form__back button__second button" 
          @click="goBack"
          :disabled="isLoading || uploadingFiles || isGeneratingContract"
        >
          <span><BackSVG /></span>
          <span>Назад</span>
        </button>
        <button 
          class="quiz__form_button button__black button"
          @click="handleContinue"
          :disabled="!isReadyForNextStep || isLoading || uploadingFiles || isGeneratingContract || finalAmount < 1"
        >
          <span v-if="uploadingFiles">Отправка файлов...</span>
          <span v-else-if="isGeneratingContract">Генерация договора...</span>
          <span v-else>{{ isLoading ? 'Загрузка...' : 'Сгенерировать договор' }}</span>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Индикатор начальной загрузки (показывается только при isLoading) -->
  <div v-if="isLoading" class="quiz__form_loading">
    <div class="loading-spinner"></div>
    <p>Загрузка данных...</p>
  </div>
</div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElSelect, ElOption, ElInput, ElCheckbox, ElInputNumber, ElMessage, ElButton } from 'element-plus';
import { sendRequest, FileRequest } from '@/utils/api';
import { buildInstrumentalsFromQuiz2 } from '@/utils/quizInstrumentalsSummary';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import { openDB } from 'idb';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [contractData: ContractData];
}>();

// Интерфейсы
interface ContractData {
  doc_pdf: string;
  doc_docx: string;
  images: string[];
  element_id?: string;
}

interface UploadedFileInfo {
  file_name: string;
  product_id: string;
  type: 'single' | 'album';
  path?: string;
  track_number?: number;
  album_number?: number;
}

// Ключи для хранения
const STORAGE_KEY = 'quiz6_state';
const DB_NAME = 'quizDB';
const AUDIO_DB_NAME = 'audioDB';
const FILES_DB_NAME = 'filesDB';
const DB_VERSION = 2;

const quizDB = ref<any>(null);
const audioDB = ref<any>(null);
const filesDB = ref<any>(null);
const dataLoaded = ref(false);
const dbInitialized = ref(false);
const audioDBInitialized = ref(false);
const filesDBInitialized = ref(false);

// Флаг для отслеживания, что мы загрузили данные с бека
const contractLoadedFromBackend = ref(false);

// Состояние загрузки
const isLoading = ref(true);
const promoLoading = ref(false);
const promoApplied = ref(false);
const promoDiscount = ref(0);

// Состояние отправки файлов
const uploadingFiles = ref(false);
const uploadProgress = ref(0);
const uploadedCount = ref(0);
const totalFilesCount = ref(0);

// Состояние генерации договора
const isGeneratingContract = ref(false);
const contractData = ref<ContractData | null>(null);

// Таймер для debounce
let promoDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Данные формы
const formData = reactive({
  platforms: [] as string[],
  otherPlatform: '',
  additionalComments: '',
  promoPlan: '',
  bandlinkUrl: '',
  promoCode: '',
  usePartnerBonuses: false,
  usedBonuses: 0,
  confirmNoRightsViolation: false
});

// Ошибки валидации
const errors = reactive({
  platforms: '',
  otherPlatform: '',
  additionalComments: '',
  promoPlan: '',
  bandlinkUrl: '',
  promoCode: '',
  usePartnerBonuses: '',
  usedBonuses: '',
  confirmNoRightsViolation: ''
});

// Опции для выбора площадок
const platformOptions = [
  { label: 'Социальные сети (VK, Instagram, Telegram)', value: 'social' },
  { label: 'Рекомендация друзей', value: 'friends' },
  { label: 'Поиск в интернете', value: 'search' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'Музыкальные форумы', value: 'forums' },
  { label: 'Ранее пользовались нашими услугами', value: 'previous' },
  { label: 'Другое', value: 'other' }
];

// Данные из API
const originalTotalAmount = ref(0);
const currencySymbol = ref('₽');
const userBonuses = ref(0);

// Минимальная сумма к оплате
const MINIMUM_AMOUNT = 1;

// Сумма заказа после промокода, до списания бонусов
const orderTotalAfterPromo = computed(() => {
  let total = originalTotalAmount.value;
  if (promoDiscount.value > 0) {
    total = Math.floor((total * (100 - promoDiscount.value)) / 100);
  }
  return total;
});

// Не более 50% от суммы после скидки, не выше баланса, с учётом минимального платежа
const maxBonuses = computed(() => {
  const order = orderTotalAfterPromo.value;
  const maxByHalfOrder = Math.floor(order * 0.5);
  const maxByMinPayment = Math.max(0, order - MINIMUM_AMOUNT);
  return Math.min(userBonuses.value, maxByHalfOrder, maxByMinPayment);
});

// Финальная сумма с учётом скидки и бонусов
const finalAmount = computed(() => {
  const total = orderTotalAfterPromo.value;
  const used = formData.usedBonuses || 0;
  return Math.max(MINIMUM_AMOUNT, total - used);
});

// Есть ли скидка (для отображения перечеркнутой цены)
const hasDiscount = computed(() => {
  return promoDiscount.value > 0 || formData.usedBonuses > 0;
});

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz6: Initializing databases...');
    
    // Основная БД с версией 2
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz6: Upgrading DB from version ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('quizState')) {
            db.deleteObjectStore('quizState');
          }
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz6: Created new quizState store');
        }
      },
    });
    
    // Аудио БД с версией 2
    audioDB.value = await openDB(AUDIO_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz6: Upgrading Audio DB from version ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('audio')) {
            db.deleteObjectStore('audio');
          }
          const store = db.createObjectStore('audio', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz6: Created new audio store');
        }
      },
    });
    
    // Файловая БД с версией 2
    filesDB.value = await openDB(FILES_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz6: Upgrading Files DB from version ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('files')) {
            db.deleteObjectStore('files');
          }
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('type', 'type');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz6: Created new files store');
        }
      },
    });
    
    dbInitialized.value = true;
    audioDBInitialized.value = true;
    filesDBInitialized.value = true;
    console.log('Quiz6: Databases initialized successfully');
    
  } catch (error) {
    console.error('Quiz6: Error initializing databases:', error);
    dbInitialized.value = false;
    audioDBInitialized.value = false;
    filesDBInitialized.value = false;
  }
};

// Безопасное выполнение операций с БД
const safeDBOperation = async <T>(
  operation: () => Promise<T>, 
  fallback: T,
  dbType: 'quiz' | 'audio' | 'files' = 'quiz'
): Promise<T> => {
  let db;
  let initialized;
  
  if (dbType === 'quiz') {
    db = quizDB.value;
    initialized = dbInitialized.value;
  } else if (dbType === 'audio') {
    db = audioDB.value;
    initialized = audioDBInitialized.value;
  } else {
    db = filesDB.value;
    initialized = filesDBInitialized.value;
  }
  
  if (!initialized || !db) {
    console.log(`Quiz6: ${dbType} DB not initialized`);
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error(`Quiz6: Error in ${dbType} DB operation:`, error);
    return fallback;
  }
};

// Функция для создания безопасной копии состояния (без циклических ссылок)
const createSafeStateCopy = () => {
  const safeFormData = {
    platforms: Array.isArray(formData.platforms) ? [...formData.platforms] : [],
    otherPlatform: String(formData.otherPlatform || ''),
    additionalComments: String(formData.additionalComments || ''),
    promoPlan: String(formData.promoPlan || ''),
    bandlinkUrl: String(formData.bandlinkUrl || ''),
    promoCode: String(formData.promoCode || ''),
    usePartnerBonuses: Boolean(formData.usePartnerBonuses),
    usedBonuses: Number(formData.usedBonuses || 0),
    confirmNoRightsViolation: Boolean(formData.confirmNoRightsViolation)
  };
  
  let safeContractData = null;
  if (contractData.value) {
    safeContractData = {
      doc_pdf: String(contractData.value.doc_pdf || ''),
      doc_docx: String(contractData.value.doc_docx || ''),
      images: Array.isArray(contractData.value.images) ? [...contractData.value.images] : [],
      element_id: String(contractData.value.element_id || ''),
    };
  }

  /** После промо, до списания бонусов — как orderTotalAfterPromo / отправка на бэкенд */
  const snapOrderAfterPromo = orderTotalAfterPromo.value;
  const usedBonusesSnap = Number(formData.usedBonuses || 0);
  const snapFinalPayable = Math.max(
    MINIMUM_AMOUNT,
    snapOrderAfterPromo - usedBonusesSnap
  );

  return {
    id: STORAGE_KEY,
    formData: safeFormData,
    promoApplied: Boolean(promoApplied.value),
    promoDiscount: Number(promoDiscount.value || 0),
    contractData: safeContractData,
    contractLoadedFromBackend: contractLoadedFromBackend.value,
    /** Для order.php: sumOrder до вычета refBonus (после промо) */
    orderTotalAfterPromo: snapOrderAfterPromo,
    /** Итог к оплате после бонусов — как в UI / newDock sumOrder */
    finalPayableAmount: snapFinalPayable,
    timestamp: Date.now()
  };
};

// Сохранение состояния в IndexedDB
const saveStateToDB = async () => {
  if (isLoading.value || !dataLoaded.value || !dbInitialized.value) return;
  
  await safeDBOperation(
    async () => {
      const stateToSave = createSafeStateCopy();
      await quizDB.value.put('quizState', stateToSave);
      console.log('Quiz6: State saved to IndexedDB');
      
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  if (!dbInitialized.value) {
    console.log('Quiz6: DB not initialized, skipping load');
    return;
  }
  
  await safeDBOperation(
    async () => {
      const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
      if (savedState) {
        console.log('Quiz6: Loading from IndexedDB:', savedState);
        
        if (savedState.formData) {
          formData.platforms = savedState.formData.platforms || [];
          formData.otherPlatform = savedState.formData.otherPlatform || '';
          formData.additionalComments = savedState.formData.additionalComments || '';
          formData.promoPlan = savedState.formData.promoPlan || '';
          formData.bandlinkUrl = savedState.formData.bandlinkUrl || '';
          formData.promoCode = savedState.formData.promoCode || '';
          formData.usePartnerBonuses = savedState.formData.usePartnerBonuses || false;
          formData.usedBonuses = savedState.formData.usedBonuses || 0;
          formData.confirmNoRightsViolation = savedState.formData.confirmNoRightsViolation || false;
        }
        
        promoApplied.value = savedState.promoApplied || false;
        promoDiscount.value = savedState.promoDiscount || 0;
        
        if (savedState.contractData && savedState.contractLoadedFromBackend) {
          contractData.value = savedState.contractData;
          contractLoadedFromBackend.value = true;
          console.log('Quiz6: Contract restored from backend data');
        }
      }
    },
    null
  );
};

// Загрузка данных из API
const loadBasketData = async () => {
  try {
    console.log('Quiz6: Loading basket data...');
    
    const response = await sendRequest("post", '/ajax_vue/ajax/basket/updateBasket.php', {});
    
    const data = response.data as any;
    
    if (data.data) {
      originalTotalAmount.value = data.data.total || 0;
      currencySymbol.value = data.data.currency_symbol || '₽';
      console.log('Quiz6: Original total amount:', originalTotalAmount.value);
    }
    
    const userResponse = await sendRequest("post", '/ajax_vue/ajax/getDataForm.php', {});
    
    const userData = userResponse.data as any;
    
    if (userData.user?.uf_bonus) {
      userBonuses.value = parseInt(userData.user.uf_bonus) || 0;
      console.log('Quiz6: User bonuses:', userBonuses.value);
    }
    
  } catch (error) {
    console.error('Quiz6: Ошибка загрузки данных:', error);
  }
};

// Загрузка данных при монтировании
const loadInitialData = async () => {
  isLoading.value = true;
  
  try {
    await initDB();
    await loadBasketData();
    await loadStateFromDB();
    
    if (formData.usedBonuses > maxBonuses.value) {
      formData.usedBonuses = maxBonuses.value;
    }
    
    dataLoaded.value = true;
    console.log('Quiz6: Initialization complete');
    
  } catch (error) {
    console.error('Quiz6: Error in loadInitialData:', error);
    ElMessage.error('Ошибка при загрузке данных');
  } finally {
    isLoading.value = false;
  }
};

// Обновление цены после применения промокода
const updatePriceWithPromo = async () => {
  try {
    const response = await sendRequest("post", '/ajax_vue/ajax/quiz/promoPrice.php', {});
    
    const data = response.data as any;
    
    if (data.data?.total) {
      originalTotalAmount.value = data.data.total;
      console.log('Quiz6: Price updated with promo:', originalTotalAmount.value);
    }
  } catch (error) {
    console.error('Quiz6: Ошибка обновления цены после промокода:', error);
  }
};

// Проверка промокода
const checkPromoCode = async (code: string) => {
  if (!code.trim()) {
    promoApplied.value = false;
    promoDiscount.value = 0;
    await updatePriceWithPromo();
    await saveStateToDB();
    return;
  }
  
  promoLoading.value = true;
  
  try {
    const basketResponse = await sendRequest("post", '/ajax_vue/ajax/basket/updateBasket.php', {});
    const basketData = basketResponse.data as any;
    
    const counts = basketData.data?.counts || { single: 0, album: 0 };
    
    const response = await sendRequest("post", '/ajax_vue/ajax/quiz/promo.php', {
      PROMO: code,
      COUNT_SINGLE: counts.single || 0,
      COUNT_ALBUM: counts.album || 0
    });
    
    if (response.data.error === 0) {
      promoApplied.value = true;
      
      const message = response.data.message || '';
      const percentMatch = message.match(/(\d+)%/);
      if (percentMatch) {
        promoDiscount.value = parseInt(percentMatch[1]);
      }
      
      ElMessage.success(message);
      await updatePriceWithPromo();
    } else {
      promoApplied.value = false;
      promoDiscount.value = 0;
      ElMessage.error(response.data.message || 'Неверный промокод');
      await updatePriceWithPromo();
    }
  } catch (error) {
    console.error('Quiz6: Ошибка применения промокода:', error);
    promoApplied.value = false;
    promoDiscount.value = 0;
    ElMessage.error('Ошибка при проверке промокода');
    await updatePriceWithPromo();
  } finally {
    promoLoading.value = false;
    await saveStateToDB();
  }
};

// Обработчик ввода промокода с debounce
const handlePromoInput = () => {
  if (promoDebounceTimer) {
    clearTimeout(promoDebounceTimer);
  }
  
  if (promoApplied.value) {
    return;
  }
  
  promoDebounceTimer = setTimeout(() => {
    checkPromoCode(formData.promoCode);
  }, 500);
};

// Отмена промокода
const removePromoCode = async () => {
  promoApplied.value = false;
  promoDiscount.value = 0;
  formData.promoCode = '';
  
  await updatePriceWithPromo();
  await saveStateToDB();
  
  ElMessage.info('Промокод отменен');
};

// Обработчик изменения бонусов
const handleBonusesChange = (value: number | undefined) => {
  if (value === undefined) {
    formData.usedBonuses = 0;
    return;
  }
  
  if (value > maxBonuses.value) {
    formData.usedBonuses = maxBonuses.value;
    ElMessage.warning(`Для этого заказа можно списать не более ${maxBonuses.value} бонусов`);
  } else if (value < 0) {
    formData.usedBonuses = 0;
  } else {
    formData.usedBonuses = value;
  }
  
  validateField('usedBonuses');
  debouncedSave();
};

// Форматирование цены с разделителями тысяч
const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Валидация URL
const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Валидация конкретного поля
const validateField = (fieldName: keyof typeof errors): boolean => {
  let errorMessage = '';
  
  switch (fieldName) {
    case 'platforms':
      if (formData.platforms.length === 0) {
        errorMessage = 'Выберите хотя бы один вариант';
      }
      break;
      
    case 'otherPlatform':
      if (formData.platforms.includes('other') && !formData.otherPlatform.trim()) {
        errorMessage = 'Укажите другие источники';
      } else if (formData.otherPlatform.trim().length > 0 && formData.otherPlatform.trim().length < 2) {
        errorMessage = 'Минимум 2 символа';
      }
      break;
      
    case 'bandlinkUrl':
      if (formData.bandlinkUrl.trim() && !isValidUrl(formData.bandlinkUrl)) {
        errorMessage = 'Введите корректную ссылку (начинается с https://)';
      } else if (formData.bandlinkUrl.trim() && !formData.bandlinkUrl.includes('band.link')) {
        errorMessage = 'Ссылка должна вести на Band.link';
      }
      break;
      
    case 'usedBonuses':
      if (formData.usedBonuses < 0) {
        errorMessage = 'Количество бонусов не может быть отрицательным';
      } else if (formData.usedBonuses > userBonuses.value) {
        errorMessage = `У вас доступно только ${userBonuses.value} бонусов`;
      } else if (formData.usedBonuses > maxBonuses.value) {
        errorMessage = `Нельзя списать больше ${maxBonuses.value} бонусов для этого заказа`;
      }
      break;
      
    case 'confirmNoRightsViolation':
      if (!formData.confirmNoRightsViolation) {
        errorMessage = 'Необходимо подтвердить отсутствие нарушений прав';
      }
      break;
  }
  
  errors[fieldName] = errorMessage;
  debouncedSave();
  
  return !errorMessage;
};

// Валидация URL полей
const validateUrlField = (fieldName: keyof typeof errors): boolean => {
  let isValid = true;
  
  if (fieldName === 'bandlinkUrl') {
    if (formData.bandlinkUrl.trim()) {
      if (!isValidUrl(formData.bandlinkUrl)) {
        errors.bandlinkUrl = 'Введите корректную ссылку (начинается с https://)';
        isValid = false;
      } else if (!formData.bandlinkUrl.includes('band.link')) {
        errors.bandlinkUrl = 'Ссылка должна вести на Band.link';
        isValid = false;
      } else {
        errors.bandlinkUrl = '';
        isValid = true;
      }
    } else {
      errors.bandlinkUrl = '';
      isValid = true;
    }
  }
  
  debouncedSave();
  
  return isValid;
};

// Валидация всей формы
const validateForm = (): boolean => {
  let isValid = true;
  
  const requiredFields: (keyof typeof errors)[] = [
    'platforms',
    'usedBonuses',
    'confirmNoRightsViolation'
  ];
  
  requiredFields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });
  
  if (formData.platforms.includes('other')) {
    const otherPlatformValid = validateField('otherPlatform');
    if (!otherPlatformValid) {
      isValid = false;
    }
  }
  
  if (formData.bandlinkUrl.trim()) {
    const bandlinkValid = validateUrlField('bandlinkUrl');
    if (!bandlinkValid) {
      isValid = false;
    }
  }
  
  debouncedSave();
  
  return isValid;
};

// Вычисляемое свойство для проверки готовности к продолжению
const isReadyForNextStep = computed(() => {
  const requiredFieldsValid = 
    formData.platforms.length > 0 &&
    formData.usedBonuses >= 0 &&
    formData.usedBonuses <= userBonuses.value &&
    formData.usedBonuses <= maxBonuses.value &&
    formData.confirmNoRightsViolation;
  
  let otherPlatformValid = true;
  if (formData.platforms.includes('other')) {
    otherPlatformValid = formData.otherPlatform.trim().length >= 2;
  }
  
  let bandlinkUrlValid = true;
  if (formData.bandlinkUrl.trim()) {
    bandlinkUrlValid = isValidUrl(formData.bandlinkUrl) && formData.bandlinkUrl.includes('band.link');
  }
  
  return requiredFieldsValid && 
         otherPlatformValid && 
         bandlinkUrlValid;
});

// Получение обложки из IndexedDB
const getCoverFile = async (): Promise<{ file: File; type: 'single' | 'album' } | null> => {
  if (!filesDBInitialized.value) {
    console.log('Quiz6: Files DB not initialized');
    return null;
  }
  
  return safeDBOperation(
    async () => {
      const quiz3State = await quizDB.value.get('quizState', 'quiz3_state');
      
      if (!quiz3State || !quiz3State.coverFileInfo || !quiz3State.coverFileInfo.fileId) {
        console.log('Quiz6: No cover file found in Quiz3 state');
        return null;
      }
      
      console.log('Quiz6: Found cover file info:', quiz3State.coverFileInfo);
      
      const stored = await filesDB.value.get('files', quiz3State.coverFileInfo.fileId);
      
      if (stored) {
        console.log('Quiz6: Cover file loaded from DB:', stored.fileName);
        const file = new File([stored.data], stored.fileName, { type: stored.fileType });
        
        const quiz1State = await quizDB.value.get('quizState', 'quiz1_state');
        const albumCount = quiz1State?.albumCount || 0;
        
        const type = albumCount > 0 ? 'album' : 'single';
        
        return { file, type };
      }
      
      return null;
    },
    null,
    'files'
  );
};

// Получение всех аудиофайлов из IndexedDB
const getAllAudioFiles = async (): Promise<Array<{ file: File; type: 'single' | 'album'; trackIndex?: number; albumIndex?: number }>> => {
  const files: Array<{ file: File; type: 'single' | 'album'; trackIndex?: number; albumIndex?: number }> = [];
  
  if (!audioDBInitialized.value) {
    console.log('Quiz6: Audio DB not initialized');
    return files;
  }
  
  await safeDBOperation(
    async () => {
      const quiz2State = await quizDB.value.get('quizState', 'quiz2_state');
      
      if (!quiz2State) {
        console.log('Quiz6: No Quiz2 state found');
        return;
      }
      
      console.log('Quiz6: Quiz2 state:', quiz2State);
      
      if (quiz2State.singleTracks && Array.isArray(quiz2State.singleTracks)) {
        for (let i = 0; i < quiz2State.singleTracks.length; i++) {
          const track = quiz2State.singleTracks[i];
          
          if (track.audioFileId) {
            const audioData = await audioDB.value.get('audio', track.audioFileId);
            if (audioData) {
              console.log(`Quiz6: Loaded single file ${i}: ${audioData.fileName}`);
              
              const blob = audioData.data;
              const file = new File([blob], audioData.fileName, { 
                type: audioData.fileType || 'audio/mpeg' 
              });
              
              files.push({ 
                file, 
                type: 'single', 
                trackIndex: i 
              });
            }
          }
        }
      }
      
      if (quiz2State.albums && Array.isArray(quiz2State.albums)) {
        for (let a = 0; a < quiz2State.albums.length; a++) {
          const album = quiz2State.albums[a];
          
          if (album.tracks && Array.isArray(album.tracks)) {
            for (let t = 0; t < album.tracks.length; t++) {
              const track = album.tracks[t];
              
              if (track.audioFileId) {
                const audioData = await audioDB.value.get('audio', track.audioFileId);
                if (audioData) {
                  console.log(`Quiz6: Loaded album ${a} track ${t} file: ${audioData.fileName}`);
                  
                  const blob = audioData.data;
                  const file = new File([blob], audioData.fileName, { 
                    type: audioData.fileType || 'audio/mpeg' 
                  });
                  
                  files.push({ 
                    file, 
                    type: 'album', 
                    albumIndex: a, 
                    trackIndex: t 
                  });
                }
              }
            }
          }
        }
      }
    },
    null,
    'audio'
  );
  
  console.log(`Quiz6: Total audio files loaded: ${files.length}`);
  return files;
};

// Очистка старых номеров перед отправкой
const clearOldNumbers = async (): Promise<void> => {
  await safeDBOperation(
    async () => {
      console.log('Quiz6: Clearing old product numbers...');
      
      const quiz2State = await quizDB.value.get('quizState', 'quiz2_state');
      
      if (!quiz2State) {
        console.log('Quiz6: No Quiz2 state to clear');
        return;
      }
      
      if (quiz2State.singleTracks && Array.isArray(quiz2State.singleTracks)) {
        quiz2State.singleTracks.forEach((track: any) => {
          if (track.product_id) {
            console.log(`Quiz6: Clearing product_id ${track.product_id} from single track`);
            delete track.product_id;
          }
        });
      }
      
      if (quiz2State.albums && Array.isArray(quiz2State.albums)) {
        quiz2State.albums.forEach((album: any) => {
          if (album.tracks && Array.isArray(album.tracks)) {
            album.tracks.forEach((track: any) => {
              if (track.product_id) {
                console.log(`Quiz6: Clearing product_id ${track.product_id} from album track`);
                delete track.product_id;
              }
            });
          }
        });
      }
      
      await quizDB.value.put('quizState', quiz2State);
      console.log('Quiz6: Old product numbers cleared');
    },
    null
  );
};

// Сохранение полученных номеров
const saveProductNumbers = async (uploadedFiles: UploadedFileInfo[]): Promise<void> => {
  await safeDBOperation(
    async () => {
      console.log('Quiz6: Saving product numbers:', uploadedFiles);
      
      const quiz2State = await quizDB.value.get('quizState', 'quiz2_state');
      
      if (!quiz2State) {
        console.log('Quiz6: No Quiz2 state to save numbers');
        return;
      }
      
      let updated = false;
      
      uploadedFiles.forEach((file: UploadedFileInfo) => {
        const fileName = file.file_name;
        const productId = file.product_id;
        const fileType = file.type;
        
        console.log(`Quiz6: Saving product_id ${productId} for ${fileType} file: ${fileName}`);
        
        if (fileType === 'single') {
          // Ищем в синглах
          if (quiz2State.singleTracks && Array.isArray(quiz2State.singleTracks)) {
            const singleTrack = quiz2State.singleTracks.find((track: any) => 
              track.audioFileName === fileName
            );
            
            if (singleTrack) {
              console.log(`Quiz6: Found matching single track, saving product_id ${productId}`);
              singleTrack.product_id = productId;
              updated = true;
            } else {
              console.log(`Quiz6: No matching single track found for file: ${fileName}`);
            }
          }
        } else if (fileType === 'album') {
          // Ищем в альбомах
          if (quiz2State.albums && Array.isArray(quiz2State.albums)) {
            let found = false;
            
            for (const album of quiz2State.albums) {
              if (album.tracks && Array.isArray(album.tracks)) {
                const albumTrack = album.tracks.find((track: any) => 
                  track.audioFileName === fileName
                );
                
                if (albumTrack) {
                  console.log(`Quiz6: Found matching album track, saving product_id ${productId}`);
                  albumTrack.product_id = productId;
                  updated = true;
                  found = true;
                  break;
                }
              }
              
              if (found) break;
            }
            
            if (!found) {
              console.log(`Quiz6: No matching album track found for file: ${fileName}`);
            }
          }
        }
      });
      
      if (updated) {
        // Сохраняем обновленное состояние Quiz2
        await quizDB.value.put('quizState', quiz2State);
        console.log('Quiz6: Product numbers saved successfully to quiz2_state');
      } else {
        console.log('Quiz6: No tracks were updated');
      }
    },
    null
  );
};

// Превращаем технические ошибки загрузки в понятные сообщения для пользователя
const getReadableUploadErrorMessage = (error: any, fileName?: string): string => {
  const cleanName = fileName ? ` "${fileName}"` : '';
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '');
  const serverMessage = String(error?.response?.data?.message || '').toLowerCase();

  if (status === 413 || serverMessage.includes('size') || serverMessage.includes('too large')) {
    return `Файл${cleanName} слишком большой. Уменьшите его размер и попробуйте снова.`;
  }

  if (status === 400 || status === 415 || status === 422) {
    return `Файл${cleanName} не удалось обработать. Возможно, он поврежден. Выберите другой файл и попробуйте снова.`;
  }

  if (status === 429) {
    return 'Слишком много попыток за короткое время. Подождите немного и попробуйте снова.';
  }

  if (status >= 500) {
    return 'Сервис временно недоступен. Попробуйте снова через пару минут.';
  }

  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
    return `Не удалось отправить файл${cleanName}. Проверьте интернет и попробуйте снова.`;
  }

  return `Не удалось загрузить файл${cleanName}. Попробуйте выбрать его заново и отправить еще раз.`;
};

// Превращаем ошибки формирования договора в стабильные сообщения для UI
const getReadableContractErrorMessage = (error: any): string => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '');
  const responseData = error?.response?.data;
  const responseErrorMessage = String(responseData?.error?.message || '').trim();
  const responseMessage = String(responseData?.message || '').trim();

  const formatStatusMessage = (fallbackText: string): string => {
    const message = responseErrorMessage || responseMessage || fallbackText;
    return `Ошибка ${status}: ${message}`;
  };

  if (status >= 500) {
    return formatStatusMessage('сервис перегружен, попробуйте повторить попытку позднее');
  }

  if (status === 429) {
    return formatStatusMessage('слишком много попыток за короткое время. Подождите немного и попробуйте снова.');
  }

  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || !error?.response) {
    return 'Не удалось связаться с сервером. Проверьте интернет-соединение и попробуйте снова.';
  }

  if (status > 0) {
    return formatStatusMessage('ошибка при формировании договора. Попробуйте снова.');
  }

  const localMessage = String(error?.message || '').trim();
  if (localMessage && !localMessage.toLowerCase().includes('request failed with status code')) {
    return localMessage;
  }

  return 'Ошибка при формировании договора. Попробуйте снова.';
};

// Отправка одного аудио файла на сервер через FileRequest
const uploadAudioFile = async (file: File, type: 'single' | 'album', trackIndex?: number, albumIndex?: number): Promise<any> => {
  const formData = new FormData();
  
  formData.append('file', file);
  
  if (type === 'single') {
    formData.append('type', 'single');
    formData.append('track_number', String(trackIndex !== undefined ? trackIndex + 1 : 1));
  } else {
    formData.append('type', 'album');
    formData.append('album_number', String(albumIndex !== undefined ? albumIndex + 1 : 1));
    formData.append('track_number', String(trackIndex !== undefined ? trackIndex + 1 : 1));
  }
  
  const url = type === 'single' 
    ? '/ajax_vue/ajax/quiz/loadSingle.php'
    : '/ajax_vue/ajax/quiz/loadAlbum.php';
  
  try {
    console.log(`Quiz6: Uploading ${type} file via FileRequest:`, file.name);
    
    const response = await FileRequest('post', url, formData);
    
    console.log(`Quiz6: ${type} file response:`, response.data);
    
    return response.data;
  } catch (error) {
    console.error(`Quiz6: Error uploading ${type} file:`, error);
    throw new Error(getReadableUploadErrorMessage(error, file?.name));
  }
};

// Функция для очистки старых данных договора и подписи
const clearOldContractData = async (): Promise<void> => {
  await safeDBOperation(
    async () => {
      console.log('Quiz6: Очистка старых данных договора и подписи...');
      
      // Удаляем состояние Quiz7 (договор и подписи)
      try {
        await quizDB.value.delete('quizState', 'quiz7_state');
        console.log('✅ Quiz7 состояние удалено');
      } catch (e) {
        console.log('Quiz7 состояние не найдено или не удалено');
      }
      
      // Удаляем состояние Quiz8 (финальные данные)
      try {
        await quizDB.value.delete('quizState', 'quiz8_state');
        console.log('✅ Quiz8 состояние удалено');
      } catch (e) {
        console.log('Quiz8 состояние не найдено или не удалено');
      }
      
      // Очищаем данные договора в Quiz6, если они есть
      if (contractData.value) {
        contractData.value = null;
        contractLoadedFromBackend.value = false;
        console.log('✅ contractData в Quiz6 очищен');
      }
      
      // Также очищаем сохраненные данные договора из состояния Quiz6 в БД
      const quiz6State = await quizDB.value.get('quizState', 'quiz6_state');
      if (quiz6State) {
        delete quiz6State.contractData;
        delete quiz6State.contractLoadedFromBackend;
        await quizDB.value.put('quizState', quiz6State);
        console.log('✅ contractData удален из состояния Quiz6 в БД');
      }
      
      console.log('Quiz6: Очистка завершена');
    },
    null
  );
};

// Отправка всех аудиофайлов на сервер
const uploadAllAudioFiles = async (): Promise<UploadedFileInfo[]> => {
  // СНАЧАЛА очищаем старые данные договора
  await clearOldContractData();
  
  const audioFiles = await getAllAudioFiles();
  
  if (audioFiles.length === 0) {
    console.log('Quiz6: No audio files to upload');
    return [];
  }
  
  totalFilesCount.value = audioFiles.length;
  uploadedCount.value = 0;
  uploadingFiles.value = true;
  uploadProgress.value = 0;
  
  console.log(`Quiz6: Starting upload of ${audioFiles.length} audio files`);
  
  await clearOldNumbers();
  
  const uploadedFilesData: UploadedFileInfo[] = [];
  
  try {
    for (let i = 0; i < audioFiles.length; i++) {
      const { file, type, trackIndex, albumIndex } = audioFiles[i];
      
      const response = await uploadAudioFile(file, type, trackIndex, albumIndex);
      
      if (response && response.error === 0) {
        console.log(`Quiz6: Audio file ${i + 1}/${audioFiles.length} uploaded successfully`);
        console.log(`Quiz6: Response for ${type}:`, response);
        
        // Получаем данные из ответа
        if (response.data) {
          const uploadedData = response.data.uploaded;
          
          if (uploadedData) {
            if (type === 'album') {
              // Для альбома - обрабатываем как объект
              console.log('Quiz6: Album upload response (object):', uploadedData);
              
              // Проверяем, есть ли в объекте нужные поля
              if (uploadedData.file_name && uploadedData.product_id) {
                // Создаем объект, соответствующий интерфейсу UploadedFileInfo
                const fileInfo: UploadedFileInfo = {
                  file_name: uploadedData.file_name,
                  product_id: uploadedData.product_id,
                  type: 'album',
                  path: uploadedData.path, // Теперь path существует в интерфейсе
                  track_number: trackIndex !== undefined ? trackIndex + 1 : undefined,
                  album_number: albumIndex !== undefined ? albumIndex + 1 : undefined
                };
                
                uploadedFilesData.push(fileInfo);
                console.log(`Quiz6: Added album file: ${fileInfo.file_name} with product_id: ${fileInfo.product_id}`);
              } else if (Array.isArray(uploadedData)) {
                // Если все-таки массив (на всякий случай)
                uploadedData.forEach((item: any) => {
                  const fileInfo: UploadedFileInfo = {
                    file_name: item.file_name,
                    product_id: item.product_id,
                    type: 'album',
                    path: item.path
                  };
                  uploadedFilesData.push(fileInfo);
                });
                console.log(`Quiz6: Added ${uploadedData.length} album files from array`);
              }
            } else {
              // Для сингла - обрабатываем как массив
              if (Array.isArray(uploadedData)) {
                uploadedData.forEach((item: any) => {
                  const fileInfo: UploadedFileInfo = {
                    file_name: item.file_name,
                    product_id: item.product_id,
                    type: 'single',
                    path: item.path
                  };
                  uploadedFilesData.push(fileInfo);
                });
                console.log(`Quiz6: Added ${uploadedData.length} single files from array`);
              } else if (uploadedData.file_name && uploadedData.product_id) {
                // Если вдруг сингл тоже пришел как объект
                const fileInfo: UploadedFileInfo = {
                  file_name: uploadedData.file_name,
                  product_id: uploadedData.product_id,
                  type: 'single',
                  path: uploadedData.path
                };
                uploadedFilesData.push(fileInfo);
                console.log(`Quiz6: Added single file as object: ${fileInfo.file_name}`);
              }
            }
          }
        }
      } else {
        console.log(`Quiz6: Audio file ${i + 1}/${audioFiles.length} upload returned error:`, response);
      }
      
      uploadedCount.value = i + 1;
      uploadProgress.value = Math.round(((i + 1) / audioFiles.length) * 100);
    }
    
    if (uploadedFilesData.length > 0) {
      console.log('Quiz6: Saving product numbers:', uploadedFilesData);
      await saveProductNumbers(uploadedFilesData);
    } else {
      console.log('Quiz6: No product numbers to save');
    }
    
    console.log('Quiz6: All audio files uploaded successfully');
    return uploadedFilesData;
  } catch (error) {
    console.error('Quiz6: Error during file upload:', error);
    throw error instanceof Error
      ? error
      : new Error('Не удалось отправить файлы. Попробуйте еще раз.');
  } finally {
    uploadingFiles.value = false;
  }
};

// Функция для очистки полей от запрещенных символов
const cleanField = (value: string): string => {
  if (!value) return '';
  return value.replace(/[\/\\&@+=<>\[\]{}|~?*]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Отправка обложки и всех данных в newDock.php
const uploadCoverAndGenerateContract = async (file: File, type: 'single' | 'album'): Promise<ContractData> => {
  // Дополнительно убеждаемся, что старые данные договора не мешают
  if (contractData.value) {
    console.log('Quiz6: Сбрасываем старый contractData перед генерацией нового');
    contractData.value = null;
    contractLoadedFromBackend.value = false;
  }
  
  console.log('========== НАЧАЛО ОТПРАВКИ В newDock.php ==========');
  
  const formDataToSend = new FormData();
  
  console.log('Загружаем данные из IndexedDB...');
  const quiz1State = await quizDB.value.get('quizState', 'quiz1_state');
  const quiz2State = await quizDB.value.get('quizState', 'quiz2_state');
  const quiz3State = await quizDB.value.get('quizState', 'quiz3_state');
  const quiz4State = await quizDB.value.get('quizState', 'quiz4_state');
  const quiz5State = await quizDB.value.get('quizState', 'quiz5_state');
  
  console.log('✅ Quiz1 state загружен:', !!quiz1State);
  console.log('✅ Quiz2 state загружен:', !!quiz2State);
  console.log('✅ Quiz3 state загружен:', !!quiz3State);
  console.log('✅ Quiz4 state загружен:', !!quiz4State);
  console.log('✅ Quiz5 state загружен:', !!quiz5State);
  
  // --- Данные из Quiz1 ---
  if (quiz1State) {
    console.log('📝 Добавляем данные Quiz1:');
    formDataToSend.append('check-single', quiz1State.singleCount > 0 ? 'on' : 'off');
    formDataToSend.append('check-album', quiz1State.albumCount > 0 ? 'on' : 'off');
    formDataToSend.append('check-klip', quiz1State.clipCount > 0 ? 'on' : 'off');
    formDataToSend.append('check-karta', quiz1State.cardCount > 0 ? 'on' : 'off');
    formDataToSend.append('countSingle', String(quiz1State.singleCount || 0));
    formDataToSend.append('countAlbum', String(quiz1State.albumCount || 0));
  }

  // --- Данные из Quiz2 (СИНГЛЫ) ---
  if (quiz2State?.singleTracks && quiz2State.singleTracks.length > 0) {
    console.log(`📝 Добавляем данные Quiz2 - синглы (${quiz2State.singleTracks.length} шт):`);
    quiz2State.singleTracks.forEach((track: any, index: number) => {
      if (track.product_id) {
        // Используем только ключи для СИНГЛОВ
        formDataToSend.append('trackID[]', track.product_id);
        formDataToSend.append(`path-file[${track.product_id}]`, track.audioFileName || '');
        formDataToSend.append(`name-file[${track.product_id}]`, track.audioFileName || '');
        formDataToSend.append(`artist[${track.product_id}]`, cleanField(track.performerName || ''));
        formDataToSend.append(`autor-music[${track.product_id}]`, cleanField(track.musicAuthor || ''));
        formDataToSend.append(`autor-words[${track.product_id}]`, cleanField(track.textAuthor || ''));
        formDataToSend.append(
          `autor-files[${track.product_id}]`,
          cleanField(track.trackName || track.performerName || ''),
        );
        console.log(`  - Трек ${index + 1}: ID=${track.product_id}, Name=${track.audioFileName}`);
      }
    });
  }

  // --- Данные из Quiz2 (АЛЬБОМЫ) ---
  if (quiz2State?.albums && quiz2State.albums.length > 0) {
    console.log(`📝 Добавляем данные Quiz2 - альбомы (${quiz2State.albums.length} шт):`);
    quiz2State.albums.forEach((album: any, albumIndex: number) => {
      if (album.tracks && album.tracks.length > 0) {
        console.log(`  Альбом ${albumIndex + 1}: ${album.tracks.length} треков`);
        album.tracks.forEach((track: any, trackIndex: number) => {
          if (track.product_id) {
            // Используем только ключи для АЛЬБОМОВ
            formDataToSend.append('albumID[]', track.product_id);
            formDataToSend.append(`path-file-album[${track.product_id}]`, track.audioFileName || '');
            formDataToSend.append(`name-file-album[${track.product_id}]`, track.audioFileName || '');
            formDataToSend.append(`artist-album[${track.product_id}]`, cleanField(track.performerName || ''));
            formDataToSend.append(`autor-music-album[${track.product_id}]`, cleanField(track.musicAuthor || ''));
            formDataToSend.append(`autor-words-album[${track.product_id}]`, cleanField(track.textAuthor || ''));
            formDataToSend.append(`autor-files-album[${track.product_id}]`, cleanField(track.trackName || ''));
            console.log(`    Трек ${trackIndex + 1}: ID=${track.product_id}, Name=${track.audioFileName}`);
          }
        });
      }
    });
  }
  
  // --- Данные из Quiz3 ---
  if (quiz3State?.formData) {
    const f = quiz3State.formData;
    console.log('📝 Добавляем данные Quiz3:');
    console.log('  - alias (псевдоним):', f.performerName);
    console.log('  - name-relize (название):', f.releaseName);

    const plat = Array.isArray(f.platforms) ? f.platforms[0] : f.platforms;
    const otherPl = String(f.otherPlatform || '');
    const isOtherPlatform = plat === 'other';
    const sk = isOtherPlatform ? '4' : '1';
    const ok = isOtherPlatform ? otherPl : '';

    const matQuiz3 = f.hasProfanity === 'yes' ? '12' : '13';
    
    formDataToSend.append('alias', cleanField(f.performerName || ''));
    formDataToSend.append('name-relize', cleanField(f.releaseName || ''));
    formDataToSend.append('kuda-reliz1', sk);
    formDataToSend.append('kuda-reliz', sk);
    formDataToSend.append('others-kuda', ok);
    formDataToSend.append('calendar-reliz', f.releaseDate || '');
    formDataToSend.append('mat1', matQuiz3);
    formDataToSend.append('mat', matQuiz3);
    formDataToSend.append('others-mat', f.profanityTracks || '');
    formDataToSend.append('mat1ai', '13');
    formDataToSend.append('matai', '13');
    formDataToSend.append('others-matai', '');
    formDataToSend.append('all-obl', '1');
    formDataToSend.append('vk', f.vkLink || '');
    formDataToSend.append('email-clear', f.email || '');
    
    // Эти поля, вероятно, для альбомов, но оставим их здесь, т.к. бэкенд может их игнорировать, если нет альбомов
    formDataToSend.append('alias-album', cleanField(f.performerName || ''));
    formDataToSend.append('name-relize-album', cleanField(f.releaseName || 'Альбом'));
    formDataToSend.append('kuda-reliz-album1', sk);
    formDataToSend.append('kuda-reliz-album', sk);
    formDataToSend.append('others-kuda-album', ok);
    formDataToSend.append('calendar-reliz-album', f.releaseDate || '');
    formDataToSend.append('mat-album1', matQuiz3);
    formDataToSend.append('mat-album', matQuiz3);
    formDataToSend.append('others-mat-album', f.profanityTracks || '');
    formDataToSend.append('mat-album1ai', '13');
    formDataToSend.append('mat-albumai', '13');
    formDataToSend.append('others-matai-album', '');
    formDataToSend.append('vk-album', f.vkLink || '');
    formDataToSend.append('email-clear-album', f.email || '');
  }
  
  // --- Данные из Quiz4 ---
  if (quiz4State?.formData) {
    const u = quiz4State.formData;
    console.log('📝 Добавляем данные Quiz4:');
    
    formDataToSend.append('citysenship1', '');
    formDataToSend.append('citysenship', u.userType === 'individual' ? 'Физическое лицо' : 'Индивидуальный предприниматель');
    formDataToSend.append(
      'select__fizurlico',
      u.userType === 'entrepreneur' ? 'urlico' : 'fizlico',
    );
    formDataToSend.append('others', '');
    const le = cleanField(u.legalAddress || '');
    const bi = u.bankInn || '';
    const cr = u.correspondentAccount || '';
    formDataToSend.append('yur-arg-org', le);
    formDataToSend.append('yur_arg_org', le);
    formDataToSend.append('inn', u.inn || '');
    formDataToSend.append('ogrn', u.ogrn || '');
    formDataToSend.append('rasy', u.accountNumber || '');
    formDataToSend.append('bank', cleanField(u.bankName || ''));
    formDataToSend.append('inn-bank', bi);
    formDataToSend.append('inn_bank', bi);
    formDataToSend.append('bik', u.bankBik || '');
    formDataToSend.append('kor-s', cr);
    formDataToSend.append('kor_s', cr);
    /** Шаблон договора / dogovorOrder всё ещё требуют непустое «ЮРИДИЧЕСКИЙ АДРЕС БАНКА»; отдельного поля в UI нет — подставляем наименование банка. */
    const bankLegalForDock =
      u.userType === 'entrepreneur' ? cleanField(u.bankName || '') : '';
    formDataToSend.append('yur-adr-bank', bankLegalForDock);
    formDataToSend.append('yur_adr_bank', bankLegalForDock);
    if (u.userType === 'entrepreneur') {
      formDataToSend.append('fio-ip', cleanField(u.entrepreneurFullName || ''));
      formDataToSend.append('email-ip', cleanField(u.entrepreneurEmail || ''));
    }
    
    const formatCitizenship = (citizenship?: string, other?: string): string => {
      if (!citizenship) return '';
      if (citizenship === 'RU') return 'Российская Федерация';
      if (citizenship === 'other') return other || '';
      return citizenship;
    };
    
    const formatDateForAPI = (dateString?: string): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return dateString;
      }
    };
    
    formDataToSend.append('citysenship1', '');
    formDataToSend.append('citysenship', formatCitizenship(u.citizenship, u.otherCitizenship));
    formDataToSend.append('others', '');
    formDataToSend.append('FAM', cleanField(u.lastName || ''));
    formDataToSend.append('IMYA', cleanField(u.firstName || ''));
    formDataToSend.append('OTCH', cleanField(u.middleName || ''));
    formDataToSend.append('passport', u.passportNumber || '');
    formDataToSend.append('who-doing', cleanField(u.passportIssuedBy || ''));
    formDataToSend.append('kemvidan', '');
    formDataToSend.append('when-doing', formatDateForAPI(u.passportIssueDate) || '22/22/2222');
    formDataToSend.append('adress', cleanField(u.registrationAddress || ''));
  }
  
  // --- Данные из Quiz5 ---
  if (quiz5State?.formData) {
    const g = quiz5State.formData;
    console.log('📝 Добавляем данные Quiz5:');
    
    formDataToSend.append('genre', cleanField(g.genre || ''));
    formDataToSend.append('time-play', g.tiktokStartSeconds || '');
    formDataToSend.append('nark', g.hasDrugsMention === 'yes' ? '12' : '13');
    formDataToSend.append('narc', g.hasDrugsMention === 'yes' ? '12' : '13');
    formDataToSend.append('others-narc', g.drugsTracks || '');
    formDataToSend.append('apple', g.appleMusicLinks || '');
    formDataToSend.append('spotify', g.spotifyLinks || '');
    formDataToSend.append('link-apple', g.appleMusicLinks || '');
    formDataToSend.append('link-spotify', g.spotifyLinks || '');
    formDataToSend.append('link-vk', g.vkLinks || '');
    formDataToSend.append('link-yandex', g.yandexMusicLinks || '');
    formDataToSend.append('socialartist', g.socialLinks || '');
  }
  
  // --- Данные из Quiz6 (текущий шаг) ---
  console.log('📝 Добавляем данные Quiz6:');
  formDataToSend.append('otkuda-uznali1', formData.platforms[0] || '');
  // formDataToSend.append('otkuda-uznali', formData.platforms[0] || '');
  // Отправляем все выбранные варианты одной строкой через запятую
  const otkudaString = formData.platforms.join(', ');
  formDataToSend.append('otkuda-uznali', otkudaString);
  formDataToSend.append('others-otkuda', formData.otherPlatform || '');
  formDataToSend.append(
    'instrumentals',
    buildInstrumentalsFromQuiz2(quiz2State),
  );
  formDataToSend.append('comments', formData.additionalComments || '');
  formDataToSend.append('plan', formData.promoPlan || '');
  formDataToSend.append('link-bandlink', formData.bandlinkUrl || '');
  formDataToSend.append('promocode', formData.promoCode || '');
  let promosumNewdock = '';
  if (promoDiscount.value > 0 && promoDiscount.value < 100) {
    const after = Math.floor(orderTotalAfterPromo.value || 0);
    const approxBefore = Math.round((after * 100) / (100 - promoDiscount.value));
    promosumNewdock = String(Math.max(0, approxBefore - after));
  }
  formDataToSend.append('promosum', promosumNewdock);
  formDataToSend.append('sumOrder', String(finalAmount.value || 0));
  formDataToSend.append('policy', formData.confirmNoRightsViolation ? 'on' : 'off');
  
  // --- Прикрепляем файл обложки ---
  if (type === 'album') {
    formDataToSend.append('file-obl-album', file);
    console.log('🖼️ Добавлена обложка как file-obl-album:', file.name);
  } else {
    // Для синглов, даже если их несколько, обложка одна для всех
    const singleCount = quiz1State?.singleCount || 0;
    for (let i = 1; i <= singleCount; i++) {
      formDataToSend.append(`file-obl${i}`, file);
    }
    console.log(`🖼️ Добавлена обложка как file-obl1 - file-obl${singleCount}:`, file.name);
  }
  
  console.log('📦 ПОЛНОЕ СОДЕРЖИМОЕ FormData:');
  let fieldCount = 0;
  for (const pair of (formDataToSend as any).entries()) {
    fieldCount++;
    if (pair[1] instanceof File) {
      console.log(`  [${fieldCount}] ${pair[0]}: [ФАЙЛ] ${pair[1].name} (${pair[1].size} bytes)`);
    } else {
      console.log(`  [${fieldCount}] ${pair[0]}: ${pair[1]}`);
    }
  }
  console.log(`📊 Всего полей в FormData: ${fieldCount}`);
  console.log('=================================================');
  
  try {
    console.log('🚀 Отправляем запрос в newDock.php...');
    const response = await FileRequest('post', '/ajax_vue/ajax/newDock.php', formDataToSend);
    console.log('✅ Ответ сервера:', response.data);
    
    if (response.data && response.data.error === 0 && response.data.data) {
      const data = response.data.data;
      
      if (data.doc_pdf && data.doc_docx && Array.isArray(data.images)) {
        const contract = {
          doc_pdf: data.doc_pdf,
          doc_docx: data.doc_docx,
          images: data.images,
          element_id: String(data.element_id || data.id || ''),
        };
        
        contractData.value = contract;
        contractLoadedFromBackend.value = true; // Это новый договор, а не из бэка
        
        // Явно сохраняем contractData в состояние Quiz6
        const quiz6State = await quizDB.value.get('quizState', 'quiz6_state') || { id: 'quiz6_state' };
        quiz6State.contractData = contract;
        quiz6State.contractLoadedFromBackend = true;
        await quizDB.value.put('quizState', quiz6State);
        
        return contract;
      } else {
        throw new Error('Неполные данные в ответе сервера');
      }
    } else {
      throw new Error(response.data?.message || 'Ошибка генерации договора');
    }
  } catch (error) {
    console.error('❌ Ошибка в uploadCoverAndGenerateContract:', error);
    throw error;
  }
};

const goBack = () => {
  emit('go-back');
};

const handleContinue = async () => {
  const formValid = validateForm();
  
  if (!formValid) {
    ElMessage.warning('Пожалуйста, заполните все обязательные поля корректно');
    return;
  }
  
  if (finalAmount.value < 1) {
    ElMessage.warning('Сумма к оплате не может быть меньше 1');
    return;
  }
  
  try {
    ElMessage.info('Начинаем отправку аудиофайлов на сервер...');
    const uploadedFiles = await uploadAllAudioFiles();
    
    if (uploadedFiles.length === 0) {
      ElMessage.error('Не удалось загрузить аудиофайлы на сервер');
      return;
    }
    
    const coverFile = await getCoverFile();
    
    if (!coverFile) {
      ElMessage.error('Обложка не найдена');
      return;
    }
    
    ElMessage.info('Генерируем договор...');
    isGeneratingContract.value = true;
    
    const contract = await uploadCoverAndGenerateContract(coverFile.file, coverFile.type);
    
    await saveStateToDB();
    
    ElMessage.success('Договор успешно сгенерирован!');
    emit('go-next', contract);
    
  } catch (error: any) {
    console.error('Quiz6: Error in handleContinue:', error);
    ElMessage.error(getReadableContractErrorMessage(error));
  } finally {
    isGeneratingContract.value = false;
  }
};

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

watch(() => formData.platforms, () => { if (dataLoaded.value) debouncedSave(); }, { deep: true });
watch(() => formData.otherPlatform, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.additionalComments, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.promoPlan, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.bandlinkUrl, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.promoCode, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.usePartnerBonuses, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.usedBonuses, () => { if (dataLoaded.value) debouncedSave(); });
watch(() => formData.confirmNoRightsViolation, () => { if (dataLoaded.value) debouncedSave(); });

watch(() => formData.platforms, async (newPlatforms) => {
  if (!newPlatforms.includes('other')) {
    formData.otherPlatform = '';
    errors.otherPlatform = '';
  }
  if (dataLoaded.value) debouncedSave();
}, { deep: true });

watch([originalTotalAmount, promoDiscount], () => {
  if (!dataLoaded.value) return;
  if (formData.usedBonuses > maxBonuses.value) {
    formData.usedBonuses = maxBonuses.value;
    validateField('usedBonuses');
  }
});

watch(() => formData.usedBonuses, (newValue, oldValue) => {
  if (dataLoaded.value && newValue !== oldValue) {
    if (newValue > maxBonuses.value) {
      formData.usedBonuses = maxBonuses.value;
    } else if (newValue < 0) {
      formData.usedBonuses = 0;
    }
    validateField('usedBonuses');
  }
});

onMounted(async () => {
  await loadInitialData();
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
  if (promoDebounceTimer) {
    clearTimeout(promoDebounceTimer);
  }
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  &_sum {
    display: flex;
    align-items: center;
    gap: 15px;

    &_container{
      display: flex;
      flex-direction: column;
    }
    &_text {
      font-weight: 400;
      font-size: 16px;
      line-height: 140%;
      color: #131313;
    }
    &_bonus {
      display: flex;
      align-items: center;
      gap: 10px;
      &_text {
        font-weight: 400;
        font-size: 14px;
        line-height: 140%;
        color: #85858E;
      }
      &_total {
        font-weight: 400;
        font-size: 14px;
        line-height: 140%;
        color: #85858E;
      }
    }

  }

  &_total_wrapper {
    display: flex;
    flex-direction: column;
  }

  &_price_container {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;

    @media (max-width: 767px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }
  }

  &_total {
    display: flex;
    color: var(--color);
    transform: translateY(-2.5px);
  }

  &_original_price_strikethrough {
    display: flex;
    color: var(--text-gray);
    font-size: 18px;
    text-decoration: line-through;
    opacity: 0.7;
  }

  &_discount_info {
    color: #67c23a;
    font-size: 12px;
    margin-top: 2px;
  }

  &_error_price {
    color: #f56c6c;
    font-size: 12px;
    margin-top: 2px;
  }

  &_loading {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 16px;
  }

  &_contract_loading {
    position: relative;
    margin: 20px 0 30px;
    padding: 30px;
    background-color: var(--bg-color);
    border-radius: 8px;
    text-align: center;
  }
}

.form__checkbox_group {
  .el-checkbox {
    display: flex;
    min-height: auto;
    align-items: center;
    gap: 10px;
    color: var(--text-gray);
  }
}

.form__group {
  .form__checkbox_group .el-checkbox {
    padding: 10px 0 0;
  }
}

.error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}

.warning {
  color: #e6a23c;
  font-size: 12px;
  margin-top: 5px;
}

.form__group_inner {
  margin-top: 15px;
}

.form__bonus_input {
  display: flex;
  align-items: center;
  gap: 15px;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

.form__promo_input {
  display: flex;
  align-items: center;
  gap: 15px;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}

.form__bonus_hint {
  color: var(--text-gray);
  font-size: 14px;
}

.promo_loading {
  color: var(--text-gray);
  font-size: 14px;
}

.promo_discount_info {
  color: #67c23a;
  font-size: 14px;
  margin-top: 5px;
}

.upload_progress {
  margin: 20px 0;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
  text-align: center;

  &_bar {
    width: 100%;
    height: 20px;
    background-color: #e4e7ed;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;

    &_fill {
      height: 100%;
      background-color: var(--color);
      transition: width 0.3s ease;
    }
  }

  &_count {
    color: #909399;
    font-size: 14px;
  }
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

.blur-content {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
</style>