<script lang="ts" setup>
import { ref, computed, onMounted, watch } from "vue";
import { sendRequest } from "@/utils/api";
import { ElInputNumber, ElMessage } from "element-plus";
import { openDB } from "idb";
import Tr from "@/i18n/translation";
import BackSVG from "@/uikit/icon/BackSVG.vue";
import FaqSVG from "@/uikit/icon/FaqSVG.vue";

const emit = defineEmits<{
  "go-back": [];
  "go-next": [];
}>();

// Интерфейсы для данных
interface Product {
  id: string;
  name: string;
  prices: {
    rub?: string;
    usd?: string;
    eur?: string;
    four?: string;
    four_usd?: string;
    do?: string | null;
    do_eur?: string | null;
    do_usd?: string | null;
  };
  properties?: {
    name_en?: string;
    desc_en?: any;
  };
  basket_quantity?: number;
  basket_item_id?: string | null;
}

interface BasketItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  base_price: string;
  total_price: number;
  basket_item_id: string | null;
}

interface UpdateBasketResponse {
  data: {
    items: BasketItem[];
    total: number;
    currency_symbol: string;
    region: string;
    counts: {
      single: number;
      album: number;
      clip: number;
      card: number;
    };
    sums: {
      single: number;
      album: number;
      clip: number;
      card: number;
    };
  };
}

// Константы для IndexedDB
const DB_NAME = "quizDB";
const DB_VERSION = 2;
const STORE_NAME = "quizState";
const STORAGE_KEY = "quiz1_state";

// Состояние загрузки
const isLoading = ref(true);
const isInitialLoad = ref(true);
const quizDB = ref<any>(null);
const dbInitialized = ref(false);

// Локальные состояния
const singleCountLocal = ref(0);
const albumCountLocal = ref(0);
const clipCountLocal = ref(0);
const cardCountLocal = ref(0);

// Состояние попапа
const isPopupVisible = ref(false);

// Состояние для активного тултипа
const activeTooltip = ref<string | null>(null);

// Сохраняем предыдущие значения для отслеживания реальных изменений
const previousCounts = ref({
  single: 0,
  album: 0,
  clip: 0,
  card: 0,
});

// Данные с сервера
const products = ref<Product[]>([]);
const basketItems = ref<BasketItem[]>([]);
const userRegion = ref<string>("");
const currencySymbol = ref<string>("₽");
const totalSum = ref<number>(0);

// Флаг для предотвращения циклических обновлений
const isUpdatingFromServer = ref(false);

// Инициализация IndexedDB
const initDB = async () => {
  try {
    console.log("Quiz1: Initializing IndexedDB...");

    quizDB.value = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(
          `Quiz1: Upgrading DB from version ${oldVersion} to ${newVersion}`,
        );

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
          console.log("Quiz1: Created quizState store");
        }
      },
    });

    dbInitialized.value = true;
    console.log("Quiz1: IndexedDB initialized successfully");
  } catch (error) {
    console.error("Quiz1: Error initializing IndexedDB:", error);
    dbInitialized.value = false;
  }
};

// Безопасное выполнение операций с БД
const safeDBOperation = async <T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  if (!dbInitialized.value || !quizDB.value) {
    console.log("Quiz1: DB not initialized");
    return fallback;
  }

  try {
    if (
      !quizDB.value.objectStoreNames ||
      !quizDB.value.objectStoreNames.contains(STORE_NAME)
    ) {
      console.log(`Quiz1: Store ${STORE_NAME} not found`);
      return fallback;
    }

    return await operation();
  } catch (error) {
    console.error("Quiz1: Error in DB operation:", error);
    return fallback;
  }
};

// Сохранение состояния в IndexedDB
const saveStateToDB = async () => {
  await safeDBOperation(async () => {
    const stateToSave = {
      id: STORAGE_KEY,
      singleCount: singleCountLocal.value,
      albumCount: albumCountLocal.value,
      clipCount: clipCountLocal.value,
      cardCount: cardCountLocal.value,
      timestamp: Date.now(),
    };

    await quizDB.value.put(STORE_NAME, stateToSave);
    console.log("Quiz1: Saved to IndexedDB:", stateToSave);

    // Отправляем событие об обновлении данных для QuizMenu
    window.dispatchEvent(new CustomEvent("quiz-data-updated"));
  }, null);
};

