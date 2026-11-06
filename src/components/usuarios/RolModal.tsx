import React, { useState, useEffect } from 'react';
import {
  RolSistema,
  AccionesRol,
  ColorRol,
} from '../../types/police';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  FileCheck2,
  FileSpreadsheet,
  Trash2,
  Edit3,
  PlusCircle,
  Eye,
  Building2,
  Lock,
  Layers,
  RotateCcw,
  Users,
  Sparkles,
  Info,
} from 'lucide-react';
import { MODULOS_DISPONIBLES } from './UsuariosView';

interface RolModalProps {
  isOpen: boolean;
  onClose: () => void;
  rolToEdit?: RolSistema | null;
  onSaveRol: (rol: RolSistema) => Promise<void> | void;
}

const COLOR_OPTIONS: { id: ColorRol; label: string; bgClass: string; borderClass: string; textClass: string; badgeClass: string }[] = [
  { id: 'blue', label: 'Azul Institucional', bgClass: 'bg-blue-600', borderClass: 'border-blue-600', textClass: 'text-blue-700', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'purple', label: 'Púrpura Superior', bgClass: 'bg-purple-600', borderClass: 'border-purple-600', textClass: 'text-purple-700', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'emerald', label: 'Esmeralda Pericial', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600', textClass: 'text-emerald-700', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'indigo', label: 'Índigo Judicial', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-600', textClass: 'text-indigo-700', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'amber', label: 'Ámbar Auditoría', bgClass: 'bg-amber-600', borderClass: 'border-amber-600', textClass: 'text-amber-700', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'rose', label: 'Rosa Operativo', bgClass: 'bg-rose-600', borderClass: 'border-rose-600', textClass: 'text-rose-700', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'cyan', label: 'Cian Técnico', bgClass: 'bg-cyan-600', borderClass: 'border-cyan-600', textClass: 'text-cyan-700', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'slate', label: 'Pizarra Guardia', bgClass: 'bg-slate-600', borderClass: 'border-slate-600', textClass: 'text-slate-700', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
];

const DEFAULT_ACCIONES: AccionesRol = {
  puedeCrear: true,
  puedeVer: true,
  puedeModificar: true,
  puedeEliminar: false,
  puedeExportarPdf: true,
  puedeExportarCsv: true,
  puedeVerOtrasDelegaciones: false,
  puedeModificarActuacionesCargadas: false,
  puedeAdministrarModulos: false,
  puedeResetearContadores: false,
  puedeRecargarOtrasDelegaciones: false,
  puedeGestionarUsuarios: false,
  puedeConfirmarFotografias: false,
};

export const RolModal: React.FC<RolModalProps> = ({
  isOpen,
  onClose,
  rolToEdit,
  onSaveRol,
}) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState<ColorRol>('blue');
  const [activo, setActivo] = useState(true);
  const [acciones, setAcciones] = useState<AccionesRol>(DEFAULT_ACCIONES);
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([
    'dashboard',
    'guardias',
    'inspecciones',
    'intervenciones',
    'expedientes',
    'personas',
    'vehiculos',
    'accidentologia',
  ]);

  useEffect(() => {
    if (rolToEdit) {
      setNombre(rolToEdit.nombre);
      setDescripcion(rolToEdit.descripcion || '');
      setColor(rolToEdit.color || 'blue');
      setActivo(rolToEdit.activo ?? true);
      setAcciones({
        ...DEFAULT_ACCIONES,
        ...rolToEdit.acciones,
      });
      setModulosPermitidos(rolToEdit.modulosPermitidos || []);
    } else {
      setNombre('');
      setDescripcion('');
      setColor('blue');
      setActivo(true);
      setAcciones(DEFAULT_ACCIONES);
      setModulosPermitidos([
        'dashboard',
        'guardias',
        'inspecciones',
        'intervenciones',
        'expedientes',
        'personas',
        'vehiculos',
        'accidentologia',
      ]);
    }
  }, [rolToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleAccion = (key: keyof AccionesRol) => {
    setAcciones((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSetAllAcciones = (val: boolean) => {
    setAcciones({
      puedeCrear: val,
      puedeVer: val,
      puedeModificar: val,
      puedeEliminar: val,
      puedeExportarPdf: val,
      puedeExportarCsv: val,
      puedeVerOtrasDelegaciones: val,
      puedeModificarActuacionesCargadas: val,
      puedeAdministrarModulos: val,
      puedeResetearContadores: val,
      puedeRecargarOtrasDelegaciones: val,
      puedeGestionarUsuarios: val,
      puedeConfirmarFotografias: val,
    });
  };

  const applyPreset = (preset: 'operativo' | 'pericial' | 'admin' | 'solo-consulta') => {
    if (preset === 'operativo') {
      setAcciones({
        puedeCrear: true,
        puedeVer: true,
        puedeModificar: false,
        puedeEliminar: false,
        puedeExportarPdf: true,
        puedeExportarCsv: false,
        puedeVerOtrasDelegaciones: false,
        puedeModificarActuacionesCargadas: false,
        puedeAdministrarModulos: false,
        puedeResetearContadores: false,
        puedeRecargarOtrasDelegaciones: false,
        puedeGestionarUsuarios: false,
        puedeConfirmarFotografias: false,
      });
      setModulosPermitidos(['dashboard', 'guardias', 'inspecciones', 'intervenciones', 'vehiculos', 'personas', 'accidentologia', 'expedientes', 'falta-oficio']);
      setColor('slate');
    } else if (preset === 'pericial') {
      setAcciones({
        puedeCrear: true,
        puedeVer: true,
        puedeModificar: true,
        puedeEliminar: false,
        puedeExportarPdf: true,
        puedeExportarCsv: true,
        puedeVerOtrasDelegaciones: false,
        puedeModificarActuacionesCargadas: true,
        puedeAdministrarModulos: false,
        puedeResetearContadores: false,
        puedeRecargarOtrasDelegaciones: false,
        puedeGestionarUsuarios: false,
        puedeConfirmarFotografias: true,
      });
      setModulosPermitidos(['dashboard', 'personal', 'guardias', 'inspecciones', 'intervenciones', 'causas-policiales', 'accidentologia', 'expedientes', 'falta-oficio', 'vehiculos', 'personas', 'forense', 'licenciados', 'informes-tecnicos', 'numerario']);
      setColor('emerald');
    } else if (preset === 'admin') {
      setAcciones({
        puedeCrear: true,
        puedeVer: true,
        puedeModificar: true,
        puedeEliminar: true,
        puedeExportarPdf: true,
        puedeExportarCsv: true,
        puedeVerOtrasDelegaciones: true,
        puedeModificarActuacionesCargadas: true,
        puedeAdministrarModulos: true,
        puedeResetearContadores: false,
        puedeRecargarOtrasDelegaciones: true,
        puedeGestionarUsuarios: true,
        puedeConfirmarFotografias: true,
      });
      setModulosPermitidos(MODULOS_DISPONIBLES.filter(m => m.id !== 'auditoria').map(m => m.id));
      setColor('blue');
    } else if (preset === 'solo-consulta') {
      setAcciones({
        puedeCrear: false,
        puedeVer: true,
        puedeModificar: false,
        puedeEliminar: false,
        puedeExportarPdf: true,
        puedeExportarCsv: false,
        puedeVerOtrasDelegaciones: true,
        puedeModificarActuacionesCargadas: false,
        puedeAdministrarModulos: false,
        puedeResetearContadores: false,
        puedeRecargarOtrasDelegaciones: false,
        puedeGestionarUsuarios: false,
        puedeConfirmarFotografias: false,
      });
      setColor('amber');
    }
  };

  const toggleModulo = (modId: string) => {
    setModulosPermitidos((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllModulos = () => {
    if (modulosPermitidos.length === MODULOS_DISPONIBLES.length) {
      setModulosPermitidos(['dashboard']);
    } else {
      setModulosPermitidos(MODULOS_DISPONIBLES.map((m) => m.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Debe especificar un nombre para el rol.');
      return;
    }

    const rolData: RolSistema = {
      id: rolToEdit?.id || 'rol-' + Date.now(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      color,
      esSistema: rolToEdit?.esSistema ?? false,
      modulosPermitidos,
      acciones,
      activo,
      createdAt: rolToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRol(rolData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700/80 rounded-xl text-blue-100 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {rolToEdit ? `Editar Rol: ${rolToEdit.nombre}` : 'Definir Nuevo Rol de Sistema'}
                {rolToEdit?.esSistema && (
                  <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                    Rol Predeterminado
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300">
                Configure el alcance de permisos, módulos autorizados y acciones granulares del rol.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Identificación del Rol */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Nombre del Rol *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Perito en Balística, Jefe de Guardia, Auditor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Estado del Rol
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer h-[38px]">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-semibold text-slate-800">
                  {activo ? 'Activo (Asignable)' : 'Inactivo'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Descripción Funcional y Alcance Operativo
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Indique brevemente el propósito de este rol dentro de la delegación o cuerpo pericial..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Selector de Color de Distintivo */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Distintivo Visual / Color del Rol
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? `${c.badgeClass} ring-2 ring-blue-600 font-bold shadow-2xs`
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bgClass} shrink-0`} />
                    <span className="text-xs truncate">{c.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-slate-800 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plantillas Rápidas */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Plantillas Preconfiguradas para Carga Rápida:</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllAcciones(true)}
                  className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Marcar todas
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => handleSetAllAcciones(false)}
                  className="text-[11px] text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  Desmarcar todas
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('operativo')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-semibold text-slate-700 hover:text-slate-900 cursor-pointer text-[11px]"
              >
                👮 Perfil Operador de Guardia
              </button>
              <button
                type="button"
                onClick={() => applyPreset('pericial')}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 rounded-md font-semibold text-slate-700 hover:text-emerald-800 cursor-pointer text-[11px]"
              >
                🔬 Perfil Oficial / Perito
              </button>
              <button
                type="button"
                onClick={() => applyPreset('admin')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-md font-semibold text-slate-700 hover:text-blue-800 cursor-pointer text-[11px]"
              >
                🏢 Perfil Administrador
              </button>
              <button
                type="button"
                onClick={() => applyPreset('solo-consulta')}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-300 rounded-md font-semibold text-slate-700 hover:text-amber-800 cursor-pointer text-[11px]"
              >
                🔍 Perfil Solo Consulta / Auditor
              </button>
            </div>
          </div>

          {/* MATRIZ DE ACCIONES DETALLADAS */}
          <div className="space-y-4 pt-1 border-t border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-800" />
                <span>Acciones y Privilegios Específicos del Rol</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Seleccione con precisión qué operaciones podrá ejecutar cualquier usuario asignado a este rol.
              </p>
            </div>

            {/* Grupo 1: Operaciones de Datos / CRUD */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block border-b border-slate-200 pb-1">
                1. Operaciones sobre Registros (Carga y Modificación)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* puedeCrear */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeCrear}
                    onChange={() => toggleAccion('puedeCrear')}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Crear Registros</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Cargar nuevos expedientes, intervenciones, recargos, personal y folios.
                    </span>
                  </div>
                </label>

                {/* puedeVer */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeVer}
                    onChange={() => toggleAccion('puedeVer')}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Visualizar y Consultar</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Acceso a listas, vistas de detalle, buscadores y filtros.
                    </span>
                  </div>
                </label>

                {/* puedeModificar */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeModificar}
                    onChange={() => toggleAccion('puedeModificar')}
                    className="w-4 h-4 text-amber-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Modificar Registros</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Actualizar datos en fichas y formularios operativos.
                    </span>
                  </div>
                </label>

                {/* puedeEliminar */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-rose-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeEliminar}
                    onChange={() => toggleAccion('puedeEliminar')}
                    className="w-4 h-4 text-rose-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-900 block flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Eliminar Contenido</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Borrar expedientes, personal, partes o registros sensibles.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Grupo 2: Exportación e Impresión Oficial */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block border-b border-slate-200 pb-1">
                2. Exportación y Generación de Documentos
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* puedeExportarPdf */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeExportarPdf}
                    onChange={() => toggleAccion('puedeExportarPdf')}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Imprimir / Exportar PDF Oficial</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Generar carátulas, reportes membretados y fichas para firma.
                    </span>
                  </div>
                </label>

                {/* puedeExportarCsv */}
                <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeExportarCsv}
                    onChange={() => toggleAccion('puedeExportarCsv')}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Exportar Planillas Excel / CSV</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Descarga de libros de novedades, folios y estadísticas a Excel.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Grupo 3: Privilegios Especiales y Autorizaciones Institucionales */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
              <span className="font-bold text-blue-950 text-[11px] uppercase tracking-wider block border-b border-blue-200 pb-1">
                3. Privilegios Especiales y Seguridad Pericial
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* puedeVerOtrasDelegaciones */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeVerOtrasDelegaciones}
                    onChange={() => toggleAccion('puedeVerOtrasDelegaciones')}
                    className="w-4 h-4 text-blue-800 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-blue-950 block flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>Ver Otras Delegaciones</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Habilita consultar información de dependencias policiales ajenas.
                    </span>
                  </div>
                </label>

                {/* puedeModificarActuacionesCargadas */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-amber-200 cursor-pointer hover:border-amber-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeModificarActuacionesCargadas}
                    onChange={() => toggleAccion('puedeModificarActuacionesCargadas')}
                    className="w-4 h-4 text-amber-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Modificar Actuaciones Cargadas</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Editar intervenciones y novedades de guardia ya cerradas.
                    </span>
                  </div>
                </label>

                {/* puedeRecargarOtrasDelegaciones */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeRecargarOtrasDelegaciones}
                    onChange={() => toggleAccion('puedeRecargarOtrasDelegaciones')}
                    className="w-4 h-4 text-blue-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-blue-950 block flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>Recargar a Otras Delegaciones</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Asignar recargos operativos a efectivos de otras delegaciones.
                    </span>
                  </div>
                </label>

                {/* puedeResetearContadores */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-rose-200 cursor-pointer hover:border-rose-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeResetearContadores}
                    onChange={() => toggleAccion('puedeResetearContadores')}
                    className="w-4 h-4 text-rose-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-950 block flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                      <span>Resetear Contadores Oficiales</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Reiniciar numeradores anuales de LC, Seguridad Vial e I.O.
                    </span>
                  </div>
                </label>

                {/* puedeAdministrarModulos */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-indigo-200 cursor-pointer hover:border-indigo-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeAdministrarModulos}
                    onChange={() => toggleAccion('puedeAdministrarModulos')}
                    className="w-4 h-4 text-indigo-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-indigo-950 block flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Administrar Estructura de Módulos</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Reordenar menú institucional y configurar submódulos.
                    </span>
                  </div>
                </label>

                {/* puedeGestionarUsuarios */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-purple-200 cursor-pointer hover:border-purple-400">
                  <input
                    type="checkbox"
                    checked={acciones.puedeGestionarUsuarios}
                    onChange={() => toggleAccion('puedeGestionarUsuarios')}
                    className="w-4 h-4 text-purple-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-purple-950 block flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-700" />
                      <span>Gestionar Usuarios y Roles</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Crear cuentas de usuario y definir nuevos roles con permisos.
                    </span>
                  </div>
                </label>

                {/* puedeConfirmarFotografias */}
                <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-amber-200 cursor-pointer hover:border-amber-400 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(acciones.puedeConfirmarFotografias)}
                    onChange={() => toggleAccion('puedeConfirmarFotografias')}
                    className="w-4 h-4 text-amber-700 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Confirmar y Validar Fotografías de Inspecciones Oculares (I.O.)</span>
                    </span>
                    <span className="text-[10px] text-slate-600 block leading-tight">
                      Permite validar la cantidad de fotos presionando sobre el estado de la I.O. y otorgar conformidad fotográfica.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* MÓDULOS PERMITIDOS */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">
                  Módulos Habilitados para este Rol *
                </span>
                <span className="text-[11px] text-slate-500">
                  Los usuarios con este rol tendrán acceso a los módulos seleccionados
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectAllModulos}
                className="text-blue-700 hover:underline font-bold text-xs cursor-pointer"
              >
                {modulosPermitidos.length === MODULOS_DISPONIBLES.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {MODULOS_DISPONIBLES.map((m) => {
                const isChecked = modulosPermitidos.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-blue-50 border-blue-400 text-blue-950'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleModulo(m.id)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs block">{m.label}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{m.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Modal */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{rolToEdit ? 'Guardar Cambios del Rol' : 'Crear Rol Institucional'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
