
export const formatInteger = (value: string | number): string =>
  String(Math.floor(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatRupiah = (
  value: string | number | null | undefined,
  fallback = "-"
): string => {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? fallback : num.toLocaleString("id-ID");
};

export const parseRupiah = (
  value: string | number | null | undefined
): number => Number(String(value ?? 0).replace(/\./g, "")) || 0;