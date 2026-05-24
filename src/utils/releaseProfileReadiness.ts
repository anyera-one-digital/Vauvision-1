/**
 * Проверка: паспортные данные и реквизиты заполнены так же,
 * как требует форма релиза (Quiz4) и страница настроек.
 */

export type ReleaseProfileFocus = "passport" | "requisites";

export interface ReleaseProfileReadiness {
  ok: boolean;
  /** Куда вести на странице настроек */
  focus: ReleaseProfileFocus;
  /** Человекочитаемо — для подсказок */
  missing: string[];
}

function trimStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Одно UF-поле: getDataForm отдаёт плоские `uf_*`, getData.php — вложенный `user.uf` с ключами UF_*.
 */
function pickUfField(
  formUser: Record<string, unknown> | null | undefined,
  dataUser: Record<string, unknown> | null | undefined,
  lowerKey: string,
  upperKey: string
): string {
  const formNested = formUser?.uf as Record<string, unknown> | undefined;
  const dataNested = dataUser?.uf as Record<string, unknown> | undefined;

  const candidates: unknown[] = [
    formUser?.[lowerKey],
    formUser?.[upperKey],
    formNested?.[upperKey],
    formNested?.[lowerKey],
    dataUser?.[lowerKey],
    dataUser?.[upperKey],
    dataNested?.[upperKey],
    dataNested?.[lowerKey],
  ];

  for (const c of candidates) {
    const s = trimStr(c);
    if (s) return s;
  }
  return "";
}

/**
 * Паспорт: совпадает с логикой ajax_vue/ajax/getData.php (`passportFilled`) +
 * непустое гражданство (как проверка в getDataForm.php для test_status).
 *
 * Раньше здесь повторялись жёсткие правила Quiz4 (отчество от 2 символов, ровно 10 цифр серии),
 * из‑за чего блокировался доступ при уже сохранённых в БД данных (без отчества или нестандартная серия).
 */
export function isPassportCompleteFromFormUser(
  formUser: Record<string, unknown> | null | undefined,
  dataUser?: Record<string, unknown> | null | undefined
): boolean {
  const fam = pickUfField(formUser, dataUser ?? null, "uf_fam", "UF_FAM");
  const imya = pickUfField(formUser, dataUser ?? null, "uf_imya", "UF_IMYA");
  const data = pickUfField(formUser, dataUser ?? null, "uf_data", "UF_DATA");
  const vydan = pickUfField(formUser, dataUser ?? null, "uf_vydan", "UF_VYDAN");
  const address = pickUfField(formUser, dataUser ?? null, "uf_address", "UF_ADDRESS");
  const grazh = pickUfField(
    formUser,
    dataUser ?? null,
    "uf_grazhdanstvo",
    "UF_GRAZHDANSTVO"
  );

  if (!fam || !imya || !data || !vydan || !address) return false;
  if (!grazh) return false;

  const seriyaSrc = pickUfField(formUser, dataUser ?? null, "uf_seriya", "UF_SERIYA");
  const seriyaCompact = seriyaSrc.replace(/\s/g, "");
  // как empty(UF_SERIYA) в PHP + минимальная длина (не один символ‑мусор)
  if (!seriyaCompact || seriyaCompact.length < 4) return false;

  return true;
}

export interface RequisitesPayload {
  individual?: {
    fullName?: string;
    account?: string;
    bik?: string;
  };
  entrepreneur?: {
    fullName?: string;
    ogrnip?: string;
    address?: string;
    inn?: string;
    account?: string;
    bankName?: string;
    bankInn?: string;
    bik?: string;
    correspondentAccount?: string;
    email?: string;
  };
  /** Не-РФ: getData.php → binance / карта / USDT */
  international?: {
    binancePayId?: string;
    cardNumber?: string;
    cryptoWallet?: string;
  };
}

export function useEntrepreneurRequisitesType(
  requisites: RequisitesPayload | null | undefined
): boolean {
  const ent = requisites?.entrepreneur;
  return !!(trimStr(ent?.fullName) || trimStr(ent?.ogrnip));
}

