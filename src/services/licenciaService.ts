import {
  FeriadoDiaNoLaborable,
  ImputacionAnioLicencia,
  LicenciaPolicial,
  Personal,
  SaldoLicenciaAnio,
  TipoLicenciaConfig,
} from '../types/police';

export const DEFAULT_TIPOS_LICENCIA: TipoLicenciaConfig[] = [
  {
    id: 'lic-anual',
    nombre: 'Anual',
    esDefault: true,
    descuentaSaldoAnual: true,
    modoComputo: 'habiles',
    articuloReglamento: 'Art. 7',
    activo: true,
  },
  {
    id: 'lic-invernal',
    nombre: 'Invernal',
    esDefault: true,
    descuentaSaldoAnual: false,
    modoComputo: 'habiles',
    diasSugeridos: 5,
    articuloReglamento: 'Licencia Invernal (5 días hábiles, no descuenta Anual)',
    activo: true,
  },
  {
    id: 'lic-extraordinaria',
    nombre: 'Extraordinaria',
    esDefault: true,
    descuentaSaldoAnual: false,
    modoComputo: 'corridos',
    articuloReglamento: 'Arts. 41 al 53',
    activo: true,
  },
  {
    id: 'lic-excepcional',
    nombre: 'Excepcional',
    esDefault: true,
    descuentaSaldoAnual: false,
    modoComputo: 'corridos',
    articuloReglamento: 'Arts. 54 al 62',
    activo: true,
  },
];

/**
 * Garantiza que los tipos reglamentarios predeterminados mantengan sus reglas oficiales
 * (Invernal = 5 días hábiles y no descuenta de Anual; presencia de Excepcional),
 * preservando cualquier tipo personalizado cargado por el usuario.
 */
export function normalizeTiposLicenciaCatalogo(catalog?: TipoLicenciaConfig[]): TipoLicenciaConfig[] {
  const existing = Array.isArray(catalog) ? catalog : [];
  const normalizedDefaults = DEFAULT_TIPOS_LICENCIA.map((def) => {
    const found = existing.find(
      (item) =>
        item.id === def.id || item.nombre.trim().toLowerCase() === def.nombre.trim().toLowerCase()
    );
    if (!found) return def;
    if (def.id === 'lic-invernal') {
      return {
        ...found,
        esDefault: true,
        descuentaSaldoAnual: false,
        modoComputo: 'habiles' as const,
        diasSugeridos: 5,
        articuloReglamento: def.articuloReglamento,
      };
    }
    if (def.id === 'lic-anual') {
      return {
        ...found,
        esDefault: true,
        descuentaSaldoAnual: true,
        modoComputo: 'habiles' as const,
        diasSugeridos: undefined,
        articuloReglamento: def.articuloReglamento,
      };
    }
    return {
      ...found,
      esDefault: true,
      descuentaSaldoAnual: def.descuentaSaldoAnual,
      modoComputo: found.modoComputo || def.modoComputo,
      articuloReglamento: found.articuloReglamento || def.articuloReglamento,
    };
  });

  const defaultNames = new Set(DEFAULT_TIPOS_LICENCIA.map((d) => d.nombre.toLowerCase()));
  const customOnly = existing.filter(
    (item) => !defaultNames.has(item.nombre.trim().toLowerCase()) && !DEFAULT_TIPOS_LICENCIA.some((d) => d.id === item.id)
  );
  return [...normalizedDefaults, ...customOnly];
}

export interface ParentescoFallecimientoItem {
  id: string;
  label: string;
  inciso: 'a' | 'b' | 'c';
  diasCorridos: number;
  grupoDescripcion: string;
}

/**
 * Art. 47 — Escala oficial de días corridos por fallecimiento de familiares cercanos,
 * contando a partir del día del deceso.
 */
