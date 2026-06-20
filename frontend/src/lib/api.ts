export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ApiError(data?.error?.message ?? '通信に失敗しました', response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const yen = (value = 0) => new Intl.NumberFormat('ja-JP', {
  style: 'currency', currency: 'JPY', maximumFractionDigits: 0,
}).format(value);
export const shortDate = (value: string) => {
  const source = value.includes('T') ? value : `${value}T00:00:00`;
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(new Date(source));
};
