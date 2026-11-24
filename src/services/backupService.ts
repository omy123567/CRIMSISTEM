import JSZip from 'jszip';
import { db } from '../db/database';
import {
  wipeAllDataFromServer,
  pushAllLocalDataToServer,
  restoreDatabaseOnServer,
} from './apiService';
import {
  encryptBackupPayload,
  isEncryptedBackup,
  decryptBackupPayload,
} from './securityClient';

export interface DatabaseCounts {
  personal: number;
  expedientes: number;
  casosFaltaOficio: number;
  moviles: number;
  reparaciones: number;
  recargos: number;
  partesGuardia: number;
  intervenciones: number;
  inspeccionesOculares: number;
  informesTecnicos: number;
  accidentologia: number;
  forenses: number;
  licenciados: number;
  grupos: number;
  delegaciones: number;
  usuarios: number;
  roles: number;
  auditoria: number;
  seriesNumerario: number;
  folios: number;
  novedadesDelegaciones: number;
  charlasPrevencion: number;
  licenciasPoliciales: number;
  saldosLicencias: number;
  feriados: number;
  memosNotas: number;
}

export interface BackupModuleCatalogItem {
  id: string;
  label: string;
  category: 'Operativo' | 'Licencias' | 'Administración' | 'Sistema';
  supportsDelegacionFilter?: boolean;
}

export const BACKUP_MODULES_CATALOG: BackupModuleCatalogItem[] = [
  { id: 'personal', label: 'Personal y Legajos', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'grupos', label: 'Grupos de Guardia', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'licenciasPoliciales', label: 'Licencias Policiales', category: 'Licencias', supportsDelegacionFilter: true },
  { id: 'saldosLicencias', label: 'Saldos Licencias (Art. 7)', category: 'Licencias', supportsDelegacionFilter: true },
  { id: 'feriados', label: 'Feriados y Días No Lab.', category: 'Licencias', supportsDelegacionFilter: false },
  { id: 'partesGuardia', label: 'Partes de Guardia', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'intervenciones', label: 'Intervenciones Periciales', category: 'Operativo', supportsDelegacionFilter: false },
  { id: 'inspeccionesOculares', label: 'Inspecciones Oculares (I.O.)', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'expedientes', label: 'Expedientes Judiciales', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'casosFaltaOficio', label: 'Casos Falta de Oficio', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'informesTecnicos', label: 'Informes Técnicos', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'accidentologia', label: 'Accidentología Vial', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'moviles', label: 'Móviles Policiales', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'reparaciones', label: 'Reparaciones Taller', category: 'Operativo', supportsDelegacionFilter: false },
  { id: 'recargos', label: 'Recargos Operativos', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'forenses', label: 'Forenses Policiales', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'licenciados', label: 'Licenciados de Turno', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'seriesNumerario', label: 'Series de Folios', category: 'Administración', supportsDelegacionFilter: true },
  { id: 'folios', label: 'Folios Asignados', category: 'Administración', supportsDelegacionFilter: true },
  { id: 'memosNotas', label: 'Memos y Notas', category: 'Administración', supportsDelegacionFilter: true },
  { id: 'novedadesDelegaciones', label: 'Novedades Inter-Delegaciones', category: 'Administración', supportsDelegacionFilter: true },
  { id: 'charlasPrevencion', label: 'Charlas de Prevención', category: 'Operativo', supportsDelegacionFilter: true },
  { id: 'delegaciones', label: 'Delegaciones Policiales', category: 'Sistema', supportsDelegacionFilter: false },
  { id: 'roles', label: 'Roles y Permisos', category: 'Sistema', supportsDelegacionFilter: false },
  { id: 'usuarios', label: 'Usuarios del Sistema', category: 'Sistema', supportsDelegacionFilter: true },
  { id: 'configuracion', label: 'Configuración y Membretes', category: 'Sistema', supportsDelegacionFilter: true },
  { id: 'auditoria', label: 'Auditoría Forense', category: 'Sistema', supportsDelegacionFilter: true },
];

export type TipoPeriodoFiltro = 'semana' | 'mes' | 'año' | 'personalizado';

export interface RangoFechas {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
}

export interface ModuloPeriodoInfo {
  id: string;
  label: string;
  dateFields: string[];
}

