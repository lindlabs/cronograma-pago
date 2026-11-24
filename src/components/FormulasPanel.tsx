import { BookOpen, Calculator, GitCommitHorizontal, Sigma } from 'lucide-react';
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

  // Cash flow diagram nodes: compact display with ellipsis when n > 9
  const compactDiagram = rows.length > 9;
  const diagramNodes = compactDiagram
    ? [...rows.slice(0, 4), null, ...rows.slice(-3)]
    : rows;

  const maxOutflow = Math.max(1, ...rows.map((r) => r.totalPayment));

  return (
    <div className="space-y-4">
      {/* 1. Interactive SVG Cash Flow Diagram (Diagrama de Flujo de Caja) */}
      <div className="card-floating p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ECEAFF] text-[#2925EB]">
              <GitCommitHorizontal className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#100F24] sm:text-base">
                Diagrama de Flujo de Caja (Perspectiva del Prestatario)
              </h3>
              <p className="text-xs text-[#6C698A]">
                Ingreso de capital (+P) en t = 0 y egresos periódicos (-R_k) hasta t ={' '}
                {summary.totalPeriods}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#F3F2FF] px-3 py-1 text-[11px] font-bold text-[#2925EB]">
            {freqMeta.label} · n = {summary.totalPeriods}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-[#FAF9FF] p-4 ring-1 ring-[#ECEAFF]">
          <svg
            viewBox="0 0 760 210"
            className="mx-auto h-auto w-full min-w-[560px] max-w-3xl"
            role="img"
            aria-label="Diagrama de flujo de caja de Ingeniería Económica"
          >
            {/* Axis baseline */}
            <line x1="55" y1="102" x2="725" y2="102" stroke="#100F24" strokeWidth="2.2" />

            {/* t = 0: Upward arrow (+P) */}
            <line x1="72" y1="102" x2="72" y2="28" stroke="#2925EB" strokeWidth="3.5" />
            <polygon points="72,18 65,31 79,31" fill="#2925EB" />
            <circle cx="72" cy="102" r="4.5" fill="#2925EB" />
            <text
              x="72"
              y="122"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill="#100F24"
            >
              t = 0
            </text>
            <rect x="20" y="2" width="128" height="19" rx="9" fill="#ECEAFF" />
            <text
              x="84"
              y="15"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="800"
              fill="#2925EB"
            >
              +P = {formatMoney(summary.principal, input.currency)}
            </text>

            {/* Period arrows */}
            {diagramNodes.map((node, idx) => {
              const spacing = 620 / Math.max(1, diagramNodes.length);
              const x = 135 + idx * spacing;

              if (node === null) {
                return (
                  <g key="ellipsis">
                    <text
                      x={x}
                      y="96"
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="800"
                      fill="#7B6BF6"
                    >
                      ···
                    </text>
                    <text
                      x={x}
                      y="138"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#6C698A"
                    >
                      ({rows.length - 7} cuotas)
                    </text>
                  </g>
                );
              }

              const ratio = node.totalPayment / maxOutflow;
              const arrowLen = node.totalPayment === 0 ? 12 : Math.max(22, Math.round(ratio * 66));
              const yEnd = 102 + arrowLen;
              const color =
                node.phase === 'grace_total'
                  ? '#E25D9A'
                  : node.phase === 'grace_partial'
                    ? '#F2B632'
                    : '#6658F6';

              return (
                <g key={node.period}>
                  <circle cx={x} cy="102" r="3.5" fill={color} />
                  {node.totalPayment > 0 ? (
                    <>
                      <line x1={x} y1="102" x2={x} y2={yEnd - 7} stroke={color} strokeWidth="2.8" />
                      <polygon
                        points={`${x},${yEnd} ${x - 5},${yEnd - 9} ${x + 5},${yEnd - 9}`}
                        fill={color}
                      />
                    </>
                  ) : (
                    <text
                      x={x}
                      y="124"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#BE185D"
                    >
                      Gracia
                    </text>
                  )}

                  <text
                    x={x}
                    y="91"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#6C698A"
                  >
                    {node.period}
                  </text>
                  <text
                    x={x}
                    y={Math.min(198, yEnd + 15)}
                    textAnchor="middle"
                    fontSize="9.2"
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

      {/* 2. Step-by-Step Live Engineering Economics Formulas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Step 1: Rate Conversion (Base 360 SBS) */}
        <div className="card-floating p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#2925EB] text-xs font-extrabold text-white">
              1
            </span>
            <h4 className="text-sm font-extrabold text-[#100F24]">
              Conversión de Tasa (Base 360 SBS Perú)
            </h4>
          </div>

          <div className="rounded-2xl bg-[#F6F5FF] p-3.5 font-mono text-xs leading-relaxed text-[#100F24]">
            {input.rateType === 'TEA' && (
              <>
                <div className="text-[#6C698A]">// De TEA a {rates.periodRateLabel} ({rates.daysPerPeriod} días):</div>
                <div className="mt-1 font-bold text-[#2925EB]">
                  i_p = (1 + TEA)^({rates.daysPerPeriod}/360) - 1
                </div>
                <div className="mt-1">
                  i_p = (1 + {rates.tea.toFixed(6)})^({rates.daysPerPeriod}/360) - 1
                </div>
                <div className="mt-1 font-extrabold text-[#100F24]">
                  i_p = {rates.periodRate.toFixed(6)} ({formatPercent(rates.periodRate, 4)})
                </div>
              </>
            )}

            {input.rateType === 'PERIOD_EFFECTIVE' && (
              <>
                <div className="text-[#6C698A]">// Tasa efectiva directa del periodo ({rates.periodRateLabel}):</div>
                <div className="mt-1 font-bold text-[#2925EB]">
                  i_p = {formatPercent(rates.periodRate, 4)} ({rates.periodRate.toFixed(6)})
                </div>
                <div className="mt-1.5 text-[#6C698A]">// TEA equivalente (Base 360 días):</div>
                <div className="mt-0.5">
                  TEA = (1 + {rates.periodRate.toFixed(6)})^({rates.periodsPerYear}) - 1 ={' '}
                  <strong>{formatPercent(rates.tea, 2)}</strong>
                </div>
              </>
            )}

            {input.rateType === 'TNA' && (
              <>
                <div className="text-[#6C698A]">// De TNA ({compMeta.label}) a TEA:</div>
                <div className="mt-1 font-bold text-[#2925EB]">
                  TEA = (1 + TNA / m)^m - 1
                </div>
                <div className="mt-1">
                  TEA = (1 + {rates.inputRateDecimal.toFixed(4)} / {rates.compoundingPerYear})^
                  {rates.compoundingPerYear} - 1 = <strong>{formatPercent(rates.tea, 2)}</strong>
                </div>
                <div className="mt-1">
                  {rates.periodRateLabel} = (1 + {rates.tea.toFixed(6)})^({rates.daysPerPeriod}/360)
                  - 1 = <strong>{formatPercent(rates.periodRate, 4)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 2: Amortization Model Formula */}
        <div className="card-floating p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#6658F6] text-xs font-extrabold text-white">
              2
            </span>
            <h4 className="text-sm font-extrabold text-[#100F24]">
              Fórmula del {methodLabel(input.method)}
            </h4>
          </div>

          <div className="rounded-2xl bg-[#F6F5FF] p-3.5 font-mono text-xs leading-relaxed text-[#100F24]">
            {summary.gracePeriods > 0 && (
              <div className="mb-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-sans font-semibold text-[#2925EB]">
                Con g = {summary.gracePeriods} periodos de gracia dentro de n ={' '}
                {summary.totalPeriods}, se amortiza en <strong>m = n - g = {summary.amortizationPeriods}</strong>{' '}
                periodos sobre P_ef = {formatMoney(summary.effectivePrincipal, input.currency)}.
              </div>
            )}

            {input.method === 'french' && (
              <>
                {rates.periodRate === 0 ? (
                  <>
                    <div className="text-[#6C698A]">// Caso borde i = 0% (evita división entre 0):</div>
                    <div className="mt-1 font-bold text-[#2925EB]">R = P_ef / m</div>
                    <div className="mt-1">
                      R = {summary.effectivePrincipal.toFixed(2)} / {summary.amortizationPeriods} ={' '}
                      <strong>{formatMoney(summary.referenceBasePayment, input.currency)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[#6C698A]">// Factor de Recuperación de Capital (A/P, i, m):</div>
                    <div className="mt-1 font-bold text-[#2925EB]">
                      R = P_ef × [ i(1+i)^m / ((1+i)^m - 1) ]
                    </div>
                    <div className="mt-1">
                      (A/P, {formatPercent(rates.periodRate, 3)}, {summary.amortizationPeriods}) ={' '}
                      <strong>{summary.frcFactor.toFixed(6)}</strong>
                    </div>
                    <div className="mt-1">
                      R = {summary.effectivePrincipal.toFixed(2)} × {summary.frcFactor.toFixed(6)} ={' '}
                      <strong>{formatMoney(summary.referenceBasePayment, input.currency)}</strong>
                    </div>
                  </>
                )}
              </>
            )}

            {input.method === 'german' && (
              <>
                <div className="text-[#6C698A]">// Amortización constante de capital:</div>
                <div className="mt-1 font-bold text-[#2925EB]">A = P_ef / m</div>
                <div className="mt-1">
                  A = {summary.effectivePrincipal.toFixed(2)} / {summary.amortizationPeriods} ={' '}
                  <strong>
                    {formatMoney(summary.effectivePrincipal / summary.amortizationPeriods, input.currency)}
                  </strong>
                </div>
                <div className="mt-1 text-[#6C698A]">R_k = A + (S_(k-1) × i_p)</div>
              </>
            )}

            {input.method === 'american' && (
              <>
                <div className="text-[#6C698A]">// Intereses periódicos y capital íntegro al final:</div>
                <div className="mt-1 font-bold text-[#2925EB]">
                  I_k = P_ef × i_p &nbsp; (para k &lt; n)
                </div>
                <div className="mt-1">
                  I_k = {summary.effectivePrincipal.toFixed(2)} × {rates.periodRate.toFixed(6)} ={' '}
                  <strong>
                    {formatMoney(summary.effectivePrincipal * rates.periodRate, input.currency)}
                  </strong>
                </div>
                <div className="mt-1">
                  R_n = P_ef + I_n = <strong>{formatMoney(lastRow.basePayment, input.currency)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 3: Verification of First & Final Row */}
        <div className="card-floating p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F2B632] text-xs font-extrabold text-[#100F24]">
              3
            </span>
            <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-[#100F24]">
              <Calculator className="h-4 w-4 text-[#C28608]" />
              Comprobación: Cuota #{firstNormal.period} y Cierre #{lastRow.period}
            </h4>
          </div>

          <div className="space-y-2 rounded-2xl bg-[#F6F5FF] p-3.5 font-mono text-xs text-[#100F24]">
            <div>
              <span className="font-bold text-[#2925EB]">Cuota #{firstNormal.period}:</span>{' '}
              I = {formatMoney(firstNormal.openingBalance, input.currency)} ×{' '}
              {formatPercent(rates.periodRate, 4)} ={' '}
              <strong>{formatMoney(firstNormal.interest, input.currency)}</strong>
            </div>
            <div>
              Amortización = <strong>{formatMoney(firstNormal.amortization, input.currency)}</strong>{' '}
              | Saldo Final ={' '}
              <strong>{formatMoney(firstNormal.closingBalance, input.currency)}</strong>
            </div>
            <hr className="border-[#E2DFFD]" />
            <div>
              <span className="font-bold text-[#059669]">Cuota Final #{lastRow.period}:</span>{' '}
              Amortización = Saldo Inicial (
              <strong>{formatMoney(lastRow.amortization, input.currency)}</strong>) ⇒{' '}
              <strong className="text-[#059669]">Saldo Final = {formatMoney(0, input.currency)}</strong>
            </div>
          </div>
        </div>

        {/* Step 4: TIR & TCEA */}
        <div className="card-floating p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E25D9A] text-xs font-extrabold text-white">
              4
            </span>
            <h4 className="flex items-center gap-1.5 text-sm font-extrabold text-[#100F24]">
              <Sigma className="h-4 w-4 text-[#E25D9A]" />
              Evaluación TIR y TCEA (Costo Efectivo Real)
            </h4>
          </div>

          <div className="rounded-2xl bg-[#F6F5FF] p-3.5 font-mono text-xs leading-relaxed text-[#100F24]">
            <div className="text-[#6C698A]">// Ecuación de Valor Presente (VAN = 0):</div>
            <div className="mt-1 font-bold text-[#2925EB]">
              P = Σ [ CuotaTotal_k / (1 + TIR_p)^k ]
            </div>
            <div className="mt-1">
              TIR del periodo ({freqMeta.shortLabel}) ={' '}
              <strong>{formatPercent(summary.periodicIrr, 4)}</strong>
            </div>
            <div className="mt-1">
              TCEA = (1 + TIR_p)^({rates.periodsPerYear}) - 1 ={' '}
              <strong className="text-[#2925EB]">{formatPercent(summary.tcea, 2)}</strong>
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-sans text-[11px] font-medium text-[#6C698A]">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#6658F6]" />
              {input.sbsMode
                ? 'En Modo SBS, la TCEA supera a la TEA al incorporar seguro de desgravamen y portes.'
                : 'En Modo Académico Puro (sin seguros ni comisiones), la TCEA coincide con la TEA.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
