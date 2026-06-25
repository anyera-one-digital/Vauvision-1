<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { sendRequest } from '@/utils/api';
import { ElMessage } from 'element-plus';
import Tr from "@/i18n/translation";
import Logo from "@/uikit/Logo.vue";

const route = useRoute()

const getQueryParamValue = (value: string | string[] | null | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
}

onMounted(async () => {
  const id = getQueryParamValue(route.query.id as string | string[] | null | undefined)
  const confirmCode = getQueryParamValue(route.query.confirm_code as string | string[] | null | undefined)

  if (!id || !confirmCode) {
    ElMessage({
      message: 'Недействительная ссылка подтверждения email.',
      type: 'error',
    });
    return
  }

  try {
    await sendRequest(
      "post",
      '/ajax_vue/ajax/auth/regFin.php',
      {
        id: id,
        confirm_code: confirmCode
      }
    )
    ElMessage({
      message: 'Email успешно подтвержден!',
      type: 'success',
    });
  } catch (error) {
    console.error('Ошибка подтверждения email:', error)
    ElMessage({
      message: 'Не удалось подтвердить email. Возможно, ссылка устарела.',
      type: 'error',
    });
  }
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
            <p class="auth__acc text_small">Уже есть аккаунт?</p>
            <RouterLink class="auth__login button__second button" :to="Tr.i18nRoute({ name: 'login' })">
              <span>Войти</span>
            </RouterLink>
          </div>
          <div class="auth__form auth__form--centered">
            <div class="form__heading">
              <h1 class="form__head title_two">Почта подтверждена</h1>
            </div>
            
            <!-- Иконка успеха -->
            <div class="success-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="success-message">
              <p class="success-message__text">
                Ваш email успешно подтвержден! Теперь вы можете войти в свой аккаунт и начать пользоваться всеми возможностями платформы.
              </p>
            </div>

            <div class="form__buttons form__buttons--single">
              <RouterLink 
                class="form__send button__black button" 
                :to="Tr.i18nRoute({ name: 'login' })"
              >
                <span>Перейти ко входу</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</template>

<style lang="scss" scoped>
.auth__form--centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.success-icon {
  margin: 24px 0 16px;
  color: #52c41a;
  animation: scaleIn 0.5s ease-out;

  svg {
    width: 80px;
    height: 80px;

    @media (max-width: 768px) {
      width: 60px;
      height: 60px;
    }
  }
}

.success-message {
  max-width: 400px;
  margin: 0 auto 32px;

  &__text {
    font-size: 16px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);

    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
}

.form__buttons--single {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
  }

  .form__send {
    width: 100%;
    justify-content: center;
  }
}

.additional-info {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  &__text {
    color: rgba(255, 255, 255, 0.6);
  }

  &__link {
    color: #fff;
    text-decoration: none;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  50% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>