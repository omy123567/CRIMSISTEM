import React, { useState, useEffect } from 'react';
import { ConfiguracionSistema, LineaMembrete, DelegacionPolicial } from '../../types/police';
import {
  Settings,
  Database,
  Download,
  Upload,
  Archive,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  HardDrive,
  FileCode,
  Shield,
  Layers,
  Sparkles,
  Hash,
  Car,
  RotateCcw,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Bold,
  Underline,
  Eye,
  Building2,
  Sliders,
  FolderTree,
  Clock,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { AdministrarModulosModal } from '../layout/AdministrarModulosModal';
import { ControlNumeradorModal } from '../guardias/ControlNumeradorModal';
import {
  getDatabaseCounts,
  DatabaseCounts,
  exportGeneralJsonBackup,
  exportModuleJson,
  exportZipBackup,
  importGeneralJsonBackup,
  importZipBackup,
} from '../../services/backupService';
import { db, seedInitialDataIfEmpty } from '../../db/database';
import { GestionPeriodoDatos } from './GestionPeriodoDatos';

import { UsuarioSistema } from '../../types/police';

interface ConfigViewProps {
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSaveConfig: (c: ConfiguracionSistema) => void;
  onReloadAllData: () => void;
  delegacionesList?: DelegacionPolicial[];
  activeDelegacionId?: string;
  onSaveDelegacion?: (d: DelegacionPolicial) => Promise<void> | void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  currentUser,
  onSaveConfig,
  onReloadAllData,
  delegacionesList = [],
  activeDelegacionId = 'del-laguna-blanca',
  onSaveDelegacion,
}) => {
  const [formData, setFormData] = useState<ConfiguracionSistema>({ ...config });
  const [selectedDelegacionId, setSelectedDelegacionId] = useState<string>(activeDelegacionId);
  const [counts, setCounts] = useState<DatabaseCounts | null>(null);
  const [activeCatalogTab, setActiveCatalogTab] = useState<keyof ConfiguracionSistema>('jerarquias');
  const [nuevoItemCatalogo, setNuevoItemCatalogo] = useState('');
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdminModulosOpen, setIsAdminModulosOpen] = useState(false);
  const [isControlNumeradorOpen, setIsControlNumeradorOpen] = useState(false);

  // Sincronizar cuando cambia activeDelegacionId o config
  useEffect(() => {
    setSelectedDelegacionId(activeDelegacionId);
  }, [activeDelegacionId]);

  useEffect(() => {
    setFormData({ ...config });
  }, [config]);

  // Cambiar delegación a configurar
  const handleSelectDelegacionToEdit = (delId: string) => {
    setSelectedDelegacionId(delId);
    const targetDel = delegacionesList.find((d) => d.id === delId);
    if (targetDel) {
      setFormData((prev) => ({
        ...prev,
        delegacionId: targetDel.id,
        dependencia: targetDel.nombre,
        siglasDependencia: targetDel.siglas,
        unidadRegional: targetDel.unidadRegional || prev.unidadRegional,
        direccionDependencia: targetDel.direccion,
        contactoDependencia: `Tel.: ${targetDel.telefono} / E-mail: ${targetDel.email}`,
        lineasMembrete: targetDel.lineasMembrete && targetDel.lineasMembrete.length > 0
          ? targetDel.lineasMembrete
          : prev.lineasMembrete,
        logoIzquierdoUrl: targetDel.logoIzquierdoUrl || prev.logoIzquierdoUrl,
        logoDerechoUrl: targetDel.logoDerechoUrl || prev.logoDerechoUrl,
        textoDebajoLogoIzquierdo: targetDel.textoDebajoLogoIzquierdo || prev.textoDebajoLogoIzquierdo,
        textoDebajoLogoDerecho: targetDel.textoDebajoLogoDerecho || prev.textoDebajoLogoDerecho,
        pieDePagina: targetDel.pieDePagina || prev.pieDePagina,
      }));
    }
  };

  // Cargar contadores de la base de datos
  const loadCounts = async () => {
    try {
      const c = await getDatabaseCounts();
      setCounts(c);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleSaveMembrete = async (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);

    // Si hay una delegación seleccionada, guardar también en la tabla delegaciones
    const targetDel = delegacionesList.find((d) => d.id === selectedDelegacionId);
    if (targetDel) {
      const updatedDel: DelegacionPolicial = {
        ...targetDel,
        nombre: formData.dependencia,
        siglas: formData.siglasDependencia,
        unidadRegional: formData.unidadRegional,
        direccion: formData.direccionDependencia,
        lineasMembrete: formData.lineasMembrete || targetDel.lineasMembrete,
        logoIzquierdoUrl: formData.logoIzquierdoUrl,
        logoDerechoUrl: formData.logoDerechoUrl,
        textoDebajoLogoIzquierdo: formData.textoDebajoLogoIzquierdo,
        textoDebajoLogoDerecho: formData.textoDebajoLogoDerecho,
        pieDePagina: formData.pieDePagina,
      };
      await db.delegaciones.put(updatedDel);
      if (onSaveDelegacion) {
        await onSaveDelegacion(updatedDel);
      }
    }

    setBackupStatusMsg({
      text: `Membrete y configuración particular de ${formData.dependencia} actualizados con éxito.`,
    });
    setTimeout(() => setBackupStatusMsg(null), 3500);
  };

  // Agregar item al catálogo seleccionado
  const handleAddItemCatalogo = () => {
    if (!nuevoItemCatalogo.trim()) return;
    const currentList =
      (formData[activeCatalogTab] as string[]) ||
      (activeCatalogTab === 'funcionesGuardiaCatalogo'
        ? [
            'Oficial de Servicio',
            'Oficial de Guardia',
            'Chofer',
            'Fotógrafo',
            'Perito Auxiliar',
            'Encargado de Guardia',
            'Servicio de Prevención',
          ]
        : []);

    if (currentList.includes(nuevoItemCatalogo.trim())) {
      alert('El valor ya existe en este catálogo');
      return;
    }
    const updated = {
      ...formData,
      [activeCatalogTab]: [...currentList, nuevoItemCatalogo.trim()],
    };
    setFormData(updated);
    onSaveConfig(updated);
    setNuevoItemCatalogo('');
  };

  // Eliminar item de catálogo
  const handleRemoveItemCatalogo = (index: number) => {
    const currentList = [...((formData[activeCatalogTab] as string[]) || [])];
    currentList.splice(index, 1);
    const updated = {
      ...formData,
      [activeCatalogTab]: currentList,
    };
    setFormData(updated);
    onSaveConfig(updated);
  };

  // Exportar Backup JSON General
  const handleExportJson = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportGeneralJsonBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatusMsg({ text: 'Copia de seguridad JSON descargada correctamente.' });
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al exportar: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Backup ZIP Completo (Base de datos + Adjuntos)
  const handleExportZip = async () => {
    try {
      setIsProcessing(true);
      const zipBlob = await exportZipBackup();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Respaldo_Integral_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatusMsg({ text: 'Paquete ZIP de respaldo integral generado y descargado.' });
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al empaquetar ZIP: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Módulo Individual JSON
  const handleExportModule = async (modulo: string) => {
    try {
      const jsonStr = await exportModuleJson(modulo);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Modulo_${modulo}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al exportar módulo: ${err?.message}`);
    }
  };

  // Importar JSON
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsProcessing(true);
        const result = await importGeneralJsonBackup(reader.result as string);
        if (result.success) {
          setBackupStatusMsg({ text: result.message });
          await loadCounts();
          onReloadAllData();
        } else {
          setBackupStatusMsg({ text: result.message, isError: true });
        }
      } catch (err: any) {
        setBackupStatusMsg({ text: `Error al restaurar: ${err?.message}`, isError: true });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Importar ZIP
  const handleImportZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const result = await importZipBackup(file);
      if (result.success) {
        setBackupStatusMsg({ text: result.message });
        await loadCounts();
        onReloadAllData();
      } else {
        setBackupStatusMsg({ text: result.message, isError: true });
      }
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al restaurar ZIP: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
    e.target.value = '';
  };

  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [resetCounterConfirm, setResetCounterConfirm] = useState<{
    isOpen: boolean;
    tipo: 'Criminalística' | 'Accidentológica' | null;
  }>({ isOpen: false, tipo: null });

  // Recargar datos demo iniciales sin window.confirm
  const handleReloadDemoData = async () => {
    await seedInitialDataIfEmpty();
    await loadCounts();
    onReloadAllData();
    setBackupStatusMsg({ text: 'Datos de demostración policiales cargados con éxito.' });
  };

  const handleResetCounter = async (tipo: 'Criminalística' | 'Accidentológica') => {
    const puedeResetear =
      currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeResetearContadores);
    if (!puedeResetear) {
      alert('Acceso restringido: Solo el Superusuario o usuarios con permiso explícito pueden resetear o alterar contadores.');
      return;
    }

    let updated: ConfiguracionSistema;
    if (tipo === 'Criminalística') {
      updated = {
        ...formData,
        inicioNroIntervencionCriminalistica: 1,
        ultimoNroIntervencionCriminalistica: 0,
      };
    } else {
      updated = {
        ...formData,
        inicioNroIntervencionAccidentologica: 1,
        ultimoNroIntervencionAccidentologica: 0,
      };
    }
    setFormData(updated);
    onSaveConfig(updated);
    setBackupStatusMsg({ text: `Numerador de ${tipo} reiniciado a N° 0001.` });
    setTimeout(() => setBackupStatusMsg(null), 3000);
  };

  const catalogOptions: { id: keyof ConfiguracionSistema; label: string }[] = [
    { id: 'jerarquias', label: 'Jerarquías Policiales' },
    { id: 'gruposGuardia', label: 'Grupos de Guardia / Oficina' },
    { id: 'funcionesGuardiaCatalogo', label: 'Funciones de Guardia' },
    { id: 'condicionesInvolucrado', label: 'Condiciones de Involucrados' },
    { id: 'hechosCriminalistica', label: 'Hechos Habituales' },
    { id: 'tiposRequerimiento', label: 'Tipos de Requerimiento' },
    { id: 'tiposOficio', label: 'Tipos de Oficio Judicial' },
    { id: 'juzgadosFiscalias', label: 'Juzgados y Fiscalías' },
    { id: 'dependenciasPoliciales', label: 'Dependencias Policiales' },
    { id: 'unidadesRegionales', label: 'Unidades Regionales' },
    { id: 'destinosPoliciales', label: 'Destinos Policiales' },
    { id: 'viasSolicitud', label: 'Vías de Solicitud' },
    { id: 'tiposRecargo', label: 'Tipos de Recargo' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Configuración Institucional, Catálogos & Backups
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Offline-First Dexie IDB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de membrete policial, edición de catálogos dinámicos y respaldo integral de la base de datos en JSON y ZIP.
          </p>
        </div>

        <button
          onClick={() => setIsDemoConfirmOpen(true)}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Cargar Datos Demo</span>
        </button>
      </div>

      {backupStatusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            backupStatusMsg.isError
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{backupStatusMsg.text}</span>
        </div>
      )}

      {/* SECCIÓN K: PANEL DE ESTADO DE LA BASE DE DATOS LOCAL Y RESPALDOS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">
              Estado de la Base de Datos Local (IndexedDB)
            </h2>
          </div>
          <button
            onClick={loadCounts}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Actualizar Contadores</span>
          </button>
        </div>

        {/* Contadores por Entidad */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Personal y Legajos</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.personal}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Expedientes Formales</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.expedientes}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Casos Falta de Oficio</span>
              <span className="text-xl font-bold font-mono text-red-700">{counts.casosFaltaOficio}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Móviles Policiales</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.moviles}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Reparaciones Taller</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.reparaciones}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Recargos Operativos</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.recargos}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Libros de Guardia</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.partesGuardia}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Intervenciones Periciales</span>
              <span className="text-xl font-bold font-mono text-blue-900">{counts.intervenciones}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Forenses Policiales</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.forenses}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Usuarios Registrados</span>
              <span className="text-xl font-bold font-mono text-slate-900">{counts.usuarios}</span>
            </div>
          </div>
        )}

        {/* Acciones de Respaldo y Restauración General */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exportación */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 text-xs">
            <span className="font-bold text-blue-950 block text-sm">
              Exportación de Respaldo (Backup)
            </span>
            <p className="text-slate-600">
              Genere copias de seguridad portables para resguardar la base de datos ante contingencias.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJson}
                disabled={isProcessing}
                className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Exportar JSON General</span>
              </button>

              <button
                onClick={handleExportZip}
                disabled={isProcessing}
                className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Exportar ZIP Completo con Adjuntos</span>
              </button>
            </div>
          </div>

          {/* Restauración */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 text-xs">
            <span className="font-bold text-amber-950 block text-sm">
              Restauración con Verificación de Integridad
            </span>
            <p className="text-slate-600">
              Restaure desde un archivo JSON o paquete ZIP previamente exportado.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                <Archive className="w-3.5 h-3.5" />
                <span>Restaurar ZIP</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  onChange={handleImportZipFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Exportación por Módulo Individual */}
        <div className="pt-2">
          <span className="font-bold text-slate-800 block text-xs mb-2">
            Exportar Módulos Individuales en JSON:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'personal', label: 'Personal' },
              { id: 'expedientes', label: 'Expedientes' },
              { id: 'casosFaltaOficio', label: 'Falta de Oficio' },
              { id: 'moviles', label: 'Móviles' },
              { id: 'reparaciones', label: 'Reparaciones' },
              { id: 'recargos', label: 'Recargos' },
              { id: 'partesGuardia', label: 'Partes Guardia' },
              { id: 'intervenciones', label: 'Intervenciones' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleExportModule(m.id)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-xs border border-slate-300 cursor-pointer"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN: GESTIÓN, ELIMINACIÓN Y RESTAURACIÓN DE DATOS POR PERÍODO */}
      <GestionPeriodoDatos
        currentUser={currentUser}
        onDataChanged={async () => {
          await loadCounts();
          onReloadAllData();
        }}
        onShowMessage={(text, isError) => {
          setBackupStatusMsg({ text, isError });
          setTimeout(() => setBackupStatusMsg(null), 5000);
        }}
      />

      {/* SECCIÓN I: MEMBRETE INSTITUCIONAL PARA REPORTES OFICIALES (SEGÚN IMAGEN OFICIAL) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Membrete Oficial Policial (Configuración de Reportes & PDFs)
              </h2>
              <p className="text-[11px] text-slate-500">
                Personalice los logos, lemas institucionales, agregue o quite líneas con formato libre.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const defaultLines: LineaMembrete[] = [
                  { id: 'l-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
                  { id: 'l-2', texto: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
                  { id: 'l-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
                  { id: 'l-4', texto: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
                  { id: 'l-5', texto: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
                ];
                setFormData({
                  ...formData,
                  nombreInstitucion: 'POLICÍA DE LA PROVINCIA DE FORMOSA',
                  unidadRegional: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN',
                  dependencia: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
                  logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
                  textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
                  logoDerechoUrl: '',
                  textoDebajoLogoDerecho: 'D.G.P.C.',
                  lineasMembrete: defaultLines,
                });
              }}
              className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Restablecer Valores Oficiales
            </button>
          </div>
        </div>

        {/* SELECTOR DE DELEGACIÓN PARA MEMBRETE PARTICULAR */}
        {delegacionesList && delegacionesList.length > 0 && (
          <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-800 text-white rounded-lg shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-950 block">
                  Configuración y Membrete Particular por Delegación
                </span>
                <span className="text-[11px] text-blue-800">
                  Cada delegación cuenta con su membrete, logos y datos de contacto independientes.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Editar Membrete de:
              </span>
              <select
                value={selectedDelegacionId}
                onChange={(e) => handleSelectDelegacionToEdit(e.target.value)}
                className="bg-white text-xs font-bold text-slate-800 border-2 border-blue-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                {delegacionesList.map((del) => (
                  <option key={del.id} value={del.id}>
                    {del.nombre} ({del.ciudad})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* VISTA PREVIA EN TIEMPO REAL DEL MEMBRETE (IDÉNTICO A LA IMAGEN) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-900" />
            Vista Previa Oficial del Membrete
          </span>
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 sm:p-6 shadow-inner">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Logo Izquierdo y Lema */}
              <div className="flex flex-col items-center text-center w-36 shrink-0">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center justify-center p-1 overflow-hidden">
                  {formData.logoIzquierdoUrl ? (
                    <img
                      src={formData.logoIzquierdoUrl}
                      alt="Logo Izquierdo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Shield className="w-12 h-12 text-blue-900" />
                  )}
                </div>
                {formData.textoDebajoLogoIzquierdo && (
                  <span className="text-[9px] text-slate-500 italic mt-1.5 leading-tight max-w-[130px]">
                    {formData.textoDebajoLogoIzquierdo}
                  </span>
                )}
              </div>

              {/* Líneas Centrales Dinámicas */}
              <div className="flex-1 text-center space-y-1 py-1">
                {(formData.lineasMembrete && formData.lineasMembrete.length > 0
                  ? formData.lineasMembrete
                  : [
                      { id: '1', texto: formData.nombreInstitucion, negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
                      { id: '2', texto: formData.unidadRegional, negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
                      { id: '3', texto: formData.dependencia, negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
                    ]
                ).map((linea: any, idx: number) => {
                  const textColor =
                    linea.color === 'azul'
                      ? 'text-blue-950 font-bold'
                      : linea.color === 'gris'
                      ? 'text-slate-600'
                      : 'text-slate-900';

                  const textSize =
                    linea.tamano === 'xl'
                      ? 'text-base sm:text-lg tracking-wide'
                      : linea.tamano === 'lg'
                      ? 'text-sm sm:text-base'
                      : linea.tamano === 'base'
                      ? 'text-xs sm:text-sm'
                      : 'text-[11px] sm:text-xs text-slate-500';

                  return (
                    <div
                      key={linea.id || idx}
                      className={`${textColor} ${textSize} ${linea.negrita ? 'font-bold' : 'font-normal'} ${
                        linea.subrayado ? 'underline underline-offset-3 decoration-blue-900' : ''
                      } leading-tight`}
                    >
                      {linea.texto}
                    </div>
                  );
                })}
              </div>

              {/* Logo Derecho y Siglas */}
              <div className="flex flex-col items-center text-center w-36 shrink-0">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center justify-center p-1 overflow-hidden">
                  {formData.logoDerechoUrl ? (
                    <img
                      src={formData.logoDerechoUrl}
                      alt="Logo Derecho"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Shield className="w-12 h-12 text-blue-950" />
                  )}
                </div>
                {formData.textoDebajoLogoDerecho && (
                  <span className="text-[10px] text-blue-950 font-extrabold mt-1.5 tracking-wider">
                    {formData.textoDebajoLogoDerecho}
                  </span>
                )}
              </div>
            </div>

            {/* Doble línea de pie de membrete */}
            <div className="mt-4 pt-2 border-t-2 border-b border-blue-950/80 h-1"></div>
          </div>
        </div>

        {/* EDITOR DE LÍNEAS DEL MEMBRETE (AGREGAR / QUITAR / MODIFICAR) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xs">
                Líneas de Texto Centrales del Membrete
              </h3>
              <p className="text-[11px] text-slate-500">
                Puede agregar nuevas líneas, reordenarlas, cambiar formato y colores.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const current = formData.lineasMembrete || [];
                const newLine: LineaMembrete = {
                  id: 'linea-' + Date.now(),
                  texto: 'Nueva línea de información o dependencia',
                  negrita: false,
                  subrayado: false,
                  tamano: 'base',
                  color: 'azul',
                };
                setFormData({ ...formData, lineasMembrete: [...current, newLine] });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Línea</span>
            </button>
          </div>

          <div className="space-y-2">
            {(formData.lineasMembrete || []).map((linea, index) => (
              <div
                key={linea.id || index}
                className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200"
              >
                {/* Texto de la línea */}
                <input
                  type="text"
                  value={linea.texto}
                  onChange={(e) => {
                    const updated = [...(formData.lineasMembrete || [])];
                    updated[index] = { ...linea, texto: e.target.value };
                    setFormData({ ...formData, lineasMembrete: updated });
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white rounded border border-slate-300 font-medium"
                  placeholder="Escriba el texto de la línea..."
                />

                {/* Formatos: Negrita y Subrayado */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(formData.lineasMembrete || [])];
                      updated[index] = { ...linea, negrita: !linea.negrita };
                      setFormData({ ...formData, lineasMembrete: updated });
                    }}
                    title="Negrita"
                    className={`p-1.5 rounded text-xs transition-colors ${
                      linea.negrita ? 'bg-blue-900 text-white font-bold' : 'bg-white border text-slate-700'
                    }`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(formData.lineasMembrete || [])];
                      updated[index] = { ...linea, subrayado: !linea.subrayado };
                      setFormData({ ...formData, lineasMembrete: updated });
                    }}
                    title="Subrayado"
                    className={`p-1.5 rounded text-xs transition-colors ${
                      linea.subrayado ? 'bg-blue-900 text-white underline' : 'bg-white border text-slate-700'
                    }`}
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tamaño */}
                <select
                  value={linea.tamano}
                  onChange={(e) => {
                    const updated = [...(formData.lineasMembrete || [])];
                    updated[index] = { ...linea, tamano: e.target.value as any };
                    setFormData({ ...formData, lineasMembrete: updated });
                  }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                >
                  <option value="xl">Título (XL)</option>
                  <option value="lg">Subtítulo (LG)</option>
                  <option value="base">Normal (Base)</option>
                  <option value="sm">Chico (SM)</option>
                </select>

                {/* Color */}
                <select
                  value={linea.color}
                  onChange={(e) => {
                    const updated = [...(formData.lineasMembrete || [])];
                    updated[index] = { ...linea, color: e.target.value as any };
                    setFormData({ ...formData, lineasMembrete: updated });
                  }}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="azul">Azul Policial</option>
                  <option value="negro">Negro</option>
                  <option value="gris">Gris Suave</option>
                </select>

                {/* Reordenar y Eliminar */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const updated = [...(formData.lineasMembrete || [])];
                      const temp = updated[index - 1];
                      updated[index - 1] = updated[index];
                      updated[index] = temp;
                      setFormData({ ...formData, lineasMembrete: updated });
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 bg-white border rounded"
                    title="Mover arriba"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={index === (formData.lineasMembrete?.length || 1) - 1}
                    onClick={() => {
                      const updated = [...(formData.lineasMembrete || [])];
                      const temp = updated[index + 1];
                      updated[index + 1] = updated[index];
                      updated[index] = temp;
                      setFormData({ ...formData, lineasMembrete: updated });
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 bg-white border rounded"
                    title="Mover abajo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(formData.lineasMembrete || [])];
                      updated.splice(index, 1);
                      setFormData({ ...formData, lineasMembrete: updated });
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    title="Eliminar línea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GESTIÓN DE LOGOS Y LEMAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-white text-xs">
          {/* Logo Izquierdo */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-900" />
              Escudo / Logo Izquierdo
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setFormData({ ...formData, logoIzquierdoUrl: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
              />
              {formData.logoIzquierdoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoIzquierdoUrl: '' })}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Quitar
                </button>
              )}
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Lema o Texto Debajo del Logo Izquierdo:
              </label>
              <input
                type="text"
                value={formData.textoDebajoLogoIzquierdo || ''}
                onChange={(e) => setFormData({ ...formData, textoDebajoLogoIzquierdo: e.target.value })}
                placeholder='Ej. "La seguridad pública es una construcción colectiva"'
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
          </div>

          {/* Logo Derecho */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-900" />
              Emblema / Logo Derecho
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setFormData({ ...formData, logoDerechoUrl: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
              />
              {formData.logoDerechoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoDerechoUrl: '' })}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Quitar
                </button>
              )}
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Siglas o Texto Debajo del Logo Derecho:
              </label>
              <input
                type="text"
                value={formData.textoDebajoLogoDerecho || ''}
                onChange={(e) => setFormData({ ...formData, textoDebajoLogoDerecho: e.target.value })}
                placeholder="Ej. D.G.P.C."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>
          </div>
        </div>

        {/* FORMULARIO DE GUARDADO DE CAMPOS INSTITUCIONALES */}
        <form onSubmit={handleSaveMembrete} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Dirección / Ubicación de la Dependencia
              </label>
              <input
                type="text"
                value={formData.direccionDependencia || ''}
                onChange={(e) => setFormData({ ...formData, direccionDependencia: e.target.value })}
                placeholder="Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfonos y Correos Institucionales
              </label>
              <input
                type="text"
                value={formData.contactoDependencia || ''}
                onChange={(e) => setFormData({ ...formData, contactoDependencia: e.target.value })}
                placeholder="Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Siglas de la Dependencia (Correlativos) *
              </label>
              <input
                type="text"
                required
                value={formData.siglasDependencia}
                onChange={(e) => setFormData({ ...formData, siglasDependencia: e.target.value.toUpperCase() })}
                placeholder="Ej. DPC"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-blue-900"
              />
              <span className="text-[10px] text-slate-500">
                Aparece en: 3812 /2026-{formData.siglasDependencia}.
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Texto de Pie de Página en Documentos PDF
              </label>
              <input
                type="text"
                value={formData.pieDePagina}
                onChange={(e) => setFormData({ ...formData, pieDePagina: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white italic text-slate-600"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Membrete Institucional Oficial</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN I.2: EDITOR DE CATÁLOGOS DINÁMICOS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Layers className="w-5 h-5 text-blue-900" />
          <h2 className="text-sm font-bold text-slate-900">
            Editor de Catálogos Dinámicos (Sin Opciones Fijas)
          </h2>
        </div>

        {/* Selector de Catálogo */}
        <div className="flex flex-wrap gap-2 text-xs">
          {catalogOptions.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCatalogTab(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeCatalogTab === cat.id
                  ? 'bg-blue-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Input para agregar elemento */}
        <div className="flex gap-2 text-xs">
          <input
            type="text"
            placeholder={`Agregar nueva opción a ${catalogOptions.find((c) => c.id === activeCatalogTab)?.label}...`}
            value={nuevoItemCatalogo}
            onChange={(e) => setNuevoItemCatalogo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItemCatalogo()}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white"
          />
          <button
            type="button"
            onClick={handleAddItemCatalogo}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </div>

        {/* Lista de elementos del catálogo seleccionado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs max-h-72 overflow-y-auto p-1">
          {((formData[activeCatalogTab] as string[]) || []).map((item, idx) => (
            <div
              key={idx}
              className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between group"
            >
              <span className="font-semibold text-slate-800 truncate" title={item}>
                {item}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItemCatalogo(idx)}
                className="text-slate-400 hover:text-red-600 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar de catálogo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN I.3: CONTROL Y CONFIGURACIÓN DE NUMERADORES OFICIALES (CRIMINALÍSTICA Y ACCIDENTOLÓGICA) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Control de Numeradores de Intervenciones (Inicio Anual, Horario y Reseteo)
              </h2>
              <p className="text-xs text-slate-500">
                Configure los números de inicio, último número registrado y hora oficial de intervención exclusivamente desde este panel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsControlNumeradorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs self-start sm:self-center"
            title="Ajustar número de última intervención y horario con panel asistido"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Ajustar Numerador e Historial</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Criminalística */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>INTERVENCIÓN CRIMINALÍSTICA (LC)</span>
              </span>
              <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                Próximo: #{(formData.inicioNroIntervencionCriminalistica || 1) > (formData.ultimoNroIntervencionCriminalistica || 0) ? formData.inicioNroIntervencionCriminalistica || 1 : (formData.ultimoNroIntervencionCriminalistica || 0) + 1}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Inicio Anual:
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.inicioNroIntervencionCriminalistica ?? 3800}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const upd = { ...formData, inicioNroIntervencionCriminalistica: val };
                    setFormData(upd);
                    onSaveConfig(upd);
                  }}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Último N°:
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.ultimoNroIntervencionCriminalistica ?? 3812}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const upd = { ...formData, ultimoNroIntervencionCriminalistica: val };
                    setFormData(upd);
                    onSaveConfig(upd);
                  }}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold text-center"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hora Registro:
                </label>
                <input
                  type="text"
                  placeholder="18:28 hs."
                  value={formData.ultimaHoraIntervencion ?? '18:28 hs.'}
                  onChange={(e) => {
                    const upd = { ...formData, ultimaHoraIntervencion: e.target.value };
                    setFormData(upd);
                    onSaveConfig(upd);
                  }}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold text-center text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-blue-100">
              <span className="text-[11px] text-slate-500">
                Formato: INTERVENCIÓN CRIMINALÍSTICA Nº [N°] /{new Date().getFullYear()}-{formData.siglasDependencia}.
              </span>
              <button
                type="button"
                onClick={() => setResetCounterConfirm({ isOpen: true, tipo: 'Criminalística' })}
                className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetear a N° 0001</span>
              </button>
            </div>
          </div>

          {/* Card Accidentológica */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-950 uppercase flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-700" />
                <span>INTERVENCIÓN ACCIDENTOLÓGICA (Seg. Vial)</span>
              </span>
              <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                Próximo: #{(formData.inicioNroIntervencionAccidentologica || 1) > (formData.ultimoNroIntervencionAccidentologica || 0) ? formData.inicioNroIntervencionAccidentologica || 1 : (formData.ultimoNroIntervencionAccidentologica || 0) + 1}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Inicio:
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.inicioNroIntervencionAccidentologica ?? 2500}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const upd = { ...formData, inicioNroIntervencionAccidentologica: val };
                    setFormData(upd);
                    onSaveConfig(upd);
                  }}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Último N° Registrado:
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.ultimoNroIntervencionAccidentologica ?? 2584}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const upd = { ...formData, ultimoNroIntervencionAccidentologica: val };
                    setFormData(upd);
                    onSaveConfig(upd);
                  }}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold text-center"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-amber-100">
              <span className="text-[11px] text-slate-500">
                Formato: INTERVENCIÓN ACCIDENTOLÓGICA Nº [N°] /{new Date().getFullYear()}-{formData.siglasDependencia}.
              </span>
              <button
                type="button"
                onClick={() => setResetCounterConfirm({ isOpen: true, tipo: 'Accidentológica' })}
                className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetear a N° 0001</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN I.4: ADMINISTRACIÓN DE ORDEN Y SUBMÓDULOS DEL SISTEMA */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Estructura, Orden y Submódulos del Sistema
              </h2>
              <p className="text-xs text-slate-500">
                Cambie el orden de visualización de los módulos en la barra lateral y agrúpelos jerárquicamente como submódulos de un módulo principal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAdminModulosOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs self-start sm:self-center"
          >
            <FolderTree className="w-4 h-4 text-indigo-200" />
            <span>Organizar Módulos y Submódulos</span>
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Jerarquía Dinámica Activa</span>
            </span>
            <p className="text-[11px] text-slate-600">
              Puede reordenar con flechas arriba/abajo o seleccionar cualquier módulo para que funcione como submódulo desplegable dentro de otro (por ejemplo: "Accidentología" o "Móviles" como submódulo de "Guardias").
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdminModulosOpen(true)}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            Abrir Administrador
          </button>
        </div>
      </div>

      {/* Confirmación para Cargar Datos Demo */}
      <ConfirmModal
        isOpen={isDemoConfirmOpen}
        title="Cargar Datos Policiales de Demostración"
        message="¿Desea re-sembrar los datos policiales de prueba en la base de datos local IndexedDB? Esto agregará registros de ejemplo."
        confirmLabel="Cargar Datos Demo"
        isDestructive={false}
        onConfirm={handleReloadDemoData}
        onClose={() => setIsDemoConfirmOpen(false)}
      />

      {/* Confirmación para Resetear Numeradores */}
      <ConfirmModal
        isOpen={resetCounterConfirm.isOpen}
        title={`Resetear Numerador de ${resetCounterConfirm.tipo}`}
        message={`¿Confirma reiniciar el contador de ${resetCounterConfirm.tipo} a N° 0001 (por ejemplo para inicio de año calendario)?`}
        confirmLabel="Sí, Reiniciar a N° 0001"
        isDestructive={false}
        onConfirm={() => resetCounterConfirm.tipo && handleResetCounter(resetCounterConfirm.tipo)}
        onClose={() => setResetCounterConfirm({ isOpen: false, tipo: null })}
      />

      {/* Modal para Administrar Orden y Submódulos del Sistema */}
      <AdministrarModulosModal
        isOpen={isAdminModulosOpen}
        onClose={() => setIsAdminModulosOpen(false)}
        config={formData}
        onSaveConfig={(upd) => {
          setFormData(upd);
          onSaveConfig(upd);
        }}
      />

      {/* Modal Oficial para Control de Numerador e Historial */}
      {isControlNumeradorOpen && (
        <ControlNumeradorModal
          config={formData}
          currentUser={currentUser}
          onClose={() => setIsControlNumeradorOpen(false)}
          onSaveConfig={(upd) => {
            setFormData(upd);
            onSaveConfig(upd);
          }}
        />
      )}
    </div>
  );
};
