import React, { useState } from 'react';
import { CasoFaltaOficio, ConfiguracionSistema, PersonaVinculada } from '../../types/police';
import { X, ShieldAlert, UserPlus, Trash2, CheckCircle2 } from 'lucide-react';

interface FaltaOficioModalProps {
  caso?: CasoFaltaOficio | null;
  config: ConfiguracionSistema;
  onSave: (caso: CasoFaltaOficio) => void;
  onClose: () => void;
}

export const FaltaOficioModal: React.FC<FaltaOficioModalProps> = ({
  caso,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(caso);

  const [formData, setFormData] = useState<CasoFaltaOficio>(() => {
    if (caso) return { ...caso };
    return {
      id: 'cfo-' + Date.now(),
      fechaRegistro: new Date().toISOString().slice(0, 10),
      origenIntervencion: 'Urgencia dispuesta vía telefónica / radial',
      dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      tipoRequerimiento: 'Resguardo de Evidencia',
      tareaRealizada: '',
      personasVinculadas: [],
      resumen: '',
      observaciones: '',
      estado: 'Pendiente',
      createdAt: new Date().toISOString(),
    };
  });

  const [nuevaPersona, setNuevaPersona] = useState({ apellidoYNombre: '', dni: '' });

  const handleAddPersona = () => {
    if (!nuevaPersona.apellidoYNombre.trim() || !nuevaPersona.dni.trim()) {
      alert('Ingrese Apellido y Nombre y DNI de la persona');
      return;
    }
    const p: PersonaVinculada = {
      id: 'pv-' + Date.now(),
      apellidoYNombre: nuevaPersona.apellidoYNombre.trim(),
      dni: nuevaPersona.dni.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      personasVinculadas: [...(prev.personasVinculadas || []), p],
    }));
    setNuevaPersona({ apellidoYNombre: '', dni: '' });
  };

  const handleRemovePersona = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      personasVinculadas: (prev.personasVinculadas || []).filter((p) => p.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tareaRealizada.trim()) {
      alert('Describa la tarea operativa o requerimiento de urgencia');
      return;
    }
    if (formData.involucraPersonalPolicial) {
      if (
        !formData.personalPolicial?.apellidoYNombre?.trim() ||
        !formData.personalPolicial?.plaza?.trim() ||
        !formData.personalPolicial?.jerarquia?.trim()
      ) {
        alert(
          'Al indicar que el caso involucra Personal Policial, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-800/80 rounded-lg text-red-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? 'Editar Caso Falta de Oficio' : 'Nuevo Requerimiento sin Oficio Formal (Falta de Oficio)'}
              </h2>
              <p className="text-xs text-slate-300">
                Intervención de urgencia previa al ingreso formal del expediente judicial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha de Intervención</label>
              <input
                type="date"
                required
                value={formData.fechaRegistro}
                onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dependencia Solicitante</label>
              <select
                value={formData.dependenciaSolicitante}
                onChange={(e) => setFormData({ ...formData, dependenciaSolicitante: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {config.dependenciasPoliciales.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Origen del Requerimiento Urgente *
            </label>
            <input
              type="text"
              required
              value={formData.origenIntervencion}
              onChange={(e) => setFormData({ ...formData, origenIntervencion: e.target.value })}
              placeholder="Ej. Fiscal de turno vía telefónica / Personal de Comisaría en guardia"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Requerimiento</label>
            <select
              value={formData.tipoRequerimiento}
              onChange={(e) => setFormData({ ...formData, tipoRequerimiento: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              {config.tiposRequerimiento.map((tr) => (
                <option key={tr} value={tr}>
                  {tr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tarea Realizada en Urgencia *
            </label>
            <textarea
              rows={2}
              required
              value={formData.tareaRealizada}
              onChange={(e) => setFormData({ ...formData, tareaRealizada: e.target.value })}
              placeholder="Ej. Resguardo preventivo de filmaciones de cámaras, descarga forense inmediata antes de borrado..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Resumen / Observaciones</label>
            <textarea
              rows={2}
              value={formData.resumen}
              onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
              placeholder="Detalles complementarios del procedimiento..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* HECHO / CAUSA CON PERSONAL POLICIAL */}
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
              <input
                type="checkbox"
                checked={formData.involucraPersonalPolicial || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    involucraPersonalPolicial: checked,
                    personalPolicial: checked
                      ? formData.personalPolicial || {
                          jerarquia: config.jerarquias[0] || 'Oficial Subinspector',
                          plaza: '',
                          apellidoYNombre: '',
                          rol: 'Imputado',
                          dependenciaRevista: '',
                        }
                      : undefined,
                  });
                }}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="flex items-center gap-1.5 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>¿Es una causa con Personal Policial involucrado?</span>
              </span>
            </label>

            {formData.involucraPersonalPolicial && (
              <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jerarquía *</label>
                    <select
                      value={formData.personalPolicial?.jerarquia || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            jerarquia: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                    >
                      {config.jerarquias.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Plaza N° *</label>
                    <input
                      type="text"
                      required={formData.involucraPersonalPolicial}
                      value={formData.personalPolicial?.plaza || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            plaza: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. 1420"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Apellido y Nombre *</label>
                    <input
                      type="text"
                      required={formData.involucraPersonalPolicial}
                      value={formData.personalPolicial?.apellidoYNombre || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            apellidoYNombre: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. Gómez, Ramón Eduardo"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Condición / Rol en el Hecho</label>
                    <input
                      type="text"
                      list="lista-condiciones-falta"
                      value={formData.personalPolicial?.rol || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            rol: e.target.value,
                          },
                        })
                      }
                      placeholder="Seleccione o escriba condición..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                    <datalist id="lista-condiciones-falta">
                      <option value="Imputado" />
                      <option value="Damnificado / Víctima" />
                      <option value="Aprehendido / Demorado" />
                      <option value="Conductor Siniestro" />
                      <option value="Acompañante" />
                      <option value="Testigo" />
                      <option value="Denunciante" />
                      <option value="Involucrado" />
                      <option value="Sumariado Administrativo" />
                      <option value="Franco de Servicio" />
                      <option value="En Acto de Servicio" />
                      <option value="Personal en Disponibilidad / Pasiva" />
                      <option value="Personal Retirado" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dependencia de Revista</label>
                    <input
                      type="text"
                      value={formData.personalPolicial?.dependenciaRevista || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            dependenciaRevista: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. Comisaría Laguna Blanca"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Modal */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-red-800 hover:bg-red-900 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Caso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
