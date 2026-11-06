import React from 'react';
import { ParteNovedadesGuardia, IntervencionParte } from '../../types/police';
import { X, ShieldAlert, Plus, Eye, Car, MapPin, Clock, Building2 } from 'lucide-react';

interface DetalleIntervencionesTipoModalProps {
  parte: ParteNovedadesGuardia;
  tipo: 'LC' | 'SegVial';
  onNuevaIntervencion: (tipoDefault: 'Criminalística' | 'Accidentológica') => void;
  onEditarIntervencion: (interv: IntervencionParte) => void;
  onClose: () => void;
}

export const DetalleIntervencionesTipoModal: React.FC<DetalleIntervencionesTipoModalProps> = ({
  parte,
  tipo,
  onNuevaIntervencion,
  onEditarIntervencion,
  onClose,
}) => {
  const isLC = tipo === 'LC';
  const titulo = isLC
    ? 'Labor Criminalística (LC) - Hechos no de Tránsito'
    : 'Seguridad Vial (Seg. Vial) - Siniestros y Hechos Viales';

  // Filtrar intervenciones
  const intervencionesFiltradas = parte.intervenciones.filter((i) => {
    const hecho = (i.hecho || '').toUpperCase();
    const isVial =
      i.tipoIntervencion === 'Accidentológica' ||
      hecho.includes('SINIESTRO') ||
      hecho.includes('VIAL') ||
      hecho.includes('TRÁNSITO') ||
      hecho.includes('TRANSITO') ||
      hecho.includes('COLISIÓN');

    return isLC ? !isVial : isVial;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`p-4 text-white flex items-center justify-between ${
            isLC
              ? 'bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900'
              : 'bg-linear-to-r from-amber-900 via-orange-900 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              {isLC ? (
                <ShieldAlert className="w-5 h-5 text-blue-200" />
              ) : (
                <Car className="w-5 h-5 text-amber-200" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">{titulo}</h2>
              <p className="text-xs opacity-80">
                Guardia: {parte.tipoGuardia || parte.grupoGuardia} ({parte.fechaInicio} {parte.horaInicio} a {parte.fechaFin} {parte.horaFin})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">
              INTERVENCIONES REGISTRADAS ({intervencionesFiltradas.length})
            </span>
            <button
              onClick={() => {
                onNuevaIntervencion(isLC ? 'Criminalística' : 'Accidentológica');
                onClose();
              }}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Cargar Intervención {isLC ? 'LC' : 'Seg. Vial'}</span>
            </button>
          </div>

          {intervencionesFiltradas.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
              <p className="text-sm font-medium">
                No hay intervenciones de {isLC ? 'Labor Criminalística' : 'Seguridad Vial'} registradas en esta guardia.
              </p>
              <button
                onClick={() => {
                  onNuevaIntervencion(isLC ? 'Criminalística' : 'Accidentológica');
                  onClose();
                }}
                className="mt-3 text-xs text-blue-800 font-bold hover:underline"
              >
                + Registrar la primera intervención ahora
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {intervencionesFiltradas.map((interv) => (
                <div
                  key={interv.id}
                  className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-2xs space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono font-bold text-blue-900 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {interv.codigoIntervencion || `INTERVENCIÓN Nº ${interv.nroCorrelativo}`}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {interv.hecho}
                      </h4>
                    </div>

                    <button
                      onClick={() => {
                        onEditarIntervencion(interv);
                        onClose();
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver / Editar</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {interv.inspeccionFecha} - {interv.inspeccionHora} hs.
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{interv.inspeccionLugar || 'Lugar s/d'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:col-span-3">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Solicitante: {interv.dependencia} ({interv.solicitudVia})</span>
                    </div>
                  </div>

                  {interv.sintesisHecho && (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg text-[11px] line-clamp-2">
                      <span className="font-semibold">Síntesis: </span>
                      {interv.sintesisHecho}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
