import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '../types/finance';
import { currencySymbol, formatMoney } from '../utils/formatters';

interface ChartsPanelProps {
  result: SimulationResult;
}

export function ChartsPanel({ result }: ChartsPanelProps) {
  const { input, rows, annualSummary, summary } = result;
  const sym = currencySymbol(input.currency);
  const canShowPerPeriod = rows.length <= 60;
  const [groupByYear, setGroupByYear] = useState(rows.length > 24);

  const useAnnualData = annualSummary.length > 1 && (!canShowPerPeriod || groupByYear);

  const seriesData = useMemo(() => {
    if (useAnnualData) {
      return annualSummary.map((yr) => ({
        name: `Año ${yr.yearIndex}`,
        Amortización: yr.amortization,
        Interés: yr.interest,
        Cargos: Number((yr.desgravamen + yr.fees).toFixed(2)),
        Saldo: yr.closingBalance,
      }));
    }
    return rows.map((r) => ({
      name: `C${r.period}`,
      Amortización: r.amortization,
      Interés: r.interest,
      Cargos: Number((r.desgravamen + r.fees).toFixed(2)),
      Saldo: r.closingBalance,
    }));
  }, [annualSummary, rows, useAnnualData]);

  const donutData = useMemo(() => {
    const items = [
      { name: 'Capital (Amortización)', value: summary.totalAmortization, color: '#4C3FF0' },
      { name: 'Intereses', value: summary.totalInterest, color: '#F2B632' },
    ];
    const extra = Number((summary.totalDesgravamen + summary.totalFees).toFixed(2));
    if (extra > 0) {
      items.push({ name: 'Desgravamen y Portes', value: extra, color: '#E25D9A' });
    }
    return items.filter((d) => d.value > 0);
  }, [summary]);

  const compactAxis = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
    return `${sym}${val}`;
  };

  return (
    <div className="space-y-4">
      {/* Chart 1: Amortización vs Interés */}
      <div className="card-floating p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-[#100F24] sm:text-base">
              Evolución de Amortización vs. Interés
            </h3>
            <p className="text-xs text-[#6C698A]">
              {useAnnualData
                ? `Agrupado por año (${annualSummary.length} años) para lectura óptima de largo plazo`
                : `Detalle por cuota (${rows.length} periodos)`}
            </p>
          </div>

          {canShowPerPeriod && annualSummary.length > 1 && (
            <div className="inline-flex rounded-xl bg-[#F3F2FF] p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGroupByYear(true)}
                className={`rounded-lg px-3 py-1 transition ${
                  groupByYear ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
                }`}
              >
                Por Año
              </button>
              <button
                type="button"
                onClick={() => setGroupByYear(false)}
                className={`rounded-lg px-3 py-1 transition ${
                  !groupByYear ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
                }`}
              >
                Por Cuota
              </button>
            </div>
          )}
        </div>

        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seriesData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEAFF" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6C698A' }}
                axisLine={{ stroke: '#DFDCFC' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={compactAxis}
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
                  boxShadow: '0 10px 25px rgba(41,37,235,0.12)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Amortización" stackId="a" fill="#4C3FF0" radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="Interés"
                stackId="a"
                fill="#F2B632"
                radius={input.sbsMode ? [0, 0, 0, 0] : [6, 6, 0, 0]}
              />
              {input.sbsMode && (
                <Bar
                  dataKey="Cargos"
                  name="Desgrav./Portes"
                  stackId="a"
                  fill="#E25D9A"
                  radius={[6, 6, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 2-column grid: Saldo Insoluto + Donut Cost Distribution */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Chart 2: Remaining Balance Area */}
        <div className="card-floating p-5 sm:p-6 xl:col-span-7">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-[#100F24] sm:text-base">
              Curva de Saldo Deudor (Insoluto)
            </h3>
            <p className="text-xs text-[#6C698A]">
              Descenso de la deuda hasta liquidar exactamente en {formatMoney(0, input.currency)}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4C3FF0" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#9382F8" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAFF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6C698A' }}
                  axisLine={{ stroke: '#DFDCFC' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={compactAxis}
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
                    boxShadow: '0 10px 25px rgba(41,37,235,0.12)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Saldo"
                  name="Saldo Insoluto"
                  stroke="#2925EB"
                  strokeWidth={2.6}
                  fill="url(#saldoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Donut Cost Distribution */}
        <div className="card-floating flex flex-col justify-between p-5 sm:p-6 xl:col-span-5">
          <div>
            <h3 className="text-sm font-extrabold text-[#100F24] sm:text-base">
              Distribución del Costo Total
            </h3>
            <p className="text-xs text-[#6C698A]">Proporción de cada componente en el pago total</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value, input.currency)}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid #DFDCFC',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-[#F0EEFF] pt-3 text-xs">
            {donutData.map((item) => {
              const pct = summary.totalPaid > 0 ? (item.value / summary.totalPaid) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#6C698A]">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold">{item.name}</span>
                  </div>
                  <div className="tabular-nums text-right">
                    <span className="font-extrabold text-[#100F24]">
                      {formatMoney(item.value, input.currency)}
                    </span>{' '}
                    <span className="text-[11px] font-semibold text-[#6C698A]">
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
