import { describe, expect, it } from 'vitest';
import { compareAllMethods, round2, simulateLoan } from '../amortization';
import { DEFAULT_LOAN_INPUT } from '../presets';
import { computeRates, computeTotalPeriods } from '../rates';
import type { LoanInput, SimulationResult } from '../../types/finance';

function makeInput(patch: Partial<LoanInput>): LoanInput {
  return {
    ...DEFAULT_LOAN_INPUT,
    ...patch,
    academic: { ...DEFAULT_LOAN_INPUT.academic, ...(patch.academic ?? {}) },
  };
}

/**
 * Exhaustively verifies EVERY accounting & financial invariant on every single row
 * and on the aggregate summary so zero rounding or formula errors can slip through.
 */
function assertAccountingInvariants(res: SimulationResult) {
  const { rows, summary } = res;
  expect(rows.length).toBe(summary.totalPeriods);
  expect(rows.length).toBeGreaterThanOrEqual(1);

  // First row starts at original principal P
  expect(rows[0].openingBalance).toBeCloseTo(summary.principal, 2);

  // Final row MUST close at exact 0.00
  expect(rows[rows.length - 1].closingBalance).toBe(0);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Continuity: openingBalance(k) === closingBalance(k-1)
    if (i > 0) {
      expect(r.openingBalance).toBeCloseTo(rows[i - 1].closingBalance, 2);
    }

    // No NaN / Infinity anywhere
    for (const v of [
      r.openingBalance,
      r.amortization,
      r.interest,
      r.basePayment,
      r.desgravamen,
      r.fees,
      r.totalPayment,
      r.closingBalance,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }

    if (r.phase === 'grace_total') {
      expect(r.amortization).toBe(0);
      expect(r.basePayment).toBe(0);
      expect(r.totalPayment).toBe(0);
      expect(r.closingBalance).toBeCloseTo(
        round2(r.openingBalance + r.interest + r.desgravamen),
        2,
      );
    } else if (r.phase === 'grace_partial') {
      expect(r.amortization).toBe(0);
      expect(r.basePayment).toBeCloseTo(r.interest, 2);
      expect(r.closingBalance).toBeCloseTo(r.openingBalance, 2);
      expect(r.totalPayment).toBeCloseTo(round2(r.basePayment + r.desgravamen + r.fees), 2);
    } else {
      expect(r.closingBalance).toBeCloseTo(round2(r.openingBalance - r.amortization), 2);
      expect(r.basePayment).toBeCloseTo(round2(r.amortization + r.interest), 2);
      expect(r.totalPayment).toBeCloseTo(round2(r.basePayment + r.desgravamen + r.fees), 2);
    }
  }

  // Global Conservation Law: P + TotalInterest + TotalDesgravamen + TotalFees === TotalPaid
  expect(
    round2(
      summary.principal +
        summary.totalInterest +
        summary.totalDesgravamen +
        summary.totalFees,
    ),
  ).toBeCloseTo(summary.totalPaid, 2);

  // Total Amortization === Effective Principal (P + capitalized grace interest & desgravamen)
  expect(summary.totalAmortization).toBeCloseTo(summary.effectivePrincipal, 2);
  expect(summary.effectivePrincipal).toBeCloseTo(
    round2(summary.principal + summary.capitalizedInterest + summary.capitalizedDesgravamen),
    2,
  );

  // Exact column sum checks
  expect(round2(rows.reduce((s, r) => s + r.basePayment, 0))).toBeCloseTo(
    summary.totalBasePayment,
    2,
  );
  expect(round2(rows.reduce((s, r) => s + r.totalPayment, 0))).toBeCloseTo(summary.totalPaid, 2);
}

