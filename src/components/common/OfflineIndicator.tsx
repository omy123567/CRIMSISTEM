import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Server } from 'lucide-react';
import { subscribeToSyncStatus, ServerSyncStatus, syncWithServer } from '../../services/apiService';

export const OfflineIndicator: React.FC = () => {
  const [status, setStatus] = useState<ServerSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    serverError: null,
  });
  const [manualSyncing, setManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setManualSyncing(true);
    await syncWithServer();
    setTimeout(() => setManualSyncing(false), 500);
  };

  const isSyncing = status.isSyncing || manualSyncing;

  return (
    <div className="flex items-center gap-2 text-[11px] font-medium">
      {status.isOnline ? (
        <button
          type="button"
          onClick={handleManualSync}
          title={
            status.lastSyncTime
              ? `Servidor Ubuntu conectado. Última sincronización: ${status.lastSyncTime.toLocaleTimeString()}`
              : 'Servidor Ubuntu conectado'
          }
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
          <span className="hidden md:inline text-[11px] font-medium text-slate-300">
            {isSyncing ? 'Sincronizando...' : 'Servidor Conectado'}
          </span>
        </button>
      ) : (
        <div
          title="Modo local desconectado: Los cambios se guardan localmente y se sincronizarán al reconectar"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-600/60 text-amber-300 rounded-lg animate-pulse"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Modo Desconectado (Local)</span>
        </div>
      )}
    </div>
  );
};
