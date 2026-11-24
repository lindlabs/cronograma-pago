import {
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Landmark,
  RotateCcw,
} from 'lucide-react';

interface HeroHeaderProps {
  sbsMode: boolean;
  onToggleMode: (sbs: boolean) => void;
  onOpenAcademic: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onReset: () => void;
  isExportingExcel: boolean;
  hasCustomAcademic: boolean;
}

export function HeroHeader({
  sbsMode,
  onToggleMode,
  onOpenAcademic,
  onExportPdf,
  onExportExcel,
  onReset,
  isExportingExcel,
  hasCustomAcademic,
}: HeroHeaderProps) {
  return (
    <header className="hero-gradient sticky top-0 z-30 text-white shadow-[0_8px_28px_-10px_rgba(37,34,234,0.45)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-5 lg:px-6">
        {/* Left: Crisp Black Brand Monogram + Compact Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A12] shadow-md shadow-black/25 ring-2 ring-white/15">
            <svg viewBox="0 0 28 28" className="h-4.5 w-4.5 text-white" fill="none" aria-hidden="true">
              <path
                d="M6.5 19.5V8.5L13.5 16L13.5 8.5M16.5 19.5V8.5H21.5V13.5H16.5"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight sm:text-base">CronoPE</span>
              <span className="hidden rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-bold text-white/95 sm:inline-block">
                Perú · 360d
              </span>
            </div>
            <p className="text-[10px] font-medium text-white/80 sm:text-[11px]">
              Ingeniería Económica
            </p>
          </div>
        </div>

        {/* Center: Instant Mode Switcher Pill (Desktop/Tablet) */}
        <div className="hidden items-center rounded-full bg-white/15 p-0.5 backdrop-blur-md md:inline-flex">
          <button
            type="button"
            onClick={() => onToggleMode(false)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              !sbsMode
                ? 'bg-white text-[#2522EA] shadow-xs'
                : 'text-white/85 hover:text-white'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Académico Puro
          </button>
          <button
            type="button"
            onClick={() => onToggleMode(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              sbsMode
                ? 'bg-[#0A0A12] text-white shadow-xs'
                : 'text-white/85 hover:text-white'
            }`}
          >
            <Landmark className="h-3.5 w-3.5 text-[#A79BFF]" />
            Banca Perú / SBS
          </button>
        </div>

        {/* Right: Quick Action Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenAcademic}
            title="Personalizar Universidad, Curso, Docente y Alumno en reportes"
            className="glass-icon-btn relative inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-white transition active:scale-95 sm:text-xs"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Datos Curso</span>
            {hasCustomAcademic && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#F2B632]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            title="Descargar Cronograma en PDF"
            className="glass-icon-btn inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-white transition active:scale-95 sm:text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExportingExcel}
            title="Descargar Cronograma en Excel (.xlsx) con fórmulas"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0A0A12] px-3 text-[11px] font-bold text-white shadow-md shadow-black/25 transition hover:bg-[#1B1A2B] active:scale-95 disabled:opacity-60 sm:px-3.5 sm:text-xs"
          >
            {isExportingExcel ? (
              <Download className="h-3.5 w-3.5 animate-bounce" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#A79BFF]" />
            )}
            <span>{isExportingExcel ? '...' : 'Excel'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            title="Restablecer valores"
            aria-label="Restablecer valores"
            className="glass-icon-btn inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
