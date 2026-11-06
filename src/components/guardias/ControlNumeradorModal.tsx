import React, { useState } from 'react';
import { ConfiguracionSistema, UsuarioSistema } from '../../types/police';
import {
  X,
  Hash,
  Clock,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Shield,
  Sparkles,
  Car,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { registrarAuditoria } from '../../services/auditService';

interface ControlNumeradorModalProps {
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSaveConfig: (updatedConfig: ConfiguracionSistema) => void;
  onClose: () => void;
}

export const ControlNumeradorModal: React.FC<ControlNumeradorModalProps> = ({
  config,
  currentUser,
  onSaveConfig,
  onClose,
}) => {
  // Permiso de reseteo: solo Superusuario o usuarios con permiso explícito
  const puedeResetear =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeResetearContadores);

  // Contadores Criminalística (LC)
  const [inicioCrim, setInicioCrim] = useState<number>(
    config.inicioNroIntervencionCriminalistica || 3800
  );
  const [ultimoCrim, setUltimoCrim] = useState<number>(
    config.ultimoNroIntervencionCriminalistica || 3812
  );

  // Contadores Accidentología (Seg. Vial)
  const [inicioAcc, setInicioAcc] = useState<number>(
    config.inicioNroIntervencionAccidentologica || 2500
  );
  const [ultimoAcc, setUltimoAcc] = useState<number>(
    config.ultimoNroIntervencionAccidentologica || 2584
  );

  // Contadores Inspecciones Oculares (I.O.)
  const [inicioIO, setInicioIO] = useState<number>(
    config.inicioNroIO || 1
  );
  const [ultimoIO, setUltimoIO] = useState<number>(
    config.ultimoNroIO ?? 0
  );

  const [ultimaHora, setUltimaHora] = useState<string>(
    config.ultimaHoraIntervencion || '18:28 hs.'
  );
  const [siglas, setSiglas] = useState<string>(config.siglasDependencia || 'DPC');
  const añoActual = new Date().getFullYear();

  // Modal de confirmación para reseteo
  const [resetModalState, setResetModalState] = useState<{
    isOpen: boolean;
    tipo: 'Criminalística' | 'Accidentológica' | 'Inspecciones Oculares' | null;
  }>({ isOpen: false, tipo: null });

  const handleResetCrim = () => {
    if (!puedeResetear) {
      alert('No cuenta con el permiso requerido para resetear contadores.');
      return;
    }
    setResetModalState({ isOpen: true, tipo: 'Criminalística' });
  };

  const handleResetAcc = () => {
    if (!puedeResetear) {
      alert('No cuenta con el permiso requerido para resetear contadores.');
      return;
    }
    setResetModalState({ isOpen: true, tipo: 'Accidentológica' });
  };

  const handleResetIO = () => {
    if (!puedeResetear) {
      alert('No cuenta con el permiso requerido para resetear contadores.');
      return;
    }
    setResetModalState({ isOpen: true, tipo: 'Inspecciones Oculares' });
  };

  const handleConfirmReset = async () => {
    if (!puedeResetear) return;
    const tipo = resetModalState.tipo;

    if (tipo === 'Criminalística') {
      setInicioCrim(1);
      setUltimoCrim(0);
      await registrarAuditoria({
        currentUser,
        modulo: 'Contadores',
        accion: 'RESETEO_CONTADOR',
        descripcion: 'Reseteo de contador oficial de Intervención Criminalística (LC) a N° 0001.',
      });
    } else if (tipo === 'Accidentológica') {
      setInicioAcc(1);
      setUltimoAcc(0);
      await registrarAuditoria({
        currentUser,
        modulo: 'Contadores',
        accion: 'RESETEO_CONTADOR',
        descripcion: 'Reseteo de contador oficial de Intervención Accidentológica (Seg. Vial) a N° 0001.',
      });
    } else if (tipo === 'Inspecciones Oculares') {
      setInicioIO(1);
      setUltimoIO(0);
      await registrarAuditoria({
        currentUser,
        modulo: 'Contadores',
        accion: 'RESETEO_CONTADOR',
        descripcion: 'Reseteo de contador oficial de Inspecciones Oculares (I.O.) a N° 001.',
      });
    }
    setResetModalState({ isOpen: false, tipo: null });
  };

  const handleSetHoraActual = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setUltimaHora(`${hh}:${mm} hs.`);
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      inicioNroIntervencionCriminalistica: inicioCrim,
      ultimoNroIntervencionCriminalistica: ultimoCrim,
      inicioNroIntervencionAccidentologica: inicioAcc,
      ultimoNroIntervencionAccidentologica: ultimoAcc,
      inicioNroIO: inicioIO,
      ultimoNroIO: ultimoIO,
      ultimaHoraIntervencion: ultimaHora,
      siglasDependencia: siglas.trim(),
    });
    onClose();
  };

  const proximoCrim = Math.max(inicioCrim, ultimoCrim + 1);
  const proximoAcc = Math.max(inicioAcc, ultimoAcc + 1);
  const proximoIO = Math.max(inicioIO, ultimoIO + 1);

  const codigoEjemploCrim = `INTERVENCIÓN CRIMINALÍSTICA Nº    ${proximoCrim}    /${añoActual}-${siglas}.`;
  const codigoEjemploAcc = `INTERVENCIÓN ACCIDENTOLÓGICA Nº    ${proximoAcc}    /${añoActual}-${siglas}.`;
  const codigoEjemploIO = `I.O. Nº ${String(proximoIO).padStart(3, '0')}/${añoActual}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-950 via-slate-900 to-indigo-950 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Hash className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Control y Configuración de Numeradores Oficiales
              </h2>
              <p className="text-xs text-blue-200">
                Ajuste del número inicial, correlativos y reseteo anual para Criminalística y Accidentología
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Alerta si el usuario no tiene permiso de reseteo */}
          {!puedeResetear && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Acceso en Modo Consulta</span>
                <span>
                  Solo los usuarios con el permiso específico de <strong>Resetear Contadores</strong> o Superusuario pueden restablecer a 0001 o alterar los numeradores oficiales.
                </span>
              </div>
            </div>
          )}

          {/* SECCIÓN 1: INTERVENCIÓN CRIMINALÍSTICA */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 uppercase tracking-wide text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>INTERVENCIÓN CRIMINALÍSTICA (LC)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                Próximo N°: #{proximoCrim}
              </span>
            </div>

            <div className="p-2.5 bg-white border border-blue-200 rounded-lg font-mono font-bold text-blue-950 text-xs sm:text-sm text-center shadow-2xs">
              {codigoEjemploCrim}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Inicio (Inicio Anual):
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={!puedeResetear}
                  value={inicioCrim}
                  onChange={(e) => setInicioCrim(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Último N° Registrado:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoCrim((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold disabled:opacity-40"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="0"
                    disabled={!puedeResetear}
                    value={ultimoCrim}
                    onChange={(e) => setUltimoCrim(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-center disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoCrim((p) => p + 1)}
                    className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded font-bold disabled:opacity-40"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {puedeResetear && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetCrim}
                  className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetear Criminalística a N° 0001</span>
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: INTERVENCIÓN ACCIDENTOLÓGICA */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-950 uppercase tracking-wide text-xs flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-700" />
                <span>INTERVENCIÓN ACCIDENTOLÓGICA (Seg. Vial)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                Próximo N°: #{proximoAcc}
              </span>
            </div>

            <div className="p-2.5 bg-white border border-amber-200 rounded-lg font-mono font-bold text-amber-950 text-xs sm:text-sm text-center shadow-2xs">
              {codigoEjemploAcc}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Inicio (Inicio Anual):
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={!puedeResetear}
                  value={inicioAcc}
                  onChange={(e) => setInicioAcc(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Último N° Registrado:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoAcc((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold disabled:opacity-40"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="0"
                    disabled={!puedeResetear}
                    value={ultimoAcc}
                    onChange={(e) => setUltimoAcc(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-center disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoAcc((p) => p + 1)}
                    className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-bold disabled:opacity-40"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {puedeResetear && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetAcc}
                  className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetear Accidentológica a N° 0001</span>
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: INSPECCIONES OCULARES (I.O.) */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-indigo-950 uppercase tracking-wide text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-indigo-700" />
                <span>INSPECCIONES OCULARES (I.O.)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                Próxima I.O.: #{proximoIO}
              </span>
            </div>

            <div className="p-2.5 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-indigo-950 text-xs sm:text-sm text-center shadow-2xs">
              {codigoEjemploIO}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Inicio (Inicio desde 1):
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={!puedeResetear}
                  value={inicioIO}
                  onChange={(e) => setInicioIO(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Última I.O. Registrada (Contador):
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoIO((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold disabled:opacity-40"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="0"
                    disabled={!puedeResetear}
                    value={ultimoIO}
                    onChange={(e) => setUltimoIO(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-center disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={!puedeResetear}
                    onClick={() => setUltimoIO((p) => p + 1)}
                    className="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded font-bold disabled:opacity-40"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {puedeResetear && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetIO}
                  className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetear Inspecciones Oculares a N° 001</span>
                </button>
              </div>
            )}
          </div>

          {/* Horario de última intervención y siglas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Horario de la Última Intervención:
                </label>
                {puedeResetear && (
                  <button
                    type="button"
                    onClick={handleSetHoraActual}
                    className="text-[11px] text-blue-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Usar hora actual</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={!puedeResetear}
                value={ultimaHora}
                onChange={(e) => setUltimaHora(e.target.value)}
                placeholder="18:28 hs."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Siglas de la Dependencia:
              </label>
              <input
                type="text"
                disabled={!puedeResetear}
                value={siglas}
                onChange={(e) => setSiglas(e.target.value.toUpperCase())}
                placeholder="DPC"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 uppercase disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          {puedeResetear && (
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Numeradores</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmación para reseteo a 0001 */}
      <ConfirmModal
        isOpen={resetModalState.isOpen}
        title={`¿Resetear ${resetModalState.tipo} a N° 0001?`}
        message={`Esta acción reiniciará el contador anual de ${resetModalState.tipo} a 1 (Último registrado = 0). Las próximas actuaciones comenzarán desde el número 1. ¿Confirma realizar este reseteo?`}
        confirmLabel="Sí, resetear a 0001"
        isDestructive={true}
        onConfirm={handleConfirmReset}
        onClose={() => setResetModalState({ isOpen: false, tipo: null })}
      />
    </div>
  );
};
