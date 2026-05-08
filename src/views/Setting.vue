<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sendRequest, FileRequest, postUrlEncodedRequest } from '@/utils/api';
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQuery } from 'vue-router';
import Tr from "@/i18n/translation";

const loading = ref<boolean>(true); // Изначально true, пока грузятся все данные
const loadingSvg = `
  <path class="path" d="
    M 30 15
    L 28 17
    M 25.61 25.61
    A 15 15, 0, 0, 1, 15 30
    A 15 15, 0, 1, 1, 27.99 7.5
    L 15 15
  " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
`;

// Счетчик загруженных данных и общее количество запросов
const loadedCount = ref(0);

import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import PhotoSVG from "@/uikit/icon/PhotoSVG.vue";
import UploadSVG from "@/uikit/icon/UploadSVG.vue";

const router = useRouter();
const route = useRoute();

const highlightPassportSection = ref(false);
const highlightBankSection = ref(false);
const highlightSectionFadeOut = ref(false);
let releaseHighlightFadeTimer: number | null = null;
let releaseHighlightClearTimer: number | null = null;
const HIGHLIGHT_HOLD_MS = 7000;
const HIGHLIGHT_FADE_MS = 600;

let releaseBlockedHandled = false;

const settingQueryWithoutReleaseBlock = (): LocationQuery => {
  const q = { ...route.query };
  delete q.releaseBlocked;
  delete q.focus;
  return q;
};

const clearReleaseHighlightTimers = () => {
  if (releaseHighlightFadeTimer != null) {
    clearTimeout(releaseHighlightFadeTimer);
    releaseHighlightFadeTimer = null;
  }
  if (releaseHighlightClearTimer != null) {
    clearTimeout(releaseHighlightClearTimer);
    releaseHighlightClearTimer = null;
  }
};

const handleBlockedReleaseFromQuiz = async () => {
  if (
    route.query.releaseBlocked !== '1' ||
    loading.value ||
    releaseBlockedHandled
  ) {
    return;
  }

  releaseBlockedHandled = true;

  const focusRaw = route.query.focus;
  const section =
    typeof focusRaw === 'string' && focusRaw === 'requisites'
      ? 'requisites'
      : ('passport' as const);

  try {
    await router.replace(
      Tr.i18nRoute({
        name: 'setting',
        query: settingQueryWithoutReleaseBlock(),
      }),
    );

    await nextTick();
    await nextTick();

    await refreshUserData();

    const anchorId =
      section === 'requisites' ? 'settings-bank-requisites' : 'settings-passport';
    const anchor = document.getElementById(anchorId);
    const scrollToAnchor = () =>
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scrollToAnchor();
    requestAnimationFrame(() => scrollToAnchor());

    if (section === 'requisites') {
      highlightBankSection.value = true;
    } else {
      highlightPassportSection.value = true;
    }

    const text =
      section === 'requisites'
        ? 'Чтобы выложить релиз, заполните банковские реквизиты в блоке ниже и сохраните их.'
        : 'Чтобы выложить релиз, заполните паспортные данные (кнопка «Изменить» в блоке ниже).';

    const scrollSave = { x: window.scrollX, y: window.scrollY };

    const restoreAfterDialog = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (anchor?.isConnected) {
            anchor.scrollIntoView({ behavior: 'auto', block: 'center' });
          } else {
            window.scrollTo({
              left: scrollSave.x,
              top: scrollSave.y,
              behavior: 'auto',
            });
          }
        });
      });
    };

    try {
      await ElMessageBox.alert(text, 'Нужно заполнить профиль', {
        confirmButtonText: 'Понятно',
        type: 'warning',
        lockScroll: false,
      });
    } catch {
      /* закрыли диалог */
    } finally {
      restoreAfterDialog();
      clearReleaseHighlightTimers();
      releaseHighlightFadeTimer = window.setTimeout(() => {
        releaseHighlightFadeTimer = null;
        highlightSectionFadeOut.value = true;
        releaseHighlightClearTimer = window.setTimeout(() => {
          releaseHighlightClearTimer = null;
          highlightBankSection.value = false;
          highlightPassportSection.value = false;
          highlightSectionFadeOut.value = false;
        }, HIGHLIGHT_FADE_MS);
      }, HIGHLIGHT_HOLD_MS);
    }
  } finally {
    releaseBlockedHandled = false;
  }
};

const profileRegion = ref('Russia');
const isRussia = computed(() => profileRegion.value === 'Russia');

// Тип банковских данных
const bankDetailsType = ref<'individual' | 'entrepreneur'>('individual');

// Основная форма данных
const formData = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  country: '',
  passport: {
    series: '',
    number: '',
    issuedBy: '',
    issueDate: '',
    birthDate: '',
    registrationAddress: ''
  }
})

// Банковские данные
const bankDetails = reactive({
  individual: {
    fullName: '',
    account: '',
    bik: ''
  },
  entrepreneur: {
    fullName: '',
    ogrnip: '',
    address: '',
    inn: '',
    account: '',
    bik: '',
    correspondentAccount: '',
    email: ''
  },
  international: {
    binancePayId: '',
    cardNumber: '',
    cryptoWallet: ''
  }
})

// Состояние для ошибок валидации
const errors = reactive({
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  country: '',
  password: '',
  confirmPassword: '',
  passport: {} as Record<string, string>,
  bankDetails: {
    individual: {} as Record<string, string>,
    entrepreneur: {} as Record<string, string>,
    international: {} as Record<string, string>
  }
})

// Загрузочное состояние для операций
const isOperationLoading = ref(false)

// Состояние для загрузки фото
const profileImage = ref<string | null>(null)
const isUploadingImage = ref(false)

// Состояние для модальных окон
const showPassportModal = ref(false)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)

// Данные формы паспорта
const passportForm = reactive({
  citizenship: '',
  otherCitizenship: '',
  issuedBy: '',
  fam: '',
  imya: '',
  otch: '',
  number: '',
  date: '',
  adress: '',
})

/** `settings.passport` из ответа кабинета (getData / fetchSharedCabinetGetData) */
interface SettingsPassportPayload {
  citizenship?: string
  issuedBy?: string
  familyName?: string
  firstName?: string
  patronymic?: string
  issueDate?: string
  passportSeries?: string
  registrationAddress?: string
}

const PASSPORT_KNOWN_CITIZENSHIPS = new Set([
  'Россия',
  'Беларусь',
  'Казахстан',
  'Армения',
  'Кыргызстан',
])

function mapStoredCitizenshipForForm(raw: string): {
  citizenship: string
  otherCitizenship: string
} {
  const c = (raw || '').trim()
  if (!c) return { citizenship: '', otherCitizenship: '' }
  const ruAliases = new Set(['РФ', 'Российская Федерация', 'Russia', 'RU'])
  if (ruAliases.has(c) || c === 'Россия') {
    return { citizenship: 'Россия', otherCitizenship: '' }
  }
  if (PASSPORT_KNOWN_CITIZENSHIPS.has(c)) {
    return { citizenship: c, otherCitizenship: '' }
  }
  return { citizenship: 'Другое', otherCitizenship: c }
}

