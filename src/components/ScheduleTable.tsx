import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, LayoutGrid, Table2 } from 'lucide-react';
import type { SimulationResult } from '../types/finance';
import { formatIsoDateEsPe, formatMoney } from '../utils/formatters';

interface ScheduleTableProps {
  result: SimulationResult;
}

const PAGE_SIZE = 60;

export function ScheduleTable({ result }: ScheduleTableProps) {
  const { input, rows, annualSummary, summary } = result;
  const sbs = input.sbsMode;
  const totalYears = annualSummary.length;

  const [viewGranularity, setViewGranularity] = useState<'detail' | 'annual'>('detail');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);

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
    <div className="card-floating flex flex-col overflow-hidden">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EEFF] px-3.5 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-xl bg-[#F3F2FF] p-0.5">
            <button
              type="button"
              onClick={() => setViewGranularity('detail')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                viewGranularity === 'detail'
                  ? 'bg-[#0C0C14] text-white'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <Table2 className="h-3 w-3" />
              Cuotas ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setViewGranularity('annual')}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                viewGranularity === 'annual'
                  ? 'bg-[#0C0C14] text-white'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <Layers className="h-3 w-3" />
              Anual ({totalYears})
            </button>
          </div>

          {viewGranularity === 'detail' && totalYears > 1 && (
            <select
              aria-label="Filtrar por año"
              value={selectedYear}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedYear(v === 'all' ? 'all' : Number(v));
                setPage(1);
              }}
              className="rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-2.5 py-1 text-[11px] font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
            >
              <option value="all">Todos ({rows.length})</option>
              {annualSummary.map((yr) => (
                <option key={yr.yearIndex} value={yr.yearIndex}>
                  Año {yr.yearIndex} (#{yr.startPeriod}–{yr.endPeriod})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Compact Inline Pagination (only when > 60 rows) */}
          {viewGranularity === 'detail' && totalPages > 1 && (
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#DFDCFC] bg-white text-[#100F24] hover:bg-[#ECEAFF] disabled:opacity-35"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="tabular-nums px-1.5 font-bold text-[#2925EB]">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#DFDCFC] bg-white text-[#100F24] hover:bg-[#ECEAFF] disabled:opacity-35"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mobile cards vs table switch */}
          {viewGranularity === 'detail' && (
            <div className="inline-flex rounded-xl bg-[#F3F2FF] p-0.5 md:hidden">
              <button
                type="button"
                onClick={() => setMobileLayout('cards')}
                aria-label="Vista tarjetas"
                className={`rounded-lg p-1.5 ${
                  mobileLayout === 'cards' ? 'bg-white text-[#2925EB] shadow-xs' : 'text-[#6C698A]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout('table')}
                aria-label="Vista tabla"
                className={`rounded-lg p-1.5 ${
                  mobileLayout === 'table' ? 'bg-white text-[#2925EB] shadow-xs' : 'text-[#6C698A]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ANNUAL CONSOLIDATED VIEW (Internal Scroll Box) */}
      {viewGranularity === 'annual' ? (
        <div className="max-h-[calc(100vh-230px)] overflow-auto lg:max-h-[calc(100vh-305px)]">
          <table className="w-full min-w-[600px] border-collapse text-right text-xs">
            <thead className="sticky top-0 z-10 bg-[#F6F5FF]">
              <tr className="text-[10.5px] font-bold tracking-wide text-[#6C698A] uppercase">
                <th className="px-3.5 py-2.5 text-left">Año</th>
                <th className="px-2.5 py-2.5 text-center">Cuotas</th>
                <th className="px-2.5 py-2.5">Saldo Ini.</th>
                <th className="px-2.5 py-2.5">Amortiz.</th>
                <th className="px-2.5 py-2.5">Interés</th>
                {sbs && <th className="px-2.5 py-2.5">Seg./Port.</th>}
                <th className="px-2.5 py-2.5">Total Año</th>
                <th className="px-3.5 py-2.5">Saldo Fin.</th>
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
                  title="Clic para abrir el detalle de este año"
                  className="cursor-pointer transition hover:bg-[#F5F4FF]"
                >
                  <td className="px-3.5 py-2 text-left font-extrabold text-[#2925EB]">
                    Año {yr.yearIndex}
                  </td>
                  <td className="px-2.5 py-2 text-center font-semibold text-[#6C698A]">
                    {yr.startPeriod}–{yr.endPeriod}
                  </td>
                  <td className="px-2.5 py-2 text-[#6C698A]">{fmt(yr.openingBalance)}</td>
                  <td className="px-2.5 py-2 font-semibold text-[#4C3FF0]">{fmt(yr.amortization)}</td>
                  <td className="px-2.5 py-2 font-semibold text-[#C28608]">{fmt(yr.interest)}</td>
                  {sbs && (
                    <td className="px-2.5 py-2 font-semibold text-[#BE185D]">
                      {fmt(yr.desgravamen + yr.fees)}
                    </td>
                  )}
                  <td className="px-2.5 py-2 font-extrabold text-[#100F24]">{fmt(yr.totalPayment)}</td>
                  <td className="px-3.5 py-2 font-bold text-[#100F24]">{fmt(yr.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-[#ECEAFF] font-extrabold text-[#2522EA] tabular-nums">
                <td className="px-3.5 py-2.5 text-left" colSpan={3}>
                  TOTAL ({summary.totalPeriods} cuotas)
                </td>
                <td className="px-2.5 py-2.5">{fmt(summary.totalAmortization)}</td>
                <td className="px-2.5 py-2.5">{fmt(summary.totalInterest)}</td>
                {sbs && (
                  <td className="px-2.5 py-2.5">
                    {fmt(summary.totalDesgravamen + summary.totalFees)}
                  </td>
                )}
                <td className="px-2.5 py-2.5">{fmt(summary.totalPaid)}</td>
                <td className="px-3.5 py-2.5">{fmt(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <>
          {/* MOBILE COMPACT CARDS (Internal Scroll Box — Zero Page Scroll!) */}
          <div
            className={`${
              mobileLayout === 'cards' ? 'block md:hidden' : 'hidden'
            } max-h-[calc(100vh-235px)] space-y-2 overflow-y-auto p-3`}
          >
            {paginatedRows.map((row) => (
              <div
                key={row.period}
                className={`rounded-2xl border p-3 ${
                  row.phase === 'grace_total'
                    ? 'border-[#FBCFE8] bg-[#FDF2F8]/60'
                    : row.phase === 'grace_partial'
                      ? 'border-[#FDE68A] bg-[#FFFBEB]/60'
                      : 'border-[#ECEAFF] bg-[#FAF9FF]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[#2925EB] px-1.5 text-[11px] font-extrabold text-white">
                      #{row.period}
                    </span>
                    <span className="text-[11px] font-bold text-[#100F24]">
                      {formatIsoDateEsPe(row.dueDate)}
                    </span>
                    {row.phase !== 'normal' && phaseBadge(row.phase)}
                  </div>
                  <div className="tabular-nums text-xs font-extrabold text-[#100F24]">
                    {fmt(row.totalPayment)}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-[#ECEAFF] pt-2 text-[10.5px] tabular-nums">
                  <div>
                    <span className="block text-[#6C698A]">Amortiz.</span>
                    <strong className="text-[#4C3FF0]">{fmt(row.amortization)}</strong>
                  </div>
                  <div>
                    <span className="block text-[#6C698A]">Interés</span>
                    <strong className="text-[#C28608]">{fmt(row.interest)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[#6C698A]">Saldo Fin.</span>
                    <strong className={row.closingBalance === 0 ? 'text-[#10B981]' : 'text-[#100F24]'}>
                      {fmt(row.closingBalance)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Pinned Totals Strip */}
          {mobileLayout === 'cards' && (
            <div className="flex items-center justify-between border-t border-[#DFDCFC] bg-[#ECEAFF] px-3.5 py-2.5 text-[11px] font-extrabold text-[#2522EA] tabular-nums md:hidden">
              <span>TOTAL ({rows.length})</span>
              <span>
                {fmt(summary.totalPaid)} · Saldo {fmt(0)}
              </span>
            </div>
          )}

          {/* DESKTOP & MOBILE-TABLE VIEW (Internal Scroll Box with Sticky Head & Sticky Totals Footer) */}
          <div
            className={`${
              mobileLayout === 'table' ? 'block' : 'hidden md:block'
            } max-h-[calc(100vh-230px)] overflow-auto lg:max-h-[calc(100vh-305px)]`}
          >
            <table
              className={`w-full border-collapse text-right text-xs ${
                sbs ? 'min-w-[820px]' : 'min-w-[580px]'
              }`}
            >
              <thead className="sticky top-0 z-10 bg-[#F6F5FF]">
                <tr className="text-[10.5px] font-bold tracking-wide text-[#6C698A] uppercase">
                  <th className="px-3 py-2.5 text-center">N°</th>
                  <th className="px-2.5 py-2.5 text-center">Fecha</th>
                  {sbs && <th className="px-2 py-2.5 text-center">Tipo</th>}
                  <th className="px-2.5 py-2.5">Saldo Ini.</th>
                  <th className="px-2.5 py-2.5">Amortiz.</th>
                  <th className="px-2.5 py-2.5">Interés</th>
                  {sbs && <th className="px-2.5 py-2.5">Base</th>}
                  {sbs && <th className="px-2.5 py-2.5">Desgr.</th>}
                  {sbs && <th className="px-2.5 py-2.5">Portes</th>}
                  <th className="px-2.5 py-2.5">{sbs ? 'Cuota Total' : 'Cuota'}</th>
                  <th className="px-3.5 py-2.5">Saldo Fin.</th>
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
                    <td className="px-3 py-2 text-center font-extrabold text-[#2925EB]">
                      {row.period}
                    </td>
                    <td className="px-2.5 py-2 text-center font-medium text-[#6C698A]">
                      {formatIsoDateEsPe(row.dueDate)}
                    </td>
                    {sbs && <td className="px-2 py-2 text-center">{phaseBadge(row.phase)}</td>}
                    <td className="px-2.5 py-2 text-[#6C698A]">{fmt(row.openingBalance)}</td>
                    <td className="px-2.5 py-2 font-semibold text-[#4C3FF0]">
                      {fmt(row.amortization)}
                    </td>
                    <td className="px-2.5 py-2 font-semibold text-[#C28608]">{fmt(row.interest)}</td>
                    {sbs && <td className="px-2.5 py-2 text-[#100F24]">{fmt(row.basePayment)}</td>}
                    {sbs && (
                      <td className="px-2.5 py-2 font-medium text-[#BE185D]">
                        {fmt(row.desgravamen)}
                      </td>
                    )}
                    {sbs && <td className="px-2.5 py-2 text-[#6C698A]">{fmt(row.fees)}</td>}
                    <td className="px-2.5 py-2 font-extrabold text-[#100F24]">
                      {fmt(row.totalPayment)}
                    </td>
                    <td
                      className={`px-3.5 py-2 font-bold ${
                        row.closingBalance === 0 ? 'text-[#10B981]' : 'text-[#100F24]'
                      }`}
                    >
                      {fmt(row.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-[#ECEAFF] font-extrabold text-[#2522EA] tabular-nums shadow-[0_-2px_8px_rgba(37,34,234,0.08)]">
                  <td className="px-3 py-2.5 text-center" colSpan={sbs ? 4 : 3}>
                    TOTALES ({rows.length})
                  </td>
                  <td className="px-2.5 py-2.5">{fmt(summary.totalAmortization)}</td>
                  <td className="px-2.5 py-2.5">{fmt(summary.totalInterest)}</td>
                  {sbs && (
                    <td className="px-2.5 py-2.5">
                      {fmt(summary.totalBasePayment)}
                    </td>
                  )}
                  {sbs && <td className="px-2.5 py-2.5">{fmt(summary.totalDesgravamen)}</td>}
                  {sbs && <td className="px-2.5 py-2.5">{fmt(summary.totalFees)}</td>}
                  <td className="px-2.5 py-2.5">{fmt(summary.totalPaid)}</td>
                  <td className="px-3.5 py-2.5">{fmt(0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