export const MODULOS_OPERATIVOS_PERIODO: ModuloPeriodoInfo[] = [
  { id: 'partesGuardia', label: 'Libros y Partes de Guardia', dateFields: ['fechaInicio', 'createdAt'] },
  { id: 'intervenciones', label: 'Intervenciones Periciales', dateFields: ['inspeccionFecha', 'fecha', 'createdAt'] },
  { id: 'inspeccionesOculares', label: 'Inspecciones Oculares (I.O.)', dateFields: ['fecha', 'createdAt'] },
  { id: 'licenciasPoliciales', label: 'Licencias Policiales', dateFields: ['fechaSalida', 'createdAt'] },
  { id: 'expedientes', label: 'Expedientes Judiciales', dateFields: ['fechaRegistro', 'createdAt'] },
  { id: 'casosFaltaOficio', label: 'Casos Falta de Oficio', dateFields: ['fechaRegistro', 'createdAt'] },
  { id: 'recargos', label: 'Recargos Operativos de Servicio', dateFields: ['fecha', 'createdAt'] },
  { id: 'informesTecnicos', label: 'Informes Técnicos Periciales', dateFields: ['fecha', 'fechaRecepcion', 'createdAt'] },
  { id: 'accidentologia', label: 'Accidentología y Siniestros Viales', dateFields: ['fecha', 'createdAt'] },
  { id: 'charlasPrevencion', label: 'Charlas de Prevención', dateFields: ['fecha', 'createdAt'] },
  { id: 'memosNotas', label: 'Memos y Notas', dateFields: ['fecha', 'createdAt'] },
  { id: 'reparaciones', label: 'Reparaciones Mecánicas de Móviles', dateFields: ['fecha', 'createdAt'] },
  { id: 'auditoria', label: 'Registros de Auditoría del Sistema', dateFields: ['fechaHora'] },
];

export interface SelectiveBackupOptions {
  delegacionId?: string; // 'todas' | undefined o ID específico
  modulos?: string[]; // lista de IDs de BACKUP_MODULES_CATALOG
}

export interface BackupInspectionResult {
  valid: boolean;
  needsPassword?: boolean;
  error?: string;
  format: 'json' | 'zip' | 'encrypted-json' | 'encrypted-zip';
  version?: string;
  exportDate?: string;
  delegacionFiltro?: string;
  checksumStatus: 'valid' | 'invalid' | 'legacy-none';
  checksumExpected?: string;
  checksumActual?: string;
  recordCounts: Record<string, number>;
  totalRecords: number;
  delegacionesDetectadas: string[];
  parsedData?: Record<string, any>;
  rawJson?: string;
  zipFile?: File;
}

/**
 * Calcula hash SHA-256 hexadecimal usando Web Crypto API
 */
export async function computeSha256Hex(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return '';
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildCanonicalCollectionPayload(
  source: Record<string, any>,
  moduleIds: string[]
): Record<string, any[]> {
  const canonical: Record<string, any[]> = {};
  for (const id of [...moduleIds].sort()) {
    if (Array.isArray(source[id])) {
      canonical[id] = source[id];
    }
  }
  return canonical;
}

/**
 * Calcula las fechas desde/hasta según el período seleccionado
 */
export function calcularRangoPeriodo(
  tipo: TipoPeriodoFiltro,
  customDesde?: string,
  customHasta?: string
): RangoFechas {
  const hoy = new Date();
  const hastaHoy = hoy.toISOString().slice(0, 10);

  if (tipo === 'semana') {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 7);
    return { desde: d.toISOString().slice(0, 10), hasta: hastaHoy };
  }

  if (tipo === 'mes') {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 30);
    return { desde: d.toISOString().slice(0, 10), hasta: hastaHoy };
  }

  if (tipo === 'año') {
    const inicioAnio = `${hoy.getFullYear()}-01-01`;
    return { desde: inicioAnio, hasta: hastaHoy };
  }

  return {
    desde: customDesde && customDesde.trim() ? customDesde.trim() : hastaHoy,
    hasta: customHasta && customHasta.trim() ? customHasta.trim() : hastaHoy,
  };
}

