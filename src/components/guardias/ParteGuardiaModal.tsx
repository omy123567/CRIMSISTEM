import React, { useState, useMemo, useEffect } from 'react';
import {
  ParteNovedadesGuardia,
  AsignacionFuncionGuardia,
  MovilAfectadoGuardia,
  ForenseEnGuardia,
  ConfiguracionSistema,
  Personal,
  MovilPolicial,
  GrupoPersonal,
  UsuarioSistema,
  DelegacionPolicial,
} from '../../types/police';
import {
  X,
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle2,
  Stethoscope,
  Car,
  Users,
  Sparkles,
  Calendar,
  Clock,
  Building2,
  Lock,
  UserCheck,
} from 'lucide-react';
import { db } from '../../db/database';

interface ParteGuardiaModalProps {
  parte?: ParteNovedadesGuardia | null;
  personalList: Personal[];
  movilesList: MovilPolicial[];
  gruposList?: GrupoPersonal[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  delegacionesList?: DelegacionPolicial[];
  onSave: (parte: ParteNovedadesGuardia) => void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
  onClose: () => void;
}

export const ParteGuardiaModal: React.FC<ParteGuardiaModalProps> = ({
  parte,
  personalList,
  movilesList,
  gruposList = [],
  config,
  currentUser,
  delegacionesList: propDelegaciones = [],
  onSave,
  onSaveConfig,
  onClose,
}) => {
  const isEditing = Boolean(parte);

  const [delegaciones, setDelegaciones] = useState<DelegacionPolicial[]>(propDelegaciones);

  useEffect(() => {
    if (propDelegaciones.length > 0) {
      setDelegaciones(propDelegaciones);
    } else {
      db.delegaciones.toArray().then((dels) => {
        setDelegaciones(dels || []);
      }).catch(console.error);
    }
  }, [propDelegaciones]);

  // Delegación asignada al usuario o predeterminada
  const userDelegacionId = currentUser?.delegacionId || 'del-laguna-blanca';
  const puedeCambiarDelegacion = Boolean(
    currentUser?.rol === 'superusuario' ||
    currentUser?.puedeVerOtrasDelegaciones ||
    currentUser?.puedeRecargarOtrasDelegaciones
  );

  const [formData, setFormData] = useState<ParteNovedadesGuardia>(() => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const mañana = new Date();
    mañana.setDate(hoy.getDate() + 1);
    const mañanaStr = mañana.toISOString().slice(0, 10);

    if (parte) {
      return {
        ...parte,
        tipoGuardia: parte.tipoGuardia || 'Pericial - Criminalística',
        dependencia: parte.dependencia || userDelegacionId,
        fechaInicio: parte.fechaInicio || hoyStr,
        horaInicio: parte.horaInicio || '08:00',
        fechaFin: parte.fechaFin || hoyStr,
        horaFin: parte.horaFin || '14:00',
        fechaHoraDesde: parte.fechaHoraDesde || `${parte.fechaInicio || hoyStr} ${parte.horaInicio || '08:00'}:00`,
        fechaHoraHasta: parte.fechaHoraHasta || `${parte.fechaFin || hoyStr} ${parte.horaFin || '14:00'}:00`,
        racionamientoCount: parte.racionamientoCount ?? 2,
        forensesTurno: parte.forensesTurno && parte.forensesTurno.length > 0
          ? parte.forensesTurno
          : [
              {
                id: 'fg-1',
                medicoNombre: parte.forense?.medicoNombre || (config.medicosForensesCatalogo?.[0] || 'Dr. Guillermo Navarro'),
                turno: 'Guardia Noche (19:00 a 07:00 hs)',
                horaIngreso: '19:00',
                horaEgreso: '07:00',
                totalExaminados: parte.forense?.totalExaminados || 0,
                examinadosHastaHs: parte.forense?.examinadosHastaHs || '07:00 hs.',
              },
            ],
      };
    }

    return {
      id: 'parte-' + Date.now(),
      tipoGuardia: 'Brigada',
      dependencia: userDelegacionId,
      fechaHoraDesde: `${hoyStr} 08:00:00`,
      fechaHoraHasta: `${hoyStr} 14:00:00`,
      fechaInicio: hoyStr,
      horaInicio: '08:00',
      fechaFin: hoyStr,
      horaFin: '14:00',
      grupoGuardia: gruposList[0]?.nombre || config.gruposGuardia[0] || 'Guardia A',
      funcionesPersonal: (() => {
        const grpInicial = gruposList[0]?.nombre || config.gruposGuardia[0] || 'Guardia A';
        const foundGrp = gruposList.find((g) => g.nombre === grpInicial);
        const fnsDefault = config.funcionesGuardiaCatalogo || [
          'Oficial de servicio – Perito de turno',
          'Oficial de guardia – Perito de turno',
          'Chofer – Fotógrafo',
          'Servicio despeje / prevención',
        ];

        if (foundGrp && foundGrp.funcionesSugeridas && foundGrp.funcionesSugeridas.length > 0) {
          return foundGrp.funcionesSugeridas.map((fs, idx) => ({
            id: 'f-init-' + idx,
            funcion: fs.funcion,
            personalNombre: fs.personalNombre,
          }));
        }

        if (foundGrp && foundGrp.personalIds.length > 0) {
          const members = personalList.filter((p) => foundGrp.personalIds.includes(p.id));
          return members.map((m, idx) => ({
            id: 'f-init-' + idx,
            funcion: fnsDefault[idx] || 'Servicio despeje / prevención',
            personalNombre: `${m.jerarquia} ${m.apellidoYNombre}`,
          }));
        }

        return fnsDefault.slice(0, 4).map((f, i) => ({
          id: 'f-' + (i + 1),
          funcion: f,
          personalNombre: '',
        }));
      })(),
      forense: {
        medicoNombre: config.medicosForensesCatalogo?.[0] || 'Dr. Guillermo Navarro (Médico Legista Forense)',
        totalExaminados: 0,
        examinadosHastaHs: '13:00 hs.',
      },
      forensesTurno: [
        {
          id: 'fg-' + Date.now(),
          medicoNombre: config.medicosForensesCatalogo?.[0] || 'Dr. Guillermo Navarro (Médico Legista Forense)',
          turno: 'Guardia Mañana',
          horaIngreso: '08:00',
          horaEgreso: '14:00',
          totalExaminados: 0,
          examinadosHastaHs: '13:00 hs.',
        },
      ],
      movilesAfectados: movilesList.slice(0, 2).map((m) => ({
        id: 'ma-' + m.id,
        movilId: m.id,
        descripcion: `${m.nroMovilInterno} ${m.marca} ${m.modelo} (${m.dominioPatente})`,
        estado: m.estadoOperativo === 'En Servicio' ? 'En servicio' : 'Fuera de servicio',
      })),
      intervenciones: [],
      racionamientoCount: 2,
      totalIntervenciones: 0,
      cerrado: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Delegación actual seleccionada o fijada
  const selectedDelegacionId = formData.dependencia || userDelegacionId;
  const currentDelegacionObj = delegaciones.find(
    (d) => d.id === selectedDelegacionId || d.nombre === selectedDelegacionId
  ) || delegaciones[0];

  // Grupos filtrados para esta delegación
  const gruposDeEstaDelegacion = useMemo(() => {
    return gruposList.filter(
      (g) => !g.delegacionId || g.delegacionId === selectedDelegacionId
    );
  }, [gruposList, selectedDelegacionId]);

  // Grupo activo seleccionado
  const grupoSeleccionadoObj = useMemo(() => {
    return gruposList.find(
      (g) => g.nombre === formData.grupoGuardia || g.id === formData.grupoGuardia
    );
  }, [gruposList, formData.grupoGuardia]);

  // Personal perteneciente EXCLUSIVAMENTE a esa Delegación y grupo
  const personalDelegacionYGrupo = useMemo(() => {
    return personalList.filter((p) => {
      const matchDel = !p.delegacionId || p.delegacionId === selectedDelegacionId;
      if (!matchDel) return false;

      // Si hay un grupo seleccionado, verificar pertenencia
      if (grupoSeleccionadoObj) {
        return (
          grupoSeleccionadoObj.personalIds.includes(p.id) ||
          p.seccionGrupo === grupoSeleccionadoObj.nombre
        );
      }
      return true;
    });
  }, [personalList, selectedDelegacionId, grupoSeleccionadoObj]);

  // Checkbox: Posibilidad de agregar otro efectivo de otro grupo
  const [agregarDeOtroGrupo, setAgregarDeOtroGrupo] = useState(false);

  // Todo el personal para cuando el check está activo
  const personalOtrosGrupos = useMemo(() => {
    return personalList;
  }, [personalList]);

  // Asignar nueva función
  const [nuevaFuncion, setNuevaFuncion] = useState({ funcion: '', personalNombre: '' });

  const handleAddFuncion = () => {
    if (!nuevaFuncion.personalNombre.trim()) {
      alert('Seleccione un efectivo policial');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      funcionesPersonal: [
        ...prev.funcionesPersonal,
        {
          id: 'f-' + Date.now(),
          funcion: nuevaFuncion.funcion.trim() || 'Oficial de Guardia',
          personalNombre: nuevaFuncion.personalNombre.trim(),
        },
      ],
    }));
    setNuevaFuncion({ funcion: '', personalNombre: '' });
  };

  const handleRemoveFuncion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      funcionesPersonal: prev.funcionesPersonal.filter((f) => f.id !== id),
    }));
  };

  // Forenses de turno (Múltiples forenses / relevos con reloj)
  const [nuevoForense, setNuevoForense] = useState<ForenseEnGuardia>({
    id: '',
    medicoNombre: config.medicosForensesCatalogo?.[0] || '',
    turno: 'Relevo Guardia',
    horaIngreso: '14:00',
    horaEgreso: '20:00',
    totalExaminados: 0,
    examinadosHastaHs: '19:30 hs.',
  });

  const handleAddForense = () => {
    if (!nuevoForense.medicoNombre.trim()) return;
    const item: ForenseEnGuardia = {
      ...nuevoForense,
      id: 'fg-' + Date.now(),
    };
    setFormData((prev) => ({
      ...prev,
      forensesTurno: [...(prev.forensesTurno || []), item],
      forense: {
        medicoNombre: item.medicoNombre,
        totalExaminados: (prev.forensesTurno || []).reduce((acc, f) => acc + f.totalExaminados, item.totalExaminados),
        examinadosHastaHs: item.examinadosHastaHs,
      },
    }));
  };

  const handleUpdateForense = (idx: number, campo: keyof ForenseEnGuardia, valor: any) => {
    const list = [...(formData.forensesTurno || [])];
    list[idx] = { ...list[idx], [campo]: valor };
    const totalExaminadosSuma = list.reduce((acc, f) => acc + (f.totalExaminados || 0), 0);
    setFormData((prev) => ({
      ...prev,
      forensesTurno: list,
      forense: {
        medicoNombre: list[0]?.medicoNombre || prev.forense.medicoNombre,
        totalExaminados: totalExaminadosSuma,
        examinadosHastaHs: list[0]?.examinadosHastaHs || prev.forense.examinadosHastaHs,
      },
    }));
  };

  const handleRemoveForense = (idx: number) => {
    const list = [...(formData.forensesTurno || [])];
    list.splice(idx, 1);
    setFormData((prev) => ({
      ...prev,
      forensesTurno: list,
    }));
  };

  // Móviles afectados
  const [nuevoMovilDesc, setNuevoMovilDesc] = useState('');
  const handleAddMovilAfectado = () => {
    if (!nuevoMovilDesc.trim()) return;
    setFormData((prev) => ({
      ...prev,
      movilesAfectados: [
        ...prev.movilesAfectados,
        {
          id: 'ma-' + Date.now(),
          descripcion: nuevoMovilDesc.trim(),
          estado: 'En servicio',
        },
      ],
    }));
    setNuevoMovilDesc('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      fechaHoraDesde: `${formData.fechaInicio} ${formData.horaInicio}:00`,
      fechaHoraHasta: `${formData.fechaFin} ${formData.horaFin}:00`,
      totalIntervenciones: formData.intervenciones.length,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? `Editar Guardia: ${currentDelegacionObj?.nombre || formData.dependencia}` : 'Apertura de Nuevo Turno de Guardia'}
              </h2>
              <p className="text-xs text-slate-300">
                Delegación, grupo de guardia, horarios de inicio/fin con reloj y asignación de personal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Identificación de la Guardia: Delegación y Grupo */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-xs block text-slate-900 uppercase tracking-wide">
              1. Identificación del Turno, Delegación y Horarios
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Guardia *</label>
                <select
                  value={formData.tipoGuardia}
                  onChange={(e) => setFormData({ ...formData, tipoGuardia: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-blue-900"
                >
                  {(config.tiposGuardia || [
                    'Brigada',
                    'Servicios - Técnicos',
                    'Administrativa',
                    'Pericial',
                    'Prevención',
                    'Guardia de Prevención y Seguridad',
                  ]).map((tg) => (
                    <option key={tg} value={tg}>
                      {tg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cambiado por Delegación: única o marcada para el usuario */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-900" />
                    <span>Delegación *</span>
                  </span>
                  {!puedeCambiarDelegacion && (
                    <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-0.5 bg-amber-100 px-1.5 py-0.5 rounded">
                      <Lock className="w-3 h-3 text-amber-700" />
                      Asignada
                    </span>
                  )}
                </label>

                {puedeCambiarDelegacion ? (
                  <select
                    value={selectedDelegacionId}
                    onChange={(e) => setFormData({ ...formData, dependencia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                  >
                    {delegaciones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.ciudad})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 font-bold text-slate-800 flex items-center justify-between">
                    <span>{currentDelegacionObj?.nombre || selectedDelegacionId}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Grupo / Sección */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grupo / Sección *</label>
                <select
                  value={formData.grupoGuardia}
                  onChange={(e) => {
                    const nuevoGrupo = e.target.value;
                    const foundGrp = gruposList.find((g) => g.nombre === nuevoGrupo || g.id === nuevoGrupo);
                    let fns = formData.funcionesPersonal;

                    if (foundGrp && foundGrp.personalIds.length > 0) {
                      const members = personalList.filter((p) => foundGrp.personalIds.includes(p.id));
                      const fnsDefault = config.funcionesGuardiaCatalogo || [
                        'Oficial de servicio – Perito de turno',
                        'Oficial de guardia – Perito de turno',
                        'Chofer – Fotógrafo',
                        'Servicio despeje / prevención',
                      ];
                      fns = members.map((m, idx) => ({
                        id: 'f-grp-' + Date.now() + '-' + idx,
                        funcion: fnsDefault[idx] || 'Servicio despeje / prevención',
                        personalNombre: `${m.jerarquia} ${m.apellidoYNombre}`,
                      }));
                    }

                    setFormData((prev) => ({
                      ...prev,
                      grupoGuardia: nuevoGrupo,
                      funcionesPersonal: fns,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  {gruposDeEstaDelegacion.length > 0 ? (
                    gruposDeEstaDelegacion.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre} ({g.personalIds.length} efectivos)
                      </option>
                    ))
                  ) : (
                    (config.gruposGuardia || ['Guardia A', 'Guardia B', 'Guardia C']).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Fecha y Hora de Inicio y Finalización (Calendario y Reloj) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-900" />
                  <span>Inicio de Guardia (Calendario y Reloj) *</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Fecha Inicio</label>
                    <input
                      type="date"
                      required
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Hora Inicio</label>
                    <div className="relative flex items-center">
                      <input
                        type="time"
                        required
                        value={formData.horaInicio}
                        onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-900" />
                  <span>Finalización de Guardia (Calendario y Reloj) *</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Fecha Fin</label>
                    <input
                      type="date"
                      required
                      value={formData.fechaFin}
                      onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Hora Fin</label>
                    <div className="relative flex items-center">
                      <input
                        type="time"
                        required
                        value={formData.horaFin}
                        onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Personal y Funciones de la Guardia */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <span className="font-extrabold text-slate-900 tracking-tight block uppercase text-xs">
                  2. PERSONAL Y FUNCIONES DE ESTA GUARDIA ({formData.funcionesPersonal.length} ASIGNADOS)
                </span>
                <span className="text-[11px] text-slate-500">
                  Mostrando únicamente efectivos correspondientes a <strong>{currentDelegacionObj?.nombre}</strong> - Grupo <strong>{formData.grupoGuardia}</strong>.
                </span>
              </div>

              {/* Checkbox para permitir agregar efectivo de otro grupo */}
              <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-950 font-bold text-xs select-none">
                <input
                  type="checkbox"
                  checked={agregarDeOtroGrupo}
                  onChange={(e) => setAgregarDeOtroGrupo(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded"
                />
                <span>¿Agregar efectivo de otro grupo?</span>
              </label>
            </div>

            {/* Filas de Funciones asignadas */}
            <div className="space-y-2">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                <div className="col-span-6">Efectivo Policial</div>
                <div className="col-span-5">Función *</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              {formData.funcionesPersonal.map((f, idx) => (
                <div key={f.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs items-center">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      list="catalogo-efectivos-guardia-filtrado"
                      value={f.personalNombre}
                      onChange={(e) => {
                        const list = [...formData.funcionesPersonal];
                        list[idx] = { ...list[idx], personalNombre: e.target.value };
                        setFormData({ ...formData, funcionesPersonal: list });
                      }}
                      placeholder="Efectivo policial"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      list="catalogo-funciones-guardia"
                      value={f.funcion}
                      onChange={(e) => {
                        const list = [...formData.funcionesPersonal];
                        list[idx] = { ...list[idx], funcion: e.target.value };
                        setFormData({ ...formData, funcionesPersonal: list });
                      }}
                      placeholder="Función asignada"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end sm:justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveFuncion(f.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Eliminar asignación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fila para agregar nuevo efectivo y función */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 text-xs block">
                + Asignar efectivo {agregarDeOtroGrupo ? '(Todos los grupos habilitados)' : `(Exclusivo ${formData.grupoGuardia})`}:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <select
                    value={nuevaFuncion.personalNombre}
                    onChange={(e) => setNuevaFuncion({ ...nuevaFuncion, personalNombre: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="">-- Seleccionar efectivo policial --</option>
                    {(agregarDeOtroGrupo ? personalOtrosGrupos : personalDelegacionYGrupo).map((p) => (
                      <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`}>
                        {p.jerarquia} {p.apellidoYNombre} ({p.seccionGrupo || 'Sin grupo'}) - {p.plaza || 's/p'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    list="catalogo-funciones-guardia"
                    placeholder="Función (ej. Oficial de Guardia)"
                    value={nuevaFuncion.funcion}
                    onChange={(e) => setNuevaFuncion({ ...nuevaFuncion, funcion: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  />
                </div>
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddFuncion}
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold p-1.5 rounded-lg flex items-center justify-center"
                    title="Agregar efectivo a la guardia"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Datalists */}
            <datalist id="catalogo-funciones-guardia">
              {(config.funcionesGuardiaCatalogo || [
                'Oficial de servicio – Perito de turno',
                'Oficial de guardia – Perito de turno',
                'Chofer – Fotógrafo',
                'Servicio despeje / prevención',
                'Perito auxiliar en Criminalística',
                'Planímetro de turno',
                'Fotógrafo pericial',
                'Técnico de laboratorio',
              ]).map((fn, i) => (
                <option key={i} value={fn} />
              ))}
            </datalist>

            <datalist id="catalogo-efectivos-guardia-filtrado">
              {(agregarDeOtroGrupo ? personalOtrosGrupos : personalDelegacionYGrupo).map((p) => (
                <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
              ))}
            </datalist>
          </div>

          {/* 3. Forenses Policiales de Turno & Relevos con reloj */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-900" />
                <span className="font-bold text-blue-950 uppercase">
                  3. Forenses Policiales de Turno & Relevos (Carga mediante reloj)
                </span>
              </div>
            </div>

            {/* Lista de forenses de esta guardia */}
            <div className="space-y-2">
              {formData.forensesTurno?.map((f, idx) => (
                <div key={f.id || idx} className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-blue-900">
                      Forense #{idx + 1}: {f.medicoNombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveForense(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500">Médico Legista</label>
                      <input
                        type="text"
                        value={f.medicoNombre}
                        onChange={(e) => handleUpdateForense(idx, 'medicoNombre', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500">Turno</label>
                      <input
                        type="text"
                        value={f.turno}
                        onChange={(e) => handleUpdateForense(idx, 'turno', e.target.value)}
                        placeholder="Guardia Mañana / Noche"
                        className="w-full px-2 py-1 rounded border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-blue-900 font-bold">
                        Cantidad Examinados *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={f.totalExaminados}
                        onChange={(e) => handleUpdateForense(idx, 'totalExaminados', Number(e.target.value))}
                        className="w-full px-2 py-1 rounded border border-blue-400 font-mono font-bold text-blue-950 bg-blue-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-medium flex items-center gap-1 mb-0.5">
                        <Clock className="w-3 h-3 text-blue-800" />
                        <span>Hora Ingreso (Reloj):</span>
                      </span>
                      <input
                        type="time"
                        value={f.horaIngreso}
                        onChange={(e) => handleUpdateForense(idx, 'horaIngreso', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium flex items-center gap-1 mb-0.5">
                        <Clock className="w-3 h-3 text-blue-800" />
                        <span>Hora Egreso (Reloj):</span>
                      </span>
                      <input
                        type="time"
                        value={f.horaEgreso || ''}
                        onChange={(e) => handleUpdateForense(idx, 'horaEgreso', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium mb-0.5 block">Examinados hasta hs:</span>
                      <input
                        type="text"
                        value={f.examinadosHastaHs}
                        onChange={(e) => handleUpdateForense(idx, 'examinadosHastaHs', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar nuevo forense con selector de reloj */}
            <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">+ Agregar Forense / Relevo</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    list="medicos-forenses-catalogo"
                    placeholder="Nombre del médico legista..."
                    value={nuevoForense.medicoNombre}
                    onChange={(e) => setNuevoForense({ ...nuevoForense, medicoNombre: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-semibold"
                  />
                  <datalist id="medicos-forenses-catalogo">
                    {(config.medicosForensesCatalogo || ['Dr. Guillermo Navarro', 'Dra. María Elena Ramos']).map((m, i) => (
                      <option key={i} value={m} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Turno (ej. Relevo 14:00)"
                    value={nuevoForense.turno}
                    onChange={(e) => setNuevoForense({ ...nuevoForense, turno: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="time"
                    value={nuevoForense.horaIngreso}
                    onChange={(e) => setNuevoForense({ ...nuevoForense, horaIngreso: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-mono font-bold"
                    title="Hora de Ingreso (Reloj)"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="time"
                    value={nuevoForense.horaEgreso}
                    onChange={(e) => setNuevoForense({ ...nuevoForense, horaEgreso: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-mono font-bold"
                    title="Hora de Egreso (Reloj)"
                  />
                </div>

                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddForense}
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold p-1.5 rounded flex items-center justify-center cursor-pointer"
                    title="Agregar forense"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Móviles Afectados al Servicio */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-900" />
                <span>4. Móviles Afectados al Servicio de Guardia</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {formData.movilesAfectados.map((m, idx) => (
                <div key={m.id || idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">{m.descripcion}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.estado === 'En servicio' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {m.estado}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...formData.movilesAfectados];
                        updated.splice(idx, 1);
                        setFormData({ ...formData, movilesAfectados: updated });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                list="catalogo-moviles-guardia"
                placeholder="Seleccionar o agregar móvil del parque automotor..."
                value={nuevoMovilDesc}
                onChange={(e) => setNuevoMovilDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
              <datalist id="catalogo-moviles-guardia">
                {movilesList.map((m) => (
                  <option key={m.id} value={`${m.nroMovilInterno} ${m.marca} ${m.modelo} (${m.dominioPatente})`} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={handleAddMovilAfectado}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg shrink-0"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Footer Modal */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Abrir Turno de Guardia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
