import ExcelJS from 'exceljs';
import { compareAllMethods } from '../engine/amortization';
import { FREQUENCY_META } from '../engine/rates';
import type { SimulationResult } from '../types/finance';
import { formatIsoDateEsPe, graceLabel, methodLabel } from '../utils/formatters';

const CURRENCY_NUM_FMT = {
  PEN: '"S/ "#,##0.00',
  USD: '"US$ "#,##0.00',
} as const;

const COLORS = {
  brandDark: 'FF2522EA',
  brandMid: 'FF5B4CF5',
  brandSoft: 'FFECEAFF',
  brandLighter: 'FFF5F4FF',
  graceTotalBg: 'FFFDF2F8',
  gracePartialBg: 'FFFFFBEB',
  period0Bg: 'FFEEF2FF',
  ink: 'FF100F24',
  muted: 'FF646182',
  border: 'FFD9D6FA',
  white: 'FFFFFFFF',
};

/**
 * Builds an ExcelJS Workbook with 100% live native Excel formulas (zero leading `=`),
 * including:
 * - Live base-360 rate conversions (TEA -> i_p, TNA -> TEA -> i_p, or i_p -> TEA)
 * - Method-specific amortization formulas (PMT only for French with IF guard for i = 0%;
 *   constant P_eff/(n-g) for German; 0 amortization & balloon P_eff at n for American)
 * - Period 0 disbursement row + Cash Flow column with live IRR & TCEA formulas
 * - Exact Total-Grace capitalization & closing balance 0.00 at period n
 */
