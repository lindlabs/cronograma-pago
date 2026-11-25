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
  principal: 48000,
  useDownPayment: false,
  assetPrice: 60000,
  downPaymentPercent: 20,
  currency: 'PEN',
  termValue: 4,
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
    studentOrGroup: 'Lindbergh Paredes',
  },
};

export const PERU_PRESETS: LoanPreset[] = [
  {
    id: 'vehicular-4y',
    name: 'Crédito Vehicular',
    badge: '4 años · 48 cuotas',
    description: 'S/ 60,000 a 48 meses (plazo máx.) con TEA 14.5%',
    patch: {
      principal: 60000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 4,
      termUnit: 'years',
      frequency: 'monthly',
      ratePercent: 14.5,
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
    id: 'educativo-2y',
    name: 'Crédito Educativo',
    badge: '2 años · 24 cuotas',
    description: 'S/ 18,000 a 24 meses con TEA 12.5%',
    patch: {
      principal: 18000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 24,
      termUnit: 'months',
      frequency: 'monthly',
      ratePercent: 12.5,
      rateType: 'TEA',
      method: 'french',
    },
  },
  {
    id: 'mype-sbs-4y',
    name: 'Crédito MYPE (SBS)',
    badge: '4 años · Gracia',
    description: 'S/ 80,000 a 48 meses, TEA 16.5%, Modo SBS + 3 meses gracia parcial',
    patch: {
      principal: 80000,
      useDownPayment: false,
      currency: 'PEN',
      termValue: 4,
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
