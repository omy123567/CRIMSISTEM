import React, { useState, useMemo, useEffect } from 'react';
import {
  CharlaPrevencion,
  EstadoCharlaPrevencion,
  Personal,
  DelegacionPolicial,
  ConfiguracionSistema,
  UsuarioSistema,
  AdjuntoArchivo,
} from '../../types/police';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Building2,
  BookOpen,
  UserCheck,
  FileText,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';

interface CharlaModalProps {
  charla?: CharlaPrevencion | null;
  personalList: Personal[];
  delegacionesList: DelegacionPolicial[];
  activeDelegacionId: string;
  currentUser?: UsuarioSistema;
  config: ConfiguracionSistema;
  onSave: (charla: CharlaPrevencion) => Promise<void> | void;
  onClose: () => void;
}

const TEMAS_SUGERIDOS = [
  'Seguridad Vial y Uso Obligatorio de Casco',
  'Prevención de Consumos Problemáticos y Adicciones',
  'Prevención de Ciberdelitos, Estafas Virtuales y Grooming',
  'Violencia Familiar, de Género y Protocolos de Asistencia',
  'Convivencia Escolar, Bullying y Prevención Comunitaria',
  'Seguridad Ciudadana y Prevención del Delito Barrial',
  'Primeros Auxilios y Actuación ante Emergencias',
];

const LOCALIDADES_SUGERIDAS = [
  'Laguna Blanca',
  'Clorinda',
  'Formosa Capital',
  'Las Lomitas',
  'El Colorado',
  'Pirané',
  'Riacho He-Hé',
  'Buena Vista',
  'Laguna Naineck',
  'Siete Palmas',
  'Espínillo',
  'Ibarreta',
  'Comandante Fontana',
  'Ingeniero Juárez',
  'Villa Dos Trece',
];

