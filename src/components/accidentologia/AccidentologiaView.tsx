import React, { useState, useMemo } from 'react';
import {
  AccidentologiaRegistro,
  Personal,
  IntervencionParte,
  ConfiguracionSistema,
  UsuarioSistema,
  DelegacionPolicial,
} from '../../types/police';
import {
  Search,
  Filter,
  Plus,
  Car,
  Shield,
  FileText,
  AlertTriangle,
  User,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Download,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Building2,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { AccidentologiaModal, calcularCodigoMensual } from './AccidentologiaModal';
import { AccidentologiaReportesView } from './AccidentologiaReportesView';
import { ConfirmModal } from '../common/ConfirmModal';
import { generarPdfReporteAccidentologia } from '../../services/pdfService';

interface AccidentologiaViewProps {
  accidentologiaList: AccidentologiaRegistro[];
  personalList?: Personal[];
  intervencionesList?: IntervencionParte[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  delegacionesList?: DelegacionPolicial[];
  activeDelegacionId?: string;
  onSaveRegistro: (reg: AccidentologiaRegistro) => void;
  onDeleteRegistro: (id: string) => void;
  onSincronizarIntervenciones?: () => void;
}

export type AccidentologiaTab = 'modulo1' | 'modulo2' | 'modulo3' | 'consolidado' | 'reportes';

export const AccidentologiaView: React.FC<AccidentologiaViewProps> = ({
  accidentologiaList = [],
  personalList = [],
  intervencionesList = [],
  config,
  currentUser,
  delegacionesList = [],
  activeDelegacionId = 'del-laguna-blanca',
  onSaveRegistro,
  onDeleteRegistro,
  onSincronizarIntervenciones,
}) => {
  // Pestaña activa del módulo (Módulo 1, 2, 3, Consolidado o 4: Reportes)
  const [activeTab, setActiveTab] = useState<AccidentologiaTab>('consolidado');

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroVia, setFiltroVia] = useState('todas');
  const [filtroDelegacion, setFiltroDelegacion] = useState<string>('activa');
  const [filtroResultado, setFiltroResultado] = useState('todos');
  const [filtroSoloPendientes, setFiltroSoloPendientes] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<AccidentologiaRegistro | null>(null);
  const [registroParaCompletar, setRegistroParaCompletar] = useState<AccidentologiaRegistro | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; reg: AccidentologiaRegistro | null }>({
    isOpen: false,
    reg: null,
  });
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Permiso para ver otras delegaciones
  const puedeVerOtras =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeVerOtrasDelegaciones);

  // Detección de siniestros viales que tienen pendientes tipo de lesiones o alcohotest
  const esRegistroPendiente = (r: AccidentologiaRegistro) => {
    return (
      r.faltaDatos ||
      !r.tipoLesiones ||
      r.tipoLesiones === 'Pendiente de registrar' ||
      r.tipoLesiones.toLowerCase().includes('pendiente') ||
      r.tipoLesiones.toLowerCase().includes('sin especificar') ||
      !r.alcohotest ||
      r.alcohotest === 'Pendiente de registrar' ||
      r.alcohotest.toLowerCase().includes('pendiente') ||
      r.alcohotest.toLowerCase().includes('sin especificar') ||
      r.alcohotest.trim() === ''
    );
  };

  const registrosConDatosPendientes = useMemo(() => {
    return accidentologiaList.filter(esRegistroPendiente);
  }, [accidentologiaList]);

  // Sincronización automática de intervenciones viales con personal policial al montar o recibir nuevas intervenciones
  React.useEffect(() => {
    const idsExistentes = new Set(accidentologiaList.map((a) => a.intervencionId).filter(Boolean));

    intervencionesList.forEach((iv) => {
      const esAccidente =
        iv.tipoIntervencion === 'Accidentológica' ||
        (iv.hecho || '').toUpperCase().includes('SINIESTRO') ||
        (iv.hecho || '').toUpperCase().includes('COLIS') ||
        (iv.hecho || '').toUpperCase().includes('TRANSITO') ||
        (iv.hecho || '').toUpperCase().includes('TRÁNSITO');

      const polInvolucrado = (iv.involucrados || []).find((i) => i.esPersonalPolicial);
      const tienePersonal =
        iv.involucraPersonalPolicial ||
        Boolean(iv.personalPolicial?.apellidoYNombre) ||
        Boolean(polInvolucrado);

      if (esAccidente && tienePersonal && !idsExistentes.has(iv.id)) {
        const jerarquia = polInvolucrado?.jerarquia || iv.personalPolicial?.jerarquia || 'Oficial';
        const apellidoYNombre = polInvolucrado?.apellidoYNombre || iv.personalPolicial?.apellidoYNombre || 'Personal Policial';
        const edad = polInvolucrado?.edad || 30;
        const destino = polInvolucrado?.destino || iv.personalPolicial?.destino || config.dependencia || 'División Policía Científica';
        const unidadRegional = polInvolucrado?.unidadRegional || config.unidadRegional || 'Unidad Regional Cuatro';

        const tipoLesiones = polInvolucrado?.tipoLesion || iv.personalPolicial?.tipoLesion || '';
        const alcohotest = polInvolucrado?.alcohotest || '';

        const faltanDatos = !tipoLesiones || !alcohotest;
        const datosFaltantes: string[] = [];
        if (!tipoLesiones) datosFaltantes.push('tipoLesiones');
        if (!alcohotest) datosFaltantes.push('alcohotest');

        const fecha = iv.inspeccionFecha || new Date().toISOString().slice(0, 10);
        const nuevoCodigo = calcularCodigoMensual(fecha, accidentologiaList);

        const nuevoReg: AccidentologiaRegistro = {
          id: `acc-auto-${iv.id}`,
          codigo: nuevoCodigo,
          delegacionId: activeDelegacionId,
          intervencionId: iv.id,
          fecha,
          dia: 'Día de guardia',
          localidad: config.ciudadDependencia || 'Laguna Blanca',
          lugarOcurrido: iv.inspeccionLugar || iv.direccion || 'Lugar de guardia',
          horarioOcurrido: iv.inspeccionHora ? `${iv.inspeccionHora} hs.` : '08:00 hs.',
          dependenciaInterviniente: iv.dependencia || config.dependencia || 'Comisaría',
          tipoSiniestro: iv.hecho || 'Colisión vial',
          zona: 'Urbana',
          tipoVia: 'RECTA',
          tipoCalzada: 'Asfalto',
          estadoCalzada: 'Bueno',
          senalizacion: 'SI',
          anguloVisual: 'Bueno',
          iluminacion: 'Bueno',
          estadoClima: 'Despejado',
          observacionesSiniestro: iv.sintesisHecho || '',
          jerarquia,
          apellidoYNombre,
          edad,
          destino,
          unidadRegional,
          situacionLaboral: 'ACTIVO',
          situacionServicio: 'ENTRANTE',
          tipoServicio: 'ENTRANTE',
          vestimenta: 'UNIFORMADO',
          tipoLesiones: tipoLesiones || 'Pendiente de registrar',
          alcohotest: alcohotest || 'Pendiente de registrar',
          observacionesPersonal: '',
          tipoRodadoPolicial: iv.personalPolicial?.tipoRodado || 'Motocicleta oficial',
          tipoRodadoOtros: 'Automóvil',
          otrosInvolucrados: 'Ninguno',
          cascoPolicial: 'Colocado',
          cascoOtro: 'No aplica',
          resultadoPolicial: 'EMBESTIDO',
          persPolHuellas: 'FRENADA',
          personalPolicialDinamica: 'CAIDA',
          evidencias: iv.laborCriminalistica || '',
          faltaDatos: faltanDatos,
          datosPendientes: datosFaltantes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onSaveRegistro(nuevoReg);
      }
    });
  }, [intervencionesList, activeDelegacionId]);

  // Filtrado reactivo en tiempo real
  const filteredRegistros = useMemo(() => {
    return accidentologiaList.filter((r) => {
      // Filtro por delegación
      if (filtroDelegacion === 'activa') {
        if (r.delegacionId && r.delegacionId !== activeDelegacionId) return false;
      } else if (filtroDelegacion !== 'todas') {
        if (r.delegacionId !== filtroDelegacion) return false;
      }

      // Filtro de pendientes
      if (filtroSoloPendientes && !esRegistroPendiente(r)) {
        return false;
      }

      // Filtro por mes
      if (filtroMes !== 'todos') {
        if (!r.codigo.toLowerCase().startsWith(filtroMes.toLowerCase())) return false;
      }

      // Filtro por tipo de vía
      if (filtroVia !== 'todas' && r.tipoVia !== filtroVia) return false;

      // Filtro por rol (Embestido vs Embistente)
      if (filtroResultado !== 'todos' && r.resultadoPolicial !== filtroResultado) return false;

      // Buscador por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          r.codigo.toLowerCase().includes(term) ||
          r.apellidoYNombre.toLowerCase().includes(term) ||
          r.jerarquia.toLowerCase().includes(term) ||
          r.lugarOcurrido.toLowerCase().includes(term) ||
          r.localidad.toLowerCase().includes(term) ||
          r.tipoRodadoPolicial.toLowerCase().includes(term) ||
          r.tipoRodadoOtros.toLowerCase().includes(term) ||
          (r.dependenciaInterviniente || '').toLowerCase().includes(term) ||
          (r.observacionesSiniestro || '').toLowerCase().includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [accidentologiaList, filtroDelegacion, activeDelegacionId, filtroSoloPendientes, filtroMes, filtroVia, filtroResultado, searchTerm]);

  // Sincronización automática de intervenciones accidentológicas
  const handleAutoSync = () => {
    let agregados = 0;
    const idsExistentes = new Set(accidentologiaList.map((a) => a.intervencionId).filter(Boolean));

    intervencionesList.forEach((iv) => {
      const esAccidente =
        iv.tipoIntervencion === 'Accidentológica' ||
        (iv.hecho || '').toUpperCase().includes('SINIESTRO') ||
        (iv.hecho || '').toUpperCase().includes('COLISIÓN') ||
        (iv.hecho || '').toUpperCase().includes('COLISION') ||
        iv.involucraPersonalPolicial;

      if (esAccidente && !idsExistentes.has(iv.id)) {
        const fecha = iv.inspeccionFecha || new Date().toISOString().slice(0, 10);
        const nuevoCodigo = calcularCodigoMensual(fecha, accidentologiaList);
        const nuevoReg: AccidentologiaRegistro = {
          id: `acc-auto-${iv.id}`,
          codigo: nuevoCodigo,
          delegacionId: activeDelegacionId,
          intervencionId: iv.id,
          fecha,
          dia: 'Día de guardia',
          localidad: config.ciudadDependencia || 'Laguna Blanca',
          lugarOcurrido: iv.inspeccionLugar || iv.direccion || 'Lugar de guardia',
          horarioOcurrido: iv.inspeccionHora ? `${iv.inspeccionHora} hs.` : '08:00 hs.',
          dependenciaInterviniente: iv.dependencia || config.dependencia || 'Comisaría',
          tipoSiniestro: iv.hecho || 'Colisión vial',
          zona: 'Urbana',
          tipoVia: 'RECTA',
          tipoCalzada: 'Asfalto',
          estadoCalzada: 'Bueno',
          senalizacion: 'SI',
          anguloVisual: 'Bueno',
          iluminacion: 'Bueno',
          estadoClima: 'Despejado',
          observacionesSiniestro: iv.sintesisHecho || '',
          jerarquia: iv.personalPolicial?.jerarquia || 'Oficial',
          apellidoYNombre: iv.personalPolicial?.apellidoYNombre || 'Personal Policial de Guardia',
          edad: 30,
          destino: iv.personalPolicial?.destino || config.dependencia || 'Guardia',
          unidadRegional: config.unidadRegional || 'UR-4',
          situacionLaboral: 'ACTIVO',
          situacionServicio: 'ENTRANTE',
          tipoServicio: 'ENTRANTE',
          vestimenta: 'UNIFORMADO',
          tipoLesiones: iv.personalPolicial?.tipoLesion || 'Sin Lesiones',
          alcohotest: '0.00 g/l (Negativo)',
          observacionesPersonal: '',
          tipoRodadoPolicial: iv.personalPolicial?.tipoRodado || 'Motocicleta oficial',
          tipoRodadoOtros: 'Automóvil',
          otrosInvolucrados: 'Ninguno',
          cascoPolicial: 'Colocado',
          cascoOtro: 'No aplica',
          resultadoPolicial: 'EMBESTIDO',
          persPolHuellas: 'FRENADA',
          personalPolicialDinamica: 'CAIDA',
          evidencias: iv.laborCriminalistica || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onSaveRegistro(nuevoReg);
        agregados++;
      }
    });

    if (agregados > 0) {
      alert(`Se sincronizaron con éxito ${agregados} intervención/es viales al módulo de Accidentología.`);
    } else {
      alert('Todas las intervenciones viales registradas ya se encuentran cargadas en Accidentología.');
    }
  };

  // Exportar a CSV
  const handleExportCsv = () => {
    if (filteredRegistros.length === 0) {
      alert('No hay registros para exportar');
      return;
    }
    const headers = [
      'Código',
      'Fecha',
      'Día',
      'Horario',
      'Localidad',
      'Lugar Ocurrido',
      'Dependencia',
      'Tipo Siniestro',
      'Zona',
      'Tipo Vía',
      'Calzada',
      'Estado Calzada',
      'Señalización',
      'Clima',
      'Jerarquía',
      'Apellido y Nombre',
      'Edad',
      'Destino',
      'Unidad Regional',
      'Situación Laboral',
      'Tipo Servicio',
      'Vestimenta',
      'Lesiones',
      'Alcohotest',
      'Rodado Policial',
      'Rodado Otros',
      'Casco Policial',
      'Resultado (Rol)',
      'Huellas',
      'Dinámica',
      'Evidencias',
    ];

    const rows = filteredRegistros.map((r) => [
      `"${r.codigo}"`,
      `"${r.fecha}"`,
      `"${r.dia}"`,
      `"${r.horarioOcurrido}"`,
      `"${r.localidad}"`,
      `"${r.lugarOcurrido.replace(/"/g, '""')}"`,
      `"${r.dependenciaInterviniente || ''}"`,
      `"${r.tipoSiniestro}"`,
      `"${r.zona}"`,
      `"${r.tipoVia}"`,
      `"${r.tipoCalzada}"`,
      `"${r.estadoCalzada}"`,
      `"${r.senalizacion}"`,
      `"${r.estadoClima}"`,
      `"${r.jerarquia}"`,
      `"${r.apellidoYNombre.replace(/"/g, '""')}"`,
      `"${r.edad}"`,
      `"${r.destino}"`,
      `"${r.unidadRegional}"`,
      `"${r.situacionLaboral}"`,
      `"${r.tipoServicio}"`,
      `"${r.vestimenta}"`,
      `"${r.tipoLesiones}"`,
      `"${r.alcohotest}"`,
      `"${r.tipoRodadoPolicial}"`,
      `"${r.tipoRodadoOtros}"`,
      `"${r.cascoPolicial}"`,
      `"${r.resultadoPolicial}"`,
      `"${r.persPolHuellas}"`,
      `"${r.personalPolicialDinamica}"`,
      `"${(r.evidencias || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accidentologia_Policial_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* HEADER PRINCIPAL ESTILO PARTE DE NOVEDADES */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-900" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Módulo de Accidentología Vial</span>
            </h1>
            <span className="bg-blue-100 text-blue-950 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredRegistros.length} siniestros registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Relevamiento pericial integral de siniestros viales con efectivos policiales involucrados. Registros codificados por mes (ej. Ene-01, Feb-02).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoSync}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Importar automáticamente intervenciones registradas en guardias"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-800" />
            <span>Sincronizar Intervenciones</span>
          </button>

          <button
            onClick={() => generarPdfReporteAccidentologia(filteredRegistros, config)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Descargar Planilla Oficial en Formato PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={() => {
              setEditingRegistro(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Siniestro Vial</span>
          </button>
        </div>
      </div>

      {/* SELECTOR DE SUBMÓDULOS / PESTAÑAS (1, 2, 3, Consolidado y 4: Reportes) */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 gap-1">
          <button
            onClick={() => setActiveTab('consolidado')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeTab === 'consolidado'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ficha Consolidada Integral</span>
          </button>
          <button
            onClick={() => setActiveTab('modulo1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeTab === 'modulo1'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1° Siniestros Viales</span>
          </button>
          <button
            onClick={() => setActiveTab('modulo2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeTab === 'modulo2'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>2° Datos Generales</span>
          </button>
          <button
            onClick={() => setActiveTab('modulo3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeTab === 'modulo3'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>3° Rodados & Dinámica</span>
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-extrabold transition-all cursor-pointer ${
              activeTab === 'reportes'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>4° Reportes y Gráficos</span>
          </button>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS EN TIEMPO REAL */}
      {activeTab !== 'reportes' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código (ej. Ene-01), efectivo, jerarquía, lugar, tipo rodado..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-xs"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Delegación */}
              {puedeVerOtras && delegacionesList.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filtroDelegacion}
                    onChange={(e) => setFiltroDelegacion(e.target.value)}
                    className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="activa">Delegación Activa</option>
                    <option value="todas">Todas las Delegaciones (Módulo General)</option>
                    {delegacionesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro Mes */}
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="todos">Todos los Meses</option>
                <option value="Ene">Enero (Ene-)</option>
                <option value="Feb">Febrero (Feb-)</option>
                <option value="Mar">Marzo (Mar-)</option>
                <option value="Abr">Abril (Abr-)</option>
                <option value="May">Mayo (May-)</option>
                <option value="Jun">Junio (Jun-)</option>
                <option value="Jul">Julio (Jul-)</option>
                <option value="Ago">Agosto (Ago-)</option>
                <option value="Sep">Septiembre (Sep-)</option>
                <option value="Oct">Octubre (Oct-)</option>
                <option value="Nov">Noviembre (Nov-)</option>
                <option value="Dic">Diciembre (Dic-)</option>
              </select>

              {/* Filtro Vía */}
              <select
                value={filtroVia}
                onChange={(e) => setFiltroVia(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="todas">Tipo de Vía: Todas</option>
                <option value="RECTA">RECTA</option>
                <option value="INTERSECCIÓN">INTERSECCIÓN</option>
                <option value="ROTONDA">ROTONDA</option>
              </select>

              {/* Filtro Rol */}
              <select
                value={filtroResultado}
                onChange={(e) => setFiltroResultado(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="todos">Rol Policial: Todos</option>
                <option value="EMBESTIDO">EMBESTIDO</option>
                <option value="EMBISTENTE">EMBISTENTE</option>
              </select>

              {/* Botón Filtro Solo Pendientes */}
              <button
                type="button"
                onClick={() => setFiltroSoloPendientes(!filtroSoloPendientes)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  filtroSoloPendientes
                    ? 'bg-amber-800 text-white shadow-xs'
                    : registrosConDatosPendientes.length > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Filtrar siniestros que tienen pendientes Tipo de Lesiones o Alcohotest"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${registrosConDatosPendientes.length > 0 ? 'text-amber-700' : 'text-slate-400'}`} />
                <span>
                  {filtroSoloPendientes ? '✓ Mostrando Pendientes' : `Pendientes Lesiones/Alcohotest (${registrosConDatosPendientes.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Aviso de Datos Pendientes */}
      {registrosConDatosPendientes.length > 0 && activeTab !== 'reportes' && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atención Pericial:</strong> Se detectaron <strong>{registrosConDatosPendientes.length} siniestro(s) viales</strong> importados automáticamente que requieren completar <strong>Tipo de Lesiones</strong> y/o <strong>Alcohotest</strong> del personal policial.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFiltroSoloPendientes(!filtroSoloPendientes)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filtroSoloPendientes
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-white text-amber-900 border border-amber-400 hover:bg-amber-100'
            }`}
          >
            {filtroSoloPendientes ? '✓ Ver Todos los Registros' : 'Filtrar y Completar Pendientes'}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 1: FICHA CONSOLIDADA INTEGRAL ESTILO PARTE DE NOVEDADES */}
      {/* ======================================================== */}
      {activeTab === 'consolidado' && (
        <div className="space-y-3">
          {filteredRegistros.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              <Car className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm">No se encontraron siniestros viales registrados</p>
              <p className="text-xs mt-1">Presione "+ Nuevo Siniestro Vial" o "Sincronizar Intervenciones".</p>
            </div>
          ) : (
            filteredRegistros.map((r) => {
              const isExpanded = expandedRowId === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden text-xs"
                >
                  {/* Encabezado de la Tarjeta */}
                  <div
                    onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                    className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-900 text-white rounded-lg font-mono font-black text-xs shrink-0 shadow-xs">
                        {r.codigo}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {r.jerarquia} {r.apellidoYNombre}
                          </span>
                          <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {r.destino}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              r.resultadoPolicial === 'EMBESTIDO'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            ROL: {r.resultadoPolicial}
                          </span>
                          {esRegistroPendiente(r) && (
                            <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Falta: Lesión / Alcohotest
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                          <span>📅 {r.fecha} ({r.dia}) - ⏰ {r.horarioOcurrido}</span>
                          <span>•</span>
                          <span>📍 {r.lugarOcurrido} ({r.localidad})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {esRegistroPendiente(r) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegistroParaCompletar(r);
                          }}
                          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                          title="Completar datos faltantes: Tipo de Lesión y Alcohotest"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Completar Lesiones/Alcohotest</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRegistro(r);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-blue-900 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar registro"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ isOpen: true, reg: r });
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Cuerpo resumido de los 3 módulos */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Tarjeta Módulo 1 */}
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-1.5">
                      <span className="font-bold text-blue-950 uppercase text-[10px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-700" />
                        <span>1° Siniestro Vial</span>
                      </span>
                      <p className="text-slate-800">
                        <strong>Tipo:</strong> {r.tipoSiniestro} ({r.zona})
                      </p>
                      <p className="text-slate-700">
                        <strong>Vía:</strong> {r.tipoVia} - Calzada: {r.tipoCalzada} ({r.estadoCalzada})
                      </p>
                      <p className="text-slate-600">
                        <strong>Clima / Ilum.:</strong> {r.estadoClima} | {r.iluminacion}
                      </p>
                    </div>

                    {/* Tarjeta Módulo 2 */}
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-1.5">
                      <span className="font-bold text-emerald-950 uppercase text-[10px] flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-700" />
                        <span>2° Datos Generales (Efectivo)</span>
                      </span>
                      <p className="text-slate-800">
                        <strong>Servicio:</strong> {r.tipoServicio} ({r.situacionLaboral}) - {r.vestimenta}
                      </p>
                      <p className="text-slate-700">
                        <strong>Lesiones:</strong> {r.tipoLesiones}
                      </p>
                      <p className="text-slate-600">
                        <strong>Alcohotest:</strong> {r.alcohotest}
                      </p>
                    </div>

                    {/* Tarjeta Módulo 3 */}
                    <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1.5">
                      <span className="font-bold text-amber-950 uppercase text-[10px] flex items-center gap-1">
                        <Car className="w-3 h-3 text-amber-700" />
                        <span>3° Rodados & Dinámica</span>
                      </span>
                      <p className="text-slate-800">
                        <strong>Rodado Policial:</strong> {r.tipoRodadoPolicial}
                      </p>
                      <p className="text-slate-700">
                        <strong>Otro Rodado:</strong> {r.tipoRodadoOtros} (Casco: {r.cascoPolicial})
                      </p>
                      <p className="text-slate-600">
                        <strong>Dinámica:</strong> {r.persPolHuellas} / {r.personalPolicialDinamica}
                      </p>
                    </div>
                  </div>

                  {/* Detalle expandido completo */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-200 text-slate-700 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <strong>Dependencia Interviniente:</strong> {r.dependenciaInterviniente || '---'}
                          <br />
                          <strong>Observaciones Siniestro:</strong> {r.observacionesSiniestro || 'Sin observaciones'}
                        </div>
                        <div>
                          <strong>Evidencias Relevadas:</strong> {r.evidencias || 'Sin evidencias registradas'}
                          <br />
                          <strong>Observaciones Efectivo:</strong> {r.observacionesPersonal || 'Sin observaciones'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: PRIMER MÓDULO (SINIESTROS VIALES) */}
      {/* ======================================================== */}
      {activeTab === 'modulo1' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-950 text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Localidad / Lugar Ocurrido</th>
                <th className="py-2.5 px-3">Tipo Siniestro</th>
                <th className="py-2.5 px-3">Vía / Calzada</th>
                <th className="py-2.5 px-3">Señal / Ilum.</th>
                <th className="py-2.5 px-3">Clima</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{r.codigo}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold">{r.fecha}</span>
                    <div className="text-[10px] text-slate-500">{r.horarioOcurrido} ({r.dia})</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-900">{r.lugarOcurrido}</div>
                    <div className="text-[10px] text-slate-500">{r.localidad}</div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{r.tipoSiniestro}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900">{r.tipoVia}</span>
                    <div className="text-[10px] text-slate-500">{r.tipoCalzada} ({r.estadoCalzada})</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={r.senalizacion === 'SI' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      Señal: {r.senalizacion}
                    </span>
                    <div className="text-[10px] text-slate-500">Luz: {r.iluminacion}</div>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{r.estadoClima}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => {
                        setEditingRegistro(r);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-900 hover:text-blue-950 p-1 cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: SEGUNDO MÓDULO (DATOS GENERALES) */}
      {/* ======================================================== */}
      {activeTab === 'modulo2' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-950 text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Jerarquía y Nombre</th>
                <th className="py-2.5 px-3">Edad</th>
                <th className="py-2.5 px-3">Destino / UR</th>
                <th className="py-2.5 px-3">Sit. Laboral</th>
                <th className="py-2.5 px-3">Servicio / Vestimenta</th>
                <th className="py-2.5 px-3">Lesiones</th>
                <th className="py-2.5 px-3">Alcohotest</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{r.codigo}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900">{r.jerarquia}</span> {r.apellidoYNombre}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{r.edad || '---'}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold">{r.destino}</div>
                    <div className="text-[10px] text-slate-500">{r.unidadRegional}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[10px]">
                      {r.situacionLaboral}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{r.tipoServicio}</div>
                    <div className="text-[10px] text-slate-500">{r.vestimenta}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    {r.tipoLesiones && !r.tipoLesiones.toLowerCase().includes('pendiente') ? (
                      <span className="font-semibold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{r.tipoLesiones}</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 w-max">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    {r.alcohotest && !r.alcohotest.toLowerCase().includes('pendiente') ? (
                      <span>{r.alcohotest}</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 w-max font-sans">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {esRegistroPendiente(r) && (
                        <button
                          type="button"
                          onClick={() => setRegistroParaCompletar(r)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-0.5 rounded transition-colors cursor-pointer shadow-2xs"
                          title="Completar Tipo de Lesiones y Alcohotest"
                        >
                          Completar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingRegistro(r);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-900 hover:text-blue-950 p-1 cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 4: TERCER MÓDULO (RODADOS & DINÁMICA) */}
      {/* ======================================================== */}
      {activeTab === 'modulo3' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-950 text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Rodado Policial</th>
                <th className="py-2.5 px-3">Otro Rodado / Involucrado</th>
                <th className="py-2.5 px-3">Casco Policial</th>
                <th className="py-2.5 px-3">Casco Otro</th>
                <th className="py-2.5 px-3">Rol Policial</th>
                <th className="py-2.5 px-3">Huellas / Dinámica</th>
                <th className="py-2.5 px-3">Evidencias</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{r.codigo}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{r.tipoRodadoPolicial}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-800">{r.tipoRodadoOtros}</div>
                    {r.otrosInvolucrados && r.otrosInvolucrados !== 'Ninguno' && (
                      <div className="text-[10px] text-slate-500">Otros: {r.otrosInvolucrados}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{r.cascoPolicial}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.cascoOtro}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        r.resultadoPolicial === 'EMBESTIDO'
                          ? 'bg-amber-100 text-amber-950'
                          : 'bg-rose-100 text-rose-950'
                      }`}
                    >
                      {r.resultadoPolicial}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800">{r.persPolHuellas}</span> / {r.personalPolicialDinamica}
                  </td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-slate-600" title={r.evidencias}>
                    {r.evidencias || '---'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => {
                        setEditingRegistro(r);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-900 hover:text-blue-950 p-1 cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 5: CUARTO MÓDULO (REPORTES Y GRÁFICOS) */}
      {/* ======================================================== */}
      {activeTab === 'reportes' && (
        <AccidentologiaReportesView registros={filteredRegistros} config={config} />
      )}

      {/* Modal para Crear / Editar Registro */}
      {isModalOpen && (
        <AccidentologiaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onSaveRegistro}
          registroEditar={editingRegistro}
          personalList={personalList}
          intervencionesList={intervencionesList}
          config={config}
          activeDelegacionId={activeDelegacionId}
          delegacionesList={delegacionesList}
          registrosExistentes={accidentologiaList}
        />
      )}

      {/* Modal Dedicado para Completar Solamente Tipo de Lesiones y Alcohotest */}
      {registroParaCompletar && (
        <CompletarLesionesAlcohotestModal
          registro={registroParaCompletar}
          onClose={() => setRegistroParaCompletar(null)}
          onSave={onSaveRegistro}
        />
      )}

      {/* Confirmación para Eliminar Registro */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Registro de Accidentología"
        message={`¿Confirma eliminar definitivamente el siniestro vial ${deleteConfirm.reg?.codigo || ''} correspondiente al efectivo ${deleteConfirm.reg?.jerarquia || ''} ${deleteConfirm.reg?.apellidoYNombre || ''}?`}
        confirmLabel="Eliminar Registro"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirm.reg) {
            onDeleteRegistro(deleteConfirm.reg.id);
          }
        }}
        onClose={() => setDeleteConfirm({ isOpen: false, reg: null })}
      />
    </div>
  );
};

// Sub-componente modal enfocado en completar exclusivamente Lesiones y Alcohotest
interface CompletarLesionesAlcohotestModalProps {
  registro: AccidentologiaRegistro;
  onClose: () => void;
  onSave: (reg: AccidentologiaRegistro) => void;
}

const CompletarLesionesAlcohotestModal: React.FC<CompletarLesionesAlcohotestModalProps> = ({
  registro,
  onClose,
  onSave,
}) => {
  const [tipoLesiones, setTipoLesiones] = useState<string>(
    registro.tipoLesiones && !registro.tipoLesiones.toLowerCase().includes('pendiente')
      ? registro.tipoLesiones
      : 'Sin Lesiones'
  );
  const [alcohotestOpcion, setAlcohotestOpcion] = useState<string>(
    registro.alcohotest && !registro.alcohotest.toLowerCase().includes('pendiente')
      ? registro.alcohotest
      : '0.00 g/l (Negativo)'
  );
  const [alcohotestDetalle, setAlcohotestDetalle] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAlcohotest = alcohotestDetalle.trim()
      ? `${alcohotestOpcion} (${alcohotestDetalle.trim()})`
      : alcohotestOpcion;

    onSave({
      ...registro,
      tipoLesiones,
      alcohotest: finalAlcohotest,
      faltaDatos: false,
      datosPendientes: [],
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-100" />
            <div>
              <h3 className="font-bold text-sm">Completar Datos Pendientes de Siniestro Vial</h3>
              <p className="text-[11px] text-amber-100 font-mono">
                {registro.codigo} — {registro.jerarquia} {registro.apellidoYNombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 space-y-1">
            <p className="font-bold">Información importada de la intervención policial:</p>
            <p><strong>Lugar del Hecho:</strong> {registro.lugarOcurrido} ({registro.localidad})</p>
            <p><strong>Fecha y Hora:</strong> {registro.fecha} {registro.horarioOcurrido}</p>
            <p><strong>Dependencia:</strong> {registro.dependenciaInterviniente}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              1. Tipo de Lesiones del Personal Policial *
            </label>
            <select
              value={tipoLesiones}
              onChange={(e) => setTipoLesiones(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="Sin Lesiones">Sin Lesiones (Ileso)</option>
              <option value="Leves">Leves</option>
              <option value="Graves">Graves</option>
              <option value="Gravísimas">Gravísimas</option>
              <option value="Óbito">Óbito (Fallecido)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              2. Resultado de Alcohotest *
            </label>
            <select
              value={alcohotestOpcion}
              onChange={(e) => setAlcohotestOpcion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="0.00 g/l (Negativo)">0.00 g/l (Negativo)</option>
              <option value="Positivo (Mayor a 0.00 g/l)">Positivo (Mayor a 0.00 g/l)</option>
              <option value="No se realizó">No se realizó</option>
              <option value="Extracción sanguínea en nosocomio">Extracción sanguínea en nosocomio</option>
              <option value="Se negó al test">Se negó al test</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700">
              Observación o Valor Numérico de Alcohotest (Opcional)
            </label>
            <input
              type="text"
              value={alcohotestDetalle}
              onChange={(e) => setAlcohotestDetalle(e.target.value)}
              placeholder="Ej. Pipeta N° 23 / 0.00 g/l / Médico interviniente"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              Guardar y Completar Ficha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
