import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Plus,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react';
import { AcademicModal } from './components/AcademicModal';
import { ChartsPanel } from './components/ChartsPanel';
import { ComparisonPanel } from './components/ComparisonPanel';
import { FormulasPanel } from './components/FormulasPanel';
import { HeroHeader } from './components/HeroHeader';
import { KpiCards } from './components/KpiCards';
import { LoanForm } from './components/LoanForm';
import { ScheduleTable } from './components/ScheduleTable';
import { simulateLoan } from './engine/amortization';
import { DEFAULT_LOAN_INPUT, type LoanPreset } from './engine/presets';
import type { AmortizationMethod, LoanInput } from './types/finance';

type DesktopTab = 'schedule' | 'charts' | 'comparison' | 'formulas';
type MobileView = 'setup' | 'schedule' | 'charts' | 'analysis';

const DESKTOP_TABS: Array<{ id: DesktopTab; label: string; icon: typeof Table2 }> = [
  { id: 'schedule', label: 'Cronograma', icon: Table2 },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  { id: 'comparison', label: 'Comparativa', icon: GitCompareArrows },
  { id: 'formulas', label: 'Paso a Paso', icon: BookOpen },
];

const MOBILE_NAV: Array<{ id: MobileView; label: string; icon: typeof Table2 }> = [
  { id: 'setup', label: 'Simular', icon: SlidersHorizontal },
  { id: 'schedule', label: 'Tabla', icon: Table2 },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  { id: 'analysis', label: 'Análisis', icon: BookOpen },
];

