import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Plus,
  Table2,
  X,
} from 'lucide-react';
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

type ActiveTab = 'schedule' | 'charts' | 'comparison' | 'formulas';

const TABS: Array<{ id: ActiveTab; label: string; shortLabel: string; icon: typeof Table2 }> = [
  { id: 'schedule', label: 'Cronograma', shortLabel: 'Tabla', icon: Table2 },
  { id: 'charts', label: 'Gráficos', shortLabel: 'Gráficos', icon: BarChart3 },
  { id: 'comparison', label: 'Comparativa', shortLabel: 'Comparar', icon: GitCompareArrows },
  { id: 'formulas', label: 'Paso a Paso', shortLabel: 'Fórmulas', icon: BookOpen },
];

export default function App() {
  const [input, setInput] = useState<LoanInput>(DEFAULT_LOAN_INPUT);
  const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [mobileExportOpen, setMobileExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const result = useMemo(() => simulateLoan(input), [input]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleApplyPreset = (preset: LoanPreset) => {
    setInput((prev) => ({
      ...prev,
      sbsMode: false,
      graceType: 'none',
      gracePeriods: 0,
      ...preset.patch,
    }));
    showToast(`Preset aplicado: ${preset.name}`);
  };

  const handleReset = () => {
    setInput(DEFAULT_LOAN_INPUT);
    showToast('Parámetros restablecidos');
  };

  const handleSelectMethod = (method: AmortizationMethod) => {
    setInput((prev) => ({ ...prev, method }));
    showToast('Sistema de amortización actualizado');
  };

  const handleExportPdf = async () => {
    try {
      const { exportScheduleToPdf } = await import('./exporters/pdfExporter');
      exportScheduleToPdf(result);
      setMobileExportOpen(false);
      showToast('PDF descargado correctamente');
    } catch {
      showToast('Error al generar el archivo PDF');
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
      showToast('Error al generar el archivo Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F1FE] pb-24 lg:pb-14">
      <HeroHeader
        onApplyPreset={handleApplyPreset}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onReset={handleReset}
        isExportingExcel={isExportingExcel}
        sbsMode={input.sbsMode}
      />

      {/* Overlapping Main Workspace Grid */}
      <main className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:-mt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Sticky Input Panel (P, n, i + SBS + Academic Report Data) */}
          <div className="lg:sticky lg:top-5 lg:col-span-4">
            <LoanForm
              input={input}
              rates={result.rates}
              effectivePrincipal={result.summary.principal}
              onChange={setInput}
            />
          </div>

          {/* Right Results Workspace */}
          <div className="space-y-5 lg:col-span-8">
            <KpiCards result={result} onGoToCharts={() => setActiveTab('charts')} />

            {/* Desktop & Tablet Floating White Pill Tab Bar */}
            <div className="hidden items-center justify-between gap-3 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-10px_rgba(42,36,224,0.16)] ring-1 ring-[#ECEAFF] sm:flex">
              <div className="flex flex-1 items-center gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                        active
                          ? 'bg-[#2925EB] text-white shadow-md shadow-[#2925EB]/25'
                          : 'text-[#6C698A] hover:bg-[#F4F3FF] hover:text-[#100F24]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Tab View */}
            <div>
              {activeTab === 'schedule' && (
                <ScheduleTable
                  result={result}
                  onExportPdf={handleExportPdf}
                  onExportExcel={handleExportExcel}
                  isExportingExcel={isExportingExcel}
                />
              )}

              {activeTab === 'charts' && <ChartsPanel result={result} />}

              {activeTab === 'comparison' && (
                <ComparisonPanel input={input} onSelectMethod={handleSelectMethod} />
              )}

              {activeTab === 'formulas' && <FormulasPanel result={result} />}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Floating White Pill Bottom Navigation + Crisp Black Circular Action Button (Reference UI Signature!) */}
      <div className="fixed inset-x-0 bottom-4 z-40 flex items-center justify-center gap-3 px-4 sm:hidden">
        {/* Quick Export Popover triggered by the black circular button */}
        {mobileExportOpen && (
          <div className="absolute right-4 bottom-16 w-56 rounded-3xl bg-white p-2.5 shadow-2xl shadow-[#2522EA]/25 ring-1 ring-[#DFDCFC]">
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-xs font-bold text-[#100F24] transition hover:bg-[#F3F2FF]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECEAFF] text-[#2925EB]">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div>Descargar PDF</div>
                <div className="text-[10px] font-medium text-[#6C698A]">Formato cronograma SBS</div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="mt-1 flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-xs font-bold text-[#100F24] transition hover:bg-[#F3F2FF] disabled:opacity-60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0C0C14] text-[#A79BFF]">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <div>
                <div>Descargar Excel (.xlsx)</div>
                <div className="text-[10px] font-medium text-[#6C698A]">Con fórmulas dinámicas</div>
              </div>
            </button>
          </div>
        )}

        <nav
          aria-label="Navegación móvil"
          className="flex items-center gap-1 rounded-full bg-white/95 p-1.5 shadow-[0_14px_34px_-6px_rgba(37,34,234,0.28)] ring-1 ring-[#DFDCFC] backdrop-blur-md"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileExportOpen(false);
                }}
                className={`flex flex-col items-center justify-center rounded-full px-3.5 py-2 text-[10px] font-bold transition ${
                  active ? 'bg-[#2925EB] text-white' : 'text-[#6C698A]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-0.5">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setMobileExportOpen((prev) => !prev)}
          aria-label="Abrir opciones de descarga PDF y Excel"
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[#0A0A12] text-white shadow-[0_12px_28px_rgba(10,10,18,0.4)] transition active:scale-95"
        >
          {mobileExportOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      {/* Subtle Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 rounded-2xl bg-[#0C0C14] px-4 py-2.5 text-xs font-bold text-white shadow-xl sm:bottom-6"
        >
          {toast}
        </div>
      )}

      {/* Footer */}
      <footer className="mx-auto mt-10 max-w-7xl px-4 text-center text-xs text-[#6C698A] sm:px-6 lg:px-8">
        <p>
          <strong>CronoPE</strong> · Simulador de Cronograma de Pagos para el Perú (Convención SBS
          360 días) · Proyecto de Ingeniería Económica
        </p>
      </footer>
    </div>
  );
}
