<template>
<div class="quiz__form quiz__form_eight">
  <template v-if="showPaymentWay">
    <PaymentWay
      :usdt-payment-url="usdtPaymentUrlResolved"
      :card-payment-url="cardPaymentUrlResolved"
    />
    <div class="quiz__form_bottom">
      <div class="quiz__form_buttons">
        <button
          type="button"
          class="form__back button__second button"
          @click="goBack"
        >
          <span><BackSVG /></span>
          <span>Назад</span>
        </button>
      </div>
    </div>
  </template>

  <template v-else>
  <h4 class="quiz__form_head">Отправка данных</h4>
  
  <!-- ПРОСТАЯ СВОДКА -->
  <div v-if="dataLoaded && !isLoading" class="quiz__simple_summary">
    <div>Тип релиза: 
      {{ 
        (singleCount > 0 && albumCount > 0) ? 'сингл / альбом' :
        (singleCount > 0) ? 'сингл' :
        (albumCount > 0) ? 'альбом' : 'не указан'
      }}
    </div>
    <div>Псевдоним и название сингла / альбома: {{ summaryData.releaseInfo?.performerName || 'не указано' }} - {{ summaryData.releaseInfo?.releaseName || 'не указано' }}</div>
    <div>Дата релиза: {{ formatDate(summaryData.releaseInfo?.releaseDate) }}</div>
    <div>Тип лица: {{ userTypeSummaryLabel }}</div>
    <template v-if="showIpSummaryBlock && quiz4FormSummary">
      <div class="quiz__simple_summary_ip">
        <div class="quiz__simple_summary_ip_title">Реквизиты ИП</div>
        <div>Юридический адрес: {{ quiz4FormSummary.legalAddress?.trim() || '—' }}</div>
        <div>ИНН: {{ quiz4FormSummary.inn?.trim() || '—' }}</div>
        <div>ОГРН: {{ quiz4FormSummary.ogrn?.trim() || '—' }}</div>
        <div>Расчётный счёт: {{ quiz4FormSummary.accountNumber?.trim() || '—' }}</div>
        <div>Банк: {{ quiz4FormSummary.bankName?.trim() || '—' }}</div>
        <div>ИНН банка: {{ quiz4FormSummary.bankInn?.trim() || '—' }}</div>
        <div>БИК: {{ quiz4FormSummary.bankBik?.trim() || '—' }}</div>
        <div>Корреспондентский счёт: {{ quiz4FormSummary.correspondentAccount?.trim() || '—' }}</div>
        <div>Юридический адрес банка: {{ quiz4FormSummary.bankLegalAddress?.trim() || '—' }}</div>
      </div>
    </template>
  </div>
  
  <div v-if="isLoading" class="quiz__form_loading">
    <div class="loading-spinner"></div>
    <span>Загрузка данных...</span>
  </div>
  
  <div v-else-if="!dataLoaded" class="quiz__form_error">
    <p class="error">Не удалось загрузить данные. Пожалуйста, вернитесь на предыдущие шаги.</p>
  </div>
  
  <div v-if="isSubmitting" class="quiz__form_contract_loading">
    <div class="loading-spinner"></div>
    <p>Отправка данных на сервер... Пожалуйста, подождите</p>
    <p class="text_small">Отправлено файлов: {{ uploadedCount }}/{{ totalFilesCount }}</p>
  </div>
  
  <div class="quiz__form_bottom">
    <div class="quiz__form_buttons">
      <button 
        class="form__back button__second button" 
        @click="goBack"
        :disabled="isSubmitting"
      >
        <span><BackSVG /></span>
        <span>Назад</span>
      </button>
      <button 
        class="quiz__form_button button__black button"
        @click="handleFinish"
        :disabled="isSubmitting || !dataLoaded || !canSubmit"
      >
        <span v-if="!isSubmitting">Оформить заказ</span>
        <span v-else>Отправка...</span>
      </button>
    </div>
  </div>
  </template>
</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { FileRequest } from '@/utils/api';
import { buildInstrumentalsFromQuiz2 } from '@/utils/quizInstrumentalsSummary';
import BackSVG from "@/uikit/icon/BackSVG.vue";
import PaymentWay from '@/components/layout/Quiz/PaymentWay.vue';
import { openDB } from 'idb';

const emit = defineEmits<{
  'go-back': [];
  'finish': [];
}>();

const QUIZ_LAST_PAYMENT_LINKS_KEY = 'quiz_last_payment_links';

const showPaymentWay = ref(false);
const usdtPaymentUrlResolved = ref('');
const cardPaymentUrlResolved = ref('');

type OrderSuccessPayload = {
  order_id?: string | number;
  payment_url?: string;
  payment_usdt_url?: string;
  payment_card_url?: string;
};

const resolvePaymentHref = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = window.location.origin;
  return origin + (url.startsWith('/') ? url : `/${url}`);
};

const resetPaymentWay = () => {
  showPaymentWay.value = false;
  usdtPaymentUrlResolved.value = '';
  cardPaymentUrlResolved.value = '';
};

