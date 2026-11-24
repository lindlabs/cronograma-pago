export type CurrencyCode = 'PEN' | 'USD';

export type PaymentFrequency =
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export type RateInputType = 'TEA' | 'PERIOD_EFFECTIVE' | 'TNA';

export type CompoundingFrequency =
  | 'daily'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export type AmortizationMethod = 'french' | 'german' | 'american';

export type GraceType = 'none' | 'partial' | 'total';

export type TermUnit = 'years' | 'months' | 'periods';

export type RowPhase = 'grace_total' | 'grace_partial' | 'normal';

export interface AcademicMetadata {
  university: string;
  course: string;
  professor: string;
  studentOrGroup: string;
}

export interface LoanInput {
  /** Principal P (monto financiado) */
  principal: number;
  /** Optional asset price & down payment helper */
  useDownPayment: boolean;
  assetPrice: number;
  downPaymentPercent: number;
  /** Currency: Soles (PEN) or Dollars (USD) */
  currency: CurrencyCode;
  /** Term value in years, months, or direct payment periods */
  termValue: number;
  termUnit: TermUnit;
  /** Payment frequency */
  frequency: PaymentFrequency;
  /** Interest rate i (in percentage, e.g. 14.5 means 14.5%) */
  ratePercent: number;
  /** How the user entered i */
  rateType: RateInputType;
  /** Compounding frequency m when rateType === 'TNA' */
  compounding: CompoundingFrequency;
  /** Amortization system */
  method: AmortizationMethod;
  /** Toggle: false = Modo Académico Puro, true = Modo Banca Perú / SBS */
  sbsMode: boolean;
  /** SBS options (only active when sbsMode is true) */
  graceType: GraceType;
  gracePeriods: number;
  /** Monthly life insurance (Seguro de Desgravamen) in % over remaining balance, e.g. 0.05 */
  desgravamenMonthlyPercent: number;
  /** Fixed commission / portes / property insurance per period in currency units */
  fixedFeePerPeriod: number;
  /** Disbursement date ISO string YYYY-MM-DD */
  startDate: string;
  /** Optional academic header info for PDF & Excel exports */
  academic: AcademicMetadata;
}

export interface RateBreakdown {
  /** Input rate as decimal (e.g. 0.145) */
  inputRateDecimal: number;
  /** Effective Annual Rate (TEA, base 360 days) */
  tea: number;
  /** Effective Monthly Rate (TEM, 30/360) */
  tem: number;
  /** Effective rate for the payment period (i_p) */
  periodRate: number;
  /** Days per payment period under 360-day SBS standard */
  daysPerPeriod: number;
  /** Payment periods per year (360 / daysPerPeriod) */
  periodsPerYear: number;
  /** Compounding periods m per year (when TNA) */
  compoundingPerYear: number;
  /** Desgravamen rate per payment period (decimal) */
  periodDesgravamenRate: number;
  /** Label of periodic effective rate (e.g. TEM, TET, TES, TEA) */
  periodRateLabel: string;
}

export interface ScheduleRow {
  period: number;
  yearIndex: number;
  dueDate: string;
  phase: RowPhase;
  openingBalance: number;
  amortization: number;
  interest: number;
  basePayment: number;
  desgravamen: number;
  fees: number;
  totalPayment: number;
  closingBalance: number;
}

export interface AnnualSummaryRow {
  yearIndex: number;
  startPeriod: number;
  endPeriod: number;
  openingBalance: number;
  amortization: number;
  interest: number;
  desgravamen: number;
  fees: number;
  totalPayment: number;
  closingBalance: number;
}

export interface SimulationSummary {
  principal: number;
  capitalizedInterest: number;
  capitalizedDesgravamen: number;
  effectivePrincipal: number;
  totalPeriods: number;
  gracePeriods: number;
  amortizationPeriods: number;
  /** Theoretical periodic base payment for French method or first normal payment */
  referenceBasePayment: number;
  firstNormalTotalPayment: number;
  maxTotalPayment: number;
  minNormalTotalPayment: number;
  /** Capital Recovery Factor (A/P, i, m) */
  frcFactor: number;
  /** Exact sum of row.amortization (= effectivePrincipal) */
  totalAmortization: number;
  /** Exact sum of row.interest (includes capitalized interest during total grace) */
  totalInterest: number;
  /** Exact sum of row.basePayment */
  totalBasePayment: number;
  /** Exact sum of row.desgravamen (includes capitalized desgravamen during total grace) */
  totalDesgravamen: number;
  /** Exact sum of row.fees */
  totalFees: number;
  /** Exact sum of row.totalPayment (= principal + totalInterest + totalDesgravamen + totalFees) */
  totalPaid: number;
  /** Periodic IRR from borrower's perspective */
  periodicIrr: number;
  /** Annualized TCEA based on periodic IRR */
  tcea: number;
  /** Total interest as % of original principal P */
  interestToPrincipalRatio: number;
}

export interface SimulationResult {
  input: LoanInput;
  rates: RateBreakdown;
  rows: ScheduleRow[];
  annualSummary: AnnualSummaryRow[];
  summary: SimulationSummary;
}

export interface MethodComparisonItem {
  method: AmortizationMethod;
  label: string;
  subtitle: string;
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalCharges: number;
  totalPaid: number;
  tcea: number;
  interestDeltaVsFrench: number;
}
