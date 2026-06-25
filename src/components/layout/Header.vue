<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';
import LabelArtistsMenuBlock from "@/components/layout/LabelArtistsMenuBlock.vue";
import {
  syncLabelMenuFromGetDataResponse,
  registerLabelArtistsExternalRefresh,
  clearStoredLabelReturnUserId,
} from "@/composables/labelArtistsMenu";
import LogoSVG from "@/uikit/Logo.vue";
import PaySVG from "@/uikit/icon/PaySVG.vue";
import LinkSVG from "@/uikit/icon/LinkSVG.vue";
import PersonalSVG from "@/uikit/icon/PersonalSVG.vue";
import HomeSVG from "@/uikit/menu/HomeSVG.vue";
import UploadSVG from "@/uikit/menu/UploadSVG.vue";
import SettingSVG from "@/uikit/menu/SettingSVG.vue";
import PartnerSVG from "@/uikit/menu/PartnerSVG.vue";
import FaqSVG from "@/uikit/menu/FaqSVG.vue";
import LogoutSVG from "@/uikit/menu/LogoutSVG.vue";
import ArticlesSVG from "@/uikit/menu/ArticlesSVG.vue";
import Tr from "@/i18n/translation";

const isMenuPopup = ref<boolean>(false);
const isOverlay = ref<boolean>(false);
const menu = ref<boolean>(false);
const BALANCE_SYNC_EVENT = "cabinet-balance-updated";

// Данные пользователя
const userData = ref({
  name: '',
  email: '',
  balance: 0,
  currencySymbol: '₽',
  avatar: ''
});

// Реферальная ссылка
const referralLink = ref('');

// Ссылка для выхода
const logoutUrl = ref('');

let unregisterLabelArtistsRefresh: (() => void) | null = null;

// Состояние копирования
const isCopying = ref(false);
const copySuccess = ref(false);

// Получаем базовый URL из текущего окна
const baseUrl = window.location.origin;

const fetchUserData = async (prefetched?: Record<string, unknown>) => {
  try {
    const response = prefetched
      ? { data: prefetched }
      : await fetchSharedCabinetGetData();

    if (response.data) {
      // Данные пользователя
      if (response.data.user) {
        userData.value.name = response.data.user.name || response.data.user.login || 'Пользователь';
        userData.value.email = response.data.user.email || '';
        
        // Аватарка пользователя
        if (response.data.user.personalPhoto) {
          userData.value.avatar = response.data.user.personalPhoto;
        }
      }
      
      // Баланс и валюта (getData → profile)
      if (response.data.profile) {
        const prof = response.data.profile as {
          balance?: number;
          region?: string;
          currencySymbol?: string;
        };
        userData.value.balance = prof.balance || 0;
        userData.value.currencySymbol =
          (prof.currencySymbol as string) ||
          (prof.region === 'Russia' ? '₽' : '$');
      }
      
      // Реферальная ссылка
      if (response.data.referral && response.data.referral.link) {
        referralLink.value = response.data.referral.link;
      }
      
      // Ссылка для выхода
      if (response.data.unauth) {
        logoutUrl.value = response.data.unauth;
      }

      syncLabelMenuFromGetDataResponse(
        response.data as Record<string, unknown>
      );
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных в Header:', error);
  }
};

interface BalanceSyncDetail {
  balance?: number;
  currencySymbol?: string;
}

interface HeaderBalanceApi {
  updateBalance?: (newBalance: number, currencySymbol?: string) => void;
  refreshUserData?: () => Promise<void> | void;
}

const applySyncedBalance = (detail?: BalanceSyncDetail) => {
  if (!detail) return;
  if (typeof detail.balance === "number" && Number.isFinite(detail.balance)) {
    userData.value.balance = detail.balance;
  }
  if (
    typeof detail.currencySymbol === "string" &&
    detail.currencySymbol.trim() !== ""
  ) {
    userData.value.currencySymbol = detail.currencySymbol;
  }
};

const handleBalanceSyncEvent = (event: Event) => {
  const customEvent = event as CustomEvent<BalanceSyncDetail>;
  applySyncedBalance(customEvent.detail);
};

const updateBalance = (newBalance: number, currencySymbol?: string) => {
  applySyncedBalance({
    balance: newBalance,
    currencySymbol,
  });
};

// Функция для копирования ссылки
const copyReferralLink = async () => {
  if (!referralLink.value) return;
  
  isCopying.value = true;
  copySuccess.value = false;
  
  try {
    await navigator.clipboard.writeText(referralLink.value);
    copySuccess.value = true;
    
    // Сбрасываем статус через 2 секунды
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error('Ошибка при копировании:', err);
  } finally {
    isCopying.value = false;
  }
};

// Функция для получения полного URL аватарки
const getAvatarUrl = (avatarPath: string) => {
  if (!avatarPath) return '';
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return `${baseUrl}${cleanPath}`;
};

onMounted(async () => {
  unregisterLabelArtistsRefresh = registerLabelArtistsExternalRefresh(
    fetchUserData
  );
  window.addEventListener(BALANCE_SYNC_EVENT, handleBalanceSyncEvent);

  (
    window as Window & { __headerApi?: HeaderBalanceApi }
  ).__headerApi = {
    updateBalance,
    refreshUserData: fetchUserData,
  };

  await fetchUserData();
});

onUnmounted(() => {
  window.removeEventListener(BALANCE_SYNC_EVENT, handleBalanceSyncEvent);
  unregisterLabelArtistsRefresh?.();
  unregisterLabelArtistsRefresh = null;
});

const clickOverlay = () => {
  isMenuPopup.value = false;
  isOverlay.value = false;
  menu.value = false;
  document.documentElement.classList.remove("noscroll");
};

if (isMenuPopup.value === false) {
  document.addEventListener('keyup', function (evt) {
    if (evt.keyCode === 27) {
      isMenuPopup.value = false;
      isOverlay.value = false;
      menu.value = false;
      document.documentElement.classList.remove("noscroll");
    }
  });
};

// Функция для переключения меню
const toggleMenu = () => {
  menu.value = !menu.value;
  isMenuPopup.value = menu.value;
  isOverlay.value = menu.value;
  
  if (menu.value) {
    document.documentElement.classList.add("noscroll");
  } else {
    document.documentElement.classList.remove("noscroll");
  }
};

// Функция для закрытия меню при клике на ссылку
const closeMenu = () => {
  menu.value = false;
  isMenuPopup.value = false;
  isOverlay.value = false;
  document.documentElement.classList.remove("noscroll");
};

// Функция для выхода
const handleLogout = () => {
  if (logoutUrl.value) {
    clearStoredLabelReturnUserId();
    window.location.href = `${baseUrl}${logoutUrl.value}`;
  }
};

// Форматирование баланса
const formattedBalance = (balance: number) => {
  return balance.toLocaleString('ru-RU');
};

// Обработчик ошибки загрузки аватарки
const handleAvatarError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent) {
    // Показываем иконку-заглушку
    const svg = parent.querySelector('svg');
    if (svg) {
      svg.style.display = 'block';
    }
  }
};
</script>

