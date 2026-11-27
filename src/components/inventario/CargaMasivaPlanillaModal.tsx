import React, { useState, useEffect, useMemo } from 'react';
import { InventarioBien, Personal } from '../../types/police';
import {
  CATEGORIAS_INVENTARIO,
  ESTADOS_CONSERVACION,
  SITUACIONES_PATRIMONIALES,
} from './InventarioBienModal';
import {
  X,
  Plus,
  Trash2,
  Save,
  ClipboardList,
  Copy,
  AlertCircle,
} from 'lucide-react';

interface CargaMasivaPlanillaModalProps {
  isOpen: boolean;
  bienesExistentes: InventarioBien[];
  personalList: Personal[];
  activeDelegacionId: string;
  delegacionNombre?: string;
  usuarioRegistro?: string;
  onSaveBatch: (bienes: InventarioBien[]) => Promise<void> | void;
  onClose: () => void;
}

interface PlanillaRowDraft {
  tempId: string;
  nroInventario: string;
  categoria: string;
  denominacion: string;
  marcaModelo: string;
  nroSerie: string;
  cantidad: number;
  unidad: string;
  estadoConservacion: string;
  situacionPatrimonial: string;
  ubicacionSector: string;
  responsableNombre: string;
  verificadoOk: boolean;
  observaciones: string;
}

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

