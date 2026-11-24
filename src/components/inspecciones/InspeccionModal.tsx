import React, { useState, useMemo } from 'react';
import {
  InspeccionOcular,
  ConfiguracionSistema,
  Personal,
  ParteNovedadesGuardia,
  DelegacionPolicial,
  GrupoPersonal,
  UsuarioSistema,
} from '../../types/police';
import {
  X,
  Camera,
  Eye,
  Upload,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sliders,
  ShieldAlert,
  Building2,
  Users,
  Lock,
  Search,
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import {
  extractIoNumber,
  extractIoYear,
  findDuplicateIoCode,
  formatNroIO,
  getLastLoadedIoNumber,
  getNextIoNumber,
} from '../../utils/numeracionUtils';

interface InspeccionModalProps {
  inspeccion?: InspeccionOcular | null;
  existingInspecciones?: InspeccionOcular[];
  personalList?: Personal[];
  partesGuardiaList?: ParteNovedadesGuardia[];
  delegacionesList?: DelegacionPolicial[];
  gruposList?: GrupoPersonal[];
  activeDelegacionId?: string;
  currentUser?: UsuarioSistema;
  config: ConfiguracionSistema;
  onSave: (io: InspeccionOcular) => void;
  onClose: () => void;
}

export const InspeccionModal: React.FC<InspeccionModalProps> = ({
  inspeccion,
  existingInspecciones = [],
  personalList = [],
  partesGuardiaList = [],
  delegacionesList = [],
  gruposList = [],
  activeDelegacionId,
  currentUser,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(inspeccion);
  const añoActual = new Date().getFullYear();

  const puedeVerTodasDelegaciones = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.rol === 'superusuario' || currentUser.rol === 'administrador') return true;
    return Boolean(currentUser.puedeVerOtrasDelegaciones);
  }, [currentUser]);

  const delegacionFijaUsuario = !puedeVerTodasDelegaciones ? currentUser?.delegacionId || '' : '';

  const [formError, setFormError] = useState<string | null>(null);
  const [buscarOtrasGuardias, setBuscarOtrasGuardias] = useState(false);

  const [formData, setFormData] = useState<InspeccionOcular>(() => {
    const initialDelegacionId =
      delegacionFijaUsuario ||
      inspeccion?.delegacionId ||
      (activeDelegacionId && activeDelegacionId !== 'todas'
        ? activeDelegacionId
        : delegacionesList[0]?.id || 'del-laguna-blanca');

    if (inspeccion) {
      return {
        ...inspeccion,
        delegacionId: delegacionFijaUsuario || inspeccion.delegacionId || initialDelegacionId,
      };
    }

    const defaultHecho = config.hechosCriminalistica?.[0] || 'Inspección Ocular / Relevamiento en Escena';
    const nextNro = getNextIoNumber({
      inspecciones: existingInspecciones,
      partesGuardia: partesGuardiaList,
      config,
      anio: añoActual,
      delegacionId: initialDelegacionId,
    });
    const nroSugerido = formatNroIO(nextNro, añoActual);
    const defaultGrupo =
      gruposList.find((g) => !initialDelegacionId || !g.delegacionId || g.delegacionId === initialDelegacionId)?.nombre ||
      config.gruposGuardia?.[0] ||
      '';

    return {
      id: 'io-' + Date.now(),
      nroIO: nroSugerido,
      fecha: new Date().toISOString().slice(0, 10),
      hora: '10:00',
      lugar: '',
      direccion: '',
      hecho: defaultHecho,
      tipo: 'Criminalística',
      dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      expedienteVinculado: '',
      personalInterviniente: '',
      perito: '',
      fotografo: '',
      cantidadFotografias: 0,
      fotosConformeFotografo: 'Conforme relevamiento del fotógrafo de guardia',
      fotosConfirmadas: false,
      confirmadoPorUsuario: '',
      resumen: '',
      conclusiones: '',
      fotosAdjuntas: [],
      delegacionId: initialDelegacionId,
      grupoGuardia: defaultGrupo,
      grupoGuardiaId: gruposList.find((g) => g.nombre === defaultGrupo)?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const anioCampoIO = extractIoYear(formData.nroIO, añoActual);

  const ultimoLoadedIoNum = useMemo(() => {
    return getLastLoadedIoNumber({
      inspecciones: existingInspecciones,
      partesGuardia: partesGuardiaList,
      anio: anioCampoIO,
      delegacionId: formData.delegacionId,
    });
  }, [existingInspecciones, partesGuardiaList, anioCampoIO, formData.delegacionId]);

  const nextAvailableIoNum = useMemo(() => {
    return getNextIoNumber({
      inspecciones: existingInspecciones,
      partesGuardia: partesGuardiaList,
      config,
      anio: anioCampoIO,
      delegacionId: formData.delegacionId,
      excludeId: formData.id,
      excludeIntervencionId: formData.intervencionId,
    });
  }, [existingInspecciones, partesGuardiaList, config, anioCampoIO, formData.delegacionId, formData.id, formData.intervencionId]);

  const duplicateConflictCode = useMemo(() => {
    return findDuplicateIoCode(formData.nroIO, {
      inspecciones: existingInspecciones,
      partesGuardia: partesGuardiaList,
      anio: anioCampoIO,
      delegacionId: formData.delegacionId,
      excludeId: formData.id,
      excludeIntervencionId: formData.intervencionId,
    });
  }, [formData.nroIO, formData.delegacionId, formData.id, formData.intervencionId, existingInspecciones, partesGuardiaList, anioCampoIO]);

  // Grupos disponibles según delegación seleccionada
  const gruposDeDelegacion = useMemo(() => {
    const delId = formData.delegacionId;
    const matched = gruposList.filter(
      (g) => !delId || !g.delegacionId || g.delegacionId === delId
    );
    return matched;
  }, [gruposList, formData.delegacionId]);

  const nombresGruposDisponibles = useMemo(() => {
    const names = new Set<string>();
    gruposDeDelegacion.forEach((g) => names.add(g.nombre));
    if (names.size === 0) {
      (config.gruposGuardia || []).forEach((name) => names.add(name));
    }
    return Array.from(names);
  }, [gruposDeDelegacion, config.gruposGuardia]);

  // Personal de la delegación seleccionada (para usuario con delegación restringida solo ve los de su delegación)
  const personalDeDelegacion = useMemo(() => {
    const delId = delegacionFijaUsuario || formData.delegacionId;
    if (!delId) return personalList;
    const filtered = personalList.filter((p) => !p.delegacionId || p.delegacionId === delId);
    return filtered;
  }, [personalList, delegacionFijaUsuario, formData.delegacionId]);

  // Personal específico de la guardia / grupo seleccionado
  const personalDeGuardiaSeleccionada = useMemo(() => {
    const selectedGrupoName = (formData.grupoGuardia || '').trim().toLowerCase();
    const grupoObj = gruposDeDelegacion.find(
      (g) =>
        (formData.grupoGuardiaId && g.id === formData.grupoGuardiaId) ||
        (selectedGrupoName && g.nombre.toLowerCase() === selectedGrupoName)
    );

    const list: Array<{ id: string; label: string; rolSugerido?: string }> = [];
    const seen = new Set<string>();

    // 1. Integrantes configurados en GrupoPersonal
    if (grupoObj) {
      (grupoObj.personalIds || []).forEach((pid) => {
        const p = personalDeDelegacion.find((item) => item.id === pid);
        if (p) {
          const full = `${p.jerarquia} ${p.apellidoYNombre}`.trim();
          if (!seen.has(full.toLowerCase())) {
            seen.add(full.toLowerCase());
            list.push({ id: p.id, label: full, rolSugerido: p.seccionGrupo || undefined });
          }
        }
      });
    }

    // 2. Personal que coincida por seccionGrupo con el grupo de guardia
    if (selectedGrupoName) {
      personalDeDelegacion.forEach((p) => {
        if ((p.seccionGrupo || '').trim().toLowerCase() === selectedGrupoName) {
          const full = `${p.jerarquia} ${p.apellidoYNombre}`.trim();
          if (!seen.has(full.toLowerCase())) {
            seen.add(full.toLowerCase());
            list.push({ id: p.id, label: full, rolSugerido: p.seccionGrupo || undefined });
          }
        }
      });
    }

    // 3. Funciones cargadas en Partes de Guardia del mismo grupo y delegación
    partesGuardiaList.forEach((parte) => {
      if (formData.delegacionId && parte.delegacionId && parte.delegacionId !== formData.delegacionId) {
        return;
      }
      const sameGroup =
        !selectedGrupoName ||
        (parte.grupoGuardia || '').toLowerCase().includes(selectedGrupoName) ||
        selectedGrupoName.includes((parte.grupoGuardia || '').toLowerCase());
      if (!sameGroup) return;

      parte.funcionesPersonal?.forEach((f, idx) => {
        const name = f.personalNombre?.trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ id: `pg-${parte.id}-${idx}`, label: name, rolSugerido: f.funcion });
        }
      });
    });

    return list;
  }, [gruposDeDelegacion, formData.grupoGuardia, formData.grupoGuardiaId, formData.delegacionId, personalDeDelegacion, partesGuardiaList]);

  // Opciones para los SearchableSelect (Perito y Fotógrafo):
  // Muestra primero personal del grupo de guardia seleccionado; si se habilita "Buscar otra guardia", incluye todas las guardias y nómina de la delegación.
  const personalOptions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    // Siempre incluir al personal de la guardia seleccionada primero
    personalDeGuardiaSeleccionada.forEach((p) => {
      if (!seen.has(p.label.toLowerCase())) {
        seen.add(p.label.toLowerCase());
        list.push(p.label);
      }
    });

    // Si no hay grupo seleccionado o se habilitó búsqueda en otra guardia / nómina general
    if (buscarOtrasGuardias || !formData.grupoGuardia) {
      partesGuardiaList.forEach((parte) => {
        if (delegacionFijaUsuario && parte.delegacionId && parte.delegacionId !== delegacionFijaUsuario) {
          return;
        }
        parte.funcionesPersonal?.forEach((f) => {
          const name = f.personalNombre?.trim();
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            list.push(`${name} [Guardia: ${parte.grupoGuardia}]`);
          }
        });
      });

      const poolBase = puedeVerTodasDelegaciones && buscarOtrasGuardias ? personalList : personalDeDelegacion;
      poolBase.forEach((p) => {
        const full = `${p.jerarquia} ${p.apellidoYNombre}`.trim();
        if (!seen.has(full.toLowerCase())) {
          seen.add(full.toLowerCase());
          const grupoTag = p.seccionGrupo ? ` (${p.seccionGrupo})` : '';
          list.push(`${full}${grupoTag}`);
        }
      });
    }

    return list;
  }, [
    personalDeGuardiaSeleccionada,
    buscarOtrasGuardias,
    formData.grupoGuardia,
    partesGuardiaList,
    delegacionFijaUsuario,
    puedeVerTodasDelegaciones,
    personalList,
    personalDeDelegacion,
  ]);

  // Usuario confirmador automático desde el usuario autenticado
  const nombreConfirmadorAutomatico = useMemo(() => {
    if (!currentUser) return 'Supervisor de Turno';
    return `${currentUser.apellidoYNombre || currentUser.username}${
      currentUser.rol ? ` (${currentUser.rol.toUpperCase()})` : ''
    }`;
  }, [currentUser]);

  const [previewPhotoState, setPreviewPhotoState] = useState<{
    isOpen: boolean;
    index: number;
  }>({ isOpen: false, index: 0 });
  const [editorPhotoIdx, setEditorPhotoIdx] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFormData((prev: InspeccionOcular) => {
          const updatedFotos = [...(prev.fotosAdjuntas || []), dataUrl];
          return {
            ...prev,
            fotosAdjuntas: updatedFotos,
            cantidadFotografias: updatedFotos.length,
            fotosConformeFotografo: `${updatedFotos.length} tomas fotográficas conforme fotógrafo`,
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setFormData((prev: InspeccionOcular) => {
      const list = [...(prev.fotosAdjuntas || [])];
      list.splice(idx, 1);
      return {
        ...prev,
        fotosAdjuntas: list,
        cantidadFotografias: list.length,
        fotosConformeFotografo: `${list.length} tomas fotográficas conforme fotógrafo`,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const direccionFinal = formData.direccion?.trim() || formData.lugar?.trim();
    if (!formData.nroIO.trim() || !direccionFinal) {
      setFormError('Debe completar el N° de I.O. y la Dirección (Lugar de ocurrido).');
      return;
    }
    if (extractIoNumber(formData.nroIO) <= 0) {
      setFormError('El N° de I.O. debe incluir un número correlativo válido (ej. I.O. Nº 001/2026).');
      return;
    }
    if (duplicateConflictCode) {
      setFormError(
        `El número ingresado repite una Inspección Ocular existente (${duplicateConflictCode}). Las I.O. deben ser correlativas y no pueden repetirse. Próximo disponible: ${formatNroIO(nextAvailableIoNum, anioCampoIO)}.`
      );
      return;
    }

    if (formData.involucraPersonalPolicial) {
      if (
        !formData.personalPolicial?.apellidoYNombre?.trim() ||
        !formData.personalPolicial?.plaza?.trim() ||
        !formData.personalPolicial?.jerarquia?.trim()
      ) {
        setFormError(
          'Al indicar que la Inspección Ocular involucra Personal Policial, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }

    onSave({
      ...formData,
      delegacionId: delegacionFijaUsuario || formData.delegacionId,
      lugar: direccionFinal,
      direccion: direccionFinal,
      confirmadoPorUsuario: formData.fotosConfirmadas
        ? formData.confirmadoPorUsuario?.trim() || nombreConfirmadorAutomatico
        : '',
      personalInterviniente:
        [
          formData.perito ? `Perito: ${formData.perito}` : '',
          formData.fotografo ? `Fotógrafo: ${formData.fotografo}` : '',
        ]
          .filter(Boolean)
          .join(' - ') ||
        formData.personalInterviniente ||
        'Personal Técnico Criminalística',
      updatedAt: new Date().toISOString(),
    });
  };

  const delegacionActualObj = delegacionesList.find((d) => d.id === formData.delegacionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? `Editar ${formData.nroIO}` : 'Nueva Inspección Ocular (I.O.)'}
              </h2>
              <p className="text-xs text-slate-300">
                Registro oficial pericial con asignación de Delegación, Grupo de Guardia y validación por usuario
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Delegación y Grupo de Guardia */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-900" />
                <span>Jurisdicción y Grupo de Guardia Interviniente</span>
              </span>
              {!puedeVerTodasDelegaciones && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                  <Lock className="w-3 h-3" />
                  <span>Delegación asignada a su usuario</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delegación Policial *</label>
                {puedeVerTodasDelegaciones ? (
                  <select
                    value={formData.delegacionId || ''}
                    onChange={(e) => {
                      const newDelId = e.target.value;
                      const firstGrupo = gruposList.find((g) => !g.delegacionId || g.delegacionId === newDelId);
                      setFormData({
                        ...formData,
                        delegacionId: newDelId,
                        grupoGuardia: firstGrupo?.nombre || '',
                        grupoGuardiaId: firstGrupo?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                  >
                    {delegacionesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.siglas})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 font-bold text-slate-800 flex items-center justify-between">
                    <span>{delegacionActualObj ? `${delegacionActualObj.nombre} (${delegacionActualObj.siglas})` : formData.delegacionId}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grupo de Guardia</label>
                <select
                  value={formData.grupoGuardia || ''}
                  onChange={(e) => {
                    const nombreSel = e.target.value;
                    const gObj = gruposDeDelegacion.find((g) => g.nombre === nombreSel);
                    setFormData({
                      ...formData,
                      grupoGuardia: nombreSel,
                      grupoGuardiaId: gObj?.id || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-blue-950"
                >
                  <option value="">-- Todos los Grupos / Sin especificar --</option>
                  {nombresGruposDisponibles.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vista rápida de efectivos del Grupo de Guardia seleccionado */}
            {formData.grupoGuardia && (
              <div className="p-2.5 bg-white rounded-lg border border-blue-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      Personal del grupo &ldquo;{formData.grupoGuardia}&rdquo; ({personalDeGuardiaSeleccionada.length}):
                    </span>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-blue-800 select-none">
                    <input
                      type="checkbox"
                      checked={buscarOtrasGuardias}
                      onChange={(e) => setBuscarOtrasGuardias(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-900 rounded border-slate-300"
                    />
                    <Search className="w-3 h-3" />
                    <span>Habilitar búsqueda en otra guardia / nómina</span>
                  </label>
                </div>

                {personalDeGuardiaSeleccionada.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No hay efectivos asignados en este grupo aún. Active &ldquo;Habilitar búsqueda en otra guardia&rdquo; o escriba manualmente abajo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {personalDeGuardiaSeleccionada.map((ef) => (
                      <div
                        key={ef.id}
                        className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <span className="font-semibold text-slate-800">{ef.label}</span>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, perito: ef.label }))}
                          className="px-1.5 py-0.5 rounded bg-blue-900 hover:bg-blue-950 text-white text-[9px] font-bold cursor-pointer"
                          title="Asignar como Perito"
                        >
                          Perito
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, fotografo: ef.label }))}
                          className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-900 text-white text-[9px] font-bold cursor-pointer"
                          title="Asignar como Fotógrafo"
                        >
                          Fotóg.
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* N° I.O y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <label className="font-semibold text-slate-700">
                  N° I.O (Inspección Ocular) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      nroIO: formatNroIO(nextAvailableIoNum, anioCampoIO),
                    })
                  }
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                  title="Asignar correlativo siguiente al último cargado"
                >
                  Tomar último (+1)
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.nroIO}
                onChange={(e) => setFormData({ ...formData, nroIO: e.target.value })}
                placeholder="Ej. I.O. Nº 045/2026"
                className={`w-full px-3 py-2 rounded-lg border bg-white font-mono font-bold focus:ring-2 focus:outline-none ${
                  duplicateConflictCode
                    ? 'border-red-500 text-red-900 focus:ring-red-500'
                    : 'border-slate-300 text-blue-900 focus:ring-blue-600'
                }`}
              />
              {duplicateConflictCode ? (
                <p className="text-[10px] text-red-600 font-semibold mt-1">
                  Número ya existente ({duplicateConflictCode}). No se permiten repetidos.
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1">
                  Último cargado: <strong className="font-mono text-slate-700">#{String(ultimoLoadedIoNum).padStart(3, '0')}</strong> • Sugerido: <strong className="font-mono text-blue-800">#{String(nextAvailableIoNum).padStart(3, '0')}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hora de Intervención</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {/* Dirección (Lugar de Ocurrido) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección (Lugar de Ocurrido) *
            </label>
            <input
              type="text"
              required
              value={formData.direccion || formData.lugar}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value, lugar: e.target.value })
              }
              placeholder="Ej. Av. 25 de Mayo Nº 1450 entre Moreno y Rivadavia"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Hecho y Dependencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hecho (Tipificación / Causa) *
              </label>
              <input
                type="text"
                required
                list="lista-hechos-io"
                value={formData.hecho || ''}
                onChange={(e) => setFormData({ ...formData, hecho: e.target.value })}
                placeholder="Seleccione o escriba el hecho (ej. Robo, Homicidio, Siniestro Vial)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              />
              <datalist id="lista-hechos-io">
                {(config.hechosCriminalistica || []).map((h: string) => (
                  <option key={h} value={h} />
                ))}
                {(config.hechosAccidentologia || []).map((h: string) => (
                  <option key={h} value={h} />
                ))}
                <option value="Homicidio en Ocasión de Robo" />
                <option value="Suicidio / Muerte Dudosa" />
                <option value="Robo con Violencia en las Personas" />
                <option value="Siniestro Vial con Lesionados Graves" />
                <option value="Siniestro Vial con Víctima Fatal" />
                <option value="Hallazgo de Cadáver" />
                <option value="Incendio y Explosión de Inmueble" />
                <option value="Abuso de Arma de Fuego" />
              </datalist>
            </div>

            <div>
              <SearchableSelect
                label="Dependencia Solicitante"
                value={formData.dependenciaSolicitante}
                onChange={(val) => setFormData({ ...formData, dependenciaSolicitante: val })}
                options={config.dependenciasPoliciales}
                placeholder="Buscar o escribir dependencia..."
                allowCustom={true}
              />
            </div>
          </div>

          {/* Perito y Fotógrafo */}
          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-950 text-[11px]">
                Personal Técnico Interviniente {formData.grupoGuardia && !buscarOtrasGuardias ? `(Guardia: ${formData.grupoGuardia})` : '(Todas las Guardias / Nómina)'}
              </span>
              {!formData.grupoGuardia && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-blue-800 select-none">
                  <input
                    type="checkbox"
                    checked={buscarOtrasGuardias}
                    onChange={(e) => setBuscarOtrasGuardias(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-900 rounded border-slate-300"
                  />
                  <span>Incluir personal de otra guardia / delegación</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <SearchableSelect
                  label="Perito Interviniente *"
                  value={formData.perito || ''}
                  onChange={(val) => setFormData({ ...formData, perito: val })}
                  options={personalOptions}
                  placeholder="Buscar o ingresar Perito..."
                  allowCustom={true}
                  required
                />
              </div>

              <div>
                <SearchableSelect
                  label="Fotógrafo Interviniente *"
                  value={formData.fotografo || ''}
                  onChange={(val) => setFormData({ ...formData, fotografo: val })}
                  options={personalOptions}
                  placeholder="Buscar o ingresar Fotógrafo..."
                  allowCustom={true}
                  required
                />
              </div>
            </div>
          </div>

          {/* Fotos (conforme fotógrafo) y confirmación automática por usuario */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-slate-900">
                  Fotos (Conforme Fotógrafo) y Confirmación de Usuario
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Requerido por protocolo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fotos (Conforme Fotógrafo - Detalle/Cantidad)
                </label>
                <input
                  type="text"
                  value={formData.fotosConformeFotografo || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fotosConformeFotografo: e.target.value })
                  }
                  placeholder="Ej. 18 tomas fotográficas conforme fotógrafo de turno"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cantidad de Tomas Fotográficas
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cantidadFotografias || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, cantidadFotografias: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Confirmación automática por checkbox vinculado al usuario actual */}
            <div className="p-3 bg-white rounded-lg border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="confirm-fotos" className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-800 select-none">
                <input
                  type="checkbox"
                  id="confirm-fotos"
                  checked={Boolean(formData.fotosConfirmadas)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      fotosConfirmadas: checked,
                      confirmadoPorUsuario: checked ? nombreConfirmadorAutomatico : '',
                    });
                  }}
                  className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-600 cursor-pointer"
                />
                <span>Fotos confirmadas y verificadas por otro usuario / supervisor</span>
              </label>

              {formData.fotosConfirmadas ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Confirmado por: {formData.confirmadoPorUsuario || nombreConfirmadorAutomatico}</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic shrink-0">
                  Al tildar se registrará su usuario: <strong className="text-slate-700">{nombreConfirmadorAutomatico}</strong>
                </span>
              )}
            </div>
          </div>

          {/* HECHO CON PERSONAL POLICIAL INVOLUCRADO */}
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2.5 shadow-2xs">
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
                <span>¿Es una Inspección Ocular con Personal Policial involucrado?</span>
              </span>
            </label>

            {formData.involucraPersonalPolicial && (
              <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-3">
                <div className="text-[11px] text-amber-900 font-medium">
                  Indique los datos obligatorios del efectivo policial (Jerarquía, Plaza, Apellido y Nombre):
                </div>

                {personalDeDelegacion.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Seleccionar desde Nómina Policial (Opcional para autocompletar):
                    </label>
                    <select
                      onChange={(e) => {
                        const p = personalDeDelegacion.find((item) => item.id === e.target.value);
                        if (p) {
                          setFormData({
                            ...formData,
                            personalPolicial: {
                              ...formData.personalPolicial,
                              jerarquia: p.jerarquia,
                              plaza: p.plaza || '',
                              apellidoYNombre: p.apellidoYNombre,
                              dni: p.dni,
                              rol: formData.personalPolicial?.rol || 'Imputado',
                              dependenciaRevista: p.seccionGrupo || '',
                            },
                          });
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50"
                    >
                      <option value="">-- Seleccionar efectivo de la nómina --</option>
                      {personalDeDelegacion.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} {p.apellidoYNombre} (Plaza: {p.plaza || 's/p'}) - DNI {p.dni}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Condición / Rol en el Hecho</label>
                    <input
                      type="text"
                      list="lista-condiciones-policiales-io"
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
                    <datalist id="lista-condiciones-policiales-io">
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
                      placeholder="Ej. Comisaría Laguna Blanca / Destacamento"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen / Conclusiones opcionales */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Síntesis del Relevamiento / Observaciones Técnicas
            </label>
            <textarea
              rows={2}
              value={formData.resumen}
              onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
              placeholder="Detalle del relevamiento criminalístico efectuado en el lugar..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* Adjuntar Fotografías Opcionales */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Archivos de Fotografía Digital ({formData.fotosAdjuntas?.length || 0})
              </span>
              <label className="bg-blue-900 hover:bg-blue-950 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Adjuntar Imágenes</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {formData.fotosAdjuntas && formData.fotosAdjuntas.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
                {formData.fotosAdjuntas.map((foto: string, idx: number) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg border border-slate-300 overflow-hidden group shadow-xs"
                  >
                    <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 text-white flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoState({ isOpen: true, index: idx })}
                        className="p-1 bg-white/20 hover:bg-white/40 rounded cursor-pointer"
                        title="Vista preliminar con zoom"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorPhotoIdx(idx)}
                        className="p-1 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                        title="Editar foto (recortar, brillo, contraste)"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <span>Guardar Inspección Ocular</span>
            </button>
          </div>
        </form>
      </div>

      {/* Editor Modal de Fotos de Inspección Ocular */}
      {editorPhotoIdx !== null && formData.fotosAdjuntas && formData.fotosAdjuntas[editorPhotoIdx] && (
        <ImageEditorModal
          isOpen={editorPhotoIdx !== null}
          imageSrc={formData.fotosAdjuntas[editorPhotoIdx]}
          title={`Editor de Foto Nº ${editorPhotoIdx + 1} - ${formData.nroIO}`}
          onSave={(editedUrl) => {
            setFormData((prev: InspeccionOcular) => {
              const updated = [...(prev.fotosAdjuntas || [])];
              updated[editorPhotoIdx] = editedUrl;
              return { ...prev, fotosAdjuntas: updated };
            });
            setEditorPhotoIdx(null);
          }}
          onClose={() => setEditorPhotoIdx(null)}
        />
      )}

      {/* Visor Preliminar de Fotos con Zoom */}
      <FilePreviewModal
        isOpen={previewPhotoState.isOpen}
        file={
          (formData.fotosAdjuntas || [])[previewPhotoState.index]
            ? {
                id: `io-foto-${previewPhotoState.index}`,
                nombre: `Foto ${previewPhotoState.index + 1} — ${formData.nroIO}`,
                dataUrl: formData.fotosAdjuntas![previewPhotoState.index],
              }
            : null
        }
        files={(formData.fotosAdjuntas || []).map(
          (url: string, idx: number): PreviewAttachmentItem => ({
            id: `io-foto-${idx}`,
            nombre: `Foto ${idx + 1} — ${formData.nroIO}`,
            dataUrl: url,
          })
        )}
        initialIndex={previewPhotoState.index}
        onClose={() => setPreviewPhotoState({ isOpen: false, index: 0 })}
      />
    </div>
  );
};
