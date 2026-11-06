import React, { useState, useMemo } from 'react';
import { Personal, ConfiguracionSistema, DelegacionPolicial } from '../../types/police';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Table as TableIcon,
  Download,
  Filter,
  Shield,
  AlertTriangle,
  FileText,
  Edit2,
  Trash2,
  Car,
  Phone,
  Mail,
  UserCheck,
  Cake,
  Gift,
  PartyPopper,
  ArrowRightLeft,
  Building2,
  FilePenLine,
} from 'lucide-react';
import { PersonnelModal } from './PersonnelModal';
import { UpcomingBirthdaysModal } from './UpcomingBirthdaysModal';
import { TrasladarPersonalModal } from './TrasladarPersonalModal';
import { getTodayBirthdays, getUpcomingBirthdays } from '../../services/birthdayService';
import { generarPdfLegajoPersonal, generarPdfFormularioRegistroMano } from '../../services/pdfService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { ConfirmModal } from '../common/ConfirmModal';

interface PersonnelViewProps {
  personalList: Personal[];
  config: ConfiguracionSistema;
  delegacionesList?: DelegacionPolicial[];
  onSavePersonal: (p: Personal) => void;
  onDeletePersonal: (id: string) => void;
  onTransferirPersonal?: (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string
  ) => Promise<void> | void;
}

export type ViewMode = 'cards' | 'compact' | 'table';

