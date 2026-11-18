import { db } from '../db/database';
import { UsuarioSistema, RegistroAuditoria } from '../types/police';
import { authFetch, getAuthToken } from './securityClient';

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

    if (navigator.onLine && getAuthToken()) {
      try {
        const res = await authFetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modulo: params.modulo,
            accion: params.accion,
            descripcion: params.descripcion,
            detalles: params.detalles,
            delegacionId: params.delegacionId || user?.delegacionId,
            delegacionNombre: params.delegacionNombre,
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.record) {
            await db.auditoria.put(data.record);
          }
        }
      } catch {
        // Fallback offline: permanece en Dexie local
      }
    }
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}
