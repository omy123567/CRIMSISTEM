import React, { useState, useMemo } from 'react';
import { ParteNovedadesGuardia, ConfiguracionSistema } from '../../types/police';
import {
  Car,
  Search,
  Download,
  Filter,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Layers,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

export interface VehiculoSiniestroConsolidado {
  id: string;
  identificador: string; // "MÓVIL UNO", "MÓVIL DOS", etc.
  dominio: string; // Patente o Dominio
  tipo: string;
  marca?: string;
  modelo?: string;
  propietarioOConductor: string;
  circulacion: string;
  zonaContacto: string;
  lesiones: string;
  intervencionCodigo: string;
  intervencionHecho: string;
  inspeccionFecha: string;
  inspeccionHora: string;
  inspeccionLugar: string;
  parteId: string;
  grupoGuardia: string;
}

export interface VehiculoAgrupado {
  key: string;
  dominio: string;
  tipo: string;
  propietarioHabitual: string;
  totalSiniestros: number;
  siniestros: VehiculoSiniestroConsolidado[];
}

interface VehiculosViewProps {
  partesGuardiaList: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
  onNavigateToGuardias?: () => void;
}

export const VehiculosView: React.FC<VehiculosViewProps> = ({
  partesGuardiaList,
  config,
  onNavigateToGuardias,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroLesion, setFiltroLesion] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('todos');
  const [soloMultiples, setSoloMultiples] = useState<boolean>(false);
  const [modoOrganizacion, setModoOrganizacion] = useState<'agrupado' | 'detallado'>('agrupado');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const copy = new Set(prev);
      if (copy.has(key)) {
        copy.delete(key);
      } else {
        copy.add(key);
      }
      return copy;
    });
  };

  const expandAll = () => {
    const allKeys = new Set(vehiculosAgrupados.map((v) => v.key));
    setExpandedKeys(allKeys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Consolidar todos los vehículos siniestrados de las intervenciones accidentológicas
  const vehiculosConsolidados: VehiculoSiniestroConsolidado[] = useMemo(() => {
    const list: VehiculoSiniestroConsolidado[] = [];

    partesGuardiaList.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        (interv.vehiculosSiniestro || []).forEach((v, idx) => {
          list.push({
            id: `veh-${interv.id}-${v.id || idx}`,
            identificador: v.identificador || `MÓVIL #${idx + 1}`,
            dominio: v.dominio?.trim().toUpperCase() || 'S/D',
            tipo: v.tipo || 'Vehículo',
            marca: v.marca,
            modelo: v.modelo,
            propietarioOConductor: v.propietarioOConductor || 'S/D',
            circulacion: v.circulacion || 'S/D',
            zonaContacto: v.zonaContacto || 'S/D',
            lesiones: v.lesiones || 'Sin datos',
            intervencionCodigo: interv.codigoIntervencion,
            intervencionHecho: interv.hecho,
            inspeccionFecha: interv.inspeccionFecha,
            inspeccionHora: interv.inspeccionHora,
            inspeccionLugar: interv.inspeccionLugar,
            parteId: parte.id,
            grupoGuardia: parte.tipoGuardia || parte.grupoGuardia,
          });
        });
      });
    });

    return list.sort((a, b) => b.inspeccionFecha.localeCompare(a.inspeccionFecha));
  }, [partesGuardiaList]);

  // Agrupamiento por vehículo único (por Dominio / Patente o Identificador)
  const vehiculosAgrupados: VehiculoAgrupado[] = useMemo(() => {
    const map = new Map<string, VehiculoAgrupado>();

    vehiculosConsolidados.forEach((v) => {
      const cleanDominio = v.dominio && v.dominio !== 'S/D' ? v.dominio.trim().toUpperCase() : null;
      const key = cleanDominio ? `DOM:${cleanDominio}` : `ID:${v.tipo.toUpperCase()}-${v.propietarioOConductor.toUpperCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          dominio: v.dominio,
          tipo: v.tipo,
          propietarioHabitual: v.propietarioOConductor,
          totalSiniestros: 0,
          siniestros: [],
        });
      }

      const item = map.get(key)!;
      item.totalSiniestros += 1;
      item.siniestros.push(v);
      if (v.propietarioOConductor && v.propietarioOConductor !== 'S/D') {
        item.propietarioHabitual = v.propietarioOConductor;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSiniestros - a.totalSiniestros);
  }, [vehiculosConsolidados]);

  // Conteo de vehículos con múltiples siniestros
  const totalMultiplesSiniestros = useMemo(() => {
    return vehiculosAgrupados.filter((v) => v.totalSiniestros > 1).length;
  }, [vehiculosAgrupados]);

  // Tipos únicos para filtro
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    vehiculosConsolidados.forEach((v) => {
      if (v.tipo) set.add(v.tipo);
    });
    return Array.from(set);
  }, [vehiculosConsolidados]);

  // Filtrado agrupado
  const filteredAgrupados = useMemo(() => {
    return vehiculosAgrupados.filter((v) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        v.dominio.toLowerCase().includes(term) ||
        v.tipo.toLowerCase().includes(term) ||
        v.propietarioHabitual.toLowerCase().includes(term) ||
        v.siniestros.some(
          (s) =>
            s.intervencionHecho.toLowerCase().includes(term) ||
            s.inspeccionLugar.toLowerCase().includes(term) ||
            s.intervencionCodigo.toLowerCase().includes(term) ||
            s.zonaContacto.toLowerCase().includes(term)
        );

      const matchTipo = filtroTipo === 'todos' || v.tipo.toLowerCase().includes(filtroTipo.toLowerCase());

      const matchLesion =
        filtroLesion === 'todas' ||
        v.siniestros.some((s) => s.lesiones.toLowerCase().includes(filtroLesion.toLowerCase()));

      const matchAnio =
        filtroAnio === 'todos' ||
        v.siniestros.some((s) => s.inspeccionFecha && s.inspeccionFecha.startsWith(filtroAnio));

      const matchMultiples = !soloMultiples || v.totalSiniestros > 1;

      return matchSearch && matchTipo && matchLesion && matchAnio && matchMultiples;
    });
  }, [vehiculosAgrupados, searchTerm, filtroTipo, filtroLesion, filtroAnio, soloMultiples]);

  // Filtrado de lista detallada
  const filteredListDetallada = useMemo(() => {
    return vehiculosConsolidados.filter((v) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        v.dominio.toLowerCase().includes(term) ||
        v.identificador.toLowerCase().includes(term) ||
        v.tipo.toLowerCase().includes(term) ||
        v.propietarioOConductor.toLowerCase().includes(term) ||
        v.intervencionHecho.toLowerCase().includes(term) ||
        v.inspeccionLugar.toLowerCase().includes(term) ||
        v.intervencionCodigo.toLowerCase().includes(term);

      const matchTipo = filtroTipo === 'todos' || v.tipo.toLowerCase().includes(filtroTipo.toLowerCase());

      const matchLesion =
        filtroLesion === 'todas' ||
        (filtroLesion === 'ileso' && v.lesiones.toLowerCase().includes('ileso')) ||
        (filtroLesion === 'lesionado' && !v.lesiones.toLowerCase().includes('ileso'));

      const matchAnio =
        filtroAnio === 'todos' || (v.inspeccionFecha && v.inspeccionFecha.startsWith(filtroAnio));

      return matchSearch && matchTipo && matchLesion && matchAnio;
    });
  }, [vehiculosConsolidados, searchTerm, filtroTipo, filtroLesion, filtroAnio]);

  // Exportar a PDF
  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const startY = drawPoliceHeader(
      doc,
      config,
      'REGISTRO CENTRALIZADO DE VEHÍCULOS / RODADOS EN SINIESTROS VIALES',
      10
    );

    if (modoOrganizacion === 'agrupado') {
      const rows = filteredAgrupados.map((v, i) => [
        i + 1,
        v.dominio,
        v.tipo,
        v.propietarioHabitual,
        `${v.totalSiniestros} siniestro(s)`,
        v.siniestros.map((s) => `${s.inspeccionFecha}: ${s.intervencionHecho} (${s.zonaContacto} - ${s.lesiones})`).join('\n'),
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['#', 'Dominio/Patente', 'Tipo de Rodado', 'Titular / Conductor', 'Total Siniestros', 'Historial de Intervenciones']],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 25, fontStyle: 'bold' },
          5: { cellWidth: 120 },
        },
      });
    } else {
      const rows = filteredListDetallada.map((v, i) => [
        i + 1,
        v.dominio,
        v.identificador,
        v.tipo,
        v.propietarioOConductor,
        v.circulacion,
        v.zonaContacto,
        v.lesiones,
        v.inspeccionFecha,
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['#', 'Dominio', 'Identificador', 'Tipo', 'Propietario / Conductor', 'Circulación', 'Zona Contacto', 'Lesiones', 'Fecha']],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      });
    }

    drawPoliceFooter(doc, config);
    doc.save(`SISPOL_Registro_Vehiculos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Institucional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Car className="w-6 h-6 text-amber-700" />
              <span>Vehículos (Rodados Intervinientes en Siniestros Viales)</span>
            </h1>
            <span className="bg-amber-100 text-amber-950 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {vehiculosAgrupados.length} vehículos registrados
            </span>
            {totalMultiplesSiniestros > 0 && (
              <span className="bg-red-100 text-red-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-700" />
                <span>{totalMultiplesSiniestros} con siniestros múltiples</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consolidación de automóviles, motovehículos y rodados peritados en colisiones, despistes y siniestros de tránsito.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Modo de Organización */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-600 text-xs">
            <button
              onClick={() => setModoOrganizacion('agrupado')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoOrganizacion === 'agrupado'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial por Vehículo</span>
            </button>
            <button
              onClick={() => setModoOrganizacion('detallado')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoOrganizacion === 'detallado'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detalle por Hecho</span>
            </button>
          </div>

          {/* Alternancia de vistas */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-600">
            <button
              onClick={() => setViewMode('cards')}
              title="Vista de Tarjetas"
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista de Tabla"
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-amber-800 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Dominio/Patente, Tipo, Titular o Dirección..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {/* Filtro Tipo de Vehículo */}
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="todos">Todos los Tipos de Rodado</option>
              {tiposUnicos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Lesión */}
          <div>
            <select
              value={filtroLesion}
              onChange={(e) => setFiltroLesion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="todas">Todas las Lesiones</option>
              <option value="ileso">Ileso / Sin Lesiones</option>
              <option value="lesionado">Con Lesiones / Hospitalizados</option>
            </select>
          </div>

          {/* Filtro Año */}
          <div>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoloMultiples(!soloMultiples)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soloMultiples
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${soloMultiples ? 'text-white' : 'text-red-600'}`} />
              <span>Solo rodados en múltiples siniestros ({totalMultiplesSiniestros})</span>
            </button>

            {modoOrganizacion === 'agrupado' && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-amber-900 font-semibold cursor-pointer underline"
                >
                  Expandir Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-amber-900 font-semibold cursor-pointer underline"
                >
                  Colapsar Todos
                </button>
              </div>
            )}
          </div>

          <span className="text-slate-500 text-[11px]">
            Mostrando{' '}
            <strong className="text-slate-800">
              {modoOrganizacion === 'agrupado' ? filteredAgrupados.length : filteredListDetallada.length}
            </strong>{' '}
            {modoOrganizacion === 'agrupado' ? 'vehículos' : 'siniestros'}
          </span>
        </div>
      </div>

      {/* Contenido: MODO HISTORIAL AGRUPADO POR VEHÍCULO */}
      {modoOrganizacion === 'agrupado' && (
        <>
          {filteredAgrupados.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No se encontraron vehículos</h3>
              <p className="text-xs text-slate-500 mt-1">Ajuste los filtros o registre un hecho de Seguridad Vial.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgrupados.map((v) => {
                const isExpanded = expandedKeys.has(v.key);
                const hasMultiple = v.totalSiniestros > 1;

                return (
                  <div
                    key={v.key}
                    className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col overflow-hidden ${
                      hasMultiple
                        ? 'border-red-300 hover:border-red-400 ring-1 ring-red-200/50'
                        : 'border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    {/* Header del Vehículo */}
                    <div className="p-4 bg-gradient-to-r from-amber-50/50 to-white border-b border-slate-100 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                            hasMultiple
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm font-mono tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {v.dominio}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              {v.tipo}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Titular / Conductor: <strong className="text-slate-800">{v.propietarioHabitual}</strong>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border shrink-0 ${
                          hasMultiple
                            ? 'bg-red-600 text-white border-red-700 shadow-xs'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {hasMultiple && <AlertTriangle className="w-3 h-3 text-white" />}
                        <span>{v.totalSiniestros} {v.totalSiniestros === 1 ? 'Siniestro' : 'Siniestros'}</span>
                      </span>
                    </div>

                    {/* Historial Desplegable */}
                    <div className="p-4 flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1 text-slate-600">
                          <History className="w-3.5 h-3.5 text-amber-800" />
                          <span>Historial de Hechos / Siniestros ({v.siniestros.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(v.key)}
                          className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Lista de Siniestros */}
                      <div className="space-y-2 pt-1">
                        {(isExpanded ? v.siniestros : v.siniestros.slice(0, 1)).map((s, sIdx) => (
                          <div
                            key={s.id || sIdx}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                              sIdx === 0 && !isExpanded
                                ? 'bg-white border-slate-200'
                                : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-blue-900 font-mono text-[11px] truncate">
                                {s.intervencionCodigo}
                              </span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                                {s.inspeccionFecha} • {s.inspeccionHora}
                              </span>
                            </div>

                            <div className="font-bold text-slate-800 text-[11px] leading-tight">
                              {s.intervencionHecho}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                              <div>
                                <span className="text-slate-400 font-medium">Impacto / Daños:</span>{' '}
                                <strong className="text-slate-800 block truncate">{s.zonaContacto}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Lesiones:</span>{' '}
                                <strong className="text-red-700 block truncate">{s.lesiones}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.inspeccionLugar}</span>
                              <span className="text-slate-400 font-mono">({s.identificador})</span>
                            </div>
                          </div>
                        ))}

                        {!isExpanded && v.siniestros.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(v.key)}
                            className="w-full text-center py-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold bg-amber-50/60 rounded-lg border border-amber-200 cursor-pointer"
                          >
                            + {v.siniestros.length - 1} siniestro(s) más. Clic para ver historial completo.
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista de Tabla Agrupada */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Dominio / Patente</th>
                      <th className="py-3 px-3">Tipo de Rodado</th>
                      <th className="py-3 px-3">Titular / Conductor</th>
                      <th className="py-3 px-3">Siniestros</th>
                      <th className="py-3 px-3">Último Hecho</th>
                      <th className="py-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAgrupados.map((v) => {
                      const isExpanded = expandedKeys.has(v.key);
                      const hasMultiple = v.totalSiniestros > 1;

                      return (
                        <React.Fragment key={v.key}>
                          <tr className={`hover:bg-slate-50 transition-colors ${hasMultiple ? 'bg-red-50/20' : ''}`}>
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {v.dominio}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{v.tipo}</td>
                            <td className="py-3 px-3 text-slate-700">{v.propietarioHabitual}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                                  hasMultiple
                                    ? 'bg-red-600 text-white border-red-700'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                }`}
                              >
                                {hasMultiple && <AlertTriangle className="w-2.5 h-2.5" />}
                                <span>{v.totalSiniestros} siniestros</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                              {v.siniestros[0]?.intervencionHecho} ({v.siniestros[0]?.inspeccionFecha})
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => toggleExpand(v.key)}
                                className="text-amber-800 hover:text-amber-950 font-bold text-[11px] cursor-pointer"
                              >
                                {isExpanded ? 'Ocultar' : 'Ver Historial'}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-amber-50/30">
                              <td colSpan={6} className="p-3 pl-8">
                                <div className="space-y-2 border-l-2 border-amber-600 pl-3">
                                  <div className="text-[11px] font-bold text-slate-800">
                                    Detalle de siniestros viales registrados ({v.siniestros.length}):
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {v.siniestros.map((s, i) => (
                                      <div key={i} className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs space-y-1">
                                        <div className="flex items-center justify-between font-mono text-[10px]">
                                          <span className="font-bold text-blue-900">{s.intervencionCodigo}</span>
                                          <span className="text-slate-500">{s.inspeccionFecha} {s.inspeccionHora}</span>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-[11px]">{s.intervencionHecho}</div>
                                        <div className="text-[10px] text-slate-600">
                                          Daños: <strong>{s.zonaContacto}</strong> • Lesiones: <strong className="text-red-700">{s.lesiones}</strong>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          Lugar: {s.inspeccionLugar}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Contenido: MODO DETALLADO POR HECHO */}
      {modoOrganizacion === 'detallado' && (
        <>
          {filteredListDetallada.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No hay registros de vehículos</h3>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListDetallada.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 transition-all space-y-3 flex flex-col justify-between text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {v.dominio}
                          </span>
                          <span className="font-bold text-amber-900">{v.identificador}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800 mt-1">{v.tipo}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{v.inspeccionFecha}</span>
                    </div>

                    <div className="space-y-1.5 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-500">Propietario / Conductor:</span>{' '}
                        <strong className="text-slate-800">{v.propietarioOConductor}</strong>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Impacto / Daños:</span>{' '}
                        <span className="font-medium text-slate-800">{v.zonaContacto}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Lesiones:</span>{' '}
                        <strong className="text-red-700">{v.lesiones}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{v.inspeccionLugar}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="font-bold text-blue-900">{v.intervencionCodigo}</span>
                    <span>{v.grupoGuardia}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Dominio</th>
                      <th className="py-3 px-3">Identificador</th>
                      <th className="py-3 px-3">Tipo de Rodado</th>
                      <th className="py-3 px-3">Propietario / Conductor</th>
                      <th className="py-3 px-3">Impacto / Contacto</th>
                      <th className="py-3 px-3">Lesiones</th>
                      <th className="py-3 px-3">Fecha y Lugar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredListDetallada.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{v.dominio}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-900">{v.identificador}</td>
                        <td className="py-2.5 px-3 text-slate-700">{v.tipo}</td>
                        <td className="py-2.5 px-3 text-slate-800">{v.propietarioOConductor}</td>
                        <td className="py-2.5 px-3 text-slate-700">{v.zonaContacto}</td>
                        <td className="py-2.5 px-3 font-semibold text-red-700">{v.lesiones}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {v.inspeccionFecha} • {v.inspeccionLugar}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
