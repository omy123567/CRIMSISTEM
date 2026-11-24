import React, { useState, useMemo } from 'react';
import {
  IntervencionParte,
  InspeccionOcular,
  ExpedienteJudicial,
  CasoFaltaOficio,
  InformeTecnico,
  PersonalPolicialCausa,
  ConfiguracionSistema,
  Personal,
} from '../../types/police';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  Building,
  User,
  Eye,
  FileText,
  BadgeAlert,
  Shield,
  Car,
  FileSpreadsheet,
  Camera,
  AlertTriangle,
  Scale,
  GraduationCap,
  Sparkles,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import { CollapsibleFilterBar } from '../common/CollapsibleFilterBar';

export type OrigenCausaPolicial =
  | 'intervencion-lc'
  | 'intervencion-vial'
  | 'inspeccion-ocular'
  | 'expediente'
  | 'falta-oficio'
  | 'informe-tecnico';

export interface ItemCausaPolicial {
  id: string;
  origen: OrigenCausaPolicial;
  origenLabel: string;
  codigoRef: string;
  fecha: string;
  hora?: string;
  caratulaOHecho: string;
  lugar?: string;
  dependenciaInterviniente: string;
  juzgadoOFiscalia?: string;
  personalPolicial: PersonalPolicialCausa;
  tipoLesion?: string;
  fallecido?: boolean;
  detallesExtra?: string;
  rawItem: any;
}

interface CausasPolicialesViewProps {
  intervencionesList: IntervencionParte[];
  inspeccionesList: InspeccionOcular[];
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  informesTecnicosList: InformeTecnico[];
  personalList?: Personal[];
  config: ConfiguracionSistema;
}

