import React, { useState, useMemo } from 'react';
import {
  ExpedienteJudicial,
  CasoFaltaOficio,
  ConfiguracionSistema,
  Personal,
} from '../../types/police';
import {
  Search,
  Plus,
  FileText,
  ShieldAlert,
  Layers,
  Download,
  Filter,
  CheckCircle,
  Clock,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Check,
  X,
  LayoutList,
  Table as TableIcon,
  LayoutGrid,
  FileSpreadsheet,
} from 'lucide-react';
import { ExpedienteModal } from './ExpedienteModal';
import { FaltaOficioModal } from './FaltaOficioModal';
import { AgrupacionModal } from './AgrupacionModal';
import { generarPdfLibroExpedientes } from '../../services/pdfService';
import { ConfirmModal } from '../common/ConfirmModal';

interface ExpedientesViewProps {
  expedientesList: ExpedienteJudicial[];
  casosFaltaOficioList: CasoFaltaOficio[];
  personalList?: Personal[];
  config: ConfiguracionSistema;
  onSaveExpediente: (exp: ExpedienteJudicial) => void;
  onDeleteExpediente: (id: string) => void;
  onSaveCasoFaltaOficio: (caso: CasoFaltaOficio) => void;
  onDeleteCasoFaltaOficio: (id: string) => void;
  onConsolidarAgrupacion: (nuevoExp: ExpedienteJudicial, casosIds: string[]) => void;
  initialSubTab?: 'expedientes' | 'falta-oficio';
}

