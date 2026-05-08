<template>
  <div class="menu__back"></div>
  <div class="menu__block">
    <div class="menu__scroll">
      <div class="menu__personal">
        <div class="menu__personal_logo">
          <img 
            v-if="userData.avatar"
            :src="getAvatarUrl(userData.avatar)"
            @error="handleAvatarError"
            alt="Avatar"
            class="menu__avatar"
          >
          <PersonalSVG v-else />
        </div>
        <div class="menu__personal_info">
          <h6 class="menu__personal_name">{{ userData.name }}</h6>
          <p class="menu__personal_mail">{{ userData.email }}</p>
        </div>
      </div>

      <!-- Кнопка Баланс -->
      <div class="menu__balance">
        <div 
          class="menu__balance_button" 
          :title="'Счёт обновляется после скачивания отчёта. Пожалуйста, скачайте отчёт, после этого сумма на балансе обновится'"
        >
          <PaySVG />
          <span>Баланс: {{ formattedBalance(userData.balance) }} {{ userData.currencySymbol }}</span>
        </div>
      </div>

      <LabelArtistsMenuBlock />

      <!-- Основная навигация -->
      <ul class="menu__list">
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'personal' })">
            <span><HomeSVG /></span>
            <span>Главная</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'release' })">
            <span><UploadSVG /></span>
            <span>Выложить релиз</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'setting' })">
            <span><SettingSVG /></span>
            <span>Настройки</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'partner' })">
            <span><PartnerSVG /></span>
            <span>Стать партнером</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'faq' })">
            <span><FaqSVG /></span>
            <span>FAQ</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'articles' })">
            <span><ArticlesSVG /></span>
            <span>Статьи</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <RouterLink class="menu__link" :to="Tr.i18nRoute({ name: 'support' })">
            <span><FaqSVG /></span>
            <span>Связь с поддержкой</span>
          </RouterLink>
        </li>
        <li class="menu__item">
          <a href="#" target="_blank" class="menu__link" @click.prevent="goToOldVersion">
            <span><FaqSVG /></span>
            <span>Старая версия</span>
          </a>
        </li>
        
        <!-- Кнопка Выйти из аккаунта -->
        <li class="menu__item menu__logout">
          <button class="menu__link" @click="handleLogout">
            <span><LogoutSVG /></span>
            <span>Выйти из аккаунта</span>
          </button>
        </li>

        <!-- Политика конфиденциальности -->
        <li class="menu__item menu__privacy">
          <a 
            :href="`${baseUrl}/upload/policy.pdf`" 
            class="menu__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Политика конфиденциальности
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from "vue";
import { RouterLink } from "vue-router";
import { fetchSharedCabinetGetData } from "@/utils/fetchSharedCabinetGetData";
import HomeSVG from "@/uikit/menu/HomeSVG.vue";
import UploadSVG from "@/uikit/menu/UploadSVG.vue";
import SettingSVG from "@/uikit/menu/SettingSVG.vue";
import PartnerSVG from "@/uikit/menu/PartnerSVG.vue";
import FaqSVG from "@/uikit/menu/FaqSVG.vue";
import ArticlesSVG from "@/uikit/menu/ArticlesSVG.vue";
import LogoutSVG from "@/uikit/menu/LogoutSVG.vue";
import PaySVG from "@/uikit/icon/PaySVG.vue";
import PersonalSVG from "@/uikit/icon/PersonalSVG.vue";
import Tr from "@/i18n/translation";

import LabelArtistsMenuBlock from "@/components/layout/LabelArtistsMenuBlock.vue";
import {
  syncLabelMenuFromGetDataResponse,
  registerLabelArtistsExternalRefresh,
  clearStoredLabelReturnUserId,
  refreshLabelArtists,
} from "@/composables/labelArtistsMenu";

let unregisterLabelArtistsRefresh: (() => void) | null = null;

// Типы для данных пользователя
interface UserData {
  name: string;
  email: string;
  balance: number;
  /** profile.currencySymbol из getData (₽ / $) */
  currencySymbol: string;
  avatar: string;
  login: string;
}

interface StoredData {
  userData: UserData;
  logoutUrl: string;
  timestamp: number;
}

// Ключ для localStorage
const STORAGE_KEY = 'menu_user_data';