export const PARENTESCO_FALLECIMIENTO_ART_47: ParentescoFallecimientoItem[] = [
  // Inciso a) 10 días corridos
  { id: 'conyuge', label: 'Cónyuge', inciso: 'a', diasCorridos: 10, grupoDescripcion: 'Inc. a) — 10 días corridos' },
  {
    id: 'pareja_perdurable',
    label: 'Pareja perdurable (aparente matrimonio)',
    inciso: 'a',
    diasCorridos: 10,
    grupoDescripcion: 'Inc. a) — 10 días corridos',
  },
  { id: 'hijos', label: 'Hijo / Hija', inciso: 'a', diasCorridos: 10, grupoDescripcion: 'Inc. a) — 10 días corridos' },
  { id: 'padres', label: 'Padre / Madre', inciso: 'a', diasCorridos: 10, grupoDescripcion: 'Inc. a) — 10 días corridos' },

  // Inciso b) 6 días corridos
  { id: 'hermanos', label: 'Hermano / Hermana', inciso: 'b', diasCorridos: 6, grupoDescripcion: 'Inc. b) — 6 días corridos' },
  { id: 'abuelos', label: 'Abuelo / Abuela', inciso: 'b', diasCorridos: 6, grupoDescripcion: 'Inc. b) — 6 días corridos' },
  { id: 'nietos', label: 'Nieto / Nieta', inciso: 'b', diasCorridos: 6, grupoDescripcion: 'Inc. b) — 6 días corridos' },
  { id: 'suegros', label: 'Suegro / Suegra', inciso: 'b', diasCorridos: 6, grupoDescripcion: 'Inc. b) — 6 días corridos' },

  // Inciso c) 2 días corridos
  { id: 'tios', label: 'Tío / Tía', inciso: 'c', diasCorridos: 2, grupoDescripcion: 'Inc. c) — 2 días corridos' },
  {
    id: 'hermanos_politicos',
    label: 'Hermano/a político/a (Cuñado/a)',
    inciso: 'c',
    diasCorridos: 2,
    grupoDescripcion: 'Inc. c) — 2 días corridos',
  },
  {
    id: 'hijos_politicos',
    label: 'Hijo/a político/a (Yerno / Nuera)',
    inciso: 'c',
    diasCorridos: 2,
    grupoDescripcion: 'Inc. c) — 2 días corridos',
  },
  { id: 'padrastro', label: 'Padrastro', inciso: 'c', diasCorridos: 2, grupoDescripcion: 'Inc. c) — 2 días corridos' },
  { id: 'madrastra', label: 'Madrastra', inciso: 'c', diasCorridos: 2, grupoDescripcion: 'Inc. c) — 2 días corridos' },
  { id: 'hijastro', label: 'Hijastro / Hijastra', inciso: 'c', diasCorridos: 2, grupoDescripcion: 'Inc. c) — 2 días corridos' },
  {
    id: 'primos_hermanos',
    label: 'Primo/a hermano/a',
    inciso: 'c',
    diasCorridos: 2,
    grupoDescripcion: 'Inc. c) — 2 días corridos',
  },
  { id: 'sobrinos', label: 'Sobrino / Sobrina', inciso: 'c', diasCorridos: 2, grupoDescripcion: 'Inc. c) — 2 días corridos' },
  {
    id: 'bisabuelos',
    label: 'Bisabuelo / Bisabuela',
    inciso: 'c',
    diasCorridos: 2,
    grupoDescripcion: 'Inc. c) — 2 días corridos',
  },
];

export interface SubtipoReglamentarioConfig {
  id: string;
  inciso: string;
  nombre: string;
  etiquetaCorta: string;
  articulo: string;
  modoComputo: 'habiles' | 'corridos';
  diasDefault: number;
  autoridad: string;
  resumenNorma: string;
}

/**
 * Arts. 41 al 53 — Licencias Extraordinarias (no acumulativas ni compensables en dinero)
 */
