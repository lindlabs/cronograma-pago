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
  ink: 'FF100F24',
  muted: 'FF646182',
  border: 'FFD9D6FA',
  white: 'FFFFFFFF',
};

/**
 * Builds an ExcelJS Workbook with live native formulas (without leading `=`),
 * adapting formulas to the selected amortization method, handling i = 0% with IF,
 * and handling grace periods g over remaining (n - g) periods.
 */
export async function buildExcelWorkbook(result: SimulationResult): Promise<ExcelJS.Workbook> {
  const { input, rates, rows, summary } = result;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CronoPE - Ingeniería Económica Perú';
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

  const lastColIndex = sbs ? 11 : 7;
  const lastColLetter = sbs ? 'K' : 'G';

  // Row 1: Main Title Banner
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'CRONOGRAMA DE PAGOS — SIMULADOR DE INGENIERÍA ECONÓMICA (PERÚ · SBS 360)';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandDark } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  // Rows 2-3: Academic Metadata Subtitle
  const acadParts: string[] = [];
  if (input.academic.university.trim()) acadParts.push(`Universidad: ${input.academic.university.trim()}`);
  if (input.academic.course.trim()) acadParts.push(`Curso: ${input.academic.course.trim()}`);
  if (input.academic.professor.trim()) acadParts.push(`Docente: ${input.academic.professor.trim()}`);
  if (input.academic.studentOrGroup.trim()) acadParts.push(`Alumno / Grupo: ${input.academic.studentOrGroup.trim()}`);

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

  sheet.mergeCells(`A3:${lastColLetter}3`);
  const modeInfoCell = sheet.getCell('A3');
  modeInfoCell.value = `Sistema: ${methodLabel(input.method)}   •   Frecuencia: ${freqMeta.label} (${rates.daysPerPeriod} días / base 360)   •   ${graceLabel(input.graceType, summary.gracePeriods)}   •   Modo: ${sbs ? 'Banca Perú (SBS)' : 'Académico Puro'}`;
  modeInfoCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.ink } };
  modeInfoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  modeInfoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(3).height = 20;

  // Row 4: Spacer
  sheet.getRow(4).height = 8;

  // Section Header Row 5
  sheet.mergeCells('A5:C5');
  sheet.getCell('A5').value = 'PARÁMETROS DE ENTRADA (P, n, i)';
  sheet.getCell('A5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };

  sheet.mergeCells(`E5:${lastColLetter}5`);
  sheet.getCell('E5').value = 'RESUMEN FINANCIERO Y CARGOS (BASE 360 DÍAS)';
  sheet.getCell('E5').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  sheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  sheet.getRow(5).height = 20;

  // Table geometry
  const headerRowNum = 14;
  const tableStartRow = 15;
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

  // Left Parameter Block (Rows 6..11, Labels in A:B merged, Values in C)
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
      value: rates.periodRate,
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

  // Right Summary Block (Rows 6..11, Labels in E:F or E, Values in G or F)
  const rightLabelStart = 'E';
  const rightLabelEnd = sbs ? 'I' : 'F';
  const rightValCol = sbs ? 'J' : 'G';

  const rightParams: Array<{
    row: number;
    label: string;
    value: ExcelJS.CellValue;
    numFmt: string;
  }> = [
    {
      row: 6,
      label: 'TEA Equivalente (Base 360 días)',
      value: {
        formula: `IF(C8=0,0,(1+C8)^(${rates.periodsPerYear})-1)`,
        result: rates.tea,
      },
      numFmt: '0.00%',
    },
    {
      row: 7,
      label: sbs ? `Desgravamen Periodo (${freqMeta.shortLabel})` : 'Modo de Cálculo',
      value: sbs ? rates.periodDesgravamenRate : 'Académico Puro (P, n, i)',
      numFmt: sbs ? '0.0000%' : '@',
    },
    {
      row: 8,
      label: sbs ? 'Comisión / Portes por Periodo' : 'Factor FRC (A/P, i, m)',
      value: sbs
        ? input.fixedFeePerPeriod
        : {
            formula: 'IF(C8=0,1/C10,(C8*(1+C8)^C10)/((1+C8)^C10-1))',
            result: summary.frcFactor,
          },
      numFmt: sbs ? moneyFmt : '0.000000',
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
      label: 'TCEA Estimada (TIR Anualizada)',
      value: summary.tcea,
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

  // Row 12-13: Spacer
  sheet.getRow(12).height = 8;
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
      ]
    : ['N°', 'Fecha Venc.', 'Saldo Inicial', 'Amortización', 'Interés', 'Cuota', 'Saldo Final'];

  const headerRow = sheet.getRow(headerRowNum);
  headerRow.height = 26;
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

  // Schedule Rows (15 .. 15 + n - 1)
  const desgRateRef = `$${rightValCol}$7`;
  const feeRef = `$${rightValCol}$8`;

  rows.forEach((row, idx) => {
    const r = tableStartRow + idx;
    const isFirst = idx === 0;
    const isLast = idx === rows.length - 1;
    const xlRow = sheet.getRow(r);
    xlRow.height = 19;

    // Col A: Period number
    const cPeriod = xlRow.getCell(1);
    cPeriod.value = row.period;
    cPeriod.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col B: Due date
    const cDate = xlRow.getCell(2);
    cDate.value = formatIsoDateEsPe(row.dueDate);
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };

    if (sbs) {
      const cPhase = xlRow.getCell(3);
      cPhase.value =
        row.phase === 'grace_total'
          ? 'Gracia Total'
          : row.phase === 'grace_partial'
            ? 'Gracia Parcial'
            : 'Normal';
      cPhase.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Opening Balance
    const openCell = sheet.getCell(`${balInitCol}${r}`);
    openCell.value = isFirst
      ? { formula: 'C6', result: row.openingBalance }
      : { formula: `${balEndCol}${r - 1}`, result: row.openingBalance };
    openCell.numFmt = moneyFmt;

    // Interest = ROUND(OpeningBalance * i_p, 2)
    const intCell = sheet.getCell(`${intCol}${r}`);
    intCell.value = {
      formula: `ROUND(${balInitCol}${r}*$C$8,2)`,
      result: row.interest,
    };
    intCell.numFmt = moneyFmt;

    // SBS Desgravamen & Fees
    if (sbs) {
      const desgCell = sheet.getCell(`${desgCol}${r}`);
      desgCell.value = {
        formula: `ROUND(${balInitCol}${r}*${desgRateRef},2)`,
        result: row.desgravamen,
      };
      desgCell.numFmt = moneyFmt;

      const feeCell = sheet.getCell(`${feeCol}${r}`);
      feeCell.value =
        row.phase === 'grace_total' ? 0 : { formula: feeRef, result: row.fees };
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
      // Final period n guarantees exact 0.00 closing balance across all methods
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
        formula: `IF($C$8=0,ROUND($C$11/$C$10,2),ROUND(PMT($C$8,$C$10,-$C$11),2))`,
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
      // American method: 0 amortization until period n, pays interest only
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

    // Zebra striping & Grace highlight
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
      cell.border = {
        bottom: { style: 'hair', color: { argb: COLORS.border } },
      };
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
        { col: basePayCol, result: summary.totalAmortization + summary.totalInterest },
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

  // Column widths
  const colWidths = sbs
    ? [7, 13, 15, 16, 15, 14, 15, 14, 14, 16, 16]
    : [8, 14, 18, 17, 16, 18, 18];
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

  // Formulas reference block
  compSheet.mergeCells('A10:G10');
  compSheet.getCell('A10').value = 'FÓRMULAS CLAVE DE INGENIERÍA ECONÓMICA APLICADAS (SBS PERÚ · 360 DÍAS)';
  compSheet.getCell('A10').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.brandDark } };
  compSheet.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.brandSoft } };
  compSheet.getRow(10).height = 22;

  const formulasRef: Array<[string, string]> = [
    ['Conversión TEA a Tasa del Periodo', 'i_p = (1 + TEA)^(días / 360) - 1'],
    ['Conversión TNA a TEA', 'TEA = (1 + TNA / m)^m - 1'],
    ['Método Francés (Cuota Fija)', 'R = P * [ i(1+i)^m / ((1+i)^m - 1) ]  (si i = 0% => R = P / m)'],
    ['Método Alemán (Amort. Constante)', 'A_k = P / m ;  I_k = S_(k-1) * i ;  R_k = A_k + I_k'],
    ['Método Americano', 'I_k = P * i  (k < n) ;  R_n = P + P * i'],
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
