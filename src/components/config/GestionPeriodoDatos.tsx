import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  FileCheck2,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  TipoPeriodoFiltro,
  RangoFechas,
  calcularRangoPeriodo,
  MODULOS_OPERATIVOS_PERIODO,
  previsualizarConteoPeriodo,
  eliminarDatosPeriodo,
  exportarJsonPeriodo,
  restaurarJsonPeriodo,
} from '../../services/backupService';
import { ConfirmModal } from '../common/ConfirmModal';
import { UsuarioSistema } from '../../types/police';

interface GestionPeriodoDatosProps {
  currentUser?: UsuarioSistema;
  onDataChanged: () => void;
  onShowMessage: (text: string, isError?: boolean) => void;
}

export const GestionPeriodoDatos: React.FC<GestionPeriodoDatosProps> = ({
  currentUser,
  onDataChanged,
  onShowMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'eliminar' | 'restaurar' | 'exportar'>('eliminar');

  // Período
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoFiltro>('mes');
  const [customDesde, setCustomDesde] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customHasta, setCustomHasta] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Módulos seleccionados
  const [modulosSeleccionados, setModulosSeleccionados] = useState<string[]>(
    MODULOS_OPERATIVOS_PERIODO.map((m) => m.id)
  );

  // Conteo en vivo de registros que coinciden
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [totalEncontrados, setTotalEncontrados] = useState<number>(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Estados de proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [crearBackupPrevio, setCrearBackupPrevio] = useState(true);

  // Estado para Restauración
  const [archivoParaRestaurar, setArchivoParaRestaurar] = useState<File | null>(null);
  const [contenidoJsonRestaurar, setContenidoJsonRestaurar] = useState<string | null>(null);
  const [aplicarFiltroEnRestauracion, setAplicarFiltroEnRestauracion] = useState(true);

  // Rango activo calculado
  const rangoActivo: RangoFechas = useMemo(() => {
    return calcularRangoPeriodo(tipoPeriodo, customDesde, customHasta);
  }, [tipoPeriodo, customDesde, customHasta]);

  // Actualizar conteos cada vez que cambia el rango o los módulos seleccionados
  const actualizarConteos = async () => {
    setIsLoadingCounts(true);
    try {
      const res = await previsualizarConteoPeriodo(rangoActivo, modulosSeleccionados);
      setConteos(res.conteos);
      setTotalEncontrados(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    actualizarConteos();
  }, [rangoActivo.desde, rangoActivo.hasta, modulosSeleccionados]);

  // Manejo de selección de módulos
  const toggleModulo = (id: string) => {
    setModulosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const seleccionarTodosModulos = () => {
    setModulosSeleccionados(MODULOS_OPERATIVOS_PERIODO.map((m) => m.id));
  };

  const deseleccionarTodosModulos = () => {
    setModulosSeleccionados([]);
  };

  // Acción: Exportar período a JSON
  const handleExportarPeriodo = async () => {
    if (modulosSeleccionados.length === 0) {
      onShowMessage('Seleccione al menos un módulo para exportar.', true);
      return;
    }

    try {
      setIsProcessing(true);
      const jsonStr = await exportarJsonPeriodo(rangoActivo, modulosSeleccionados);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Periodo_${rangoActivo.desde}_al_${rangoActivo.hasta}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowMessage(
        `Copia de respaldo JSON del período ${rangoActivo.desde} al ${rangoActivo.hasta} descargada correctamente.`
      );
    } catch (err: any) {
      onShowMessage(`Error al exportar período: ${err?.message}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Acción: Eliminar período
  const handleConfirmarEliminacion = async () => {
    if (modulosSeleccionados.length === 0) {
      onShowMessage('Seleccione al menos un módulo para eliminar.', true);
      return;
    }

    setIsConfirmDeleteOpen(false);
    setIsProcessing(true);

    try {
      // Si el usuario eligió generar backup previo de seguridad
      if (crearBackupPrevio && totalEncontrados > 0) {
        try {
          const jsonStr = await exportarJsonPeriodo(rangoActivo, modulosSeleccionados);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `SisPol_RESPALDO_PREVIO_ELIMINACION_${rangoActivo.desde}_al_${rangoActivo.hasta}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('No se pudo descargar el respaldo previo:', e);
        }
      }

      const res = await eliminarDatosPeriodo(
        rangoActivo,
        modulosSeleccionados,
        currentUser?.apellidoYNombre || currentUser?.username
      );

      onShowMessage(
        `Se eliminaron exitosamente ${res.totalEliminados} registros del período ${rangoActivo.desde} al ${rangoActivo.hasta}.`
      );
      await actualizarConteos();
      onDataChanged();
    } catch (err: any) {
      onShowMessage(`Error al eliminar registros del período: ${err?.message}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Carga de archivo para restauración
  const handleSeleccionarArchivoRestaurar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoParaRestaurar(file);
    const reader = new FileReader();
    reader.onload = () => {
      setContenidoJsonRestaurar(reader.result as string);
    };
    reader.readAsText(file);
  };

  // Ejecutar restauración
  const handleEjecutarRestauracion = async () => {
    if (!contenidoJsonRestaurar) {
      onShowMessage('Seleccione un archivo de respaldo JSON válido.', true);
      return;
    }

    setIsProcessing(true);

    try {
      const filtro = aplicarFiltroEnRestauracion ? rangoActivo : undefined;
      const res = await restaurarJsonPeriodo(
        contenidoJsonRestaurar,
        filtro,
        modulosSeleccionados,
        currentUser?.apellidoYNombre || currentUser?.username
      );

      if (res.success) {
        onShowMessage(res.message);
        setArchivoParaRestaurar(null);
        setContenidoJsonRestaurar(null);
        await actualizarConteos();
        onDataChanged();
      } else {
        onShowMessage(res.message, true);
      }
    } catch (err: any) {
      onShowMessage(`Error durante la restauración: ${err?.message}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Gestión de Datos por Período Específico
            </h2>
            <p className="text-xs text-slate-500">
              Elimine o restaure registros operativos seleccionando un período temporal (Semana, Mes, Año o Personalizado).
            </p>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('eliminar')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'eliminar'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar / Depurar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restaurar')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'restaurar'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Período</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exportar')}
            className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'exportar'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Período</span>
          </button>
        </div>
      </div>

      {/* Selector de Período Común */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-blue-950 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-700" />
            <span>1. Seleccione el Período Temporal de Aplicación:</span>
          </span>

          <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full">
            Rango Efectivo: {rangoActivo.desde} al {rangoActivo.hasta}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'semana', label: 'Semana (Últimos 7 días)' },
            { id: 'mes', label: 'Mes (Últimos 30 días)' },
            { id: 'año', label: `Año en Curso (${new Date().getFullYear()})` },
            { id: 'personalizado', label: 'Personalizado (Rango libre)' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTipoPeriodo(p.id as TipoPeriodoFiltro)}
              className={`p-2.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                tipoPeriodo === p.id
                  ? 'border-blue-700 bg-blue-900 text-white shadow-xs'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Inputs de rango si es Personalizado */}
        {tipoPeriodo === 'personalizado' && (
          <div className="p-3 bg-white rounded-lg border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 animate-in fade-in">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha Desde:</label>
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha Hasta:</label>
              <input
                type="date"
                value={customHasta}
                onChange={(e) => setCustomHasta(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Selección de Módulos Operativos */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-700" />
            <span>2. Módulos y Tablas a Incluir en la Acción:</span>
          </span>

          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={seleccionarTodosModulos}
              className="text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              Seleccionar Todos
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={deseleccionarTodosModulos}
              className="text-slate-500 hover:underline font-semibold cursor-pointer"
            >
              Deseleccionar Todos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {MODULOS_OPERATIVOS_PERIODO.map((mod) => {
            const isSelected = modulosSeleccionados.includes(mod.id);
            const count = conteos[mod.id] || 0;
            return (
              <label
                key={mod.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50/60 text-blue-950 font-medium'
                    : 'border-slate-200 bg-slate-50 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleModulo(mod.id)}
                    className="w-3.5 h-3.5 text-blue-900 rounded"
                  />
                  <span className="truncate">{mod.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    count > 0 ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count} en período
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Resumen del Período / Registros Afectados */}
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            Total de registros identificados en el rango (<strong>{rangoActivo.desde}</strong> a{' '}
            <strong>{rangoActivo.hasta}</strong>):{' '}
            <strong className="text-blue-950 font-mono text-sm">{totalEncontrados}</strong> registros.
          </span>
        </div>

        <button
          type="button"
          onClick={actualizarConteos}
          disabled={isLoadingCounts}
          className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingCounts ? 'animate-spin' : ''}`} />
          <span>Recalcular</span>
        </button>
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      {/* 1. ELIMINAR / DEPURAR */}
      {activeTab === 'eliminar' && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-4 text-xs">
          <div className="flex items-start gap-2.5 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block text-red-950">
                Zona de Depuración Permanente por Período
              </span>
              <p className="text-slate-600">
                Esta acción eliminará de la base de datos local todos los registros seleccionados cuya
                fecha de registro o intervención se encuentre comprendida entre el{' '}
                <strong>{rangoActivo.desde}</strong> y el <strong>{rangoActivo.hasta}</strong>.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-red-200 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={crearBackupPrevio}
                onChange={(e) => setCrearBackupPrevio(e.target.checked)}
                className="w-4 h-4 text-blue-900 rounded"
              />
              <span>Descargar automáticamente un respaldo JSON de seguridad antes de eliminar</span>
            </label>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Recomendado
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              disabled={isProcessing || totalEncontrados === 0 || modulosSeleccionados.length === 0}
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar {totalEncontrados} Registros del Período</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. RESTAURAR */}
      {activeTab === 'restaurar' && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-4 text-xs">
          <div className="flex items-start gap-2.5 text-emerald-950">
            <FileCheck2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block text-emerald-950">
                Restauración de Respaldo con Filtro de Período
              </span>
              <p className="text-slate-600">
                Cargue un archivo JSON previamente exportado. Puede elegir restaurar todos los datos del
                archivo o aplicar el filtro temporal para incorporar únicamente los registros
                correspondientes al período seleccionado.
              </p>
            </div>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-lg border border-emerald-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Seleccione el archivo JSON de Respaldo:
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleSeleccionarArchivoRestaurar}
                className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-900 hover:file:bg-emerald-200"
              />
              {archivoParaRestaurar && (
                <div className="mt-1 text-[11px] text-emerald-800 font-mono font-medium">
                  ✓ Archivo seleccionado: {archivoParaRestaurar.name} (
                  {(archivoParaRestaurar.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={aplicarFiltroEnRestauracion}
                  onChange={(e) => setAplicarFiltroEnRestauracion(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded"
                />
                <span>
                  Filtrar e importar únicamente los registros del período ({rangoActivo.desde} al{' '}
                  {rangoActivo.hasta})
                </span>
              </label>

              <button
                type="button"
                disabled={isProcessing || !contenidoJsonRestaurar}
                onClick={handleEjecutarRestauracion}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Ejecutar Restauración</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXPORTAR */}
      {activeTab === 'exportar' && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4 text-xs">
          <div className="flex items-start gap-2.5 text-blue-950">
            <Download className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block text-blue-950">
                Exportación Selectiva de Período (JSON)
              </span>
              <p className="text-slate-600">
                Descargue un archivo JSON portable que contendrá únicamente los registros de los módulos
                seleccionados fechados entre el <strong>{rangoActivo.desde}</strong> y el{' '}
                <strong>{rangoActivo.hasta}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-blue-200">
            <span className="text-slate-700">
              Registros a exportar:{' '}
              <strong className="text-blue-900 font-mono">{totalEncontrados}</strong>
            </span>

            <button
              type="button"
              disabled={isProcessing || totalEncontrados === 0 || modulosSeleccionados.length === 0}
              onClick={handleExportarPeriodo}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar JSON ({totalEncontrados} registros)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminación */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Confirmación Crítica: Eliminar Datos por Período"
        message={`¿Está seguro de eliminar definitivamente ${totalEncontrados} registros correspondientes al período del ${rangoActivo.desde} al ${rangoActivo.hasta} en ${modulosSeleccionados.length} módulos seleccionados? Esta acción es irreversible.`}
        confirmLabel="Sí, Eliminar Definitivamente"
        isDestructive={true}
        onConfirm={handleConfirmarEliminacion}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};
