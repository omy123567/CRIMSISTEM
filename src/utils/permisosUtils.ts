import { UsuarioSistema } from '../types/police';

export interface CrudPermissions {
  isSuperUser: boolean;
  isSoloLectura: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function getCrudPermissions(currentUser?: UsuarioSistema | null): CrudPermissions {
  if (!currentUser) {
    return {
      isSuperUser: false,
      isSoloLectura: false,
      canCreate: true,
      canEdit: true,
      canDelete: false,
    };
  }

  const isSuperUser = currentUser.rol === 'superusuario';
  const isSoloLectura = Boolean(
    currentUser.esSoloLectura || currentUser.rol === 'Solo Lectura (Auditor / Consulta)'
  );
  const canCreate = !isSoloLectura && (isSuperUser || currentUser.puedeCrear !== false);
  const canEdit = !isSoloLectura && (isSuperUser || currentUser.puedeModificar !== false);
  const canDelete =
    !isSoloLectura &&
    (isSuperUser ||
      (currentUser.puedeEliminar !== false &&
        (currentUser.puedeEliminar === true || currentUser.rol === 'Administrador')));

  return {
    isSuperUser,
    isSoloLectura,
    canCreate,
    canEdit,
    canDelete,
  };
}

export function isUserModuleAllowed(
  currentUser: UsuarioSistema | null | undefined,
  moduleId: string
): boolean {
  if (!currentUser) return true;
  if (moduleId === 'auditoria') {
    return currentUser.rol === 'superusuario';
  }
  if (currentUser.rol === 'superusuario') return true;
  if (
    moduleId === 'usuarios' &&
    (currentUser.puedeCambiarPasswordOtros ||
      currentUser.puedeGestionar2faOtros ||
      currentUser.accionesPersonalizadas?.puedeCambiarPasswordOtros ||
      currentUser.accionesPersonalizadas?.puedeGestionar2faOtros)
  ) {
    return true;
  }
  if (Array.isArray(currentUser.modulosPermitidos)) {
    return currentUser.modulosPermitidos.includes(moduleId);
  }
  if (currentUser.rol === 'Administrador') return true;
  if (moduleId === 'usuarios' || moduleId === 'config') return false;
  return true;
}
