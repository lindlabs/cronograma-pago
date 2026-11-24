import { describe, expect, it } from 'vitest';
import { simulateLoan } from '../../engine/amortization';
import { DEFAULT_LOAN_INPUT } from '../../engine/presets';
import { buildExcelWorkbook } from '../excelExporter';
import { buildPdfDocument } from '../pdfExporter';

describe('Exportador ExcelJS (fórmulas dinámicas sin "=" inicial)', () => {
  it('genera fórmulas sin "=" inicial y usa PMT solo en Método Francés con guardia IF para i=0%', async () => {
    const frenchRes = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 50000,
      termValue: 5,
      termUnit: 'years',
      ratePercent: 14.5,
      method: 'french',
      sbsMode: false,
    });

    const wb = await buildExcelWorkbook(frenchRes);
    const ws = wb.getWorksheet('Cronograma de Pago')!;
    expect(ws).toBeDefined();
    expect(wb.getWorksheet('Resumen y Comparativa')).toBeDefined();

    // Check EVERY formula cell in BOTH sheets has NO leading "="
    wb.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const val = cell.value;
          if (
            val &&
            typeof val === 'object' &&
            'formula' in val &&
            typeof val.formula === 'string'
          ) {
            expect(val.formula.startsWith('=')).toBe(false);
          }
        });
      });
    });

    // Row 15 (first period), Col F (Cuota) must use IF($C$8=0,...,PMT(...))
    const f15 = ws.getCell('F15').value as { formula: string; result?: number };
    expect(f15.formula).toContain('IF($C$8=0');
    expect(f15.formula).toContain('PMT(');

    // Final row (row 74 = period 60) Saldo Final (G74) closes at 0 via ROUND(C74-D74,2)
    const g74 = ws.getCell('G74').value as { formula: string; result?: number };
    expect(g74.formula).toBe('ROUND(C74-D74,2)');
    expect(g74.result ?? 0).toBe(0);
    expect(frenchRes.rows[59].closingBalance).toBe(0);
  });

  it('NO usa PMT en Método Alemán ni Americano y maneja i = 0% + gracia en SBS', async () => {
    for (const method of ['german', 'american'] as const) {
      const res = simulateLoan({
        ...DEFAULT_LOAN_INPUT,
        principal: 36000,
        termValue: 5,
        termUnit: 'years',
        ratePercent: 0,
        method,
        sbsMode: true,
        graceType: 'partial',
        gracePeriods: 6,
      });

      const wb = await buildExcelWorkbook(res);
      const ws = wb.getWorksheet('Cronograma de Pago')!;

      ws.eachRow((row) => {
        row.eachCell((cell) => {
          const val = cell.value;
          if (
            val &&
            typeof val === 'object' &&
            'formula' in val &&
            typeof val.formula === 'string'
          ) {
            expect(val.formula.startsWith('=')).toBe(false);
            expect(val.formula).not.toContain('PMT(');
          }
        });
      });

      // Row 21 is period 7 (first normal period after 6 grace periods)
      if (method === 'german') {
        const amortCell = ws.getCell('E21').value as { formula: string; result?: number };
        expect(amortCell.formula).toContain('$C$11/$C$10');
        expect(amortCell.result).toBeCloseTo(36000 / 54, 2);
      } else {
        expect(ws.getCell('E21').value).toBe(0);
        const lastAmort = ws.getCell('E74').value as { formula: string; result?: number };
        expect(lastAmort.result).toBe(36000);
      }

      // Final closing balance formula in K74
      const k74 = ws.getCell('K74').value as { formula: string; result?: number };
      expect(k74.formula).toBe('ROUND(D74-E74,2)');
      expect(k74.result ?? 0).toBe(0);
    }
  });
});

describe('Exportador PDF (multi-página para 5 a 20+ años)', () => {
  it('genera PDF multi-página limpio para un crédito de 20 años (240 cuotas) con cabecera académica', () => {
    const res = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 250000,
      termValue: 20,
      termUnit: 'years',
      ratePercent: 8.9,
      sbsMode: true,
      graceType: 'partial',
      gracePeriods: 2,
      academic: {
        university: 'UTP',
        course: 'Ingeniería Económica',
        professor: 'Ing. Carlos Pérez',
        studentOrGroup: 'Grupo 4',
      },
    });

    const doc = buildPdfDocument(res);
    expect(doc.getNumberOfPages()).toBeGreaterThan(4);
    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
    // Valid PDF header "%PDF-"
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe('%PDF-');
  });
});

describe('Integridad binaria XLSX (30 años, Gracia Total e i=0%)', () => {
  it('genera un buffer .xlsx válido (ZIP PK) para 30 años (360 cuotas) con gracia total en SBS', async () => {
    const res = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 300000,
      termValue: 30,
      termUnit: 'years',
      ratePercent: 9.2,
      method: 'french',
      sbsMode: true,
      graceType: 'total',
      gracePeriods: 4,
      desgravamenMonthlyPercent: 0.05,
      fixedFeePerPeriod: 15,
    });

    const wb = await buildExcelWorkbook(res);
    const buf = await wb.xlsx.writeBuffer();
    const bytes = new Uint8Array(buf as ArrayBuffer);
    expect(bytes.byteLength).toBeGreaterThan(5000);
    // Valid XLSX/ZIP magic bytes "PK"
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    // Check C11 references post-grace opening balance D19 (15 + 4) without leading "="
    const ws = wb.getWorksheet('Cronograma de Pago')!;
    const c11 = ws.getCell('C11').value as { formula: string; result?: number };
    expect(c11.formula).toBe('D19');
    expect(c11.result).toBeCloseTo(res.summary.effectivePrincipal, 2);
  });
});
