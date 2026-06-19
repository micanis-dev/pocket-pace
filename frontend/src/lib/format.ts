const yen = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const numeric = new Intl.NumberFormat('ja-JP');

export const formatYen = (value: number) => yen.format(value);
export const formatNumber = (value: number) => numeric.format(value);

export const formatDate = (value: string) =>
  value ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '-';
