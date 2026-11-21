import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Car,
  Sparkles,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ConfiguracionSistema,
  FeriadoDiaNoLaborable,
  ImputacionAnioLicencia,
  LicenciaPolicial,
  Personal,
  SaldoLicenciaAnio,
  TipoLicenciaConfig,
} from '../../types/police';
import {
  calcularAniosAntiguedad,
  calcularBalancePorAnio,
  calcularFechaReanudacion,
  distribuirDiasMultiAnio,
  ESCALA_VIAJE_ART_11,
  formatFechaDisplay,
  getDiasEscalaArt7,
  getDiasViajeArt11,
  parseYmdLocal,
  formatDateYmdLocal,
} from '../../services/licenciaService';

interface LicenciaModalProps {
  licencia?: LicenciaPolicial | null;
  preselectedPersonalId?: string;
  personalList: Personal[];
  saldosLicencias: SaldoLicenciaAnio[];
  licenciasExistentes: LicenciaPolicial[];
  feriados: FeriadoDiaNoLaborable[];
  tiposLicencia: TipoLicenciaConfig[];
  aniosDisponibles: number[];
  config: ConfiguracionSistema;
  currentUsername?: string;
  onSave: (lic: LicenciaPolicial) => void;
  onAddTipoLicencia: (nuevoTipo: TipoLicenciaConfig) => void;
  onClose: () => void;
}