function applyPassportFromApi(passport: SettingsPassportPayload | undefined) {
  if (!passport) return
  const mapped = mapStoredCitizenshipForForm(passport.citizenship || '')
  passportForm.citizenship = mapped.citizenship
  passportForm.otherCitizenship = mapped.otherCitizenship
  passportForm.issuedBy = passport.issuedBy || ''
  passportForm.fam = passport.familyName || ''
  passportForm.imya = passport.firstName || ''
  passportForm.otch = passport.patronymic || ''
  passportForm.number = passport.passportSeries || ''
  passportForm.adress = passport.registrationAddress || ''
  passportForm.date = passport.issueDate || ''
}

// Текст подтверждения удаления
const deleteConfirmText = ref('')

// Валидация email
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Основная валидация формы
const validateForm = (field?: string) => {
  if (!field || field === 'firstName') {
    errors.firstName = formData.firstName ? '' : 'Имя обязательно для заполнения'
  }
  
  if (!field || field === 'lastName') {
    errors.lastName = formData.lastName ? '' : 'Фамилия обязательна для заполнения'
  }
  
  if (!field || field === 'nickname') {
    errors.nickname = formData.nickname ? '' : 'Псевдоним обязателен для заполнения'
  }
  
  if (!field || field === 'email') {
    if (!formData.email) {
      errors.email = 'Email обязателен для заполнения'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Введите корректный email'
    } else {
      errors.email = ''
    }
  }
  
  if (!field || field === 'country') {
    errors.country = formData.country ? '' : 'Страна обязательна для заполнения'
  }
}

// Валидация банковских данных
const validateBankDetails = () => {
  // Очищаем ошибки
  errors.bankDetails.individual = {}
  errors.bankDetails.entrepreneur = {}
  
  if (bankDetailsType.value === 'individual') {
    const indErrors: Record<string, string> = {}
    
    if (!bankDetails.individual.fullName) indErrors.fullName = 'ФИО обязательно'
    if (!bankDetails.individual.account) indErrors.account = 'Расчетный счет обязателен'
    if (!bankDetails.individual.bik) indErrors.bik = 'БИК обязателен'
    
    errors.bankDetails.individual = indErrors
    return Object.keys(indErrors).length === 0
  } else {
    const entErrors: Record<string, string> = {}
    
    if (!bankDetails.entrepreneur.fullName) entErrors.fullName = 'ФИО обязательно'
    if (!bankDetails.entrepreneur.ogrnip) entErrors.ogrnip = 'ОГРНИП обязателен'
    if (!bankDetails.entrepreneur.address) entErrors.address = 'Адрес обязателен'
    if (!bankDetails.entrepreneur.inn) entErrors.inn = 'ИНН обязателен'
    if (!bankDetails.entrepreneur.account) entErrors.account = 'Расчетный счет обязателен'
    if (!bankDetails.entrepreneur.bik) entErrors.bik = 'БИК обязателен'
    if (!bankDetails.entrepreneur.correspondentAccount) entErrors.correspondentAccount = 'Корреспондентский счет обязателен'
    if (!bankDetails.entrepreneur.email) {
      entErrors.email = 'Email обязателен'
    } else if (!validateEmail(bankDetails.entrepreneur.email)) {
      entErrors.email = 'Введите корректный email'
    }
    
    errors.bankDetails.entrepreneur = entErrors
    return Object.keys(entErrors).length === 0
  }
}

const validateInternationalBankDetails = (): boolean => {
  errors.bankDetails.international = {}
  const intlErrors: Record<string, string> = {}
  const bin = bankDetails.international.binancePayId.trim()
  if (bin && (bin.length < 9 || bin.length > 10)) {
    intlErrors.binancePayId = 'Binance ID / Pay ID: 9–10 символов'
  }
  const card = bankDetails.international.cardNumber.trim()
  const wallet = bankDetails.international.cryptoWallet.trim()
  if (!bin && !card && !wallet) {
    intlErrors.general =
      'Укажите хотя бы одно: Binance ID / Pay ID, карту РФ или адрес USDT (BEP-20)'
  }
  errors.bankDetails.international = intlErrors
  return Object.keys(intlErrors).length === 0
}

// Проверка, есть ли ошибки в основной форме
const hasFormErrors = computed(() => {
  return Object.values(errors).some(error => 
    typeof error === 'string' ? error.length > 0 : false
  )
})

// Переключение типа банковских данных
const switchBankDetailsType = () => {
  // Очищаем ошибки при переключении
  validateBankDetails()
}

// Открытие модальных окон
const openPassportModal = () => {
  loadPassportData()
  showPassportModal.value = true
  document.documentElement.classList.add('noscroll')
}

const openPasswordModal = () => {
  showPasswordModal.value = true
  document.documentElement.classList.add('noscroll')
}

const openDeleteModal = () => {
  deleteConfirmText.value = ''
  showDeleteModal.value = true
  document.documentElement.classList.add('noscroll')
}

// Закрытие модальных окон
const closePassportModal = () => {
  showPassportModal.value = false
  document.documentElement.classList.remove('noscroll')
}

const closePasswordModal = () => {
  showPasswordModal.value = false
  document.documentElement.classList.remove('noscroll')
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteConfirmText.value = ''
  document.documentElement.classList.remove('noscroll')
}

// Очистка формы паспорта
const clearPassportForm = () => {
  passportForm.citizenship = ''
  passportForm.otherCitizenship = ''
  passportForm.issuedBy = ''
  passportForm.fam = ''
  passportForm.imya = ''
  passportForm.otch = ''
  passportForm.number = ''
  passportForm.date = ''
  passportForm.adress = ''
  ElMessage.success('Форма очищена')
}

/** Данные паспорта подтягиваются в refreshUserData из settings.passport */
const loadPassportData = () => {}

watch(
  () => passportForm.citizenship,
  (v) => {
    if (v !== 'Другое') {
      passportForm.otherCitizenship = ''
    }
  },
)

// Сохранение паспортных данных
const savePassportData = async () => {
  if (!passportForm.fam || !passportForm.imya || !passportForm.number) {
    ElMessage.error('Заполните обязательные поля (фамилия, имя, серия и номер)')
    return
  }
  if (!passportForm.citizenship?.trim()) {
    ElMessage.error('Укажите гражданство')
    return
  }
  if (
    passportForm.citizenship === 'Другое' &&
    !passportForm.otherCitizenship?.trim()
  ) {
    ElMessage.error('Укажите гражданство в поле «Другое гражданство»')
    return
  }

  loading.value = true;
  isOperationLoading.value = true
  try {
    const passportData: Record<string, string> = {
      'citysenship-profile':
        passportForm.citizenship === 'Другое'
          ? 'Другое'
          : passportForm.citizenship,
      'issued-profile': passportForm.issuedBy,
      fam: passportForm.fam,
      'number-profile': passportForm.number,
      imya: passportForm.imya,
      'date-profile': passportForm.date,
      otch: passportForm.otch,
      'adress-profile': passportForm.adress,
    }
    if (passportForm.citizenship === 'Другое') {
      passportData['citysenship-profile-others'] =
        passportForm.otherCitizenship.trim()
    }
    
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/profile/updatePassport.php',
      passportData
    )
    
    console.log('Паспортные данные сохранены:', response.data)
    ElMessage.success('Паспортные данные сохранены успешно')
    closePassportModal()
    
  } catch (error: any) {
    console.error('Ошибка при сохранении паспортных данных:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при сохранении данных')
      }
    } else {
      ElMessage.error('Ошибка при сохранении данных')
    }
  } finally {
    isOperationLoading.value = false
    loading.value = false;
  }
}

