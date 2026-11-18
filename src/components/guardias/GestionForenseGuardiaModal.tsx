import React, { useState } from 'react';
import {
  ParteNovedadesGuardia,
  ForenseEnGuardia,
  ConfiguracionSistema,
} from '../../types/police';
import {
  X,
  Stethoscope,
  Plus,
  Trash2,
  CheckCircle2,
  Minus,
} from 'lucide-react';

interface GestionForenseGuardiaModalProps {
  parte: ParteNovedadesGuardia;
  config: ConfiguracionSistema;
  onSave: (updatedParte: ParteNovedadesGuardia) => void;
  onClose: () => void;
}

export const GestionForenseGuardiaModal: React.FC<GestionForenseGuardiaModalProps> = ({
  parte,
  config,
  onSave,
  onClose,
}) => {
  const medicosCatalogo = config.medicosForensesCatalogo || [];

  const [forenses, setForenses] = useState<ForenseEnGuardia[]>(() => {
    if (parte.forensesTurno && parte.forensesTurno.length > 0) {
      return [...parte.forensesTurno];
    }
    if (parte.forense?.medicoNombre && parte.forense.medicoNombre.trim()) {
      return [
        {
          id: 'fg-1',
          medicoNombre: parte.forense.medicoNombre.trim(),
          turno: '',
          horaIngreso: parte.horaInicio || '',
          horaEgreso: parte.horaFin || '',
          totalExaminados: parte.forense.totalExaminados || 0,
          examinadosHastaHs: parte.forense.examinadosHastaHs || '',
        },
      ];
    }
    return [];
  });

  const [nuevoMedico, setNuevoMedico] = useState<string>('');
  const [nuevoExaminados, setNuevoExaminados] = useState<number>(0);
  const [customModeRows, setCustomModeRows] = useState<Record<number, boolean>>({});
  const [customModeNuevo, setCustomModeNuevo] = useState<boolean>(
    medicosCatalogo.length === 0
  );

  const handleUpdate = (index: number, campo: keyof ForenseEnGuardia, valor: any) => {
    setForenses((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  const handleRemove = (index: number) => {
    setForenses((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAdd = () => {
    const nombre = nuevoMedico.trim();
    if (!nombre) return;
    setForenses((prev) => [
      ...prev,
      {
        id: `fg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        medicoNombre: nombre,
        turno: '',
        horaIngreso: parte.horaInicio || '',
        horaEgreso: parte.horaFin || '',
        totalExaminados: Math.max(0, Number(nuevoExaminados) || 0),
        examinadosHastaHs: '',
      },
    ]);
    setNuevoMedico('');
    setNuevoExaminados(0);
    setCustomModeNuevo(medicosCatalogo.length === 0);
  };

  // Si hay un médico escrito/seleccionado pendiente en "Agregar otro forense", incluirlo automáticamente al guardar
  const listaFinalPreview = React.useMemo(() => {
    const cleanList = forenses.filter((f) => f.medicoNombre.trim().length > 0);
    if (nuevoMedico.trim()) {
      return [
        ...cleanList,
        {
          id: `fg-${Date.now()}-pending`,
          medicoNombre: nuevoMedico.trim(),
          turno: '',
          horaIngreso: parte.horaInicio || '',
          horaEgreso: parte.horaFin || '',
          totalExaminados: Math.max(0, Number(nuevoExaminados) || 0),
          examinadosHastaHs: '',
        },
      ];
    }
    return cleanList;
  }, [forenses, nuevoMedico, nuevoExaminados, parte.horaInicio, parte.horaFin]);

  const totalExaminadosGeneral = listaFinalPreview.reduce(
    (acc, f) => acc + (Number(f.totalExaminados) || 0),
    0
  );

  const handleSave = () => {
    const finalList = listaFinalPreview;
    const total = finalList.reduce((acc, f) => acc + (Number(f.totalExaminados) || 0), 0);
    const principal = finalList[0];

    onSave({
      ...parte,
      forensesTurno: finalList,
      forense: principal
        ? {
            medicoNombre:
              finalList.length > 1
                ? finalList.map((f) => f.medicoNombre).join(' / ')
                : principal.medicoNombre,
            totalExaminados: total,
            examinadosHastaHs: principal.examinadosHastaHs || '',
          }
        : {
            medicoNombre: '',
            totalExaminados: 0,
            examinadosHastaHs: '',
          },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-teal-900/80 border border-teal-700/60 rounded-lg shrink-0">
              <Stethoscope className="w-5 h-5 text-teal-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                Forenses de Turno y Examinados
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Guardia: {parte.tipoGuardia || parte.grupoGuardia} ({parte.fechaInicio})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Resumen Total */}
          <div className="bg-teal-50 border border-teal-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-teal-950">
                Total de Examinados en la Guardia
              </p>
              <p className="text-[11px] text-teal-800">
                {listaFinalPreview.length}{' '}
                {listaFinalPreview.length === 1 ? 'forense asignado' : 'forenses asignados'}
              </p>
            </div>
            <div className="text-2xl font-black text-teal-900 font-mono tabular-nums px-3.5 py-1 bg-white border border-teal-300 rounded-lg">
              {totalExaminadosGeneral}
            </div>
          </div>

          {/* Lista de Forenses asignados */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Médicos de Turno Asignados ({forenses.length})
            </h3>

            {forenses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500">
                No hay médicos forenses cargados todavía en esta guardia. Agregue uno abajo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {forenses.map((f, idx) => {
                  const isInCatalog = medicosCatalogo.includes(f.medicoNombre);
                  const showCustomInput =
                    customModeRows[idx] ||
                    medicosCatalogo.length === 0 ||
                    (f.medicoNombre.trim() !== '' && !isInCatalog);

                  return (
                    <div
                      key={f.id || idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-teal-900 text-xs">
                          Médico de Turno #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Quitar forense de la guardia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-7 space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Médico de Turno
                          </label>
                          {medicosCatalogo.length > 0 && (
                            <select
                              value={showCustomInput ? '__CUSTOM__' : f.medicoNombre}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__CUSTOM__') {
                                  setCustomModeRows((prev) => ({ ...prev, [idx]: true }));
                                  if (isInCatalog) handleUpdate(idx, 'medicoNombre', '');
                                } else {
                                  setCustomModeRows((prev) => ({ ...prev, [idx]: false }));
                                  handleUpdate(idx, 'medicoNombre', val);
                                }
                              }}
                              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                            >
                              <option value="">-- Seleccionar Médico de Turno --</option>
                              {medicosCatalogo.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                              <option value="__CUSTOM__">Otro médico (escribir nombre)...</option>
                            </select>
                          )}

                          {showCustomInput && (
                            <input
                              type="text"
                              value={f.medicoNombre}
                              onChange={(e) => handleUpdate(idx, 'medicoNombre', e.target.value)}
                              placeholder="Nombre del Médico de Turno..."
                              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-medium text-slate-900"
                            />
                          )}
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                            Cantidad Examinados
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdate(
                                  idx,
                                  'totalExaminados',
                                  Math.max(0, (Number(f.totalExaminados) || 0) - 1)
                                )
                              }
                              className="p-2 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 cursor-pointer"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={f.totalExaminados}
                              onChange={(e) =>
                                handleUpdate(
                                  idx,
                                  'totalExaminados',
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                )
                              }
                              className="w-full px-2.5 py-1.5 border border-teal-400 bg-teal-50/40 rounded-lg font-bold font-mono tabular-nums text-teal-950 text-center text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdate(
                                  idx,
                                  'totalExaminados',
                                  (Number(f.totalExaminados) || 0) + 1
                                )
                              }
                              className="p-2 border border-teal-300 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-900 cursor-pointer"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agregar Otro Forense */}
          <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/40 space-y-3">
            <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>Agregar Otro Forense</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-6 space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Médico de Turno
                </label>
                {medicosCatalogo.length > 0 && (
                  <select
                    value={customModeNuevo ? '__CUSTOM__' : nuevoMedico}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setCustomModeNuevo(true);
                        setNuevoMedico('');
                      } else {
                        setCustomModeNuevo(false);
                        setNuevoMedico(val);
                      }
                    }}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    <option value="">-- Seleccionar Médico --</option>
                    {medicosCatalogo.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__CUSTOM__">Otro médico (escribir nombre)...</option>
                  </select>
                )}

                {customModeNuevo && (
                  <input
                    type="text"
                    value={nuevoMedico}
                    onChange={(e) => setNuevoMedico(e.target.value)}
                    placeholder="Nombre del Médico de Turno..."
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cant. Examinados
                </label>
                <input
                  type="number"
                  min="0"
                  value={nuevoExaminados}
                  onChange={(e) =>
                    setNuevoExaminados(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-bold font-mono tabular-nums text-center text-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!nuevoMedico.trim()}
                  className="w-full px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
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
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Forenses</span>
          </button>
        </div>
      </div>
    </div>
  );
};
