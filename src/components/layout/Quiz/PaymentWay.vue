<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

const props = withDefaults(
  defineProps<{
    /** ID заказа Bitrix для POST на oplata.php (режим fetch USDT). */
    usdtOrderId?: number;
    /** Путь ajax-обработчика CryptoCloud из ответа order.php. */
    usdtOplataEndpoint?: string;
    /** Прямая ссылка на USDT, если нет usdtOrderId (обратная совместимость). */
    usdtPaymentUrl?: string;
    /** URL для «Оплатить картой»; если нет — событие pay-card */
    cardPaymentUrl?: string;
    /** Заголовок блока */
    title?: string;
    /** Подзаголовок */
    subtitle?: string;
  }>(),
  {
    title: 'Способы оплаты',
    subtitle: 'Выберите удобный способ оплаты',
    usdtOplataEndpoint: '/ajax_vue/ajax/oplata.php',
  },
);

const emit = defineEmits<{
  'pay-usdt': [];
  'pay-card': [];
}>();

const DEFAULT_OPLATA = '/ajax_vue/ajax/oplata.php';

const usdtLoading = ref(false);

function openCheckoutInNewTab(url: string): void {
  const safeUrl = url.trim();
  const payWin = window.open(safeUrl, '_blank');
  if (payWin) {
    try {
      payWin.opener = null;
    } catch {
      /* ignore */
    }
  } else {
    ElMessage.warning(
      'Браузер заблокировал новое окно. Открываем оплату в этой вкладке.',
    );
    window.location.href = safeUrl;
  }
}

async function fetchUsdtCheckout(): Promise<boolean> {
  const id = props.usdtOrderId;
  if (id === undefined || Number.isNaN(id)) {
    ElMessage.error('Не удалось получить номер заказа. Обновите страницу или обратитесь в поддержку.');
    return false;
  }
  const path = props.usdtOplataEndpoint?.trim() || DEFAULT_OPLATA;
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ORDER_ID: id,
        SYSTEM: 'CRYPTO',
      }),
    });

    let payload: { error?: number; message?: string };
    try {
      payload = await response.json();
    } catch {
      ElMessage.error('Сервер вернул неожиданный ответ при создании счёта USDT.');
      return false;
    }

    if (!response.ok || payload.error !== 0 || !payload.message?.trim()) {
      ElMessage.error(
        typeof payload.message === 'string' && payload.message.trim()
          ? payload.message
          : 'Не удалось создать счёт USDT.',
      );
      return false;
    }

    const redirectUrl = payload.message.trim();
    openCheckoutInNewTab(redirectUrl);
    return true;
  } catch {
    ElMessage.error('Ошибка сети. Проверьте подключение и попробуйте снова.');
    return false;
  }
}

const openUsdt = async () => {
  if (props.usdtOrderId !== undefined && !Number.isNaN(props.usdtOrderId)) {
    if (usdtLoading.value) return;
    usdtLoading.value = true;
    await fetchUsdtCheckout();
    usdtLoading.value = false;
    return;
  }
  if (props.usdtPaymentUrl) {
    openCheckoutInNewTab(props.usdtPaymentUrl);
    return;
  }
  emit('pay-usdt');
};

const openCard = () => {
  if (usdtLoading.value) return;
  if (props.cardPaymentUrl) {
    openCheckoutInNewTab(props.cardPaymentUrl);
    return;
  }
  emit('pay-card');
};
</script>

<template>
  <div class="payment-way">
    <div class="payment-way__panel">
      <h1 class="payment-way__title">{{ title }}</h1>
      <p class="payment-way__subtitle">{{ subtitle }}</p>
      <div class="payment-way__actions">
        <button
          type="button"
          class="button button__black payment-way__btn"
          :disabled="usdtLoading"
          @click="openUsdt"
        >
          <span>{{ usdtLoading ? 'Подождите…' : 'Оплатить в USDT' }}</span>
        </button>
        <button
          type="button"
          class="button button__black payment-way__btn"
          :disabled="usdtLoading"
          @click="openCard"
        >
          <span>Оплатить картой</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.payment-way {
  box-sizing: border-box;
  width: 100%;
  min-height: min(70vh, 640px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background-color: var(--bg-gray, #f4f4f4);

  &__panel {
    width: 100%;
    margin: 0 auto;
    padding: 56px 48px 64px;
    text-align: center;
    background-color: var(--bg, #fff);
    border: 1px solid var(--border, #e5e5e5);
  }

  &__title {
    margin: 0 0 12px;
    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }

  &__subtitle {
    margin: 0 0 40px;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-gray);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px 20px;
  }

  &__btn {
    min-width: min(280px, 100%);
    border-radius: 0;
    padding-top: 16px;
    padding-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.06em;

    :deep(span) {
      text-transform: uppercase;
    }

    &:disabled {
      opacity: 0.7;
      pointer-events: none;
    }
  }

  @media (max-width: 767px) {
    min-height: auto;
    padding: 24px 16px;

    &__panel {
      padding: 40px 24px 48px;
    }

    &__btn {
      width: 100%;
      min-width: 0;
    }
  }
}
</style>