// Отправка запроса на смену пароля
const submitPasswordChange = async () => {
  if (!formData.email) {
    ElMessage.error('Email не указан. Пожалуйста, заполните email в общих данных')
    closePasswordModal()
    return
  }
  
  isOperationLoading.value = true
  try {
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/auth/mailPass.php',
      {
        email: formData.email
      }
    )
    
    console.log('Запрос на смену пароля отправлен:', response.data)
    ElMessage.success('Ссылка для изменения пароля отправлена на вашу почту')
    closePasswordModal()
    
  } catch (error: any) {
    console.error('Ошибка при запросе смены пароля:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при отправке запроса')
      }
    } else {
      ElMessage.error('Ошибка при отправке запроса')
    }
  } finally {
    isOperationLoading.value = false
  }
}

// Подтверждение удаления аккаунта
const confirmDeleteAccount = async () => {
  if (deleteConfirmText.value !== 'УДАЛИТЬ') {
    ElMessage.error('Введите "УДАЛИТЬ" для подтверждения')
    return
  }
  
  isOperationLoading.value = true
  try {
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/profile/deleteProfile.php',
      {
        confirmation: deleteConfirmText.value
      }
    )
    
    console.log('Аккаунт удален:', response.data)
    ElMessage.success('Аккаунт успешно удален')
    
    // Очищаем localStorage
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user-locale")
    
    // Перенаправляем на страницу регистрации
    setTimeout(() => {
      router.push(Tr.i18nRoute({ name: 'register' }))
    }, 1500)
    
  } catch (error: any) {
    console.error('Ошибка при удалении аккаунта:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при удалении аккаунта')
      }
    } else {
      ElMessage.error('Ошибка при удалении аккаунта')
    }
  } finally {
    isOperationLoading.value = false
    closeDeleteModal()
  }
}

// Отправка личных данных
const submitPersonalData = async () => {
  validateForm('firstName')
  validateForm('lastName')
  
  if (errors.firstName || errors.lastName) {
    ElMessage.error('Исправьте ошибки в форме')
    return
  }
  
  isOperationLoading.value = true
  try {
    const nameData = {
      'alias-profile-name': formData.firstName.trim(),
      'profile-sec-name': formData.lastName.trim()
    }
    
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/profile/updateName.php',
      nameData
    )
    
    console.log('Имя и фамилия сохранены:', response.data)
    ElMessage.success('Личные данные сохранены успешно')
  } catch (error: any) {
    console.error('Ошибка при сохранении данных:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData['alias-profile-name']) {
        errors.firstName = Array.isArray(errorData['alias-profile-name']) 
          ? errorData['alias-profile-name'][0] 
          : errorData['alias-profile-name']
      }
      
      if (errorData['profile-sec-name']) {
        errors.lastName = Array.isArray(errorData['profile-sec-name']) 
          ? errorData['profile-sec-name'][0] 
          : errorData['profile-sec-name']
      }
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else if (errorData.detail) {
        ElMessage.error(errorData.detail)
      }
    } else {
      ElMessage.error('Ошибка при сохранении данных')
    }
  } finally {
    isOperationLoading.value = false
  }
}

// Отправка общих данных
// const submitGeneralData = async () => {
//   validateForm('nickname')
//   validateForm('email')
//   validateForm('country')
  
//   if (errors.nickname || errors.email || errors.country) {
//     ElMessage.error('Исправьте ошибки в форме')
//     return
//   }
  
//   isOperationLoading.value = true
//   try {
//     // Здесь будет API запрос
//     await new Promise(resolve => setTimeout(resolve, 1000))
//     ElMessage.success('Общие данные сохранены успешно')
//   } catch (error) {
//     ElMessage.error('Ошибка при сохранении данных')
//   } finally {
//     isOperationLoading.value = false
//   }
// }

// Сохранение банковских данных физического лица
const submitIndividualBankDetails = async () => {
  if (!validateBankDetails()) {
    ElMessage.error('Исправьте ошибки в банковских данных')
    return
  }
  
  isOperationLoading.value = true
  try {
    const individualData = {
      'sp-profile': bankDetails.individual.fullName,
      'rs-sp-profile': bankDetails.individual.account,
      'b-sp-profile': bankDetails.individual.bik
    }
    
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/profile/updateRek1.php',
      individualData
    )
    
    console.log('Банковские данные физлица сохранены:', response.data)
    ElMessage.success('Банковские данные сохранены успешно')
    await refreshUserData()

  } catch (error: any) {
    console.error('Ошибка при сохранении банковских данных:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при сохранении банковских данных')
      }
    } else {
      ElMessage.error('Ошибка при сохранении банковских данных')
    }
  } finally {
    isOperationLoading.value = false
  }
}

// Сохранение банковских данных ИП
const submitEntrepreneurBankDetails = async () => {
  if (!validateBankDetails()) {
    ElMessage.error('Исправьте ошибки в банковских данных')
    return
  }
  
  isOperationLoading.value = true
  try {
    const entrepreneurData = {
      'sp-profile': bankDetails.entrepreneur.fullName,
      'num-ogr-profile': bankDetails.entrepreneur.ogrnip,
      'addr-sp-profile': bankDetails.entrepreneur.address,
      'in-sp-profile': bankDetails.entrepreneur.inn,
      'rs-sp-profile': bankDetails.entrepreneur.account,
      'b-sp-profile': bankDetails.entrepreneur.bik,
      'ks-sp-profile': bankDetails.entrepreneur.correspondentAccount,
      'email-sp-profile': bankDetails.entrepreneur.email
    }
    
    const response = await sendRequest(
      "post",
      '/ajax_vue/ajax/profile/updateRek2.php',
      entrepreneurData
    )
    
    console.log('Банковские данные ИП сохранены:', response.data)
    ElMessage.success('Банковские данные сохранены успешно')
    await refreshUserData()

  } catch (error: any) {
    console.error('Ошибка при сохранении банковских данных:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при сохранении банковских данных')
      }
    } else {
      ElMessage.error('Ошибка при сохранении банковских данных')
    }
  } finally {
    isOperationLoading.value = false
  }
}

