import {
  ConfiguracionSistema,
  InspeccionOcular,
  IntervencionParte,
  ParteNovedadesGuardia,
  TipoIntervencion,
} from '../types/police';

/**
 * Extrae el número correlativo de un código I.O. (ej. "I.O. N° 005/2026" -> 5)
 * sin concatenar los dígitos del año.
 */
export function extractIoNumber(nroIO?: string): number {
  if (!nroIO) return 0;
  const beforeSlash = String(nroIO).split('/')[0] || '';
  const matches = beforeSlash.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  const parsed = parseInt(matches[matches.length - 1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Extrae el año de un código I.O. (ej. "I.O. N° 005/2026" -> 2026) o retorna fallbackYear.
 */
export function extractIoYear(nroIO?: string, fallbackYear?: number): number {
  const defaultYear = fallbackYear || new Date().getFullYear();
  if (!nroIO) return defaultYear;
  const parts = String(nroIO).split('/');
  if (parts.length >= 2) {
    const yearMatch = parts[1].match(/\d{4}/);
    if (yearMatch) {
      const y = parseInt(yearMatch[0], 10);
      if (y >= 2000 && y <= 2100) return y;
    }
  }
  return defaultYear;
}

/**
 * Formatea un número correlativo de Inspección Ocular: "I.O. Nº 005/2026"
 */
export function formatNroIO(num: number, anio?: number): string {
  const safeNum = Math.max(1, Math.floor(num || 1));
  const year = anio || new Date().getFullYear();
  return `I.O. Nº ${String(safeNum).padStart(3, '0')}/${year}`;
}

/**
 * Descarta valores corruptos históricos (> 10000) generados por el antiguo
 * parseo sin barra (ej. "0012026" -> 12026), conservando valores válidos.
 */
export function sanitizeUltimoNroIO(val?: number): number {
  if (!val || !Number.isFinite(val) || val < 0) return 0;
  if (val > 10000) return 0;
  return Math.floor(val);
}

interface CollectIoParams {
  inspecciones?: InspeccionOcular[];
  partesGuardia?: ParteNovedadesGuardia[];
  intervenciones?: IntervencionParte[];
  anio?: number;
  delegacionId?: string;
  excludeId?: string;
  excludeIntervencionId?: string;
}

/**
 * Recolecta todos los números de I.O. ya utilizados para el año (y delegación si aplica),
 * junto con un mapa numero -> código/descripción para detectar duplicados.
 */
export function collectUsedIoNumbersMap({
  inspecciones = [],
  partesGuardia = [],
  intervenciones = [],
  anio,
  delegacionId,
  excludeId,
  excludeIntervencionId,
}: CollectIoParams): Map<number, string> {
  const targetYear = anio || new Date().getFullYear();
  const used = new Map<number, string>();

  const shouldIncludeDelegacion = (itemDelId?: string) => {
    if (!delegacionId || delegacionId === 'todas') return true;
    return !itemDelId || itemDelId === delegacionId;
  };

  const registerIfMatch = (
    id: string | undefined,
    intervencionId: string | undefined,
    nroIO: string | undefined,
    delId?: string
  ) => {
    if (!nroIO) return;
    if (!shouldIncludeDelegacion(delId)) return;
    if (excludeId && id === excludeId) return;
    if (excludeIntervencionId && (id === excludeIntervencionId || intervencionId === excludeIntervencionId)) return;
    if (excludeId && intervencionId === excludeId) return;

    const num = extractIoNumber(nroIO);
    if (num <= 0) return;
    const yr = extractIoYear(nroIO, targetYear);
    if (yr !== targetYear) return;

    if (!used.has(num)) {
      used.set(num, nroIO);
    }
  };

  inspecciones.forEach((io) => {
    registerIfMatch(io.id, io.intervencionId, io.nroIO, io.delegacionId);
  });

  partesGuardia.forEach((parte) => {
    if (!shouldIncludeDelegacion(parte.delegacionId)) return;
    (parte.intervenciones || []).forEach((interv) => {
      registerIfMatch(interv.id, interv.id, interv.nroIO, parte.delegacionId);
    });
  });

  intervenciones.forEach((interv) => {
    registerIfMatch(interv.id, interv.id, interv.nroIO, delegacionId);
  });

  return used;
}

/**
 * Obtiene el último número de I.O. realmente cargado en los registros existentes.
 */
export function getLastLoadedIoNumber(params: CollectIoParams): number {
  const used = collectUsedIoNumbersMap(params);
  let max = 0;
  used.forEach((_, num) => {
    if (num > max) max = num;
  });
  return max;
}

/**
 * Calcula el próximo número correlativo de I.O. sin repetir jamás uno existente,
 * tomando como referencia el último cargado y respetando el número de inicio configurado.
 */
export function getNextIoNumber(
  params: CollectIoParams & { config?: ConfiguracionSistema }
): number {
  const used = collectUsedIoNumbersMap(params);
  let maxLoaded = 0;
  used.forEach((_, num) => {
    if (num > maxLoaded) maxLoaded = num;
  });

  const inicio = Math.max(1, params.config?.inicioNroIO || 1);
  const configUltimo = sanitizeUltimoNroIO(params.config?.ultimoNroIO);
  let candidate = Math.max(inicio, maxLoaded + 1, configUltimo + 1);

  while (used.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}

/**
 * Verifica si un N° de I.O. ingresado o editado ya pertenece a otro registro.
 * Retorna el código conflictivo si hay repetición, o null si es válido/único.
 */
export function findDuplicateIoCode(
  nroIO: string,
  params: CollectIoParams
): string | null {
  const num = extractIoNumber(nroIO);
  if (num <= 0) return null;
  const anio = extractIoYear(nroIO, params.anio);
  const used = collectUsedIoNumbersMap({ ...params, anio });
  return used.get(num) || null;
}

/**
 * Calcula el próximo correlativo independiente según el tipo de intervención:
 * - 'Criminalística' (LC) lleva su propia numeración independiente.
 * - 'Accidentológica' (Seg. Vial) lleva su propia numeración independiente.
 * Ambos tipos pueden coincidir en el mismo número (ej. LC N° 1 y Seg. Vial N° 1).
 */
export function getNextCorrelativoIntervencion({
  tipo,
  intervenciones = [],
  partesGuardia = [],
  config,
}: {
  tipo: TipoIntervencion;
  intervenciones?: IntervencionParte[];
  partesGuardia?: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
}): number {
  const esAcc = tipo === 'Accidentológica';
  const inicio = esAcc
    ? Math.max(1, config.inicioNroIntervencionAccidentologica ?? 1)
    : Math.max(1, config.inicioNroIntervencionCriminalistica ?? 1);
  let max = esAcc
    ? (config.ultimoNroIntervencionAccidentologica ?? 0)
    : (config.ultimoNroIntervencionCriminalistica ?? 0);

  const checkInterv = (i: IntervencionParte) => {
    const tipoItem: TipoIntervencion = i.tipoIntervencion || 'Criminalística';
    if (tipoItem === tipo && i.nroCorrelativo && i.nroCorrelativo > max) {
      max = i.nroCorrelativo;
    }
  };

  intervenciones.forEach(checkInterv);
  partesGuardia.forEach((p) => {
    (p.intervenciones || []).forEach(checkInterv);
  });

  return Math.max(inicio, max + 1);
}
