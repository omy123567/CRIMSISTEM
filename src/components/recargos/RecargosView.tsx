import React, { useState, useMemo } from 'react';
import {
  RecargoOperativo,
  Personal,
  ConfiguracionSistema,
  UsuarioSistema,
  DelegacionPolicial,
} from '../../types/police';
import {
  Clock,
  Plus,
  Download,
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileText,
  UserCheck,
  ShieldAlert,
  Building2,
  Briefcase,
} from 'lucide-react';
import { RecargoModal } from './RecargoModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ModalOpcionesImpresion, OpcionesImpresion } from '../common/ModalOpcionesImpresion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

interface RecargosViewProps {
  recargosList: RecargoOperativo[];
  personalList: Personal[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  delegacionesList?: DelegacionPolicial[];
  activeDelegacionId?: string;
  onSaveRecargo: (r: RecargoOperativo) => void;
  onDeleteRecargo: (id: string) => void;
}

export const RecargosView: React.FC<RecargosViewProps> = ({
  recargosList,
  personalList,
  config,
  currentUser,
  delegacionesList = [],
  activeDelegacionId,
  onSaveRecargo,
  onDeleteRecargo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroGuardia, setFiltroGuardia] = useState('todos');
  const [filtroDelegacion, setFiltroDelegacion] = useState('todas');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedRecargo, setSelectedRecargo] = useState<RecargoOperativo | null>(null);
  const [deleteRecargoConfirm, setDeleteRecargoConfirm] = useState<{
    isOpen: boolean;
    recargo: RecargoOperativo | null;
  }>({ isOpen: false, recargo: null });

  // Map rápido de personal
  const personalMap = useMemo(() => {
    const map = new Map<string, Personal>();
    personalList.forEach((p) => map.set(p.id, p));
    return map;
  }, [personalList]);

  // Map de delegaciones
  const delegacionesMap = useMemo(() => {
    const map = new Map<string, string>();
    delegacionesList.forEach((d) => map.set(d.id, d.nombre));
    return map;
  }, [delegacionesList]);

  // Filtrado reactivo de recargos
  const filteredRecargos = useMemo(() => {
    return recargosList.filter((r) => {
      const term = searchTerm.toLowerCase();
      const personalTexto = (
        r.personalDesignado ||
        (r.personalIds
          ? r.personalIds
              .map((id) => {
                const p = personalMap.get(id);
                return p ? `${p.jerarquia} ${p.apellidoYNombre}` : '';
              })
              .join(' ')
          : '')
      ).toLowerCase();

      const delNombre = (delegacionesMap.get(r.delegacionId || '') || '').toLowerCase();
      const oficinaTexto = (r.oficina || r.grupoUOficina || '').toLowerCase();

      const matchSearch =
        r.fecha.toLowerCase().includes(term) ||
        (r.hora && r.hora.toLowerCase().includes(term)) ||
        (r.horaPresentacion && r.horaPresentacion.toLowerCase().includes(term)) ||
        r.tipoRecargo.toLowerCase().includes(term) ||
        (r.estado && r.estado.toLowerCase().includes(term)) ||
        (r.observaciones && r.observaciones.toLowerCase().includes(term)) ||
        delNombre.includes(term) ||
        oficinaTexto.includes(term) ||
        personalTexto.includes(term);

      const matchTipo = filtroTipo === 'todos' || r.tipoRecargo === filtroTipo;
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      const matchGuardia =
        filtroGuardia === 'todos'
          ? true
          : filtroGuardia === 'si'
          ? r.seEncuentraDeGuardia === true
          : r.seEncuentraDeGuardia === false;

      const matchDel =
        filtroDelegacion === 'todas' || r.delegacionId === filtroDelegacion;

      return matchSearch && matchTipo && matchEstado && matchGuardia && matchDel;
    });
  }, [
    recargosList,
    searchTerm,
    filtroTipo,
    filtroEstado,
    filtroGuardia,
    filtroDelegacion,
    personalMap,
    delegacionesMap,
  ]);

