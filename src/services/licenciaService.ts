import {
  FeriadoDiaNoLaborable,
  ImputacionAnioLicencia,
  LicenciaPolicial,
  Personal,
  SaldoLicenciaAnio,
  TipoLicenciaConfig,
} from '../types/police';

export const DEFAULT_TIPOS_LICENCIA: TipoLicenciaConfig[] = [
  { id: 'lic-anual', nombre: 'Anual', esDefault: true, descuentaSaldoAnual: true, activo: true },
  { id: 'lic-invernal', nombre: 'Invernal', esDefault: true, descuentaSaldoAnual: false, diasSugeridos: 10, activo: true },
  { id: 'lic-extraordinaria', nombre: 'Extraordinaria', esDefault: true, descuentaSaldoAnual: false, activo: true },
];

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
  estado: 'Licencia' | 'Fin de Semana' | 'Feriado' | 'Viaje Art. 11' | 'Reanudación';
  nota?: string;
}

export interface ResultadoCalculoReanudacion {
  fechaFinLicencia: string;
  fechaReanudacion: string;
  horaReanudacion: string;
  feriadosEnRango: FeriadoDiaNoLaborable[];
  finesDeSemanaSaltados: number;
  detalleDias: DiaDetalleLicencia[];
}

/**
 * Calcula automáticamente la fecha de finalización y reanudación (a las 08:00 hs.)
 * contando estrictamente días hábiles administrativos (lunes a viernes, excluyendo feriados/días no laborables)
 * y sumando los días adicionales por viaje/traslado terrestre (Art. 11).
 *
 * Ejemplo verificado:
 * Salida: 13/11/2026 (viernes), 7 días hábiles, 1 feriado en el rango (ej. 23/11/2026):
 * - Día 1: 13/11 (Vie)
 * - 14/11 (Sáb), 15/11 (Dom) saltados
 * - Días 2..5: 16, 17, 18, 19/11 (Lun-Jue)
 * - Día 6: 20/11 (Vie)
 * - 21/11 (Sáb), 22/11 (Dom) saltados
 * - 23/11 (Lun - Feriado Soberanía Nacional) saltado
 * - Día 7: 24/11 (Mar) -> último día de licencia
 * - Reanudación: 25/11/2026 a las 08:00 hs.
 */
export function calcularFechaReanudacion(params: {
  fechaSalida: string;
  diasHabiles: number;
  diasViajeArt11?: number;
  feriados: FeriadoDiaNoLaborable[];
}): ResultadoCalculoReanudacion | null {
  const startDate = parseYmdLocal(params.fechaSalida);
  const diasHabiles = Math.max(1, Math.floor(Number(params.diasHabiles) || 0));
  const diasViaje = Math.max(0, Math.floor(Number(params.diasViajeArt11) || 0));
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

  while (contados < diasHabiles && safety < 1500) {
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
      detalleDias.push({ fecha: ymd, estado: 'Licencia', nota: `Día hábil ${contados} de ${diasHabiles}` });
    }

    if (contados < diasHabiles) {
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Sumar días adicionales por traslado terrestre Art. 11 (días corridos de viaje, o si cae inhábil al finalizar, reanuda siguiente hábil)
  let travelRemaining = diasViaje;
  let ultimoDiaEfectivo = new Date(ultimoDiaLicencia.getTime());
  while (travelRemaining > 0 && safety < 2000) {
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

  // Buscar el próximo día hábil administrativo para la reanudación de servicio (08:00 hs.)
  const reanudacion = new Date(ultimoDiaEfectivo.getTime());
  reanudacion.setDate(reanudacion.getDate() + 1);

  while (safety < 2500) {
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

  return {
    fechaFinLicencia: formatDateYmdLocal(ultimoDiaEfectivo),
    fechaReanudacion: formatDateYmdLocal(reanudacion),
    horaReanudacion: '08:00',
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
    return {
      enLicencia: true,
      tipoLicencia: licenciaVigente.tipoLicencia,
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
