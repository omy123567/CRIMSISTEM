import React, { useState, useEffect } from 'react';
import {
  AccidentologiaRegistro,
  Personal,
  IntervencionParte,
  ConfiguracionSistema,
  DelegacionPolicial,
} from '../../types/police';
import {
  X,
  Car,
  Shield,
  FileText,
  AlertTriangle,
  User,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface AccidentologiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: AccidentologiaRegistro) => void;
  registroEditar?: AccidentologiaRegistro | null;
  personalList?: Personal[];
  intervencionesList?: IntervencionParte[];
  config: ConfiguracionSistema;
  activeDelegacionId?: string;
  delegacionesList?: DelegacionPolicial[];
  registrosExistentes?: AccidentologiaRegistro[];
}

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Función para calcular código correlativo mensual ej: Ene-01, Feb-02
export function calcularCodigoMensual(fechaStr: string, registros: AccidentologiaRegistro[], idActual?: string): string {
  const d = fechaStr ? new Date(fechaStr + 'T12:00:00') : new Date();
  const mesIdx = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  const mesTag = MESES_ABREV[mesIdx] || 'Ene';
  const anio = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();

  // Filtrar registros del mismo mes y año
  const registrosDelMes = (registros || []).filter((r) => {
    if (idActual && r.id === idActual) return false;
    const rDate = new Date(r.fecha + 'T12:00:00');
    return !isNaN(rDate.getTime()) && rDate.getMonth() === mesIdx && rDate.getFullYear() === anio;
  });

  const correlativo = registrosDelMes.length + 1;
  const numPad = correlativo < 10 ? `0${correlativo}` : `${correlativo}`;
  return `${mesTag}-${numPad}`;
}

