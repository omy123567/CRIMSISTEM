import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AdjuntoArchivo,
  ConfiguracionSistema,
  DelegacionPolicial,
  FolioAsignado,
  MemoNota,
  MemoNotaEstado,
  PerfilAccesoFolio,
  SerieNumerario,
  TipoMemoCatalogoItem,
  UsuarioSistema,
} from '../../types/police';
import {
  ALL_PERFILES_ACCESO_FOLIO,
  PERFILES_ACCESO_FOLIO_INFO,
  buildUnifiedTiposMemosOptions,
  computeUpdatedTiposMemosOcultos,
  getPerfilFolioLabel,
  isTipoMemoHiddenForUser,
  normalizePerfilesVisibles,
  normalizeTipoKey,
  normalizeTiposMemoCatalogo,
  resolveUserFolioPerfil,
} from '../../utils/memosCatalogUtils';
import {
  ALLOWED_MEMO_ACCEPT,
  formatFileSizeBytes,
  processUploadedMemoFile,
  triggerSafeFileDownload,
} from '../../utils/documentExtractUtils';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import {
  X,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Plus,
  BookmarkCheck,
  Sparkles,
  AlertCircle,
  Paperclip,
  EyeOff,
  CheckCircle2,
  FileSearch,
  Calendar,
  Shield,
} from 'lucide-react';

interface MemoNotaModalProps {
  isOpen: boolean;
  editingItem: MemoNota | null;
  currentUser?: UsuarioSistema | null;
  config: ConfiguracionSistema;
  seriesList: SerieNumerario[];
  foliosList: FolioAsignado[];
  memosList: MemoNota[];
  usuariosList: UsuarioSistema[];
  activeDelegacionId: string;
  delegacionesList: DelegacionPolicial[];
  onSave: (memo: MemoNota) => Promise<void> | void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => Promise<void> | void;
  onSaveUsuario?: (user: UsuarioSistema) => Promise<void> | void;
  onSaveSerie?: (serie: SerieNumerario) => Promise<void> | void;
  onClose: () => void;
}

const ESTADOS_MEMO: MemoNotaEstado[] = [
  'Borrador',
  'Emitido',
  'Enviado',
  'Recepcionado',
  'Archivado',
];

const PRIORIDADES_MEMO = ['Normal', 'Urgente', 'Reservado'] as const;

