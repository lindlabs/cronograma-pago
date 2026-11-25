import { Building2, FileSpreadsheet, FileText, X } from 'lucide-react';
import type { AcademicMetadata } from '../types/finance';

interface AcademicModalProps {
  open: boolean;
  academic: AcademicMetadata;
  onChange: (next: AcademicMetadata) => void;
  onClose: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export function AcademicModal({
  open,
  academic,
  onChange,
  onClose,
  onExportPdf,
  onExportExcel,
}: AcademicModalProps) {
  if (!open) return null;

  const update = (patch: Partial<AcademicMetadata>) => {
    onChange({ ...academic, ...patch });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#100F24]/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="card-floating w-full max-w-md p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ECEAFF] text-[#2925EB]">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#100F24]">
                Cabecera Académica (PDF y Excel)
              </h2>
              <p className="text-[11px] text-[#6C698A]">
                Opcional · Se imprime al descargar tus reportes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F2FF] text-[#6C698A] transition hover:bg-[#E4E0FE] hover:text-[#100F24]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Universidad</label>
            <input
              type="text"
              value={academic.university}
              onChange={(e) => update({ university: e.target.value })}
              placeholder="Ej. Universidad Tecnológica del Perú (UTP)"
              className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Curso</label>
            <input
              type="text"
              value={academic.course}
              onChange={(e) => update({ course: e.target.value })}
              placeholder="Ingeniería Económica"
              className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">Docente</label>
              <input
                type="text"
                value={academic.professor}
                onChange={(e) => update({ professor: e.target.value })}
                placeholder="Ing. / Mg. Docente"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-[#6C698A]">
                Alumno
              </label>
              <input
                type="text"
                value={academic.studentOrGroup}
                onChange={(e) => update({ studentOrGroup: e.target.value })}
                placeholder="Nombre del alumno"
                className="w-full rounded-xl border border-[#DFDCFC] bg-[#F8F7FF] px-3 py-2 text-xs font-semibold text-[#100F24] outline-none focus:border-[#3E35F2] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEFF] pt-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onExportPdf();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ECEAFF] px-3.5 py-2 text-xs font-bold text-[#2925EB] transition hover:bg-[#DDD9FE]"
            >
              <FileText className="h-3.5 w-3.5" />
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onExportExcel();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0C0C14] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#232236]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#A79BFF]" />
              Excel .xlsx
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-xs font-bold text-[#6C698A] hover:bg-[#F3F2FF] hover:text-[#100F24]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