// Загрузка фото профиля
const uploadProfileImage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    ElMessage.error('Пожалуйста, выберите изображение')
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('Размер файла не должен превышать 5MB')
    return
  }
  
  isUploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('personal-photo', file)
    
    const response = await FileRequest(
      "post",
      '/ajax_vue/ajax/profile/avatar.php',
      formData
    )
    
    console.log('Фото загружено:', response.data)
    
    ElMessage.success('Фото профиля загружено успешно')
    
    // Обновляем данные с сервера, чтобы получить новое фото
    await refreshUserData()
    
  } catch (error: any) {
    console.error('Ошибка при загрузке фото:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      if (errorData.error) {
        ElMessage.error(errorData.error)
      } else if (errorData.message) {
        ElMessage.error(errorData.message)
      } else {
        ElMessage.error('Ошибка при загрузке фото')
      }
    } else {
      ElMessage.error('Ошибка при загрузке фото')
    }
  } finally {
    isUploadingImage.value = false
    input.value = ''
  }
}

// Функция для обновления данных с сервера
const refreshUserData = async () => {
  try {
    const response = await fetchSharedCabinetGetData();
    const payload = response.data as Record<string, unknown> | undefined;

    if (payload?.user) {
      const u = payload.user as Record<string, unknown>;
      // Обновляем фото профиля из ответа API
      if (u.personalPhoto) {
        profileImage.value = u.personalPhoto as string;
      }
      
      // Обновляем остальные данные пользователя
      formData.firstName = (u.name as string) || '';
      formData.lastName = (u.lastName as string) || '';
      formData.nickname = (u.login as string) || '';
      formData.email = (u.email as string) || '';
      
      // Регион кабинета и реквизиты (getData)
      const prof = payload.profile as Record<string, unknown> | undefined;
      const region = (prof?.region as string) || 'Russia';
      profileRegion.value = region;
      formData.country = region;

      const settings = payload.settings as Record<string, unknown> | undefined;
      const requisites = settings?.requisites as Record<string, unknown> | undefined;
      if (requisites) {
        const rq = requisites as Record<string, unknown>;
        if (region === 'Russia') {
          const ind = rq.individual as Record<string, string> | undefined;
          const ent = rq.entrepreneur as Record<string, string> | undefined;

          if (ind) {
            bankDetails.individual.fullName = ind.fullName || '';
            bankDetails.individual.account = ind.account || '';
            bankDetails.individual.bik = ind.bik || '';
          }

          if (ent) {
            bankDetails.entrepreneur.fullName = ent.fullName || '';
            bankDetails.entrepreneur.ogrnip = ent.ogrnip || '';
            bankDetails.entrepreneur.address = ent.address || '';
            bankDetails.entrepreneur.inn = ent.inn || '';
            bankDetails.entrepreneur.account = ent.account || '';
            bankDetails.entrepreneur.bik = ent.bik || '';
            bankDetails.entrepreneur.correspondentAccount =
              ent.correspondentAccount || '';
            bankDetails.entrepreneur.email = ent.email || '';
          }

          if (ent?.fullName || ent?.ogrnip) {
            bankDetailsType.value = 'entrepreneur';
          } else {
            bankDetailsType.value = 'individual';
          }
        } else {
          const intl = rq.international as
            | {
                binancePayId?: string;
                cardNumber?: string;
                cryptoWallet?: string;
              }
            | undefined;
          if (intl) {
            bankDetails.international.binancePayId = intl.binancePayId || '';
            bankDetails.international.cardNumber = intl.cardNumber || '';
            bankDetails.international.cryptoWallet = intl.cryptoWallet || '';
          }
        }
      }

      const passportPayload = settings?.passport as
        | SettingsPassportPayload
        | undefined
      if (passportPayload) {
        applyPassportFromApi(passportPayload)
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    throw error;
  }
};

const submitInternationalBankDetails = async () => {
  if (!validateInternationalBankDetails()) {
    ElMessage.error('Исправьте ошибки в реквизитах')
    return
  }
  isOperationLoading.value = true
  try {
    const response = await postUrlEncodedRequest(
      '/ajax_vue/ajax/profile/updateNotRussia.php',
      {
        cart: bankDetails.international.binancePayId.trim(),
        'rs-cart': bankDetails.international.cardNumber.trim(),
        paypal: bankDetails.international.cryptoWallet.trim()
      }
    )
    const raw = String(response.data ?? '')
    if (raw.includes('Binance должен')) {
      ElMessage.error(raw.trim())
      return
    }
    if (raw.includes('успешно') || raw.includes('изменен')) {
      ElMessage.success('Реквизиты сохранены успешно')
      await refreshUserData()
    } else if (raw.trim()) {
      ElMessage.error(raw.trim())
    } else {
      ElMessage.error('Не удалось сохранить реквизиты')
    }
  } catch (error: unknown) {
    console.error('Ошибка при сохранении реквизитов:', error)
    ElMessage.error('Ошибка при сохранении реквизитов')
  } finally {
    isOperationLoading.value = false
  }
}

// Функция для загрузки всех данных
const loadAllData = async () => {
  loading.value = true;
  loadedCount.value = 0;
  
  try {
    await refreshUserData().finally(() => loadedCount.value++);
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
  } finally {
    loading.value = false;
  }
};

// Загрузка начальных данных при монтировании компонента
onMounted(() => {
  loadAllData();
});

onUnmounted(() => {
  clearReleaseHighlightTimers();
});

watch(
  () => [loading.value, route.query.releaseBlocked] as const,
  () => {
    if (!loading.value && route.query.releaseBlocked === '1') {
      void handleBlockedReleaseFromQuiz();
    }
  },
);
</script>

<template>
<Header></Header>
<section class="personal">
  <div class="container personal__container">
    <Menu />
    <div v-if="loading" class="personal__block">
      <div class="loading__container">
        <div 
          v-loading="loading" 
          :element-loading-svg="loadingSvg" 
          class="loading__svg" 
          element-loading-svg-view-box="-10, -10, 50, 50"
        ></div>
      </div>
    </div>
    <div v-else class="personal__block">
      <div class="setting__top">
        <h3 class="setting__head">настройки профиля</h3>
        <p class="setting__desc">Измените данные или настройки профиля.</p>
      </div>
      <div class="setting__flex">
        <div class="setting__content">
          <div class="setting__photo">
            <h5 class="setting__photo_heading">Фото профиля</h5>
            <div class="setting__photo_flex">
              <div class="setting__photo_image">
                <img 
                  v-if="profileImage" 
                  :src="profileImage" 
                  class="setting__photo_img"
                  alt="Profile"
                />
                <div 
                  class="setting__photo_img"
                  v-else
                >
                  <span style="color: #909399;">No photo</span>
                </div>
                <div class="setting__photo_svg">
                  <PhotoSVG/>
                </div>
              </div>
              <div class="setting__photo_info">
                <label class="setting__photo_upload button__primary" :class="{ 'button__disabled': isUploadingImage }">
                  <span v-if="!isUploadingImage"><UploadSVG/>Загрузить фото</span>
                  <span v-else>Загрузка...</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="uploadProfileImage"
                    style="display: none;"
                    :disabled="isUploadingImage"
                  />
                </label>
              </div>
            </div>
          </div>
          <div class="setting__personal">
            <h5 class="setting__personal_heading">Личные данные</h5>
            <div class="setting__personal_flex">
              <div class="form__group">
                <label for="firstName" class="form__label button">Имя</label>
                <el-input
                  id="firstName"
                  v-model="formData.firstName"
                  :class="{ 'error': errors.firstName }"
                  placeholder="Имя"
                  :disabled="isOperationLoading"
                  @blur="validateForm('firstName')"
                  @input="errors.firstName = ''"
                  size="large"
                />
                <div v-if="errors.firstName" class="error text_very">
                  {{ errors.firstName }}
                </div>
              </div>
              <div class="form__group">
                <label for="lastName" class="form__label button">Фамилия</label>
                <el-input
                  id="lastName"
                  v-model="formData.lastName"
                  :class="{ 'error': errors.lastName }"
                  placeholder="Фамилия"
                  :disabled="isOperationLoading"
                  @blur="validateForm('lastName')"
                  @input="errors.lastName = ''"
                  size="large"
                />
                <div v-if="errors.lastName" class="error text_very">
                  {{ errors.lastName }}
                </div>
              </div>
            </div>
            <div class="setting__personal_buttons">
              <button 
                class="setting__personal_button button__primary" 
                @click="submitPersonalData"
                :disabled="isOperationLoading || hasFormErrors"
              >
                <span v-if="!isOperationLoading">сохранить изменения</span>
                <span v-else>Сохранение...</span>
              </button>
            </div>
          </div>
          <div class="setting__general">
            <h5 class="setting__general_heading">Общие данные</h5>
            <div class="setting__general_flex">
              <div class="form__group">
                <label for="nickname" class="form__label button">Псевдоним</label>
                <el-input
                  id="nickname"
                  v-model="formData.nickname"
                  :class="{ 'error': errors.nickname }"
                  placeholder="Псевдоним"
                  disabled
                  size="large"
                />
                <div v-if="errors.nickname" class="error text_very">
                  {{ errors.nickname }}
                </div>
              </div>
              <div class="form__group">
                <label for="email" class="form__label button">E-mail</label>
                <el-input
                  id="email"
                  v-model="formData.email"
                  type="email"
                  :class="{ 'error': errors.email }"
                  placeholder="e-mail"
                  disabled
                  size="large"
                />
                <div v-if="errors.email" class="error text_very">
                  {{ errors.email }}
                </div>
              </div>
              <div class="form__group">
                <label for="country" class="form__label button">Страна</label>
                <el-input
                  id="country"
                  v-model="formData.country"
                  :class="{ 'error': errors.country }"
                  placeholder="страна"
                  disabled
                  size="large"
                />
                <div v-if="errors.country" class="error text_very">
                  {{ errors.country }}
                </div>
              </div>
            </div>
          </div>
          <div
            id="settings-passport"
            class="setting__passport"
            :class="{
              setting__section_highlight: highlightPassportSection,
              'setting__section_highlight--fade':
                highlightPassportSection && highlightSectionFadeOut,
            }"
          >
            <h5 class="setting__passport_heading">данные паспорта</h5>
            <p class="setting__passport_desc">Введите данные для отображения в вашем договоре при выкладке релиза. Данные вашего паспорта скрыты для просмотра, но вы можете обновить их в любое время по кнопке «Изменить».</p>
            <div class="setting__passport_buttons">
              <button 
                class="setting__passport_button button__primary" 
                @click="openPassportModal"
                :disabled="isOperationLoading"
              >
                <span>изменить</span>
              </button>
            </div>
          </div>
          
          <div
            id="settings-bank-requisites"
            :class="{
              setting__section_highlight: highlightBankSection,
              'setting__section_highlight--fade':
                highlightBankSection && highlightSectionFadeOut,
            }"
          >
          <template v-if="isRussia">
          <!-- Банковские данные - Физическое лицо -->
          <div class="setting__details" v-if="bankDetailsType === 'individual'">
            <h5 class="setting__details_heading">Банковские данные (Физ. лицо)</h5>
            <p class="setting__details_description">Заполните реквизиты для выплат на карту физического лица.</p>
            <div class="setting__details_flex">
              <div class="form__labels">
                <label class="form__label">
                  <input 
                    type="radio" 
                    v-model="bankDetailsType" 
                    value="individual"
                    class="form__label_input"
                    :disabled="isOperationLoading"
                    @change="switchBankDetailsType"
                  >
                  <span class="form__label_text">Физическое лицо</span>
                </label>
                <label class="form__label">
                  <input 
                    type="radio" 
                    v-model="bankDetailsType" 
                    value="entrepreneur"
                    class="form__label_input"
                    :disabled="isOperationLoading"
                    @change="switchBankDetailsType"
                  >
                  <span class="form__label_text">Индивидуальный предприниматель</span>
                </label>
              </div>
              <div class="form__groups">
                <div class="form__group">
                  <label for="individualFullName" class="form__label button">ФИО</label>
                  <el-input
                    id="individualFullName"
                    v-model="bankDetails.individual.fullName"
                    :class="{ 'error': errors.bankDetails.individual?.fullName }"
                    placeholder="Иванов Иван Иванович"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.individual?.fullName" class="error text_very">
                    {{ errors.bankDetails.individual?.fullName }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="individualAccount" class="form__label button">Расчетный счет</label>
                  <el-input
                    id="individualAccount"
                    v-model="bankDetails.individual.account"
                    :class="{ 'error': errors.bankDetails.individual?.account }"
                    placeholder="408028102544110556789"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.individual?.account" class="error text_very">
                    {{ errors.bankDetails.individual?.account }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="individualBik" class="form__label button">БИК банка</label>
                  <el-input
                    id="individualBik"
                    v-model="bankDetails.individual.bik"
                    :class="{ 'error': errors.bankDetails.individual?.bik }"
                    placeholder="044513655"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.individual?.bik" class="error text_very">
                    {{ errors.bankDetails.individual?.bik }}
                  </div>
                </div>
              </div>
            </div>
            <div class="setting__details_buttons">
              <button 
                class="setting__details_button button__primary" 
                @click="submitIndividualBankDetails"
                :disabled="isOperationLoading"
              >
                <span v-if="!isOperationLoading">сохранить изменения</span>
                <span v-else>Сохранение...</span>
              </button>
            </div>
          </div>

          <!-- Банковские данные - Индивидуальный предприниматель -->
          <div class="setting__details" v-if="bankDetailsType === 'entrepreneur'">
            <h5 class="setting__details_heading">Банковские данные (ИП)</h5>
            <p class="setting__details_description">Заполните реквизиты для выплат на расчетный счет ИП.</p>
            <div class="setting__details_flex">
              <div class="form__labels">
                <label class="form__label">
                  <input 
                    type="radio" 
                    v-model="bankDetailsType" 
                    value="individual"
                    class="form__label_input"
                    :disabled="isOperationLoading"
                    @change="switchBankDetailsType"
                  >
                  <span class="form__label_text">Физическое лицо</span>
                </label>
                <label class="form__label">
                  <input 
                    type="radio" 
                    v-model="bankDetailsType" 
                    value="entrepreneur"
                    class="form__label_input"
                    :disabled="isOperationLoading"
                    @change="switchBankDetailsType"
                  >
                  <span class="form__label_text">Индивидуальный предприниматель</span>
                </label>
              </div>
              <div class="form__groups">
                <div class="form__group">
                  <label for="entrepreneurFullName" class="form__label button">ФИО Предпринимателя</label>
                  <el-input
                    id="entrepreneurFullName"
                    v-model="bankDetails.entrepreneur.fullName"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.fullName }"
                    placeholder="Иванов Иван Иванович"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.fullName" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.fullName }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurOgrnip" class="form__label button">ОГРНИП</label>
                  <el-input
                    id="entrepreneurOgrnip"
                    v-model="bankDetails.entrepreneur.ogrnip"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.ogrnip }"
                    placeholder="318000000100730"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.ogrnip" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.ogrnip }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurAddress" class="form__label button">Адрес</label>
                  <el-input
                    id="entrepreneurAddress"
                    v-model="bankDetails.entrepreneur.address"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.address }"
                    placeholder="г. Москва, ул. Примерная, д. 1"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.address" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.address }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurInn" class="form__label button">ИНН</label>
                  <el-input
                    id="entrepreneurInn"
                    v-model="bankDetails.entrepreneur.inn"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.inn }"
                    placeholder="840000001004"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.inn" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.inn }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurAccount" class="form__label button">Расчетный счет ИП</label>
                  <el-input
                    id="entrepreneurAccount"
                    v-model="bankDetails.entrepreneur.account"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.account }"
                    placeholder="408028102544110556789"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.account" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.account }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurBik" class="form__label button">БИК</label>
                  <el-input
                    id="entrepreneurBik"
                    v-model="bankDetails.entrepreneur.bik"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.bik }"
                    placeholder="123456789"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.bik" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.bik }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurKs" class="form__label button">Корреспондентский счет</label>
                  <el-input
                    id="entrepreneurKs"
                    v-model="bankDetails.entrepreneur.correspondentAccount"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.correspondentAccount }"
                    placeholder="30101810640004000068"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.correspondentAccount" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.correspondentAccount }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="entrepreneurEmail" class="form__label button">E-mail</label>
                  <el-input
                    id="entrepreneurEmail"
                    v-model="bankDetails.entrepreneur.email"
                    :class="{ 'error': errors.bankDetails.entrepreneur?.email }"
                    placeholder="test@test.ru"
                    :disabled="isOperationLoading"
                    @blur="validateBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.entrepreneur?.email" class="error text_very">
                    {{ errors.bankDetails.entrepreneur?.email }}
                  </div>
                </div>
              </div>
            </div>
            <div class="setting__details_buttons">
              <button 
                class="setting__details_button button__primary" 
                @click="submitEntrepreneurBankDetails"
                :disabled="isOperationLoading"
              >
                <span v-if="!isOperationLoading">сохранить изменения</span>
                <span v-else>Сохранение...</span>
              </button>
            </div>
          </div>
          </template>

          <div
            v-else
            class="setting__details"
          >
            <h5 class="setting__details_heading">Реквизиты для выплат</h5>
            <p class="setting__details_description">
              Для стран вне РФ: укажите Binance ID / Pay ID, при необходимости — карту РФ и (или) адрес кошелька USDT в сети BEP-20. Достаточно заполнить хотя бы одно поле.
            </p>
            <div class="setting__details_flex">
              <div class="form__groups">
                <div v-if="errors.bankDetails.international?.general" class="error text_very" style="margin-bottom: 12px">
                  {{ errors.bankDetails.international.general }}
                </div>
                <div class="form__group">
                  <label for="intlBinance" class="form__label button">Binance ID / Pay ID</label>
                  <el-input
                    id="intlBinance"
                    v-model="bankDetails.international.binancePayId"
                    :class="{ 'error': errors.bankDetails.international?.binancePayId }"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    :disabled="isOperationLoading"
                    @blur="validateInternationalBankDetails"
                    size="large"
                  />
                  <div v-if="errors.bankDetails.international?.binancePayId" class="error text_very">
                    {{ errors.bankDetails.international.binancePayId }}
                  </div>
                </div>
                <div class="form__group">
                  <label for="intlCard" class="form__label button">Номер карты (РФ), опционально</label>
                  <el-input
                    id="intlCard"
                    v-model="bankDetails.international.cardNumber"
                    placeholder=""
                    :disabled="isOperationLoading"
                    @blur="validateInternationalBankDetails"
                    size="large"
                  />
                </div>
                <div class="form__group">
                  <label for="intlUsdt" class="form__label button">USDT (BEP-20), опционально</label>
                  <el-input
                    id="intlUsdt"
                    v-model="bankDetails.international.cryptoWallet"
                    placeholder=""
                    :disabled="isOperationLoading"
                    @blur="validateInternationalBankDetails"
                    size="large"
                  />
                </div>
              </div>
            </div>
            <div class="setting__details_buttons">
              <button
                class="setting__details_button button__primary"
                type="button"
                @click="submitInternationalBankDetails"
                :disabled="isOperationLoading"
              >
                <span v-if="!isOperationLoading">сохранить изменения</span>
                <span v-else>Сохранение...</span>
              </button>
            </div>
          </div>
          </div>
          <div class="setting__password">
            <h5 class="setting__password_heading">Смена пароля</h5>
            <p class="setting__password_desc">Для изменения пароля мы отправим ссылку на вашу электронную почту.</p>
            <div class="setting__password_buttons">
              <button 
                class="setting__password_button button__primary" 
                @click="openPasswordModal"
                :disabled="isOperationLoading"
              >
                <span>изменить пароль</span>
              </button>
            </div>
          </div>
          <div class="setting__delete">
            <h5 class="setting__delete_heading">удаление аккаунта</h5>
            <p class="setting__delete_desc">Если захочешь восстановить аккаунт, можешь написать нам в группу VK или Телеграмм.</p>
            <div class="setting__delete_buttons">
              <button 
                class="setting__delete_button button__primary" 
                @click="openDeleteModal"
                :disabled="isOperationLoading"
                style="background-color: #f56c6c; border-color: #f56c6c;"
              >
                <span>удалить</span>
              </button>
            </div>
          </div>
        </div>
        <div class="setting__right">
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Модальное окно паспортных данных -->
<Teleport to="body">
  <div v-if="showPassportModal" class="passport-modal-overlay" @click.self="closePassportModal">
    <div class="passport-modal">
      <div class="passport-modal__header">
        <h3 class="passport-modal__title">Паспортные данные</h3>
        <button class="passport-modal__close" @click="closePassportModal">×</button>
      </div>
      
      <div class="passport-modal__content">
        <div class="passport-modal__grid">
          <!-- Левая колонка -->
          <div class="passport-modal__column">
            <div class="form__group">
              <label class="form__label button">Гражданство</label>
              <el-select
                v-model="passportForm.citizenship"
                placeholder="Выберите гражданство"
                :disabled="isOperationLoading"
                size="large"
                class="passport-select"
                clearable
              >
                <el-option label="Россия" value="Россия" />
                <el-option label="Беларусь" value="Беларусь" />
                <el-option label="Казахстан" value="Казахстан" />
                <el-option label="Армения" value="Армения" />
                <el-option label="Кыргызстан" value="Кыргызстан" />
                <el-option label="Другое" value="Другое" />
              </el-select>
            </div>

            <div
              v-if="passportForm.citizenship === 'Другое'"
              class="form__group"
            >
              <label class="form__label button">Другое гражданство</label>
              <el-input
                v-model="passportForm.otherCitizenship"
                placeholder="Укажите страну"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Кем выдан</label>
              <el-input
                v-model="passportForm.issuedBy"
                placeholder="Кем выдан паспорт"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Фамилия</label>
              <el-input
                v-model="passportForm.fam"
                placeholder="Фамилия"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Имя</label>
              <el-input
                v-model="passportForm.imya"
                placeholder="Имя"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>
          </div>

          <!-- Правая колонка -->
          <div class="passport-modal__column">
            <div class="form__group">
              <label class="form__label button">Отчество</label>
              <el-input
                v-model="passportForm.otch"
                placeholder="Отчество"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Серия и номер паспорта</label>
              <el-input
                v-model="passportForm.number"
                placeholder="0000 000000"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Дата выдачи</label>
              <el-date-picker
                v-model="passportForm.date"
                type="date"
                placeholder="Выберите дату"
                format="DD.MM.YYYY"
                value-format="DD.MM.YYYY"
                :disabled="isOperationLoading"
                size="large"
                class="passport-datepicker"
              />
            </div>

            <div class="form__group">
              <label class="form__label button">Адрес регистрации</label>
              <el-input
                v-model="passportForm.adress"
                placeholder="Адрес регистрации"
                :disabled="isOperationLoading"
                size="large"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="passport-modal__footer">
        <button 
          class="passport-modal__button passport-modal__button--clear"
          @click="clearPassportForm"
          :disabled="isOperationLoading"
        >
          очистить
        </button>
        <button 
          class="passport-modal__button passport-modal__button--save"
          @click="savePassportData"
          :disabled="isOperationLoading"
        >
          <span v-if="!isOperationLoading">сохранить изменения</span>
          <span v-else>Сохранение...</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>

