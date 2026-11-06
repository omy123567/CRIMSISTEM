import React, { useState, useEffect, useMemo } from 'react';
import { SerieNumerario, FolioAsignado, Personal } from '../../types/police';
import {
  X,
  FilePlus2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  Building,
  User,
  Tag,
  FileText,
} from 'lucide-react';

interface AsignarFolioModalProps {
  isOpen: boolean;
  serie: SerieNumerario;
  initialNumero?: number;
  initialRangoHasta?: number;
  existingFolios: FolioAsignado[];
  personalList: Personal[];
  onSave: (folios: FolioAsignado[]) => Promise<void> | void;
  onClose: () => void;
}

export const AsignarFolioModal: React.FC<AsignarFolioModalProps> = ({
  isOpen,
  serie,
  initialNumero,
  initialRangoHasta,
  existingFolios,
  personalList,
  onSave,
  onClose,
}) => {
  const [modo, setModo] = useState<'individual' | 'rango'>('individual');
  const [numero, setNumero] = useState<number>(initialNumero || 1);
  const [rangoHasta, setRangoHasta] = useState<number>(initialRangoHasta || initialNumero || 1);
  const [categoria, setCategoria] = useState<string>('Oficio Judicial');
  const [anio, setAnio] = useState<number>(serie.anio || new Date().getFullYear());
  const [asunto, setAsunto] = useState<string>('');
  const [destinatario, setDestinatario] = useState<string>('');
  const [solicitante, setSolicitante] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [codigoPersonalizado, setCodigoPersonalizado] = useState<string>('');
  const [usarCodigoAuto, setUsarCodigoAuto] = useState<boolean>(true);

  // Mapa de folios ocupados para detección de colisiones
  const occupiedNumbers = useMemo(() => {
    const set = new Set<number>();
    existingFolios
      .filter((f) => f.serieId === serie.id)
      .forEach((f) => set.add(f.numero));
    return set;
  }, [existingFolios, serie.id]);

  // Primer número libre disponible
  const primerNumeroLibre = useMemo(() => {
    for (let i = 1; i <= (serie.limiteFolios || 1000); i++) {
      if (!occupiedNumbers.has(i)) return i;
    }
    return 1;
  }, [occupiedNumbers, serie.limiteFolios]);

  useEffect(() => {
    if (initialNumero !== undefined) {
      setNumero(initialNumero);
      if (initialRangoHasta !== undefined && initialRangoHasta > initialNumero) {
        setModo('rango');
        setRangoHasta(initialRangoHasta);
      } else {
        setModo('individual');
        setRangoHasta(initialNumero);
      }
    } else {
      setNumero(primerNumeroLibre);
      setRangoHasta(primerNumeroLibre);
    }
  }, [initialNumero, initialRangoHasta, primerNumeroLibre, isOpen]);

  // Generación en vivo de la carátula / código oficial
  const codigoGenerado = useMemo(() => {
    if (!usarCodigoAuto && codigoPersonalizado.trim()) {
      return codigoPersonalizado.trim();
    }
    const prefijo = serie.prefijo || 'Oficio N°';
    if (modo === 'individual') {
      return `${prefijo} ${numero}/${anio}`;
    } else {
      return `${prefijo} ${numero}-${rangoHasta}/${anio}`;
    }
  }, [usarCodigoAuto, codigoPersonalizado, serie.prefijo, modo, numero, rangoHasta, anio]);

  // Detección de colisiones
  const colisiones = useMemo(() => {
    const conflictivos: number[] = [];
    if (modo === 'individual') {
      if (occupiedNumbers.has(numero)) {
        conflictivos.push(numero);
      }
    } else {
      const min = Math.min(numero, rangoHasta);
      const max = Math.max(numero, rangoHasta);
      for (let i = min; i <= max; i++) {
        if (occupiedNumbers.has(i)) {
          conflictivos.push(i);
        }
      }
    }
    return conflictivos;
  }, [modo, numero, rangoHasta, occupiedNumbers]);

  const handleSiguienteLibre = () => {
    setNumero(primerNumeroLibre);
    setRangoHasta(primerNumeroLibre);
    setModo('individual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim()) {
      alert('Por favor ingrese el Asunto u Objeto del trámite.');
      return;
    }
    if (colisiones.length > 0) {
      const msg =
        colisiones.length === 1
          ? `El folio #${colisiones[0]} ya se encuentra ocupado. Debe liberar el folio o seleccionar un número disponible.`
          : `Los folios #${colisiones.join(', #')} ya se encuentran ocupados dentro del rango solicitado. Corrija los números antes de continuar.`;
      alert(msg);
      return;
    }

    const fechaHoy = new Date().toISOString().slice(0, 10);
    const horaActual = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const foliosAGuardar: FolioAsignado[] = [];

    if (modo === 'individual') {
      foliosAGuardar.push({
        id: `fol-${serie.id}-${numero}-${Date.now()}`,
        serieId: serie.id,
        numero,
        codigoCaratula: codigoGenerado,
        categoriaDocumento: categoria,
        anio,
        asunto: asunto.trim(),
        destinatario: destinatario.trim(),
        solicitante: solicitante.trim(),
        observaciones: observaciones.trim(),
        esRango: false,
        fechaAsignacion: fechaHoy,
        horaAsignacion: horaActual,
        delegacionId: serie.delegacionId,
        createdAt: new Date().toISOString(),
      });
    } else {
      const min = Math.min(numero, rangoHasta);
      const max = Math.max(numero, rangoHasta);
      for (let num = min; num <= max; num++) {
        foliosAGuardar.push({
          id: `fol-${serie.id}-${num}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          serieId: serie.id,
          numero: num,
          codigoCaratula: codigoGenerado,
          categoriaDocumento: categoria,
          anio,
          asunto: asunto.trim(),
          destinatario: destinatario.trim(),
          solicitante: solicitante.trim(),
          observaciones: observaciones.trim(),
          esRango: true,
          rangoDesde: min,
          rangoHasta: max,
          fechaAsignacion: fechaHoy,
          horaAsignacion: horaActual,
          delegacionId: serie.delegacionId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await onSave(foliosAGuardar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200 shadow-xs">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Asignar Folio Oficial</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-900 text-blue-200 border border-blue-700">
                  {serie.nombre}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Serie correlativa {serie.prefijo} • Año {anio}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Modalidad de asignación: Individual o Rango */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Modalidad:</span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setModo('individual');
                    setRangoHasta(numero);
                  }}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                    modo === 'individual'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Número Individual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModo('rango');
                    if (rangoHasta <= numero) setRangoHasta(numero + 1);
                  }}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                    modo === 'rango'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rango Continuo (Bloque)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSiguienteLibre}
              className="text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              title="Detectar primer número libre de la serie"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>Siguiente Libre (#{primerNumeroLibre})</span>
            </button>
          </div>

          {/* Selección de Número o Rango */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
            <div>
              <label className="block font-bold text-blue-950 mb-1">
                {modo === 'individual' ? 'Número de Folio *' : 'Folio Desde *'}
              </label>
              <input
                type="number"
                required
                min={1}
                max={serie.limiteFolios || 2000}
                value={numero}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setNumero(val);
                  if (modo === 'individual') setRangoHasta(val);
                  else if (rangoHasta < val) setRangoHasta(val);
                }}
                className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-sm bg-white border ${
                  colisiones.includes(numero)
                    ? 'border-red-500 text-red-700 ring-2 ring-red-200'
                    : 'border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {modo === 'rango' && (
              <div>
                <label className="block font-bold text-blue-950 mb-1">Folio Hasta *</label>
                <input
                  type="number"
                  required
                  min={numero}
                  max={serie.limiteFolios || 2000}
                  value={rangoHasta}
                  onChange={(e) => setRangoHasta(parseInt(e.target.value, 10) || numero)}
                  className="w-full px-3 py-2 rounded-lg font-mono font-bold text-sm bg-white border border-slate-300 text-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-blue-950 mb-1">Año Oficial *</label>
              <input
                type="number"
                required
                min={2020}
                max={2035}
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value, 10) || 2026)}
                className="w-full px-3 py-2 rounded-lg font-mono font-bold text-sm bg-white border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          {/* Alerta de colisión / folios ya ocupados */}
          {colisiones.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">¡Conflicto de numerario!</span>
                <span className="text-[11px]">
                  {colisiones.length === 1
                    ? `El folio #${colisiones[0]} ya se encuentra asignado y ocupado.`
                    : `Los folios #${colisiones.join(', #')} ya se encuentran asignados.`}
                  {' '}Elija otro número libre o libere previamente el folio en conflicto.
                </span>
              </div>
            </div>
          )}

          {/* Vista previa en vivo de la Carátula */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Vista Previa de Carátula / Código Oficial:
              </span>
              <button
                type="button"
                onClick={() => setUsarCodigoAuto(!usarCodigoAuto)}
                className="text-[10px] text-blue-300 hover:text-white underline cursor-pointer"
              >
                {usarCodigoAuto ? 'Personalizar código' : 'Volver a automático'}
              </button>
            </div>
            {usarCodigoAuto ? (
              <div className="text-base font-bold font-mono tracking-tight text-blue-300">
                {codigoGenerado}
              </div>
            ) : (
              <input
                type="text"
                value={codigoPersonalizado}
                onChange={(e) => setCodigoPersonalizado(e.target.value)}
                placeholder={codigoGenerado}
                className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-blue-400"
              />
            )}
            {modo === 'rango' && (
              <p className="text-[11px] text-amber-300 font-medium">
                Se asignarán <strong>{Math.max(1, rangoHasta - numero + 1)} folios continuos</strong> correlativamente (del #{numero} al #{rangoHasta}).
              </p>
            )}
          </div>

          {/* Categoría y Destinatario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-700" />
                <span>Categoría / Tipo de Trámite *</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="Oficio Judicial">Oficio Judicial</option>
                <option value="Oficio Vicedirección">Oficio Vicedirección</option>
                <option value="Memorándum">Memorándum</option>
                <option value="Expediente Pericial">Expediente Pericial</option>
                <option value="Nota Interna">Nota Interna</option>
                <option value="Circular General">Circular General</option>
                <option value="Dictamen Pericial">Dictamen Pericial</option>
                <option value="Causa Penal">Causa Penal</option>
                <option value="Actuación Prevencional">Actuación Prevencional</option>
                <option value="Resolución">Resolución</option>
                <option value="Otro">Otro Trámite</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-blue-700" />
                <span>Destinatario / Organismo *</span>
              </label>
              <input
                type="text"
                required
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="Ej. Juzgado de Instrucción N° 2 / Comisaría Laguna Blanca..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              />
            </div>
          </div>

          {/* Solicitante / Iniciador (Buscable y con efectivos de la delegación) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-700" />
              <span>Solicitante / Iniciador del Trámite</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                list="lista-personal-numerario"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                placeholder="Seleccione de la nómina o redacte jerarquía y nombre..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              />
              <datalist id="lista-personal-numerario">
                {personalList.map((p) => (
                  <option
                    key={p.id}
                    value={`${p.jerarquia} ${p.apellidoYNombre} (DNI ${p.dni} - Plaza ${p.plaza || 'S/D'})`}
                  />
                ))}
              </datalist>
            </div>
          </div>

          {/* Asunto / Objeto del Trámite (Requerido) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Asunto / Objeto del Trámite *</span>
            </label>
            <textarea
              required
              rows={3}
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Describa el contenido o motivo del trámite foliado..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observaciones / Notas de Entrega (Opcional)
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Constancia de remisión, recibo, anexos..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={colisiones.length > 0}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {modo === 'individual' ? `Confirmar Folio #${numero}` : `Asignar Rango #${numero} al #${rangoHasta}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
