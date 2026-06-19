export const text = (form: FormData, key: string, fallback = '') =>
  String(form.get(key) ?? fallback).trim();

export const requiredText = (form: FormData, key: string) => {
  const value = text(form, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
};

export const number = (form: FormData, key: string, fallback?: number) => {
  const raw = form.get(key);
  if (raw === null || raw === '') {
    if (fallback === undefined) throw new Error(`${key} is required`);
    return fallback;
  }
  const value = globalThis.Number(raw);
  if (Number.isNaN(value)) throw new Error(`${key} must be a number`);
  return value;
};

export const boolean = (form: FormData, key: string, fallback = false) => {
  const raw = form.get(key);
  if (raw === null) return fallback;
  return ['true', '1', 'on', 'yes'].includes(String(raw));
};

export const optionalNullableText = (form: FormData, key: string) => {
  const value = text(form, key);
  return value || null;
};

export const redirectPath = (resource: string) => {
  switch (resource) {
    case 'accounts':
      return '/accounts';
    case 'cards':
      return '/cards';
    case 'categories':
      return '/categories';
    case 'cycles':
      return '/cycles';
    case 'expenses':
      return '/expenses';
    case 'incomes':
      return '/incomes';
    case 'statements':
      return '/statements';
    default:
      return '/';
  }
};
