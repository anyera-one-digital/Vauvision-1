<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ElInput, ElMessage, ElSelect, ElOption, ElDatePicker } from 'element-plus';
import { sendRequest } from '@/utils/api';
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import dayjs from 'dayjs';
import { openDB } from '@/utils/inMemoryIdb';

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
  entrepreneurFullName: '',
  entrepreneurEmail: '',
  legalAddress: '',
  inn: '',
  ogrn: '',
  accountNumber: '',
  bankName: '',
  bankInn: '',
  bankBik: '',
  correspondentAccount: '',
  
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
  entrepreneurFullName: '',
  entrepreneurEmail: '',
  legalAddress: '',
  inn: '',
  ogrn: '',
  accountNumber: '',
  bankName: '',
  bankInn: '',
  bankBik: '',
  correspondentAccount: '',
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
const profileRegion = ref('Russia');
const isNonRuAccount = computed(() => profileRegion.value !== 'Russia');
const canUseEntrepreneur = computed(() => !isNonRuAccount.value);

/** Поля только для ИП: сброс/подстановка из профиля и черновик при переключении типа лица */
const ENTREPRENEUR_FIELD_KEYS = [
  'entrepreneurFullName',
  'entrepreneurEmail',
  'legalAddress',
  'inn',
  'ogrn',
  'accountNumber',
  'bankName',
  'bankInn',
  'bankBik',
  'correspondentAccount',
] as const;

type EntrepreneurFieldKey = (typeof ENTREPRENEUR_FIELD_KEYS)[number];

type IndividualFieldKey = 'accountNumber' | 'bankBik';

/** Копия реквизитов ИП при переключении на физлицо (чтобы вернуть при обратном выборе ИП) */
const entrepreneurDraftBackup = reactive(
  Object.fromEntries(ENTREPRENEUR_FIELD_KEYS.map((k) => [k, ''])) as Record<
    EntrepreneurFieldKey,
    string
  >,
);

/** Слепок реквизитов ИП из профиля: используем как seed при первом переключении на ИП. */
const entrepreneurProfileSeed = reactive(
  Object.fromEntries(ENTREPRENEUR_FIELD_KEYS.map((k) => [k, ''])) as Record<
    EntrepreneurFieldKey,
    string
  >,
);

/** Слепок реквизитов физлица из профиля: используется при возврате с ИП на физлицо. */
const individualProfileSeed = reactive<Record<IndividualFieldKey, string>>({
  accountNumber: '',
  bankBik: '',
});

const hasAnyEntrepreneurValues = (
  source: Record<EntrepreneurFieldKey, string>,
): boolean =>
  ENTREPRENEUR_FIELD_KEYS.some((k) => String(source[k] || '').trim().length > 0);

const snapshotEntrepreneurBackupFromForm = () => {
  for (const k of ENTREPRENEUR_FIELD_KEYS) {
    entrepreneurDraftBackup[k] = formData[k];
  }
};

const snapshotEntrepreneurBackupFromSeed = () => {
  for (const k of ENTREPRENEUR_FIELD_KEYS) {
    entrepreneurDraftBackup[k] = entrepreneurProfileSeed[k];
  }
};

const restoreEntrepreneurBackupToForm = () => {
  for (const k of ENTREPRENEUR_FIELD_KEYS) {
    formData[k] = entrepreneurDraftBackup[k];
  }
};

const setEntrepreneurProfileSeedField = (
  key: EntrepreneurFieldKey,
  value: unknown,
  stripSpaces = false,
) => {
  let normalized = value == null ? '' : String(value).trim();
  if (stripSpaces) normalized = normalized.replace(/\s/g, '');
  entrepreneurProfileSeed[key] = normalized;
};

const setIndividualProfileSeedField = (
  key: IndividualFieldKey,
  value: unknown,
  stripSpaces = false,
) => {
  let normalized = value == null ? '' : String(value).trim();
  if (stripSpaces) normalized = normalized.replace(/\s/g, '');
  individualProfileSeed[key] = normalized;
};