// Загрузка состояния из IndexedDB
const loadStateFromDB = async () => {
  await safeDBOperation(async () => {
    const savedState = await quizDB.value.get(STORE_NAME, STORAGE_KEY);
    if (savedState) {
      console.log("Quiz1: Loading from IndexedDB:", savedState);

      singleCountLocal.value = savedState.singleCount || 0;
      albumCountLocal.value = savedState.albumCount || 0;
      clipCountLocal.value = savedState.clipCount || 0;
      cardCountLocal.value = savedState.cardCount || 0;

      previousCounts.value = {
        single: singleCountLocal.value,
        album: albumCountLocal.value,
        clip: clipCountLocal.value,
        card: cardCountLocal.value,
      };
    }
  }, null);
};

// Загрузка данных с сервера
const loadData = async () => {
  try {
    const response = await sendRequest(
      "post",
      "/ajax_vue/ajax/getDataForm.php",
      {},
    );
    console.log("Quiz1: getDataForm:", response.data);

    const data = response.data as any;

    if (data.products) {
      products.value = data.products;
    }

    if (data.user?.uf_region) {
      userRegion.value = data.user.uf_region;
    } else if (data.region) {
      userRegion.value = data.region;
    }

    await fetchBasket();
  } catch (error) {
    console.error("Quiz1: Ошибка загрузки данных:", error);
    isLoading.value = false;
    isInitialLoad.value = false;
  }
};

// Получение корзины
const fetchBasket = async () => {
  try {
    const response = await sendRequest(
      "post",
      "/ajax_vue/ajax/basket/updateBasket.php",
      {},
    );
    console.log("Quiz1: updateBasket:", response.data);

    const data = response.data as UpdateBasketResponse;

    if (data.data) {
      isUpdatingFromServer.value = true;

      basketItems.value = data.data.items || [];

      const singleItem = data.data.items.find((item) => item.type === "single");
      const albumItem = data.data.items.find((item) => item.type === "album");
      const clipItem = data.data.items.find((item) => item.type === "clip");
      const cardItem = data.data.items.find((item) => item.type === "card");

      const newSingle = singleItem?.quantity || 0;
      const newAlbum = albumItem?.quantity || 0;
      const newClip = clipItem?.quantity || 0;
      const newCard = cardItem?.quantity || 0;

      if (
        !isInitialLoad.value ||
        singleCountLocal.value !== newSingle ||
        albumCountLocal.value !== newAlbum ||
        clipCountLocal.value !== newClip ||
        cardCountLocal.value !== newCard
      ) {
        singleCountLocal.value = newSingle;
        albumCountLocal.value = newAlbum;
        clipCountLocal.value = newClip;
        cardCountLocal.value = newCard;
      }

      previousCounts.value = {
        single: singleCountLocal.value,
        album: albumCountLocal.value,
        clip: clipCountLocal.value,
        card: cardCountLocal.value,
      };

      totalSum.value = data.data.total || 0;
      currencySymbol.value = data.data.currency_symbol || "₽";

      console.log("Quiz1: Updated from server:", {
        single: singleCountLocal.value,
        album: albumCountLocal.value,
        clip: clipCountLocal.value,
        card: cardCountLocal.value,
      });

      await saveStateToDB();

      setTimeout(() => {
        isUpdatingFromServer.value = false;
        isLoading.value = false;
        isInitialLoad.value = false;
      }, 100);
    }
  } catch (error) {
    console.error("Quiz1: Ошибка получения корзины:", error);
    isUpdatingFromServer.value = false;
    isLoading.value = false;
    isInitialLoad.value = false;
  }
};

// Получение цены продукта в зависимости от региона
const getProductPrice = (product: Product | undefined): number => {
  if (!product) return 0;

  if (userRegion.value === "Russia") {
    return product.prices?.rub ? parseInt(product.prices.rub) : 0;
  }

  return product.prices?.usd ? parseInt(product.prices.usd) : 0;
};

// Поиск продукта по ID
const findProductById = (id: string): Product | undefined => {
  return products.value.find((p) => p.id === id);
};

// Получение basket_item_id для продукта
const getBasketItemId = (productId: string): string | null => {
  const basketItem = basketItems.value.find((item) => item.id === productId);
  return basketItem?.basket_item_id || null;
};

