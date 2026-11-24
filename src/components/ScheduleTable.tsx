import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import type { SimulationResult } from '../types/finance';
import { formatIsoDateEsPe, formatMoney } from '../utils/formatters';

interface ScheduleTableProps {
  result: SimulationResult;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExportingExcel: boolean;
}

const PAGE_SIZE = 24;

export function ScheduleTable({
  result,
  onExportPdf,
  onExportExcel,
  isExportingExcel,
}: ScheduleTableProps) {
  const { input, rows, annualSummary, summary } = result;
  const sbs = input.sbsMode;
  const totalYears = annualSummary.length;

  const [viewGranularity, setViewGranularity] = useState<'detail' | 'annual'>('detail');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);

  // Reset pagination & year filter if term shrinks below current selected year
  useEffect(() => {
    if (selectedYear !== 'all' && selectedYear > totalYears) {
      setSelectedYear('all');
    }
    setPage(1);
  }, [totalYears, rows.length, selectedYear]);

  const filteredRows = useMemo(() => {
    if (selectedYear === 'all') return rows;
    return rows.filter((r) => r.yearIndex === selectedYear);
  }, [rows, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const fmt = (v: number) => formatMoney(v, input.currency);

  const phaseBadge = (phase: 'grace_total' | 'grace_partial' | 'normal') => {
    if (phase === 'grace_total') {
      return (
        <span className="inline-flex rounded-full bg-[#FCE7F3] px-2 py-0.5 text-[10px] font-bold text-[#BE185D]">
          G. Total
        </span>
      );
    }
    if (phase === 'grace_partial') {
      return (
        <span className="inline-flex rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
          G. Parcial
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-[#ECEAFF] px-2 py-0.5 text-[10px] font-bold text-[#3E35F2]">
        Normal
      </span>
    );
  };

  return (
    <div className="card-floating overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-[#F0EEFF] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Detail vs Annual Summary */}
          <div className="inline-flex rounded-2xl bg-[#F3F2FF] p-1">
            <button
              type="button"
              onClick={() => setViewGranularity('detail')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                viewGranularity === 'detail'
                  ? 'bg-[#0C0C14] text-white'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Por Cuota ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setViewGranularity('annual')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                viewGranularity === 'annual'
                  ? 'bg-[#0C0C14] text-white'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Resumen Anual ({totalYears})
            </button>
          </div>

          {/* Year Filter (only in detail view when more than 1 year) */}
          {viewGranularity === 'detail' && totalYears > 1 && (
            <select
              aria-label="Filtrar por año"
              value={selectedYear}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedYear(v === 'all' ? 'all' : Number(v));
                setPage(1);
              }}
              className="rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-1.5 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
            >
              <option value="all">Todos los años ({rows.length})</option>
              {annualSummary.map((yr) => (
                <option key={yr.yearIndex} value={yr.yearIndex}>
                  Año {yr.yearIndex} (Cuotas {yr.startPeriod}–{yr.endPeriod})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {/* Mobile layout toggle */}
          {viewGranularity === 'detail' && (
            <div className="inline-flex rounded-xl bg-[#F3F2FF] p-1 md:hidden">
              <button
                type="button"
                onClick={() => setMobileLayout('cards')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  mobileLayout === 'cards' ? 'bg-white text-[#2925EB] shadow-xs' : 'text-[#6C698A]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout('table')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  mobileLayout === 'table' ? 'bg-white text-[#2925EB] shadow-xs' : 'text-[#6C698A]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabla
              </button>
            </div>
          )}

          {/* Inline quick export buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ECEAFF] px-3 py-1.5 text-xs font-bold text-[#2925EB] transition hover:bg-[#DDD9FE]"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0C0C14] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#232236] disabled:opacity-60"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#A79BFF]" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* ANNUAL CONSOLIDATED VIEW */}
      {viewGranularity === 'annual' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-right text-xs">
            <thead>
              <tr className="bg-[#F6F5FF] text-[11px] font-bold tracking-wide text-[#6C698A] uppercase">
                <th className="px-4 py-3 text-left">Año</th>
                <th className="px-3 py-3 text-center">Cuotas</th>
                <th className="px-3 py-3">Saldo Inicial</th>
                <th className="px-3 py-3">Amortización</th>
                <th className="px-3 py-3">Intereses</th>
                {sbs && <th className="px-3 py-3">Seg./Portes</th>}
                <th className="px-3 py-3">Total Anual</th>
                <th className="px-4 py-3">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFFF] tabular-nums">
              {annualSummary.map((yr) => (
                <tr
                  key={yr.yearIndex}
                  onClick={() => {
                    setSelectedYear(yr.yearIndex);
                    setViewGranularity('detail');
                    setPage(1);
                  }}
                  title="Clic para ver el detalle de cuotas de este año"
                  className="cursor-pointer transition hover:bg-[#F8F7FF]"
                >
                  <td className="px-4 py-3 text-left font-extrabold text-[#2925EB]">
                    Año {yr.yearIndex}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-[#6C698A]">
                    {yr.startPeriod}–{yr.endPeriod}
                  </td>
                  <td className="px-3 py-3 text-[#6C698A]">{fmt(yr.openingBalance)}</td>
                  <td className="px-3 py-3 font-semibold text-[#4C3FF0]">{fmt(yr.amortization)}</td>
                  <td className="px-3 py-3 font-semibold text-[#C28608]">{fmt(yr.interest)}</td>
                  {sbs && (
                    <td className="px-3 py-3 font-semibold text-[#BE185D]">
                      {fmt(yr.desgravamen + yr.fees)}
                    </td>
                  )}
                  <td className="px-3 py-3 font-extrabold text-[#100F24]">{fmt(yr.totalPayment)}</td>
                  <td className="px-4 py-3 font-bold text-[#100F24]">{fmt(yr.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#ECEAFF] font-extrabold text-[#2522EA] tabular-nums">
                <td className="px-4 py-3.5 text-left" colSpan={3}>
                  TOTAL ({summary.totalPeriods} cuotas)
                </td>
                <td className="px-3 py-3.5">{fmt(summary.totalAmortization)}</td>
                <td className="px-3 py-3.5">{fmt(summary.totalInterest)}</td>
                {sbs && (
                  <td className="px-3 py-3.5">{fmt(summary.totalDesgravamen + summary.totalFees)}</td>
                )}
                <td className="px-3 py-3.5">{fmt(summary.totalPaid)}</td>
                <td className="px-4 py-3.5">{fmt(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW (< md when mobileLayout === 'cards') */}
          <div className={`${mobileLayout === 'cards' ? 'block md:hidden' : 'hidden'} divide-y divide-[#F1EFFF] p-3`}>
            {paginatedRows.map((row) => (
              <div
                key={row.period}
                className={`mb-2.5 rounded-2xl border p-3.5 ${
                  row.phase === 'grace_total'
                    ? 'border-[#FBCFE8] bg-[#FDF2F8]/60'
                    : row.phase === 'grace_partial'
                      ? 'border-[#FDE68A] bg-[#FFFBEB]/60'
                      : 'border-[#ECEAFF] bg-[#FAF9FF]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums inline-flex h-7 min-w-7 items-center justify-center rounded-xl bg-[#2925EB] px-2 text-xs font-extrabold text-white">
                      #{row.period}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#100F24]">
                        {formatIsoDateEsPe(row.dueDate)}
                      </div>
                      <div className="text-[10px] font-semibold text-[#6C698A]">
                        Año {row.yearIndex}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-[#6C698A]">Cuota Total</div>
                    <div className="tabular-nums text-sm font-extrabold text-[#100F24]">
                      {fmt(row.totalPayment)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-[#ECEAFF] pt-2.5 text-[11px] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Saldo Ini.:</span>
                    <span className="font-semibold text-[#100F24]">{fmt(row.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Saldo Fin.:</span>
                    <span className="font-bold text-[#2925EB]">{fmt(row.closingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Amortiz.:</span>
                    <span className="font-semibold text-[#4C3FF0]">{fmt(row.amortization)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Interés:</span>
                    <span className="font-semibold text-[#C28608]">{fmt(row.interest)}</span>
                  </div>
                  {sbs && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#6C698A]">Desgrav.:</span>
                        <span className="font-semibold text-[#BE185D]">{fmt(row.desgravamen)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6C698A]">Portes:</span>
                        <span className="font-semibold text-[#6C698A]">{fmt(row.fees)}</span>
                      </div>
                    </>
                  )}
                </div>

                {row.phase !== 'normal' && <div className="mt-2">{phaseBadge(row.phase)}</div>}
              </div>
            ))}

            {/* Mobile Totals Summary Card */}
            <div className="mt-3 rounded-2xl bg-[#ECEAFF] p-3.5 text-xs text-[#2522EA] tabular-nums">
              <div className="mb-2 font-extrabold uppercase">Totales del Cronograma ({rows.length} cuotas)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] opacity-80">Amortización Total</span>
                  <strong className="font-extrabold">{fmt(summary.totalAmortization)}</strong>
                </div>
                <div>
                  <span className="block text-[10px] opacity-80">Intereses Totales</span>
                  <strong className="font-extrabold">{fmt(summary.totalInterest)}</strong>
                </div>
                <div>
                  <span className="block text-[10px] opacity-80">Total a Pagar</span>
                  <strong className="font-extrabold">{fmt(summary.totalPaid)}</strong>
                </div>
                <div>
                  <span className="block text-[10px] opacity-80">Saldo Final</span>
                  <strong className="font-extrabold">{fmt(0)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP (and Mobile Table Mode) TABLE VIEW */}
          <div className={`${mobileLayout === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto`}>
            <table className={`w-full border-collapse text-right text-xs ${sbs ? 'min-w-[840px]' : 'min-w-[620px]'}`}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F6F5FF] text-[11px] font-bold tracking-wide text-[#6C698A] uppercase">
                  <th className="px-3.5 py-3 text-center">N°</th>
                  <th className="px-3 py-3 text-center">Fecha</th>
                  {sbs && <th className="px-2.5 py-3 text-center">Tipo</th>}
                  <th className="px-3 py-3">Saldo Inicial</th>
                  <th className="px-3 py-3">Amortización</th>
                  <th className="px-3 py-3">Interés</th>
                  {sbs && <th className="px-3 py-3">Cuota Base</th>}
                  {sbs && <th className="px-3 py-3">Desgrav.</th>}
                  {sbs && <th className="px-3 py-3">Portes</th>}
                  <th className="px-3 py-3">{sbs ? 'Cuota Total' : 'Cuota'}</th>
                  <th className="px-4 py-3">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EFFF] tabular-nums">
                {paginatedRows.map((row) => (
                  <tr
                    key={row.period}
                    className={`transition hover:bg-[#F5F4FF] ${
                      row.phase === 'grace_total'
                        ? 'bg-[#FDF2F8]/70'
                        : row.phase === 'grace_partial'
                          ? 'bg-[#FFFBEB]/70'
                          : 'bg-white'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 text-center font-extrabold text-[#2925EB]">
                      {row.period}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-[#6C698A]">
                      {formatIsoDateEsPe(row.dueDate)}
                    </td>
                    {sbs && <td className="px-2.5 py-2.5 text-center">{phaseBadge(row.phase)}</td>}
                    <td className="px-3 py-2.5 text-[#6C698A]">{fmt(row.openingBalance)}</td>
                    <td className="px-3 py-2.5 font-semibold text-[#4C3FF0]">
                      {fmt(row.amortization)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#C28608]">{fmt(row.interest)}</td>
                    {sbs && <td className="px-3 py-2.5 text-[#100F24]">{fmt(row.basePayment)}</td>}
                    {sbs && (
                      <td className="px-3 py-2.5 font-medium text-[#BE185D]">
                        {fmt(row.desgravamen)}
                      </td>
                    )}
                    {sbs && <td className="px-3 py-2.5 text-[#6C698A]">{fmt(row.fees)}</td>}
                    <td className="px-3 py-2.5 font-extrabold text-[#100F24]">
                      {fmt(row.totalPayment)}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-bold ${
                        row.closingBalance === 0 ? 'text-[#10B981]' : 'text-[#100F24]'
                      }`}
                    >
                      {fmt(row.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#ECEAFF] font-extrabold text-[#2522EA] tabular-nums">
                  <td className="px-3.5 py-3.5 text-center" colSpan={sbs ? 4 : 3}>
                    TOTALES ({rows.length} cuotas)
                  </td>
                  <td className="px-3 py-3.5">{fmt(summary.totalAmortization)}</td>
                  <td className="px-3 py-3.5">{fmt(summary.totalInterest)}</td>
                  {sbs && (
                    <td className="px-3 py-3.5">
                      {fmt(summary.totalAmortization + summary.totalInterest)}
                    </td>
                  )}
                  {sbs && <td className="px-3 py-3.5">{fmt(summary.totalDesgravamen)}</td>}
                  {sbs && <td className="px-3 py-3.5">{fmt(summary.totalFees)}</td>}
                  <td className="px-3 py-3.5">{fmt(summary.totalPaid)}</td>
                  <td className="px-4 py-3.5">{fmt(0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination Bar for Long Schedules (5 to 30+ years) */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEFF] bg-[#FAF9FF] px-4 py-3 text-xs">
              <span className="tabular-nums font-medium text-[#6C698A]">
                Mostrando cuotas{' '}
                <strong className="font-bold text-[#100F24]">
                  {paginatedRows[0]?.period ?? 0}–{paginatedRows[paginatedRows.length - 1]?.period ?? 0}
                </strong>{' '}
                de <strong className="font-bold text-[#100F24]">{filteredRows.length}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#DFDCFC] bg-white text-[#100F24] transition hover:bg-[#ECEAFF] disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="tabular-nums rounded-xl bg-white px-3 py-1.5 font-bold text-[#2925EB] ring-1 ring-[#DFDCFC]">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#DFDCFC] bg-white text-[#100F24] transition hover:bg-[#ECEAFF] disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
