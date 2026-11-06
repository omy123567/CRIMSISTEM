import React, { useState } from 'react';
import {
  ConfiguracionSistema,
  ModuloEstructuraConfig,
} from '../../types/police';
import {
  Sliders,
  X,
  ArrowUp,
  ArrowDown,
  Layers,
  RotateCcw,
  CheckCircle2,
  FolderTree,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from 'lucide-react';

interface AdministrarModulosModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionSistema;
  onSaveConfig: (cfg: ConfiguracionSistema) => void;
}

export const MODULOS_BASE_CATALOGO: Array<{ id: string; label: string; desc: string }> = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', desc: 'KPIs y Estadísticas' },
  { id: 'personal', label: 'Personal y Legajos', desc: 'Nómina, Armas y Chalecos' },
  { id: 'grupos', label: 'Grupos', desc: 'Secciones de Guardia & Nómina' },
  { id: 'expedientes', label: 'Expedientes Judiciales', desc: 'Oficios, Tareas y PPI' },
  { id: 'falta-oficio', label: 'Casos Falta de Oficio', desc: 'Urgencias preliminares' },
  { id: 'moviles', label: 'Parque Automotor', desc: 'Móviles y Reparaciones' },
  { id: 'recargos', label: 'Recargos Operativos', desc: 'Servicios extraordinarios' },
  { id: 'guardias', label: 'Parte de Novedades', desc: 'Guardia & Criminalística' },
  { id: 'inspecciones', label: 'Inspecciones Oculares', desc: 'Intervenciones Criminalísticas' },
  { id: 'intervenciones', label: 'Intervenciones', desc: 'LC & Siniestros Viales' },
  { id: 'causas-policiales', label: 'Causas c/ Pers. Policial', desc: 'Hechos con Efectivos Policiales' },
  { id: 'personas', label: 'Personas', desc: 'Involucrados & Testigos' },
  { id: 'vehiculos', label: 'Vehículos', desc: 'Rodados en Siniestros Viales' },
  { id: 'forense', label: 'Forense Policial', desc: 'Médico y Examinados' },
  { id: 'licenciados', label: 'Licenciado', desc: 'Personal Profesional' },
  { id: 'informes-tecnicos', label: 'Informes Técnicos', desc: 'Oficios, Dictámenes & Elevación' },
  { id: 'accidentologia', label: 'Accidentología Policial', desc: 'Siniestros con Personal Policial' },
  { id: 'numerario', label: 'Control de Folios', desc: 'Numerario oficial y folios' },
  { id: 'auditoria', label: 'Auditoría del Sistema', desc: 'Trazabilidad y Log de Acciones' },
  { id: 'usuarios', label: 'Gestión de Usuarios', desc: 'Roles, Permisos & Cuentas' },
  { id: 'config', label: 'Configuración & Membrete', desc: 'Ajustes, Membrete & Backups' },
];

export const getDefaultEstructuraModulos = (): ModuloEstructuraConfig[] => {
  return MODULOS_BASE_CATALOGO.map((m, idx) => ({
    id: m.id,
    label: m.label,
    desc: m.desc,
    orden: idx + 1,
    padreId: null,
    visible: true,
  }));
};