// Цены продуктов
const singlePrice = computed(() => getProductPrice(findProductById("28")));
const albumPrice = computed(() => getProductPrice(findProductById("29")));
const clipPrice = computed(() => getProductPrice(findProductById("30")));
const cardPrice = computed(() => getProductPrice(findProductById("31")));

// Названия продуктов
const singleName = computed(() => {
  const product = findProductById("28");
  return product?.name || "Сингл";
});

const albumName = computed(() => {
  const product = findProductById("29");
  return product?.name || "Альбом";
});

const clipName = computed(() => {
  const product = findProductById("30");
  return product?.name || "Клип";
});

const cardName = computed(() => {
  const product = findProductById("31");
  return product?.name || "Оформление карточки";
});

// Пояснительные тексты для каждой позиции
const tooltipTexts = {
  single:
    "Сингл — это один трек. Вы можете загрузить несколько синглов одновременно. Каждый сингл обрабатывается отдельно и требует своей обложки. Стоимость указана за один сингл.",
  album:
    "Альбом – это сборник из двух и более треков. Все треки с альбома выходят как один релиз с общей обложкой. Стоимость указана за альбом, независимо от количества треков.",
  clip: "Клип — это видеоролик на ваш трек. Мы поможем с загрузкой и оптимизацией видео для всех площадок, поддерживающих видеоформат. Стоимость указана за один клип.",
  card: "Оформление карточки – это установка фотографий в карточки на площадках VK Музыка и Яндекс Музыка. Также сюда входит привязка соц. сетей к карточкам. Карточка артиста появляется после выхода первого релиза артиста.",
};

// Проверка, выбран ли хотя бы один сингл или альбом
const isContinueDisabled = computed(() => {
  return singleCountLocal.value === 0 && albumCountLocal.value === 0;
});

// Форматирование цены с разделителями тысяч
const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Отправка запроса на добавление в корзину
const addToBasket = async (productId: string) => {
  try {
    const response = await sendRequest(
      "post",
      "/ajax_vue/ajax/basket/addBasket.php",
      {
        ID: productId,
      },
    );
    console.log("Quiz1: addBasket response:", response.data);

    await fetchBasket();
  } catch (error) {
    console.error("Quiz1: Ошибка добавления в корзину:", error);
    await fetchBasket();
  }
};

// Отправка запроса на изменение количества в корзине
const editBasket = async (basketItemId: string, count: number) => {
  try {
    const response = await sendRequest(
      "post",
      "/ajax_vue/ajax/basket/editBasket.php",
      {
        ID: basketItemId,
        COUNT: count,
      },
    );
    console.log("Quiz1: editBasket response:", response.data);

    await fetchBasket();
  } catch (error) {
    console.error("Quiz1: Ошибка изменения корзины:", error);
    await fetchBasket();
  }
};

// Обработчик изменения количества
const handleQuantityChange = async (
  productId: string,
  newCount: number,
  oldCount: number,
) => {
  if (isUpdatingFromServer.value || isInitialLoad.value) {
    console.log("Quiz1: Skipping API call due to flags:", {
      isUpdatingFromServer: isUpdatingFromServer.value,
      isInitialLoad: isInitialLoad.value,
    });
    return;
  }

  const basketItemId = getBasketItemId(productId);

  if (newCount > oldCount) {
    console.log(`Quiz1: Adding product ${productId} to basket`);
    await addToBasket(productId);
  } else if (newCount < oldCount && basketItemId) {
    console.log(
      `Quiz1: Editing basket item ${basketItemId} to count ${newCount}`,
    );
    await editBasket(basketItemId, newCount);
  }
};

// Метод для сброса состояния (вызывается при возврате)
const resetState = () => {
  console.log("Quiz1: Сброс состояния");

  isLoading.value = false;
  isInitialLoad.value = false;
  isUpdatingFromServer.value = false;

  singleCountLocal.value = 0;
  albumCountLocal.value = 0;
  clipCountLocal.value = 0;
  cardCountLocal.value = 0;

  previousCounts.value = {
    single: 0,
    album: 0,
    clip: 0,
    card: 0,
  };

  products.value = [];
  basketItems.value = [];
  totalSum.value = 0;

  console.log("Quiz1: Состояние сброшено");
};