const restoreIndividualProfileSeedToForm = () => {
  if (individualProfileSeed.accountNumber) {
    formData.accountNumber = individualProfileSeed.accountNumber;
  }
  if (individualProfileSeed.bankBik) {
    formData.bankBik = individualProfileSeed.bankBik;
  }
};

const clearEntrepreneurFieldsOnly = () => {
  for (const k of ENTREPRENEUR_FIELD_KEYS) {
    formData[k] = '';
  }
};

const clearEntrepreneurFieldErrors = () => {
  for (const k of ENTREPRENEUR_FIELD_KEYS) {
    errors[k] = '';
  }
};

// Таймер для debounce сохранения
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz4: Initializing in-memory store...');
    
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz4: Upgrading store from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('quizState')) {
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz4: Created quizState store');
        }
      },
    });
    
    dbInitialized.value = true;
    console.log('Quiz4: in-memory store initialized successfully');
    
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
    console.log('Quiz4: store not initialized');
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
          entrepreneurFullName: formData.entrepreneurFullName,
          entrepreneurEmail: formData.entrepreneurEmail,
          legalAddress: formData.legalAddress,
          inn: formData.inn,
          ogrn: formData.ogrn,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          bankInn: formData.bankInn,
          bankBik: formData.bankBik,
          correspondentAccount: formData.correspondentAccount,
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
      console.log('✅ Quiz4 state saved to in-memory store');
      
      // Отправляем событие об обновлении данных для QuizMenu
      window.dispatchEvent(new CustomEvent('quiz-data-updated'));
    },
    null
  );
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  if (!dbInitialized.value) {
    console.log('Quiz4: store not initialized, skipping load');
    return;
  }
  
  await safeDBOperation(
    async () => {
      const savedState = await quizDB.value.get('quizState', STORAGE_KEY);
      if (savedState) {
        console.log('📥 Loading Quiz4 from in-memory store:', savedState);
        
        // Восстанавливаем основные данные формы
        if (savedState.formData) {
          // Явно восстанавливаем каждое поле, включая userType
          formData.userType = savedState.formData.userType || 'individual';
          formData.entrepreneurFullName =
            savedState.formData.entrepreneurFullName || '';
          formData.entrepreneurEmail =
            savedState.formData.entrepreneurEmail || '';
          formData.legalAddress = savedState.formData.legalAddress || '';
          formData.inn = savedState.formData.inn || '';
          formData.ogrn = savedState.formData.ogrn || '';
          formData.accountNumber = savedState.formData.accountNumber || '';
          formData.bankName = savedState.formData.bankName || '';
          formData.bankInn = savedState.formData.bankInn || '';
          formData.bankBik = savedState.formData.bankBik || '';
          formData.correspondentAccount = savedState.formData.correspondentAccount || '';
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
    const userUf =
      user?.uf && typeof user.uf === 'object'
        ? (user.uf as Record<string, unknown>)
        : {};
    const getUserField = (...keys: string[]): string => {
      for (const key of keys) {
        const direct = user?.[key];
        if (direct != null && String(direct).trim() !== '') {
          return String(direct).trim();
        }
        const ufDirect = userUf?.[key];
        if (ufDirect != null && String(ufDirect).trim() !== '') {
          return String(ufDirect).trim();
        }
        const upper = key.toUpperCase();
        const ufUpper = userUf?.[upper];
        if (ufUpper != null && String(ufUpper).trim() !== '') {
          return String(ufUpper).trim();
        }
      }
      return '';
    };
    
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
      const citizenship = String(user.uf_grazhdanstvo || '').trim();
      const citizenshipNormalized = citizenship.toLowerCase();
      console.log('Quiz4: Citizenship from API:', citizenship);
      
      if (
        citizenshipNormalized === 'российская федерация' ||
        citizenshipNormalized === 'рф' ||
        citizenshipNormalized === 'россия' ||
        citizenshipNormalized === 'russia' ||
        citizenshipNormalized === 'ru'
      ) {
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

    // Для физлица приоритетный источник должен совпадать с Setting.vue:
    // settings.requisites.individual.account / bik
    let accountFromSettings = '';
    let bikFromSettings = '';
    try {
      const cabinetResponse = await fetchSharedCabinetGetData();
      const rawCabinetPayload = (cabinetResponse?.data ?? {}) as Record<string, any>;
      const cabinetPayload =
        rawCabinetPayload?.data &&
        typeof rawCabinetPayload.data === 'object'
          ? (rawCabinetPayload.data as Record<string, any>)
          : rawCabinetPayload;
      const profile = cabinetPayload?.profile as Record<string, any> | undefined;
      if (typeof profile?.region === 'string' && profile.region.trim()) {
        profileRegion.value = profile.region.trim();
      }
      const individual = cabinetPayload?.settings?.requisites?.individual as Record<string, any> | undefined;

      accountFromSettings = String(individual?.account ?? individual?.rs ?? '').replace(/\s/g, '');
      bikFromSettings = String(individual?.bik ?? '').replace(/\s/g, '');
    } catch (settingsErr) {
      console.warn('Quiz4: Не удалось получить requisites.individual из settings:', settingsErr);
    }

    const accountFromUf = getUserField('uf_rs', 'UF_RS').replace(/\s/g, '');
    const bikFromUf = getUserField('uf_bik', 'UF_BIK').replace(/\s/g, '');

    if (accountFromSettings) {
      setIndividualProfileSeedField('accountNumber', accountFromSettings, true);
      formData.accountNumber = accountFromSettings;
    } else if (accountFromUf) {
      setIndividualProfileSeedField('accountNumber', accountFromUf, true);
      if (!formData.accountNumber) {
        formData.accountNumber = accountFromUf;
      }
    }

    if (bikFromSettings) {
      setIndividualProfileSeedField('bankBik', bikFromSettings, true);
      formData.bankBik = bikFromSettings;
    } else if (bikFromUf) {
      setIndividualProfileSeedField('bankBik', bikFromUf, true);
      if (!formData.bankBik) {
        formData.bankBik = bikFromUf;
      }
    }

    const str = (v: unknown) => (v == null ? '' : String(v).trim());
    setEntrepreneurProfileSeedField('entrepreneurFullName', user.uf_fioip);
    setEntrepreneurProfileSeedField('entrepreneurEmail', user.uf_email);
    setEntrepreneurProfileSeedField('legalAddress', user.uf_addressip);
    setEntrepreneurProfileSeedField('inn', user.uf_inn);
    setEntrepreneurProfileSeedField('ogrn', user.uf_ogrn);
    setEntrepreneurProfileSeedField('accountNumber', user.uf_rsip, true);
    setEntrepreneurProfileSeedField('bankName', user.uf_bank);
    setEntrepreneurProfileSeedField('bankInn', user.uf_inn_bank);
    setEntrepreneurProfileSeedField('bankBik', user.uf_bikip, true);
    setEntrepreneurProfileSeedField('correspondentAccount', user.uf_korr, true);

    /** Тип реквизитов в профиле: физлицо / ИП / неизвестно */
    const resolveProfileBankType = (): 'individual' | 'entrepreneur' | null => {
      const licRaw = getUserField('uf_lico', 'UF_LICO');
      const lic = Number(licRaw);
      if (lic === 2) return 'entrepreneur';
      if (lic === 1) return 'individual';
      const hasIp =
        str(user.uf_fioip) ||
        str(user.uf_rsip) ||
        str(user.uf_bikip) ||
        str(user.uf_addressip);
      const hasFiz =
        str(getUserField('uf_fiofiz', 'UF_FIOFIZ')) &&
        str(accountFromSettings || accountFromUf) &&
        str(bikFromSettings || bikFromUf);
      if (hasIp) return 'entrepreneur';
      if (hasFiz) return 'individual';
      return null;
    };

    const profileBankType = resolveProfileBankType();

    if (profileBankType === 'individual') {
      formData.userType = 'individual';
      clearEntrepreneurFieldsOnly();
      // accountNumber/bankBik общие для физлица и ИП:
      // после очистки ИП-полей восстанавливаем seed физлица.
      restoreIndividualProfileSeedToForm();
      if (hasAnyEntrepreneurValues(entrepreneurProfileSeed)) {
        snapshotEntrepreneurBackupFromSeed();
      }
    } else if (profileBankType === 'entrepreneur' && canUseEntrepreneur.value) {
      formData.userType = 'entrepreneur';
      // Сначала очищаем ИП-поля от прошлого состояния квиза в IndexedDB, затем заполняем из профиля
      clearEntrepreneurFieldsOnly();

      if (Number(user.uf_lico) === 2) {
        formData.entrepreneurFullName = entrepreneurProfileSeed.entrepreneurFullName;
        formData.legalAddress = entrepreneurProfileSeed.legalAddress;
        formData.inn = entrepreneurProfileSeed.inn;
        formData.ogrn = entrepreneurProfileSeed.ogrn;
        formData.accountNumber = entrepreneurProfileSeed.accountNumber;
        formData.bankName = entrepreneurProfileSeed.bankName;
        formData.bankInn = entrepreneurProfileSeed.bankInn;
        formData.bankBik = entrepreneurProfileSeed.bankBik;
        formData.correspondentAccount = entrepreneurProfileSeed.correspondentAccount;
        formData.entrepreneurEmail = entrepreneurProfileSeed.entrepreneurEmail;
        console.log('✅ Реквизиты ИП синхронизированы с профилем (UF_LICO=2)');
      } else {
        const setIf = (key: keyof typeof formData, raw: unknown, strip = false) => {
          let t = str(raw);
          if (strip && t) t = t.replace(/\s/g, '');
          if (t) (formData as Record<string, string>)[key] = t;
        };
        setIf('entrepreneurFullName', user.uf_fioip);
        setIf('legalAddress', user.uf_addressip);
        setIf('inn', user.uf_inn);
        setIf('ogrn', user.uf_ogrn);
        setIf('accountNumber', user.uf_rsip, true);
        setIf('bankName', user.uf_bank);
        setIf('bankInn', user.uf_inn_bank);
        setIf('bankBik', user.uf_bikip, true);
        setIf('correspondentAccount', user.uf_korr, true);
        setIf('entrepreneurEmail', user.uf_email);
        console.log('✅ Подставлены реквизиты ИП из профиля');
      }
      snapshotEntrepreneurBackupFromForm();
    }

  } catch (error) {
    console.error('Quiz4: Ошибка загрузки данных пользователя:', error);
  }
};

// Вычисляемое свойство для проверки готовности к продолжению
const isReadyForNextStep = computed(() => {
  if (isNonRuAccount.value) return true;

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

  if (formData.userType === 'individual') {
    if (!formData.accountNumber?.trim()) return false;
    if (!formData.bankBik?.trim()) return false;
  }
  
  if (formData.userType === 'entrepreneur') {
    if (!formData.entrepreneurFullName?.trim()) return false;
    if (!formData.entrepreneurEmail?.trim()) return false;
    if (!formData.legalAddress?.trim()) return false;
    if (!formData.inn?.trim()) return false;
    if (!formData.ogrn?.trim()) return false;
    if (!formData.accountNumber?.trim()) return false;
    if (!formData.bankName?.trim()) return false;
    if (!formData.bankInn?.trim()) return false;
    if (!formData.bankBik?.trim()) return false;
    if (!formData.correspondentAccount?.trim()) return false;
  }
  
  return true;
});

// Валидация
const validateEmailAddr = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateINN = (inn: string): boolean => /^\d{12}$/.test(inn);
const validateOGRN = (ogrn: string): boolean => /^\d{15}$/.test(ogrn);
const validateBIK = (bik: string): boolean => /^\d{9}$/.test(bik);
const validateAccountNumber = (account: string): boolean => /^\d{20}$/.test(account);
const validatePassportNumber = (passport: string): boolean => /^\d{10}$/.test(passport.replace(/\s/g, ''));

const formatPassportDateForProfile = (value: string): string => {
  if (!value) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}.${m}.${y}`;
  }
  return value;
};

const getApiErrorMessage = (error: unknown): string => {
  const fallback = 'Не удалось сохранить паспортные данные и реквизиты в профиль';
  const responseData = (error as any)?.response?.data;

  if (typeof responseData === 'string') {
    const value = responseData.trim();
    if (value) return value;
  }

  if (responseData && typeof responseData === 'object') {
    const candidates = ['error', 'message', 'detail', 'msg'];
    for (const key of candidates) {
      const raw = (responseData as Record<string, unknown>)[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
      if (Array.isArray(raw) && raw.length) {
        const first = raw[0];
        if (typeof first === 'string' && first.trim()) return first.trim();
      }
    }
  }

  const message = (error as any)?.message;
  if (typeof message === 'string' && message.trim()) return message.trim();
  return fallback;
};

const syncQuiz4DataToProfile = async (): Promise<void> => {
  const citizenshipPayload =
    formData.citizenship === 'other'
      ? (formData.otherCitizenship?.trim() || 'Другое')
      : formData.citizenship;

  await sendRequest('post', '/ajax_vue/ajax/profile/updatePassport.php', {
    'citysenship-profile': citizenshipPayload,
    'issued-profile': formData.passportIssuedBy || '',
    fam: formData.lastName || '',
    'number-profile': formData.passportNumber || '',
    imya: formData.firstName || '',
    'date-profile': formatPassportDateForProfile(formData.passportIssueDate || ''),
    otch: formData.middleName || '',
    'adress-profile': formData.registrationAddress || '',
    ...(formData.citizenship === 'other' && formData.otherCitizenship?.trim()
      ? { 'citysenship-profile-others': formData.otherCitizenship.trim() }
      : {}),
  });

  if (formData.userType === 'entrepreneur') {
    await sendRequest('post', '/ajax_vue/ajax/profile/updateRek2.php', {
      'sp-profile': formData.entrepreneurFullName || '',
      'num-ogr-profile': formData.ogrn || '',
      'addr-sp-profile': formData.legalAddress || '',
      'in-sp-profile': formData.inn || '',
      'rs-sp-profile': formData.accountNumber || '',
      'bank-sp-profile': formData.bankName || '',
      'in-bank-sp-profile': formData.bankInn || '',
      'b-sp-profile': formData.bankBik || '',
      'ks-sp-profile': formData.correspondentAccount || '',
      'email-sp-profile': formData.entrepreneurEmail || '',
    });
    return;
  }

  await sendRequest('post', '/ajax_vue/ajax/profile/updateRek1.php', {
    'sp-profile': `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
    'rs-sp-profile': formData.accountNumber || '',
    'b-sp-profile': formData.bankBik || '',
  });
};