const extractOrderSuccessData = (responseData: unknown): OrderSuccessPayload | null => {
  if (responseData === null || responseData === undefined) return null;
  if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
    const o = responseData as { error?: number; data?: OrderSuccessPayload };
    if (o.error === 0 && o.data && typeof o.data === 'object') return o.data;
  }
  if (typeof responseData === 'string') {
    const jsonMatch = responseData.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { error?: number; data?: OrderSuccessPayload };
        if (parsed.error === 0 && parsed.data && typeof parsed.data === 'object') return parsed.data;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const tryShowPaymentWay = (data: OrderSuccessPayload): boolean => {
  let usdt = data.payment_usdt_url?.trim();
  let card = data.payment_card_url?.trim();
  const base = data.payment_url?.trim();
  if ((!usdt || !card) && base) {
    const sep = base.includes('?') ? '&' : '?';
    if (!usdt) usdt = `${base}${sep}SYSTEM=CRYPTO`;
    if (!card) card = `${base}${sep}SYSTEM=CloudPayments`;
  }
  if (!usdt || !card) return false;
  usdtPaymentUrlResolved.value = resolvePaymentHref(usdt);
  cardPaymentUrlResolved.value = resolvePaymentHref(card);
  showPaymentWay.value = true;
  try {
    sessionStorage.setItem(
      QUIZ_LAST_PAYMENT_LINKS_KEY,
      JSON.stringify({
        order_id: data.order_id,
        usdt: usdtPaymentUrlResolved.value,
        card: cardPaymentUrlResolved.value,
      }),
    );
  } catch {
    /* ignore */
  }
  ElMessage.success('Заказ успешно оформлен! Выберите способ оплаты.');
  return true;
};

// Интерфейсы
interface ContractData {
  doc_pdf: string;
  doc_docx: string;
  images: string[];
}

interface SingleTrack {
  trackName?: string;
  performerName?: string;
  musicAuthor?: string;
  textAuthor?: string;
  audioFileName?: string;
  audioFileId?: string;
  product_id?: string;
  rightsType?: string;
  rightsContractLink?: string;
  additionalInfo?: string;
}

interface AlbumTrack {
  trackNumber?: number;
  trackName?: string;
  performerName?: string;
  musicAuthor?: string;
  textAuthor?: string;
  audioFileName?: string;
  audioFileId?: string;
  product_id?: string;
  rightsType?: string;
  rightsContractLink?: string;
  additionalInfo?: string;
}

interface Album {
  albumName?: string;
  tracks?: AlbumTrack[];
}

interface Quiz1Data {
  singleCount: number;
  albumCount: number;
  clipCount: number;
  cardCount: number;
}

interface Quiz2Data {
  singleTracks?: SingleTrack[];
  albums?: Album[];
}

interface Quiz3Data {
  formData?: {
    performerName?: string;
    releaseName?: string;
    /** В Quiz3 хранится строка (all | other) */
    platforms?: string | string[];
    otherPlatform?: string;
    releaseDate?: string;
    hasProfanity?: string;
    profanityTracks?: string;
    vkLink?: string;
    email?: string;
  };
  coverFileInfo?: {
    name?: string;
    size?: number;
    fileId?: string | null;
  };
}

interface Quiz4Data {
  formData?: {
    userType?: string;
    legalAddress?: string;
    inn?: string;
    ogrn?: string;
    accountNumber?: string;
    bankName?: string;
    bankInn?: string;
    bankBik?: string;
    correspondentAccount?: string;
    bankLegalAddress?: string;
    citizenship?: string;
    otherCitizenship?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    passportNumber?: string;
    passportIssuedBy?: string;
    passportIssueDate?: string;
    registrationAddress?: string;
  };
}

interface Quiz5Data {
  formData?: {
    genre?: string;
    tiktokStartSeconds?: string;
    hasDrugsMention?: string;
    drugsTracks?: string;
    appleMusicLinks?: string;
    spotifyLinks?: string;
    vkLinks?: string;
    yandexMusicLinks?: string;
    socialLinks?: string;
  };
  appleMusicFileInfo?: {
    name?: string;
    size?: number;
    fileId?: string | null;
  };
  karaokeFileInfo?: {
    name?: string;
    size?: number;
    fileId?: string | null;
  };
}

interface Quiz6Data {
  formData?: {
    platforms?: string[];
    otherPlatform?: string;
    additionalComments?: string;
    promoPlan?: string;
    bandlinkUrl?: string;
    promoCode?: string;
    usePartnerBonuses?: boolean;
    usedBonuses?: number;
    confirmNoRightsViolation?: boolean;
  };
  promoApplied?: boolean;
  promoDiscount?: number;
  contractData?: ContractData;
  /** С шага 6: после промо, до бонусов (база для sumOrder в order.php) */
  orderTotalAfterPromo?: number;
  /** Итог к оплате после бонусов — как в договоре */
  finalPayableAmount?: number;
}

interface Quiz7Data {
  formData?: {
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
    acceptMarketing?: boolean;
  };
  signature?: string;
  contractData?: ContractData;
}

interface AllData {
  singleCount?: number;
  albumCount?: number;
  clipCount?: number;
  cardCount?: number;
  singleTracks?: SingleTrack[];
  albums?: Album[];
  releaseInfo?: {
    performerName?: string;
    releaseName?: string;
    platforms?: string | string[];
    otherPlatform?: string;
    releaseDate?: string;
    hasProfanity?: string;
    profanityTracks?: string;
    vkLink?: string;
    email?: string;
  };
  userInfo?: {
    userType?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    passportNumber?: string;
  };
  genreInfo?: {
    genre?: string;
    hasDrugsMention?: string;
    socialLinks?: string;
  };
  additionalInfo?: {
    platforms?: string[];
    otherPlatform?: string;
    confirmNoRightsViolation?: boolean;
  };
  contractData?: ContractData;
  agreement?: {
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
    acceptMarketing?: boolean;
  };
  signature?: string;
  totalTracks?: number;
}

const STORAGE_KEYS = {
  QUIZ1: 'quiz1_state',
  QUIZ2: 'quiz2_state',
  QUIZ3: 'quiz3_state',
  QUIZ4: 'quiz4_state',
  QUIZ5: 'quiz5_state',
  QUIZ6: 'quiz6_state',
  QUIZ7: 'quiz7_state'
};

const DB_NAME = 'quizDB';
const FILES_DB_NAME = 'filesDB';
const AUDIO_DB_NAME = 'audioDB';
const DB_VERSION = 2;

const isLoading = ref(true);
const isSubmitting = ref(false);
const dataLoaded = ref(false);
const quizDB = ref<any>(null);
const filesDB = ref<any>(null);
const audioDB = ref<any>(null);
const dbInitialized = ref(false);
const filesDBInitialized = ref(false);
const audioDBInitialized = ref(false);

// Прогресс отправки
const uploadProgress = ref(0);
const uploadedCount = ref(0);
const totalFilesCount = ref(0);

// Файлы для отправки
const coverFile = ref<File | null>(null);
const coverFileName = ref('');
const audioFilesList = ref<Array<{file: File, fileName: string, type: string, productId?: string}>>([]);

// Файлы из Quiz5
const appleMusicFile = ref<File | null>(null);
const karaokeFile = ref<File | null>(null);
const appleMusicFileName = ref('');
const karaokeFileName = ref('');

// Данные из шагов
const quiz1Data = ref<Quiz1Data | null>(null);
const quiz2Data = ref<Quiz2Data | null>(null);
const quiz3Data = ref<Quiz3Data | null>(null);
const quiz4Data = ref<Quiz4Data | null>(null);
const quiz5Data = ref<Quiz5Data | null>(null);
const quiz6Data = ref<Quiz6Data | null>(null);
const quiz7Data = ref<Quiz7Data | null>(null);

// Вычисляемые значения для проверки наличия синглов/альбомов
const singleCount = computed(() => quiz1Data.value?.singleCount || 0);
const albumCount = computed(() => quiz1Data.value?.albumCount || 0);
const clipCount = computed(() => quiz1Data.value?.clipCount || 0);
const cardCount = computed(() => quiz1Data.value?.cardCount || 0);

const hasSingles = computed(() => singleCount.value > 0);
const hasAlbums = computed(() => albumCount.value > 0);

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log('Quiz8: Initializing databases...');
    
    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz8: Upgrading DB from version ${oldVersion} to ${newVersion}`);
        
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('quizState')) {
            db.deleteObjectStore('quizState');
          }
          const store = db.createObjectStore('quizState', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz8: Created new quizState store');
        }
      },
    });
    
    filesDB.value = await openDB(FILES_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz8: Upgrading Files DB from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz8: Created files store');
        }
      },
    });
    
    audioDB.value = await openDB(AUDIO_DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Quiz8: Upgrading Audio DB from version ${oldVersion} to ${newVersion}`);
        
        if (!db.objectStoreNames.contains('audio')) {
          const store = db.createObjectStore('audio', { keyPath: 'id' });
          store.createIndex('fileName', 'fileName');
          store.createIndex('timestamp', 'timestamp');
          console.log('Quiz8: Created audio store');
        }
      },
    });
    
    dbInitialized.value = true;
    filesDBInitialized.value = true;
    audioDBInitialized.value = true;
    console.log('Quiz8: Databases initialized successfully');
    
  } catch (error) {
    console.error('Quiz8: Error initializing databases:', error);
  }
};

// Загрузка файла из IndexedDB
const loadFileFromDB = async (fileId: string, dbType: 'files' | 'audio' = 'files'): Promise<File | null> => {
  const db = dbType === 'files' ? filesDB.value : audioDB.value;
  const storeName = dbType === 'files' ? 'files' : 'audio';
  
  if (!db) return null;
  
  try {
    const stored = await db.get(storeName, fileId);
    if (stored && stored.data) {
      return new File([stored.data], stored.fileName, { type: stored.fileType || 'application/octet-stream' });
    }
    return null;
  } catch (error) {
    console.error(`Error loading file from ${dbType} DB:`, error);
    return null;
  }
};

// Загрузка обложки из Quiz3
const loadCoverFile = async (): Promise<File | null> => {
  if (!filesDBInitialized.value || !quiz3Data.value?.coverFileInfo?.fileId) {
    return null;
  }
  
  const fileId = quiz3Data.value.coverFileInfo.fileId;
  const file = await loadFileFromDB(fileId, 'files');
  
  if (file) {
    coverFileName.value = file.name;
    console.log('Quiz8: Cover file loaded:', file.name);
  }
  
  return file;
};

// Загрузка Apple Music файла (docx) из Quiz5
const loadAppleMusicFile = async (): Promise<File | null> => {
  if (!filesDBInitialized.value || !quiz5Data.value?.appleMusicFileInfo?.fileId) {
    return null;
  }
  
  const fileId = quiz5Data.value.appleMusicFileInfo.fileId;
  const file = await loadFileFromDB(fileId, 'files');
  
  if (file) {
    appleMusicFileName.value = file.name;
    console.log('Quiz8: Apple Music file loaded:', file.name);
  }
  
  return file;
};

// Загрузка Karaoke файла (ttml) из Quiz5
const loadKaraokeFile = async (): Promise<File | null> => {
  if (!filesDBInitialized.value || !quiz5Data.value?.karaokeFileInfo?.fileId) {
    return null;
  }
  
  const fileId = quiz5Data.value.karaokeFileInfo.fileId;
  const file = await loadFileFromDB(fileId, 'files');
  
  if (file) {
    karaokeFileName.value = file.name;
    console.log('Quiz8: Karaoke file loaded:', file.name);
  }
  
  return file;
};

