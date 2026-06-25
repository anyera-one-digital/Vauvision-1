<script lang="ts" setup>
import { RouterLink } from 'vue-router';
import Tr from '@/i18n/translation';

const props = withDefaults(
  defineProps<{
    /** Успешная или неуспешная оплата */
    status: 'success' | 'error';
    /** Текст при успехе (по умолчанию как в макете) */
    successMessage?: string;
    /** Текст при ошибке (по умолчанию как в макете) */
    errorMessage?: string;
    /** URL для кнопки «Оплатить в USDT»; если нет — сработает событие pay-usdt */
    usdtPaymentUrl?: string;
    /** URL для кнопки «Оплатить картой»; если нет — сработает событие pay-card */
    cardPaymentUrl?: string;
    /** Имя маршрута для ссылки «Напишите нам» */
    supportRouteName?: string;
    /** Внешняя ссылка вместо маршрута поддержки (если задана, имеет приоритет) */
    supportHref?: string;
  }>(),
  {
    successMessage:
      'Оплата прошла. Финансовые транзакции отражены на главной странице личного кабинета.',
    errorMessage:
      'Оплата не прошла. Повторите платёж через полчаса или попробуйте оплатить другим способом.',
    supportRouteName: 'support',
  }
);

const emit = defineEmits<{
  'pay-usdt': [];
  'pay-card': [];
}>();

const openUsdt = () => {
  if (props.usdtPaymentUrl) {
    window.location.href = props.usdtPaymentUrl;
    return;
  }
  emit('pay-usdt');
};

const openCard = () => {
  if (props.cardPaymentUrl) {
    window.location.href = props.cardPaymentUrl;
    return;
  }
  emit('pay-card');
};
</script>

<template>
  <div class="payment-status quiz__form payment-status_quiz">
    <h4 class="payment-status__title">Финал</h4>

    <div
      v-if="status === 'success'"
      class="payment-status__row payment-status__row_success"
    >
      <span class="payment-status__icon payment-status__icon_success" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="currentColor" />
          <path
            d="M7.5 12.5l2.8 2.8L16.5 9"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <p class="payment-status__text">{{ successMessage }}</p>
    </div>

    <div
      v-else
      class="payment-status__row payment-status__row_error"
    >
      <span class="payment-status__icon payment-status__icon_error" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="currentColor" />
          <path
            d="M8 8l8 8M16 8l-8 8"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <p class="payment-status__text">{{ errorMessage }}</p>
    </div>

    <div v-if="status === 'success'" class="payment-status__actions">
      <RouterLink
        class="button button__black payment-status__btn"
        :to="Tr.i18nRoute({ name: 'personal' })"
      >
        <span>На главную</span>
      </RouterLink>
    </div>

    <template v-else>
      <div class="payment-status__actions payment-status__actions_row">
        <button
          type="button"
          class="button button__black payment-status__btn"
          @click="openUsdt"
        >
          <span>Оплатить в USDT</span>
        </button>
        <button
          type="button"
          class="button button__black payment-status__btn"
          @click="openCard"
        >
          <span>Оплатить картой</span>
        </button>
      </div>
      <p class="payment-status__footer">
        <a
          v-if="supportHref"
          class="payment-status__footer-link"
          :href="supportHref"
          target="_blank"
          rel="noopener noreferrer"
        >Напишите нам</a>
        <RouterLink
          v-else
          class="payment-status__footer-link"
          :to="Tr.i18nRoute({ name: supportRouteName })"
        >Напишите нам</RouterLink>
        <span class="payment-status__footer-rest">, если проблему не удалось решить.</span>
      </p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.quiz__form {
  width: calc(100% - 330px);
  padding: 0 40px 0 60px;

  @media (max-width: 1439px) {
    width: 100%;
    padding: 0;
  }
}

.payment-status {
  &__title {
    margin-bottom: 20px;

    @media (max-width: 767px) {
      margin-bottom: 15px;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 58px;

    @media (max-width: 1439px) {
      margin-bottom: 50px;
    }

    @media (max-width: 767px) {
      margin-bottom: 30px;
      align-items: flex-start;
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    &_success {
      color: #22c55e;
    }

    &_error {
      color: #ab1115;
    }
  }

  &__text {
    margin: 0;
    font-size: 14px;
    line-height: 140%;
    color: #85858e;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 40px;
  }

  &__actions_row {
    gap: 15px;

    @media (max-width: 767px) {
      flex-direction: column;
      align-items: stretch;
      margin-bottom: 20px;
    }
  }

  &__btn {
    @media (max-width: 767px) {
      width: 100%;
      justify-content: flex-start;
    }
  }

  &__footer {
    margin: 0;
    font-size: 14px;
    line-height: 140%;
    color: #85858e;
  }

  &__footer-link {
    color: #ab1115;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition:
      border-color 0.15s linear,
      color 0.15s linear;

    &:hover {
      border-bottom-color: currentColor;
    }
  }
}
</style>
