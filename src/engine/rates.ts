import type {
  CompoundingFrequency,
  PaymentFrequency,
  RateBreakdown,
  RateInputType,
  TermUnit,
} from '../types/finance';

export interface FrequencyMeta {
  id: PaymentFrequency;
  label: string;
  shortLabel: string;
  periodsPerYear: number;
  daysPerPeriod: number;
  monthsPerPeriod: number;
  rateCode: string;
}

export const FREQUENCY_META: Record<PaymentFrequency, FrequencyMeta> = {
  monthly: {
    id: 'monthly',
    label: 'Mensual',
    shortLabel: 'Mes',
    periodsPerYear: 12,
    daysPerPeriod: 30,
    monthsPerPeriod: 1,
    rateCode: 'TEM',
  },
  bimonthly: {
    id: 'bimonthly',
    label: 'Bimestral',
    shortLabel: 'Bim.',
    periodsPerYear: 6,
    daysPerPeriod: 60,
    monthsPerPeriod: 2,
    rateCode: 'TEB',
  },
  quarterly: {
    id: 'quarterly',
    label: 'Trimestral',
    shortLabel: 'Trim.',
    periodsPerYear: 4,
    daysPerPeriod: 90,
    monthsPerPeriod: 3,
    rateCode: 'TET',
  },
  semiannual: {
    id: 'semiannual',
    label: 'Semestral',
    shortLabel: 'Sem.',
    periodsPerYear: 2,
    daysPerPeriod: 180,
    monthsPerPeriod: 6,
    rateCode: 'TES',
  },
  annual: {
    id: 'annual',
    label: 'Anual',
    shortLabel: 'Año',
    periodsPerYear: 1,
    daysPerPeriod: 360,
    monthsPerPeriod: 12,
    rateCode: 'TEA',
  },
};

export interface CompoundingMeta {
  id: CompoundingFrequency;
  label: string;
  periodsPerYear: number;
}

export const COMPOUNDING_META: Record<CompoundingFrequency, CompoundingMeta> = {
  daily: { id: 'daily', label: 'Diaria (m = 360)', periodsPerYear: 360 },
  monthly: { id: 'monthly', label: 'Mensual (m = 12)', periodsPerYear: 12 },
  bimonthly: { id: 'bimonthly', label: 'Bimestral (m = 6)', periodsPerYear: 6 },
  quarterly: { id: 'quarterly', label: 'Trimestral (m = 4)', periodsPerYear: 4 },
  semiannual: { id: 'semiannual', label: 'Semestral (m = 2)', periodsPerYear: 2 },
  annual: { id: 'annual', label: 'Anual (m = 1)', periodsPerYear: 1 },
};

/**
 * Computes total payment periods `n` from termValue, termUnit and payment frequency.
 * Supports terms from 1 period up to 50+ years (e.g. 600 monthly periods).
 */
export function computeTotalPeriods(
  termValue: number,
  termUnit: TermUnit,
  frequency: PaymentFrequency,
): number {
  const safeTerm = Number.isFinite(termValue) && termValue > 0 ? termValue : 1;
  const meta = FREQUENCY_META[frequency];
  if (termUnit === 'periods') {
    return Math.max(1, Math.min(600, Math.round(safeTerm)));
  }
  const totalMonths = termUnit === 'years' ? safeTerm * 12 : safeTerm;
  const rawPeriods = Math.round(totalMonths / meta.monthsPerPeriod);
  return Math.max(1, Math.min(600, rawPeriods));
}

/**
 * Converts interest rate under Peruvian SBS 360-day standard.
 * Handles i = 0% cleanly without NaN or division errors.
 */
export function computeRates(
  ratePercent: number,
  rateType: RateInputType,
  frequency: PaymentFrequency,
  compounding: CompoundingFrequency,
  desgravamenMonthlyPercent: number,
  sbsMode: boolean,
): RateBreakdown {
  const freq = FREQUENCY_META[frequency];
  const comp = COMPOUNDING_META[compounding];
  const safePercent = Number.isFinite(ratePercent) && ratePercent > 0 ? ratePercent : 0;
  const inputRateDecimal = safePercent / 100;

  let tea = 0;
  let periodRate = 0;

  if (inputRateDecimal === 0) {
    tea = 0;
    periodRate = 0;
  } else if (rateType === 'TEA') {
    tea = inputRateDecimal;
    periodRate = Math.pow(1 + tea, freq.daysPerPeriod / 360) - 1;
  } else if (rateType === 'PERIOD_EFFECTIVE') {
    periodRate = inputRateDecimal;
    tea = Math.pow(1 + periodRate, 360 / freq.daysPerPeriod) - 1;
  } else {
    // TNA: TEA = (1 + TNA / m)^m - 1 (SBS 360-day base)
    const m = comp.periodsPerYear;
    tea = Math.pow(1 + inputRateDecimal / m, m) - 1;
    periodRate = Math.pow(1 + tea, freq.daysPerPeriod / 360) - 1;
  }

  const tem = tea === 0 ? 0 : Math.pow(1 + tea, 30 / 360) - 1;

  const safeDesg =
    sbsMode && Number.isFinite(desgravamenMonthlyPercent) && desgravamenMonthlyPercent > 0
      ? desgravamenMonthlyPercent / 100
      : 0;
  const periodDesgravamenRate = safeDesg * (freq.daysPerPeriod / 30);

  return {
    inputRateDecimal,
    tea,
    tem,
    periodRate,
    daysPerPeriod: freq.daysPerPeriod,
    periodsPerYear: freq.periodsPerYear,
    compoundingPerYear: comp.periodsPerYear,
    periodDesgravamenRate,
    periodRateLabel: freq.rateCode,
  };
}
