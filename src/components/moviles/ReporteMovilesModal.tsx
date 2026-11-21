import React, { useState, useMemo } from 'react';
import { MovilPolicial, ReparacionMecanica, ConfiguracionSistema, DelegacionPolicial, UsuarioSistema } from '../../types/police';
import { X, Car, Download, Filter, CheckCircle2, Calendar, Wrench, Shield, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { requestPdfExport, resolveJsPdfFormat, resolveJsPdfOrientation } from '../../services/pdfExportBus';
import { PdfPaperSize } from '../../types/police';

interface ReporteMovilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  movilesList: MovilPolicial[];
  reparacionesList?: ReparacionMecanica[];
  config: ConfiguracionSistema;
  delegacionesList?: DelegacionPolicial[];
  currentUser?: UsuarioSistema;
}

export const ReporteMovilesModal: React.FC<ReporteMovilesModalProps> = ({
  isOpen,
  onClose,
  movilesList,
  reparacionesList = [],
  config,
  delegacionesList = [],
  currentUser,
}) => {
  // Filtros de categoría: Tipo, estado, Delegación (si tiene privilegio), etc.
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroDelegacion, setFiltroDelegacion] = useState<string>('todas');
  const [filtroCombustible, setFiltroCombustible] = useState<string>('todos');

  // Rango de fecha: año, mes, semanal, personalizado
  const [rangoTipo, setRangoTipo] = useState<'todo' | 'anio' | 'mes' | 'semana' | 'personalizado'>('todo');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Formato de papel
  const [orientacion, setOrientacion] = useState<'p' | 'l'>('l');
  const [tamanoPapel, setTamanoPapel] = useState<PdfPaperSize>('a4');

  const puedeVerOtras = Boolean(
    currentUser?.rol === 'superusuario' || currentUser?.puedeVerOtrasDelegaciones
  );

  // Tipos disponibles
  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    movilesList.forEach((m) => {
      if (m.tipoVehiculo) set.add(m.tipoVehiculo);
    });
    return Array.from(set).sort();
  }, [movilesList]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    const now = new Date();
    let limiteDesde = fechaDesde;
    let limiteHasta = fechaHasta;

    if (rangoTipo === 'anio') {
      const year = now.getFullYear();
      limiteDesde = `${year}-01-01`;
      limiteHasta = `${year}-12-31`;
    } else if (rangoTipo === 'mes') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      limiteDesde = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      limiteHasta = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (rangoTipo === 'semana') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      limiteDesde = new Date(d.setDate(diff)).toISOString().slice(0, 10);
      limiteHasta = new Date(d.setDate(diff + 6)).toISOString().slice(0, 10);
    }

    return movilesList.filter((m) => {
      // Tipo
      if (filtroTipo !== 'todos' && m.tipoVehiculo !== filtroTipo) return false;

      // Estado operativo
      if (filtroEstado !== 'todos' && m.estadoOperativo !== filtroEstado) return false;

      // Combustible
      if (filtroCombustible !== 'todos' && m.tipoCombustible !== filtroCombustible) return false;

      // Delegación (si tiene privilegio de ver otras)
      if (puedeVerOtras && filtroDelegacion !== 'todas') {
        if (m.delegacionId && m.delegacionId !== filtroDelegacion) return false;
      }

      // Rango de fechas
      if (rangoTipo !== 'todo') {
        const fReg = (m.createdAt || m.ultimoServiceFecha || '').slice(0, 10);
        if (limiteDesde && fReg && fReg < limiteDesde) return false;
        if (limiteHasta && fReg && fReg > limiteHasta) return false;
      }

      return true;
    });
  }, [
    movilesList,
    filtroTipo,
    filtroEstado,
    filtroCombustible,
    filtroDelegacion,
    rangoTipo,
    fechaDesde,
    fechaHasta,
    puedeVerOtras,
  ]);

  const handleDescargarPdf = () => {
    const fileName = `Reporte_Parque_Automotor_${new Date().toISOString().slice(0, 10)}.pdf`;
    requestPdfExport({
      title: 'Reporte Oficial del Parque Automotor',
      fileName,
      defaultOrientation: orientacion === 'p' ? 'portrait' : 'landscape',
      defaultPaperSize: tamanoPapel,
      buildDoc: (opts) => {
        const doc = new jsPDF(resolveJsPdfOrientation(opts.orientation), 'mm', resolveJsPdfFormat(opts.paperSize));

        const titulo = `REPORTE OFICIAL DEL PARQUE AUTOMOTOR Y MÓVILES POLICIALES`;
        const currentY = drawPoliceHeader(doc, config, titulo, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const filtrosTxt = `Filtros: Tipo: ${filtroTipo} | Estado: ${filtroEstado} | Período: ${rangoTipo.toUpperCase()} | Unidades listadas: ${filteredList.length}`;
        doc.text(filtrosTxt, 10, currentY + 3);

        const rows: (string | number)[][] = filteredList.map((m, i) => [
          i + 1,
          m.nroMovilInterno || '---',
          m.marca || '---',
          m.modelo || '---',
          m.dominioPatente || '---',
          m.tipoVehiculo || m.tipo || '---',
          m.estadoOperativo || '---',
          m.kilometrajeActual ? `${m.kilometrajeActual.toLocaleString()} km` : '---',
          m.tipoCombustible || 'Nafta',
          m.choferHabitual || 'Rotativo',
          m.observaciones || 'Sin novedades',
        ]);

        autoTable(doc, {
          startY: currentY + 6,
          head: [[
            'N°',
            'Interno',
            'Marca',
            'Modelo',
            'Dominio',
            'Tipo',
            'Estado',
            'Odómetro',
            'Combustible',
            'Chofer',
            'Observaciones',
          ]],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [17, 38, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          styles: { fontSize: 7, cellPadding: 1.6, lineColor: [200, 210, 225], lineWidth: 0.1 },
          margin: { left: 10, right: 10 },
        });

        drawPoliceFooter(doc, config);
        return doc;
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Generador de Reportes de Móviles Policiales</h2>
              <p className="text-xs text-slate-400">
                Filtros por Tipo, Estado, Delegación y Rango de Fechas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Categorías Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Tipo de Vehículo:</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Todos los Tipos</option>
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Patrullero / Móvil Pericial">Patrullero / Móvil Pericial</option>
                <option value="Camioneta / Pick-Up">Camioneta / Pick-Up</option>
                <option value="Automóvil">Automóvil</option>
                <option value="Motocicleta">Motocicleta</option>
                <option value="Furgón Pericial / Morguera">Furgón Pericial / Morguera</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Estado Operativo:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Todos los Estados</option>
                <option value="En Servicio">En Servicio (Operativo)</option>
                <option value="En Taller / Reparación">En Taller / Reparación</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
                <option value="En Espera de Repuestos">En Espera de Repuestos</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Tipo de Combustible:</label>
              <select
                value={filtroCombustible}
                onChange={(e) => setFiltroCombustible(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="todos">Todos</option>
                <option value="Nafta">Nafta</option>
                <option value="Diesel">Diesel</option>
                <option value="GNC">GNC</option>
              </select>
            </div>

            {puedeVerOtras && (
              <div>
                <label className="block font-bold text-slate-800 mb-1">Delegación Policial:</label>
                <select
                  value={filtroDelegacion}
                  onChange={(e) => setFiltroDelegacion(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                >
                  <option value="todas">Todas las Delegaciones</option>
                  {delegacionesList.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rango de Fechas */}
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span className="font-bold text-blue-950">Rango de Fecha:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'todo', label: 'Histórico' },
                { id: 'anio', label: 'Año Actual' },
                { id: 'mes', label: 'Mes Actual' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRangoTipo(opt.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer text-center ${
                    rangoTipo === opt.id
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {rangoTipo === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opciones de Hoja */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Orientación:</label>
              <select
                value={orientacion}
                onChange={(e) => setOrientacion(e.target.value as any)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
              >
                <option value="l">Horizontal (Apaisada)</option>
                <option value="p">Vertical (Retrato)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tamaño:</label>
              <select
                value={tamanoPapel}
                onChange={(e) => setTamanoPapel(e.target.value as PdfPaperSize)}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="oficio">Oficio (216 × 330 mm)</option>
                <option value="legal">Legal (216 × 356 mm)</option>
                <option value="letter">Carta (216 × 279 mm)</option>
              </select>
            </div>
          </div>

          {/* Contador de coincidencias */}
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Móviles que coinciden con los criterios:</span>
            </div>
            <span className="text-sm font-mono bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
              {filteredList.length} unidades
            </span>
          </div>
        </div>

        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={filteredList.length === 0}
            onClick={handleDescargarPdf}
            className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte PDF ({filteredList.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
