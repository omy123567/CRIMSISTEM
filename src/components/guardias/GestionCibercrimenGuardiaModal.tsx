import React, { useState } from 'react';
import {
  ParteNovedadesGuardia,
  RegistroCibercrimenGuardia,
  Personal,
  ConfiguracionSistema,
} from '../../types/police';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  UserCheck,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface GestionCibercrimenGuardiaModalProps {
  parte: ParteNovedadesGuardia;
  personalList: Personal[];
  config: ConfiguracionSistema;
  onSaveParte: (parte: ParteNovedadesGuardia) => void;
  onClose: () => void;
}

export const GestionCibercrimenGuardiaModal: React.FC<GestionCibercrimenGuardiaModalProps> = ({
  parte,
  personalList,
  config,
  onSaveParte,
  onClose,
}) => {
  const [registros, setRegistros] = useState<RegistroCibercrimenGuardia[]>(() => {
    return parte.cibercrimenRegistros || [];
  });

  const [nuevo, setNuevo] = useState<RegistroCibercrimenGuardia>({
    id: 'ciber-' + Date.now(),
    horaRegistro: new Date().toLocaleTimeString().slice(0, 5),
    personalACargo: '',
    dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
    tareaRealizada: 'Resguardo de Evidencia',
    otraTarea: '',
    apellidoYNombre: '',
    dni: '',
    conPersonalPolicialInvolucrado: false,
    personalPolicial: {
      jerarquia: config.jerarquias[0] || 'Oficial Subayudante',
      plaza: '',
      unidadRegional: config.unidadesRegionales?.[0] || 'U.R. N° 1',
      destino: config.destinosPoliciales?.[0] || '',
    },
    observaciones: '',
  });

  const [isAdding, setIsAdding] = useState(false);

  const personalOptions = personalList.map((p) => `${p.jerarquia} ${p.apellidoYNombre}`);

  const handleAddRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.personalACargo.trim()) {
      alert('Indique el Personal a cargo de la tarea');
      return;
    }
    if (!nuevo.dependenciaSolicitante.trim()) {
      alert('Indique la Dependencia Solicitante');
      return;
    }

    if (nuevo.tareaRealizada === 'Resguardo de Evidencia') {
      if (!nuevo.apellidoYNombre?.trim() || !nuevo.dni?.trim()) {
        alert('Para Resguardo de Evidencia es obligatorio ingresar Apellido y Nombre y DNI de la persona');
        return;
      }
    }

    const item: RegistroCibercrimenGuardia = {
      ...nuevo,
      id: 'ciber-' + Date.now(),
    };

    const updated = [...registros, item];
    setRegistros(updated);
    setIsAdding(false);

    // Guardar en el parte sin sumar a totalIntervenciones
    onSaveParte({
      ...parte,
      cibercrimenRegistros: updated,
      updatedAt: new Date().toISOString(),
    });

    // Resetear formulario
    setNuevo({
      id: 'ciber-' + Date.now(),
      horaRegistro: new Date().toLocaleTimeString().slice(0, 5),
      personalACargo: '',
      dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      tareaRealizada: 'Resguardo de Evidencia',
      otraTarea: '',
      apellidoYNombre: '',
      dni: '',
      conPersonalPolicialInvolucrado: false,
      personalPolicial: {
        jerarquia: config.jerarquias[0] || 'Oficial Subayudante',
        plaza: '',
        unidadRegional: config.unidadesRegionales?.[0] || 'U.R. N° 1',
        destino: config.destinosPoliciales?.[0] || '',
      },
      observaciones: '',
    });
  };

  const handleRemoveRegistro = (id: string) => {
    const updated = registros.filter((r) => r.id !== id);
    setRegistros(updated);
    onSaveParte({
      ...parte,
      cibercrimenRegistros: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-800 rounded-lg text-indigo-200">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Registros de Cibercrimen de la Guardia</span>
                <span className="bg-indigo-900 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {registros.length} tareas
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Resguardo de evidencia digital, descarga de filmaciones y peritajes informáticos de turno.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Advertencia informativa: No suma a intervenciones */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-900 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Aviso oficial:</strong> Las tareas de resguardo de evidencia y descarga de filmaciones registradas en esta sección son operativas de guardia y <strong>no suman al contador estadístico de intervenciones criminalísticas</strong>.
            </span>
          </div>

          {/* Botón para abrir formulario de nueva tarea */}
          {!isAdding && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Registro Cibercrimen</span>
              </button>
            </div>
          )}

          {/* Formulario nuevo registro */}
          {isAdding && (
            <form onSubmit={handleAddRegistro} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <span className="font-bold text-indigo-950 text-xs">Nuevo Registro de Tarea Cibercrimen</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-500 hover:text-slate-800 text-[11px]"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Personal a cargo */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Personal a cargo de la tarea *</label>
                  <input
                    type="text"
                    required
                    list="lista-personal-ciber"
                    value={nuevo.personalACargo}
                    onChange={(e) => setNuevo({ ...nuevo, personalACargo: e.target.value })}
                    placeholder="Efectivo policial a cargo"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  />
                  <datalist id="lista-personal-ciber">
                    {personalOptions.map((opt, i) => (
                      <option key={i} value={opt} />
                    ))}
                  </datalist>
                </div>

                {/* Dependencia Solicitante */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dependencia Solicitante *</label>
                  <input
                    type="text"
                    required
                    list="lista-dependencias-ciber"
                    value={nuevo.dependenciaSolicitante}
                    onChange={(e) => setNuevo({ ...nuevo, dependenciaSolicitante: e.target.value })}
                    placeholder="Comisaría / UFI solicitante"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  />
                  <datalist id="lista-dependencias-ciber">
                    {config.dependenciasPoliciales.map((d, i) => (
                      <option key={i} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* Tarea Realizada */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tarea Realizada *</label>
                  <select
                    value={nuevo.tareaRealizada}
                    onChange={(e) => setNuevo({ ...nuevo, tareaRealizada: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-indigo-950"
                  >
                    <option value="Resguardo de Evidencia">Resguardo de Evidencia</option>
                    <option value="Descarga de Filmaciones">Descarga de Filmaciones</option>
                    <option value="Otro">Otros (especificar)</option>
                  </select>
                </div>
              </div>

              {nuevo.tareaRealizada === 'Otro' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especificar Tarea *</label>
                  <input
                    type="text"
                    required
                    value={nuevo.otraTarea || ''}
                    onChange={(e) => setNuevo({ ...nuevo, otraTarea: e.target.value })}
                    placeholder="Describa la tarea pericial/informática realizada..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              {/* Si es Resguardo de Evidencia: Solicitar Apellido y Nombre y DNI */}
              {nuevo.tareaRealizada === 'Resguardo de Evidencia' && (
                <div className="p-3 bg-white rounded-lg border border-indigo-300 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">Apellido y Nombre del titular / causante *</label>
                    <input
                      type="text"
                      required
                      value={nuevo.apellidoYNombre || ''}
                      onChange={(e) => setNuevo({ ...nuevo, apellidoYNombre: e.target.value })}
                      placeholder="Apellido y Nombre completo"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">DNI *</label>
                    <input
                      type="text"
                      required
                      value={nuevo.dni || ''}
                      onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value })}
                      placeholder="Número de DNI"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Especificar si es con Personal Policial Involucrado */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={nuevo.conPersonalPolicialInvolucrado || false}
                    onChange={(e) => setNuevo({ ...nuevo, conPersonalPolicialInvolucrado: e.target.checked })}
                    className="w-4 h-4 text-purple-700 rounded"
                  />
                  <span className="text-purple-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-700" />
                    <span>¿Es con Personal Policial Involucrado?</span>
                  </span>
                </label>

                {nuevo.conPersonalPolicialInvolucrado && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1 text-[11px]">Jerarquía</label>
                      <select
                        value={nuevo.personalPolicial?.jerarquia || ''}
                        onChange={(e) =>
                          setNuevo({
                            ...nuevo,
                            personalPolicial: {
                              ...(nuevo.personalPolicial || {}),
                              jerarquia: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded border border-purple-300 bg-white text-[11px]"
                      >
                        {config.jerarquias.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1 text-[11px]">Plaza N°</label>
                      <input
                        type="text"
                        value={nuevo.personalPolicial?.plaza || ''}
                        onChange={(e) =>
                          setNuevo({
                            ...nuevo,
                            personalPolicial: {
                              ...(nuevo.personalPolicial || {}),
                              plaza: e.target.value,
                            },
                          })
                        }
                        placeholder="Ej. 1823"
                        className="w-full px-2 py-1 rounded border border-purple-300 bg-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1 text-[11px]">Unidad Regional</label>
                      <select
                        value={nuevo.personalPolicial?.unidadRegional || ''}
                        onChange={(e) =>
                          setNuevo({
                            ...nuevo,
                            personalPolicial: {
                              ...(nuevo.personalPolicial || {}),
                              unidadRegional: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded border border-purple-300 bg-white text-[11px]"
                      >
                        {(config.unidadesRegionales || ['U.R. N° 1', 'U.R. N° 2', 'U.R. N° 3', 'U.R. N° 4', 'U.R. N° 5']).map((ur) => (
                          <option key={ur} value={ur}>
                            {ur}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1 text-[11px]">Destino</label>
                      <input
                        type="text"
                        value={nuevo.personalPolicial?.destino || ''}
                        onChange={(e) =>
                          setNuevo({
                            ...nuevo,
                            personalPolicial: {
                              ...(nuevo.personalPolicial || {}),
                              destino: e.target.value,
                            },
                          })
                        }
                        placeholder="Comisaría / División"
                        className="w-full px-2 py-1 rounded border border-purple-300 bg-white text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-950 text-white font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardar Tarea</span>
                </button>
              </div>
            </form>
          )}

          {/* Tabla de registros actuales de la guardia */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Hora</th>
                  <th className="py-2 px-3">Personal a Cargo</th>
                  <th className="py-2 px-3">Dependencia Solicitante</th>
                  <th className="py-2 px-3">Tarea Realizada</th>
                  <th className="py-2 px-3">Persona / DNI</th>
                  <th className="py-2 px-3">PPI</th>
                  <th className="py-2 px-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No hay registros de cibercrimen en este turno de guardia.
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.horaRegistro || '---'}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{r.personalACargo}</td>
                      <td className="py-2 px-3 text-slate-700">{r.dependenciaSolicitante}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.tareaRealizada === 'Resguardo de Evidencia'
                            ? 'bg-purple-100 text-purple-900'
                            : r.tareaRealizada === 'Descarga de Filmaciones'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {r.tareaRealizada === 'Otro' ? r.otraTarea || 'Otro' : r.tareaRealizada}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {r.apellidoYNombre ? (
                          <span className="font-semibold">{r.apellidoYNombre} <span className="font-mono text-slate-500 font-normal">({r.dni})</span></span>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.conPersonalPolicialInvolucrado ? (
                          <span className="text-purple-700 font-bold text-[10px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            SÍ: {r.personalPolicial?.jerarquia} (Plaza {r.personalPolicial?.plaza || 's/p'})
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRegistro(r.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
