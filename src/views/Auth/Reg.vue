<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { View, Hide } from '@element-plus/icons-vue'
import { sendRequest, setToken } from '@/utils/api';
import { ElMessage } from 'element-plus';
import Tr from "@/i18n/translation";
import Logo from "@/uikit/Logo.vue";
import BackSVG from "@/uikit/icon/BackSVG.vue";
import router from '@/router'

// Текущий шаг формы (1 - первая форма, 2 - вторая форма, 3 - третья форма)
const currentStep = ref(1)

// Реактивные данные первой формы
const formData = reactive({
  firstName: '',
  lastName: '',
  referralCode: ''
})

// Реактивные данные второй формы
const secondFormData = reactive({
  userType: 'executor', // По умолчанию выбран "Исполнитель"
  executorName: '',
  labelName: ''
})

// Реактивные данные третьей формы
const thirdFormData = reactive({
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  personalData: false,
  marketing: false,
  policy: false // Добавляем чекбокс политики
})

// Состояния ошибок
const errors = reactive({
  firstName: '',
  lastName: '',
  referralCode: ''
})

// Ошибки для второй формы
const secondFormErrors = reactive({
  userType: '',
  executorName: '',
  labelName: ''
})

// Ошибки для третьей формы
const thirdFormErrors = reactive({
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  personalData: '',
  policy: '' // Добавляем ошибку для политики
})

// Извлечение реферального кода из URL
const getReferralCodeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || '';
}

// Применяем реферальный код к форме при загрузке компонента
const referralCodeFromUrl = getReferralCodeFromUrl();
if (referralCodeFromUrl) {
  formData.referralCode = referralCodeFromUrl;
}

// Состояние видимости пароля
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

// Состояние загрузки
const isLoading = ref(false)
const isRegistrationCompleted = ref(false)
const registeredEmail = ref('')
const redirectCountdown = ref(60)
let redirectTimer: number | null = null

const clearRedirectTimer = () => {
  if (redirectTimer !== null) {
    window.clearInterval(redirectTimer)
    redirectTimer = null
  }
}

const goToLogin = () => {
  clearRedirectTimer()
  router.push('/login')
}

const startRedirectCountdown = () => {
  clearRedirectTimer()
  redirectCountdown.value = 60

  redirectTimer = window.setInterval(() => {
    if (redirectCountdown.value <= 1) {
      clearRedirectTimer()
      goToLogin()
      return
    }
    redirectCountdown.value -= 1
  }, 1000)
}

const enableRegistrationPreviewFromQuery = () => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('regPreview') !== '1') {
    return false
  }

  /*
    TEMP-РЕЖИМ ПРЕДПРОСМОТРА: позволяет увидеть финальный экран регистрации без отправки формы.
    Использование: /reg?regPreview=1
    Можно безопасно удалить, когда предпросмотр больше не нужен.
  */
  isRegistrationCompleted.value = true
  registeredEmail.value = 'preview@example.com'
  startRedirectCountdown()
  return true
}

// Валидация первой формы
const validateForm = () => {
  let isValid = true
  
  errors.firstName = ''
  errors.lastName = ''
  errors.referralCode = ''

  if (!formData.firstName.trim()) {
    errors.firstName = 'Имя обязательно для заполнения'
    isValid = false
  } else if (formData.firstName.trim().length < 2) {
    errors.firstName = 'Имя должно содержать минимум 2 символа'
    isValid = false
  } else if (!/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/.test(formData.firstName.trim())) {
    errors.firstName = 'Имя может содержать только буквы, пробелы и дефисы'
    isValid = false
  }

  if (formData.lastName.trim() && formData.lastName.trim().length < 2) {
    errors.lastName = 'Фамилия должна содержать минимум 2 символа'
    isValid = false
  } else if (formData.lastName.trim() && !/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/.test(formData.lastName.trim())) {
    errors.lastName = 'Фамилия может содержать только буквы, пробелы и дефисы'
    isValid = false
  }

  if (formData.referralCode.trim() && formData.referralCode.trim().length < 3) {
    errors.referralCode = 'Реферальный код должен содержать минимум 3 символа'
    isValid = false
  }

  return isValid
}

