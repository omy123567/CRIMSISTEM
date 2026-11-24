import {
  ConfiguracionSistema,
  MemoNota,
  PerfilAccesoFolio,
  SerieNumerario,
  TipoMemoCatalogoItem,
  UsuarioSistema,
} from '../types/police';

export const ALL_PERFILES_ACCESO_FOLIO: PerfilAccesoFolio[] = [
  'comun',
  'jefe',
  'mayoria_judicial',
];

export const PERFILES_ACCESO_FOLIO_INFO: Array<{
  id: PerfilAccesoFolio;
  label: string;
  shortLabel: string;
  desc: string;
}> = [
  {
    id: 'comun',
    label: 'Usuarios Comunes',
    shortLabel: 'Usuarios Comunes',
    desc: 'Operadores, Oficiales de Guardia, Peritos, Carga/Editor y Consulta',
  },
  {
    id: 'jefe',
    label: 'Jefe',
    shortLabel: 'Jefe',
    desc: 'Jefe de Delegación, Jefatura y Administradores',
  },
  {
    id: 'mayoria_judicial',
    label: 'Mayoría / Judicial',
    shortLabel: 'Mayoría / Judicial',
    desc: 'Personal de Mayoría, Instructores Judiciales y Sumariantes',
  },
];

export function getPerfilFolioLabel(perfil: PerfilAccesoFolio): string {
  return (
    PERFILES_ACCESO_FOLIO_INFO.find((p) => p.id === perfil)?.label ||
    'Usuarios Comunes'
  );
}

export function normalizePerfilesVisibles(
  perfiles?: PerfilAccesoFolio[] | null
): PerfilAccesoFolio[] {
  if (perfiles === undefined || perfiles === null) {
    return [...ALL_PERFILES_ACCESO_FOLIO];
  }
  const valid = new Set<PerfilAccesoFolio>(ALL_PERFILES_ACCESO_FOLIO);
  return Array.from(
    new Set(perfiles.filter((p): p is PerfilAccesoFolio => valid.has(p)))
  );
}

export function resolveUserFolioPerfil(
  user?: UsuarioSistema | null
): PerfilAccesoFolio {
  if (
    user?.perfilFolio === 'comun' ||
    user?.perfilFolio === 'jefe' ||
    user?.perfilFolio === 'mayoria_judicial'
  ) {
    return user.perfilFolio;
  }
  const rolNorm = normalizeTipoKey(user?.rol);
  if (
    rolNorm.includes('jefe') ||
    rolNorm.includes('administrador') ||
    rolNorm === 'admin'
  ) {
    return 'jefe';
  }
  if (
    rolNorm.includes('mayoria') ||
    rolNorm.includes('judicial') ||
    rolNorm.includes('sumariante')
  ) {
    return 'mayoria_judicial';
  }
  return 'comun';
}

export const DEFAULT_TIPOS_MEMO: TipoMemoCatalogoItem[] = [
  { id: 'tm-memorandum', nombre: 'Memorándum', prefijo: 'Mem. N°', esDefault: true, activo: true },
  { id: 'tm-nota-v', nombre: 'Nota V', prefijo: 'Nota V N°', esDefault: true, activo: true },
  { id: 'tm-nota', nombre: 'Nota', prefijo: 'Nota N°', esDefault: true, activo: true },
  { id: 'tm-nota-interna', nombre: 'Nota Interna', prefijo: 'Nota Int. N°', esDefault: true, activo: true },
  { id: 'tm-circular', nombre: 'Circular', prefijo: 'Circ. N°', esDefault: true, activo: true },
  { id: 'tm-oficio', nombre: 'Oficio', prefijo: 'Of. N°', esDefault: true, activo: true },
];

