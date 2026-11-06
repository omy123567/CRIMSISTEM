import React, { useState } from 'react';
import { ParteNovedadesGuardia, MovilAfectadoGuardia, MovilPolicial } from '../../types/police';
import { X, Car, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GestionMovilesGuardiaModalProps {
  parte: ParteNovedadesGuardia;
  movilesList: MovilPolicial[];
  onSave: (updatedParte: ParteNovedadesGuardia) => void;
  onClose: () => void;
}

export const GestionMovilesGuardiaModal: React.FC<GestionMovilesGuardiaModalProps> = ({
  parte,
  movilesList,
  onSave,
  onClose,
}) => {
  const [moviles, setMoviles] = useState<MovilAfectadoGuardia[]>(() => {
    return [...parte.movilesAfectados];
  });

  const [selectedMovilId, setSelectedMovilId] = useState('');
  const [customDescripcion, setCustomDescripcion] = useState('');
  const [estadoMovil, setEstadoMovil] = useState<'En servicio' | 'Fuera de servicio'>('En servicio');

  const handleRemove = (id: string) => {
    setMoviles((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleEstado = (id: string) => {
    setMoviles((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              estado: m.estado === 'En servicio' ? 'Fuera de servicio' : 'En servicio',
            }
          : m
      )
    );
  };

  const handleAddFromFleet = () => {
    if (!selectedMovilId && !customDescripcion.trim()) return;

    if (selectedMovilId) {
      const fleetItem = movilesList.find((m) => m.id === selectedMovilId);
      if (!fleetItem) return;

      const desc = `${fleetItem.nroMovilInterno} ${fleetItem.marca} ${fleetItem.modelo} (${fleetItem.dominioPatente})`;
      setMoviles((prev) => [
        ...prev,
        {
          id: 'ma-' + Date.now(),
          movilId: fleetItem.id,
          descripcion: desc,
          estado: estadoMovil,
        },
      ]);
      setSelectedMovilId('');
    } else {
      setMoviles((prev) => [
        ...prev,
        {
          id: 'ma-' + Date.now(),
          descripcion: customDescripcion.trim(),
          estado: estadoMovil,
        },
      ]);
      setCustomDescripcion('');
    }
  };

  const handleSave = () => {
    onSave({
      ...parte,
      movilesAfectados: moviles,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Car className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Móviles Policiales Afectados a la Guardia
              </h2>
              <p className="text-xs text-blue-200">
                Guardia: {parte.tipoGuardia || parte.grupoGuardia} ({parte.fechaInicio} - {parte.fechaFin})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Lista de Móviles Actuales */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs tracking-wide">
              PARQUE AUTOMOTOR AFECTADO ({moviles.length} ASIGNADOS)
            </h3>

            {moviles.length === 0 ? (
              <p className="text-slate-400 italic py-3 text-center">
                No hay unidades móviles asignadas a este turno de guardia.
              </p>
            ) : (
              <div className="space-y-2">
                {moviles.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Car className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate">
                        {m.descripcion}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleEstado(m.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                          m.estado === 'En servicio'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {m.estado}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Quitar de la guardia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar Nuevo Móvil (Desde catálogo del parque automotor o libre) */}
          <div className="border border-slate-300 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs">
              + Agregar Móvil desde el Parque Automotor
            </h4>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Seleccionar del Parque Automotor:
                </label>
                <select
                  value={selectedMovilId}
                  onChange={(e) => {
                    setSelectedMovilId(e.target.value);
                    if (e.target.value) setCustomDescripcion('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-medium"
                >
                  <option value="">-- Seleccionar móvil registrado --</option>
                  {movilesList.map((mv) => (
                    <option key={mv.id} value={mv.id}>
                      {mv.nroMovilInterno} - {mv.marca} {mv.modelo} ({mv.dominioPatente}) [{mv.estadoOperativo}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  O ingresar descripción manual / móvil de apoyo:
                </label>
                <input
                  type="text"
                  value={customDescripcion}
                  onChange={(e) => {
                    setCustomDescripcion(e.target.value);
                    if (e.target.value) setSelectedMovilId('');
                  }}
                  placeholder="Ej. Móvil 402 Toyota Hilux (AB 345 CD) - Jurisdicción 5ta"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold">Estado:</span>
                  <select
                    value={estadoMovil}
                    onChange={(e) => setEstadoMovil(e.target.value as any)}
                    className="px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-800"
                  >
                    <option value="En servicio">En servicio</option>
                    <option value="Fuera de servicio">Fuera de servicio</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddFromFleet}
                  disabled={!selectedMovilId && !customDescripcion.trim()}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Asignar Móvil</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Móviles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
