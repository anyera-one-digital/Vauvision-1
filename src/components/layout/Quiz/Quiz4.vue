<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElInput, ElMessage, ElSelect, ElOption, ElDatePicker } from 'element-plus';
import { sendRequest } from '@/utils/api';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import dayjs from 'dayjs';
import { openDB } from 'idb';

const emit = defineEmits<{
  'go-back': [];
  'go-next': [];
}>();

// Ключи для хранения
const STORAGE_KEY = 'quiz4_state';
const DB_NAME = 'quizDB';
const DB_VERSION = 2; // Увеличиваем версию до 2

// Состояние загрузки данных
const isLoading = ref(true);
const dataLoaded = ref(false);
const quizDB = ref<any>(null);
const dbInitialized = ref(false);

const otherCitizenshipInputRef = ref<InstanceType<typeof ElInput> | null>(null);

// Данные формы
const formData = reactive({
  userType: 'individual',
  
  // Поля для ИП
  legalAddress: '',
  inn: '',
  ogrn: '',
  accountNumber: '',
  bankName: '',
  bankInn: '',
  bankBik: '',
  correspondentAccount: '',
  bankLegalAddress: '',
  
  // Общие поля
  citizenship: '',
  otherCitizenship: '',
  lastName: '',
  firstName: '',
  middleName: '',
  passportNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  registrationAddress: ''
});

// Ошибки валидации
const errors = reactive({
  userType: '',
  legalAddress: '',
  inn: '',
  ogrn: '',
  accountNumber: '',
  bankName: '',
  bankInn: '',
  bankBik: '',
  correspondentAccount: '',
  bankLegalAddress: '',
  citizenship: '',
  otherCitizenship: '',
  lastName: '',
  firstName: '',
  middleName: '',
  passportNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  registrationAddress: ''
});

// Опции для гражданства
const citizenshipOptions = [
  { label: 'Российская Федерация', value: 'RU' },
  { label: 'Другое', value: 'other' }
];

// Таймер для debounce сохранения
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz4: Initializing IndexedDB...');
    
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz4: Upgrading DB from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('quizState')) {
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz4: Created quizState store');
        }
      },
    });
    
    dbInitialized.value = true;
    console.log('Quiz4: IndexedDB initialized successfully');
    
  } catch (error) {
    console.error('Quiz4: Error initializing IndexedDB:', error);
    dbInitialized.value = false;
  }
};

// Безопасное выполнение операций с БД
const safeDBOperation = async <T>(
  operation: () => Promise<T>, 
  fallback: T
): Promise<T> => {
  if (!dbInitialized.value || !quizDB.value) {
    console.log('Quiz4: DB not initialized');
    return fallback;
  }
  
  try {
    if (!quizDB.value.objectStoreNames || !quizDB.value.objectStoreNames.contains('quizState')) {
      console.log('Quiz4: Store quizState not found');
      return fallback;
    }
    
    return await operation();
  } catch (error) {
    console.error('Quiz4: Error in DB operation:', error);
    return fallback;
  }
};

