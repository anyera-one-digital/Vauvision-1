type AliasValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

const QUIZ_ALIAS_ALLOWED_REGEX =
  /^[\p{L}\p{N} .,_'’"`«»„“”‚‘‹›~!@#$%^&*()+=[\]{}:;?\-–—·•]+$/u;
const QUIZ_ALIAS_MIN_LENGTH = 2;
const QUIZ_ALIAS_MAX_LENGTH = 64;
const MULTIPLE_ARTISTS_MARKERS = [
  /[,\/\\]/u,
  /\s(?:feat\.?|ft\.?|and)\s/iu,
  /\s[хx]\s/iu,
];

export const normalizeQuizAlias = (value: string): string =>
  String(value || "").trim().replace(/\s+/g, " ");

export const validateQuizAlias = (value: string): AliasValidationResult => {
  const normalized = normalizeQuizAlias(value);
  if (!normalized) {
    return { ok: false, message: "Псевдоним артиста обязателен для заполнения" };
  }
  if (normalized.length < QUIZ_ALIAS_MIN_LENGTH) {
    return {
      ok: false,
      message: `Псевдоним артиста должен содержать минимум ${QUIZ_ALIAS_MIN_LENGTH} символа`,
    };
  }
  if (normalized.length > QUIZ_ALIAS_MAX_LENGTH) {
    return {
      ok: false,
      message: `Псевдоним артиста должен содержать не более ${QUIZ_ALIAS_MAX_LENGTH} символов`,
    };
  }
  if (MULTIPLE_ARTISTS_MARKERS.some((pattern) => pattern.test(normalized))) {
    return {
      ok: false,
      message:
        "Укажите только одного артиста в этом поле. Полный состав артистов нужно указывать на 2 шаге при загрузке треков",
    };
  }
  if (!QUIZ_ALIAS_ALLOWED_REGEX.test(normalized)) {
    return {
      ok: false,
      message:
        "Псевдоним содержит недопустимые символы",
    };
  }
  return { ok: true, value: normalized };
};