export function extraerFechaRegistro(item: any, dateFields?: string[]): string | null {
  if (!item || typeof item !== 'object') return null;

  const fieldsToCheck =
    dateFields && dateFields.length > 0
      ? dateFields
      : [
          'fecha',
          'fechaInicio',
          'fechaSalida',
          'fechaRegistro',
          'fechaRecepcion',
          'inspeccionFecha',
          'fechaHora',
          'createdAt',
        ];

  for (const field of fieldsToCheck) {
    const val = item[field];
    if (val && typeof val === 'string') {
      const match = val.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
  }

  return null;
}

export function registroEstaEnRango(item: any, rango: RangoFechas, dateFields?: string[]): boolean {
  const f = extraerFechaRegistro(item, dateFields);
  if (!f) return false;
  return f >= rango.desde && f <= rango.hasta;
}

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
  const [
    personal,
    expedientes,
    casosFaltaOficio,
    moviles,
    reparaciones,
    recargos,
    partesGuardia,
    intervenciones,
    inspeccionesOculares,
    informesTecnicos,
    accidentologia,
    forenses,
    licenciados,
    grupos,
    delegaciones,
    usuarios,
    roles,
    auditoria,
    seriesNumerario,
    folios,
    novedadesDelegaciones,
    charlasPrevencion,
    licenciasPoliciales,
    saldosLicencias,
    feriados,
    memosNotas,
  ] = await Promise.all([
    db.personal.count(),
    db.expedientes.count(),
    db.casosFaltaOficio.count(),
    db.moviles.count(),
    db.reparaciones.count(),
    db.recargos.count(),
    db.partesGuardia.count(),
    db.intervenciones.count(),
    db.inspeccionesOculares.count(),
    db.informesTecnicos.count(),
    db.accidentologia.count(),
    db.forenses.count(),
    db.licenciados.count(),
    db.grupos.count(),
    db.delegaciones.count(),
    db.usuarios.count(),
    db.roles.count(),
    db.auditoria.count(),
    db.seriesNumerario.count(),
    db.folios.count(),
    db.novedadesDelegaciones.count(),
    db.charlasPrevencion.count(),
    db.licenciasPoliciales.count(),
    db.saldosLicencias.count(),
    db.feriados.count(),
    db.memosNotas.count(),
  ]);

  return {
    personal,
    expedientes,
    casosFaltaOficio,
    moviles,
    reparaciones,
    recargos,
    partesGuardia,
    intervenciones,
    inspeccionesOculares,
    informesTecnicos,
    accidentologia,
    forenses,
    licenciados,
    grupos,
    delegaciones,
    usuarios,
    roles,
    auditoria,
    seriesNumerario,
    folios,
    novedadesDelegaciones,
    charlasPrevencion,
    licenciasPoliciales,
    saldosLicencias,
    feriados,
    memosNotas,
  };
}

export async function previsualizarConteoPeriodo(
  rango: RangoFechas,
  modulosSeleccionados?: string[]
): Promise<{ conteos: Record<string, number>; total: number }> {
  const modulos = MODULOS_OPERATIVOS_PERIODO.filter(
    (m) => !modulosSeleccionados || modulosSeleccionados.includes(m.id)
  );

  const conteos: Record<string, number> = {};
  let total = 0;

  for (const mod of modulos) {
    try {
      const table = (db as any)[mod.id];
      if (!table) continue;
      const allItems = await table.toArray();
      const count = allItems.filter((it: any) => registroEstaEnRango(it, rango, mod.dateFields)).length;
      conteos[mod.id] = count;
      total += count;
    } catch (e) {
      console.error(`Error contando en ${mod.id}:`, e);
      conteos[mod.id] = 0;
    }
  }

  return { conteos, total };
}

export async function eliminarDatosPeriodo(
  rango: RangoFechas,
  modulosSeleccionados: string[],
  usuarioNombre?: string
): Promise<{ eliminadosPorModulo: Record<string, number>; totalEliminados: number }> {
  const modulos = MODULOS_OPERATIVOS_PERIODO.filter((m) =>
    modulosSeleccionados.includes(m.id)
  );

  const eliminadosPorModulo: Record<string, number> = {};
  let totalEliminados = 0;

  for (const mod of modulos) {
    try {
      const table = (db as any)[mod.id];
      if (!table) continue;

      const allItems = await table.toArray();
      const idsToDelete: string[] = [];

      for (const item of allItems) {
        if (registroEstaEnRango(item, rango, mod.dateFields)) {
          idsToDelete.push(item.id);
        }
      }

      if (idsToDelete.length > 0) {
        await table.bulkDelete(idsToDelete);
      }

      eliminadosPorModulo[mod.id] = idsToDelete.length;
      totalEliminados += idsToDelete.length;
    } catch (e) {
      console.error(`Error eliminando datos en ${mod.id}:`, e);
      eliminadosPorModulo[mod.id] = 0;
    }
  }

  try {
    await db.auditoria.add({
      id: 'aud-' + Date.now(),
      fechaHora: new Date().toISOString(),
      usuarioId: 'admin',
      username: usuarioNombre || 'Administrador',
      apellidoYNombre: usuarioNombre || 'Administrador',
      rol: 'superusuario',
      delegacionId: 'sistema',
      modulo: 'Configuración / Depuración',
      accion: 'ELIMINAR',
      descripcion: `Depuración de datos por período (${rango.desde} a ${rango.hasta}): ${totalEliminados} registros eliminados en ${modulos.length} módulos.`,
      detalles: JSON.stringify({ rango, eliminadosPorModulo, totalEliminados }),
    });
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }

  return { eliminadosPorModulo, totalEliminados };
}