export async function buildExcelWorkbook(result: SimulationResult): Promise<ExcelJS.Workbook> {
  const { input, rates, rows, summary } = result;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CronoPE - Lindbergh Paredes';
  workbook.created = new Date();

  const moneyFmt = CURRENCY_NUM_FMT[input.currency];
  const sbs = input.sbsMode;
  const freqMeta = FREQUENCY_META[input.frequency];

  // =========================================================================
  // SHEET 1: Cronograma de Pago (Dynamic Native Formulas)
  // =========================================================================
  const sheet = workbook.addWorksheet('Cronograma de Pago', {
    views: [{ state: 'frozen', ySplit: 14 }],
  });

  const lastColIndex = sbs ? 12 : 8;
  const lastColLetter = sbs ? 'L' : 'H';

  // Row 1: Main Title Banner
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'CRONOGRAMA DE PAGOS — SIMULADOR DE INGENIERÍA ECONÓMICA (PERÚ · SBS 360)';
  titleCell.font = { name: 'Calibri', size: 13.5, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandDark } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 29;

  // Row 2: Academic Metadata Subtitle
  const acadParts: string[] = [];
  if (input.academic.university.trim()) acadParts.push(`Universidad: ${input.academic.university.trim()}`);
  if (input.academic.course.trim()) acadParts.push(`Curso: ${input.academic.course.trim()}`);
  if (input.academic.professor.trim()) acadParts.push(`Docente: ${input.academic.professor.trim()}`);
  if (input.academic.studentOrGroup.trim()) {
    acadParts.push(`Alumno: ${input.academic.studentOrGroup.trim()}`);
  }

  sheet.mergeCells(`A2:${lastColLetter}2`);
  const acadCell = sheet.getCell('A2');
  acadCell.value =
    acadParts.length > 0
      ? acadParts.join('   |   ')
      : `Modo: ${sbs ? 'Banca Perú / SBS' : 'Académico Puro'}   |   Sistema: ${methodLabel(input.method)}`;
  acadCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  acadCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandMid } };
  acadCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;

  // Row 3: System summary bar
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const modeInfoCell = sheet.getCell('A3');
  modeInfoCell.value = `Sistema: ${methodLabel(input.method)}   •   Frecuencia: ${freqMeta.label} (${rates.daysPerPeriod} días / base 360)   •   ${graceLabel(input.graceType, summary.gracePeriods)}   •   Modo: ${sbs ? 'Banca Perú (SBS)' : 'Académico Puro'}`;
  modeInfoCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.ink } };
  modeInfoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  modeInfoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(3).height = 20;

  sheet.getRow(4).height = 7;

  // Row 5: Parameter Section Headers
  sheet.mergeCells('A5:C5');
  sheet.getCell('A5').value = 'PARÁMETROS DE ENTRADA (P, n, i)';
  sheet.getCell('A5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };

  sheet.mergeCells(`E5:${lastColLetter}5`);
  sheet.getCell('E5').value = 'RESUMEN FINANCIERO, TASAS Y TIR / TCEA (BASE 360)';
  sheet.getCell('E5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  sheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  sheet.getRow(5).height = 20;

  // Table geometry (Row 14 = headers, Row 15 = Period 0 Disbursement, Rows 16..15+n = Periods 1..n)
  const headerRowNum = 14;
  const period0Row = 15;
  const tableStartRow = 16;
  const tableEndRow = tableStartRow + rows.length - 1;
  const totalRowNum = tableEndRow + 1;

  // Column letters according to mode
  const balInitCol = sbs ? 'D' : 'C';
  const amortCol = sbs ? 'E' : 'D';
  const intCol = sbs ? 'F' : 'E';
  const basePayCol = sbs ? 'G' : 'F';
  const desgCol = 'H';
  const feeCol = 'I';
  const totalPayCol = sbs ? 'J' : 'F';
  const balEndCol = sbs ? 'K' : 'G';
  const cfCol = sbs ? 'L' : 'H';

  const rightLabelStart = 'E';
  const rightLabelEnd = sbs ? 'K' : 'G';
  const rightValCol = sbs ? 'L' : 'H';
  const teaRef = `${rightValCol}6`;

  // Left Parameter Block (Rows 6..12)
  const periodRateValue: ExcelJS.CellValue =
    input.rateType === 'PERIOD_EFFECTIVE'
      ? rates.periodRate
      : {
          formula: `IF(${teaRef}=0,0,(1+${teaRef})^(${rates.daysPerPeriod}/360)-1)`,
          result: rates.periodRate,
        };

  const leftParams: Array<{
    row: number;
    label: string;
    value: ExcelJS.CellValue;
    numFmt: string;
  }> = [
    {
      row: 6,
      label: 'Capital / Principal (P)',
      value: summary.principal,
      numFmt: moneyFmt,
    },
    {
      row: 7,
      label: `Total Periodos (n · ${freqMeta.label})`,
      value: summary.totalPeriods,
      numFmt: '#,##0',
    },
    {
      row: 8,
      label: `Tasa Efectiva Periodo (${rates.periodRateLabel})`,
      value: periodRateValue,
      numFmt: '0.0000%',
    },
    {
      row: 9,
      label: 'Periodos de Gracia (g)',
      value: summary.gracePeriods,
      numFmt: '#,##0',
    },
    {
      row: 10,
      label: 'Periodos Amortización (m = n - g)',
      value: { formula: 'C7-C9', result: summary.amortizationPeriods },
      numFmt: '#,##0',
    },
    {
      row: 11,
      label: 'Capital Post-Gracia (P efectivo)',
      value:
        summary.gracePeriods > 0 && input.graceType === 'total'
          ? {
              formula: `${balInitCol}${tableStartRow + summary.gracePeriods}`,
              result: summary.effectivePrincipal,
            }
          : { formula: 'C6', result: summary.effectivePrincipal },
      numFmt: moneyFmt,
    },
    {
      row: 12,
      label:
        input.rateType === 'TNA'
          ? `TNA Ingresada (Cap. m = ${rates.compoundingPerYear})`
          : 'Días por Periodo (Base 360 SBS)',
      value: input.rateType === 'TNA' ? rates.inputRateDecimal : rates.daysPerPeriod,
      numFmt: input.rateType === 'TNA' ? '0.00%' : '#,##0',
    },
  ];

  for (const item of leftParams) {
    sheet.mergeCells(`A${item.row}:B${item.row}`);
    const lbl = sheet.getCell(`A${item.row}`);
    lbl.value = item.label;
    lbl.font = { name: 'Calibri', size: 10, color: { argb: COLORS.muted } };
    lbl.alignment = { vertical: 'middle', horizontal: 'left' };

    const val = sheet.getCell(`C${item.row}`);
    val.value = item.value;
    val.numFmt = item.numFmt;
    val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.ink } };
    val.alignment = { vertical: 'middle', horizontal: 'right' };
    val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandLighter } };
    val.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
    sheet.getRow(item.row).height = 19;
  }

  // Right Summary Block (Rows 6..12)
  const teaCellValue: ExcelJS.CellValue =
    input.rateType === 'TEA'
      ? rates.tea
      : input.rateType === 'TNA'
        ? {
            formula: `IF(C12=0,0,(1+C12/${rates.compoundingPerYear})^${rates.compoundingPerYear}-1)`,
            result: rates.tea,
          }
        : {
            formula: `IF(C8=0,0,(1+C8)^${rates.periodsPerYear}-1)`,
            result: rates.tea,
          };

  const rightParams: Array<{
    row: number;
    label: string;
    value: ExcelJS.CellValue;
    numFmt: string;
  }> = [
    {
      row: 6,
      label: input.rateType === 'TEA' ? 'TEA Ingresada (Base 360 días)' : 'TEA Equivalente (Base 360)',
      value: teaCellValue,
      numFmt: '0.00%',
    },
    {
      row: 7,
      label: sbs ? `Desgravamen Periodo (${freqMeta.shortLabel})` : 'Factor FRC (A/P, i, m)',
      value: sbs
        ? rates.periodDesgravamenRate
        : {
            formula: 'IF(C8=0,1/C10,(C8*(1+C8)^C10)/((1+C8)^C10-1))',
            result: summary.frcFactor,
          },
      numFmt: sbs ? '0.0000%' : '0.000000',
    },
    {
      row: 8,
      label: sbs ? 'Comisión / Portes por Periodo' : 'Modalidad de Cálculo',
      value: sbs ? input.fixedFeePerPeriod : 'Académico Puro (P, n, i)',
      numFmt: sbs ? moneyFmt : '@',
    },
    {
      row: 9,
      label: 'Total Intereses',
      value: {
        formula: `SUM(${intCol}${tableStartRow}:${intCol}${tableEndRow})`,
        result: summary.totalInterest,
      },
      numFmt: moneyFmt,
    },
    {
      row: 10,
      label: 'Monto Total a Pagar',
      value: {
        formula: `SUM(${totalPayCol}${tableStartRow}:${totalPayCol}${tableEndRow})`,
        result: summary.totalPaid,
      },
      numFmt: moneyFmt,
    },
    {
      row: 11,
      label: `TIR del Periodo (${freqMeta.shortLabel})`,
      value: {
        formula: `IFERROR(IRR(${cfCol}${period0Row}:${cfCol}${tableEndRow},C8),0)`,
        result: summary.periodicIrr,
      },
      numFmt: '0.0000%',
    },
    {
      row: 12,
      label: 'TCEA Anualizada (Base 360)',
      value: {
        formula: `IF(${rightValCol}11<=0,0,(1+${rightValCol}11)^${rates.periodsPerYear}-1)`,
        result: summary.tcea,
      },
      numFmt: '0.00%',
    },
  ];

  for (const item of rightParams) {
    sheet.mergeCells(`${rightLabelStart}${item.row}:${rightLabelEnd}${item.row}`);
    const lbl = sheet.getCell(`${rightLabelStart}${item.row}`);
    lbl.value = item.label;
    lbl.font = { name: 'Calibri', size: 10, color: { argb: COLORS.muted } };
    lbl.alignment = { vertical: 'middle', horizontal: 'left' };

    const val = sheet.getCell(`${rightValCol}${item.row}`);
    val.value = item.value;
    val.numFmt = item.numFmt;
    val.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.ink } };
    val.alignment = { vertical: 'middle', horizontal: 'right' };
    val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandLighter } };
    val.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
  }

  sheet.getRow(13).height = 8;

  // Row 14: Schedule Table Header
  const headers = sbs
    ? [
        'N°',
        'Fecha Venc.',
        'Tipo Periodo',
        'Saldo Inicial',
        'Amortización',
        'Interés',
        'Cuota Base',
        'Desgravamen',
        'Comis./Portes',
        'Cuota Total',
        'Saldo Final',
        'Flujo (TIR)',
      ]
    : [
        'N°',
        'Fecha Venc.',
        'Saldo Inicial',
        'Amortización',
        'Interés',
        'Cuota',
        'Saldo Final',
        'Flujo (TIR)',
      ];

  const headerRow = sheet.getRow(headerRowNum);
  headerRow.height = 25;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandDark } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx <= (sbs ? 2 : 1) ? 'center' : 'right',
    };
  });

  // Row 15: Period 0 (Disbursement row enabling live Excel IRR / TCEA calculation)
  const p0 = sheet.getRow(period0Row);
  p0.height = 19;
  p0.getCell(1).value = 0;
  p0.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  p0.getCell(2).value = formatIsoDateEsPe(input.startDate);
  p0.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  if (sbs) {
    p0.getCell(3).value = 'Desembolso';
    p0.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  }
  const p0Bal = sheet.getCell(`${balEndCol}${period0Row}`);
  p0Bal.value = { formula: 'C6', result: summary.principal };
  p0Bal.numFmt = moneyFmt;

  const p0Cf = sheet.getCell(`${cfCol}${period0Row}`);
  p0Cf.value = { formula: 'C6', result: summary.principal };
  p0Cf.numFmt = moneyFmt;

  for (let c = 1; c <= lastColIndex; c++) {
    const cell = p0.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.period0Bg } };
    cell.font = { name: 'Calibri', size: 10, bold: c === 1 || c >= lastColIndex - 1, color: { argb: COLORS.brandDark } };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
  }

  // Rows 16 .. 15 + n: Payment Schedule Rows
  const desgRateRef = `$${rightValCol}$7`;
  const feeRef = `$${rightValCol}$8`;

  rows.forEach((row, idx) => {
    const r = tableStartRow + idx;
    const isLast = idx === rows.length - 1;
    const xlRow = sheet.getRow(r);
    xlRow.height = 19;

    xlRow.getCell(1).value = row.period;
    xlRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    xlRow.getCell(2).value = formatIsoDateEsPe(row.dueDate);
    xlRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

    if (sbs) {
      xlRow.getCell(3).value =
        row.phase === 'grace_total'
          ? 'Gracia Total'
          : row.phase === 'grace_partial'
            ? 'Gracia Parcial'
            : 'Normal';
      xlRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Opening Balance uniformly references previous row's Closing Balance (Period 0 -> Period 1 -> ... -> n)
    const openCell = sheet.getCell(`${balInitCol}${r}`);
    openCell.value = { formula: `${balEndCol}${r - 1}`, result: row.openingBalance };
    openCell.numFmt = moneyFmt;

    // Interest = ROUND(OpeningBalance * i_p, 2)
    const intCell = sheet.getCell(`${intCol}${r}`);
    intCell.value = {
      formula: `ROUND(${balInitCol}${r}*$C$8,2)`,
      result: row.interest,
    };
    intCell.numFmt = moneyFmt;

    if (sbs) {
      const desgCell = sheet.getCell(`${desgCol}${r}`);
      desgCell.value = {
        formula: `ROUND(${balInitCol}${r}*${desgRateRef},2)`,
        result: row.desgravamen,
      };
      desgCell.numFmt = moneyFmt;

      const feeCell = sheet.getCell(`${feeCol}${r}`);
      feeCell.value =
        row.phase === 'grace_total'
          ? 0
          : { formula: `IF(${balInitCol}${r}<=0,0,${feeRef})`, result: row.fees };
      feeCell.numFmt = moneyFmt;
    }

    const amortCell = sheet.getCell(`${amortCol}${r}`);
    const baseCell = sheet.getCell(`${basePayCol}${r}`);
    const endCell = sheet.getCell(`${balEndCol}${r}`);

    if (row.phase === 'grace_total') {
      amortCell.value = 0;
      baseCell.value = 0;
      endCell.value = {
        formula: sbs
          ? `ROUND(${balInitCol}${r}+${intCol}${r}+${desgCol}${r},2)`
          : `ROUND(${balInitCol}${r}+${intCol}${r},2)`,
        result: row.closingBalance,
      };
    } else if (row.phase === 'grace_partial') {
      amortCell.value = 0;
      baseCell.value = { formula: `${intCol}${r}`, result: row.basePayment };
      endCell.value = { formula: `${balInitCol}${r}`, result: row.closingBalance };
    } else if (isLast) {
      // Final period n closes balance at exact 0.00 across all 3 methods
      amortCell.value = { formula: `${balInitCol}${r}`, result: row.amortization };
      baseCell.value = {
        formula: `ROUND(${amortCol}${r}+${intCol}${r},2)`,
        result: row.basePayment,
      };
      endCell.value = {
        formula: `ROUND(${balInitCol}${r}-${amortCol}${r},2)`,
        result: 0,
      };
    } else if (input.method === 'french') {
      // French method: uses PMT with IF guard for i = 0% (no leading "=")
      baseCell.value = {
        formula: `IF(${balInitCol}${r}<=0,0,IF($C$8=0,ROUND($C$11/$C$10,2),ROUND(PMT($C$8,$C$10,-$C$11),2)))`,
        result: row.basePayment,
      };
      amortCell.value = {
        formula: `MIN(${balInitCol}${r},MAX(0,ROUND(${basePayCol}${r}-${intCol}${r},2)))`,
        result: row.amortization,
      };
      endCell.value = {
        formula: `ROUND(${balInitCol}${r}-${amortCol}${r},2)`,
        result: row.closingBalance,
      };
    } else if (input.method === 'german') {
      // German method: constant amortization P_eff / (n - g)
      amortCell.value = {
        formula: `MIN(${balInitCol}${r},ROUND($C$11/$C$10,2))`,
        result: row.amortization,
      };
      baseCell.value = {
        formula: `ROUND(${amortCol}${r}+${intCol}${r},2)`,
        result: row.basePayment,
      };
      endCell.value = {
        formula: `ROUND(${balInitCol}${r}-${amortCol}${r},2)`,
        result: row.closingBalance,
      };
    } else {
      // American method: 0 amortization until period n, interest only
      amortCell.value = 0;
      baseCell.value = {
        formula: `${intCol}${r}`,
        result: row.basePayment,
      };
      endCell.value = {
        formula: `${balInitCol}${r}`,
        result: row.closingBalance,
      };
    }

    amortCell.numFmt = moneyFmt;
    baseCell.numFmt = moneyFmt;
    endCell.numFmt = moneyFmt;

    if (sbs) {
      const totCell = sheet.getCell(`${totalPayCol}${r}`);
      totCell.value =
        row.phase === 'grace_total'
          ? 0
          : {
              formula: `ROUND(${basePayCol}${r}+${desgCol}${r}+${feeCol}${r},2)`,
              result: row.totalPayment,
            };
      totCell.numFmt = moneyFmt;
      totCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.ink } };
    } else {
      baseCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.ink } };
    }

    // Cash flow column for live Excel IRR / TCEA
    const cfCell = sheet.getCell(`${cfCol}${r}`);
    cfCell.value = {
      formula: `-${totalPayCol}${r}`,
      result: row.totalPayment === 0 ? 0 : -row.totalPayment,
    };
    cfCell.numFmt = moneyFmt;

    const bgArgb =
      row.phase === 'grace_total'
        ? COLORS.graceTotalBg
        : row.phase === 'grace_partial'
          ? COLORS.gracePartialBg
          : idx % 2 === 1
            ? COLORS.brandLighter
            : COLORS.white;

    for (let c = 1; c <= lastColIndex; c++) {
      const cell = xlRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      if (!cell.font) {
        cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.ink } };
      }
      cell.border = { bottom: { style: 'hair', color: { argb: COLORS.border } } };
    }
  });

  // Totals Row
  const totRow = sheet.getRow(totalRowNum);
  totRow.height = 24;
  sheet.getCell(`A${totalRowNum}`).value = 'TOTAL';
  sheet.getCell(`A${totalRowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const sumCols = sbs
    ? [
        { col: amortCol, result: summary.totalAmortization },
        { col: intCol, result: summary.totalInterest },
        { col: basePayCol, result: summary.totalBasePayment },
        { col: desgCol, result: summary.totalDesgravamen },
        { col: feeCol, result: summary.totalFees },
        { col: totalPayCol, result: summary.totalPaid },
      ]
    : [
        { col: amortCol, result: summary.totalAmortization },
        { col: intCol, result: summary.totalInterest },
        { col: basePayCol, result: summary.totalPaid },
      ];

  for (const item of sumCols) {
    const cell = sheet.getCell(`${item.col}${totalRowNum}`);
    cell.value = {
      formula: `SUM(${item.col}${tableStartRow}:${item.col}${tableEndRow})`,
      result: item.result,
    };
    cell.numFmt = moneyFmt;
  }
  sheet.getCell(`${balEndCol}${totalRowNum}`).value = 0;
  sheet.getCell(`${balEndCol}${totalRowNum}`).numFmt = moneyFmt;

  for (let c = 1; c <= lastColIndex; c++) {
    const cell = totRow.getCell(c);
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.brandDark } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.brandDark } },
      bottom: { style: 'double', color: { argb: COLORS.brandDark } },
    };
  }

  const colWidths = sbs
    ? [7, 13, 15, 16, 15, 14, 15, 14, 14, 16, 16, 15]
    : [8, 14, 17, 16, 15, 17, 17, 16];
  colWidths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  // =========================================================================
  // SHEET 2: Resumen y Comparativa de Sistemas
  // =========================================================================
  const compSheet = workbook.addWorksheet('Resumen y Comparativa');
  const comparison = compareAllMethods(input);

  compSheet.mergeCells('A1:G1');
  const cTitle = compSheet.getCell('A1');
  cTitle.value = 'COMPARATIVA DE SISTEMAS DE AMORTIZACIÓN — INGENIERÍA ECONÓMICA';
  cTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLORS.white } };
  cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandDark } };
  cTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  compSheet.getRow(1).height = 28;

  compSheet.mergeCells('A2:G2');
  compSheet.getCell('A2').value =
    `Base: P = ${input.currency === 'PEN' ? 'S/' : 'US$'} ${summary.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}   |   n = ${summary.totalPeriods} periodos (${freqMeta.label})   |   TEA = ${(rates.tea * 100).toFixed(2)}%   |   ${rates.periodRateLabel} = ${(rates.periodRate * 100).toFixed(4)}%`;
  compSheet.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: COLORS.ink } };
  compSheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  compSheet.getRow(2).height = 22;

  const compHeaders = [
    'Sistema de Amortización',
    'Primera Cuota Normal',
    'Última Cuota',
    'Total Intereses',
    'Dif. Intereses vs. Francés',
    'Total a Pagar',
    'TCEA',
  ];
  const compHeadRow = compSheet.getRow(4);
  compHeadRow.height = 24;
  compHeaders.forEach((h, idx) => {
    const cell = compHeadRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandMid } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'right' };
  });

  comparison.forEach((item, idx) => {
    const rowIdx = 5 + idx;
    const xlRow = compSheet.getRow(rowIdx);
    xlRow.height = 21;
    xlRow.getCell(1).value = item.label;
    xlRow.getCell(2).value = item.firstPayment;
    xlRow.getCell(3).value = item.lastPayment;
    xlRow.getCell(4).value = item.totalInterest;
    xlRow.getCell(5).value = {
      formula: `D${rowIdx}-$D$5`,
      result: item.interestDeltaVsFrench,
    };
    xlRow.getCell(6).value = item.totalPaid;
    xlRow.getCell(7).value = item.tcea;

    [2, 3, 4, 5, 6].forEach((c) => {
      xlRow.getCell(c).numFmt = moneyFmt;
    });
    xlRow.getCell(7).numFmt = '0.00%';

    const isSelected = item.method === input.method;
    for (let c = 1; c <= 7; c++) {
      const cell = xlRow.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: isSelected || c === 1,
        color: { argb: isSelected ? COLORS.brandDark : COLORS.ink },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isSelected ? COLORS.brandSoft : COLORS.white },
      };
      cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
    }
  });

  compSheet.mergeCells('A10:G10');
  compSheet.getCell('A10').value = 'FÓRMULAS CLAVE DE INGENIERÍA ECONÓMICA APLICADAS (SBS PERÚ · 360 DÍAS)';
  compSheet.getCell('A10').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  compSheet.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  compSheet.getRow(10).height = 22;

  const formulasRef: Array<[string, string]> = [
    ['Conversión TEA a Tasa del Periodo', 'i_p = (1 + TEA)^(días / 360) - 1'],
    ['Conversión TNA a TEA', 'TEA = (1 + TNA / m)^m - 1'],
    ['Método Francés (Cuota Fija)', 'R = P_ef * [ i(1+i)^m / ((1+i)^m - 1) ]  (si i = 0% => R = P_ef / m)'],
    ['Método Alemán (Amort. Constante)', 'A_k = P_ef / m ;  I_k = S_(k-1) * i ;  R_k = A_k + I_k'],
    ['Método Americano', 'I_k = P_ef * i  (k < n) ;  R_n = P_ef + I_n'],
    ['TCEA (Costo Efectivo Anual)', 'TCEA = (1 + TIR_periodo)^(periodos/año) - 1   donde VAN(TIR) = 0'],
  ];

  formulasRef.forEach(([name, expr], idx) => {
    const r = 11 + idx;
    compSheet.getCell(`A${r}`).value = name;
    compSheet.getCell(`A${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.ink } };
    compSheet.mergeCells(`B${r}:G${r}`);
    compSheet.getCell(`B${r}`).value = expr;
    compSheet.getCell(`B${r}`).font = { name: 'Consolas', size: 9.5, color: { argb: COLORS.muted } };
    compSheet.getRow(r).height = 19;
  });

  [30, 20, 18, 18, 22, 20, 12].forEach((w, i) => {
    compSheet.getColumn(i + 1).width = w;
  });

  return workbook;
}

export async function exportScheduleToExcel(result: SimulationResult): Promise<void> {
  const workbook = await buildExcelWorkbook(result);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const methodSlug = result.input.method;
  link.href = url;
  link.download = `cronograma-pago-${methodSlug}-${result.summary.totalPeriods}cuotas.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
