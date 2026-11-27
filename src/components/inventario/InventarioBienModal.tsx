import React, { useState, useEffect, useMemo } from 'react';
import {
  AdjuntoArchivo,
  CategoriaInventarioBien,
  EstadoConservacionBien,
  InventarioBien,
  Personal,
  SituacionPatrimonialBien,
} from '../../types/police';
import { processUploadedMemoFile, formatFileSizeBytes } from '../../utils/documentExtractUtils';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';
import { FilePreviewModal, PreviewAttachmentItem } from '../common/FilePreviewModal';
import {
  X,
  Save,
  Package,
  Paperclip,
  Eye,
  Trash2,
  Upload,
} from 'lucide-react';

export const CATEGORIAS_INVENTARIO: CategoriaInventarioBien[] = [
  'Equipamiento Pericial y Criminalístico',
  'Informática y Comunicaciones',
  'Mobiliario y Oficina',
  'Armamento y Protección',
  'Vehículos y Movilidad',
  'Instrumental Forense / Laboratorio',
  'Documentación y Libros Oficiales',
  'Infraestructura e Inmuebles',
  'Otros Bienes',
];

export const ESTADOS_CONSERVACION: EstadoConservacionBien[] = [
  'Muy Bueno',
  'Bueno',
  'Regular',
  'Malo / Deteriorado',
  'Fuera de Servicio',
  'En Reparación',
];

export const SITUACIONES_PATRIMONIALES: SituacionPatrimonialBien[] = [
  'En Uso / Operativo',
  'En Depósito / Resguardo',
  'Asignado a Personal',
  'En Reparación / Taller',
  'Baja Patrimonial',
];

const SECTORES_SUGERIDOS = [
  'Oficina de Jefatura',
  'Mayoría / Judicial',
  'Sala de Pericias / Criminalística',
  'Oficina de Accidentología Vial',
  'Guardia de Prevención',
  'Laboratorio / Fotografía Forense',
  'Parque Automotor / Cochera',
  'Depósito General / Armería',
  'Archivo Documental',
];

const UNIDADES_SUGERIDAS = ['Unidad', 'Juego', 'Caja', 'Lote', 'Libro', 'Par', 'Kit', 'Equipo'];

interface InventarioBienModalProps {
  isOpen: boolean;
  editingItem: InventarioBien | null;
  bienesExistentes: InventarioBien[];
  personalList: Personal[];
  activeDelegacionId: string;
  delegacionNombre?: string;
  usuarioRegistro?: string;
  onSave: (bien: InventarioBien) => Promise<void> | void;
  onClose: () => void;
}

