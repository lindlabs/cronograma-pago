import { describe, expect, it } from 'vitest';
import { compareAllMethods, simulateLoan } from '../amortization';
import { DEFAULT_LOAN_INPUT } from '../presets';
import { computeRates, computeTotalPeriods } from '../rates';
import type { LoanInput } from '../../types/finance';

function makeInput(patch: Partial<LoanInput>): LoanInput {
  return {
    ...DEFAULT_LOAN_INPUT,
    ...patch,
    academic: { ...DEFAULT_LOAN_INPUT.academic, ...(patch.academic ?? {}) },
  };
}

describe('Conversión de tasas (SBS 360 días)', () => {
  it('convierte TEA a TEM con base exacta de 360 días', () => {
    const rates = computeRates(12.682503, 'TEA', 'monthly', 'monthly', 0, false);
    expect(rates.periodRate).toBeCloseTo(0.01, 6); // 1% mensual exacto
    expect(rates.daysPerPeriod).toBe(30);
    expect(rates.periodsPerYear).toBe(12);
  });

  it('convierte TNA con capitalización mensual a TEA y TEM', () => {
    const rates = computeRates(12, 'TNA', 'monthly', 'monthly', 0, false);
    expect(rates.periodRate).toBeCloseTo(0.01, 6);
    expect(rates.tea).toBeCloseTo(Math.pow(1.01, 12) - 1, 6);
  });

  it('convierte TNA con capitalización diaria (360) a TEA', () => {
    const rates = computeRates(18, 'TNA', 'monthly', 'daily', 0, false);
    const expectedTea = Math.pow(1 + 0.18 / 360, 360) - 1;
    expect(rates.tea).toBeCloseTo(expectedTea, 8);
  });

  it('maneja tasa i = 0% sin NaN ni Infinity', () => {
    const rates = computeRates(0, 'TEA', 'monthly', 'monthly', 0, false);
    expect(rates.tea).toBe(0);
    expect(rates.tem).toBe(0);
    expect(rates.periodRate).toBe(0);
    expect(Number.isNaN(rates.periodRate)).toBe(false);
  });

  it('calcula correctamente plazos largos de 5, 10, 20 y 30 años', () => {
    expect(computeTotalPeriods(5, 'years', 'monthly')).toBe(60);
    expect(computeTotalPeriods(10, 'years', 'monthly')).toBe(120);
    expect(computeTotalPeriods(20, 'years', 'monthly')).toBe(240);
    expect(computeTotalPeriods(30, 'years', 'monthly')).toBe(360);
    expect(computeTotalPeriods(5, 'years', 'quarterly')).toBe(20);
  });
});

describe('Sistemas de amortización y precisión al céntimo', () => {
  it('Método Francés estándar de libro (P=10,000, i=1% TEM, n=60 meses)', () => {
    const res = simulateLoan(
      makeInput({
        principal: 10000,
        termValue: 5,
        termUnit: 'years',
        frequency: 'monthly',
        ratePercent: 1,
        rateType: 'PERIOD_EFFECTIVE',
        method: 'french',
        sbsMode: false,
      }),
    );

    expect(res.rows).toHaveLength(60);
    expect(res.summary.referenceBasePayment).toBeCloseTo(222.44, 2);
    expect(res.rows[59].closingBalance).toBe(0);
    expect(res.summary.totalAmortization).toBeCloseTo(10000, 2);
    expect(res.summary.tcea).toBeCloseTo(res.rates.tea, 3);
  });

  it('cierra saldo exactamente en 0.00 en plazos largos (5, 15 y 30 años) en los 3 métodos', () => {
    const yearsList = [5, 15, 30];
    const methods: Array<'french' | 'german' | 'american'> = ['french', 'german', 'american'];

    for (const years of yearsList) {
      for (const method of methods) {
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
        const last = res.rows[res.rows.length - 1];
        expect(res.rows).toHaveLength(years * 12);
        expect(last.closingBalance).toBe(0);
        expect(res.summary.totalAmortization).toBeCloseTo(250000, 2);
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

      expect(res.summary.totalInterest).toBe(0);
      expect(res.summary.totalPaid).toBeCloseTo(12000, 2);
      expect(res.summary.tcea).toBe(0);
      expect(res.rows[59].closingBalance).toBe(0);

      if (method === 'french' || method === 'german') {
        expect(res.rows[0].basePayment).toBeCloseTo(200, 2); // 12000 / 60
      } else {
        expect(res.rows[0].basePayment).toBe(0);
        expect(res.rows[59].basePayment).toBeCloseTo(12000, 2);
      }
    }
  });
});

describe('Modo Banca Perú / SBS: Periodos de gracia, cargos y TCEA', () => {
  it('Gracia parcial de g=6 dentro de n=60 amortiza sobre n-g=54 y cierra en 0.00', () => {
    const res = simulateLoan(
      makeInput({
        principal: 50000,
        termValue: 5,
        termUnit: 'years',
        ratePercent: 15,
        rateType: 'TEA',
        method: 'french',
        sbsMode: true,
        graceType: 'partial',
        gracePeriods: 6,
        desgravamenMonthlyPercent: 0.05,
        fixedFeePerPeriod: 10,
      }),
    );

    expect(res.rows).toHaveLength(60);
    expect(res.summary.gracePeriods).toBe(6);
    expect(res.summary.amortizationPeriods).toBe(54);
    expect(res.rows[0].phase).toBe('grace_partial');
    expect(res.rows[0].amortization).toBe(0);
    expect(res.rows[5].closingBalance).toBe(50000);
    expect(res.rows[6].phase).toBe('normal');
    expect(res.rows[59].closingBalance).toBe(0);
    // With desgravamen + fees, TCEA must strictly exceed TEA
    expect(res.summary.tcea).toBeGreaterThan(res.rates.tea);
  });

  it('Gracia total capitaliza intereses, amortiza el saldo capitalizado en n-g y cierra en 0.00', () => {
    const res = simulateLoan(
      makeInput({
        principal: 30000,
        termValue: 5,
        termUnit: 'years',
        ratePercent: 12,
        rateType: 'TEA',
        method: 'german',
        sbsMode: true,
        graceType: 'total',
        gracePeriods: 3,
        desgravamenMonthlyPercent: 0.05,
        fixedFeePerPeriod: 8,
      }),
    );

    expect(res.rows).toHaveLength(60);
    expect(res.summary.gracePeriods).toBe(3);
    expect(res.summary.amortizationPeriods).toBe(57);
    expect(res.rows[0].totalPayment).toBe(0);
    expect(res.rows[2].totalPayment).toBe(0);
    expect(res.summary.effectivePrincipal).toBeGreaterThan(30000);
    expect(res.rows[59].closingBalance).toBe(0);
    expect(res.summary.totalAmortization).toBeCloseTo(res.summary.effectivePrincipal, 2);
  });

  it('i = 0% con gracia parcial y desgravamen sigue cerrando en 0.00 y calcula TCEA positiva', () => {
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

    expect(res.rows).toHaveLength(24);
    expect(res.summary.amortizationPeriods).toBe(20);
    expect(res.rows[4].basePayment).toBeCloseTo(500, 2); // 10000 / 20
    expect(res.rows[23].closingBalance).toBe(0);
    expect(res.summary.tcea).toBeGreaterThan(0);
  });
});