function getMaxSeq(bienes: InventarioBien[]): number {
  let maxNum = 0;
  for (const b of bienes) {
    const match = String(b.nroInventario || '').match(/(\d+)\s*$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return maxNum;
}

function buildEmptyRow(
  codeNumber: number,
  year: number,
  defaultCategoria: string,
  defaultSector: string
): PlanillaRowDraft {
  return {
    tempId: `row-${Date.now()}-${codeNumber}-${Math.random().toString(36).slice(2, 6)}`,
    nroInventario: `INV-${year}-${String(codeNumber).padStart(3, '0')}`,
    categoria: defaultCategoria,
    denominacion: '',
    marcaModelo: '',
    nroSerie: '',
    cantidad: 1,
    unidad: 'Unidad',
    estadoConservacion: 'Bueno',
    situacionPatrimonial: 'En Uso / Operativo',
    ubicacionSector: defaultSector,
    responsableNombre: '',
    verificadoOk: true,
    observaciones: '',
  };
}

export const CargaMasivaPlanillaModal: React.FC<CargaMasivaPlanillaModalProps> = ({
  isOpen,
  bienesExistentes,
  personalList,
  activeDelegacionId,
  delegacionNombre,
  usuarioRegistro,
  onSaveBatch,
  onClose,
}) => {
  const year = new Date().getFullYear();
  const [defaultCategoria, setDefaultCategoria] = useState<string>(CATEGORIAS_INVENTARIO[0]);
  const [defaultSector, setDefaultSector] = useState<string>('Oficina de Jefatura');
  const [rows, setRows] = useState<PlanillaRowDraft[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const personalNombres = useMemo(() => {
    return (personalList || []).map((p) =>
      `${p.jerarquia ? `${p.jerarquia} ` : ''}${p.apellidoYNombre}`.trim()
    );
  }, [personalList]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const baseSeq = getMaxSeq(bienesExistentes);
    const initialRows: PlanillaRowDraft[] = [];
    for (let i = 1; i <= 8; i++) {
      initialRows.push(buildEmptyRow(baseSeq + i, year, CATEGORIAS_INVENTARIO[0], 'Oficina de Jefatura'));
    }
    setDefaultCategoria(CATEGORIAS_INVENTARIO[0]);
    setDefaultSector('Oficina de Jefatura');
    setRows(initialRows);
  }, [isOpen, bienesExistentes, year]);

  const handleAddRows = (count: number) => {
    let maxCode = getMaxSeq(bienesExistentes);
    for (const r of rows) {
      const m = String(r.nroInventario || '').match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxCode) maxCode = n;
      }
    }
    const added: PlanillaRowDraft[] = [];
    for (let i = 1; i <= count; i++) {
      added.push(buildEmptyRow(maxCode + i, year, defaultCategoria, defaultSector));
    }
    setRows((prev) => [...prev, ...added]);
  };

  const handleApplyDefaultsToEmpty = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        categoria: defaultCategoria,
        ubicacionSector: r.denominacion.trim() ? r.ubicacionSector : defaultSector,
      }))
    );
  };

  const handleUpdateRow = (tempId: string, patch: Partial<PlanillaRowDraft>) => {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  };

  const handleRemoveRow = (tempId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.tempId !== tempId)));
  };

  const isRowTouched = (r: PlanillaRowDraft) =>
    Boolean(
      r.denominacion.trim() ||
        r.marcaModelo.trim() ||
        r.nroSerie.trim() ||
        r.responsableNombre.trim() ||
        r.observaciones.trim()
    );

  const readyRowsCount = useMemo(() => {
    return rows.filter((r) => r.denominacion.trim() && r.nroInventario.trim() && r.ubicacionSector.trim()).length;
  }, [rows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const touchedRows = rows.filter(isRowTouched);
    if (touchedRows.length === 0) {
      setErrorMsg('Complete al menos una fila con la denominación del bien para cargar al inventario.');
      return;
    }

    for (let idx = 0; idx < touchedRows.length; idx++) {
      const r = touchedRows[idx];
      if (!r.nroInventario.trim()) {
        setErrorMsg(`Falta el N° de Inventario en la fila con "${r.denominacion || 'sin descripción'}".`);
        return;
      }
      if (!r.denominacion.trim()) {
        setErrorMsg(`La fila ${r.nroInventario} tiene datos cargados pero falta la Denominación / Descripción.`);
        return;
      }
      if (!r.ubicacionSector.trim()) {
        setErrorMsg(`La fila ${r.nroInventario} ("${r.denominacion}") requiere indicar el Sector / Ubicación.`);
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const todayYmd = nowIso.slice(0, 10);

    const records: InventarioBien[] = touchedRows.map((r, idx) => ({
      id: `inv-planilla-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      nroInventario: r.nroInventario.trim().toUpperCase(),
      categoria: r.categoria || CATEGORIAS_INVENTARIO[0],
      denominacion: r.denominacion.trim(),
      marcaModelo: r.marcaModelo.trim() || undefined,
      nroSerie: r.nroSerie.trim() || undefined,
      cantidad: Number.isFinite(r.cantidad) && r.cantidad > 0 ? Math.round(r.cantidad) : 1,
      unidad: r.unidad.trim() || 'Unidad',
      estadoConservacion: r.estadoConservacion || 'Bueno',
      situacionPatrimonial: r.situacionPatrimonial || 'En Uso / Operativo',
      ubicacionSector: r.ubicacionSector.trim(),
      responsableNombre: r.responsableNombre.trim() || undefined,
      fechaAlta: todayYmd,
      ultimaVerificacionFecha: r.verificadoOk ? todayYmd : undefined,
      verificadoOk: r.verificadoOk,
      origenModulo: 'manual',
      observaciones: r.observaciones.trim() || undefined,
      adjuntos: [],
      delegacionId: activeDelegacionId,
      delegacionNombre,
      usuarioRegistro,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    try {
      setIsSaving(true);
      await onSaveBatch(records);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la carga masiva desde planilla.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-[96vw] max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-800/70 text-blue-100 shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight truncate">
                Carga Rápida desde Planilla Manual de Relevamiento
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                Transcriba en lote los bienes relevados en la planilla impresa; las filas vacías se ignoran automáticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de valores por defecto y acciones */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-end justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Categoría Predeterminada (para filas nuevas)
              </label>
              <select
                value={defaultCategoria}
                onChange={(e) => setDefaultCategoria(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                {CATEGORIAS_INVENTARIO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sector Predeterminado (para relevamiento por oficina)
              </label>
              <input
                type="text"
                list="planilla-sectores-list"
                value={defaultSector}
                onChange={(e) => setDefaultSector(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-56"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDefaultsToEmpty}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5 text-blue-800" />
              <span>Aplicar a la tabla</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRows(1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+1 Fila</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRows(5)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-semibold cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+5 Filas</span>
            </button>
          </div>
        </div>

        {/* Tabla tipo planilla */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <datalist id="planilla-sectores-list">
            {SECTORES_SUGERIDOS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <datalist id="planilla-unidades-list">
            {UNIDADES_SUGERIDAS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <datalist id="planilla-personal-list">
            {personalNombres.map((nom) => (
              <option key={nom} value={nom} />
            ))}
          </datalist>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1280px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 w-8 text-center">#</th>
                  <th className="py-2 px-2 w-32">N° Inv. *</th>
                  <th className="py-2 px-2 w-44">Categoría</th>
                  <th className="py-2 px-2 min-w-[200px]">Denominación / Descripción *</th>
                  <th className="py-2 px-2 w-36">Marca / Modelo</th>
                  <th className="py-2 px-2 w-32">N° Serie</th>
                  <th className="py-2 px-2 w-16 text-center">Cant.</th>
                  <th className="py-2 px-2 w-24">Unidad</th>
                  <th className="py-2 px-2 w-36">Conservación</th>
                  <th className="py-2 px-2 w-40">Situación</th>
                  <th className="py-2 px-2 w-44">Sector / Ubicación *</th>
                  <th className="py-2 px-2 w-40">Responsable</th>
                  <th className="py-2 px-2 w-40">Observaciones</th>
                  <th className="py-2 px-2 w-12 text-center" title="Constatado físicamente">Verif.</th>
                  <th className="py-2 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const active = isRowTouched(row);
                  return (
                    <tr
                      key={row.tempId}
                      className={active ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50/70'}
                    >
                      <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.nroInventario}
                          onChange={(e) => handleUpdateRow(row.tempId, { nroInventario: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-semibold text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <select
                          value={row.categoria}
                          onChange={(e) => handleUpdateRow(row.tempId, { categoria: e.target.value })}
                          className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        >
                          {CATEGORIAS_INVENTARIO.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.denominacion}
                          onChange={(e) => handleUpdateRow(row.tempId, { denominacion: e.target.value })}
                          placeholder="Ej. Escritorio metálico, Monitor..."
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white font-medium"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.marcaModelo}
                          onChange={(e) => handleUpdateRow(row.tempId, { marcaModelo: e.target.value })}
                          placeholder="Marca/Mod."
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.nroSerie}
                          onChange={(e) => handleUpdateRow(row.tempId, { nroSerie: e.target.value })}
                          placeholder="S/N"
                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="number"
                          min={1}
                          value={row.cantidad}
                          onChange={(e) =>
                            handleUpdateRow(row.tempId, {
                              cantidad: Math.max(1, parseInt(e.target.value || '1', 10)),
                            })
                          }
                          className="w-full px-1.5 py-1 border border-slate-300 rounded font-mono tabular-nums text-center text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          list="planilla-unidades-list"
                          value={row.unidad}
                          onChange={(e) => handleUpdateRow(row.tempId, { unidad: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <select
                          value={row.estadoConservacion}
                          onChange={(e) =>
                            handleUpdateRow(row.tempId, { estadoConservacion: e.target.value })
                          }
                          className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        >
                          {ESTADOS_CONSERVACION.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1.5">
                        <select
                          value={row.situacionPatrimonial}
                          onChange={(e) =>
                            handleUpdateRow(row.tempId, { situacionPatrimonial: e.target.value })
                          }
                          className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        >
                          {SITUACIONES_PATRIMONIALES.map((sit) => (
                            <option key={sit} value={sit}>
                              {sit}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          list="planilla-sectores-list"
                          value={row.ubicacionSector}
                          onChange={(e) => handleUpdateRow(row.tempId, { ubicacionSector: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          list="planilla-personal-list"
                          value={row.responsableNombre}
                          onChange={(e) =>
                            handleUpdateRow(row.tempId, { responsableNombre: e.target.value })
                          }
                          placeholder="Opcional"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-1.5">
                        <input
                          type="text"
                          value={row.observaciones}
                          onChange={(e) => handleUpdateRow(row.tempId, { observaciones: e.target.value })}
                          placeholder="Obs."
                          className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.verificadoOk}
                          onChange={(e) => handleUpdateRow(row.tempId, { verificadoOk: e.target.checked })}
                          className="w-3.5 h-3.5 accent-blue-900 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.tempId)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Quitar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Bienes listos para incorporar al inventario:{' '}
            <span className="font-mono font-bold text-slate-900 tabular-nums">{readyRowsCount}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving || readyRowsCount === 0}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-950 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSaving
                  ? 'Cargando...'
                  : `Cargar ${readyRowsCount} ${readyRowsCount === 1 ? 'Bien' : 'Bienes'} al Inventario`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
