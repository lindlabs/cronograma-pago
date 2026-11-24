import { describe, expect, it } from 'vitest';
import { simulateLoan } from '../../engine/amortization';
import { DEFAULT_LOAN_INPUT } from '../../engine/presets';
import { buildExcelWorkbook } from '../excelExporter';
import { buildPdfDocument } from '../pdfExporter';

describe('Exportador ExcelJS (fórmulas vivas sin "=" inicial)', () => {
  it('genera fórmulas vivas TEA->TEM, PMT con IF(i=0), Periodo 0 + IRR/TCEA sin "=" inicial', async () => {
    const frenchRes = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 50000,
      termValue: 5,
      termUnit: 'years',
      ratePercent: 14.5,
      rateType: 'TEA',
      method: 'french',
      sbsMode: false,
    });

    const wb = await buildExcelWorkbook(frenchRes);
    const ws = wb.getWorksheet('Cronograma de Pago')!;
    expect(ws).toBeDefined();
    expect(wb.getWorksheet('Resumen y Comparativa')).toBeDefined();

    // Verify EVERY formula cell in BOTH sheets has NO leading "="
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

    // Live TEA -> TEM formula in C8 referencing H6 (TEA input)
    const c8 = ws.getCell('C8').value as { formula: string; result?: number };
    expect(c8.formula).toBe('IF(H6=0,0,(1+H6)^(30/360)-1)');
    expect(c8.result).toBeCloseTo(frenchRes.rates.periodRate, 8);

    // Live IRR & TCEA formulas in H11 & H12
    const h11 = ws.getCell('H11').value as { formula: string; result?: number };
    expect(h11.formula).toBe('IFERROR(IRR(H15:H75,C8),0)');
    const h12 = ws.getCell('H12').value as { formula: string; result?: number };
    expect(h12.formula).toBe('IF(H11<=0,0,(1+H11)^12-1)');

    // Row 15 = Period 0 (Desembolso), Row 16 = Period 1 (first cuota)
    expect(ws.getCell('A15').value).toBe(0);
    expect(ws.getCell('A16').value).toBe(1);

    const f16 = ws.getCell('F16').value as { formula: string; result?: number };
    expect(f16.formula).toContain('IF($C$8=0');
    expect(f16.formula).toContain('PMT(');

    // Final row (row 75 = period 60) Saldo Final (G75) closes at 0
    const g75 = ws.getCell('G75').value as { formula: string; result?: number };
    expect(g75.formula).toBe('ROUND(C75-D75,2)');
    expect(g75.result ?? 0).toBe(0);
  });

  it('genera fórmulas vivas TNA -> TEA -> TEM cuando el usuario ingresa TNA', async () => {
    const res = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 100000,
      termValue: 5,
      termUnit: 'years',
      ratePercent: 18,
      rateType: 'TNA',
      compounding: 'daily',
      method: 'french',
      sbsMode: false,
    });

    const wb = await buildExcelWorkbook(res);
    const ws = wb.getWorksheet('Cronograma de Pago')!;
    const h6 = ws.getCell('H6').value as { formula: string; result?: number };
    expect(h6.formula).toBe('IF(C12=0,0,(1+C12/360)^360-1)');
    expect(h6.result).toBeCloseTo(res.rates.tea, 8);
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

      // Row 16 is period 1 -> Row 22 is period 7 (first normal period after 6 grace periods)
      if (method === 'german') {
        const amortCell = ws.getCell('E22').value as { formula: string; result?: number };
        expect(amortCell.formula).toContain('$C$11/$C$10');
        expect(amortCell.result).toBeCloseTo(36000 / 54, 2);
      } else {
        expect(ws.getCell('E22').value).toBe(0);
        const lastAmort = ws.getCell('E75').value as { formula: string; result?: number };
        expect(lastAmort.result).toBe(36000);
      }

      // Final closing balance formula in K75
      const k75 = ws.getCell('K75').value as { formula: string; result?: number };
      expect(k75.formula).toBe('ROUND(D75-E75,2)');
      expect(k75.result ?? 0).toBe(0);
    }
  });

  it('genera buffer .xlsx válido (ZIP PK) para 30 años (360 cuotas) con gracia total en SBS sin doble conteo', async () => {
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
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const ws = wb.getWorksheet('Cronograma de Pago')!;
    // Row 16 = period 1, so period 5 (first normal after g=4) is Row 20 -> D20
    const c11 = ws.getCell('C11').value as { formula: string; result?: number };
    expect(c11.formula).toBe('D20');
    expect(c11.result).toBeCloseTo(res.summary.effectivePrincipal, 2);

    // Totals row is Row 376 (16 + 360) -> Cuota Base total matches exact totalBasePayment
    const g376 = ws.getCell('G376').value as { formula: string; result?: number };
    expect(g376.formula).toBe('SUM(G16:G375)');
    expect(g376.result).toBeCloseTo(res.summary.totalBasePayment, 2);
  });
});

describe('Exportador PDF (multi-página con cabecera académica)', () => {
  it('genera PDF multi-página válido (%PDF-) para 20 años (240 cuotas) con integrantes por defecto', () => {
    const res = simulateLoan({
      ...DEFAULT_LOAN_INPUT,
      principal: 250000,
      termValue: 20,
      termUnit: 'years',
      ratePercent: 8.9,
      sbsMode: true,
      graceType: 'total',
      gracePeriods: 2,
    });

    expect(res.input.academic.studentOrGroup).toBe('Lindbergh Paredes y Jesus Garcia');
    const doc = buildPdfDocument(res);
    expect(doc.getNumberOfPages()).toBeGreaterThan(4);
    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe('%PDF-');
  });
});
