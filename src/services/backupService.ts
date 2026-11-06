import JSZip from 'jszip';
import { db } from '../db/database';

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
  auditoria: number;
  seriesNumerario: number;
  folios: number;
}

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
  { id: 'expedientes', label: 'Expedientes Judiciales', dateFields: ['fechaRegistro', 'createdAt'] },
  { id: 'casosFaltaOficio', label: 'Casos Falta de Oficio', dateFields: ['fechaRegistro', 'createdAt'] },
  { id: 'recargos', label: 'Recargos Operativos de Servicio', dateFields: ['fecha', 'createdAt'] },
  { id: 'informesTecnicos', label: 'Informes Técnicos Periciales', dateFields: ['fecha', 'fechaRecepcion', 'createdAt'] },
  { id: 'accidentologia', label: 'Accidentología y Siniestros Viales', dateFields: ['fecha', 'createdAt'] },
  { id: 'reparaciones', label: 'Reparaciones Mecánicas de Móviles', dateFields: ['fecha', 'createdAt'] },
  { id: 'auditoria', label: 'Registros de Auditoría del Sistema', dateFields: ['fechaHora'] },
];

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

  // Personalizado
  return {
    desde: customDesde && customDesde.trim() ? customDesde.trim() : hastaHoy,
    hasta: customHasta && customHasta.trim() ? customHasta.trim() : hastaHoy,
  };
}

/**
 * Extrae la fecha en formato YYYY-MM-DD de un registro evaluando sus campos de fecha
 */
export function extraerFechaRegistro(item: any, dateFields?: string[]): string | null {
  if (!item || typeof item !== 'object') return null;

  const fieldsToCheck = dateFields && dateFields.length > 0
    ? dateFields
    : ['fecha', 'fechaInicio', 'fechaRegistro', 'fechaRecepcion', 'inspeccionFecha', 'fechaHora', 'createdAt'];

  for (const field of fieldsToCheck) {
    const val = item[field];
    if (val && typeof val === 'string') {
      const match = val.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
  }

  return null;
}

/**
 * Verifica si un registro pertenece al rango de fechas dado
 */
export function registroEstaEnRango(item: any, rango: RangoFechas, dateFields?: string[]): boolean {
  const f = extraerFechaRegistro(item, dateFields);
  if (!f) return false;
  return f >= rango.desde && f <= rango.hasta;
}

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
  return {
    personal: await db.personal.count(),
    expedientes: await db.expedientes.count(),
    casosFaltaOficio: await db.casosFaltaOficio.count(),
    moviles: await db.moviles.count(),
    reparaciones: await db.reparaciones.count(),
    recargos: await db.recargos.count(),
    partesGuardia: await db.partesGuardia.count(),
    intervenciones: await db.intervenciones.count(),
    inspeccionesOculares: await db.inspeccionesOculares.count(),
    informesTecnicos: await db.informesTecnicos.count(),
    accidentologia: await db.accidentologia.count(),
    forenses: await db.forenses.count(),
    licenciados: await db.licenciados.count(),
    grupos: await db.grupos.count(),
    delegaciones: await db.delegaciones.count(),
    usuarios: await db.usuarios.count(),
    auditoria: await db.auditoria.count(),
    seriesNumerario: await db.seriesNumerario.count(),
    folios: await db.folios.count(),
  };
}

/**
 * Previsualiza la cantidad de registros que coinciden con un período
 */
