import React, { useState } from 'react';
import { ParteNovedadesGuardia, ForenseEnGuardia, ConfiguracionSistema } from '../../types/police';
import { X, Stethoscope, Plus, Trash2, CheckCircle2, Clock, UserCheck } from 'lucide-react';

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
  const [forenses, setForenses] = useState<ForenseEnGuardia[]>(() => {
    if (parte.forensesTurno && parte.forensesTurno.length > 0) {
      return [...parte.forensesTurno];
    }
    return [
      {
        id: 'fg-1',
        medicoNombre: parte.forense?.medicoNombre || (config.medicosForensesCatalogo?.[0] || 'Dr. Guillermo Navarro'),
        turno: 'Guardia Principal',
        horaIngreso: parte.horaInicio || '08:00',
        horaEgreso: parte.horaFin || '20:00',
        totalExaminados: parte.forense?.totalExaminados || 0,
        examinadosHastaHs: parte.forense?.examinadosHastaHs || '20:00 hs.',
      },
    ];
  });

  const [nuevoForense, setNuevoForense] = useState<ForenseEnGuardia>({
    id: '',
    medicoNombre: config.medicosForensesCatalogo?.[0] || '',
    turno: 'Relevo Guardia',
    horaIngreso: '14:00',
    horaEgreso: '20:00',
    totalExaminados: 0,
    examinadosHastaHs: '19:30 hs.',
  });

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
    if (!nuevoForense.medicoNombre.trim()) return;
    setForenses((prev) => [
      ...prev,
      {
        ...nuevoForense,
        id: 'fg-' + Date.now(),
      },
    ]);
    setNuevoForense({
      id: '',
      medicoNombre: config.medicosForensesCatalogo?.[0] || '',
      turno: 'Relevo Guardia',
      horaIngreso: '20:00',
      horaEgreso: '08:00',
      totalExaminados: 0,
      examinadosHastaHs: '07:30 hs.',
    });
  };

  const totalExaminadosGeneral = forenses.reduce((acc, f) => acc + (Number(f.totalExaminados) || 0), 0);

  const handleSave = () => {
    const principal = forenses[0] || {
      medicoNombre: 'Sin médico asignado',
      totalExaminados: 0,
      examinadosHastaHs: 'S/D',
    };

    onSave({
      ...parte,
      forensesTurno: forenses,
      forense: {
        medicoNombre: principal.medicoNombre,
        totalExaminados: totalExaminadosGeneral,
        examinadosHastaHs: principal.examinadosHastaHs || `${principal.horaEgreso || '20:00'} hs.`,
      },
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-teal-900 via-blue-900 to-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Stethoscope className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Forense de Turno y Relevos de Guardia
              </h2>
              <p className="text-xs text-teal-200">
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
          {/* Banner total examinados */}
          <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-teal-950 uppercase">
                Total de Personas Examinadas en Esta Guardia
              </p>
              <p className="text-[11px] text-teal-700">
                Suma consolidada de todos los médicos legistas y relevos de turno
              </p>
            </div>
            <div className="text-2xl font-black text-teal-900 font-mono px-3 py-1 bg-white border border-teal-300 rounded-lg shadow-2xs">
              {totalExaminadosGeneral}
            </div>
          </div>

          {/* Lista de Forenses */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs tracking-wide">
              MÉDICOS FORENSES REGISTRADOS ({forenses.length})
            </h3>

            <div className="space-y-3">
              {forenses.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="font-bold text-blue-900 text-xs">
                      #{idx + 1} Médico Legista / Forense
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar médico de la guardia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Nombre del Médico Legista / Forense:
                      </label>
                      <input
                        type="text"
                        list="medicos-cat-list"
                        value={f.medicoNombre}
                        onChange={(e) => handleUpdate(idx, 'medicoNombre', e.target.value)}
                        placeholder="Dr. Nombre y Apellido..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Turno / Relevo:
                      </label>
                      <input
                        type="text"
                        value={f.turno}
                        onChange={(e) => handleUpdate(idx, 'turno', e.target.value)}
                        placeholder="Ej. Guardia Noche, Relevo 1"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Cant. Examinados:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={f.totalExaminados}
                        onChange={(e) => handleUpdate(idx, 'totalExaminados', parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 border border-teal-400 bg-teal-50/50 rounded-lg font-bold text-teal-900 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Hora Ingreso:
                      </label>
                      <input
                        type="time"
                        value={f.horaIngreso || '08:00'}
                        onChange={(e) => handleUpdate(idx, 'horaIngreso', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Hora Egreso:
                      </label>
                      <input
                        type="time"
                        value={f.horaEgreso || '20:00'}
                        onChange={(e) => handleUpdate(idx, 'horaEgreso', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Corte / Examinados hasta Hs.:
                      </label>
                      <input
                        type="text"
                        value={f.examinadosHastaHs}
                        onChange={(e) => handleUpdate(idx, 'examinadosHastaHs', e.target.value)}
                        placeholder="Ej. 19:30 hs."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Catálogo de Médicos Forenses datalist */}
            <datalist id="medicos-cat-list">
              {(config.medicosForensesCatalogo || []).map((m, i) => (
                <option key={i} value={m} />
              ))}
            </datalist>
          </div>

          {/* Formulario Agregar Relevo */}
          <div className="border border-slate-300 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>Agregar Relevo / Médico Adicional a Esta Guardia</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Médico Forense (del catálogo o nuevo):
                </label>
                <input
                  type="text"
                  list="medicos-cat-list"
                  value={nuevoForense.medicoNombre}
                  onChange={(e) => setNuevoForense({ ...nuevoForense, medicoNombre: e.target.value })}
                  placeholder="Seleccionar o escribir nombre..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Turno:
                </label>
                <input
                  type="text"
                  value={nuevoForense.turno}
                  onChange={(e) => setNuevoForense({ ...nuevoForense, turno: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Horario Ingreso:
                </label>
                <input
                  type="time"
                  value={nuevoForense.horaIngreso}
                  onChange={(e) => setNuevoForense({ ...nuevoForense, horaIngreso: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Horario Egreso:
                </label>
                <input
                  type="time"
                  value={nuevoForense.horaEgreso || ''}
                  onChange={(e) => setNuevoForense({ ...nuevoForense, horaEgreso: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!nuevoForense.medicoNombre.trim()}
                  className="w-full px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Relevo</span>
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
            className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Forenses de Guardia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
