import { ArrowRight, Calendar, Clock, Landmark, TrendingUp } from 'lucide-react';
import { FREQUENCY_META } from '../engine/rates';
import type { SimulationResult } from '../types/finance';
import { formatMoney, formatPercent, graceLabel, methodLabel } from '../utils/formatters';

interface KpiCardsProps {
  result: SimulationResult;
  onGoToCharts: () => void;
}

export function KpiCards({ result, onGoToCharts }: KpiCardsProps) {
  const { input, rates, summary } = result;
  const freqMeta = FREQUENCY_META[input.frequency];

  const totalExtraCharges = summary.totalDesgravamen + summary.totalFees;
  const totalForBar = Math.max(1, summary.totalPaid);
  const capitalPct = Math.min(100, (summary.totalAmortization / totalForBar) * 100);
  const interestPct = Math.min(100 - capitalPct, (summary.totalInterest / totalForBar) * 100);
  const chargesPct = Math.max(0, 100 - capitalPct - interestPct);

  const primaryPaymentTitle =
    input.method === 'french'
      ? `Cuota ${freqMeta.label} Constante`
      : input.method === 'german'
        ? 'Primera Cuota (Decreciente)'
        : 'Cuota Periódica (Interés)';

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* CARD 1: Primary Payment & Rates (mirrors the top floating white card in the reference UI) */}
      <div className="card-floating flex flex-col justify-between p-5 sm:p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EFFF] px-3 py-1 text-[11px] font-bold text-[#443BC9]">
                <Clock className="h-3 w-3" />
                {summary.totalPeriods} cuotas · {methodLabel(input.method).split(' ')[0]}
              </span>
              <p className="mt-3 text-xs font-semibold text-[#6C698A]">{primaryPaymentTitle}</p>
              <div className="tabular-nums mt-1 text-2xl font-extrabold tracking-tight text-[#100F24] sm:text-3xl">
                {formatMoney(summary.firstNormalTotalPayment, input.currency)}
              </div>
              {input.method === 'american' && (
                <p className="tabular-nums mt-0.5 text-[11px] font-semibold text-[#E25D9A]">
                  Cuota final (N° {summary.totalPeriods}):{' '}
                  {formatMoney(summary.maxTotalPayment, input.currency)}
                </p>
              )}
              {input.method === 'german' && summary.totalPeriods > 1 && (
                <p className="tabular-nums mt-0.5 text-[11px] font-semibold text-[#10B981]">
                  Última cuota: {formatMoney(summary.minNormalTotalPayment, input.currency)}
                </p>
              )}
            </div>

            {/* Signature vibrant indigo rounded square icon badge */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2925EB] text-white shadow-md shadow-[#2925EB]/30">
              <Landmark className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEFF] pt-3.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#6C698A]">
            <Calendar className="h-3.5 w-3.5 text-[#6658F6]" />
            <span>
              TEA:{' '}
              <strong className="tabular-nums font-bold text-[#100F24]">
                {formatPercent(rates.tea, 2)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#6C698A]">
            <TrendingUp className="h-3.5 w-3.5 text-[#3E35F2]" />
            <span>
              TCEA:{' '}
              <strong className="tabular-nums font-extrabold text-[#2925EB]">
                {formatPercent(summary.tcea, 2)}
              </strong>
            </span>
          </div>
          <span className="tabular-nums rounded-full bg-[#F5F4FF] px-2.5 py-0.5 text-[11px] font-bold text-[#6C698A]">
            {rates.periodRateLabel} {formatPercent(rates.periodRate, 3)}
          </span>
        </div>
      </div>

      {/* CARD 2: Cost Breakdown + 3-Segment Reference Proportion Bar */}
      <div className="card-floating flex flex-col justify-between p-5 sm:p-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#6C698A]">Composición del Total a Pagar</span>
            <button
              type="button"
              onClick={onGoToCharts}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2925EB] hover:underline"
            >
              Ver gráficos
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="tabular-nums mt-1.5 text-2xl font-extrabold tracking-tight text-[#100F24] sm:text-3xl">
            {formatMoney(summary.totalPaid, input.currency)}
          </div>

          {/* 3-column inline metric row matching the reference image's clean numeric hierarchy */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <div className="tabular-nums text-sm font-extrabold text-[#100F24] sm:text-base">
                {formatMoney(summary.totalAmortization, input.currency)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#6C698A]">
                <span className="h-2 w-2 rounded-full bg-[#4C3FF0]" />
                capital
              </div>
            </div>

            <div>
              <div className="tabular-nums text-sm font-extrabold text-[#100F24] sm:text-base">
                {formatMoney(summary.totalInterest, input.currency)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#6C698A]">
                <span className="h-2 w-2 rounded-full bg-[#F2B632]" />
                intereses
              </div>
            </div>

            <div>
              <div className="tabular-nums text-sm font-extrabold text-[#100F24] sm:text-base">
                {input.sbsMode
                  ? formatMoney(totalExtraCharges, input.currency)
                  : formatPercent(summary.interestToPrincipalRatio, 1)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#6C698A]">
                <span className="h-2 w-2 rounded-full bg-[#E25D9A]" />
                {input.sbsMode ? 'seg./portes' : 'interés / P'}
              </div>
            </div>
          </div>
        </div>

        {/* Signature 3-segment slim rounded progress bar (Indigo / Amber Gold / Rose Magenta) */}
        <div className="mt-4">
          <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-[#F3F2FF]">
            <div
              className="h-full rounded-full bg-[#4C3FF0] transition-all duration-300"
              style={{ width: `${capitalPct}%` }}
              title={`Capital: ${capitalPct.toFixed(1)}%`}
            />
            {interestPct > 0.2 && (
              <div
                className="h-full rounded-full bg-[#F2B632] transition-all duration-300"
                style={{ width: `${interestPct}%` }}
                title={`Intereses: ${interestPct.toFixed(1)}%`}
              />
            )}
            {chargesPct > 0.2 && (
              <div
                className="h-full rounded-full bg-[#E25D9A] transition-all duration-300"
                style={{ width: `${chargesPct}%` }}
                title={`Seguros y Portes: ${chargesPct.toFixed(1)}%`}
              />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#6C698A]">
            <span>{graceLabel(input.graceType, summary.gracePeriods)}</span>
            <span className="tabular-nums font-semibold">
              Capital {capitalPct.toFixed(1)}% · Interés {interestPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
