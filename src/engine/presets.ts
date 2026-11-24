import type { LoanInput } from '../types/finance';

export interface LoanPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  patch: Partial<LoanInput>;
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_LOAN_INPUT: LoanInput = {
  principal: 50000,
  useDownPayment: false,
  assetPrice: 65000,
  downPaymentPercent: 20,
  currency: 'PEN',
  termValue: 5,
  termUnit: 'years',
  frequency: 'monthly',
  ratePercent: 14.5,
  rateType: 'TEA',
  compounding: 'monthly',
  method: 'french',
  sbsMode: false,
  graceType: 'none',
  gracePeriods: 0,
  desgravamenMonthlyPercent: 0.05,
  fixedFeePerPeriod: 10,
  startDate: getTodayIso(),
  academic: {
    university: 'Universidad Tecnológica del Perú (UTP)',
    course: 'Ingeniería Económica',
    professor: '',
    studentOrGroup: 'Lindbergh Paredes y Jesus Garcia',
  },
};

export const PERU_PRESETS: LoanPreset[] = [
  {
    id: 'vehicular-5y',
    name: 'Crédito Vehicular',
    badge: '5 años · 60 cuotas',
    description: 'S/ 60,000 a 5 años con TEA 14.5% (Método Francés)',
    patch: {
      principal: 60000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 5,
      termUnit: 'years',
      frequency: 'monthly',
      ratePercent: 14.5,
      rateType: 'TEA',
      method: 'french',
    },
  },
  {
    id: 'hipotecario-20y',
    name: 'Hipotecario MiVivienda',
    badge: '20 años · 240 cuotas',
    description: 'S/ 250,000 a 20 años con TEA 8.9% (Largo plazo)',
    patch: {
      principal: 250000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 20,
      termUnit: 'years',
      frequency: 'monthly',
      ratePercent: 8.9,
      rateType: 'TEA',
      method: 'french',
    },
  },
  {
    id: 'personal-3y',
    name: 'Préstamo Personal',
    badge: '3 años · 36 cuotas',
    description: 'S/ 15,000 a 36 meses con TEA 22.0%',
    patch: {
      principal: 15000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 36,
      termUnit: 'months',
      frequency: 'monthly',
      ratePercent: 22,
      rateType: 'TEA',
      method: 'french',
    },
  },
  {
    id: 'mype-sbs-10y',
    name: 'Crédito MYPE (SBS)',
    badge: '10 años · Gracia',
    description: 'S/ 120,000 a 10 años, TEA 16.5%, Modo SBS + 3 meses gracia parcial',
    patch: {
      principal: 120000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 10,
      termUnit: 'years',
      frequency: 'monthly',
      ratePercent: 16.5,
      rateType: 'TEA',
      method: 'french',
      sbsMode: true,
      graceType: 'partial',
      gracePeriods: 3,
      desgravamenMonthlyPercent: 0.055,
      fixedFeePerPeriod: 12,
    },
  },
];