<!-- Модальное окно смены пароля -->
<Teleport to="body">
  <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
    <div class="modal modal--small">
      <div class="modal__header">
        <h3 class="modal__title">Смена пароля</h3>
        <button class="modal__close" @click="closePasswordModal">×</button>
      </div>
      
      <div class="modal__content">
        <div class="modal__info">
          <p>Ссылка для изменения пароля будет отправлена на вашу электронную почту:</p>
          <p class="modal__email">{{ formData.email || 'не указан' }}</p>
          <p class="modal__hint">Письмо придет в течение нескольких минут. Проверьте папку "Спам", если не видите письмо во входящих.</p>
        </div>
      </div>

      <div class="modal__footer">
        <button 
          class="modal__button modal__button--clear"
          @click="closePasswordModal"
          :disabled="isOperationLoading"
        >
          отмена
        </button>
        <button 
          class="modal__button modal__button--save"
          @click="submitPasswordChange"
          :disabled="isOperationLoading"
        >
          <span v-if="!isOperationLoading">отправить ссылку</span>
          <span v-else>Отправка...</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>

<!-- Модальное окно удаления аккаунта -->
<Teleport to="body">
  <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
    <div class="modal modal--small">
      <div class="modal__header">
        <h3 class="modal__title">Удаление аккаунта</h3>
        <button class="modal__close" @click="closeDeleteModal">×</button>
      </div>
      
      <div class="modal__content">
        <div class="modal__warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#f56c6c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8V12" stroke="#f56c6c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 16H12.01" stroke="#f56c6c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="modal__warning-text">
            <h4>Внимание! Это действие нельзя отменить</h4>
            <p>Все ваши данные будут удалены без возможности восстановления.</p>
          </div>
        </div>
        
        <div class="form__group">
          <label class="form__label button">Подтверждение</label>
          <el-input
            v-model="deleteConfirmText"
            placeholder="Введите 'УДАЛИТЬ' для подтверждения"
            :disabled="isOperationLoading"
            size="large"
          />
        </div>
      </div>

      <div class="modal__footer">
        <button 
          class="modal__button modal__button--clear"
          @click="closeDeleteModal"
          :disabled="isOperationLoading"
        >
          отмена
        </button>
        <button 
          class="modal__button modal__button--delete"
          @click="confirmDeleteAccount"
          :disabled="isOperationLoading || deleteConfirmText !== 'УДАЛИТЬ'"
        >
          <span v-if="!isOperationLoading">удалить аккаунт</span>
          <span v-else>Удаление...</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>
