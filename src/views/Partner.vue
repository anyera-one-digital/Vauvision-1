<script lang="ts" setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch } from "vue";
import Header from "@/components/layout/Header.vue";
import Menu from "@/components/layout/Menu.vue";
import PersonalSVG from "@/uikit/icon/PersonalSVG.vue";
import MoreSVG from "@/uikit/icon/MoreSVG.vue";
import ButtonSVG from "@/uikit/icon/ButtonSVG.vue";
import ClipSVG from "@/uikit/icon/ClipSVG.vue";
import { sendRequest } from '@/utils/api';

/** Пагинация рефералов на сервере (getData.php), без загрузки всего списка в JSON */
const GETDATA_REFERRALS_QUERY = '/ajax_vue/ajax/getData.php';

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

// Интерфейс для партнера из API
interface ReferralUser {
  ID: string;
  EMAIL: string;
  LOGIN: string;
  DATE_REGISTER: string;
  UF_RELEASES: string | number;
  PAYOUT: string;
}

// Данные из API
const referralData = ref({
  isAgreed: false,
  link: ''
});

const referralUsers = shallowRef<ReferralUser[]>([]);
/** Страница с сервера; всего referalUsers — referralUsersTotal в profile */
const referralUsersTotal = ref(0);
const isAccepting = ref(false);
const copySuccess = ref(false);
const showConditionsModal = ref(false);

const closeConditionsModal = () => {
  showConditionsModal.value = false;
};

/** При ширине окна < 540px и ширине ячейки email > 130px — обрезка; раскрытие по клику */
const PARTNER_EMAIL_VIEWPORT_MAX = 539;
const PARTNER_EMAIL_CELL_TRUNCATE_MIN = 130;

const isPartnerEmailNarrowViewport = ref(false);
const partnerEmailClampActive = ref<Record<string, boolean>>({});
const expandedPartnerEmailIds = ref<Record<string, boolean>>({});

const partnerEmailCellEls = new Map<string, HTMLElement>();
const partnerEmailCellObservers = new Map<string, ResizeObserver>();

const updatePartnerEmailClampForWidth = (id: string, width: number) => {
  const active =
    isPartnerEmailNarrowViewport.value && width > PARTNER_EMAIL_CELL_TRUNCATE_MIN;
  const prevActive = partnerEmailClampActive.value[id] ?? false;
  if (prevActive !== active) {
    partnerEmailClampActive.value = {
      ...partnerEmailClampActive.value,
      [id]: active,
    };
  }
  if (!active && expandedPartnerEmailIds.value[id]) {
    const next = { ...expandedPartnerEmailIds.value };
    delete next[id];
    expandedPartnerEmailIds.value = next;
  }
};

const recalcAllPartnerEmailClamps = () => {
  partnerEmailCellEls.forEach((el, id) => {
    updatePartnerEmailClampForWidth(id, el.getBoundingClientRect().width);
  });
};

const bindPartnerEmailCell = (id: string, el: unknown) => {
  const html = el instanceof HTMLElement ? el : null;

  /** Уже привязан этот DOM-узел — иначе каждый рендер перезаписывает ref и снова мутирует реактивность → бесконечный цикл */
  if (html && partnerEmailCellEls.get(id) === html && partnerEmailCellObservers.has(id)) {
    return;
  }

  const prev = partnerEmailCellObservers.get(id);
  if (prev) {
    prev.disconnect();
    partnerEmailCellObservers.delete(id);
  }
  if (!html) {
    partnerEmailCellEls.delete(id);
    if (id in partnerEmailClampActive.value) {
      const nextClamp = { ...partnerEmailClampActive.value };
      delete nextClamp[id];
      partnerEmailClampActive.value = nextClamp;
    }
    return;
  }

  partnerEmailCellEls.set(id, html);
  const ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width ?? html.getBoundingClientRect().width;
    updatePartnerEmailClampForWidth(id, w);
  });
  ro.observe(html);
  partnerEmailCellObservers.set(id, ro);
  updatePartnerEmailClampForWidth(id, html.getBoundingClientRect().width);
};

