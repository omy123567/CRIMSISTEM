import React, { useState, useEffect, useMemo } from 'react';
import {
  ActaCambioJefe,
  ActaCambioJefeItemSnapshot,
  AdjuntoArchivo,
  CasoFaltaOficio,
  ConfiguracionSistema,
  EstadoActaCambioJefe,
  EstadoRecepcionActaItem,
  ExpedienteJudicial,
  InventarioBien,
  MovilPolicial,
  Personal,
  PersonaActaAutoridad,
  SerieNumerario,
  SituacionOperativaActa,
  TipoCambioJefe,
} from '../../types/police';
import { processUploadedMemoFile, formatFileSizeBytes } from '../../utils/documentExtractUtils';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import {
  X,
  Save,
  FileSignature,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Paperclip,
  Upload,
  Eye,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

const TIPOS_CAMBIO_JEFE: TipoCambioJefe[] = [
  'Cambio de Jefatura Titular',
  'Relevo Interino / Licencia',
  'Entrega Parcial / Auditoría',
  'Apertura de Inventario',
];

const ESTADOS_ACTA: EstadoActaCambioJefe[] = [
  'Borrador / En Preparación',
  'Cerrada y Firmada',
  'Anulada',
];

interface ActaCambioJefeModalProps {
  isOpen: boolean;
  editingItem: ActaCambioJefe | null;
  actasExistentes: ActaCambioJefe[];
  bienesList: InventarioBien[];
  personalList: Personal[];
  movilesList: MovilPolicial[];
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  seriesNumerarioList: SerieNumerario[];
  config: ConfiguracionSistema;
  activeDelegacionId: string;
  delegacionNombre?: string;
  usuarioRegistro?: string;
  onSave: (acta: ActaCambioJefe) => Promise<void> | void;
  onClose: () => void;
}

function getNextActaNumber(actas: ActaCambioJefe[]): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const a of actas) {
    const match = String(a.nroActa || '').match(/(\d+)\s*\/\s*\d{4}/) || String(a.nroActa || '').match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `ACTA N° ${String(maxNum + 1).padStart(3, '0')}/${year}`;
}

function mapBienToSnapshot(b: InventarioBien): ActaCambioJefeItemSnapshot {
  const marcaSerie = [b.marcaModelo, b.nroSerie ? `S/N: ${b.nroSerie}` : ''].filter(Boolean).join(' · ');
  return {
    bienId: b.id,
    nroInventario: b.nroInventario,
    categoria: b.categoria,
    denominacion: b.denominacion,
    marcaModeloSerie: marcaSerie || undefined,
    cantidad: b.cantidad || 1,
    unidad: b.unidad || 'Unidad',
    estadoConservacion: b.estadoConservacion,
    ubicacionSector: b.ubicacionSector,
    estadoRecepcion: 'Conforme',
    observacion: '',
  };
}