</template>

<style lang="scss" scoped>
.loading {
  &__container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  &__svg {
    width: 100px;
    height: 100px;
  }
}

.personal {
  margin: 0 0 auto;

  &__container {
    @media (max-width: 767px) {
      padding: 0;
    }
  }
}

.setting__flex {
  display: flex;
  gap: 40px;

  @media (max-width: 1919px) {
    gap: 20px;
  }

  @media (max-width: 1439px) {
    flex-direction: column;
  }
}

.setting__content,
.setting__top {
  display: flex;
  width: calc(100% - 440px);
  flex: 0 0 auto;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 1919px) {
    width: calc(100% - 340px);
  }

  @media (max-width: 1439px) {
    width: 100%;
  }
}

.setting__head {
  text-transform: uppercase;
}

.setting__photo {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 40px;
  }

  &_image {
    display: flex;
    width: 100px;
    height: 100px;
    position: relative;
  }

  &_img {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    object-fit: contain;
    background-color: var(--border);
    border-radius: 50%;
    overflow: hidden;
  }

  &_svg {
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 1;
    color: var(--bg);
    background-color: var(--text);
    border-radius: 50%;
    overflow: hidden;

    svg {
      width: 18px;
      height: 18px;
      object-fit: contain;
    }
  }

  &_info {
    display: flex;
    align-items: center;
    gap: 30px;

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 15px;
    }
  }
}

