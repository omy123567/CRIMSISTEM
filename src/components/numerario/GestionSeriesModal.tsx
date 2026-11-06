import React, { useState } from 'react';
import { SerieNumerario } from '../../types/police';
import { X, Plus, Layers, Edit2, Trash2, CheckCircle2, Palette } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface GestionSeriesModalProps {
  isOpen: boolean;
  seriesList: SerieNumerario[];
  activeSerieId: string;
  onSaveSerie: (serie: SerieNumerario) => Promise<void> | void;
  onDeleteSerie: (id: string) => Promise<void> | void;
  onSelectSerie: (id: string) => void;
  onClose: () => void;
}

const COLORES_DISPONIBLES = [
  { id: 'blue', label: 'Azul Institucional', class: 'bg-blue-600' },
  { id: 'indigo', label: 'Índigo Operativo', class: 'bg-indigo-600' },
  { id: 'emerald', label: 'Verde Esmeralda', class: 'bg-emerald-600' },
  { id: 'amber', label: 'Ámbar / Prevención', class: 'bg-amber-600' },
  { id: 'purple', label: 'Púrpura Judicial', class: 'bg-purple-600' },
  { id: 'rose', label: 'Rosa / Especial', class: 'bg-rose-600' },
  { id: 'cyan', label: 'Cian Técnico', class: 'bg-cyan-600' },
  { id: 'slate', label: 'Pizarra Neutro', class: 'bg-slate-600' },
];

export const GestionSeriesModal: React.FC<GestionSeriesModalProps> = ({
  isOpen,
  seriesList,
  activeSerieId,
  onSaveSerie,
  onDeleteSerie,
  onSelectSerie,
  onClose,
}) => {
  const [editingSerie, setEditingSerie] = useState<SerieNumerario | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [nombre, setNombre] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [limiteFolios, setLimiteFolios] = useState(1000);
  const [color, setColor] = useState('blue');
  const [descripcion, setDescripcion] = useState('');
  const [serieToDelete, setSerieToDelete] = useState<SerieNumerario | null>(null);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setIsNew(true);
    setEditingSerie(null);
    setNombre('');
    setPrefijo('Oficio N°');
    setAnio(new Date().getFullYear());
    setLimiteFolios(1000);
    setColor('blue');
    setDescripcion('');
  };

  const handleOpenEdit = (s: SerieNumerario) => {
    setIsNew(false);
    setEditingSerie(s);
    setNombre(s.nombre);
    setPrefijo(s.prefijo);
    setAnio(s.anio || new Date().getFullYear());
    setLimiteFolios(s.limiteFolios || 1000);
    setColor(s.color || 'blue');
    setDescripcion(s.descripcion || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ingrese un nombre para la serie');
      return;
    }

    const entity: SerieNumerario = {
      id: editingSerie ? editingSerie.id : `serie-${Date.now()}`,
      nombre: nombre.trim(),
      prefijo: prefijo.trim() || 'Oficio N°',
      anio: anio || 2026,
      limiteFolios: limiteFolios || 1000,
      columnas: 20,
      color: color || 'blue',
      descripcion: descripcion.trim(),
      delegacionId: editingSerie?.delegacionId,
      createdAt: editingSerie?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveSerie(entity);
    setIsNew(false);
    setEditingSerie(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Administrar Series de Numerario</h2>
              <p className="text-xs text-slate-400">Cuadernos de foliación independientes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {!isNew && !editingSerie ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Series Registradas ({seriesList.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenNew}
                  className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Serie</span>
                </button>
              </div>

              <div className="space-y-2">
                {seriesList.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                      s.id === activeSerieId
                        ? 'border-blue-400 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-sm">{s.nombre}</span>
                        {s.id === activeSerieId && (
                          <span className="text-[10px] bg-blue-900 text-white px-2 py-0.5 rounded-full font-bold">
                            Activa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Prefijo: <strong>{s.prefijo}</strong> • Límite: <strong>{s.limiteFolios || 1000} folios</strong> (20 cols) • Año: <strong>{s.anio}</strong>
                      </p>
                      {s.descripcion && (
                        <p className="text-[11px] text-slate-600 italic">{s.descripcion}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {s.id !== activeSerieId && (
                        <button
                          type="button"
                          onClick={() => onSelectSerie(s.id)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Seleccionar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Editar configuración de serie"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {seriesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSerieToDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Eliminar serie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Formulario Crear / Editar Serie */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">
                  {isNew ? 'Registrar Nueva Serie de Numerario' : `Editar Serie: ${editingSerie?.nombre}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditingSerie(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Volver al listado
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre de la Serie *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Oficio Jefatura, Memorándums, etc."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prefijo Oficial *</label>
                  <input
                    type="text"
                    required
                    value={prefijo}
                    onChange={(e) => setPrefijo(e.target.value)}
                    placeholder="Ej. Oficio J N°, Mem. N°, Exp. N°"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Año Oficial *</label>
                  <input
                    type="number"
                    required
                    min={2020}
                    max={2035}
                    value={anio}
                    onChange={(e) => setAnio(parseInt(e.target.value, 10) || 2026)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Límite de Folios *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    max={10000}
                    value={limiteFolios}
                    onChange={(e) => setLimiteFolios(parseInt(e.target.value, 10) || 1000)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Columnas</label>
                  <input
                    type="number"
                    disabled
                    value={20}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-500"
                    title="Exactamente 20 columnas continuas (C1 a C20)"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-700" />
                  <span>Color Distintivo de la Pestaña</span>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLORES_DISPONIBLES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        color === c.id
                          ? 'border-slate-800 bg-slate-100 ring-2 ring-blue-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.class}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción / Finalidad</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Finalidad del numerario (ej. comunicaciones judiciales directas)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditingSerie(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Serie</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal Confirmar Eliminación de Serie */}
      <ConfirmModal
        isOpen={!!serieToDelete}
        title={`¿Eliminar Serie "${serieToDelete?.nombre}"?`}
        message={`Esta acción eliminará la serie "${serieToDelete?.nombre}". Se recomienda haber descargado el libro de folios en Excel previamente. ¿Desea continuar?`}
        confirmText="Sí, eliminar serie"
        isDestructive={true}
        onConfirm={async () => {
          if (serieToDelete) {
            await onDeleteSerie(serieToDelete.id);
            setSerieToDelete(null);
          }
        }}
        onCancel={() => setSerieToDelete(null)}
      />
    </div>
  );
};
