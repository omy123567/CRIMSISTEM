import React, { useState } from 'react';
import {
  ParteNovedadesGuardia,
  MovilAfectadoGuardia,
  MovilPolicial,
  ConfiguracionSistema,
  CondicionVehiculo,
} from '../../types/police';
import {
  X,
  Car,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Gauge,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

interface GestionMovilesGuardiaModalProps {
  parte: ParteNovedadesGuardia;
  movilesList: MovilPolicial[];
  config?: ConfiguracionSistema;
  onSave: (updatedParte: ParteNovedadesGuardia) => void;
  onClose: () => void;
}

export const GestionMovilesGuardiaModal: React.FC<GestionMovilesGuardiaModalProps> = ({
  parte,
  movilesList,
  config,
  onSave,
  onClose,
}) => {
  const [moviles, setMoviles] = useState<MovilAfectadoGuardia[]>(() => {
    return (parte.movilesAfectados || []).map((m) => {
      const fleetItem = movilesList.find((f) => f.id === m.movilId);
      return {
        ...m,
        kmActual: m.kmActual ?? fleetItem?.kilometrajeActual ?? 0,
        condicionGeneral: m.condicionGeneral || fleetItem?.condicionGeneral || 'Bueno',
      };
    });
  });

  const [selectedMovilId, setSelectedMovilId] = useState('');
  const [customDescripcion, setCustomDescripcion] = useState('');
  const [estadoMovil, setEstadoMovil] = useState<'En servicio' | 'Fuera de servicio' | 'En taller'>('En servicio');
  const [kmInput, setKmInput] = useState<number | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const intervaloService = config?.intervaloServiceKm || 10000;
  const alertaServiceKm = config?.recordatorioServiceKm || 500;

  const handleRemove = (id: string) => {
    setMoviles((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof MovilAfectadoGuardia, value: any) => {
    setMoviles((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const handleAddFromFleet = () => {
    if (!selectedMovilId && !customDescripcion.trim()) return;

    if (selectedMovilId) {
      const fleetItem = movilesList.find((m) => m.id === selectedMovilId);
      if (!fleetItem) return;

      const desc = `${fleetItem.nroMovilInterno} ${fleetItem.marca} ${fleetItem.modelo} (${fleetItem.dominioPatente})`;
      const km = typeof kmInput === 'number' && kmInput > 0 ? kmInput : fleetItem.kilometrajeActual;

      setMoviles((prev) => [
        ...prev,
        {
          id: 'ma-' + Date.now(),
          movilId: fleetItem.id,
          descripcion: desc,
          estado: estadoMovil,
          kmActual: km,
          condicionGeneral: fleetItem.condicionGeneral || 'Bueno',
          requiereReparacion: false,
        },
      ]);
      setSelectedMovilId('');
      setKmInput('');
    } else {
      setMoviles((prev) => [
        ...prev,
        {
          id: 'ma-' + Date.now(),
          descripcion: customDescripcion.trim(),
          estado: estadoMovil,
          kmActual: typeof kmInput === 'number' ? kmInput : 0,
          condicionGeneral: 'Bueno',
          requiereReparacion: false,
        },
      ]);
      setCustomDescripcion('');
      setKmInput('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-900/80 rounded-xl text-blue-200 border border-blue-700/50">
              <Car className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Móviles Policiales de Guardia y Novedades</span>
                <span className="text-[11px] font-semibold bg-blue-800/80 text-blue-200 px-2 py-0.5 rounded-full border border-blue-600/50">
                  {moviles.length} unidad(es)
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Turno: <strong>{parte.tipoGuardia || parte.grupoGuardia}</strong> • {parte.fechaInicio} ({parte.horaInicio} - {parte.horaFin})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Instrucciones & Sincronización Automática */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-blue-950 flex items-start gap-2.5">
            <Gauge className="w-4 h-4 text-blue-800 mt-0.5 shrink-0" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-blue-900">
                Sincronización Automática con Parque Automotor:
              </p>
              <p className="text-blue-800/90 leading-relaxed text-[11px]">
                Los kilómetros ingresados, el estado operativo y las reparaciones registradas aquí se actualizarán automáticamente en la ficha del móvil en <strong>Parque Automotor</strong> y computarán el kilometraje faltante para el próximo service.
              </p>
            </div>
          </div>

          {/* Lista de Móviles Afectados */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                Móviles en Turno ({moviles.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Haga clic en Novedades para reportar odómetro, estado o reparaciones
              </span>
            </div>

            {moviles.length === 0 ? (
              <div className="text-slate-400 italic py-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
                No hay unidades móviles asignadas a este turno de guardia.
              </div>
            ) : (
              <div className="space-y-3">
                {moviles.map((m) => {
                  const fleetItem = movilesList.find((f) => f.id === m.movilId);
                  const isExpanded = expandedId === m.id;
                  const currentKm = m.kmActual ?? fleetItem?.kilometrajeActual ?? 0;
                  const proxServiceKm = fleetItem?.proximoServiceKm || (fleetItem?.ultimoServiceKm ? fleetItem.ultimoServiceKm + intervaloService : 10000);
                  const kmFaltantes = proxServiceKm - currentKm;
                  const serviceVencido = kmFaltantes <= 0;
                  const serviceProximo = kmFaltantes > 0 && kmFaltantes <= alertaServiceKm;

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Cabecera del móvil */}
                      <div className="p-3 flex flex-wrap items-center justify-between gap-3 bg-white">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                            <Car className="w-4 h-4 shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                              <span>{m.descripcion}</span>
                              {m.requiereReparacion && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Wrench className="w-3 h-3 text-amber-700" />
                                  <span>Reparación reportada</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              <span>Odómetro guardia: <strong>{currentKm.toLocaleString()} km</strong></span>
                              {fleetItem && (
                                <>
                                  <span>•</span>
                                  <span>Próx. Service: <strong>{proxServiceKm.toLocaleString()} km</strong></span>
                                  <span>•</span>
                                  {serviceVencido ? (
                                    <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      ¡Service vencido por {Math.abs(kmFaltantes)} km!
                                    </span>
                                  ) : serviceProximo ? (
                                    <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Próx. service a {kmFaltantes} km
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-medium">
                                      Faltan {kmFaltantes} km para service
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controles de Estado y Acciones */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={m.estado}
                            onChange={(e) => handleUpdateItem(m.id, 'estado', e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              m.estado === 'En servicio'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : m.estado === 'En taller'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            <option value="En servicio">En servicio</option>
                            <option value="Fuera de servicio">Fuera de servicio</option>
                            <option value="En taller">En taller</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : m.id)}
                            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                            title="Ver/Editar novedades mecánicas y odómetro"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Novedades</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(m.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Quitar móvil de la guardia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Panel Expandible de Novedades y Reparación */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1 text-[11px] flex items-center gap-1">
                                <Gauge className="w-3 h-3 text-blue-900" />
                                <span>Kilometraje Actual (Odómetro) *</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={m.kmActual ?? ''}
                                onChange={(e) =>
                                  handleUpdateItem(m.id, 'kmActual', Number(e.target.value))
                                }
                                placeholder="Ej: 84200"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                                Condición General
                              </label>
                              <select
                                value={m.condicionGeneral || 'Bueno'}
                                onChange={(e) =>
                                  handleUpdateItem(m.id, 'condicionGeneral', e.target.value as CondicionVehiculo)
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                              >
                                <option value="Excelente">Excelente</option>
                                <option value="Bueno">Bueno</option>
                                <option value="Regular">Regular</option>
                                <option value="Malo">Malo</option>
                              </select>
                            </div>

                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs w-full shadow-2xs">
                                <input
                                  type="checkbox"
                                  checked={Boolean(m.requiereReparacion)}
                                  onChange={(e) =>
                                    handleUpdateItem(m.id, 'requiereReparacion', e.target.checked)
                                  }
                                  className="w-4 h-4 text-blue-900 rounded cursor-pointer"
                                />
                                <span>¿Reportar Novedad Mecánica / Reparación?</span>
                              </label>
                            </div>
                          </div>

                          {/* Campos detallados de reparación / taller */}
                          {m.requiereReparacion && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                              <span className="font-bold text-amber-950 text-xs block flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-amber-800" />
                                <span>Datos de Reparación o Falla a Sincronizar en Parque Automotor:</span>
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Tipo de Reparación / Tarea
                                  </label>
                                  <select
                                    value={m.tipoReparacion || 'Mecánica'}
                                    onChange={(e) =>
                                      handleUpdateItem(m.id, 'tipoReparacion', e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold"
                                  >
                                    <option value="Mecánica">Mecánica</option>
                                    <option value="Chapa y Pintura">Chapa y Pintura</option>
                                    <option value="Eléctrica">Eléctrica</option>
                                    <option value="Neumáticos">Neumáticos</option>
                                    <option value="Frenos">Frenos</option>
                                    <option value="Service Programado">Service Programado</option>
                                    <option value="Otro">Otro</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Taller o Proveedor Asignado
                                  </label>
                                  <input
                                    type="text"
                                    value={m.tallerProveedor || ''}
                                    onChange={(e) =>
                                      handleUpdateItem(m.id, 'tallerProveedor', e.target.value)
                                    }
                                    placeholder="Ej: Taller Mecánico Central DPC"
                                    className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white text-xs"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                    Costo Estimado / Presupuesto ($)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={m.costoPresupuesto ?? ''}
                                    onChange={(e) =>
                                      handleUpdateItem(m.id, 'costoPresupuesto', Number(e.target.value))
                                    }
                                    placeholder="0.00"
                                    className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white text-xs font-mono font-bold"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Detalle de la Falla / Novedad Mecánica *
                                </label>
                                <textarea
                                  rows={2}
                                  value={m.novedadesMecanicas || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(m.id, 'novedadesMecanicas', e.target.value)
                                  }
                                  placeholder="Describa el desperfecto, ruido, pérdida de fluido, service necesario, o motivo de salida de servicio..."
                                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Repuestos o insumos requeridos / cambiados
                                </label>
                                <input
                                  type="text"
                                  value={m.repuestosCambiados || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(m.id, 'repuestosCambiados', e.target.value)
                                  }
                                  placeholder="Ej: Filtro de aceite, pastillas de freno, 4L aceite sintetico..."
                                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agregar Nuevo Móvil (Desde catálogo del parque automotor o libre) */}
          <div className="border border-slate-300 rounded-xl p-4 bg-white shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-900" />
              <span>Asignar Móvil Policial a la Guardia</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                  Seleccionar del Parque Automotor:
                </label>
                <select
                  value={selectedMovilId}
                  onChange={(e) => {
                    setSelectedMovilId(e.target.value);
                    if (e.target.value) {
                      setCustomDescripcion('');
                      const f = movilesList.find((mv) => mv.id === e.target.value);
                      if (f) setKmInput(f.kilometrajeActual);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold text-xs"
                >
                  <option value="">-- Seleccionar móvil registrado --</option>
                  {movilesList.map((mv) => (
                    <option key={mv.id} value={mv.id}>
                      {mv.nroMovilInterno} - {mv.marca} {mv.modelo} ({mv.dominioPatente}) [{mv.kilometrajeActual} km - {mv.estadoOperativo}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                  Kilometraje Odómetro:
                </label>
                <input
                  type="number"
                  min="0"
                  value={kmInput}
                  onChange={(e) => setKmInput(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Km actual"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                  Estado Operativo:
                </label>
                <select
                  value={estadoMovil}
                  onChange={(e) => setEstadoMovil(e.target.value as any)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-bold text-xs"
                >
                  <option value="En servicio">En servicio</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="En taller">En taller</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                O ingresar descripción manual / móvil de apoyo de otra dependencia:
              </label>
              <input
                type="text"
                value={customDescripcion}
                onChange={(e) => {
                  setCustomDescripcion(e.target.value);
                  if (e.target.value) setSelectedMovilId('');
                }}
                placeholder="Ej. Móvil 402 Toyota Hilux (AB 345 CD) - Jurisdicción 5ta"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddFromFleet}
                disabled={!selectedMovilId && !customDescripcion.trim()}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar a la Guardia</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            * Los datos guardados sincronizarán automáticamente el estado y kilometraje en <strong>Parque Automotor</strong>.
          </div>
          <div className="flex items-center gap-2">
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
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Móviles y Sincronizar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