export function normalizeTipoKey(value?: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeTiposMemoCatalogo(
  customCatalog?: TipoMemoCatalogoItem[]
): TipoMemoCatalogoItem[] {
  if (!customCatalog || customCatalog.length === 0) {
    return DEFAULT_TIPOS_MEMO.map((t) => ({ ...t }));
  }
  const map = new Map<string, TipoMemoCatalogoItem>();
  for (const def of DEFAULT_TIPOS_MEMO) {
    map.set(normalizeTipoKey(def.nombre), { ...def });
  }
  for (const item of customCatalog) {
    if (!item?.nombre?.trim()) continue;
    map.set(normalizeTipoKey(item.nombre), {
      ...item,
      nombre: item.nombre.trim(),
      activo: item.activo !== false,
    });
  }
  return Array.from(map.values());
}

export interface MemoTipoOption {
  key: string; // Clave única para ocultamiento por usuario (serieId o nombre normalizado)
  nombre: string;
  prefijo: string;
  serieFolioId?: string;
  esDeControlFolios: boolean;
  esPersonalizado?: boolean;
  descripcion?: string;
  perfilesVisibles: PerfilAccesoFolio[];
}

/**
 * Construye el catálogo de "Tipo / Serie de Folio" tomando como fuente principal
 * las series cargadas en el módulo "Control de Folios" (SerieNumerario).
 * Solo agrega tipos personalizados creados manualmente si aún no existen como serie,
 * y usa DEFAULT_TIPOS_MEMO únicamente como respaldo cuando Control de Folios está vacío.
 */
export function buildUnifiedTiposMemosOptions(
  config: ConfiguracionSistema,
  seriesList: SerieNumerario[]
): MemoTipoOption[] {
  const result: MemoTipoOption[] = [];
  const seenNormalizedNames = new Set<string>();
  const foliosSeries = Array.isArray(seriesList) ? seriesList : [];

  // 1. Series cargadas en "Control de Folios" (fuente principal exacta)
  for (const serie of foliosSeries) {
    const normName = normalizeTipoKey(serie.nombre);
    if (!normName) continue;
    seenNormalizedNames.add(normName);
    result.push({
      key: `serie:${serie.id}`,
      nombre: serie.nombre,
      prefijo: serie.prefijo || `${serie.nombre.slice(0, 4)}. N°`,
      serieFolioId: serie.id,
      esDeControlFolios: true,
      esPersonalizado: false,
      descripcion: serie.descripcion || `Serie de Control de Folios (${serie.anio})`,
      perfilesVisibles: normalizePerfilesVisibles(serie.perfilesVisibles),
    });
  }

  // 2. Tipos personalizados activos (no incluidos ya en Control de Folios)
  if (foliosSeries.length > 0) {
    const customOnly = (config.tiposMemoCatalogo || []).filter(
      (t) => t?.activo !== false && !t.esDefault && t.nombre?.trim()
    );
    for (const tipo of customOnly) {
      const normName = normalizeTipoKey(tipo.nombre);
      if (!normName || seenNormalizedNames.has(normName)) continue;
      seenNormalizedNames.add(normName);
      result.push({
        key: `tipo:${normName}`,
        nombre: tipo.nombre.trim(),
        prefijo: tipo.prefijo || `${tipo.nombre.trim()} N°`,
        esDeControlFolios: false,
        esPersonalizado: true,
        descripcion: 'Tipo personalizado',
        perfilesVisibles: normalizePerfilesVisibles(tipo.perfilesVisibles),
      });
    }
    return result;
  }

  // 3. Respaldo solo si no existen series en Control de Folios para la delegación
  const catalogo = normalizeTiposMemoCatalogo(config.tiposMemoCatalogo);
  for (const tipo of catalogo) {
    if (!tipo.activo) continue;
    const normName = normalizeTipoKey(tipo.nombre);
    if (!normName || seenNormalizedNames.has(normName)) continue;
    seenNormalizedNames.add(normName);
    result.push({
      key: `tipo:${normName}`,
      nombre: tipo.nombre,
      prefijo: tipo.prefijo || `${tipo.nombre} N°`,
      esDeControlFolios: false,
      esPersonalizado: !tipo.esDefault,
      descripcion: tipo.esDefault ? 'Tipo estándar de Memos y Notas' : 'Tipo personalizado',
      perfilesVisibles: normalizePerfilesVisibles(tipo.perfilesVisibles),
    });
  }

  return result;
}

/**
 * Devuelve una nueva lista `tiposMemosOcultos` agregando o quitando el Tipo / Serie indicado.
 */
export function computeUpdatedTiposMemosOcultos(
  currentList: string[] | undefined,
  target: { key: string; nombre: string; serieFolioId?: string },
  shouldHide: boolean
): string[] {
  const prev = Array.isArray(currentList) ? [...currentList] : [];
  const normNombre = normalizeTipoKey(target.nombre);
  const matchingSet = new Set(
    [
      target.key,
      target.serieFolioId || '',
      target.serieFolioId ? `serie:${target.serieFolioId}` : '',
      normNombre,
      normNombre ? `tipo:${normNombre}` : '',
    ].filter(Boolean)
  );

  const cleaned = prev.filter((item) => {
    const raw = String(item);
    const norm = normalizeTipoKey(raw);
    return (
      !matchingSet.has(raw) &&
      !matchingSet.has(norm) &&
      (!normNombre || (norm !== normNombre && norm !== `tipo:${normNombre}`))
    );
  });

  if (shouldHide) {
    cleaned.push(target.key);
  }
  return cleaned;
}

function resolvePerfilesVisiblesForTipo(
  tipoOrOption: string | MemoTipoOption,
  serieFolioId?: string,
  seriesList?: SerieNumerario[],
  config?: ConfiguracionSistema
): PerfilAccesoFolio[] | undefined {
  if (typeof tipoOrOption !== 'string') {
    return tipoOrOption.perfilesVisibles;
  }
  const normName = normalizeTipoKey(tipoOrOption);
  if (Array.isArray(seriesList)) {
    const serieMatch = seriesList.find(
      (s) =>
        (serieFolioId && s.id === serieFolioId) ||
        (normName && normalizeTipoKey(s.nombre) === normName)
    );
    if (serieMatch) {
      return normalizePerfilesVisibles(serieMatch.perfilesVisibles);
    }
  }
  if (config?.tiposMemoCatalogo) {
    const catMatch = config.tiposMemoCatalogo.find(
      (t) => normName && normalizeTipoKey(t.nombre) === normName
    );
    if (catMatch) {
      return normalizePerfilesVisibles(catMatch.perfilesVisibles);
    }
  }
  return undefined;
}

/**
 * Determina si un tipo / serie de folio está oculto para un usuario específico,
 * evaluando tanto restricciones por perfil ("Usuarios Comunes", "Jefe", "Mayoría / Judicial")
 * como ocultamientos individuales por usuario (`tiposMemosOcultos`).
 * Los usuarios con rol 'superusuario' conservan acceso total para administración.
 */
export function isTipoMemoHiddenForUser(
  tipoOrOption: string | MemoTipoOption,
  user?: UsuarioSistema | null,
  serieFolioId?: string,
  seriesList?: SerieNumerario[],
  config?: ConfiguracionSistema
): boolean {
  if (!user || user.rol === 'superusuario') return false;

  // 1. Verificar restricción por perfil (Usuarios Comunes / Jefe / Mayoría-Judicial)
  const perfilesVisibles = resolvePerfilesVisiblesForTipo(
    tipoOrOption,
    serieFolioId,
    seriesList,
    config
  );
  if (perfilesVisibles !== undefined) {
    const userPerfil = resolveUserFolioPerfil(user);
    if (!perfilesVisibles.includes(userPerfil)) {
      return true;
    }
  }

  // 2. Verificar ocultamiento puntual asignado al usuario
  const hiddenList = user.tiposMemosOcultos;
  if (!Array.isArray(hiddenList) || hiddenList.length === 0) return false;

  const hiddenNorm = new Set(hiddenList.map((h) => normalizeTipoKey(h)));
  const hiddenRaw = new Set(hiddenList);

  if (typeof tipoOrOption === 'string') {
    const normName = normalizeTipoKey(tipoOrOption);
    if (hiddenNorm.has(normName) || hiddenNorm.has(`tipo:${normName}`)) return true;
    if (serieFolioId && (hiddenRaw.has(serieFolioId) || hiddenRaw.has(`serie:${serieFolioId}`))) {
      return true;
    }
    return false;
  }

  const normName = normalizeTipoKey(tipoOrOption.nombre);
  if (
    hiddenRaw.has(tipoOrOption.key) ||
    hiddenNorm.has(normName) ||
    hiddenNorm.has(`tipo:${normName}`)
  ) {
    return true;
  }
  if (
    tipoOrOption.serieFolioId &&
    (hiddenRaw.has(tipoOrOption.serieFolioId) ||
      hiddenRaw.has(`serie:${tipoOrOption.serieFolioId}`))
  ) {
    return true;
  }
  return false;
}

export function isSerieHiddenForUser(
  serie: SerieNumerario,
  user?: UsuarioSistema | null
): boolean {
  if (!user || user.rol === 'superusuario') return false;
  return isTipoMemoHiddenForUser(serie.nombre, user, serie.id, [serie]);
}

export function isMemoVisibleForUser(
  memo: MemoNota,
  user?: UsuarioSistema | null,
  seriesList?: SerieNumerario[],
  config?: ConfiguracionSistema
): boolean {
  if (!user) return true;
  if (user.rol === 'superusuario') return true;
  if (
    Array.isArray(memo.ocultoParaUsuariosIds) &&
    memo.ocultoParaUsuariosIds.includes(user.id)
  ) {
    return false;
  }
  return !isTipoMemoHiddenForUser(
    memo.tipo,
    user,
    memo.serieFolioId,
    seriesList,
    config
  );
}