export const AccidentologiaModal: React.FC<AccidentologiaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  registroEditar,
  personalList = [],
  intervencionesList = [],
  config,
  activeDelegacionId = 'del-laguna-blanca',
  delegacionesList = [],
  registrosExistentes = [],
}) => {
  const hoyStr = new Date().toISOString().slice(0, 10);
  const diaHoy = DIAS_SEMANA[new Date().getDay()];

  // Form state inicial
  const [formData, setFormData] = useState<AccidentologiaRegistro>(() => {
    if (registroEditar) return { ...registroEditar };
    return {
      id: `acc-${Date.now()}`,
      codigo: calcularCodigoMensual(hoyStr, registrosExistentes),
      delegacionId: activeDelegacionId,
      fecha: hoyStr,
      dia: diaHoy,
      localidad: config.ciudadDependencia || 'Laguna Blanca',
      lugarOcurrido: '',
      horarioOcurrido: '08:00 hs.',
      dependenciaInterviniente: config.dependencia || 'Comisaría Seccional Laguna Blanca',
      tipoSiniestro: 'Colisión por alcance',
      zona: 'Urbana',
      tipoVia: 'RECTA',
      tipoCalzada: 'Asfalto',
      estadoCalzada: 'Bueno',
      senalizacion: 'SI',
      anguloVisual: 'Bueno',
      iluminacion: 'Bueno',
      estadoClima: 'Despejado',
      observacionesSiniestro: '',

      // 2° Módulo
      jerarquia: 'Oficial Principal',
      apellidoYNombre: '',
      edad: 32,
      destino: config.dependencia || 'Delegación Policía Científica',
      unidadRegional: config.unidadRegional || 'UR-4',
      situacionLaboral: 'ACTIVO',
      situacionServicio: 'ENTRANTE',
      tipoServicio: 'ENTRANTE',
      vestimenta: 'UNIFORMADO',
      tipoLesiones: 'Sin Lesiones',
      alcohotest: '0.00 g/l (Negativo)',
      observacionesPersonal: '',

      // 3° Módulo
      tipoRodadoPolicial: 'Motocicleta oficial',
      tipoRodadoOtros: 'Automóvil particular',
      otrosInvolucrados: 'Ninguno',
      cascoPolicial: 'Colocado',
      cascoOtro: 'No aplica',
      resultadoPolicial: 'EMBESTIDO',
      persPolHuellas: 'FRENADA',
      personalPolicialDinamica: 'CAIDA',
      evidencias: '',

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeTabSub, setActiveTabSub] = useState<'modulo1' | 'modulo2' | 'modulo3'>('modulo1');
  const [selectedIntervId, setSelectedIntervId] = useState<string>('');

  // Actualizar día y código si cambia la fecha y es nuevo registro
  const handleFechaChange = (newFecha: string) => {
    const d = new Date(newFecha + 'T12:00:00');
    const nuevoDia = !isNaN(d.getTime()) ? DIAS_SEMANA[d.getDay()] : formData.dia;
    const nuevoCod = !registroEditar
      ? calcularCodigoMensual(newFecha, registrosExistentes, formData.id)
      : formData.codigo;

    setFormData((prev) => ({
      ...prev,
      fecha: newFecha,
      dia: nuevoDia,
      codigo: nuevoCod,
    }));
  };

  // Autocompletar desde intervención seleccionada
  const handleImportFromIntervencion = (intervId: string) => {
    setSelectedIntervId(intervId);
    const interv = intervencionesList.find((i) => i.id === intervId);
    if (!interv) return;

    const fechaInterv = interv.inspeccionFecha || formData.fecha;
    const horaInterv = interv.inspeccionHora ? `${interv.inspeccionHora} hs.` : formData.horarioOcurrido;
    const lugarInterv = interv.inspeccionLugar || interv.direccion || '';
    const depInterv = interv.dependencia || formData.dependenciaInterviniente;

    // Detectar si hay policía involucrado en la intervención
    const pol = interv.personalPolicial;
    const veh = interv.vehiculosSiniestro?.[0];

    setFormData((prev) => ({
      ...prev,
      intervencionId: interv.id,
      fecha: fechaInterv,
      dia: !isNaN(new Date(fechaInterv + 'T12:00:00').getTime())
        ? DIAS_SEMANA[new Date(fechaInterv + 'T12:00:00').getDay()]
        : prev.dia,
      codigo: !registroEditar
        ? calcularCodigoMensual(fechaInterv, registrosExistentes, prev.id)
        : prev.codigo,
      lugarOcurrido: lugarInterv || prev.lugarOcurrido,
      horarioOcurrido: horaInterv,
      dependenciaInterviniente: depInterv,
      tipoSiniestro: interv.hecho || prev.tipoSiniestro,
      observacionesSiniestro: interv.sintesisHecho || prev.observacionesSiniestro,
      // Si tiene datos del personal policial
      jerarquia: pol?.jerarquia || prev.jerarquia,
      apellidoYNombre: pol?.apellidoYNombre || prev.apellidoYNombre,
      destino: pol?.destino || prev.destino,
      tipoLesiones: pol?.tipoLesion || prev.tipoLesiones,
      // Si tiene rodados
      tipoRodadoPolicial: pol?.tipoRodado || veh?.tipo || prev.tipoRodadoPolicial,
      tipoRodadoOtros: veh ? `${veh.marca || ''} ${veh.modelo || ''} (${veh.tipo})`.trim() : prev.tipoRodadoOtros,
      evidencias: interv.laborCriminalistica || prev.evidencias,
    }));
  };

  // Autocompletar desde nómina de personal
  const handleSelectPersonal = (persId: string) => {
    const p = personalList.find((it) => it.id === persId);
    if (!p) return;
    setFormData((prev) => ({
      ...prev,
      jerarquia: p.jerarquia,
      apellidoYNombre: p.apellidoYNombre,
      destino: p.seccionGrupo || prev.destino,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lugarOcurrido.trim()) {
      alert('Debe ingresar el Lugar de Ocurrido (Calle / Ruta / Altura)');
      setActiveTabSub('modulo1');
      return;
    }
    if (!formData.apellidoYNombre.trim()) {
      alert('Debe ingresar el Apellido y Nombre del Personal Policial Involucrado');
      setActiveTabSub('modulo2');
      return;
    }
    onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Encabezado del Modal con Código y Delegación */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-4 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <Car className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  {registroEditar ? 'Editar Registro de Accidentología' : 'Nuevo Registro de Accidentología Vial'}
                </h2>
                <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-xs">
                  CÓDIGO: {formData.codigo}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Una intervención completa simultáneamente los tres módulos de investigación pericial.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Autocompletado rápido desde Intervención */}
        {intervencionesList.length > 0 && (
          <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-blue-950 font-semibold">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span>Autocompletar desde Intervención de Guardia:</span>
            </div>
            <select
              value={selectedIntervId}
              onChange={(e) => handleImportFromIntervencion(e.target.value)}
              className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-slate-800 text-xs font-medium focus:ring-1 focus:ring-blue-600 outline-none"
            >
              <option value="">-- Seleccionar intervención registrada para importar datos --</option>
              {intervencionesList.map((iv) => (
                <option key={iv.id} value={iv.id}>
                  #{iv.nroCorrelativo || 'S/N'} ({iv.inspeccionFecha}) - {iv.hecho} - {iv.direccion || iv.inspeccionLugar}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pestañas de Navegación de los 3 Módulos */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTabSub('modulo1')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTabSub === 'modulo1'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1° Módulo: Siniestro Vial</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSub('modulo2')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTabSub === 'modulo2'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>2° Módulo: Datos Generales (Efectivo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTabSub('modulo3')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTabSub === 'modulo3'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>3° Módulo: Rodados & Dinámica</span>
          </button>
        </div>

        {/* Contenido scrolleable del formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
          {/* ======================================================== */}
          {/* PRIMER MÓDULO: SINIESTROS VIALES CON PERS. POLICIAL */}
          {/* ======================================================== */}
          {activeTabSub === 'modulo1' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-blue-950 uppercase tracking-wide">
                    SINIESTROS VIALES CON PERSONAL POLICIAL INVOLUCRADO
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Datos cronológicos, topográficos, condiciones de la vía, calzada y clima del lugar del hecho.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-600 text-[11px]">Código Asignado:</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-24 px-2 py-1 font-mono font-bold bg-amber-50 border border-amber-300 rounded text-center text-slate-900"
                    title="Código correlativo por mes ej. Ene-01, Feb-02"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha del Hecho *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleFechaChange(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Día</label>
                  <input
                    type="text"
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-medium"
                    placeholder="Lunes, Martes..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horario de Ocurrido *</label>
                  <input
                    type="text"
                    value={formData.horarioOcurrido}
                    onChange={(e) => setFormData({ ...formData, horarioOcurrido: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-600 outline-none"
                    placeholder="ej: 07:45 hs."
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Localidad *</label>
                  <input
                    type="text"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-600 outline-none"
                    placeholder="Laguna Blanca, Clorinda..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Lugar de Ocurrido (Calle / Ruta / Altura) *</label>
                  <input
                    type="text"
                    value={formData.lugarOcurrido}
                    onChange={(e) => setFormData({ ...formData, lugarOcurrido: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-600 outline-none"
                    placeholder="ej. Av. San Martín e Hipólito Irigoyen / Ruta Nac. 86 Km 1320"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dependencia Interviniente</label>
                  <input
                    type="text"
                    value={formData.dependenciaInterviniente}
                    onChange={(e) => setFormData({ ...formData, dependenciaInterviniente: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-600 outline-none"
                    placeholder="Comisaría Laguna Blanca..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Siniestro</label>
                  <select
                    value={formData.tipoSiniestro}
                    onChange={(e) => setFormData({ ...formData, tipoSiniestro: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Colisión por alcance">Colisión por alcance</option>
                    <option value="Colisión frontal">Colisión frontal</option>
                    <option value="Colisión lateral">Colisión lateral</option>
                    <option value="Despiste">Despiste</option>
                    <option value="Vuelco">Vuelco</option>
                    <option value="Caída de ocupante">Caída de ocupante</option>
                    <option value="Atropello de peatón">Atropello de peatón</option>
                    <option value="Atropello de animal">Atropello de animal</option>
                    <option value="Impacto contra objeto fijo">Impacto contra objeto fijo</option>
                    <option value="Otro">Otro siniestro vial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona</label>
                  <select
                    value={formData.zona}
                    onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Urbana">Urbana</option>
                    <option value="Suburbana">Suburbana</option>
                    <option value="Rural">Rural</option>
                    <option value="Ruta">Ruta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Vía</label>
                  <select
                    value={formData.tipoVia}
                    onChange={(e) => setFormData({ ...formData, tipoVia: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="RECTA">RECTA</option>
                    <option value="INTERSECCIÓN">INTERSECCIÓN</option>
                    <option value="ROTONDA">ROTONDA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Calzada</label>
                  <input
                    type="text"
                    list="calzadas-options"
                    value={formData.tipoCalzada}
                    onChange={(e) => setFormData({ ...formData, tipoCalzada: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    placeholder="Asfalto, Tierra, Ripio..."
                  />
                  <datalist id="calzadas-options">
                    <option value="Asfalto" />
                    <option value="Tierra" />
                    <option value="Ripio" />
                    <option value="Hormigón" />
                    <option value="Adoquinado" />
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Calzada</label>
                  <select
                    value={formData.estadoCalzada}
                    onChange={(e) => setFormData({ ...formData, estadoCalzada: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Señalización</label>
                  <select
                    value={formData.senalizacion}
                    onChange={(e) => setFormData({ ...formData, senalizacion: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ángulo Visual</label>
                  <select
                    value={formData.anguloVisual}
                    onChange={(e) => setFormData({ ...formData, anguloVisual: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Iluminación</label>
                  <select
                    value={formData.iluminacion}
                    onChange={(e) => setFormData({ ...formData, iluminacion: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Clima</label>
                  <input
                    type="text"
                    list="climas-options"
                    value={formData.estadoClima}
                    onChange={(e) => setFormData({ ...formData, estadoClima: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    placeholder="Despejado, Lluvia, Neblina..."
                  />
                  <datalist id="climas-options">
                    <option value="Despejado" />
                    <option value="Nublado" />
                    <option value="Lluvia tenue" />
                    <option value="Lluvia torrencial" />
                    <option value="Neblina densa" />
                    <option value="Viento fuerte con polvo" />
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Observaciones del Siniestro</label>
                  <input
                    type="text"
                    value={formData.observacionesSiniestro || ''}
                    onChange={(e) => setFormData({ ...formData, observacionesSiniestro: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="Detalles complementarios de la visibilidad, semáforos, huellas o impacto..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SEGUNDO MÓDULO: DATOS GENERALES (PERSONAL POLICIAL) */}
          {/* ======================================================== */}
          {activeTabSub === 'modulo2' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-blue-950 uppercase tracking-wide">
                    SEGUNDO MÓDULO: DATOS GENERALES DEL PERSONAL POLICIAL
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Filiación, revista, situación laboral, tipo de servicio, vestimenta y resultado médico/alcohotest.
                  </p>
                </div>
                {personalList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-600 text-[11px]">Cargar de Nómina:</label>
                    <select
                      onChange={(e) => handleSelectPersonal(e.target.value)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs"
                    >
                      <option value="">-- Seleccionar Efectivo --</option>
                      {personalList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} {p.apellidoYNombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jerarquía *</label>
                  <input
                    type="text"
                    value={formData.jerarquia}
                    onChange={(e) => setFormData({ ...formData, jerarquia: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="Sargento, Oficial, Cabo..."
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Apellido y Nombre *</label>
                  <input
                    type="text"
                    value={formData.apellidoYNombre}
                    onChange={(e) => setFormData({ ...formData, apellidoYNombre: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                    placeholder="Apellido y Nombre completo del efectivo"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Edad</label>
                  <input
                    type="number"
                    min="18"
                    max="80"
                    value={formData.edad}
                    onChange={(e) => setFormData({ ...formData, edad: parseInt(e.target.value) || '' })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="35"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino</label>
                  <input
                    type="text"
                    value={formData.destino}
                    onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="Sección / Dependencia donde presta servicio"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad Regional</label>
                  <input
                    type="text"
                    value={formData.unidadRegional}
                    onChange={(e) => setFormData({ ...formData, unidadRegional: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="UR-1, UR-4 Laguna Blanca..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Situación Laboral</label>
                  <select
                    value={formData.situacionLaboral}
                    onChange={(e) => setFormData({ ...formData, situacionLaboral: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="LIC.">LIC.</option>
                    <option value="RETIRO">RETIRO</option>
                    <option value="A DISP. D1">A DISP. D1</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serv. Entrante / Saliente / Lic.</label>
                  <select
                    value={formData.situacionServicio}
                    onChange={(e) => setFormData({ ...formData, situacionServicio: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="ENTRANTE">ENTRANTE</option>
                    <option value="SALIENTE">SALIENTE</option>
                    <option value="LICENCIA">LICENCIA</option>
                    <option value="FRANCO">FRANCO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Servicio</label>
                  <select
                    value={formData.tipoServicio}
                    onChange={(e) => setFormData({ ...formData, tipoServicio: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="ENTRANTE">ENTRANTE</option>
                    <option value="SALIENTE">SALIENTE</option>
                    <option value="FRANCO">FRANCO</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vestimenta</label>
                  <select
                    value={formData.vestimenta}
                    onChange={(e) => setFormData({ ...formData, vestimenta: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="UNIFORMADO">UNIFORMADO</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Lesiones</label>
                  <input
                    type="text"
                    list="lesiones-options"
                    value={formData.tipoLesiones}
                    onChange={(e) => setFormData({ ...formData, tipoLesiones: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="Sin Lesiones, Leves (escoriaciones), Graves (fractura)..."
                  />
                  <datalist id="lesiones-options">
                    <option value="Sin Lesiones" />
                    <option value="Leves (escoriaciones y politraumatismos)" />
                    <option value="Graves (fractura de miembro)" />
                    <option value="Gravísimas con riesgo vital" />
                    <option value="Óbito" />
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alcohotest</label>
                  <input
                    type="text"
                    list="alcohotest-options"
                    value={formData.alcohotest}
                    onChange={(e) => setFormData({ ...formData, alcohotest: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="0.00 g/l (Negativo)..."
                  />
                  <datalist id="alcohotest-options">
                    <option value="0.00 g/l (Negativo)" />
                    <option value="Positivo (especificar dosaje)" />
                    <option value="No se realizó por urgencia médica" />
                    <option value="En espera de resultado bioquímico" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones del Personal</label>
                <textarea
                  rows={2}
                  value={formData.observacionesPersonal || ''}
                  onChange={(e) => setFormData({ ...formData, observacionesPersonal: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  placeholder="Nosocomio donde fue asistido, médico forense interviniente, reposo médico..."
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TERCER MÓDULO: RODADOS & DINÁMICA */}
          {/* ======================================================== */}
          {activeTabSub === 'modulo3' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b pb-2">
                <h3 className="font-extrabold text-sm text-blue-950 uppercase tracking-wide">
                  TERCER MÓDULO: RODADOS, ELEMENTOS DE SEGURIDAD Y DINÁMICA DEL HECHO
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rodados involucrados, uso de casco reglamentario, rol de impacto, huellas de frenada/derrape y evidencias periciales.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Rodado del Personal Policial</label>
                  <input
                    type="text"
                    list="rodados-pol-options"
                    value={formData.tipoRodadoPolicial}
                    onChange={(e) => setFormData({ ...formData, tipoRodadoPolicial: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="ej: Motocicleta oficial Honda Tornado 250cc / Móvil policial / Vehículo particular"
                  />
                  <datalist id="rodados-pol-options">
                    <option value="Motocicleta oficial Honda Tornado 250cc" />
                    <option value="Motocicleta particular 110cc" />
                    <option value="Móvil patrullero Toyota Hilux" />
                    <option value="Automóvil particular" />
                    <option value="Bicicleta" />
                    <option value="Peatón" />
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Rodado Otro/s Conductores</label>
                  <input
                    type="text"
                    list="rodados-otros-options"
                    value={formData.tipoRodadoOtros}
                    onChange={(e) => setFormData({ ...formData, tipoRodadoOtros: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="ej: Automóvil Fiat Cronos / Camioneta Ford Ranger / Sin otro rodado"
                  />
                  <datalist id="rodados-otros-options">
                    <option value="Automóvil particular" />
                    <option value="Camioneta / Pick-up" />
                    <option value="Camión de carga" />
                    <option value="Motocicleta" />
                    <option value="Bicicleta" />
                    <option value="Sin otro rodado" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Otros Involucrados</label>
                  <input
                    type="text"
                    value={formData.otrosInvolucrados}
                    onChange={(e) => setFormData({ ...formData, otrosInvolucrados: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    placeholder="Animales, postes, guardarraíl, ninguno..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Casco Protector Personal Policial</label>
                  <select
                    value={formData.cascoPolicial}
                    onChange={(e) => setFormData({ ...formData, cascoPolicial: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="Colocado">Colocado</option>
                    <option value="No colocado">No colocado</option>
                    <option value="No aplica">No aplica</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Casco Protector Otro</label>
                  <select
                    value={formData.cascoOtro}
                    onChange={(e) => setFormData({ ...formData, cascoOtro: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="Colocado">Colocado</option>
                    <option value="No colocado">No colocado</option>
                    <option value="No aplica">No aplica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Personal Policial Resultó</label>
                  <select
                    value={formData.resultadoPolicial}
                    onChange={(e) => setFormData({ ...formData, resultadoPolicial: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="EMBESTIDO">EMBESTIDO</option>
                    <option value="EMBISTENTE">EMBISTENTE</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pers. Pol. (Huellas)</label>
                  <select
                    value={formData.persPolHuellas}
                    onChange={(e) => setFormData({ ...formData, persPolHuellas: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="FRENADA">FRENADA</option>
                    <option value="DERRAPE">DERRAPE</option>
                    <option value="SIN HUELLAS">SIN HUELLAS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Personal Policial (Dinámica)</label>
                  <select
                    value={formData.personalPolicialDinamica}
                    onChange={(e) => setFormData({ ...formData, personalPolicialDinamica: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="CAIDA">CAÍDA</option>
                    <option value="ARRASTRE">ARRASTRE</option>
                    <option value="IMPACTO DIRECTO">IMPACTO DIRECTO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidencias Levantadas / Relevadas</label>
                <textarea
                  rows={3}
                  value={formData.evidencias}
                  onChange={(e) => setFormData({ ...formData, evidencias: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  placeholder="Improntas de arrastre, longitud de huella de frenada, transferencia de pintura, desprendimiento de piezas plásticas, sentido de circulación..."
                />
              </div>
            </div>
          )}

          {/* Barra inferior de acciones */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <span className="font-semibold">Módulo Activo:</span>
              <span className="font-bold text-blue-900 uppercase">
                {activeTabSub === 'modulo1' ? '1. Siniestro Vial' : activeTabSub === 'modulo2' ? '2. Datos Generales' : '3. Rodados'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {activeTabSub !== 'modulo3' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTabSub === 'modulo1') setActiveTabSub('modulo2');
                    else if (activeTabSub === 'modulo2') setActiveTabSub('modulo3');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Siguiente Módulo &rarr;
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Registro Integral</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
