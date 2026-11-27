import { TonalidadModulo } from '../types/police';

export interface TonalidadStyle {
  id: TonalidadModulo;
  label: string;
  swatchBg: string;
  // Sidebar styles (dark theme)
  sidebarFolderClass: string;
  sidebarFolderActiveClass: string;
  sidebarItemClass: string;
  sidebarItemActiveClass: string;
  sidebarSubClass: string;
  sidebarSubActiveClass: string;
  sidebarIconClass: string;
  sidebarFolderIconClass: string;
  sidebarCountBadgeClass: string;
  sidebarBorderClass: string;
  // Modal (AdministrarModulosModal) styles (light/card theme)
  modalCardClass: string;
  modalFolderClass: string;
  modalBadgeClass: string;
}

export const TONALIDADES_CONFIG: Record<TonalidadModulo, TonalidadStyle> = {
  azul: {
    id: 'azul',
    label: 'Azul Institucional',
    swatchBg: 'bg-blue-600',
    sidebarFolderClass: 'bg-blue-950/40 text-blue-100 border-l-3 border-blue-500 hover:bg-blue-900/50',
    sidebarFolderActiveClass: 'bg-blue-900/75 text-white border-l-4 border-blue-400 shadow-sm',
    sidebarItemClass: 'bg-blue-950/20 text-slate-200 border-l-2 border-blue-500/70 hover:bg-blue-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-blue-700 text-white border-l-4 border-blue-300 shadow-sm shadow-blue-900/50',
    sidebarSubClass: 'text-blue-200/80 hover:bg-blue-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-blue-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-blue-400',
    sidebarFolderIconClass: 'text-blue-400 fill-blue-400/30',
    sidebarCountBadgeClass: 'bg-blue-900/80 text-blue-200 border border-blue-700/60',
    sidebarBorderClass: 'border-blue-600/40',
    modalCardClass: 'bg-blue-50/45 border-blue-200 hover:border-blue-300 border-l-4 border-l-blue-600',
    modalFolderClass: 'bg-gradient-to-r from-blue-950 to-slate-900 text-white border-blue-700 shadow-md',
    modalBadgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  esmeralda: {
    id: 'esmeralda',
    label: 'Verde Esmeralda',
    swatchBg: 'bg-emerald-600',
    sidebarFolderClass: 'bg-emerald-950/40 text-emerald-100 border-l-3 border-emerald-500 hover:bg-emerald-900/50',
    sidebarFolderActiveClass: 'bg-emerald-900/75 text-white border-l-4 border-emerald-400 shadow-sm',
    sidebarItemClass: 'bg-emerald-950/20 text-slate-200 border-l-2 border-emerald-500/70 hover:bg-emerald-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-emerald-700 text-white border-l-4 border-emerald-300 shadow-sm shadow-emerald-900/50',
    sidebarSubClass: 'text-emerald-200/80 hover:bg-emerald-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-emerald-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-emerald-400',
    sidebarFolderIconClass: 'text-emerald-400 fill-emerald-400/30',
    sidebarCountBadgeClass: 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/60',
    sidebarBorderClass: 'border-emerald-600/40',
    modalCardClass: 'bg-emerald-50/45 border-emerald-200 hover:border-emerald-300 border-l-4 border-l-emerald-600',
    modalFolderClass: 'bg-gradient-to-r from-emerald-950 to-slate-900 text-white border-emerald-700 shadow-md',
    modalBadgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  ambar: {
    id: 'ambar',
    label: 'Ámbar Operativo',
    swatchBg: 'bg-amber-500',
    sidebarFolderClass: 'bg-amber-950/40 text-amber-100 border-l-3 border-amber-500 hover:bg-amber-900/50',
    sidebarFolderActiveClass: 'bg-amber-900/75 text-white border-l-4 border-amber-400 shadow-sm',
    sidebarItemClass: 'bg-amber-950/20 text-slate-200 border-l-2 border-amber-500/70 hover:bg-amber-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-amber-700 text-white border-l-4 border-amber-300 shadow-sm shadow-amber-900/50',
    sidebarSubClass: 'text-amber-200/80 hover:bg-amber-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-amber-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-amber-400',
    sidebarFolderIconClass: 'text-amber-400 fill-amber-400/30',
    sidebarCountBadgeClass: 'bg-amber-900/80 text-amber-200 border border-amber-700/60',
    sidebarBorderClass: 'border-amber-600/40',
    modalCardClass: 'bg-amber-50/45 border-amber-200 hover:border-amber-300 border-l-4 border-l-amber-500',
    modalFolderClass: 'bg-gradient-to-r from-amber-950 to-slate-900 text-white border-amber-700 shadow-md',
    modalBadgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  violeta: {
    id: 'violeta',
    label: 'Violeta Pericial',
    swatchBg: 'bg-violet-600',
    sidebarFolderClass: 'bg-violet-950/40 text-violet-100 border-l-3 border-violet-500 hover:bg-violet-900/50',
    sidebarFolderActiveClass: 'bg-violet-900/75 text-white border-l-4 border-violet-400 shadow-sm',
    sidebarItemClass: 'bg-violet-950/20 text-slate-200 border-l-2 border-violet-500/70 hover:bg-violet-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-violet-700 text-white border-l-4 border-violet-300 shadow-sm shadow-violet-900/50',
    sidebarSubClass: 'text-violet-200/80 hover:bg-violet-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-violet-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-violet-400',
    sidebarFolderIconClass: 'text-violet-400 fill-violet-400/30',
    sidebarCountBadgeClass: 'bg-violet-900/80 text-violet-200 border border-violet-700/60',
    sidebarBorderClass: 'border-violet-600/40',
    modalCardClass: 'bg-violet-50/45 border-violet-200 hover:border-violet-300 border-l-4 border-l-violet-600',
    modalFolderClass: 'bg-gradient-to-r from-violet-950 to-slate-900 text-white border-violet-700 shadow-md',
    modalBadgeClass: 'bg-violet-100 text-violet-900 border-violet-300',
  },
  rojo: {
    id: 'rojo',
    label: 'Carmesí Alerta',
    swatchBg: 'bg-rose-600',
    sidebarFolderClass: 'bg-rose-950/40 text-rose-100 border-l-3 border-rose-500 hover:bg-rose-900/50',
    sidebarFolderActiveClass: 'bg-rose-900/75 text-white border-l-4 border-rose-400 shadow-sm',
    sidebarItemClass: 'bg-rose-950/20 text-slate-200 border-l-2 border-rose-500/70 hover:bg-rose-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-rose-700 text-white border-l-4 border-rose-300 shadow-sm shadow-rose-900/50',
    sidebarSubClass: 'text-rose-200/80 hover:bg-rose-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-rose-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-rose-400',
    sidebarFolderIconClass: 'text-rose-400 fill-rose-400/30',
    sidebarCountBadgeClass: 'bg-rose-900/80 text-rose-200 border border-rose-700/60',
    sidebarBorderClass: 'border-rose-600/40',
    modalCardClass: 'bg-rose-50/45 border-rose-200 hover:border-rose-300 border-l-4 border-l-rose-600',
    modalFolderClass: 'bg-gradient-to-r from-rose-950 to-slate-900 text-white border-rose-700 shadow-md',
    modalBadgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  cian: {
    id: 'cian',
    label: 'Cian Técnico',
    swatchBg: 'bg-cyan-600',
    sidebarFolderClass: 'bg-cyan-950/40 text-cyan-100 border-l-3 border-cyan-500 hover:bg-cyan-900/50',
    sidebarFolderActiveClass: 'bg-cyan-900/75 text-white border-l-4 border-cyan-400 shadow-sm',
    sidebarItemClass: 'bg-cyan-950/20 text-slate-200 border-l-2 border-cyan-500/70 hover:bg-cyan-950/50 hover:text-white',
    sidebarItemActiveClass: 'bg-cyan-700 text-white border-l-4 border-cyan-300 shadow-sm shadow-cyan-900/50',
    sidebarSubClass: 'text-cyan-200/80 hover:bg-cyan-950/50 hover:text-white',
    sidebarSubActiveClass: 'bg-cyan-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-cyan-400',
    sidebarFolderIconClass: 'text-cyan-400 fill-cyan-400/30',
    sidebarCountBadgeClass: 'bg-cyan-900/80 text-cyan-200 border border-cyan-700/60',
    sidebarBorderClass: 'border-cyan-600/40',
    modalCardClass: 'bg-cyan-50/45 border-cyan-200 hover:border-cyan-300 border-l-4 border-l-cyan-600',
    modalFolderClass: 'bg-gradient-to-r from-cyan-950 to-slate-900 text-white border-cyan-700 shadow-md',
    modalBadgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  },
  slate: {
    id: 'slate',
    label: 'Grafito Sistema',
    swatchBg: 'bg-slate-600',
    sidebarFolderClass: 'bg-slate-800/70 text-slate-100 border-l-3 border-slate-400 hover:bg-slate-800',
    sidebarFolderActiveClass: 'bg-slate-700 text-white border-l-4 border-slate-300 shadow-sm',
    sidebarItemClass: 'bg-slate-800/35 text-slate-300 border-l-2 border-slate-500/70 hover:bg-slate-800/80 hover:text-white',
    sidebarItemActiveClass: 'bg-slate-700 text-white border-l-4 border-slate-300 shadow-sm',
    sidebarSubClass: 'text-slate-300/80 hover:bg-slate-800 hover:text-white',
    sidebarSubActiveClass: 'bg-slate-700 text-white font-bold shadow-xs',
    sidebarIconClass: 'text-slate-400',
    sidebarFolderIconClass: 'text-slate-300 fill-slate-400/30',
    sidebarCountBadgeClass: 'bg-slate-800 text-slate-300 border border-slate-600',
    sidebarBorderClass: 'border-slate-600/40',
    modalCardClass: 'bg-slate-50/80 border-slate-200 hover:border-slate-300 border-l-4 border-l-slate-500',
    modalFolderClass: 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-md',
    modalBadgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
  },
};

export const TONALIDADES_LIST: TonalidadStyle[] = [
  TONALIDADES_CONFIG.azul,
  TONALIDADES_CONFIG.esmeralda,
  TONALIDADES_CONFIG.ambar,
  TONALIDADES_CONFIG.violeta,
  TONALIDADES_CONFIG.rojo,
  TONALIDADES_CONFIG.cian,
  TONALIDADES_CONFIG.slate,
];

export function getDefaultTonalidadForModule(moduleId: string): TonalidadModulo {
  switch (moduleId) {
    case 'dashboard':
    case 'expedientes':
    case 'inventario':
      return 'azul';
    case 'personal':
    case 'licencias':
    case 'grupos':
    case 'forense':
    case 'licenciados':
    case 'charlas-prevencion':
      return 'esmeralda';
    case 'guardias':
    case 'moviles':
    case 'recargos':
      return 'ambar';
    case 'inspecciones':
    case 'intervenciones':
    case 'informes-tecnicos':
      return 'violeta';
    case 'falta-oficio':
    case 'novedades-delegaciones':
    case 'causas-policiales':
    case 'accidentologia':
      return 'rojo';
    case 'personas':
    case 'vehiculos':
    case 'numerario':
    case 'memos-notas':
      return 'cian';
    case 'auditoria':
    case 'usuarios':
    case 'config':
      return 'slate';
    default:
      return 'ambar';
  }
}

export function getTonalidadStyle(
  tonalidad?: TonalidadModulo,
  moduleId?: string
): TonalidadStyle {
  const key = tonalidad || (moduleId ? getDefaultTonalidadForModule(moduleId) : 'azul');
  return TONALIDADES_CONFIG[key] || TONALIDADES_CONFIG.azul;
}