export default function App() {
  const [input, setInput] = useState<LoanInput>(DEFAULT_LOAN_INPUT);
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('schedule');
  const [mobileView, setMobileView] = useState<MobileView>('setup');
  const [analysisSubTab, setAnalysisSubTab] = useState<'comparison' | 'formulas'>('comparison');
  const [academicModalOpen, setAcademicModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [mobileExportOpen, setMobileExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const result = useMemo(() => simulateLoan(input), [input]);

  const hasCustomAcademic = Boolean(
    input.academic.professor.trim() || input.academic.studentOrGroup.trim(),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleApplyPreset = (preset: LoanPreset) => {
    setInput((prev) => ({
      ...prev,
      sbsMode: false,
      graceType: 'none',
      gracePeriods: 0,
      ...preset.patch,
    }));
    showToast(`Preset: ${preset.name}`);
  };

  const handleReset = () => {
    setInput(DEFAULT_LOAN_INPUT);
    showToast('Valores restablecidos');
  };

  const handleSelectMethod = (method: AmortizationMethod) => {
    setInput((prev) => ({ ...prev, method }));
    showToast('Sistema actualizado');
  };

  const handleExportPdf = async () => {
    try {
      const { exportScheduleToPdf } = await import('./exporters/pdfExporter');
      exportScheduleToPdf(result);
      setMobileExportOpen(false);
      showToast('PDF descargado');
    } catch {
      showToast('Error al generar PDF');
    }
  };

  const handleExportExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    try {
      const { exportScheduleToExcel } = await import('./exporters/excelExporter');
      await exportScheduleToExcel(result);
      setMobileExportOpen(false);
      showToast('Excel (.xlsx) con fórmulas descargado');
    } catch {
      showToast('Error al generar Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleGoToCharts = () => {
    setDesktopTab('charts');
    setMobileView('charts');
  };

  return (
    <div className="min-h-screen bg-[#F2F1FE] pb-24 lg:pb-6">
      <HeroHeader
        sbsMode={input.sbsMode}
        onToggleMode={(sbs) => setInput((prev) => ({ ...prev, sbsMode: sbs }))}
        onOpenAcademic={() => setAcademicModalOpen(true)}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onReset={handleReset}
        isExportingExcel={isExportingExcel}
        hasCustomAcademic={hasCustomAcademic}
      />

      {/* ================================================================= */}
      {/* DESKTOP / LAPTOP COCKPIT (>= 1024px) — Compact 1-Screen Workspace */}
      {/* ================================================================= */}
      <main className="mx-auto hidden max-w-7xl px-5 pt-4 lg:block lg:px-6">
        <div className="grid grid-cols-12 items-start gap-4">
          {/* Left Compact Form (fits in 1 screen) */}
          <div className="col-span-4">
            <LoanForm
              input={input}
              rates={result.rates}
              effectivePrincipal={result.summary.principal}
              onChange={setInput}
              onApplyPreset={handleApplyPreset}
            />
          </div>

          {/* Right Live Cockpit */}
          <div className="col-span-8 space-y-3">
            <KpiCards result={result} onGoToCharts={handleGoToCharts} />

            {/* Compact Floating White Pill Tab Bar */}
            <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_8px_24px_-10px_rgba(42,36,224,0.16)] ring-1 ring-[#ECEAFF]">
              {DESKTOP_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = desktopTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDesktopTab(tab.id)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
                      active
                        ? 'bg-[#2925EB] text-white shadow-sm shadow-[#2925EB]/25'
                        : 'text-[#6C698A] hover:bg-[#F4F3FF] hover:text-[#100F24]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab View (fits cleanly without page scroll fatigue) */}
            {desktopTab === 'schedule' && <ScheduleTable result={result} />}
            {desktopTab === 'charts' && <ChartsPanel result={result} />}
            {desktopTab === 'comparison' && (
              <ComparisonPanel input={input} onSelectMethod={handleSelectMethod} />
            )}
            {desktopTab === 'formulas' && <FormulasPanel result={result} />}
          </div>
        </div>
      </main>

      {/* ================================================================= */}
      {/* MOBILE / TABLET ZERO-SCROLL APP VIEW (< 1024px)                   */}
      {/* ================================================================= */}
      <main className="mx-auto max-w-2xl px-3.5 pt-3 lg:hidden">
        {mobileView === 'setup' && (
          <div className="space-y-3">
            <KpiCards result={result} onGoToCharts={handleGoToCharts} />
            <LoanForm
              input={input}
              rates={result.rates}
              effectivePrincipal={result.summary.principal}
              onChange={setInput}
              onApplyPreset={handleApplyPreset}
            />
          </div>
        )}

        {mobileView === 'schedule' && <ScheduleTable result={result} />}

        {mobileView === 'charts' && <ChartsPanel result={result} />}

        {mobileView === 'analysis' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-xs ring-1 ring-[#ECEAFF]">
              <button
                type="button"
                onClick={() => setAnalysisSubTab('comparison')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${
                  analysisSubTab === 'comparison' ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
                }`}
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                Comparativa
              </button>
              <button
                type="button"
                onClick={() => setAnalysisSubTab('formulas')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition ${
                  analysisSubTab === 'formulas' ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Paso a Paso
              </button>
            </div>

            {analysisSubTab === 'comparison' ? (
              <ComparisonPanel input={input} onSelectMethod={handleSelectMethod} />
            ) : (
              <FormulasPanel result={result} />
            )}
          </div>
        )}
      </main>

      {/* Signature 4-Icon Floating White Pill Bottom Dock + Black Circular "+" Action Button (< lg) */}
      <div className="fixed inset-x-0 bottom-3.5 z-40 flex items-center justify-center gap-2.5 px-4 lg:hidden">
        {mobileExportOpen && (
          <div className="absolute right-4 bottom-16 w-56 rounded-3xl bg-white p-2 shadow-2xl shadow-[#2522EA]/25 ring-1 ring-[#DFDCFC]">
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-xs font-bold text-[#100F24] hover:bg-[#F3F2FF]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECEAFF] text-[#2925EB]">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div>Descargar PDF</div>
                <div className="text-[10px] font-medium text-[#6C698A]">Cronograma multi-página</div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="mt-1 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-xs font-bold text-[#100F24] hover:bg-[#F3F2FF] disabled:opacity-60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C0C14] text-[#A79BFF]">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <div>
                <div>Descargar Excel</div>
                <div className="text-[10px] font-medium text-[#6C698A]">Fórmulas nativas .xlsx</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileExportOpen(false);
                setAcademicModalOpen(true);
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-xs font-bold text-[#100F24] hover:bg-[#F3F2FF]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3F2FF] text-[#6658F6]">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <div>Datos del Curso</div>
                <div className="text-[10px] font-medium text-[#6C698A]">Universidad y alumno</div>
              </div>
            </button>
          </div>
        )}

        <nav
          aria-label="Navegación principal móvil"
          className="flex items-center gap-1 rounded-full bg-white/95 p-1.5 shadow-[0_14px_34px_-6px_rgba(37,34,234,0.28)] ring-1 ring-[#DFDCFC] backdrop-blur-md"
        >
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = mobileView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileView(item.id);
                  setMobileExportOpen(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition ${
                  active ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className={active ? 'inline' : 'hidden sm:inline'}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setMobileExportOpen((prev) => !prev)}
          aria-label="Descargar PDF o Excel"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A0A12] text-white shadow-[0_12px_28px_rgba(10,10,18,0.4)] transition active:scale-95"
        >
          {mobileExportOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      {/* Subtle compact team credit bar on desktop */}
      <footer className="mx-auto mt-3 hidden max-w-7xl items-center justify-between px-6 text-[11px] text-[#7D799E] lg:flex">
        <span>
          <strong className="font-bold text-[#4C4872]">CronoPE</strong> · Simulador de Ingeniería
          Económica (Perú · Base 360 SBS)
        </span>
        <span>
          Alumno:{' '}
          <strong className="font-bold text-[#4C4872]">
            {input.academic.studentOrGroup || 'Lindbergh Paredes'}
          </strong>
        </span>
      </footer>

      {/* Academic Metadata Modal (keeps main UI clean & zero-scroll) */}
      <AcademicModal
        open={academicModalOpen}
        academic={input.academic}
        onChange={(academic) => setInput((prev) => ({ ...prev, academic }))}
        onClose={() => setAcademicModalOpen(false)}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 rounded-2xl bg-[#0C0C14] px-3.5 py-2 text-xs font-bold text-white shadow-xl lg:bottom-5"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
