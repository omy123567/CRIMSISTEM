import React, { useState, useMemo } from 'react';
import { ParteNovedadesGuardia, ConfiguracionSistema } from '../../types/police';
import {
  Users,
  Search,
  Download,
  Filter,
  UserCheck,
  Shield,
  FileText,
  Calendar,
  MapPin,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  History,
  BarChart3,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';
import { esTipoLesionADeterminar } from '../../utils/lesionesUtils';
import { ModuleStatsPanel, StatChartConfig, StatKpiItem } from '../common/ModuleStatsPanel';
import {
  drawExecutiveKpiStrip,
  drawChartSectionGrid,
  renderDonutChartPng,
  renderHorizontalBarChartPng,
} from '../../utils/pdfChartUtils';

export interface PersonaRegistroConsolidado {
  id: string;
  apellidoYNombre: string;
  dni: string;
  edad: string | number;
  tipoRegistro: 'Involucrado' | 'Testigo de Acta';
  condicion: string;
  tipoLesion?: string;
  fallecido?: boolean;
  intervencionCodigo: string;
  intervencionTipo: string;
  intervencionHecho: string;
  inspeccionFecha: string;
  inspeccionHora: string;
  inspeccionLugar: string;
  parteId: string;
  grupoGuardia: string;
}

export interface PersonaAgrupada {
  key: string;
  dni: string;
  apellidoYNombre: string;
  edadMasReciente: string | number;
  totalHechos: number;
  condicionesDistintas: string[];
  tiposDistintos: string[];
  lesionesDistintas: string[];
  tieneFallecido: boolean;
  hechos: PersonaRegistroConsolidado[];
}

interface PersonasViewProps {
  partesGuardiaList: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
  onNavigateToGuardias?: () => void;
}

export const PersonasView: React.FC<PersonasViewProps> = ({
  partesGuardiaList,
  config,
  onNavigateToGuardias,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState('todos');
  const [filtroCondicion, setFiltroCondicion] = useState('todas');
  const [filtroTipoLesion, setFiltroTipoLesion] = useState('todas');
  const [soloFallecidos, setSoloFallecidos] = useState<boolean>(false);
  const [filtroAnio, setFiltroAnio] = useState<string>('todos');
  const [soloMultiples, setSoloMultiples] = useState<boolean>(false);
  const [modoOrganizacion, setModoOrganizacion] = useState<'agrupado' | 'detallado'>('agrupado');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [mostrarStats, setMostrarStats] = useState(false);

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
    const allKeys = new Set(personasAgrupadas.map((p) => p.key));
    setExpandedKeys(allKeys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Consolidar personas de todas las intervenciones
  const personasConsolidadas: PersonaRegistroConsolidado[] = useMemo(() => {
    const list: PersonaRegistroConsolidado[] = [];

    partesGuardiaList.forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        // 1. Involucrados / Demorados
        (interv.involucrados || []).forEach((inv) => {
          list.push({
            id: `inv-${interv.id}-${inv.id}`,
            apellidoYNombre: inv.apellidoYNombre || 'Sin nombre',
            dni: inv.dni || 'S/D',
            edad: inv.edad || 'Mayor',
            tipoRegistro: 'Involucrado',
            condicion: inv.condicion || inv.funcionEnHecho || 'Involucrado',
            tipoLesion: inv.tipoLesion || 'Sin Lesiones',
            fallecido: !!inv.fallecido,
            intervencionCodigo: interv.codigoIntervencion,
            intervencionTipo: interv.tipoIntervencion,
            intervencionHecho: interv.hecho,
            inspeccionFecha: interv.inspeccionFecha,
            inspeccionHora: interv.inspeccionHora,
            inspeccionLugar: interv.inspeccionLugar,
            parteId: parte.id,
            grupoGuardia: parte.tipoGuardia || parte.grupoGuardia,
          });
        });

        // 2. Testigos de Acta
        (interv.testigos || []).forEach((testigo, idx) => {
          if (testigo.apellidoYNombre?.trim()) {
            list.push({
              id: `test-${interv.id}-${testigo.id || idx}`,
              apellidoYNombre: testigo.apellidoYNombre,
              dni: testigo.dni || 'S/D',
              edad: testigo.edad || 'Mayor',
              tipoRegistro: 'Testigo de Acta',
              condicion: `Testigo de Acta Nº ${idx + 1}`,
              tipoLesion: 'Sin Lesiones',
              fallecido: false,
              intervencionCodigo: interv.codigoIntervencion,
              intervencionTipo: interv.tipoIntervencion,
              intervencionHecho: interv.hecho,
              inspeccionFecha: interv.inspeccionFecha,
              inspeccionHora: interv.inspeccionHora,
              inspeccionLugar: interv.inspeccionLugar,
              parteId: parte.id,
              grupoGuardia: parte.tipoGuardia || parte.grupoGuardia,
            });
          }
        });
      });
    });

    return list.sort((a, b) => (b.inspeccionFecha || '').localeCompare(a.inspeccionFecha || ''));
  }, [partesGuardiaList]);

  // Agrupamiento por persona única (por DNI o Nombre normalizado)
  const personasAgrupadas: PersonaAgrupada[] = useMemo(() => {
    const map = new Map<string, PersonaAgrupada>();

    personasConsolidadas.forEach((p) => {
      const cleanDni = p.dni && p.dni.trim() !== 'S/D' ? p.dni.trim() : null;
      const cleanNombre = (p.apellidoYNombre || '').trim().toUpperCase();
      const key = cleanDni ? `DNI:${cleanDni}` : `NOM:${cleanNombre}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          dni: p.dni || 'S/D',
          apellidoYNombre: p.apellidoYNombre,
          edadMasReciente: p.edad,
          totalHechos: 0,
          condicionesDistintas: [],
          tiposDistintos: [],
          lesionesDistintas: [],
          tieneFallecido: false,
          hechos: [],
        });
      }

      const item = map.get(key)!;
      item.totalHechos += 1;
      item.hechos.push(p);

      if (p.condicion && !item.condicionesDistintas.includes(p.condicion)) {
        item.condicionesDistintas.push(p.condicion);
      }
      if (p.tipoRegistro && !item.tiposDistintos.includes(p.tipoRegistro)) {
        item.tiposDistintos.push(p.tipoRegistro);
      }
      if (p.tipoLesion && !item.lesionesDistintas.includes(p.tipoLesion)) {
        item.lesionesDistintas.push(p.tipoLesion);
      }
      if (p.fallecido) {
        item.tieneFallecido = true;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalHechos - a.totalHechos || (a.apellidoYNombre || '').localeCompare(b.apellidoYNombre || ''));
  }, [personasConsolidadas]);

  // Lista única de condiciones para el filtro
  const condicionesUnicas = useMemo(() => {
    const set = new Set<string>();
    personasConsolidadas.forEach((p) => {
      if (p.condicion) set.add(p.condicion);
    });
    return Array.from(set);
  }, [personasConsolidadas]);

  // Lista única de tipos de lesiones
  const lesionesUnicas = useMemo(() => {
    const set = new Set<string>(['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas', 'A Determinar']);
    personasConsolidadas.forEach((p) => {
      if (p.tipoLesion) set.add(p.tipoLesion);
    });
    return Array.from(set);
  }, [personasConsolidadas]);

  // Conteo de personas con múltiples hechos y fallecidos
  const totalConMultiplesHechos = useMemo(() => {
    return personasAgrupadas.filter((p) => p.totalHechos > 1).length;
  }, [personasAgrupadas]);

  const totalFallecidos = useMemo(() => {
    return personasAgrupadas.filter((p) => p.tieneFallecido).length;
  }, [personasAgrupadas]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filtroTipoRegistro !== 'todos') count++;
    if (filtroCondicion !== 'todas') count++;
    if (filtroTipoLesion !== 'todas') count++;
    if (filtroAnio !== 'todos') count++;
    if (soloFallecidos) count++;
    if (soloMultiples) count++;
    return count;
  }, [searchTerm, filtroTipoRegistro, filtroCondicion, filtroTipoLesion, filtroAnio, soloFallecidos, soloMultiples]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFiltroTipoRegistro('todos');
    setFiltroCondicion('todas');
    setFiltroTipoLesion('todas');
    setFiltroAnio('todos');
    setSoloFallecidos(false);
    setSoloMultiples(false);
  };

  // Filtrado de agrupados
  const filteredAgrupados = useMemo(() => {
    return personasAgrupadas.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (p.apellidoYNombre || '').toLowerCase().includes(term) ||
        (p.dni || '').toLowerCase().includes(term) ||
        p.hechos.some(
          (h) =>
            (h.intervencionHecho || '').toLowerCase().includes(term) ||
            (h.inspeccionLugar || '').toLowerCase().includes(term) ||
            (h.intervencionCodigo || '').toLowerCase().includes(term) ||
            (h.condicion || '').toLowerCase().includes(term) ||
            (h.tipoLesion || '').toLowerCase().includes(term)
        );

      const matchTipo =
        filtroTipoRegistro === 'todos' || p.tiposDistintos.includes(filtroTipoRegistro);

      const matchCond =
        filtroCondicion === 'todas' || p.condicionesDistintas.includes(filtroCondicion);

      const matchLesion =
        filtroTipoLesion === 'todas' || p.lesionesDistintas.includes(filtroTipoLesion);

      const matchFallecido = !soloFallecidos || p.tieneFallecido;

      const matchAnio =
        filtroAnio === 'todos' ||
        p.hechos.some((h) => h.inspeccionFecha && h.inspeccionFecha.startsWith(filtroAnio));

      const matchMultiples = !soloMultiples || p.totalHechos > 1;

      return matchSearch && matchTipo && matchCond && matchLesion && matchFallecido && matchAnio && matchMultiples;
    });
  }, [personasAgrupadas, searchTerm, filtroTipoRegistro, filtroCondicion, filtroTipoLesion, soloFallecidos, filtroAnio, soloMultiples]);

  // Filtrado de lista detallada
  const filteredListDetallada = useMemo(() => {
    return personasConsolidadas.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (p.apellidoYNombre || '').toLowerCase().includes(term) ||
        (p.dni || '').toLowerCase().includes(term) ||
        (p.condicion || '').toLowerCase().includes(term) ||
        (p.tipoLesion || '').toLowerCase().includes(term) ||
        (p.intervencionHecho || '').toLowerCase().includes(term) ||
        (p.inspeccionLugar || '').toLowerCase().includes(term) ||
        (p.intervencionCodigo || '').toLowerCase().includes(term);

      const matchTipo =
        filtroTipoRegistro === 'todos' || p.tipoRegistro === filtroTipoRegistro;

      const matchCond =
        filtroCondicion === 'todas' || p.condicion === filtroCondicion;

      const matchLesion =
        filtroTipoLesion === 'todas' || (p.tipoLesion || 'Sin Lesiones') === filtroTipoLesion;

      const matchFallecido = !soloFallecidos || !!p.fallecido;

      const matchAnio =
        filtroAnio === 'todos' || (p.inspeccionFecha && p.inspeccionFecha.startsWith(filtroAnio));

      return matchSearch && matchTipo && matchCond && matchLesion && matchFallecido && matchAnio;
    });
  }, [personasConsolidadas, searchTerm, filtroTipoRegistro, filtroCondicion, filtroTipoLesion, soloFallecidos, filtroAnio]);

  const personasStats = useMemo(() => {
    const kpis: StatKpiItem[] = [
      {
        label: 'Personas Únicas',
        value: personasAgrupadas.length,
        detail: `${personasConsolidadas.length} participaciones totales`,
        tone: 'navy',
      },
      {
        label: 'Con Múltiples Hechos',
        value: totalConMultiplesHechos,
        detail: 'Reincidencia en actuaciones',
        tone: 'amber',
      },
      {
        label: 'Involucrados vs Testigos',
        value: `${personasConsolidadas.filter((p) => p.tipoRegistro === 'Involucrado').length} / ${personasConsolidadas.filter((p) => p.tipoRegistro === 'Testigo de Acta').length}`,
        detail: 'Según rol en actas',
        tone: 'blue',
      },
      {
        label: 'Fallecidos Registrados',
        value: totalFallecidos,
        detail: 'Óbitos en actuaciones',
        tone: 'rose',
      },
    ];

    const byCond = new Map<string, number>();
    const byLesion = new Map<string, number>();
    personasConsolidadas.forEach((p) => {
      const c = p.condicion || 'Sin Condición';
      byCond.set(c, (byCond.get(c) || 0) + 1);
      const l = p.tipoLesion || 'Sin Lesiones';
      byLesion.set(l, (byLesion.get(l) || 0) + 1);
    });

    const charts: StatChartConfig[] = [
      {
        id: 'personas-condicion',
        title: 'Participaciones por Condición / Rol',
        subtitle: 'Clasificación en partes de guardia',
        type: 'horizontal-bar',
        data: Array.from(byCond.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        valueLabel: 'Registros',
        primaryColor: '#11264d',
      },
      {
        id: 'personas-lesiones',
        title: 'Distribución por Tipo de Lesión',
        subtitle: 'Gravedad clínica registrada',
        type: 'donut',
        data: Array.from(byLesion.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      },
    ];

    return { kpis, charts };
  }, [personasAgrupadas.length, personasConsolidadas, totalConMultiplesHechos, totalFallecidos]);

  // Exportar a PDF oficial con gráficos
  const handleExportPdf = () => {
    requestPdfExport({
      title: 'Registro Centralizado de Personas',
      fileName: `SISPOL_Registro_Personas_${new Date().toISOString().slice(0, 10)}.pdf`,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: ({ orientation, paperSize }) => {
        const doc = new jsPDF(resolveJsPdfOrientation(orientation), 'mm', resolveJsPdfFormat(paperSize));
        let curY = drawPoliceHeader(
          doc,
          config,
          'REGISTRO CENTRALIZADO DE PERSONAS - HISTORIAL PERICIAL',
          10
        );

        curY = drawExecutiveKpiStrip(
          doc,
          curY + 1,
          [
            { label: 'Personas Únicas', value: filteredAgrupados.length, subtitle: 'En vista agrupada', accentColor: [17, 38, 77] },
            { label: 'Registros Detalle', value: filteredListDetallada.length, subtitle: 'Participaciones', accentColor: [29, 78, 216] },
            { label: 'Múltiples Hechos', value: filteredAgrupados.filter((p) => p.totalHechos > 1).length, subtitle: 'Con >1 hecho', accentColor: [217, 119, 6] },
            { label: 'Fallecidos', value: filteredAgrupados.filter((p) => p.tieneFallecido).length, subtitle: 'Óbitos consignados', accentColor: [220, 38, 38] },
          ],
          10
        );

        const mapCond = new Map<string, number>();
        const mapLes = new Map<string, number>();
        filteredListDetallada.forEach((p) => {
          mapCond.set(p.condicion || 'Otro', (mapCond.get(p.condicion || 'Otro') || 0) + 1);
          mapLes.set(p.tipoLesion || 'Sin Lesiones', (mapLes.get(p.tipoLesion || 'Sin Lesiones') || 0) + 1);
        });
        const imgCond = renderHorizontalBarChartPng(
          Array.from(mapCond.entries()).map(([label, value]) => ({ label, value })),
          { barColor: '#11264d' }
        );
        const imgLes = renderDonutChartPng(
          Array.from(mapLes.entries()).map(([label, value]) => ({ label, value })),
          { centerLabel: 'PERSONAS' }
        );
        curY = drawChartSectionGrid(
          doc,
          curY,
          [
            { title: 'Condición / Rol en Actuaciones', subtitle: 'Registros detallados', imageDataUrl: imgCond },
            { title: 'Distribución por Tipo de Lesión', subtitle: 'Lesiones declaradas', imageDataUrl: imgLes },
          ],
          10
        );

        if (modoOrganizacion === 'agrupado') {
          const rows = filteredAgrupados.map((p, i) => [
            i + 1,
            p.apellidoYNombre,
            p.dni,
            p.edadMasReciente,
            `${p.totalHechos} intervención(es)`,
            `${p.condicionesDistintas.join(', ')}${p.tieneFallecido ? ' [FALLECIDO]' : ''}`,
            p.hechos.map((h) => `${h.inspeccionFecha}: ${h.intervencionHecho} (${h.condicion} - ${h.tipoLesion || 'Sin Lesiones'}${h.fallecido ? ' / FALLECIDO' : ''})`).join('\n'),
          ]);

          autoTable(doc, {
            startY: curY + 1,
            head: [['#', 'Apellido y Nombre', 'DNI', 'Edad', 'Hechos', 'Condición(es)', 'Historial de Intervenciones']],
            body: rows,
            styles: { fontSize: 7.5, cellPadding: 2 },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 8 },
              1: { cellWidth: 36, fontStyle: 'bold' },
              2: { cellWidth: 20 },
              3: { cellWidth: 12 },
              4: { cellWidth: 24, fontStyle: 'bold' },
              5: { cellWidth: 32 },
              6: { cellWidth: 'auto' },
            },
            didDrawPage: () => {
              drawPoliceFooter(doc, config);
            },
          });
        } else {
          const rows = filteredListDetallada.map((p, i) => [
            i + 1,
            p.apellidoYNombre,
            p.dni,
            p.edad,
            `${p.condicion}${p.fallecido ? ' [FALLECIDO]' : ''}`,
            p.tipoLesion || 'Sin Lesiones',
            p.intervencionHecho,
            p.inspeccionFecha,
            p.intervencionCodigo,
          ]);

          autoTable(doc, {
            startY: curY + 1,
            head: [['#', 'Apellido y Nombre', 'DNI', 'Edad', 'Condición', 'Lesión', 'Hecho Caratulado', 'Fecha', 'Nº Intervención']],
            body: rows,
            styles: { fontSize: 7.5, cellPadding: 2 },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
            didDrawPage: () => {
              drawPoliceFooter(doc, config);
            },
          });
        }

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Institucional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-900" />
              <span>Personas (Involucrados & Testigos de Acta)</span>
            </h1>
            <span className="bg-blue-100 text-blue-950 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {personasAgrupadas.length} personas únicas
            </span>
            {totalConMultiplesHechos > 0 && (
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>{totalConMultiplesHechos} con múltiples hechos</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Consolidación y trazabilidad de personas involucradas en uno o múltiples hechos criminalísticos y testimoniales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Modo de Organización */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-600 text-xs">
            <button
              onClick={() => setModoOrganizacion('agrupado')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoOrganizacion === 'agrupado'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial por Persona</span>
            </button>
            <button
              onClick={() => setModoOrganizacion('detallado')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                modoOrganizacion === 'detallado'
                  ? 'bg-blue-900 text-white shadow-xs'
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
                viewMode === 'cards' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista de Tabla"
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMostrarStats((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mostrarStats
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Estadísticas</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {mostrarStats && (
        <ModuleStatsPanel
          title="Estadísticas de Personas (Involucrados y Testigos)"
          subtitle="Consolidado de participaciones, condiciones procesales y tipos de lesión"
          kpis={personasStats.kpis}
          charts={personasStats.charts}
          onExportPdf={handleExportPdf}
          exportPdfLabel="Exportar Reporte Estadístico (PDF)"
          onClose={() => setMostrarStats(false)}
        />
      )}

      {/* Barra de Filtros y Búsqueda Colapsable */}
      <CollapsibleFilterBar
        title="Búsqueda y Filtros de Personas, Lesiones y Fallecidos"
        activeFiltersCount={activeFiltersCount}
        onClear={handleClearFilters}
        summaryRight={
          <span className="text-slate-500 text-[11px]">
            Mostrando{' '}
            <strong className="text-slate-800">
              {modoOrganizacion === 'agrupado' ? filteredAgrupados.length : filteredListDetallada.length}
            </strong>{' '}
            {modoOrganizacion === 'agrupado' ? 'personas' : 'registros'}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar DNI, Nombre, Hecho o Dirección..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Filtro Tipo de Registro */}
          <div>
            <select
              value={filtroTipoRegistro}
              onChange={(e) => setFiltroTipoRegistro(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los Registros</option>
              <option value="Involucrado">Involucrados / Demorados</option>
              <option value="Testigo de Acta">Testigos de Acta</option>
            </select>
          </div>

          {/* Filtro Condición */}
          <div>
            <select
              value={filtroCondicion}
              onChange={(e) => setFiltroCondicion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todas">Todas las Condiciones</option>
              {condicionesUnicas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo de Lesiones */}
          <div>
            <select
              value={filtroTipoLesion}
              onChange={(e) => setFiltroTipoLesion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todas">Tipo de Lesiones: Todas</option>
              {lesionesUnicas.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Año */}
          <div>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los Años</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>
        </div>

        {/* Acciones y Filtros Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSoloMultiples(!soloMultiples)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soloMultiples
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${soloMultiples ? 'text-white' : 'text-amber-600'}`} />
              <span>Múltiples hechos ({totalConMultiplesHechos})</span>
            </button>

            <button
              type="button"
              onClick={() => setSoloFallecidos(!soloFallecidos)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soloFallecidos
                  ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Solo Fallecidos ({totalFallecidos})</span>
            </button>

            {modoOrganizacion === 'agrupado' && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-blue-900 font-semibold cursor-pointer underline"
                >
                  Expandir Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-blue-900 font-semibold cursor-pointer underline"
                >
                  Colapsar Todos
                </button>
              </div>
            )}
          </div>
        </div>
      </CollapsibleFilterBar>

      {/* Contenido: MODO HISTORIAL AGRUPADO POR PERSONA */}
      {modoOrganizacion === 'agrupado' && (
        <>
          {filteredAgrupados.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No se encontraron personas</h3>
              <p className="text-xs text-slate-500 mt-1">Ajuste los filtros de búsqueda o registre una intervención.</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgrupados.map((p) => {
                const isExpanded = expandedKeys.has(p.key);
                const hasMultiple = p.totalHechos > 1;

                return (
                  <div
                    key={p.key}
                    className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col overflow-hidden ${
                      hasMultiple
                        ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-200/50'
                        : 'border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {/* Header de la Persona */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                            hasMultiple
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {p.apellidoYNombre.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-tight">
                            {p.apellidoYNombre}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-mono">
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              DNI: {p.dni}
                            </span>
                            <span>•</span>
                            <span>Edad: {p.edadMasReciente}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                            hasMultiple
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {hasMultiple && <AlertTriangle className="w-3 h-3 text-white" />}
                          <span>{p.totalHechos} {p.totalHechos === 1 ? 'Hecho' : 'Hechos'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Roles / Condiciones y Lesiones */}
                    <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400 font-medium">Condición(es):</span>
                      {p.condicionesDistintas.map((cond, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-md font-bold text-[10px]"
                        >
                          {cond}
                        </span>
                      ))}
                      {p.lesionesDistintas
                        .filter((l) => l && l !== 'Sin Lesiones')
                        .map((les, idx) => (
                          <span
                            key={`les-${idx}`}
                            className={`border px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              esTipoLesionADeterminar(les)
                                ? 'bg-amber-100 text-amber-950 border-amber-400'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {esTipoLesionADeterminar(les) ? `⚠ Lesión: ${les} (Falta dato)` : `Lesión: ${les}`}
                          </span>
                        ))}
                      {p.tieneFallecido && (
                        <span className="bg-slate-900 text-rose-200 border border-rose-500 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                          FALLECIDO
                        </span>
                      )}
                    </div>

                    {/* Historial Desplegable */}
                    <div className="p-4 flex-1 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1 text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-blue-800" />
                          <span>Historial de Hechos e Intervenciones ({p.hechos.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.key)}
                          className="text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Lista de hechos (contraída muestra el último hecho, expandida muestra todos) */}
                      <div className="space-y-2 pt-1">
                        {(isExpanded ? p.hechos : p.hechos.slice(0, 1)).map((h, hIdx) => (
                          <div
                            key={h.id || hIdx}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                              hIdx === 0 && !isExpanded
                                ? 'bg-white border-slate-200'
                                : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-blue-900 font-mono text-[11px] truncate">
                                {h.intervencionCodigo}
                              </span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                                {h.inspeccionFecha} • {h.inspeccionHora}
                              </span>
                            </div>

                            <div className="font-bold text-slate-800 text-[11px] leading-tight">
                              {h.intervencionHecho}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Rol: {h.condicion}
                              </span>
                              {h.tipoLesion && (
                                <span
                                  className={`font-bold px-1.5 py-0.2 rounded border ${
                                    esTipoLesionADeterminar(h.tipoLesion)
                                      ? 'bg-amber-100 text-amber-950 border-amber-400'
                                      : h.tipoLesion === 'Sin Lesiones'
                                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}
                                >
                                  {esTipoLesionADeterminar(h.tipoLesion) ? `⚠ ${h.tipoLesion}` : h.tipoLesion}
                                </span>
                              )}
                              {h.fallecido && (
                                <span className="font-extrabold bg-slate-900 text-rose-200 px-1.5 py-0.2 rounded border border-rose-500">
                                  FALLECIDO
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 truncate max-w-[200px]" title={h.inspeccionLugar}>
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{h.inspeccionLugar}</span>
                              </span>
                              <span className="text-slate-400">({h.grupoGuardia})</span>
                            </div>
                          </div>
                        ))}

                        {!isExpanded && p.hechos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.key)}
                            className="w-full text-center py-1 text-[11px] text-blue-700 hover:text-blue-900 font-bold bg-blue-50/60 rounded-lg border border-blue-200 cursor-pointer"
                          >
                            + {p.hechos.length - 1} hecho(s) más registrado(s). Clic para desplegar todo.
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
                      <th className="py-3 px-3">Persona / DNI</th>
                      <th className="py-3 px-3">Edad</th>
                      <th className="py-3 px-3">Total Hechos</th>
                      <th className="py-3 px-3">Condiciones Registradas</th>
                      <th className="py-3 px-3">Historial de Intervenciones</th>
                      <th className="py-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAgrupados.map((p) => {
                      const isExpanded = expandedKeys.has(p.key);
                      const hasMultiple = p.totalHechos > 1;

                      return (
                        <React.Fragment key={p.key}>
                          <tr className={`hover:bg-slate-50 transition-colors ${hasMultiple ? 'bg-amber-50/20' : ''}`}>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{p.apellidoYNombre}</div>
                              <div className="text-[10px] font-mono text-slate-500">DNI: {p.dni}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{p.edadMasReciente}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                                  hasMultiple
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-blue-100 text-blue-900 border-blue-200'
                                }`}
                              >
                                {hasMultiple && <AlertTriangle className="w-2.5 h-2.5" />}
                                <span>{p.totalHechos} hechos</span>
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {p.condicionesDistintas.map((c, i) => (
                                  <span key={i} className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                              {p.hechos[0]?.intervencionHecho} ({p.hechos[0]?.inspeccionFecha})
                              {p.hechos.length > 1 && ` +${p.hechos.length - 1} más`}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => toggleExpand(p.key)}
                                className="text-blue-800 hover:text-blue-950 font-bold text-[11px] cursor-pointer"
                              >
                                {isExpanded ? 'Ocultar' : 'Ver Historial'}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={6} className="p-3 pl-8">
                                <div className="space-y-2 border-l-2 border-blue-600 pl-3">
                                  <div className="text-[11px] font-bold text-slate-700">
                                    Detalle cronológico de intervenciones ({p.hechos.length}):
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {p.hechos.map((h, i) => (
                                      <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                                        <div className="flex items-center justify-between font-mono text-[10px]">
                                          <span className="font-bold text-blue-900">{h.intervencionCodigo}</span>
                                          <span className="text-slate-500">{h.inspeccionFecha} {h.inspeccionHora}</span>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-[11px]">{h.intervencionHecho}</div>
                                        <div className="text-[10px] text-slate-500">
                                          Condición: <strong className="text-slate-700">{h.condicion}</strong> • Lugar: {h.inspeccionLugar}
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

      {/* Contenido: MODO DETALLADO POR REGISTRO INDIVIDUAL */}
      {modoOrganizacion === 'detallado' && (
        <>
          {filteredListDetallada.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No hay registros coincidentes</h3>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListDetallada.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 transition-all space-y-3 flex flex-col justify-between text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {p.apellidoYNombre}
                        </h3>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          DNI: {p.dni} • {p.edad} años
                        </div>
                      </div>
                      <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0">
                        {p.tipoRegistro}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-500">Condición:</span>
                        <strong className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {p.condicion}
                        </strong>
                        {p.tipoLesion && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              esTipoLesionADeterminar(p.tipoLesion)
                                ? 'bg-amber-100 text-amber-950 border-amber-400'
                                : p.tipoLesion === 'Sin Lesiones'
                                ? 'bg-slate-50 text-slate-600 border-slate-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {esTipoLesionADeterminar(p.tipoLesion) ? `⚠ ${p.tipoLesion}` : p.tipoLesion}
                          </span>
                        )}
                        {p.fallecido && (
                          <span className="bg-slate-900 text-rose-200 border border-rose-500 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                            FALLECIDO
                          </span>
                        )}
                      </div>
                      <div className="line-clamp-2">
                        <span className="font-semibold text-slate-500">Hecho:</span>{' '}
                        <span className="font-medium text-slate-900">{p.intervencionHecho}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{p.inspeccionLugar}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{p.intervencionCodigo}</span>
                    <span>{p.inspeccionFecha}</span>
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
                      <th className="py-3 px-3">Persona / DNI</th>
                      <th className="py-3 px-3">Edad</th>
                      <th className="py-3 px-3">Condición</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Hecho Caratulado</th>
                      <th className="py-3 px-3">Fecha y Hora</th>
                      <th className="py-3 px-3">Nº Intervención</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredListDetallada.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{p.apellidoYNombre}</div>
                          <div className="text-[10px] font-mono text-slate-500">DNI: {p.dni}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.edad}</td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {p.condicion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.tipoRegistro}</td>
                        <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate font-medium">
                          {p.intervencionHecho}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {p.inspeccionFecha} {p.inspeccionHora}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                          {p.intervencionCodigo}
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