function getNextInventarioCode(bienes: InventarioBien[]): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const b of bienes) {
    const match = String(b.nroInventario || '').match(/(\d+)\s*$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `INV-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

export const InventarioBienModal: React.FC<InventarioBienModalProps> = ({
  isOpen,
  editingItem,
  bienesExistentes,
  personalList,
  activeDelegacionId,
  delegacionNombre,
  usuarioRegistro,
  onSave,
  onClose,
}) => {
  const todayYmd = new Date().toISOString().slice(0, 10);

  const [nroInventario, setNroInventario] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_INVENTARIO[0]);
  const [denominacion, setDenominacion] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [nroSerie, setNroSerie] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [unidad, setUnidad] = useState('Unidad');
  const [estadoConservacion, setEstadoConservacion] = useState<string>('Bueno');
  const [situacionPatrimonial, setSituacionPatrimonial] = useState<string>('En Uso / Operativo');
  const [ubicacionSector, setUbicacionSector] = useState('Oficina de Jefatura');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableId, setResponsableId] = useState<string | undefined>(undefined);
  const [verificadoOk, setVerificadoOk] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [adjuntos, setAdjuntos] = useState<AdjuntoArchivo[]>([]);
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
    if (editingItem) {
      setNroInventario(editingItem.nroInventario || '');
      setCategoria(editingItem.categoria || CATEGORIAS_INVENTARIO[0]);
      setDenominacion(editingItem.denominacion || '');
      setMarcaModelo(editingItem.marcaModelo || '');
      setNroSerie(editingItem.nroSerie || '');
      setCantidad(typeof editingItem.cantidad === 'number' && editingItem.cantidad > 0 ? editingItem.cantidad : 1);
      setUnidad(editingItem.unidad || 'Unidad');
      setEstadoConservacion(editingItem.estadoConservacion || 'Bueno');
      setSituacionPatrimonial(editingItem.situacionPatrimonial || 'En Uso / Operativo');
      setUbicacionSector(editingItem.ubicacionSector || 'Oficina de Jefatura');
      setResponsableNombre(editingItem.responsableNombre || '');
      setResponsableId(editingItem.responsableId);
      setVerificadoOk(editingItem.verificadoOk !== false);
      setObservaciones(editingItem.observaciones || '');
      setAdjuntos(Array.isArray(editingItem.adjuntos) ? editingItem.adjuntos : []);
    } else {
      setNroInventario(getNextInventarioCode(bienesExistentes));
      setCategoria(CATEGORIAS_INVENTARIO[0]);
      setDenominacion('');
      setMarcaModelo('');
      setNroSerie('');
      setCantidad(1);
      setUnidad('Unidad');
      setEstadoConservacion('Bueno');
      setSituacionPatrimonial('En Uso / Operativo');
      setUbicacionSector('Oficina de Jefatura');
      setResponsableNombre('');
      setResponsableId(undefined);
      setVerificadoOk(true);
      setObservaciones('');
      setAdjuntos([]);
    }
  }, [isOpen, editingItem, bienesExistentes]);

  const personalOptions: SearchableOption[] = useMemo(() => {
    return (personalList || []).map((p) => {
      const fullLabel = `${p.jerarquia ? `${p.jerarquia} ` : ''}${p.apellidoYNombre}`.trim();
      return {
        value: fullLabel,
        label: fullLabel,
        sublabel: p.dni ? `DNI ${p.dni}${p.seccionGrupo ? ` · ${p.seccionGrupo}` : ''}` : p.seccionGrupo,
        badge: p.estado,
      };
    });
  }, [personalList]);

  const handleResponsableChange = (val: string) => {
    setResponsableNombre(val);
    const match = personalList.find(
      (p) => `${p.jerarquia ? `${p.jerarquia} ` : ''}${p.apellidoYNombre}`.trim().toLowerCase() === val.trim().toLowerCase()
    );
    setResponsableId(match?.id);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const added: AdjuntoArchivo[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 12 * 1024 * 1024) {
        setErrorMsg(`El archivo "${file.name}" supera el límite de 12 MB.`);
        continue;
      }
      try {
        const processed = await processUploadedMemoFile(file);
        if (!processed.dataUrl) continue;
        added.push({
          id: `adj-inv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          nombre: processed.nombre || file.name,
          tipo: processed.mimeType || file.type || 'application/octet-stream',
          dataUrl: processed.dataUrl,
          tamanoBytes: processed.tamanoBytes || file.size,
          fecha: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error leyendo archivo adjunto:', err);
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

    if (!nroInventario.trim()) {
      setErrorMsg('Debe ingresar el N° de Inventario o Código Patrimonial.');
      return;
    }
    if (!denominacion.trim()) {
      setErrorMsg('Debe ingresar la denominación o descripción del bien.');
      return;
    }
    if (!ubicacionSector.trim()) {
      setErrorMsg('Debe indicar la ubicación o sector dentro de la dependencia.');
      return;
    }

    const now = new Date().toISOString();

    const record: InventarioBien = {
      id: editingItem?.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nroInventario: nroInventario.trim().toUpperCase(),
      categoria: categoria || CATEGORIAS_INVENTARIO[0],
      denominacion: denominacion.trim(),
      marcaModelo: marcaModelo.trim() || undefined,
      nroSerie: nroSerie.trim() || undefined,
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.round(cantidad) : 1,
      unidad: unidad.trim() || 'Unidad',
      estadoConservacion,
      situacionPatrimonial,
      ubicacionSector: ubicacionSector.trim(),
      responsableId,
      responsableNombre: responsableNombre.trim() || undefined,
      fechaAlta: editingItem?.fechaAlta || todayYmd,
      ultimaVerificacionFecha: verificadoOk ? (editingItem?.ultimaVerificacionFecha || todayYmd) : undefined,
      verificadoOk,
      valorEstimado: undefined,
      origenModulo: editingItem?.origenModulo || 'manual',
      origenModuloRefId: editingItem?.origenModuloRefId,
      observaciones: observaciones.trim() || undefined,
      adjuntos,
      delegacionId: editingItem?.delegacionId || activeDelegacionId,
      delegacionNombre: editingItem?.delegacionNombre || delegacionNombre,
      usuarioRegistro: editingItem?.usuarioRegistro || usuarioRegistro,
      createdAt: editingItem?.createdAt || now,
      updatedAt: now,
    };

    try {
      setIsSaving(true);
      await onSave(record);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo guardar el bien en inventario.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-blue-800/70 text-blue-100 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight truncate">
                  {editingItem ? `Editar Bien Inventariado — ${editingItem.nroInventario}` : 'Registrar Bien en Inventario Patrimonial'}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  Control patrimonial de dependencia para auditoría y entrega de jefatura
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

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  N° Inventario / Patrimonio *
                </label>
                <input
                  type="text"
                  value={nroInventario}
                  onChange={(e) => setNroInventario(e.target.value)}
                  placeholder="Ej. INV-2026-001"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                >
                  {CATEGORIAS_INVENTARIO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Denominación / Descripción del Bien *
                </label>
                <input
                  type="text"
                  value={denominacion}
                  onChange={(e) => setDenominacion(e.target.value)}
                  placeholder="Ej. Cámara Fotográfica Réflex c/ Lente 18-55mm, Escritorio Metálico, Equipo Base VHF..."
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Marca y Modelo</label>
                <input
                  type="text"
                  value={marcaModelo}
                  onChange={(e) => setMarcaModelo(e.target.value)}
                  placeholder="Ej. Nikon D5600 / Motorola DGM8500"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° de Serie / Chasis / Identificador</label>
                <input
                  type="text"
                  value={nroSerie}
                  onChange={(e) => setNroSerie(e.target.value)}
                  placeholder="Ej. S/N 8839201A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cantidad *</label>
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidad</label>
                <input
                  type="text"
                  list="inv-unidades-list"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
                <datalist id="inv-unidades-list">
                  {UNIDADES_SUGERIDAS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado Conservación</label>
                <select
                  value={estadoConservacion}
                  onChange={(e) => setEstadoConservacion(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                >
                  {ESTADOS_CONSERVACION.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Situación Patrimonial</label>
                <select
                  value={situacionPatrimonial}
                  onChange={(e) => setSituacionPatrimonial(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                >
                  {SITUACIONES_PATRIMONIALES.map((sit) => (
                    <option key={sit} value={sit}>
                      {sit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ubicación / Sector en Dependencia *
                </label>
                <input
                  type="text"
                  list="inv-sectores-list"
                  value={ubicacionSector}
                  onChange={(e) => setUbicacionSector(e.target.value)}
                  required
                  placeholder="Ej. Oficina de Jefatura, Sala de Pericias..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
                />
                <datalist id="inv-sectores-list">
                  {SECTORES_SUGERIDOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <SearchableSelect
                  label="Personal Responsable / Depositario"
                  value={responsableNombre}
                  onChange={handleResponsableChange}
                  options={personalOptions}
                  placeholder="Seleccione efectivo o escriba responsable..."
                  allowCustom={true}
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <input
                id="inv-verificado-ok"
                type="checkbox"
                checked={verificadoOk}
                onChange={(e) => setVerificadoOk(e.target.checked)}
                className="w-4 h-4 accent-blue-900 rounded cursor-pointer"
              />
              <label htmlFor="inv-verificado-ok" className="font-semibold text-slate-800 cursor-pointer">
                Bien constatado físicamente y verificado en existencia actual
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Observaciones / Accesorios / Novedades</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalle accesorios incluidos, número de remito/acta de provisión o novedades de deterioro..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800/30 focus:border-blue-800"
              />
            </div>

            {/* Adjuntos */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                  <span>Fotografías / Comprobantes de Cargo ({adjuntos.length})</span>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5 text-blue-800" />
                  <span>Adjuntar Archivo</span>
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
              <span>{isSaving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Registrar Bien'}</span>
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