export function isIndividualRequisitesComplete(
  requisites: RequisitesPayload | null | undefined
): boolean {
  const ind = requisites?.individual;
  return !!(
    trimStr(ind?.fullName) &&
    trimStr(ind?.account) &&
    trimStr(ind?.bik)
  );
}

export function isEntrepreneurRequisitesComplete(
  requisites: RequisitesPayload | null | undefined
): boolean {
  const e = requisites?.entrepreneur;
  if (!e) return false;
  const email = trimStr(e.email);
  return !!(
    trimStr(e.fullName) &&
    trimStr(e.ogrnip) &&
    trimStr(e.address) &&
    trimStr(e.inn) &&
    trimStr(e.account) &&
    trimStr(e.bankName) &&
    trimStr(e.bankInn) &&
    trimStr(e.bik) &&
    trimStr(e.correspondentAccount) &&
    email &&
    validateEmail(email)
  );
}

/** Как в старом ЛК: достаточно одного из полей (UF_CART / UF_CART_NAME / UF_PAYPAL). */
export function isInternationalRequisitesComplete(
  requisites: RequisitesPayload | null | undefined
): boolean {
  const i = requisites?.international;
  if (!i) return false;
  return !!(
    trimStr(i.binancePayId) ||
    trimStr(i.cardNumber) ||
    trimStr(i.cryptoWallet)
  );
}

function requisitesIsInternational(
  requisites: RequisitesPayload | null | undefined
): boolean {
  return requisites != null && requisites.international != null;
}

export function evaluateReleaseProfileReadiness(
  formUser: Record<string, unknown> | null | undefined,
  requisites: RequisitesPayload | null | undefined,
  dataUser?: Record<string, unknown> | null | undefined
): ReleaseProfileReadiness {
  const missing: string[] = [];
  const passportOk = isPassportCompleteFromFormUser(formUser, dataUser);
  if (!passportOk) {
    missing.push("паспортные данные");
  }

  let bankOk: boolean;
  if (requisitesIsInternational(requisites)) {
    bankOk = isInternationalRequisitesComplete(requisites);
    if (!bankOk) {
      missing.push(
        "реквизиты для выплат (Binance ID / Pay ID, карта РФ или USDT BEP-20)"
      );
    }
  } else {
    const useIp = useEntrepreneurRequisitesType(requisites);
    bankOk = useIp
      ? isEntrepreneurRequisitesComplete(requisites)
      : isIndividualRequisitesComplete(requisites);
    if (!bankOk) {
      missing.push(useIp ? "реквизиты ИП" : "банковские реквизиты (физлицо)");
    }
  }

  if (passportOk && bankOk) {
    return { ok: true, focus: "passport", missing: [] };
  }
  return {
    ok: false,
    focus: passportOk ? "requisites" : "passport",
    missing,
  };
}

/**
 * Запросы getData + getDataForm (как в настройках и Quiz4).
 */
export async function fetchReleaseProfileReadiness(): Promise<ReleaseProfileReadiness> {
  const { sendRequest } = await import("@/utils/api");
  try {
    const { fetchSharedCabinetGetData } = await import(
      "@/utils/fetchSharedCabinetGetData"
    );
    const [dataRes, formRes] = await Promise.all([
      fetchSharedCabinetGetData(),
      sendRequest("post", "/ajax_vue/ajax/getDataForm.php", {}),
    ]);
    const data = dataRes.data as Record<string, unknown> | undefined;
    const form = formRes.data as Record<string, unknown> | undefined;
    const settings = data?.settings as Record<string, unknown> | undefined;
    const requisites = settings?.requisites as RequisitesPayload | undefined;
    const formUser = form?.user as Record<string, unknown> | undefined;
    const dataUser = data?.user as Record<string, unknown> | undefined;
    return evaluateReleaseProfileReadiness(formUser, requisites, dataUser);
  } catch {
    return { ok: true, focus: "passport", missing: [] };
  }
}
