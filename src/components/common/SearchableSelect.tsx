import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<SearchableOption | string>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
  className?: string;
  helperText?: string;
  id?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione o escriba para buscar...',
  disabled = false,
  required = false,
  allowCustom = true,
  className = '',
  helperText,
  id,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalizar opciones
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Mantener query sincronizado con prop value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Filtrado reactivo
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [normalizedOptions, query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Si no se seleccionó ninguna opción exacta y no permite libre, revertir a valor
        if (!allowCustom) {
          const match = normalizedOptions.find(
            (o) => o.label.toLowerCase() === query.toLowerCase()
          );
          if (match) {
            onChange(match.value);
            setQuery(match.label);
          } else {
            setQuery(value || '');
          }
        } else if (query !== value) {
          onChange(query);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, value, allowCustom, normalizedOptions, onChange]);

  const handleSelect = (optionValue: string, optionLabel: string) => {
    onChange(optionValue);
    setQuery(optionLabel);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (allowCustom) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value, filteredOptions[0].label);
      } else if (allowCustom && query.trim()) {
        onChange(query.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block font-semibold text-slate-700 text-xs mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-2.5 pointer-events-none text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          required={required && !value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full py-2 ${icon ? 'pl-8' : 'pl-3'} pr-14 text-xs bg-white rounded-lg border transition-all ${
            isOpen
              ? 'border-blue-600 ring-2 ring-blue-100'
              : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-slate-800 font-medium'}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Borrar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
      )}

      {/* Popover con Opciones Filtradas */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 max-h-60 overflow-y-auto animate-in fade-in duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
            <span>Resultados ({filteredOptions.length})</span>
            <span className="text-slate-400">Enter para elegir</span>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              <p>No se encontraron coincidencias exactas.</p>
              {allowCustom && query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(query.trim());
                    setIsOpen(false);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-bold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Usar "{query.trim()}"</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 px-1">
              {filteredOptions.map((opt) => {
                const isSelected = opt.value === value || opt.label === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value, opt.label)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-900 text-white font-bold'
                        : 'text-slate-700 hover:bg-blue-50/70 hover:text-blue-900'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