// Валидация второй формы
const validateSecondForm = () => {
  let isValid = true
  
  secondFormErrors.userType = ''
  secondFormErrors.executorName = ''
  secondFormErrors.labelName = ''

  if (!secondFormData.userType) {
    secondFormErrors.userType = 'Выберите тип пользователя'
    isValid = false
  }

  if (secondFormData.userType === 'executor' && !secondFormData.executorName.trim()) {
    secondFormErrors.executorName = 'Имя исполнителя обязательно'
    isValid = false
  }

  if (secondFormData.userType === 'label' && !secondFormData.labelName.trim()) {
    secondFormErrors.labelName = 'Название лейбла обязательно'
    isValid = false
  }

  return isValid
}

// Валидация третьей формы
const validateThirdForm = () => {
  let isValid = true
  
  thirdFormErrors.email = ''
  thirdFormErrors.phone = ''
  thirdFormErrors.password = ''
  thirdFormErrors.confirmPassword = ''
  thirdFormErrors.personalData = ''
  thirdFormErrors.policy = ''

  // Валидация email
  if (!thirdFormData.email.trim()) {
    thirdFormErrors.email = 'Email обязателен для заполнения'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(thirdFormData.email.trim())) {
    thirdFormErrors.email = 'Введите корректный email адрес'
    isValid = false
  }

  // Валидация телефона
  if (!thirdFormData.phone.trim()) {
    thirdFormErrors.phone = 'Номер телефона обязателен'
    isValid = false
  } else if (!/^[\d\s\-\+\(\)]+$/.test(thirdFormData.phone.trim())) {
    thirdFormErrors.phone = 'Введите корректный номер телефона'
    isValid = false
  }

  // Валидация пароля
  if (!thirdFormData.password) {
    thirdFormErrors.password = 'Пароль обязателен'
    isValid = false
  } else if (thirdFormData.password.length < 6) {
    thirdFormErrors.password = 'Пароль должен содержать минимум 6 символов'
    isValid = false
  } else {
    const hasUpperCase = /[A-Z]/.test(thirdFormData.password)
    const hasLowerCase = /[a-z]/.test(thirdFormData.password)
    const hasNumbers = /\d/.test(thirdFormData.password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(thirdFormData.password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      thirdFormErrors.password = 'Пароль должен содержать заглавные и строчные буквы, цифры и специальные символы'
      isValid = false
    }
  }

  // Валидация подтверждения пароля
  if (!thirdFormData.confirmPassword) {
    thirdFormErrors.confirmPassword = 'Подтверждение пароля обязательно'
    isValid = false
  } else if (thirdFormData.password !== thirdFormData.confirmPassword) {
    thirdFormErrors.confirmPassword = 'Пароли не совпадают'
    isValid = false
  }

  // Валидация согласия на обработку данных
  if (!thirdFormData.personalData) {
    thirdFormErrors.personalData = 'Необходимо согласие на обработку персональных данных'
    isValid = false
  }

  // Валидация согласия с политикой конфиденциальности
  if (!thirdFormData.policy) {
    thirdFormErrors.policy = 'Необходимо согласие с политикой конфиденциальности'
    isValid = false
  }

  return isValid
}

// Переход ко второй форме
const goToSecondStep = () => {
  if (!validateForm()) {
    return
  }
  currentStep.value = 2
}

// Переход к третьей форме
const goToThirdStep = () => {
  if (!validateSecondForm()) {
    return
  }
  currentStep.value = 3
}

// Возврат к первой форме
const goToFirstStep = () => {
  currentStep.value = 1
}

// Возврат ко второй форме
const goBackToSecondStep = () => {
  currentStep.value = 2
}

// Отправка всей формы
const handleFinalSubmit = async () => {
  if (isRegistrationCompleted.value) {
    return
  }

  if (!validateThirdForm()) {
    return
  }

  isLoading.value = true

  // Формируем данные для отправки в соответствии с API
  const registrationData = {
    // Данные из первой формы
    FIRST_NAME: formData.firstName.trim(),
    LAST_NAME: formData.lastName.trim() || null,
    REF: formData.referralCode.trim() || null,
    
    // Данные из второй формы
    user_type: secondFormData.userType,
    ...(secondFormData.userType === 'executor' 
      ? { lable: secondFormData.executorName.trim() }
      : { lable2: secondFormData.labelName.trim() }
    ),
    
    // Данные из третьей формы
    EMAIL: thirdFormData.email.trim(),
    TEL: thirdFormData.phone.trim(),
    PASSWORD: thirdFormData.password,
    CONFIRM_PASSWORD: thirdFormData.confirmPassword,
    
    // Согласия
    personal: thirdFormData.personalData ? 'on' : 'off',
    security: thirdFormData.marketing ? 'on' : 'off',
    policy: thirdFormData.policy ? 'on' : 'off'
  }

  await sendRequest(
    "post",
    '/ajax_vue/ajax/auth/register.php',
    registrationData
  )
  .then((response: any) => {
    console.log('Успешная регистрация:', response.data)
    
    // Если сервер сразу возвращает токены
    if (response.data.access && response.data.refresh) {
      setToken(response.data.access, response.data.refresh)
    }
    
    registeredEmail.value = thirdFormData.email.trim()
    isRegistrationCompleted.value = true
    startRedirectCountdown()

    /*
      LEGACY-ЛОГИКА (старый сценарий): мгновенный редирект после регистрации.
      Оставлено как reference и может быть безопасно закомментировано/удалено при необходимости.
      sessionStorage.setItem('registration_success', '1')
      router.push(Tr.i18nRoute({ name: 'login' }))
    */
  })
  .catch(error => {
    console.error('Ошибка при регистрации:', error)
    
    if (error.response && error.response.data) {
      const errorData = error.response.data
      
      // Обработка ошибок для первой формы
      if (errorData.first_name) {
        errors.firstName = Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name
      }
      if (errorData.last_name) {
        errors.lastName = Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name
      }
      if (errorData.referral_code) {
        errors.referralCode = Array.isArray(errorData.referral_code) ? errorData.referral_code[0] : errorData.referral_code
      }
      
      // Обработка ошибок для второй формы
      if (errorData.user_type) {
        secondFormErrors.userType = Array.isArray(errorData.user_type) ? errorData.user_type[0] : errorData.user_type
      }
      if (errorData.executor_name) {
        secondFormErrors.executorName = Array.isArray(errorData.executor_name) ? errorData.executor_name[0] : errorData.executor_name
      }
      if (errorData.label_name) {
        secondFormErrors.labelName = Array.isArray(errorData.label_name) ? errorData.label_name[0] : errorData.label_name
      }
      
      // Обработка ошибок для третьей формы
      if (errorData.email) {
        thirdFormErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
      }
      if (errorData.phone) {
        thirdFormErrors.phone = Array.isArray(errorData.phone) ? errorData.phone[0] : errorData.phone
      }
      if (errorData.password) {
        thirdFormErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password
      }
      if (errorData.personal_data_consent) {
        thirdFormErrors.personalData = Array.isArray(errorData.personal_data_consent) 
          ? errorData.personal_data_consent[0] 
          : errorData.personal_data_consent
      }
      if (errorData.privacy_policy_consent) {
        thirdFormErrors.policy = Array.isArray(errorData.privacy_policy_consent) 
          ? errorData.privacy_policy_consent[0] 
          : errorData.privacy_policy_consent
      }
      
      // Общая ошибка
      if (!Object.keys(errorData).length && errorData.detail) {
        ElMessage({
          message: errorData.detail,
          type: 'error',
        });
      } else if (errorData.non_field_errors) {
        ElMessage({
          message: Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors,
          type: 'error',
        });
      }
    } else {
      ElMessage({
        message: 'Произошла ошибка при регистрации. Попробуйте еще раз.',
        type: 'error',
      });
    }
  })
  .finally(() => {
    isLoading.value = false
  })
}

// Функция проверки авторизации
const checkAuth = async () => {
  try {
    // GET запрос, третий аргумент - пустой объект data
    const response = await sendRequest('get', '/ajax_vue/ajax/isAuth.php', {})
    
    // Проверяем по полю error:
    // {error: false} - не авторизован
    // {error: true} - авторизован
    if (response.data?.error === true) {
      console.log('Пользователь авторизован')
      
      ElMessage({
        message: 'Вы уже авторизованы',
        type: 'info',
      });
      
      // Редирект в личный кабинет
      router.push(Tr.i18nRoute({ name: 'personal' }))
    } else {
      console.log('Пользователь не авторизован')
    }
  } catch (error) {
    // Ошибка при проверке - пользователь скорее всего не авторизован
    console.log('Не удалось проверить статус авторизации:', error)
  }
}

// Проверка авторизации при загрузке страницы
onMounted(() => {
  const isPreviewMode = enableRegistrationPreviewFromQuery()
  if (!isPreviewMode) {
    checkAuth()
  }
})

onUnmounted(() => {
  clearRedirectTimer()
})
</script>

<template>
<section class="auth">
  <div class="auth__container container">
    <div class="auth__block">
      <div class="auth__flex">
        <div class="auth__left">
          <div class="auth__left_left">
            <div class="auth__logo"><Logo /></div>
            <div class="auth__info">
              <h3 class="auth__heading">Стань известным и популярным в мире музыки</h3>
              <p class="auth__description">Выложи трек на все площадки и продавай свою музыку во всем мире</p>
            </div>
          </div>
          <div class="auth__image">
            <img src="@/assets/img/auth/auth.webp" alt="cover">
          </div>
        </div>
        <div class="auth__right">
          <div class="auth__top">
            <p class="auth__acc text_small">У вас уже есть аккаунт?</p>
            <RouterLink class="auth__login button__second button" :to="Tr.i18nRoute({ name: 'login' })">
              <span>Войти</span>
            </RouterLink>
          </div>

          <div v-if="isRegistrationCompleted" class="auth__form auth__success">
            <div class="form__heading">
              <h1 class="form__head title_two">Регистрация успешна!</h1>
            </div>
            <p class="form__description text_small">
              Вы успешно зарегистрированы с email: <strong>{{ registeredEmail }}</strong>.
              Обязательно подтвердите регистрацию с указанной почты перед авторизацией на сайте.
            </p>
            <p class="form__description text_small">
              Автоматический переход к авторизации через {{ redirectCountdown }} сек.
            </p>
            <div class="form__buttons">
              <button
                class="form__send button__black button"
                @click="goToLogin"
              >
                <span>Перейти к авторизации</span>
              </button>
            </div>
          </div>

          <!-- Первая форма -->
          <div v-else-if="currentStep === 1" class="auth__form">
            <div class="form__heading">
              <h1 class="form__head title_two">Регистрация</h1>
            </div>
            <div class="form__flex">
              <!-- Поле имени -->
              <div class="form__group">
                <label for="firstName" class="form__label button">Ваше имя<span>*</span></label>
                <el-input
                  id="firstName"
                  v-model="formData.firstName"
                  type="text"
                  :class="{ 'error': errors.firstName }"
                  placeholder="Введите ваше имя"
                  :disabled="isLoading"
                  @blur="validateForm"
                  @input="errors.firstName = ''"
                  size="large"
                />
                <div v-if="errors.firstName" class="error text_very">
                  {{ errors.firstName }}
                </div>
              </div>

              <!-- Поле фамилии -->
              <div class="form__group">
                <label for="lastName" class="form__label button">Ваша фамилия</label>
                <el-input
                  id="lastName"
                  v-model="formData.lastName"
                  type="text"
                  :class="{ 'error': errors.lastName }"
                  placeholder="Введите вашу фамилию"
                  :disabled="isLoading"
                  @blur="validateForm"
                  @input="errors.lastName = ''"
                  size="large"
                />
                <div v-if="errors.lastName" class="error text_very">
                  {{ errors.lastName }}
                </div>
              </div>

              <!-- Поле реферального кода -->
              <div class="form__group">
                <label for="referralCode" class="form__label button">Реферальный код</label>
                <div class="form__hint text_small">
                  Если у вас нет кода или почты партнёра, оставьте это поле пустым.
                </div>
                <el-input
                  id="referralCode"
                  v-model="formData.referralCode"
                  type="text"
                  :class="{ 'error': errors.referralCode }"
                  placeholder="Введите код"
                  :disabled="isLoading"
                  @blur="validateForm"
                  @input="errors.referralCode = ''"
                  size="large"
                />
                <div v-if="errors.referralCode" class="error text_very">
                  {{ errors.referralCode }}
                </div>
              </div>
            </div>
            <div class="form__buttons">
              <button 
                class="form__send button__black button" 
                @click="goToSecondStep"
                :disabled="isLoading"
              >
                <span>Продолжить</span>
              </button>
            </div>
          </div>

          <!-- Вторая форма -->
          <div v-else-if="currentStep === 2" class="auth__form">
            <div class="form__heading">
              <h1 class="form__head title_two">Выберите тип аккаунта</h1>
            </div>
            
            <div class="form__flex">
              <!-- Чекбоксы выбора типа -->
              <div class="form__group">
                <label class="form__label button">Тип учетной записи<span>*</span></label>
                <p class="form__desc text_small">
                  Выбирайте «Исполнитель», если вы один артист с одним псевдонимом. 
                  Выбирайте «Лейбл», если собираетесь загружать много релизов от разных артистов.
                </p>
                <div class="form__labels">
                  <label class="form__label_radio">
                    <input 
                      type="radio" 
                      v-model="secondFormData.userType" 
                      value="executor"
                      class="form__radio_input"
                    >
                    <span class="form__radio_text">Исполнитель</span>
                  </label>
                  <label class="form__label_radio">
                    <input 
                      type="radio" 
                      v-model="secondFormData.userType" 
                      value="label"
                      class="form__radio_input"
                    >
                    <span class="form__radio_text">Лейбл</span>
                  </label>
                </div>
                <div v-if="secondFormErrors.userType" class="error text_very">
                  {{ secondFormErrors.userType }}
                </div>
                <p class="form__description text_very">
                  Пожалуйста, впишите именно ПСЕВДОНИМ АРТИСТА, 
                  под которым будут выкладываться релизы. 
                  
                </p>
              </div>

              <!-- Поле для исполнителя -->
              <div v-if="secondFormData.userType === 'executor'" class="form__group">
                <label class="form__label button">Имя исполнителя<span>*</span></label>
                <el-input
                  v-model="secondFormData.executorName"
                  type="text"
                  :class="{ 'error': secondFormErrors.executorName }"
                  placeholder="Введите имя исполнителя"
                  :disabled="isLoading"
                  @blur="validateSecondForm"
                  @input="secondFormErrors.executorName = ''"
                  size="large"
                />
                <div v-if="secondFormErrors.executorName" class="error text_very">
                  {{ secondFormErrors.executorName }}
                </div>
              </div>

              <!-- Поле для лейбла -->
              <div v-if="secondFormData.userType === 'label'" class="form__group">
                <label class="form__label button">Имя лейбла<span>*</span></label>
                <el-input
                  v-model="secondFormData.labelName"
                  type="text"
                  :class="{ 'error': secondFormErrors.labelName }"
                  placeholder="Введите название лейбла"
                  :disabled="isLoading"
                  @blur="validateSecondForm"
                  @input="secondFormErrors.labelName = ''"
                  size="large"
                />
                <div v-if="secondFormErrors.labelName" class="error text_very">
                  {{ secondFormErrors.labelName }}
                </div>
              </div>
            </div>

            <div class="form__buttons">
              <button 
                class="form__back button__second button" 
                @click="goToFirstStep"
                :disabled="isLoading"
              >
                <span><BackSVG /></span>
                <span>Назад</span>
              </button>
              <button 
                class="form__send button__black button" 
                @click="goToThirdStep"
                :disabled="isLoading"
              >
                <span>Продолжить</span>
              </button>
            </div>
          </div>

          <!-- Третья форма -->
          <div v-else class="auth__form">
            <div class="form__heading">
              <h1 class="form__head title_two">Контактные данные</h1>
            </div>
            
            <div class="form__flex">
              <!-- Поле email -->
              <div class="form__group">
                <label for="email" class="form__label button">Электронная почта<span>*</span></label>
                <el-input
                  id="email"
                  v-model="thirdFormData.email"
                  type="email"
                  :class="{ 'error': thirdFormErrors.email }"
                  placeholder="Введите ваш e-mail"
                  :disabled="isLoading"
                  @blur="validateThirdForm"
                  @input="thirdFormErrors.email = ''"
                  size="large"
                />
                <div v-if="thirdFormErrors.email" class="error text_very">
                  {{ thirdFormErrors.email }}
                </div>
              </div>

              <!-- Поле телефона -->
              <div class="form__group">
                <label for="phone" class="form__label button">Номер телефона<span>*</span></label>
                <el-input
                  id="phone"
                  v-model="thirdFormData.phone"
                  type="tel"
                  :class="{ 'error': thirdFormErrors.phone }"
                  placeholder="Введите номер телефона"
                  :disabled="isLoading"
                  @blur="validateThirdForm"
                  @input="thirdFormErrors.phone = ''"
                  size="large"
                />
                <div v-if="thirdFormErrors.phone" class="error text_very">
                  {{ thirdFormErrors.phone }}
                </div>
              </div>

              <!-- Поле пароля с глазком -->
              <div class="form__group">
                <label for="password" class="form__label button">Пароль<span>*</span></label>
                <el-input
                  id="password"
                  v-model="thirdFormData.password"
                  :type="passwordVisible ? 'text' : 'password'"
                  :class="{ 'error': thirdFormErrors.password }"
                  placeholder="Введите пароль"
                  :disabled="isLoading"
                  @blur="validateThirdForm"
                  @input="thirdFormErrors.password = ''"
                  size="large"
                >
                  <template #suffix>
                    <el-icon 
                      @click="passwordVisible = !passwordVisible"
                      style="color: var(--el-text-color-placeholder); cursor: pointer;"
                    >
                      <View v-if="passwordVisible" />
                      <Hide v-else />
                    </el-icon>
                  </template>
                </el-input>
                <div v-if="thirdFormErrors.password" class="error text_very">
                  {{ thirdFormErrors.password }}
                </div>
              </div>

              <!-- Поле подтверждения пароля с глазком -->
              <div class="form__group">
                <label for="confirmPassword" class="form__label button">Повторите пароль<span>*</span></label>
                <el-input
                  id="confirmPassword"
                  v-model="thirdFormData.confirmPassword"
                  :type="confirmPasswordVisible ? 'text' : 'password'"
                  :class="{ 'error': thirdFormErrors.confirmPassword }"
                  placeholder="Повторите пароль"
                  :disabled="isLoading"
                  @blur="validateThirdForm"
                  @input="thirdFormErrors.confirmPassword = ''"
                  size="large"
                >
                  <template #suffix>
                    <el-icon 
                      @click="confirmPasswordVisible = !confirmPasswordVisible"
                      style="color: var(--el-text-color-placeholder); cursor: pointer;"
                    >
                      <View v-if="confirmPasswordVisible" />
                      <Hide v-else />
                    </el-icon>
                  </template>
                </el-input>
                <div v-if="thirdFormErrors.confirmPassword" class="error text_very">
                  {{ thirdFormErrors.confirmPassword }}
                </div>
              </div>

              <!-- Чекбоксы согласия -->
              <div class="form__group">
                <div class="form__checkboxes">
                  <el-checkbox 
                    v-model="thirdFormData.personalData" 
                    :disabled="isLoading"
                    :class="{ 'error': thirdFormErrors.personalData }"
                    size="large"
                  >
                    Я даю согласие на обработку своих персональных данных
                  </el-checkbox>
                  
                  <!-- Новый чекбокс политики конфиденциальности -->
                  <el-checkbox 
                    v-model="thirdFormData.policy" 
                    :disabled="isLoading"
                    :class="{ 'error': thirdFormErrors.policy }"
                    size="large"
                  >
                    Я соглашаюсь с 
                    <a href="/policy" target="_blank" class="policy-link">Политикой конфиденциальности</a>
                  </el-checkbox>
                  
                  <el-checkbox 
                    v-model="thirdFormData.marketing" 
                    :disabled="isLoading"
                    size="large"
                  >
                    Я даю согласие на рекламную рассылку
                  </el-checkbox>
                </div>
                <div v-if="thirdFormErrors.personalData" class="error text_very">
                  {{ thirdFormErrors.personalData }}
                </div>
                <div v-if="thirdFormErrors.policy" class="error text_very">
                  {{ thirdFormErrors.policy }}
                </div>
              </div>
            </div>

            <div class="form__buttons">
              <button 
                class="form__back button__second button" 
                @click="goBackToSecondStep"
                :disabled="isLoading"
              >
                <span><BackSVG /></span>
                <span>Назад</span>
              </button>
              <button 
                class="form__send button__black button" 
                @click="handleFinalSubmit"
                :disabled="isLoading"
              >
                <span v-if="!isLoading">Зарегистрироваться</span>
                <span v-else>Загрузка...</span>
              </button>
            </div>
          </div>

          <div v-if="!isRegistrationCompleted" class="form__step">
            <span :class="{ active: currentStep >= 1 }"></span>
            <span :class="{ active: currentStep >= 2 }"></span>
            <span :class="{ active: currentStep >= 3 }"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</template>

<style lang="scss" scoped>
.form__labels {
  display: flex;
  gap: 20px;
  margin: 10px 0;
}

.form__label_radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form__radio_input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form__radio_text {
  font-size: 14px;
}

.form__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.policy-link {
  color: var(--el-color-primary);
  text-decoration: underline;

  &:hover {
    text-decoration: none;
  }
}

.error {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 4px;
}

.form__group :deep(.el-input.error .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.form__hint {
  color: var(--el-text-color-secondary);
  margin-bottom: 5px;
}

.auth__success {
  .form__description {
    margin-bottom: 10px;
  }
}

.form__step {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;

  span {
    width: 40px;
    height: 4px;
    background-color: var(--el-border-color);
    border-radius: 2px;
    transition: background-color 0.3s;

    &.active {
      background-color: var(--el-color-primary);
    }
  }
}
</style>