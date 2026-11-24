import { Calendar, GraduationCap, Landmark, Percent, ShieldCheck, Sparkles } from 'lucide-react';
import { PERU_PRESETS, type LoanPreset } from '../engine/presets';
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
  TermUnit,
} from '../types/finance';
import { currencySymbol, formatMoney, formatPercent } from '../utils/formatters';
import { NumericInput } from './NumericInput';

interface LoanFormProps {
  input: LoanInput;
  rates: RateBreakdown;
  effectivePrincipal: number;
  onChange: (next: LoanInput) => void;
  onApplyPreset: (preset: LoanPreset) => void;
}

const QUICK_YEARS = [3, 5, 10, 20];

export function LoanForm({
  input,
  rates,
  effectivePrincipal,
  onChange,
  onApplyPreset,
}: LoanFormProps) {
  const totalPeriods = computeTotalPeriods(input.termValue, input.termUnit, input.frequency);
  const maxGraceAllowed = Math.max(0, totalPeriods - 1);
  const sym = currencySymbol(input.currency);
  const freqMeta = FREQUENCY_META[input.frequency];

  const update = (patch: Partial<LoanInput>) => {
    onChange({ ...input, ...patch });
  };

  const handleTermUnitSwitch = (unit: TermUnit) => {
    if (unit === input.termUnit) return;
    if (unit === 'periods') {
      update({ termUnit: 'periods', termValue: totalPeriods });
    } else if (unit === 'months') {
      const months = Math.max(1, Math.round(totalPeriods * freqMeta.monthsPerPeriod));
      update({ termUnit: 'months', termValue: months });
    } else {
      const years = Math.max(1, Math.round((totalPeriods / freqMeta.periodsPerYear) * 10) / 10);
      update({ termUnit: 'years', termValue: years });
    }
  };

  const maxTermVal = input.termUnit === 'years' ? 50 : 600;

  return (
    <aside className="card-floating p-4 sm:p-5">
      {/* Mobile-only compact Mode Switcher (desktop already has it in top bar) */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#F3F2FF] p-1 md:hidden">
        <button
          type="button"
          onClick={() => update({ sbsMode: false })}
          className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
            !input.sbsMode ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Académico
        </button>
        <button
          type="button"
          onClick={() => update({ sbsMode: true })}
          className={`flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition ${
            input.sbsMode ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
          }`}
        >
          <Landmark className="h-3.5 w-3.5" />
          Banca SBS
        </button>
      </div>

      {/* Row 1: Amortization Method + Currency */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-[#F3F2FF] p-0.5">
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
              className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                input.method === m.id
                  ? 'bg-white text-[#2925EB] shadow-xs ring-1 ring-[#2925EB]/12'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="inline-flex shrink-0 rounded-xl bg-[#F3F2FF] p-0.5">
          {(['PEN', 'USD'] as CurrencyCode[]).map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => update({ currency: cur })}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                input.currency === cur
                  ? 'bg-[#0C0C14] text-white'
                  : 'text-[#6C698A] hover:text-[#100F24]'
              }`}
            >
              {cur === 'PEN' ? 'S/' : 'US$'}
            </button>
          ))}
        </div>
      </div>

      {/* VARIABLE P: Capital */}
      <div className="mb-3.5">
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="input-principal"
            className="flex items-center gap-1.5 text-xs font-bold text-[#100F24]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#2925EB] text-[10px] font-extrabold text-white">
              P
            </span>
            Capital / Préstamo
          </label>
          <button
            type="button"
            onClick={() => update({ useDownPayment: !input.useDownPayment })}
            className="text-[11px] font-bold text-[#3E35F2] hover:underline"
          >
            {input.useDownPayment ? 'P directo' : '+ Cuota inicial'}
          </button>
        </div>

        {!input.useDownPayment ? (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-extrabold text-[#6C698A]">
              {sym}
            </span>
            <NumericInput
              id="input-principal"
              value={input.principal}
              min={1}
              max={100_000_000}
              placeholder="50000"
              onValueChange={(principal) => update({ principal })}
              className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] py-2.5 pr-3.5 pl-11 text-base font-extrabold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-3 focus:ring-[#3E35F2]/12"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E4E1FD] bg-[#F8F7FF] p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-bold text-[#6C698A]">
                  Precio ({sym})
                </label>
                <NumericInput
                  value={input.assetPrice}
                  min={1}
                  max={100_000_000}
                  onValueChange={(assetPrice) => update({ assetPrice })}
                  className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-2.5 py-1.5 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-bold text-[#6C698A]">
                  Inicial (%)
                </label>
                <NumericInput
                  value={input.downPaymentPercent}
                  min={0}
                  max={95}
                  onValueChange={(downPaymentPercent) => update({ downPaymentPercent })}
                  className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-2.5 py-1.5 text-xs font-bold text-[#100F24] outline-none focus:border-[#3E35F2]"
                />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#6C698A]">Monto financiado (P):</span>
              <strong className="tabular-nums font-extrabold text-[#2925EB]">
                {formatMoney(effectivePrincipal, input.currency)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* VARIABLES n & i: Side-by-Side Compact 2-Column Grid */}
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        {/* VARIABLE n */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-1">
            <label
              htmlFor="input-term"
              className="flex items-center gap-1 text-xs font-bold text-[#100F24]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#6658F6] text-[10px] font-extrabold text-white">
                n
              </span>
              Plazo
            </label>
            <div className="inline-flex rounded-lg bg-[#F3F2FF] p-0.5 text-[9.5px] font-bold">
              {(
                [
                  { id: 'years', label: 'Años' },
                  { id: 'months', label: 'Mes' },
                  { id: 'periods', label: 'Cuot.' },
                ] as Array<{ id: TermUnit; label: string }>
              ).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleTermUnitSwitch(u.id)}
                  className={`rounded-md px-1.5 py-0.5 transition ${
                    input.termUnit === u.id ? 'bg-[#0C0C14] text-white' : 'text-[#6C698A]'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
          <NumericInput
            id="input-term"
            value={input.termValue}
            min={1}
            max={maxTermVal}
            integer={input.termUnit !== 'years'}
            onValueChange={(termValue) => update({ termValue })}
            className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-sm font-extrabold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-3 focus:ring-[#3E35F2]/12"
          />
          <div className="mt-1.5 flex gap-1">
            {QUICK_YEARS.map((yr) => {
              const active =
                (input.termUnit === 'years' && input.termValue === yr) ||
                (input.termUnit === 'months' && input.termValue === yr * 12) ||
                (input.termUnit === 'periods' && input.termValue === yr * freqMeta.periodsPerYear);
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => update({ termUnit: 'years', termValue: yr })}
                  className={`flex-1 rounded-lg py-0.5 text-[10px] font-bold transition ${
                    active
                      ? 'bg-[#2925EB] text-white'
                      : 'bg-[#F3F2FF] text-[#6C698A] hover:bg-[#E4E0FE]'
                  }`}
                >
                  {yr}a
                </button>
              );
            })}
          </div>
        </div>

        {/* VARIABLE i */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="input-rate"
              className="flex items-center gap-1.5 text-xs font-bold text-[#100F24]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#F2B632] text-[10px] font-extrabold text-[#100F24]">
                i
              </span>
              Tasa (%)
            </label>
            <span className="text-[10px] font-semibold text-[#6C698A]">≥ 0%</span>
          </div>
          <div className="relative">
            <NumericInput
              id="input-rate"
              value={input.ratePercent}
              min={0}
              max={300}
              onValueChange={(ratePercent) => update({ ratePercent })}
              className="tabular-nums w-full rounded-2xl border border-[#DFDCFC] bg-[#F8F7FF] py-2 pr-7 pl-3 text-sm font-extrabold text-[#100F24] outline-none transition focus:border-[#3E35F2] focus:bg-white focus:ring-3 focus:ring-[#3E35F2]/12"
            />
            <Percent className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6C698A]" />
          </div>
          <select
            aria-label="Tipo de tasa"
            value={input.rateType}
            onChange={(e) => update({ rateType: e.target.value as RateInputType })}
            className="mt-1.5 w-full rounded-lg border border-[#DFDCFC] bg-[#F3F2FF] px-2 py-1 text-[10px] font-bold text-[#2925EB] outline-none focus:border-[#3E35F2]"
          >
            <option value="TEA">TEA (Anual Perú)</option>
            <option value="PERIOD_EFFECTIVE">{rates.periodRateLabel} (Periodo)</option>
            <option value="TNA">TNA (Nominal)</option>
          </select>
        </div>
      </div>

      {/* Frequency + TNA Compounding (if TNA) + Live Conversion Pill */}
      <div className="mb-3 space-y-2">
        <div className={`grid gap-2 ${input.rateType === 'TNA' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F7FF] px-2.5 py-1.5 ring-1 ring-[#ECEAFF]">
            <span className="text-[11px] font-semibold text-[#6C698A]">Frecuencia</span>
            <select
              aria-label="Frecuencia de pago"
              value={input.frequency}
              onChange={(e) => update({ frequency: e.target.value as PaymentFrequency })}
              className="bg-transparent text-right text-[11px] font-extrabold text-[#100F24] outline-none"
            >
              {Object.values(FREQUENCY_META).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.daysPerPeriod}d)
                </option>
              ))}
            </select>
          </div>

          {input.rateType === 'TNA' && (
            <div className="flex items-center justify-between gap-1 rounded-xl bg-[#F8F7FF] px-2.5 py-1.5 ring-1 ring-[#ECEAFF]">
              <span className="text-[10px] font-semibold text-[#6C698A]">Cap.</span>
              <select
                aria-label="Capitalización TNA"
                value={input.compounding}
                onChange={(e) => update({ compounding: e.target.value as CompoundingFrequency })}
                className="bg-transparent text-right text-[11px] font-extrabold text-[#2925EB] outline-none"
              >
                {Object.values(COMPOUNDING_META).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live Base-360 Summary Bar */}
        <div className="flex items-center justify-between rounded-xl bg-[#ECEAFF]/80 px-3 py-1.5 text-[11px] tabular-nums">
          <span className="font-bold text-[#2925EB]">n = {totalPeriods} cuotas</span>
          <span className="font-semibold text-[#6C698A]">
            TEA <strong className="text-[#100F24]">{formatPercent(rates.tea, 2)}</strong> →{' '}
            {rates.periodRateLabel}{' '}
            <strong className="text-[#2925EB]">{formatPercent(rates.periodRate, 4)}</strong>
          </span>
        </div>
      </div>

      {/* Compact SBS Peru Panel (only when sbsMode === true) */}
      {input.sbsMode && (
        <div className="mb-3 space-y-2 rounded-2xl border border-[#D7D2FE] bg-[#F6F5FF] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#2925EB]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Opciones SBS Perú
            </span>
            {input.graceType !== 'none' && (
              <span className="tabular-nums text-[10px] font-bold text-[#6C698A]">
                m = {Math.max(1, totalPeriods - Math.min(input.gracePeriods, maxGraceAllowed))} norm.
              </span>
            )}
          </div>

          {/* Grace row */}
          <div className="flex items-center gap-1.5">
            <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-[#E4E1FD]">
              {(
                [
                  { id: 'none', label: 'Sin gracia' },
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
                  className={`rounded-lg py-1 text-[10px] font-bold transition ${
                    input.graceType === g.id ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {input.graceType !== 'none' && (
              <NumericInput
                ariaLabel="Periodos de gracia g"
                title="Periodos de gracia (g)"
                value={Math.min(input.gracePeriods, maxGraceAllowed)}
                min={0}
                max={maxGraceAllowed}
                integer
                onValueChange={(gracePeriods) => update({ gracePeriods })}
                className="tabular-nums w-14 rounded-xl border border-[#DFDCFC] bg-white px-2 py-1 text-center text-xs font-extrabold text-[#2925EB] outline-none"
              />
            )}
          </div>

          {/* Desgravamen, Portes & Date in 1 ultra-compact 3-col row */}
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="mb-0.5 block text-[10px] font-bold text-[#6C698A]">
                Desgr. %/m
              </label>
              <NumericInput
                value={input.desgravamenMonthlyPercent}
                min={0}
                max={5}
                onValueChange={(desgravamenMonthlyPercent) => update({ desgravamenMonthlyPercent })}
                className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-2 py-1 text-[11px] font-bold text-[#100F24] outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] font-bold text-[#6C698A]">
                Portes ({sym})
              </label>
              <NumericInput
                value={input.fixedFeePerPeriod}
                min={0}
                max={10000}
                onValueChange={(fixedFeePerPeriod) => update({ fixedFeePerPeriod })}
                className="tabular-nums w-full rounded-xl border border-[#DFDCFC] bg-white px-2 py-1 text-[11px] font-bold text-[#100F24] outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 flex items-center gap-0.5 text-[10px] font-bold text-[#6C698A]">
                <Calendar className="h-2.5 w-2.5" />
                Inicio
              </label>
              <input
                type="date"
                value={input.startDate}
                onChange={(e) => update({ startDate: e.target.value || input.startDate })}
                className="w-full rounded-xl border border-[#DFDCFC] bg-white px-1.5 py-1 text-[10px] font-bold text-[#100F24] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Peru Presets Row */}
      <div className="border-t border-[#F0EEFF] pt-2.5">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#6C698A] uppercase">
          <Sparkles className="h-3 w-3 text-[#6658F6]" />
          Casos rápidos Perú
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PERU_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              title={preset.description}
              className="rounded-xl bg-[#F4F3FF] px-2.5 py-1.5 text-left transition hover:bg-[#2925EB] hover:text-white active:scale-98"
            >
              <div className="truncate text-[11px] font-bold">{preset.name}</div>
              <div className="truncate text-[9.5px] opacity-75">{preset.badge}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
