import React, { useState } from 'react';
import { Filter, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface CollapsibleFilterBarProps {
  title?: string;
  activeFiltersCount?: number;
  defaultOpen?: boolean;
  onClear?: () => void;
  summaryRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleFilterBar: React.FC<CollapsibleFilterBarProps> = ({
  title = 'Barra de Búsqueda y Filtros Avanzados',
  activeFiltersCount = 0,
  defaultOpen = true,
  onClear,
  summaryRight,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs ${className}`}>
      <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-blue-800" />
            <span>{isOpen ? 'Ocultar Filtros' : 'Mostrar Filtros de Búsqueda'}</span>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          <span className="font-semibold text-slate-700 hidden sm:inline">{title}</span>

          {activeFiltersCount > 0 && (
            <span className="bg-blue-900 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {summaryRight}
          {onClear && activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