const validateField = (fieldName: keyof typeof errors) => {
  if (isNonRuAccount.value) {
    errors[fieldName] = '';
    return true;
  }

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
      if (!validateOGRN(value)) errors.ogrn = 'ОГРН/ОГРНИП должен состоять из 15 цифр';
      break;
    case 'bankInn':
      if (!/^\d{9,10}$/.test(value.replace(/\s/g, '')))
        errors.bankInn = 'ИНН банка: 9–10 цифр';
      break;
    case 'bankBik':
      if (!validateBIK(value)) errors.bankBik = 'БИК должен состоять из 9 цифр';
      break;
    case 'accountNumber':
    case 'correspondentAccount':
      if (!validateAccountNumber(value)) errors[fieldName] = 'Счет должен состоять из 20 цифр';
      break;
    case 'passportNumber':
      if (!isNonRuAccount.value && !validatePassportNumber(value)) {
        errors.passportNumber = 'Серия и номер должны состоять из 10 цифр';
      }
      break;
    case 'passportIssueDate':
      if (dayjs(value).isAfter(dayjs())) errors.passportIssueDate = 'Дата выдачи не может быть в будущем';
      break;
    case 'lastName':
    case 'firstName':
    case 'middleName':
    case 'otherCitizenship':
    case 'entrepreneurFullName':
      if (value.trim().length < 2) errors[fieldName] = 'Минимум 2 символа';
      break;
    case 'entrepreneurEmail':
      if (!validateEmailAddr(value))
        errors.entrepreneurEmail = 'Введите корректный e-mail';
      break;
  }
  
  return !errors[fieldName];
};

