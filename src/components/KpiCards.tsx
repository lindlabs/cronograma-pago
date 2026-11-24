import { ArrowRight, Landmark, TrendingUp } from 'lucide-react';
import { FREQUENCY_META } from '../engine/rates';
import type { SimulationResult } from '../types/finance';
import { formatMoney, formatPercent, methodLabel } from '../utils/formatters';

interface KpiCardsProps {
  result: SimulationResult;
  onGoToCharts: () => void;
}

export function KpiCards({ result, onGoToCharts }: KpiCardsProps) {
  const { input, rates, summary } = result;
  const freqMeta = FREQUENCY_META[input.frequency];

  const totalExtraCharges = summary.totalDesgravamen + summary.totalFees;
  const totalForBar = Math.max(1, summary.totalPaid);
  // Exact conservation law: principal + totalInterest + totalExtraCharges === totalPaid
  const capitalPct = Math.min(100, (summary.principal / totalForBar) * 100);
  const interestPct = Math.min(100 - capitalPct, (summary.totalInterest / totalForBar) * 100);
  const chargesPct = Math.max(0, 100 - capitalPct - interestPct);

  const primaryPaymentTitle =
    input.method === 'french'
      ? `Cuota ${freqMeta.label}`
      : input.method === 'german'
        ? '1ª Cuota (Decreciente)'
        : 'Cuota Periódica (Interés)';

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* CARD 1: Primary Payment + Rates (Compact Floating White Card) */}
      <div className="card-floating flex flex-col justify-between px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-[#ECEAFF] px-2.5 py-0.5 text-[10px] font-bold text-[#2925EB]">
                {summary.totalPeriods} cuotas · {methodLabel(input.method).split(' ')[0]}
              </span>
              <span className="text-[11px] font-semibold text-[#6C698A]">
                {primaryPaymentTitle}
              </span>
            </div>
            <div className="tabular-nums mt-1.5 text-2xl font-extrabold tracking-tight text-[#100F24] sm:text-[26px]">
              {formatMoney(summary.firstNormalTotalPayment, input.currency)}
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2925EB] text-white shadow-md shadow-[#2925EB]/25">
            <Landmark className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEFF] pt-2.5 text-[11px] tabular-nums">
          <span className="text-[#6C698A]">
            TEA <strong className="font-bold text-[#100F24]">{formatPercent(rates.tea, 2)}</strong>
          </span>
          <span className="text-[#6C698A]">
            {rates.periodRateLabel}{' '}
            <strong className="font-bold text-[#100F24]">
              {formatPercent(rates.periodRate, 3)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 font-extrabold text-[#2925EB]">
            <TrendingUp className="h-3 w-3" />
            TCEA {formatPercent(summary.tcea, 2)}
          </span>
        </div>
      </div>

      {/* CARD 2: Cost Breakdown + Signature 3-Segment Progress Bar */}
      <div className="card-floating flex flex-col justify-between px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-[#6C698A]">Total a Pagar</span>
            <div className="tabular-nums text-xl font-extrabold tracking-tight text-[#100F24] sm:text-2xl">
              {formatMoney(summary.totalPaid, input.currency)}
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToCharts}
            className="inline-flex items-center gap-1 rounded-full bg-[#F3F2FF] px-2.5 py-1 text-[11px] font-bold text-[#2925EB] transition hover:bg-[#ECEAFF]"
          >
            Gráficos
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 3-Metric Inline Row */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] tabular-nums">
          <div>
            <div className="truncate font-extrabold text-[#100F24]">
              {formatMoney(summary.principal, input.currency)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#6C698A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4C3FF0]" />
              capital (P)
            </div>
          </div>
          <div>
            <div className="truncate font-extrabold text-[#100F24]">
              {formatMoney(summary.totalInterest, input.currency)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#6C698A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F2B632]" />
              interés
            </div>
          </div>
          <div>
            <div className="truncate font-extrabold text-[#100F24]">
              {input.sbsMode
                ? formatMoney(totalExtraCharges, input.currency)
                : formatPercent(summary.interestToPrincipalRatio, 1)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#6C698A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E25D9A]" />
              {input.sbsMode ? 'seg./portes' : 'interés/P'}
            </div>
          </div>
        </div>

        {/* Signature 3-Segment Slim Rounded Bar */}
        <div className="mt-2.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[#F3F2FF]">
          <div
            className="h-full rounded-full bg-[#4C3FF0] transition-all duration-300"
            style={{ width: `${capitalPct}%` }}
          />
          {interestPct > 0.2 && (
            <div
              className="h-full rounded-full bg-[#F2B632] transition-all duration-300"
              style={{ width: `${interestPct}%` }}
            />
          )}
          {chargesPct > 0.2 && (
            <div
              className="h-full rounded-full bg-[#E25D9A] transition-all duration-300"
              style={{ width: `${chargesPct}%` }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
