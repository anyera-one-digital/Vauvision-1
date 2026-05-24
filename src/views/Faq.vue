<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { fetchSharedCabinetGetData } from '@/utils/fetchSharedCabinetGetData';
import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import ArrowSVG from "@/uikit/icon/ArrowSVG.vue";
import Tr from "@/i18n/translation";

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

interface FAQItem {
  id: number | string;
  question: string;
  answer: string;
  isOpen: boolean;
}

const faqItems = ref<FAQItem[]>([]);
const activeItemId = ref<number | string | null>(null);
const contentRefs = ref<HTMLElement[]>([]);
const error = ref<string | null>(null);

const toggleAccordion = (id: number | string) => {
  if (activeItemId.value === id) {
    // Закрываем текущий элемент
    activeItemId.value = null;
    faqItems.value = faqItems.value.map(item => ({
      ...item,
      isOpen: item.id === id ? false : item.isOpen
    }));
  } else {
    // Закрываем предыдущий и открываем новый
    const prevActive = activeItemId.value;
    activeItemId.value = id;
    
    faqItems.value = faqItems.value.map(item => ({
      ...item,
      isOpen: item.id === id ? true : false
    }));

    // Анимация закрытия предыдущего элемента
    if (prevActive !== null) {
      const prevIndex = faqItems.value.findIndex(item => item.id === prevActive);
      if (prevIndex !== -1 && contentRefs.value[prevIndex]) {
        closeAccordion(contentRefs.value[prevIndex]);
      }
    }

    // Анимация открытия нового элемента
    const currentIndex = faqItems.value.findIndex(item => item.id === id);
    if (currentIndex !== -1 && contentRefs.value[currentIndex]) {
      openAccordion(contentRefs.value[currentIndex]);
    }
  }
};

const openAccordion = (element: HTMLElement) => {
  element.style.maxHeight = element.scrollHeight + 'px';
  element.style.opacity = '1';
};

const closeAccordion = (element: HTMLElement) => {
  element.style.maxHeight = '0px';
  element.style.opacity = '0';
};

const setContentRef = (el: HTMLElement, index: number) => {
  contentRefs.value[index] = el;
  
  // Инициализация состояний
  if (el && faqItems.value[index]) {
    const item = faqItems.value[index];
    if (item.isOpen) {
      el.style.maxHeight = el.scrollHeight + 'px';
      el.style.opacity = '1';
    } else {
      el.style.maxHeight = '0px';
      el.style.opacity = '0';
    }
  }
};

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await fetchSharedCabinetGetData();

    // Проверяем, есть ли данные FAQ в ответе
    if (response.data && response.data.education && response.data.education.faq) {
      const apiFaq = response.data.education.faq;
      
      // Преобразуем данные из API в формат для компонента
      faqItems.value = apiFaq.map((item: any, index: number) => ({
        id: item.ID || index + 1,
        question: item.NAME || 'Вопрос',
        answer: item.ANSWER || 'Ответ отсутствует',
        isOpen: false
      }));
    } else {
      // Если данных нет, используем заглушку или показываем сообщение
      faqItems.value = [];
      console.warn('FAQ данные не найдены в ответе API');
    }
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err);
    error.value = 'Не удалось загрузить данные. Пожалуйста, попробуйте позже.';
    
    // Опционально: показать заглушку при ошибке
    faqItems.value = [
      {
        id: 1,
        question: 'Сервис временно недоступен',
        answer: 'Пожалуйста, обновите страницу или попробуйте позже.',
        isOpen: false
      }
    ];
  } finally {
    isLoading.value = false;
  }
};

