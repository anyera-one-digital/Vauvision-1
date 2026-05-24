import { ref, computed } from "vue";
import router from "@/router";
import { postUrlEncodedRequest, sendRequest } from "@/utils/api";
import { fetchSharedCabinetGetData } from "@/utils/fetchSharedCabinetGetData";
import Tr from "@/i18n/translation";

export interface LabelArtist {
  id: string;
  pseudonym: string;
}

const ADD_LABEL_USER_URL = "/ajax_vue/ajax/profile/addLableUser.php";
const AUTH_LABEL_USER_URL = "/ajax_vue/ajax/profile/authLableUser.php";
const LABEL_RETURN_USER_SS = "vauvision_label_return_user_id";
const LABEL_GROUP_ROSTER_SS = "vauvision_label_group_roster";
const LABEL_CONTEXT_SS = "vauvision_label_context_group";

/** Ключи sessionStorage переключателя лейбла — сохранять при полном сбросе квиза. */
export const SESSION_STORAGE_KEYS_PRESERVE_ON_QUIZ_RESET = [
  LABEL_RETURN_USER_SS,
  LABEL_GROUP_ROSTER_SS,
  LABEL_CONTEXT_SS,
] as const;

interface LabelContextSnapshot {
  groupId: string | number;
  groupName: string;
}

function readStoredLabelReturnUserId(): string | null {
  try {
    const v = sessionStorage.getItem(LABEL_RETURN_USER_SS);
    if (v == null || String(v).trim() === "") return null;
    return String(v).trim();
  } catch {
    return null;
  }
}