export const MemoNotaModal: React.FC<MemoNotaModalProps> = ({
  isOpen,
  editingItem,
  currentUser,
  config,
  seriesList,
  foliosList,
  memosList,
  usuariosList,
  activeDelegacionId,
  delegacionesList,
  onSave,
  onSaveConfig,
  onSaveUsuario,
  onSaveSerie,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperUser = currentUser?.rol === 'superusuario';
  const canManageRecordVisibility =
    isSuperUser ||
    currentUser?.rol === 'Administrador' ||
    Boolean(currentUser?.accionesPersonalizadas?.puedeGestionarUsuarios);
  const canAddTipo =
    !currentUser?.esSoloLectura &&
    (isSuperUser || currentUser?.puedeCrear !== false || currentUser?.puedeModificar !== false);

  const visibleTiposOptions = useMemo(() => {
    const all = buildUnifiedTiposMemosOptions(config, seriesList);
    return all.filter((opt) => {
      if (editingItem && normalizeTipoKey(opt.nombre) === normalizeTipoKey(editingItem.tipo)) {
        return true;
      }
      return !isTipoMemoHiddenForUser(opt, currentUser, undefined, seriesList, config);
    });
  }, [config, seriesList, currentUser, editingItem]);

  const visibleFoliosForLink = useMemo(() => {
    const seriesById = new Map(seriesList.map((s) => [s.id, s]));
    return [...foliosList]
      .filter((f) => {
        const ser = seriesById.get(f.serieId);
        if (!ser) return true;
        return !isTipoMemoHiddenForUser(ser.nombre, currentUser, ser.id, seriesList, config);
      })
      .sort((a, b) => (b.fechaAsignacion || '').localeCompare(a.fechaAsignacion || '') || b.numero - a.numero);
  }, [foliosList, seriesList, currentUser, config]);

  const delegacionUsers = useMemo(() => {
    return usuariosList.filter(
      (u) =>
        u.rol !== 'superusuario' &&
        u.activo &&
        (isSuperUser || u.delegacionId === activeDelegacionId)
    );
  }, [usuariosList, activeDelegacionId, isSuperUser]);

  const [tipo, setTipo] = useState<string>('');
  const [serieFolioId, setSerieFolioId] = useState<string>('');
  const [serieFolioNombre, setSerieFolioNombre] = useState<string>('');
  const [folioId, setFolioId] = useState<string>('');
  const [nroFolioMemo, setNroFolioMemo] = useState<string>('');
  const [anio, setAnio] = useState<number>(() => new Date().getFullYear());
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [asunto, setAsunto] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [remitenteArea, setRemitenteArea] = useState<string>('');
  const [estado, setEstado] = useState<MemoNotaEstado | string>('Emitido');
  const [prioridad, setPrioridad] = useState<string>('Normal');
  const [observaciones, setObservaciones] = useState<string>('');
  const [hiddenUsersForSelectedTipo, setHiddenUsersForSelectedTipo] = useState<string[]>([]);
  const [perfilesForSelectedTipo, setPerfilesForSelectedTipo] = useState<PerfilAccesoFolio[]>([
    ...ALL_PERFILES_ACCESO_FOLIO,
  ]);

  // Anexos en formulario
  interface FormAttachment {
    id: string;
    nombre: string;
    mimeType: string;
    extension: string;
    tamanoBytes: number;
    dataUrl: string;
    contenidoExtraido: string;
  }
  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Nuevo tipo inline
  const [showNewTipoBox, setShowNewTipoBox] = useState(false);
  const [newTipoNombre, setNewTipoNombre] = useState('');
  const [newTipoPrefijo, setNewTipoPrefijo] = useState('');
  const [newTipoPerfiles, setNewTipoPerfiles] = useState<PerfilAccesoFolio[]>([
    ...ALL_PERFILES_ACCESO_FOLIO,
  ]);

  // Error y vista previa
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    index: number;
  }>({ isOpen: false, index: 0 });

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setShowNewTipoBox(false);
    setNewTipoNombre('');
    setNewTipoPrefijo('');
    setNewTipoPerfiles([...ALL_PERFILES_ACCESO_FOLIO]);

    if (editingItem) {
      const matchedOpt = visibleTiposOptions.find(
        (o) =>
          (editingItem.serieFolioId && o.serieFolioId === editingItem.serieFolioId) ||
          normalizeTipoKey(o.nombre) === normalizeTipoKey(editingItem.tipo)
      );
      setTipo(editingItem.tipo || matchedOpt?.nombre || visibleTiposOptions[0]?.nombre || '');
      setSerieFolioId(editingItem.serieFolioId || matchedOpt?.serieFolioId || '');
      setSerieFolioNombre(
        editingItem.serieFolioNombre ||
          (matchedOpt?.esDeControlFolios ? matchedOpt.nombre : '')
      );
      setFolioId(editingItem.folioId || '');
      setNroFolioMemo(editingItem.nroFolioMemo || '');
      const itemFecha = editingItem.fecha || new Date().toISOString().split('T')[0];
      setFecha(itemFecha);
      setAnio(
        editingItem.anio ||
          Number(itemFecha.slice(0, 4)) ||
          new Date().getFullYear()
      );
      setAsunto(editingItem.asunto || '');
      setDestino(editingItem.destino || '');
      setRemitenteArea(editingItem.remitenteArea || config.dependencia || '');
      setEstado(editingItem.estado || 'Emitido');
      setPrioridad(editingItem.prioridad || 'Normal');
      setObservaciones(editingItem.observaciones || '');

      const loaded: FormAttachment[] = [];
      if (editingItem.archivoDataUrl && editingItem.archivoNombre) {
        loaded.push({
          id: 'att-primary',
          nombre: editingItem.archivoNombre,
          mimeType: editingItem.archivoMimeType || 'application/octet-stream',
          extension:
            editingItem.archivoExtension ||
            editingItem.archivoNombre.split('.').pop()?.toLowerCase() ||
            '',
          tamanoBytes: editingItem.archivoTamanoBytes || 0,
          dataUrl: editingItem.archivoDataUrl,
          contenidoExtraido: editingItem.contenidoExtraido || '',
        });
      }
      if (Array.isArray(editingItem.adjuntos)) {
        editingItem.adjuntos.forEach((adj, idx) => {
          if (!adj?.dataUrl) return;
          loaded.push({
            id: adj.id || `att-${idx}`,
            nombre: adj.nombre,
            mimeType: adj.tipo || 'application/octet-stream',
            extension:
              adj.extension || adj.nombre.split('.').pop()?.toLowerCase() || '',
            tamanoBytes: adj.tamanoBytes || 0,
            dataUrl: adj.dataUrl,
            contenidoExtraido: adj.contenidoExtraido || '',
          });
        });
      }
      setAttachments(loaded);
    } else {
      const defaultOpt = visibleTiposOptions[0];
      const todayYmd = new Date().toISOString().split('T')[0];
      setTipo(defaultOpt?.nombre || '');
      setSerieFolioId(defaultOpt?.serieFolioId || '');
      setSerieFolioNombre(defaultOpt?.esDeControlFolios ? defaultOpt.nombre : '');
      setFolioId('');
      setNroFolioMemo('');
      setFecha(todayYmd);
      setAnio(Number(todayYmd.slice(0, 4)) || new Date().getFullYear());
      setAsunto('');
      setDestino('');
      setRemitenteArea(config.dependencia || '');
      setEstado('Emitido');
      setPrioridad('Normal');
      setObservaciones('');
      setAttachments([]);
    }
  }, [isOpen, editingItem, config.dependencia]);

  // Sincronizar la lista de usuarios y perfiles habilitados para el Tipo / Serie seleccionado
  useEffect(() => {
    if (!isOpen || !tipo) {
      setHiddenUsersForSelectedTipo([]);
      setPerfilesForSelectedTipo([...ALL_PERFILES_ACCESO_FOLIO]);
      return;
    }
    const hiddenIds = delegacionUsers
      .filter((u) => isTipoMemoHiddenForUser(tipo, u, serieFolioId || undefined))
      .map((u) => u.id);
    setHiddenUsersForSelectedTipo(hiddenIds);

    const normTipo = normalizeTipoKey(tipo);
    const serieMatch = seriesList.find(
      (s) =>
        (serieFolioId && s.id === serieFolioId) ||
        (normTipo && normalizeTipoKey(s.nombre) === normTipo)
    );
    if (serieMatch) {
      setPerfilesForSelectedTipo(normalizePerfilesVisibles(serieMatch.perfilesVisibles));
    } else {
      const catMatch = (config.tiposMemoCatalogo || []).find(
        (t) => normTipo && normalizeTipoKey(t.nombre) === normTipo
      );
      setPerfilesForSelectedTipo(normalizePerfilesVisibles(catMatch?.perfilesVisibles));
    }
  }, [isOpen, tipo, serieFolioId, delegacionUsers, seriesList, config.tiposMemoCatalogo]);

  if (!isOpen) return null;

  const handleTipoChange = (selectedName: string) => {
    setTipo(selectedName);
    const opt = visibleTiposOptions.find((o) => o.nombre === selectedName);
    if (opt?.esDeControlFolios && opt.serieFolioId) {
      setSerieFolioId(opt.serieFolioId);
      setSerieFolioNombre(opt.nombre);
    } else {
      setSerieFolioId('');
      setSerieFolioNombre('');
    }
  };

  const handleLinkFolio = (selectedFolioId: string) => {
    setFolioId(selectedFolioId);
    if (!selectedFolioId) return;
    const fol = visibleFoliosForLink.find((f) => f.id === selectedFolioId);
    if (!fol) return;
    const ser = seriesList.find((s) => s.id === fol.serieId);
    if (ser) {
      setTipo(ser.nombre);
      setSerieFolioId(ser.id);
      setSerieFolioNombre(ser.nombre);
    }
    setNroFolioMemo(fol.caratulaPersonalizada || fol.codigoCaratula || `${fol.numero}/${fol.anio}`);
    if (fol.anio) setAnio(fol.anio);
    if (fol.fechaAsignacion) setFecha(fol.fechaAsignacion);
    if (fol.asunto && !asunto.trim()) setAsunto(fol.asunto);
    if (fol.destinatario && !destino.trim()) setDestino(fol.destinatario);
    if (fol.observaciones && !observaciones.trim()) setObservaciones(fol.observaciones);
  };

  const handleSugerirCorrelativo = () => {
    const targetAnio = Number(anio) || Number((fecha || '').slice(0, 4)) || new Date().getFullYear();
    const opt = visibleTiposOptions.find(
      (o) => normalizeTipoKey(o.nombre) === normalizeTipoKey(tipo)
    );
    const prefijo = opt?.prefijo || `${tipo} N°`;
    const normTipo = normalizeTipoKey(tipo);

    let maxNum = 0;
    for (const m of memosList) {
      const mAnio = m.anio || Number((m.fecha || '').slice(0, 4));
      if (mAnio !== targetAnio) continue;
      if (
        normalizeTipoKey(m.tipo) !== normTipo &&
        (!serieFolioId || m.serieFolioId !== serieFolioId)
      ) {
        continue;
      }
      const match = (m.nroFolioMemo || '').match(/(\d+)\s*(?:\/\s*\d{4})?$/);
      const numFromFront = (m.nroFolioMemo || '').match(/(\d+)/);
      const parsed = Number(match?.[1] || numFromFront?.[1] || 0);
      if (parsed > maxNum) maxNum = parsed;
    }

    if (serieFolioId) {
      for (const f of foliosList) {
        if (f.serieId === serieFolioId && f.anio === targetAnio && f.numero > maxNum) {
          maxNum = f.numero;
        }
      }
    }

    const nextNum = String(maxNum + 1).padStart(3, '0');
    setNroFolioMemo(`${prefijo} ${nextNum}/${targetAnio}`.trim());
  };

  const handleSaveNewTipo = async () => {
    const cleanName = newTipoNombre.trim();
    if (!cleanName) {
      setErrorMsg('Ingrese el nombre del nuevo Tipo / Serie de Folio.');
      return;
    }
    const existingOpt = visibleTiposOptions.find(
      (o) => normalizeTipoKey(o.nombre) === normalizeTipoKey(cleanName)
    );
    if (existingOpt) {
      setTipo(existingOpt.nombre);
      setSerieFolioId(existingOpt.serieFolioId || '');
      setSerieFolioNombre(existingOpt.esDeControlFolios ? existingOpt.nombre : '');
      setShowNewTipoBox(false);
      return;
    }

    const cleanPrefijo = newTipoPrefijo.trim() || `${cleanName} N°`;

    // Sincronizar directamente como nueva Serie en "Control de Folios" para mantener ambos módulos idénticos
    if (onSaveSerie) {
      const newSerie: SerieNumerario = {
        id: `serie-${Date.now()}`,
        nombre: cleanName,
        prefijo: cleanPrefijo,
        anio: Number(anio) || new Date().getFullYear(),
        limiteFolios: 1000,
        columnas: 20,
        color: 'blue',
        delegacionId: activeDelegacionId,
        descripcion: 'Serie creada desde el módulo Memos y Notas',
        perfilesVisibles: [...newTipoPerfiles],
        createdAt: new Date().toISOString(),
      };
      await onSaveSerie(newSerie);
      setTipo(newSerie.nombre);
      setSerieFolioId(newSerie.id);
      setSerieFolioNombre(newSerie.nombre);
    } else if (onSaveConfig) {
      const newItem: TipoMemoCatalogoItem = {
        id: `tm-${Date.now()}`,
        nombre: cleanName,
        prefijo: cleanPrefijo,
        esDefault: false,
        activo: true,
        perfilesVisibles: [...newTipoPerfiles],
      };
      const currentCatalog = normalizeTiposMemoCatalogo(config.tiposMemoCatalogo);
      await onSaveConfig({
        ...config,
        tiposMemoCatalogo: [...currentCatalog, newItem],
      });
      setTipo(cleanName);
      setSerieFolioId('');
      setSerieFolioNombre('');
    }

    setShowNewTipoBox(false);
    setNewTipoNombre('');
    setNewTipoPrefijo('');
    setNewTipoPerfiles([...ALL_PERFILES_ACCESO_FOLIO]);
    setErrorMsg(null);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsProcessingFiles(true);
    try {
      const processed: FormAttachment[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const res = await processUploadedMemoFile(fileList[i]);
        if (!res.ok) {
          setErrorMsg(res.error || 'Archivo inválido.');
          continue;
        }
        processed.push({
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          nombre: res.nombre || 'documento',
          mimeType: res.mimeType || 'application/octet-stream',
          extension: res.extension || '',
          tamanoBytes: res.tamanoBytes || 0,
          dataUrl: res.dataUrl || '',
          contenidoExtraido: res.contenidoExtraido || '',
        });
      }
      if (processed.length > 0) {
        setAttachments((prev) => [...prev, ...processed]);
      }
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const toggleHideTipoForUser = (uid: string) => {
    setHiddenUsersForSelectedTipo((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const togglePerfilForSelectedTipo = (perfil: PerfilAccesoFolio) => {
    setPerfilesForSelectedTipo((prev) =>
      prev.includes(perfil) ? prev.filter((p) => p !== perfil) : [...prev, perfil]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tipo.trim()) {
      setErrorMsg('Debe especificar el Tipo / Serie de Folio.');
      return;
    }
    if (!nroFolioMemo.trim()) {
      setErrorMsg('Debe ingresar el N° de Folio / Memo.');
      return;
    }
    const resolvedAnio = Number(anio);
    if (!Number.isFinite(resolvedAnio) || resolvedAnio < 1990 || resolvedAnio > 2050) {
      setErrorMsg('Debe indicar un Año válido (entre 1990 y 2050).');
      return;
    }
    if (!fecha) {
      setErrorMsg('Debe indicar la Fecha del documento.');
      return;
    }
    if (!asunto.trim()) {
      setErrorMsg('Debe ingresar el Asunto del Memo / Nota.');
      return;
    }
    if (!destino.trim()) {
      setErrorMsg('Debe indicar el Destino.');
      return;
    }

    const primary = attachments[0];
    const extras: AdjuntoArchivo[] = attachments.slice(1).map((a) => ({
      id: a.id,
      nombre: a.nombre,
      tipo: a.mimeType,
      extension: a.extension,
      tamanoBytes: a.tamanoBytes,
      dataUrl: a.dataUrl,
      contenidoExtraido: a.contenidoExtraido,
    }));

    const combinedText = attachments
      .map((a) => a.contenidoExtraido)
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 30000);

    const activeDel = delegacionesList.find((d) => d.id === activeDelegacionId);
    const nowIso = new Date().toISOString();

    const record: MemoNota = {
      id: editingItem?.id || `memo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tipo: tipo.trim(),
      serieFolioId: serieFolioId || undefined,
      serieFolioNombre: serieFolioNombre || undefined,
      folioId: folioId || undefined,
      nroFolioMemo: nroFolioMemo.trim(),
      anio: resolvedAnio,
      fecha,
      asunto: asunto.trim(),
      destino: destino.trim(),
      remitenteArea: remitenteArea.trim() || config.dependencia || '',
      estado,
      prioridad,
      archivoNombre: primary?.nombre,
      archivoMimeType: primary?.mimeType,
      archivoExtension: primary?.extension,
      archivoTamanoBytes: primary?.tamanoBytes,
      archivoDataUrl: primary?.dataUrl,
      adjuntos: extras,
      contenidoExtraido: combinedText || undefined,
      observaciones: observaciones.trim() || undefined,
      delegacionId: editingItem?.delegacionId || activeDelegacionId,
      delegacionNombre:
        editingItem?.delegacionNombre || activeDel?.nombre || config.dependencia,
      usuarioRegistroId: editingItem?.usuarioRegistroId || currentUser?.id,
      usuarioRegistroNombre:
        editingItem?.usuarioRegistroNombre ||
        currentUser?.apellidoYNombre ||
        currentUser?.username,
      createdAt: editingItem?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await onSave(record);

    // Aplicar configuración de perfiles y ocultamiento puntual para el "Tipo / Serie de Folio"
    if (canManageRecordVisibility && tipo.trim()) {
      const normTipo = normalizeTipoKey(tipo);
      const matchedSerie = seriesList.find(
        (s) =>
          (serieFolioId && s.id === serieFolioId) ||
          (normTipo && normalizeTipoKey(s.nombre) === normTipo)
      );
      const sortedDraft = [...perfilesForSelectedTipo].sort();

      if (matchedSerie && onSaveSerie) {
        const sortedPrev = [...normalizePerfilesVisibles(matchedSerie.perfilesVisibles)].sort();
        if (JSON.stringify(sortedPrev) !== JSON.stringify(sortedDraft)) {
          await onSaveSerie({
            ...matchedSerie,
            perfilesVisibles: [...perfilesForSelectedTipo],
            updatedAt: nowIso,
          });
        }
      } else if (onSaveConfig) {
        const currentCatalog = normalizeTiposMemoCatalogo(config.tiposMemoCatalogo);
        const existingItem = currentCatalog.find((t) => normalizeTipoKey(t.nombre) === normTipo);
        const sortedPrev = [...normalizePerfilesVisibles(existingItem?.perfilesVisibles)].sort();
        if (JSON.stringify(sortedPrev) !== JSON.stringify(sortedDraft)) {
          const updatedCatalog = existingItem
            ? currentCatalog.map((t) =>
                normalizeTipoKey(t.nombre) === normTipo
                  ? { ...t, perfilesVisibles: [...perfilesForSelectedTipo] }
                  : t
              )
            : [
                ...currentCatalog,
                {
                  id: `tm-${Date.now()}`,
                  nombre: tipo.trim(),
                  prefijo: `${tipo.trim()} N°`,
                  esDefault: false,
                  activo: true,
                  perfilesVisibles: [...perfilesForSelectedTipo],
                },
              ];
          await onSaveConfig({
            ...config,
            tiposMemoCatalogo: updatedCatalog,
          });
        }
      }

      if (onSaveUsuario) {
        const targetOpt = visibleTiposOptions.find(
          (o) =>
            (serieFolioId && o.serieFolioId === serieFolioId) ||
            normalizeTipoKey(o.nombre) === normTipo
        ) || {
          key: serieFolioId ? `serie:${serieFolioId}` : `tipo:${normTipo}`,
          nombre: tipo.trim(),
          serieFolioId: serieFolioId || undefined,
        };

        for (const u of delegacionUsers) {
          const wasHidden = isTipoMemoHiddenForUser(tipo, u, serieFolioId || undefined);
          const shouldHide = hiddenUsersForSelectedTipo.includes(u.id);
          if (wasHidden !== shouldHide) {
            const nextHiddenList = computeUpdatedTiposMemosOcultos(
              u.tiposMemosOcultos,
              targetOpt,
              shouldHide
            );
            await onSaveUsuario({
              ...u,
              tiposMemosOcultos: nextHiddenList,
              updatedAt: nowIso,
            });
          }
        }
      }
    }

    onClose();
  };

  const previewItems: PreviewAttachmentItem[] = attachments.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.mimeType,
    dataUrl: a.dataUrl,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-400/30 text-blue-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {editingItem ? `Editar ${editingItem.tipo} (${editingItem.nroFolioMemo})` : 'Registrar Nuevo Memo / Nota'}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Vinculado con Control de Folios · Anexos .doc, .docx, .pdf, planillas e imágenes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vinculación opcional con Control de Folios */}
          {visibleFoliosForLink.length > 0 && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <label className="flex items-center gap-1.5 font-bold text-blue-950">
                <BookmarkCheck className="w-4 h-4 text-blue-700" />
                <span>Vincular con Folio asignado en "Control de Folios" (opcional)</span>
              </label>
              <select
                value={folioId}
                onChange={(e) => handleLinkFolio(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Carga manual / Sin vincular folio previo --</option>
                {visibleFoliosForLink.slice(0, 120).map((f) => {
                  const ser = seriesList.find((s) => s.id === f.serieId);
                  return (
                    <option key={f.id} value={f.id}>
                      [{ser?.nombre || f.categoriaDocumento}] {f.caratulaPersonalizada || f.codigoCaratula} — {f.asunto} ({f.fechaAsignacion})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Bloque de Identificación Oficial (estilo N° / Año): Tipo, N° Folio / Memo y / Año */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
            <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>Identificación Oficial del Memo / Nota & Folio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Tipo / Serie de Folio */}
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Tipo / Serie de Folio *
                  </label>
                  {canAddTipo && (
                    <button
                      type="button"
                      onClick={() => setShowNewTipoBox((prev) => !prev)}
                      className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agregar otro tipo</span>
                    </button>
                  )}
                </div>
                <select
                  value={tipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                >
                  {visibleTiposOptions.map((opt) => (
                    <option key={opt.key} value={opt.nombre}>
                      {opt.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* N° Folio / Memo */}
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">N° Folio / Memo *</label>
                  <button
                    type="button"
                    onClick={handleSugerirCorrelativo}
                    className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Sugerir próximo número correlativo según el tipo y año"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sugerir N°</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={nroFolioMemo}
                  onChange={(e) => setNroFolioMemo(e.target.value)}
                  placeholder="Ej. Mem. N° 015 / Oficio J N° 004"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900"
                  required
                />
              </div>

              {/* / Año */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  / Año *
                </label>
                <input
                  type="number"
                  required
                  min="1990"
                  max="2050"
                  value={anio}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setAnio(Number.isFinite(parsed) ? parsed : new Date().getFullYear());
                  }}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Fecha de Registro */}
              <div className="sm:col-span-4">
                <label className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha *</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFecha(val);
                    if (!editingItem && val.length >= 4) {
                      const y = parseInt(val.slice(0, 4), 10);
                      if (Number.isFinite(y) && y >= 1990 && y <= 2050) setAnio(y);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-slate-900"
                  required
                />
              </div>

              {/* Remitente / Área Origen */}
              <div className="sm:col-span-8">
                <label className="block font-semibold text-slate-700 mb-1">
                  Remitente / Área Origen
                </label>
                <input
                  type="text"
                  value={remitenteArea}
                  onChange={(e) => setRemitenteArea(e.target.value)}
                  placeholder="Dependencia / Sección emisora"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Inline agregar otro tipo */}
          {showNewTipoBox && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="font-bold text-slate-700 block mb-1">
                    Nombre de la Nueva Serie / Tipo (se añade también a Control de Folios) *
                  </label>
                  <input
                    type="text"
                    value={newTipoNombre}
                    onChange={(e) => setNewTipoNombre(e.target.value)}
                    placeholder="Ej: Nota V, Nota Elevación, Memo Reservado..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="font-bold text-slate-700 block mb-1">
                    Prefijo (opcional)
                  </label>
                  <input
                    type="text"
                    value={newTipoPrefijo}
                    onChange={(e) => setNewTipoPrefijo(e.target.value)}
                    placeholder="Ej: Nota V N°"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowNewTipoBox(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewTipo}
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold cursor-pointer"
                  >
                    Agregar Tipo
                  </button>
                </div>
              </div>

              {canManageRecordVisibility && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700">Visible para:</span>
                  {PERFILES_ACCESO_FOLIO_INFO.map((p) => {
                    const checked = newTipoPerfiles.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewTipoPerfiles((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((x) => x !== p.id)
                                : [...prev, p.id]
                            )
                          }
                          className="w-3.5 h-3.5 accent-emerald-700"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Asunto y Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Asunto *</label>
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Síntesis clara del objeto del Memorándum o Nota..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Destino *</label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ej: Dirección General Policía Científica / Comisaría Seccional 1ra..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Estado y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="font-bold text-slate-800 block mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {ESTADOS_MEMO.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Prioridad / Carácter</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {PRIORIDADES_MEMO.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Anexar Archivos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-800" />
                <span>Anexar Archivo(s) (.doc, .docx, .pdf, planillas, imágenes)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Máx. 15 MB por archivo · Indexado de texto automático para búsqueda
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MEMO_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <div className="flex flex-col items-center gap-1.5">
                <div className="p-2 rounded-full bg-white border border-slate-200 text-blue-800 shadow-2xs">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="font-bold text-slate-800">
                  {isProcessingFiles
                    ? 'Procesando archivo y extrayendo contenido para búsqueda...'
                    : 'Haga clic o arrastre archivos aquí para anexar'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Formatos: Word (.doc, .docx), PDF (.pdf), OpenDocument (.odt), Texto (.txt, .rtf), Excel (.xls, .xlsx) e Imágenes
                </p>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold uppercase shrink-0">
                        {att.extension || 'FILE'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate" title={att.nombre}>
                          {att.nombre}
                          {idx === 0 && (
                            <span className="ml-1.5 text-[10px] text-blue-800 font-semibold">
                              (Principal)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{formatFileSizeBytes(att.tamanoBytes)}</span>
                          {att.contenidoExtraido ? (
                            <span className="text-emerald-700 font-sans font-semibold flex items-center gap-1">
                              <FileSearch className="w-3 h-3" />
                              {att.contenidoExtraido.length.toLocaleString()} caracteres indexados
                            </span>
                          ) : (
                            <span className="font-sans text-slate-400">
                              Adjunto binario listo para descarga
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewState({ isOpen: true, index: idx })}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Visualizar documento"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" />
                        <span>Visualizar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSafeFileDownload(att.dataUrl, att.nombre)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Descargar documento"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Quitar archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">Observaciones</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Anotaciones adicionales, recepción, plazos de respuesta o referencias internas..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Visibilidad del "Tipo / Serie de Folio" por Perfil y Usuarios Puntuales */}
          {canManageRecordVisibility && tipo.trim() && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Shield className="w-4 h-4 text-amber-700" />
                  <span>
                    Visibilidad de &ldquo;{tipo}&rdquo; por Perfil y Usuario (opcional)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-900">
                  {perfilesForSelectedTipo.length}/3 perfiles · {hiddenUsersForSelectedTipo.length} usuario(s) oculto(s)
                </span>
              </div>

              {/* Visibilidad por Perfil: Usuarios Comunes, Jefe, Mayoría / Judicial */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-amber-900">
                  Especifique qué perfiles pueden <strong>ver</strong> este Tipo / Serie de Folio (desmarque para ocultar):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PERFILES_ACCESO_FOLIO_INFO.map((p) => {
                    const checked = perfilesForSelectedTipo.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer text-[11px] ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-red-50 border-red-300 text-red-900 font-semibold'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePerfilForSelectedTipo(p.id)}
                          className="w-3.5 h-3.5 mt-0.5 accent-emerald-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate">{p.label}</div>
                          <div className="text-[10px] font-normal opacity-80">
                            {checked ? 'Puede ver' : 'No puede ver (Oculto)'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {onSaveUsuario && delegacionUsers.length > 0 && (
                <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-950">
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>Ocultar adicionalmente para usuarios puntuales:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto pt-0.5">
                    {delegacionUsers.map((u) => {
                      const checked = hiddenUsersForSelectedTipo.includes(u.id);
                      const userPerfil = resolveUserFolioPerfil(u);
                      const hiddenByProfile = !perfilesForSelectedTipo.includes(userPerfil);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer text-[11px] ${
                            hiddenByProfile
                              ? 'bg-red-50/70 border-red-200 text-red-900 opacity-80'
                              : checked
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                              : 'bg-white border-amber-200/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked || hiddenByProfile}
                              disabled={hiddenByProfile}
                              onChange={() => toggleHideTipoForUser(u.id)}
                              className="w-3.5 h-3.5 accent-amber-700 shrink-0"
                            />
                            <span className="truncate">
                              {u.apellidoYNombre} (@{u.username})
                            </span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {getPerfilFolioLabel(userPerfil)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessingFiles}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingItem ? 'Guardar Cambios' : 'Registrar Memo / Nota'}</span>
            </button>
          </div>
        </form>
      </div>

      <FilePreviewModal
        isOpen={previewState.isOpen}
        file={previewItems[previewState.index] || null}
        files={previewItems}
        initialIndex={previewState.index}
        onClose={() => setPreviewState({ isOpen: false, index: 0 })}
      />
    </div>
  );
};