export function formatFechaDDMMAAAA(fechaIso?: string): string {
  if (!fechaIso) return '—';
  const match = fechaIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fechaIso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export const CharlaModal: React.FC<CharlaModalProps> = ({
  charla,
  personalList,
  delegacionesList,
  activeDelegacionId,
  currentUser,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(charla);
  const puedeCambiarDelegacion =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeVerOtrasDelegaciones);

  const delegacionInicial =
    charla?.delegacionId || activeDelegacionId || config.delegacionId || 'del-laguna-blanca';
  const delegacionObjInicial = delegacionesList.find((d) => d.id === delegacionInicial);

  const [fecha, setFecha] = useState(
    charla?.fecha || new Date().toISOString().slice(0, 10)
  );
  const [hora, setHora] = useState(charla?.hora || '09:00');
  const [delegacionId, setDelegacionId] = useState(delegacionInicial);
  const [localidad, setLocalidad] = useState(
    charla?.localidad ||
      delegacionObjInicial?.ciudad ||
      config.ciudadDependencia ||
      'Laguna Blanca'
  );
  const [lugarInstitucion, setLugarInstitucion] = useState(charla?.lugarInstitucion || '');
  const [tema, setTema] = useState(charla?.tema || '');
  const [disertantePersonalId, setDisertantePersonalId] = useState(
    charla?.disertantePersonalId || ''
  );
  const [disertanteManual, setDisertanteManual] = useState(
    !charla?.disertantePersonalId && charla?.disertanteNombre ? charla.disertanteNombre : ''
  );
  const [usarDisertanteManual, setUsarDisertanteManual] = useState(
    Boolean(!charla?.disertantePersonalId && charla?.disertanteNombre)
  );
  const [estado, setEstado] = useState<EstadoCharlaPrevencion>(
    charla?.estado || 'Programada'
  );
  const [observaciones, setObservaciones] = useState(charla?.observaciones || '');
  const [adjuntos, setAdjuntos] = useState<AdjuntoArchivo[]>(charla?.adjuntos || []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Vista preliminar con zoom
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    index: number;
  }>({ isOpen: false, index: 0 });

  const delegacionSeleccionada = useMemo(
    () => delegacionesList.find((d) => d.id === delegacionId),
    [delegacionesList, delegacionId]
  );

  // Filtrar estrictamente el personal perteneciente a la delegación correspondiente
  const personalDeDelegacion = useMemo(() => {
    return personalList
      .filter((p) => (p.delegacionId || 'del-laguna-blanca') === delegacionId)
      .sort((a, b) => a.apellidoYNombre.localeCompare(b.apellidoYNombre));
  }, [personalList, delegacionId]);

  // Si cambia la delegación y el disertante seleccionado ya no pertenece a esa delegación, limpiar selección
  useEffect(() => {
    if (
      disertantePersonalId &&
      !personalDeDelegacion.some((p) => p.id === disertantePersonalId)
    ) {
      setDisertantePersonalId('');
    }
  }, [delegacionId, personalDeDelegacion, disertantePersonalId]);

  const handleChangeDelegacion = (newDelId: string) => {
    setDelegacionId(newDelId);
    const del = delegacionesList.find((d) => d.id === newDelId);
    if (del?.ciudad && !isEditing) {
      setLocalidad(del.ciudad);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const nuevo: AdjuntoArchivo = {
          id: `charla-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          nombre: file.name,
          tipo: file.type || 'application/octet-stream',
          dataUrl,
          tamanoBytes: file.size,
          fecha: new Date().toISOString().slice(0, 10),
        };
        setAdjuntos((prev) => [...prev, nuevo]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAdjunto = (id: string) => {
    setAdjuntos((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fecha) {
      setErrorMsg('Debe indicar la Fecha del evento (DD/MM/AAAA).');
      return;
    }
    if (!hora) {
      setErrorMsg('Debe indicar la Hora programada de la charla.');
      return;
    }
    if (!localidad.trim()) {
      setErrorMsg('Debe completar la Localidad donde se dictará la charla.');
      return;
    }
    if (!lugarInstitucion.trim()) {
      setErrorMsg('Debe completar el Lugar o Institución anfitriona.');
      return;
    }
    if (!tema.trim()) {
      setErrorMsg('Debe ingresar el Tema de la charla o jornada preventiva.');
      return;
    }

    let finalDisertanteId = '';
    let finalDisertanteNombre = '';

    if (usarDisertanteManual) {
      if (!disertanteManual.trim()) {
        setErrorMsg('Debe indicar el Disertante designado.');
        return;
      }
      finalDisertanteNombre = disertanteManual.trim();
    } else {
      const persObj = personalDeDelegacion.find((p) => p.id === disertantePersonalId);
      if (!persObj) {
        setErrorMsg(
          `Debe seleccionar un Disertante Designado perteneciente a ${
            delegacionSeleccionada?.nombre || 'la delegación correspondiente'
          }.`
        );
        return;
      }
      finalDisertanteId = persObj.id;
      finalDisertanteNombre = `${persObj.jerarquia} ${persObj.apellidoYNombre}`;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload: CharlaPrevencion = {
        id: charla?.id || `charla-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fecha,
        hora,
        localidad: localidad.trim(),
        lugarInstitucion: lugarInstitucion.trim(),
        tema: tema.trim(),
        disertantePersonalId: finalDisertanteId || undefined,
        disertanteNombre: finalDisertanteNombre,
        delegacionId,
        delegacionNombre: delegacionSeleccionada?.nombre || config.dependencia,
        observaciones: observaciones.trim(),
        estado,
        adjuntos,
        creadoPorUsuario:
          charla?.creadoPorUsuario ||
          currentUser?.apellidoYNombre ||
          currentUser?.username ||
          'Oficial de Guardia',
        createdAt: charla?.createdAt || now,
        updatedAt: now,
      };
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const previewItems: PreviewAttachmentItem[] = adjuntos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo,
    dataUrl: a.dataUrl,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-150">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {isEditing
                  ? 'Editar Charla / Prevención Comunitaria'
                  : 'Registrar Charla y Prevención Comunitaria'}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Agenda preventiva institucional con recordatorio automático en Dashboard y Notificaciones
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Fila 1: Fecha (DD/MM/AAAA), Hora y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Fecha (DD/MM/AAAA) *</span>
                </span>
                {fecha && (
                  <span className="font-mono tabular-nums text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {formatFechaDDMMAAAA(fecha)}
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Hora *</span>
              </label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono tabular-nums focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado del Evento
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoCharlaPrevencion)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="Programada">Programada (Activa)</option>
                <option value="Reprogramada">Reprogramada</option>
                <option value="Realizada">Realizada</option>
                <option value="Suspendida">Suspendida</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Localidad y Lugar / Institución */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Localidad *</span>
              </label>
              <input
                type="text"
                required
                list="localidades-formosa-list"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Ej. Laguna Blanca, Clorinda, Formosa..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
              <datalist id="localidades-formosa-list">
                {LOCALIDADES_SUGERIDAS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Lugar / Institución *</span>
              </label>
              <input
                type="text"
                required
                value={lugarInstitucion}
                onChange={(e) => setLugarInstitucion(e.target.value)}
                placeholder="Ej. E.P.E.S. N° 22 / Salón Municipal / Club Social..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 3: Tema */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tema de la Charla *</span>
            </label>
            <input
              type="text"
              required
              list="temas-prevencion-list"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ej. Prevención de Seguridad Vial, Ciberdelitos, Consumos Problemáticos..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            <datalist id="temas-prevencion-list">
              {TEMAS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Fila 4: Delegación correspondiente & Disertante Designado */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delegación Correspondiente *
                </label>
                {puedeCambiarDelegacion ? (
                  <select
                    value={delegacionId}
                    onChange={(e) => handleChangeDelegacion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {delegacionesList.map((del) => (
                      <option key={del.id} value={del.id}>
                        {del.nombre} ({del.ciudad})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-800 font-semibold">
                    {delegacionSeleccionada?.nombre || config.dependencia}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Disertante Designado *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUsarDisertanteManual((prev) => !prev)}
                    className="text-[10px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    {usarDisertanteManual ? 'Elegir de nómina' : 'Ingresar manualmente'}
                  </button>
                </div>

                {usarDisertanteManual ? (
                  <input
                    type="text"
                    value={disertanteManual}
                    onChange={(e) => setDisertanteManual(e.target.value)}
                    placeholder="Jerarquía, Apellido y Nombre del disertante..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                ) : (
                  <select
                    value={disertantePersonalId}
                    onChange={(e) => setDisertantePersonalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">
                      — Seleccione efectivo de {delegacionSeleccionada?.siglas || 'la delegación'} ({personalDeDelegacion.length} disponibles) —
                    </option>
                    {personalDeDelegacion.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jerarquia} {p.apellidoYNombre} {p.plaza ? `(Plaza ${p.plaza})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {!usarDisertanteManual && personalDeDelegacion.length === 0 && (
              <p className="text-[11px] text-amber-700 font-medium">
                No hay efectivos registrados en la nómina de {delegacionSeleccionada?.nombre || 'esta delegación'}. Puede ingresar el disertante manualmente desde el enlace superior derecho.
              </p>
            )}
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Observaciones</span>
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Público destinatario, requerimientos técnicos (proyector, folletería), autoridad solicitante u observaciones relevantes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-y"
            />
          </div>

          {/* Fila 6: Documentos e Imágenes Anexas con Vista Previa Zoom */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">
                  Documentos / Imágenes Adjuntas ({adjuntos.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Notas de solicitud, invitaciones institucionales o registros fotográficos (opcional)
                </span>
              </div>
              <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer inline-flex items-center gap-1.5 text-xs transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Adjuntar</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {adjuntos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {adjuntos.map((adj, idx) => {
                  const isImage =
                    adj.tipo?.startsWith('image/') || adj.dataUrl.startsWith('data:image/');
                  return (
                    <div
                      key={adj.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isImage ? (
                          <img
                            src={adj.dataUrl}
                            alt={adj.nombre}
                            onClick={() => setPreviewState({ isOpen: true, index: idx })}
                            className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0 cursor-pointer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                            {adj.nombre.toLowerCase().endsWith('.pdf') ? (
                              <FileText className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Paperclip className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate" title={adj.nombre}>
                            {adj.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isImage ? 'Imagen' : 'Documento'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewState({ isOpen: true, index: idx })}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title="Vista preliminar con zoom"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdjunto(adj.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Quitar archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pie Modal */}
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
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Charla'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visor Preliminar Universal con Zoom */}
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