describe('Conversión de tasas (SBS 360 días)', () => {
  it('convierte TEA a TEM con base exacta de 360 días', () => {
    const rates = computeRates(12.682503, 'TEA', 'monthly', 'monthly', 0, false);
    expect(rates.periodRate).toBeCloseTo(0.01, 6);
    expect(rates.daysPerPeriod).toBe(30);
    expect(rates.periodsPerYear).toBe(12);
  });

  it('convierte TNA con capitalización mensual a TEA y TEM', () => {
    const rates = computeRates(12, 'TNA', 'monthly', 'monthly', 0, false);
    expect(rates.periodRate).toBeCloseTo(0.01, 6);
    expect(rates.tea).toBeCloseTo(Math.pow(1.01, 12) - 1, 6);
  });

  it('convierte TNA con capitalización diaria (360) a TEA y TEM', () => {
    const rates = computeRates(18, 'TNA', 'monthly', 'daily', 0, false);
    const expectedTea = Math.pow(1 + 0.18 / 360, 360) - 1;
    const expectedTem = Math.pow(1 + 0.18 / 360, 30) - 1;
    expect(rates.tea).toBeCloseTo(expectedTea, 8);
    expect(rates.periodRate).toBeCloseTo(expectedTem, 8);
  });

  it('maneja tasa i = 0% sin NaN ni Infinity', () => {
    const rates = computeRates(0, 'TEA', 'monthly', 'monthly', 0, false);
    expect(rates.tea).toBe(0);
    expect(rates.tem).toBe(0);
    expect(rates.periodRate).toBe(0);
    expect(Number.isNaN(rates.periodRate)).toBe(false);
  });

  it('calcula correctamente plazos en años, meses y cuotas directas (n)', () => {
    expect(computeTotalPeriods(5, 'years', 'monthly')).toBe(60);
    expect(computeTotalPeriods(10, 'years', 'monthly')).toBe(120);
    expect(computeTotalPeriods(20, 'years', 'monthly')).toBe(240);
    expect(computeTotalPeriods(30, 'years', 'monthly')).toBe(360);
    expect(computeTotalPeriods(5, 'years', 'quarterly')).toBe(20);
    expect(computeTotalPeriods(8, 'periods', 'quarterly')).toBe(8);
    expect(computeTotalPeriods(18, 'periods', 'semiannual')).toBe(18);
  });
});

describe('Verificación exacta contra ejercicios de libro de Ingeniería Económica', () => {
  it('Libro 1 (Francés mensual): P=10,000, TEM=1%, n=60 => R = 222.44', () => {
    const res = simulateLoan(
      makeInput({
        principal: 10000,
        termValue: 60,
        termUnit: 'periods',
        frequency: 'monthly',
        ratePercent: 1,
        rateType: 'PERIOD_EFFECTIVE',
        method: 'french',
        sbsMode: false,
      }),
    );

    assertAccountingInvariants(res);
    expect(res.summary.referenceBasePayment).toBe(222.44);
    expect(res.rows[0].interest).toBe(100);
    expect(res.rows[0].amortization).toBe(122.44);
    expect(res.rows[0].closingBalance).toBe(9877.56);
    expect(res.summary.tcea).toBeCloseTo(res.rates.tea, 3);
  });

  it('Libro 2 (Francés trimestral): P=20,000, TET=3%, n=8 trimestres => R = 2,849.13', () => {
    const res = simulateLoan(
      makeInput({
        principal: 20000,
        termValue: 8,
        termUnit: 'periods',
        frequency: 'quarterly',
        ratePercent: 3,
        rateType: 'PERIOD_EFFECTIVE',
        method: 'french',
        sbsMode: false,
      }),
    );

    assertAccountingInvariants(res);
    expect(res.summary.referenceBasePayment).toBe(2849.13);
    expect(res.rows[0].interest).toBe(600);
    expect(res.rows[0].amortization).toBe(2249.13);
    expect(res.rows[7].closingBalance).toBe(0);
  });

  it('Libro 3 (TNA cap. diaria 360): P=100,000, TNA=18% cap. diaria, 5 años mensual => R = 2,546.48', () => {
    const res = simulateLoan(
      makeInput({
        principal: 100000,
        termValue: 5,
        termUnit: 'years',
        frequency: 'monthly',
        ratePercent: 18,
        rateType: 'TNA',
        compounding: 'daily',
        method: 'french',
        sbsMode: false,
      }),
    );

    assertAccountingInvariants(res);
    const tem = Math.pow(1 + 0.18 / 360, 30) - 1;
    const expectedR = round2(100000 * ((tem * Math.pow(1 + tem, 60)) / (Math.pow(1 + tem, 60) - 1)));
    expect(res.summary.referenceBasePayment).toBe(expectedR);
    expect(res.summary.referenceBasePayment).toBe(2546.48);
  });

  it('Libro 4 (Alemán): P=50,000, TEA=14.5%, n=60 meses => Amort = 833.33, I_1 = 567.38, R_1 = 1,400.71', () => {
    const res = simulateLoan(
      makeInput({
        principal: 50000,
        termValue: 5,
        termUnit: 'years',
        frequency: 'monthly',
        ratePercent: 14.5,
        rateType: 'TEA',
        method: 'german',
        sbsMode: false,
      }),
    );

    assertAccountingInvariants(res);
    const tem = Math.pow(1.145, 30 / 360) - 1;
    expect(res.rows[0].amortization).toBe(833.33);
    expect(res.rows[0].interest).toBe(round2(50000 * tem));
    expect(res.rows[0].interest).toBe(567.38);
    expect(res.rows[0].basePayment).toBe(1400.71);
    expect(res.rows[59].closingBalance).toBe(0);
  });

  it('Teorema de Gracia Total sin cargos extra: P=10,000, TEM=1%, n=12, g=2 => P_ef=10,201.00 y TCEA = TEA', () => {
    const res = simulateLoan(
      makeInput({
        principal: 10000,
        termValue: 12,
        termUnit: 'periods',
        frequency: 'monthly',
        ratePercent: 1,
        rateType: 'PERIOD_EFFECTIVE',
        method: 'french',
        sbsMode: true,
        graceType: 'total',
        gracePeriods: 2,
        desgravamenMonthlyPercent: 0,
        fixedFeePerPeriod: 0,
      }),
    );

    assertAccountingInvariants(res);
    expect(res.rows[0].closingBalance).toBe(10100);
    expect(res.rows[1].closingBalance).toBe(10201);
    expect(res.summary.effectivePrincipal).toBe(10201);
    expect(res.summary.amortizationPeriods).toBe(10);
    // Fundamental Engineering Economics invariance: capitalizing at the same rate preserves TCEA === TEA
    expect(res.summary.tcea).toBeCloseTo(res.rates.tea, 3);
  });
});