<template>
  <div :class="['overlay', { active: isOverlay }]" @click="clickOverlay"></div>
  
  <header class="header">
    <div class="container header__container">
      <div class="header__block">
        <div class="header__flex">
          <a href="/" class="header__logo">
            <LogoSVG />
          </a>
          
          <!-- <div class="header__info">
            <div 
              class="header__balance header__button" 
              :title="'Счёт обновляется после скачивания отчёта. Пожалуйста, скачайте отчёт, после этого сумма на балансе обновится'"
            >
              <PaySVG />
              <span>Баланс: {{ formattedBalance(userData.balance) }} {{ userData.currencySymbol }}</span>
            </div>
            <button 
              v-if="referralLink"
              class="header__invite header__button"
              @click="copyReferralLink"
              :disabled="isCopying"
            >
              <LinkSVG />
              <span>{{ copySuccess ? 'Скопировано!' : 'Пригласи партнера по ссылке' }}</span>
            </button>
          </div> -->
          
          <div class="header__right">
            <RouterLink class="header__faq" :to="Tr.i18nRoute({ name: 'faq' })" @click="closeMenu">
              <FaqSVG />
            </RouterLink>
            <!-- <button class="header__personal">
              <div class="header__personal_logo">
                <img 
                  v-if="userData.avatar"
                  :src="getAvatarUrl(userData.avatar)"
                  @error="handleAvatarError"
                  alt="Avatar"
                  class="header__avatar"
                >
                <PersonalSVG v-else />
              </div>
            </button> -->
            <button class="header__burger" :class="{ active: menu }" @click="toggleMenu">
              <span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
  
  <section class="top"></section>
  
  <div class="burger__menu" :class="{ active: menu }">
    <div class="container burger__container">
      <div class="burger__block">
        <div class="burger__flex">
          <!-- Заголовок меню -->
          <div class="burger__header">
            <RouterLink class="burger__logo" :to="Tr.i18nRoute({ name: 'home' })" @click="closeMenu">
              <LogoSVG />
            </RouterLink>
            <div class="burger__right">
              <button class="header__faq">
                <FaqSVG />
              </button>
              <button class="header__burger" :class="{ active: menu }" @click="toggleMenu">
                <span></span>
              </button>
            </div>
          </div>
          
          <!-- Информация о пользователе с аватаркой -->
          <div class="burger__personal">
            <div class="burger__personal_logo">
              <img 
                v-if="userData.avatar"
                :src="getAvatarUrl(userData.avatar)"
                @error="handleAvatarError"
                alt="Avatar"
                class="burger__avatar"
              >
              <PersonalSVG v-else />
            </div>
            <div class="burger__personal_info">
              <h6 class="burger__personal_name">{{ userData.name || 'Пользователь' }}</h6>
              <p class="burger__personal_mail">{{ userData.email || 'email@example.com' }}</p>
            </div>
          </div>

          <LabelArtistsMenuBlock
            :include-modal="false"
            root-class="menu__artists--burger menu__artists--burger-inline"
          />
          
          <!-- Навигация -->
          <nav class="burger__nav">
            <ul class="burger__nav_list">
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'personal' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <HomeSVG class="burger__nav_icon" />
                  <p>Главная</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'release' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <UploadSVG class="burger__nav_icon" />
                  <p>Выложить релиз</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item burger__profile">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'setting' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <SettingSVG class="burger__nav_icon" />
                  <p>Настройки</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'partner' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <PartnerSVG class="burger__nav_icon" />
                  <p>Стать партнером</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'faq' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <FaqSVG class="burger__nav_icon" />
                  <p>FAQ</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'articles' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <ArticlesSVG class="burger__nav_icon" />
                  <p>Статьи</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <RouterLink 
                  :to="Tr.i18nRoute({ name: 'support' })" 
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <FaqSVG class="burger__nav_icon" />
                  <p>Связь с поддержкой</p>
                </RouterLink>
              </li>
              <li class="burger__nav_item">
                <a 
                  href="https://vauvision.com/auth/profile/"
                  class="burger__nav_link"
                  @click="closeMenu"
                >
                  <FaqSVG class="burger__nav_icon" />
                  <p>Старая версия</p>
              </a>
              </li>
              <li class="burger__nav_item burger__logout">
                <button 
                  class="burger__nav_link" 
                  @click="handleLogout"
                >
                  <LogoutSVG class="burger__nav_icon" />
                  <p>Выйти из аккаунта</p>
                </button>
              </li>
            </ul>
          </nav>
          
          <!-- Кнопки с балансом и реферальной ссылкой -->
          <div class="burger__buttons">
            <div 
              class="header__balance header__button" 
              :title="'Счёт обновляется после скачивания отчёта. Пожалуйста, скачайте отчёт, после этого сумма на балансе обновится'"
            >
              <PaySVG />
              <span>Баланс: {{ formattedBalance(userData.balance) }} {{ userData.currencySymbol }}</span>
            </div>
            <button 
              v-if="referralLink"
              class="header__invite header__button burger__copy-button"
              @click="copyReferralLink"
              :disabled="isCopying"
            >
              <LinkSVG />
              <span>{{ copySuccess ? 'Скопировано!' : 'Скопировать реферальную ссылку' }}</span>
            </button>
          </div>
          
          <!-- Политика конфиденциальности -->
          <div class="burger__privacy">
            <a 
              :href="`${baseUrl}/upload/policy.pdf`" 
              class="burger__privacy_link"
              target="_blank"
              rel="noopener noreferrer"
              @click="closeMenu"
            >
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* Overlay */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 299;

  &.active {
    opacity: 1;
    visibility: visible;
  }
}

