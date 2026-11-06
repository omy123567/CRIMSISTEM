import React, { useState, useMemo } from 'react';
import {
  UsuarioSistema,
  DelegacionPolicial,
  RolUsuario,
  RolSistema,
  AccionesRol,
} from '../../types/police';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
  KeyRound,
  Check,
  X,
  Layers,
  RotateCcw,
  AlertTriangle,
  Copy,
  Plus,
  FileCheck2,
  FileSpreadsheet,
  Eye,
  PlusCircle,
  Edit3,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { RolModal } from './RolModal';

interface UsuariosViewProps {
  usuariosList: UsuarioSistema[];
  delegacionesList: DelegacionPolicial[];
  rolesList?: RolSistema[];
  currentUser: UsuarioSistema;
  onSaveUsuario: (user: UsuarioSistema) => Promise<void> | void;
  onDeleteUsuario: (id: string) => Promise<void> | void;
  onSaveRol?: (rol: RolSistema) => Promise<void> | void;
  onDeleteRol?: (id: string) => Promise<void> | void;
}

export const MODULOS_DISPONIBLES = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', desc: 'KPIs y Estadísticas' },
  { id: 'personal', label: 'Personal Policial', desc: 'Legajos, Armas y Chalecos' },
  { id: 'grupos', label: 'Grupos de Guardia', desc: 'Secciones y Nóminas' },
  { id: 'expedientes', label: 'Expedientes Judiciales', desc: 'Oficios y Tareas' },
  { id: 'falta-oficio', label: 'Casos Falta de Oficio', desc: 'Urgencias preliminares' },
  { id: 'moviles', label: 'Parque Automotor', desc: 'Móviles y Reparaciones' },
  { id: 'recargos', label: 'Recargos Operativos', desc: 'Servicios extraordinarios' },
  { id: 'guardias', label: 'Parte de Novedades', desc: 'Novedades de Guardia' },
  { id: 'inspecciones', label: 'Inspecciones Oculares', desc: 'Actas I.O.' },
  { id: 'intervenciones', label: 'Intervenciones', desc: 'LC y Siniestros Viales' },
  { id: 'causas-policiales', label: 'Causas c/ Personal Policial', desc: 'Hechos con Efectivos Policiales' },
  { id: 'accidentologia', label: 'Accidentología Vial', desc: 'Siniestros con Personal Policial' },
  { id: 'personas', label: 'Personas Vinculadas', desc: 'Involucrados y Testigos' },
  { id: 'vehiculos', label: 'Vehículos Siniestros', desc: 'Rodados intervinientes' },
  { id: 'forense', label: 'Forense Policial', desc: 'Médico y Examinados' },
  { id: 'licenciados', label: 'Licenciado', desc: 'Personal Licenciado y Peritos' },
  { id: 'informes-tecnicos', label: 'Informes Técnicos', desc: 'Oficios y Pericias Técnicas' },
  { id: 'numerario', label: 'Control de Folios', desc: 'Numerario y Asignación de Folios' },
  { id: 'usuarios', label: 'Gestión de Usuarios', desc: 'Administración de Cuentas' },
  { id: 'auditoria', label: 'Auditoría del Sistema', desc: 'Trazabilidad y registro de eventos (Superusuario)' },
  { id: 'config', label: 'Configuración & Membrete', desc: 'Ajustes de Delegación' },
];

