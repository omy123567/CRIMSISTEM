import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Building2,
  Lock,
  BookOpen,
} from 'lucide-react';
import {
  ConfiguracionSistema,
  DelegacionPolicial,
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
  calcularDiasCorridosDesdeMeses,
  calcularFechaReanudacion,
  calcularMesesAntiguedadExactos,
  distribuirDiasMultiAnio,
  ESCALA_VIAJE_ART_11,
  esPersonalSuperior,
  formatFechaDisplay,
  getDiasEscalaArt7,
  getDiasViajeArt11,
  PARENTESCO_FALLECIMIENTO_ART_47,
  SUBTIPOS_EXCEPCIONAL,
  SUBTIPOS_EXTRAORDINARIA,
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
  delegacionesPermitidas: DelegacionPolicial[];
  defaultDelegacionId: string;
  puedeCambiarDelegacion: boolean;
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
  delegacionesPermitidas,
  defaultDelegacionId,
  puedeCambiarDelegacion,
  config,
  currentUsername,
  onSave,
  onAddTipoLicencia,
  onClose,
}) => {
  const isEditing = Boolean(licencia);

  const initialDelegacionId = useMemo(() => {
    if (!puedeCambiarDelegacion) return defaultDelegacionId;
    if (licencia?.delegacionId) return licencia.delegacionId;
    if (preselectedPersonalId) {
      const pre = personalList.find((p) => p.id === preselectedPersonalId);
      if (pre?.delegacionId) return pre.delegacionId;
    }
    return defaultDelegacionId;
  }, [puedeCambiarDelegacion, defaultDelegacionId, licencia, preselectedPersonalId, personalList]);

  const [delegacionModalId, setDelegacionModalId] = useState<string>(initialDelegacionId);
  const effectiveDelegacionModalId = puedeCambiarDelegacion ? delegacionModalId : defaultDelegacionId;

  const [personalSearch, setPersonalSearch] = useState('');
  const [personalId, setPersonalId] = useState<string>(
    licencia?.personalId ||
      preselectedPersonalId ||
      personalList.find((p) => (p.delegacionId || 'del-laguna-blanca') === initialDelegacionId)?.id ||
      ''
  );

  const [tipoLicencia, setTipoLicencia] = useState<string>(
    licencia?.tipoLicencia || tiposLicencia[0]?.nombre || 'Anual'
  );
  const [showNewTipoForm, setShowNewTipoForm] = useState(false);
  const [newTipoNombre, setNewTipoNombre] = useState('');
  const [newTipoDescuentaSaldo, setNewTipoDescuentaSaldo] = useState(false);
  const [newTipoModoComputo, setNewTipoModoComputo] = useState<'habiles' | 'corridos'>('habiles');

  // Subtipo reglamentario (Arts. 41-53 Extraordinaria / Arts. 54-62 Excepcional)
  const [subtipoId, setSubtipoId] = useState<string>(
    licencia?.subtipoLicencia ||
      (licencia?.tipoLicencia === 'Excepcional' ? 'asuntos_personales' : 'matrimonio')
  );
  // Art. 47 Parentesco en fallecimiento
  const [parentescoId, setParentescoId] = useState<string>(() => {
    if (licencia?.parentescoFallecimiento) {
      const found = PARENTESCO_FALLECIMIENTO_ART_47.find(
        (p) => p.label.toLowerCase() === licencia.parentescoFallecimiento?.toLowerCase()
      );
      if (found) return found.id;
    }
    return PARENTESCO_FALLECIMIENTO_ART_47[0].id;
  });

  // Sub-opciones reglamentarias específicas
  const [enfermedadEtapa, setEnfermedadEtapa] = useState<'inicial' | 'prorroga' | 'disponibilidad'>('inicial');
  const [estudiosModalidad, setEstudiosModalidad] = useState<'no_policial' | 'policial'>('no_policial');
  const [maternidadModalidad, setMaternidadModalidad] = useState<
    '45_105' | '30_120' | 'multiple' | 'nino_muerto' | 'pretermino' | 'diferido'
  >('45_105');
  const [maternidadHijosExtra, setMaternidadHijosExtra] = useState<number>(1);
  const [adopcionEdad, setAdopcionEdad] = useState<'hasta_12m' | '12m_a_5a'>(
    licencia?.diasHabilesSolicitados === 60 ? '12m_a_5a' : 'hasta_12m'
  );
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number>(
    licencia?.tipoLicencia === 'Excepcional' ? 6 : 3
  );
  const didMountEditGuard = useRef(isEditing);
  const [asuntosClasificacion, setAsuntosClasificacion] = useState<'familia' | 'deportiva' | 'cultural'>('familia');
  const [asuntosExcepcionArt43, setAsuntosExcepcionArt43] = useState<boolean>(false);

  const [fechaSalida, setFechaSalida] = useState<string>(
    licencia?.fechaSalida || new Date().toISOString().slice(0, 10)
  );
  // Para Licencia Anual nueva, empieza vacío ('') obligando a establecer explícitamente los días
  const [diasInput, setDiasInput] = useState<string>(() => {
    if (licencia?.diasHabilesSolicitados) return String(licencia.diasHabilesSolicitados);
    const initTipo = (licencia?.tipoLicencia || tiposLicencia[0]?.nombre || 'Anual').toLowerCase();
    if (initTipo === 'invernal') return '5';
    return '';
  });

  const diasNumericos = Math.max(0, Math.floor(Number(diasInput) || 0));

  // Viaje / traslado terrestre (Art. 11)
  const [incluyeViajeTerrestre, setIncluyeViajeTerrestre] = useState<boolean>(
    Boolean(licencia?.incluyeViajeTerrestre || (licencia?.diasViajeArt11 || 0) > 0)
  );
  const [distanciaKm, setDistanciaKm] = useState<number>(licencia?.distanciaKm || 0);
  const [diasViajeArt11, setDiasViajeArt11] = useState<number>(licencia?.diasViajeArt11 || 0);

  // Imputación multi-año (solo si descuentaSaldoAnual === true)
  const [imputacionAnios, setImputacionAnios] = useState<ImputacionAnioLicencia[]>(
    licencia?.imputacionAnios || []
  );
  const [permitirExcederSaldo, setPermitirExcederSaldo] = useState<boolean>(false);

  const [disposicionNro, setDisposicionNro] = useState<string>(licencia?.disposicionNro || '');
  const [observaciones, setObservaciones] = useState<string>(licencia?.observaciones || '');
  const [showDetalleDias, setShowDetalleDias] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tipoNorm = tipoLicencia.trim().toLowerCase();
  const isAnual = tipoNorm === 'anual';
  const isInvernal = tipoNorm === 'invernal';
  const isExtraordinaria = tipoNorm === 'extraordinaria';
  const isExcepcional = tipoNorm === 'excepcional';

  const tipoConfigActual = useMemo(
    () => tiposLicencia.find((t) => t.nombre.toLowerCase() === tipoNorm),
    [tiposLicencia, tipoNorm]
  );

  // Invernal, Extraordinaria y Excepcional NUNCA restan de la Anual
  const descuentaSaldo = useMemo(() => {
    if (isInvernal || isExtraordinaria || isExcepcional) return false;
    if (isAnual) return true;
    return Boolean(tipoConfigActual?.descuentaSaldoAnual);
  }, [isAnual, isInvernal, isExtraordinaria, isExcepcional, tipoConfigActual]);

  const subtipoExtraObj = useMemo(
    () => SUBTIPOS_EXTRAORDINARIA.find((s) => s.id === subtipoId) || SUBTIPOS_EXTRAORDINARIA[0],
    [subtipoId]
  );

  const subtipoExcepObj = useMemo(
    () => SUBTIPOS_EXCEPCIONAL.find((s) => s.id === subtipoId) || SUBTIPOS_EXCEPCIONAL[0],
    [subtipoId]
  );

  const parentescoSeleccionado = useMemo(
    () => PARENTESCO_FALLECIMIENTO_ART_47.find((p) => p.id === parentescoId) || PARENTESCO_FALLECIMIENTO_ART_47[0],
    [parentescoId]
  );

  // Determinar modo de cómputo: 'habiles' vs 'corridos'
  const modoComputo: 'habiles' | 'corridos' = useMemo(() => {
    if (isAnual || isInvernal) return 'habiles';
    if (isExtraordinaria) return subtipoExtraObj.modoComputo;
    if (isExcepcional) return subtipoExcepObj.modoComputo;
    return tipoConfigActual?.modoComputo || 'habiles';
  }, [isAnual, isInvernal, isExtraordinaria, isExcepcional, subtipoExtraObj, subtipoExcepObj, tipoConfigActual]);

  const personalDeDelegacion = useMemo(() => {
    return personalList.filter(
      (p) => (p.delegacionId || 'del-laguna-blanca') === effectiveDelegacionModalId
    );
  }, [personalList, effectiveDelegacionModalId]);

  const filteredPersonalList = useMemo(() => {
    const q = personalSearch.trim().toLowerCase();
    if (!q) return personalDeDelegacion;
    return personalDeDelegacion.filter(
      (p) =>
        p.apellidoYNombre.toLowerCase().includes(q) ||
        p.dni.includes(q) ||
        p.jerarquia.toLowerCase().includes(q)
    );
  }, [personalDeDelegacion, personalSearch]);

  useEffect(() => {
    if (isEditing) return;
    if (!personalDeDelegacion.some((p) => p.id === personalId)) {
      setPersonalId(personalDeDelegacion[0]?.id || '');
    }
  }, [effectiveDelegacionModalId, personalDeDelegacion, personalId, isEditing]);

  const selectedPersonal = useMemo(
    () => personalList.find((p) => p.id === personalId) || null,
    [personalList, personalId]
  );

  // Antigüedad estrictamente en años (sin meses) al día de la fecha / salida
  const antiguedadAnios = useMemo(
    () => calcularAniosAntiguedad(selectedPersonal?.fechaIngreso),
    [selectedPersonal?.fechaIngreso]
  );
  const mesesAntiguedadSalida = useMemo(
    () => calcularMesesAntiguedadExactos(selectedPersonal?.fechaIngreso, fechaSalida),
    [selectedPersonal?.fechaIngreso, fechaSalida]
  );
  const escalaArt7Dias = useMemo(() => getDiasEscalaArt7(antiguedadAnios), [antiguedadAnios]);

  // Aplicar reglas automáticas de días al cambiar Tipo / Subtipo / Parentesco / Modalidad
  const handleSelectTipoLicencia = (next: string) => {
    if (next === '__ADD_NEW__') {
      setShowNewTipoForm(true);
      return;
    }
    setTipoLicencia(next);
    const norm = next.trim().toLowerCase();

    if (norm === 'anual') {
      // Anual exige establecer días explícitamente
      setDiasInput('');
      return;
    }
    if (norm === 'invernal') {
      // Invernal son exactamente 5 días hábiles, no se restan de la anual
      setDiasInput('5');
      setImputacionAnios([]);
      return;
    }
    if (norm === 'extraordinaria') {
      setImputacionAnios([]);
      const defaultSub = SUBTIPOS_EXTRAORDINARIA.find((s) => s.id === subtipoId) || SUBTIPOS_EXTRAORDINARIA[0];
      setSubtipoId(defaultSub.id);
      if (defaultSub.id === 'fallecimiento') {
        setDiasInput(String(parentescoSeleccionado.diasCorridos));
      } else {
        setDiasInput(String(defaultSub.diasDefault));
      }
      return;
    }
    if (norm === 'excepcional') {
      setImputacionAnios([]);
      const defaultSub = SUBTIPOS_EXCEPCIONAL.find((s) => s.id === subtipoId) || SUBTIPOS_EXCEPCIONAL[0];
      setSubtipoId(defaultSub.id);
      if (defaultSub.id === 'sin_goce_haberes') {
        setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, 6)));
      } else if (defaultSub.id === 'antiguedad_retiro') {
        setMesesSeleccionados(6);
        setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, 6)));
      } else {
        setDiasInput(String(defaultSub.diasDefault));
      }
      return;
    }

    const found = tiposLicencia.find((t) => t.nombre === next);
    if (found?.diasSugeridos && found.diasSugeridos > 0) {
      setDiasInput(String(found.diasSugeridos));
    } else {
      setDiasInput('');
    }
  };

  // Recalcular automáticamente días en subtipos determinísticos cuando cambian sus parámetros
  useEffect(() => {
    if (didMountEditGuard.current) {
      didMountEditGuard.current = false;
      return;
    }
    if (isInvernal) {
      setDiasInput('5');
      return;
    }
    if (isExtraordinaria) {
      if (subtipoId === 'matrimonio') {
        setDiasInput('12');
      } else if (subtipoId === 'fallecimiento') {
        setDiasInput(String(parentescoSeleccionado.diasCorridos));
      } else if (subtipoId === 'nacimiento_padre') {
        setDiasInput('3');
      } else if (subtipoId === 'donacion_sangre') {
        setDiasInput('1');
      } else if (subtipoId === 'adopcion') {
        setDiasInput(adopcionEdad === 'hasta_12m' ? '90' : '60');
      } else if (subtipoId === 'maternidad') {
        if (maternidadModalidad === '45_105' || maternidadModalidad === '30_120' || maternidadModalidad === 'pretermino') {
          setDiasInput('150');
        } else if (maternidadModalidad === 'multiple') {
          setDiasInput(String(150 + 15 * Math.max(1, maternidadHijosExtra)));
        } else if (maternidadModalidad === 'diferido') {
          setDiasInput('170');
        }
      } else if (subtipoId === 'antiguedad_ext') {
        const m = Math.min(3, Math.max(1, mesesSeleccionados));
        setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, m)));
      }
      return;
    }
    if (isExcepcional) {
      if (subtipoId === 'sin_goce_haberes') {
        setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, 6)));
      } else if (subtipoId === 'antiguedad_retiro') {
        const m = Math.min(6, Math.max(1, mesesSeleccionados));
        setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, m)));
      }
    }
  }, [
    isInvernal,
    isExtraordinaria,
    isExcepcional,
    subtipoId,
    parentescoSeleccionado,
    adopcionEdad,
    maternidadModalidad,
    maternidadHijosExtra,
    mesesSeleccionados,
    fechaSalida,
  ]);

  // Excluir la propia licencia en edición al calcular saldos disponibles para imputar
  const balancesPorAnio = useMemo(() => {
    if (!selectedPersonal) return [];
    const otrasLicencias = licencia
      ? licenciasExistentes.filter((l) => l.id !== licencia.id)
      : licenciasExistentes;
    const yearsSet = new Set<number>(aniosDisponibles);
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

  const totalDisponiblePersonal = useMemo(
    () =>
      balancesPorAnio.reduce(
        (acc, b) => acc + (!b.enServicio || b.vencido ? 0 : b.diasDisponibles),
        0
      ),
    [balancesPorAnio]
  );

  // Cálculo automático de fecha de fin y reanudación (08:00 hs)
  const calculoReanudacion = useMemo(() => {
    if (diasNumericos < 1) return null;
    return calcularFechaReanudacion({
      fechaSalida,
      diasHabiles: diasNumericos,
      diasViajeArt11: incluyeViajeTerrestre ? diasViajeArt11 : 0,
      feriados,
      modoComputo,
    });
  }, [fechaSalida, diasNumericos, incluyeViajeTerrestre, diasViajeArt11, feriados, modoComputo]);

  // Auto-sugerencia FIFO cuando se establece días para Licencia Anual
  useEffect(() => {
    if (isEditing) return;
    if (!descuentaSaldo) {
      setImputacionAnios([]);
      return;
    }
    if (diasNumericos < 1) {
      setImputacionAnios([]);
      return;
    }
    if (balancesPorAnio.length > 0) {
      const autoImp = distribuirDiasMultiAnio(diasNumericos, balancesPorAnio);
      setImputacionAnios(autoImp);
    }
  }, [isEditing, personalId, diasNumericos, descuentaSaldo, balancesPorAnio.length]);

  const totalImputado = useMemo(
    () => imputacionAnios.reduce((acc, item) => acc + (Number(item.dias) || 0), 0),
    [imputacionAnios]
  );

  // Verificaciones reglamentarias automáticas (Arts. 41-62)
  const alertasReglamentarias = useMemo(() => {
    const warnings: string[] = [];
    if (!selectedPersonal) return warnings;

    const otrasLic = licencia
      ? licenciasExistentes.filter((l) => l.id !== licencia.id)
      : licenciasExistentes;
    const yearSalida = Number((fechaSalida || '').slice(0, 4)) || new Date().getFullYear();

    if (isExtraordinaria) {
      if (subtipoId === 'matrimonio' && mesesAntiguedadSalida < 6) {
        warnings.push(
          `Art. 42: Para contraer matrimonio se requiere antigüedad mínima de 6 meses desde el alta (actual al ${formatFechaDisplay(fechaSalida)}: ${mesesAntiguedadSalida} mes/es).`
        );
      }
      if (subtipoId === 'enfermedad_familiar') {
        if (enfermedadEtapa === 'inicial' && diasNumericos > 30) {
          warnings.push('Art. 43: El término inicial por enfermedad de familiar es de hasta 30 días corridos por año calendario.');
        }
        if (enfermedadEtapa === 'disponibilidad' && diasNumericos > 185) {
          warnings.push('Art. 44: La situación excepcional en disponibilidad tiene un límite de hasta 6 meses.');
        }
      }
      if (subtipoId === 'estudios' && estudiosModalidad === 'no_policial') {
        if (diasNumericos > 7) {
          warnings.push('Art. 48 inc. a): Cada período fraccionado por examen no debe superar 7 días corridos.');
        }
        const usadosAnio = otrasLic
          .filter(
            (l) =>
              l.personalId === selectedPersonal.id &&
              l.subtipoLicencia === 'estudios' &&
              (l.fechaSalida || '').startsWith(String(yearSalida))
          )
          .reduce((acc, l) => acc + (l.diasHabilesSolicitados || 0), 0);
        if (usadosAnio + diasNumericos > 28) {
          warnings.push(
            `Art. 48 inc. a): Con esta solicitud acumularía ${usadosAnio + diasNumericos} días en ${yearSalida} (tope: 28 días corridos por año calendario).`
          );
        }
      }
      if (subtipoId === 'nacimiento_padre' && selectedPersonal.sexo === 'F') {
        warnings.push('Art. 49: Esta licencia de 3 días corridos corresponde al personal policial masculino (para femenino rige Art. 51 Maternidad).');
      }
      if (subtipoId === 'antiguedad_ext') {
        if (antiguedadAnios <= 20) {
          warnings.push(
            `Art. 53: La licencia extraordinaria por antigüedad requiere más de 20 años de servicio simple policial (actual: ${antiguedadAnios} años).`
          );
        }
        const yaUso = otrasLic.some(
          (l) => l.personalId === selectedPersonal.id && l.subtipoLicencia === 'antiguedad_ext'
        );
        if (yaUso) {
          warnings.push('Art. 53: Este efectivo ya registra una licencia por antigüedad otorgada (se concede una sola vez en la carrera policial).');
        }
      }
    }

    if (isExcepcional) {
      if (subtipoId === 'asuntos_personales' && !asuntosExcepcionArt43 && antiguedadAnios < 5) {
        warnings.push(
          `Art. 57: Por asuntos personales se requiere un mínimo de 5 años de antigüedad policial (actual: ${antiguedadAnios} años; excepto causal del Art. 43).`
        );
      }
      if (subtipoId === 'antiguedad_retiro') {
        const superior = esPersonalSuperior(selectedPersonal.jerarquia);
        const minReq = superior ? 29 : 24;
        if (antiguedadAnios < minReq) {
          warnings.push(
            `Art. 61: Como ${superior ? 'Personal Superior' : 'Personal Subalterno'} requiere mínimo ${minReq} años con estado policial (actual: ${antiguedadAnios} años).`
          );
        }
      }
      if (subtipoId === 'sin_goce_haberes' && antiguedadAnios < 5) {
        warnings.push(
          `Art. 62: Requiere antigüedad mínima de 5 años en servicio efectivo (actual: ${antiguedadAnios} años).`
        );
      }
    }

    return warnings;
  }, [
    selectedPersonal,
    licencia,
    licenciasExistentes,
    fechaSalida,
    isExtraordinaria,
    isExcepcional,
    subtipoId,
    mesesAntiguedadSalida,
    enfermedadEtapa,
    diasNumericos,
    estudiosModalidad,
    antiguedadAnios,
    asuntosExcepcionArt43,
  ]);

  // Determinar autoridad de concesión reglamentaria y metadata descriptiva
  const metadataReglamentaria = useMemo(() => {
    if (isAnual) {
      return {
        subtipoLicencia: undefined,
        subtipoEtiqueta: undefined,
        articuloReglamento: 'Art. 7',
        autoridadConcesion: 'Jefatura / Superioridad',
        opcionReglamentaria: undefined,
        esSinGoceHaberes: false,
      };
    }
    if (isInvernal) {
      return {
        subtipoLicencia: 'invernal',
        subtipoEtiqueta: '5 días hábiles (No descuenta Anual)',
        articuloReglamento: 'Licencia Invernal',
        autoridadConcesion: 'Superioridad / Dependencia',
        opcionReglamentaria: '5 días hábiles reglamentarios',
        esSinGoceHaberes: false,
      };
    }
    if (isExtraordinaria) {
      let opcion: string | undefined;
      let etiqueta = subtipoExtraObj.etiquetaCorta;
      let autoridad = subtipoExtraObj.autoridad;

      if (subtipoId === 'fallecimiento') {
        etiqueta = `Fallecimiento — ${parentescoSeleccionado.label} (Art. 47 inc. ${parentescoSeleccionado.inciso})`;
        opcion = `Inc. ${parentescoSeleccionado.inciso}) ${parentescoSeleccionado.diasCorridos} días corridos`;
      } else if (subtipoId === 'enfermedad_familiar') {
        opcion =
          enfermedadEtapa === 'inicial'
            ? 'Art. 43 (Inicial hasta 30 d. corridos)'
            : enfermedadEtapa === 'prorroga'
            ? 'Art. 43 (Prórroga Junta Médica hasta 30 d.)'
            : 'Art. 44–45 (Disponibilidad Art. 114 inc. c hasta 6 meses)';
        autoridad =
          enfermedadEtapa === 'inicial' ? 'Servicio de Sanidad Policial' : 'Junta Médica / Sanidad Policial';
      } else if (subtipoId === 'estudios') {
        opcion =
          estudiosModalidad === 'no_policial'
            ? 'Inc. a) Cursos no policiales (máx. 7d / 28d año)'
            : 'Inc. b) Cursos policiales';
        autoridad = estudiosModalidad === 'no_policial' ? 'Jefe de Dependencia' : 'Jefatura de Policía';
      } else if (subtipoId === 'maternidad') {
        opcion =
          maternidadModalidad === '45_105'
            ? '45 d. pre-parto / 105 d. post-parto'
            : maternidadModalidad === '30_120'
            ? '30 d. pre-parto / 120 d. post-parto'
            : maternidadModalidad === 'multiple'
            ? `Inc. a) Múltiple (+${maternidadHijosExtra} hijo/s adicional/es)`
            : maternidadModalidad === 'nino_muerto'
            ? 'Inc. b) Parto con niño muerto'
            : maternidadModalidad === 'pretermino'
            ? 'Inc. c) Pre-término (completa 150 d.)'
            : 'Inc. d) Parto diferido';
      } else if (subtipoId === 'adopcion') {
        opcion =
          adopcionEdad === 'hasta_12m'
            ? 'Inc. a) Niño hasta 12 meses (90 d. corridos)'
            : 'Inc. b) Niño > 12 meses a 5 años (60 d. corridos)';
      } else if (subtipoId === 'antiguedad_ext') {
        opcion = `${mesesSeleccionados} ${mesesSeleccionados === 1 ? 'mes' : 'meses'} (Art. 53 — única vez)`;
      }

      return {
        subtipoLicencia: subtipoExtraObj.id,
        subtipoEtiqueta: etiqueta,
        articuloReglamento: subtipoExtraObj.articulo,
        autoridadConcesion: autoridad,
        opcionReglamentaria: opcion,
        esSinGoceHaberes: false,
      };
    }

    if (isExcepcional) {
      let opcion: string | undefined;
      let autoridad = subtipoExcepObj.autoridad;
      if (subtipoId === 'asuntos_personales') {
        const clsLabel =
          asuntosClasificacion === 'familia'
            ? 'Inc. a) Asuntos de familia'
            : asuntosClasificacion === 'deportiva'
            ? 'Inc. b) Representación deportiva'
            : 'Inc. c) Cultural / Social / Científica';
        if (diasNumericos <= 30) {
          autoridad = 'Comando Superior (Jefatura de Policía) — Art. 58';
        } else if (diasNumericos <= 60) {
          autoridad = 'Poder Ejecutivo Provincial — Art. 58';
        } else {
          autoridad = 'Disponibilidad Art. 114 inc. c) — Arts. 59–60';
        }
        opcion = `${clsLabel}${asuntosExcepcionArt43 ? ' (Causal Art. 43)' : ''}`;
      } else if (subtipoId === 'antiguedad_retiro') {
        opcion = `${mesesSeleccionados} ${mesesSeleccionados === 1 ? 'mes' : 'meses'} c/ retiro voluntario (Art. 61)`;
      } else if (subtipoId === 'sin_goce_haberes') {
        opcion = '6 meses corridos sin goce de haberes — No computable antig./retiro/ascenso (Art. 62)';
      }

      return {
        subtipoLicencia: subtipoExcepObj.id,
        subtipoEtiqueta: subtipoExcepObj.etiquetaCorta,
        articuloReglamento: subtipoExcepObj.articulo,
        autoridadConcesion: autoridad,
        opcionReglamentaria: opcion,
        esSinGoceHaberes: subtipoId === 'sin_goce_haberes',
      };
    }

    return {
      subtipoLicencia: undefined,
      subtipoEtiqueta: undefined,
      articuloReglamento: tipoConfigActual?.articuloReglamento,
      autoridadConcesion: undefined,
      opcionReglamentaria: undefined,
      esSinGoceHaberes: false,
    };
  }, [
    isAnual,
    isInvernal,
    isExtraordinaria,
    isExcepcional,
    subtipoExtraObj,
    subtipoExcepObj,
    subtipoId,
    parentescoSeleccionado,
    enfermedadEtapa,
    estudiosModalidad,
    maternidadModalidad,
    maternidadHijosExtra,
    adopcionEdad,
    mesesSeleccionados,
    asuntosClasificacion,
    asuntosExcepcionArt43,
    diasNumericos,
    tipoConfigActual,
  ]);

  const handleSetAnioDias = (anio: number, diasValue: number) => {
    const cleanDias = Math.max(0, Math.floor(Number(diasValue) || 0));
    setImputacionAnios((prev) => {
      const filtered = prev.filter((i) => i.anio !== anio);
      if (cleanDias === 0) return filtered;
      return [...filtered, { anio, dias: cleanDias }].sort((a, b) => a.anio - b.anio);
    });
  };

  const handleAutoFifo = () => {
    if (!balancesPorAnio.length || diasNumericos < 1) return;
    setImputacionAnios(distribuirDiasMultiAnio(diasNumericos, balancesPorAnio));
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
      modoComputo: newTipoModoComputo,
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
    if (!fechaSalida) {
      setFormError('Indique una Fecha de Salida válida.');
      return;
    }
    if (diasNumericos < 1 || !calculoReanudacion) {
      setFormError(
        isAnual
          ? 'Para la Licencia Anual debe establecer la cantidad de días hábiles solicitados (mínimo 1).'
          : 'La cantidad de días de licencia debe ser al menos 1.'
      );
      return;
    }

    if (descuentaSaldo) {
      if (totalImputado !== diasNumericos) {
        setFormError(
          `La imputación multi-año suma ${totalImputado} días y debe coincidir con los ${diasNumericos} días hábiles establecidos.`
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

    setFormError(null);
    const now = new Date().toISOString();
    const record: LicenciaPolicial = {
      id: licencia?.id || 'lic-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      personalId: selectedPersonal.id,
      jerarquia: selectedPersonal.jerarquia,
      apellidoYNombre: selectedPersonal.apellidoYNombre,
      dni: selectedPersonal.dni,
      fechaIngreso: selectedPersonal.fechaIngreso,
      antiguedadAnios,

      tipoLicencia,
      subtipoLicencia: metadataReglamentaria.subtipoLicencia,
      subtipoEtiqueta: metadataReglamentaria.subtipoEtiqueta,
      articuloReglamento: metadataReglamentaria.articuloReglamento,
      modoComputo,
      parentescoFallecimiento:
        isExtraordinaria && subtipoId === 'fallecimiento' ? parentescoSeleccionado.label : undefined,
      opcionReglamentaria: metadataReglamentaria.opcionReglamentaria,
      autoridadConcesion: metadataReglamentaria.autoridadConcesion,
      esSinGoceHaberes: metadataReglamentaria.esSinGoceHaberes,

      fechaSalida,
      diasHabilesSolicitados: isInvernal ? 5 : diasNumericos,
      incluyeViajeTerrestre,
      distanciaKm: incluyeViajeTerrestre ? distanciaKm : 0,
      diasViajeArt11: incluyeViajeTerrestre ? diasViajeArt11 : 0,

      fechaFinLicencia: calculoReanudacion.fechaFinLicencia,
      fechaReanudacion: calculoReanudacion.fechaReanudacion,
      horaReanudacion: calculoReanudacion.horaReanudacion,

      imputacionAnios: descuentaSaldo ? imputacionAnios.filter((i) => i.dias > 0) : [],

      fueInterrumpida: licencia?.fueInterrumpida ?? false,
      fechaInterrupcion: licencia?.fueInterrumpida ? licencia.fechaInterrupcion : undefined,
      motivoInterrupcion: licencia?.fueInterrumpida ? licencia.motivoInterrupcion : undefined,
      diasEfectivamenteGozados: licencia?.fueInterrumpida ? licencia.diasEfectivamenteGozados : undefined,
      diasRestituidos: licencia?.fueInterrumpida ? licencia.diasRestituidos : undefined,

      disposicionNro: disposicionNro.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      delegacionId:
        licencia?.delegacionId || selectedPersonal.delegacionId || effectiveDelegacionModalId || config.delegacionId,
      usuarioRegistro: licencia?.usuarioRegistro || currentUsername || 'Sistema',
      createdAt: licencia?.createdAt || now,
      updatedAt: now,
    };

    onSave(record);
  };

  const delegacionLockedObj = delegacionesPermitidas.find((d) => d.id === effectiveDelegacionModalId);

  const diasCampoEditable = useMemo(() => {
    if (isInvernal) return false;
    if (isExtraordinaria && ['matrimonio', 'fallecimiento', 'nacimiento_padre', 'donacion_sangre', 'adopcion'].includes(subtipoId)) {
      return false;
    }
    if (isExcepcional && subtipoId === 'sin_goce_haberes') return false;
    return true;
  }, [isInvernal, isExtraordinaria, isExcepcional, subtipoId]);

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
                Régimen de Licencias Policiales — Anual (Art. 7), Invernal (5 d.), Extraordinarias (Arts. 41–53) y Excepcionales (Arts. 54–62)
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
          {/* 1. SELECCIÓN DE DELEGACIÓN Y PERSONAL POLICIAL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                1. Delegación y Personal Policial (Datos Heredados de Personal)
              </h3>
              <input
                type="text"
                value={personalSearch}
                onChange={(e) => setPersonalSearch(e.target.value)}
                placeholder="Buscar personal por Apellido, DNI o Jerarquía..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:w-64 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delegación *</label>
                {puedeCambiarDelegacion && !isEditing ? (
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-blue-900 absolute left-3 top-2.5 pointer-events-none" />
                    <select
                      value={effectiveDelegacionModalId}
                      onChange={(e) => {
                        setDelegacionModalId(e.target.value);
                        setPersonalSearch('');
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {delegacionesPermitidas.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 font-semibold text-slate-700 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {delegacionLockedObj?.nombre || config.dependencia || effectiveDelegacionModalId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Efectivo Policial ({filteredPersonalList.length}) *
                </label>
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

          {/* 2. TIPO DE LICENCIA, CAUSAL REGLAMENTARIA, FECHAS Y TRASLADO */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                2. Tipo de Licencia, Encuadre Reglamentario y Fechas
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  modoComputo === 'habiles'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-indigo-100 text-indigo-900'
                }`}
              >
                Cómputo: {modoComputo === 'habiles' ? 'Días Hábiles Administrativos' : 'Días Corridos'}
              </span>
            </div>

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
                  onChange={(e) => handleSelectTipoLicencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {tiposLicencia
                    .filter((t) => t.activo !== false)
                    .map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre}
                        {t.nombre.toLowerCase() === 'anual'
                          ? ' (Imputa saldo Art. 7 — Establecer días)'
                          : t.nombre.toLowerCase() === 'invernal'
                          ? ' (5 días hábiles — No descuenta Anual)'
                          : t.nombre.toLowerCase() === 'extraordinaria'
                          ? ' (Arts. 41 al 53 — No descuenta Anual)'
                          : t.nombre.toLowerCase() === 'excepcional'
                          ? ' (Arts. 54 al 62 — No descuenta Anual)'
                          : t.descuentaSaldoAnual
                          ? ' (Imputa saldo Art. 7)'
                          : ''}
                      </option>
                    ))}
                  <option value="__ADD_NEW__">+ Agregar otro tipo de licencia...</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isExtraordinaria && subtipoId === 'fallecimiento'
                    ? 'Fecha Deceso / Salida *'
                    : 'Fecha de Salida *'}
                </label>
                <input
                  type="date"
                  required
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {modoComputo === 'corridos' ? 'Días Corridos *' : 'Días Hábiles *'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={400}
                  required
                  readOnly={!diasCampoEditable}
                  value={diasInput}
                  placeholder={isAnual ? 'Establecer días...' : 'Días'}
                  onChange={(e) => {
                    if (!diasCampoEditable) return;
                    setDiasInput(e.target.value);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border font-bold focus:outline-none ${
                    !diasCampoEditable
                      ? 'bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed'
                      : isAnual && diasNumericos < 1
                      ? 'bg-amber-50 border-amber-400 text-slate-900 focus:ring-2 focus:ring-blue-600'
                      : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600'
                  }`}
                />
                {isAnual && selectedPersonal && (
                  <div className="text-[10px] text-blue-900 font-semibold mt-0.5">
                    Establezca días (Disp. Art. 7: {totalDisponiblePersonal} d.)
                  </div>
                )}
                {isInvernal && (
                  <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                    5 días hábiles fijos — No resta de Anual
                  </div>
                )}
              </div>
            </div>

            {/* Banner informativo específico para Invernal */}
            {isInvernal && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex items-center gap-2.5 text-cyan-950">
                <Info className="w-4 h-4 text-cyan-700 shrink-0" />
                <div>
                  <strong>Licencia Invernal Reglamentaria:</strong> Corresponden <strong>5 días hábiles administrativos</strong> y <strong>NO se restan</strong> del saldo disponible de Licencia Anual (Art. 7).
                </div>
              </div>
            )}

            {/* Formulario rápido para crear otro tipo de licencia */}
            {showNewTipoForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-blue-950 mb-1">Nombre del Nuevo Tipo de Licencia</label>
                    <input
                      type="text"
                      value={newTipoNombre}
                      onChange={(e) => setNewTipoNombre(e.target.value)}
                      placeholder="Ej. Comisión Especial, Médica Junta, Permiso Especial..."
                      className="w-full px-3 py-1.5 rounded-lg border border-blue-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-950 mb-1">Cómputo de Días</label>
                    <select
                      value={newTipoModoComputo}
                      onChange={(e) => setNewTipoModoComputo(e.target.value as 'habiles' | 'corridos')}
                      className="w-full px-3 py-1.5 rounded-lg border border-blue-300 bg-white"
                    >
                      <option value="habiles">Días Hábiles Administrativos</option>
                      <option value="corridos">Días Corridos</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 font-semibold text-blue-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTipoDescuentaSaldo}
                      onChange={(e) => setNewTipoDescuentaSaldo(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-700"
                    />
                    <span>Descuenta saldo anual (Art. 7)</span>
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
              </div>
            )}

            {/* PANEL ESPECÍFICO: LICENCIAS EXTRAORDINARIAS (ARTS. 41 AL 53) */}
            {isExtraordinaria && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-950">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <span>Régimen de Licencias Extraordinarias (Arts. 41 al 53)</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded">
                    Art. 41: No acumulativa ni compensable en dinero — No descuenta saldo Anual
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-indigo-950 mb-1">
                      Causal / Inciso Extraordinario (Art. 41) *
                    </label>
                    <select
                      value={subtipoId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSubtipoId(nextId);
                        const obj = SUBTIPOS_EXTRAORDINARIA.find((s) => s.id === nextId);
                        if (obj) {
                          if (nextId === 'fallecimiento') {
                            setDiasInput(String(parentescoSeleccionado.diasCorridos));
                          } else {
                            setDiasInput(String(obj.diasDefault));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold text-slate-900"
                    >
                      {SUBTIPOS_EXTRAORDINARIA.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Controles específicos según inciso Extraordinario */}
                  {subtipoId === 'fallecimiento' && (
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">
                        Parentesco del Familiar Fallecido (Art. 47) *
                      </label>
                      <select
                        value={parentescoId}
                        onChange={(e) => {
                          setParentescoId(e.target.value);
                          const found = PARENTESCO_FALLECIMIENTO_ART_47.find((p) => p.id === e.target.value);
                          if (found) setDiasInput(String(found.diasCorridos));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-bold text-slate-900"
                      >
                        <optgroup label="Inc. a) — 10 días corridos desde el deceso">
                          {PARENTESCO_FALLECIMIENTO_ART_47.filter((p) => p.inciso === 'a').map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} (10 días corridos)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Inc. b) — 6 días corridos desde el deceso">
                          {PARENTESCO_FALLECIMIENTO_ART_47.filter((p) => p.inciso === 'b').map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} (6 días corridos)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Inc. c) — 2 días corridos desde el deceso">
                          {PARENTESCO_FALLECIMIENTO_ART_47.filter((p) => p.inciso === 'c').map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} (2 días corridos)
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  {subtipoId === 'enfermedad_familiar' && (
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">
                        Término / Etapa (Arts. 43–45)
                      </label>
                      <select
                        value={enfermedadEtapa}
                        onChange={(e) => {
                          const val = e.target.value as 'inicial' | 'prorroga' | 'disponibilidad';
                          setEnfermedadEtapa(val);
                          setDiasInput(val === 'disponibilidad' ? '180' : '30');
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                      >
                        <option value="inicial">Art. 43: Inicial hasta 30 días corridos (Sanidad Policial)</option>
                        <option value="prorroga">Art. 43: Prórroga hasta 30 días corridos (Junta Médica)</option>
                        <option value="disponibilidad">Art. 44–45: Disponibilidad hasta 6 meses (Junta Médica)</option>
                      </select>
                    </div>
                  )}

                  {subtipoId === 'estudios' && (
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">
                        Modalidad de Estudios (Art. 48)
                      </label>
                      <select
                        value={estudiosModalidad}
                        onChange={(e) => {
                          const val = e.target.value as 'no_policial' | 'policial';
                          setEstudiosModalidad(val);
                          setDiasInput(val === 'no_policial' ? '7' : '10');
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                      >
                        <option value="no_policial">Inc. a) Cursos no policiales (máx. 7 d. corridos/turno — 28 d./año)</option>
                        <option value="policial">Inc. b) Estudios / Exámenes de cursos policiales (Jefatura)</option>
                      </select>
                    </div>
                  )}

                  {subtipoId === 'maternidad' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block font-semibold text-indigo-950 mb-1">
                          Modalidad de Maternidad (Art. 51)
                        </label>
                        <select
                          value={maternidadModalidad}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setMaternidadModalidad(val);
                            if (val === 'nino_muerto') setDiasInput('30');
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                        >
                          <option value="45_105">150 d. corridos (45 pre-parto + 105 post-parto)</option>
                          <option value="30_120">150 d. corridos (30 pre-parto + 120 post-parto)</option>
                          <option value="multiple">Inc. a) Nacimiento múltiple (+15 d. por hijo adicional)</option>
                          <option value="nino_muerto">Inc. b) Parto c/ niño muerto (pre + 30 d. post)</option>
                          <option value="pretermino">Inc. c) Pre-término (completa 150 d. corridos)</option>
                          <option value="diferido">Inc. d) Parto diferido (reajuste hasta +20 d.)</option>
                        </select>
                      </div>
                      {maternidadModalidad === 'multiple' && (
                        <div>
                          <label className="block font-semibold text-indigo-950 mb-1">
                            Hijos adicionales al primero (+15 días c/u)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={maternidadHijosExtra}
                            onChange={(e) => setMaternidadHijosExtra(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 bg-white font-bold"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {subtipoId === 'adopcion' && (
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">
                        Edad del Menor (Art. 52)
                      </label>
                      <select
                        value={adopcionEdad}
                        onChange={(e) => setAdopcionEdad(e.target.value as 'hasta_12m' | '12m_a_5a')}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                      >
                        <option value="hasta_12m">Inc. a) Hasta 12 meses — 90 días corridos</option>
                        <option value="12m_a_5a">Inc. b) Más de 12 meses y hasta 5 años — 60 días corridos</option>
                      </select>
                    </div>
                  )}

                  {subtipoId === 'antiguedad_ext' && (
                    <div>
                      <label className="block font-semibold text-indigo-950 mb-1">
                        Duración (Art. 53 — hasta 3 meses, única vez)
                      </label>
                      <select
                        value={mesesSeleccionados}
                        onChange={(e) => setMesesSeleccionados(Math.min(3, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                      >
                        <option value={1}>1 mes ({calcularDiasCorridosDesdeMeses(fechaSalida, 1)} días corridos)</option>
                        <option value={2}>2 meses ({calcularDiasCorridosDesdeMeses(fechaSalida, 2)} días corridos)</option>
                        <option value={3}>3 meses ({calcularDiasCorridosDesdeMeses(fechaSalida, 3)} días corridos)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-white/90 border border-indigo-200 rounded-lg p-2.5 text-[11px] text-indigo-950 space-y-1">
                  <div>
                    <strong>{subtipoExtraObj.articulo}:</strong> {subtipoExtraObj.resumenNorma}
                  </div>
                  <div className="text-slate-600">
                    Autoridad competente: <strong>{metadataReglamentaria.autoridadConcesion}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* PANEL ESPECÍFICO: LICENCIAS EXCEPCIONALES (ARTS. 54 AL 62) */}
            {isExcepcional && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <BookOpen className="w-4 h-4 text-amber-700" />
                    <span>Régimen de Licencias Excepcionales (Arts. 54 al 62)</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white border border-amber-300 text-amber-900 px-2 py-0.5 rounded">
                    Días corridos — No descuenta saldo Anual
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-amber-950 mb-1">
                      Tipo de Licencia Excepcional (Art. 55) *
                    </label>
                    <select
                      value={subtipoId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSubtipoId(nextId);
                        if (nextId === 'asuntos_personales') {
                          setDiasInput('30');
                        } else if (nextId === 'antiguedad_retiro') {
                          setMesesSeleccionados(6);
                          setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, 6)));
                        } else if (nextId === 'sin_goce_haberes') {
                          setDiasInput(String(calcularDiasCorridosDesdeMeses(fechaSalida, 6)));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-semibold text-slate-900"
                    >
                      {SUBTIPOS_EXCEPCIONAL.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subtipoId === 'asuntos_personales' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block font-semibold text-amber-950 mb-1">
                          Clasificación (Art. 56)
                        </label>
                        <select
                          value={asuntosClasificacion}
                          onChange={(e) => setAsuntosClasificacion(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-semibold"
                        >
                          <option value="familia">Inc. a) Asuntos de familia (incluye Art. 43)</option>
                          <option value="deportiva">Inc. b) Actividades deportivas en representación</option>
                          <option value="cultural">Inc. c) Culturales / Sociales / Científicas</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-amber-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={asuntosExcepcionArt43}
                          onChange={(e) => setAsuntosExcepcionArt43(e.target.checked)}
                          className="w-3.5 h-3.5 rounded"
                        />
                        <span>Causal comprendida en Art. 43 (exceptúa mínimo 5 años — Art. 57)</span>
                      </label>
                    </div>
                  )}

                  {subtipoId === 'antiguedad_retiro' && (
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">
                        Plazo hasta 6 meses (Art. 61 — c/ solicitud retiro voluntario)
                      </label>
                      <select
                        value={mesesSeleccionados}
                        onChange={(e) => setMesesSeleccionados(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6].map((m) => (
                          <option key={m} value={m}>
                            {m} {m === 1 ? 'mes' : 'meses'} ({calcularDiasCorridosDesdeMeses(fechaSalida, m)} días corridos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {subtipoId === 'sin_goce_haberes' && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-2.5 text-[11px] text-red-900 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Art. 62: Término fijo de 6 meses corridos ({calcularDiasCorridosDesdeMeses(fechaSalida, 6)} d.). NO es computable para antigüedad, retiro ni ascenso.
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-white/90 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-950 space-y-1">
                  <div>
                    <strong>{subtipoExcepObj.articulo}:</strong> {subtipoExcepObj.resumenNorma}
                  </div>
                  <div className="text-slate-600">
                    Autoridad competente: <strong>{metadataReglamentaria.autoridadConcesion}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Alertas reglamentarias si incumple antigüedad o topes */}
            {alertasReglamentarias.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1 text-amber-950">
                {alertasReglamentarias.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{msg}</span>
                  </div>
                ))}
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
            {calculoReanudacion ? (
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
                    {modoComputo === 'habiles' ? (
                      <>
                        <div>
                          Fines de semana excluidos: <strong>{calculoReanudacion.finesDeSemanaSaltados} d.</strong>
                        </div>
                        <div>
                          Feriados en el período: <strong>{calculoReanudacion.feriadosEnRango.length}</strong>
                          {calculoReanudacion.feriadosEnRango.length > 0 && (
                            <span className="ml-1 text-emerald-800">
                              (
                              {calculoReanudacion.feriadosEnRango
                                .map((f) => `${formatFechaDisplay(f.fecha)}: ${f.nombre}`)
                                .join('; ')}
                              )
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        Cómputo en <strong>{diasNumericos} días corridos</strong> (incluye fines de semana y feriados).
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    {modoComputo === 'habiles'
                      ? 'Cómputo automático en días hábiles administrativos (lunes a viernes, sin feriados).'
                      : 'Cómputo automático en días corridos calendario.'}
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
                            d.estado === 'Licencia' || d.estado === 'Día Corrido'
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
                        <span className="text-slate-500 truncate max-w-[240px]">{d.nota || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Establezca la cantidad de días para calcular automáticamente el último día y la fecha de reanudación (08:00 hs.).
                </span>
              </div>
            )}
          </div>

          {/* 3. LÓGICA DE IMPUTACIÓN MULTI-AÑO (ÚNICAMENTE SI DESCUENTA SALDO ANUAL) */}
          {descuentaSaldo && selectedPersonal && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    3. Imputación Multi-Año de Días Disponibles (Art. 7)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fraccione los {diasNumericos || 0} días establecidos entre uno o varios períodos anuales activos.
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
                          Antigüedad en {bal.anio}:{' '}
                          <strong>
                            {bal.antiguedadEnAnio} {bal.antiguedadEnAnio === 1 ? 'año' : 'años'}
                          </strong>
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
                    diasNumericos > 0 && totalImputado === diasNumericos ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  Total imputado: {totalImputado} / {diasNumericos} días hábiles
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

          {/* 4. DISPOSICIÓN Y OBSERVACIONES */}
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
                placeholder="Notas adicionales, constancias médicas/examen o residencia transitoria..."
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
