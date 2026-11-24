import type {
  AmortizationMethod,
  AnnualSummaryRow,
  LoanInput,
  MethodComparisonItem,
  ScheduleRow,
  SimulationResult,
} from '../types/finance';
import { calculatePeriodicIrr, calculateTcea } from './irr';
import { computeRates, computeTotalPeriods, FREQUENCY_META } from './rates';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Adds `months` to an ISO YYYY-MM-DD date string preserving valid calendar days.
 */
export function addMonthsToIso(isoDate: string, monthsToAdd: number): string {
  const parts = isoDate.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  const mm = String(normalizedMonth + 1).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Capital Recovery Factor (A/P, i, m).
 * Handles i = 0% cleanly returning 1 / m.
 */
export function capitalRecoveryFactor(periodRate: number, periods: number): number {
  const m = Math.max(1, periods);
  if (periodRate <= 0) {
    return 1 / m;
  }
  const factor = Math.pow(1 + periodRate, m);
  return (periodRate * factor) / (factor - 1);
}

/**
 * Resolves effective loan principal P (either direct P or AssetPrice - DownPayment).
 */
export function resolvePrincipal(input: LoanInput): number {
  if (input.useDownPayment) {
    const price = Number.isFinite(input.assetPrice) && input.assetPrice > 0 ? input.assetPrice : 0;
    const pct = Math.max(0, Math.min(99, Number.isFinite(input.downPaymentPercent) ? input.downPaymentPercent : 0));
    return round2(Math.max(1, price * (1 - pct / 100)));
  }
  return round2(Number.isFinite(input.principal) && input.principal > 0 ? input.principal : 1);
}

/**
 * Core Engineering Economics & Peru SBS Payment Schedule Simulator.
 *
 * Strictly enforces:
 * 1. i = 0% edge case handled without NaN or division by zero (Cuota = P / m).
 * 2. g grace periods inside n total periods amortize over remaining m = n - g periods.
 * 3. Final period n closes balance at exact 0.00.
 */
export function simulateLoan(input: LoanInput): SimulationResult {
  const principal = resolvePrincipal(input);
  const totalPeriods = computeTotalPeriods(input.termValue, input.termUnit, input.frequency);
  const freqMeta = FREQUENCY_META[input.frequency];

  const rates = computeRates(
    input.ratePercent,
    input.rateType,
    input.frequency,
    input.compounding,
    input.desgravamenMonthlyPercent,
    input.sbsMode,
  );

  // Grace periods only active in SBS mode and when graceType !== 'none'
  const rawGrace =
    input.sbsMode && input.graceType !== 'none' && Number.isFinite(input.gracePeriods)
      ? Math.floor(input.gracePeriods)
      : 0;
  // Always leave at least 1 normal amortization period (m = n - g >= 1)
  const gracePeriods = Math.max(0, Math.min(rawGrace, totalPeriods - 1));
  const amortizationPeriods = totalPeriods - gracePeriods;

  const fixedFee =
    input.sbsMode && Number.isFinite(input.fixedFeePerPeriod) && input.fixedFeePerPeriod > 0
      ? round2(input.fixedFeePerPeriod)
      : 0;

  const rows: ScheduleRow[] = [];
  let openingBalance = principal;

  // Phase 1: Grace periods (k = 1 .. g)
  for (let k = 1; k <= gracePeriods; k++) {
    const yearIndex = Math.ceil(k / freqMeta.periodsPerYear);
    const dueDate = addMonthsToIso(input.startDate, k * freqMeta.monthsPerPeriod);
    const interest = round2(openingBalance * rates.periodRate);
    const desgravamen = input.sbsMode ? round2(openingBalance * rates.periodDesgravamenRate) : 0;

    if (input.graceType === 'total') {
      // Total Grace: zero cash payment, interest (+ desgravamen if SBS) capitalizes into balance
      const closingBalance = round2(openingBalance + interest + desgravamen);
      rows.push({
        period: k,
        yearIndex,
        dueDate,
        phase: 'grace_total',
        openingBalance,
        amortization: 0,
        interest,
        basePayment: 0,
        desgravamen,
        fees: 0,
        totalPayment: 0,
        closingBalance,
      });
      openingBalance = closingBalance;
    } else {
      // Partial Grace: pays interest + desgravamen + fees, amortization = 0, balance unchanged
      const basePayment = interest;
      const totalPayment = round2(basePayment + desgravamen + fixedFee);
      rows.push({
        period: k,
        yearIndex,
        dueDate,
        phase: 'grace_partial',
        openingBalance,
        amortization: 0,
        interest,
        basePayment,
        desgravamen,
        fees: fixedFee,
        totalPayment,
        closingBalance: openingBalance,
      });
    }
  }

  // Principal entering the normal amortization phase (after any total grace capitalization)
  const effectivePrincipal = openingBalance;
  const frcFactor = capitalRecoveryFactor(rates.periodRate, amortizationPeriods);
  const frenchBasePaymentRaw = effectivePrincipal * frcFactor;
  const frenchBasePaymentRounded = round2(frenchBasePaymentRaw);
  const germanAmortRounded = round2(effectivePrincipal / amortizationPeriods);

  // Phase 2: Normal amortization periods (k = g + 1 .. n) over remaining m = n - g periods
  for (let k = gracePeriods + 1; k <= totalPeriods; k++) {
    const isLast = k === totalPeriods;
    const yearIndex = Math.ceil(k / freqMeta.periodsPerYear);
    const dueDate = addMonthsToIso(input.startDate, k * freqMeta.monthsPerPeriod);

    const interest = round2(openingBalance * rates.periodRate);
    const desgravamen = input.sbsMode ? round2(openingBalance * rates.periodDesgravamenRate) : 0;
    const fees = fixedFee;

    let amortization = 0;
    let basePayment = 0;

    if (input.method === 'french') {
      if (isLast) {
        amortization = openingBalance;
        basePayment = round2(amortization + interest);
      } else {
        basePayment = frenchBasePaymentRounded;
        amortization = round2(basePayment - interest);
        if (amortization > openingBalance) {
          amortization = openingBalance;
          basePayment = round2(amortization + interest);
        } else if (amortization < 0) {
          amortization = 0;
          basePayment = interest;
        }
      }
    } else if (input.method === 'german') {
      if (isLast) {
        amortization = openingBalance;
      } else {
        amortization = Math.min(germanAmortRounded, openingBalance);
      }
      basePayment = round2(amortization + interest);
    } else {
      // American method
      if (isLast) {
        amortization = openingBalance;
        basePayment = round2(amortization + interest);
      } else {
        amortization = 0;
        basePayment = interest;
      }
    }

    const closingBalance = isLast ? 0 : round2(Math.max(0, openingBalance - amortization));
    const totalPayment = round2(basePayment + desgravamen + fees);

    rows.push({
      period: k,
      yearIndex,
      dueDate,
      phase: 'normal',
      openingBalance,
      amortization,
      interest,
      basePayment,
      desgravamen,
      fees,
      totalPayment,
      closingBalance,
    });

    openingBalance = closingBalance;
  }

  // Annual consolidated summary (for long schedules: 5 to 30+ years)
  const annualMap = new Map<number, AnnualSummaryRow>();
  for (const row of rows) {
    const existing = annualMap.get(row.yearIndex);
    if (!existing) {
      annualMap.set(row.yearIndex, {
        yearIndex: row.yearIndex,
        startPeriod: row.period,
        endPeriod: row.period,
        openingBalance: row.openingBalance,
        amortization: row.amortization,
        interest: row.interest,
        desgravamen: row.desgravamen,
        fees: row.fees,
        totalPayment: row.totalPayment,
        closingBalance: row.closingBalance,
      });
    } else {
      existing.endPeriod = row.period;
      existing.amortization = round2(existing.amortization + row.amortization);
      existing.interest = round2(existing.interest + row.interest);
      existing.desgravamen = round2(existing.desgravamen + row.desgravamen);
      existing.fees = round2(existing.fees + row.fees);
      existing.totalPayment = round2(existing.totalPayment + row.totalPayment);
      existing.closingBalance = row.closingBalance;
    }
  }
  const annualSummary = Array.from(annualMap.values());

  // Totals
  const totalAmortization = round2(rows.reduce((acc, r) => acc + r.amortization, 0));
  const totalInterest = round2(rows.reduce((acc, r) => acc + r.interest, 0));
  const totalDesgravamen = round2(rows.reduce((acc, r) => acc + r.desgravamen, 0));
  const totalFees = round2(rows.reduce((acc, r) => acc + r.fees, 0));
  const totalPaid = round2(rows.reduce((acc, r) => acc + r.totalPayment, 0));

  const normalRows = rows.filter((r) => r.phase === 'normal');
  const firstNormalRow = normalRows[0] ?? rows[0];
  const maxTotalPayment = rows.reduce((m, r) => Math.max(m, r.totalPayment), 0);
  const minNormalTotalPayment = normalRows.reduce(
    (m, r) => Math.min(m, r.totalPayment),
    firstNormalRow ? firstNormalRow.totalPayment : 0,
  );

  // TIR & TCEA from actual client cash flows
  const periodicIrr = calculatePeriodicIrr(
    principal,
    rows.map((r) => r.totalPayment),
  );
  const tcea = calculateTcea(periodicIrr, rates.periodsPerYear);

  const referenceBasePayment =
    input.method === 'french'
      ? frenchBasePaymentRounded
      : firstNormalRow
        ? firstNormalRow.basePayment
        : 0;

  return {
    input: { ...input, principal, gracePeriods },
    rates,
    rows,
    annualSummary,
    summary: {
      principal,
      effectivePrincipal,
      totalPeriods,
      gracePeriods,
      amortizationPeriods,
      referenceBasePayment,
      firstNormalTotalPayment: firstNormalRow ? firstNormalRow.totalPayment : 0,
      maxTotalPayment,
      minNormalTotalPayment,
      frcFactor,
      totalAmortization,
      totalInterest,
      totalDesgravamen,
      totalFees,
      totalPaid,
      periodicIrr,
      tcea,
      interestToPrincipalRatio: principal > 0 ? totalInterest / principal : 0,
    },
  };
}

const METHOD_LABELS: Record<AmortizationMethod, { label: string; subtitle: string }> = {
  french: {
    label: 'Método Francés',
    subtitle: 'Cuota constante (Estándar SBS Perú)',
  },
  german: {
    label: 'Método Alemán',
    subtitle: 'Amortización constante · Cuota decreciente',
  },
  american: {
    label: 'Método Americano',
    subtitle: 'Intereses periódicos · Capital al vencimiento',
  },
};

export function compareAllMethods(input: LoanInput): MethodComparisonItem[] {
  const methods: AmortizationMethod[] = ['french', 'german', 'american'];
  const results = methods.map((method) => simulateLoan({ ...input, method }));
  const frenchInterest = results[0].summary.totalInterest;

  return results.map((res) => {
    const firstRow = res.rows.find((r) => r.phase === 'normal') ?? res.rows[0];
    const lastRow = res.rows[res.rows.length - 1];
    const meta = METHOD_LABELS[res.input.method];
    return {
      method: res.input.method,
      label: meta.label,
      subtitle: meta.subtitle,
      firstPayment: firstRow ? firstRow.totalPayment : 0,
      lastPayment: lastRow ? lastRow.totalPayment : 0,
      totalInterest: res.summary.totalInterest,
      totalCharges: round2(res.summary.totalDesgravamen + res.summary.totalFees),
      totalPaid: res.summary.totalPaid,
      tcea: res.summary.tcea,
      interestDeltaVsFrench: round2(res.summary.totalInterest - frenchInterest),
    };
  });
}
