import React, { useState } from 'react';
import {
  CasoFaltaOficio,
  ExpedienteJudicial,
  ConfiguracionSistema,
  PersonaVinculada,
} from '../../types/police';
import { X, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface AgrupacionModalProps {
  casosSeleccionados: CasoFaltaOficio[];
  config: ConfiguracionSistema;
  onConfirmarAgrupacion: (
    nuevoExpediente: ExpedienteJudicial,
    casosAgrupadosIds: string[]
  ) => void;
  onClose: () => void;
}

export const AgrupacionModal: React.FC<AgrupacionModalProps> = ({
  casosSeleccionados,
  config,
  onConfirmarAgrupacion,
  onClose,
}) => {
  // Extraer automáticamente todas las personas vinculadas
  const todasPersonas: PersonaVinculada[] = [];
  casosSeleccionados.forEach((c) => {
    if (c.personasVinculadas && c.personasVinculadas.length > 0) {
      c.personasVinculadas.forEach((p) => {
        // Evitar duplicados por DNI si existieran
        if (!todasPersonas.some((item) => item.dni === p.dni)) {
          todasPersonas.push(p);
        }
      });
    }
  });

  // Generar el texto consolidado inicial según la regla estricta:
  // "Nómina de personas:\n1. Pérez, Juan (DNI: 12345678)\n2. Gómez, María (DNI: 87654321)"
  const resumenInicial =
    todasPersonas.length > 0
      ? `Nómina de personas vinculadas:\n` +
        todasPersonas
          .map((p, idx) => `${idx + 1}. ${p.apellidoYNombre} (DNI: ${p.dni})`)
          .join('\n') +
        `\n\nConsolidación de ${casosSeleccionados.length} actuaciones de urgencia sin oficio previo.`
      : `Consolidación de ${casosSeleccionados.length} actuaciones de urgencia sin oficio previo.`;

  const currentYear = new Date().getFullYear();
  const [nroOficioLetras, setNroOficioLetras] = useState('');
  const [anioOficio, setAnioOficio] = useState<number>(currentYear);
  const [nroExpediente, setNroExpediente] = useState('');
  const [anioExpediente, setAnioExpediente] = useState<number>(currentYear);
  const [caratulaOrigen, setCaratulaOrigen] = useState('');
  const [juzgadoFiscalia, setJuzgadoFiscalia] = useState(
    config.juzgadosFiscalias[0] || 'UFI N° 1'
  );
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState(
    casosSeleccionados[0]?.dependenciaSolicitante || config.dependenciasPoliciales[0]
  );
  const [tipoRequerimiento, setTipoRequerimiento] = useState(
    casosSeleccionados[0]?.tipoRequerimiento || 'Resguardo de Evidencia'
  );
  const [resumenEditable, setResumenEditable] = useState(resumenInicial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroOficioLetras.trim() && !nroExpediente.trim()) {
      alert('Debe ingresar el N° de Oficio o N° de Expediente judicial formal');
      return;
    }

    // Tarea consolidada preservando detalles
    const tareasConsolidadas = casosSeleccionados
      .map(
        (c, idx) =>
          `[Intervención ${idx + 1} - ${c.fechaRegistro}]: ${c.tareaRealizada}`
      )
      .join(' // ');

    const nuevoExp: ExpedienteJudicial = {
      id: 'exp-' + Date.now(),
      nroOficioLetras,
      anioOficio: anioOficio || currentYear,
      nroExpediente,
      anioExpediente: anioExpediente || currentYear,
      caratulaOrigen: caratulaOrigen || `ACTUACIONES AGRUPADAS - ${dependenciaSolicitante}`,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      juzgadoFiscalia,
      dependenciaSolicitante,
      tipoOficio: config.tiposOficio[0] || 'Instrucción Penal Preparatoria (IPP)',
      tipoRequerimiento,
      tareaRealizada: tareasConsolidadas,
      resumen: resumenEditable,
      observaciones: `Causa judicial consolidada a partir de ${casosSeleccionados.length} intervenciones previas de falta de oficio.`,
      estadoEntrega: 'No entregado',
      ppi: { tienePPI: false },
      personasVinculadas: todasPersonas,
      casosAgrupadosIds: casosSeleccionados.map((c) => c.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onConfirmarAgrupacion(
      nuevoExp,
      casosSeleccionados.map((c) => c.id)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Agrupación y Consolidación de Casos en Oficio Judicial
              </h2>
              <p className="text-xs text-slate-300">
                Se vincularán {casosSeleccionados.length} casos preliminares a un único expediente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Regla estricta de agrupación policial:</div>
              <div>
                Se han extraído <strong>{todasPersonas.length} personas</strong> de los casos
                seleccionados para el Resumen y la estadística oficial de resguardo. Cada caso
                conservará su fecha histórica para los informes periciales.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* N° de Oficio + / Año * */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  N° de Oficio / Letras Recibido *
                </label>
                <input
                  type="text"
                  required
                  value={nroOficioLetras}
                  onChange={(e) => setNroOficioLetras(e.target.value)}
                  placeholder="Ej. OF-Nº 780"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="w-24">
                <label className="block font-semibold text-slate-700 mb-1">/ Año *</label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={anioOficio}
                  onChange={(e) => setAnioOficio(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
            </div>

            {/* N° de Expediente + / Año * */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  N° de Expediente Consolidado *
                </label>
                <input
                  type="text"
                  required
                  value={nroExpediente}
                  onChange={(e) => setNroExpediente(e.target.value)}
                  placeholder="Ej. IPP-04-00-024500"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="w-24">
                <label className="block font-semibold text-slate-700 mb-1">/ Año *</label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={anioExpediente}
                  onChange={(e) => setAnioExpediente(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Carátula Judicial del Expediente
            </label>
            <input
              type="text"
              value={caratulaOrigen}
              onChange={(e) => setCaratulaOrigen(e.target.value)}
              placeholder="Ej. ACTUACIONES S/ ASOCIACIÓN ILÍCITA Y ROBOS REITERADOS"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Juzgado / Fiscalía</label>
              <select
                value={juzgadoFiscalia}
                onChange={(e) => setJuzgadoFiscalia(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {config.juzgadosFiscalias.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dependencia Solicitante</label>
              <select
                value={dependenciaSolicitante}
                onChange={(e) => setDependenciaSolicitante(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {config.dependenciasPoliciales.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Requerimiento</label>
              <select
                value={tipoRequerimiento}
                onChange={(e) => setTipoRequerimiento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
              >
                {config.tiposRequerimiento.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo Resumen Extraído Automáticamente (Editable) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-800">
                Resumen Consolidado con Nómina Automática de Personas (Editable) *
              </label>
              <span className="text-[11px] text-blue-700 font-medium">
                {todasPersonas.length} personas extraídas
              </span>
            </div>
            <textarea
              rows={6}
              required
              value={resumenEditable}
              onChange={(e) => setResumenEditable(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50/20 font-mono text-[11.5px] text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Agrupación en Expediente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