const togglePartnerEmail = (id: string) => {
  if (!partnerEmailClampActive.value[id]) return;
  expandedPartnerEmailIds.value = {
    ...expandedPartnerEmailIds.value,
    [id]: !expandedPartnerEmailIds.value[id],
  };
};

let partnerEmailMql: MediaQueryList | null = null;

const onPartnerEmailViewportChange = () => {
  if (!partnerEmailMql) return;
  isPartnerEmailNarrowViewport.value = partnerEmailMql.matches;
  recalcAllPartnerEmailClamps();
};

// Пагинация для партнеров
const partnersPerPage = ref<number>(6);
const currentPartnersPage = ref<number>(1);

const totalPartnersPages = computed(() => {
  const total = referralUsersTotal.value;
  const perPage = partnersPerPage.value;
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / perPage));
});

const paginatedPartners = computed(() => {
  const perPage = partnersPerPage.value;
  const page = Math.max(1, currentPartnersPage.value);
  let rows = referralUsers.value;
  /** Если бэкенд отдал всех рефералов одним массивом (часто у «тяжёлых» лейблов), без slice Vue отрисует тысячи DOM — вкладка зависает. */
  if (rows.length > perPage) {
    const start = (page - 1) * perPage;
    rows = rows.slice(start, start + perPage);
  }
  return rows.map((user: ReferralUser, idx: number) => {
    const rawId = String(user.ID ?? "");
    const parsedId = Number.parseInt(rawId, 10);
    return {
      rowKey: rawId ? `${rawId}-${idx}` : `row-${idx}`,
      id: Number.isFinite(parsedId) ? parsedId : idx,
      name: user.LOGIN || 'Без имени',
      email: user.EMAIL,
      date: formatDate(user.DATE_REGISTER),
      earnings: user.PAYOUT,
      releases: formatReleases(user.UF_RELEASES),
    };
  });
});

const showPartnersPagination = computed(() => referralUsersTotal.value > partnersPerPage.value);

// Форматирование даты
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Форматирование количества релизов
const formatReleases = (releases: string | number) => {
  const count = Number(releases);
  if (count === 0) return '0 релизов';
  if (count === 1) return '1 релиз';
  if (count >= 2 && count <= 4) return `${count} релиза`;
  return `${count} релизов`;
};

const nextPartnersPage = async () => {
  if (currentPartnersPage.value >= totalPartnersPages.value) return;
  expandedPartnerEmailIds.value = {};
  await fetchPartnerReferralsPage(currentPartnersPage.value + 1);
};

const prevPartnersPage = async () => {
  if (currentPartnersPage.value <= 1) return;
  expandedPartnerEmailIds.value = {};
  await fetchPartnerReferralsPage(currentPartnersPage.value - 1);
};

type CabinetProfileReferrals = {
  referralUsers?: ReferralUser[];
  referralUsersTotal?: number;
  referralUsersPage?: number;
  referralUsersPerPage?: number;
};

