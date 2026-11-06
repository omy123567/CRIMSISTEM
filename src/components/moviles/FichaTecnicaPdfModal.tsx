import React, { useState } from 'react';
import { MovilPolicial, ReparacionMecanica, ConfiguracionSistema } from '../../types/police';
import { OpcionesFichaVehicular, generarPdfFichaTecnicaVehicular } from '../../services/pdfService';
import { X, FileDown, CheckSquare, Calendar, Shield } from 'lucide-react';

interface FichaTecnicaPdfModalProps {
  movil: MovilPolicial;
  reparaciones: ReparacionMecanica[];
  config: ConfiguracionSistema;
  onClose: () => void;
}

export const FichaTecnicaPdfModal: React.FC<FichaTecnicaPdfModalProps> = ({
  movil,
  reparaciones,
  config,
  onClose,
}) => {
  const [opciones, setOpciones] = useState<OpcionesFichaVehicular>({
    incluirIdentificacion: true,
    incluirCondicion: true,
    incluirService: true,
    incluirRtoYSeguro: true,
    incluirReparaciones: true,
    incluirFirma: true,
    periodoReparaciones: 'todas',
    fechaDesde: '',
    fechaHasta: '',
  });

  const handleGeneratePdf = () => {
    generarPdfFichaTecnicaVehicular(movil, reparaciones, opciones, config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Configuración de Ficha Técnica Vehicular PDF</h2>
              <p className="text-xs text-slate-300">
                Móvil {movil.nroMovilInterno} ({movil.dominioPatente})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Secciones a incluir */}
          <div>
            <div className="font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-blue-900" />
              <span>Secciones a incluir en el Documento Oficial</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirIdentificacion}
                  onChange={(e) => setOpciones({ ...opciones, incluirIdentificacion: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>1. Identificación y Estado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirCondicion}
                  onChange={(e) => setOpciones({ ...opciones, incluirCondicion: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>2. Condición General</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirService}
                  onChange={(e) => setOpciones({ ...opciones, incluirService: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>3. Service Preventivo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirRtoYSeguro}
                  onChange={(e) => setOpciones({ ...opciones, incluirRtoYSeguro: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>4. Control RTO y Póliza</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirReparaciones}
                  onChange={(e) => setOpciones({ ...opciones, incluirReparaciones: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>5. Historial Reparaciones</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={opciones.incluirFirma}
                  onChange={(e) => setOpciones({ ...opciones, incluirFirma: e.target.checked })}
                  className="rounded text-blue-900"
                />
                <span>6. Firma de Autoridad</span>
              </label>
            </div>
          </div>

          {/* Regla específica para Reparaciones en PDF */}
          {opciones.incluirReparaciones && (
            <div className="border border-blue-200 bg-blue-50/50 p-4 rounded-xl space-y-3">
              <div className="font-bold text-blue-950 flex items-center justify-between">
                <span>Período de Reparaciones a Incluir</span>
                <Calendar className="w-4 h-4 text-blue-900" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'todas', label: 'Todas (Historial completo)' },
                  { id: 'semanal', label: 'Semanal (Última semana)' },
                  { id: 'mensual', label: 'Mensual (Mes en curso)' },
                  { id: 'anual', label: 'Anual (Año corriente)' },
                  { id: 'rango', label: 'Rango Específico (Desde / Hasta)' },
                ].map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer font-medium transition-all ${
                      opciones.periodoReparaciones === p.id
                        ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="periodoRep"
                      checked={opciones.periodoReparaciones === p.id}
                      onChange={() => setOpciones({ ...opciones, periodoReparaciones: p.id as any })}
                      className="hidden"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>

              {opciones.periodoReparaciones === 'rango' && (
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Desde</label>
                    <input
                      type="date"
                      value={opciones.fechaDesde}
                      onChange={(e) => setOpciones({ ...opciones, fechaDesde: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Hasta</label>
                    <input
                      type="date"
                      value={opciones.fechaHasta}
                      onChange={(e) => setOpciones({ ...opciones, fechaHasta: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleGeneratePdf}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Generar Ficha PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
