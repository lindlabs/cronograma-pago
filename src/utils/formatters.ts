import type { AmortizationMethod, CurrencyCode, GraceType } from '../types/finance';

export function currencySymbol(currency: CurrencyCode): string {
  return currency === 'PEN' ? 'S/' : 'US$';
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol(currency)} ${formatted}`;
}

export function formatNumber(value: number, decimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(decimalRate: number, decimals = 2): string {
  const safe = Number.isFinite(decimalRate) ? decimalRate * 100 : 0;
  return `${safe.toFixed(decimals)}%`;
}

export function formatIsoDateEsPe(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function methodLabel(method: AmortizationMethod): string {
  switch (method) {
    case 'french':
      return 'Francés (Cuota Constante)';
    case 'german':
      return 'Alemán (Amortización Constante)';
    case 'american':
      return 'Americano (Capital al Final)';
  }
}

export function graceLabel(graceType: GraceType, gracePeriods: number): string {
  if (graceType === 'none' || gracePeriods <= 0) return 'Sin periodo de gracia';
  const suffix = gracePeriods === 1 ? 'periodo' : 'periodos';
  return graceType === 'total'
    ? `Gracia Total (${gracePeriods} ${suffix})`
    : `Gracia Parcial (${gracePeriods} ${suffix})`;
}