// Сохранение состояния в IndexedDB
const saveStateToDB = async () => {
  // Не сохраняем во время загрузки или если данные еще не загружены
  if (isLoading.value || !dataLoaded.value || !dbInitialized.value) {
    return;
  }
  
  await safeDBOperation(
    async () => {
      const stateToSave = {
        id: STORAGE_KEY,
        formData: { 
          userType: formData.userType,
          legalAddress: formData.legalAddress,
          inn: formData.inn,
          ogrn: formData.ogrn,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          bankInn: formData.bankInn,
          bankBik: formData.bankBik,
          correspondentAccount: formData.correspondentAccount,
          bankLegalAddress: formData.bankLegalAddress,
          citizenship: formData.citizenship,
          otherCitizenship: formData.otherCitizenship,
          lastName: formData.lastName,
          firstName: formData.firstName,
          middleName: formData.middleName,
          passportNumber: formData.passportNumber,
          passportIssuedBy: formData.passportIssuedBy,
          passportIssueDate: formData.passportIssueDate,
          registrationAddress: formData.registrationAddress
        },
        timestamp: Date.now()
      };
      
      await quizDB.value.put('quizState', stateToSave);
      console.log('✅ Quiz4 state saved to IndexedDB');
      
      // Отправляем событие об обновлении данных для QuizMenu
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  if (!dbInitialized.value) {
    console.log('Quiz4: DB not initialized, skipping load');
    return;
  }
  
  await safeDBOperation(
    async () => {
      const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
      if (savedState) {
        console.log('📥 Loading Quiz4 from IndexedDB:', savedState);
        
        // Восстанавливаем основные данные формы
        if (savedState.formData) {
          // Явно восстанавливаем каждое поле, включая userType
          formData.userType = savedState.formData.userType || 'individual';
          formData.legalAddress = savedState.formData.legalAddress || '';
          formData.inn = savedState.formData.inn || '';
          formData.ogrn = savedState.formData.ogrn || '';
          formData.accountNumber = savedState.formData.accountNumber || '';
          formData.bankName = savedState.formData.bankName || '';
          formData.bankInn = savedState.formData.bankInn || '';
          formData.bankBik = savedState.formData.bankBik || '';
          formData.correspondentAccount = savedState.formData.correspondentAccount || '';
          formData.bankLegalAddress = savedState.formData.bankLegalAddress || '';
          formData.citizenship = savedState.formData.citizenship || '';
          formData.otherCitizenship = savedState.formData.otherCitizenship || '';
          formData.lastName = savedState.formData.lastName || '';
          formData.firstName = savedState.formData.firstName || '';
          formData.middleName = savedState.formData.middleName || '';
          formData.passportNumber = savedState.formData.passportNumber || '';
          formData.passportIssuedBy = savedState.formData.passportIssuedBy || '';
          formData.passportIssueDate = savedState.formData.passportIssueDate || '';
          formData.registrationAddress = savedState.formData.registrationAddress || '';
        }
        
        console.log('✅ Restored userType:', formData.userType);
      }
    },
    null
  );
};

// Загрузка данных пользователя из API
const loadUserData = async () => {
  try {
    console.log('Quiz4: Loading user data from API...');
    
    // Используем тот же эндпоинт, что и в Quiz1 и Quiz3
    const response = await sendRequest("post", '/ajax_vue/ajax/getDataForm.php', {});
    console.log('Quiz4: getDataForm response:', response.data);
    
    const data = response.data as any;
    const user = data.user || {};
    
    console.log('Quiz4: User data received:', user);
    
    // Заполняем ФИО (только если поля пустые)
    if (user.uf_fam && !formData.lastName) {
      formData.lastName = user.uf_fam;
      console.log('✅ Loaded last name:', user.uf_fam);
    }
    
    if (user.uf_imya && !formData.firstName) {
      formData.firstName = user.uf_imya;
      console.log('✅ Loaded first name:', user.uf_imya);
    }
    
    if (user.uf_otch && !formData.middleName) {
      formData.middleName = user.uf_otch;
      console.log('✅ Loaded middle name:', user.uf_otch);
    }
    
    // Альтернативные поля ФИО
    if (user.last_name && !formData.lastName) {
      formData.lastName = user.last_name;
    }
    
    if (user.name && !formData.firstName) {
      formData.firstName = user.name;
    }
    
    // Гражданство (только если поле пустое)
    if (user.uf_grazhdanstvo && !formData.citizenship) {
      const citizenship = user.uf_grazhdanstvo;
      console.log('Quiz4: Citizenship from API:', citizenship);
      
      if (citizenship === 'Российская Федерация' || citizenship === 'РФ' || citizenship === 'Russia') {
        formData.citizenship = 'RU';
      } else if (citizenship === 'Другое') {
        formData.citizenship = 'other';
        formData.otherCitizenship = '';
      } else {
        formData.citizenship = 'other';
        formData.otherCitizenship = citizenship;
      }
    }
    
    // Паспортные данные (только если поля пустые)
    if (user.uf_seriya && !formData.passportNumber) {
      // Убираем пробелы из серии паспорта
      formData.passportNumber = user.uf_seriya.replace(/\s/g, '');
      console.log('✅ Loaded passport number:', formData.passportNumber);
    }
    
    if (user.uf_vydan && !formData.passportIssuedBy) {
      formData.passportIssuedBy = user.uf_vydan;
      console.log('✅ Loaded passport issued by');
    }
    
    if (user.uf_data && !formData.passportIssueDate) {
      const dateParts = user.uf_data.split('.');
      if (dateParts.length === 3) {
        formData.passportIssueDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        console.log('✅ Loaded passport issue date:', formData.passportIssueDate);
      }
    }
    
    if (user.uf_address && !formData.registrationAddress) {
      formData.registrationAddress = user.uf_address;
      console.log('✅ Loaded registration address');
    }

    const str = (v: unknown) => (v == null ? '' : String(v).trim());

    /** Тип реквизитов в профиле: физлицо / ИП / неизвестно */
    const resolveProfileBankType = (): 'individual' | 'entrepreneur' | null => {
      const lic = Number(user.uf_lico);
      if (lic === 2) return 'entrepreneur';
      if (lic === 1) return 'individual';
      const hasIp =
        str(user.uf_fioip) ||
        str(user.uf_rsip) ||
        str(user.uf_bikip) ||
        str(user.uf_addressip);
      const hasFiz =
        str(user.uf_fiofiz) && str(user.uf_rs) && str(user.uf_bik);
      if (hasIp) return 'entrepreneur';
      if (hasFiz) return 'individual';
      return null;
    };

    const profileBankType = resolveProfileBankType();

    const clearEntrepreneurOnlyFields = () => {
      formData.legalAddress = '';
      formData.inn = '';
      formData.ogrn = '';
      formData.accountNumber = '';
      formData.bankName = '';
      formData.bankInn = '';
      formData.bankBik = '';
      formData.correspondentAccount = '';
      formData.bankLegalAddress = '';
    };

    if (profileBankType === 'individual') {
      formData.userType = 'individual';
      clearEntrepreneurOnlyFields();
    } else if (profileBankType === 'entrepreneur') {
      formData.userType = 'entrepreneur';
      const digits = (v: unknown) => str(v).replace(/\s/g, '');

      if (Number(user.uf_lico) === 2) {
        formData.legalAddress = str(user.uf_addressip);
        formData.inn = str(user.uf_inn);
        formData.ogrn = str(user.uf_ogrn);
        formData.accountNumber = digits(user.uf_rsip);
        formData.bankBik = digits(user.uf_bikip);
        formData.correspondentAccount = digits(user.uf_korr);
        console.log('✅ Реквизиты ИП синхронизированы с профилем (UF_LICO=2)');
      } else {
        const setIf = (key: keyof typeof formData, raw: unknown, strip = false) => {
          let t = str(raw);
          if (strip && t) t = t.replace(/\s/g, '');
          if (t) (formData as Record<string, string>)[key] = t;
        };
        setIf('legalAddress', user.uf_addressip);
        setIf('inn', user.uf_inn);
        setIf('ogrn', user.uf_ogrn);
        setIf('accountNumber', user.uf_rsip, true);
        setIf('bankBik', user.uf_bikip, true);
        setIf('correspondentAccount', user.uf_korr, true);
        console.log('✅ Подставлены реквизиты ИП из профиля');
      }
    }

  } catch (error) {
    console.error('Quiz4: Ошибка загрузки данных пользователя:', error);
  }
};

// Вычисляемое свойство для проверки готовности к продолжению
const isReadyForNextStep = computed(() => {
  if (!formData.userType) return false;
  if (!formData.citizenship) return false;
  if (!formData.lastName?.trim()) return false;
  if (!formData.firstName?.trim()) return false;
  if (!formData.middleName?.trim()) return false;
  if (!formData.passportNumber?.trim()) return false;
  if (!formData.passportIssuedBy?.trim()) return false;
  if (!formData.passportIssueDate) return false;
  if (!formData.registrationAddress?.trim()) return false;
  
  if (formData.citizenship === 'other' && !formData.otherCitizenship?.trim()) {
    return false;
  }
  
  if (formData.userType === 'entrepreneur') {
    if (!formData.legalAddress?.trim()) return false;
    if (!formData.inn?.trim()) return false;
    if (!formData.ogrn?.trim()) return false;
    if (!formData.accountNumber?.trim()) return false;
    if (!formData.bankName?.trim()) return false;
    if (!formData.bankInn?.trim()) return false;
    if (!formData.bankBik?.trim()) return false;
    if (!formData.correspondentAccount?.trim()) return false;
    if (!formData.bankLegalAddress?.trim()) return false;
  }
  
  return true;
});

// Валидация
const validateINN = (inn: string): boolean => /^\d{12}$/.test(inn);
const validateOGRN = (ogrn: string): boolean => /^\d{15}$/.test(ogrn);
const validateBIK = (bik: string): boolean => /^\d{9}$/.test(bik);
const validateAccountNumber = (account: string): boolean => /^\d{20}$/.test(account);
const validatePassportNumber = (passport: string): boolean => /^\d{10}$/.test(passport.replace(/\s/g, ''));

const validateField = (fieldName: keyof typeof errors) => {
  const value = formData[fieldName as keyof typeof formData] as string;
  errors[fieldName] = '';
  
  if (!value?.trim()) {
    errors[fieldName] = 'Это поле обязательно для заполнения';
    return false;
  }
  
  switch (fieldName) {
    case 'inn':
      if (!validateINN(value)) errors.inn = 'ИНН должен состоять из 12 цифр';
      break;
    case 'ogrn':
      if (!validateOGRN(value)) errors.ogrn = 'ОГРН должен состоять из 15 цифр';
      break;
    case 'bankBik':
      if (!validateBIK(value)) errors.bankBik = 'БИК должен состоять из 9 цифр';
      break;
    case 'accountNumber':
    case 'correspondentAccount':
      if (!validateAccountNumber(value)) errors[fieldName] = 'Счет должен состоять из 20 цифр';
      break;
    case 'passportNumber':
      if (!validatePassportNumber(value)) errors.passportNumber = 'Серия и номер должны состоять из 10 цифр';
      break;
    case 'passportIssueDate':
      if (dayjs(value).isAfter(dayjs())) errors.passportIssueDate = 'Дата выдачи не может быть в будущем';
      break;
    case 'lastName':
    case 'firstName':
    case 'middleName':
    case 'otherCitizenship':
      if (value.trim().length < 2) errors[fieldName] = 'Минимум 2 символа';
      break;
  }
  
  return !errors[fieldName];
};

const validateForm = (): boolean => {
  let isValid = true;
  Object.keys(errors).forEach(key => errors[key as keyof typeof errors] = '');
  
  if (!formData.userType) {
    errors.userType = 'Выберите тип лица';
    isValid = false;
  }
  
  const fieldsToValidate: (keyof typeof errors)[] = [
    'citizenship', 'lastName', 'firstName', 'middleName',
    'passportNumber', 'passportIssuedBy', 'passportIssueDate', 'registrationAddress'
  ];
  
  if (formData.citizenship === 'other') fieldsToValidate.push('otherCitizenship');
  
  if (formData.userType === 'entrepreneur') {
    fieldsToValidate.push(
      'legalAddress', 'inn', 'ogrn', 'accountNumber', 'bankName',
      'bankInn', 'bankBik', 'correspondentAccount', 'bankLegalAddress'
    );
  }
  
  fieldsToValidate.forEach(field => {
    if (!validateField(field)) isValid = false;
  });
  
  return isValid;
};

const handleUserTypeChange = () => {
  errors.userType = '';
  if (formData.userType !== 'entrepreneur') {
    formData.legalAddress = '';
    formData.inn = '';
    formData.ogrn = '';
    formData.accountNumber = '';
    formData.bankName = '';
    formData.bankInn = '';
    formData.bankBik = '';
    formData.correspondentAccount = '';
    formData.bankLegalAddress = '';
  }
  if (dataLoaded.value) debouncedSave();
};

const handleCitizenshipChange = () => {
  errors.citizenship = '';
  if (formData.citizenship === 'other') {
    nextTick(() => {
      otherCitizenshipInputRef.value?.focus?.();
    });
  }
};

const goBack = () => emit('go-back');

const goNext = async () => {
  if (validateForm()) {
    // Сохраняем состояние перед переходом
    await saveStateToDB();
    emit('go-next');
  } else {
    ElMessage.error('Пожалуйста, заполните все обязательные поля правильно');
  }
};

const debouncedSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (dataLoaded.value && dbInitialized.value) saveStateToDB();
  }, 500);
};

