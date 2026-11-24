import { useState } from 'react';
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Landmark,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { COMPOUNDING_META, computeTotalPeriods, FREQUENCY_META } from '../engine/rates';
import type {
  AmortizationMethod,
  CompoundingFrequency,
  CurrencyCode,
  GraceType,
  LoanInput,
  PaymentFrequency,
  RateBreakdown,
  RateInputType,
} from '../types/finance';
import { currencySymbol, formatMoney, formatPercent } from '../utils/formatters';

interface LoanFormProps {
  input: LoanInput;
  rates: RateBreakdown;
  effectivePrincipal: number;
  onChange: (next: LoanInput) => void;
}

const YEAR_QUICK_CHIPS = [1, 3, 5, 10, 15, 20, 30];

export function LoanForm({ input, rates, effectivePrincipal, onChange }: LoanFormProps) {
  const [showAcademicFields, setShowAcademicFields] = useState(false);

  const totalPeriods = computeTotalPeriods(input.termValue, input.termUnit, input.frequency);
  const maxGraceAllowed = Math.max(0, totalPeriods - 1);
  const sym = currencySymbol(input.currency);

  const update = (patch: Partial<LoanInput>) => {
    onChange({ ...input, ...patch });
  };

  const updateAcademic = (patch: Partial<LoanInput['academic']>) => {
    onChange({
      ...input,
      academic: { ...input.academic, ...patch },
    });
  };

  const handleNumberInput = (raw: string, fallback = 0): number => {
    if (raw.trim() === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  };

  const handleTermUnitSwitch = (unit: 'years' | 'months') => {
    if (unit === input.termUnit) return;
    const converted =
      unit === 'months'
        ? Math.max(1, Math.round(input.termValue * 12))
        : Math.max(1, Math.round((input.termValue / 12) * 10) / 10);
    update({ termUnit: unit, termValue: converted });
  };

  return (
    <aside className="space-y-4">
      {/* Main Configuration Floating White Card */}
      <div className="card-floating p-5 sm:p-6">
        {/* Mode Switcher: Académico Puro vs Banca Perú (SBS) */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#6C698A] uppercase">
              Modalidad de Simulación
            </span>
            <span className="rounded-full bg-[#ECEAFF] px-2.5 py-0.5 text-[11px] font-bold text-[#2925EB]">
              Base 360 días
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F3F2FF] p-1">
            <button
              type="button"
              onClick={() => update({ sbsMode: false })}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                !input.sbsMode
                  ? 'bg-[#0C0C14] text-white shadow-sm'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Académico Puro</span>
            </button>
            <button
              type="button"
              onClick={() => update({ sbsMode: true })}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                input.sbsMode
                  ? 'bg-[#2925EB] text-white shadow-sm'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>Banca Perú / SBS</span>
            </button>
          </div>
        </div>

        {/* Currency & Amortization System */}
        <div className="mb-5 grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#100F24]">Moneda</span>
            <div className="inline-flex rounded-full bg-[#F3F2FF] p-1">
              {(['PEN', 'USD'] as CurrencyCode[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => update({ currency: cur })}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                    input.currency === cur
                      ? 'bg-[#2925EB] text-white shadow-xs'
                      : 'text-[#6C698A] hover:text-[#100F24]'
                  }`}
                >
                  {cur === 'PEN' ? 'S/ Soles' : 'US$ Dólares'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#100F24]">
              Sistema de Amortización
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#F3F2FF] p-1">
              {(
                [
                  { id: 'french', label: 'Francés' },
                  { id: 'german', label: 'Alemán' },
                  { id: 'american', label: 'Americano' },
                ] as Array<{ id: AmortizationMethod; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update({ method: m.id })}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    input.method === m.id
                      ? 'bg-white text-[#2925EB] shadow-sm ring-1 ring-[#2925EB]/15'
                      : 'text-[#6C698A] hover:text-[#100F24]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <hr className="my-4 border-[#ECEAFF]" />

        {/* VARIABLE P: Principal */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="input-principal"
              className="flex items-center gap-2 text-xs font-bold text-[#100F24]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#2925EB] text-[11px] font-extrabold text-white">
                P
              </span>
              Capital / Valor Presente
            </label>
            <button
              type="button"
              onClick={() => update({ useDownPayment: !input.useDownPayment })}
              className="text-[11px] font-semibold text-[#3E35F2] hover:underline"
            >
              {input.useDownPayment ? 'Ingresar P directo' : '+ Cuota inicial'}
            </button>
          </div>

          {!input.useDownPayment ? (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-bold text-[#6C698A]">
                {sym}
              </span>
              <input
                id="input-principal"
                type="number"
                min={1}
                step={500}
                value={input.principal === 0 ? '' : input.principal}
                onChange={(e) => update({ principal: handleNumberInput(e.target.value, 0) })}
                className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] py-3 pr-4 pl-11 text-base font-bold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-4 focus:ring-[#3E35F2]/12"
                placeholder="50000"
              />
            </div>
          ) : (
            <div className="space-y-2.5 rounded-2xl border border-[#E4E1FD] bg-[#F8F7FF] p-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#6C698A]">
                    Precio del Bien ({sym})
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1000}
                    value={input.assetPrice === 0 ? '' : input.assetPrice}
                    onChange={(e) => update({ assetPrice: handleNumberInput(e.target.value, 0) })}
                    className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-2 text-sm font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#6C698A]">
                    Cuota Inicial (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={95}
                    step={1}
                    value={input.downPaymentPercent}
                    onChange={(e) =>
                      update({
                        downPaymentPercent: Math.min(95, handleNumberInput(e.target.value, 0)),
                      })
                    }
                    className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-2 text-sm font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6C698A]">Préstamo neto (P):</span>
                <span className="tabular-nums font-extrabold text-[#2925EB]">
                  {formatMoney(effectivePrincipal, input.currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* VARIABLE n: Term & Frequency */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="input-term"
              className="flex items-center gap-2 text-xs font-bold text-[#100F24]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#6658F6] text-[11px] font-extrabold text-white">
                n
              </span>
              Plazo (hasta 5, 10, 30+ años)
            </label>
            <span className="tabular-nums rounded-full bg-[#ECEAFF] px-2.5 py-0.5 text-[11px] font-bold text-[#2925EB]">
              n = {totalPeriods} cuotas
            </span>
          </div>

          <div className="flex gap-2">
            <input
              id="input-term"
              type="number"
              min={1}
              max={input.termUnit === 'years' ? 50 : 600}
              step={1}
              value={input.termValue === 0 ? '' : input.termValue}
              onChange={(e) =>
                update({
                  termValue: Math.min(
                    input.termUnit === 'years' ? 50 : 600,
                    handleNumberInput(e.target.value, 1),
                  ),
                })
              }
              className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] px-3.5 py-2.5 text-base font-bold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-4 focus:ring-[#3E35F2]/12"
            />
            <div className="inline-flex shrink-0 rounded-2xl bg-[#F3F2FF] p-1">
              <button
                type="button"
                onClick={() => handleTermUnitSwitch('years')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  input.termUnit === 'years'
                    ? 'bg-[#0C0C14] text-white'
                    : 'text-[#6C698A] hover:text-[#100F24]'
                }`}
              >
                Años
              </button>
              <button
                type="button"
                onClick={() => handleTermUnitSwitch('months')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  input.termUnit === 'months'
                    ? 'bg-[#0C0C14] text-white'
                    : 'text-[#6C698A] hover:text-[#100F24]'
                }`}
              >
                Meses
              </button>
            </div>
          </div>

          {/* Quick Year Chips highlighting 5+ years */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {YEAR_QUICK_CHIPS.map((yr) => {
              const active =
                (input.termUnit === 'years' && input.termValue === yr) ||
                (input.termUnit === 'months' && input.termValue === yr * 12);
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => update({ termUnit: 'years', termValue: yr })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    active
                      ? 'bg-[#2925EB] text-white'
                      : 'bg-[#F3F2FF] text-[#6C698A] hover:bg-[#E4E0FE] hover:text-[#2925EB]'
                  }`}
                >
                  {yr} {yr === 1 ? 'año' : 'años'}
                </button>
              );
            })}
          </div>

          {/* Payment Frequency */}
          <div className="mt-3">
            <label
              htmlFor="select-frequency"
              className="mb-1 block text-[11px] font-semibold text-[#6C698A]"
            >
              Frecuencia de pago
            </label>
            <select
              id="select-frequency"
              value={input.frequency}
              onChange={(e) => update({ frequency: e.target.value as PaymentFrequency })}
              className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
            >
              {Object.values(FREQUENCY_META).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.daysPerPeriod} días · {f.periodsPerYear} pagos/año)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VARIABLE i: Interest Rate */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="input-rate"
              className="flex items-center gap-2 text-xs font-bold text-[#100F24]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#F2B632] text-[11px] font-extrabold text-[#100F24]">
                i
              </span>
              Tasa de Interés (%)
            </label>
            <span className="text-[11px] font-semibold text-[#6C698A]">Admite 0%</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative">
              <input
                id="input-rate"
                type="number"
                min={0}
                max={300}
                step={0.1}
                value={input.ratePercent}
                onChange={(e) =>
                  update({ ratePercent: Math.min(300, handleNumberInput(e.target.value, 0)) })
                }
                className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] py-2.5 pr-9 pl-3.5 text-base font-bold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-4 focus:ring-[#3E35F2]/12"
              />
              <Percent className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#6C698A]" />
            </div>

            <select
              aria-label="Tipo de tasa de interés"
              value={input.rateType}
              onChange={(e) => update({ rateType: e.target.value as RateInputType })}
              className="w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2.5 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
            >
              <option value="TEA">TEA (Estándar Perú)</option>
              <option value="PERIOD_EFFECTIVE">
                {rates.periodRateLabel} (Efectiva periodo)
              </option>
              <option value="TNA">TNA (Nominal Anual)</option>
            </select>
          </div>

          {input.rateType === 'TNA' && (
            <div className="mt-2">
              <label className="mb-1 block text-[11px] font-semibold text-[#6C698A]">
                Capitalización de la TNA (m)
              </label>
              <select
                value={input.compounding}
                onChange={(e) => update({ compounding: e.target.value as CompoundingFrequency })}
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
              >
                {Object.values(COMPOUNDING_META).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Equivalent Rate Conversion Pill */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F3F2FF] px-3.5 py-2 text-[11px]">
            <span className="font-semibold text-[#6C698A]">
              TEA:{' '}
              <strong className="tabular-nums font-extrabold text-[#100F24]">
                {formatPercent(rates.tea, 2)}
              </strong>
            </span>
            <span className="text-[#C1BAFA]">•</span>
            <span className="font-semibold text-[#6C698A]">
              {rates.periodRateLabel} ({rates.daysPerPeriod}d):{' '}
              <strong className="tabular-nums font-extrabold text-[#2925EB]">
                {formatPercent(rates.periodRate, 4)}
              </strong>
            </span>
          </div>
        </div>

        {/* SBS PERU OPTIONS (Revealed when sbsMode === true) */}
        {input.sbsMode && (
          <div className="mt-4 space-y-3.5 rounded-2xl border border-[#D7D2FE] bg-[#F6F5FF] p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#2925EB]">
              <ShieldCheck className="h-4 w-4" />
              <span>Parámetros Banca Perú (Normativa SBS)</span>
            </div>

            {/* Grace Period */}
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#100F24]">
                Periodo de Gracia (g dentro de n)
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-[#E4E1FD]">
                {(
                  [
                    { id: 'none', label: 'Ninguno' },
                    { id: 'partial', label: 'Parcial' },
                    { id: 'total', label: 'Total' },
                  ] as Array<{ id: GraceType; label: string }>
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      update({
                        graceType: g.id,
                        gracePeriods:
                          g.id === 'none'
                            ? 0
                            : Math.max(1, Math.min(input.gracePeriods || 2, maxGraceAllowed)),
                      })
                    }
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                      input.graceType === g.id
                        ? 'bg-[#2925EB] text-white'
                        : 'text-[#6C698A] hover:text-[#100F24]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {input.graceType !== 'none' && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] font-semibold text-[#6C698A]">
                      Periodos de gracia (g)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxGraceAllowed}
                      value={input.gracePeriods}
                      onChange={(e) =>
                        update({
                          gracePeriods: Math.min(
                            maxGraceAllowed,
                            Math.max(0, Math.floor(handleNumberInput(e.target.value, 0))),
                          ),
                        })
                      }
                      className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-1.5 text-sm font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                    />
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 text-right ring-1 ring-[#E4E1FD]">
                    <div className="text-[10px] font-semibold text-[#6C698A]">Amortiza en (n-g)</div>
                    <div className="tabular-nums text-xs font-extrabold text-[#2925EB]">
                      {Math.max(1, totalPeriods - Math.min(input.gracePeriods, maxGraceAllowed))}{' '}
                      cuotas
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desgravamen & Portes */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#100F24]">
                  Desgravamen (% mes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.005}
                  value={input.desgravamenMonthlyPercent}
                  onChange={(e) =>
                    update({
                      desgravamenMonthlyPercent: Math.min(5, handleNumberInput(e.target.value, 0)),
                    })
                  }
                  className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-2 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#100F24]">
                  Portes/Comis. ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={input.fixedFeePerPeriod}
                  onChange={(e) =>
                    update({ fixedFeePerPeriod: handleNumberInput(e.target.value, 0) })
                  }
                  className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-2 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                />
              </div>
            </div>

            {/* Disbursement Date */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-[#100F24]">
                <Calendar className="h-3.5 w-3.5 text-[#3E35F2]" />
                Fecha de Desembolso
              </label>
              <input
                type="date"
                value={input.startDate}
                onChange={(e) => update({ startDate: e.target.value || input.startDate })}
                className="w-full rounded-xl border border-[#DFDCFC] bg-white px-3 py-2 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Academic Metadata Card for PDF & Excel Header */}
      <div className="card-floating overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAcademicFields((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#FAF9FF]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ECEAFF] text-[#2925EB]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#100F24]">
                Datos del Curso (PDF y Excel)
              </div>
              <div className="text-[11px] text-[#6C698A]">
                Universidad, curso, docente y alumno/grupo
              </div>
            </div>
          </div>
          {showAcademicFields ? (
            <ChevronUp className="h-4 w-4 text-[#6C698A]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6C698A]" />
          )}
        </button>

        {showAcademicFields && (
          <div className="space-y-3 border-t border-[#F0EEFF] px-5 pt-3 pb-5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Universidad</label>
              <input
                type="text"
                value={input.academic.university}
                onChange={(e) => updateAcademic({ university: e.target.value })}
                placeholder="Ej. Universidad Tecnológica del Perú (UTP)"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Curso</label>
              <input
                type="text"
                value={input.academic.course}
                onChange={(e) => updateAcademic({ course: e.target.value })}
                placeholder="Ingeniería Económica"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Docente</label>
              <input
                type="text"
                value={input.academic.professor}
                onChange={(e) => updateAcademic({ professor: e.target.value })}
                placeholder="Ing. / Mg. Nombre del docente"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">
                Alumno / Integrantes
              </label>
              <input
                type="text"
                value={input.academic.studentOrGroup}
                onChange={(e) => updateAcademic({ studentOrGroup: e.target.value })}
                placeholder="Nombres o Grupo #"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#6C698A]">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#3E35F2]" />
              Estos datos aparecerán en el encabezado del PDF y Excel descargables.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
