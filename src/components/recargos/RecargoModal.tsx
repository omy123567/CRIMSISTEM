import React, { useState, useMemo, useEffect } from 'react';
import {
  RecargoOperativo,
  Personal,
  ConfiguracionSistema,
  UsuarioSistema,
  DelegacionPolicial,
  GrupoPersonal,
} from '../../types/police';
import { db } from '../../db/database';
import {
  X,
  Clock,
  CheckCircle2,
  Shield,
  UserCheck,
  Plus,
  Search,
  Building2,
  Lock,
  AlertCircle,
  Briefcase,
  Calendar,
  Users,
} from 'lucide-react';

interface RecargoModalProps {
  recargo?: RecargoOperativo | null;
  personalList: Personal[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  delegacionesList?: DelegacionPolicial[];
  activeDelegacionId?: string;
  onSave: (rec: RecargoOperativo) => void;
  onClose: () => void;
}

export const RecargoModal: React.FC<RecargoModalProps> = ({
  recargo,
  personalList,
  config,
  currentUser,
  delegacionesList = [],
  activeDelegacionId,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(recargo);

  // Delegación predeterminada asignada
  const defaultDelegacionId =
    recargo?.delegacionId ||
    currentUser?.delegacionId ||
    activeDelegacionId ||
    'del-laguna-blanca';

  // Permiso específico para recargar otras delegaciones
  const puedeCambiarDelegacion = Boolean(
    currentUser?.rol === 'superusuario' ||
      currentUser?.puedeRecargarOtrasDelegaciones ||
      currentUser?.puedeVerOtrasDelegaciones
  );

  const [formData, setFormData] = useState<RecargoOperativo>(() => {
    if (recargo) {
      // Extraer hora de presentación de hora o horaDesde
      const horaPres =
        recargo.horaPresentacion ||
        recargo.horaDesde ||
        (recargo.hora ? recargo.hora.split('a')[0]?.replace('hs', '').trim() : '18:00');

      return {
        ...recargo,
        delegacionId: recargo.delegacionId || defaultDelegacionId,
        oficina: recargo.oficina || recargo.grupoUOficina || 'Oficina de Guardia y Prevención',
        horaPresentacion: horaPres,
        hora: horaPres ? `${horaPres} hs` : recargo.hora,
        personalDesignado:
          recargo.personalDesignado ||
          (recargo.personalIds && recargo.personalIds.length > 0
            ? recargo.personalIds
                .map((id) => {
                  const p = personalList.find((item) => item.id === id);
                  return p ? `${p.jerarquia} ${p.apellidoYNombre}` : '';
                })
                .filter(Boolean)
                .join(', ')
            : ''),
      };
    }

    return {
      id: 'rec-' + Date.now(),
      fecha: new Date().toISOString().slice(0, 10),
      horaPresentacion: '18:00',
      hora: '18:00 hs',
      tipoRecargo: config.tiposRecargo[0] || 'Operativo de saturación y prevención',
      seEncuentraDeGuardia: false,
      estado: 'Vigente',
      delegacionId: defaultDelegacionId,
      oficina: 'Oficina de Guardia y Prevención',
      personalDesignado: '',
      personalIds: [],
      observaciones: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Estado de búsqueda y visualización de personal
  const [busquedaPersonal, setBusquedaPersonal] = useState('');
  const [mostrarDropdownPersonal, setMostrarDropdownPersonal] = useState(false);
  const [gruposDelegacion, setGruposDelegacion] = useState<GrupoPersonal[]>([]);

  // Cargar grupos creados de la delegación
  React.useEffect(() => {
    db.grupos.toArray().then((todos) => {
      const filtrados = (todos || []).filter(
        (g) => !g.delegacionId || g.delegacionId === formData.delegacionId
      );
      setGruposDelegacion(filtrados);
    }).catch(console.error);
  }, [formData.delegacionId]);

  // Todo el personal correspondiente a la Delegación seleccionada
  const personalDeDelegacion = useMemo(() => {
    return personalList.filter(
      (p) => !p.delegacionId || p.delegacionId === formData.delegacionId
    );
  }, [personalList, formData.delegacionId]);

  // Filtrado reactivo de efectivos policiales de la Delegación
  const resultadosBusquedaPersonal = useMemo(() => {
    if (!busquedaPersonal.trim()) {
      return personalDeDelegacion;
    }
    const term = busquedaPersonal.toLowerCase().trim();

    return personalDeDelegacion.filter((p) => {
      const apNom = (p.apellidoYNombre || '').toLowerCase();
      const dni = (p.dni || '').toLowerCase();
      const jer = (p.jerarquia || '').toLowerCase();
      const plaza = (p.plaza || p.credencialNro || '').toLowerCase();
      return (
        apNom.includes(term) ||
        dni.includes(term) ||
        jer.includes(term) ||
        plaza.includes(term)
      );
    });
  }, [personalDeDelegacion, busquedaPersonal]);

  const handleAgregarPersonalObj = (p: Personal) => {
    const etiqueta = `${p.jerarquia} ${p.apellidoYNombre}`;
    const actuales = formData.personalDesignado
      ? formData.personalDesignado
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (!actuales.includes(etiqueta)) {
      actuales.push(etiqueta);
      const ids = Array.from(new Set([...(formData.personalIds || []), p.id]));
      setFormData({
        ...formData,
        personalDesignado: actuales.join(', '),
        personalIds: ids,
      });
    }
    setBusquedaPersonal('');
  };

  const handleAgregarPersonalTexto = (nombreConJerarquia: string) => {
    if (!nombreConJerarquia.trim()) return;
    const actuales = formData.personalDesignado
      ? formData.personalDesignado
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (!actuales.includes(nombreConJerarquia.trim())) {
      actuales.push(nombreConJerarquia.trim());
      setFormData({
        ...formData,
        personalDesignado: actuales.join(', '),
      });
    }
    setBusquedaPersonal('');
  };

  const handleEliminarEfectivo = (efectivo: string) => {
    const actuales = formData.personalDesignado
      ? formData.personalDesignado
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const filtrados = actuales.filter((item) => item !== efectivo);
    setFormData({
      ...formData,
      personalDesignado: filtrados.join(', '),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fecha) {
      alert('Indique la fecha del recargo');
      return;
    }
    if (!formData.horaPresentacion) {
      alert('Indique la hora de presentación');
      return;
    }
    if (!formData.personalDesignado?.trim()) {
      alert('Debe designar personal policial para el recargo');
      return;
    }

    const horaPres = formData.horaPresentacion.slice(0, 5);

    onSave({
      ...formData,
      horaPresentacion: horaPres,
      hora: `${horaPres} hs`,
      horaDesde: horaPres,
      horaHasta: '', // No requerida según indicación expresa
      updatedAt: new Date().toISOString(),
    });
  };

  const listaPersonalActual = formData.personalDesignado
    ? formData.personalDesignado
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const delegacionActualObj = delegacionesList.find(
    (d) => d.id === formData.delegacionId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? 'Editar Recargo de Servicio' : 'Registrar Recargo de Servicio'}
              </h2>
              <p className="text-xs text-slate-300">
                Solo se requiere la hora de presentación (con reloj) y designación policial con búsqueda avanzada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* 1. Fecha & 2. Hora de Presentación (Exclusivamente hora de inicio con reloj) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-900" />
                <span>1. Fecha *</span>
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-900" />
                <span>2. Hora de Presentación *</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={formData.horaPresentacion || '18:00'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      horaPresentacion: e.target.value,
                      hora: `${e.target.value} hs`,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                * Solo se asienta la hora de presentación al servicio (no se requiere finalización).
              </span>
            </div>
          </div>

          {/* 3. Tipo de Recargo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              3. Tipo de Recargo *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                list="lista-tipos-recargo"
                value={formData.tipoRecargo}
                onChange={(e) => setFormData({ ...formData, tipoRecargo: e.target.value })}
                placeholder="Seleccione o redacte el tipo de recargo"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <datalist id="lista-tipos-recargo">
                {(config.tiposRecargo || []).map((t) => (
                  <option key={t} value={t} />
                ))}
                <option value="Operativo de saturación y prevención" />
                <option value="Cobertura de Evento Deportivo / Masivo" />
                <option value="Custodia y Traslado de Detenidos" />
                <option value="Control Vehicular e Identificación de Personas" />
                <option value="Refuerzo de Guardia Interna" />
                <option value="Servicio Extraordinario Judicial" />
              </datalist>
            </div>
          </div>

          {/* 4. ¿Se encuentra de guardia? & 5. Estado del Servicio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                4. ¿Se encuentra de guardia? *
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="seEncuentraDeGuardia"
                    checked={formData.seEncuentraDeGuardia === true}
                    onChange={() => setFormData({ ...formData, seEncuentraDeGuardia: true })}
                    className="w-4 h-4 text-blue-900 border-slate-300 focus:ring-blue-600"
                  />
                  <span>Sí (En guardia)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="seEncuentraDeGuardia"
                    checked={formData.seEncuentraDeGuardia === false}
                    onChange={() => setFormData({ ...formData, seEncuentraDeGuardia: false })}
                    className="w-4 h-4 text-blue-900 border-slate-300 focus:ring-blue-600"
                  />
                  <span>No (Franco de servicio)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                5. Estado del Servicio *
              </label>
              <select
                value={formData.estado}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="Vigente">Vigente (Programado / En curso)</option>
                <option value="Finalizado">Finalizado (Cumplido)</option>
                <option value="Suspendido">Suspendido (Cancelado)</option>
              </select>
            </div>
          </div>

          {/* ANTES DE PERSONAL DESIGNADO: CAMPO DELEGACIÓN Y OFICINA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/40 rounded-xl border border-blue-200/70">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-900" />
                  <span>Delegación Asignada *</span>
                </label>
                {!puedeCambiarDelegacion && (
                  <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-amber-700" />
                    Fijada
                  </span>
                )}
              </div>

              {puedeCambiarDelegacion ? (
                <select
                  value={formData.delegacionId}
                  onChange={(e) =>
                    setFormData({ ...formData, delegacionId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600"
                >
                  {delegacionesList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} ({d.siglas || d.ciudad})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-700 font-medium flex items-center justify-between">
                  <span className="truncate">
                    {delegacionActualObj?.nombre || formData.delegacionId}
                  </span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </div>
              )}
              {!puedeCambiarDelegacion && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Solo usuarios autorizados pueden recargar personal en otras delegaciones.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-900" />
                  <span>Oficina / Dependencia / Grupo *</span>
                </span>
                <span className="text-[10px] text-blue-700 font-normal">
                  {gruposDelegacion.length} grupos registrados
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  list="lista-grupos-delegacion"
                  value={formData.oficina || ''}
                  onChange={(e) => setFormData({ ...formData, oficina: e.target.value })}
                  placeholder="Seleccione un grupo o escriba la oficina..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <datalist id="lista-grupos-delegacion">
                  {gruposDelegacion.map((g) => (
                    <option key={g.id} value={g.nombre}>
                      {g.nombre} {g.descripcion ? `(${g.descripcion})` : ''}
                    </option>
                  ))}
                  {(config.gruposGuardia || []).map((gg) => (
                    <option key={gg} value={gg}>
                      {gg}
                    </option>
                  ))}
                  <option value="Oficina de Guardia y Prevención" />
                  <option value="Sección Criminalística y Pericial" />
                  <option value="Seguridad Vial y Siniestros" />
                  <option value="Brigada de Investigaciones" />
                </datalist>
              </div>

              {/* Botones rápidos de grupos creados para la delegación */}
              {gruposDelegacion.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Grupos creados en esta delegación:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {gruposDelegacion.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, oficina: g.nombre });
                          // Si el grupo tiene personal asignado, podemos sugerir agregarlos
                          if (g.personalIds && g.personalIds.length > 0) {
                            const miembrosNombres = g.personalIds
                              .map((pid) => {
                                const pers = personalList.find((p) => p.id === pid);
                                return pers ? `${pers.jerarquia} ${pers.apellidoYNombre}` : '';
                              })
                              .filter(Boolean);
                            if (miembrosNombres.length > 0) {
                              const actuales = formData.personalDesignado
                                ? formData.personalDesignado.split(',').map((s) => s.trim()).filter(Boolean)
                                : [];
                              const combinados = Array.from(new Set([...actuales, ...miembrosNombres]));
                              const combinadosIds = Array.from(new Set([...(formData.personalIds || []), ...g.personalIds]));
                              setFormData((prev) => ({
                                ...prev,
                                oficina: g.nombre,
                                personalDesignado: combinados.join(', '),
                                personalIds: combinadosIds,
                              }));
                            }
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium border cursor-pointer transition-colors ${
                          formData.oficina === g.nombre
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-600 hover:text-blue-900'
                        }`}
                        title={g.descripcion || g.nombre}
                      >
                        {g.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-500 mt-1 block">
                Se especificará en el reporte oficial por delegación y grupo.
              </span>
            </div>
          </div>

          {/* 6. Personal Designado (Con búsqueda por Apellido y Nombre, DNI, Jerarquía, Plaza) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800">
                6. Personal Designado *
              </label>
              <button
                type="button"
                onClick={() => setMostrarDropdownPersonal(!mostrarDropdownPersonal)}
                className="text-[11px] font-bold text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                <span>
                  {mostrarDropdownPersonal ? 'Ocultar nómina' : `Ver nómina de la delegación (${personalDeDelegacion.length})`}
                </span>
              </button>
            </div>

            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaPersonal}
                    onFocus={() => setMostrarDropdownPersonal(true)}
                    onChange={(e) => {
                      setBusquedaPersonal(e.target.value);
                      setMostrarDropdownPersonal(true);
                    }}
                    placeholder={`Buscar en ${delegacionActualObj?.nombre || 'delegación'} por Nombre, DNI, Jerarquía o Plaza...`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && busquedaPersonal.trim()) {
                        e.preventDefault();
                        if (resultadosBusquedaPersonal.length > 0) {
                          handleAgregarPersonalObj(resultadosBusquedaPersonal[0]);
                        } else {
                          handleAgregarPersonalTexto(busquedaPersonal);
                        }
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (resultadosBusquedaPersonal.length > 0) {
                      handleAgregarPersonalObj(resultadosBusquedaPersonal[0]);
                    } else if (busquedaPersonal.trim()) {
                      handleAgregarPersonalTexto(busquedaPersonal);
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Lista desplegable interactiva con todos los personales de la delegación y buscador */}
              {mostrarDropdownPersonal && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-300 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div className="bg-blue-50/80 px-3 py-1.5 border-b border-blue-200 flex items-center justify-between text-[11px] font-bold text-blue-950 sticky top-0 z-10">
                    <span>
                      {busquedaPersonal.trim()
                        ? `Resultados encontrados (${resultadosBusquedaPersonal.length}):`
                        : `Personal de la Delegación: ${delegacionActualObj?.nombre || 'Actual'} (${personalDeDelegacion.length} efectivos)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarDropdownPersonal(false)}
                      className="text-blue-700 hover:text-blue-950 font-semibold"
                    >
                      Cerrar ×
                    </button>
                  </div>

                  {resultadosBusquedaPersonal.length === 0 ? (
                    <div className="p-3 text-slate-500 text-center text-xs">
                      <p>No se encontraron efectivos en esta delegación con ese criterio.</p>
                      {busquedaPersonal.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAgregarPersonalTexto(busquedaPersonal);
                            setMostrarDropdownPersonal(false);
                          }}
                          className="mt-1.5 text-xs text-blue-800 font-bold underline"
                        >
                          + Agregar "{busquedaPersonal.trim()}" como texto libre
                        </button>
                      )}
                    </div>
                  ) : (
                    resultadosBusquedaPersonal.map((p) => {
                      const yaAsignado = (formData.personalDesignado || '').includes(p.apellidoYNombre);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            handleAgregarPersonalObj(p);
                            if (!busquedaPersonal) {
                              // Mantener dropdown abierto si está navegando por la lista completa
                            }
                          }}
                          className={`p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                            yaAsignado ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{p.jerarquia} {p.apellidoYNombre}</span>
                              {yaAsignado && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  ✓ Asignado
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              <span>DNI: {p.dni || 'S/D'}</span>
                              <span>•</span>
                              <span>Plaza: {p.plaza || p.credencialNro || 'S/D'}</span>
                              {p.seccionGrupo && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-sans font-medium">{p.seccionGrupo}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              yaAsignado
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                            }`}
                          >
                            {yaAsignado ? 'Ya agregado' : '+ Asignar'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Badges de personal agregado */}
            {listaPersonalActual.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {listaPersonalActual.map((efectivo, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-950 border border-blue-200 px-2.5 py-1 rounded-md font-semibold text-xs"
                  >
                    <UserCheck className="w-3 h-3 text-blue-700" />
                    <span>{efectivo}</span>
                    <button
                      type="button"
                      onClick={() => handleEliminarEfectivo(efectivo)}
                      className="hover:text-red-600 text-slate-400 p-0.5 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Input libre de texto también editable */}
            <input
              type="text"
              required
              value={formData.personalDesignado || ''}
              onChange={(e) => setFormData({ ...formData, personalDesignado: e.target.value })}
              placeholder="Ej. Crio. ALVAREZ Marcos, Sgto. 1º BENITEZ Ramón..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
            />
            <span className="text-[11px] text-slate-400 block">
              Puede seleccionar desde el buscador multi-criterio o escribir directamente separados por coma.
            </span>
          </div>

          {/* 7. Observaciones */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">7. Observaciones</label>
            <textarea
              rows={2}
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Puesto de consigna, tareas especiales, móvil asignado u otras consideraciones del servicio..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Recargo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
