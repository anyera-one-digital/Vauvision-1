export type QuizPaymentReturnStatus = 'success' | 'error';

/**
 * CloudPayments / Bitrix иногда редиректят на
 * ?payment=error?InvId=123 — браузер читает payment как "error?InvId=123".
 */
export function parsePaymentQueryParam(
  raw: unknown,
): QuizPaymentReturnStatus | null {
  if (raw == null || raw === '') return null;
  const s = String(Array.isArray(raw) ? raw[0] : raw).trim().toLowerCase();
  if (!s) return null;
  const base = s.split('?')[0].split('&')[0];
  if (base === 'success' || base === 'error') return base;
  return null;
}

/** Нужно ли заменить query.payment на чистое значение success|error. */
export function paymentQueryNeedsNormalization(raw: unknown): boolean {
  if (raw == null) return false;
  const status = parsePaymentQueryParam(raw);
  if (!status) return false;
  const s = String(Array.isArray(raw) ? raw[0] : raw).trim();
  return s !== status;
}
