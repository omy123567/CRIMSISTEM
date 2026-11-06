import { db } from '../db/database';
import { UsuarioSistema, RegistroAuditoria } from '../types/police';

export async function registrarAuditoria(params: {
  currentUser?: UsuarioSistema | null;
  modulo: string;
  accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'LOGIN' | 'RESETEO_CONTADOR' | 'CAMBIO_PASSWORD' | 'TRASLADO' | 'OTRO';
  descripcion: string;
  detalles?: string;
  delegacionId?: string;
  delegacionNombre?: string;
}): Promise<void> {
  try {
    const user = params.currentUser;
    const registro: RegistroAuditoria = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      fechaHora: new Date().toISOString(),
      usuarioId: user?.id || 'sistema',
      username: user?.username || 'sistema',
      apellidoYNombre: user?.apellidoYNombre || 'Sistema Automático',
      rol: user?.rol || 'Operador',
      delegacionId: params.delegacionId || user?.delegacionId || 'del-laguna-blanca',
      delegacionNombre: params.delegacionNombre,
      modulo: params.modulo,
      accion: params.accion,
      descripcion: params.descripcion,
      detalles: params.detalles,
    };

    await db.auditoria.put(registro);
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}