export const LicenciaModal: React.FC<LicenciaModalProps> = ({
  licencia,
  preselectedPersonalId,
  personalList,
  saldosLicencias,
  licenciasExistentes,
  feriados,
  tiposLicencia,
  aniosDisponibles,
  config,
  currentUsername,
  onSave,
  onAddTipoLicencia,
  onClose,
}) => {
  const isEditing = Boolean(licencia);

  const [personalSearch, setPersonalSearch] = useState('');
  const [personalId, setPersonalId] = useState<string>(
    licencia?.personalId || preselectedPersonalId || personalList[0]?.id || ''
  );

  const [tipoLicencia, setTipoLicencia] = useState<string>(
    licencia?.tipoLicencia || tiposLicencia[0]?.nombre || 'Anual'
  );
  const [showNewTipoForm, setShowNewTipoForm] = useState(false);
  const [newTipoNombre, setNewTipoNombre] = useState('');
  const [newTipoDescuentaSaldo, setNewTipoDescuentaSaldo] = useState(false);

  const [fechaSalida, setFechaSalida] = useState<string>(
    licencia?.fechaSalida || new Date().toISOString().slice(0, 10)
  );
  const [diasHabilesSolicitados, setDiasHabilesSolicitados] = useState<number>(
    licencia?.diasHabilesSolicitados || 7
  );

  // Viaje / traslado terrestre (Art. 11)
  const [incluyeViajeTerrestre, setIncluyeViajeTerrestre] = useState<boolean>(
    Boolean(licencia?.incluyeViajeTerrestre || (licencia?.diasViajeArt11 || 0) > 0)
  );
  const [distanciaKm, setDistanciaKm] = useState<number>(licencia?.distanciaKm || 0);
  const [diasViajeArt11, setDiasViajeArt11] = useState<number>(licencia?.diasViajeArt11 || 0);

  // Imputación multi-año
  const [imputacionAnios, setImputacionAnios] = useState<ImputacionAnioLicencia[]>(
    licencia?.imputacionAnios || []
  );
  const [permitirExcederSaldo, setPermitirExcederSaldo] = useState<boolean>(false);

  // Interrupción Art. 15
  const [fueInterrumpida, setFueInterrumpida] = useState<boolean>(Boolean(licencia?.fueInterrumpida));
  const [fechaInterrupcion, setFechaInterrupcion] = useState<string>(
    licencia?.fechaInterrupcion || new Date().toISOString().slice(0, 10)
  );
  const [motivoInterrupcion, setMotivoInterrupcion] = useState<string>(licencia?.motivoInterrupcion || '');
  const [diasEfectivamenteGozados, setDiasEfectivamenteGozados] = useState<number>(
    licencia?.diasEfectivamenteGozados ?? 0
  );
  const [diasRestituidos, setDiasRestituidos] = useState<number>(licencia?.diasRestituidos ?? 0);

  const [disposicionNro, setDisposicionNro] = useState<string>(licencia?.disposicionNro || '');
  const [observaciones, setObservaciones] = useState<string>(licencia?.observaciones || '');
  const [showDetalleDias, setShowDetalleDias] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedPersonal = useMemo(
    () => personalList.find((p) => p.id === personalId) || null,
    [personalList, personalId]
  );

  const filteredPersonalList = useMemo(() => {
    const q = personalSearch.trim().toLowerCase();
    if (!q) return personalList;
    return personalList.filter(
      (p) =>
        p.apellidoYNombre.toLowerCase().includes(q) ||
        p.dni.includes(q) ||
        p.jerarquia.toLowerCase().includes(q)
    );
  }, [personalList, personalSearch]);

  // Antigüedad estrictamente en años (sin meses)
  const antiguedadAnios = useMemo(
    () => calcularAniosAntiguedad(selectedPersonal?.fechaIngreso),
    [selectedPersonal?.fechaIngreso]
  );
  const escalaArt7Dias = useMemo(() => getDiasEscalaArt7(antiguedadAnios), [antiguedadAnios]);

  const tipoConfigActual = useMemo(
    () => tiposLicencia.find((t) => t.nombre.toLowerCase() === tipoLicencia.toLowerCase()),
    [tiposLicencia, tipoLicencia]
  );
  const descuentaSaldo = tipoConfigActual ? tipoConfigActual.descuentaSaldoAnual : tipoLicencia === 'Anual';

  // Excluir la propia licencia en edición al calcular saldos disponibles para imputar
  const balancesPorAnio = useMemo(() => {
    if (!selectedPersonal) return [];
    const otrasLicencias = licencia
      ? licenciasExistentes.filter((l) => l.id !== licencia.id)
      : licenciasExistentes;
    const yearsSet = new Set<number>(aniosDisponibles);
    const ingParsed = parseYmdLocal(selectedPersonal.fechaIngreso);
    const curYear = new Date().getFullYear();
    if (ingParsed) {
      const startY = Math.max(1980, ingParsed.getFullYear());
      for (let y = startY; y <= curYear; y++) {
        yearsSet.add(y);
      }
    }
    for (const imp of imputacionAnios) {
      yearsSet.add(imp.anio);
    }
    return calcularBalancePorAnio(
      selectedPersonal,
      saldosLicencias,
      otrasLicencias,
      Array.from(yearsSet).sort((a, b) => a - b)
    );
  }, [selectedPersonal, saldosLicencias, licenciasExistentes, licencia, aniosDisponibles, imputacionAnios]);

  // Cálculo automático de fecha de fin y reanudación (08:00 hs)
  const calculoReanudacion = useMemo(() => {
    return calcularFechaReanudacion({
      fechaSalida,
      diasHabiles: diasHabilesSolicitados,
      diasViajeArt11: incluyeViajeTerrestre ? diasViajeArt11 : 0,
      feriados,
    });
  }, [fechaSalida, diasHabilesSolicitados, incluyeViajeTerrestre, diasViajeArt11, feriados]);

  // Auto-sugerencia FIFO cuando se crea una nueva licencia y cambia personal / días / tipo
  useEffect(() => {
    if (isEditing) return;
    if (!descuentaSaldo) {
      setImputacionAnios([]);
      return;
    }
    if (balancesPorAnio.length > 0) {
      const autoImp = distribuirDiasMultiAnio(diasHabilesSolicitados, balancesPorAnio);
      setImputacionAnios(autoImp);
    }
  }, [isEditing, personalId, diasHabilesSolicitados, descuentaSaldo, balancesPorAnio.length]);

  // Recalcular días gozados / restituidos automáticamente cuando cambia fechaInterrupcion
  useEffect(() => {
    if (!fueInterrumpida || !fechaSalida || !fechaInterrupcion) return;
    const start = parseYmdLocal(fechaSalida);
    const interr = parseYmdLocal(fechaInterrupcion);
    if (!start || !interr) return;

    if (interr < start) {
      setDiasEfectivamenteGozados(0);
      setDiasRestituidos(diasHabilesSolicitados);
      return;
    }

    const feriadoSet = new Set((feriados || []).map((f) => f.fecha.slice(0, 10)));
    let gozados = 0;
    const cursor = new Date(start.getTime());
    let safety = 0;
    while (cursor <= interr && safety < 500) {
      safety++;
      const day = cursor.getDay();
      const ymd = formatDateYmdLocal(cursor);
      if (day !== 0 && day !== 6 && !feriadoSet.has(ymd)) {
        gozados++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const cappedGozados = Math.min(diasHabilesSolicitados, Math.max(0, gozados));
    setDiasEfectivamenteGozados(cappedGozados);
    setDiasRestituidos(Math.max(0, diasHabilesSolicitados - cappedGozados));
  }, [fueInterrumpida, fechaSalida, fechaInterrupcion, diasHabilesSolicitados, feriados]);

  const totalImputado = useMemo(
    () => imputacionAnios.reduce((acc, item) => acc + (Number(item.dias) || 0), 0),
    [imputacionAnios]
  );

  const handleSetAnioDias = (anio: number, diasValue: number) => {
    const cleanDias = Math.max(0, Math.floor(Number(diasValue) || 0));
    setImputacionAnios((prev) => {
      const filtered = prev.filter((i) => i.anio !== anio);
      if (cleanDias === 0) return filtered;
      return [...filtered, { anio, dias: cleanDias }].sort((a, b) => a.anio - b.anio);
    });
  };

  const handleAutoFifo = () => {
    if (!balancesPorAnio.length) return;
    setImputacionAnios(distribuirDiasMultiAnio(diasHabilesSolicitados, balancesPorAnio));
  };

  const handleCreateCustomTipo = () => {
    const nombre = newTipoNombre.trim();
    if (!nombre) return;
    if (tiposLicencia.some((t) => t.nombre.toLowerCase() === nombre.toLowerCase())) {
      setTipoLicencia(nombre);
      setShowNewTipoForm(false);
      setNewTipoNombre('');
      return;
    }
    const created: TipoLicenciaConfig = {
      id: 'lic-tipo-' + Date.now(),
      nombre,
      esDefault: false,
      descuentaSaldoAnual: newTipoDescuentaSaldo,
      activo: true,
    };
    onAddTipoLicencia(created);
    setTipoLicencia(created.nombre);
    setShowNewTipoForm(false);
    setNewTipoNombre('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonal) {
      setFormError('Debe seleccionar un efectivo policial.');
      return;
    }
    if (!fechaSalida || !calculoReanudacion) {
      setFormError('Indique una Fecha de Salida y cantidad de días hábiles válida.');
      return;
    }
    if (diasHabilesSolicitados < 1) {
      setFormError('La cantidad de días hábiles solicitados debe ser al menos 1.');
      return;
    }

    if (descuentaSaldo) {
      if (totalImputado !== diasHabilesSolicitados) {
        setFormError(
          `La imputación multi-año suma ${totalImputado} días y debe coincidir con los ${diasHabilesSolicitados} días hábiles solicitados.`
        );
        return;
      }
      if (!permitirExcederSaldo) {
        for (const imp of imputacionAnios) {
          const bal = balancesPorAnio.find((b) => b.anio === imp.anio);
          if (bal?.vencido) {
            setFormError(`El período ${imp.anio} se encuentra marcado como VENCIDO y no puede imputarse.`);
            return;
          }
          if (bal && imp.dias > bal.diasDisponibles) {
            setFormError(
              `En el período ${imp.anio} solo dispone de ${bal.diasDisponibles} días (intenta imputar ${imp.dias}). Active "Permitir exceder saldo" si es un ajuste excepcional.`
            );
            return;
          }
        }
      }
    }

    if (fueInterrumpida) {
      if (!fechaInterrupcion) {
        setFormError('Debe especificar la fecha de interrupción (Art. 15).');
        return;
      }
      if (!motivoInterrupcion.trim()) {
        setFormError('Debe registrar el motivo de la interrupción según el Art. 15.');
        return;
      }
    }

    setFormError(null);
    const now = new Date().toISOString();
    const record: LicenciaPolicial = {
      id: licencia?.id || 'lic-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      personalId: selectedPersonal.id,
      // Campos estrictamente heredados de Personal:
      jerarquia: selectedPersonal.jerarquia,
      apellidoYNombre: selectedPersonal.apellidoYNombre,
      dni: selectedPersonal.dni,
      fechaIngreso: selectedPersonal.fechaIngreso,
      antiguedadAnios,

      tipoLicencia,
      fechaSalida,
      diasHabilesSolicitados,
      incluyeViajeTerrestre,
      distanciaKm: incluyeViajeTerrestre ? distanciaKm : 0,
      diasViajeArt11: incluyeViajeTerrestre ? diasViajeArt11 : 0,

      fechaFinLicencia: calculoReanudacion.fechaFinLicencia,
      fechaReanudacion: calculoReanudacion.fechaReanudacion,
      horaReanudacion: calculoReanudacion.horaReanudacion,

      imputacionAnios: descuentaSaldo ? imputacionAnios.filter((i) => i.dias > 0) : [],

      fueInterrumpida,
      fechaInterrupcion: fueInterrumpida ? fechaInterrupcion : undefined,
      motivoInterrupcion: fueInterrumpida ? motivoInterrupcion.trim() : undefined,
      diasEfectivamenteGozados: fueInterrumpida ? diasEfectivamenteGozados : undefined,
      diasRestituidos: fueInterrumpida ? diasRestituidos : undefined,

      disposicionNro: disposicionNro.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      delegacionId: licencia?.delegacionId || selectedPersonal.delegacionId || config.delegacionId,
      usuarioRegistro: licencia?.usuarioRegistro || currentUsername || 'Sistema',
      createdAt: licencia?.createdAt || now,
      updatedAt: now,
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-lg text-blue-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? 'Editar Licencia Policial' : 'Registrar Nueva Licencia Policial'}
              </h2>
              <p className="text-xs text-slate-300">
                Cómputo estricto de días hábiles administrativos, Art. 7, Art. 11 (traslado) y Art. 15 (interrupción)
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* 1. SELECCIÓN DE PERSONAL Y DATOS ESTRICTAMENTE HEREDADOS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                1. Personal Policial (Datos Heredados de Personal y Legajo)
              </h3>
              <input
                type="text"
                value={personalSearch}
                onChange={(e) => setPersonalSearch(e.target.value)}
                placeholder="Filtrar por Apellido, DNI o Jerarquía..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:w-64 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={personalId}
                onChange={(e) => setPersonalId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="">-- Seleccione Efectivo Policial --</option>
                {filteredPersonalList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jerarquia} — {p.apellidoYNombre} (DNI {p.dni})
                  </option>
                ))}
              </select>
            </div>

            {selectedPersonal && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-blue-200 rounded-lg p-3">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Jerarquía</div>
                  <div className="font-bold text-blue-950">{selectedPersonal.jerarquia}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Apellido y Nombre</div>
                  <div className="font-bold text-slate-900">{selectedPersonal.apellidoYNombre}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">DNI</div>
                  <div className="font-mono font-bold text-slate-900">{selectedPersonal.dni}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Fecha de Ingreso / Antigüedad
                  </div>
                  <div className="font-bold text-emerald-900">
                    {selectedPersonal.fechaIngreso
                      ? `${formatFechaDisplay(selectedPersonal.fechaIngreso)} • ${antiguedadAnios} ${antiguedadAnios === 1 ? 'año' : 'años'}`
                      : 'Sin fecha de ingreso (0 años)'}
                  </div>
                  <div className="text-[10px] text-slate-500">Escala Art. 7: {escalaArt7Dias} días hábiles/año</div>
                </div>
              </div>
            )}
          </div>

          {/* 2. TIPO DE LICENCIA, SALIDA, DÍAS Y ART. 11 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
              2. Tipo de Licencia, Fechas y Traslado Terrestre (Art. 11)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Tipo de Licencia *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewTipoForm((v) => !v)}
                    className="text-[11px] font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar otro tipo</span>
                  </button>
                </div>
                <select
                  value={tipoLicencia}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTipoLicencia(next);
                    const found = tiposLicencia.find((t) => t.nombre === next);
                    if (!isEditing && found?.diasSugeridos && found.diasSugeridos > 0) {
                      setDiasHabilesSolicitados(found.diasSugeridos);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {tiposLicencia
                    .filter((t) => t.activo !== false)
                    .map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre} {t.descuentaSaldoAnual ? '(Imputa saldo Art. 7)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha de Salida *</label>
                <input
                  type="date"
                  required
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Días Hábiles Solicitados *</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  required
                  value={diasHabilesSolicitados}
                  onChange={(e) => setDiasHabilesSolicitados(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {showNewTipoForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block font-semibold text-blue-950 mb-1">Nombre del Nuevo Tipo de Licencia</label>
                  <input
                    type="text"
                    value={newTipoNombre}
                    onChange={(e) => setNewTipoNombre(e.target.value)}
                    placeholder="Ej. Matrimonio, Duelo, Estudio, Paternidad..."
                    className="w-full px-3 py-1.5 rounded-lg border border-blue-300 bg-white"
                  />
                </div>
                <label className="flex items-center gap-2 font-semibold text-blue-950 cursor-pointer pb-1.5">
                  <input
                    type="checkbox"
                    checked={newTipoDescuentaSaldo}
                    onChange={(e) => setNewTipoDescuentaSaldo(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-700"
                  />
                  <span>Descuenta saldo anual</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCustomTipo}
                    className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Guardar Tipo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTipoForm(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Opción de viaje / traslado terrestre Art. 11 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluyeViajeTerrestre}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncluyeViajeTerrestre(checked);
                    if (!checked) {
                      setDistanciaKm(0);
                      setDiasViajeArt11(0);
                    } else if (diasViajeArt11 === 0) {
                      setDistanciaKm(450);
                      setDiasViajeArt11(1);
                    }
                  }}
                  className="w-4 h-4 text-blue-700 rounded"
                />
                <Car className="w-4 h-4 text-blue-800" />
                <span>Incluir Días por Viaje / Traslado por Vía Terrestre (Art. 11)</span>
              </label>

              {incluyeViajeTerrestre && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tramo Oficial (Art. 11)</label>
                    <select
                      value={diasViajeArt11}
                      onChange={(e) => {
                        const d = Number(e.target.value) || 0;
                        setDiasViajeArt11(d);
                        const preset = ESCALA_VIAJE_ART_11.find((p) => p.dias === d);
                        if (preset) setDistanciaKm(preset.kmEjemplo);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {ESCALA_VIAJE_ART_11.map((item) => (
                        <option key={item.dias} value={item.dias}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Distancia Terrestre (km)</label>
                    <input
                      type="number"
                      min={0}
                      max={20000}
                      value={distanciaKm}
                      onChange={(e) => {
                        const km = Math.max(0, Number(e.target.value) || 0);
                        setDistanciaKm(km);
                        setDiasViajeArt11(getDiasViajeArt11(km));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="px-3 py-2 rounded-lg bg-blue-900 text-white font-bold text-center">
                      +{diasViajeArt11} {diasViajeArt11 === 1 ? 'día' : 'días'} Art. 11
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resultado automático de cálculo de regreso */}
            {calculoReanudacion && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">Último Día de Licencia</div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatFechaDisplay(calculoReanudacion.fechaFinLicencia)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">
                      Fecha y Hora de Reanudación
                    </div>
                    <div className="text-base font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      <span>
                        {formatFechaDisplay(calculoReanudacion.fechaReanudacion)} a las{' '}
                        {calculoReanudacion.horaReanudacion} hs.
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-900 space-y-0.5">
                    <div>
                      Fines de semana excluidos: <strong>{calculoReanudacion.finesDeSemanaSaltados} d.</strong>
                    </div>
                    <div>
                      Feriados en el período: <strong>{calculoReanudacion.feriadosEnRango.length}</strong>
                      {calculoReanudacion.feriadosEnRango.length > 0 && (
                        <span className="ml-1 text-emerald-800">
                          ({calculoReanudacion.feriadosEnRango.map((f) => `${formatFechaDisplay(f.fecha)}: ${f.nombre}`).join('; ')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Cómputo automático en días hábiles administrativos (lunes a viernes, sin feriados).
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetalleDias((v) => !v)}
                    className="text-[11px] font-bold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showDetalleDias ? 'Ocultar detalle' : 'Ver detalle día por día'}</span>
                    {showDetalleDias ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showDetalleDias && (
                  <div className="max-h-40 overflow-y-auto bg-white border border-emerald-200 rounded-lg divide-y divide-slate-100 text-[11px]">
                    {calculoReanudacion.detalleDias.map((d, idx) => (
                      <div key={idx} className="px-3 py-1.5 flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-800">{formatFechaDisplay(d.fecha)}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            d.estado === 'Licencia'
                              ? 'bg-blue-50 text-blue-900'
                              : d.estado === 'Feriado'
                              ? 'bg-amber-50 text-amber-900'
                              : d.estado === 'Reanudación'
                              ? 'bg-emerald-100 text-emerald-900'
                              : d.estado === 'Viaje Art. 11'
                              ? 'bg-indigo-50 text-indigo-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.estado}
                        </span>
                        <span className="text-slate-500 truncate max-w-[220px]">{d.nota || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. LÓGICA DE IMPUTACIÓN MULTI-AÑO */}
          {descuentaSaldo && selectedPersonal && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    3. Imputación Multi-Año de Días Disponibles
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fraccione los {diasHabilesSolicitados} días entre uno o varios períodos anuales activos (ej. 4 días de 2024 + 6 días de 2025).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFifo}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                  <span>Distribuir FIFO Automático</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {balancesPorAnio
                  .filter((bal) => bal.enServicio)
                  .map((bal) => {
                  const val = imputacionAnios.find((i) => i.anio === bal.anio)?.dias || 0;
                  return (
                    <div
                      key={bal.anio}
                      className={`p-3 rounded-lg border ${
                        bal.vencido
                          ? 'bg-slate-100 border-slate-200 opacity-70'
                          : val > 0
                          ? 'bg-blue-50/70 border-blue-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-900 text-sm">Período {bal.anio}</span>
                        {bal.vencido ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            VENCIDO
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800">
                            Disp: {bal.diasDisponibles} / {bal.diasCorrespondientes} d.
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1.5">
                        Antigüedad en {bal.anio}: <strong>{bal.antiguedadEnAnio} {bal.antiguedadEnAnio === 1 ? 'año' : 'años'}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-600 font-medium">Días a tomar:</label>
                        <input
                          type="number"
                          min={0}
                          max={bal.vencido ? 0 : permitirExcederSaldo ? 180 : bal.diasDisponibles}
                          disabled={bal.vencido}
                          value={val}
                          onChange={(e) => handleSetAnioDias(bal.anio, Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-bold text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div
                  className={`font-bold text-xs ${
                    totalImputado === diasHabilesSolicitados ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  Total imputado: {totalImputado} / {diasHabilesSolicitados} días hábiles
                </div>
                <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permitirExcederSaldo}
                    onChange={(e) => setPermitirExcederSaldo(e.target.checked)}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span>Permitir exceder saldo disponible (ajuste excepcional)</span>
                </label>
              </div>
            </div>
          )}

          {/* 4. INTERRUPCIÓN ART. 15 */}
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              fueInterrumpida ? 'bg-red-50/60 border-red-300' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={fueInterrumpida}
                onChange={(e) => setFueInterrumpida(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <span className={fueInterrumpida ? 'text-red-800' : 'text-slate-800'}>
                Fue Interrumpida (Art. 15 — Razones de Servicio)
              </span>
            </label>

            {fueInterrumpida && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-red-900 mb-1">Fecha de Interrupción *</label>
                    <input
                      type="date"
                      value={fechaInterrupcion}
                      onChange={(e) => setFechaInterrupcion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-red-900 mb-1">Días Efectivamente Gozados</label>
                    <input
                      type="number"
                      min={0}
                      max={diasHabilesSolicitados}
                      value={diasEfectivamenteGozados}
                      onChange={(e) => {
                        const goz = Math.min(diasHabilesSolicitados, Math.max(0, Number(e.target.value) || 0));
                        setDiasEfectivamenteGozados(goz);
                        setDiasRestituidos(Math.max(0, diasHabilesSolicitados - goz));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-red-900 mb-1">Días Restituidos al Saldo</label>
                    <input
                      type="number"
                      min={0}
                      max={diasHabilesSolicitados}
                      value={diasRestituidos}
                      onChange={(e) => {
                        const rest = Math.min(diasHabilesSolicitados, Math.max(0, Number(e.target.value) || 0));
                        setDiasRestituidos(rest);
                        setDiasEfectivamenteGozados(Math.max(0, diasHabilesSolicitados - rest));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white font-bold text-emerald-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-red-900 mb-1">
                    Motivo de la Interrupción (Art. 15) *
                  </label>
                  <textarea
                    rows={2}
                    value={motivoInterrupcion}
                    onChange={(e) => setMotivoInterrupcion(e.target.value)}
                    placeholder="Detalle la resolución superior o razones urgentes de servicio que motivaron la interrupción..."
                    className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. DISPOSICIÓN Y OBSERVACIONES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">N° Disposición / Memorándum / Expte.</label>
              <input
                type="text"
                value={disposicionNro}
                onChange={(e) => setDisposicionNro(e.target.value)}
                placeholder="Ej. Disp. Int. N° 124/2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Observaciones Generales</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales sobre la licencia o lugar de residencia transitoria..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Licencia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