  // Generar PDF oficial con orientación, tamaño de papel y desglose de servicios por delegación y personal
  const handleGenerarPdfConOpciones = (opciones: OpcionesImpresion) => {
    const orientation = opciones.orientacion === 'portrait' ? 'p' : 'l';
    let format: any = 'a4';
    if (opciones.tamano === 'legal') {
      format = [216, 356];
    } else if (opciones.tamano === 'letter') {
      format = 'letter';
    }

    const doc = new jsPDF(orientation, 'mm', format);
    const delegacionActiva =
      delegacionesList.find((d) => d.id === activeDelegacionId) || delegacionesList[0];
    const delNombreOficial = delegacionActiva?.nombre || config.dependencia;
    const oficinaHeader = 'OFICINA DE SERVICIOS Y OPERACIONES POLICIALES';

    const currentY = drawPoliceHeader(
      doc,
      config,
      `PLANILLA OFICIAL DE RECARGOS OPERATIVOS Y SERVICIOS EXTRAORDINARIOS\nDELEGACIÓN: ${delNombreOficial} - ${oficinaHeader}`,
      10
    );

    const rows = filteredRecargos.map((r, i) => {
      const personal =
        r.personalDesignado ||
        (r.personalIds
          ? r.personalIds
              .map((id) => {
                const p = personalMap.get(id);
                return p ? `${p.jerarquia} ${p.apellidoYNombre}` : '';
              })
              .filter(Boolean)
              .join(', ')
          : '---');

      const horaPres =
        r.horaPresentacion ||
        (r.hora ? r.hora.split('a')[0]?.trim() : '---');

      const delNombre = delegacionesMap.get(r.delegacionId || '') || 'Delegación Asignada';
      const ofi = r.oficina || r.grupoUOficina || 'Oficina Operativa';

      return [
        i + 1,
        r.fecha,
        `${horaPres} hs`,
        delNombre,
        ofi,
        r.tipoRecargo,
        r.seEncuentraDeGuardia ? 'SÍ' : 'NO',
        r.estado,
        personal,
        r.observaciones || '---',
      ];
    });

    autoTable(doc, {
      startY: currentY + 4,
      head: [
        [
          'N°',
          'Fecha',
          'Hora Pres.',
          'Delegación',
          'Oficina/Grupo',
          'Tipo de Recargo',
          '¿De Guardia?',
          'Estado',
          'Personal Designado',
          'Observaciones',
        ],
      ],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 32 },
        4: { cellWidth: 28 },
        5: { cellWidth: 38 },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 50 },
        9: { cellWidth: 'auto' },
      },
      didDrawPage: () => {
        drawPoliceFooter(doc, config);
      },
    });

    // Desglose de servicios realizados por delegación y personal de esa delegación
    const agrupadoPorDelegacion = new Map<string, Map<string, { total: number; fechas: string[] }>>();

    filteredRecargos.forEach((rec) => {
      const delNom = delegacionesMap.get(rec.delegacionId || '') || 'Delegación Central';
      if (!agrupadoPorDelegacion.has(delNom)) {
        agrupadoPorDelegacion.set(delNom, new Map());
      }
      const persMap = agrupadoPorDelegacion.get(delNom)!;

      const listaEfectivos = (rec.personalDesignado || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      listaEfectivos.forEach((efectivo) => {
        const item = persMap.get(efectivo) || { total: 0, fechas: [] };
        item.total += 1;
        item.fechas.push(`${rec.fecha} (${rec.horaPresentacion || rec.hora || '18:00'})`);
        persMap.set(efectivo, item);
      });
    });

    const rowsResumen: string[][] = [];
    agrupadoPorDelegacion.forEach((persMap, delNom) => {
      persMap.forEach((datos, efectivo) => {
        rowsResumen.push([
          delNom,
          efectivo,
          String(datos.total),
          datos.fechas.slice(0, 3).join(', ') + (datos.fechas.length > 3 ? ` (+${datos.fechas.length - 3} más)` : ''),
        ]);
      });
    });

    if (rowsResumen.length > 0) {
      const startResumenY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(
        'RESUMEN CONSOLIDADO: SERVICIOS REALIZADOS POR DELEGACIÓN Y PERSONAL POLICIAL',
        14,
        startResumenY
      );

      autoTable(doc, {
        startY: startResumenY + 3,
        head: [['Delegación Asignada', 'Personal Policial de la Delegación', 'Total Servicios', 'Detalle de Fechas']],
        body: rowsResumen,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 'auto' },
        },
        didDrawPage: () => {
          drawPoliceFooter(doc, config);
        },
      });
    }

    // Firma oficial exclusiva del Jefe (A la derecha)
    const finalY = (doc as any).lastAutoTable.finalY + 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const firmaX = pageWidth - 65;

    if (finalY < pageHeight - 30) {
      doc.setDrawColor(50, 60, 75);
      doc.setLineWidth(0.4);
      doc.line(firmaX - 25, finalY + 10, firmaX + 25, finalY + 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('JEFE DE DIVISIÓN / UNIDAD', firmaX, finalY + 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Firma, Aclaración y Sello Oficial', firmaX, finalY + 19, { align: 'center' });
    }

    doc.save(`Recargos_Operativos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Módulo de Recargos de Servicios
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredRecargos.length} servicios registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de servicios extraordinarios con especificación de hora de presentación, delegación, oficina y designación de efectivos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Planilla PDF Oficial</span>
          </button>

          <button
            onClick={() => {
              setSelectedRecargo(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Recargo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por fecha, personal, oficina..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
          />
        </div>

        <div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="todos">Todos los Tipos de Recargo</option>
            {config.tiposRecargo.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filtroGuardia}
            onChange={(e) => setFiltroGuardia(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="todos">¿Se encuentra de guardia? (Todos)</option>
            <option value="si">Sí (De guardia)</option>
            <option value="no">No (Franco)</option>
          </select>
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Vigente">Vigente</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>

        <div>
          <select
            value={filtroDelegacion}
            onChange={(e) => setFiltroDelegacion(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="todas">Todas las Delegaciones</option>
            {delegacionesList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.siglas || d.ciudad}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla Oficial de Recargos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold tracking-wider uppercase text-[11px] border-b border-slate-800">
                <th className="px-3 py-3 text-center w-10">N°</th>
                <th className="px-3 py-3 w-24">Fecha</th>
                <th className="px-3 py-3 w-28">Hora Presentación</th>
                <th className="px-3 py-3 w-36">Delegación</th>
                <th className="px-3 py-3 w-32">Oficina</th>
                <th className="px-3 py-3">Tipo de Recargo</th>
                <th className="px-3 py-3 text-center w-24">¿De Guardia?</th>
                <th className="px-3 py-3 text-center w-24">Estado</th>
                <th className="px-3 py-3">Personal Designado</th>
                <th className="px-3 py-3">Observaciones</th>
                <th className="px-3 py-3 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecargos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No se encontraron recargos registrados</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Utilice el botón "Nuevo Recargo" para programar un servicio extraordinario.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecargos.map((rec, index) => {
                  const personalStr =
                    rec.personalDesignado ||
                    (rec.personalIds && rec.personalIds.length > 0
                      ? rec.personalIds
                          .map((id) => {
                            const p = personalMap.get(id);
                            return p ? `${p.jerarquia} ${p.apellidoYNombre}` : '';
                          })
                          .filter(Boolean)
                          .join(', ')
                      : '---');

                  const horaPres =
                    rec.horaPresentacion ||
                    (rec.hora ? rec.hora.split('a')[0]?.trim() : '---');

                  const delNombre =
                    delegacionesMap.get(rec.delegacionId || '') ||
                    rec.delegacionId ||
                    'Delegación Principal';

                  return (
                    <tr key={rec.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {rec.fecha}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-700" />
                          <span>{horaPres} hs</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{delNombre}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {rec.oficina || rec.grupoUOficina || 'Oficina Operativa'}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-blue-950">
                        {rec.tipoRecargo}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                            rec.seEncuentraDeGuardia
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {rec.seEncuentraDeGuardia ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            rec.estado === 'Vigente'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : rec.estado === 'Finalizado'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {rec.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium max-w-xs">
                        <div className="line-clamp-2" title={personalStr}>
                          {personalStr}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs">
                        <div className="line-clamp-2" title={rec.observaciones || '---'}>
                          {rec.observaciones || '---'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecargo(rec);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-100 rounded cursor-pointer"
                            title="Editar Recargo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteRecargoConfirm({ isOpen: true, recargo: rec })
                            }
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded cursor-pointer"
                            title="Eliminar Recargo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Recargo */}
      {isModalOpen && (
        <RecargoModal
          recargo={selectedRecargo}
          personalList={personalList}
          config={config}
          currentUser={currentUser}
          delegacionesList={delegacionesList}
          activeDelegacionId={activeDelegacionId}
          onSave={(saved) => {
            onSaveRecargo(saved);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={deleteRecargoConfirm.isOpen}
        title="Eliminar Recargo de Servicio"
        message={`¿Confirma eliminar el recargo del ${deleteRecargoConfirm.recargo?.fecha || ''} (${deleteRecargoConfirm.recargo?.tipoRecargo || ''})?`}
        confirmLabel="Eliminar Recargo"
        isDestructive={true}
        onConfirm={() => {
          if (deleteRecargoConfirm.recargo) {
            onDeleteRecargo(deleteRecargoConfirm.recargo.id);
          }
        }}
        onClose={() => setDeleteRecargoConfirm({ isOpen: false, recargo: null })}
      />

      {/* Modal Opciones de Impresión */}
      <ModalOpcionesImpresion
        isOpen={isPrintModalOpen}
        titulo="Opciones de Impresión - Planilla de Recargos"
        orientacionDefault="landscape"
        tamanoDefault="a4"
        onGenerar={handleGenerarPdfConOpciones}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