export const getRolBadgeClass = (color?: string) => {
  switch (color) {
    case 'purple':
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'blue':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'emerald':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'indigo':
      return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    case 'amber':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'rose':
      return 'bg-rose-100 text-rose-900 border-rose-300';
    case 'cyan':
      return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    case 'slate':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuariosList,
  delegacionesList,
  rolesList = [],
  currentUser,
  onSaveUsuario,
  onDeleteUsuario,
  onSaveRol,
  onDeleteRol,
}) => {
  // Pestaña activa
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'roles'>('usuarios');

  // Filtros Usuarios
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroDelegacion, setFiltroDelegacion] = useState<string>('todas');

  // Filtros Roles
  const [searchRolTerm, setSearchRolTerm] = useState('');

  // Modales Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{
    isOpen: boolean;
    user: UsuarioSistema | null;
  }>({ isOpen: false, user: null });

  // Modales Roles
  const [isRolModalOpen, setIsRolModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<RolSistema | null>(null);
  const [deleteConfirmRol, setDeleteConfirmRol] = useState<{
    isOpen: boolean;
    rol: RolSistema | null;
  }>({ isOpen: false, rol: null });

  // Form State Usuario
  const [formApellidoYNombre, setFormApellidoYNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDelegacionId, setFormDelegacionId] = useState(
    currentUser.delegacionId || delegacionesList[0]?.id || 'del-laguna-blanca'
  );
  const [formRol, setFormRol] = useState<RolUsuario>('Operador');
  const [formRolId, setFormRolId] = useState<string>('');
  const [formPuedeVerOtras, setFormPuedeVerOtras] = useState(false);
  const [formDelegacionesPermitidas, setFormDelegacionesPermitidas] = useState<string[]>([]);
  const [formModulosPermitidos, setFormModulosPermitidos] = useState<string[]>([
    'dashboard',
    'guardias',
    'inspecciones',
    'expedientes',
    'falta-oficio',
  ]);
  const [formPuedeEliminar, setFormPuedeEliminar] = useState(false);
  const [formPuedeModificarActuaciones, setFormPuedeModificarActuaciones] = useState(false);
  const [formPuedeAdministrarModulos, setFormPuedeAdministrarModulos] = useState(false);
  const [formPuedeResetearContadores, setFormPuedeResetearContadores] = useState(false);
  const [formPuedeRecargarOtrasDelegaciones, setFormPuedeRecargarOtrasDelegaciones] = useState(false);
  const [formPuedeConfirmarFotografias, setFormPuedeConfirmarFotografias] = useState(false);
  const [formActivo, setFormActivo] = useState(true);

  // Filtrado de usuarios según permisos del usuario conectado
  const visibleUsuarios = useMemo(() => {
    return usuariosList.filter((u) => {
      if (
        currentUser.rol !== 'superusuario' &&
        !currentUser.puedeVerOtrasDelegaciones &&
        u.delegacionId !== currentUser.delegacionId
      ) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const matchSearch =
        u.apellidoYNombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term);

      const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
      const matchDel = filtroDelegacion === 'todas' || u.delegacionId === filtroDelegacion;

      return matchSearch && matchRol && matchDel;
    });
  }, [usuariosList, currentUser, searchTerm, filtroRol, filtroDelegacion]);

  // Filtrado de Roles
  const visibleRoles = useMemo(() => {
    return rolesList.filter((r) => {
      const term = searchRolTerm.toLowerCase();
      return (
        r.nombre.toLowerCase().includes(term) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(term))
      );
    });
  }, [rolesList, searchRolTerm]);

  // Helper para contar cuántos usuarios tienen un rol dado
  const getUsuariosCountByRol = (rol: RolSistema) => {
    return usuariosList.filter(
      (u) => u.rolId === rol.id || u.rol.toLowerCase() === rol.nombre.toLowerCase()
    ).length;
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormApellidoYNombre('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('');
    setFormDelegacionId(currentUser.delegacionId || delegacionesList[0]?.id || 'del-laguna-blanca');
    
    // Seleccionar por defecto el rol Operador o el primer rol
    const defaultRol = rolesList.find((r) => r.id === 'rol-operador' || r.nombre === 'Operador') || rolesList[0];
    if (defaultRol) {
      applyRolToUserForm(defaultRol);
    } else {
      setFormRol('Operador');
      setFormRolId('rol-operador');
      setFormPuedeVerOtras(false);
      setFormDelegacionesPermitidas([currentUser.delegacionId]);
      setFormModulosPermitidos([
        'dashboard',
        'guardias',
        'inspecciones',
        'expedientes',
        'falta-oficio',
        'personas',
        'vehiculos',
      ]);
      setFormPuedeEliminar(false);
      setFormPuedeModificarActuaciones(false);
      setFormPuedeAdministrarModulos(false);
      setFormPuedeResetearContadores(false);
      setFormPuedeRecargarOtrasDelegaciones(false);
      setFormPuedeConfirmarFotografias(false);
    }

    setFormActivo(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UsuarioSistema) => {
    setEditingUser(user);
    setFormApellidoYNombre(user.apellidoYNombre);
    setFormEmail(user.email);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormDelegacionId(user.delegacionId);
    setFormRol(user.rol);
    setFormRolId(user.rolId || '');
    setFormPuedeVerOtras(Boolean(user.puedeVerOtrasDelegaciones));
    setFormDelegacionesPermitidas(user.delegacionesPermitidas || [user.delegacionId]);
    setFormModulosPermitidos(user.modulosPermitidos || []);
    setFormPuedeEliminar(Boolean(user.puedeEliminar));
    setFormPuedeModificarActuaciones(Boolean(user.puedeModificarActuacionesCargadas));
    setFormPuedeAdministrarModulos(Boolean(user.puedeAdministrarModulos));
    setFormPuedeResetearContadores(Boolean(user.puedeResetearContadores));
    setFormPuedeRecargarOtrasDelegaciones(Boolean(user.puedeRecargarOtrasDelegaciones));
    setFormPuedeConfirmarFotografias(Boolean(user.puedeConfirmarFotografias || user.accionesPersonalizadas?.puedeConfirmarFotografias));
    setFormActivo(user.activo);
    setIsModalOpen(true);
  };

  const applyRolToUserForm = (rol: RolSistema) => {
    setFormRol(rol.nombre);
    setFormRolId(rol.id);
    if (rol.modulosPermitidos && rol.modulosPermitidos.length > 0) {
      setFormModulosPermitidos([...rol.modulosPermitidos]);
    }
    if (rol.acciones) {
      setFormPuedeEliminar(Boolean(rol.acciones.puedeEliminar));
      setFormPuedeModificarActuaciones(Boolean(rol.acciones.puedeModificarActuacionesCargadas));
      setFormPuedeAdministrarModulos(Boolean(rol.acciones.puedeAdministrarModulos));
      setFormPuedeResetearContadores(Boolean(rol.acciones.puedeResetearContadores));
      setFormPuedeRecargarOtrasDelegaciones(Boolean(rol.acciones.puedeRecargarOtrasDelegaciones));
      setFormPuedeVerOtras(Boolean(rol.acciones.puedeVerOtrasDelegaciones));
      setFormPuedeConfirmarFotografias(Boolean(rol.acciones.puedeConfirmarFotografias));
    }
  };

  const handleSelectRolChange = (rolIdOrName: string) => {
    const rolObj = rolesList.find((r) => r.id === rolIdOrName || r.nombre === rolIdOrName);
    if (rolObj) {
      applyRolToUserForm(rolObj);
    } else {
      setFormRol(rolIdOrName);
      setFormRolId('');
    }
  };

  const toggleModulo = (modId: string) => {
    setFormModulosPermitidos((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const toggleDelegacionPermitida = (delId: string) => {
    setFormDelegacionesPermitidas((prev) =>
      prev.includes(delId) ? prev.filter((d) => d !== delId) : [...prev, delId]
    );
  };

  const handleSelectAllModulos = () => {
    if (formModulosPermitidos.length === MODULOS_DISPONIBLES.length) {
      setFormModulosPermitidos(['dashboard']);
    } else {
      setFormModulosPermitidos(MODULOS_DISPONIBLES.map((m) => m.id));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formApellidoYNombre.trim() || !formEmail.trim() || !formUsername.trim() || !formPassword.trim()) {
      alert('Debe completar Apellido y Nombre, Correo, Usuario y Contraseña.');
      return;
    }

    const usernameExist = usuariosList.some(
      (u) =>
        u.username.toLowerCase() === formUsername.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (usernameExist) {
      alert(`El nombre de usuario "${formUsername}" ya se encuentra registrado.`);
      return;
    }

    const updatedUser: UsuarioSistema = {
      id: editingUser?.id || 'usr-' + Date.now(),
      apellidoYNombre: formApellidoYNombre.trim(),
      email: formEmail.trim(),
      username: formUsername.trim(),
      password: formPassword.trim(),
      delegacionId: formDelegacionId,
      rol: formRol,
      rolId: formRolId || undefined,
      puedeVerOtrasDelegaciones: formPuedeVerOtras,
      delegacionesPermitidas: formPuedeVerOtras ? formDelegacionesPermitidas : [formDelegacionId],
      modulosPermitidos: formModulosPermitidos,
      puedeEliminar: formPuedeEliminar,
      puedeModificarActuacionesCargadas: formPuedeModificarActuaciones,
      puedeAdministrarModulos: formPuedeAdministrarModulos,
      puedeResetearContadores: formPuedeResetearContadores,
      puedeRecargarOtrasDelegaciones: formPuedeRecargarOtrasDelegaciones,
      puedeConfirmarFotografias: formPuedeConfirmarFotografias,
      activo: formActivo,
      createdAt: editingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveUsuario(updatedUser);
    setIsModalOpen(false);
  };

  const handleCloneRol = (rol: RolSistema) => {
    const clonedRol: RolSistema = {
      ...rol,
      id: 'rol-' + Date.now(),
      nombre: `${rol.nombre} (Copia)`,
      esSistema: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingRol(clonedRol);
    setIsRolModalOpen(true);
  };

  const handleDeleteRolAttempt = (rol: RolSistema) => {
    const count = getUsuariosCountByRol(rol);
    if (count > 0) {
      alert(
        `No es posible eliminar el rol "${rol.nombre}" porque actualmente está asignado a ${count} usuario(s). Modifique o reasigne primero a los usuarios.`
      );
      return;
    }
    if (rol.esSistema) {
      alert(`El rol "${rol.nombre}" es un rol predeterminado de sistema y no puede eliminarse.`);
      return;
    }
    setDeleteConfirmRol({ isOpen: true, rol });
  };

  return (
    <div className="space-y-4">
      {/* Header del Módulo */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-900" />
              <span>Gestión de Usuarios, Roles y Permisos</span>
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {usuariosList.length} Usuarios • {rolesList.length} Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administración centralizada de cuentas de acceso, definición de roles con acciones específicas y matriz de facultades operativas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeSubTab === 'usuarios' ? (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Usuario</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingRol(null);
                setIsRolModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Definir Nuevo Rol</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center gap-1 border-b border-slate-200 px-1 bg-white rounded-t-xl pt-2">
        <button
          onClick={() => setActiveSubTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'usuarios'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-blue-800" />
          <span>Usuarios del Sistema</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {visibleUsuarios.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'roles'
              ? 'border-blue-900 text-blue-950 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          <span>Roles y Permisos por Acciones</span>
          <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {rolesList.length}
          </span>
        </button>
      </div>

      {/* VISTA 1: USUARIOS DEL SISTEMA */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario por apellido, nombre, correo o login..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs"
              >
                <option value="todos">Todos los Roles</option>
                {rolesList.map((r) => (
                  <option key={r.id} value={r.nombre}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroDelegacion}
                onChange={(e) => setFiltroDelegacion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs"
              >
                <option value="todas">Todas las Delegaciones</option>
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.ciudad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">USUARIO & NOMBRE</th>
                    <th className="px-4 py-3">CORREO INSTITUCIONAL</th>
                    <th className="px-4 py-3">DELEGACIÓN ASIGNADA</th>
                    <th className="px-4 py-3 text-center">ROL ASIGNADO</th>
                    <th className="px-4 py-3 text-center">OTRAS DELEGACIONES</th>
                    <th className="px-4 py-3 text-center">ELIMINAR</th>
                    <th className="px-4 py-3 text-center" title="Permiso especial para modificar actuaciones/intervenciones ya cargadas">MODIF. ACTUACIONES</th>
                    <th className="px-4 py-3 text-center" title="Permiso para administrar el orden y jerarquía de submódulos">ADMIN MÓDULOS</th>
                    <th className="px-4 py-3 text-center">MÓDULOS</th>
                    <th className="px-4 py-3 text-center">ESTADO</th>
                    <th className="px-4 py-3 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleUsuarios.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        No se encontraron usuarios registrados coincidentes con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    visibleUsuarios.map((user, idx) => {
                      const delegacion = delegacionesList.find((d) => d.id === user.delegacionId);
                      const matchingRol = rolesList.find(
                        (r) => r.id === user.rolId || r.nombre.toLowerCase() === user.rol.toLowerCase()
                      );

                      const roleBadgeClass = matchingRol
                        ? getRolBadgeClass(matchingRol.color)
                        : user.rol === 'superusuario'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : user.rol === 'Administrador'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300';

                      const isCurrentUser = user.id === currentUser.id;

                      return (
                        <tr
                          key={user.id}
                          className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}
                        >
                          {/* Usuario y Nombre */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {user.apellidoYNombre.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{user.apellidoYNombre}</span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                                      Tú
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Correo */}
                          <td className="px-4 py-3 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                          </td>

                          {/* Delegación */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {delegacion ? delegacion.nombre : user.delegacionId}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {delegacion ? delegacion.ciudad : ''}
                            </div>
                          </td>

                          {/* Rol */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadgeClass}`}
                            >
                              {user.rol}
                            </span>
                          </td>

                          {/* Permiso Otras Delegaciones */}
                          <td className="px-4 py-3 text-center">
                            {user.rol === 'superusuario' ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Global (Todas)
                              </span>
                            ) : user.puedeVerOtrasDelegaciones ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                                <span>{(user.delegacionesPermitidas || []).length} autorizadas</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Solo su delegación</span>
                            )}
                          </td>

                          {/* Eliminar */}
                          <td className="px-4 py-3 text-center">
                            {user.puedeEliminar ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <Check className="w-3.5 h-3.5 text-rose-600" />
                                <span>Habilitado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <X className="w-3.5 h-3.5 text-slate-300" />
                                <span>Bloqueado</span>
                              </span>
                            )}
                          </td>

                          {/* Modificar Actuaciones Cargadas */}
                          <td className="px-4 py-3 text-center">
                            {user.rol === 'superusuario' || user.puedeModificarActuacionesCargadas ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Check className="w-3.5 h-3.5 text-amber-600" />
                                <span>Autorizado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <Lock className="w-3.5 h-3.5 text-slate-300" />
                                <span>Restringido</span>
                              </span>
                            )}
                          </td>

                          {/* Administrar Módulos */}
                          <td className="px-4 py-3 text-center">
                            {user.rol === 'superusuario' || user.puedeAdministrarModulos ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <Check className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Autorizado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <X className="w-3.5 h-3.5 text-slate-300" />
                                <span>No</span>
                              </span>
                            )}
                          </td>

                          {/* Módulos */}
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-slate-700">
                              {user.modulosPermitidos ? user.modulosPermitidos.length : 0}
                            </span>
                            <span className="text-[10px] text-slate-400">/{MODULOS_DISPONIBLES.length}</span>
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3 text-center">
                            {user.activo ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Inactivo
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded cursor-pointer transition-colors"
                                title="Editar Usuario y Permisos"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                disabled={isCurrentUser}
                                onClick={() => setDeleteConfirmUser({ isOpen: true, user })}
                                className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded cursor-pointer transition-colors"
                                title={isCurrentUser ? 'No puedes eliminarte a ti mismo' : 'Eliminar Usuario'}
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
        </div>
      )}

      {/* VISTA 2: ROLES Y PERMISOS POR ACCIONES */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          {/* Barra de Filtro de Roles */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchRolTerm}
                onChange={(e) => setSearchRolTerm(e.target.value)}
                placeholder="Buscar roles por nombre o descripción..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong>{visibleRoles.length}</strong> de <strong>{rolesList.length}</strong> roles configurados en la institución
            </div>
          </div>

          {/* Grid de Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRoles.map((rol) => {
              const usersCount = getUsuariosCountByRol(rol);
              const badgeClass = getRolBadgeClass(rol.color);
              const totalModulos = (rol.modulosPermitidos || []).length;

              // Contar acciones activas
              const totalAccionesActivas = Object.values(rol.acciones || {}).filter(Boolean).length;

              return (
                <div
                  key={rol.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                >
                  {/* Header de Tarjeta */}
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                          {rol.nombre}
                        </span>
                        {rol.esSistema ? (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            Predeterminado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {rol.descripcion || 'Sin descripción asignada.'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-600" />
                        <span>{usersCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo: Acciones Granulares Especificadas */}
                  <div className="p-4 flex-1 space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                          <span>Acciones Granulares ({totalAccionesActivas}/12):</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeCrear ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeCrear ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3" />}
                          <span>Crear Registros</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeVer ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeVer ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3" />}
                          <span>Visualizar/Consultar</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeModificar ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeModificar ? <Check className="w-3 h-3 text-amber-600" /> : <X className="w-3 h-3" />}
                          <span>Modificar Registros</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeEliminar ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeEliminar ? <Check className="w-3 h-3 text-rose-600" /> : <X className="w-3 h-3" />}
                          <span>Eliminar Contenido</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeExportarPdf ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeExportarPdf ? <Check className="w-3 h-3 text-blue-600" /> : <X className="w-3 h-3" />}
                          <span>Imprimir / PDF</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeExportarCsv ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeExportarCsv ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3" />}
                          <span>Excel / CSV</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeVerOtrasDelegaciones ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeVerOtrasDelegaciones ? <Check className="w-3 h-3 text-blue-600" /> : <X className="w-3 h-3" />}
                          <span>Otras Delegaciones</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeModificarActuacionesCargadas ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeModificarActuacionesCargadas ? <Check className="w-3 h-3 text-amber-600" /> : <X className="w-3 h-3" />}
                          <span>Modif. Actuaciones</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeRecargarOtrasDelegaciones ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeRecargarOtrasDelegaciones ? <Check className="w-3 h-3 text-blue-600" /> : <X className="w-3 h-3" />}
                          <span>Recargas Otras Del.</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeResetearContadores ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeResetearContadores ? <Check className="w-3 h-3 text-rose-600" /> : <X className="w-3 h-3" />}
                          <span>Reset Contadores</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeAdministrarModulos ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeAdministrarModulos ? <Check className="w-3 h-3 text-indigo-600" /> : <X className="w-3 h-3" />}
                          <span>Estructura Módulos</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${rol.acciones.puedeGestionarUsuarios ? 'bg-purple-50 text-purple-800 border-purple-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeGestionarUsuarios ? <Check className="w-3 h-3 text-purple-600" /> : <X className="w-3 h-3" />}
                          <span>Gestión Usuarios</span>
                        </span>

                        <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 col-span-2 ${rol.acciones.puedeConfirmarFotografias ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                          {rol.acciones.puedeConfirmarFotografias ? <Check className="w-3 h-3 text-amber-600" /> : <X className="w-3 h-3" />}
                          <span>Confirmar Fotos I.O.</span>
                        </span>
                      </div>
                    </div>

                    {/* Módulos Habilitados */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        Módulos Permitidos ({totalModulos}/{MODULOS_DISPONIBLES.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {(rol.modulosPermitidos || []).map((mId) => {
                          const mod = MODULOS_DISPONIBLES.find((m) => m.id === mId);
                          return (
                            <span
                              key={mId}
                              className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                              title={mod?.desc}
                            >
                              {mod ? mod.label : mId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer de Tarjeta con Botones */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {rol.id}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCloneRol(rol)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                        title="Duplicar y crear rol derivado"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingRol(rol);
                          setIsRolModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-700 hover:text-blue-800 font-semibold rounded text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <button
                        disabled={rol.esSistema || usersCount > 0}
                        onClick={() => handleDeleteRolAttempt(rol)}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer transition-colors"
                        title={
                          rol.esSistema
                            ? 'Rol de sistema protegido'
                            : usersCount > 0
                            ? 'Tiene usuarios asignados'
                            : 'Eliminar Rol'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header Modal */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    {editingUser ? `Editar Usuario: @${editingUser.username}` : 'Registrar Nuevo Usuario Institucional'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Definición de rol, delegación asignada, permisos por módulo y privilegios por acciones.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Apellido y Nombre & Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Apellido y Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formApellidoYNombre}
                    onChange={(e) => setFormApellidoYNombre(e.target.value)}
                    placeholder="Ej. Crio. ALVAREZ Marcos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ejemplo@formosa.gov.ar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Usuario & Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="ej. alvarez.marcos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Contraseña de acceso"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Delegación & Selector Dinámico de Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Delegación a la que Corresponde *
                  </label>
                  <select
                    value={formDelegacionId}
                    onChange={(e) => setFormDelegacionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-600"
                  >
                    {delegacionesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.ciudad})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Rol en el Sistema *</span>
                    <span className="text-[10px] text-blue-700 font-normal">Aplica permisos y módulos</span>
                  </label>
                  <select
                    value={formRolId || formRol}
                    onChange={(e) => handleSelectRolChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-600"
                  >
                    {rolesList.length > 0 ? (
                      rolesList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} {r.esSistema ? '(Sistema)' : '(Personalizado)'}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Operador">Operador (Carga y consulta operativa)</option>
                        <option value="Administrador">Administrador (Gestión y reportes de delegación)</option>
                        <option value="superusuario">Superusuario (Acceso irrestricto global)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Banner Informativo de Rol Seleccionado */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    Rol asignado: <strong>{formRol}</strong>. Las acciones y módulos han sido preconfigurados según este perfil institucional.
                  </span>
                </div>
              </div>

              {/* Permisos de eliminación y estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPuedeEliminar}
                    onChange={(e) => setFormPuedeEliminar(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">¿Permitir Eliminar Contenido?</span>
                    <span className="text-[11px] text-slate-500">
                      Habilita borrar expedientes, intervenciones o registros en los módulos
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Usuario Activo</span>
                    <span className="text-[11px] text-slate-500">
                      Permite iniciar sesión en el portal
                    </span>
                  </div>
                </label>
              </div>

              {/* Permiso para ver datos de otras Delegaciones */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPuedeVerOtras}
                    onChange={(e) => setFormPuedeVerOtras(e.target.checked)}
                    className="w-4 h-4 text-blue-800 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-blue-950 block">
                      ¿Permitir visualizar datos de otras Delegaciones?
                    </span>
                    <span className="text-[11px] text-blue-800">
                      Habilita el selector de delegación en la barra superior bajo la fecha y hora
                    </span>
                  </div>
                </label>

                {formPuedeVerOtras && (
                  <div className="pt-2 border-t border-blue-200 space-y-1.5 animate-in fade-in">
                    <span className="font-bold text-[11px] text-slate-700 block">
                      Seleccione las Delegaciones autorizadas:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {delegacionesList.map((d) => {
                        const isChecked = formDelegacionesPermitidas.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs ${
                              isChecked
                                ? 'bg-blue-100/70 border-blue-400 text-blue-950 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDelegacionPermitida(d.id)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span className="truncate">{d.ciudad} • {d.siglas}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Permiso Especial: Modificar Actuaciones e Intervenciones ya Cargadas */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRol === 'superusuario' ? true : formPuedeModificarActuaciones}
                    disabled={formRol === 'superusuario'}
                    onChange={(e) => setFormPuedeModificarActuaciones(e.target.checked)}
                    className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>¿Permitir modificar actuaciones e intervenciones ya cargadas?</span>
                      {formRol === 'superusuario' && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          Automático (Superusuario)
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-amber-900 block mt-0.5 leading-relaxed">
                      Por protocolo pericial, las actuaciones asentadas en <strong>Parte de Novedades</strong>, <strong>Inspecciones Oculares</strong> e <strong>Intervenciones</strong> quedan bloqueadas contra modificación una vez guardadas, salvo que el usuario cuente con este permiso explícito.
                    </span>
                  </div>
                </label>
              </div>

              {/* Permiso Especial: Administrar Estructura de Módulos */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRol === 'superusuario' ? true : formPuedeAdministrarModulos}
                    disabled={formRol === 'superusuario'}
                    onChange={(e) => setFormPuedeAdministrarModulos(e.target.checked)}
                    className="w-4 h-4 text-indigo-700 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-indigo-950 block text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-700" />
                      <span>¿Permitir administrar estructura de módulos y menú?</span>
                      {formRol === 'superusuario' && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          Automático (Superusuario)
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-indigo-900 block mt-0.5 leading-relaxed">
                      Autoriza a este usuario a gestionar el menú de módulos operativos: <strong>ordenar su jerarquía</strong> y <strong>configurarlos como submódulos</strong>.
                    </span>
                  </div>
                </label>
              </div>

              {/* Permiso Especial: Resetear Contadores Oficiales */}
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRol === 'superusuario' ? true : formPuedeResetearContadores}
                    disabled={formRol === 'superusuario'}
                    onChange={(e) => setFormPuedeResetearContadores(e.target.checked)}
                    className="w-4 h-4 text-rose-700 rounded border-slate-300 focus:ring-rose-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-950 block text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                      <span>¿Permitir resetear o modificar contadores oficiales?</span>
                      {formRol === 'superusuario' && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          Automático (Superusuario)
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-rose-900 block mt-0.5 leading-relaxed">
                      Autoriza a resetear a 0001 o alterar los numeradores correlativos anuales de <strong>Criminalística (LC)</strong>, <strong>Seguridad Vial</strong> e <strong>Inspecciones Oculares (I.O.)</strong>.
                    </span>
                  </div>
                </label>
              </div>

              {/* Permiso Especial: Recargar Personal en Otras Delegaciones */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRol === 'superusuario' ? true : formPuedeRecargarOtrasDelegaciones}
                    disabled={formRol === 'superusuario'}
                    onChange={(e) => setFormPuedeRecargarOtrasDelegaciones(e.target.checked)}
                    className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-blue-950 block text-xs flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>¿Permitir realizar recargos de servicio a otras delegaciones?</span>
                      {formRol === 'superusuario' && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          Automático (Superusuario)
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-blue-900 block mt-0.5 leading-relaxed">
                      Habilita al usuario a seleccionar una delegación distinta a la propia al momento de programar un <strong>Recargo de Servicio</strong>.
                    </span>
                  </div>
                </label>
              </div>

              {/* Permiso Especial: Confirmar y Validar Fotografías de Inspecciones Oculares */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5 shadow-2xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRol === 'superusuario' ? true : formPuedeConfirmarFotografias}
                    disabled={formRol === 'superusuario'}
                    onChange={(e) => setFormPuedeConfirmarFotografias(e.target.checked)}
                    className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block text-xs flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>¿Permitir confirmar y validar cantidad de fotografías de Inspecciones Oculares (I.O.)?</span>
                      {formRol === 'superusuario' && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                          Automático (Superusuario)
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-amber-900 block mt-0.5 leading-relaxed">
                      Autoriza al usuario a hacer clic sobre el estado de fotografías de una I.O. para otorgar <strong>conformidad fotográfica oficial</strong> y validar las tomas fotográficas registradas por el perito / fotógrafo.
                    </span>
                  </div>
                </label>
              </div>

              {/* Módulos Permitidos */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Módulos Permitidos en el Sistema *
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Seleccione las secciones que este usuario podrá visualizar en el menú
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllModulos}
                    className="text-blue-700 hover:underline font-bold text-xs cursor-pointer"
                  >
                    {formModulosPermitidos.length === MODULOS_DISPONIBLES.length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {MODULOS_DISPONIBLES.map((m) => {
                    const isChecked = formModulosPermitidos.includes(m.id);
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR ROL */}
      <RolModal
        isOpen={isRolModalOpen}
        onClose={() => setIsRolModalOpen(false)}
        rolToEdit={editingRol}
        onSaveRol={(rol) => {
          if (onSaveRol) {
            onSaveRol(rol);
          }
        }}
      />

      {/* MODAL CONFIRMAR ELIMINACIÓN DE USUARIO */}
      <ConfirmModal
        isOpen={deleteConfirmUser.isOpen}
        title="Eliminar Usuario"
        message={`¿Confirma eliminar definitivamente al usuario @${deleteConfirmUser.user?.username || ''} (${deleteConfirmUser.user?.apellidoYNombre || ''})?`}
        confirmLabel="Eliminar Usuario"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirmUser.user) {
            onDeleteUsuario(deleteConfirmUser.user.id);
          }
        }}
        onClose={() => setDeleteConfirmUser({ isOpen: false, user: null })}
      />

      {/* MODAL CONFIRMAR ELIMINACIÓN DE ROL */}
      <ConfirmModal
        isOpen={deleteConfirmRol.isOpen}
        title="Eliminar Rol Institucional"
        message={`¿Confirma eliminar definitivamente el rol "${deleteConfirmRol.rol?.nombre || ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar Rol"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirmRol.rol && onDeleteRol) {
            onDeleteRol(deleteConfirmRol.rol.id);
          }
        }}
        onClose={() => setDeleteConfirmRol({ isOpen: false, rol: null })}
      />
    </div>
  );
};