// Метод для полной очистки (вызывается при рестарте)
const fullReset = async () => {
  console.log("Quiz1: Полная очистка");

  resetState();

  await safeDBOperation(async () => {
    await quizDB.value.delete(STORE_NAME, STORAGE_KEY);
    console.log("Quiz1: Состояние удалено из IndexedDB");
  }, null);

  console.log("Quiz1: Полная очистка завершена");
};

// Экспортируем методы для родителя
defineExpose({
  resetState,
  fullReset,
  singleCountLocal,
  albumCountLocal,
});

// При монтировании
onMounted(async () => {
  console.log("Quiz1: Монтируется...");

  isLoading.value = true;

  await initDB();
  await loadStateFromDB();
  await loadData();

  isLoading.value = false;
});

const goBack = () => {
  emit("go-back");
};

const handleContinue = async () => {
  if (isContinueDisabled.value) {
    ElMessage.warning("Для продолжения выберите хотя бы один сингл или альбом");
    return;
  }

  await saveStateToDB();
  emit("go-next");
};

// Обработчики попапа
const openPopup = () => {
  isPopupVisible.value = true;
  document.body.style.overflow = "hidden";
};

const closePopup = () => {
  isPopupVisible.value = false;
  document.body.style.overflow = "";
};

// Управление тултипами
const showTooltip = (type: string) => {
  activeTooltip.value = type;
};

const hideTooltip = () => {
  activeTooltip.value = null;
};

// Обработчик клика по документу для закрытия тултипа
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".tooltip-container")) {
    activeTooltip.value = null;
  }
};

// Добавляем обработчик клика по документу
if (typeof window !== "undefined") {
  document.addEventListener("click", handleDocumentClick);
}

// Следим за изменениями счетчиков
watch(
  [singleCountLocal, albumCountLocal, clipCountLocal, cardCountLocal],
  async (
    [newSingle, newAlbum, newClip, newCard],
    [oldSingle, oldAlbum, oldClip, oldCard],
  ) => {
    if (!isUpdatingFromServer.value) {
      await saveStateToDB();
    }

    previousCounts.value = {
      single: newSingle,
      album: newAlbum,
      clip: newClip,
      card: newCard,
    };

    if (newSingle !== oldSingle) {
      await handleQuantityChange("28", newSingle, oldSingle);
    }

    if (newAlbum !== oldAlbum) {
      // Ограничение для альбома - максимум 1
      if (newAlbum > 1) {
        albumCountLocal.value = 1;
        ElMessage.warning("Можно выбрать не более 1 альбома");
        return;
      }
      await handleQuantityChange("29", newAlbum, oldAlbum);
    }

    if (newClip !== oldClip) {
      await handleQuantityChange("30", newClip, oldClip);
    }

    if (newCard !== oldCard) {
      await handleQuantityChange("31", newCard, oldCard);
    }
  },
  { deep: true },
);

// Сохраняем состояние при покидании страницы
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", async () => {
    await saveStateToDB();
  });

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") {
      await saveStateToDB();
    }
  });
}
</script>