export async function exportarJsonPeriodo(
  rango: RangoFechas,
  modulosSeleccionados: string[]
): Promise<string> {
  const modulos = MODULOS_OPERATIVOS_PERIODO.filter((m) =>
    modulosSeleccionados.includes(m.id)
  );

  const exportData: Record<string, any> = {
    version: '3.0',
    exportType: 'period_backup',
    periodo: {
      desde: rango.desde,
      hasta: rango.hasta,
    },
    exportDate: new Date().toISOString(),
    system: 'Sis.Pol. - Sistema de Gestión Policial y Operativa',
    modulosExportados: modulosSeleccionados,
  };

  for (const mod of modulos) {
    try {
      const table = (db as any)[mod.id];
      if (!table) continue;
      const allItems = await table.toArray();
      exportData[mod.id] = allItems.filter((it: any) =>
        registroEstaEnRango(it, rango, mod.dateFields)
      );
    } catch (e) {
      console.error(`Error exportando período en ${mod.id}:`, e);
      exportData[mod.id] = [];
    }
  }

  const canonical = buildCanonicalCollectionPayload(
    exportData,
    modulos.map((m) => m.id)
  );
  exportData.checksumSha256 = await computeSha256Hex(JSON.stringify(canonical));

  return JSON.stringify(exportData, null, 2);
}

