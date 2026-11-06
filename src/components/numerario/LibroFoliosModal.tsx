import React, { useState, useMemo } from 'react';
import { SerieNumerario, FolioAsignado, ConfiguracionSistema } from '../../types/police';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Layers,
  Calendar,
  Building,
  User,
  CheckCircle2,
} from 'lucide-react';

interface LibroFoliosModalProps {
  isOpen: boolean;
  seriesList: SerieNumerario[];
  activeSerieId: string;
  foliosList: FolioAsignado[];
  config: ConfiguracionSistema;
  onClose: () => void;
}

export const LibroFoliosModal: React.FC<LibroFoliosModalProps> = ({
  isOpen,
  seriesList,
  activeSerieId,
  foliosList,
  config,
  onClose,
}) => {
  const [alcance, setAlcance] = useState<'serie' | 'unificado'>('serie');
  const [selectedSerieId, setSelectedSerieId] = useState<string>(activeSerieId);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  if (!isOpen) return null;

  const activeSerie = seriesList.find((s) => s.id === selectedSerieId);

  // Folios filtrados según serie o unificado, término de búsqueda y filtros
  const foliosFiltrados = useMemo(() => {
    let list = [...foliosList];

    if (alcance === 'serie') {
      list = list.filter((f) => f.serieId === selectedSerieId);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((f) => {
        const numStr = String(f.numero);
        const car = (f.codigoCaratula || '').toLowerCase();
        const asu = (f.asunto || '').toLowerCase();
        const dest = (f.destinatario || '').toLowerCase();
        const sol = (f.solicitante || '').toLowerCase();
        const cat = (f.categoriaDocumento || '').toLowerCase();
        return (
          numStr.includes(q) ||
          car.includes(q) ||
          asu.includes(q) ||
          dest.includes(q) ||
          sol.includes(q) ||
          cat.includes(q)
        );
      });
    }

    if (filtroCategoria !== 'todas') {
      list = list.filter((f) => f.categoriaDocumento === filtroCategoria);
    }

    if (fechaDesde) {
      list = list.filter((f) => f.fechaAsignacion >= fechaDesde);
    }

    if (fechaHasta) {
      list = list.filter((f) => f.fechaAsignacion <= fechaHasta);
    }

    return list.sort((a, b) => a.numero - b.numero);
  }, [foliosList, alcance, selectedSerieId, searchTerm, filtroCategoria, fechaDesde, fechaHasta]);

  // Exportar a CSV / Excel con codificación UTF-8
  const handleExportCsv = () => {
    const headers = [
      'Folio N°',
      'Serie / Cuaderno',
      'Carátula / Código',
      'Categoría Trámite',
      'Año',
      'Fecha Asignación',
      'Hora',
      'Asunto / Objeto',
      'Destinatario / Organismo',
      'Solicitante / Iniciador',
      'Observaciones',
    ];

    const seriesMap = new Map<string, string>();
    seriesList.forEach((s) => seriesMap.set(s.id, s.nombre));

    const rows = foliosFiltrados.map((f) => [
      f.numero,
      `"${seriesMap.get(f.serieId) || 'Serie'}"`,
      `"${f.codigoCaratula || ''}"`,
      `"${f.categoriaDocumento || ''}"`,
      f.anio,
      `"${f.fechaAsignacion || ''}"`,
      `"${f.horaAsignacion || ''}"`,
      `"${(f.asunto || '').replace(/"/g, '""')}"`,
      `"${(f.destinatario || '').replace(/"/g, '""')}"`,
      `"${(f.solicitante || '').replace(/"/g, '""')}"`,
      `"${(f.observaciones || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `Libro_Folios_${
      alcance === 'serie' ? activeSerie?.nombre.replace(/\s+/g, '_') : 'Unificado_General'
    }_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-300 max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in duration-200 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Cabecera (Se oculta al imprimir) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Libro Oficial de Registro de Folios</h2>
              <p className="text-xs text-slate-400">
                Seguimiento, trazabilidad y control de numerario asignado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs"
              title="Descargar libro en formato Excel / CSV (UTF-8)"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs"
              title="Imprimir Libro de Folios"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Configuración (Se oculta al imprimir) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Selector de Alcance: Serie actual o Reporte General Unificado */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Alcance del Reporte:</span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAlcance('serie')}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                    alcance === 'serie'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Serie Activa
                </button>
                <button
                  type="button"
                  onClick={() => setAlcance('unificado')}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                    alcance === 'unificado'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reporte General Unificado (Todas las Series)
                </button>
              </div>
            </div>

            {alcance === 'serie' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Serie:</span>
                <select
                  value={selectedSerieId}
                  onChange={(e) => setSelectedSerieId(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                >
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.prefijo} • {s.anio})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Barra de Búsqueda y Filtros en Tiempo Real */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, carátula, destinatario, asunto..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="todas">Todas las Categorías</option>
                <option value="Oficio Judicial">Oficio Judicial</option>
                <option value="Oficio Vicedirección">Oficio Vicedirección</option>
                <option value="Memorándum">Memorándum</option>
                <option value="Expediente Pericial">Expediente Pericial</option>
                <option value="Nota Interna">Nota Interna</option>
                <option value="Circular General">Circular General</option>
                <option value="Dictamen Pericial">Dictamen Pericial</option>
                <option value="Causa Penal">Causa Penal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                title="Fecha Desde"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                title="Fecha Hasta"
              />
            </div>
          </div>
        </div>

        {/* Encabezado Oficial Institucional (Solo Visible para Impresión Oficial) */}
        <div className="hidden print:block p-6 border-b border-slate-300 space-y-1 text-center">
          <h1 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
            POLICÍA DE LA PROVINCIA DE FORMOSA
          </h1>
          <h2 className="text-xs font-bold text-slate-800 uppercase">
            DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA
          </h2>
          <h3 className="text-xs font-semibold text-slate-700">
            {config.dependencia || 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA'}
          </h3>
          <div className="pt-2 text-sm font-bold text-blue-950 underline uppercase">
            LIBRO DE REGISTRO Y CONTROL DE FOLIOS OFICIALES - AÑO {new Date().getFullYear()}
          </div>
          <p className="text-[11px] text-slate-600">
            {alcance === 'serie'
              ? `Serie: ${activeSerie?.nombre} (${activeSerie?.prefijo})`
              : 'Reporte General Unificado de Todas las Series'}
            {' '}• Emisión: {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        {/* Contenido / Tabla del Libro de Folios */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {foliosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">No se encontraron folios registrados</p>
              <p className="text-xs text-slate-400">
                Asigne folios desde la cuadrícula numérica de la serie o ajuste los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-16 text-center">Folio #</th>
                      {alcance === 'unificado' && <th className="py-2.5 px-3">Serie</th>}
                      <th className="py-2.5 px-3">Carátula / Código</th>
                      <th className="py-2.5 px-3">Fecha / Hora</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-4 min-w-[220px]">Asunto / Objeto del Trámite</th>
                      <th className="py-2.5 px-3">Destinatario / Organismo</th>
                      <th className="py-2.5 px-3">Solicitante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {foliosFiltrados.map((f) => (
                      <tr key={f.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-red-700 bg-red-50/30">
                          #{f.numero}
                        </td>
                        {alcance === 'unificado' && (
                          <td className="py-2 px-3 font-semibold text-blue-900 whitespace-nowrap">
                            {seriesList.find((s) => s.id === f.serieId)?.nombre || 'Serie'}
                          </td>
                        )}
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {f.codigoCaratula}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {f.fechaAsignacion} {f.horaAsignacion ? `(${f.horaAsignacion})` : ''}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {f.categoriaDocumento}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-medium leading-relaxed">
                          {f.asunto}
                          {f.observaciones && (
                            <span className="block text-[10px] text-slate-500 italic mt-0.5">
                              Nota: {f.observaciones}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">
                          {f.destinatario || '---'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {f.solicitante || '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Firma oficial exclusiva del Jefe para impresión (A la derecha) */}
                <div className="hidden print:flex flex-col items-end justify-end mt-12 pt-6 pr-8">
                  <div className="w-64 border-t-2 border-slate-700 pt-1.5 text-center">
                    <div className="font-bold text-xs uppercase text-slate-900">
                      JEFE DE DIVISIÓN / UNIDAD
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Firma, Aclaración y Sello Oficial
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal con contador */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <span>
            Mostrando <strong>{foliosFiltrados.length}</strong> de <strong>{foliosList.length}</strong> folios
            totales registrados
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
          >
            Cerrar Libro
          </button>
        </div>
      </div>
    </div>
  );
};