export const PersonnelView: React.FC<PersonnelViewProps> = ({
  personalList,
  config,
  delegacionesList = [],
  onSavePersonal,
  onDeletePersonal,
  onTransferirPersonal,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroJerarquia, setFiltroJerarquia] = useState<string>('todas');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<Personal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; personal: Personal | null }>({
    isOpen: false,
    personal: null,
  });

  // Modal de Traslado a otra Delegación
  const [trasladarModal, setTrasladarModal] = useState<{
    isOpen: boolean;
    personal: Personal | null;
  }>({ isOpen: false, personal: null });

  // Modal de Aviso de Próximos Cumpleaños
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

  // Alertas de Cumpleaños
  const todayBirthdays = useMemo(() => getTodayBirthdays(personalList), [personalList]);
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(personalList, 7), [personalList]);

  // Filtrado reactivo en tiempo real
  const filteredList = useMemo(() => {
    return personalList.filter((p) => {
      const matchSearch =
        p.apellidoYNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dni.includes(searchTerm) ||
        p.jerarquia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.plaza.toLowerCase().includes(searchTerm.toLowerCase());

      const matchJerarquia =
        filtroJerarquia === 'todas' || p.jerarquia === filtroJerarquia;

      const matchGrupo = filtroGrupo === 'todos' || p.seccionGrupo === filtroGrupo;

      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;

      return matchSearch && matchJerarquia && matchGrupo && matchEstado;
    });
  }, [personalList, searchTerm, filtroJerarquia, filtroGrupo, filtroEstado]);

  // Exportar Nómina Completa a PDF
  const handleExportNominaPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const currentY = drawPoliceHeader(
      doc,
      config,
      'NÓMINA GENERAL DE PERSONAL POLICIAL Y ESTADO DE REVISTA',
      10
    );

    const rows = filteredList.map((p, i) => [
      i + 1,
      p.jerarquia,
      p.apellidoYNombre,
      p.dni,
      p.plaza,
      p.seccionGrupo,
      p.estado,
      `${p.armamento?.marca || ''} ${p.armamento?.serieNro || ''}${p.armamento?.secuestradoORetenido ? ' (RETENIDA)' : ''}`,
      `${p.chaleco?.serieNro || ''} (T:${p.chaleco?.talla || ''})`,
      p.licenciaNro ? `${p.licenciaNro} (${p.licenciaCategoria})` : '---',
      p.telefono,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        'N°',
        'Jerarquía',
        'Apellido y Nombre',
        'DNI',
        'Plaza',
        'Grupo / Sección',
        'Estado',
        'Armamento',
        'Chaleco',
        'Licencia',
        'Teléfono'
      ]],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [17, 38, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.8, lineColor: [200, 210, 225], lineWidth: 0.1 },
      margin: { left: 10, right: 10 },
    });

    drawPoliceFooter(doc, config);
    doc.save(`Nomina_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5">
      {/* Barra de Título y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Personal y Legajos Policiales
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredList.length} registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de efectivos, asignación de guardia, armamento provisto, chalecos y situación de revista.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternancia de vistas */}
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
          </div>

          <button
            onClick={() => setIsBirthdayModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Aviso de Próximos Cumpleaños"
          >
            <Cake className="w-3.5 h-3.5" />
            <span>Próximos Cumpleaños</span>
            {todayBirthdays.length > 0 ? (
              <span className="bg-rose-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                {todayBirthdays.length} ¡Hoy!
              </span>
            ) : (
              <span className="bg-amber-700/60 text-amber-100 text-[10px] px-1.5 py-0.2 rounded-full">
                {upcomingBirthdays.length}
              </span>
            )}
          </button>

          <button
            onClick={() => generarPdfFormularioRegistroMano(config)}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Descargar Formulario Oficial en blanco con firma a la izquierda para ser completado a mano"
          >
            <FilePenLine className="w-3.5 h-3.5 text-emerald-200" />
            <span>Formulario a Mano</span>
          </button>

          <button
            onClick={handleExportNominaPdf}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Nómina PDF</span>
          </button>

          <button
            onClick={() => {
              setSelectedPersonal(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Efectivo</span>
          </button>
        </div>
      </div>

      {/* Banner de Aviso de Cumpleaños */}
      {(todayBirthdays.length > 0 || (upcomingBirthdays.length > 0 && upcomingBirthdays[0].daysRemaining <= 3)) && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <PartyPopper className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-wide uppercase text-amber-100">
                {todayBirthdays.length > 0 ? '¡Alerta de Cumpleaños Hoy en la Dotación!' : 'Aviso de Cumpleaños Próximo'}
              </div>
              <div className="text-xs font-semibold text-white">
                {todayBirthdays.length > 0 ? (
                  <span>
                    Hoy celebra su cumpleaños:{' '}
                    <strong>
                      {todayBirthdays.map((b) => `${b.personal.jerarquia} ${b.personal.apellidoYNombre} (${b.turningAge} años)`).join(', ')}
                    </strong>
                  </span>
                ) : (
                  <span>
                    Próximo cumpleaños: {upcomingBirthdays[0].personal.jerarquia} {upcomingBirthdays[0].personal.apellidoYNombre} ({upcomingBirthdays[0].daysRemaining === 1 ? 'mañana' : `en ${upcomingBirthdays[0].daysRemaining} días`})
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsBirthdayModalOpen(true)}
            className="px-3 py-1.5 bg-white text-slate-900 hover:bg-amber-50 text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            Abrir Aviso y Cronograma
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda Reactiva */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, DNI, Jerarquía o Plaza..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filtro Jerarquía */}
        <div>
          <select
            value={filtroJerarquia}
            onChange={(e) => setFiltroJerarquia(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="todas">Todas las Jerarquías</option>
            {config.jerarquias.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Grupo de Guardia */}
        <div>
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="todos">Todos los Grupos / Secciones</option>
            {config.gruposGuardia.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Estado */}
        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Activo">Activo</option>
            <option value="Licencia Médica">Licencia Médica</option>
            <option value="Licencia Anual">Licencia Anual</option>
            <option value="Comisión">Comisión</option>
            <option value="Pasiva">Pasiva</option>
            <option value="Retirado">Retirado</option>
          </select>
        </div>
      </div>

      {/* Renderizado de vistas */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No se encontraron efectivos</h3>
          <p className="text-xs text-slate-500 mt-1">
            Modifique los términos de búsqueda o filtros seleccionados.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* VISTA 1: Cuadrícula de Tarjetas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((p) => {
            const armaRetenida = p.armamento?.secuestradoORetenido;
            const chalecoRetenido = p.chaleco?.secuestradoORetenido;

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Header Tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                        {p.jerarquia}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">
                        {p.apellidoYNombre}
                      </h3>
                      <div className="text-[11px] text-slate-500 font-mono">
                        DNI: {p.dni} • Plaza: {p.plaza || 's/p'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.estado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>

                  {/* Grupo y Ubicación */}
                  <div className="mt-3 py-2 border-y border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Grupo / Oficina:</span>
                      <span className="font-semibold text-slate-800">{p.seccionGrupo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Licencia:</span>
                      <span className="text-slate-700">{p.licenciaCategoria || 'Sin registro'}</span>
                    </div>
                  </div>

                  {/* Alertas de Armamento y Chaleco */}
                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        armaRetenida
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {armaRetenida && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                        <span className="truncate">
                          <strong>Arma:</strong> {p.armamento?.marca} {p.armamento?.modelo} ({p.armamento?.serieNro})
                        </span>
                      </div>
                      {armaRetenida && (
                        <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded shrink-0">
                          RETENIDA
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        chalecoRetenido
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {chalecoRetenido && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                        <span className="truncate">
                          <strong>Chaleco:</strong> {p.chaleco?.serieNro || 's/n'} (Talla: {p.chaleco?.talla})
                        </span>
                      </div>
                      {chalecoRetenido && (
                        <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded shrink-0">
                          RETENIDO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de Tarjeta */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => generarPdfLegajoPersonal(p, config)}
                    title="Exportar Legajo Policial Individual en PDF"
                    className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Legajo PDF</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTrasladarModal({ isOpen: true, personal: p })}
                      className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                      title="Trasladar a otra Delegación"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPersonal(p);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                      title="Editar efectivo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, personal: p })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Eliminar registro"
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
          {filteredList.map((p) => (
            <div
              key={p.id}
              className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                  {p.apellidoYNombre.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-900">{p.jerarquia}</span>
                    <span className="font-bold text-slate-900">{p.apellidoYNombre}</span>
                    <span className="text-slate-400 font-mono">DNI {p.dni}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {p.seccionGrupo} • Plaza {p.plaza || 's/p'} • Cel: {p.telefono}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.estado === 'Activo'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.estado}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => generarPdfLegajoPersonal(p, config)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded"
                    title="Legajo PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTrasladarModal({ isOpen: true, personal: p })}
                    className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                    title="Trasladar a otra Delegación"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPersonal(p);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, personal: p })}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
        /* VISTA 3: Tabla Detallada */
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-3">Jerarquía</th>
                <th className="py-3 px-3">Apellido y Nombre</th>
                <th className="py-3 px-3">DNI / Plaza</th>
                <th className="py-3 px-3">Grupo / Sección</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Armamento Asignado</th>
                <th className="py-3 px-3">Chaleco</th>
                <th className="py-3 px-3">Licencia Conducir</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-950">{p.jerarquia}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{p.apellidoYNombre}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {p.dni} <span className="text-slate-400 text-[10px]">({p.plaza})</span>
                  </td>
                  <td className="py-2.5 px-3">{p.seccionGrupo}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.estado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {p.armamento ? (
                      <span className={p.armamento.secuestradoORetenido ? 'text-red-700 font-bold' : ''}>
                        {p.armamento.marca} {p.armamento.serieNro}
                        {p.armamento.secuestradoORetenido && ' (RETENIDA)'}
                      </span>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {p.chaleco ? `${p.chaleco.serieNro} (T:${p.chaleco.talla})` : '---'}
                  </td>
                  <td className="py-2.5 px-3">
                    {p.licenciaNro ? `${p.licenciaNro} (${p.licenciaCategoria})` : 'Sin licencia'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => generarPdfLegajoPersonal(p, config)}
                        className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                        title="Legajo PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTrasladarModal({ isOpen: true, personal: p })}
                        className="p-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                        title="Trasladar a otra Delegación"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPersonal(p);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, personal: p })}
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

      {/* Modal de Personal */}
      {isModalOpen && (
        <PersonnelModal
          personal={selectedPersonal}
          config={config}
          onSave={(data) => {
            onSavePersonal(data);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal de Traslado a otra Delegación */}
      {trasladarModal.isOpen && trasladarModal.personal && (
        <TrasladarPersonalModal
          personal={trasladarModal.personal}
          delegacionesList={delegacionesList}
          onConfirmTransfer={async (pers, nuevaDelegacionId, motivo, disposicion, fecha) => {
            if (onTransferirPersonal) {
              await onTransferirPersonal(pers, nuevaDelegacionId, motivo, disposicion, fecha);
            }
            setTrasladarModal({ isOpen: false, personal: null });
          }}
          onClose={() => setTrasladarModal({ isOpen: false, personal: null })}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Efectivo Policial"
        message={`¿Confirma eliminar definitivamente a ${deleteConfirm.personal?.jerarquia || ''} ${deleteConfirm.personal?.apellidoYNombre || ''} (DNI ${deleteConfirm.personal?.dni || ''}) del sistema? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar Efectivo"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirm.personal) {
            onDeletePersonal(deleteConfirm.personal.id);
          }
        }}
        onClose={() => setDeleteConfirm({ isOpen: false, personal: null })}
      />

      {/* Ventana de Aviso de Próximos Cumpleaños */}
      <UpcomingBirthdaysModal
        isOpen={isBirthdayModalOpen}
        onClose={() => setIsBirthdayModalOpen(false)}
        personalList={personalList}
        config={config}
      />
    </div>
  );
};
