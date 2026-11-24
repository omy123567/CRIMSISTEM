import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import { FeriadoDiaNoLaborable, LicenciaPolicial } from '../../types/police';
import {
  formatDateYmdLocal,
  formatFechaDisplay,
  parseYmdLocal,
} from '../../services/licenciaService';

interface InterrumpirLicenciaModalProps {
  licencia: LicenciaPolicial;
  feriados: FeriadoDiaNoLaborable[];
  onSave: (updated: LicenciaPolicial) => Promise<void> | void;
  onClose: () => void;
}

export const InterrumpirLicenciaModal: React.FC<InterrumpirLicenciaModalProps> = ({
  licencia,
  feriados,
  onSave,
  onClose,
}) => {
  const todayYmd = new Date().toISOString().slice(0, 10);
  const [fechaInterrupcion, setFechaInterrupcion] = useState<string>(
    licencia.fechaInterrupcion || (todayYmd >= licencia.fechaSalida ? todayYmd : licencia.fechaSalida)
  );
  const [motivoInterrupcion, setMotivoInterrupcion] = useState<string>(
    licencia.motivoInterrupcion || ''
  );
  const [diasEfectivamenteGozados, setDiasEfectivamenteGozados] = useState<number>(
    licencia.diasEfectivamenteGozados ?? 0
  );
  const [diasRestituidos, setDiasRestituidos] = useState<number>(
    licencia.diasRestituidos ?? licencia.diasHabilesSolicitados
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCorridos = licencia.modoComputo === 'corridos';

  // Recalcular automáticamente días efectivamente gozados y restituidos al cambiar la fecha de interrupción
  useEffect(() => {
    if (!fechaInterrupcion || !licencia.fechaSalida) return;
    const start = parseYmdLocal(licencia.fechaSalida);
    const interr = parseYmdLocal(fechaInterrupcion);
    if (!start || !interr) return;

    if (interr < start) {
      setDiasEfectivamenteGozados(0);
      setDiasRestituidos(licencia.diasHabilesSolicitados);
      return;
    }

    const feriadoSet = new Set((feriados || []).map((f) => f.fecha.slice(0, 10)));
    let gozados = 0;
    const cursor = new Date(start.getTime());
    let safety = 0;
    while (cursor <= interr && safety < 500) {
      safety++;
      if (isCorridos) {
        gozados++;
      } else {
        const day = cursor.getDay();
        const ymd = formatDateYmdLocal(cursor);
        if (day !== 0 && day !== 6 && !feriadoSet.has(ymd)) {
          gozados++;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const capped = Math.min(licencia.diasHabilesSolicitados, Math.max(0, gozados));
    setDiasEfectivamenteGozados(capped);
    setDiasRestituidos(Math.max(0, licencia.diasHabilesSolicitados - capped));
  }, [fechaInterrupcion, licencia.fechaSalida, licencia.diasHabilesSolicitados, feriados, isCorridos]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaInterrupcion) {
      setErrorMsg('Debe indicar la fecha de interrupción.');
      return;
    }
    if (!motivoInterrupcion.trim()) {
      setErrorMsg('Debe registrar el motivo de la interrupción según Art. 15.');
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      await onSave({
        ...licencia,
        fueInterrumpida: true,
        fechaInterrupcion,
        motivoInterrupcion: motivoInterrupcion.trim(),
        diasEfectivamenteGozados,
        diasRestituidos,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertInterruption = async () => {
    setSaving(true);
    try {
      await onSave({
        ...licencia,
        fueInterrumpida: false,
        fechaInterrupcion: undefined,
        motivoInterrupcion: undefined,
        diasEfectivamenteGozados: undefined,
        diasRestituidos: undefined,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden text-xs">
        <div className="bg-red-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-200" />
            <div>
              <h3 className="font-bold text-sm">Interrumpir Licencia Policial (Art. 15)</h3>
              <p className="text-[11px] text-red-200">
                Por razones urgentes de servicio — restituye automáticamente los días no gozados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-bold text-blue-900 uppercase">{licencia.jerarquia}</div>
            <div className="font-bold text-slate-900 text-sm">
              {licencia.apellidoYNombre} <span className="font-mono text-xs text-slate-600">(DNI {licencia.dni})</span>
            </div>
            <div className="text-[11px] text-slate-600">
              Licencia:{' '}
              <strong>
                {licencia.tipoLicencia}
                {licencia.subtipoEtiqueta ? ` (${licencia.subtipoEtiqueta})` : ''}
              </strong>{' '}
              • Salida: <strong className="font-mono">{formatFechaDisplay(licencia.fechaSalida)}</strong> • Solicitados:{' '}
              <strong>
                {licencia.diasHabilesSolicitados} {isCorridos ? 'd. corridos' : 'd. hábiles'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-red-900 mb-1">Fecha Interrupción *</label>
              <input
                type="date"
                required
                value={fechaInterrupcion}
                onChange={(e) => setFechaInterrupcion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días Gozados</label>
              <input
                type="number"
                min={0}
                max={licencia.diasHabilesSolicitados}
                value={diasEfectivamenteGozados}
                onChange={(e) => {
                  const goz = Math.min(
                    licencia.diasHabilesSolicitados,
                    Math.max(0, Number(e.target.value) || 0)
                  );
                  setDiasEfectivamenteGozados(goz);
                  setDiasRestituidos(Math.max(0, licencia.diasHabilesSolicitados - goz));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-emerald-800 mb-1">Días Restituidos</label>
              <input
                type="number"
                min={0}
                max={licencia.diasHabilesSolicitados}
                value={diasRestituidos}
                onChange={(e) => {
                  const rest = Math.min(
                    licencia.diasHabilesSolicitados,
                    Math.max(0, Number(e.target.value) || 0)
                  );
                  setDiasRestituidos(rest);
                  setDiasEfectivamenteGozados(Math.max(0, licencia.diasHabilesSolicitados - rest));
                }}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 font-bold text-emerald-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-red-900 mb-1">
              Motivo de la Interrupción (Art. 15) *
            </label>
            <textarea
              rows={3}
              required
              value={motivoInterrupcion}
              onChange={(e) => setMotivoInterrupcion(e.target.value)}
              placeholder="Indique la disposición superior o razones de servicio que motivan la interrupción..."
              className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            {licencia.fueInterrumpida ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleRevertInterruption}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Anular Interrupción</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-900 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Confirmar Interrupción'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
