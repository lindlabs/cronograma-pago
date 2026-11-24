import { useMemo } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { compareAllMethods } from '../engine/amortization';
import type { AmortizationMethod, LoanInput } from '../types/finance';
import { formatMoney, formatPercent } from '../utils/formatters';

interface ComparisonPanelProps {
  input: LoanInput;
  onSelectMethod: (method: AmortizationMethod) => void;
}

export function ComparisonPanel({ input, onSelectMethod }: ComparisonPanelProps) {
  const items = useMemo(() => compareAllMethods(input), [input]);
  const minInterest = Math.min(...items.map((i) => i.totalInterest));
  const maxTotal = Math.max(1, ...items.map((i) => i.totalPaid));

  return (
    <div className="space-y-3">
      {/* 3 Compact Method Cards side-by-side */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((item) => {
          const isSelected = item.method === input.method;
          const isBestInterest = item.totalInterest === minInterest && item.totalInterest > 0;
          const barWidth = Math.max(12, (item.totalPaid / maxTotal) * 100);
          const interestRatio = item.totalPaid > 0 ? (item.totalInterest / item.totalPaid) * 100 : 0;

          return (
            <div
              key={item.method}
              className={`card-floating flex flex-col justify-between p-4 transition ${
                isSelected ? 'ring-2 ring-[#2925EB]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#100F24] sm:text-sm">
                      {item.label}
                    </h3>
                    <p className="text-[10.5px] text-[#6C698A]">{item.subtitle}</p>
                  </div>
                  {isSelected && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ECEAFF] px-2 py-0.5 text-[10px] font-bold text-[#2925EB]">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </span>
                  )}
                </div>

                {isBestInterest && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                    <Sparkles className="h-3 w-3" />
                    Menor interés total
                  </div>
                )}

                <div className="mt-3 space-y-1.5 border-t border-[#F0EEFF] pt-2.5 text-[11.5px] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">1ª cuota</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatMoney(item.firstPayment, input.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Última cuota</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatMoney(item.lastPayment, input.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Intereses</span>
                    <strong className="font-extrabold text-[#C28608]">
                      {formatMoney(item.totalInterest, input.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">Total a pagar</span>
                    <strong className="font-extrabold text-[#2925EB]">
                      {formatMoney(item.totalPaid, input.currency)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C698A]">TCEA</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatPercent(item.tcea, 2)}
                    </strong>
                  </div>
                </div>

                {/* Inline Mini Visual Bar */}
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F2FF]">
                    <div
                      className="flex h-full overflow-hidden rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    >
                      <div
                        className="h-full bg-[#4C3FF0]"
                        style={{ width: `${Math.max(0, 100 - interestRatio)}%` }}
                      />
                      <div className="h-full bg-[#F2B632]" style={{ width: `${interestRatio}%` }} />
                    </div>
                  </div>
                  <div className="mt-1.5 text-[10.5px] font-semibold">
                    {item.method === 'french' ? (
                      <span className="text-[#6C698A]">Referencia estándar Perú</span>
                    ) : item.interestDeltaVsFrench < 0 ? (
                      <span className="text-[#059669]">
                        Ahorra {formatMoney(Math.abs(item.interestDeltaVsFrench), input.currency)} vs.
                        Francés
                      </span>
                    ) : item.interestDeltaVsFrench > 0 ? (
                      <span className="text-[#BE185D]">
                        +{formatMoney(item.interestDeltaVsFrench, input.currency)} interés vs.
                        Francés
                      </span>
                    ) : (
                      <span className="text-[#6C698A]">Sin diferencia (i = 0%)</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isSelected}
                onClick={() => onSelectMethod(item.method)}
                className={`mt-3 w-full rounded-xl py-2 text-[11px] font-bold transition ${
                  isSelected
                    ? 'cursor-default bg-[#ECEAFF] text-[#2925EB]'
                    : 'bg-[#0C0C14] text-white hover:bg-[#2925EB]'
                }`}
              >
                {isSelected ? 'Seleccionado' : `Usar ${item.label.replace('Método ', '')}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