// Функция для сохранения в localStorage
const saveToStorage = (data: StoredData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Ошибка сохранения в localStorage:', e);
  }
};

// Функция для загрузки из localStorage
const loadFromStorage = (): StoredData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Ошибка загрузки из localStorage:', e);
  }
  return null;
};

// Загружаем сохраненные данные
const savedData = loadFromStorage();

// Данные пользователя - берем из localStorage или используем начальные
const userData = ref<UserData>(
  savedData?.userData || {
    name: 'Загрузка...',
    email: 'Загрузка...',
    balance: 0,
    currencySymbol: '₽',
    avatar: '',
    login: ''
  }
);

if (savedData?.userData && savedData.userData.currencySymbol == null) {
  userData.value.currencySymbol = '₽';
}

// Ссылка для выхода
const logoutUrl = ref(savedData?.logoutUrl || '');

// Таймер для обновления данных
let updateTimer: number | null = null;

// Получаем базовый URL из текущего окна
const baseUrl = window.location.origin;

// Функция для загрузки данных с сервера (prefetched — после смены сессии без лишнего запроса)
const fetchUserData = async (prefetched?: Record<string, unknown>) => {
  try {
    const response = prefetched
      ? { data: prefetched }
      : await fetchSharedCabinetGetData();

    if (response.data) {
      // Данные пользователя
      const newUserData: UserData = {
        name: 'Пользователь',
        email: 'email@example.com',
        balance: 0,
        currencySymbol: '₽',
        avatar: '',
        login: ''
      };
      
      if (response.data.user) {
        newUserData.name = response.data.user.name || response.data.user.login || 'Пользователь';
        newUserData.email = response.data.user.email || 'email@example.com';
        newUserData.login = response.data.user.login || '';

        if (response.data.user.personalPhoto) {
          newUserData.avatar = response.data.user.personalPhoto;
        }
      }

      if (response.data.profile) {
        const prof = response.data.profile as {
          balance?: number;
          region?: string;
          currencySymbol?: string;
        };
        newUserData.balance = prof.balance || 0;
        newUserData.currencySymbol =
          (prof.currencySymbol as string) ||
          (prof.region === 'Russia' ? '₽' : '$');
      }

      syncLabelMenuFromGetDataResponse(
        response.data as Record<string, unknown>
      );

      const newLogoutUrl = response.data.unauth || '';

      userData.value = newUserData;
      logoutUrl.value = newLogoutUrl;
      saveToStorage({
        userData: newUserData,
        logoutUrl: newLogoutUrl,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных в Menu:', error);
  }
};

// Функция для обновления баланса
const updateBalance = (newBalance: number) => {
  if (userData.value) {
    userData.value.balance = newBalance;
    
    // Обновляем в localStorage
    const currentData = loadFromStorage();
    if (currentData) {
      currentData.userData.balance = newBalance;
      currentData.timestamp = Date.now();
      saveToStorage(currentData);
    }
  }
};

// Функция для принудительного обновления всех данных
const refreshUserData = async () => {
  await fetchUserData();
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

// Функция для выхода
const handleLogout = () => {
  if (logoutUrl.value) {
    // Очищаем localStorage при выходе
    localStorage.removeItem(STORAGE_KEY);
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
    const svg = parent.querySelector('svg');
    if (svg) {
      svg.style.display = 'block';
    }
  }
  if (userData.value) {
    userData.value.avatar = '';
    
    // Обновляем в localStorage
    const currentData = loadFromStorage();
    if (currentData) {
      currentData.userData.avatar = '';
      currentData.timestamp = Date.now();
      saveToStorage(currentData);
    }
  }
};

// Переход на старую версию
const goToOldVersion = () => {
  window.location.href = 'https://vauvision.com/auth/profile/';
};

// Проверяем, нужно ли обновить данные
const shouldUpdateData = (): boolean => {
  if (!savedData) return true;
  
  const fiveMinutes = 5 * 60 * 1000;
  const now = Date.now();
  
  // Если данные старше 5 минут - обновляем
  return (now - savedData.timestamp) > fiveMinutes;
};

// Периодическое обновление данных (каждые 5 минут)
const startPeriodicUpdate = () => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  
  updateTimer = window.setInterval(() => {
    fetchUserData();
  }, 5 * 60 * 1000); // 5 минут
};

// Экспортируем методы для использования в других компонентах
// @ts-ignore
window.__menuApi = {
  updateBalance,
  refreshUserData
};

onMounted(() => {
  unregisterLabelArtistsRefresh = registerLabelArtistsExternalRefresh(
    fetchUserData
  );
  refreshLabelArtists();

  if (shouldUpdateData()) {
    fetchUserData();
  }

  startPeriodicUpdate();
});

onUnmounted(() => {
  unregisterLabelArtistsRefresh?.();
  unregisterLabelArtistsRefresh = null;
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
});
</script>

<style lang="scss" scoped>
.menu__block {
  display: flex;
  width: 319px;
  height: 100vh;
  max-height: calc(100vh - 80px);
  padding: 60px 0 20px;
  position: fixed;
  top: 80px;
  left: calc(50% - ((1920px - 160px)/2) + 140px);
  z-index: 2;
  border-right: 1px solid var(--border);
  background-color: var(--bg);
  transform: translateX(-50%);

  &::after {
    content: "";
    height: 100vh;
    width: calc(100vw + 320px);
    position: absolute;
    left: -100vw;
    top: 0;
    z-index: 1;
    background-color: var(--bg);

    @media (max-width: 1919px) {
      width: calc(100vw + 230px);
    }
  }

  @media (max-width: 1919px) {
    left: 20px;
    transform: none;
    max-width: 250px;
    width: 100%;
  }

  @media (max-width: 1439px) {
    display: none;
  }

  @media (max-width: 1023px) {
    left: 15px;
  }
}

.menu__scroll {
  display: flex;
  width: 100%;
  height: 100vh;
  max-height: calc(100vh - 160px);
  flex-direction: column;
  position: relative;
  z-index: 2;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    display: none;
    width: 0px;
  }

  &::-webkit-scrollbar-thumb {
    display: none;
    width: 0px;
  }
}

.menu__back {
  content: "";
  width: 1920px;
  height: 100vh;
  position: fixed;
  left: calc(50% - 1920px + 80px);
  top: 0;
  z-index: 1;
  background-color: var(--bg);
  transform: translateX(-50%);

  @media (max-width: 1439px) {
    display: none;
  }
}

/* Стили для блока个人信息 */
.menu__personal {
  display: flex;
  padding: 0 20px 20px 20px;
  align-items: center;
  gap: 15px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 15px;
}

.menu__personal_logo {
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
  flex-shrink: 0;

  svg {
    width: 32px;
    height: 32px;
    opacity: 0.8;
    display: block;
  }
}

.menu__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.menu__personal_info {
  flex: 1;
  min-width: 0;
}

.menu__personal_name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 5px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu__personal_mail {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Кнопка баланса */
.menu__balance {
  padding: 0 20px 15px 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 15px;
}

.menu__balance_button {
  display: flex;
  width: 100%;
  padding: 12px 15px;
  align-items: center;
  gap: 10px;
  color: var(--text);
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: 30px;
  transition: border-color 0.15s linear;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    border-color: var(--text);
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* Основной список навигации */
.menu__list {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 0;
  padding: 0;
}

.menu__item {
  list-style: none;
}

.menu__logout {
  border-top: 1px solid var(--border);
  margin-top: 10px;
  padding-top: 10px;

  .menu__link {
    color: var(--text);

    &:hover {
      color: var(--color);
      background-color: var(--bg-color);
    }
  }
}

.menu__privacy {
  border-top: 1px solid var(--border);
  margin-top: 10px;
  padding-top: 10px;
}

.menu__link {
  display: flex;
  width: 100%;
  padding: 14px 30px;
  align-items: center;
  gap: 12px;
  position: relative;
  color: var(--text);
  background-color: var(--bg);
  transition: color 0.15s linear, background-color 0.15s linear;
  border: none;
  cursor: pointer;
  font-size: 14px;
  text-align: left;

  &::after {
    content: "";
    width: 3px;
    height: 100%;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    background-color: var(--color);
    opacity: 0;
    transition: opacity 0.15s linear;
  }

  &.router-link-exact-active,
  &:hover {
    color: var(--text);
    background-color: var(--bg-color);
  }

  &.router-link-exact-active::after {
    opacity: 1;
  }

  svg {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
  }

  span:last-child {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>