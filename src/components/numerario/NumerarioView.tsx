import React, { useState, useMemo, useEffect } from 'react';
import {
  SerieNumerario,
  FolioAsignado,
  ConfiguracionSistema,
  Personal,
  UsuarioSistema,
  DelegacionPolicial,
} from '../../types/police';
import {
  Hash,
  BookmarkCheck,
  Plus,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Search,
  Filter,
  Eye,
  Settings,
  ChevronRight,
  ChevronLeft,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { AsignarFolioModal } from './AsignarFolioModal';
import { DetalleFolioModal } from './DetalleFolioModal';
import { GestionSeriesModal } from './GestionSeriesModal';
import { LibroFoliosModal } from './LibroFoliosModal';
import { ReinicioSerieModal } from './ReinicioSerieModal';

interface NumerarioViewProps {
  seriesList: SerieNumerario[];
  foliosList: FolioAsignado[];
  config: ConfiguracionSistema;
  personalList: Personal[];
  currentUser?: UsuarioSistema;
  delegacionesList?: DelegacionPolicial[];
  activeDelegacionId?: string;
  onSaveFolios: (folios: FolioAsignado[]) => Promise<void> | void;
  onUpdateFolio: (folio: FolioAsignado) => Promise<void> | void;
  onLiberarFolio: (folio: FolioAsignado, liberarRangoCompleto?: boolean) => Promise<void> | void;
  onSaveSerie: (serie: SerieNumerario) => Promise<void> | void;
  onDeleteSerie: (id: string) => Promise<void> | void;
  onResetSerie: (serieId: string) => Promise<void> | void;
}

export type GridDensity = 'compacta' | 'estandar' | 'grande';

export const NumerarioView: React.FC<NumerarioViewProps> = ({
  seriesList,
  foliosList,
  config,
  personalList,
  currentUser,
  delegacionesList = [],
  activeDelegacionId = 'del-laguna-blanca',
  onSaveFolios,
  onUpdateFolio,
  onLiberarFolio,
  onSaveSerie,
  onDeleteSerie,
  onResetSerie,
}) => {
  // Serie activa seleccionada
  const [activeSerieId, setActiveSerieId] = useState<string>(() => {
    return seriesList[0]?.id || 'serie-oficio-jefatura';
  });

  // Asegurar que activeSerieId sea válida si cambia la lista
  useEffect(() => {
    if (seriesList.length > 0 && !seriesList.some((s) => s.id === activeSerieId)) {
      setActiveSerieId(seriesList[0].id);
    }
  }, [seriesList, activeSerieId]);

  const activeSerie = useMemo(() => {
    return seriesList.find((s) => s.id === activeSerieId) || seriesList[0];
  }, [seriesList, activeSerieId]);

  // Densidad de visualización de la cuadrícula
  const [density, setDensity] = useState<GridDensity>('estandar');

  // Límite dinámico de números (+100 números)
  const [limiteDinamico, setLimiteDinamico] = useState<number>(() => {
    return activeSerie?.limiteFolios || 1000;
  });

  useEffect(() => {
    if (activeSerie) {
      setLimiteDinamico(activeSerie.limiteFolios || 1000);
    }
  }, [activeSerie?.id, activeSerie?.limiteFolios]);

  // Folios asignados a la serie activa indexados por número (O(1) lookup)
  const folioMap = useMemo(() => {
    const map = new Map<number, FolioAsignado>();
    foliosList
      .filter((f) => f.serieId === activeSerie?.id)
      .forEach((f) => {
        map.set(f.numero, f);
      });
    return map;
  }, [foliosList, activeSerie?.id]);

  // Selección visual con Shift + Clic
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ desde: number; hasta: number } | null>(null);

  // Modales
  const [isAsignarOpen, setIsAsignarOpen] = useState(false);
  const [asignarInitialNum, setAsignarInitialNum] = useState<number | undefined>(undefined);
  const [asignarInitialHasta, setAsignarInitialHasta] = useState<number | undefined>(undefined);

  const [selectedFolioDetalle, setSelectedFolioDetalle] = useState<FolioAsignado | null>(null);
  const [isGestionSeriesOpen, setIsGestionSeriesOpen] = useState(false);
  const [isLibroFoliosOpen, setIsLibroFoliosOpen] = useState(false);
  const [isReinicioOpen, setIsReinicioOpen] = useState(false);

  // Estadísticas de la serie activa
  const totalFolios = limiteDinamico;
  const totalOcupados = folioMap.size;
  const totalLibres = Math.max(0, totalFolios - totalOcupados);

  // Detectar primer número libre
  const primerNumeroLibre = useMemo(() => {
    for (let i = 1; i <= totalFolios; i++) {
      if (!folioMap.has(i)) return i;
    }
    return totalFolios + 1;
  }, [folioMap, totalFolios]);

  // Detectar último número ocupado
  const ultimoNumeroOcupado = useMemo(() => {
    let max = 0;
    for (const num of folioMap.keys()) {
      if (num > max) max = num;
    }
    return max;
  }, [folioMap]);

  // Manejar clic en una casilla numérica (con soporte Shift + Clic)
  const handleCellClick = (num: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedNumber !== null) {
      // Selección de rango con Shift
      const min = Math.min(lastClickedNumber, num);
      const max = Math.max(lastClickedNumber, num);
      setSelectedRange({ desde: min, hasta: max });
      return;
    }

    setLastClickedNumber(num);
    setSelectedRange(null);

    const folioExistente = folioMap.get(num);
    if (folioExistente) {
      // Casilla ocupada -> abrir ficha de detalle
      setSelectedFolioDetalle(folioExistente);
    } else {
      // Casilla libre -> abrir modal de asignación para este número
      setAsignarInitialNum(num);
      setAsignarInitialHasta(num);
      setIsAsignarOpen(true);
    }
  };

  // Botón directo: Asignar Siguiente Libre
  const handleAsignarSiguienteLibre = () => {
    setSelectedRange(null);
    setAsignarInitialNum(primerNumeroLibre);
    setAsignarInitialHasta(primerNumeroLibre);
    setIsAsignarOpen(true);
  };

  // Asignar el bloque seleccionado con Shift + Clic
  const handleAsignarRangoSeleccionado = () => {
    if (selectedRange) {
      setAsignarInitialNum(selectedRange.desde);
      setAsignarInitialHasta(selectedRange.hasta);
      setIsAsignarOpen(true);
    }
  };

  // Ampliar dinámicamente +100 números
  const handleAmpliarCienNumeros = async () => {
    const nuevoLimite = limiteDinamico + 100;
    setLimiteDinamico(nuevoLimite);
    if (activeSerie) {
      await onSaveSerie({
        ...activeSerie,
        limiteFolios: nuevoLimite,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Clases según densidad seleccionada
  const getCellSizeClass = () => {
    switch (density) {
      case 'compacta':
        return 'h-7 text-[10px] min-w-[34px]';
      case 'grande':
        return 'h-11 text-sm min-w-[50px] font-bold';
      case 'estandar':
      default:
        return 'h-9 text-xs min-w-[42px]';
    }
  };

  // Encabezados de columnas C1 a C20
  const columnasEncabezados = useMemo(() => {
    const arr: string[] = [];
    for (let c = 1; c <= 20; c++) {
      arr.push(`C${c}`);
    }
    return arr;
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Principal del Módulo */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-800 rounded-xl text-blue-200 shadow-xs">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Control de Folios y Numerario Oficial
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700">
                20 Columnas Continuas (C1 - C20)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {config.dependencia || 'Delegación Policía Científica Laguna Blanca'}
              </span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ciclo Oficial {new Date().getFullYear()}</span>
            </p>
          </div>
        </div>

        {/* Acciones Rápidas del Header */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleAsignarSiguienteLibre}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Asignar automáticamente el primer número libre"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Asignar Siguiente (#{primerNumeroLibre})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLibroFoliosOpen(true)}
            className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Ver Libro de Folios consolidado y exportar a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-200" />
            <span>Libro de Folios</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGestionSeriesOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Administrar o agregar nuevas series de numerario"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Series ({seriesList.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Pestañas / Solapas de Series Independientes */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1">
          {seriesList.map((serie) => {
            const countOcupadosSerie = foliosList.filter((f) => f.serieId === serie.id).length;
            const isActive = serie.id === activeSerie?.id;
            return (
              <button
                key={serie.id}
                type="button"
                onClick={() => {
                  setActiveSerieId(serie.id);
                  setSelectedRange(null);
                }}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{serie.nombre}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-blue-950 text-blue-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {countOcupadosSerie}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsGestionSeriesOpen(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-dashed border-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Agregar nueva serie independiente de numerario"
          >
            <Plus className="w-4 h-4 text-blue-800" />
            <span className="hidden sm:inline">Nueva Serie</span>
          </button>
        </div>

        {/* Botón de Reinicio Seguro de la Serie Activa */}
        <button
          type="button"
          onClick={() => setIsReinicioOpen(true)}
          className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          title={`Reiniciar numerario de la serie "${activeSerie?.nombre}"`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden md:inline">Reiniciar Serie</span>
        </button>
      </div>

      {/* 3. Panel de Métricas / KPIs y Barra de Herramientas de la Grilla */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Folios Serie
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-slate-900">{totalFolios}</span>
            <span className="text-[11px] text-slate-400 font-mono">(C1 - C20)</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
            Folios Ocupados
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-red-700">{totalOcupados}</span>
            <span className="text-[10px] text-red-500 font-semibold">Tachados</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Folios Disponibles
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-emerald-800">{totalLibres}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Libres</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Último Ocupado
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-blue-900">
              {ultimoNumeroOcupado > 0 ? `#${ultimoNumeroOcupado}` : 'Ninguno'}
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
            Próximo a Asignar
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xl font-bold font-mono text-blue-950">#{primerNumeroLibre}</span>
            <button
              type="button"
              onClick={handleAsignarSiguienteLibre}
              className="text-[10px] font-bold bg-blue-900 text-white px-2 py-0.5 rounded hover:bg-blue-950 cursor-pointer"
            >
              Asignar
            </button>
          </div>
        </div>
      </div>

      {/* 4. Barra de Densidad y Ayuda de Selección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        {/* Referencias visuales */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="font-bold text-slate-700">Estado de Casilla:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded border border-slate-300 bg-white shadow-2xs inline-block" />
            <span className="text-slate-600 font-medium">Libre / Disponible (Clic para asignar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-red-600 text-white font-mono font-bold text-[10px] flex items-center justify-center line-through shadow-2xs">
              01
            </span>
            <span className="text-red-700 font-bold">Ocupado / Tachado (Clic para ver detalle)</span>
          </div>
        </div>

        {/* Controles: Densidad de la grilla */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-slate-500 font-medium">Densidad Grilla:</span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setDensity('compacta')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors cursor-pointer ${
                density === 'compacta'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compacta
            </button>
            <button
              type="button"
              onClick={() => setDensity('estandar')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors cursor-pointer ${
                density === 'estandar'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estándar
            </button>
            <button
              type="button"
              onClick={() => setDensity('grande')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-colors cursor-pointer ${
                density === 'grande'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grande
            </button>
          </div>
        </div>
      </div>

      {/* 5. Barra Flotante de Rango Seleccionado con Shift + Clic */}
      {selectedRange && (
        <div className="p-3 bg-blue-950 text-white rounded-xl shadow-lg border border-blue-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Rango seleccionado: <strong>Folios #{selectedRange.desde} al #{selectedRange.hasta}</strong>{' '}
              ({selectedRange.hasta - selectedRange.desde + 1} casillas seleccionadas)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedRange(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Deseleccionar
            </button>
            <button
              type="button"
              onClick={handleAsignarRangoSeleccionado}
              className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Asignar Bloque Continuo</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Cuadrícula Numérica Continua (Estilo Hoja de Cálculo: 20 Columnas Continuas C1 a C20) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Encabezado de la Grilla con Identificador de Serie */}
        <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-blue-300 uppercase">
              {activeSerie?.nombre} ({activeSerie?.prefijo})
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Numerario Oficial Correlativo 1 al {limiteDinamico}</span>
          </div>
          <span className="text-[11px] text-slate-400 italic hidden sm:inline">
            Tip: Presione Shift + Clic para seleccionar rangos visualmente
          </span>
        </div>

        {/* Tabla / Grilla con Scroll Horizontal fluido si la pantalla es reducida */}
        <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
          <table className="w-full border-collapse text-center">
            {/* Cabecera de 20 columnas C1 a C20 */}
            <thead className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold sticky top-0 z-20 shadow-2xs border-b border-slate-300">
              <tr>
                <th className="py-1.5 px-2 bg-slate-200 border-r border-slate-300 text-slate-500 w-12 sticky left-0 z-30">
                  Fila
                </th>
                {columnasEncabezados.map((col) => (
                  <th key={col} className="py-1.5 px-1 border-r border-slate-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Filas continuas de 20 casillas cada una */}
            <tbody className="divide-y divide-slate-200">
              {Array.from({ length: Math.ceil(limiteDinamico / 20) }).map((_, filaIdx) => {
                const filaInicio = filaIdx * 20 + 1;
                return (
                  <tr key={filaIdx} className="hover:bg-slate-50/50">
                    {/* Indicador de fila / bloque */}
                    <td className="py-1 px-1.5 bg-slate-100 font-mono text-[10px] text-slate-500 font-bold border-r border-slate-300 select-none sticky left-0 z-10">
                      {filaInicio}
                    </td>

                    {/* 20 Columnas */}
                    {Array.from({ length: 20 }).map((__, colIdx) => {
                      const num = filaIdx * 20 + colIdx + 1;
                      if (num > limiteDinamico) {
                        return (
                          <td
                            key={colIdx}
                            className="bg-slate-50 border-r border-slate-100 p-0"
                          />
                        );
                      }

                      const folioOcupado = folioMap.get(num);
                      const isOccupied = !!folioOcupado;

                      const isInSelectedRange =
                        selectedRange &&
                        num >= selectedRange.desde &&
                        num <= selectedRange.hasta;

                      return (
                        <td
                          key={colIdx}
                          className="border-r border-slate-200 p-0.5 relative group"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleCellClick(num, e)}
                            className={`w-full rounded transition-all cursor-pointer flex items-center justify-center font-mono select-none ${getCellSizeClass()} ${
                              isInSelectedRange
                                ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 z-10'
                                : isOccupied
                                ? 'bg-red-600 hover:bg-red-700 text-white font-bold line-through border border-red-700 shadow-2xs'
                                : 'bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <span>{num}</span>
                          </button>

                          {/* Hover / Tooltip flotante oficial con información del trámite */}
                          {isOccupied && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none w-64 animate-in fade-in duration-150">
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-left text-xs space-y-1">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-mono">
                                  <span className="font-bold text-red-400">Folio #{num}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {folioOcupado.fechaAsignacion}
                                  </span>
                                </div>
                                <div className="font-bold text-blue-300 font-mono text-xs">
                                  {folioOcupado.codigoCaratula}
                                </div>
                                <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                                  {folioOcupado.asunto}
                                </p>
                                <div className="text-[10px] text-slate-400 pt-0.5">
                                  <span className="text-slate-500">Dest.:</span>{' '}
                                  {folioOcupado.destinatario || '---'}
                                </div>
                                <div className="text-[9px] text-emerald-400 font-semibold pt-1">
                                  ✓ Clic para abrir ficha de detalle y liberación
                                </div>
                              </div>
                              {/* Flecha del tooltip */}
                              <div className="w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 mx-auto -mt-1.5" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 7. Pie de la Cuadrícula: Botón de Ampliación Dinámica (+100 Números) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-mono text-[11px]">
            Visualizando casillas del <strong>#1</strong> al <strong>#{limiteDinamico}</strong> (total {limiteDinamico} folios oficiales)
          </div>

          <button
            type="button"
            onClick={handleAmpliarCienNumeros}
            className="bg-white hover:bg-slate-100 text-blue-900 border border-blue-300 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Ampliar 100 números adicionales a esta serie"
          >
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Ampliar +100 Números (al #{limiteDinamico + 100})</span>
          </button>
        </div>
      </div>

      {/* 8. Modales del Módulo */}
      {/* Modal Asignar Folio */}
      {isAsignarOpen && activeSerie && (
        <AsignarFolioModal
          isOpen={isAsignarOpen}
          serie={activeSerie}
          initialNumero={asignarInitialNum}
          initialRangoHasta={asignarInitialHasta}
          existingFolios={foliosList}
          personalList={personalList}
          onSave={onSaveFolios}
          onClose={() => setIsAsignarOpen(false)}
        />
      )}

      {/* Modal Detalle Folio Ocupado */}
      {selectedFolioDetalle && (
        <DetalleFolioModal
          folio={selectedFolioDetalle}
          serie={activeSerie}
          onUpdate={onUpdateFolio}
          onLiberar={onLiberarFolio}
          onClose={() => setSelectedFolioDetalle(null)}
        />
      )}

      {/* Modal Gestión de Series */}
      {isGestionSeriesOpen && (
        <GestionSeriesModal
          isOpen={isGestionSeriesOpen}
          seriesList={seriesList}
          activeSerieId={activeSerie?.id || ''}
          onSaveSerie={onSaveSerie}
          onDeleteSerie={onDeleteSerie}
          onSelectSerie={(id) => {
            setActiveSerieId(id);
            setIsGestionSeriesOpen(false);
          }}
          onClose={() => setIsGestionSeriesOpen(false)}
        />
      )}

      {/* Modal Libro de Folios y Reportes Oficiales */}
      {isLibroFoliosOpen && (
        <LibroFoliosModal
          isOpen={isLibroFoliosOpen}
          seriesList={seriesList}
          activeSerieId={activeSerie?.id || ''}
          foliosList={foliosList}
          config={config}
          onClose={() => setIsLibroFoliosOpen(false)}
        />
      )}

      {/* Modal Reinicio Seguro por Serie */}
      {isReinicioOpen && activeSerie && (
        <ReinicioSerieModal
          isOpen={isReinicioOpen}
          serie={activeSerie}
          totalOcupados={totalOcupados}
          onConfirmReset={() => onResetSerie(activeSerie.id)}
          onClose={() => setIsReinicioOpen(false)}
        />
      )}
    </div>
  );
};