const fetchPartnerReferralsPage = async (page = 1) => {
  isLoading.value = true;
  try {
    const perPage = partnersPerPage.value;
    const sep = GETDATA_REFERRALS_QUERY.includes('?') ? '&' : '?';
    const url = `${GETDATA_REFERRALS_QUERY}${sep}referral_page=${page}&referral_per_page=${perPage}`;
    const response = await sendRequest('get', url, {});

    const payload = response.data as Record<string, unknown> | undefined;

    const refObj = payload?.referral as { isAgreed?: boolean; link?: string } | undefined;
    if (refObj) {
      referralData.value = {
        isAgreed: !!refObj.isAgreed,
        link: typeof refObj.link === 'string' ? refObj.link : '',
      };
    }

    const prof = payload?.profile as CabinetProfileReferrals | undefined;
    const list = Array.isArray(prof?.referralUsers) ? prof!.referralUsers! : [];
    referralUsers.value = list;

    const total =
      typeof prof?.referralUsersTotal === 'number' ? prof.referralUsersTotal : list.length;
    referralUsersTotal.value = Math.max(0, total);

    const serverPage = prof?.referralUsersPage;
    if (typeof serverPage === 'number' && serverPage >= 1) {
      currentPartnersPage.value = serverPage;
    } else {
      currentPartnersPage.value = page;
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных партнёрки:', error);
  } finally {
    isLoading.value = false;
  }
};

// Принять условия партнерской программы
const acceptAgreement = async () => {
  isAccepting.value = true;
  try {
    const response = await sendRequest('post', '/auth/profile/agreeReferalProgram.php', {});
    
    if (response.data && response.data.success) {
      await fetchPartnerReferralsPage(1);
    } else {
      alert('Ошибка при принятии условий');
    }
  } catch (error) {
    console.error('Ошибка при принятии условий:', error);
    alert('Не удалось принять условия');
  } finally {
    isAccepting.value = false;
  }
};

// Копировать ссылку
const copyReferralLink = () => {
  if (!referralData.value.link) return;
  
  navigator.clipboard.writeText(referralData.value.link).then(() => {
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  }).catch(err => {
    console.error('Ошибка при копировании:', err);
  });
};

// Загружаем данные при монтировании
onMounted(() => {
  partnerEmailMql = window.matchMedia(
    `(max-width: ${PARTNER_EMAIL_VIEWPORT_MAX}px)`
  );
  isPartnerEmailNarrowViewport.value = partnerEmailMql.matches;
  partnerEmailMql.addEventListener("change", onPartnerEmailViewportChange);
  fetchPartnerReferralsPage(1);
});

watch(showConditionsModal, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  document.body.style.overflow = "";
  partnerEmailMql?.removeEventListener("change", onPartnerEmailViewportChange);
  partnerEmailMql = null;
  partnerEmailCellObservers.forEach((ro) => ro.disconnect());
  partnerEmailCellObservers.clear();
  partnerEmailCellEls.clear();
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
      <div class="partner__top">
        <h3 class="partner__head">ЧТО ТАКОЕ ПАРТНЁРСКАЯ ПРОГРАММА VAUVISION?</h3>
        <p class="partner__desc">Получайте 400 рублей за каждого друга, выкладывающего релизы через VAUVISION по вашей реферальной ссылке! А также за их каждый следующий релиз и за каждый релиз их друзей!</p>
      </div>
      
      <!-- Блок для пользователей, не принявших условия -->
      <div v-if="!referralData.isAgreed" class="partner__agreement">
        <div class="partner__agreement_info">
          <h5 class="partner__agreement_head">Документ партнерской программы</h5>
          <p class="partner__agreement_desc">Ознакомьтесь с условиями партнерской программы</p>
        </div>
        <div class="partner__agreement_buttons">
          <a 
            href="/auth/profile/Agree.pdf" 
            class="partner__agreement_button button__primary"
            target="_blank"
          >
            <span>Открыть документ</span>
          </a>
          <button 
            class="partner__agreement_button button__red"
            @click="acceptAgreement"
            :disabled="isAccepting"
          >
            <span>{{ isAccepting ? 'Принятие...' : 'Принять условия' }}</span>
          </button>
        </div>
      </div>
      
      <div class="partner__flex">
        <div class="partner__content">
          <div class="partner__table">
            <h5 class="partner__heading">Партнеры, зарегистрировавшиеся по вашей ссылке</h5>
            
            <!-- Загрузка -->
            <div v-if="isLoading" class="partner__loading">
              Загрузка партнеров...
            </div>
            
            <!-- Нет партнеров -->
            <div v-else-if="referralUsers.length === 0" class="partner__empty">
              У вас пока нет приглашенных партнеров
            </div>
            
            <!-- Список партнеров -->
            <template v-else>
              <ul class="partner__list">
                <li class="partner__item partner__header">
                  <div class="partner__cell partner__name">Партнер</div>
                  <div class="partner__cell partner__email">E-mail</div>
                  <div class="partner__cell partner__date">Дата регистрации</div>
                  <div class="partner__cell partner__earnings">Начисления</div>
                  <div class="partner__cell partner__releases">Релизы</div>
                  <div class="partner__cell partner__actions"></div>
                </li>
                <li 
                  class="partner__item" 
                  v-for="partner in paginatedPartners" 
                  :key="partner.rowKey"
                >
                  <div class="partner__cell partner__name">
                    <div class="partner__user">
                      <PersonalSVG />
                    </div>
                    <span class="partner__name-text">{{ partner.name }}</span>
                  </div>
                  <div
                    class="partner__cell partner__email"
                    :class="{
                      'partner__email--clamp': partnerEmailClampActive[partner.rowKey],
                      'partner__email--expanded': expandedPartnerEmailIds[partner.rowKey],
                    }"
                    :ref="(el) => bindPartnerEmailCell(partner.rowKey, el)"
                    @click="togglePartnerEmail(partner.rowKey)"
                  >
                    <span class="partner__email-text">{{ partner.email }}</span>
                  </div>
                  <div class="partner__cell partner__date">
                    <span class="partner__date-text">{{ partner.date }}</span>
                  </div>
                  <div class="partner__cell partner__earnings">
                    <span class="partner__earnings-text">{{ partner.earnings }}</span>
                  </div>
                  <div class="partner__cell partner__releases">
                    <span class="partner__releases-text">{{ partner.releases }}</span>
                  </div>
                  <div class="partner__cell partner__actions">
                    <button class="partner__more">
                      <MoreSVG/>
                    </button>
                  </div>
                </li>
              </ul>
              
              <!-- Пагинация -->
              <div class="pagination__buttons" v-if="showPartnersPagination">
                <button 
                  class="pagination__buttons_button button button__pagination button__pagination_prev"
                  @click="prevPartnersPage"
                  :disabled="currentPartnersPage === 1"
                >
                  <span><ButtonSVG /></span>
                  <span>{{ $t('button.prev') }}</span>
                </button>
                
                <div class="pagination__buttons_info">
                  {{ currentPartnersPage }}/{{ totalPartnersPages }}
                </div>
                
                <button 
                  class="pagination__buttons_button button button__pagination button__pagination_next"
                  @click="nextPartnersPage"
                  :disabled="currentPartnersPage === totalPartnersPages"
                >
                  <span>{{ $t('button.next') }}</span>
                  <span><ButtonSVG /></span>
                </button>
              </div>
            </template>
          </div>
        </div>
        <div class="partner__right">
          <div class="partner__conditions">
            <div class="partner__conditions_info">
              <h5 class="partner__conditions_head">условия участия</h5>
              <p class="partner__conditions_desc">Детали начисления за повторные релизы и приглашенных друзей указаны ниже в разделе «Условия участия».</p>
            </div>
            <div class="partner__conditions_ctas">
              <button
                type="button"
                class="partner__conditions_button button__red"
                :disabled="referralData.isAgreed || isAccepting"
                @click="acceptAgreement"
              >
                <span>{{ referralData.isAgreed ? 'Условия приняты' : isAccepting ? 'Принятие...' : 'стать партнером' }}</span>
              </button>
              <button
                type="button"
                class="partner__conditions_button partner__link button__red"
                @click="showConditionsModal = true"
              >
                <span>Условия</span>
              </button>
            </div>
          </div>
          <div class="partner__referral">
            <div class="partner__referral_info">
              <h5 class="partner__referral_head">реферальная ссылка</h5>
              <p class="partner__referral_desc">Зарабатывайте вместе с VAUVISION. Получайте реальные деньги за каждого вашего друга, выложевшего релиз.</p>
            </div>
            <div class="partner__referral_info">
              <p class="partner__referral_heading button">ваша реферальная ссылка</p>
              
              <!-- Если пользователь не принял условия -->
              <div v-if="!referralData.isAgreed" class="partner__referral_notice">
                <button class="partner__conditions_copy text_very" disabled>
                  <span>Появится после принятия условий участия</span>
                </button>
              </div>
              
              <!-- Если условия приняты и есть ссылка -->
              <div v-else-if="referralData.link" class="partner__referral_link">
                <button 
                  class="partner__conditions_copy text_very partner__conditions_copy_with-icon"
                  @click="copyReferralLink"
                >
                  <span>{{ referralData.link }}</span>
                  <ClipSVG />
                </button>
                <span v-if="copySuccess" class="partner__copy_success">Скопировано!</span>
              </div>
              
              <!-- Если ссылка не загрузилась -->
              <div v-else class="partner__referral_notice">
                <button class="partner__conditions_copy text_very" disabled>
                  <span>Загрузка ссылки...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<Teleport to="body">
  <div
    v-if="showConditionsModal"
    class="partner__conditions_modal_overlay"
    @click.self="closeConditionsModal"
  >
    <div
      class="partner__conditions_modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-conditions-modal-title"
    >
      <div class="partner__conditions_modal_header">
        <h2 id="partner-conditions-modal-title" class="partner__conditions_modal_title">
          Условия участия
        </h2>
        <button
          type="button"
          class="partner__conditions_modal_close"
          aria-label="Закрыть"
          @click="closeConditionsModal"
        >
          ×
        </button>
      </div>
      <div class="partner__conditions_modal_body">
        <section class="partner__conditions_modal_section">
          <h3 class="partner__conditions_modal_heading">Общие понятия</h3>
          <ul class="partner__conditions_modal_defs">
            <li>
              <strong>Партнёр</strong> — Пользователь, который стал частью реферальной
              программы Правообладателя и добровольно распространяет свой уникальный промокод
              для привлечения новых Пользователей.
            </li>
            <li>
              <strong>Промокод</strong> — уникальный набор символов, генерируемый Сайтом для
              Партнёров, для привлечения Рефералов.
            </li>
            <li>
              <strong>Реферал</strong> — Пользователь, зарегистрировавшийся на Сайте по
              Промокоду Партнёра.
            </li>
            <li>
              <strong>Реферальная программа</strong> — система бонусных начислений для
              Партнёров внутри Сайта за приглашение уникальных Рефералов.
            </li>
          </ul>
        </section>

        <section class="partner__conditions_modal_section">
          <h3 class="partner__conditions_modal_heading">Общие условия</h3>
          <ol class="partner__conditions_modal_list">
            <li>
              Принимать участие в партнерской программе может любой зарегистрированный и
              подтвердивший свой email пользователь сайта
            </li>
            <li>
              Каждый зарегистрированный пользователь получает партнерскую ссылку. Она
              отображается в поле: «Ваша реферальная ссылка»
            </li>
            <li>Приглашённые вами пользователи должны ввести вашу ссылку при регистрации.</li>
            <li>
              Каждый новый пользователь, зарегистрировавшийся по Вашей ссылке, становится вашим
              Рефералом. История регистраций по партнерской ссылке отображается в поле: «ПАРТНЕРЫ,
              ЗАРЕГИСТРИРОВАВШИЕСЯ ПО ВАШЕЙ ССЫЛКЕ».
            </li>
          </ol>
        </section>

        <section class="partner__conditions_modal_section">
          <h3 class="partner__conditions_modal_heading">Обязанности пользователя реферальной программы</h3>
          <ol class="partner__conditions_modal_list">
            <li>Использовать только одну учётную запись на Сайте.</li>
            <li>Не использовать самореферование для обманного получения реферальных начислений.</li>
            <li>Не использовать дубликатных учётных записей на Сайте.</li>
            <li>Не распространять свой партнёрский Промокод с помощью спама.</li>
            <li>
              Не распространять материал, нарушающий авторские права (мелодии, тексты,
              исполнение, песни). Если Реферал заполнил заявку, но его контент будет отклонён из-за
              нарушения авторских прав, то бонус Партнёру за такую заявку не начисляется.
            </li>
            <li>Не привлекать новых Пользователей с использованием фальшивых или недостоверных данных.</li>
            <li>Хранить в тайне и не раскрывать третьим лицам информацию о доступе к своему Личному кабинету.</li>
            <li>Обеспечить конфиденциальность полученной при сотрудничестве с Правообладателем информации.</li>
            <li>
              Незамедлительно информировать Правообладателя обо всех ставших ему известных фактах
              противоправного использования Реферальной программы третьими лицами.
            </li>
            <li>
              Не осуществлять массовые рассылки сообщений в адрес других Пользователей Сайта и
              Реферальной программы без их согласия.
            </li>
          </ol>
        </section>

        <section class="partner__conditions_modal_section">
          <h3 class="partner__conditions_modal_heading">Порядок начислений и использования бонусов</h3>
          <ol class="partner__conditions_modal_list">
            <li>
              Реферальный бонус для россиян за одного пришедшего клиента — 400 рублей. Бонус
              начисляется после того, как реферал оплатит первый релиз (неважно сингл это или
              альбом — сумма начислений не меняется). За второй релиз своего реферала партнёр также
              получит выплату, но в меньшем количестве — для России 300 рублей, за третий релиз 200
              рублей. Если реферал выкладывает 4 релиз и далее, то партнёр получает с каждого
              следующего релиза 100 рублей.
            </li>
            <li>
              Если реферал партнёра сам становится партнёром (то есть также зовёт других
              пользователей по уже собственной ссылке), то первоначальный партнёр также получает
              денежную выплату с КАЖДОГО релиза рефералов реферала: 100 рублей. Если эта схема идёт
              дальше одного нового реферала, то самый первоначальный партнёр получает 50 и так до 5
              порядка, от шестого человека в схеме первоначальный партнёр НЕ ПОЛУЧАЕТ бонусы.
            </li>
            <li>Все бонусы начисляются через 2 недели после оплаты релиза вашими рефералами.</li>
            <li>
              Вы вправе использовать бонусы 2 способами: использовать их внутри сайта для частичной
              или полной оплаты наших услуг по дистрибуции или вывести себе на карту реальные деньги.
              В случае вывода на карту — вы получите сумму вдвое меньшую количеству ваших бонусов
              (если у вас 1 000 бонусных рублей, то при выводе вы получите 500), а все остальные
              бонусы сгорят.
            </li>
          </ol>
        </section>

        <section class="partner__conditions_modal_section">
          <h3 class="partner__conditions_modal_heading">Права компании</h3>
          <ol class="partner__conditions_modal_list">
            <li>
              Компания оставляет за собой право проверить каждую успешную заявку на дистрибуцию на
              предмет мошенничества.
            </li>
            <li>
              Компания оставляет за собой право отказаться от выплаты вознаграждений в случае
              обнаружения мошеннических действий или нарушений условий реферальной программы со
              стороны реферала.
            </li>
          </ol>
        </section>

        <p class="partner__conditions_modal_footer_text">
          Вступая в партнерскую программу VAUVISION вы соглашаетесь со всеми условиями.
        </p>
      </div>
    </div>
  </div>
</Teleport>
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
}