// Отдельные watchers для критических полей
watch(() => formData.userType, (newVal) => {
  if (dataLoaded.value) {
    console.log('userType changed to:', newVal);
    debouncedSave();
  }
});

watch(
  () => formData.citizenship,
  (newVal) => {
    if (newVal !== 'other') {
      formData.otherCitizenship = '';
      errors.otherCitizenship = '';
    }
    if (dataLoaded.value) debouncedSave();
  }
);

watch(() => formData.lastName, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.firstName, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.middleName, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.passportNumber, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.passportIssuedBy, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.passportIssueDate, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.registrationAddress, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.otherCitizenship, () => {
  if (dataLoaded.value) debouncedSave();
});

// Watcher для полей ИП
watch(() => formData.legalAddress, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.inn, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.ogrn, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.accountNumber, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankName, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankInn, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankBik, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.correspondentAccount, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankLegalAddress, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

onMounted(async () => {
  console.log('Quiz4: Component mounted');
  isLoading.value = true;
  
  try {
    // Сначала инициализируем БД
    await initDB();
    
    // Затем загружаем сохраненное состояние
    await loadStateFromDB();
    console.log('Quiz4: After loadStateFromDB - userType:', formData.userType);
    
    // Потом данные с сервера (только в пустые поля)
    await loadUserData();
    console.log('Quiz4: After loadUserData - userType:', formData.userType);
    
    dataLoaded.value = true;
    console.log('Quiz4: Final userType:', formData.userType);
  } catch (error) {
    console.error('Quiz4: Error during initialization:', error);
    ElMessage.error('Ошибка при загрузке данных');
  } finally {
    isLoading.value = false;
  }
});

const handleBeforeUnload = async () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  await saveStateToDB();
};

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'hidden') {
    if (saveTimeout) clearTimeout(saveTimeout);
    await saveStateToDB();
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
<!-- Template остается точно таким же как в вашем файле -->
<div class="quiz__form quiz__form_four">
  <h4 class="quiz__form_head">Данные паспорта и реквизиты</h4>
  
  <div v-if="isLoading" class="quiz__form_loading">
    <span>Загрузка данных...</span>
  </div>
  
  <div v-else class="form__flex">
    <!-- Тип лица -->
    <div class="form__group">
      <label class="form__label button">Выберите тип лица<span>*</span></label>
      <p class="form__hint text_small">Данные паспорта нужны нам для составления договора. Эти данные остаются конфиденциальными и не пересылаются третьим лицам.</p>
      <div class="form__labels">
        <label class="form__label">
          <input 
            type="radio" 
            v-model="formData.userType" 
            value="individual"
            class="form__label_input"
            @change="handleUserTypeChange"
          >
          <span class="form__label_text">Физическое лицо</span>
        </label>
        <label class="form__label">
          <input 
            type="radio" 
            v-model="formData.userType" 
            value="entrepreneur"
            class="form__label_input"
            @change="handleUserTypeChange"
          >
          <span class="form__label_text">Индивидуальный предприниматель</span>
        </label>
      </div>
      <div v-if="errors.userType" class="error text_very">
        {{ errors.userType }}
      </div>
    </div>

    <!-- Поля для ИП -->
    <template v-if="formData.userType === 'entrepreneur'">
      <!-- Юридический адрес организации -->
      <div class="form__group">
        <label for="legalAddress" class="form__label button">Юридический адрес организации<span>*</span></label>
        <el-input
          id="legalAddress"
          v-model="formData.legalAddress"
          type="text"
          :class="{ 'error': errors.legalAddress }"
          placeholder="Введите юридический адрес"
          @blur="validateField('legalAddress')"
          @input="errors.legalAddress = ''"
          size="large"
        />
        <div v-if="errors.legalAddress" class="error text_very">
          {{ errors.legalAddress }}
        </div>
      </div>

      <!-- ИНН -->
      <div class="form__group">
        <label for="inn" class="form__label button">ИНН<span>*</span></label>
        <el-input
          id="inn"
          v-model="formData.inn"
          type="text"
          :class="{ 'error': errors.inn }"
          placeholder="Введите ИНН"
          maxlength="12"
          @blur="validateField('inn')"
          @input="errors.inn = ''"
          size="large"
        />
        <div v-if="errors.inn" class="error text_very">
          {{ errors.inn }}
        </div>
      </div>

      <!-- ОГРН -->
      <div class="form__group">
        <label for="ogrn" class="form__label button">ОГРН<span>*</span></label>
        <el-input
          id="ogrn"
          v-model="formData.ogrn"
          type="text"
          :class="{ 'error': errors.ogrn }"
          placeholder="Введите ОГРН"
          maxlength="15"
          @blur="validateField('ogrn')"
          @input="errors.ogrn = ''"
          size="large"
        />
        <div v-if="errors.ogrn" class="error text_very">
          {{ errors.ogrn }}
        </div>
      </div>

      <!-- Расчетный счет -->
      <div class="form__group">
        <label for="accountNumber" class="form__label button">Расчетный счет<span>*</span></label>
        <el-input
          id="accountNumber"
          v-model="formData.accountNumber"
          type="text"
          :class="{ 'error': errors.accountNumber }"
          placeholder="Введите расчетный счет"
          maxlength="20"
          @blur="validateField('accountNumber')"
          @input="errors.accountNumber = ''"
          size="large"
        />
        <div v-if="errors.accountNumber" class="error text_very">
          {{ errors.accountNumber }}
        </div>
      </div>

      <!-- Банк -->
      <div class="form__group">
        <label for="bankName" class="form__label button">Банк<span>*</span></label>
        <el-input
          id="bankName"
          v-model="formData.bankName"
          type="text"
          :class="{ 'error': errors.bankName }"
          placeholder="Введите полное наименование банка"
          @blur="validateField('bankName')"
          @input="errors.bankName = ''"
          size="large"
        />
        <div v-if="errors.bankName" class="error text_very">
          {{ errors.bankName }}
        </div>
      </div>

      <!-- ИНН банка -->
      <div class="form__group">
        <label for="bankInn" class="form__label button">ИНН банка<span>*</span></label>
        <el-input
          id="bankInn"
          v-model="formData.bankInn"
          type="text"
          :class="{ 'error': errors.bankInn }"
          placeholder="Введите ИНН банка"
          maxlength="10"
          @blur="validateField('bankInn')"
          @input="errors.bankInn = ''"
          size="large"
        />
        <div v-if="errors.bankInn" class="error text_very">
          {{ errors.bankInn }}
        </div>
      </div>

      <!-- БИК банка -->
      <div class="form__group">
        <label for="bankBik" class="form__label button">БИК банка<span>*</span></label>
        <el-input
          id="bankBik"
          v-model="formData.bankBik"
          type="text"
          :class="{ 'error': errors.bankBik }"
          placeholder="Введите БИК банка"
          maxlength="9"
          @blur="validateField('bankBik')"
          @input="errors.bankBik = ''"
          size="large"
        />
        <div v-if="errors.bankBik" class="error text_very">
          {{ errors.bankBik }}
        </div>
      </div>

      <!-- Корреспондентский счет банка -->
      <div class="form__group">
        <label for="correspondentAccount" class="form__label button">Корреспондентский счет банка<span>*</span></label>
        <el-input
          id="correspondentAccount"
          v-model="formData.correspondentAccount"
          type="text"
          :class="{ 'error': errors.correspondentAccount }"
          placeholder="Введите корреспондентский счет"
          maxlength="20"
          @blur="validateField('correspondentAccount')"
          @input="errors.correspondentAccount = ''"
          size="large"
        />
        <div v-if="errors.correspondentAccount" class="error text_very">
          {{ errors.correspondentAccount }}
        </div>
      </div>

      <!-- Юридический адрес банка -->
      <div class="form__group">
        <label for="bankLegalAddress" class="form__label button">Юридический адрес банка<span>*</span></label>
        <el-input
          id="bankLegalAddress"
          v-model="formData.bankLegalAddress"
          type="text"
          :class="{ 'error': errors.bankLegalAddress }"
          placeholder="Введите юридический адрес банка"
          @blur="validateField('bankLegalAddress')"
          @input="errors.bankLegalAddress = ''"
          size="large"
        />
        <div v-if="errors.bankLegalAddress" class="error text_very">
          {{ errors.bankLegalAddress }}
        </div>
      </div>
    </template>

    <!-- Общие поля для всех типов -->
    <!-- Гражданство -->
    <div class="form__group">
      <label for="citizenship" class="form__label button">Гражданство<span>*</span></label>
      <el-select
        id="citizenship"
        v-model="formData.citizenship"
        placeholder="Выберите гражданство"
        :class="{ 'error': errors.citizenship }"
        size="large"
        @change="handleCitizenshipChange"
      >
        <el-option
          v-for="country in citizenshipOptions"
          :key="country.value"
          :label="country.label"
          :value="country.value"
        />
      </el-select>
      <div v-if="errors.citizenship" class="error text_very">
        {{ errors.citizenship }}
      </div>
      
      <!-- Поле для ввода другого гражданства -->
      <div v-if="formData.citizenship === 'other'" class="form__group" style="margin-top: 10px;">
        <label for="otherCitizenship" class="form__label button">Укажите ваше гражданство<span>*</span></label>
        <el-input
          ref="otherCitizenshipInputRef"
          id="otherCitizenship"
          v-model="formData.otherCitizenship"
          type="text"
          :class="{ 'error': errors.otherCitizenship }"
          placeholder="Введите ваше гражданство"
          @blur="validateField('otherCitizenship')"
          @input="errors.otherCitizenship = ''"
          size="large"
        />
        <div v-if="errors.otherCitizenship" class="error text_very">
          {{ errors.otherCitizenship }}
        </div>
      </div>
    </div>

    <!-- Фамилия -->
    <div class="form__group">
      <label for="lastName" class="form__label button">Фамилия<span>*</span></label>
      <el-input
        id="lastName"
        v-model="formData.lastName"
        type="text"
        :class="{ 'error': errors.lastName }"
        placeholder="Введите фамилию"
        @blur="validateField('lastName')"
        @input="errors.lastName = ''"
        size="large"
      />
      <div v-if="errors.lastName" class="error text_very">
        {{ errors.lastName }}
      </div>
    </div>

    <!-- Имя -->
    <div class="form__group">
      <label for="firstName" class="form__label button">Имя<span>*</span></label>
      <el-input
        id="firstName"
        v-model="formData.firstName"
        type="text"
        :class="{ 'error': errors.firstName }"
        placeholder="Введите имя"
        @blur="validateField('firstName')"
        @input="errors.firstName = ''"
        size="large"
      />
      <div v-if="errors.firstName" class="error text_very">
        {{ errors.firstName }}
      </div>
    </div>

    <!-- Отчество -->
    <div class="form__group">
      <label for="middleName" class="form__label button">Отчество<span>*</span></label>
      <el-input
        id="middleName"
        v-model="formData.middleName"
        type="text"
        :class="{ 'error': errors.middleName }"
        placeholder="Введите отчество"
        @blur="validateField('middleName')"
        @input="errors.middleName = ''"
        size="large"
      />
      <div v-if="errors.middleName" class="error text_very">
        {{ errors.middleName }}
      </div>
    </div>

    <!-- Серия и номер паспорта -->
    <div class="form__group">
      <label for="passportNumber" class="form__label button">Серия и номер паспорта (или удостоверения)<span>*</span></label>
      <p class="form__hint text_small">Если у вас биометрический паспорт, посмотрите данные в приложении к паспорту</p>
      <el-input
        id="passportNumber"
        v-model="formData.passportNumber"
        type="text"
        :class="{ 'error': errors.passportNumber }"
        placeholder="Например: 2222222222"
        @blur="validateField('passportNumber')"
        @input="errors.passportNumber = ''"
        size="large"
      />
      <div v-if="errors.passportNumber" class="error text_very">
        {{ errors.passportNumber }}
      </div>
    </div>

    <!-- Кем выдан -->
    <div class="form__group">
      <label for="passportIssuedBy" class="form__label button">Кем выдан<span>*</span></label>
      <el-input
        id="passportIssuedBy"
        v-model="formData.passportIssuedBy"
        type="text"
        :class="{ 'error': errors.passportIssuedBy }"
        placeholder="Например: УФМС России по г. Москва"
        @blur="validateField('passportIssuedBy')"
        @input="errors.passportIssuedBy = ''"
        size="large"
      />
      <div v-if="errors.passportIssuedBy" class="error text_very">
        {{ errors.passportIssuedBy }}
      </div>
    </div>

    <!-- Дата выдачи -->
    <div class="form__group">
      <label for="passportIssueDate" class="form__label button">Дата выдачи<span>*</span></label>
      <el-date-picker
        id="passportIssueDate"
        v-model="formData.passportIssueDate"
        type="date"
        placeholder="Выберите дату"
        format="DD.MM.YYYY"
        value-format="YYYY-MM-DD"
        :class="{ 'error': errors.passportIssueDate }"
        size="large"
        style="width: 100%;"
        @change="validateField('passportIssueDate')"
      />
      <div v-if="errors.passportIssueDate" class="error text_very">
        {{ errors.passportIssueDate }}
      </div>
    </div>

    <!-- Адрес регистрации -->
    <div class="form__group">
      <label for="registrationAddress" class="form__label button">Адрес регистрации / вашей прописки полностью, как в документе<span>*</span></label>
      <el-input
        id="registrationAddress"
        v-model="formData.registrationAddress"
        type="text"
        :class="{ 'error': errors.registrationAddress }"
        placeholder="Введите полный адрес регистрации"
        @blur="validateField('registrationAddress')"
        @input="errors.registrationAddress = ''"
        size="large"
      />
      <div v-if="errors.registrationAddress" class="error text_very">
        {{ errors.registrationAddress }}
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
        :disabled="!isReadyForNextStep || isLoading"
      >
        <span>{{ isLoading ? 'Загрузка...' : 'Продолжить' }}</span>
      </button>
    </div>
  </div>
</div>
</template>

<style lang="scss" scoped>
.quiz__form {
  &_loading {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 16px;
  }

  .form__flex {
    padding: 20px 0 0;
  }
}
</style>