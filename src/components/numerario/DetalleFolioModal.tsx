import React, { useState, useEffect } from 'react';
import { SerieNumerario, FolioAsignado, MemoNota } from '../../types/police';
import {
  X,
  Calendar,
  Building,
  User,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatCodigoFolioConAnio } from '../../utils/memosCatalogUtils';

interface DetalleFolioModalProps {
  folio: FolioAsignado | null;
  serie?: SerieNumerario | null;
  linkedMemo?: MemoNota | null;
  canChangeFolioNumber?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  existingFolios?: FolioAsignado[];
  onUpdate: (updated: FolioAsignado) => Promise<void> | void;
  onLiberar: (folio: FolioAsignado, liberarRangoCompleto?: boolean) => Promise<void> | void;
  onClose: () => void;
}

export const DetalleFolioModal: React.FC<DetalleFolioModalProps> = ({
  folio,
  serie,
  linkedMemo,
  canChangeFolioNumber = false,
  canEdit = true,
  canDelete = true,
  existingFolios = [],
  onUpdate,
  onLiberar,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [numeroFolio, setNumeroFolio] = useState<number>(folio?.numero || 1);
  const [asunto, setAsunto] = useState(folio?.asunto || '');
  const [destinatario, setDestinatario] = useState(folio?.destinatario || '');
  const [solicitante, setSolicitante] = useState(folio?.solicitante || '');
  const [observaciones, setObservaciones] = useState(folio?.observaciones || '');
  const [categoria, setCategoria] = useState(
    folio?.categoriaDocumento || serie?.nombre || 'Memorandum'
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmLiberarOpen, setIsConfirmLiberarOpen] = useState(false);
  const [liberarRango, setLiberarRango] = useState(false);

  useEffect(() => {
    if (!folio) return;
    setNumeroFolio(folio.numero);
    setAsunto(folio.asunto || '');
    setDestinatario(folio.destinatario || '');
    setSolicitante(folio.solicitante || '');
    setObservaciones(folio.observaciones || '');
    setCategoria(folio.categoriaDocumento || serie?.nombre || 'Memorandum');
    setFormError(null);
    setIsEditing(false);
  }, [folio?.id, folio?.numero, serie?.nombre]);

  if (!folio) return null;

  const handleSaveEdit = async () => {
    setFormError(null);
    if (!asunto.trim()) {
      setFormError('El asunto no puede quedar vacío.');
      return;
    }

    let nextNumero = folio.numero;
    let nextCodigoCaratula = folio.codigoCaratula;
    let nextCaratulaPersonalizada = folio.caratulaPersonalizada;

    if (canChangeFolioNumber && !folio.esRango && numeroFolio !== folio.numero) {
      if (!Number.isInteger(numeroFolio) || numeroFolio < 1) {
        setFormError('El número de folio debe ser un entero positivo mayor o igual a 1.');
        return;
      }
      const conflict = existingFolios.find(
        (f) =>
          f.id !== folio.id &&
          f.serieId === folio.serieId &&
          (!f.anio || !folio.anio || f.anio === folio.anio) &&
          f.numero === numeroFolio
      );
      if (conflict) {
        setFormError(
          `El Folio #${numeroFolio} ya se encuentra ocupado en esta serie (${conflict.codigoCaratula}).`
        );
        return;
      }
      nextNumero = numeroFolio;
      const targetAnio = folio.anio || serie?.anio || new Date().getFullYear();
      nextCodigoCaratula = formatCodigoFolioConAnio(
        serie?.prefijo || `${categoria || 'Folio'} N°`,
        nextNumero,
        targetAnio
      );
      if (folio.caratulaPersonalizada && folio.caratulaPersonalizada === folio.codigoCaratula) {
        nextCaratulaPersonalizada = nextCodigoCaratula;
      }
    }

    await onUpdate({
      ...folio,
      numero: nextNumero,
      codigoCaratula: nextCodigoCaratula,
      caratulaPersonalizada: nextCaratulaPersonalizada,
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

          {linkedMemo && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1 text-sky-950">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 text-sky-900">
                  <BookmarkCheck className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>Documento Vinculado en Memos y Notas</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-sky-200 text-[10px] font-bold text-sky-800">
                  {linkedMemo.estado}
                </span>
              </div>
              <div className="text-[11px] font-mono font-bold text-sky-900">
                {linkedMemo.tipo} · {linkedMemo.nroFolioMemo}
              </div>
              <div className="text-[11px] text-slate-700">
                <strong>Asunto:</strong> {linkedMemo.asunto}
                {linkedMemo.destino ? ` · Destino: ${linkedMemo.destino}` : ''}
              </div>
              {linkedMemo.archivoNombre && (
                <div className="text-[10px] text-emerald-700 font-semibold">
                  Anexo adjunto: {linkedMemo.archivoNombre}
                </div>
              )}
            </div>
          )}

          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
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
              {canChangeFolioNumber && !folio.esRango && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <label className="block font-bold text-blue-950 mb-1">
                    Número de Orden del Folio (Exclusivo Jefe)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(serie?.limiteFolios || 1000, 10000)}
                      value={numeroFolio}
                      onChange={(e) => setNumeroFolio(parseInt(e.target.value, 10) || 1)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-blue-300 bg-white font-mono font-bold text-xs text-blue-950"
                    />
                    <span className="text-[11px] font-mono text-blue-800">
                      Vista previa:{' '}
                      <strong>
                        {formatCodigoFolioConAnio(
                          serie?.prefijo || `${categoria || 'Folio'} N°`,
                          numeroFolio,
                          folio.anio || serie?.anio || new Date().getFullYear()
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs"
                >
                  <option value="Memorandum">Memorandum</option>
                  <option value="Nota V">Nota V</option>
                  <option value="Oficio J">Oficio J</option>
                  <option value="Oficio V">Oficio V</option>
                  <option value="Memorandum R">Memorandum R</option>
                  <option value="Radiograma">Radiograma</option>
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
            {canDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmLiberarOpen(true)}
                className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Liberar Folio #{folio.numero}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isEditing ? (
                <>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Modificar Datos</span>
                    </button>
                  )}
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