<template>
  <div class="quiz__form quiz__form_one">
    <div class="quiz__form_top">
      <h4 class="quiz__form_head">Что вы хотите загрузить?</h4>
      <button
        class="quiz__additional button__second button"
        @click="openPopup"
        :disabled="isLoading"
      >
        <span>Дополнительная информация</span>
      </button>
    </div>

    <!-- Попап с дополнительной информацией -->
    <Teleport to="body">
      <Transition name="popup-fade">
        <div
          v-if="isPopupVisible"
          class="quiz-popup__overlay"
          @click.self="closePopup"
        >
          <div class="quiz-popup">
            <button class="quiz-popup__close" @click="closePopup">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <div class="quiz-popup__content">
              <div class="quiz-popup__body">
                <h3 class="quiz-popup__title">
                  Форма размещения треков vauvision
                </h3>

                <p class="quiz-popup__text">
                  Пожалуйста, заполните все пункты максимально подробно – это
                  позволит нам сделать нашу работу качественно
                </p>

                <div class="quiz-popup__warning">
                  <strong>Внимание!</strong>
                  <p>
                    Рекомендуется закладывать минимум 3 рабочих дня на загрузку
                    релиза.
                  </p>
                </div>

                <div class="quiz-popup__info">
                  <p>
                    Треки выходят на площадках в 00:00 выбранной даты (по
                    Москве).
                  </p>
                </div>

                <div class="quiz-popup__links">
                  <p>
                    Для редактирования размера обложки
                    <a
                      href="https://vauvision.com/photos"
                      target="_blank"
                      rel="noopener noreferrer"
                      >используйте сайт</a
                    >
                    на вкладке «Обложка»
                  </p>

                  <p>
                    Для редактирования формата треков (.wav, 16 bit, 44.1 Khz)
                    <a
                      href="https://online-audio-converter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      >используйте конвертер</a
                    >
                  </p>
                </div>

                <div class="quiz-popup__message">
                  <p>
                    После заполнения этой формы, пожалуйста, напишите сообщение
                    в формате
                    <strong
                      >"Ваш псевдоним - Название релиза - ДИСТРИБУЦИЯ"</strong
                    >
                    в сообщения паблика
                    <a
                      href="https://vk.com/vauvisionlabel"
                      target="_blank"
                      rel="noopener noreferrer"
                      >vk.com/vauvisionlabel</a
                    >, либо
                    <a
                      href="https://vk.com/vauvisionlabel"
                      target="_blank"
                      rel="noopener noreferrer"
                      >телеграмм</a
                    >.
                  </p>
                </div>

                <div class="quiz-popup__instruction">
                  <p>
                    Перед загрузкой клипа прочтите
                    <RouterLink :to="Tr.i18nRoute({ name: 'faq' })">
                      <span>инструкцию</span> </RouterLink
                    >.
                  </p>
                </div>
              </div>

              <div class="quiz-popup__footer">
                <button
                  class="quiz-popup__button button__black button"
                  @click="closePopup"
                >
                  <span>Понятно</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ul class="quiz__form_one_list">
      <!-- Сингл -->
      <li class="quiz__form_one_item">
        <div class="quiz__form_one_left">
          <h6 class="quiz__form_one_head">{{ singleName }}</h6>
          <div class="tooltip-container">
            <button
              class="tooltip-trigger"
              @click.stop="showTooltip('single')"
              @mouseenter="showTooltip('single')"
              @mouseleave="hideTooltip"
              type="button"
              :aria-label="`Подробнее о ${singleName}`"
            >
              <FaqSVG />
            </button>
            <Transition name="tooltip-fade">
              <div
                v-if="activeTooltip === 'single'"
                class="tooltip-content"
                role="tooltip"
              >
                {{ tooltipTexts.single }}
              </div>
            </Transition>
          </div>
        </div>
        <div class="quiz__form_one_right">
          <p class="quiz__form_one_price">
            {{ formatPrice(singlePrice) }} {{ currencySymbol }}
          </p>
          <div class="quiz__form_one_count">
            <el-input-number
              v-model="singleCountLocal"
              :min="0"
              :max="99"
              :controls="true"
              :show-input="false"
              :disabled="isLoading"
            />
          </div>
        </div>
      </li>

      <!-- Альбом -->
      <li class="quiz__form_one_item">
        <div class="quiz__form_one_left">
          <h6 class="quiz__form_one_head">{{ albumName }}</h6>
          <div class="tooltip-container">
            <button
              class="tooltip-trigger"
              @click.stop="showTooltip('album')"
              @mouseenter="showTooltip('album')"
              @mouseleave="hideTooltip"
              type="button"
              :aria-label="`Подробнее о ${albumName}`"
            >
              <FaqSVG />
            </button>
            <Transition name="tooltip-fade">
              <div
                v-if="activeTooltip === 'album'"
                class="tooltip-content"
                role="tooltip"
              >
                {{ tooltipTexts.album }}
              </div>
            </Transition>
          </div>
        </div>
        <div class="quiz__form_one_right">
          <p class="quiz__form_one_price">
            {{ formatPrice(albumPrice) }} {{ currencySymbol }}
          </p>
          <div class="quiz__form_one_count">
            <el-input-number
              v-model="albumCountLocal"
              :min="0"
              :max="1"
              :controls="true"
              :show-input="false"
              :disabled="isLoading"
            />
          </div>
        </div>
      </li>

      <!-- Клип -->
      <li class="quiz__form_one_item">
        <div class="quiz__form_one_left">
          <h6 class="quiz__form_one_head">{{ clipName }}</h6>
          <div class="tooltip-container">
            <button
              class="tooltip-trigger"
              @click.stop="showTooltip('clip')"
              @mouseenter="showTooltip('clip')"
              @mouseleave="hideTooltip"
              type="button"
              :aria-label="`Подробнее о ${clipName}`"
            >
              <FaqSVG />
            </button>
            <Transition name="tooltip-fade">
              <div
                v-if="activeTooltip === 'clip'"
                class="tooltip-content"
                role="tooltip"
              >
                {{ tooltipTexts.clip }}
              </div>
            </Transition>
          </div>
        </div>
        <div class="quiz__form_one_right">
          <p class="quiz__form_one_price">
            {{ formatPrice(clipPrice) }} {{ currencySymbol }}
          </p>
          <div class="quiz__form_one_count">
            <el-input-number
              v-model="clipCountLocal"
              :min="0"
              :max="99"
              :controls="true"
              :show-input="false"
              :disabled="isLoading"
            />
          </div>
        </div>
      </li>

      <!-- Оформление карточки -->
      <li class="quiz__form_one_item">
        <div class="quiz__form_one_left">
          <h6 class="quiz__form_one_head">{{ cardName }}</h6>
          <div class="tooltip-container">
            <button
              class="tooltip-trigger"
              @click.stop="showTooltip('card')"
              @mouseenter="showTooltip('card')"
              @mouseleave="hideTooltip"
              type="button"
              :aria-label="`Подробнее о ${cardName}`"
            >
              <FaqSVG />
            </button>
            <Transition name="tooltip-fade">
              <div
                v-if="activeTooltip === 'card'"
                class="tooltip-content"
                role="tooltip"
              >
                {{ tooltipTexts.card }}
              </div>
            </Transition>
          </div>
        </div>
        <div class="quiz__form_one_right">
          <p class="quiz__form_one_price">
            {{ formatPrice(cardPrice) }} {{ currencySymbol }}
          </p>
          <div class="quiz__form_one_count">
            <el-input-number
              v-model="cardCountLocal"
              :min="0"
              :max="99"
              :controls="true"
              :show-input="false"
              :disabled="isLoading"
            />
          </div>
        </div>
      </li>
    </ul>

    <div v-if="isLoading" class="quiz__form_loading">
      <span>Загрузка актуальных данных...</span>
    </div>

    <div class="quiz__form_bottom">
      <div class="quiz__form_buttons">
        <button
          class="form__back button__second button"
          @click="goBack"
          :disabled="isLoading"
        >
          <span><BackSVG /></span>
          <span>Назад</span>
        </button>
        <button
          class="quiz__form_button button__black button"
          :disabled="isContinueDisabled || isLoading"
          @click="handleContinue"
        >
          <span>{{ isLoading ? "Загрузка..." : "Продолжить" }}</span>
        </button>
      </div>
      <div class="quiz__form_sum_container">
        <div class="quiz__form_sum">
          <p class="quiz__form_sum_text">Итого к оплате:</p>
          <h4 class="quiz__form_total">
            <span>{{ formatPrice(totalSum) }}</span> {{ currencySymbol }}
          </h4>
        </div>
        <div class="quiz__form_sum_bonus">
          <p class="quiz__form_sum_bonus_text">Будет начислено бонусов:</p>
          <div class="quiz__form_sum_bonus_total">
            <span>{{ formatPrice(Math.round(totalSum * 0.07)) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@mixin quiz-popup-callout {
  background-color: var(--bg-color);
  border-left: 4px solid var(--color);
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.quiz__form_top {
  display: flex;
  width: 100%;
  padding: 0 0 40px;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
}

.quiz__additional {
  text-transform: uppercase;
}

.quiz__form_one_list {
  padding: 30px;
  border: 1px solid var(--border);

  @media (max-width: 767px) {
    padding: 0;
    border: 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
}

.quiz__form_one {
  @media (max-width: 767px) {
    padding: 15px;
  }
}

.quiz__form_one_item {
  display: flex;
  padding: 20px 0;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border);
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}

.quiz__form_one_left {
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 767px) {
    gap: 8px;
  }
}

.quiz__form_one_head {
  text-transform: uppercase;
  margin: 0;
}

.quiz__form_one_right {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 65px;

  @media (max-width: 767px) {
    gap: 20px;
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
}

.quiz__form_loading {
  text-align: center;
  padding: 15px;
  color: #999;
  font-size: 14px;
}

.quiz__form_sum {
  display: flex;
  align-items: center;
  gap: 15px;
  &_container {
    display: flex;
    flex-direction: column;
  }
  &_text {
    font-weight: 400;
    font-size: 16px;
    line-height: 140%;
    color: #131313;
  }
  &_bonus {
    display: flex;
    align-items: center;
    gap: 10px;
    &_text {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
      color: #85858e;
    }
    &_total {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
      color: #85858e;
    }
  }
}

.quiz__form_total {
  color: var(--color);
  transform: translateY(-2.5px);
}

.quiz__form_one_price {
  flex: 0 0 auto;
}

:deep(.el-input-number.is-disabled .el-input__inner) {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
  cursor: not-allowed;
}

.quiz-popup__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 80px 20px 20px;
  backdrop-filter: blur(5px);
}

.quiz-popup {
  width: 100%;
  max-width: 600px;
  position: relative;
  background-color: var(--bg);

  &__close {
    display: flex;
    padding: 8px;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: -60px;
    background: var(--bg);
    cursor: pointer;
    color: var(--text);
    border: none;
    z-index: 1002;

    @media (max-width: 767px) {
      top: -60px;
      left: auto;
      right: 0;
      background: var(--bg);
    }

    @media (max-width: 480px) {
      top: -50px;
    }
  }

  &__content {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    padding: 30px;

    @media (max-width: 767px) {
      padding: 20px;
    }

    @media (max-width: 480px) {
      padding: 15px;
    }

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;

      &:hover {
        background: #555;
      }
    }
  }

  &__body {
    padding: 0 0 20px;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    @media (max-width: 767px) {
      font-size: 20px;
    }
  }

  &__text {
    font-size: 16px;
    line-height: 1.5;
    color: #333;
    margin-bottom: 20px;

    @media (max-width: 767px) {
      font-size: 14px;
    }
  }

  &__warning {
    @include quiz-popup-callout;

    strong {
      display: block;
      margin-bottom: 8px;
      color: #856404;
      font-size: 16px;
    }
  }

  &__info {
    @include quiz-popup-callout;
  }

  &__message {
    @include quiz-popup-callout;

    a {
      color: var(--color);
      text-decoration: underline;

      &:hover {
        color: var(--text);
      }
    }
  }

  &__links {
    background-color: var(--bg-color);
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 8px;

    p:first-child {
      margin-bottom: 12px;
    }

    a {
      color: var(--color);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px dashed var(--color);

      &:hover {
        color: var(--text);
        border-bottom-color: var(--text);
      }
    }
  }

  &__instruction {
    background-color: var(--bg-color);
    padding: 15px;
    border-radius: 8px;
    text-align: center;

    a {
      color: var(--color);
      text-decoration: none;
      font-weight: 600;
      border-bottom: 2px solid var(--color);

      &:hover {
        color: var(--text);
        border-bottom-color: var(--text);
      }
    }
  }

  &__footer {
    padding: 20px 0 0;
    text-align: center;
  }

  &__button {
    @media (max-width: 767px) {
      min-width: 160px;
      padding: 12px 24px;
      font-size: 14px;
    }
  }
}

@media (max-width: 767px) {
  .quiz-popup__warning p,
  .quiz-popup__info p,
  .quiz-popup__links p,
  .quiz-popup__message p,
  .quiz-popup__instruction p {
    font-size: 14px;
  }
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.3s ease;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.tooltip-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  transition: color 0.2s ease;
  border-radius: 50%;

  &:hover {
    color: #333;
  }

  &:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;

    @media (max-width: 767px) {
      width: 16px;
      height: 16px;
    }
  }
}

.tooltip-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 10px;
  padding: 12px 16px;
  background: #333;
  color: white;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  white-space: normal;
  text-align: left;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  min-width: 250px;

  @media (max-width: 767px) {
    min-width: 200px;
    font-size: 12px;
    padding: 10px 12px;
  }

  @media (max-width: 480px) {
    left: 0;
    transform: none;
    bottom: auto;
    top: 100%;
    margin-top: 8px;
    margin-bottom: 0;
  }

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;

    @media (max-width: 480px) {
      top: auto;
      bottom: 100%;
      border-color: transparent transparent #333 transparent;
    }
  }
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(5px);

  @media (max-width: 480px) {
    transform: translateY(-5px);
  }
}

.tooltip-fade-enter-to,
.tooltip-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);

  @media (max-width: 480px) {
    transform: translateY(0);
  }
}
</style>
