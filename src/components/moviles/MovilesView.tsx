import React, { useState, useMemo } from 'react';
import {
  MovilPolicial,
  ReparacionMecanica,
  ConfiguracionSistema,
} from '../../types/police';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Table as TableIcon,
  Layers,
  Car,
  Wrench,
  AlertTriangle,
  Download,
  ShieldCheck,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { MovilModal } from './MovilModal';
import { ReparacionModal } from './ReparacionModal';
import { FichaTecnicaPdfModal } from './FichaTecnicaPdfModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface MovilesViewProps {
  movilesList: MovilPolicial[];
  reparacionesList: ReparacionMecanica[];
  config: ConfiguracionSistema;
  onSaveMovil: (m: MovilPolicial) => void;
  onDeleteMovil: (id: string) => void;
  onSaveReparacion: (r: ReparacionMecanica) => void;
  onDeleteReparacion: (id: string) => void;
}

export type MovilViewMode = 'cards' | 'compact' | 'table' | 'grouped';

export const MovilesView: React.FC<MovilesViewProps> = ({
  movilesList,
  reparacionesList,
  config,
  onSaveMovil,
  onDeleteMovil,
  onSaveReparacion,
  onDeleteReparacion,
}) => {
  const [viewMode, setViewMode] = useState<MovilViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Modales
  const [isMovilModalOpen, setIsMovilModalOpen] = useState(false);
  const [selectedMovil, setSelectedMovil] = useState<MovilPolicial | null>(null);
  const [movilDeleteConfirm, setMovilDeleteConfirm] = useState<{
    isOpen: boolean;
    movil: MovilPolicial | null;
  }>({ isOpen: false, movil: null });

  const [isReparacionModalOpen, setIsReparacionModalOpen] = useState(false);
  const [movilParaReparar, setMovilParaReparar] = useState<MovilPolicial | null>(null);

  const [isFichaPdfOpen, setIsFichaPdfOpen] = useState(false);
  const [movilParaFicha, setMovilParaFicha] = useState<MovilPolicial | null>(null);

  const [movilHistorialId, setMovilHistorialId] = useState<string | null>(null);

  // Filtrado reactivo
  const filteredList = useMemo(() => {
    return movilesList.filter((m) => {
      const matchSearch =
        m.nroMovilInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.dominioPatente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.dependenciaAsignada.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'todos' || m.estadoOperativo === filtroEstado;

      return matchSearch && matchTipo && matchEstado;
    });
  }, [movilesList, searchTerm, filtroTipo, filtroEstado]);

  // Semáforo de documentación: calcula si está vigente, por vencer (<30 días) o vencido
  const getDocumentStatus = (fechaStr?: string) => {
    if (!fechaStr) return { label: 'Sin datos', color: 'bg-slate-100 text-slate-600' };
    const hoy = new Date();
    const fecha = new Date(fechaStr);
    const diffDias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

    if (diffDias < 0) {
      return { label: `VENCIDO (${Math.abs(diffDias)}d)`, color: 'bg-red-100 text-red-800 border-red-300 font-bold' };
    }
    if (diffDias <= 30) {
      return { label: `Por Vencer (${diffDias}d)`, color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    }
    return { label: 'Vigente', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium' };
  };

  // Alerta de mantenimiento preventivo (Service)
  const getServiceStatus = (movil: MovilPolicial) => {
    const kmRestantes = movil.proximoServiceKm - movil.kilometrajeActual;
    if (kmRestantes <= 0) {
      return { label: `¡EXCEDIDO por ${Math.abs(kmRestantes)} Km!`, alert: true, color: 'text-red-700 bg-red-50 border-red-200' };
    }
    if (kmRestantes <= 1500) {
      return { label: `Próximo service en ${kmRestantes} Km`, alert: true, color: 'text-amber-800 bg-amber-50 border-amber-200' };
    }
    return { label: `En regla (Resta: ${kmRestantes} Km)`, alert: false, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
  };

  return (
    <div className="space-y-5">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Parque Automotor & Móviles Policiales
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {movilesList.length} móviles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de flota, odómetro, services preventivos, RTO, pólizas e historial de reparaciones mecánicas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternancia de vistas (4 modos) */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-600">
            <button
              onClick={() => setViewMode('cards')}
              title="Vista de Tarjetas"
              className={`p-1.5 rounded-md ${
                viewMode === 'cards' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              title="Vista Compacta"
              className={`p-1.5 rounded-md ${
                viewMode === 'compact' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Tabla Detallada"
              className={`p-1.5 rounded-md ${
                viewMode === 'table' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              title="Agrupado por Estado Operativo"
              className={`p-1.5 rounded-md ${
                viewMode === 'grouped' ? 'bg-white text-blue-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedMovil(null);
              setIsMovilModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Móvil</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° Móvil, Patente, Marca..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="todos">Todos los Tipos de Vehículo</option>
            <option value="Patrullero">Patrullero</option>
            <option value="Camioneta">Camioneta</option>
            <option value="Utilitario">Utilitario</option>
            <option value="Motovehículo">Motovehículo</option>
          </select>
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="todos">Todos los Estados Operativos</option>
            <option value="En Servicio">En Servicio</option>
            <option value="En Taller Mecánico">En Taller Mecánico</option>
            <option value="Fuera de Servicio">Fuera de Servicio</option>
            <option value="Baja definitiva">Baja definitiva</option>
          </select>
        </div>
      </div>

      {/* VISTAS DE MÓVILES */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No se encontraron móviles policiales</h3>
          <p className="text-xs text-slate-500 mt-1">Modifique los términos de búsqueda o filtros.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* VISTA 1: Tarjetas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((m) => {
            const service = getServiceStatus(m);
            const rtoStatus = getDocumentStatus(m.vencimientoRTO);
            const segStatus = getDocumentStatus(m.vencimientoSeguro);
            const reps = reparacionesList.filter((r) => r.movilId === m.id);

            return (
              <div
                key={m.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Header Móvil */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-blue-950 font-mono">
                          {m.nroMovilInterno}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {m.dominioPatente}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {m.marca} {m.modelo} • <span className="text-slate-500">{m.tipo}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{m.dependenciaAsignada}</div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.estadoOperativo === 'En Servicio'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.estadoOperativo === 'En Taller Mecánico'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {m.estadoOperativo}
                    </span>
                  </div>

                  {/* Kilometraje y Condición */}
                  <div className="mt-3 py-2 border-y border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Odómetro Actual:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {m.kilometrajeActual.toLocaleString()} Km
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Condición General:</span>
                      <span className="font-semibold text-slate-800">{m.condicionGeneral}</span>
                    </div>
                  </div>

                  {/* Alerta Service Preventivo */}
                  <div className="mt-2.5">
                    <div className={`p-2 rounded-lg border text-[11px] font-medium flex items-center justify-between ${service.color}`}>
                      <span className="truncate">{service.label}</span>
                      {service.alert && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                    </div>
                  </div>

                  {/* Semáforo RTO y Seguro */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 block font-semibold">RTO:</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${rtoStatus.color}`}>
                        {rtoStatus.label}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 block font-semibold">Seguro:</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${segStatus.color}`}>
                        {segStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Historial de Reparaciones resumido */}
                  <div className="mt-3 text-xs flex items-center justify-between text-slate-600">
                    <span>
                      <strong>{reps.length}</strong> reparaciones registradas
                    </span>
                    <button
                      onClick={() => setMovilHistorialId(movilHistorialId === m.id ? null : m.id)}
                      className="text-blue-700 hover:text-blue-900 text-[11px] font-semibold cursor-pointer"
                    >
                      {movilHistorialId === m.id ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  </div>

                  {movilHistorialId === m.id && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
                      {reps.length === 0 ? (
                        <div className="text-slate-400 italic text-center py-2">Sin reparaciones mecánicas cargadas</div>
                      ) : (
                        reps.map((r) => (
                          <div key={r.id} className="border-b border-slate-200 pb-1 last:border-0">
                            <div className="flex justify-between font-semibold">
                              <span>{r.fecha} - {r.tipoIntervencion}</span>
                              <span className="font-mono text-slate-800">${r.costoPresupuesto.toLocaleString('es-AR')}</span>
                            </div>
                            <div className="text-slate-600 truncate">{r.descripcion}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones de Tarjeta Móvil */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {/* Botón Ficha Técnica PDF con Modal de Filtro */}
                    <button
                      onClick={() => {
                        setMovilParaFicha(m);
                        setIsFichaPdfOpen(true);
                      }}
                      title="Configurar y Generar Ficha Técnica PDF Oficial"
                      className="text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ficha PDF</span>
                    </button>

                    <button
                      onClick={() => {
                        setMovilParaReparar(m);
                        setIsReparacionModalOpen(true);
                      }}
                      title="Registrar intervención mecánica"
                      className="text-orange-800 hover:text-orange-950 font-semibold flex items-center gap-1 cursor-pointer bg-orange-50 hover:bg-orange-100 px-2 py-1.5 rounded-lg border border-orange-200"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>+ Taller</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedMovil(m);
                        setIsMovilModalOpen(true);
                      }}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMovilDeleteConfirm({ isOpen: true, movil: m })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      title="Eliminar móvil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'compact' ? (
        /* VISTA 2: Lista Compacta */
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {filteredList.map((m) => (
            <div
              key={m.id}
              className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900 text-white font-mono font-bold flex items-center justify-center shrink-0">
                  {m.nroMovilInterno}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {m.marca} {m.modelo}
                    </span>
                    <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {m.dominioPatente}
                    </span>
                    <span className="text-slate-400">• {m.tipo}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {m.dependenciaAsignada} • Odómetro: {m.kilometrajeActual.toLocaleString()} Km
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.estadoOperativo === 'En Servicio'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {m.estadoOperativo}
                </span>

                <button
                  onClick={() => {
                    setMovilParaFicha(m);
                    setIsFichaPdfOpen(true);
                  }}
                  className="px-2.5 py-1 bg-blue-50 text-blue-900 hover:bg-blue-100 rounded font-bold border border-blue-200 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Ficha PDF</span>
                </button>

                <button
                  onClick={() => {
                    setMovilParaReparar(m);
                    setIsReparacionModalOpen(true);
                  }}
                  className="px-2 py-1 bg-orange-50 text-orange-900 hover:bg-orange-100 rounded font-semibold border border-orange-200 flex items-center gap-1 cursor-pointer"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Taller</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA 3: Tabla Detallada */
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-3">Móvil</th>
                <th className="py-3 px-3">Patente</th>
                <th className="py-3 px-3">Tipo / Modelo</th>
                <th className="py-3 px-3">Dependencia</th>
                <th className="py-3 px-3">Odómetro</th>
                <th className="py-3 px-3">Estado Operativo</th>
                <th className="py-3 px-3">Próximo Service</th>
                <th className="py-3 px-3">Venc. RTO / Seguro</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.map((m) => {
                const s = getServiceStatus(m);
                const rto = getDocumentStatus(m.vencimientoRTO);
                const seg = getDocumentStatus(m.vencimientoSeguro);

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-950">{m.nroMovilInterno}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{m.dominioPatente}</td>
                    <td className="py-2.5 px-3">
                      {m.marca} {m.modelo} <span className="text-slate-400">({m.tipo})</span>
                    </td>
                    <td className="py-2.5 px-3">{m.dependenciaAsignada}</td>
                    <td className="py-2.5 px-3 font-mono">{m.kilometrajeActual.toLocaleString()} Km</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.estadoOperativo === 'En Servicio'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.estadoOperativo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>
                        {m.proximoServiceKm.toLocaleString()} Km
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className={`px-1 rounded ${rto.color}`}>RTO: {rto.label}</span>
                        <span className={`px-1 rounded ${seg.color}`}>Seguro: {seg.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setMovilParaFicha(m);
                            setIsFichaPdfOpen(true);
                          }}
                          className="p-1 text-blue-800 hover:bg-blue-50 rounded"
                          title="Ficha Técnica PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setMovilParaReparar(m);
                            setIsReparacionModalOpen(true);
                          }}
                          className="p-1 text-orange-700 hover:bg-orange-50 rounded"
                          title="Registrar Reparación"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMovil(m);
                            setIsMovilModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISTA 4: Agrupado por Estado Operativo */
        <div className="space-y-6">
          {(['En Servicio', 'En Taller Mecánico', 'Fuera de Servicio', 'Baja definitiva'] as const).map((estado) => {
            const grupo = filteredList.filter((m) => m.estadoOperativo === estado);
            if (grupo.length === 0) return null;

            return (
              <div key={estado} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        estado === 'En Servicio'
                          ? 'bg-emerald-500'
                          : estado === 'En Taller Mecánico'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <h3 className="font-bold text-sm text-slate-900">{estado}</h3>
                    <span className="text-xs text-slate-500 font-mono">({grupo.length} unidades)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grupo.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900">{m.nroMovilInterno}</span>
                          <span className="font-bold text-slate-800">{m.marca} {m.modelo}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {m.dominioPatente} • {m.kilometrajeActual.toLocaleString()} Km
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setMovilParaFicha(m);
                          setIsFichaPdfOpen(true);
                        }}
                        className="p-1.5 bg-blue-900 text-white rounded hover:bg-blue-950"
                        title="Ficha Técnica PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Alta / Edición de Móvil */}
      {isMovilModalOpen && (
        <MovilModal
          movil={selectedMovil}
          config={config}
          onSave={(data) => {
            onSaveMovil(data);
            setIsMovilModalOpen(false);
          }}
          onClose={() => setIsMovilModalOpen(false)}
        />
      )}

      {/* Modal Registrar Reparación Mecánica */}
      {isReparacionModalOpen && movilParaReparar && (
        <ReparacionModal
          movil={movilParaReparar}
          onSave={(data) => {
            onSaveReparacion(data);
            setIsReparacionModalOpen(false);
          }}
          onClose={() => setIsReparacionModalOpen(false)}
        />
      )}

      {/* Modal Ficha Técnica Vehicular PDF con Filtro de Fechas de Reparación */}
      {isFichaPdfOpen && movilParaFicha && (
        <FichaTecnicaPdfModal
          movil={movilParaFicha}
          reparaciones={reparacionesList}
          config={config}
          onClose={() => setIsFichaPdfOpen(false)}
        />
      )}

      {/* Modal Confirmación Eliminar Móvil */}
      <ConfirmModal
        isOpen={movilDeleteConfirm.isOpen}
        title="Eliminar Móvil Policial"
        message={`¿Confirma eliminar definitivamente el móvil ${movilDeleteConfirm.movil?.nroMovilInterno || ''} (${movilDeleteConfirm.movil?.marca || ''} ${movilDeleteConfirm.movil?.modelo || ''} - Patente: ${movilDeleteConfirm.movil?.dominioPatente || ''}) del parque automotor?`}
        confirmLabel="Eliminar Móvil"
        isDestructive={true}
        onConfirm={() => {
          if (movilDeleteConfirm.movil) {
            onDeleteMovil(movilDeleteConfirm.movil.id);
          }
        }}
        onClose={() => setMovilDeleteConfirm({ isOpen: false, movil: null })}
      />
    </div>
  );
};
