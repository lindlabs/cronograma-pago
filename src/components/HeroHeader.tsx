import { Download, FileSpreadsheet, FileText, RotateCcw, Sparkles } from 'lucide-react';
import { PERU_PRESETS, type LoanPreset } from '../engine/presets';

interface HeroHeaderProps {
  onApplyPreset: (preset: LoanPreset) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onReset: () => void;
  isExportingExcel: boolean;
  sbsMode: boolean;
}

export function HeroHeader({
  onApplyPreset,
  onExportPdf,
  onExportExcel,
  onReset,
  isExportingExcel,
  sbsMode,
}: HeroHeaderProps) {
  return (
    <header className="hero-gradient relative overflow-hidden text-white">
      {/* Soft radial glow layers matching the vibrant electric-violet aesthetic */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#685BFF]/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#C0B2FF]/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-5 pb-14 sm:px-6 lg:px-8 lg:pb-16">
        {/* Top bar: Black circular logo mark + Frosted glass icon actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A0A12] shadow-lg shadow-black/25 ring-2 ring-white/15">
              {/* Geometric crisp monogram mark */}
              <svg
                viewBox="0 0 28 28"
                className="h-5 w-5 text-white"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6.5 19.5V8.5L13.5 16L13.5 8.5M16.5 19.5V8.5H21.5V13.5H16.5"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight sm:text-lg">CronoPE</span>
                <span className="rounded-full bg-white/18 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/95 backdrop-blur-sm">
                  {sbsMode ? 'SBS Perú · 360d' : 'Académico · 360d'}
                </span>
              </div>
              <p className="text-xs text-white/75">Ingeniería Económica · Perú</p>
            </div>
          </div>

          {/* Right action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportPdf}
              title="Descargar Cronograma en PDF"
              className="glass-icon-btn inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-white transition active:scale-95 sm:h-11 sm:px-4 sm:text-sm"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExportingExcel}
              title="Descargar Cronograma en Excel (.xlsx) con fórmulas"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0A0A12] px-3.5 text-xs font-semibold text-white shadow-lg shadow-black/25 transition hover:bg-[#1A192A] active:scale-95 disabled:opacity-60 sm:h-11 sm:px-4.5 sm:text-sm"
            >
              {isExportingExcel ? (
                <Download className="h-4 w-4 animate-bounce" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-[#A79BFF]" />
              )}
              <span>{isExportingExcel ? 'Generando...' : 'Excel .xlsx'}</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              title="Restablecer valores por defecto"
              aria-label="Restablecer valores por defecto"
              className="glass-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition active:scale-95 sm:h-11 sm:w-11"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hero body: Friendly headline + Stylized 3D-inspired lavender mascot orb */}
        <div className="mt-6 flex flex-col justify-between gap-6 lg:mt-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              Simulador de Cronograma de Pagos
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Modela <strong className="font-bold text-white">P</strong>,{' '}
              <strong className="font-bold text-white">n</strong> e{' '}
              <strong className="font-bold text-white">i</strong> para plazos de{' '}
              <strong className="font-bold text-white">5 a 30+ años</strong> bajo convención peruana
              de 360 días. Compara Francés, Alemán y Americano y descarga en PDF o Excel con
              fórmulas.
            </p>

            {/* Quick Peru Presets Pills */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/75">
                <Sparkles className="h-3.5 w-3.5" />
                Ejemplos Perú:
              </span>
              {PERU_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  title={preset.description}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-[#2522EA] active:scale-95"
                >
                  {preset.name}{' '}
                  <span className="opacity-75">· {preset.badge.split('·')[0].trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stylized playful 3D-glossy lavender mascot companion inspired by the design palette */}
          <div className="hidden shrink-0 items-center justify-center lg:flex" aria-hidden="true">
            <div className="relative flex h-32 w-36 items-center justify-center">
              <svg viewBox="0 0 160 150" className="h-32 w-36 drop-shadow-[0_18px_24px_rgba(25,20,120,0.35)]">
                <defs>
                  <radialGradient id="mascotBody" cx="35%" cy="28%" r="72%">
                    <stop offset="0%" stopColor="#E1C7FF" />
                    <stop offset="42%" stopColor="#B68CFA" />
                    <stop offset="100%" stopColor="#7C56E8" />
                  </radialGradient>
                  <radialGradient id="mascotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* Little cute tuft on top */}
                <path
                  d="M72 28 C68 12, 85 10, 82 26 C90 15, 101 22, 92 33 Z"
                  fill="url(#mascotBody)"
                />
                {/* Little side arms */}
                <ellipse cx="26" cy="92" rx="14" ry="9" transform="rotate(-22 26 92)" fill="url(#mascotBody)" />
                <ellipse cx="134" cy="92" rx="14" ry="9" transform="rotate(22 134 92)" fill="url(#mascotBody)" />
                {/* Main round chubby body */}
                <ellipse cx="80" cy="86" rx="54" ry="50" fill="url(#mascotBody)" />
                {/* Top glossy specular highlight */}
                <ellipse cx="62" cy="56" rx="22" ry="12" transform="rotate(-18 62 56)" fill="url(#mascotGlow)" />
                {/* Expressive friendly eyes */}
                <circle cx="62" cy="80" r="11" fill="#131024" />
                <circle cx="98" cy="80" r="11" fill="#131024" />
                <circle cx="58" cy="76" r="3.6" fill="#FFFFFF" />
                <circle cx="94" cy="76" r="3.6" fill="#FFFFFF" />
                <circle cx="65" cy="83" r="1.6" fill="#FFFFFF" opacity="0.8" />
                <circle cx="101" cy="83" r="1.6" fill="#FFFFFF" opacity="0.8" />
                {/* Soft blush cheeks */}
                <ellipse cx="47" cy="94" rx="7" ry="4" fill="#F48FB1" opacity="0.45" />
                <ellipse cx="113" cy="94" rx="7" ry="4" fill="#F48FB1" opacity="0.45" />
                {/* Happy smile */}
                <path
                  d="M72 95 Q80 107 88 95 Q80 98 72 95 Z"
                  fill="#4B1D52"
                />
                <path d="M75 100 Q80 105 85 100" fill="#F472B6" />
                {/* Floating mini coin badge */}
                <g transform="translate(115, 22)">
                  <circle cx="16" cy="16" r="15" fill="#F2B632" stroke="#FFF4D1" strokeWidth="2.5" />
                  <text
                    x="16"
                    y="20.5"
                    textAnchor="middle"
                    fill="#100F24"
                    fontSize="12"
                    fontWeight="800"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    S/
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
