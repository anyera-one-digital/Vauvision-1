<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import ButtonSVG from "@/uikit/icon/ButtonSVG.vue";
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';

const isLoading = ref<boolean>(false);
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

// Интерфейс для статьи из API
interface Article {
  img: string;
  name: string;
  url: string;
}

// Данные из API
const articles = ref<Article[]>([]);

// Пагинация для статей
const articlesPerPage = ref<number>(9); // Показываем по 9 статей на странице
const currentArticlesPage = ref<number>(1);

// Вычисляемые свойства для статей
const totalArticlesPages = computed(() => {
  return Math.ceil(articles.value.length / articlesPerPage.value);
});

const paginatedArticles = computed(() => {
  const start = (currentArticlesPage.value - 1) * articlesPerPage.value;
  const end = start + articlesPerPage.value;
  return articles.value.slice(start, end);
});

const showArticlesPagination = computed(() => {
  return articles.value.length > articlesPerPage.value;
});

// Методы для пагинации статей
const nextArticlesPage = () => {
  if (currentArticlesPage.value < totalArticlesPages.value) {
    currentArticlesPage.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevArticlesPage = () => {
  if (currentArticlesPage.value > 1) {
    currentArticlesPage.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Получаем базовый URL из текущего окна
const API_BASE_URL = window.location.origin;

// Функция для формирования полного URL
const getFullUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Загрузка данных
const fetchData = async () => {
  isLoading.value = true;
  try {
    const response = await fetchSharedCabinetGetData();

    if (response.data && response.data.articles) {
      articles.value = response.data.articles || [];
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
  } finally {
    isLoading.value = false;
  }
};

// Обработка ошибок загрузки изображений
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  // Добавляем плейсхолдер
  const parent = img.parentElement;
  if (parent) {
    const placeholder = document.createElement('div');
    placeholder.className = 'articles__image_placeholder';
    parent.appendChild(placeholder);
  }
};

// Загружаем данные при монтировании
onMounted(() => {
  fetchData();
});
</script>

<template>
<Header></Header>
<section class="personal">
  <div class="container personal__container">
    <Menu />
    <div v-if="isLoading === true" class="personal__block">
      <div class="loading__container">
        <div 
          v-loading="isLoading" 
          :element-loading-svg="loadingSvg" 
          class="loading__svg" 
          element-loading-svg-view-box="-10, -10, 50, 50"
        ></div>
      </div>
    </div>
    <div v-else class="personal__block">
      <div class="articles__top">
        <h3 class="articles__head">Статьи</h3>
        <p class="articles__desc">Полезные статьи о музыке, продвижении и работе с VAUVISION</p>
      </div>
      
      <div class="articles__content">
        
        <!-- Нет статей -->
        <div v-if="articles.length === 0" class="articles__empty">
          Статьи временно недоступны
        </div>
        
        <!-- Список статей -->
        <template v-else>
          <ul class="articles__list">
            <li 
              class="articles__item" 
              v-for="article in paginatedArticles" 
              :key="article.url"
            >
              <a :href="article.url" class="articles__link">
                <div class="articles__image">
                  <img 
                    :src="getFullUrl(article.img)" 
                    :alt="article.name"
                    @error="handleImageError"
                  >
                </div>
                <div class="articles__info">
                  <h5 class="articles__title">{{ article.name }}</h5>
                  <span class="articles__read">Читать статью →</span>
                </div>
              </a>
            </li>
          </ul>
          
          <!-- Пагинация -->
          <div class="pagination__buttons" v-if="showArticlesPagination">
            <button 
              class="pagination__buttons_button button button__pagination button__pagination_prev"
              @click="prevArticlesPage"
              :disabled="currentArticlesPage === 1"
            >
              <span><ButtonSVG /></span>
              <span>{{ $t('button.prev') }}</span>
            </button>
            
            <div class="pagination__buttons_info">
              {{ currentArticlesPage }}/{{ totalArticlesPages }}
            </div>
            
            <button 
              class="pagination__buttons_button button button__pagination button__pagination_next"
              @click="nextArticlesPage"
              :disabled="currentArticlesPage === totalArticlesPages"
            >
              <span>{{ $t('button.next') }}</span>
              <span><ButtonSVG /></span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</section>
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
  &__block {
    @media (max-width: 1919px) {
      width: calc(100% - 230px);
    }

    @media (max-width: 1439px) {
      width: 100%;
    }
  }
}

.articles {
  &__top {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 0 0 30px;

    @media (max-width: 767px) {
      padding: 0 0 20px;
    }

    @media (max-width: 480px) {
      padding: 0 0 15px;
    }
  }

  &__head {
    text-transform: uppercase;
    font-size: 32px;

    @media (max-width: 767px) {
      font-size: 24px;
    }

    @media (max-width: 480px) {
      font-size: 20px;
    }
  }

  &__desc {
    color: var(--text-gray);
    max-width: 600px;
  }

  &__loading,
  &__empty {
    padding: 60px;
    text-align: center;
    color: var(--text-gray);
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 40px;

    @media (max-width: 1439px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 1023px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      gap: 15px;
    }
  }

  &__item {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    transition:
      transform 0.2s,
      box-shadow 0.2s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);

      .articles__image img {
        transform: scale(1.05);
      }
    }
  }

  &__link {
    display: flex;
    flex-direction: column;
    height: 100%;
    text-decoration: none;
    color: inherit;
  }

  &__image {
    position: relative;
    width: 100%;
    padding-top: 60%;
    background-color: var(--border);
    overflow: hidden;

    img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    &_placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--border);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='2' width='20' height='20' rx='2.18' ry='2.18'%3E%3C/rect%3E%3Cline x1='23' y1='19' x2='1' y2='19'%3E%3C/line%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 40px;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    flex: 1;

    @media (max-width: 767px) {
      padding: 15px;
    }
  }

  &__title {
    font-size: 16px;
    line-height: 1.4;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 767px) {
      font-size: 14px;
    }
  }

  &__read {
    color: var(--color);
    font-size: 14px;
    text-transform: uppercase;
    margin-top: auto;

    &:hover {
      text-decoration: underline;
    }
  }
}

.pagination__buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;

  @media (max-width: 767px) {
    gap: 10px;
  }

  &_button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background-color: var(--color);
      color: var(--white);
      border-color: var(--color);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    svg {
      width: 16px;
      height: 16px;
    }

    @media (max-width: 767px) {
      padding: 8px 12px;

      span:last-child {
        display: none;
      }
    }
  }

  &_info {
    font-size: 16px;
    font-weight: 500;

    @media (max-width: 480px) {
      font-size: 14px;
    }
  }
}
</style>