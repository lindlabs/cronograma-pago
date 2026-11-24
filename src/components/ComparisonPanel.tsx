import { useMemo } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { compareAllMethods } from '../engine/amortization';
import type { AmortizationMethod, LoanInput } from '../types/finance';
import { currencySymbol, formatMoney, formatPercent } from '../utils/formatters';

interface ComparisonPanelProps {
  input: LoanInput;
  onSelectMethod: (method: AmortizationMethod) => void;
}

export function ComparisonPanel({ input, onSelectMethod }: ComparisonPanelProps) {
  const items = useMemo(() => compareAllMethods(input), [input]);
  const minInterest = Math.min(...items.map((i) => i.totalInterest));
  const sym = currencySymbol(input.currency);

  const chartData = items.map((item) => ({
    name: item.label.replace('Método ', ''),
    Intereses: item.totalInterest,
    'Total a Pagar': item.totalPaid,
  }));

  return (
    <div className="space-y-4">
      {/* 3 Method Comparison Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => {
          const isSelected = item.method === input.method;
          const isBestInterest = item.totalInterest === minInterest && item.totalInterest > 0;

          return (
            <div
              key={item.method}
              className={`card-floating flex flex-col justify-between p-5 transition ${
                isSelected ? 'ring-2 ring-[#2925EB]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#100F24]">{item.label}</h3>
                    <p className="mt-0.5 text-[11px] text-[#6C698A]">{item.subtitle}</p>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECEAFF] px-2.5 py-0.5 text-[10px] font-bold text-[#2925EB]">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </span>
                  )}
                </div>

                {isBestInterest && (
                  <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[10px] font-bold text-[#059669]">
                    <Sparkles className="h-3 w-3" />
                    Menor interés total
                  </div>
                )}

                <div className="mt-4 space-y-2.5 border-t border-[#F0EEFF] pt-3.5 text-xs tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C698A]">1ª cuota normal</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatMoney(item.firstPayment, input.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C698A]">Última cuota</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatMoney(item.lastPayment, input.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C698A]">Total intereses</span>
                    <strong className="font-extrabold text-[#C28608]">
                      {formatMoney(item.totalInterest, input.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C698A]">Total a pagar</span>
                    <strong className="font-extrabold text-[#2925EB]">
                      {formatMoney(item.totalPaid, input.currency)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6C698A]">TCEA</span>
                    <strong className="font-bold text-[#100F24]">
                      {formatPercent(item.tcea, 2)}
                    </strong>
                  </div>
                </div>

                {/* Difference vs French */}
                <div className="mt-3 rounded-xl bg-[#F6F5FF] px-3 py-2 text-[11px]">
                  {item.method === 'french' ? (
                    <span className="font-semibold text-[#6C698A]">
                      Referencia estándar bancaria en Perú
                    </span>
                  ) : item.interestDeltaVsFrench < 0 ? (
                    <span className="font-bold text-[#059669]">
                      Ahorra {formatMoney(Math.abs(item.interestDeltaVsFrench), input.currency)} en
                      intereses vs. Francés
                    </span>
                  ) : item.interestDeltaVsFrench > 0 ? (
                    <span className="font-bold text-[#BE185D]">
                      +{formatMoney(item.interestDeltaVsFrench, input.currency)} más en intereses
                      vs. Francés
                    </span>
                  ) : (
                    <span className="font-semibold text-[#6C698A]">Sin diferencia (i = 0%)</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isSelected}
                onClick={() => onSelectMethod(item.method)}
                className={`mt-4 w-full rounded-2xl py-2.5 text-xs font-bold transition ${
                  isSelected
                    ? 'cursor-default bg-[#ECEAFF] text-[#2925EB]'
                    : 'bg-[#0C0C14] text-white hover:bg-[#2925EB]'
                }`}
              >
                {isSelected ? 'Sistema Seleccionado' : `Aplicar ${item.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bar Comparison Visual */}
      <div className="card-floating p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-[#100F24] sm:text-base">
            Comparativa Visual: Intereses y Costo Total por Sistema
          </h3>
          <p className="text-xs text-[#6C698A]">
            Mismo capital P, plazo n y tasa i aplicados a los 3 sistemas de Ingeniería Económica
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEAFF" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#100F24', fontWeight: 700 }}
                axisLine={{ stroke: '#DFDCFC' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`
                }
                tick={{ fontSize: 11, fill: '#6C698A' }}
                axisLine={false}
                tickLine={false}
                width={62}
              />
              <Tooltip
                formatter={(value: number) => formatMoney(value, input.currency)}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid #DFDCFC',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Intereses" fill="#F2B632" radius={[8, 8, 0, 0]} maxBarSize={56} />
              <Bar dataKey="Total a Pagar" fill="#4C3FF0" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