export const SUBTIPOS_EXTRAORDINARIA: SubtipoReglamentarioConfig[] = [
  {
    id: 'matrimonio',
    inciso: 'a)',
    nombre: 'a) Para contraer matrimonio (Art. 42)',
    etiquetaCorta: 'Matrimonio (Art. 42)',
    articulo: 'Art. 42',
    modoComputo: 'habiles',
    diasDefault: 12,
    autoridad: 'Jefatura de Policía',
    resumenNorma: '12 días hábiles. Requiere antigüedad mínima de 6 meses desde el alta en la institución.',
  },
  {
    id: 'enfermedad_familiar',
    inciso: 'b)',
    nombre: 'b) Por enfermedad de familiares (Arts. 43–46)',
    etiquetaCorta: 'Enfermedad Familiar (Art. 43)',
    articulo: 'Arts. 43–46',
    modoComputo: 'corridos',
    diasDefault: 30,
    autoridad: 'Servicio de Sanidad Policial / Junta Médica',
    resumenNorma:
      'Hasta 30 días corridos continuos o discontinuos por año calendario (prorrogable por 30 d. más con Junta Médica; excepcional hasta 6 meses en disponibilidad Art. 114 inc. c).',
  },
  {
    id: 'fallecimiento',
    inciso: 'c)',
    nombre: 'c) Por fallecimiento de familiares cercanos (Art. 47)',
    etiquetaCorta: 'Fallecimiento (Art. 47)',
    articulo: 'Art. 47',
    modoComputo: 'corridos',
    diasDefault: 10,
    autoridad: 'Jefatura / Jefe de Dependencia',
    resumenNorma:
      'Días corridos a partir del deceso según parentesco: Inc. a) 10 días | Inc. b) 6 días | Inc. c) 2 días.',
  },
  {
    id: 'estudios',
    inciso: 'd)',
    nombre: 'd) Para rendir exámenes / Estudios (Art. 48)',
    etiquetaCorta: 'Estudios / Exámenes (Art. 48)',
    articulo: 'Art. 48',
    modoComputo: 'corridos',
    diasDefault: 7,
    autoridad: 'Jefe de Dependencia / Jefatura de Policía',
    resumenNorma:
      'Inc. a) Cursos no policiales: hasta 28 días corridos/año calendario en períodos no superiores a 7 días. Inc. b) Cursos policiales: según Jefatura.',
  },
  {
    id: 'nacimiento_padre',
    inciso: 'e)',
    nombre: 'e) Por nacimiento de hijos — para el padre (Art. 49)',
    etiquetaCorta: 'Nacimiento de Hijo (Art. 49)',
    articulo: 'Art. 49',
    modoComputo: 'corridos',
    diasDefault: 3,
    autoridad: 'Jefe Inmediato',
    resumenNorma:
      '3 días corridos para personal policial masculino. Justificar al reintegro con constancia de nacimiento.',
  },
  {
    id: 'donacion_sangre',
    inciso: 'f)',
    nombre: 'f) Por donación de sangre (Art. 50)',
    etiquetaCorta: 'Donación de Sangre (Art. 50)',
    articulo: 'Art. 50',
    modoComputo: 'corridos',
    diasDefault: 1,
    autoridad: 'Jefe Inmediato',
    resumenNorma: '1 día de licencia luego de cada extracción voluntaria justificada.',
  },
  {
    id: 'maternidad',
    inciso: 'g.1)',
    nombre: 'g) Por maternidad (Art. 51)',
    etiquetaCorta: 'Maternidad (Art. 51)',
    articulo: 'Art. 51',
    modoComputo: 'corridos',
    diasDefault: 150,
    autoridad: 'Servicio de Sanidad Policial / Salud Provincial',
    resumenNorma:
      '150 días corridos (45 pre + 105 post, o 30 pre + 120 post). Nacimiento múltiple: +15 d. por hijo adicional; pre-término completa 150 d.; diferido hasta +20 d.; niño muerto: pre + 30 d. post.',
  },
  {
    id: 'adopcion',
    inciso: 'g.2)',
    nombre: 'g) Por adopción / tenencia de menores (Art. 52)',
    etiquetaCorta: 'Adopción (Art. 52)',
    articulo: 'Art. 52',
    modoComputo: 'corridos',
    diasDefault: 90,
    autoridad: 'Jefatura de Policía',
    resumenNorma:
      'Desde el día siguiente a la tenencia: niño hasta 12 meses = 90 días corridos; > 12 meses hasta 5 años = 60 días corridos.',
  },
  {
    id: 'antiguedad_ext',
    inciso: 'h)',
    nombre: 'h) Por antigüedad (Art. 53)',
    etiquetaCorta: 'Antigüedad +20 años (Art. 53)',
    articulo: 'Art. 53',
    modoComputo: 'corridos',
    diasDefault: 90,
    autoridad: 'Decreto del Poder Ejecutivo Provincial',
    resumenNorma:
      'Hasta 3 meses con goce íntegro de haberes, por una sola vez en la carrera policial. Requiere más de 20 años de servicio simple policial.',
  },
];

/**
 * Arts. 54 al 62 — Licencias Excepcionales
 */
export const SUBTIPOS_EXCEPCIONAL: SubtipoReglamentarioConfig[] = [
  {
    id: 'asuntos_personales',
    inciso: 'a)',
    nombre: 'a) Por asuntos personales (Arts. 56–60)',
    etiquetaCorta: 'Asuntos Personales (Arts. 56–60)',
    articulo: 'Arts. 56–60',
    modoComputo: 'corridos',
    diasDefault: 30,
    autoridad: 'Jefatura de Policía / Poder Ejecutivo Provincial',
    resumenNorma:
      'Requiere mínimo 5 años de antigüedad policial (excepto causal Art. 43). Hasta 30 d.: Jefatura; 31–60 d.: Poder Ejecutivo; >2 a 6 meses: disponibilidad Art. 114 inc. c).',
  },
  {
    id: 'antiguedad_retiro',
    inciso: 'b)',
    nombre: 'b) Por antigüedad para el retiro (Art. 61)',
    etiquetaCorta: 'Antigüedad p/ Retiro (Art. 61)',
    articulo: 'Art. 61',
    modoComputo: 'corridos',
    diasDefault: 180,
    autoridad: 'Poder Ejecutivo Provincial',
    resumenNorma:
      'Hasta 6 meses con solicitud simultánea de retiro voluntario. Antigüedad mínima policial: 29 años Personal Superior o 24 años Personal Subalterno.',
  },
  {
    id: 'sin_goce_haberes',
    inciso: 'c)',
    nombre: 'c) Razones particulares sin goce de haberes (Art. 62)',
    etiquetaCorta: 'Sin Goce de Haberes (Art. 62)',
    articulo: 'Art. 62',
    modoComputo: 'corridos',
    diasDefault: 180,
    autoridad: 'Poder Ejecutivo Provincial',
    resumenNorma:
      '6 meses corridos. Requiere mínimo 5 años en servicio efectivo. Este término NO es computable para antigüedad, retiro ni ascenso.',
  },
];