describe('Plazos largos, comparativa, casos borde i=0% y Modo Banca Perú / SBS', () => {
  it('cumple todas las identidades contables en 5, 15 y 30 años en los 3 métodos', () => {
    for (const years of [5, 15, 30]) {
      for (const method of ['french', 'german', 'american'] as const) {
        const res = simulateLoan(
          makeInput({
            principal: 250000,
            termValue: years,
            termUnit: 'years',
            ratePercent: 8.9,
            rateType: 'TEA',
            method,
          }),
        );
        assertAccountingInvariants(res);
        expect(res.rows).toHaveLength(years * 12);
      }
    }
  });

  it('Método Alemán genera menos intereses totales que Francés y Americano', () => {
    const comp = compareAllMethods(
      makeInput({
        principal: 60000,
        termValue: 5,
        termUnit: 'years',
        ratePercent: 14.5,
        rateType: 'TEA',
      }),
    );
    const french = comp.find((c) => c.method === 'french')!;
    const german = comp.find((c) => c.method === 'german')!;
    const american = comp.find((c) => c.method === 'american')!;

    expect(german.totalInterest).toBeLessThan(french.totalInterest);
    expect(french.totalInterest).toBeLessThan(american.totalInterest);
  });

  it('Regla borde i = 0%: aplica Cuota = P / n sin NaN ni Infinity en los 3 métodos', () => {
    for (const method of ['french', 'german', 'american'] as const) {
      const res = simulateLoan(
        makeInput({
          principal: 12000,
          termValue: 5,
          termUnit: 'years',
          ratePercent: 0,
          rateType: 'TEA',
          method,
          sbsMode: false,
        }),
      );

      assertAccountingInvariants(res);
      expect(res.summary.totalInterest).toBe(0);
      expect(res.summary.totalPaid).toBe(12000);
      expect(res.summary.tcea).toBe(0);

      if (method === 'french' || method === 'german') {
        expect(res.rows[0].basePayment).toBe(200);
      } else {
        expect(res.rows[0].basePayment).toBe(0);
        expect(res.rows[59].basePayment).toBe(12000);
      }
    }
  });

  it('SBS con Gracia Total + Desgravamen + Portes cumple conservación exacta (sin doble conteo)', () => {
    for (const method of ['french', 'german', 'american'] as const) {
      const res = simulateLoan(
        makeInput({
          principal: 120000,
          termValue: 10,
          termUnit: 'years',
          ratePercent: 16.5,
          rateType: 'TEA',
          method,
          sbsMode: true,
          graceType: 'total',
          gracePeriods: 4,
          desgravamenMonthlyPercent: 0.055,
          fixedFeePerPeriod: 12,
        }),
      );

      assertAccountingInvariants(res);
      expect(res.summary.gracePeriods).toBe(4);
      expect(res.summary.amortizationPeriods).toBe(116);
      expect(res.summary.tcea).toBeGreaterThan(res.rates.tea);
    }
  });

  it('SBS con Gracia Parcial e i = 0% amortiza en n-g y calcula TCEA > 0 por cargos SBS', () => {
    const res = simulateLoan(
      makeInput({
        principal: 10000,
        termValue: 2,
        termUnit: 'years',
        ratePercent: 0,
        rateType: 'TEA',
        method: 'french',
        sbsMode: true,
        graceType: 'partial',
        gracePeriods: 4,
        desgravamenMonthlyPercent: 0.05,
        fixedFeePerPeriod: 10,
      }),
    );

    assertAccountingInvariants(res);
    expect(res.summary.amortizationPeriods).toBe(20);
    expect(res.rows[4].basePayment).toBe(500);
    expect(res.summary.tcea).toBeGreaterThan(0);
  });
});