export const ExpedientesView: React.FC<ExpedientesViewProps> = ({
  expedientesList,
  casosFaltaOficioList,
  personalList = [],
  config,
  onSaveExpediente,
  onDeleteExpediente,
  onSaveCasoFaltaOficio,
  onDeleteCasoFaltaOficio,
  onConsolidarAgrupacion,
  initialSubTab = 'expedientes',
}) => {
  const [subTab, setSubTab] = useState<'expedientes' | 'falta-oficio'>(initialSubTab);
  const [viewStyle, setViewStyle] = useState<'lista' | 'tabla' | 'cuadricula' | 'parte-novedades'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRequerimiento, setFiltroRequerimiento] = useState('todos');
  const [filtroEntrega, setFiltroEntrega] = useState('todos');

  // Modales
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<ExpedienteJudicial | null>(null);

  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false);
  const [selectedCasoFalta, setSelectedCasoFalta] = useState<CasoFaltaOficio | null>(null);

  const [isAgrupacionOpen, setIsAgrupacionOpen] = useState(false);
  const [selectedCasosIds, setSelectedCasosIds] = useState<string[]>([]);

  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [deleteExpConfirm, setDeleteExpConfirm] = useState<{
    isOpen: boolean;
    exp: ExpedienteJudicial | null;
  }>({ isOpen: false, exp: null });
  const [deleteCasoConfirm, setDeleteCasoConfirm] = useState<{
    isOpen: boolean;
    caso: CasoFaltaOficio | null;
  }>({ isOpen: false, caso: null });

  // Modal para marcar Oficio Recepcionado individualmente
  const [casoParaRecepcionar, setCasoParaRecepcionar] = useState<CasoFaltaOficio | null>(null);
  const [nroOficioRecepcionado, setNroOficioRecepcionado] = useState('');
  const [nroExpRecepcionado, setNroExpRecepcionado] = useState('');

  // Estados para Carga de Datos Directa en Tabla (Estilo Parte de Novedades)
  const añoActual = useMemo(() => new Date().getFullYear(), []);
  const [inlineOficio, setInlineOficio] = useState<string>(() => `OF-Nº ${String(expedientesList.length + 1).padStart(3, '0')}/${String(añoActual).slice(-2)}`);
  const [inlineExp, setInlineExp] = useState<string>(() => `IPP-04-00-0${String(20000 + expedientesList.length + 1)}-${String(añoActual).slice(-2)}`);
  const [inlineFecha, setInlineFecha] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [inlineDependencia, setInlineDependencia] = useState<string>(() => config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra');
  const [inlineJuzgado, setInlineJuzgado] = useState<string>(() => config.juzgadosFiscalias[0] || 'UFI N° 1 - Delitos Complejos');
  const [inlineCaratula, setInlineCaratula] = useState<string>('');
  const [inlineReq, setInlineReq] = useState<string>(() => config.tiposRequerimiento[0] || 'Resguardo de Evidencia');
  const [inlineInstruccion, setInlineInstruccion] = useState<string>('');
  const [inlineEstado, setInlineEstado] = useState<'No entregado' | 'Entregado'>('No entregado');
  const [quickExpSuccess, setQuickExpSuccess] = useState<string | null>(null);

  // Estados para Edición Directa en Fila (Inline Row Editing)
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingExpData, setEditingExpData] = useState<ExpedienteJudicial | null>(null);

  const handleCargarExpedienteDesdeTabla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineOficio.trim() || !inlineCaratula.trim()) {
      alert('Debe completar el N° de Oficio y la Carátula de la causa.');
      return;
    }

    const nuevoExp: ExpedienteJudicial = {
      id: 'exp-' + Date.now(),
      nroOficioLetras: inlineOficio.trim(),
      nroExpediente: inlineExp.trim() || `EXP-${inlineOficio.trim()}`,
      caratulaOrigen: inlineCaratula.trim().toUpperCase(),
      fechaRegistro: inlineFecha,
      juzgadoFiscalia: inlineJuzgado,
      dependenciaSolicitante: inlineDependencia,
      tipoOficio: config.tiposOficio[0] || 'Instrucción Penal Preparatoria (IPP)',
      tipoRequerimiento: inlineReq,
      tareaRealizada: 'Tramitación y peritaje oficial registrado directamente desde tabla.',
      resumen: `Expediente recibido de ${inlineDependencia} para ${inlineReq}.`,
      personalInstruccion: inlineInstruccion,
      estadoEntrega: inlineEstado,
      ppi: { tienePPI: false },
      personasVinculadas: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpediente(nuevoExp);

    // Actualizar para la siguiente fila
    const nextIdx = expedientesList.length + 2;
    setInlineOficio(`OF-Nº ${String(nextIdx).padStart(3, '0')}/${String(añoActual).slice(-2)}`);
    setInlineExp(`IPP-04-00-0${String(20000 + nextIdx)}-${String(añoActual).slice(-2)}`);
    setInlineCaratula('');
    setInlineInstruccion('');
    setQuickExpSuccess(`¡Expediente ${nuevoExp.nroOficioLetras} cargado en tabla con éxito!`);
    setTimeout(() => setQuickExpSuccess(null), 4000);
  };

  const handleSaveInlineExpEdit = () => {
    if (!editingExpData) return;
    onSaveExpediente(editingExpData);
    setEditingExpId(null);
    setEditingExpData(null);
    setQuickExpSuccess('Expediente actualizado en la tabla.');
    setTimeout(() => setQuickExpSuccess(null), 3000);
  };

  // BÚSQUEDA REACTIVA:
  // "coincida contra N° Expediente, Origen, Tipos, Resumen, y contra la nómina de nombres y DNIs cargados en el resguardo"
  const filteredExpedientes = useMemo(() => {
    return expedientesList.filter((exp) => {
      const term = searchTerm.toLowerCase();

      // Búsqueda en personas vinculadas
      const matchPersonas = exp.personasVinculadas?.some(
        (p) => p.apellidoYNombre.toLowerCase().includes(term) || p.dni.includes(term)
      );

      const matchGeneral =
        exp.nroExpediente.toLowerCase().includes(term) ||
        (exp.nroOficioLetras || '').toLowerCase().includes(term) ||
        exp.caratulaOrigen.toLowerCase().includes(term) ||
        exp.tipoRequerimiento.toLowerCase().includes(term) ||
        (exp.resumen || '').toLowerCase().includes(term) ||
        exp.dependenciaSolicitante.toLowerCase().includes(term);

      const matchReq =
        filtroRequerimiento === 'todos' || exp.tipoRequerimiento === filtroRequerimiento;

      const matchEnt =
        filtroEntrega === 'todos' || exp.estadoEntrega === filtroEntrega;

      return (matchGeneral || matchPersonas) && matchReq && matchEnt;
    });
  }, [expedientesList, searchTerm, filtroRequerimiento, filtroEntrega]);

  // Casos Falta de Oficio filtrados
  const filteredCasosFalta = useMemo(() => {
    return casosFaltaOficioList.filter((c) => {
      const term = searchTerm.toLowerCase();
      const matchPersonas = c.personasVinculadas?.some(
        (p) => p.apellidoYNombre.toLowerCase().includes(term) || p.dni.includes(term)
      );
      const matchGeneral =
        c.origenIntervencion.toLowerCase().includes(term) ||
        c.dependenciaSolicitante.toLowerCase().includes(term) ||
        c.tareaRealizada.toLowerCase().includes(term) ||
        (c.resumen || '').toLowerCase().includes(term);

      return matchGeneral || matchPersonas;
    });
  }, [casosFaltaOficioList, searchTerm]);

  // Selección checkbox de casos para agrupar
  const toggleSelectCaso = (id: string) => {
    setSelectedCasosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCasosPendientes = () => {
    const pendientes = filteredCasosFalta.filter((c) => c.estado === 'Pendiente').map((c) => c.id);
    if (selectedCasosIds.length === pendientes.length) {
      setSelectedCasosIds([]);
    } else {
      setSelectedCasosIds(pendientes);
    }
  };

  // Marcar caso como "Oficio Recepcionado"
  const handleConfirmRecepcionOficio = () => {
    if (!casoParaRecepcionar) return;
    if (!nroOficioRecepcionado.trim()) {
      alert('Debe ingresar el N° de Oficio formal recibido');
      return;
    }

    const casoActualizado: CasoFaltaOficio = {
      ...casoParaRecepcionar,
      estado: 'Oficio Recepcionado',
      nroOficioAsignado: nroOficioRecepcionado,
      fechaRecepcionOficio: new Date().toISOString().slice(0, 10),
    };
    onSaveCasoFaltaOficio(casoActualizado);

    // Opcionalmente crear el Expediente formal
    const nuevoExp: ExpedienteJudicial = {
      id: 'exp-' + Date.now(),
      nroOficioLetras: nroOficioRecepcionado,
      nroExpediente: nroExpRecepcionado || `EXP-${nroOficioRecepcionado}`,
      caratulaOrigen: `OFICIO RECEPCIONADO EX-FALTA DE OFICIO - ${casoParaRecepcionar.dependenciaSolicitante}`,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      juzgadoFiscalia: config.juzgadosFiscalias[0],
      dependenciaSolicitante: casoParaRecepcionar.dependenciaSolicitante,
      tipoOficio: config.tiposOficio[0],
      tipoRequerimiento: casoParaRecepcionar.tipoRequerimiento,
      tareaRealizada: casoParaRecepcionar.tareaRealizada,
      resumen: casoParaRecepcionar.resumen || `Personas: ${(casoParaRecepcionar.personasVinculadas || []).map(p => `${p.apellidoYNombre} (${p.dni})`).join(', ')}`,
      estadoEntrega: 'No entregado',
      ppi: { tienePPI: false },
      personasVinculadas: casoParaRecepcionar.personasVinculadas,
      casosAgrupadosIds: [casoParaRecepcionar.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveExpediente(nuevoExp);

    setCasoParaRecepcionar(null);
    setNroOficioRecepcionado('');
    setNroExpRecepcionado('');
  };

  return (
    <div className="space-y-5">
      {/* Header y Selector de Submódulo */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Expedientes Judiciales & Tareas Operativas
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recepción de oficios, tramitación pericial, resguardo de evidencia y consolidación de actuaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'expedientes' ? (
            <>
              <button
                onClick={() => generarPdfLibroExpedientes(filteredExpedientes, config)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Libro Oficial PDF</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCasoFalta(null);
                  setIsFaltaModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                title="Registrar actuación urgente sin oficio previo"
              >
                <ShieldAlert className="w-4 h-4 text-red-200" />
                <span>+ Registrar Causa Sin Oficio</span>
              </button>

              <button
                onClick={() => {
                  setSelectedExpediente(null);
                  setIsExpModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Expediente</span>
              </button>
            </>
          ) : (
            <>
              {selectedCasosIds.length > 0 && (
                <button
                  onClick={() => setIsAgrupacionOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer animate-pulse"
                >
                  <Layers className="w-4 h-4" />
                  <span>Agrupar {selectedCasosIds.length} Casos en un Oficio</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedCasoFalta(null);
                  setIsFaltaModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Caso s/ Oficio</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Selector: Expedientes vs Casos Falta de Oficio */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-3 text-xs font-bold shadow-xs">
        <button
          onClick={() => setSubTab('expedientes')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            subTab === 'expedientes'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Libro de Expedientes Formales ({expedientesList.length})</span>
        </button>

        <button
          onClick={() => setSubTab('falta-oficio')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            subTab === 'falta-oficio'
              ? 'border-red-700 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>
            Sección "Casos Falta de Oficio" (
            {casosFaltaOficioList.filter((c) => c.estado === 'Pendiente').length} pendientes)
          </span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros con Selector de Estilos de Vista */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° Oficio, Carátula, DNI o Nombre de resguardo..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <select
              value={filtroRequerimiento}
              onChange={(e) => setFiltroRequerimiento(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los Tipos de Requerimiento</option>
              {config.tiposRequerimiento.map((tr) => (
                <option key={tr} value={tr}>
                  {tr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filtroEntrega}
              onChange={(e) => setFiltroEntrega(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="todos">Todos los Estados de Elevación</option>
              <option value="Entregado">Entregado / Elevado</option>
              <option value="No entregado">No entregado (En trámite)</option>
            </select>
          </div>
        </div>

        {/* Selector de Estilo de Vista */}
        {subTab === 'expedientes' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">
              Mostrando <strong>{filteredExpedientes.length}</strong> de {expedientesList.length} expedientes registrados
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs gap-1">
              <button
                type="button"
                onClick={() => setViewStyle('lista')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewStyle === 'lista'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Detallada en Lista"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>

              <button
                type="button"
                onClick={() => setViewStyle('tabla')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewStyle === 'tabla'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista en Tabla Compacta"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>

              <button
                type="button"
                onClick={() => setViewStyle('cuadricula')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  viewStyle === 'cuadricula'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista en Cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>

              <button
                type="button"
                onClick={() => setViewStyle('parte-novedades')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  viewStyle === 'parte-novedades'
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Formato Matriz Policial similar a Parte de Novedades"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                <span>Estilo Parte de Novedades</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUBMÓDULO 1: EXPEDIENTES JUDICIALES FORMALES */}
      {subTab === 'expedientes' && (
        <div className="space-y-3">
          {filteredExpedientes.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No se encontraron expedientes</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ajuste los filtros o registre un nuevo expediente judicial.
              </p>
            </div>
          ) : viewStyle === 'lista' ? (
            <div className="space-y-3">
              {filteredExpedientes.map((exp) => {
                const tieneAdjuntos =
                  (exp.adjuntosOficio && exp.adjuntosOficio.length > 0) ||
                  (exp.adjuntosRecibo && exp.adjuntosRecibo.length > 0);

                return (
                  <div
                    key={exp.id}
                    className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all space-y-3"
                  >
                    {/* Header de Expediente */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded">
                            {exp.nroOficioLetras || 'S/N'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {exp.nroExpediente}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Reg: {exp.fechaRegistro}
                          </span>
                          {exp.ppi?.tienePPI && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-purple-600" />
                              <span>
                                PPI: {exp.ppi.jerarquia} {exp.ppi.apellidoYNombre}
                              </span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                          {exp.caratulaOrigen}
                        </h3>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>
                            <strong>Juzgado/Fiscalía:</strong> {exp.juzgadoFiscalia}
                          </span>
                          <span>•</span>
                          <span>
                            <strong>Solicitante:</strong> {exp.dependenciaSolicitante}
                          </span>
                        </div>
                      </div>

                      {/* Estado de Elevación Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                            exp.estadoEntrega === 'Entregado'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {exp.estadoEntrega === 'Entregado' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>
                            {exp.estadoEntrega === 'Entregado'
                              ? `Elevado (${exp.fechaElevacion || 's/f'})`
                              : 'En Trámite'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Requerimiento y Regla de Personas Vinculadas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-500 block">Tipo Requerimiento:</span>
                        <span className="font-bold text-blue-900">{exp.tipoRequerimiento}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-slate-500 block">
                          Personas Vinculadas en Resguardo ({exp.personasVinculadas?.length || 0}):
                        </span>
                        {exp.personasVinculadas && exp.personasVinculadas.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {exp.personasVinculadas.map((p) => (
                              <span
                                key={p.id}
                                className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800 shadow-2xs"
                              >
                                {p.apellidoYNombre} (DNI: {p.dni})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin personas específicas asociadas</span>
                        )}
                      </div>
                    </div>

                    {/* Resumen */}
                    <div className="text-xs text-slate-700">
                      <strong>Resumen de Actuaciones:</strong>
                      <div className="whitespace-pre-line bg-white p-2.5 rounded border border-slate-100 mt-1 font-mono text-[11px]">
                        {exp.resumen}
                      </div>
                    </div>

                    {/* Adjuntos y Botones de Acción */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      {/* Adjuntos */}
                      <div className="flex items-center gap-2">
                        {tieneAdjuntos ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600">Adjuntos Digitales:</span>
                            {exp.adjuntosOficio?.map((img, i) => (
                              <button
                                key={`of-${i}`}
                                onClick={() => setViewerImage(img)}
                                className="px-2 py-1 rounded bg-blue-100 text-blue-900 hover:bg-blue-200 flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Oficio {i + 1}</span>
                              </button>
                            ))}
                            {exp.adjuntosRecibo?.map((img, i) => (
                              <button
                                key={`rec-${i}`}
                                onClick={() => setViewerImage(img)}
                                className="px-2 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300 flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Recibo {i + 1}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin imágenes de oficio/recibo cargadas</span>
                        )}
                      </div>

                      {/* Botones */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedExpediente(exp);
                            setIsExpModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteExpConfirm({ isOpen: true, exp })}
                          className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Eliminar expediente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewStyle === 'tabla' ? (
            /* ESTILO 2: TABLA COMPACTA */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-3 py-3">N° Oficio / Año</th>
                      <th className="px-3 py-3">N° Expediente</th>
                      <th className="px-3 py-3">Fecha Reg.</th>
                      <th className="px-3 py-3">Juzgado / Fiscalía</th>
                      <th className="px-3 py-3">Dependencia</th>
                      <th className="px-3 py-3">Carátula Origen</th>
                      <th className="px-3 py-3">Requerimiento</th>
                      <th className="px-3 py-3 text-center">Resguardo</th>
                      <th className="px-3 py-3 text-center">Estado</th>
                      <th className="px-3 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpedientes.map((exp) => (
                      <tr key={exp.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {exp.nroOficioLetras || 'S/N'}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-900 whitespace-nowrap">
                          {exp.nroExpediente}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                          {exp.fechaRegistro}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          {exp.juzgadoFiscalia}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[140px] truncate" title={exp.dependenciaSolicitante}>
                          {exp.dependenciaSolicitante}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[200px] truncate" title={exp.caratulaOrigen}>
                          {exp.caratulaOrigen}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200 whitespace-nowrap">
                            {exp.tipoRequerimiento}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {exp.personasVinculadas?.length || 0}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              exp.estadoEntrega === 'Entregado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {exp.estadoEntrega === 'Entregado' ? 'Elevado' : 'En trámite'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedExpediente(exp);
                                setIsExpModalOpen(true);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-blue-900 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteExpConfirm({ isOpen: true, exp })}
                              className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-700 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewStyle === 'cuadricula' ? (
            /* ESTILO 3: CUADRÍCULA DE TARJETAS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredExpedientes.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        {exp.nroOficioLetras || 'S/N'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exp.estadoEntrega === 'Entregado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {exp.estadoEntrega === 'Entregado' ? 'Elevado' : 'En trámite'}
                      </span>
                    </div>

                    <div>
                      <div className="font-mono text-xs font-bold text-blue-900">
                        {exp.nroExpediente}
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-2 mt-0.5">
                        {exp.caratulaOrigen}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        <strong>Solicitante:</strong> {exp.dependenciaSolicitante}
                      </p>
                    </div>

                    <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-500">Requerimiento: </span>
                        <strong className="text-blue-900">{exp.tipoRequerimiento}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Personas resguardo: </span>
                        <strong className="text-slate-800">{exp.personasVinculadas?.length || 0} personas</strong>
                      </div>
                      {exp.personalInstruccion && (
                        <div>
                          <span className="text-slate-500">Instrucción: </span>
                          <span className="text-slate-700 font-medium">{exp.personalInstruccion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Reg: {exp.fechaRegistro}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedExpediente(exp);
                          setIsExpModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => setDeleteExpConfirm({ isOpen: true, exp })}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ESTILO 4: FORMATO TABLA PARTE DE NOVEDADES (MATRIZ POLICIAL) */
            <div className="bg-white rounded-xl border-2 border-slate-800 shadow-md overflow-hidden space-y-0">
              {/* Notificación de carga rápida */}
              {quickExpSuccess && (
                <div className="bg-emerald-50 border-b border-emerald-300 text-emerald-900 px-4 py-2 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{quickExpSuccess}</span>
                  </div>
                  <button onClick={() => setQuickExpSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Encabezado Institucional de la Matriz */}
              <div className="bg-slate-900 text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    LIBRO MATRIZ DE EXPEDIENTES JUDICIALES Y REQUERIMIENTOS
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                  <span>FORMATO OFICIAL PARTE DE NOVEDADES</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">Carga directa desde tabla habilitada</span>
                </div>
              </div>

              {/* FORMULARIO DE CARGA DIRECTA DESDE LA TABLA */}
              <form onSubmit={handleCargarExpedienteDesdeTabla} className="bg-amber-50/70 border-b-2 border-amber-300 p-3 sm:p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-700" />
                    <span>Cargar Nuevo Expediente / Oficio Directo en la Tabla</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    Carga Rápida en Matriz
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-2">
                  {/* N° Oficio */}
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">N° Oficio Letras *</label>
                    <input
                      type="text"
                      required
                      value={inlineOficio}
                      onChange={(e) => setInlineOficio(e.target.value)}
                      placeholder="OF-Nº 045/26"
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded font-mono font-bold text-slate-900 text-xs"
                    />
                  </div>

                  {/* N° Expediente */}
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">N° Expediente / Causa</label>
                    <input
                      type="text"
                      value={inlineExp}
                      onChange={(e) => setInlineExp(e.target.value)}
                      placeholder="IPP-04-00-..."
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded font-mono text-blue-900 text-xs"
                    />
                  </div>

                  {/* Fecha */}
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fecha Registro *</label>
                    <input
                      type="date"
                      required
                      value={inlineFecha}
                      onChange={(e) => setInlineFecha(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs"
                    />
                  </div>

                  {/* Dependencia Solicitante */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Dependencia Solicitante</label>
                    <select
                      value={inlineDependencia}
                      onChange={(e) => setInlineDependencia(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                    >
                      {config.dependenciasPoliciales.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Juzgado / Fiscalía */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Juzgado / Fiscalía</label>
                    <select
                      value={inlineJuzgado}
                      onChange={(e) => setInlineJuzgado(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                    >
                      {config.juzgadosFiscalias.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  {/* Carátula Origen */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Carátula de Causa / Hecho *</label>
                    <input
                      type="text"
                      required
                      value={inlineCaratula}
                      onChange={(e) => setInlineCaratula(e.target.value)}
                      placeholder="C/ NN S/ ROBO O DEFRAUDACIÓN..."
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded font-bold text-slate-900 text-xs uppercase"
                    />
                  </div>

                  {/* Requerimiento */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Requerimiento Pericial</label>
                    <select
                      value={inlineReq}
                      onChange={(e) => setInlineReq(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                    >
                      {config.tiposRequerimiento.map((tr) => (
                        <option key={tr} value={tr}>{tr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Personal Instrucción */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Personal Instrucción</label>
                    <select
                      value={inlineInstruccion}
                      onChange={(e) => setInlineInstruccion(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs truncate"
                    >
                      <option value="">-- A designar --</option>
                      {personalList.map((p) => (
                        <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`}>
                          {p.jerarquia} {p.apellidoYNombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado y Botón Cargar */}
                  <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-2">
                    <div className="w-28 shrink-0">
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Estado</label>
                      <select
                        value={inlineEstado}
                        onChange={(e) => setInlineEstado(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-slate-800 text-xs font-semibold"
                      >
                        <option value="No entregado">En trámite</option>
                        <option value="Entregado">Elevado</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow-sm text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-slate-950" />
                      <span>+ Cargar a Tabla</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider border-b-2 border-slate-900">
                    <tr>
                      <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap text-amber-300 font-bold">N° OFICIO / EXP.</th>
                      <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap">FECHA</th>
                      <th className="border border-slate-600 px-3 py-2.5">DEPENDENCIA / JUZGADO</th>
                      <th className="border border-slate-600 px-3 py-2.5">CARÁTULA / HECHO ORIGEN</th>
                      <th className="border border-slate-600 px-3 py-2.5">REQUERIMIENTO / PERITAJE</th>
                      <th className="border border-slate-600 px-3 py-2.5">PERSONAL INSTRUCCIÓN / SUPERVISOR</th>
                      <th className="border border-slate-600 px-3 py-2.5 text-center">ESTADO ELEVACIÓN</th>
                      <th className="border border-slate-600 px-3 py-2.5 text-center">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredExpedientes.map((exp, idx) => {
                      const isEditingThis = editingExpId === exp.id;

                      if (isEditingThis && editingExpData) {
                        return (
                          <tr key={exp.id} className="bg-amber-100/60 border-2 border-amber-500">
                            {/* N° Oficio / Exp */}
                            <td className="border border-slate-300 p-2 whitespace-nowrap">
                              <input
                                type="text"
                                value={editingExpData.nroOficioLetras}
                                onChange={(e) => setEditingExpData({ ...editingExpData, nroOficioLetras: e.target.value })}
                                className="w-28 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs block mb-1"
                              />
                              <input
                                type="text"
                                value={editingExpData.nroExpediente}
                                onChange={(e) => setEditingExpData({ ...editingExpData, nroExpediente: e.target.value })}
                                className="w-28 px-1.5 py-1 bg-white border border-slate-300 rounded font-mono text-[11px] text-blue-900"
                              />
                            </td>
                            {/* Fecha */}
                            <td className="border border-slate-300 p-2 whitespace-nowrap">
                              <input
                                type="date"
                                value={editingExpData.fechaRegistro}
                                onChange={(e) => setEditingExpData({ ...editingExpData, fechaRegistro: e.target.value })}
                                className="w-28 px-1 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </td>
                            {/* Dependencia / Juzgado */}
                            <td className="border border-slate-300 p-2 space-y-1">
                              <select
                                value={editingExpData.dependenciaSolicitante}
                                onChange={(e) => setEditingExpData({ ...editingExpData, dependenciaSolicitante: e.target.value })}
                                className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs"
                              >
                                {config.dependenciasPoliciales.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <select
                                value={editingExpData.juzgadoFiscalia}
                                onChange={(e) => setEditingExpData({ ...editingExpData, juzgadoFiscalia: e.target.value })}
                                className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-[11px]"
                              >
                                {config.juzgadosFiscalias.map((j) => (
                                  <option key={j} value={j}>{j}</option>
                                ))}
                              </select>
                            </td>
                            {/* Carátula */}
                            <td className="border border-slate-300 p-2">
                              <input
                                type="text"
                                value={editingExpData.caratulaOrigen}
                                onChange={(e) => setEditingExpData({ ...editingExpData, caratulaOrigen: e.target.value.toUpperCase() })}
                                className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold uppercase"
                              />
                            </td>
                            {/* Requerimiento */}
                            <td className="border border-slate-300 p-2">
                              <select
                                value={editingExpData.tipoRequerimiento}
                                onChange={(e) => setEditingExpData({ ...editingExpData, tipoRequerimiento: e.target.value })}
                                className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                              >
                                {config.tiposRequerimiento.map((tr) => (
                                  <option key={tr} value={tr}>{tr}</option>
                                ))}
                              </select>
                            </td>
                            {/* Personal Instrucción */}
                            <td className="border border-slate-300 p-2">
                              <input
                                type="text"
                                value={editingExpData.personalInstruccion || ''}
                                onChange={(e) => setEditingExpData({ ...editingExpData, personalInstruccion: e.target.value })}
                                placeholder="Personal instrucción"
                                className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </td>
                            {/* Estado Elevación */}
                            <td className="border border-slate-300 p-2 text-center">
                              <select
                                value={editingExpData.estadoEntrega}
                                onChange={(e) => setEditingExpData({ ...editingExpData, estadoEntrega: e.target.value as any })}
                                className="px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                              >
                                <option value="No entregado">En trámite</option>
                                <option value="Entregado">Elevado</option>
                              </select>
                            </td>
                            {/* Guardar / Cancelar */}
                            <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleSaveInlineExpEdit}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Guardar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingExpId(null);
                                    setEditingExpData(null);
                                  }}
                                  className="px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={exp.id}
                          className={idx % 2 === 0 ? 'bg-white hover:bg-amber-50/50' : 'bg-slate-50 hover:bg-amber-50/50'}
                        >
                          <td className="border border-slate-300 px-3 py-2 font-mono whitespace-nowrap">
                            <div className="font-bold text-slate-900">{exp.nroOficioLetras || 'S/N'}</div>
                            <div className="text-[10px] text-blue-900 font-semibold">{exp.nroExpediente}</div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono whitespace-nowrap text-slate-700">
                            {exp.fechaRegistro}
                          </td>
                          <td className="border border-slate-300 px-3 py-2">
                            <div className="font-semibold text-slate-900">{exp.dependenciaSolicitante}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{exp.juzgadoFiscalia}</div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2">
                            <div className="font-bold text-slate-900 line-clamp-2">{exp.caratulaOrigen}</div>
                            {exp.resumen && (
                              <div className="text-[10px] text-slate-600 line-clamp-1 italic mt-0.5">
                                {exp.resumen}
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2">
                            <span className="inline-block bg-blue-100 text-blue-950 border border-blue-300 px-2 py-0.5 rounded font-bold text-[10px]">
                              {exp.tipoRequerimiento}
                            </span>
                            {exp.personasVinculadas && exp.personasVinculadas.length > 0 && (
                              <div className="text-[10px] text-slate-600 mt-1">
                                <strong>Resguardo:</strong> {exp.personasVinculadas.map((p) => p.apellidoYNombre).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2">
                            <div className="font-medium text-slate-800">
                              <strong>Inst:</strong> {exp.personalInstruccion || 'A designar'}
                            </div>
                            {exp.supervisor && (
                              <div className="text-[10px] text-slate-500">
                                <strong>Sup:</strong> {exp.supervisor}
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded font-bold text-[10px] inline-flex items-center gap-1 border ${
                                exp.estadoEntrega === 'Entregado'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                                  : 'bg-amber-50 text-amber-900 border-amber-400'
                              }`}
                            >
                              {exp.estadoEntrega === 'Entregado' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>ELEVADO ({exp.fechaElevacion || 'S/F'})</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>EN TRÁMITE</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingExpId(exp.id);
                                  setEditingExpData({ ...exp });
                                }}
                                className="px-2 py-0.5 bg-slate-700 text-white hover:bg-slate-800 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                title="Editar fila en tabla directamente"
                              >
                                Editar en fila
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedExpediente(exp);
                                  setIsExpModalOpen(true);
                                }}
                                className="px-2 py-0.5 bg-slate-900 text-white hover:bg-blue-900 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeleteExpConfirm({ isOpen: true, exp })}
                                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-700 rounded cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBMÓDULO 2: SECCIÓN CASOS FALTA DE OFICIO */}
      {subTab === 'falta-oficio' && (
        <div className="space-y-4">
          {/* Banner Explicativo y Herramienta de Agrupación */}
          <div className="bg-red-950 text-white p-4 rounded-xl border border-red-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h2 className="text-sm font-bold text-red-200">
                  Submódulo de Intervenciones Preliminares sin Oficio Formal
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Seleccione múltiples casos para consolidarlos en un único expediente formal con nómina de personas autogenerada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllCasosPendientes}
                className="text-xs bg-red-900/80 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded border border-red-700 cursor-pointer"
              >
                {selectedCasosIds.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos pendientes'}
              </button>

              {selectedCasosIds.length > 0 && (
                <button
                  onClick={() => setIsAgrupacionOpen(true)}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Layers className="w-4 h-4" />
                  <span>Agrupar {selectedCasosIds.length} Casos</span>
                </button>
              )}
            </div>
          </div>

          {filteredCasosFalta.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No hay casos pendientes sin oficio</h3>
              <p className="text-xs text-slate-500 mt-1">
                Todas las actuaciones cuentan con oficio formal o fueron agrupadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCasosFalta.map((caso) => {
                const isSelected = selectedCasosIds.includes(caso.id);

                return (
                  <div
                    key={caso.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox para agrupación */}
                        {caso.estado === 'Pendiente' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCaso(caso.id)}
                            className="mt-1 w-4 h-4 text-amber-600 rounded cursor-pointer"
                          />
                        )}

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded">
                              FALTA DE OFICIO
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              Fecha: {caso.fechaRegistro}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {caso.dependenciaSolicitante}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                caso.estado === 'Pendiente'
                                  ? 'bg-red-600 text-white'
                                  : caso.estado === 'Oficio Recepcionado'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {caso.estado}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 mt-1">
                            {caso.origenIntervencion}
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 font-medium">
                            {caso.tareaRealizada}
                          </p>

                          {/* Personas vinculadas */}
                          {caso.personasVinculadas && caso.personasVinculadas.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {caso.personasVinculadas.map((p) => (
                                <span
                                  key={p.id}
                                  className="text-[11px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-800"
                                >
                                  <strong>{p.apellidoYNombre}</strong> (DNI: {p.dni})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Acciones de Caso Falta de Oficio */}
                      <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
                        {caso.estado === 'Pendiente' && (
                          <button
                            onClick={() => {
                              setCasoParaRecepcionar(caso);
                              setNroOficioRecepcionado('');
                              setNroExpRecepcionado('');
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Oficio Recepcionado</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedCasoFalta(caso);
                              setIsFaltaModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCasoConfirm({ isOpen: true, caso })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Crear / Editar Expediente */}
      {isExpModalOpen && (
        <ExpedienteModal
          expediente={selectedExpediente}
          config={config}
          personalList={personalList}
          onSave={(data) => {
            onSaveExpediente(data);
            setIsExpModalOpen(false);
          }}
          onClose={() => setIsExpModalOpen(false)}
        />
      )}

      {/* Modal Crear / Editar Falta de Oficio */}
      {isFaltaModalOpen && (
        <FaltaOficioModal
          caso={selectedCasoFalta}
          config={config}
          onSave={(data) => {
            onSaveCasoFaltaOficio(data);
            setIsFaltaModalOpen(false);
          }}
          onClose={() => setIsFaltaModalOpen(false)}
        />
      )}

      {/* Modal Agrupación de Múltiples Casos en un Oficio */}
      {isAgrupacionOpen && (
        <AgrupacionModal
          casosSeleccionados={casosFaltaOficioList.filter((c) =>
            selectedCasosIds.includes(c.id)
          )}
          config={config}
          onConfirmarAgrupacion={(nuevoExp, casosIds) => {
            onConsolidarAgrupacion(nuevoExp, casosIds);
            setSelectedCasosIds([]);
            setIsAgrupacionOpen(false);
            setSubTab('expedientes');
          }}
          onClose={() => setIsAgrupacionOpen(false)}
        />
      )}

      {/* Modal Marcar Oficio Recepcionado individualmente */}
      {casoParaRecepcionar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Marcar Oficio Recepcionado</span>
              </h3>
              <button onClick={() => setCasoParaRecepcionar(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Se creará el expediente formal para:{' '}
              <strong className="text-slate-900">{casoParaRecepcionar.origenIntervencion}</strong>
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Oficio / Letras Recibido *
              </label>
              <input
                type="text"
                required
                value={nroOficioRecepcionado}
                onChange={(e) => setNroOficioRecepcionado(e.target.value)}
                placeholder="Ej. OF-Nº 312/26-UFI1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Expediente / IPP Judicial
              </label>
              <input
                type="text"
                value={nroExpRecepcionado}
                onChange={(e) => setNroExpRecepcionado(e.target.value)}
                placeholder="Ej. IPP-04-00-019900-26"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCasoParaRecepcionar(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRecepcionOficio}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
              >
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor Modal de Adjuntos */}
      {viewerImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setViewerImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={viewerImage}
              alt="Adjunto Oficio o Recibo"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setViewerImage(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1.5 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmación Eliminar Expediente */}
      <ConfirmModal
        isOpen={deleteExpConfirm.isOpen}
        title="Eliminar Expediente Judicial"
        message={`¿Confirma eliminar definitivamente el expediente ${deleteExpConfirm.exp?.nroExpediente || ''} (${deleteExpConfirm.exp?.caratulaOrigen || ''})?`}
        confirmLabel="Eliminar Expediente"
        isDestructive={true}
        onConfirm={() => {
          if (deleteExpConfirm.exp) {
            onDeleteExpediente(deleteExpConfirm.exp.id);
          }
        }}
        onClose={() => setDeleteExpConfirm({ isOpen: false, exp: null })}
      />

      {/* Confirmación Eliminar Caso Falta de Oficio */}
      <ConfirmModal
        isOpen={deleteCasoConfirm.isOpen}
        title="Eliminar Caso Falta de Oficio"
        message={`¿Confirma eliminar este caso preliminar registrado de ${deleteCasoConfirm.caso?.dependenciaSolicitante || ''}?`}
        confirmLabel="Eliminar Caso"
        isDestructive={true}
        onConfirm={() => {
          if (deleteCasoConfirm.caso) {
            onDeleteCasoFaltaOficio(deleteCasoConfirm.caso.id);
          }
        }}
        onClose={() => setDeleteCasoConfirm({ isOpen: false, caso: null })}
      />
    </div>
  );
};