.setting__personal {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;

    .form__group {
      width: calc(50% - 10px);

      @media (max-width: 767px) {
        width: 100%;
      }
    }
  }

  &_buttons {
    padding: 10px 0 0;
  }
}

.setting__general {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;

    .form__group {
      width: calc(50% - 10px);

      @media (max-width: 767px) {
        width: 100%;
      }
    }
  }

  &_buttons {
    padding: 10px 0 0;
  }
}

.setting__section_highlight {
  border-radius: 12px;
  box-shadow: 0 0 0 2px #c0392b;
  transition: box-shadow 0.55s ease;
}

.setting__section_highlight.setting__section_highlight--fade {
  box-shadow: 0 0 0 0 rgba(192, 57, 43, 0);
}

.setting__passport {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_desc {
    color: var(--text-gray);
  }
}

.setting__details {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  &_description {
    color: var(--text-gray);
  }

  .form__labels {
    width: 100%;
    flex-wrap: nowrap;
    overflow-y: hidden;
    overflow-x: scroll;

    &::-webkit-scrollbar {
      display: none;
      width: 0px;
    }

    &::-webkit-scrollbar-thumb {
      display: none;
      width: 0px;
    }
  }

  .form__label {
    flex: 0 0 auto;
  }

  .form__groups {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .form__group {
    width: calc(50% - 10px);

    @media (max-width: 767px) {
      width: 100%;
    }
  }

  &_buttons {
    padding: 10px 0 0;
  }
}

.setting__password {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_flex {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;

    .form__group {
      width: calc(50% - 10px);

      @media (max-width: 767px) {
        width: 100%;
      }
    }
  }

  &_buttons {
    padding: 10px 0 0;
  }
}

.setting__delete {
  display: flex;
  padding: 40px;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--border);
  background-color: var(--bg);

  @media (max-width: 1439px) {
    padding: 30px;
  }

  @media (max-width: 767px) {
    padding: 30px 15px;
  }

  &_desc {
    color: var(--text-gray);
  }
}

