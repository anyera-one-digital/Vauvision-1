<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import { RouterLink } from "vue-router";
import Tr from "@/i18n/translation";
import FaqSVG from "@/uikit/menu/FaqSVG.vue";
import LinkSVG from "@/uikit/icon/LinkSVG.vue";
import { sendRequest } from "@/utils/api";
import { ElMessage } from "element-plus";

// Форма обратной связи (задача #4)
const feedback = reactive({ type: "problem", message: "" });
const isFeedbackSending = ref(false);

const submitFeedback = async () => {
  if (feedback.message.trim().length < 5) {
    ElMessage.warning("Напишите сообщение (минимум 5 символов)");
    return;
  }
  isFeedbackSending.value = true;
  try {
    await sendRequest("post", "/ajax_vue/ajax/profile/feedback.php", {
      type: feedback.type,
      message: feedback.message.trim(),
    });
    ElMessage.success("Спасибо! Ваше сообщение отправлено — мы ответим на почту.");
    feedback.message = "";
  } catch (error: any) {
    const message = error?.response?.data?.message;
    ElMessage.error(message || "Не удалось отправить. Напишите нам в Telegram: @vauvision_bot");
  } finally {
    isFeedbackSending.value = false;
  }
};

const loading = ref<boolean>(false);
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

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <Header />
  <section v-if="loading === true" class="loading">
    <div v-loading="loading" :element-loading-svg="loadingSvg" class="loading__svg" element-loading-svg-view-box="-10, -10, 50, 50" style="width: 100%"></div>
  </section>
  <section v-else class="support">
    <div class="container support__container">
      <Menu />
      <div class="support__block">
        <!-- Заголовок страницы -->
        <div class="support__header">
          <h1 class="support__title">Связь с поддержкой</h1>
          <p class="support__subtitle">Выберите удобный способ связи, и мы поможем решить ваш вопрос</p>
        </div>

        <!-- Основной контент -->
        <div class="support__content">
          <!-- Блок с контактами -->
          <div class="support__contacts">
            <div class="support__contacts_grid">
              <!-- VK -->
              <a
                href="https://vk.com/vauvisionlabel"
                target="_blank"
                rel="noopener noreferrer"
                class="support__contact_card support__contact_card--vk"
              >
                <div class="support__contact_icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 3C12.402 3 3 12.402 3 24C3 35.598 12.402 45 24 45C35.598 45 45 35.598 45 24C45 12.402 35.598 3 24 3Z" fill="#4A76A8"/>
                    <path d="M25.332 32.25C17.796 32.25 13.443 27.141 13.248 18H18.96C19.101 24.75 21.93 27.917 24.162 28.373V18H29.649V23.518C32.054 23.287 34.176 20.818 34.941 18H40.428C39.831 21.969 37.455 24.938 35.772 25.983C37.455 26.945 40.149 29.373 41.094 32.25H35.574C34.833 29.775 32.823 27.852 29.649 27.585V32.25H25.332Z" fill="white"/>
                  </svg>
                </div>
                <div class="support__contact_info">
                  <h3 class="support__contact_title">Группа в VK</h3>
                  <p class="support__contact_desc">Подпишитесь на новости и задавайте вопросы в сообщениях группы</p>
                </div>
                <div class="support__contact_arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </a>

              <!-- Telegram -->
              <a
                href="https://t.me/vauvision_bot"
                target="_blank"
                rel="noopener noreferrer"
                class="support__contact_card support__contact_card--telegram"
              >
                <div class="support__contact_icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="21" fill="#27A6E8"/>
                    <path d="M34.479 15.312L30.606 33.306C30.606 33.306 30.033 34.73 28.52 34.079L20.1 27.597L17.1 26.097L11.1 23.597C11.1 23.597 10.2 23.197 10.2 22.496C10.2 21.797 11.4 21.397 11.4 21.397L32.4 13.947C32.4 13.947 34.479 12.947 34.479 15.312Z" fill="white"/>
                    <path d="M20.1 33.597L17.1 30.597L23.1 26.097" fill="white"/>
                  </svg>
                </div>
                <div class="support__contact_info">
                  <h3 class="support__contact_title">Telegram bot</h3>
                  <p class="support__contact_desc">Быстрая связь через нашего бота в Telegram</p>
                </div>
                <div class="support__contact_arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </a>
            </div>

            <!-- Дополнительная информация -->
            <div class="support__info">
              <div class="support__info_icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="support__info_text">
                <h4 class="support__info_title">Время ответа</h4>
                <p class="support__info_desc">Пожалуйста, напишите ваш вопрос максимально подробно в свободной форме, мы ответим вам как можно скорее!</p>
              </div>
            </div>
          </div>

          <!-- Блок с FAQ -->
          <div class="support__faq">
            <div class="support__faq_header">
              <h2 class="support__faq_title">Часто задаваемые вопросы</h2>
              <RouterLink :to="Tr.i18nRoute({ name: 'faq' })" class="support__faq_all button">
                Смотреть все FAQ
              </RouterLink>
            </div>

            <div class="support__faq_grid">
              <RouterLink :to="Tr.i18nRoute({ name: 'faq' })" class="support__faq_card">
                <div class="support__faq_card_icon">
                  <FaqSVG />
                </div>
                <div class="support__faq_card_content">
                  <h4 class="support__faq_card_title">Как выложить релиз?</h4>
                  <p class="support__faq_card_desc">Пошаговая инструкция по загрузке релиза на платформу</p>
                </div>
              </RouterLink>

              <RouterLink :to="Tr.i18nRoute({ name: 'faq' })" class="support__faq_card">
                <div class="support__faq_card_icon">
                  <FaqSVG />
                </div>
                <div class="support__faq_card_content">
                  <h4 class="support__faq_card_title">Как получить выплату?</h4>
                  <p class="support__faq_card_desc">Условия и порядок вывода средств с баланса</p>
                </div>
              </RouterLink>

              <RouterLink :to="Tr.i18nRoute({ name: 'faq' })" class="support__faq_card">
                <div class="support__faq_card_icon">
                  <FaqSVG />
                </div>
                <div class="support__faq_card_content">
                  <h4 class="support__faq_card_title">Как стать партнером?</h4>
                  <p class="support__faq_card_desc">Условия партнерской программы и привлечения рефералов</p>
                </div>
              </RouterLink>

              <RouterLink :to="Tr.i18nRoute({ name: 'faq' })" class="support__faq_card">
                <div class="support__faq_card_icon">
                  <FaqSVG />
                </div>
                <div class="support__faq_card_content">
                  <h4 class="support__faq_card_title">Как скачать отчёт?</h4>
                  <p class="support__faq_card_desc">Инструкция по скачиванию квартальных отчётов</p>
                </div>
              </RouterLink>
            </div>
          </div>

          <!-- Форма обратной связи (задача #4) -->
          <div class="support__feedback">
            <h2 class="support__links_title">Форма обратной связи</h2>
            <p class="support__feedback_desc">
              Расскажите о проблеме или предложите идею — сообщение попадёт напрямую команде VAUVISION.
            </p>
            <div class="support__feedback_form">
              <div class="support__feedback_types">
                <label class="support__feedback_type" :class="{ 'is-active': feedback.type === 'problem' }">
                  <input type="radio" value="problem" v-model="feedback.type" />
                  <span>Проблема</span>
                </label>
                <label class="support__feedback_type" :class="{ 'is-active': feedback.type === 'suggestion' }">
                  <input type="radio" value="suggestion" v-model="feedback.type" />
                  <span>Предложение</span>
                </label>
                <label class="support__feedback_type" :class="{ 'is-active': feedback.type === 'other' }">
                  <input type="radio" value="other" v-model="feedback.type" />
                  <span>Другое</span>
                </label>
              </div>
              <el-input
                v-model="feedback.message"
                type="textarea"
                :rows="5"
                maxlength="5000"
                show-word-limit
                placeholder="Опишите проблему или предложение…"
              />
              <button
                class="support__feedback_submit button__primary button"
                type="button"
                :disabled="isFeedbackSending"
                @click="submitFeedback"
              >
                <span v-if="!isFeedbackSending">Отправить</span>
                <span v-else>Отправка…</span>
              </button>
            </div>
          </div>

          <!-- Блок с полезными ссылками -->
          <div class="support__links">
            <h2 class="support__links_title">Полезные ссылки</h2>
            <div class="support__links_grid">
              <a href="/upload/policy.pdf" target="_blank" class="support__link_item">
                <LinkSVG />
                <span>Политика конфиденциальности</span>
              </a>
              <a href="/upload/terms.pdf" target="_blank" class="support__link_item">
                <LinkSVG />
                <span>Пользовательское соглашение</span>
              </a>
              <RouterLink :to="Tr.i18nRoute({ name: 'articles' })" class="support__link_item">
                <LinkSVG />
                <span>Статьи и новости</span>
              </RouterLink>
              <RouterLink :to="Tr.i18nRoute({ name: 'partner' })" class="support__link_item">
                <LinkSVG />
                <span>Партнерская программа</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.support {
  padding: 40px 0;

  @media (max-width: 1023px) {
    padding: 20px 0;
  }

  &__container {
    display: flex;
    gap: 20px;

    @media (max-width: 767px) {
      padding: 0;
    }
  }

  &__block {
    width: calc(100% - 320px);
    margin: 0 0 0 auto;
    background-color: var(--bg);
    // border: 1px solid var(--border);
    padding: 40px;

    @media (max-width: 1919px) {
      width: calc(100% - 230px);
    }

    @media (max-width: 1439px) {
      width: 100%;
    }


    @media (max-width: 1439px) {
      width: 100%;
    }

    @media (max-width: 1023px) {
      padding: 30px 20px;
    }

    @media (max-width: 767px) {
      padding: 20px 15px;
      border-left: none;
      border-right: none;
    }
  }

  &__header {
    margin-bottom: 40px;
    text-align: center;
  }

  &__title {
    font-size: 32px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 15px;
    text-transform: uppercase;

    @media (max-width: 1023px) {
      font-size: 28px;
    }

    @media (max-width: 767px) {
      font-size: 24px;
    }

    @media (max-width: 480px) {
      font-size: 20px;
    }
  }

  &__subtitle {
    font-size: 16px;
    color: var(--text-gray);
    max-width: 600px;
    margin: 0 auto;

    @media (max-width: 767px) {
      font-size: 14px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  &__contacts {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    padding: 30px;

    @media (max-width: 767px) {
      padding: 20px;
    }

    &_grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;

      @media (max-width: 1439px) {
        grid-template-columns: 1fr;
      }
    }
  }

  &__contact_card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 25px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    text-decoration: none;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      border-color: var(--color);

      .support__contact_arrow {
        transform: translateX(5px);
        color: var(--color);
      }
    }

    &--vk:hover {
      border-color: #4a76a8;

      .support__contact_arrow {
        color: #4a76a8;
      }
    }

    &--telegram:hover {
      border-color: #27a6e8;

      .support__contact_arrow {
        color: #27a6e8;
      }
    }

    @media (max-width: 767px) {
      flex-direction: column;
      text-align: center;
      padding: 20px;
    }
  }

  &__contact_icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
  }

  &__contact_info {
    flex: 1;

    @media (max-width: 767px) {
      text-align: center;
    }
  }

  &__contact_title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 5px;
  }

  &__contact_desc {
    font-size: 14px;
    color: var(--text-gray);
    line-height: 1.4;
  }

  &__contact_arrow {
    color: var(--text-gray);
    transition:
      transform 0.3s ease,
      color 0.3s ease;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;

    @media (max-width: 767px) {
      flex-direction: column;
      text-align: center;
    }

    &_icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background-color: var(--border);
      border-radius: 50%;
      color: var(--color);

      svg {
        width: 24px;
        height: 24px;
      }
    }

    &_text {
      flex: 1;
    }

    &_title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 5px;
    }

    &_desc {
      font-size: 14px;
      color: var(--text-gray);
      line-height: 1.5;
    }
  }

  &__faq {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    padding: 30px;

    &_header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 25px;

      @media (max-width: 767px) {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }
    }

    &_title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text);
      text-transform: uppercase;

      @media (max-width: 480px) {
        font-size: 20px;
      }
    }

    &_all {
      color: var(--color);
      text-transform: uppercase;
      font-size: 14px;
      font-weight: 500;

      &:hover {
        color: var(--text);
      }
    }

    &_grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;

      @media (max-width: 1023px) {
        grid-template-columns: 1fr;
      }
    }

    &_card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background-color: var(--bg);
      border: 1px solid var(--border);
      text-decoration: none;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--color);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      }

      @media (max-width: 767px) {
        flex-direction: column;
        text-align: center;
      }

      &_icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background-color: var(--border);
        border-radius: 50%;
        color: var(--color);

        svg {
          width: 20px;
          height: 20px;
        }
      }

      &_content {
        flex: 1;
      }

      &_title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 5px;
      }

      &_desc {
        font-size: 13px;
        color: var(--text-gray);
        line-height: 1.4;
      }
    }
  }

  &__links {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    padding: 30px;

    &_title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 25px;
      text-transform: uppercase;

      @media (max-width: 480px) {
        font-size: 20px;
      }
    }

    &_grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;

      @media (max-width: 1023px) {
        grid-template-columns: 1fr;
      }

      @media (max-width: 767px) {
        gap: 10px;
      }
    }
  }

  &__link_item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 20px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 14px;

    &:hover {
      border-color: var(--color);
      color: var(--color);
      transform: translateX(5px);
    }

    svg {
      width: 16px;
      height: 16px;
      color: var(--color);
    }

    @media (max-width: 767px) {
      padding: 12px 15px;
      font-size: 13px;
    }

    @media (max-width: 480px) {
      font-size: 12px;
    }
  }
}

/* Форма обратной связи (задача #4) */
.support__feedback {
  margin-top: 40px;
  padding: 30px;
  background-color: var(--bg);
  border: 1px solid var(--border);

  @media (max-width: 767px) {
    padding: 20px 15px;
  }
}

.support__feedback_desc {
  padding: 10px 0 20px;
  color: var(--text-secondary);
}

.support__feedback_form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.support__feedback_types {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.support__feedback_type {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 30px;
  cursor: pointer;
  font-size: 14px;
  transition: border-color 0.15s linear, color 0.15s linear;

  input {
    display: none;
  }

  &:hover {
    border-color: var(--text);
  }

  &.is-active {
    border-color: var(--color);
    color: var(--color);
    font-weight: 600;
  }
}

.support__feedback_submit {
  align-self: flex-start;
  padding: 12px 40px;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}
</style>