function readStoredLabelGroupRoster(): LabelArtist[] {
  try {
    const raw = sessionStorage.getItem(LABEL_GROUP_ROSTER_SS);
    if (!raw) return [];
    const arr = JSON.parse(raw) as LabelArtist[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStoredLabelGroupRoster(list: LabelArtist[]) {
  try {
    sessionStorage.setItem(LABEL_GROUP_ROSTER_SS, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function readStoredLabelContext(): LabelContextSnapshot | null {
  try {
    const raw = sessionStorage.getItem(LABEL_CONTEXT_SS);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const gid = o.groupId;
    const gname = o.groupName;
    if (gid == null || gid === "") return null;
    const nameStr =
      typeof gname === "string" ? gname.trim() : String(gname ?? "").trim();
    if (!nameStr) return null;
    const n = Number(gid);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { groupId: gid as string | number, groupName: nameStr };
  } catch {
    return null;
  }
}

function writeStoredLabelContext(ctx: LabelContextSnapshot) {
  try {
    sessionStorage.setItem(LABEL_CONTEXT_SS, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function clearStoredLabelReturnUserId() {
  try {
    sessionStorage.removeItem(LABEL_RETURN_USER_SS);
    sessionStorage.removeItem(LABEL_GROUP_ROSTER_SS);
    sessionStorage.removeItem(LABEL_CONTEXT_SS);
  } catch {
    /* ignore */
  }
  labelReturnUserId.value = null;
}

function deriveMaxBitrixGroupId(groups: unknown): number | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const nums = groups
    .map((g) => Number(g))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  const maxG = Math.max(...nums);
  return maxG > 4 ? maxG : null;
}

export const labelGroupId = ref<string | number>(0);
export const labelGroupName = ref("");
export const apiLabelArtists = ref<LabelArtist[]>([]);
export const apiIsLabel = ref(false);
export const apiHasLabelGroupContext = ref(false);
export const artistsRootRef = ref<HTMLElement | null>(null);
export const artistsDropdownOpen = ref(false);
export const labelArtists = ref<LabelArtist[]>([]);
export const addArtistModalOpen = ref(false);
export const newArtistPseudonym = ref("");
export const addArtistError = ref("");
export const addArtistSubmitting = ref(false);
export const showLabelArtistsSection = ref(false);
export const artistCabinetSwitching = ref(false);
export const bitrixUserId = ref("");
export const labelReturnUserId = ref<string | null>(readStoredLabelReturnUserId());
/** Логин из getData — для проверки псевдонима без привязки к Menu.userData */
export const labelMenuUserLogin = ref("");
/** Имя / фамилия из getData — публичное отображение может отличаться от логина */
export const labelMenuUserName = ref("");
export const labelMenuUserLastName = ref("");

function normalizeAliasForCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Ввод совпадает с логином или с отображаемым именем (отдельно или «имя фамилия» в любом порядке). */
function isSameAsCurrentUserIdentity(artistName: string): boolean {
  const input = normalizeAliasForCompare(artistName);
  if (!input) return false;
  const candidates = new Set<string>();
  const add = (v: string) => {
    const n = normalizeAliasForCompare(v);
    if (n) candidates.add(n);
  };
  add(labelMenuUserLogin.value);
  add(labelMenuUserName.value);
  add(labelMenuUserLastName.value);
  const nm = labelMenuUserName.value;
  const fn = labelMenuUserLastName.value;
  add([nm, fn].filter(Boolean).join(" "));
  add([fn, nm].filter(Boolean).join(" "));
  return candidates.has(input);
}

function mapGroupMembers(members: unknown): LabelArtist[] {
  if (!Array.isArray(members)) return [];
  const out: LabelArtist[] = [];
  for (const raw of members) {
    const m = raw as Record<string, unknown>;
    const id = m.ID ?? m.id;
    if (id == null || id === "") continue;
    const login = String(m.LOGIN ?? m.login ?? "").trim();
    const name = String(m.NAME ?? m.name ?? "").trim();
    const lastName = String(m.LAST_NAME ?? m.lastName ?? "").trim();
    const pseudonym =
      login || [name, lastName].filter(Boolean).join(" ").trim() || "Артист";
    out.push({ id: String(id), pseudonym });
  }
  return out;
}

function syncLabelFromProfile(
  profile: Record<string, unknown> | null | undefined,
  user?: Record<string, unknown> | null
) {
  if (!profile) {
    apiIsLabel.value = false;
    apiHasLabelGroupContext.value = false;
    apiLabelArtists.value = [];
    labelGroupId.value = 0;
    labelGroupName.value = "";
    return;
  }
  const uf = user?.uf as Record<string, unknown> | undefined;
  const isLabel =
    profile.isLabel === true ||
    uf?.UF_LEBL === 1 ||
    uf?.UF_LEBL === "1";
  apiIsLabel.value = !!isLabel;
  apiLabelArtists.value = mapGroupMembers(profile.groupMembers);

  const derived = deriveMaxBitrixGroupId(user?.groups);
  const gid =
    profile.maxGroup ?? profile.groupId ?? profile.labelGroupId ?? derived;
  const n = gid == null || gid === "" ? NaN : Number(gid);
  if (Number.isFinite(n) && n > 0) {
    labelGroupId.value = gid as string | number;
  } else {
    labelGroupId.value = 0;
  }
  const gname = profile.groupName;
  labelGroupName.value =
    typeof gname === "string" ? gname.trim() : String(gname ?? "").trim();
  apiHasLabelGroupContext.value =
    apiLabelArtists.value.length > 0 ||
    !!(Number.isFinite(n) && n > 0) ||
    deriveMaxBitrixGroupId(user?.groups) != null;
}

function parseAddLableUserPhpResponse(
  raw: unknown
): { ok: true; userId: string } | { ok: false; message: string } {
  const rawStr =
    raw === null || raw === undefined ? "" : String(raw).replace(/^\uFEFF/, "");
  const noTags = rawStr.replace(/<[^>]+>/g, " ");
  const s = noTags.trim();
  const pickNumericId = (text: string): string | null => {
    const t = text.trim();
    if (/^\d+$/.test(t)) return t;
    const lines = t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(lines[i])) return lines[i];
    }
    return null;
  };
  const idStr = pickNumericId(s);
  if (idStr) {
    const n = parseInt(idStr, 10);
    if (n > 0) return { ok: true, userId: idStr };
  }
  if (s === "" || s === "0") {
    return {
      ok: false,
      message:
        "Такой артист уже существует в нашей системе. Укажите уникальный псевдоним, либо обратитесь в нашу поддержку.",
    };
  }
  return { ok: false, message: s };
}

export const viewingArtistAsLabelManager = computed(() => {
  const ret = labelReturnUserId.value;
  const cur = bitrixUserId.value;
  if (!ret) return false;
  if (!cur) return true;
  return String(ret) !== String(cur);
});

/** Роли аккаунта на основе getData.php + клиентского контекста. */
export const isLabelOwner = computed(() => apiIsLabel.value);
export const isLabelMember = computed(
  () => !isLabelOwner.value && apiHasLabelGroupContext.value
);
export const isSoloArtist = computed(
  () => !isLabelOwner.value && !isLabelMember.value
);

export const hasOtherArtistsInRoster = computed(() => {
  const list = labelArtists.value;
  const cur = bitrixUserId.value;
  if (!list.length) return false;
  if (!cur) return list.length > 1;
  return list.some((a) => String(a.id) !== String(cur));
});

export const useDropdownArtistList = computed(() => {
  if (viewingArtistAsLabelManager.value) return true;
  if ((isLabelOwner.value || isLabelMember.value) && hasOtherArtistsInRoster.value) {
    return true;
  }
  return false;
});

export const canAddArtistFromMenu = computed(
  () => isLabelOwner.value || viewingArtistAsLabelManager.value || isSoloArtist.value
);

export const showStandaloneAddArtist = computed(
  () => !useDropdownArtistList.value && canAddArtistFromMenu.value
);

/** Псевдоним текущего кабинета в ростере лейбла или отображаемое имя / логин из getData */
export const labelCabinetPseudonym = computed(() => {
  const id = bitrixUserId.value;
  const fromRoster = id
    ? labelArtists.value.find((a) => String(a.id) === String(id))
    : undefined;
  const pseudo = (fromRoster?.pseudonym ?? "").trim();
  if (pseudo) return pseudo;
  const login = labelMenuUserLogin.value.trim();
  const nm = labelMenuUserName.value.trim();
  const fn = labelMenuUserLastName.value.trim();
  const fromProfile =
    login || [nm, fn].filter(Boolean).join(" ").trim();
  return fromProfile || login;
});

export function refreshLabelArtists() {
  labelReturnUserId.value = readStoredLabelReturnUserId();
  const ret = labelReturnUserId.value;
  const cur = bitrixUserId.value;
  const viewingMgr = !!ret && (!cur || String(ret) !== String(cur));

  let merged = [...apiLabelArtists.value];
  if (viewingMgr) {
    const snap = readStoredLabelGroupRoster();
    if (snap.length) {
      const byId = new Map<string, LabelArtist>();
      for (const a of snap) byId.set(a.id, { ...a });
      for (const a of merged) byId.set(a.id, { ...a });
      merged = Array.from(byId.values());
    }
    if (!merged.length && snap.length) {
      merged = [...snap];
    }
  }

  labelArtists.value = merged;
  if (viewingMgr) {
    const ctx = readStoredLabelContext();
    const badGroup =
      !labelGroupId.value ||
      labelGroupId.value === 0 ||
      labelGroupId.value === "" ||
      !String(labelGroupName.value || "").trim();
    if (badGroup && ctx) {
      labelGroupId.value = ctx.groupId;
      labelGroupName.value = ctx.groupName;
    }
  }
  showLabelArtistsSection.value = true;
  if (!useDropdownArtistList.value) {
    artistsDropdownOpen.value = false;
  }
}

/**
 * Вызов из fetchUserData Menu / Header после ответа getData.
 */
export function syncLabelMenuFromGetDataResponse(
  data: Record<string, unknown> | null | undefined
) {
  if (!data) return;
  const u = data.user as Record<string, unknown> | undefined;
  if (u) {
    const uid = u.id;
    bitrixUserId.value =
      uid != null && uid !== "" ? String(uid) : "";
    labelMenuUserLogin.value = String(u.login ?? "");
    labelMenuUserName.value = String(u.name ?? "").trim();
    labelMenuUserLastName.value = String(
      u.lastName ?? u.LAST_NAME ?? ""
    ).trim();
  } else {
    bitrixUserId.value = "";
    labelMenuUserLogin.value = "";
    labelMenuUserName.value = "";
    labelMenuUserLastName.value = "";
  }
  if (data.profile) {
    syncLabelFromProfile(
      data.profile as Record<string, unknown>,
      u ?? null
    );
  }
  const storedRet = readStoredLabelReturnUserId();
  if (
    storedRet &&
    bitrixUserId.value &&
    String(storedRet) === String(bitrixUserId.value)
  ) {
    clearStoredLabelReturnUserId();
  }
  refreshLabelArtists();
}

export type LabelShellGetDataPayload = Record<string, unknown>;

const externalRefreshFns = new Set<
  (prefetched?: LabelShellGetDataPayload) => Promise<void>
>();

export function registerLabelArtistsExternalRefresh(
  fn: (prefetched?: LabelShellGetDataPayload) => Promise<void>
): () => void {
  externalRefreshFns.add(fn);
  return () => externalRefreshFns.delete(fn);
}

async function runExternalRefreshes(prefetched?: LabelShellGetDataPayload) {
  await Promise.all(
    [...externalRefreshFns].map((f) =>
      f(prefetched).catch(() => {
        /* ignore */
      })
    )
  );
}

export function toggleArtistsDropdown() {
  artistsDropdownOpen.value = !artistsDropdownOpen.value;
}

export async function openArtistCabinet(id: string) {
  if (artistCabinetSwitching.value) return;
  artistsDropdownOpen.value = false;
  if (!/^\d+$/.test(id)) {
    router.push(Tr.i18nRoute({ name: "personal", query: { artist: id } }));
    return;
  }
  if (apiIsLabel.value && bitrixUserId.value) {
    try {
      sessionStorage.setItem(LABEL_RETURN_USER_SS, String(bitrixUserId.value));
      labelReturnUserId.value = String(bitrixUserId.value);
      writeStoredLabelGroupRoster(labelArtists.value);
      writeStoredLabelContext({
        groupId: labelGroupId.value,
        groupName: labelGroupName.value,
      });
    } catch {
      /* ignore */
    }
  }
  artistCabinetSwitching.value = true;
  try {
    await postUrlEncodedRequest(AUTH_LABEL_USER_URL, { ID: id });
    const response = await fetchSharedCabinetGetData();
    const data = response?.data as LabelShellGetDataPayload | undefined;
    if (!data) {
      throw new Error("empty getData after auth");
    }
    syncLabelMenuFromGetDataResponse(data);
    await runExternalRefreshes(data);
    await router.replace(Tr.i18nRoute({ name: "personal" }));
  } catch {
    alert("Не удалось перейти в кабинет артиста. Повторите попытку.");
  } finally {
    artistCabinetSwitching.value = false;
  }
}

export function openAddArtistModal() {
  if (!canAddArtistFromMenu.value) return;
  addArtistError.value = "";
  newArtistPseudonym.value = "";
  addArtistModalOpen.value = true;
  artistsDropdownOpen.value = false;
}

export function closeAddArtistModal() {
  addArtistModalOpen.value = false;
  addArtistError.value = "";
}

/** Поля наследования с «головного» лейбла для addLableUser.php (бэкенд может игнорировать неизвестные ключи). */
async function buildNewArtistInheritFieldsFromLabelProfile(): Promise<
  Record<string, string>
> {
  try {
    const res = await fetchSharedCabinetGetData();
    const data = res.data as Record<string, unknown> | undefined;
    const out: Record<string, string> = {};
    if (!data) return out;
    const user = data.user as Record<string, unknown> | undefined;
    const profile = data.profile as Record<string, unknown> | undefined;
    const settings = data.settings as Record<string, unknown> | undefined;
    const email = String(user?.email ?? "").trim();
    const region = String(profile?.region ?? "").trim();
    if (email) out.INHERIT_EMAIL = email;
    if (region) out.INHERIT_REGION = region;
    const req = settings?.requisites as
      | {
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
          international?: {
            binancePayId?: string;
            cardNumber?: string;
            cryptoWallet?: string;
          };
        }
      | undefined;
    if (!req) return out;
    if (req.international) {
      out.INHERIT_REK_TYPE = "intl";
      const i = req.international;
      const b = String(i?.binancePayId ?? "").trim();
      const c = String(i?.cardNumber ?? "").trim();
      const w = String(i?.cryptoWallet ?? "").trim();
      if (b) out.INHERIT_CART = b;
      if (c) out.INHERIT_CART_NAME = c;
      if (w) out.INHERIT_PAYPAL = w;
      return out;
    }
    const ent = req.entrepreneur;
    const useIp =
      String(ent?.fullName ?? "").trim() || String(ent?.ogrnip ?? "").trim();
    if (useIp && ent) {
      out.INHERIT_REK_TYPE = "ip";
      const put = (k: string, v: unknown) => {
        const s = String(v ?? "").trim();
        if (s) out[k] = s;
      };
      put("INHERIT_IP_SP", ent.fullName);
      put("INHERIT_IP_OGRNIP", ent.ogrnip);
      put("INHERIT_IP_ADDR", ent.address);
      put("INHERIT_IP_INN", ent.inn);
      put("INHERIT_IP_RS", ent.account);
      put("INHERIT_IP_BANK", ent.bankName);
      put("INHERIT_IP_BANK_INN", ent.bankInn);
      put("INHERIT_IP_BIK", ent.bik);
      put("INHERIT_IP_KS", ent.correspondentAccount);
      put("INHERIT_IP_EMAIL", ent.email);
    } else if (req.individual) {
      out.INHERIT_REK_TYPE = "fl";
      const ind = req.individual;
      const fn = String(ind.fullName ?? "").trim();
      const acc = String(ind.account ?? "").trim();
      const bik = String(ind.bik ?? "").trim();
      if (fn) out.INHERIT_FL_SP = fn;
      if (acc) out.INHERIT_FL_RS = acc;
      if (bik) out.INHERIT_FL_BIK = bik;
    }
    return out;
  } catch {
    return {};
  }
}

export async function submitNewArtist() {
  if (!canAddArtistFromMenu.value) {
    addArtistError.value = "Добавление артистов доступно только кабинету лейбла.";
    return;
  }
  addArtistError.value = "";
  const artistName = newArtistPseudonym.value.trim();
  if (!artistName) {
    addArtistError.value = "Введите псевдоним.";
    return;
  }

  if (isSameAsCurrentUserIdentity(artistName)) {
    addArtistError.value =
      "Укажите другой псевдоним, отличный от вашего логина и отображаемого имени — так вы добавите артиста и перейдёте в формат лейбла.";
    return;
  }

  /**
   * addLableUser.php: группа создаётся/ищется по логину владельца; LABLE/nameLable в запросе
   * для актуального скрипта не участвуют в полях нового пользователя — передаём их при наличии
   * из getData для совместимости, иначе пустые строки.
   */
  const loginTrim = labelMenuUserLogin.value.trim();
  const gid = labelGroupId.value;
  const gidNum = gid === "" || gid == null ? NaN : Number(gid);
  const hasProfileGroup =
    Number.isFinite(gidNum) && gidNum > 0 && String(labelGroupName.value || "").trim() !== "";
  const lable = hasProfileGroup ? String(gid) : "";
  const nameLable = hasProfileGroup
    ? String(labelGroupName.value).trim()
    : loginTrim;

  addArtistSubmitting.value = true;
  try {
    const inherit = await buildNewArtistInheritFieldsFromLabelProfile();
    const response = await postUrlEncodedRequest(ADD_LABEL_USER_URL, {
      LABLE: lable,
      nameLable,
      NEW_USER_LABLE: artistName,
      ...inherit,
    });

    const parsed = parseAddLableUserPhpResponse(response.data);
    if (!parsed.ok) {
      addArtistError.value = parsed.message;
      return;
    }

    await runExternalRefreshes();
    closeAddArtistModal();
  } catch {
    addArtistError.value = "Ошибка сети. Повторите попытку.";
  } finally {
    addArtistSubmitting.value = false;
  }
}

function onDocumentClick(e: MouseEvent) {
  if (!artistsDropdownOpen.value) return;
  const el = artistsRootRef.value;
  if (el && e.target instanceof Node && !el.contains(e.target)) {
    artistsDropdownOpen.value = false;
  }
}

let docClickRegistrations = 0;

export function labelArtistsMenuAttachDocumentClick() {
  if (typeof document === "undefined") return;
  if (docClickRegistrations++ === 0) {
    document.addEventListener("click", onDocumentClick);
  }
}

export function labelArtistsMenuDetachDocumentClick() {
  if (typeof document === "undefined") return;
  if (--docClickRegistrations <= 0) {
    docClickRegistrations = 0;
    document.removeEventListener("click", onDocumentClick);
  }
}