.personal__block {
  @media (max-width: 1919px) {
    width: calc(100% - 230px);
  }

  @media (max-width: 1439px) {
    width: 100%;
  }
}

.partner__agreement {
  display: flex;
  padding: 30px 40px;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg);
  border: 1px solid var(--border);
  margin-bottom: 20px;

  &_info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &_head {
    text-transform: uppercase;
    font-weight: 500;
  }

  &_desc {
    color: var(--text-gray);
  }

  &_buttons {
    display: flex;
    gap: 10px;
  }

  &_button {
    padding: 12px 24px;
    text-transform: uppercase;
  }

  @media (max-width: 1439px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;

    &_buttons {
      width: 100%;
    }

    &_button {
      flex: 1;
    }
  }

  @media (max-width: 767px) {
    padding: 20px 15px;

    &_buttons {
      flex-direction: column;
    }

    &_button {
      width: 100%;
    }
  }
}

.partner {
  &__loading,
  &__empty {
    padding: 40px;
    text-align: center;
    color: var(--text-gray);
    background-color: var(--bg);
    border: 1px solid var(--border);
  }

  &__flex {
    display: flex;
    gap: 40px;

    @media (max-width: 1919px) {
      gap: 20px;
    }

    @media (max-width: 1439px) {
      flex-direction: column;
    }

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 20px;
    }
  }

  &__content,
  &__top {
    display: flex;
    width: calc(100% - 440px);
    flex: 0 0 auto;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 1919px) {
      width: calc(100% - 340px);
    }

    @media (max-width: 1439px) {
      width: 100%;
    }
  }

  &__top,
  &__table {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__table {
    padding: 40px;
    background-color: var(--bg);
    border: 1px solid var(--border);

    @media (max-width: 767px) {
      padding: 30px 15px;
    }
  }

  &__head,
  &__heading,
  &__conditions_head,
  &__agreement_head {
    text-transform: uppercase;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background-color: var(--border);
  }

  &__item {
    display: flex;
    width: 100%;
    padding: 20px 0;
    align-items: center;
    background-color: var(--bg);
    gap: 20px;

    @media (max-width: 1023px) {
      display: grid;
      grid-template-columns: 73px 1fr 1fr 1fr;
      grid-gap: 15px 30px;
      padding: 15px 0;
    }
    @media (max-width: 540px) {
      grid-gap: 15px 20px;
    }
  }

  &__header {
    text-transform: capitalize;
    color: var(--text-gray);

    & .partner__earnings {
      text-transform: capitalize;
      color: var(--text-gray);
    }

    @media (max-width: 1023px) {
      display: none;
    }
  }

  &__cell {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  &__name {
    flex: 2;
    min-width: 140px;
    &-text {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
      color: #181818;
    }

    @media (max-width: 1023px) {
      grid-column: 1 / 4;
      grid-row: 1 / 2;
    }
  }

  &__email {
    flex: 2;
    min-width: 140px;
    &-text {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
    }

    @media (max-width: 1023px) {
      min-width: auto;
      grid-column: 2 / 4;
      grid-row: 2 / 3;
    }

    &.partner__email--clamp {
      min-width: 0;
      max-width: 100%;
      cursor: pointer;

      .partner__email-text {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &.partner__email--expanded .partner__email-text {
        white-space: normal;
        word-break: break-word;
        overflow: visible;
        text-overflow: clip;
      }
    }
  }

  &__date {
    flex: 1;
    min-width: 140px;
    &-text {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
    }

    @media (max-width: 1023px) {
      min-width: auto;
      grid-column: 1 / 2;
      grid-row: 2 / 3;
    }
  }

  &__earnings {
    flex: 1;
    min-width: 100px;
    color: var(--color);
    &-text {
      font-weight: 400;
      font-size: 14px;
      line-height: 140%;
    }

    @media (max-width: 1023px) {
      min-width: auto;
      grid-column: 4 / 5;
      grid-row: 2 / 3;
      justify-content: flex-end;
    }
  }

  &__releases {
    flex: 1;
    min-width: 100px;

    @media (max-width: 1919px) {
      display: none;
    }
  }

  &__actions {
    flex: 0 0 40px;
    min-width: 40px;
    justify-content: flex-end;

    @media (max-width: 1023px) {
      grid-column: 4 / 5;
      grid-row: 1 / 2;
    }
  }

  &__user {
    display: flex;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
    color: #00000038;
    background-color: var(--bg-gray);

    svg {
      width: 24px;
      height: 24px;
      object-fit: cover;
    }
  }

  &__more {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-gray);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &__load {
    margin: 30px auto 0;

    @media (max-width: 767px) {
      margin: 20px 0 0;
    }
  }

  &__right {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 20px;

    @media (max-width: 1439px) {
      flex-direction: row;
    }

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 10px;
    }
  }

  &__conditions,
  &__referral {
    display: flex;
    padding: 40px;
    flex-direction: column;
    gap: 30px;
    position: relative;
    background-color: var(--bg);
    border: 1px solid var(--border);

    @media (max-width: 1439px) {
      width: calc(50% - 10px);
    }

    @media (max-width: 767px) {
      width: 100%;
    }
  }

  &__conditions {
    @media (max-width: 1439px) {
      justify-content: space-between;
    }
  }

  &__conditions_ctas {
    display: flex;
    flex-direction: column;
    gap: 10px;

    a,
    button.partner__conditions_button {
      text-decoration: none;
    }

    button.partner__conditions_button {
      font: inherit;
      text-align: center;
      cursor: pointer;
    }
  }

  &__conditions_info,
  &__referral_info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__conditions_desc,
  &__referral_desc {
    color: var(--text-gray);
  }

  &__conditions_copy {
    width: 100%;
    padding: 15px 20px;
    color: var(--text);
    background-color: var(--bg);
    border: 1px solid var(--text);
    transition: background-color 0.15s linear, border-color 0.15s linear, color 0.15s linear;
    cursor: pointer;

    &:hover:not(:disabled) {
      color: var(--white);
      background-color: var(--color);
      border-color: var(--color);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    span {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
      text-transform: uppercase;
      overflow: hidden;
    }

    &_with-icon {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    }
  }

  &__referral_link {
    position: relative;
  }

  &__copy_success {
    position: absolute;
    top: -30px;
    right: 0;
    background-color: var(--color);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;

    @media (max-width: 767px) {
      top: auto;
      bottom: -25px;
    }
  }

  &__referral_notice {
    width: 100%;
  }

  &__link{
    span{
      font-family: var(--text-font);
      font-weight: 400;
      letter-spacing: 0;
      color: var(--white);
      font-size: 14px;
      line-height: 140%;
    }
  }

  &__conditions_modal_overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    background: rgba(0, 0, 0, 0.45);
  }

  &__conditions_modal {
    display: flex;
    flex-direction: column;
    max-width: 640px;
    width: 100%;
    max-height: min(90vh, 900px);
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
    border-radius: 4px;
    overflow: hidden;
  }

  &__conditions_modal_header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }

  &__conditions_modal_title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 110%;
    text-transform: uppercase;
  }

  &__conditions_modal_close {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    padding: 0;
    margin: -8px -8px -8px 0;
    border: none;
    background: transparent;
    font-size: 28px;
    line-height: 100%;
    color: var(--text-gray);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
      color: var(--text);
    }
  }

  &__conditions_modal_body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px 28px;
    font-size: 14px;
    line-height: 140%;
    color: var(--text);
  }

  &__conditions_modal_section {
    margin-bottom: 22px;

    &:last-of-type {
      margin-bottom: 16px;
    }
  }

  &__conditions_modal_heading {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    text-transform: none;
  }

  &__conditions_modal_defs {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__conditions_modal_list {
    margin: 0;
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      padding-left: 4px;
    }
  }

  &__conditions_modal_footer_text {
    margin: 0;
    font-weight: 500;
  }
}
</style>