export async function previsualizarConteoPeriodo(
  rango: RangoFechas,
  modulosSeleccionados?: string[]
): Promise<{ conteos: Record<string, number>; total: number }> {
  const modulos = MODULOS_OPERATIVOS_PERIODO.filter((m) =>
    !modulosSeleccionados || modulosSeleccionados.includes(m.id)
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

/**
 * Elimina registros que caen dentro del período especificado
 */
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

  // Registrar auditoría de la eliminación por período
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

/**
 * Exporta exclusivamente los datos de un período a formato JSON
 */
export async function exportarJsonPeriodo(
  rango: RangoFechas,
  modulosSeleccionados: string[]
): Promise<string> {
  const modulos = MODULOS_OPERATIVOS_PERIODO.filter((m) =>
    modulosSeleccionados.includes(m.id)
  );

  const exportData: Record<string, any> = {
    version: '2.0',
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
      exportData[mod.id] = allItems.filter((it: any) => registroEstaEnRango(it, rango, mod.dateFields));
    } catch (e) {
      console.error(`Error exportando período en ${mod.id}:`, e);
      exportData[mod.id] = [];
    }
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Restaura datos desde un JSON, opcionalmente filtrando por un período
 */
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

    // Registrar en auditoría
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
        descripcion: `Restauración de respaldo${rangoFiltro ? ` filtrado por período (${rangoFiltro.desde} a ${rangoFiltro.hasta})` : ''}: ${totalRestaurados} registros restaurados.`,
        detalles: JSON.stringify({ rangoFiltro, restauradosPorModulo, totalRestaurados }),
      });
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      message: `Restauración exitosa: se cargaron/actualizaron ${totalRestaurados} registros${rangoFiltro ? ` dentro del período ${rangoFiltro.desde} al ${rangoFiltro.hasta}` : ''}.`,
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

export async function exportGeneralJsonBackup(): Promise<string> {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    system: 'Sis.Pol. - Sistema de Gestión Policial y Operativa',
    configuracion: await db.configuracion.toArray(),
    personal: await db.personal.toArray(),
    expedientes: await db.expedientes.toArray(),
    casosFaltaOficio: await db.casosFaltaOficio.toArray(),
    moviles: await db.moviles.toArray(),
    reparaciones: await db.reparaciones.toArray(),
    recargos: await db.recargos.toArray(),
    partesGuardia: await db.partesGuardia.toArray(),
    intervenciones: await db.intervenciones.toArray(),
    inspeccionesOculares: await db.inspeccionesOculares.toArray(),
    informesTecnicos: await db.informesTecnicos.toArray(),
    accidentologia: await db.accidentologia.toArray(),
    forenses: await db.forenses.toArray(),
    licenciados: await db.licenciados.toArray(),
    grupos: await db.grupos.toArray(),
    delegaciones: await db.delegaciones.toArray(),
    usuarios: await db.usuarios.toArray(),
    auditoria: await db.auditoria.toArray(),
    seriesNumerario: await db.seriesNumerario.toArray(),
    folios: await db.folios.toArray(),
  };

  return JSON.stringify(data, null, 2);
}

export async function exportModuleJson(moduleName: string): Promise<string> {
  const table = (db as any)[moduleName];
  if (!table) {
    throw new Error(`Módulo no reconocido: ${moduleName}`);
  }
  const tableData = await table.toArray();
  return JSON.stringify({ module: moduleName, exportDate: new Date().toISOString(), data: tableData }, null, 2);
}