// Загрузка всех аудиофайлов из Quiz2
const loadAllAudioFiles = async (): Promise<Array<{file: File, fileName: string, type: string, productId?: string}>> => {
  const files: Array<{file: File, fileName: string, type: string, productId?: string}> = [];
  
  if (!audioDBInitialized.value || !quiz2Data.value) {
    return files;
  }
  
  try {
    if (hasSingles.value && quiz2Data.value.singleTracks) {
      for (const track of quiz2Data.value.singleTracks) {
        if (track.audioFileId) {
          const file = await loadFileFromDB(track.audioFileId, 'audio');
          if (file) {
            files.push({
              file,
              fileName: file.name,
              type: 'single',
              productId: track.product_id
            });
            console.log('Quiz8: Single audio loaded:', file.name, 'Product ID:', track.product_id);
          }
        }
      }
    }
    
    if (hasAlbums.value && quiz2Data.value.albums) {
      for (const album of quiz2Data.value.albums) {
        if (album.tracks) {
          for (const track of album.tracks) {
            if (track.audioFileId) {
              const file = await loadFileFromDB(track.audioFileId, 'audio');
              if (file) {
                files.push({
                  file,
                  fileName: file.name,
                  type: 'album',
                  productId: track.product_id
                });
                console.log('Quiz8: Album audio loaded:', file.name, 'Product ID:', track.product_id);
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error loading audio files:', error);
  }
  
  return files;
};

// Загрузка данных из IndexedDB
const loadFromDB = async (key: string): Promise<any> => {
  try {
    return await quizDB.value.get('quizState', key);
  } catch (error) {
    console.error(`Error loading ${key} from DB:`, error);
    return null;
  }
};

const loadAllData = async () => {
  try {
    isLoading.value = true;
    
    quiz1Data.value = await loadFromDB(STORAGE_KEYS.QUIZ1);
    quiz2Data.value = await loadFromDB(STORAGE_KEYS.QUIZ2);
    quiz3Data.value = await loadFromDB(STORAGE_KEYS.QUIZ3);
    quiz4Data.value = await loadFromDB(STORAGE_KEYS.QUIZ4);
    quiz5Data.value = await loadFromDB(STORAGE_KEYS.QUIZ5);
    quiz6Data.value = await loadFromDB(STORAGE_KEYS.QUIZ6);
    quiz7Data.value = await loadFromDB(STORAGE_KEYS.QUIZ7);
    
    console.log('Quiz8: Loaded text data');
    console.log('Quiz8: Has singles:', hasSingles.value, 'Has albums:', hasAlbums.value);
    
    // Проверка полей прав для синглов
    if (hasSingles.value && quiz2Data.value?.singleTracks) {
      const singlesWithRights = quiz2Data.value.singleTracks.filter(track => track.rightsType).length;
      const singlesWithLinks = quiz2Data.value.singleTracks.filter(track => track.rightsContractLink).length;
      console.log(`Quiz8: Singles with rights: ${singlesWithRights}, with links: ${singlesWithLinks}`);
      
      // Детальная информация по каждому синглу
      quiz2Data.value.singleTracks.forEach((track, index) => {
        if (track.rightsType) {
          console.log(`  Сингл ${index + 1}: rightsType = ${track.rightsType}`);
          if (track.rightsContractLink) {
            console.log(`    rightsContractLink = ${track.rightsContractLink}`);
          }
        }
      });
    }
    
    // Проверка полей прав для треков альбомов
    if (hasAlbums.value && quiz2Data.value?.albums) {
      let rightsCount = 0;
      let linksCount = 0;
      quiz2Data.value.albums.forEach((album, albumIndex) => {
        album.tracks?.forEach((track, trackIndex) => {
          if (track.rightsType) {
            rightsCount++;
            console.log(`  Альбом ${albumIndex + 1}, трек ${trackIndex + 1}: rightsType = ${track.rightsType}`);
          }
          if (track.rightsContractLink) {
            linksCount++;
            console.log(`    rightsContractLink = ${track.rightsContractLink}`);
          }
        });
      });
      console.log(`Quiz8: Album tracks with rights: ${rightsCount}, with links: ${linksCount}`);
    }
    
    coverFile.value = await loadCoverFile();
    audioFilesList.value = await loadAllAudioFiles();
    appleMusicFile.value = await loadAppleMusicFile();
    karaokeFile.value = await loadKaraokeFile();
    
    console.log('Quiz8: Files loaded:', {
      cover: coverFile.value ? '✅' : '❌',
      audioCount: audioFilesList.value.length,
      appleMusic: appleMusicFile.value ? '✅' : '❌',
      karaoke: karaokeFile.value ? '✅' : '❌'
    });
    
    dataLoaded.value = true;
    
  } catch (error) {
    console.error('Error loading all data:', error);
    ElMessage.error('Ошибка загрузки данных');
  } finally {
    isLoading.value = false;
  }
};

// Вычисляемые свойства
const hasContract = computed(() => {
  return !!(quiz6Data.value?.contractData || quiz7Data.value?.contractData);
});

const hasSignature = computed(() => {
  return !!quiz7Data.value?.signature;
});

const hasCover = computed(() => {
  return coverFile.value !== null;
});

const audioFilesCount = computed(() => {
  return audioFilesList.value.length;
});

const contractData = computed(() => {
  return quiz7Data.value?.contractData || quiz6Data.value?.contractData;
});

const summaryData = computed((): AllData => {
  const data: AllData = {};
  
  if (quiz1Data.value) {
    data.singleCount = quiz1Data.value.singleCount || 0;
    data.albumCount = quiz1Data.value.albumCount || 0;
    data.clipCount = quiz1Data.value.clipCount || 0;
    data.cardCount = quiz1Data.value.cardCount || 0;
  }
  
  if (quiz2Data.value) {
    data.singleTracks = quiz2Data.value.singleTracks || [];
    data.albums = quiz2Data.value.albums || [];
  }
  
  if (quiz3Data.value) {
    data.releaseInfo = quiz3Data.value.formData || {};
  }
  
  if (quiz4Data.value) {
    data.userInfo = {
      userType: quiz4Data.value.formData?.userType,
      lastName: quiz4Data.value.formData?.lastName,
      firstName: quiz4Data.value.formData?.firstName,
      middleName: quiz4Data.value.formData?.middleName,
      passportNumber: quiz4Data.value.formData?.passportNumber
    };
  }
  
  if (quiz5Data.value) {
    data.genreInfo = {
      genre: quiz5Data.value.formData?.genre,
      hasDrugsMention: quiz5Data.value.formData?.hasDrugsMention,
      socialLinks: quiz5Data.value.formData?.socialLinks
    };
  }
  
  if (quiz6Data.value) {
    data.additionalInfo = {
      platforms: quiz6Data.value.formData?.platforms,
      otherPlatform: quiz6Data.value.formData?.otherPlatform,
      confirmNoRightsViolation: quiz6Data.value.formData?.confirmNoRightsViolation
    };
    data.contractData = quiz6Data.value.contractData;
  }
  
  if (quiz7Data.value) {
    data.agreement = quiz7Data.value.formData;
    if (quiz7Data.value.signature) {
      data.signature = quiz7Data.value.signature;
    }
    if (quiz7Data.value.contractData) {
      data.contractData = quiz7Data.value.contractData;
    }
  }
  
  const singleTracksCount = data.singleTracks?.length || 0;
  let albumTracksCount = 0;
  
  if (data.albums) {
    albumTracksCount = data.albums.reduce((total: number, album: Album) => {
      return total + (album.tracks?.length || 0);
    }, 0);
  }
  
  data.totalTracks = singleTracksCount + albumTracksCount;
  
  return data;
});

/** Данные шага 4 для сводки перед оплатой (в т.ч. реквизиты ИП) */
const quiz4FormSummary = computed(() => quiz4Data.value?.formData ?? null);

const userTypeSummaryLabel = computed(() => {
  const t = quiz4FormSummary.value?.userType;
  if (t === 'entrepreneur') return 'Индивидуальный предприниматель';
  if (t === 'individual') return 'Физическое лицо';
  return 'не указано';
});

const showIpSummaryBlock = computed(
  () => quiz4FormSummary.value?.userType === 'entrepreneur',
);

const canSubmit = computed(() => {
  const contractExists = hasContract.value;
  const signatureExists = hasSignature.value;
  const coverExists = hasCover.value;
  const audioExists = audioFilesCount.value > 0;
  
  console.log('Quiz8: canSubmit check:', {
    contractExists,
    signatureExists,
    coverExists,
    audioExists,
    result: contractExists && signatureExists && coverExists && audioExists
  });
  
  return contractExists && signatureExists && coverExists && audioExists;
});

// Вспомогательные функции
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Не указано';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  } catch {
    return dateString;
  }
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

const formatCitizenship = (citizenship?: string, other?: string): string => {
  if (!citizenship) return '';
  if (citizenship === 'RU') return 'Российская Федерация';
  if (citizenship === 'other') return other || '';
  return citizenship;
};

const cleanField = (value: string): string => {
  if (!value) return '';
  return value.replace(/[\/\\&@+=<>\[\]{}|~?*]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Функция для поиска product_id по имени файла
const findProductIdByFileName = (fileName: string): string | undefined => {
  if (!fileName) return undefined;
  
  if (hasSingles.value && quiz2Data.value?.singleTracks) {
    const singleTrack = quiz2Data.value.singleTracks.find(track => track.audioFileName === fileName);
    if (singleTrack?.product_id) {
      console.log(`✅ Найден product_id ${singleTrack.product_id} для файла ${fileName} в синглах`);
      return singleTrack.product_id;
    }
  }
  
  if (hasAlbums.value && quiz2Data.value?.albums) {
    for (const album of quiz2Data.value.albums) {
      if (album.tracks) {
        const albumTrack = album.tracks.find(track => track.audioFileName === fileName);
        if (albumTrack?.product_id) {
          console.log(`✅ Найден product_id ${albumTrack.product_id} для файла ${fileName} в альбомах`);
          return albumTrack.product_id;
        }
      }
    }
  }
  
  console.warn(`⚠️ Не найден product_id для файла: ${fileName}`);
  return undefined;
};

/** Ключи kuda-* под propText() в order.php: 1 = все площадки, 4 = другое */
const kudaFieldsFromQuiz3 = (form: Quiz3Data['formData'] | undefined) => {
  if (!form) {
    return {
      singleKuda: '1',
      singleKuda1: '1',
      othersKuda: '',
      albumKuda: '1',
      albumKuda1: '1',
      othersKudaAlbum: '',
    };
  }
  const raw = form.platforms;
  const p = Array.isArray(raw) ? raw[0] : raw;
  const isOther = p === 'other';
  const other = form.otherPlatform || '';
  if (isOther) {
    return {
      singleKuda: '4',
      singleKuda1: '4',
      othersKuda: other,
      albumKuda: '4',
      albumKuda1: '4',
      othersKudaAlbum: other,
    };
  }
  return {
    singleKuda: '1',
    singleKuda1: '1',
    othersKuda: '',
    albumKuda: '1',
    albumKuda1: '1',
    othersKudaAlbum: '',
  };
};

// Функция для создания FormData с ВСЕМИ файлами
const prepareOrderData = async (): Promise<FormData> => {
  const formData = new FormData();
  
  console.log('========== НАЧАЛО ФОРМИРОВАНИЯ ЗАПРОСА ==========');
  console.log('hasSingles:', hasSingles.value, 'hasAlbums:', hasAlbums.value);
  
  console.log('--- ДАННЫЕ ДЛЯ trackID[] И albumID[] ---');

  if (hasSingles.value && quiz2Data.value?.singleTracks) {
    console.log('trackID[] будет содержать:');
    quiz2Data.value.singleTracks.forEach((track, index) => {
      if (track.product_id) {
        console.log(`  [${index}] ${track.product_id} (${track.trackName})`);
      }
    });
  }

  if (hasAlbums.value && quiz2Data.value?.albums) {
    console.log('albumID[] будет содержать:');
    quiz2Data.value.albums.forEach((album, albumIndex) => {
      album.tracks?.forEach((track, trackIndex) => {
        if (track.product_id) {
          console.log(`  [Альбом ${albumIndex + 1}, Трек ${trackIndex + 1}] ${track.product_id} (${track.trackName})`);
        }
      });
    });
  }
  
  // --- 1. ШАГ 1: Количество (как в TM / newDock для order.php) ---
  formData.append('check-single', singleCount.value > 0 ? 'on' : 'off');
  formData.append('check-album', albumCount.value > 0 ? 'on' : 'off');
  formData.append('check-klip', clipCount.value > 0 ? 'on' : 'off');
  formData.append('check-karta', cardCount.value > 0 ? 'on' : 'off');
  console.log('check-*:', {
    single: singleCount.value > 0 ? 'on' : 'off',
    album: albumCount.value > 0 ? 'on' : 'off',
    klip: clipCount.value > 0 ? 'on' : 'off',
    karta: cardCount.value > 0 ? 'on' : 'off',
  });
  
  formData.append('COUNT', String(singleCount.value));
  formData.append('COUNT', String(albumCount.value));
  formData.append('COUNT', String(clipCount.value));
  formData.append('COUNT', String(cardCount.value));
  
  formData.append('countSingle', String(singleCount.value));
  formData.append('countAlbum', String(albumCount.value));

  // --- 2. ШАГ 2: Синглы ---
  if (hasSingles.value && quiz2Data.value?.singleTracks) {
    console.log('--- СИНГЛЫ (отправляем) ---');
    quiz2Data.value.singleTracks.forEach((track: SingleTrack, index: number) => {
      if (track.product_id) {
        console.log(`Сингл ${index + 1}: ID=${track.product_id}`);
        
        formData.append('trackID[]', track.product_id);
        formData.append(`path-file[${track.product_id}]`, track.audioFileName || '');
        formData.append(`name-file[${track.product_id}]`, track.audioFileName || '');
        formData.append(`artist[${track.product_id}]`, cleanField(track.performerName || ''));
        formData.append(`autor-music[${track.product_id}]`, cleanField(track.musicAuthor || ''));
        formData.append(`autor-words[${track.product_id}]`, cleanField(track.textAuthor || ''));
        formData.append(
          `autor-files[${track.product_id}]`,
          cleanField(track.trackName || track.performerName || ''),
        );
        
        if (track.rightsType) {
          let rightsText = '';
          switch (track.rightsType) {
            case 'author':
              rightsText = 'Я 100% автор музыки';
              break;
            case 'exclusive':
              rightsText = 'Исключительная лицензия / полная передача права';
              break;
            case 'wav':
              rightsText = 'Wav лицензия / Аренда';
              break;
            case 'mp3':
              rightsText = 'Mp3 лицензия / Аренда';
              break;
            case 'free':
              rightsText = 'free for profit / бит с ютуба';
              break;
            case 'gifted':
              rightsText = 'подарен / отдан бесплатно / сделан по дружбе';
              break;
            default:
              rightsText = track.rightsType;
          }
          
          formData.append(`instrument_rights[${track.product_id}]`, rightsText);
          console.log(`  instrument_rights[${track.product_id}]: ${rightsText}`);
        }
        
        if (track.rightsContractLink) {
          formData.append(`url_rights_doc[${track.product_id}]`, track.rightsContractLink);
          console.log(`  url_rights_doc[${track.product_id}]: ${track.rightsContractLink}`);
        }
      } else {
        console.warn(`Сингл ${index + 1} не имеет product_id!`);
      }
    });
  } else {
    console.log('--- НЕТ СИНГЛОВ, пропускаем ---');
  }

  // --- 3. ШАГ 2: Альбомы ---
  if (hasAlbums.value && quiz2Data.value?.albums) {
    console.log('--- АЛЬБОМЫ (отправляем) ---');
    quiz2Data.value.albums.forEach((album: Album, albumIndex: number) => {
      if (album.tracks) {
        album.tracks.forEach((track: AlbumTrack, trackIndex: number) => {
          if (track.product_id) {
            console.log(`Альбом ${albumIndex + 1}, Трек ${trackIndex + 1}: ID=${track.product_id}`);
            
            formData.append('albumID[]', track.product_id);
            formData.append(`path-file-album[${track.product_id}]`, track.audioFileName || '');
            formData.append(`name-file-album[${track.product_id}]`, track.audioFileName || '');
            
            formData.append(
              `artist-album[${track.product_id}]`,
              cleanField(track.performerName || '')
            );
            formData.append(
              `autor-files-album[${track.product_id}]`,
              cleanField(track.trackName || '')
            );
            
            formData.append(`autor-music-album[${track.product_id}]`, cleanField(track.musicAuthor || ''));
            formData.append(`autor-words-album[${track.product_id}]`, cleanField(track.textAuthor || ''));
            
            if (track.rightsType) {
              let rightsText = '';
              switch (track.rightsType) {
                case 'author':
                  rightsText = 'Я 100% автор музыки';
                  break;
                case 'exclusive':
                  rightsText = 'Исключительная лицензия / полная передача права';
                  break;
                case 'wav':
                  rightsText = 'Wav лицензия / Аренда';
                  break;
                case 'mp3':
                  rightsText = 'Mp3 лицензия / Аренда';
                  break;
                case 'free':
                  rightsText = 'free for profit / бит с ютуба';
                  break;
                case 'gifted':
                  rightsText = 'подарен / отдан бесплатно / сделан по дружбе';
                  break;
                default:
                  rightsText = track.rightsType;
              }
              
              formData.append(`instrument_rights[${track.product_id}]`, rightsText);
              console.log(`  instrument_rights[${track.product_id}]: ${rightsText}`);
            }
            
            if (track.rightsContractLink) {
              formData.append(`url_rights_doc[${track.product_id}]`, track.rightsContractLink);
              console.log(`  url_rights_doc[${track.product_id}]: ${track.rightsContractLink}`);
            }
          } else {
            console.warn(`Альбом ${albumIndex + 1}, трек ${trackIndex + 1} не имеет product_id!`);
          }
        });
      }
    });
  } else {
    console.log('--- НЕТ АЛЬБОМОВ, пропускаем ---');
  }

  formData.append(
    'instrumentals',
    buildInstrumentalsFromQuiz2(quiz2Data.value ?? undefined),
  );

  // --- 4. ШАГ 3: Информация о релизе ---
  if (quiz3Data.value?.formData) {
    const f = quiz3Data.value.formData;
    
    console.log('--- ШАГ 3: Информация о релизе ---');
    
    // ОТПРАВЛЯЕМ name_relize ТОЛЬКО ЕСЛИ ЕСТЬ СИНГЛЫ
    if (hasSingles.value) {
      const releaseName = cleanField(f.releaseName || 'Релиз');
      formData.append('name_relize', releaseName);
      console.log('name_relize отправлен (есть синглы):', releaseName);
    } else {
      console.log('name_relize НЕ отправлен (только альбом)');
    }
    
    const alias = cleanField(f.performerName || '');
    formData.append('alias', alias);

    const kuda = kudaFieldsFromQuiz3(f);
    formData.append('kuda-reliz1', kuda.singleKuda1);
    formData.append('kuda-reliz', kuda.singleKuda);
    formData.append('others-kuda', kuda.othersKuda);
    formData.append('calendar-reliz', f.releaseDate || '');
    
    const matValue = f.hasProfanity === 'yes' ? '12' : '13';
    formData.append('mat1', matValue);
    formData.append('mat', matValue);
    formData.append('others-mat', f.profanityTracks || '');
    
    formData.append('mat1ai', '13');
    formData.append('matai', '13');
    formData.append('others-matai', '');
    formData.append('all-obl', '1');
    formData.append('vk', f.vkLink || '');
    formData.append('email-clear', f.email || '');

    // Альбомные переменные - отправляем всегда, если есть альбом
    if (hasAlbums.value) {
      console.log('--- Альбомные переменные (отправляем) ---');
      const albumReleaseName = cleanField(f.releaseName || 'Альбом');
      formData.append('name-relize-album', albumReleaseName);
      formData.append('alias-album', alias);
      formData.append('kuda-reliz-album1', kuda.albumKuda1);
      formData.append('kuda-reliz-album', kuda.albumKuda);
      formData.append('others-kuda-album', kuda.othersKudaAlbum);
      formData.append('calendar-reliz-album', f.releaseDate || '');
      formData.append('mat-album1', matValue);
      formData.append('mat-album', matValue);
      formData.append('others-mat-album', f.profanityTracks || '');
      formData.append('mat-album1ai', '13');
      formData.append('mat-albumai', '13');
      formData.append('others-matai-album', '');
      formData.append('vk-album', f.vkLink || '');
      formData.append('email-clear-album', f.email || '');
    } else {
      console.log('--- НЕТ АЛЬБОМОВ, пропускаем альбомные переменные ---');
    }
  }

  // --- 5. ШАГ 4: Данные пользователя ---
  if (quiz4Data.value?.formData) {
    const u = quiz4Data.value.formData;
    console.log('--- ШАГ 4: Данные пользователя ---');
    
    formData.append('citysenship1', '');
    formData.append('citysenship', u.userType === 'individual' ? 'Физическое лицо' : 'Индивидуальный предприниматель');
    formData.append(
      'select__fizurlico',
      u.userType === 'entrepreneur' ? 'urlico' : 'fizlico',
    );
    formData.append('others', '');
    const legalAddr = u.legalAddress || '';
    const bankInn = u.bankInn || '';
    const corr = u.correspondentAccount || '';
    const bankAddr = u.bankLegalAddress || '';
    formData.append('yur-arg-org', legalAddr);
    formData.append('inn', u.inn || '');
    formData.append('ogrn', u.ogrn || '');
    formData.append('rasy', u.accountNumber || '');
    formData.append('bank', u.bankName || '');
    formData.append('inn-bank', bankInn);
    formData.append('bik', u.bankBik || '');
    formData.append('kor-s', corr);
    formData.append('yur-adr-bank', bankAddr);
    /* Дубликаты с подчёркиванием — order.php читает $_REQUEST['yur_arg_org'] и т.д. */
    formData.append('yur_arg_org', legalAddr);
    formData.append('inn_bank', bankInn);
    formData.append('kor_s', corr);
    formData.append('yur_adr_bank', bankAddr);
    
    formData.append('citysenship1', '');
    formData.append('citysenship', formatCitizenship(u.citizenship, u.otherCitizenship));
    formData.append('others', '');
    formData.append('FAM', u.lastName || '');
    formData.append('IMYA', u.firstName || '');
    formData.append('OTCH', u.middleName || '');
    formData.append('passport', u.passportNumber || '');
    formData.append('who-doing', u.passportIssuedBy || '');
    formData.append('when-doing', formatDateForAPI(u.passportIssueDate) || '22/22/2222');
    formData.append('adress', u.registrationAddress || '');
  }

  // --- 6. ШАГ 5: Жанр и текст ---
  if (quiz5Data.value?.formData) {
    const g = quiz5Data.value.formData;
    console.log('--- ШАГ 5: Жанр и текст ---');
    
    formData.append('genre', g.genre || '');
    formData.append('time-play', g.tiktokStartSeconds || '');
    formData.append('nark', g.hasDrugsMention === 'yes' ? '12' : '13');
    formData.append('narc', g.hasDrugsMention === 'yes' ? '12' : '13');
    formData.append('others-narc', g.drugsTracks || '');
    const appleLinks = g.appleMusicLinks || '';
    const spotifyLinks = g.spotifyLinks || '';
    formData.append('apple', appleLinks);
    formData.append('spotify', spotifyLinks);
    formData.append('link-apple', appleLinks);
    formData.append('link-spotify', spotifyLinks);
    formData.append('link-vk', g.vkLinks || '');
    formData.append('link-yandex', g.yandexMusicLinks || '');
    formData.append('socialartist', g.socialLinks || '');
  }

  // --- 7. ШАГ 6: Дополнительная информация ---
  if (quiz6Data.value?.formData) {
    const a = quiz6Data.value.formData;
    console.log('--- ШАГ 6: Дополнительная информация ---');

    const platformValue = a.platforms && a.platforms.length > 0 ? a.platforms[0] : '0';

    formData.append('otkuda-uznali1', platformValue);
    formData.append('otkuda-uznali', platformValue);
    formData.append('others-otkuda', a.otherPlatform || '');
    formData.append('comments', a.additionalComments || '');
    formData.append('plan', a.promoPlan || '');
    formData.append('link-bandlink', a.bandlinkUrl || '');
    formData.append('promocode', a.promoCode || '');
    const pdDisc = quiz6Data.value?.promoDiscount ?? 0;
    const afterPromoTotal = quiz6Data.value?.orderTotalAfterPromo;
    let promosumStr = '';
    if (
      pdDisc > 0 &&
      pdDisc < 100 &&
      afterPromoTotal != null &&
      Number.isFinite(afterPromoTotal)
    ) {
      const afterFloor = Math.floor(afterPromoTotal);
      const approxBefore = Math.round((afterFloor * 100) / (100 - pdDisc));
      promosumStr = String(Math.max(0, approxBefore - afterFloor));
    }
    formData.append('promosum', promosumStr);

    const usedBonuses = Math.max(0, Math.floor(Number(a.usedBonuses || 0)));
    let sumOrderBeforeBonus = quiz6Data.value?.orderTotalAfterPromo;
    if (sumOrderBeforeBonus == null || !Number.isFinite(sumOrderBeforeBonus)) {
      const finalSnap = quiz6Data.value?.finalPayableAmount;
      if (finalSnap != null && Number.isFinite(finalSnap)) {
        sumOrderBeforeBonus = Math.max(0, Math.floor(finalSnap + usedBonuses));
      } else {
        const baseAmount = 2590;
        const pd = quiz6Data.value?.promoDiscount || 0;
        sumOrderBeforeBonus =
          pd > 0 ? Math.floor(baseAmount * (100 - pd) / 100) : baseAmount;
      }
    }
    formData.append('sumOrder', String(Math.max(0, Math.floor(sumOrderBeforeBonus))));
    formData.append('refBonus', String(usedBonuses));
    formData.append('policy', a.confirmNoRightsViolation ? 'on' : 'off');
    
    console.log('policy:', a.confirmNoRightsViolation ? 'on' : 'off');
  }

  // --- 8. ОТВЕТ ИЗ NEWDOCK ---
  if (contractData.value) {
    console.log('--- ОТВЕТ ИЗ NEWDOCK ---');
    console.log('docName:', contractData.value.doc_pdf);
    console.log('docNameDocx:', contractData.value.doc_docx);
    
    formData.append('docName', contractData.value.doc_pdf || '');
    formData.append('docNameDocx', contractData.value.doc_docx || '');
    
    if (contractData.value.images && Array.isArray(contractData.value.images)) {
      contractData.value.images.forEach((img: string, index: number) => {
        console.log(`imgDoc${index}:`, img);
        formData.append(`imgDoc${index}`, img);
      });
    }
  }

  // --- 9. ШАГ 7: Согласия и Подпись ---
  const acceptTerms = quiz7Data.value?.formData?.acceptTerms === true;
  const acceptPrivacy = quiz7Data.value?.formData?.acceptPrivacy === true;
  
  console.log('--- ШАГ 7: Согласия и Подпись ---');
  console.log('quiz-policy-one:', acceptTerms ? 'on' : 'off');
  console.log('quiz-policy-two:', acceptPrivacy ? 'on' : 'off');
  
  formData.append('quiz-policy-one', acceptTerms ? 'on' : 'off');
  formData.append('quiz-policy-two', acceptPrivacy ? 'on' : 'off');
  
  if (quiz7Data.value?.signature) {
    console.log('podp-url: [подпись получена]');
    formData.append('podp-url', quiz7Data.value.signature);
  }

  // --- 10. ПРИКРЕПЛЯЕМ ВСЕ ФАЙЛЫ ---
  console.log('--- ПРИКРЕПЛЯЕМ ФАЙЛЫ ---');
  
  let totalFiles = 0;
  if (coverFile.value) totalFiles++;
  totalFiles += audioFilesList.value.length;
  if (appleMusicFile.value) totalFiles++;
  if (karaokeFile.value) totalFiles++;
  totalFilesCount.value = totalFiles;
  uploadedCount.value = 0;
  let currentFileIndex = 0;
  
  // 10.1 Прикрепляем обложку
  if (coverFile.value) {
    if (hasSingles.value && singleCount.value > 1) {
      for (let i = 1; i <= singleCount.value; i++) {
        formData.append(`file-obl${i}`, coverFile.value);
        console.log(`Прикреплена обложка как file-obl${i}:`, coverFile.value.name);
      }
    } else if (hasAlbums.value) {
      formData.append('file-obl-album', coverFile.value);
      console.log('Прикреплена обложка как file-obl-album:', coverFile.value.name);
    } else {
      formData.append('file-obl1', coverFile.value);
      console.log('Прикреплена обложка как file-obl1:', coverFile.value.name);
    }
    
    currentFileIndex++;
    uploadedCount.value = currentFileIndex;
  }
  
  // 10.2 Прикрепляем аудиофайлы по их product_id (с резервным поиском)
  for (let i = 0; i < audioFilesList.value.length; i++) {
    const audio = audioFilesList.value[i];
    let productId = audio.productId;
    
    if (!productId) {
      productId = findProductIdByFileName(audio.fileName);
      if (productId) {
        console.log(`✅ Найден product_id ${productId} для файла ${audio.fileName} через поиск`);
      }
    }
    
    if (productId) {
      formData.append(`file[${productId}]`, audio.file);
      console.log(`Прикреплен аудиофайл file[${productId}]:`, audio.fileName);
    } else {
      console.warn('⚠️ Аудиофайл без product_id, пропускаем:', audio.fileName);
    }
    
    currentFileIndex++;
    uploadedCount.value = currentFileIndex;
  }
  
  // 10.3 Прикрепляем Apple Music файл (docx)
  if (appleMusicFile.value) {
    formData.append('apple-music-text', appleMusicFile.value);
    console.log('Прикреплен Apple Music текст (docx):', appleMusicFile.value.name);
    
    currentFileIndex++;
    uploadedCount.value = currentFileIndex;
  }
  
  // 10.4 Прикрепляем Karaoke файл (ttml)
  if (karaokeFile.value) {
    formData.append('karaoke-text', karaokeFile.value);
    console.log('Прикреплен Karaoke текст (ttml):', karaokeFile.value.name);
    
    currentFileIndex++;
    uploadedCount.value = currentFileIndex;
  }

  // --- 11. ФИНАЛЬНАЯ ПРОВЕРКА ---
  console.log('========== ФИНАЛЬНАЯ ПРОВЕРКА ==========');
  console.log('Проверяем критически важные поля:');
  console.log('name-relize:', formData.get('name-relize'));
  
  if (hasSingles.value) {
    console.log('trackID[]:', formData.getAll('trackID[]'));
    console.log('Количество trackID[]:', formData.getAll('trackID[]').length);
    
    // Логируем отправленные права для синглов
    const singlesRightsCount = quiz2Data.value?.singleTracks?.filter(t => t.rightsType).length || 0;
    console.log(`📊 Синглы с instrument_rights: ${singlesRightsCount}`);
  }
  
  if (hasAlbums.value) {
    console.log('albumID[]:', formData.getAll('albumID[]'));
    console.log('Количество albumID[]:', formData.getAll('albumID[]').length);
    console.log('name-relize-album:', formData.get('name-relize-album'));
    
    // Логируем отправленные права для треков альбомов
    let albumRightsCount = 0;
    let albumLinksCount = 0;
    quiz2Data.value?.albums?.forEach(album => {
      album.tracks?.forEach(track => {
        if (track.rightsType) albumRightsCount++;
        if (track.rightsContractLink) albumLinksCount++;
      });
    });
    console.log(`📊 Треки альбомов с instrument_rights: ${albumRightsCount}`);
    console.log(`📊 Треки альбомов с url_rights_doc: ${albumLinksCount}`);
  }
  
  console.log('quiz-policy-one:', formData.get('quiz-policy-one'));
  console.log('quiz-policy-two:', formData.get('quiz-policy-two'));
  console.log('Количество файлов:', totalFilesCount.value);
  console.log('Обложка:', coverFile.value ? '✅' : '❌');
  console.log('Аудиофайлы:', audioFilesList.value.length);
  console.log('Apple Music файл:', appleMusicFile.value ? '✅' : '❌');
  console.log('Karaoke файл:', karaokeFile.value ? '✅' : '❌');
  
  if (hasSingles.value) {
    const singlesWithoutId = quiz2Data.value?.singleTracks?.filter(t => !t.product_id) || [];
    if (singlesWithoutId.length > 0) {
      console.warn(`ВНИМАНИЕ: ${singlesWithoutId.length} синглов без product_id!`);
    }
  }
  
  if (hasAlbums.value) {
    let tracksWithoutId = 0;
    quiz2Data.value?.albums?.forEach(album => {
      album.tracks?.forEach(track => {
        if (!track.product_id) tracksWithoutId++;
      });
    });
    if (tracksWithoutId > 0) {
      console.warn(`ВНИМАНИЕ: ${tracksWithoutId} треков альбомов без product_id!`);
    }
  }
  
  console.log('=========================================');

  return formData;
};

const goBack = () => {
  if (showPaymentWay.value) {
    resetPaymentWay();
    return;
  }
  emit('go-back');
};

/** Разбор JSON из order.php независимо от того, пришёл объект или строка */
const parseOrderPhpPayload = (raw: unknown): { error: number; message: string } | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object' && raw !== null && 'error' in raw) {
    const o = raw as { error: number; message?: string };
    const errNum = Number(o.error);
    return {
      error: Number.isFinite(errNum) ? errNum : 1,
      message: typeof o.message === 'string' ? o.message : '',
    };
  }
  if (typeof raw === 'string') {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const o = JSON.parse(jsonMatch[0]) as { error?: number; message?: string };
        if (o.error !== undefined) {
          const errNum = Number(o.error);
          return {
            error: Number.isFinite(errNum) ? errNum : 1,
            message: typeof o.message === 'string' ? o.message : '',
          };
        }
      } catch {
        return null;
      }
    }
  }
  return null;
};

/** Номер для UI: из "class 890" или код error */
const getOrderErrorDisplayNumber = (payload: { error: number; message: string }): string => {
  const m = payload.message.match(/class\s+(\d+)/i);
  if (m) return m[1];
  if (Number.isFinite(payload.error)) return String(payload.error);
  return '—';
};

/** Краткое пояснение, каких данных не хватает или что проверить */
const mapOrderServerMessageToHint = (message: string): string => {
  const t = message.toLowerCase();
  if (t.includes('trackid')) {
    return 'не переданы идентификаторы синглов (trackID) — проверьте шаг с треками и загрузку на сервер';
  }
  if (t.includes('albumid')) {
    return 'не переданы идентификаторы треков альбома (albumID)';
  }
  if (t.includes('path-file-album') || t.includes('path-file')) {
    return 'не переданы пути к аудиофайлам (path-file) — треки должны быть загружены';
  }
  if (t.includes('названия релиза') || t.includes('name_relize') || t.includes('name-relize')) {
    return 'не указано название релиза';
  }
  if (t.includes('не заполнено') && t.includes('альбом')) {
    return 'для альбома не заполнены поля артиста / авторов музыки и текста';
  }
  if (t.includes('фио авторов') || t.includes('имя артиста')) {
    return 'не заполнены артист, авторы музыки и текста по синглу';
  }
  if (t.includes('договор') && (t.includes('не найден') || t.includes('ошибка'))) {
    return 'не найден файл договора (docx/pdf) — повторите шаг с договором';
  }
  if (t.includes('согласие') || t.includes('оферт') || t.includes('персональн')) {
    return 'не приняты обязательные согласия';
  }
  if (t.includes('авторизац') || t.includes('сессии')) {
    return 'сессия истекла — войдите в аккаунт заново';
  }
  if (t.includes('бонус')) {
    return 'ошибка списания бонусов — проверьте сумму и баланс бонусов';
  }
  if (t.includes('обложк') && t.includes('больш')) {
    return 'файл обложки слишком большой';
  }
  if (t.includes('сохранения заказа') || t.includes('создания релиза')) {
    return 'сервер не смог сохранить заказ или создать релиз';
  }
  if (t.includes('instrument_right') || t.includes('право владения')) {
    return 'не заполнены или не приняты данные о правах на треки (тип прав / ссылка на документ)';
  }
  if (t.includes('обложк')) {
    return 'проблема с файлом обложки';
  }
  return message.trim() || 'сервер отклонил запрос без пояснения';
};

const showOrderSubmissionError = (payload: { error: number; message: string }) => {
  const num = getOrderErrorDisplayNumber(payload);
  const hint = mapOrderServerMessageToHint(payload.message);
  const text = `Ошибка (${num}): ${hint}. Проверьте правильность заполнения данных или пришлите скриншот ошибки в тех. поддержку`;
  ElMessage.error({
    message: text,
    duration: 0,
    showClose: true,
    grouping: true,
  });
};

const handleFinish = async () => {
  try {
    isSubmitting.value = true;
    uploadProgress.value = 0;
    uploadedCount.value = 0;
    
    console.log('========== НАЧАЛО ОТПРАВКИ ЗАКАЗА ==========');
    console.log('Проверка наличия всех необходимых данных:');
    
    if (!hasContract.value) {
      console.error('❌ Данные договора не найдены');
      ElMessage.error('Данные договора не найдены');
      isSubmitting.value = false;
      return;
    } else {
      console.log('✅ Договор:', contractData.value);
    }
    
    if (!hasSignature.value) {
      console.error('❌ Подпись не найдена');
      ElMessage.error('Подпись не найдена. Пожалуйста, вернитесь на шаг 7 и подпишите договор.');
      isSubmitting.value = false;
      return;
    } else {
      console.log('✅ Подпись:', quiz7Data.value?.signature?.substring(0, 50) + '...');
    }
    
    if (!hasCover.value) {
      console.error('❌ Обложка не найдена');
      ElMessage.error('Обложка не найдена');
      isSubmitting.value = false;
      return;
    } else {
      console.log('✅ Обложка:', coverFileName.value);
    }
    
    if (audioFilesCount.value === 0) {
      console.error('❌ Аудиофайлы не найдены');
      ElMessage.error('Аудиофайлы не найдены');
      isSubmitting.value = false;
      return;
    } else {
      console.log(`✅ Аудиофайлы: ${audioFilesCount.value} шт.`);
      audioFilesList.value.forEach((audio, index) => {
        console.log(`   Аудио ${index + 1}:`, {
          fileName: audio.fileName,
          productId: audio.productId,
          type: audio.type
        });
      });
    }
    
    if (!quiz7Data.value?.formData?.acceptTerms) {
      console.error('❌ Условия оферты не приняты');
      ElMessage.error('Необходимо принять условия оферты');
      isSubmitting.value = false;
      return;
    } else {
      console.log('✅ Условия оферты приняты');
    }
    
    if (!quiz7Data.value?.formData?.acceptPrivacy) {
      console.error('❌ Согласие на обработку данных не дано');
      ElMessage.error('Необходимо дать согласие на обработку персональных данных');
      isSubmitting.value = false;
      return;
    } else {
      console.log('✅ Согласие на обработку данных дано');
    }
    
    console.log('\n--- ДАННЫЕ ИЗ ВСЕХ ШАГОВ ---');
    
    console.log('Quiz1 (Количество):', {
      singleCount: singleCount.value,
      albumCount: albumCount.value,
      clipCount: clipCount.value,
      cardCount: cardCount.value,
      hasSingles: hasSingles.value,
      hasAlbums: hasAlbums.value
    });
    
    console.log('Quiz2 (Синглы и альбомы):');
    if (hasSingles.value && quiz2Data.value?.singleTracks) {
      console.log('  Синглы:');
      quiz2Data.value.singleTracks.forEach((track, index) => {
        console.log(`    ${index + 1}.`, {
          trackName: track.trackName,
          performerName: track.performerName,
          musicAuthor: track.musicAuthor,
          textAuthor: track.textAuthor,
          audioFileName: track.audioFileName,
          product_id: track.product_id
        });
      });
    }
    
    if (hasAlbums.value && quiz2Data.value?.albums) {
      console.log('  Альбомы:');
      quiz2Data.value.albums.forEach((album, albumIndex) => {
        console.log(`    Альбом ${albumIndex + 1}:`, {
          albumName: album.albumName
        });
        album.tracks?.forEach((track, trackIndex) => {
          console.log(`      Трек ${trackIndex + 1}:`, {
            trackName: track.trackName,
            audioFileName: track.audioFileName,
            product_id: track.product_id
          });
        });
      });
    }
    
    console.log('Quiz3 (Информация о релизе):', quiz3Data.value?.formData);
    console.log('Quiz3 (Обложка):', quiz3Data.value?.coverFileInfo);
    
    console.log('Quiz4 (Данные пользователя):', {
      userType: quiz4Data.value?.formData?.userType,
      lastName: quiz4Data.value?.formData?.lastName,
      firstName: quiz4Data.value?.formData?.firstName,
      middleName: quiz4Data.value?.formData?.middleName,
      passportNumber: quiz4Data.value?.formData?.passportNumber
    });
    
    console.log('Quiz5 (Жанр и текст):', quiz5Data.value?.formData);
    console.log('Quiz5 (Файлы):', {
      appleMusic: quiz5Data.value?.appleMusicFileInfo,
      karaoke: quiz5Data.value?.karaokeFileInfo
    });
    
    console.log('Quiz6 (Дополнительная информация):', quiz6Data.value?.formData);
    console.log('Quiz6 (Промо и суммы):', {
      promoApplied: quiz6Data.value?.promoApplied,
      promoDiscount: quiz6Data.value?.promoDiscount,
      orderTotalAfterPromo: quiz6Data.value?.orderTotalAfterPromo,
      finalPayableAmount: quiz6Data.value?.finalPayableAmount
    });
    
    console.log('Quiz7 (Согласия):', quiz7Data.value?.formData);
    console.log('Quiz7 (Подпись):', quiz7Data.value?.signature ? '✅ есть' : '❌ нет');
    
    console.log('Договор (из newdock):', contractData.value);
    
    console.log('\n--- ПРОВЕРКА PRODUCT_ID ---');
    
    let missingProductIds = false;
    
    if (hasSingles.value && quiz2Data.value?.singleTracks) {
      quiz2Data.value.singleTracks.forEach((track, index) => {
        if (!track.product_id) {
          console.error(`❌ Сингл ${index + 1} не имеет product_id!`, track);
          missingProductIds = true;
        } else {
          console.log(`✅ Сингл ${index + 1} имеет product_id:`, track.product_id);
        }
      });
    }
    
    if (hasAlbums.value && quiz2Data.value?.albums) {
      quiz2Data.value.albums.forEach((album, albumIndex) => {
        album.tracks?.forEach((track, trackIndex) => {
          if (!track.product_id) {
            console.error(`❌ Альбом ${albumIndex + 1}, трек ${trackIndex + 1} не имеет product_id!`, track);
            missingProductIds = true;
          } else {
            console.log(`✅ Альбом ${albumIndex + 1}, трек ${trackIndex + 1} имеет product_id:`, track.product_id);
          }
        });
      });
    }
    
    if (missingProductIds) {
      console.warn('⚠️ Есть треки без product_id! Они не будут отправлены на сервер.');
    } else {
      console.log('✅ Все треки имеют product_id');
    }
    
    ElMessage.info('Подготовка данных для отправки...');
    
    console.log('\n--- ПОДГОТОВКА FORM DATA ---');
    const formData = await prepareOrderData();
    
    console.log('Содержимое FormData:');
    for (const pair of (formData as any).entries()) {
      if (pair[1] instanceof File) {
        console.log(`  ${pair[0]}: [ФАЙЛ] ${pair[1].name} (${pair[1].size} bytes)`);
      } else {
        console.log(`  ${pair[0]}: ${pair[1]}`);
      }
    }
    
    let fileCount = 0;
    for (const pair of (formData as any).entries()) {
      if (pair[1] instanceof File) fileCount++;
    }
    console.log(`\n📊 Всего файлов в FormData: ${fileCount}`);
    
    ElMessage.info(`Отправка данных на сервер (${totalFilesCount.value} файлов)...`);
    
    console.log('\n--- ОТПРАВКА ЗАПРОСА В order.php ---');
    const response = await FileRequest("post", '/ajax_vue/ajax/order.php', formData);

    console.log('✅ Ответ сервера (полный):', response);
    console.log('✅ Статус ответа:', response.status);
    console.log('✅ Данные ответа (raw):', response.data);

    if (response && response.data) {
      const responseData = response.data;

      const orderPayload = parseOrderPhpPayload(responseData);
      if (orderPayload && orderPayload.error !== 0) {
        console.error('❌ order.php вернул ошибку:', orderPayload);
        showOrderSubmissionError(orderPayload);
        return;
      }

      const successData = extractOrderSuccessData(responseData);
      if (successData && tryShowPaymentWay(successData)) {
        console.log('💳 Показ PaymentWay:', {
          order_id: successData.order_id,
          usdt: usdtPaymentUrlResolved.value,
          card: cardPaymentUrlResolved.value,
        });
        return;
      }

      let orderId: string | number | null | undefined =
        successData?.order_id ??
        (typeof responseData === 'object' && responseData !== null && 'data' in responseData
          ? (responseData as { data?: { order_id?: string | number } }).data?.order_id
          : undefined);

      if (!orderId && typeof responseData === 'string') {
        const jsonMatch = responseData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as { data?: { order_id?: string | number } };
            orderId = parsed.data?.order_id;
          } catch {
            /* ignore */
          }
        }
      }

      if (orderId) {
        console.log('✅ Заказ создан, ID:', orderId);
        ElMessage.success(`Заказ №${orderId} успешно оформлен!`);
        emit('finish');
        return;
      }

      console.error('❌ Нет данных оплаты и order_id в ответе сервера');
      ElMessage.warning(
        'Заказ оформлен, но ссылка на оплату не получена. Проверьте правильность заполнения данных или пришлите скриншот ошибки в тех. поддержку',
      );
      emit('finish');
      return;
    } else {
      console.error('❌ Пустой ответ от сервера');
      ElMessage.error({
        message:
          'Ошибка (—): сервер вернул пустой ответ. Проверьте правильность заполнения данных или пришлите скриншот ошибки в тех. поддержку',
        duration: 0,
        showClose: true,
      });
      emit('finish');
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка при отправке заказа:', error);

    const payload =
      error.response?.data !== undefined
        ? parseOrderPhpPayload(error.response.data)
        : null;
    if (payload && payload.error !== 0) {
      showOrderSubmissionError(payload);
    } else if (error.response) {
      console.error('❌ Статус ошибки:', error.response.status);
      console.error('❌ Данные ошибки:', error.response.data);
      const raw = error.response.data;
      if (typeof raw === 'string' && raw.trim()) {
        showOrderSubmissionError({
          error: error.response.status,
          message: raw.replace(/<[^>]+>/g, '').slice(0, 500),
        });
      } else {
        ElMessage.error({
          message: `Ошибка (${error.response.status}): ответ сервера без распознанного формата. Проверьте правильность заполнения данных или пришлите скриншот ошибки в тех. поддержку`,
          duration: 0,
          showClose: true,
        });
      }
    } else if (error.request) {
      console.error('❌ Нет ответа от сервера:', error.request);
      ElMessage.error({
        message:
          'Ошибка (сеть): нет ответа от сервера. Проверьте соединение или пришлите скриншот ошибки в тех. поддержку',
        duration: 0,
        showClose: true,
      });
    } else {
      ElMessage.error({
        message: `Ошибка (—): ${error.message || 'Не удалось отправить данные'}. Проверьте правильность заполнения данных или пришлите скриншот ошибки в тех. поддержку`,
        duration: 0,
        showClose: true,
      });
    }
  } finally {
    isSubmitting.value = false;
    console.log('========== ЗАВЕРШЕНИЕ ОТПРАВКИ ==========');
  }
};

watch([quiz6Data, quiz7Data, coverFile, audioFilesList, appleMusicFile, karaokeFile], () => {
  console.log('Quiz8: Data changed, canSubmit:', canSubmit.value);
}, { deep: true });

onMounted(async () => {
  try {
    await initDB();
    await loadAllData();
  } catch (error) {
    console.error('Error in onMounted:', error);
  }
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

  &_contract_loading {
    position: relative;
    margin: 20px 0 30px;
    padding: 30px;
    background-color: var(--bg-color);
    border-radius: 8px;
    text-align: center;
    border: 1px solid var(--color);
  }
}

.quiz__simple_summary {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-color);
  font-size: 16px;
  line-height: 2;
}

.quiz__simple_summary_ip {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.quiz__simple_summary_ip_title {
  font-weight: 600;
  margin-bottom: 8px;
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

.text_small {
  font-size: 12px;
  color: var(--text-gray);
}
</style>