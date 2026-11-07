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
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 rounded-lg hover:bg-emerald-900/60 transition-colors cursor-pointer"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <Server className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden sm:inline">
            {isSyncing ? 'Sincronizando...' : 'Servidor Central OK'}
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