// Инициализация при монтировании
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
      <div class="faq__content">
        <div class="faq__top">
          <h3 class="faq__head">ответы на ваши вопросы</h3>
          <p class="faq__desc">
            Не нашли ответ на вопрос? 
            <RouterLink class="faq__support-link" :to="Tr.i18nRoute({ name: 'support' })">
              <span><FaqSVG /></span>
              <span>Написать в поддержку</span>
            </RouterLink>
          </p>
        </div>
        
        <!-- Сообщение об ошибке -->
        <div v-if="error" class="faq__error">
          <p>{{ error }}</p>
          <button @click="fetchData" class="faq__retry-btn">Повторить попытку</button>
        </div>
        
        <!-- Список вопросов -->
        <ul v-else-if="faqItems.length > 0" class="faq__list">
          <li 
            v-for="(item, index) in faqItems" 
            :key="item.id" 
            class="faq__item"
            :class="{ 'active': item.isOpen }"
          >
            <button 
              class="faq__button"
              @click="toggleAccordion(item.id)"
              :aria-expanded="item.isOpen"
              :aria-controls="`faq-content-${item.id}`"
            >
              <h5 class="faq__heading">{{ item.question }}</h5>
              <div class="faq__arrow" :class="{ 'active': item.isOpen }">
                <ArrowSVG />
              </div>
            </button>
            <div 
              :id="`faq-content-${item.id}`"
              class="faq__info"
              :ref="(el) => setContentRef(el as HTMLElement, index)"
              role="region"
              :aria-labelledby="`faq-heading-${item.id}`"
            >
              <!-- Используем v-html для отображения HTML из API -->
              <div 
                class="faq__description"
                v-html="item.answer"
              ></div>
            </div>
          </li>
        </ul>
        
        <!-- Сообщение если нет вопросов -->
        <div v-else class="faq__empty">
          <p>Вопросы временно отсутствуют</p>
        </div>
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

.faq {
  &__content {
    display: flex;
    width: calc(100% - 440px);
    flex-direction: column;
    gap: 20px;

    @media (max-width: 1919px) {
      width: calc(100% - 340px);
      gap: 30px;
    }

    @media (max-width: 1439px) {
      width: 100%;
    }

    @media (max-width: 767px) {
      gap: 15px;
    }
  }

  &__top {
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 1439px) {
      gap: 15px;
    }
  }

  &__head {
    text-transform: uppercase;
  }

  &__support-link {
    color: var(--primary);
    text-decoration: underline;
    transition: opacity 0.3s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__item {
    background-color: var(--bg);
    border: 1px solid var(--border);

    &.active .faq__button {
      padding: 40px 40px 20px;

      @media (max-width: 1919px) {
        padding: 30px 30px 15px;
      }

      @media (max-width: 767px) {
        padding: 20px 20px 15px;
      }
    }
  }

  &__button {
    display: flex;
    width: 100%;
    padding: 40px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    text-align: left;
    transition: padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    @media (max-width: 1919px) {
      padding: 30px;
    }

    @media (max-width: 767px) {
      padding: 20px;
    }
  }

  &__arrow {
    display: flex;
    width: 24px;
    height: 24px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;

    svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    &.active {
      transform: rotate(180deg);
    }
  }

  &__info {
    max-height: 0;
    opacity: 0;
    transition:
      max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease 0.1s;
    overflow: hidden;
  }

  &__description {
    max-width: 780px;
    padding: 0 40px 40px;

    @media (max-width: 1919px) {
      padding: 0 30px 30px;
    }

    @media (max-width: 767px) {
      padding: 0 20px 20px;
    }

    :deep(p) {
      margin-bottom: 15px;
    }

    :deep(p:last-child) {
      margin-bottom: 0;
    }

    :deep(a) {
      color: var(--primary);
      text-decoration: underline;
    }

    :deep(b),
    :deep(strong) {
      font-weight: 600;
    }
  }

  &__error,
  &__empty {
    padding: 60px 40px;
    text-align: center;
    background-color: var(--bg);
    border: 1px solid var(--border);

    @media (max-width: 767px) {
      padding: 40px 20px;
    }
  }

  &__retry-btn {
    margin-top: 20px;
    padding: 10px 20px;
    background-color: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    transition: opacity 0.3s ease;

    &:hover {
      opacity: 0.8;
    }
  }
}

@media (max-width: 1919px) {
  .faq__flex {
    gap: 20px;
  }
}
</style>