export async function restaurarJsonPeriodo(
  jsonString: string,
  rangoFiltro?: RangoFechas,
  modulosSeleccionados?: string[],
  usuarioNombre?: string
): Promise<{
  success: boolean;
  message: string;
  restauradosPorModulo: Record<string, number>;
  totalRestaurados: number;
}> {
  try {
    const data = JSON.parse(jsonString);

    if (!data.system && !data.version && !data.partesGuardia && !data.expedientes) {
      return {
        success: false,
        message: 'El archivo JSON no posee la estructura válida de Sis.Pol.',
        restauradosPorModulo: {},
        totalRestaurados: 0,
      };
    }

    const restauradosPorModulo: Record<string, number> = {};
    let totalRestaurados = 0;

    for (const mod of MODULOS_OPERATIVOS_PERIODO) {
      if (modulosSeleccionados && !modulosSeleccionados.includes(mod.id)) {
        continue;
      }

      const tableItems: any[] = data[mod.id];
      if (!Array.isArray(tableItems) || tableItems.length === 0) continue;

      const itemsToPut: any[] = [];

      for (const item of tableItems) {
        if (!rangoFiltro || registroEstaEnRango(item, rangoFiltro, mod.dateFields)) {
          itemsToPut.push(item);
        }
      }

      if (itemsToPut.length > 0) {
        const table = (db as any)[mod.id];
        if (table) {
          await table.bulkPut(itemsToPut);
          restauradosPorModulo[mod.id] = itemsToPut.length;
          totalRestaurados += itemsToPut.length;
        }
      }
    }

    try {
      await db.auditoria.add({
        id: 'aud-' + Date.now(),
        fechaHora: new Date().toISOString(),
        usuarioId: 'admin',
        username: usuarioNombre || 'Administrador',
        apellidoYNombre: usuarioNombre || 'Administrador',
        rol: 'superusuario',
        delegacionId: 'sistema',
        modulo: 'Configuración / Restauración',
        accion: 'CREAR',
        descripcion: `Restauración de respaldo${
          rangoFiltro ? ` filtrado por período (${rangoFiltro.desde} a ${rangoFiltro.hasta})` : ''
        }: ${totalRestaurados} registros restaurados.`,
        detalles: JSON.stringify({ rangoFiltro, restauradosPorModulo, totalRestaurados }),
      });
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      message: `Restauración exitosa: se cargaron/actualizaron ${totalRestaurados} registros${
        rangoFiltro ? ` dentro del período ${rangoFiltro.desde} al ${rangoFiltro.hasta}` : ''
      }.`,
      restauradosPorModulo,
      totalRestaurados,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al restaurar archivo: ${err?.message || 'Formato inválido'}`,
      restauradosPorModulo: {},
      totalRestaurados: 0,
    };
  }
}

async function collectSelectiveTables(options?: SelectiveBackupOptions): Promise<{
  collections: Record<string, any[]>;
  recordCounts: Record<string, number>;
  selectedModuleIds: string[];
}> {
  const delegacionFilter =
    options?.delegacionId && options.delegacionId !== 'todas'
      ? options.delegacionId
      : undefined;

  const selectedModuleIds =
    options?.modulos && options.modulos.length > 0
      ? options.modulos
      : BACKUP_MODULES_CATALOG.map((m) => m.id);

  const collections: Record<string, any[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const modId of selectedModuleIds) {
    const table = (db as any)[modId];
    if (!table) continue;
    let items: any[] = await table.toArray();

    if (modId === 'usuarios') {
      items = items.map(({ passwordHash: _ph, offlineVerifier: _ov, ...rest }) => ({
        ...rest,
        password: '',
      }));
    }

    if (delegacionFilter) {
      if (modId === 'novedadesDelegaciones') {
        items = items.filter(
          (x) =>
            x.origenDelegacionId === delegacionFilter ||
            x.destinatarioDelegacionId === delegacionFilter ||
            x.destinatarioDelegacionId === 'TODAS'
        );
      } else if (modId === 'reparaciones') {
        const movs = collections['moviles'] || (await db.moviles.toArray());
        const movIds = new Set(
          movs.filter((m: any) => !m.delegacionId || m.delegacionId === delegacionFilter).map((m: any) => m.id)
        );
        items = items.filter((r) => movIds.has(r.movilId));
      } else if (modId === 'intervenciones') {
        const partes = collections['partesGuardia'] || (await db.partesGuardia.toArray());
        const parteIds = new Set(
          partes.filter((p: any) => !p.delegacionId || p.delegacionId === delegacionFilter).map((p: any) => p.id)
        );
        items = items.filter((it) => !it.parteId || parteIds.has(it.parteId));
      } else {
        const meta = BACKUP_MODULES_CATALOG.find((m) => m.id === modId);
        if (meta?.supportsDelegacionFilter) {
          items = items.filter(
            (x) => !x.delegacionId || x.delegacionId === delegacionFilter || x.delegacionId === 'sistema'
          );
        }
      }
    }

    collections[modId] = items;
    recordCounts[modId] = items.length;
  }

  return { collections, recordCounts, selectedModuleIds };
}

export async function exportGeneralJsonBackup(options?: SelectiveBackupOptions): Promise<string> {
  const { collections, recordCounts, selectedModuleIds } = await collectSelectiveTables(options);
  const canonical = buildCanonicalCollectionPayload(collections, selectedModuleIds);
  const checksumSha256 = await computeSha256Hex(JSON.stringify(canonical));
  const totalRegistros = Object.values(recordCounts).reduce((a, b) => a + b, 0);

  const data: Record<string, any> = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    system: 'Sis.Pol. - Sistema de Gestión Policial y Operativa',
    delegacionFiltro: options?.delegacionId && options.delegacionId !== 'todas' ? options.delegacionId : 'TODAS',
    modulosIncluidos: selectedModuleIds,
    totalRegistros,
    recordCounts,
    checksumSha256,
    ...collections,
  };

  return JSON.stringify(data, null, 2);
}

export async function exportEncryptedJsonBackup(
  password: string,
  options?: SelectiveBackupOptions
): Promise<string> {
  const plainJson = await exportGeneralJsonBackup(options);
  return encryptBackupPayload(plainJson, password);
}

export async function exportModuleJson(
  moduleName: string,
  delegacionId?: string
): Promise<string> {
  const { collections } = await collectSelectiveTables({
    delegacionId,
    modulos: [moduleName],
  });
  const tableData = collections[moduleName] || [];
  const checksumSha256 = await computeSha256Hex(JSON.stringify(tableData));
  return JSON.stringify(
    {
      module: moduleName,
      exportDate: new Date().toISOString(),
      delegacionFiltro: delegacionId && delegacionId !== 'todas' ? delegacionId : 'TODAS',
      totalRegistros: tableData.length,
      checksumSha256,
      data: tableData,
    },
    null,
    2
  );
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str: string;
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      if (typeof val[0] === 'string' && val[0].startsWith('data:image')) {
        return `"[${val.length} archivo(s) adjunto(s)]"`;
      }
      str = JSON.stringify(val);
    } else {
      str = JSON.stringify(val);
    }
  } else {
    str = String(val);
    if (str.startsWith('data:image')) {
      return '"[Imagen adjunta]"';
    }
  }
  const clean = str.replace(/\r?\n/g, ' ');
  if (clean.includes(',') || clean.includes('"') || clean.includes(';')) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

function recordsToUtf8BomCsv(items: any[]): string {
  const BOM = '\uFEFF';
  if (!items || items.length === 0) {
    return `${BOM}Sin registros`;
  }

  const keySet = new Set<string>();
  items.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((k) => {
        if (k !== 'passwordHash' && k !== 'offlineVerifier' && k !== 'totpSecret') {
          keySet.add(k);
        }
      });
    }
  });
  const headers = Array.from(keySet);
  const lines = [
    headers.map((h) => escapeCsvCell(h)).join(','),
    ...items.map((row) => headers.map((h) => escapeCsvCell(row?.[h])).join(',')),
  ];
  return BOM + lines.join('\r\n');
}

export async function exportModuleCsv(
  moduleName: string,
  delegacionId?: string
): Promise<{ csv: string; count: number }> {
  const { collections } = await collectSelectiveTables({
    delegacionId,
    modulos: [moduleName],
  });
  const items = collections[moduleName] || [];
  return {
    csv: recordsToUtf8BomCsv(items),
    count: items.length,
  };
}

export async function exportCsvBundleZip(options?: SelectiveBackupOptions): Promise<{
  blob: Blob;
  totalRecords: number;
  moduleCount: number;
}> {
  const zip = new JSZip();
  const { collections, recordCounts, selectedModuleIds } = await collectSelectiveTables(options);

  let moduleCount = 0;
  for (const modId of selectedModuleIds) {
    const items = collections[modId] || [];
    if (items.length === 0) continue;
    zip.file(`${modId}.csv`, recordsToUtf8BomCsv(items));
    moduleCount++;
  }

  zip.file(
    'RESUMEN_EXPORTACION.txt',
    [
      'Sis.Pol. - Exportación de Planillas CSV (UTF-8 con BOM para Excel)',
      `Fecha: ${new Date().toLocaleString('es-AR')}`,
      `Filtro Delegación: ${options?.delegacionId || 'TODAS'}`,
      '',
      'Registros por módulo:',
      ...selectedModuleIds.map((id) => `- ${id}: ${recordCounts[id] || 0}`),
    ].join('\r\n')
  );

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, totalRecords, moduleCount };
}

export async function exportZipBackup(options?: SelectiveBackupOptions): Promise<Blob> {
  const zip = new JSZip();
  const jsonContent = await exportGeneralJsonBackup(options);
  zip.file('database_dump.json', jsonContent);

  const parsed = JSON.parse(jsonContent);
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        appName: 'Sis.Pol.',
        version: '3.0',
        createdAt: parsed.exportDate,
        delegacionFiltro: parsed.delegacionFiltro,
        modulosIncluidos: parsed.modulosIncluidos,
        totalRegistros: parsed.totalRegistros,
        recordCounts: parsed.recordCounts,
        checksumSha256: parsed.checksumSha256,
        checksumValid: true,
      },
      null,
      2
    )
  );

  // Incluir CSVs listos para Excel dentro del paquete integral
  const csvFolder = zip.folder('csv_excel');
  if (csvFolder) {
    for (const modId of parsed.modulosIncluidos || []) {
      const items = parsed[modId];
      if (Array.isArray(items) && items.length > 0) {
        csvFolder.file(`${modId}.csv`, recordsToUtf8BomCsv(items));
      }
    }
  }

  // Carpeta de adjuntos (imágenes de oficios y recibos)
  const expedientes: any[] = Array.isArray(parsed.expedientes) ? parsed.expedientes : [];
  const folderAdjuntos = zip.folder('adjuntos_expedientes');

  if (folderAdjuntos) {
    expedientes.forEach((exp) => {
      if (exp.adjuntosOficio) {
        exp.adjuntosOficio.forEach((imgBase64: string, idx: number) => {
          if (imgBase64 && imgBase64.includes('base64,')) {
            const dataOnly = imgBase64.split('base64,')[1];
            folderAdjuntos.file(`exp_${exp.id}_oficio_${idx + 1}.png`, dataOnly, { base64: true });
          }
        });
      }
      if (exp.adjuntosRecibo) {
        exp.adjuntosRecibo.forEach((imgBase64: string, idx: number) => {
          if (imgBase64 && imgBase64.includes('base64,')) {
            const dataOnly = imgBase64.split('base64,')[1];
            folderAdjuntos.file(`exp_${exp.id}_recibo_${idx + 1}.png`, dataOnly, { base64: true });
          }
        });
      }
    });
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Inspecciona un respaldo JSON o ZIP (incluso cifrado con AES-256-GCM),
 * verifica su integridad SHA-256 y devuelve conteos detallados antes de aplicar la restauración.
 */
export async function inspectBackupFile(params: {
  rawJson?: string;
  zipFile?: File;
  decryptionPassword?: string;
}): Promise<BackupInspectionResult> {
  try {
    let workingJson = params.rawJson || '';
    const isZip = Boolean(params.zipFile);

    if (params.zipFile) {
      const zip = await JSZip.loadAsync(params.zipFile);
      const dumpFile = zip.file('database_dump.json');
      if (!dumpFile) {
        return {
          valid: false,
          format: 'zip',
          checksumStatus: 'legacy-none',
          recordCounts: {},
          totalRecords: 0,
          delegacionesDetectadas: [],
          error: 'El archivo ZIP no contiene database_dump.json válido.',
        };
      }
      workingJson = await dumpFile.async('text');
    }

    const encrypted = isEncryptedBackup(workingJson);
    const detectedFormat: BackupInspectionResult['format'] = encrypted
      ? isZip
        ? 'encrypted-zip'
        : 'encrypted-json'
      : isZip
      ? 'zip'
      : 'json';

    if (encrypted) {
      if (!params.decryptionPassword || !params.decryptionPassword.trim()) {
        return {
          valid: false,
          needsPassword: true,
          format: detectedFormat,
          checksumStatus: 'legacy-none',
          recordCounts: {},
          totalRecords: 0,
          delegacionesDetectadas: [],
          rawJson: params.rawJson,
          zipFile: params.zipFile,
          error: 'El respaldo está cifrado con AES-256-GCM. Ingrese la contraseña para descifrarlo.',
        };
      }
      workingJson = await decryptBackupPayload(workingJson, params.decryptionPassword);
    }

    const data = JSON.parse(workingJson);
    if (
      !data ||
      typeof data !== 'object' ||
      (!data.system && !data.personal && !data.expedientes && !data.partesGuardia && !data.licenciasPoliciales)
    ) {
      return {
        valid: false,
        format: detectedFormat,
        checksumStatus: 'legacy-none',
        recordCounts: {},
        totalRecords: 0,
        delegacionesDetectadas: [],
        error: 'El archivo no posee la estructura válida de respaldo Sis.Pol.',
      };
    }

    const recordCounts: Record<string, number> = {};
    const delegacionesSet = new Set<string>();
    const presentModuleIds: string[] = [];

    for (const mod of BACKUP_MODULES_CATALOG) {
      if (Array.isArray(data[mod.id])) {
        presentModuleIds.push(mod.id);
        recordCounts[mod.id] = data[mod.id].length;
        for (const item of data[mod.id]) {
          if (item?.delegacionId && item.delegacionId !== 'sistema') {
            delegacionesSet.add(item.delegacionId);
          }
        }
      }
    }

    const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);

    let checksumStatus: BackupInspectionResult['checksumStatus'] = 'legacy-none';
    let checksumActual: string | undefined;
    const checksumExpected: string | undefined =
      typeof data.checksumSha256 === 'string' && data.checksumSha256.trim()
        ? data.checksumSha256.trim()
        : undefined;

    if (checksumExpected) {
      const modOrder = Array.isArray(data.modulosIncluidos)
        ? data.modulosIncluidos
        : presentModuleIds;
      const canonical = buildCanonicalCollectionPayload(data, modOrder);
      checksumActual = await computeSha256Hex(JSON.stringify(canonical));
      checksumStatus = checksumActual === checksumExpected ? 'valid' : 'invalid';
    }

    return {
      valid: true,
      format: detectedFormat,
      version: String(data.version || '1.0'),
      exportDate: data.exportDate,
      delegacionFiltro: data.delegacionFiltro || 'TODAS',
      checksumStatus,
      checksumExpected,
      checksumActual,
      recordCounts,
      totalRecords,
      delegacionesDetectadas: Array.from(delegacionesSet),
      parsedData: data,
    };
  } catch (err: any) {
    return {
      valid: false,
      format: params.zipFile ? 'zip' : 'json',
      checksumStatus: 'legacy-none',
      recordCounts: {},
      totalRecords: 0,
      delegacionesDetectadas: [],
      error: `Error analizando el respaldo: ${err?.message || 'Formato inválido o contraseña incorrecta'}`,
    };
  }
}

/**
 * Aplica la restauración previamente inspeccionada en modo 'merge' o 'replace'.
 */
export async function applyInspectedBackup(
  data: Record<string, any>,
  options?: {
    mode?: 'merge' | 'replace';
    modulosARestaurar?: string[];
    usuarioNombre?: string;
  }
): Promise<{ success: boolean; message: string; totalRestaurados: number }> {
  const mode = options?.mode || 'merge';
  const modulosObjetivo =
    options?.modulosARestaurar && options.modulosARestaurar.length > 0
      ? options.modulosARestaurar
      : BACKUP_MODULES_CATALOG.map((m) => m.id).filter((id) => Array.isArray(data[id]));

  let totalRestaurados = 0;

  const tables = modulosObjetivo
    .map((id) => (db as any)[id])
    .filter(Boolean);

  await db.transaction('rw', tables, async () => {
    for (const modId of modulosObjetivo) {
      const table = (db as any)[modId];
      const items = data[modId];
      if (!table || !Array.isArray(items)) continue;

      if (mode === 'replace') {
        await table.clear();
      }

      if (items.length > 0) {
        if (modId === 'usuarios') {
          const cleanUsers = items.map((u: any) => ({ ...u, password: '' }));
          await table.bulkPut(cleanUsers);
        } else {
          await table.bulkPut(items);
        }
        totalRestaurados += items.length;
      }
    }
  });

  try {
    await db.auditoria.add({
      id: `aud-restore-${Date.now()}`,
      fechaHora: new Date().toISOString(),
      usuarioId: 'admin',
      username: options?.usuarioNombre || 'Administrador',
      apellidoYNombre: options?.usuarioNombre || 'Administrador',
      rol: 'superusuario',
      delegacionId: 'sistema',
      modulo: 'Configuración / Restauración',
      accion: 'CREAR',
      descripcion: `Restauración de respaldo (${mode === 'replace' ? 'Reemplazo selectivo' : 'Combinación segura'}): ${totalRestaurados} registros aplicados en ${modulosObjetivo.length} módulos.`,
    });
  } catch {
    // ignore
  }

  try {
    const ok = await restoreDatabaseOnServer(data);
    if (!ok) {
      await pushAllLocalDataToServer();
    }
  } catch (e) {
    console.warn('No se pudo replicar restauración al servidor central:', e);
  }

  return {
    success: true,
    totalRestaurados,
    message: `Restauración (${mode === 'replace' ? 'Reemplazo' : 'Combinación'}) completada: ${totalRestaurados} registros aplicados y sincronizados.`,
  };
}

export async function importGeneralJsonBackup(
  jsonString: string,
  decryptionPassword?: string
): Promise<{ success: boolean; message: string; needsPassword?: boolean }> {
  const inspection = await inspectBackupFile({
    rawJson: jsonString,
    decryptionPassword,
  });

  if (inspection.needsPassword) {
    return {
      success: false,
      needsPassword: true,
      message: inspection.error || 'Se requiere contraseña para descifrar el respaldo.',
    };
  }

  if (!inspection.valid || !inspection.parsedData) {
    return {
      success: false,
      message: inspection.error || 'El archivo no posee una estructura válida.',
    };
  }

  const res = await applyInspectedBackup(inspection.parsedData, { mode: 'merge' });
  return { success: res.success, message: res.message };
}

export async function importZipBackup(
  file: File,
  decryptionPassword?: string
): Promise<{ success: boolean; message: string; needsPassword?: boolean }> {
  const inspection = await inspectBackupFile({
    zipFile: file,
    decryptionPassword,
  });

  if (inspection.needsPassword) {
    return {
      success: false,
      needsPassword: true,
      message: inspection.error || 'Se requiere contraseña para descifrar el respaldo.',
    };
  }

  if (!inspection.valid || !inspection.parsedData) {
    return {
      success: false,
      message: inspection.error || 'Archivo ZIP inválido.',
    };
  }

  const res = await applyInspectedBackup(inspection.parsedData, { mode: 'merge' });
  return { success: res.success, message: res.message };
}

/**
 * Vacía todos los datos operativos y registros de prueba/demo para permitir
 * la carga de datos propios institucionales desde cero.
 */
export async function vaciarBaseDeDatosCompleta(
  crearBackupPrevio: boolean = true,
  usuarioNombre?: string
): Promise<{ success: boolean; backupJson?: string; totalEliminados: number }> {
  let backupJson: string | undefined;
  if (crearBackupPrevio) {
    backupJson = await exportGeneralJsonBackup();
    try {
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `SisPol_CopiaSeguridad_Antes_De_Vaciar_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al descargar copia de seguridad previa:', e);
    }
  }

  let totalEliminados = 0;
  const tablasOperativas = [
    db.personal,
    db.grupos,
    db.licenciasPoliciales,
    db.saldosLicencias,
    db.expedientes,
    db.casosFaltaOficio,
    db.moviles,
    db.reparaciones,
    db.recargos,
    db.partesGuardia,
    db.intervenciones,
    db.inspeccionesOculares,
    db.informesTecnicos,
    db.accidentologia,
    db.forenses,
    db.licenciados,
    db.seriesNumerario,
    db.folios,
    db.novedadesDelegaciones,
    db.charlasPrevencion,
    db.memosNotas,
  ];

  for (const table of tablasOperativas) {
    try {
      const count = await table.count();
      totalEliminados += count;
      await table.clear();
    } catch (err) {
      console.error('Error limpiando tabla:', err);
    }
  }

  try {
    const configActual = await db.configuracion.toCollection().first();
    if (configActual) {
      await db.configuracion.update(configActual.id, {
        inicioNroIntervencionCriminalistica: 1,
        ultimoNroIntervencionCriminalistica: 0,
        inicioNroIntervencionAccidentologica: 1,
        ultimoNroIntervencionAccidentologica: 0,
        inicioNroIO: 1,
        ultimoNroIO: 0,
      });
    }
  } catch (err) {
    console.error('Error al reiniciar numeradores:', err);
  }

  try {
    await db.auditoria.add({
      id: 'aud-' + Date.now(),
      fechaHora: new Date().toISOString(),
      usuarioId: 'admin',
      username: usuarioNombre || 'Administrador',
      apellidoYNombre: usuarioNombre || 'Administrador',
      rol: 'superusuario',
      delegacionId: 'sistema',
      modulo: 'Configuración / Vaciado Integral',
      accion: 'ELIMINAR',
      descripcion: `Vaciado total de registros operativos para inicio de datos propios (${totalEliminados} registros eliminados). Copia previa generada: ${crearBackupPrevio ? 'SÍ' : 'NO'}.`,
      detalles: JSON.stringify({
        totalEliminados,
        backupGenerado: crearBackupPrevio,
        fecha: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error('Error registrando auditoría:', e);
  }

  try {
    await wipeAllDataFromServer();
  } catch (e) {
    console.warn('Error al vaciar en el servidor central:', e);
  }

  return { success: true, backupJson, totalEliminados };
}
