import React, { useState } from 'react';
import { SerieNumerario, FolioAsignado } from '../../types/police';
import {
  X,
  FileText,
  Calendar,
  Clock,
  Building,
  User,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface DetalleFolioModalProps {
  folio: FolioAsignado | null;
  serie?: SerieNumerario | null;
  onUpdate: (updated: FolioAsignado) => Promise<void> | void;
  onLiberar: (folio: FolioAsignado, liberarRangoCompleto?: boolean) => Promise<void> | void;
  onClose: () => void;
}

export const DetalleFolioModal: React.FC<DetalleFolioModalProps> = ({
  folio,
  serie,
  onUpdate,
  onLiberar,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [asunto, setAsunto] = useState(folio?.asunto || '');
  const [destinatario, setDestinatario] = useState(folio?.destinatario || '');
  const [solicitante, setSolicitante] = useState(folio?.solicitante || '');
  const [observaciones, setObservaciones] = useState(folio?.observaciones || '');
  const [categoria, setCategoria] = useState(folio?.categoriaDocumento || 'Oficio Judicial');
  const [isConfirmLiberarOpen, setIsConfirmLiberarOpen] = useState(false);
  const [liberarRango, setLiberarRango] = useState(false);

  if (!folio) return null;

  const handleSaveEdit = async () => {
    if (!asunto.trim()) {
      alert('El asunto no puede quedar vacío');
      return;
    }
    await onUpdate({
      ...folio,
      asunto: asunto.trim(),
      destinatario: destinatario.trim(),
      solicitante: solicitante.trim(),
      observaciones: observaciones.trim(),
      categoriaDocumento: categoria,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleConfirmLiberar = async () => {
    await onLiberar(folio, liberarRango);
    setIsConfirmLiberarOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 text-red-200 flex items-center justify-center font-mono font-bold text-lg">
              #{folio.numero}
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Ficha del Folio #{folio.numero}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800">
                  OCUPADO / ASIGNADO
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {folio.codigoCaratula} {serie ? `• ${serie.nombre}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Tarjeta de Código Oficial */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Carátula / Código de Trámite:
              </span>
              <span className="text-base font-bold font-mono text-blue-300">
                {folio.codigoCaratula}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Fecha Asignación:
              </span>
              <span className="text-xs font-semibold text-slate-200 flex items-center justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {folio.fechaAsignacion} {folio.horaAsignacion ? `(${folio.horaAsignacion} hs)` : ''}
              </span>
            </div>
          </div>

          {folio.esRango && folio.rangoDesde && folio.rangoHasta && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-purple-900 font-medium">
              <Layers className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                Este folio fue asignado como parte de un <strong>bloque por rango continuo</strong> (del #{folio.rangoDesde} al #{folio.rangoHasta}).
              </span>
            </div>
          )}

          {!isEditing ? (
            /* Vista de Lectura */
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Categoría / Tipo de Trámite
                  </span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-700" />
                    {folio.categoriaDocumento}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Destinatario / Organismo
                  </span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-700" />
                    {folio.destinatario || 'Sin especificar'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Solicitante / Iniciador
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  {folio.solicitante || 'Sin especificar'}
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-900 uppercase block mb-1">
                  Asunto / Objeto del Trámite
                </span>
                <p className="font-medium text-slate-900 text-xs whitespace-pre-wrap leading-relaxed">
                  {folio.asunto}
                </p>
              </div>

              {folio.observaciones && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Observaciones / Notas
                  </span>
                  <p className="text-slate-700 text-xs italic">{folio.observaciones}</p>
                </div>
              )}
            </div>
          ) : (
            /* Modo Edición */
            <div className="space-y-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs"
                >
                  <option value="Oficio Judicial">Oficio Judicial</option>
                  <option value="Oficio Vicedirección">Oficio Vicedirección</option>
                  <option value="Memorándum">Memorándum</option>
                  <option value="Expediente Pericial">Expediente Pericial</option>
                  <option value="Nota Interna">Nota Interna</option>
                  <option value="Circular General">Circular General</option>
                  <option value="Dictamen Pericial">Dictamen Pericial</option>
                  <option value="Causa Penal">Causa Penal</option>
                  <option value="Otro">Otro Trámite</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destinatario / Organismo</label>
                <input
                  type="text"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Solicitante</label>
                <input
                  type="text"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Asunto / Objeto *</label>
                <textarea
                  rows={3}
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>
          )}

          {/* Botonera de acciones */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmLiberarOpen(true)}
              className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Liberar Folio #{folio.numero}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Modificar Datos</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Cerrar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmar Liberación */}
      <ConfirmModal
        isOpen={isConfirmLiberarOpen}
        title={`¿Liberar Folio #${folio.numero}?`}
        message={
          folio.esRango && folio.rangoDesde && folio.rangoHasta
            ? `Este folio pertenece a un bloque del #${folio.rangoDesde} al #${folio.rangoHasta}. Al liberarlo, volverá a estar disponible (en blanco) para una nueva asignación.`
            : `El folio #${folio.numero} (${folio.codigoCaratula}) volverá a estar en estado DISPONIBLE (libre) en la cuadrícula numérica de la serie.`
        }
        confirmText="Sí, liberar folio"
        isDestructive={true}
        onConfirm={handleConfirmLiberar}
        onCancel={() => setIsConfirmLiberarOpen(false)}
      />
    </div>
  );
};
