import React, { useState, useMemo } from 'react';
import {
  IntervencionParte,
  TipoIntervencion,
  ConfiguracionSistema,
  Personal,
  GrupoPersonal,
  ParteNovedadesGuardia,
} from '../../types/police';
import {
  Activity,
  Flame,
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  Clock,
  Car,
  Shield,
  ShieldAlert,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles,
  Hash,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { IntervencionModal } from '../guardias/IntervencionModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

interface IntervencionesViewProps {
  intervencionesList: IntervencionParte[];
  partesList: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
  personalList: Personal[];
  gruposList?: GrupoPersonal[];
  onSaveIntervencion: (interv: IntervencionParte) => void;
  onDeleteIntervencion: (id: string) => void;
  onSaveConfig: (cfg: ConfiguracionSistema) => void;
}

export const IntervencionesView: React.FC<IntervencionesViewProps> = ({
  intervencionesList,
  partesList,
  config,
  personalList,
  gruposList = [],
  onSaveIntervencion,
  onDeleteIntervencion,
  onSaveConfig,
}) => {
  // Tab activa: 'criminalistica' (LC) o 'accidentologia' (Siniestros y Hechos Viales)
  const [activeTab, setActiveTab] = useState<'criminalistica' | 'accidentologia'>('criminalistica');
  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarControlContadores, setMostrarControlContadores] = useState(true);

  // Estados locales para el Control de Contadores dentro de este módulo
  const [inicioLC, setInicioLC] = useState<number>(
    config.inicioNroIntervencionCriminalistica ?? 1
  );
  const [ultimoLC, setUltimoLC] = useState<number>(
    config.ultimoNroIntervencionCriminalistica ?? 0
  );
  const [inicioAcc, setInicioAcc] = useState<number>(
    config.inicioNroIntervencionAccidentologica ?? 1
  );
  const [ultimoAcc, setUltimoAcc] = useState<number>(
    config.ultimoNroIntervencionAccidentologica ?? 0
  );

  // Modal para Crear / Editar
  const [isIntervencionModalOpen, setIsIntervencionModalOpen] = useState(false);
  const [selectedIntervencion, setSelectedIntervencion] = useState<IntervencionParte | null>(null);
  const [tipoForzadoModal, setTipoForzadoModal] = useState<TipoIntervencion>('Criminalística');

  // Modal de Detalle
  const [detalleIntervencion, setDetalleIntervencion] = useState<IntervencionParte | null>(null);

  // Modal de Eliminación
  const [intervToDelete, setIntervToDelete] = useState<IntervencionParte | null>(null);

  // Filtrar intervenciones según la pestaña seleccionada
  const intervencionesLC = useMemo(() => {
    return intervencionesList.filter(
      (int) => int.tipoIntervencion === 'Criminalística'
    );
  }, [intervencionesList]);

  const intervencionesSiniestros = useMemo(() => {
    return intervencionesList.filter(
      (int) => int.tipoIntervencion === 'Accidentológica'
    );
  }, [intervencionesList]);

  // Lista activa y filtrada
  const currentList = useMemo(() => {
    const list =
      activeTab === 'criminalistica' ? intervencionesLC : intervencionesSiniestros;
    return list.filter((int) => {
      const matchSearch =
        int.codigoIntervencion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.hecho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.inspeccionLugar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.dependencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.personalTecnico.peritoAuxiliar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(int.nroCorrelativo).includes(searchTerm);
      return matchSearch;
    });
  }, [activeTab, intervencionesLC, intervencionesSiniestros, searchTerm]);

  // Manejo de Guardado de Contadores en la Configuración
  const handleGuardarContadorLC = () => {
    const updated = {
      ...config,
      inicioNroIntervencionCriminalistica: inicioLC,
      ultimoNroIntervencionCriminalistica: ultimoLC,
    };
    onSaveConfig(updated);
    alert('Contador de Labores Criminalísticas (LC) actualizado correctamente.');
  };

  const handleReiniciarContadorLC = () => {
    if (
      confirm(
        '¿Confirma reiniciar el contador de Labores Criminalísticas (LC) al número inicial 1?'
      )
    ) {
      setInicioLC(1);
      setUltimoLC(0);
      const updated = {
        ...config,
        inicioNroIntervencionCriminalistica: 1,
        ultimoNroIntervencionCriminalistica: 0,
      };
      onSaveConfig(updated);
    }
  };

  const handleGuardarContadorAcc = () => {
    const updated = {
      ...config,
      inicioNroIntervencionAccidentologica: inicioAcc,
      ultimoNroIntervencionAccidentologica: ultimoAcc,
    };
    onSaveConfig(updated);
    alert('Contador de Siniestros y Hechos Viales actualizado correctamente.');
  };

  const handleReiniciarContadorAcc = () => {
    if (
      confirm(
        '¿Confirma reiniciar el contador de Siniestros y Hechos Viales al número inicial 1?'
      )
    ) {
      setInicioAcc(1);
      setUltimoAcc(0);
      const updated = {
        ...config,
        inicioNroIntervencionAccidentologica: 1,
        ultimoNroIntervencionAccidentologica: 0,
      };
      onSaveConfig(updated);
    }
  };

  const handleAbrirCrear = (tipo: TipoIntervencion) => {
    setSelectedIntervencion(null);
    setTipoForzadoModal(tipo);
    setIsIntervencionModalOpen(true);
  };

  const handleAbrirEditar = (int: IntervencionParte) => {
    setSelectedIntervencion(int);
    setTipoForzadoModal(int.tipoIntervencion);
    setIsIntervencionModalOpen(true);
  };

  // Cálculo del siguiente correlativo según la configuración
  const siguienteCorrelativo = useMemo(() => {
    if (tipoForzadoModal === 'Criminalística') {
      const u = config.ultimoNroIntervencionCriminalistica ?? 0;
      const i = config.inicioNroIntervencionCriminalistica ?? 1;
      return Math.max(u + 1, i);
    } else {
      const u = config.ultimoNroIntervencionAccidentologica ?? 0;
      const i = config.inicioNroIntervencionAccidentologica ?? 1;
      return Math.max(u + 1, i);
    }
  }, [config, tipoForzadoModal]);

  // Exportar Listado Oficial a PDF
  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const titulo =
      activeTab === 'criminalistica'
        ? 'REGISTRO OFICIAL DE LABORES CRIMINALÍSTICAS (LC)'
        : 'REGISTRO OFICIAL DE SINIESTROS Y HECHOS VIALES (ACCIDENTOLOGÍA)';

    const finalY = drawPoliceHeader(doc, config, titulo);

    const rows = currentList.map((int, idx) => {
      const personal = `${int.personalTecnico.peritoAuxiliar} | ${int.personalTecnico.choferFotografo}`;
      const detalles =
        int.tipoIntervencion === 'Accidentológica' && int.vehiculosSiniestro?.length
          ? int.vehiculosSiniestro
              .map((v) => `${v.identificador}: ${v.marca || ''} ${v.modelo || ''} (${v.dominio || 's/p'})`)
              .join('; ')
          : int.sintesisHecho;

      return [
        String(idx + 1),
        int.codigoIntervencion,
        int.inspeccionFecha,
        int.inspeccionHora,
        int.hecho,
        int.inspeccionLugar,
        int.dependencia,
        personal,
        detalles,
      ];
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [
        [
          'N°',
          'Código Intervención',
          'Fecha',
          'Hora',
          'Hecho / Causa',
          'Lugar de Ocurrido',
          'Dependencia',
          'Perito / Chofer',
          activeTab === 'accidentologia' ? 'Vehículos Involucrados' : 'Síntesis',
        ],
      ],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: activeTab === 'criminalistica' ? [30, 41, 59] : [15, 76, 129],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { cellWidth: 32 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 14 },
        4: { cellWidth: 35 },
        5: { cellWidth: 40 },
        6: { cellWidth: 30 },
        7: { cellWidth: 40 },
        8: { cellWidth: 60 },
      },
    });

    drawPoliceFooter(doc, config);
    doc.save(
      `Registro_${activeTab === 'criminalistica' ? 'LC_Criminalistica' : 'Siniestros_Viales'}_${
        new Date().toISOString().split('T')[0]
      }.pdf`
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Módulo de Intervenciones Policiales
                </h1>
                <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Registros Separados
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento diferenciado de Labores Criminalísticas (LC) y Siniestros Viales, con control de contadores integrado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarControlContadores(!mostrarControlContadores)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg border transition-colors cursor-pointer shadow-xs ${
              mostrarControlContadores
                ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold ring-2 ring-amber-300'
                : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Control oficial de contadores y numeradores para Labor Criminalística (LC) y Siniestros Viales"
          >
            <Hash className="w-4 h-4" />
            <span>CONTADOR</span>
          </button>

          {currentList.length > 0 && (
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar PDF</span>
            </button>
          )}

          {activeTab === 'criminalistica' ? (
            <button
              onClick={() => handleAbrirCrear('Criminalística')}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cargar Labor Criminalística (LC)</span>
            </button>
          ) : (
            <button
              onClick={() => handleAbrirCrear('Accidentológica')}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cargar Siniestro Vial</span>
            </button>
          )}
        </div>
      </div>

      {/* PANEL DE CONTROL DE CONTADORES (REQUERIMIENTO: "en este modulo permite controlar el contador de cada uno. NO en otra seccion.") */}
      {mostrarControlContadores && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  Control Exclusivo de Contadores y Numeradores Oficiales
                </h3>
                <p className="text-[11px] text-slate-300">
                  Ajuste manual, correlatividad y reseteo de contadores para Labores Criminalísticas (LC) y Siniestros Viales.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
              Gestión Activa en Módulo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Contador LC */}
            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Contador Labores Criminalísticas (LC)</span>
                </span>
                <span className="text-[11px] font-mono bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded">
                  Próxima: Nº {Math.max((config.ultimoNroIntervencionCriminalistica ?? 0) + 1, config.inicioNroIntervencionCriminalistica ?? 1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Número Inicial:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inicioLC}
                    onChange={(e) => setInicioLC(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Último Número Emitido:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ultimoLC}
                    onChange={(e) => setUltimoLC(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleReiniciarContadorLC}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 hover:underline cursor-pointer"
                  title="Reiniciar contador de LC al número 1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetear a 1</span>
                </button>
                <button
                  type="button"
                  onClick={handleGuardarContadorLC}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                >
                  Guardar Contador LC
                </button>
              </div>
            </div>

            {/* Tarjeta Contador Siniestros y Hechos Viales */}
            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Contador Siniestros y Hechos Viales</span>
                </span>
                <span className="text-[11px] font-mono bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded">
                  Próxima: Nº {Math.max((config.ultimoNroIntervencionAccidentologica ?? 0) + 1, config.inicioNroIntervencionAccidentologica ?? 1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Número Inicial:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inicioAcc}
                    onChange={(e) => setInicioAcc(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Último Número Emitido:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ultimoAcc}
                    onChange={(e) => setUltimoAcc(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleReiniciarContadorAcc}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 hover:underline cursor-pointer"
                  title="Reiniciar contador de Siniestros al número 1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetear a 1</span>
                </button>
                <button
                  type="button"
                  onClick={handleGuardarContadorAcc}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                >
                  Guardar Contador Siniestros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas de Selección: Labores Criminalísticas (LC) vs Siniestros y Hechos Viales */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('criminalistica')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'criminalistica'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-700" />
          <span>Labores Criminalísticas (LC)</span>
          <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {intervencionesLC.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('accidentologia')}
          className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
            activeTab === 'accidentologia'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4 text-blue-700" />
          <span>Siniestros y Hechos Viales</span>
          <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {intervencionesSiniestros.length}
          </span>
        </button>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar en ${
              activeTab === 'criminalistica' ? 'Labores Criminalísticas' : 'Siniestros Viales'
            } (código, hecho, lugar, perito)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Registros mostrados: <strong>{currentList.length}</strong> de{' '}
          {activeTab === 'criminalistica' ? intervencionesLC.length : intervencionesSiniestros.length}
        </div>
      </div>

      {/* Tabla Principal de Intervenciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'criminalistica' ? (
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            ) : (
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            )}
            <h3 className="font-bold text-slate-800 text-sm">
              No hay {activeTab === 'criminalistica' ? 'Labores Criminalísticas (LC)' : 'Siniestros Viales'} registradas
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Haga clic en "+ Cargar {activeTab === 'criminalistica' ? 'Labor Criminalística' : 'Siniestro Vial'}" para agregar una nueva intervención.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">N° / Código</th>
                  <th className="py-2.5 px-3">Fecha & Hora</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Hecho / Causa</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Lugar de Ocurrido</th>
                  <th className="py-2.5 px-3">Dependencia</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Personal Técnico</th>
                  {activeTab === 'accidentologia' && (
                    <th className="py-2.5 px-3">Vehículos Siniestrados</th>
                  )}
                  {activeTab === 'criminalistica' && (
                    <th className="py-2.5 px-3">Involucrados</th>
                  )}
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentList.map((int) => (
                  <tr key={int.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            activeTab === 'criminalistica'
                              ? 'bg-slate-900 text-white'
                              : 'bg-blue-900 text-white'
                          }`}
                        >
                          #{int.nroCorrelativo}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5 max-w-[200px] truncate">
                        {int.codigoIntervencion}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{int.inspeccionFecha}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {int.inspeccionHora} hs.
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block uppercase">
                        {int.hecho}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        {int.sintesisHecho}
                      </span>
                      {int.involucraPersonalPolicial && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>👮 Personal Policial: {int.personalPolicial?.jerarquia} {int.personalPolicial?.apellidoYNombre} (Plaza {int.personalPolicial?.plaza})</span>
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block">
                        {int.inspeccionLugar}
                      </span>
                      {int.direccion && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          {int.direccion}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-800 font-medium">{int.dependencia}</span>
                      <div className="text-[10px] text-slate-400">
                        Vía: {int.solicitudVia}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-[11px] font-medium text-slate-900">
                        {int.personalTecnico.peritoAuxiliar}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Chof: {int.personalTecnico.choferFotografo}
                      </div>
                    </td>

                    {activeTab === 'accidentologia' && (
                      <td className="py-2.5 px-3">
                        {int.vehiculosSiniestro && int.vehiculosSiniestro.length > 0 ? (
                          <div className="space-y-1">
                            {int.vehiculosSiniestro.map((v, i) => (
                              <div
                                key={v.id || i}
                                className="text-[10px] bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-100"
                              >
                                <strong>{v.identificador}:</strong> {v.marca || ''} {v.modelo || ''} ({v.dominio || 's/p'}) - {v.lesiones}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin vehículos cargados</span>
                        )}
                      </td>
                    )}

                    {activeTab === 'criminalistica' && (
                      <td className="py-2.5 px-3">
                        {int.involucrados && int.involucrados.length > 0 ? (
                          <div className="space-y-0.5">
                            {int.involucrados.map((inv, idx) => (
                              <div key={inv.id || idx} className="text-[10px]">
                                <span className="font-semibold text-slate-800">{inv.apellidoYNombre}</span>
                                <span className="text-slate-500"> ({inv.funcionEnHecho})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin involucrados</span>
                        )}
                      </td>
                    )}

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetalleIntervencion(int)}
                          className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleAbrirEditar(int)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Editar intervención"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIntervToDelete(int)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
        )}
      </div>

      {/* Modal de Detalle Completo de la Intervención */}
      {detalleIntervencion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  {detalleIntervencion.tipoIntervencion}
                </span>
                <h3 className="font-bold text-sm tracking-wide mt-1">
                  {detalleIntervencion.codigoIntervencion}
                </h3>
              </div>
              <button
                onClick={() => setDetalleIntervencion(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Hecho / Causa</span>
                  <span className="font-bold text-slate-900">{detalleIntervencion.hecho}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha y Hora</span>
                  <span className="font-semibold text-slate-800">
                    {detalleIntervencion.inspeccionFecha} a las {detalleIntervencion.inspeccionHora} hs.
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lugar del Hecho</span>
                  <span className="font-medium text-slate-800">{detalleIntervencion.inspeccionLugar}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Dependencia Solicitante</span>
                  <span className="font-medium text-slate-800">{detalleIntervencion.dependencia}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Personal Técnico Interviniente
                </span>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                  <div><strong>Perito Auxiliar:</strong> {detalleIntervencion.personalTecnico.peritoAuxiliar}</div>
                  <div><strong>Chofer - Fotógrafo:</strong> {detalleIntervencion.personalTecnico.choferFotografo}</div>
                  {detalleIntervencion.personalTecnico.auxiliar && (
                    <div><strong>Auxiliar:</strong> {detalleIntervencion.personalTecnico.auxiliar}</div>
                  )}
                </div>
              </div>

              {detalleIntervencion.sintesisHecho && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Síntesis del Hecho
                  </span>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-line">
                    {detalleIntervencion.sintesisHecho}
                  </div>
                </div>
              )}

              {detalleIntervencion.laborCriminalistica && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Labor Pericial / Criminalística Desarrollada
                  </span>
                  <div className="bg-indigo-50/50 p-3 rounded border border-indigo-100 text-indigo-950 whitespace-pre-line font-medium">
                    {detalleIntervencion.laborCriminalistica}
                  </div>
                </div>
              )}

              {detalleIntervencion.vehiculosSiniestro && detalleIntervencion.vehiculosSiniestro.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Vehículos del Siniestro Vial ({detalleIntervencion.vehiculosSiniestro.length})
                  </span>
                  <div className="space-y-2">
                    {detalleIntervencion.vehiculosSiniestro.map((v, i) => (
                      <div key={v.id || i} className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-slate-800">
                        <div className="font-bold text-blue-900">{v.identificador}: {v.tipo} {v.marca} {v.modelo} (Dominio: {v.dominio || 'S/D'})</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Conductor: <strong>{v.propietarioOConductor}</strong> • Circulación: {v.circulacion} • Impacto: {v.zonaContacto}
                        </div>
                        <div className="text-[11px] text-rose-800 font-semibold mt-0.5">
                          Lesiones: {v.lesiones}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalleIntervencion.involucrados && detalleIntervencion.involucrados.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Involucrados / Demorados ({detalleIntervencion.involucrados.length})
                  </span>
                  <div className="space-y-1">
                    {detalleIntervencion.involucrados.map((inv, i) => (
                      <div key={inv.id || i} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between">
                        <span><strong>{inv.apellidoYNombre}</strong> (DNI {inv.dni})</span>
                        <span className="text-slate-600 font-medium">{inv.funcionEnHecho}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalleIntervencion.involucraPersonalPolicial && detalleIntervencion.personalPolicial && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Personal Policial Involucrado en el Hecho</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Efectivo Policial:</span>
                      <span className="font-bold text-slate-900">
                        {detalleIntervencion.personalPolicial.jerarquia} {detalleIntervencion.personalPolicial.apellidoYNombre}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Plaza Policial N°:</span>
                      <span className="font-mono font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {detalleIntervencion.personalPolicial.plaza}
                      </span>
                      {detalleIntervencion.personalPolicial.dni && (
                        <span className="text-slate-600 ml-2 font-mono">DNI: {detalleIntervencion.personalPolicial.dni}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rol / Condición en el Hecho:</span>
                      <span className="font-bold text-amber-800">
                        {detalleIntervencion.personalPolicial.rol || 'Involucrado'}
                      </span>
                    </div>
                    {detalleIntervencion.personalPolicial.dependenciaRevista && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dependencia de Revista:</span>
                        <span className="font-medium text-slate-800">
                          {detalleIntervencion.personalPolicial.dependenciaRevista}
                        </span>
                      </div>
                    )}
                  </div>
                  {detalleIntervencion.personalPolicial.observaciones && (
                    <div className="text-[11px] text-slate-600 italic">
                      Obs: {detalleIntervencion.personalPolicial.observaciones}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetalleIntervencion(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga / Edición de Intervención */}
      {isIntervencionModalOpen && (
        <IntervencionModal
          intervencion={selectedIntervencion}
          tipoForzado={tipoForzadoModal}
          siguienteCorrelativo={siguienteCorrelativo}
          añoActual={new Date().getFullYear()}
          parteId={partesList[0]?.id || 'parte-general'}
          config={config}
          funcionesGuardia={partesList[0]?.funcionesPersonal || []}
          personalList={personalList}
          gruposList={gruposList}
          partesList={partesList}
          onSave={(interv) => {
            onSaveIntervencion(interv);
            setIsIntervencionModalOpen(false);
          }}
          onSaveConfig={onSaveConfig}
          onClose={() => setIsIntervencionModalOpen(false)}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!intervToDelete}
        title="Eliminar Registro de Intervención"
        message={`¿Confirma eliminar la intervención ${intervToDelete?.codigoIntervencion || ''} correspondiente al hecho "${intervToDelete?.hecho || ''}"?`}
        confirmLabel="Eliminar Intervención"
        isDestructive={true}
        onConfirm={() => {
          if (intervToDelete) {
            onDeleteIntervencion(intervToDelete.id);
            setIntervToDelete(null);
          }
        }}
        onClose={() => setIntervToDelete(null)}
      />
    </div>
  );
};