.top {
  height: 80px;
  margin: 0;
}

.header {
  width: 100%;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 202;
  background-color: var(--bg);
  border-bottom: 1px solid var(--border);

  &__block {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  &__logo {
    display: flex;
    width: 300px;
    height: 100%;
    align-items: center;
    border-right: 1px solid var(--border);
    transition: color 0.15s linear;

    @media (max-width: 1919px) {
      width: 230px;
    }

    @media (max-width: 1439px) {
      border-right: none;
    }

    &:hover {
      color: var(--color);
    }

    svg {
      width: 175px;
      height: 32px;
      object-fit: contain;
    }
  }

  &__flex {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    gap: 130px;

    @media (max-width: 1919px) {
      gap: 50px;
    }

    @media (max-width: 1439px) {
      gap: 70px;
    }
  }

  &__info {
    display: flex;
    gap: 20px;

    @media (max-width: 1439px) {
      display: none;
    }
  }

  &__button {
    display: flex;
    width: max-content;
    padding: 14px 25px;
    align-items: center;
    gap: 10px;
    color: var(--text);
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 30px;
    transition: color 0.15s linear, background-color 0.15s linear, border-color 0.15s linear;
    cursor: pointer;

    &:hover {
      color: var(--text);
      background-color: var(--bg);
      border-color: var(--text);
    }

    span {
      flex: 0 0 auto;
    }

    svg {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  }

  &__right {
    display: flex;
    margin: 0 0 0 auto;
    flex: 0 0 auto;
    align-items: center;
    flex-wrap: nowrap;
    gap: 10px;
  }

  &__faq,
  &__personal {
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    transition: color 0.15s linear, background-color 0.15s linear, border-color 0.15s linear;
  }

  &__faq {
    color: var(--text);
    background-color: var(--bg);

    &:hover {
      color: var(--text);
      background-color: var(--bg);
      border-color: var(--color);
    }

    svg {
      width: 22.79px;
      height: 22.79px;
      object-fit: contain;
    }
  }

  &__personal {
    color: var(--text);
    background-color: var(--bg-color);

    @media (max-width: 1439px) {
      display: none;
    }

    &:hover {
      background-color: var(--border);
    }

    svg {
      width: 26.71px;
      height: 26.71px;
      object-fit: contain;
      opacity: 0.7;
    }
  }

  &__personal_logo {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  &__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  &__burger {
    display: none;

    @media (max-width: 1439px) {
      display: inline-block;
      width: 50px;
      height: 50px;
      position: relative;
      z-index: 1;
      cursor: pointer;

      span {
        background-color: var(--text);
        content: "";
        display: block;
        height: 2px;
        left: calc(50% - 13px);
        position: absolute;
        top: calc(50% - 1px);
        transform-origin: 50% 50%;
        transition: background-color 0.2s ease-in-out, top 0.2s 0.2s ease-out, transform 0.2s linear;
        width: 26px;

        &:before,
        &:after {
          background-color: var(--text);
          content: "";
          display: block;
          height: 2px;
          position: absolute;
          transform-origin: 50% 50%;
          transition: background-color 0.2s ease-in-out, top 0.2s 0.2s ease-out, transform 0.2s linear;
          width: 26px;
        }

        &:before {
          top: 7px;
        }

        &:after {
          top: -7px;
        }
      }

      &.active span {
        background-color: transparent;
        transition: background-color 0.2s ease-out;

        &:before,
        &:after {
          transition: top 0.2s ease-out, transform 0.2s 0.2s ease-out;
        }

        &:before {
          top: 0;
          transform: rotate3d(0, 0, 1, -45deg);
        }

        &:after {
          top: 0;
          transform: rotate3d(0, 0, 1, 45deg);
        }
      }
    }
  }

  &__invite:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* Burger Menu */
.burger__menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 100%;
  max-width: 440px;
  height: 100vh;
  background-color: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.1);
  transition: right 0.4s cubic-bezier(0.77, 0, 0.175, 1);
  z-index: 300;
  overflow-y: auto;
  overflow-x: hidden;

  &.active {
    right: 0;
  }
}

.burger__container {
  height: 100%;
  padding: 0;
}

.burger__block {
  height: 100%;
}

.burger__flex {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.burger__header {
  display: flex;
  height: 60px;
  padding: 0 10px 0 20px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);

  .header__burger {
    display: inline-block;
    width: 50px;
    height: 50px;
    position: relative;
    cursor: pointer;
  }
}

.burger__logo {
  width: auto;
  padding: 0;
  border-right: none;

  svg {
    width: 140px;
    height: 25px;
  }
}

.burger__right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.burger__personal {
  display: flex;
  padding: 30px 20px 20px;
  align-items: center;
  gap: 15px;
}

.burger__personal_logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: var(--white);
  border-radius: 50%;
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;

  @media (max-width: 767px) {
    width: 60px;
    height: 60px;
  }

  svg {
    width: 32px;
    height: 32px;
    opacity: 0.8;
  }
}

.burger__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.burger__personal_info {
  flex: 1;
}

.burger__personal_name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 5px 0;
}

.burger__personal_mail {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0.8;
}

.burger__nav {
  flex: 1;
}

/* .burger__profile {
  margin: 0 0 20px;
  padding: 0 0 20px;
  border-bottom: 1px solid var(--border);
} */

.burger__logout {
  margin: 20px 0 0;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.burger__nav_link {
  display: flex;
  width: 100%;
  padding: 12px 20px;
  align-items: center;
  color: var(--text);
  gap: 12px;
  text-align: left;
  transition: color 0.15s linear;
  cursor: pointer;

  &:hover,
  &:hover p {
    color: var(--color);
  }

  &.router-link-active,
  &.router-link-active p {
    color: var(--color);
  }
}

.burger__nav_icon {
  width: 24px;
  height: 24px;
  opacity: 0.7;
}

.burger__buttons {
  display: flex;
  margin: 50px 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.burger__privacy {
  margin: auto 0 0;
  padding: 40px 20px;
  text-align: center;
  border-top: 1px solid var(--border);
}

.burger__privacy_link {
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--color);
  }
}
</style>