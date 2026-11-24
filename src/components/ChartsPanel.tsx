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
  const [mainChart, setMainChart] = useState<'bars' | 'balance'>('bars');

  const useAnnualData = annualSummary.length > 1 && (!canShowPerPeriod || groupByYear);

  const seriesData = useMemo(() => {
    if (useAnnualData) {
      return annualSummary.map((yr) => ({
        name: `A${yr.yearIndex}`,
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
      { name: 'Capital (P)', value: summary.principal, color: '#4C3FF0' },
      { name: 'Intereses', value: summary.totalInterest, color: '#F2B632' },
    ];
    const extra = Number((summary.totalDesgravamen + summary.totalFees).toFixed(2));
    if (extra > 0) {
      items.push({ name: 'Seg./Portes', value: extra, color: '#E25D9A' });
    }
    return items.filter((d) => d.value > 0);
  }, [summary]);

  const compactAxis = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
    return `${sym}${val}`;
  };

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      {/* Main Interactive Chart with Switcher (Amortización vs Interés / Saldo Deudor) */}
      <div className="card-floating p-4 sm:p-5 xl:col-span-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl bg-[#F3F2FF] p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMainChart('bars')}
              className={`rounded-lg px-2.5 py-1 transition ${
                mainChart === 'bars' ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
              }`}
            >
              Capital vs. Interés
            </button>
            <button
              type="button"
              onClick={() => setMainChart('balance')}
              className={`rounded-lg px-2.5 py-1 transition ${
                mainChart === 'balance' ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
              }`}
            >
              Saldo Deudor
            </button>
          </div>

          {canShowPerPeriod && annualSummary.length > 1 && (
            <div className="inline-flex rounded-xl bg-[#F3F2FF] p-0.5 text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => setGroupByYear(true)}
                className={`rounded-lg px-2 py-1 ${
                  groupByYear ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
                }`}
              >
                Por Año
              </button>
              <button
                type="button"
                onClick={() => setGroupByYear(false)}
                className={`rounded-lg px-2 py-1 ${
                  !groupByYear ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
                }`}
              >
                Por Cuota
              </button>
            </div>
          )}
        </div>

        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            {mainChart === 'bars' ? (
              <BarChart data={seriesData} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAFF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10.5, fill: '#6C698A' }}
                  axisLine={{ stroke: '#DFDCFC' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={compactAxis}
                  tick={{ fontSize: 10.5, fill: '#6C698A' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(value, input.currency)}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid #DFDCFC',
                    fontSize: '11.5px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="Amortización" stackId="a" fill="#4C3FF0" />
                <Bar
                  dataKey="Interés"
                  stackId="a"
                  fill="#F2B632"
                  radius={input.sbsMode ? [0, 0, 0, 0] : [5, 5, 0, 0]}
                />
                {input.sbsMode && (
                  <Bar
                    dataKey="Cargos"
                    name="Seg./Portes"
                    stackId="a"
                    fill="#E25D9A"
                    radius={[5, 5, 0, 0]}
                  />
                )}
              </BarChart>
            ) : (
              <AreaChart data={seriesData} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4C3FF0" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#9382F8" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAFF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10.5, fill: '#6C698A' }}
                  axisLine={{ stroke: '#DFDCFC' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={compactAxis}
                  tick={{ fontSize: 10.5, fill: '#6C698A' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(value, input.currency)}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid #DFDCFC',
                    fontSize: '11.5px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Saldo"
                  name="Saldo Insoluto"
                  stroke="#2925EB"
                  strokeWidth={2.5}
                  fill="url(#saldoGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side Donut Chart Card */}
      <div className="card-floating flex flex-col justify-between p-4 sm:p-5 xl:col-span-4">
        <div>
          <h3 className="text-xs font-extrabold text-[#100F24]">Distribución del Costo</h3>
          <p className="text-[11px] text-[#6C698A]">Proporción sobre el total a pagar</p>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                paddingAngle={3}
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatMoney(value, input.currency)}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #DFDCFC',
                  fontSize: '11.5px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5 border-t border-[#F0EEFF] pt-2.5 text-[11px]">
          {donutData.map((item) => {
            const pct = summary.totalPaid > 0 ? (item.value / summary.totalPaid) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-[#6C698A]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="tabular-nums font-extrabold text-[#100F24]">
                  {formatMoney(item.value, input.currency)}{' '}
                  <span className="font-semibold text-[#6C698A]">({pct.toFixed(1)}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