export const AdministrarModulosModal: React.FC<AdministrarModulosModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  // Inicializar estado local con la estructura existente o la base
  const [items, setItems] = useState<ModuloEstructuraConfig[]>(() => {
    if (config.estructuraModulos && config.estructuraModulos.length > 0) {
      // Asegurarnos que todos los módulos existan
      const map = new Map<string, ModuloEstructuraConfig>();
      config.estructuraModulos.forEach((it) => map.set(it.id, it));
      const merged: ModuloEstructuraConfig[] = [];
      MODULOS_BASE_CATALOGO.forEach((base, idx) => {
        const exist = map.get(base.id);
        if (exist) {
          merged.push({
            ...exist,
            label: exist.label || base.label,
            desc: exist.desc || base.desc,
          });
        } else {
          merged.push({
            id: base.id,
            label: base.label,
            desc: base.desc,
            orden: idx + 1,
            padreId: null,
            visible: true,
          });
        }
      });
      return merged.sort((a, b) => a.orden - b.orden);
    }
    return getDefaultEstructuraModulos();
  });

  const [hasChanges, setHasChanges] = useState(false);

  if (!isOpen) return null;

  // Mover elemento hacia arriba
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...items];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    // Recalcular orden
    copy.forEach((it, idx) => {
      it.orden = idx + 1;
    });
    setItems(copy);
    setHasChanges(true);
  };

  // Mover elemento hacia abajo
  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const copy = [...items];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    // Recalcular orden
    copy.forEach((it, idx) => {
      it.orden = idx + 1;
    });
    setItems(copy);
    setHasChanges(true);
  };

  // Cambiar padre (Módulo Principal vs Submódulo)
  const handleChangePadre = (id: string, nuevoPadreId: string | null) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            padreId: nuevoPadreId === 'none' ? null : nuevoPadreId,
          };
        }
        return it;
      })
    );
    setHasChanges(true);
  };

  // Cambiar visibilidad
  const handleToggleVisible = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            visible: it.visible === false ? true : false,
          };
        }
        return it;
      })
    );
    setHasChanges(true);
  };

  // Restablecer valores
  const handleReset = () => {
    if (window.confirm('¿Desea restablecer el orden y la jerarquía de módulos al estado por defecto?')) {
      const def = getDefaultEstructuraModulos();
      setItems(def);
      setHasChanges(true);
    }
  };

  // Guardar
  const handleSave = () => {
    // Normalizar números de orden
    const normalized = items.map((it, idx) => ({
      ...it,
      orden: idx + 1,
    }));
    onSaveConfig({
      ...config,
      estructuraModulos: normalized,
    });
    setHasChanges(false);
    onClose();
  };

  // Módulos disponibles para ser padres (módulos principales)
  const modulosPrincipales = items.filter((it) => !it.padreId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-800 rounded-xl text-indigo-200">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Administración de Módulos del Sistema
              </h2>
              <p className="text-xs text-slate-300">
                Reordene la posición de los módulos y defina submódulos anidados para personalizar el menú.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ayuda / Indicador */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-700 shrink-0" />
            <span>
              Use los botones <strong>Subir / Bajar</strong> para cambiar el orden en el menú. Seleccione un módulo padre para agruparlo como <strong>Submódulo</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-indigo-900 font-semibold bg-white border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Todo</span>
          </button>
        </div>

        {/* Lista de Módulos Ordenables */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {items.map((item, index) => {
            const isSubmodule = Boolean(item.padreId);
            const parentItem = items.find((p) => p.id === item.padreId);
            const isFirst = index === 0;
            const isLast = index === items.length - 1;

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isSubmodule
                    ? 'bg-indigo-50/40 border-indigo-200 ml-0 sm:ml-6'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Posición & Nombre del Módulo */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Flechas de Reordenamiento */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(index)}
                      className={`p-1 rounded border transition-colors ${
                        isFirst
                          ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                          : 'border-slate-300 bg-slate-50 hover:bg-indigo-100 text-slate-700 cursor-pointer'
                      }`}
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(index)}
                      className={`p-1 rounded border transition-colors ${
                        isLast
                          ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                          : 'border-slate-300 bg-slate-50 hover:bg-indigo-100 text-slate-700 cursor-pointer'
                      }`}
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-mono text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                    {index + 1}.
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {item.label}
                      </span>
                      {isSubmodule ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">
                          <span>↳ Submódulo de {parentItem?.label || item.padreId}</span>
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Módulo Principal
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.desc || item.id}
                    </div>
                  </div>
                </div>

                {/* Controles de Jerarquía (Padre / Submódulo) y Visibilidad */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">Nivel / Jerarquía:</span>
                    <select
                      value={item.padreId || 'none'}
                      onChange={(e) => handleChangePadre(item.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="none">📌 Módulo Principal (Nivel 1)</option>
                      <optgroup label="↳ Asignar como Submódulo de:">
                        {modulosPrincipales
                          .filter((p) => p.id !== item.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              Submódulo de {p.label}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleVisible(item.id)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                      item.visible !== false
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                    title={item.visible !== false ? 'Visible en menú' : 'Oculto en menú'}
                  >
                    {item.visible !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-red-500" />
                        <span className="hidden sm:inline">Oculto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {hasChanges ? (
              <span className="text-amber-700 font-bold">
                ● Hay cambios pendientes sin guardar
              </span>
            ) : (
              <span>Estructura de módulos sincronizada</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Estructura y Orden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