export const ActaCambioJefeModal: React.FC<ActaCambioJefeModalProps> = ({
  isOpen,
  editingItem,
  actasExistentes,
  bienesList,
  personalList,
  movilesList,
  expedientesList,
  casosFaltaOficioList,
  seriesNumerarioList,
  config,
  activeDelegacionId,
  delegacionNombre,
  usuarioRegistro,
  onSave,
  onClose,
}) => {
  const now = new Date();
  const todayYmd = now.toISOString().slice(0, 10);
  const currentHm = now.toTimeString().slice(0, 5);

  const computeLiveSituacion = (): SituacionOperativaActa => {
    const efectivosActivos = personalList.filter((p) => p.estado === 'Activo').length;
    const efectivosLicencia = personalList.filter(
      (p) => p.estado === 'Licencia Médica' || p.estado === 'Licencia Anual'
    ).length;
    const movilesOperativos = movilesList.filter((m) => m.estadoOperativo === 'En Servicio').length;
    const movilesTallerFueraServicio = movilesList.filter(
      (m) => m.estadoOperativo !== 'En Servicio'
    ).length;
    const expedientesPendientes = expedientesList.filter(
      (e) => e.estadoEntrega !== 'Entregado'
    ).length;
    const casosFaltaOficioPendientes = casosFaltaOficioList.filter(
      (c) => c.estado === 'Pendiente'
    ).length;
    const librosFoliosActivos = seriesNumerarioList.length;

    return {
      efectivosActivos,
      efectivosLicencia,
      movilesOperativos,
      movilesTallerFueraServicio,
      expedientesPendientes,
      casosFaltaOficioPendientes,
      librosFoliosActivos,
      llavesSellosYValores:
        'Juego completo de llaves de dependencia, sello oficial de Jefatura/Dependencia y libros reglamentarios vigentes.',
    };
  };

  const [nroActa, setNroActa] = useState('');
  const [fecha, setFecha] = useState(todayYmd);
  const [hora, setHora] = useState(currentHm);
  const [tipoCambio, setTipoCambio] = useState<string>(TIPOS_CAMBIO_JEFE[0]);
  const [estado, setEstado] = useState<string>('Borrador / En Preparación');
  const [dependenciaNombre, setDependenciaNombre] = useState('');

  const [jefeSaliente, setJefeSaliente] = useState<PersonaActaAutoridad>({
    jerarquia: '',
    apellidoYNombre: '',
    dni: '',
    cargo: 'Jefe de Dependencia Saliente',
  });
  const [jefeEntrante, setJefeEntrante] = useState<PersonaActaAutoridad>({
    jerarquia: '',
    apellidoYNombre: '',
    dni: '',
    cargo: 'Jefe de Dependencia Entrante',
  });

  const [situacionOperativa, setSituacionOperativa] = useState<SituacionOperativaActa>(computeLiveSituacion);
  const [itemsVerificados, setItemsVerificados] = useState<ActaCambioJefeItemSnapshot[]>([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [adjuntos, setAdjuntos] = useState<AdjuntoArchivo[]>([]);

  const [itemSearch, setItemSearch] = useState('');
  const [itemEstadoFilter, setItemEstadoFilter] = useState<'todos' | EstadoRecepcionActaItem>('todos');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [previewGallery, setPreviewGallery] = useState<{
    isOpen: boolean;
    files: PreviewAttachmentItem[];
    initialIndex: number;
  }>({ isOpen: false, files: [], initialIndex: 0 });

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setItemSearch('');
    setItemEstadoFilter('todos');

    if (editingItem) {
      setNroActa(editingItem.nroActa || '');
      setFecha(editingItem.fecha || todayYmd);
      setHora(editingItem.hora || currentHm);
      setTipoCambio(editingItem.tipoCambio || TIPOS_CAMBIO_JEFE[0]);
      setEstado(editingItem.estado || 'Borrador / En Preparación');
      setDependenciaNombre(
        editingItem.dependenciaNombre || delegacionNombre || config.dependencia || ''
      );
      setJefeSaliente(
        editingItem.jefeSaliente || {
          jerarquia: '',
          apellidoYNombre: '',
          dni: '',
          cargo: 'Jefe Saliente',
        }
      );
      setJefeEntrante(
        editingItem.jefeEntrante || {
          jerarquia: '',
          apellidoYNombre: '',
          dni: '',
          cargo: 'Jefe Entrante',
        }
      );
      setSituacionOperativa(editingItem.situacionOperativa || computeLiveSituacion());
      setItemsVerificados(
        Array.isArray(editingItem.itemsVerificados) ? editingItem.itemsVerificados : []
      );
      setObservacionesGenerales(editingItem.observacionesGenerales || '');
      setAdjuntos(Array.isArray(editingItem.adjuntos) ? editingItem.adjuntos : []);
    } else {
      setNroActa(getNextActaNumber(actasExistentes));
      setFecha(todayYmd);
      setHora(currentHm);
      setTipoCambio(TIPOS_CAMBIO_JEFE[0]);
      setEstado('Borrador / En Preparación');
      setDependenciaNombre(delegacionNombre || config.dependencia || '');
      setJefeSaliente({
        jerarquia: '',
        apellidoYNombre: '',
        dni: '',
        cargo: 'Jefe de Dependencia Saliente',
      });
      setJefeEntrante({
        jerarquia: '',
        apellidoYNombre: '',
        dni: '',
        cargo: 'Jefe de Dependencia Entrante',
      });
      setSituacionOperativa(computeLiveSituacion());
      const activeBienes = (bienesList || []).filter(
        (b) => b.situacionPatrimonial !== 'Baja Patrimonial'
      );
      setItemsVerificados(activeBienes.map(mapBienToSnapshot));
      setObservacionesGenerales('');
      setAdjuntos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingItem]);

  const personalOptions: SearchableOption[] = useMemo(() => {
    return (personalList || []).map((p) => {
      const label = `${p.jerarquia ? `${p.jerarquia} ` : ''}${p.apellidoYNombre}`.trim();
      return {
        value: label,
        label,
        sublabel: `DNI ${p.dni || '-'}${p.seccionGrupo ? ` · ${p.seccionGrupo}` : ''}`,
        badge: p.estado,
      };
    });
  }, [personalList]);

  const applyPersonalSelect = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<PersonaActaAutoridad>>
  ) => {
    const match = personalList.find(
      (p) =>
        `${p.jerarquia ? `${p.jerarquia} ` : ''}${p.apellidoYNombre}`.trim().toLowerCase() ===
        val.trim().toLowerCase()
    );
    if (match) {
      setter((prev) => ({
        ...prev,
        personalId: match.id,
        jerarquia: match.jerarquia || prev.jerarquia,
        apellidoYNombre: match.apellidoYNombre,
        dni: match.dni || prev.dni,
      }));
    } else {
      setter((prev) => ({
        ...prev,
        personalId: undefined,
        apellidoYNombre: val,
      }));
    }
  };

  const handleSincronizarBienes = () => {
    const existingByBienId = new Map(itemsVerificados.map((it) => [it.bienId, it]));
    const activeBienes = (bienesList || []).filter(
      (b) => b.situacionPatrimonial !== 'Baja Patrimonial'
    );
    const merged: ActaCambioJefeItemSnapshot[] = activeBienes.map((b) => {
      const prev = existingByBienId.get(b.id);
      const fresh = mapBienToSnapshot(b);
      if (prev) {
        return {
          ...fresh,
          estadoRecepcion: prev.estadoRecepcion,
          observacion: prev.observacion,
        };
      }
      return fresh;
    });
    setItemsVerificados(merged);
  };

  const handleMarcarTodosConforme = () => {
    setItemsVerificados((prev) =>
      prev.map((it) => ({ ...it, estadoRecepcion: 'Conforme' }))
    );
  };

  const updateItemChecklist = (
    bienId: string,
    patch: Partial<ActaCambioJefeItemSnapshot>
  ) => {
    setItemsVerificados((prev) =>
      prev.map((it) => (it.bienId === bienId ? { ...it, ...patch } : it))
    );
  };

  const checklistSummary = useMemo(() => {
    let conformes = 0;
    let observados = 0;
    let faltantes = 0;
    for (const it of itemsVerificados) {
      if (it.estadoRecepcion === 'Conforme') conformes++;
      else if (it.estadoRecepcion === 'Con Observación') observados++;
      else if (it.estadoRecepcion === 'Faltante') faltantes++;
    }
    return {
      total: itemsVerificados.length,
      conformes,
      observados,
      faltantes,
    };
  }, [itemsVerificados]);

  const filteredItemsChecklist = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return itemsVerificados.filter((it) => {
      if (itemEstadoFilter !== 'todos' && it.estadoRecepcion !== itemEstadoFilter) return false;
      if (!q) return true;
      return (
        (it.nroInventario || '').toLowerCase().includes(q) ||
        (it.denominacion || '').toLowerCase().includes(q) ||
        (it.categoria || '').toLowerCase().includes(q) ||
        (it.ubicacionSector || '').toLowerCase().includes(q) ||
        (it.marcaModeloSerie || '').toLowerCase().includes(q)
      );
    });
  }, [itemsVerificados, itemSearch, itemEstadoFilter]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const added: AdjuntoArchivo[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 12 * 1024 * 1024) {
        setErrorMsg(`El archivo "${file.name}" supera los 12 MB.`);
        continue;
      }
      try {
        const processed = await processUploadedMemoFile(file);
        if (!processed.dataUrl) continue;
        added.push({
          id: `adj-acta-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          nombre: processed.nombre || file.name,
          tipo: processed.mimeType || file.type || 'application/octet-stream',
          dataUrl: processed.dataUrl,
          tamanoBytes: processed.tamanoBytes || file.size,
          fecha: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error adjuntando archivo en acta:', err);
      }
    }

    if (added.length > 0) {
      setAdjuntos((prev) => [...prev, ...added]);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nroActa.trim()) {
      setErrorMsg('Debe indicar el número de Acta.');
      return;
    }
    if (!jefeSaliente.apellidoYNombre.trim()) {
      setErrorMsg('Debe consignar los datos del Jefe / Responsable Saliente.');
      return;
    }
    if (!jefeEntrante.apellidoYNombre.trim()) {
      setErrorMsg('Debe consignar los datos del Jefe / Responsable Entrante.');
      return;
    }

    const nowIso = new Date().toISOString();
    const record: ActaCambioJefe = {
      id: editingItem?.id || `acta-jefe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nroActa: nroActa.trim().toUpperCase(),
      fecha: fecha || todayYmd,
      hora: hora || currentHm,
      tipoCambio,
      estado,
      dependenciaNombre: dependenciaNombre.trim() || config.dependencia || 'Dependencia Policial',
      jefeSaliente: {
        ...jefeSaliente,
        jerarquia: jefeSaliente.jerarquia.trim(),
        apellidoYNombre: jefeSaliente.apellidoYNombre.trim(),
        dni: jefeSaliente.dni?.trim() || undefined,
      },
      jefeEntrante: {
        ...jefeEntrante,
        jerarquia: jefeEntrante.jerarquia.trim(),
        apellidoYNombre: jefeEntrante.apellidoYNombre.trim(),
        dni: jefeEntrante.dni?.trim() || undefined,
      },
      situacionOperativa,
      itemsVerificados,
      totalBienesActa: checklistSummary.total,
      totalConformes: checklistSummary.conformes,
      totalObservados: checklistSummary.observados,
      totalFaltantes: checklistSummary.faltantes,
      observacionesGenerales: observacionesGenerales.trim() || undefined,
      adjuntos,
      delegacionId: editingItem?.delegacionId || activeDelegacionId,
      delegacionNombre: editingItem?.delegacionNombre || delegacionNombre,
      creadoPorUsuario: editingItem?.creadoPorUsuario || usuarioRegistro,
      fechaCierre:
        estado === 'Cerrada y Firmada'
          ? editingItem?.fechaCierre || nowIso
          : editingItem?.fechaCierre,
      createdAt: editingItem?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      setIsSaving(true);
      await onSave(record);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el acta de cambio de jefe.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-blue-800/70 text-blue-100 shrink-0">
                <FileSignature className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight truncate">
                  {editingItem
                    ? `Acta de Entrega y Recepción de Jefatura — ${editingItem.nroActa}`
                    : 'Nueva Acta de Cambio de Jefe / Entrega y Recepción'}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  Relevo formal de mando, estado operativo de la dependencia y control patrimonial de bienes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium">
                {errorMsg}
              </div>
            )}

            {/* 1. Datos Generales del Acta */}
            <section className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                1. Encabezado del Acta de Relevo
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° de Acta *</label>
                  <input
                    type="text"
                    value={nroActa}
                    onChange={(e) => setNroActa(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Relevo</label>
                  <select
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                  >
                    {TIPOS_CAMBIO_JEFE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado del Acta</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                  >
                    {ESTADOS_ACTA.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dependencia Policial</label>
                <input
                  type="text"
                  value={dependenciaNombre}
                  onChange={(e) => setDependenciaNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30"
                />
              </div>
            </section>

            {/* 2. Autoridades Intervinientes */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Jefe Saliente */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Jefe / Responsable Saliente (Entrega) *
                </div>
                <SearchableSelect
                  label="Buscar de Nómina o Escribir"
                  value={
                    jefeSaliente.jerarquia
                      ? `${jefeSaliente.jerarquia} ${jefeSaliente.apellidoYNombre}`.trim()
                      : jefeSaliente.apellidoYNombre
                  }
                  onChange={(val) => applyPersonalSelect(val, setJefeSaliente)}
                  options={personalOptions}
                  placeholder="Seleccionar efectivo..."
                  allowCustom={true}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Jerarquía</label>
                    <input
                      type="text"
                      value={jefeSaliente.jerarquia}
                      onChange={(e) => setJefeSaliente((p) => ({ ...p, jerarquia: e.target.value }))}
                      placeholder="Ej. Comisario"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">DNI</label>
                    <input
                      type="text"
                      value={jefeSaliente.dni || ''}
                      onChange={(e) => setJefeSaliente((p) => ({ ...p, dni: e.target.value }))}
                      placeholder="DNI"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Apellido y Nombre *</label>
                  <input
                    type="text"
                    value={jefeSaliente.apellidoYNombre}
                    onChange={(e) => setJefeSaliente((p) => ({ ...p, apellidoYNombre: e.target.value }))}
                    placeholder="APELLIDO, Nombre"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              {/* Jefe Entrante */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Jefe / Responsable Entrante (Recibe) *
                </div>
                <SearchableSelect
                  label="Buscar de Nómina o Escribir"
                  value={
                    jefeEntrante.jerarquia
                      ? `${jefeEntrante.jerarquia} ${jefeEntrante.apellidoYNombre}`.trim()
                      : jefeEntrante.apellidoYNombre
                  }
                  onChange={(val) => applyPersonalSelect(val, setJefeEntrante)}
                  options={personalOptions}
                  placeholder="Seleccionar efectivo..."
                  allowCustom={true}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Jerarquía</label>
                    <input
                      type="text"
                      value={jefeEntrante.jerarquia}
                      onChange={(e) => setJefeEntrante((p) => ({ ...p, jerarquia: e.target.value }))}
                      placeholder="Ej. Subcomisario"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">DNI</label>
                    <input
                      type="text"
                      value={jefeEntrante.dni || ''}
                      onChange={(e) => setJefeEntrante((p) => ({ ...p, dni: e.target.value }))}
                      placeholder="DNI"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Apellido y Nombre *</label>
                  <input
                    type="text"
                    value={jefeEntrante.apellidoYNombre}
                    onChange={(e) => setJefeEntrante((p) => ({ ...p, apellidoYNombre: e.target.value }))}
                    placeholder="APELLIDO, Nombre"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>
            </section>

            {/* 3. Situación Operativa de la Dependencia */}
            <section className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  2. Estado Operativo y Documental al Momento del Relevo
                </h4>
                <button
                  type="button"
                  onClick={() => setSituacionOperativa(computeLiveSituacion())}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3 text-blue-800" />
                  <span>Capturar Datos Actuales del Sistema</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {[
                  { key: 'efectivosActivos', label: 'Efectivos Activos' },
                  { key: 'efectivosLicencia', label: 'De Licencia / Méd.' },
                  { key: 'movilesOperativos', label: 'Móviles en Servicio' },
                  { key: 'movilesTallerFueraServicio', label: 'Móviles Taller/F.S.' },
                  { key: 'expedientesPendientes', label: 'Exp. Pendientes' },
                  { key: 'casosFaltaOficioPendientes', label: 'Falta Oficio Pend.' },
                  { key: 'librosFoliosActivos', label: 'Series Folios Act.' },
                ].map((f) => (
                  <div key={f.key} className="bg-white p-2 rounded-lg border border-slate-200">
                    <label className="block text-[10px] font-semibold text-slate-500 truncate mb-1">
                      {f.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={(situacionOperativa as any)[f.key] ?? 0}
                      onChange={(e) =>
                        setSituacionOperativa((prev) => ({
                          ...prev,
                          [f.key]: Math.max(0, parseInt(e.target.value || '0', 10)),
                        }))
                      }
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold tabular-nums text-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Llaves, Sellos Oficiales, Libros de Guardia y Elementos de Jefatura Entregados
                </label>
                <input
                  type="text"
                  value={situacionOperativa.llavesSellosYValores || ''}
                  onChange={(e) =>
                    setSituacionOperativa((prev) => ({ ...prev, llavesSellosYValores: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </section>

            {/* 4. Checklist Físico de Bienes */}
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    3. Verificación Física de Bienes Patrimoniales ({checklistSummary.total})
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
                    Conformes: <strong className="text-emerald-700">{checklistSummary.conformes}</strong> · Con Observación:{' '}
                    <strong className="text-amber-700">{checklistSummary.observados}</strong> · Faltantes:{' '}
                    <strong className="text-red-700">{checklistSummary.faltantes}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSincronizarBienes}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-800" />
                    <span>Actualizar desde Inventario</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMarcarTodosConforme}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Marcar Todos Conforme</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Buscar bien en acta por N°, nombre, serie o sector..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={itemEstadoFilter}
                  onChange={(e) => setItemEstadoFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
                >
                  <option value="todos">Todos los estados de recepción</option>
                  <option value="Conforme">Solo Conformes</option>
                  <option value="Con Observación">Solo Con Observación</option>
                  <option value="Faltante">Solo Faltantes</option>
                </select>
              </div>

              {itemsVerificados.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No hay bienes activos cargados en el Inventario General para incluir en esta acta. Puede registrar bienes o importarlos desde el módulo antes de cerrar el acta.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 whitespace-nowrap">N° Inv.</th>
                        <th className="py-2 px-3">Bien / Serie / Sector</th>
                        <th className="py-2 px-2 text-center whitespace-nowrap">Cant.</th>
                        <th className="py-2 px-3 whitespace-nowrap">Conserv.</th>
                        <th className="py-2 px-3 whitespace-nowrap">Recepción al Relevo</th>
                        <th className="py-2 px-3 min-w-[180px]">Observación del Relevo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItemsChecklist.map((it) => (
                        <tr
                          key={it.bienId}
                          className={
                            it.estadoRecepcion === 'Faltante'
                              ? 'bg-red-50/70'
                              : it.estadoRecepcion === 'Con Observación'
                                ? 'bg-amber-50/70'
                                : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {it.nroInventario}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{it.denominacion}</div>
                            <div className="text-[10px] text-slate-500">
                              {it.categoria} · {it.ubicacionSector}
                              {it.marcaModeloSerie ? ` · ${it.marcaModeloSerie}` : ''}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                            {it.cantidad} {it.unidad || ''}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                            {it.estadoConservacion}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {(
                                [
                                  {
                                    val: 'Conforme',
                                    icon: CheckCircle2,
                                    active: 'bg-emerald-700 text-white border-emerald-700',
                                    idle: 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50',
                                  },
                                  {
                                    val: 'Con Observación',
                                    icon: AlertTriangle,
                                    active: 'bg-amber-600 text-white border-amber-600',
                                    idle: 'bg-white text-slate-600 border-slate-300 hover:bg-amber-50',
                                  },
                                  {
                                    val: 'Faltante',
                                    icon: XCircle,
                                    active: 'bg-red-600 text-white border-red-600',
                                    idle: 'bg-white text-slate-600 border-slate-300 hover:bg-red-50',
                                  },
                                ] as const
                              ).map((opt) => {
                                const Icon = opt.icon;
                                const selected = it.estadoRecepcion === opt.val;
                                return (
                                  <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() =>
                                      updateItemChecklist(it.bienId, { estadoRecepcion: opt.val })
                                    }
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer transition-colors ${
                                      selected ? opt.active : opt.idle
                                    }`}
                                    title={opt.val}
                                  >
                                    <Icon className="w-3 h-3" />
                                    <span className="hidden xl:inline">{opt.val}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.observacion || ''}
                              onChange={(e) =>
                                updateItemChecklist(it.bienId, { observacion: e.target.value })
                              }
                              placeholder="Detalle u observación..."
                              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 5. Observaciones Generales y Adjuntos */}
            <section className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones Generales / Constancias del Relevo
                </label>
                <textarea
                  rows={2}
                  value={observacionesGenerales}
                  onChange={(e) => setObservacionesGenerales(e.target.value)}
                  placeholder="Consigne novedades particulares del traspaso, plazos de regularización o resoluciones administrativas vinculadas..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                    <span>Actas Escaneadas o Anexos Adjuntos ({adjuntos.length})</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5 text-blue-800" />
                    <span>Adjuntar Documento / Foto</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                {adjuntos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {adjuntos.map((adj, idx) => (
                      <div
                        key={adj.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-2 bg-white border border-slate-200 rounded-lg"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{adj.nombre}</div>
                          <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                            {formatFileSizeBytes(adj.tamanoBytes || 0)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewGallery({
                                isOpen: true,
                                files: adjuntos.map((a) => ({
                                  id: a.id,
                                  nombre: a.nombre,
                                  tipo: a.tipo,
                                  dataUrl: a.dataUrl,
                                })),
                                initialIndex: idx,
                              })
                            }
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-800 cursor-pointer"
                            title="Vista previa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjuntos((prev) => prev.filter((x) => x.id !== adj.id))}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Quitar adjunto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </form>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-950 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : editingItem ? 'Guardar Acta' : 'Crear Acta de Relevo'}</span>
            </button>
          </div>
        </div>
      </div>

      <FilePreviewModal
        isOpen={previewGallery.isOpen}
        file={previewGallery.files[previewGallery.initialIndex] || null}
        files={previewGallery.files}
        initialIndex={previewGallery.initialIndex}
        onClose={() => setPreviewGallery({ isOpen: false, files: [], initialIndex: 0 })}
      />
    </>
  );
};