export const CausasPolicialesView: React.FC<CausasPolicialesViewProps> = ({
  intervencionesList = [],
  inspeccionesList = [],
  expedientesList = [],
  casosFaltaOficioList = [],
  informesTecnicosList = [],
  personalList = [],
  config,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('todos');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroJerarquia, setFiltroJerarquia] = useState<string>('todas');
  const [filtroDependencia, setFiltroDependencia] = useState<string>('todas');
  const [filtroTipoLesion, setFiltroTipoLesion] = useState<string>('todas');
  const [soloFallecidos, setSoloFallecidos] = useState<boolean>(false);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ItemCausaPolicial | null>(null);

  // Consolidar todas las fuentes que involucran Personal Policial
  const todosLosCasos: ItemCausaPolicial[] = useMemo(() => {
    const items: ItemCausaPolicial[] = [];

    // 1. Intervenciones: LC y Viales (priorizar todos los Efectivos en involucrados, con fallback a personalPolicial legado)
    intervencionesList.forEach((int) => {
      const polInvolucrados = (int.involucrados || []).filter((i) => i.esPersonalPolicial);
      const esLC = int.tipoIntervencion === 'Criminalística';

      if (polInvolucrados.length > 0) {
        polInvolucrados.forEach((inv, invIdx) => {
          items.push({
            id: `int-${int.id}-inv-${invIdx}`,
            origen: esLC ? 'intervencion-lc' : 'intervencion-vial',
            origenLabel: esLC ? 'Intervención LC' : 'Siniestro Vial',
            codigoRef: int.codigoIntervencion || `Int. #${int.nroCorrelativo}`,
            fecha: int.inspeccionFecha,
            hora: int.inspeccionHora,
            caratulaOHecho: int.hecho || 'Intervención en Escena',
            lugar: int.inspeccionLugar || int.direccion,
            dependenciaInterviniente: int.dependencia,
            personalPolicial: {
              jerarquia: inv.jerarquia || 'Oficial',
              plaza: inv.plaza || 'S/D',
              apellidoYNombre: inv.apellidoYNombre,
              dni: inv.dni,
              rol: inv.condicion || inv.funcionEnHecho || 'Involucrado',
              dependenciaRevista: inv.destino || int.personalPolicial?.dependenciaRevista,
              observaciones: int.personalPolicial?.observaciones,
            },
            tipoLesion: inv.tipoLesion || 'Sin Lesiones',
            fallecido: !!inv.fallecido,
            detallesExtra: int.sintesisHecho || int.laborCriminalistica,
            rawItem: int,
          });
        });
      } else if (int.involucraPersonalPolicial && int.personalPolicial) {
        items.push({
          id: `int-${int.id}`,
          origen: esLC ? 'intervencion-lc' : 'intervencion-vial',
          origenLabel: esLC ? 'Intervención LC' : 'Siniestro Vial',
          codigoRef: int.codigoIntervencion || `Int. #${int.nroCorrelativo}`,
          fecha: int.inspeccionFecha,
          hora: int.inspeccionHora,
          caratulaOHecho: int.hecho || 'Intervención en Escena',
          lugar: int.inspeccionLugar || int.direccion,
          dependenciaInterviniente: int.dependencia,
          personalPolicial: int.personalPolicial,
          tipoLesion: 'Sin Lesiones',
          fallecido: false,
          detallesExtra: int.sintesisHecho || int.laborCriminalistica,
          rawItem: int,
        });
      }
    });

    // 2. Inspecciones Oculares
    inspeccionesList.forEach((io) => {
      if (io.involucraPersonalPolicial && io.personalPolicial) {
        items.push({
          id: `io-${io.id}`,
          origen: 'inspeccion-ocular',
          origenLabel: 'Inspección Ocular',
          codigoRef: io.nroIO || 'I.O. s/n',
          fecha: io.fecha,
          hora: io.hora,
          caratulaOHecho: io.hecho || 'Inspección Ocular Técnica',
          lugar: io.direccion || io.lugar,
          dependenciaInterviniente: io.dependenciaSolicitante,
          personalPolicial: io.personalPolicial,
          detallesExtra: io.resumen || io.conclusiones,
          rawItem: io,
        });
      }
    });

    // 3. Expedientes Judiciales (incluye soporte PPI y personalPolicial)
    expedientesList.forEach((exp) => {
      if (
        (exp.involucraPersonalPolicial && exp.personalPolicial) ||
        exp.ppi?.tienePPI
      ) {
        const pPol: PersonalPolicialCausa = exp.personalPolicial || {
          jerarquia: exp.ppi?.jerarquia || 'Oficial',
          plaza: exp.ppi?.plaza || 's/p',
          apellidoYNombre: exp.ppi?.apellidoYNombre || 'Efectivo s/d',
          dni: exp.ppi?.dni,
          rol: exp.ppi?.rol || 'Imputado',
          dependenciaRevista: exp.ppi?.dependencia,
          observaciones: exp.observaciones,
        };

        items.push({
          id: `exp-${exp.id}`,
          origen: 'expediente',
          origenLabel: 'Expediente Judicial',
          codigoRef: `Exp. ${exp.nroExpediente || ''} (Of. ${exp.nroOficioLetras || ''})`,
          fecha: exp.fechaRegistro,
          caratulaOHecho: exp.caratulaOrigen || 'Causa Judicial en Trámite',
          dependenciaInterviniente: exp.dependenciaSolicitante,
          juzgadoOFiscalia: exp.juzgadoFiscalia,
          personalPolicial: pPol,
          detallesExtra: exp.resumen || exp.tareaRealizada,
          rawItem: exp,
        });
      }
    });

    // 4. Casos Falta de Oficio
    casosFaltaOficioList.forEach((cfo) => {
      if (cfo.involucraPersonalPolicial && cfo.personalPolicial) {
        items.push({
          id: `cfo-${cfo.id}`,
          origen: 'falta-oficio',
          origenLabel: 'Falta de Oficio',
          codigoRef: `Pendiente #${cfo.id.slice(-4)}`,
          fecha: cfo.fechaRegistro,
          caratulaOHecho: cfo.resumen || 'Intervención preventiva sin oficio inicial',
          dependenciaInterviniente: cfo.dependenciaSolicitante,
          personalPolicial: cfo.personalPolicial,
          detallesExtra: cfo.tareaRealizada || cfo.observaciones,
          rawItem: cfo,
        });
      }
    });

    // 5. Informes Técnicos Periciales
    informesTecnicosList.forEach((inf) => {
      if (inf.involucraPersonalPolicial && inf.personalPolicial) {
        items.push({
          id: `inf-${inf.id}`,
          origen: 'informe-tecnico',
          origenLabel: 'Informe Técnico',
          codigoRef: `Of. ${inf.oficioNro} - Exp. ${inf.nroExpediente}/${inf.anio}`,
          fecha: inf.fecha,
          caratulaOHecho: inf.caratula,
          dependenciaInterviniente: inf.dependenciaInterviniente,
          juzgadoOFiscalia: inf.juzgado,
          personalPolicial: inf.personalPolicial,
          detallesExtra: inf.dictamenTexto || `Licenciado: ${inf.licenciadoACargoNombre}`,
          rawItem: inf,
        });
      }
    });

    // Ordenar de más reciente a más antiguo
    return items.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  }, [
    intervencionesList,
    inspeccionesList,
    expedientesList,
    casosFaltaOficioList,
    informesTecnicosList,
  ]);

  const dependenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    todosLosCasos.forEach((c) => {
      if (c.dependenciaInterviniente) set.add(c.dependenciaInterviniente);
    });
    return Array.from(set).sort();
  }, [todosLosCasos]);

  const lesionesUnicas = useMemo(() => {
    const set = new Set<string>(['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas']);
    todosLosCasos.forEach((c) => {
      if (c.tipoLesion) set.add(c.tipoLesion);
    });
    return Array.from(set);
  }, [todosLosCasos]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filtroOrigen !== 'todos') count++;
    if (filtroRol !== 'todos') count++;
    if (filtroJerarquia !== 'todas') count++;
    if (filtroDependencia !== 'todas') count++;
    if (filtroTipoLesion !== 'todas') count++;
    if (soloFallecidos) count++;
    if (fechaDesde) count++;
    if (fechaHasta) count++;
    return count;
  }, [
    searchTerm,
    filtroOrigen,
    filtroRol,
    filtroJerarquia,
    filtroDependencia,
    filtroTipoLesion,
    soloFallecidos,
    fechaDesde,
    fechaHasta,
  ]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFiltroOrigen('todos');
    setFiltroRol('todos');
    setFiltroJerarquia('todas');
    setFiltroDependencia('todas');
    setFiltroTipoLesion('todas');
    setSoloFallecidos(false);
    setFechaDesde('');
    setFechaHasta('');
  };

  // Filtrado reactivo
  const filteredCasos = useMemo(() => {
    return todosLosCasos.filter((item) => {
      const matchSearch =
        (item.personalPolicial.plaza || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.personalPolicial.apellidoYNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.personalPolicial.dni && item.personalPolicial.dni.includes(searchTerm)) ||
        item.caratulaOHecho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigoRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dependenciaInterviniente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.personalPolicial.dependenciaRevista &&
          item.personalPolicial.dependenciaRevista.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchOrigen = filtroOrigen === 'todos' || item.origen === filtroOrigen;
      const matchRol =
        filtroRol === 'todos' ||
        (item.personalPolicial.rol &&
          item.personalPolicial.rol.toLowerCase().includes(filtroRol.toLowerCase()));
      const matchJerarquia =
        filtroJerarquia === 'todas' || item.personalPolicial.jerarquia === filtroJerarquia;
      const matchDep =
        filtroDependencia === 'todas' || item.dependenciaInterviniente === filtroDependencia;
      const matchLesion =
        filtroTipoLesion === 'todas' || (item.tipoLesion || 'Sin Lesiones') === filtroTipoLesion;
      const matchFallecido = !soloFallecidos || !!item.fallecido;
      const matchFechaDesde = !fechaDesde || (item.fecha && item.fecha >= fechaDesde);
      const matchFechaHasta = !fechaHasta || (item.fecha && item.fecha <= fechaHasta);

      return (
        matchSearch &&
        matchOrigen &&
        matchRol &&
        matchJerarquia &&
        matchDep &&
        matchLesion &&
        matchFallecido &&
        matchFechaDesde &&
        matchFechaHasta
      );
    });
  }, [
    todosLosCasos,
    searchTerm,
    filtroOrigen,
    filtroRol,
    filtroJerarquia,
    filtroDependencia,
    filtroTipoLesion,
    soloFallecidos,
    fechaDesde,
    fechaHasta,
  ]);

  // Métricas y Contadores KPI
  const metricas = useMemo(() => {
    const total = todosLosCasos.length;
    const enIntervenciones = todosLosCasos.filter(
      (c) => c.origen === 'intervencion-lc' || c.origen === 'intervencion-vial'
    ).length;
    const enInspecciones = todosLosCasos.filter((c) => c.origen === 'inspeccion-ocular').length;
    const enExpedientes = todosLosCasos.filter(
      (c) => c.origen === 'expediente' || c.origen === 'falta-oficio'
    ).length;
    const enInformes = todosLosCasos.filter((c) => c.origen === 'informe-tecnico').length;

    const imputados = todosLosCasos.filter(
      (c) =>
        c.personalPolicial.rol?.toLowerCase().includes('imputado') ||
        c.personalPolicial.rol?.toLowerCase().includes('aprehendido')
    ).length;
    const damnificados = todosLosCasos.filter(
      (c) =>
        c.personalPolicial.rol?.toLowerCase().includes('damnificado') ||
        c.personalPolicial.rol?.toLowerCase().includes('víctima')
    ).length;

    return {
      total,
      enIntervenciones,
      enInspecciones,
      enExpedientes,
      enInformes,
      imputados,
      damnificados,
    };
  }, [todosLosCasos]);

  // Exportar Libro / Registro Oficial a PDF con selección de papel y vista previa
  const handleExportLibroPdf = () => {
    const fileName = `Registro_Causas_Personal_Policial_${new Date().toISOString().slice(0, 10)}.pdf`;
    requestPdfExport({
      title: 'Registro Oficial de Causas con Personal Policial Involucrado',
      fileName,
      defaultOrientation: 'landscape',
      defaultPaperSize: 'a4',
      buildDoc: (opts) => {
        const doc = new jsPDF({
          orientation: resolveJsPdfOrientation(opts.orientation),
          unit: 'mm',
          format: resolveJsPdfFormat(opts.paperSize),
        });

        const startHeaderY = drawPoliceHeader(
          doc,
          config,
          `REGISTRO OFICIAL DE HECHOS Y CAUSAS CON PERSONAL POLICIAL INVOLUCRADO`,
          10
        );

        const headers = [
          [
            'N°',
            'FECHA',
            'ORIGEN / REF.',
            'PLAZA',
            'JERARQUÍA Y NOMBRE',
            'ROL / CONDICIÓN',
            'HECHO / CARÁTULA',
            'DEP. REVISTA',
            'DEP. SOLICITANTE / JUZGADO',
          ],
        ];

        const bodyData = filteredCasos.map((item, idx) => [
          (idx + 1).toString(),
          item.hora ? `${item.fecha}\n${item.hora} hs` : item.fecha,
          `${item.origenLabel}\n${item.codigoRef}`,
          item.personalPolicial.plaza || 's/p',
          `${item.personalPolicial.jerarquia}\n${item.personalPolicial.apellidoYNombre}${
            item.personalPolicial.dni ? `\nDNI: ${item.personalPolicial.dni}` : ''
          }`,
          item.personalPolicial.rol || 'Involucrado',
          item.caratulaOHecho,
          item.personalPolicial.dependenciaRevista || 'No consignada',
          `${item.dependenciaInterviniente}${
            item.juzgadoOFiscalia ? `\nJuzg: ${item.juzgadoOFiscalia}` : ''
          }`,
        ]);

        autoTable(doc, {
          startY: Math.max(startHeaderY + 4, 46),
          head: headers,
          body: bodyData,
          theme: 'grid',
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            valign: 'middle',
          },
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 32 },
            3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 42, fontStyle: 'bold' },
            5: { cellWidth: 28, halign: 'center' },
            6: { cellWidth: 50 },
            7: { cellWidth: 32 },
            8: { cellWidth: 'auto' },
          },
          didDrawPage: () => {
            drawPoliceFooter(doc, config);
          },
        });

        return doc;
      },
    });
  };

  // Helper para badge de origen
  const getOrigenBadge = (origen: OrigenCausaPolicial) => {
    switch (origen) {
      case 'intervencion-lc':
        return {
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
          icon: Shield,
          text: 'Intervención LC',
        };
      case 'intervencion-vial':
        return {
          bg: 'bg-blue-100 text-blue-900 border-blue-200',
          icon: Car,
          text: 'Siniestro Vial',
        };
      case 'inspeccion-ocular':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-200',
          icon: Camera,
          text: 'Inspección Ocular',
        };
      case 'expediente':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          icon: Scale,
          text: 'Expediente Judicial',
        };
      case 'falta-oficio':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-200',
          icon: AlertTriangle,
          text: 'Falta de Oficio',
        };
      case 'informe-tecnico':
        return {
          bg: 'bg-purple-100 text-purple-900 border-purple-200',
          icon: GraduationCap,
          text: 'Informe Técnico',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: FileText,
          text: 'Actuación',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-blue-950 p-6 rounded-2xl shadow-xl text-white border border-red-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Módulo de Control y Seguimiento Institucional</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Causas y Hechos con Personal Policial</span>
              <span className="text-xs bg-red-600/80 text-white px-2.5 py-0.5 rounded-full font-mono border border-red-400">
                {metricas.total} Registros
              </span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Consolidación automática y centralizada de todos los hechos, inspecciones oculares,
              siniestros viales, expedientes judiciales e informes técnicos que involucran a
              efectivos policiales (requiriendo obligatoriamente Jerarquía, Plaza N° y Apellido y Nombre).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleExportLibroPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer border border-red-500"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Libro Oficial PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Causas</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{metricas.total}</div>
          <span className="text-[10px] text-slate-400">En toda la Delegación</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase block">Intervenciones</span>
          <div className="text-2xl font-black text-indigo-900 mt-0.5">{metricas.enIntervenciones}</div>
          <span className="text-[10px] text-indigo-500">LC y Siniestros Viales</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase block">Insp. Oculares</span>
          <div className="text-2xl font-black text-amber-900 mt-0.5">{metricas.enInspecciones}</div>
          <span className="text-[10px] text-amber-500">I.O. en el lugar</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Expedientes</span>
          <div className="text-2xl font-black text-emerald-900 mt-0.5">{metricas.enExpedientes}</div>
          <span className="text-[10px] text-emerald-500">Sumarios / Falta Oficio</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase block">Inf. Técnicos</span>
          <div className="text-2xl font-black text-purple-900 mt-0.5">{metricas.enInformes}</div>
          <span className="text-[10px] text-purple-500">Pericias elevadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-red-200 bg-red-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-red-700 uppercase block">Condición</span>
          <div className="text-xs font-bold text-slate-800 mt-1">
            <span className="text-red-700 font-black text-sm">{metricas.imputados}</span> Imputados
          </div>
          <div className="text-[10px] text-slate-500">
            <span className="text-emerald-700 font-bold">{metricas.damnificados}</span> Damnificados
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda Colapsable */}
      <CollapsibleFilterBar
        title="Búsqueda y Filtros de Causas Policiales"
        activeFiltersCount={activeFiltersCount}
        onClear={handleClearFilters}
        summaryRight={
          <span className="text-[11px] text-slate-500">
            Mostrando <strong>{filteredCasos.length}</strong> de {todosLosCasos.length} causas
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar Plaza N°, Apellido, DNI, Hecho, Exp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white"
            />
          </div>

          <select
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todos">Todos los Orígenes</option>
            <option value="intervencion-lc">Intervenciones LC</option>
            <option value="intervencion-vial">Siniestros Viales</option>
            <option value="inspeccion-ocular">Inspecciones Oculares</option>
            <option value="expediente">Expedientes Judiciales</option>
            <option value="falta-oficio">Falta de Oficio</option>
            <option value="informe-tecnico">Informes Técnicos</option>
          </select>

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todos">Todas las Condiciones / Roles</option>
            <option value="imputado">Imputado</option>
            <option value="damnificado">Damnificado / Víctima</option>
            <option value="conductor">Conductor</option>
            <option value="testigo">Testigo</option>
            <option value="aprehendido">Aprehendido / Demorado</option>
            <option value="denunciante">Denunciante</option>
            <option value="franco">Franco de Servicio</option>
            <option value="sumariado">Sumariado Administrativo</option>
            <option value="disponibilidad">Disponibilidad / Pasiva</option>
            <option value="retirado">Retirado</option>
          </select>

          <select
            value={filtroJerarquia}
            onChange={(e) => setFiltroJerarquia(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Todas las Jerarquías</option>
            {config.jerarquias.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>

          <select
            value={filtroDependencia}
            onChange={(e) => setFiltroDependencia(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Todas las Dependencias</option>
            {dependenciasUnicas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filtroTipoLesion}
            onChange={(e) => setFiltroTipoLesion(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Tipo de Lesiones: Todas</option>
            {lesionesUnicas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha Desde"
              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />
            <span className="text-slate-400 text-[11px]">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha Hasta"
              className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={() => setSoloFallecidos(!soloFallecidos)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
              soloFallecidos
                ? 'bg-rose-700 text-white border-rose-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Solo Fallecidos
          </button>
        </div>
      </CollapsibleFilterBar>

      {/* Tabla Principal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredCasos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              No se encontraron causas o hechos con Personal Policial
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cuando en los módulos de Intervenciones, Inspecciones Oculares, Expedientes, Falta de Oficio o
              Informes Técnicos se marque la opción de hecho con personal policial (indicando Jerarquía,
              Plaza y Nombre), aparecerán automáticamente consolidados aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Plaza N°</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Efectivo Policial</th>
                  <th className="py-2.5 px-3">Rol en Hecho</th>
                  <th className="py-2.5 px-3">Origen / Código Ref.</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Hecho / Carátula</th>
                  <th className="py-2.5 px-3">Unidad Revista</th>
                  <th className="py-2.5 px-3">Dependencia Solicitante</th>
                  <th className="py-2.5 px-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCasos.map((item) => {
                  const badge = getOrigenBadge(item.origen);
                  const Icon = badge.icon;
                  const esImputado =
                    item.personalPolicial.rol?.toLowerCase().includes('imputado') ||
                    item.personalPolicial.rol?.toLowerCase().includes('aprehendido');

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* Plaza N° */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded shadow-2xs">
                          {item.personalPolicial.plaza || 's/p'}
                        </span>
                      </td>

                      {/* Efectivo Policial */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 text-xs uppercase">
                          {item.personalPolicial.apellidoYNombre}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-900">
                          {item.personalPolicial.jerarquia}
                        </div>
                        {item.personalPolicial.dni && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            DNI: {item.personalPolicial.dni}
                          </div>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              esImputado
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {item.personalPolicial.rol || 'Involucrado'}
                          </span>
                          {item.tipoLesion && item.tipoLesion !== 'Sin Lesiones' && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              {item.tipoLesion}
                            </span>
                          )}
                          {item.fallecido && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-900 text-rose-200 border border-rose-500">
                              FALLECIDO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Origen */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.text}</span>
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[150px]">
                          {item.codigoRef}
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-800">
                        <div>{item.fecha}</div>
                        {item.hora && (
                          <div className="text-[10px] text-slate-400">{item.hora} hs.</div>
                        )}
                      </td>

                      {/* Hecho / Carátula */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 line-clamp-2">
                          {item.caratulaOHecho}
                        </div>
                        {item.lugar && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span>{item.lugar}</span>
                          </div>
                        )}
                      </td>

                      {/* Unidad de Revista */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-800">
                        {item.personalPolicial.dependenciaRevista || (
                          <span className="text-slate-400 italic">No consignada</span>
                        )}
                      </td>

                      {/* Dependencia Solicitante / Juzgado */}
                      <td className="py-2.5 px-3 text-[11px]">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]">
                          {item.dependenciaInterviniente}
                        </span>
                        {item.juzgadoOFiscalia && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">
                            {item.juzgadoOFiscalia}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver Ficha Completa del Caso"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ficha Completa de la Causa con Personal Policial */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-red-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Ficha de Caso con Personal Policial Involucrado
                  </h3>
                  <span className="text-[11px] text-slate-300 font-mono">
                    Plaza N° {selectedItem.personalPolicial.plaza} • {selectedItem.origenLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Recuadro Destacado del Efectivo */}
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Datos del Efectivo Policial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Jerarquía:</span>
                    <span className="font-bold text-blue-950 text-sm">
                      {selectedItem.personalPolicial.jerarquia}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Plaza Policial N°:</span>
                    <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200 text-sm">
                      {selectedItem.personalPolicial.plaza}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Apellido y Nombre:</span>
                    <span className="font-bold text-slate-900 uppercase text-sm">
                      {selectedItem.personalPolicial.apellidoYNombre}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">D.N.I.:</span>
                    <span className="font-mono text-slate-800">
                      {selectedItem.personalPolicial.dni || 'No consignado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Rol / Condición en la Causa:</span>
                    <span className="font-bold text-red-800 text-xs">
                      {selectedItem.personalPolicial.rol || 'Involucrado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dependencia de Revista:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem.personalPolicial.dependenciaRevista || 'No consignada'}
                    </span>
                  </div>
                </div>

                {selectedItem.personalPolicial.observaciones && (
                  <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-950 italic">
                    <strong>Observaciones del efectivo:</strong> {selectedItem.personalPolicial.observaciones}
                  </div>
                )}
              </div>

              {/* Datos de la Causa / Actuación */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Detalles de la Causa / Actuación Origen
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Módulo de Origen:</span>
                    <span className="font-bold text-slate-900">{selectedItem.origenLabel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Código / Oficio de Ref.:</span>
                    <span className="font-mono font-bold text-blue-900">
                      {selectedItem.codigoRef}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fecha del Hecho / Causa:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem.fecha} {selectedItem.hora ? `a las ${selectedItem.hora} hs.` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dependencia Solicitante:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem.dependenciaInterviniente}
                    </span>
                  </div>
                  {selectedItem.juzgadoOFiscalia && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Juzgado / Fiscalía:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedItem.juzgadoOFiscalia}
                      </span>
                    </div>
                  )}
                  {selectedItem.lugar && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">Lugar de Ocurrido:</span>
                      <span className="font-semibold text-slate-800">{selectedItem.lugar}</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] mb-0.5">Carátula / Hecho:</span>
                  <div className="p-2.5 bg-white rounded border border-slate-200 font-bold text-slate-900">
                    {selectedItem.caratulaOHecho}
                  </div>
                </div>

                {selectedItem.detallesExtra && (
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-0.5">
                      Síntesis / Tarea / Dictamen:
                    </span>
                    <div className="p-2.5 bg-white rounded border border-slate-200 text-slate-700 whitespace-pre-line">
                      {selectedItem.detallesExtra}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                ID del Registro: {selectedItem.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
