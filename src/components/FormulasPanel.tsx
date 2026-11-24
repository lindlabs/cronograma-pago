import { GitCommitHorizontal } from 'lucide-react';
import { COMPOUNDING_META, FREQUENCY_META } from '../engine/rates';
import type { SimulationResult } from '../types/finance';
import { formatMoney, formatPercent, methodLabel } from '../utils/formatters';

interface FormulasPanelProps {
  result: SimulationResult;
}

export function FormulasPanel({ result }: FormulasPanelProps) {
  const { input, rates, rows, summary } = result;
  const freqMeta = FREQUENCY_META[input.frequency];
  const compMeta = COMPOUNDING_META[input.compounding];
  const firstNormal = rows.find((r) => r.phase === 'normal') ?? rows[0];
  const lastRow = rows[rows.length - 1];

  const compactDiagram = rows.length > 9;
  const diagramNodes = compactDiagram ? [...rows.slice(0, 4), null, ...rows.slice(-3)] : rows;
  const maxOutflow = Math.max(1, ...rows.map((r) => r.totalPayment));

  return (
    <div className="space-y-3">
      {/* Compact SVG Cash Flow Diagram */}
      <div className="card-floating p-3.5 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4 text-[#2925EB]" />
            <h3 className="text-xs font-extrabold text-[#100F24]">
              Diagrama de Flujo de Caja (t = 0 … {summary.totalPeriods})
            </h3>
          </div>
          <span className="rounded-full bg-[#ECEAFF] px-2.5 py-0.5 text-[10px] font-bold text-[#2925EB]">
            {freqMeta.label} · Base 360 SBS
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[#FAF9FF] px-3 py-2 ring-1 ring-[#ECEAFF]">
          <svg
            viewBox="0 0 760 150"
            className="mx-auto h-auto w-full min-w-[520px] max-w-3xl"
            role="img"
            aria-label="Diagrama de flujo de caja"
          >
            <line x1="48" y1="74" x2="725" y2="74" stroke="#100F24" strokeWidth="2" />

            {/* t = 0: +P */}
            <line x1="72" y1="74" x2="72" y2="26" stroke="#2925EB" strokeWidth="3" />
            <polygon points="72,18 66,29 78,29" fill="#2925EB" />
            <circle cx="72" cy="74" r="4" fill="#2925EB" />
            <text x="72" y="92" textAnchor="middle" fontSize="10" fontWeight="800" fill="#100F24">
              t = 0
            </text>
            <rect x="16" y="2" width="128" height="17" rx="8" fill="#ECEAFF" />
            <text x="80" y="13.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#2925EB">
              +P = {formatMoney(summary.principal, input.currency)}
            </text>

            {/* Period Outflows */}
            {diagramNodes.map((node, idx) => {
              const spacing = 615 / Math.max(1, diagramNodes.length);
              const x = 135 + idx * spacing;

              if (node === null) {
                return (
                  <g key="ellipsis">
                    <text
                      x={x}
                      y="69"
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="800"
                      fill="#7B6BF6"
                    >
                      ···
                    </text>
                    <text
                      x={x}
                      y="102"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#6C698A"
                    >
                      ({rows.length - 7} cuotas)
                    </text>
                  </g>
                );
              }

              const ratio = node.totalPayment / maxOutflow;
              const arrowLen = node.totalPayment === 0 ? 10 : Math.max(20, Math.round(ratio * 46));
              const yEnd = 74 + arrowLen;
              const color =
                node.phase === 'grace_total'
                  ? '#E25D9A'
                  : node.phase === 'grace_partial'
                    ? '#F2B632'
                    : '#6658F6';

              return (
                <g key={node.period}>
                  <circle cx={x} cy="74" r="3" fill={color} />
                  {node.totalPayment > 0 ? (
                    <>
                      <line x1={x} y1="74" x2={x} y2={yEnd - 6} stroke={color} strokeWidth="2.4" />
                      <polygon
                        points={`${x},${yEnd} ${x - 4.5},${yEnd - 8} ${x + 4.5},${yEnd - 8}`}
                        fill={color}
                      />
                    </>
                  ) : (
                    <text
                      x={x}
                      y="94"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#BE185D"
                    >
                      Gracia
                    </text>
                  )}
                  <text
                    x={x}
                    y="65"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#6C698A"
                  >
                    {node.period}
                  </text>
                  <text
                    x={x}
                    y={Math.min(144, yEnd + 13)}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#100F24"
                  >
                    {node.totalPayment > 0
                      ? `-${node.totalPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                      : '0'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tight 2x2 Live Formulas Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Step 1 */}
        <div className="card-floating p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#2925EB] text-[10px] font-extrabold text-white">
              1
            </span>
            <h4 className="text-xs font-extrabold text-[#100F24]">Conversión (Base 360 SBS)</h4>
          </div>
          <div className="rounded-xl bg-[#F6F5FF] p-2.5 font-mono text-[11px] leading-relaxed text-[#100F24]">
            {input.rateType === 'TEA' && (
              <>
                <div className="font-bold text-[#2925EB]">
                  i_p = (1 + TEA)^({rates.daysPerPeriod}/360) - 1
                </div>
                <div>
                  i_p = (1 + {rates.tea.toFixed(4)})^({rates.daysPerPeriod}/360) - 1 ={' '}
                  <strong>{formatPercent(rates.periodRate, 4)}</strong>
                </div>
              </>
            )}
            {input.rateType === 'PERIOD_EFFECTIVE' && (
              <>
                <div className="font-bold text-[#2925EB]">
                  i_p = {formatPercent(rates.periodRate, 4)} ({rates.periodRateLabel})
                </div>
                <div>
                  TEA = (1 + {rates.periodRate.toFixed(5)})^{rates.periodsPerYear} - 1 ={' '}
                  <strong>{formatPercent(rates.tea, 2)}</strong>
                </div>
              </>
            )}
            {input.rateType === 'TNA' && (
              <>
                <div className="font-bold text-[#2925EB]">
                  TEA = (1 + TNA/{rates.compoundingPerYear})^{rates.compoundingPerYear} - 1 ={' '}
                  {formatPercent(rates.tea, 2)}
                </div>
                <div>
                  {compMeta.label} ⇒ {rates.periodRateLabel} ={' '}
                  <strong>{formatPercent(rates.periodRate, 4)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="card-floating p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#6658F6] text-[10px] font-extrabold text-white">
              2
            </span>
            <h4 className="text-xs font-extrabold text-[#100F24]">
              {methodLabel(input.method).split('(')[0].trim()} (m = {summary.amortizationPeriods})
            </h4>
          </div>
          <div className="rounded-xl bg-[#F6F5FF] p-2.5 font-mono text-[11px] leading-relaxed text-[#100F24]">
            {input.method === 'french' &&
              (rates.periodRate === 0 ? (
                <div>
                  <span className="font-bold text-[#2925EB]">i = 0% ⇒ R = P / m</span> ={' '}
                  <strong>{formatMoney(summary.referenceBasePayment, input.currency)}</strong>
                </div>
              ) : (
                <>
                  <div className="font-bold text-[#2925EB]">
                    (A/P, {formatPercent(rates.periodRate, 3)}, {summary.amortizationPeriods}) ={' '}
                    {summary.frcFactor.toFixed(6)}
                  </div>
                  <div>
                    R = {summary.effectivePrincipal.toFixed(2)} × {summary.frcFactor.toFixed(6)} ={' '}
                    <strong>{formatMoney(summary.referenceBasePayment, input.currency)}</strong>
                  </div>
                </>
              ))}
            {input.method === 'german' && (
              <>
                <div className="font-bold text-[#2925EB]">
                  A = P_ef / m ={' '}
                  {formatMoney(
                    summary.effectivePrincipal / summary.amortizationPeriods,
                    input.currency,
                  )}
                </div>
                <div>R_k = A + S_(k-1) × i_p (cuota decreciente)</div>
              </>
            )}
            {input.method === 'american' && (
              <>
                <div className="font-bold text-[#2925EB]">
                  I_k = P_ef × i_p ={' '}
                  {formatMoney(summary.effectivePrincipal * rates.periodRate, input.currency)}
                </div>
                <div>
                  R_n = P_ef + I_n = <strong>{formatMoney(lastRow.basePayment, input.currency)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div className="card-floating p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#F2B632] text-[10px] font-extrabold text-[#100F24]">
              3
            </span>
            <h4 className="text-xs font-extrabold text-[#100F24]">
              Comprobación Cuota #{firstNormal.period} y Cierre #{lastRow.period}
            </h4>
          </div>
          <div className="rounded-xl bg-[#F6F5FF] p-2.5 font-mono text-[11px] leading-relaxed text-[#100F24]">
            <div>
              C#{firstNormal.period}: I = {formatMoney(firstNormal.interest, input.currency)} · A ={' '}
              {formatMoney(firstNormal.amortization, input.currency)}
            </div>
            <div className="font-bold text-[#059669]">
              C#{lastRow.period}: A = Saldo Ini. ⇒ Saldo Final = {formatMoney(0, input.currency)}
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="card-floating p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#E25D9A] text-[10px] font-extrabold text-white">
              4
            </span>
            <h4 className="text-xs font-extrabold text-[#100F24]">TIR y TCEA (VAN = 0)</h4>
          </div>
          <div className="rounded-xl bg-[#F6F5FF] p-2.5 font-mono text-[11px] leading-relaxed text-[#100F24]">
            <div>
              TIR ({freqMeta.shortLabel}) = <strong>{formatPercent(summary.periodicIrr, 4)}</strong>
            </div>
            <div className="font-bold text-[#2925EB]">
              TCEA = (1 + TIR)^{rates.periodsPerYear} - 1 = {formatPercent(summary.tcea, 2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
