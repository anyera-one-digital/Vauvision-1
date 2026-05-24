export type QuizSocialUrlValidationError = 'empty' | 'invalid' | 'no_path' | 'wrong_host';

const RUSSIA_HOSTS = new Set(['vk.com', 'vk.ru']);
const INTERNATIONAL_HOSTS = new Set([
  'instagram.com',
  'telegram.org',
  't.me',
  'telegram.me',
]);

/** Добавляет https://, если протокола нет. */
export function normalizeQuizUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseQuizUrl(value: string): URL | null {
  try {
    return new URL(normalizeQuizUrl(value));
  } catch {
    return null;
  }
}

/** После домена должно быть продолжение: /username, /id123, /@channel и т.д. */
export function hasUrlPathSegment(value: string): boolean {
  const url = parseQuizUrl(value);
  if (!url) return false;

  const segments = url.pathname.split('/').filter(Boolean);
  return segments.length > 0 && segments.every((segment) => segment.length > 0);
}

export function isValidQuizSocialUrl(value: string): boolean {
  const url = parseQuizUrl(value);
  if (!url) return false;
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  return hasUrlPathSegment(value);
}

export function parseCommaSeparatedUrls(value: string): string[] {
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

export function normalizeCommaSeparatedUrls(value: string): string {
  return parseCommaSeparatedUrls(value)
    .map(normalizeQuizUrl)
    .join(', ');
}

export function areAllQuizSocialUrlsValid(value: string): boolean {
  const links = parseCommaSeparatedUrls(value);
  if (links.length === 0) return false;
  return links.every(isValidQuizSocialUrl);
}

export function isAllowedContractSocialHost(url: URL, region: string): boolean {
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (region === 'Russia') {
    return RUSSIA_HOSTS.has(host);
  }
  return INTERNATIONAL_HOSTS.has(host);
}

export function validateContractSocialLink(
  value: string,
  region: string,
): { ok: true } | { ok: false; error: QuizSocialUrlValidationError } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: 'empty' };
  }

  const url = parseQuizUrl(trimmed);
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, error: 'invalid' };
  }

  if (!hasUrlPathSegment(trimmed)) {
    return { ok: false, error: 'no_path' };
  }

  if (!isAllowedContractSocialHost(url, region)) {
    return { ok: false, error: 'wrong_host' };
  }

  return { ok: true };
}

export function getSocialLinksValidationError(value: string): QuizSocialUrlValidationError | null {
  const links = parseCommaSeparatedUrls(value);
  if (links.length === 0) {
    return 'empty';
  }

  for (const link of links) {
    const url = parseQuizUrl(link);
    if (!url || !['http:', 'https:'].includes(url.protocol)) {
      return 'invalid';
    }
    if (!hasUrlPathSegment(link)) {
      return 'no_path';
    }
  }

  return null;
}

export function getContractSocialLinkErrorMessage(
  error: QuizSocialUrlValidationError,
  region: string,
): string {
  switch (error) {
    case 'empty':
      return 'Ссылка на страницу обязательна для заполнения';
    case 'invalid':
      return 'Укажите корректную ссылку';
    case 'no_path':
      return 'Укажите ссылку на страницу, а не только домен';
    case 'wrong_host':
      return region === 'Russia'
        ? 'Ссылка должна вести на VK (vk.com или vk.ru)'
        : 'Ссылка должна вести на Instagram, Telegram или t.me';
  }
}

export function getSocialLinksErrorMessage(error: QuizSocialUrlValidationError): string {
  switch (error) {
    case 'empty':
      return 'Укажите ссылки на соцсети';
    case 'invalid':
      return 'Укажите корректные ссылки на соцсети';
    case 'no_path':
      return 'Укажите полные ссылки на страницы, а не только домены';
    case 'wrong_host':
      return 'Укажите корректные ссылки на соцсети';
  }
}