export function esPersonalSuperior(jerarquia?: string): boolean {
  const j = (jerarquia || '').toLowerCase();
  return (
    j.includes('comisario') ||
    j.includes('oficial principal') ||
    j.includes('oficial inspector') ||
    j.includes('oficial subinspector') ||
    j.includes('oficial ayudante')
  );
}

/**
 * Feriados oficiales pre-cargados (2025-2027) para el cálculo automático de días hábiles.
 * En noviembre 2026 se contempla el feriado trasladado del Día de la Soberanía Nacional (23/11/2026)
 * para garantizar el cómputo exacto: 7 días desde 13/11/2026 -> reanudación 25/11/2026 a las 08:00 hs.
 */
export const DEFAULT_FERIADOS_ARGENTINA: FeriadoDiaNoLaborable[] = [
  // 2025
  { id: 'fer-2025-01-01', fecha: '2025-01-01', nombre: 'Año Nuevo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-03-03', fecha: '2025-03-03', nombre: 'Carnaval (Lunes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-03-04', fecha: '2025-03-04', nombre: 'Carnaval (Martes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-03-24', fecha: '2025-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-04-02', fecha: '2025-04-02', nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-04-18', fecha: '2025-04-18', nombre: 'Viernes Santo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-05-01', fecha: '2025-05-01', nombre: 'Día del Trabajador', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-05-25', fecha: '2025-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-06-16', fecha: '2025-06-16', nombre: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-06-20', fecha: '2025-06-20', nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-07-09', fecha: '2025-07-09', nombre: 'Día de la Independencia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-08-15', fecha: '2025-08-15', nombre: 'Día no laborable con fines turísticos', tipo: 'No Laborable', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-10-12', fecha: '2025-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-11-24', fecha: '2025-11-24', nombre: 'Día de la Soberanía Nacional', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-12-08', fecha: '2025-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'fer-2025-12-25', fecha: '2025-12-25', nombre: 'Navidad', tipo: 'Nacional', origen: 'Sistema', createdAt: '2025-01-01T00:00:00.000Z' },

  // 2026
  { id: 'fer-2026-01-01', fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-02-16', fecha: '2026-02-16', nombre: 'Carnaval (Lunes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-02-17', fecha: '2026-02-17', nombre: 'Carnaval (Martes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-03-24', fecha: '2026-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-04-02', fecha: '2026-04-02', nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-04-03', fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-05-01', fecha: '2026-05-01', nombre: 'Día del Trabajador', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-05-25', fecha: '2026-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-06-15', fecha: '2026-06-15', nombre: 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-06-20', fecha: '2026-06-20', nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-07-09', fecha: '2026-07-09', nombre: 'Día de la Independencia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-08-17', fecha: '2026-08-17', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-10-12', fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-11-23', fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional (Trasladado)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-12-08', fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'fer-2026-12-25', fecha: '2026-12-25', nombre: 'Navidad', tipo: 'Nacional', origen: 'Sistema', createdAt: '2026-01-01T00:00:00.000Z' },

  // 2027
  { id: 'fer-2027-01-01', fecha: '2027-01-01', nombre: 'Año Nuevo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-02-08', fecha: '2027-02-08', nombre: 'Carnaval (Lunes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-02-09', fecha: '2027-02-09', nombre: 'Carnaval (Martes)', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-03-24', fecha: '2027-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-03-26', fecha: '2027-03-26', nombre: 'Viernes Santo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-04-02', fecha: '2027-04-02', nombre: 'Día del Veterano y de los Caídos en la Guerra de Malvinas', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-05-01', fecha: '2027-05-01', nombre: 'Día del Trabajador', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-05-25', fecha: '2027-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-06-20', fecha: '2027-06-20', nombre: 'Paso a la Inmortalidad del Gral. Manuel Belgrano', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-07-09', fecha: '2027-07-09', nombre: 'Día de la Independencia', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-08-16', fecha: '2027-08-16', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-10-11', fecha: '2027-10-11', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-11-22', fecha: '2027-11-22', nombre: 'Día de la Soberanía Nacional', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-12-08', fecha: '2027-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
  { id: 'fer-2027-12-25', fecha: '2027-12-25', nombre: 'Navidad', tipo: 'Nacional', origen: 'Sistema', createdAt: '2027-01-01T00:00:00.000Z' },
];

/**
 * Calcula los años de antigüedad cumplidos (SOLAMENTE años enteros, sin meses).
 */
export function calcularAniosAntiguedad(fechaIngreso?: string, fechaRef?: string): number {
  if (!fechaIngreso) return 0;
  const ing = parseYmdLocal(fechaIngreso);
  if (!ing) return 0;
  const ref = fechaRef ? parseYmdLocal(fechaRef) : new Date();
  if (!ref) return 0;

  let anios = ref.getFullYear() - ing.getFullYear();
  const mesDiff = ref.getMonth() - ing.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && ref.getDate() < ing.getDate())) {
    anios -= 1;
  }
  return Math.max(0, anios);
}

/**
 * Calcula meses exactos de servicio desde fechaIngreso hasta fechaRef (utilizado internamente para Art. 42: mínimo 6 meses).
 */
export function calcularMesesAntiguedadExactos(fechaIngreso?: string, fechaRef?: string): number {
  if (!fechaIngreso) return 0;
  const ing = parseYmdLocal(fechaIngreso);
  if (!ing) return 0;
  const ref = fechaRef ? parseYmdLocal(fechaRef) : new Date();
  if (!ref || ref < ing) return 0;

  let meses = (ref.getFullYear() - ing.getFullYear()) * 12 + (ref.getMonth() - ing.getMonth());
  if (ref.getDate() < ing.getDate()) {
    meses -= 1;
  }
  return Math.max(0, meses);
}

/**
 * Calcula la cantidad exacta de días corridos equivalentes a `meses` calendario a partir de `fechaSalida`.
 */
export function calcularDiasCorridosDesdeMeses(fechaSalida: string, meses: number): number {
  const start = parseYmdLocal(fechaSalida);
  const m = Math.max(1, Math.floor(meses));
  if (!start) return m * 30;
  const endExcl = new Date(start.getFullYear(), start.getMonth() + m, start.getDate());
  const diffMs = endExcl.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Escala oficial de días hábiles administrativos según antigüedad (Art. 7 Régimen de Licencias Policiales):
 * - Hasta 5 años: 14 días hábiles
 * - De 6 a 10 años: 21 días hábiles
 * - De 11 a 15 años: 28 días hábiles
 * - De 16 a 20 años: 35 días hábiles
 * - De 21 a 25 años: 42 días hábiles
 * - Más de 25 años (26+): 49 días hábiles
 */
export function getDiasEscalaArt7(aniosAntiguedad: number): number {
  if (aniosAntiguedad <= 5) return 14;
  if (aniosAntiguedad <= 10) return 21;
  if (aniosAntiguedad <= 15) return 28;
  if (aniosAntiguedad <= 20) return 35;
  if (aniosAntiguedad <= 25) return 42;
  return 49;
}

export const ESCALA_ART_7 = [
  { rango: 'Hasta 5 años', min: 0, max: 5, dias: 14 },
  { rango: '6 a 10 años', min: 6, max: 10, dias: 21 },
  { rango: '11 a 15 años', min: 11, max: 15, dias: 28 },
  { rango: '16 a 20 años', min: 16, max: 20, dias: 35 },
  { rango: '21 a 25 años', min: 21, max: 25, dias: 42 },
  { rango: '26 años o más', min: 26, max: 99, dias: 49 },
];

/**
 * Cálculo de días adicionales por viaje / traslado terrestre (Art. 11):
 * - Menos de 300 km: 0 días
 * - 300 a 600 km: 1 día
 * - 601 a 1200 km: 2 días
 * - 1201 a 2000 km: 3 días
 * - 2001 a 3000 km: 4 días
 * - Más de 3000 km: 5 días
 */
export function getDiasViajeArt11(km: number): number {
  if (!Number.isFinite(km) || km < 300) return 0;
  if (km <= 600) return 1;
  if (km <= 1200) return 2;
  if (km <= 2000) return 3;
  if (km <= 3000) return 4;
  return 5;
}

export const ESCALA_VIAJE_ART_11 = [
  { label: 'Sin traslado (< 300 km)', kmEjemplo: 0, dias: 0 },
  { label: '300 a 600 km (1 día)', kmEjemplo: 450, dias: 1 },
  { label: '601 a 1.200 km (2 días)', kmEjemplo: 900, dias: 2 },
  { label: '1.201 a 2.000 km (3 días)', kmEjemplo: 1500, dias: 3 },
  { label: '2.001 a 3.000 km (4 días)', kmEjemplo: 2500, dias: 4 },
  { label: 'Más de 3.000 km (5 días)', kmEjemplo: 3200, dias: 5 },
];

export function parseYmdLocal(ymd?: string): Date | null {
  if (!ymd || typeof ymd !== 'string') return null;
  const clean = ymd.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(year, month, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

export function formatDateYmdLocal(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatFechaDisplay(ymd?: string): string {
  if (!ymd) return '---';
  const clean = ymd.slice(0, 10);
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

export interface DiaDetalleLicencia {
  fecha: string;
  estado: 'Licencia' | 'Día Corrido' | 'Fin de Semana' | 'Feriado' | 'Viaje Art. 11' | 'Reanudación';
  nota?: string;
}

export interface ResultadoCalculoReanudacion {
  fechaFinLicencia: string;
  fechaReanudacion: string;
  horaReanudacion: string;
  modoComputo: 'habiles' | 'corridos';
  feriadosEnRango: FeriadoDiaNoLaborable[];
  finesDeSemanaSaltados: number;
  detalleDias: DiaDetalleLicencia[];
}

/**
 * Calcula automáticamente la fecha de finalización y reanudación (a las 08:00 hs.)
 * - modoComputo = 'habiles' (predeterminado): Días hábiles administrativos (lunes a viernes, excluyendo feriados/días no laborables)
 * - modoComputo = 'corridos': Días corridos calendario (incluye sábados, domingos y feriados)
 * En ambos casos suma los días adicionales por viaje/traslado terrestre (Art. 11) si corresponde.
 */
export function calcularFechaReanudacion(params: {
  fechaSalida: string;
  diasHabiles: number;
  diasViajeArt11?: number;
  feriados: FeriadoDiaNoLaborable[];
  modoComputo?: 'habiles' | 'corridos';
}): ResultadoCalculoReanudacion | null {
  const startDate = parseYmdLocal(params.fechaSalida);
  const diasSolicitados = Math.max(1, Math.floor(Number(params.diasHabiles) || 0));
  const diasViaje = Math.max(0, Math.floor(Number(params.diasViajeArt11) || 0));
  const modoComputo = params.modoComputo === 'corridos' ? 'corridos' : 'habiles';
  if (!startDate) return null;

  const feriadoMap = new Map<string, FeriadoDiaNoLaborable>();
  for (const f of params.feriados || []) {
    if (f?.fecha) {
      feriadoMap.set(f.fecha.slice(0, 10), f);
    }
  }

  const isWeekend = (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const detalleDias: DiaDetalleLicencia[] = [];
  const feriadosEnRango: FeriadoDiaNoLaborable[] = [];
  let finesDeSemanaSaltados = 0;

  let cursor = new Date(startDate.getTime());
  let contados = 0;
  let ultimoDiaLicencia = new Date(startDate.getTime());
  let safety = 0;

  if (modoComputo === 'corridos') {
    while (contados < diasSolicitados && safety < 2000) {
      safety++;
      contados++;
      const ymd = formatDateYmdLocal(cursor);
      ultimoDiaLicencia = new Date(cursor.getTime());
      if (detalleDias.length < 400) {
        const feriado = feriadoMap.get(ymd);
        detalleDias.push({
          fecha: ymd,
          estado: 'Día Corrido',
          nota: `Día corrido ${contados} de ${diasSolicitados}${feriado ? ` (${feriado.nombre})` : ''}`,
        });
      }
      if (contados < diasSolicitados) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  } else {
    while (contados < diasSolicitados && safety < 1500) {
      safety++;
      const ymd = formatDateYmdLocal(cursor);
      const feriado = feriadoMap.get(ymd);

      if (isWeekend(cursor)) {
        finesDeSemanaSaltados++;
        detalleDias.push({ fecha: ymd, estado: 'Fin de Semana' });
      } else if (feriado) {
        feriadosEnRango.push(feriado);
        detalleDias.push({ fecha: ymd, estado: 'Feriado', nota: feriado.nombre });
      } else {
        contados++;
        ultimoDiaLicencia = new Date(cursor.getTime());
        detalleDias.push({ fecha: ymd, estado: 'Licencia', nota: `Día hábil ${contados} de ${diasSolicitados}` });
      }

      if (contados < diasSolicitados) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  // Sumar días adicionales por traslado terrestre Art. 11
  let travelRemaining = diasViaje;
  let ultimoDiaEfectivo = new Date(ultimoDiaLicencia.getTime());
  while (travelRemaining > 0 && safety < 2500) {
    safety++;
    cursor.setDate(cursor.getDate() + 1);
    const ymd = formatDateYmdLocal(cursor);
    travelRemaining--;
    ultimoDiaEfectivo = new Date(cursor.getTime());
    detalleDias.push({
      fecha: ymd,
      estado: 'Viaje Art. 11',
      nota: `Traslado terrestre (${diasViaje - travelRemaining}/${diasViaje})`,
    });
  }

  const reanudacion = new Date(ultimoDiaEfectivo.getTime());
  reanudacion.setDate(reanudacion.getDate() + 1);

  if (modoComputo === 'corridos') {
    detalleDias.push({
      fecha: formatDateYmdLocal(reanudacion),
      estado: 'Reanudación',
      nota: 'Reintegro al servicio 08:00 hs.',
    });
  } else {
    // En días hábiles administrativos, la reanudación pasa al siguiente día hábil
    while (safety < 3000) {
      safety++;
      const ymd = formatDateYmdLocal(reanudacion);
      const feriado = feriadoMap.get(ymd);
      if (isWeekend(reanudacion)) {
        finesDeSemanaSaltados++;
        detalleDias.push({ fecha: ymd, estado: 'Fin de Semana' });
        reanudacion.setDate(reanudacion.getDate() + 1);
      } else if (feriado) {
        feriadosEnRango.push(feriado);
        detalleDias.push({ fecha: ymd, estado: 'Feriado', nota: feriado.nombre });
        reanudacion.setDate(reanudacion.getDate() + 1);
      } else {
        detalleDias.push({ fecha: ymd, estado: 'Reanudación', nota: 'Reintegro al servicio 08:00 hs.' });
        break;
      }
    }
  }

  return {
    fechaFinLicencia: formatDateYmdLocal(ultimoDiaEfectivo),
    fechaReanudacion: formatDateYmdLocal(reanudacion),
    horaReanudacion: '08:00',
    modoComputo,
    feriadosEnRango,
    finesDeSemanaSaltados,
    detalleDias,
  };
}

/**
 * Calcula los días disponibles para un efectivo en un año dado, teniendo en cuenta
 * saldos explícitos, vencimientos y licencias imputadas (restando días restituidos por interrupción Art. 15).
 */
export function calcularBalancePorAnio(
  personal: Personal,
  saldos: SaldoLicenciaAnio[],
  licencias: LicenciaPolicial[],
  anios: number[]
): Array<{
  anio: number;
  enServicio: boolean;
  antiguedadEnAnio: number;
  diasCorrespondientes: number;
  diasUsados: number;
  diasDisponibles: number;
  vencido: boolean;
  saldoRecord?: SaldoLicenciaAnio;
}> {
  const ingDate = parseYmdLocal(personal.fechaIngreso);
  const antiguedadHoy = calcularAniosAntiguedad(personal.fechaIngreso);
  const sortedYears = [...anios].sort((a, b) => a - b);

  return sortedYears.map((anio) => {
    const saldoRec = saldos.find((s) => s.personalId === personal.id && s.anio === anio);
    const enServicio = ingDate ? anio >= ingDate.getFullYear() : true;

    if (!enServicio && !saldoRec) {
      return {
        anio,
        enServicio: false,
        antiguedadEnAnio: 0,
        diasCorrespondientes: 0,
        diasUsados: 0,
        diasDisponibles: 0,
        vencido: false,
        saldoRecord: undefined,
      };
    }

    const antiguedadEnAnio = personal.fechaIngreso
      ? calcularAniosAntiguedad(personal.fechaIngreso, `${anio}-12-31`)
      : antiguedadHoy;

    const diasCorrespondientes = saldoRec
      ? saldoRec.diasCorrespondientes
      : getDiasEscalaArt7(antiguedadEnAnio);
    const vencido = Boolean(saldoRec?.vencido);

    // Calcular días usados sumando las imputaciones de licencias no anuladas
    let usadosPorLicencias = 0;
    for (const lic of licencias) {
      if (lic.personalId !== personal.id || !Array.isArray(lic.imputacionAnios)) continue;
      const imp = lic.imputacionAnios.find((i) => i.anio === anio);
      if (!imp) continue;
      // Si fue interrumpida (Art. 15), descontar proporcionalmente los días restituidos al último/respectivo año
      if (lic.fueInterrumpida && typeof lic.diasRestituidos === 'number' && lic.diasRestituidos > 0) {
        const totalImputado = lic.imputacionAnios.reduce((acc, x) => acc + (x.dias || 0), 0);
        if (totalImputado > 0) {
          const gozadosTotales = Math.max(0, totalImputado - lic.diasRestituidos);
          // Imputación secuencial sobre los años de la licencia: consume primero años más antiguos
          let restanteGozado = gozadosTotales;
          const orderedImps = [...lic.imputacionAnios].sort((a, b) => a.anio - b.anio);
          for (const item of orderedImps) {
            const consumed = Math.min(item.dias, Math.max(0, restanteGozado));
            restanteGozado -= consumed;
            if (item.anio === anio) {
              usadosPorLicencias += consumed;
            }
          }
          continue;
        }
      }
      usadosPorLicencias += imp.dias || 0;
    }

    const diasUsados = Math.max(usadosPorLicencias, saldoRec?.diasUsados || 0);
    const diasDisponibles = vencido ? 0 : Math.max(0, diasCorrespondientes - diasUsados);

    return {
      anio,
      enServicio,
      antiguedadEnAnio,
      diasCorrespondientes,
      diasUsados,
      diasDisponibles,
      vencido,
      saldoRecord: saldoRec,
    };
  });
}

/**
 * Sugiere distribución automática FIFO (primero años más antiguos no vencidos)
 * para cubrir `totalDias` solicitados.
 */
export function distribuirDiasMultiAnio(
  totalDias: number,
  balances: Array<{ anio: number; enServicio?: boolean; diasDisponibles: number; vencido: boolean }>
): ImputacionAnioLicencia[] {
  let remaining = Math.max(0, Math.floor(totalDias));
  const result: ImputacionAnioLicencia[] = [];
  const activos = [...balances]
    .filter((b) => b.enServicio !== false && !b.vencido && b.diasDisponibles > 0)
    .sort((a, b) => a.anio - b.anio);

  for (const b of activos) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.diasDisponibles);
    if (take > 0) {
      result.push({ anio: b.anio, dias: take });
      remaining -= take;
    }
  }
  return result;
}

export interface CondicionLicenciaActiva {
  enLicencia: boolean;
  tipoLicencia: string;
  fechaSalida?: string;
  fechaFinLicencia?: string;
  fechaReanudacion?: string;
  horaReanudacion?: string;
  licencia?: LicenciaPolicial;
  origen: 'modulo-licencias' | 'estado-personal';
}

/**
 * Determina si un efectivo se encuentra actualmente de licencia en una fecha dada
 * (cruzando tanto las Licencias Policiales registradas como el campo `estado` del legajo).
 * Utilizado para advertir y etiquetar su condición en Parte de Novedades y Recargos.
 */
export function getLicenciaActivaPersonal(
  personalIdOrName: string,
  fechaRef: string,
  licencias: LicenciaPolicial[],
  personalList: Personal[]
): CondicionLicenciaActiva | null {
  const ref = (fechaRef || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const person = personalList.find(
    (p) =>
      p.id === personalIdOrName ||
      p.apellidoYNombre.toLowerCase() === personalIdOrName.toLowerCase() ||
      `${p.jerarquia} ${p.apellidoYNombre}`.toLowerCase() === personalIdOrName.toLowerCase()
  );

  const pid = person?.id || personalIdOrName;
  const licenciaVigente = (licencias || []).find((lic) => {
    const matchesPerson =
      lic.personalId === pid ||
      (person && lic.dni && person.dni && lic.dni === person.dni);
    if (!matchesPerson) return false;

    const inicio = (lic.fechaSalida || '').slice(0, 10);
    if (!inicio || ref < inicio) return false;

    if (lic.fueInterrumpida && lic.fechaInterrupcion) {
      return ref <= lic.fechaInterrupcion.slice(0, 10);
    }

    const fin = (lic.fechaFinLicencia || '').slice(0, 10);
    // Se considera de licencia hasta el último día de licencia inclusive (reanuda a las 08:00 del día de reanudación)
    return fin ? ref <= fin : false;
  });

  if (licenciaVigente) {
    const tipoLabel = licenciaVigente.subtipoEtiqueta
      ? `${licenciaVigente.tipoLicencia}: ${licenciaVigente.subtipoEtiqueta}`
      : licenciaVigente.tipoLicencia;
    return {
      enLicencia: true,
      tipoLicencia: tipoLabel,
      fechaSalida: licenciaVigente.fechaSalida,
      fechaFinLicencia: licenciaVigente.fechaFinLicencia,
      fechaReanudacion: licenciaVigente.fechaReanudacion,
      horaReanudacion: licenciaVigente.horaReanudacion || '08:00',
      licencia: licenciaVigente,
      origen: 'modulo-licencias',
    };
  }

  if (person && (person.estado === 'Licencia Anual' || person.estado === 'Licencia Médica')) {
    return {
      enLicencia: true,
      tipoLicencia: person.estado,
      origen: 'estado-personal',
    };
  }

  return null;
}