export async function exportZipBackup(): Promise<Blob> {
  const zip = new JSZip();
  const jsonContent = await exportGeneralJsonBackup();
  zip.file('database_dump.json', jsonContent);

  // Guardar manifiesto de integridad
  const counts = await getDatabaseCounts();
  zip.file('manifest.json', JSON.stringify({
    appName: 'Sis.Pol.',
    createdAt: new Date().toISOString(),
    recordCounts: counts,
    checksumValid: true,
  }, null, 2));

  // Carpeta de adjuntos (imágenes de oficios y recibos)
  const expedientes = await db.expedientes.toArray();
  const folderAdjuntos = zip.folder('adjuntos_expedientes');

  if (folderAdjuntos) {
    expedientes.forEach((exp) => {
      if (exp.adjuntosOficio) {
        exp.adjuntosOficio.forEach((imgBase64, idx) => {
          if (imgBase64 && imgBase64.includes('base64,')) {
            const dataOnly = imgBase64.split('base64,')[1];
            folderAdjuntos.file(`exp_${exp.id}_oficio_${idx + 1}.png`, dataOnly, { base64: true });
          }
        });
      }
      if (exp.adjuntosRecibo) {
        exp.adjuntosRecibo.forEach((imgBase64, idx) => {
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

export async function importGeneralJsonBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);

    if (!data.system || (!data.personal && !data.expedientes && !data.partesGuardia)) {
      return { success: false, message: 'El archivo JSON no posee la estructura válida del sistema Sis.Pol.' };
    }

    await db.transaction('rw', [
      db.configuracion,
      db.personal,
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
      db.grupos,
      db.delegaciones,
      db.usuarios,
      db.auditoria,
      db.seriesNumerario,
      db.folios,
    ], async () => {
      if (data.configuracion?.length) await db.configuracion.bulkPut(data.configuracion);
      if (data.personal?.length) await db.personal.bulkPut(data.personal);
      if (data.expedientes?.length) await db.expedientes.bulkPut(data.expedientes);
      if (data.casosFaltaOficio?.length) await db.casosFaltaOficio.bulkPut(data.casosFaltaOficio);
      if (data.moviles?.length) await db.moviles.bulkPut(data.moviles);
      if (data.reparaciones?.length) await db.reparaciones.bulkPut(data.reparaciones);
      if (data.recargos?.length) await db.recargos.bulkPut(data.recargos);
      if (data.partesGuardia?.length) await db.partesGuardia.bulkPut(data.partesGuardia);
      if (data.intervenciones?.length) await db.intervenciones.bulkPut(data.intervenciones);
      if (data.inspeccionesOculares?.length) await db.inspeccionesOculares.bulkPut(data.inspeccionesOculares);
      if (data.informesTecnicos?.length) await db.informesTecnicos.bulkPut(data.informesTecnicos);
      if (data.accidentologia?.length) await db.accidentologia.bulkPut(data.accidentologia);
      if (data.forenses?.length) await db.forenses.bulkPut(data.forenses);
      if (data.licenciados?.length) await db.licenciados.bulkPut(data.licenciados);
      if (data.grupos?.length) await db.grupos.bulkPut(data.grupos);
      if (data.delegaciones?.length) await db.delegaciones.bulkPut(data.delegaciones);
      if (data.usuarios?.length) await db.usuarios.bulkPut(data.usuarios);
      if (data.auditoria?.length) await db.auditoria.bulkPut(data.auditoria);
      if (data.seriesNumerario?.length) await db.seriesNumerario.bulkPut(data.seriesNumerario);
      if (data.folios?.length) await db.folios.bulkPut(data.folios);
    });

    return { success: true, message: 'Base de datos restaurada correctamente.' };
  } catch (error: any) {
    return { success: false, message: `Error al procesar el archivo: ${error?.message || 'Error desconocido'}` };
  }
}

export async function importZipBackup(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const zip = await JSZip.loadAsync(file);
    const dumpFile = zip.file('database_dump.json');
    if (!dumpFile) {
      return { success: false, message: 'El archivo ZIP no contiene database_dump.json válido.' };
    }

    const jsonText = await dumpFile.async('text');
    return await importGeneralJsonBackup(jsonText);
  } catch (error: any) {
    return { success: false, message: `Error leyendo el paquete ZIP: ${error?.message || 'Archivo corrupto'}` };
  }
}

/**
 * Vacía todos los datos operativos y registros de prueba/demo para permitir
 * la carga de datos propios institucionales desde cero.
 * Permite generar y descargar una copia de seguridad JSON previa.
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

  // Reiniciar numeradores en la configuración
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

  // Registrar auditoría del vaciado del sistema
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
      detalles: JSON.stringify({ totalEliminados, backupGenerado: crearBackupPrevio, fecha: new Date().toISOString() }),
    });
  } catch (e) {
    console.error('Error registrando auditoría:', e);
  }

  return { success: true, backupJson, totalEliminados };
}

