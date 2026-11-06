import React, { useState, useMemo } from 'react';
import { GrupoPersonal, Personal, ConfiguracionSistema } from '../../types/police';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  UserPlus,
  Layers,
  Sparkles,
  Download,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { GrupoModal } from './GrupoModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { ConfirmModal } from '../common/ConfirmModal';

interface GruposViewProps {
  gruposList: GrupoPersonal[];
  personalList: Personal[];
  config: ConfiguracionSistema;
  onSaveGrupo: (grupo: GrupoPersonal) => void;
  onDeleteGrupo: (id: string) => void;
  onNavigateToGuardias?: () => void;
}

export const GruposView: React.FC<GruposViewProps> = ({
  gruposList,
  personalList,
  config,
  onSaveGrupo,
  onDeleteGrupo,
  onNavigateToGuardias,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoPersonal | null>(null);
  const [deleteGrupoConfirm, setDeleteGrupoConfirm] = useState<{
    isOpen: boolean;
    grupo: GrupoPersonal | null;
  }>({ isOpen: false, grupo: null });

  // Filtrado reactivo en tiempo real
  const filteredGrupos = useMemo(() => {
    return gruposList.filter((g) => {
      const term = searchTerm.toLowerCase();
      const matchName = g.nombre.toLowerCase().includes(term);
      const matchDesc = (g.descripcion || '').toLowerCase().includes(term);
      const matchJefe = (g.jefeGrupo || '').toLowerCase().includes(term);

      // Buscar también si contiene a un personal específico por nombre o dni
      const matchPersonal = g.personalIds.some((pId) => {
        const p = personalList.find((item) => item.id === pId);
        if (!p) return false;
        return (
          p.apellidoYNombre.toLowerCase().includes(term) ||
          p.dni.includes(term) ||
          p.jerarquia.toLowerCase().includes(term)
        );
      });

      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && g.activo) ||
        (filtroEstado === 'inactivos' && !g.activo);

      return (matchName || matchDesc || matchJefe || matchPersonal) && matchEstado;
    });
  }, [gruposList, searchTerm, filtroEstado, personalList]);

  // Exportar PDF de nómina de grupos
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = drawPoliceHeader(
      doc,
      config,
      'NÓMINA DE GRUPOS Y SECCIONES DE GUARDIA',
      12
    );

    filteredGrupos.forEach((g) => {
      const members = g.personalIds
        .map((id) => personalList.find((p) => p.id === id))
        .filter(Boolean) as Personal[];

      const rows = members.map((m, idx) => [
        (idx + 1).toString(),
        m.jerarquia,
        m.apellidoYNombre,
        m.dni,
        m.plaza || 'S/D',
        m.telefono || 'S/D',
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [
          [
            {
              content: `${g.nombre.toUpperCase()} - Jefe: ${g.jefeGrupo || 'Sin designar'} (${members.length} Efectivos)`,
              colSpan: 6,
              styles: { halign: 'left', fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
            },
          ],
          ['#', 'Jerarquía', 'Apellido y Nombres', 'D.N.I.', 'Plaza', 'Teléfono'],
        ],
        body: rows.length > 0 ? rows : [['-', '-', 'Sin personal asignado en este grupo', '-', '-', '-']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });

    drawPoliceFooter(doc, config);
    doc.save(`Grupos_Guardias_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Grupos y Secciones de Guardia
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {gruposList.length} Grupos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Organización de secciones de guardias, designación de efectivos y funciones automáticas para el Parte de Novedades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Descargar PDF de nómina de grupos"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exportar Nómina</span>
          </button>

          <button
            onClick={() => {
              setSelectedGrupo(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Grupo / Guardia</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de grupo, especialidad, jefe o efectivo asignado..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filtroEstado === 'todos'
                    ? 'bg-white text-blue-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({gruposList.length})
              </button>
              <button
                onClick={() => setFiltroEstado('activos')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filtroEstado === 'activos'
                    ? 'bg-white text-blue-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activos ({gruposList.filter((g) => g.activo).length})
              </button>
              <button
                onClick={() => setFiltroEstado('inactivos')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filtroEstado === 'inactivos'
                    ? 'bg-white text-blue-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactivos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla de Grupos */}
      {filteredGrupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-900" />
          <p className="text-sm font-medium">No se encontraron grupos con los criterios de búsqueda.</p>
          <button
            onClick={() => {
              setSelectedGrupo(null);
              setIsModalOpen(true);
            }}
            className="mt-3 text-xs text-blue-800 font-bold hover:underline"
          >
            Crear el primer grupo de guardia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGrupos.map((grupo) => {
            const members = grupo.personalIds
              .map((id) => personalList.find((p) => p.id === id))
              .filter(Boolean) as Personal[];

            return (
              <div
                key={grupo.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Header de la tarjeta */}
                <div className="p-4 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {grupo.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-2">
                          {grupo.nombre}
                          {!grupo.activo && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-normal">
                              Inactivo
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {grupo.jefeGrupo ? `A cargo: ${grupo.jefeGrupo}` : 'Sin jefe asignado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedGrupo(grupo);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Grupo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteGrupoConfirm({ isOpen: true, grupo })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {grupo.descripcion && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {grupo.descripcion}
                    </p>
                  )}
                </div>

                {/* Lista de Miembros Asignados */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-700" />
                      Personal Integrante ({members.length})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedGrupo(grupo);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-800 hover:underline text-[11px] flex items-center gap-1 font-bold"
                    >
                      <UserPlus className="w-3 h-3" />
                      Gestionar Efectivos
                    </button>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No hay personal asignado a este grupo aún.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.slice(0, 6).map((m) => (
                        <div
                          key={m.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div className="truncate pr-1">
                            <p className="font-semibold text-slate-800 truncate text-[11px]">
                              {m.jerarquia} {m.apellidoYNombre}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">DNI {m.dni}</p>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              m.estado === 'Activo' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            title={`Estado: ${m.estado}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {members.length > 6 && (
                    <p className="text-[11px] text-slate-500 font-medium text-right">
                      +{members.length - 6} efectivos adicionales asignados
                    </p>
                  )}

                  {/* Funciones preconfiguradas */}
                  {grupo.funcionesSugeridas && grupo.funcionesSugeridas.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Funciones Preconfiguradas para Guardia:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {grupo.funcionesSugeridas.map((fs, idx) => (
                          <span
                            key={idx}
                            className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-[10px] px-2 py-0.5 rounded font-medium"
                          >
                            {fs.funcion}: <span className="font-semibold">{fs.personalNombre || 'S/D'}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer de la tarjeta con acción rápida */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {grupo.id}
                  </span>
                  {onNavigateToGuardias && (
                    <button
                      onClick={onNavigateToGuardias}
                      className="px-3 py-1 bg-white border border-slate-300 hover:border-blue-700 hover:text-blue-900 text-slate-700 rounded-md font-semibold text-[11px] transition-colors"
                    >
                      Ver en Parte de Novedades &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Grupo */}
      {isModalOpen && (
        <GrupoModal
          grupo={selectedGrupo}
          personalList={personalList}
          config={config}
          onSave={(data) => {
            onSaveGrupo(data);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal Confirmar Eliminación de Grupo */}
      <ConfirmModal
        isOpen={deleteGrupoConfirm.isOpen}
        title="Eliminar Grupo de Guardia"
        message={`¿Confirma eliminar definitivamente la sección o grupo "${deleteGrupoConfirm.grupo?.nombre || ''}"? Esta acción no afectará al personal individual.`}
        confirmLabel="Eliminar Grupo"
        isDestructive={true}
        onConfirm={() => {
          if (deleteGrupoConfirm.grupo) {
            onDeleteGrupo(deleteGrupoConfirm.grupo.id);
          }
        }}
        onClose={() => setDeleteGrupoConfirm({ isOpen: false, grupo: null })}
      />
    </div>
  );
};
