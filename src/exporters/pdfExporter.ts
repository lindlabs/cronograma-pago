import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FREQUENCY_META } from '../engine/rates';
import type { SimulationResult } from '../types/finance';
import {
  formatIsoDateEsPe,
  formatMoney,
  formatPercent,
  graceLabel,
  methodLabel,
} from '../utils/formatters';

export function buildPdfDocument(result: SimulationResult): jsPDF {
  const { input, rates, rows, summary } = result;
  const sbs = input.sbsMode;
  const freqMeta = FREQUENCY_META[input.frequency];

  const doc = new jsPDF({
    orientation: sbs ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // Top Header Gradient-style Indigo Banner
  doc.setFillColor(37, 34, 234);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(102, 88, 246);
  doc.rect(0, 26, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CRONOGRAMA DE PAGOS — PERÚ (SBS · BASE 360)', marginX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subParts: string[] = [];
  if (input.academic.university.trim()) subParts.push(input.academic.university.trim());
  if (input.academic.course.trim()) subParts.push(`Curso: ${input.academic.course.trim()}`);
  const subtitleLine1 =
    subParts.length > 0 ? subParts.join('  •  ') : 'Simulador de Ingeniería Económica';
  doc.text(subtitleLine1, marginX, 17.5);

  const subParts2: string[] = [];
  if (input.academic.professor.trim()) subParts2.push(`Docente: ${input.academic.professor.trim()}`);
  if (input.academic.studentOrGroup.trim()) {
    subParts2.push(`Alumno / Integrantes: ${input.academic.studentOrGroup.trim()}`);
  }
  if (subParts2.length > 0) {
    doc.setFontSize(8.5);
    doc.text(subParts2.join('  •  '), marginX, 23);
  } else {
    doc.setFontSize(8.5);
    doc.text(
      `Sistema: ${methodLabel(input.method)}  •  Modo: ${sbs ? 'Banca Perú / SBS' : 'Académico Puro'}`,
      marginX,
      23,
    );
  }

  // Right side badge: generation date
  const genDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Emitido: ${genDate}`, pageWidth - marginX, 11, { align: 'right' });
  doc.text(
    `Modo: ${sbs ? 'Banca Perú (SBS)' : 'Académico Puro'}`,
    pageWidth - marginX,
    17,
    { align: 'right' },
  );

  // Executive Summary Box
  const boxY = 33;
  const boxH = 26;
  doc.setFillColor(244, 243, 255);
  doc.setDrawColor(217, 214, 250);
  doc.roundedRect(marginX, boxY, pageWidth - marginX * 2, boxH, 3, 3, 'FD');

  const colW = (pageWidth - marginX * 2) / 4;
  const kpiItems: Array<{ label: string; value: string; sub: string }> = [
    {
      label: 'CAPITAL FINANCIADO (P)',
      value: formatMoney(summary.principal, input.currency),
      sub: `${summary.totalPeriods} cuotas (${freqMeta.label})`,
    },
    {
      label: `TASAS (${rates.periodRateLabel} / TEA)`,
      value: `${formatPercent(rates.periodRate, 4)}`,
      sub: `TEA: ${formatPercent(rates.tea, 2)} · TCEA: ${formatPercent(summary.tcea, 2)}`,
    },
    {
      label: 'TOTAL INTERESES',
      value: formatMoney(summary.totalInterest, input.currency),
      sub: sbs
        ? `Seg./Portes: ${formatMoney(summary.totalDesgravamen + summary.totalFees, input.currency)}`
        : `${formatPercent(summary.interestToPrincipalRatio, 1)} del capital`,
    },
    {
      label: 'TOTAL A PAGAR',
      value: formatMoney(summary.totalPaid, input.currency),
      sub: `${methodLabel(input.method).split(' ')[0]} · ${graceLabel(input.graceType, summary.gracePeriods)}`,
    },
  ];

  kpiItems.forEach((item, idx) => {
    const x = marginX + idx * colW + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(102, 88, 246);
    doc.text(item.label, x, boxY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 15, 36);
    doc.text(item.value, x, boxY + 14.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(108, 105, 138);
    doc.text(item.sub, x, boxY + 21);
  });

  // Schedule Table
  const head = sbs
    ? [
        [
          'N°',
          'Fecha',
          'Tipo',
          'Saldo Inicial',
          'Amortización',
          'Interés',
          'Cuota Base',
          'Desgrav.',
          'Portes',
          'Cuota Total',
          'Saldo Final',
        ],
      ]
    : [['N°', 'Fecha', 'Saldo Inicial', 'Amortización', 'Interés', 'Cuota', 'Saldo Final']];

  const body = rows.map((row) => {
    const fmt = (v: number) => formatMoney(v, input.currency);
    if (sbs) {
      const phaseTxt =
        row.phase === 'grace_total'
          ? 'G. Total'
          : row.phase === 'grace_partial'
            ? 'G. Parcial'
            : 'Normal';
      return [
        String(row.period),
        formatIsoDateEsPe(row.dueDate),
        phaseTxt,
        fmt(row.openingBalance),
        fmt(row.amortization),
        fmt(row.interest),
        fmt(row.basePayment),
        fmt(row.desgravamen),
        fmt(row.fees),
        fmt(row.totalPayment),
        fmt(row.closingBalance),
      ];
    }
    return [
      String(row.period),
      formatIsoDateEsPe(row.dueDate),
      fmt(row.openingBalance),
      fmt(row.amortization),
      fmt(row.interest),
      fmt(row.totalPayment),
      fmt(row.closingBalance),
    ];
  });

  // Totals Footer Row appended cleanly at the end of body so it renders only once at the bottom
  const fmtTot = (v: number) => formatMoney(v, input.currency);
  const totalsRow = sbs
    ? [
        'TOTAL',
        '',
        '',
        '',
        fmtTot(summary.totalAmortization),
        fmtTot(summary.totalInterest),
        fmtTot(summary.totalAmortization + summary.totalInterest),
        fmtTot(summary.totalDesgravamen),
        fmtTot(summary.totalFees),
        fmtTot(summary.totalPaid),
        fmtTot(0),
      ]
    : [
        'TOTAL',
        '',
        '',
        fmtTot(summary.totalAmortization),
        fmtTot(summary.totalInterest),
        fmtTot(summary.totalPaid),
        fmtTot(0),
      ];

  body.push(totalsRow);

  autoTable(doc, {
    startY: boxY + boxH + 5,
    head,
    body,
    theme: 'grid',
    showHead: 'everyPage',
    margin: { left: marginX, right: marginX, bottom: 14 },
    styles: {
      font: 'helvetica',
      fontSize: sbs ? 7.3 : 8,
      cellPadding: sbs ? 1.8 : 2.1,
      textColor: [16, 15, 36],
      lineColor: [224, 221, 250],
      lineWidth: 0.15,
      halign: 'right',
    },
    headStyles: {
      fillColor: [37, 34, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: sbs
      ? {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'center', cellWidth: 18 },
          9: { fontStyle: 'bold' },
        }
      : {
          0: { halign: 'center', cellWidth: 11 },
          1: { halign: 'center', cellWidth: 22 },
          5: { fontStyle: 'bold' },
        },
    alternateRowStyles: {
      fillColor: [248, 247, 255],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const isTotals = data.row.index === body.length - 1;
        if (isTotals) {
          data.cell.styles.fillColor = [236, 234, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [37, 34, 234];
        } else {
          const schedRow = rows[data.row.index];
          if (schedRow?.phase === 'grace_total') {
            data.cell.styles.fillColor = [253, 242, 248];
          } else if (schedRow?.phase === 'grace_partial') {
            data.cell.styles.fillColor = [255, 251, 235];
          }
        }
      }
      if (data.section === 'head' && data.column.index <= (sbs ? 2 : 1)) {
        data.cell.styles.halign = 'center';
      }
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(120, 117, 150);
      doc.text(
        'CronoPE · Simulador de Ingeniería Económica (Perú · Base 360 días SBS)',
        marginX,
        pageHeight - 6,
      );
      doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - marginX, pageHeight - 6, {
        align: 'right',
      });
    },
  });

  // Update page totals accurately on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 45, pageHeight - 10, 35, 6, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 117, 150);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
      align: 'right',
    });
  }

  return doc;
}

export function exportScheduleToPdf(result: SimulationResult): void {
  const doc = buildPdfDocument(result);
  doc.save(`cronograma-pago-${result.input.method}-${result.summary.totalPeriods}cuotas.pdf`);
}