const validateForm = (): boolean => {
  if (isNonRuAccount.value) {
    Object.keys(errors).forEach(key => errors[key as keyof typeof errors] = '');
    return true;
  }

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
      'entrepreneurFullName',
      'legalAddress',
      'inn',
      'ogrn',
      'accountNumber',
      'bankName',
      'bankInn',
      'bankBik',
      'correspondentAccount',
      'entrepreneurEmail'
    );
  } else {
    fieldsToValidate.push(
      'accountNumber',
      'bankBik',
    );
  }
  
  fieldsToValidate.forEach(field => {
    if (!validateField(field)) isValid = false;
  });
  
  return isValid;
};

const handleUserTypeChange = () => {
  errors.userType = '';
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
  if (isNonRuAccount.value) {
    await saveStateToDB();
    emit('go-next');
    return;
  }

  if (validateForm()) {
    try {
      await syncQuiz4DataToProfile();
      // Оставляем сохранение шага в БД для локальной навигации внутри текущего прохождения
      await saveStateToDB();
      emit('go-next');
    } catch (error) {
      console.error('Quiz4: Ошибка синхронизации данных профиля:', error);
      ElMessage.error(getApiErrorMessage(error));
    }
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
watch(
  () => formData.userType,
  (newVal, oldVal) => {
    if (!dataLoaded.value) return;
    if (newVal === 'entrepreneur' && !canUseEntrepreneur.value) {
      formData.userType = 'individual';
      return;
    }

    if (oldVal === 'entrepreneur' && newVal === 'individual') {
      snapshotEntrepreneurBackupFromForm();
      clearEntrepreneurFieldsOnly();
      restoreIndividualProfileSeedToForm();
      clearEntrepreneurFieldErrors();
    } else if (oldVal === 'individual' && newVal === 'entrepreneur') {
      if (
        !hasAnyEntrepreneurValues(entrepreneurDraftBackup) &&
        hasAnyEntrepreneurValues(entrepreneurProfileSeed)
      ) {
        snapshotEntrepreneurBackupFromSeed();
      }
      restoreEntrepreneurBackupToForm();
      clearEntrepreneurFieldErrors();
    }

    console.log('userType changed to:', newVal);
    debouncedSave();
  },
);

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
watch(() => formData.entrepreneurFullName, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.entrepreneurEmail, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

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
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.bankName, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankInn, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

watch(() => formData.bankBik, () => {
  if (dataLoaded.value) debouncedSave();
});

watch(() => formData.correspondentAccount, () => {
  if (dataLoaded.value && formData.userType === 'entrepreneur') debouncedSave();
});

onMounted(async () => {
  console.log('Quiz4: Component mounted');
  isLoading.value = true;
  
  try {
    // Сначала инициализируем БД
    await initDB();

    // Критичные данные (паспорт / реквизиты) всегда берем из актуального профиля.
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
  <h4 class="quiz__form_head">
    {{ formData.userType === 'entrepreneur' ? 'Данные паспорта и реквизиты' : 'Данные паспорта' }}
  </h4>
  
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
        <label v-if="canUseEntrepreneur" class="form__label">
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

    <!-- Поля для физлица -->
    <template v-if="formData.userType === 'individual' && !isNonRuAccount">
      <div class="form__group">
        <label for="individualAccountNumber" class="form__label button">Расчётный счёт<span>*</span></label>
        <el-input
          id="individualAccountNumber"
          v-model="formData.accountNumber"
          type="text"
          :class="{ 'error': errors.accountNumber }"
          placeholder="Введите расчётный счёт"
          maxlength="20"
          @blur="validateField('accountNumber')"
          @input="errors.accountNumber = ''"
          size="large"
        />
        <div v-if="errors.accountNumber" class="error text_very">
          {{ errors.accountNumber }}
        </div>
      </div>

      <div class="form__group">
        <label for="individualBankBik" class="form__label button">БИК банка<span>*</span></label>
        <el-input
          id="individualBankBik"
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
    </template>

    <!-- Поля для ИП -->
    <template v-if="formData.userType === 'entrepreneur'">

      <div class="form__group">
        <label for="entrepreneurFullNameIp" class="form__label button">ФИО ПРЕДПРИНИМАТЕЛЯ<span>*</span></label>
        <el-input
          id="entrepreneurFullNameIp"
          v-model="formData.entrepreneurFullName"
          type="text"
          :class="{ 'error': errors.entrepreneurFullName }"
          placeholder="Иванов Иван Иванович"
          @blur="validateField('entrepreneurFullName')"
          @input="errors.entrepreneurFullName = ''"
          size="large"
        />
        <div v-if="errors.entrepreneurFullName" class="error text_very">
          {{ errors.entrepreneurFullName }}
        </div>
      </div>

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

      <!-- ОГРН/ОГРНИП -->
      <div class="form__group">
        <label for="ogrn" class="form__label button">ОГРН/ОГРНИП<span>*</span></label>
        <el-input
          id="ogrn"
          v-model="formData.ogrn"
          type="text"
          :class="{ 'error': errors.ogrn }"
          placeholder="Введите ОГРН/ОГРНИП"
          maxlength="15"
          @blur="validateField('ogrn')"
          @input="errors.ogrn = ''"
          size="large"
        />
        <div v-if="errors.ogrn" class="error text_very">
          {{ errors.ogrn }}
        </div>
      </div>

      <!-- Расчётный счёт -->
      <div class="form__group">
        <label for="accountNumber" class="form__label button">Расчётный счёт<span>*</span></label>
        <el-input
          id="accountNumber"
          v-model="formData.accountNumber"
          type="text"
          :class="{ 'error': errors.accountNumber }"
          placeholder="Введите расчётный счёт"
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

      <!-- Корреспондентский счёт банка -->
      <div class="form__group">
        <label for="correspondentAccount" class="form__label button">Корреспондентский счёт банка<span>*</span></label>
        <el-input
          id="correspondentAccount"
          v-model="formData.correspondentAccount"
          type="text"
          :class="{ 'error': errors.correspondentAccount }"
          placeholder="Введите корреспондентский счёт"
          maxlength="20"
          @blur="validateField('correspondentAccount')"
          @input="errors.correspondentAccount = ''"
          size="large"
        />
        <div v-if="errors.correspondentAccount" class="error text_very">
          {{ errors.correspondentAccount }}
        </div>
      </div>

      <!-- E-mail предпринимателя -->
      <div class="form__group">
        <label for="entrepreneurEmailIp" class="form__label button">E-mail предпринимателя<span>*</span></label>
        <el-input
          id="entrepreneurEmailIp"
          v-model="formData.entrepreneurEmail"
          type="email"
          :class="{ 'error': errors.entrepreneurEmail }"
          placeholder="name@example.ru"
          @blur="validateField('entrepreneurEmail')"
          @input="errors.entrepreneurEmail = ''"
          size="large"
        />
        <div v-if="errors.entrepreneurEmail" class="error text_very">
          {{ errors.entrepreneurEmail }}
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