.setting__right {
  @media (max-width: 1439px) {
    flex-direction: row;
  }
}

.setting__top {
  @media (max-width: 767px) {
    padding: 0 15px;
  }
}

/* Стили для модального окна паспорта */
.passport-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.passport-modal {
  background-color: var(--bg);
  border: 1px solid var(--border);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.3s ease;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30px 40px;
    border-bottom: 1px solid var(--border);

    @media (max-width: 767px) {
      padding: 20px;
    }
  }

  &__title {
    text-transform: uppercase;
  }

  &__close {
    background: none;
    border: none;
    font-size: 32px;
    line-height: 1;
    color: var(--text);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.7;
    }
  }

  &__content {
    padding: 40px;

    @media (max-width: 767px) {
      padding: 20px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }
  }

  &__column {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__footer {
    display: flex;
    gap: 20px;
    padding: 30px 40px;
    border-top: 1px solid var(--border);

    @media (max-width: 767px) {
      flex-direction: column;
      padding: 20px;
    }
  }

  &__button {
    padding: 12px 30px;
    font-size: 14px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-weight: 500;

    @media (max-width: 767px) {
      width: 100%;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--clear {
      background-color: transparent;
      border: 1px solid var(--border);
      color: var(--text);

      &:hover {
        background-color: var(--border);
      }
    }

    &--save {
      background-color: var(--text);
      color: var(--bg);

      &:hover {
        opacity: 0.9;
      }
    }
  }
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Стили для модальных окон */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background-color: var(--bg);
  border: 1px solid var(--border);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.3s ease;

  &--small {
    max-width: 450px;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 30px;
    border-bottom: 1px solid var(--border);

    @media (max-width: 767px) {
      padding: 20px;
    }
  }

  &__title {
    text-transform: uppercase;
    font-size: 18px;
  }

  &__close {
    background: none;
    border: none;
    font-size: 28px;
    line-height: 1;
    color: var(--text);
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.7;
    }
  }

  &__content {
    padding: 30px;

    @media (max-width: 767px) {
      padding: 20px;
    }
  }

  &__footer {
    display: flex;
    gap: 15px;
    padding: 20px 30px;
    border-top: 1px solid var(--border);

    @media (max-width: 767px) {
      flex-direction: column;
      padding: 20px;
    }
  }

  &__button {
    padding: 10px 25px;
    font-size: 14px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-weight: 500;

    @media (max-width: 767px) {
      width: 100%;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--clear {
      background-color: transparent;
      border: 1px solid var(--border);
      color: var(--text);

      &:hover {
        background-color: var(--border);
      }
    }

    &--save {
      background-color: var(--text);
      color: var(--bg);

      &:hover {
        opacity: 0.9;
      }
    }

    &--delete {
      background-color: #f56c6c;
      color: white;

      &:hover {
        opacity: 0.9;
      }
    }
  }

  &__info {
    text-align: center;

    p {
      margin-bottom: 10px;
      color: var(--text-gray);
      font-size: 14px;
    }
  }

  &__email {
    font-weight: bold;
    color: var(--text) !important;
    font-size: 16px !important;
    margin: 15px 0;
  }

  &__hint {
    font-size: 12px !important;
    color: #909399 !important;
    margin-top: 15px;
  }

  &__warning {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 20px;
    padding: 15px;
    background-color: rgba(245, 108, 108, 0.05);

    @media (max-width: 767px) {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    svg {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }
  }

  &__warning-text {
    h4 {
      color: #f56c6c;
      margin-bottom: 5px;
      font-size: 16px;
      font-weight: 500;
    }

    p {
      color: var(--text-gray);
      font-size: 14px;
    }
  }
}

/* Стили для Element Plus компонентов */
:deep(.passport-select) {
  width: 100%;
}

:deep(.passport-datepicker) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background-color: var(--bg);
  border: 1px solid var(--border);
  box-shadow: none !important;
  border-radius: 0;
  padding: 0 15px;
  width: 100%;
  height: 40px;

  &:hover {
    border-color: var(--text);
  }

  &.is-focus {
    border-color: var(--text);
    box-shadow: none !important;
  }
}

:deep(.el-input__inner) {
  color: var(--text);
  font-size: 14px;
  height: 40px;
}

:deep(.el-select__caret) {
  color: var(--text);
  font-size: 14px;
}

:deep(.el-picker-popper) {
  background-color: var(--bg);
  border: 1px solid var(--border);
}

:deep(.el-picker-panel) {
  background-color: var(--bg);
  border: none;
}

:deep(.el-date-table td.today .el-date-table-cell) {
  color: var(--text);
  font-weight: bold;
}

:deep(.el-date-table td.current:not(.disabled) .el-date-table-cell) {
  background-color: var(--text);
  color: var(--bg);
}

:deep(.el-date-table td .el-date-table-cell:hover) {
  background-color: var(--border);
}

:deep(.el-select-dropdown) {
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0;
}

:deep(.el-select-dropdown__item) {
  color: var(--text);
  font-size: 14px;
  height: 36px;
  line-height: 36px;

  &.hover {
    background-color: var(--border);
  }

  &.selected {
    background-color: var(--text);
    color: var(--bg);
    font-weight: normal;
  }
}

.button__disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
</style>