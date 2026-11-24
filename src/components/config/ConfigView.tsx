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
  AlertTriangle,
  Lock,
  KeyRound,
  EyeOff,
  AlertCircle,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Filter,
  CheckSquare,
  FileCheck2,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { AdministrarModulosModal } from '../layout/AdministrarModulosModal';
import { ControlNumeradorModal } from '../guardias/ControlNumeradorModal';
import {
  getDatabaseCounts,
  DatabaseCounts,
  BACKUP_MODULES_CATALOG,
  BackupInspectionResult,
  exportGeneralJsonBackup,
  exportEncryptedJsonBackup,
  exportModuleJson,
  exportModuleCsv,
  exportCsvBundleZip,
  exportZipBackup,
  inspectBackupFile,
  applyInspectedBackup,
  vaciarBaseDeDatosCompleta,
} from '../../services/backupService';
import { seedFiveRecordsPerModule } from '../../services/seedDemoDataService';
import { evaluarFortalezaPassword } from '../../services/securityClient';
import { db } from '../../db/database';
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
  const [isVaciarModalOpen, setIsVaciarModalOpen] = useState(false);
  const [crearBackupAntesDeVaciar, setCrearBackupAntesDeVaciar] = useState(true);
  const [palabraConfirmacionVaciar, setPalabraConfirmacionVaciar] = useState('');
  const [isWipingData, setIsWipingData] = useState(false);

  // Estado modal exportación cifrada AES-256-GCM
  const [isEncryptModalOpen, setIsEncryptModalOpen] = useState(false);
  const [encryptPass, setEncryptPass] = useState('');
  const [encryptConfirm, setEncryptConfirm] = useState('');
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [showEncryptPass, setShowEncryptPass] = useState(false);

  // Estado modal descifrado al restaurar respaldo cifrado
  const [decryptModal, setDecryptModal] = useState<{
    isOpen: boolean;
    type: 'json' | 'zip';
    rawJson?: string;
    zipFile?: File;
    password: string;
    error: string | null;
    showPass: boolean;
  }>({
    isOpen: false,
    type: 'json',
    password: '',
    error: null,
    showPass: false,
  });

  // Scope de exportación selectiva
  const puedeVerTodasDelegaciones =
    currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeVerOtrasDelegaciones);
  const [exportDelegacionScope, setExportDelegacionScope] = useState<string>(
    puedeVerTodasDelegaciones ? 'todas' : currentUser?.delegacionId || activeDelegacionId
  );
  const [exportModulosSeleccionados, setExportModulosSeleccionados] = useState<string[]>(
    BACKUP_MODULES_CATALOG.map((m) => m.id)
  );
  const [showSelectiveModules, setShowSelectiveModules] = useState(false);

  // Carga de 5 registros ficticios por módulo
  const [seedTargetDelegacionId, setSeedTargetDelegacionId] = useState<string>(
    activeDelegacionId && activeDelegacionId !== 'todas'
      ? activeDelegacionId
      : currentUser?.delegacionId || 'del-laguna-blanca'
  );
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  // Modal de Previsualización de Respaldo antes de Restaurar
  const [restorePreview, setRestorePreview] = useState<{
    isOpen: boolean;
    inspection: BackupInspectionResult | null;
    mode: 'merge' | 'replace';
    selectedModules: string[];
    fileName?: string;
  }>({
    isOpen: false,
    inspection: null,
    mode: 'merge',
    selectedModules: [],
  });

  const handleVaciarTodo = async () => {
    const texto = palabraConfirmacionVaciar.trim().toUpperCase();
    if (texto !== 'VACIAR' && texto !== 'CONFIRMAR') {
      setBackupStatusMsg({
        text: 'Debe escribir exactamente "VACIAR" o "CONFIRMAR" para autorizar la acción.',
        isError: true,
      });
      return;
    }

    try {
      setIsWipingData(true);
      const res = await vaciarBaseDeDatosCompleta(
        crearBackupAntesDeVaciar,
        currentUser?.apellidoYNombre || currentUser?.username || 'Administrador'
      );
      await loadCounts();
      onReloadAllData();
      setIsVaciarModalOpen(false);
      setPalabraConfirmacionVaciar('');
      setBackupStatusMsg({
        text: `Base de datos vaciada con éxito (${res.totalEliminados} registros eliminados). ${
          crearBackupAntesDeVaciar
            ? 'Se descargó automáticamente el respaldo JSON previo.'
            : ''
        } Ya puede comenzar a ingresar sus propios datos.`,
      });
      setTimeout(() => setBackupStatusMsg(null), 7000);
    } catch (err: any) {
      setBackupStatusMsg({
        text: `Error al vaciar los datos: ${err?.message || 'Error desconocido'}`,
        isError: true,
      });
    } finally {
      setIsWipingData(false);
    }
  };

  // Sincronizar cuando cambia activeDelegacionId o config
  useEffect(() => {
    setSelectedDelegacionId(activeDelegacionId);
    if (activeDelegacionId && activeDelegacionId !== 'todas') {
      setSeedTargetDelegacionId(activeDelegacionId);
    }
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
      (activeCatalogTab === 'causasReferencia'
        ? ['Sumario Judicial', 'Actuaciones Prevencionales', 'Expediente', 'Causa Penal', 'Oficio Judicial']
        : activeCatalogTab === 'tiposLesionCatalogo'
        ? ['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas', 'Óbito']
        : activeCatalogTab === 'viasSolicitud'
        ? ['vía telefónica.', 'vía radial.', 'por escrito.', 'comparecencia personal en guardia.']
        : activeCatalogTab === 'funcionesGuardiaCatalogo'
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

    if (currentList.some((item) => item.toLowerCase() === nuevoItemCatalogo.trim().toLowerCase())) {
      setBackupStatusMsg({
        text: 'El valor ya existe en este catálogo (se evitan duplicados).',
        isError: true,
      });
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

  const selectiveOptions = {
    delegacionId: exportDelegacionScope,
    modulos: exportModulosSeleccionados,
  };

  // Exportar Backup JSON General / Selectivo con SHA-256
  const handleExportJson = async () => {
    if (exportModulosSeleccionados.length === 0) {
      setBackupStatusMsg({ text: 'Seleccione al menos un módulo para exportar.', isError: true });
      return;
    }
    try {
      setIsProcessing(true);
      const jsonStr = await exportGeneralJsonBackup(selectiveOptions);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const scopeTag = exportDelegacionScope === 'todas' ? 'Completo' : exportDelegacionScope;
      a.download = `SisPol_Backup_${scopeTag}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatusMsg({
        text: `Copia de seguridad JSON (${exportModulosSeleccionados.length} módulos) con verificación SHA-256 descargada.`,
      });
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al exportar: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Backup JSON Cifrado AES-256-GCM
  const handleConfirmExportEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncryptError(null);

    if (encryptPass.trim().length < 8) {
      setEncryptError('La contraseña de cifrado debe tener al menos 8 caracteres.');
      return;
    }
    if (encryptPass !== encryptConfirm) {
      setEncryptError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    try {
      setIsProcessing(true);
      const encryptedStr = await exportEncryptedJsonBackup(encryptPass.trim(), selectiveOptions);
      const blob = new Blob([encryptedStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Backup_Cifrado_AES256_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsEncryptModalOpen(false);
      setEncryptPass('');
      setEncryptConfirm('');
      setBackupStatusMsg({
        text: 'Copia de seguridad cifrada con AES-256-GCM + SHA-256 descargada correctamente.',
      });
    } catch (err: any) {
      setEncryptError(err?.message || 'Error al cifrar el respaldo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Backup ZIP Completo (Base de datos + CSVs + Manifiesto + Adjuntos)
  const handleExportZip = async () => {
    if (exportModulosSeleccionados.length === 0) {
      setBackupStatusMsg({ text: 'Seleccione al menos un módulo para empaquetar.', isError: true });
      return;
    }
    try {
      setIsProcessing(true);
      const zipBlob = await exportZipBackup(selectiveOptions);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Respaldo_Integral_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatusMsg({
        text: 'Paquete ZIP integral (JSON + Planillas Excel CSV + Adjuntos + SHA-256) descargado.',
      });
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al empaquetar ZIP: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Paquete de Planillas Excel CSV (UTF-8 con BOM)
  const handleExportCsvBundle = async () => {
    if (exportModulosSeleccionados.length === 0) {
      setBackupStatusMsg({ text: 'Seleccione al menos un módulo para exportar a Excel.', isError: true });
      return;
    }
    try {
      setIsProcessing(true);
      const { blob, totalRecords, moduleCount } = await exportCsvBundleZip(selectiveOptions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SisPol_Planillas_Excel_CSV_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatusMsg({
        text: `Paquete CSV para Excel generado: ${totalRecords} registros en ${moduleCount} planillas con datos.`,
      });
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error exportando CSV: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar Módulo Individual JSON o CSV
  const handleExportModule = async (modulo: string, format: 'json' | 'csv' = 'json') => {
    try {
      if (format === 'csv') {
        const { csv, count } = await exportModuleCsv(modulo, exportDelegacionScope);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SisPol_${modulo}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupStatusMsg({ text: `Planilla CSV de "${modulo}" descargada (${count} registros).` });
      } else {
        const jsonStr = await exportModuleJson(modulo, exportDelegacionScope);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SisPol_Modulo_${modulo}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupStatusMsg({ text: `Módulo "${modulo}" exportado en JSON con SHA-256.` });
      }
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al exportar módulo: ${err?.message}`, isError: true });
    }
  };

  const openPreviewFromInspection = (inspection: BackupInspectionResult, fileName?: string) => {
    const presentMods = Object.entries(inspection.recordCounts)
      .filter(([, cnt]) => cnt > 0)
      .map(([id]) => id);
    setRestorePreview({
      isOpen: true,
      inspection,
      mode: 'merge',
      selectedModules:
        presentMods.length > 0 ? presentMods : Object.keys(inspection.recordCounts),
      fileName,
    });
  };

  // Importar JSON -> Inspección y Previsualización
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsProcessing(true);
        const rawJson = reader.result as string;
        const inspection = await inspectBackupFile({ rawJson });
        if (inspection.needsPassword) {
          setDecryptModal({
            isOpen: true,
            type: 'json',
            rawJson,
            password: '',
            error: null,
            showPass: false,
          });
          return;
        }
        if (inspection.valid) {
          openPreviewFromInspection(inspection, file.name);
        } else {
          setBackupStatusMsg({
            text: inspection.error || 'Archivo JSON de respaldo inválido.',
            isError: true,
          });
        }
      } catch (err: any) {
        setBackupStatusMsg({ text: `Error al analizar respaldo: ${err?.message}`, isError: true });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Importar ZIP -> Inspección y Previsualización
  const handleImportZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const inspection = await inspectBackupFile({ zipFile: file });
      if (inspection.needsPassword) {
        setDecryptModal({
          isOpen: true,
          type: 'zip',
          zipFile: file,
          password: '',
          error: null,
          showPass: false,
        });
        return;
      }
      if (inspection.valid) {
        openPreviewFromInspection(inspection, file.name);
      } else {
        setBackupStatusMsg({
          text: inspection.error || 'Archivo ZIP de respaldo inválido.',
          isError: true,
        });
      }
    } catch (err: any) {
      setBackupStatusMsg({ text: `Error al analizar ZIP: ${err?.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
    e.target.value = '';
  };

  const handleConfirmDecryptImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decryptModal.password.trim()) {
      setDecryptModal((prev) => ({
        ...prev,
        error: 'Ingrese la contraseña del respaldo cifrado.',
      }));
      return;
    }

    try {
      setIsProcessing(true);
      setDecryptModal((prev) => ({ ...prev, error: null }));
      const inspection =
        decryptModal.type === 'zip' && decryptModal.zipFile
          ? await inspectBackupFile({
              zipFile: decryptModal.zipFile,
              decryptionPassword: decryptModal.password.trim(),
            })
          : await inspectBackupFile({
              rawJson: decryptModal.rawJson || '',
              decryptionPassword: decryptModal.password.trim(),
            });

      if (inspection.valid) {
        setDecryptModal({
          isOpen: false,
          type: 'json',
          password: '',
          error: null,
          showPass: false,
        });
        openPreviewFromInspection(
          inspection,
          decryptModal.zipFile?.name || 'Respaldo_Cifrado.json'
        );
      } else {
        setDecryptModal((prev) => ({
          ...prev,
          error: inspection.error || 'Contraseña incorrecta o archivo corrupto.',
        }));
      }
    } catch (err: any) {
      setDecryptModal((prev) => ({
        ...prev,
        error: err?.message || 'Contraseña incorrecta o respaldo corrupto.',
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyInspectedRestore = async () => {
    const data = restorePreview.inspection?.parsedData;
    if (!data) return;
    if (restorePreview.selectedModules.length === 0) {
      setBackupStatusMsg({
        text: 'Seleccione al menos un módulo para aplicar la restauración.',
        isError: true,
      });
      return;
    }
    try {
      setIsProcessing(true);
      const res = await applyInspectedBackup(data, {
        mode: restorePreview.mode,
        modulosARestaurar: restorePreview.selectedModules,
        usuarioNombre: currentUser?.apellidoYNombre || currentUser?.username,
      });
      setRestorePreview({
        isOpen: false,
        inspection: null,
        mode: 'merge',
        selectedModules: [],
      });
      setBackupStatusMsg({ text: res.message });
      await loadCounts();
      onReloadAllData();
    } catch (err: any) {
      setBackupStatusMsg({
        text: `Error al aplicar restauración: ${err?.message || 'Error desconocido'}`,
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [resetCounterConfirm, setResetCounterConfirm] = useState<{
    isOpen: boolean;
    tipo: 'Criminalística' | 'Accidentológica' | null;
  }>({ isOpen: false, tipo: null });

  // Cargar 5 datos ficticios completos en todos los módulos
  const handleReloadDemoData = async () => {
    try {
      setIsSeedingDemo(true);
      const result = await seedFiveRecordsPerModule({
        delegacionId: seedTargetDelegacionId,
        delegacionesList,
        currentUser,
      });
      await loadCounts();
      onReloadAllData();
      setBackupStatusMsg({
        text: `¡Carga completa! Se generaron ${result.totalCreated} registros ficticios (5 por cada módulo con todos sus campos) para ${result.delegacionNombre}${
          result.syncedToServer ? ' y se sincronizaron con el servidor.' : '.'
        }`,
      });
      setTimeout(() => setBackupStatusMsg(null), 8000);
    } catch (err: any) {
      setBackupStatusMsg({
        text: `Error al cargar datos ficticios: ${err?.message || 'Error desconocido'}`,
        isError: true,
      });
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleResetCounter = async (tipo: 'Criminalística' | 'Accidentológica') => {
    const puedeResetear =
      currentUser?.rol === 'superusuario' || Boolean(currentUser?.puedeResetearContadores);
    if (!puedeResetear) {
      setBackupStatusMsg({
        text: 'Acceso restringido: Solo el Superusuario o usuarios con permiso explícito pueden resetear o alterar contadores.',
        isError: true,
      });
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
    { id: 'viasSolicitud', label: 'Solicitud Vía' },
    { id: 'causasReferencia', label: 'REFERENCIA / Causa' },
    { id: 'tiposLesionCatalogo', label: 'Tipo de Lesión' },
    { id: 'funcionesGuardiaCatalogo', label: 'Función' },
    { id: 'condicionesInvolucrado', label: 'Condición' },
    { id: 'jerarquias', label: 'Jerarquías Policiales' },
    { id: 'gruposGuardia', label: 'Grupos de Guardia / Oficina' },
    { id: 'hechosCriminalistica', label: 'Hechos Habituales' },
    { id: 'tiposRequerimiento', label: 'Tipos de Requerimiento' },
    { id: 'tiposOficio', label: 'Tipos de Oficio Judicial' },
    { id: 'juzgadosFiscalias', label: 'Juzgados y Fiscalías' },
    { id: 'dependenciasPoliciales', label: 'Dependencias Policiales' },
    { id: 'unidadesRegionales', label: 'Unidades Regionales' },
    { id: 'destinosPoliciales', label: 'Destinos Policiales' },
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
          disabled={isSeedingDemo}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{isSeedingDemo ? 'Cargando datos...' : 'Cargar 5 Datos Ficticios por Módulo'}</span>
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
          <span className="flex-1">{backupStatusMsg.text}</span>
          <button
            type="button"
            onClick={() => setBackupStatusMsg(null)}
            className="p-0.5 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECCIÓN DEMO: CARGA DE DATOS FICTICIOS (5 REGISTROS POR MÓDULO) */}
      <div className="bg-linear-to-r from-amber-50 via-white to-blue-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Carga de Datos Ficticios de Prueba (5 registros por módulo)
            </h2>
          </div>
          <p className="text-xs text-slate-600 max-w-3xl">
            Puebla automáticamente <strong>5 registros completos en todos los campos</strong> de cada módulo operativo
            (Personal con fecha de ingreso, Grupos, Licencias Policiales Art. 7/11/15/42/47, Saldos, Partes de Guardia,
            Intervenciones c/ Personal Policial y Fallecidos, Inspecciones Oculares, Expedientes, Falta de Oficio,
            Informes Técnicos, Accidentología, Móviles, Reparaciones, Recargos, Forenses, Licenciados, Folios, Novedades y Charlas).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {delegacionesList.length > 0 && (
            <select
              value={seedTargetDelegacionId}
              disabled={!puedeVerTodasDelegaciones}
              onChange={(e) => setSeedTargetDelegacionId(e.target.value)}
              className="px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 disabled:bg-slate-100"
              title="Delegación destino para los datos ficticios"
            >
              {delegacionesList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.siglas} - {d.ciudad}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setIsDemoConfirmOpen(true)}
            disabled={isSeedingDemo}
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSeedingDemo ? 'Generando registros...' : 'Cargar 5 Registros por Módulo'}</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN K: PANEL DE ESTADO DE LA BASE DE DATOS LOCAL Y RESPALDOS MEJORADOS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Estado de la Base de Datos & Centro Avanzado de Backup / Exportación
              </h2>
              <p className="text-[11px] text-slate-500">
                Respaldo completo o selectivo con verificación SHA-256, cifrado AES-256-GCM, planillas CSV para Excel y vista previa antes de restaurar.
              </p>
            </div>
          </div>
          <button
            onClick={loadCounts}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Actualizar Contadores</span>
          </button>
        </div>

        {/* Contadores completos por Entidad */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
            {[
              { label: 'Personal', value: counts.personal, color: 'text-slate-900' },
              { label: 'Licencias Pol.', value: counts.licenciasPoliciales, color: 'text-indigo-800' },
              { label: 'Grupos Guardia', value: counts.grupos, color: 'text-slate-900' },
              { label: 'Partes Guardia', value: counts.partesGuardia, color: 'text-slate-900' },
              { label: 'Intervenciones', value: counts.intervenciones, color: 'text-blue-900' },
              { label: 'Insp. Oculares', value: counts.inspeccionesOculares, color: 'text-blue-800' },
              { label: 'Expedientes', value: counts.expedientes, color: 'text-slate-900' },
              { label: 'Falta de Oficio', value: counts.casosFaltaOficio, color: 'text-red-700' },
              { label: 'Informes Técnicos', value: counts.informesTecnicos, color: 'text-slate-900' },
              { label: 'Accidentología', value: counts.accidentologia, color: 'text-amber-800' },
              { label: 'Móviles', value: counts.moviles, color: 'text-slate-900' },
              { label: 'Reparaciones', value: counts.reparaciones, color: 'text-slate-900' },
              { label: 'Recargos', value: counts.recargos, color: 'text-slate-900' },
              { label: 'Forenses', value: counts.forenses, color: 'text-slate-900' },
              { label: 'Licenciados', value: counts.licenciados, color: 'text-slate-900' },
              { label: 'Folios Asign.', value: counts.folios, color: 'text-slate-900' },
              { label: 'Memos y Notas', value: counts.memosNotas, color: 'text-cyan-800' },
              { label: 'Charlas Prev.', value: counts.charlasPrevencion, color: 'text-emerald-800' },
              { label: 'Novedades Del.', value: counts.novedadesDelegaciones, color: 'text-slate-900' },
            ].map((item) => (
              <div key={item.label} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] truncate">{item.label}</span>
                <span className={`text-lg font-bold font-mono ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filtro Selectivo de Exportación (Delegación y Módulos) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Filter className="w-4 h-4 text-blue-800" />
              <span>Alcance Selectivo de Exportación y Backup:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={exportDelegacionScope}
                disabled={!puedeVerTodasDelegaciones}
                onChange={(e) => setExportDelegacionScope(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 disabled:bg-slate-100"
              >
                {puedeVerTodasDelegaciones && (
                  <option value="todas">Todas las Delegaciones (General)</option>
                )}
                {delegacionesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    Solo {d.siglas} ({d.ciudad})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowSelectiveModules((v) => !v)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  Módulos ({exportModulosSeleccionados.length}/{BACKUP_MODULES_CATALOG.length})
                </span>
              </button>
            </div>
          </div>

          {showSelectiveModules && (
            <div className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-500 font-semibold">Selección rápida:</span>
                <button
                  type="button"
                  onClick={() => setExportModulosSeleccionados(BACKUP_MODULES_CATALOG.map((m) => m.id))}
                  className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-bold cursor-pointer hover:bg-blue-200"
                >
                  Todos ({BACKUP_MODULES_CATALOG.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExportModulosSeleccionados(
                      BACKUP_MODULES_CATALOG.filter((m) => m.category === 'Operativo').map((m) => m.id)
                    )
                  }
                  className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold cursor-pointer hover:bg-emerald-200"
                >
                  Solo Operativos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExportModulosSeleccionados(['personal', 'grupos', 'licenciasPoliciales', 'saldosLicencias', 'feriados'])
                  }
                  className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold cursor-pointer hover:bg-indigo-200"
                >
                  Personal y Licencias
                </button>
                <button
                  type="button"
                  onClick={() => setExportModulosSeleccionados([])}
                  className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold cursor-pointer hover:bg-slate-300"
                >
                  Ninguno
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {BACKUP_MODULES_CATALOG.map((mod) => {
                  const checked = exportModulosSeleccionados.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                        checked
                          ? 'bg-blue-50 border-blue-300 text-blue-950 font-semibold'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setExportModulosSeleccionados((prev) =>
                            prev.includes(mod.id)
                              ? prev.filter((x) => x !== mod.id)
                              : [...prev, mod.id]
                          )
                        }
                        className="w-3.5 h-3.5 text-blue-900 rounded"
                      />
                      <span className="truncate">{mod.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Acciones de Respaldo y Restauración General */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exportación */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 text-sm">
                Exportación de Respaldo y Planillas Excel
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                SHA-256
              </span>
            </div>
            <p className="text-slate-600">
              Incluye las 26 tablas del sistema (incluyendo Licencias, Feriados, Saldos, Novedades y Roles) con sello de integridad SHA-256.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEncryptPass('');
                  setEncryptConfirm('');
                  setEncryptError(null);
                  setShowEncryptPass(false);
                  setIsEncryptModalOpen(true);
                }}
                disabled={isProcessing || exportModulosSeleccionados.length === 0}
                className="flex items-center gap-1.5 bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Exporta un archivo JSON protegido con cifrado AES-256-GCM + verificación SHA-256"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-200" />
                <span>JSON Cifrado (AES-256)</span>
              </button>

              <button
                onClick={handleExportJson}
                disabled={isProcessing || exportModulosSeleccionados.length === 0}
                className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>JSON Backup</span>
              </button>

              <button
                onClick={handleExportZip}
                disabled={isProcessing || exportModulosSeleccionados.length === 0}
                className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>ZIP Integral (JSON + CSV + Adjuntos)</span>
              </button>

              <button
                onClick={handleExportCsvBundle}
                disabled={isProcessing || exportModulosSeleccionados.length === 0}
                className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                title="Descarga un paquete ZIP con planillas CSV UTF-8 BOM listas para abrir directamente en Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.CSV en ZIP)</span>
              </button>
            </div>
          </div>

          {/* Restauración */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 text-sm">
                Restauración Segura con Previsualización
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                <FileCheck2 className="w-3 h-3" />
                Inspección Previa
              </span>
            </div>
            <p className="text-slate-600">
              Antes de modificar la base de datos, el sistema verifica el checksum SHA-256 y muestra el desglose de registros para elegir Combinar o Reemplazar.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Analizar y Restaurar JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                <Archive className="w-3.5 h-3.5" />
                <span>Analizar y Restaurar ZIP</span>
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

        {/* Exportación Rápida por Módulo Individual (JSON y Excel CSV) */}
        <div className="pt-2 border-t border-slate-100">
          <span className="font-bold text-slate-800 block text-xs mb-2">
            Exportación Rápida por Módulo Individual (JSON o Planilla Excel CSV):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { id: 'personal', label: 'Personal y Legajos' },
              { id: 'licenciasPoliciales', label: 'Licencias Policiales' },
              { id: 'saldosLicencias', label: 'Saldos Art. 7' },
              { id: 'expedientes', label: 'Expedientes Judiciales' },
              { id: 'casosFaltaOficio', label: 'Falta de Oficio' },
              { id: 'partesGuardia', label: 'Partes de Guardia' },
              { id: 'intervenciones', label: 'Intervenciones' },
              { id: 'inspeccionesOculares', label: 'Inspecciones Oculares' },
              { id: 'accidentologia', label: 'Accidentología Vial' },
              { id: 'informesTecnicos', label: 'Informes Técnicos' },
              { id: 'memosNotas', label: 'Memos y Notas' },
              { id: 'moviles', label: 'Móviles Policiales' },
              { id: 'recargos', label: 'Recargos Operativos' },
            ].map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <span className="font-medium text-slate-800 truncate">{m.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExportModule(m.id, 'json')}
                    className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-900 border border-slate-300 rounded text-[10px] font-bold cursor-pointer"
                    title={`Descargar ${m.label} en JSON`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportModule(m.id, 'csv')}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                    title={`Descargar ${m.label} en CSV para Excel`}
                  >
                    CSV
                  </button>
                </div>
              </div>
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

      {/* SECCIÓN: VACIADO INTEGRAL DEL SISTEMA PARA CARGA DE DATOS PROPIOS */}
      <div className="bg-red-50/60 p-5 rounded-xl border border-red-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-700" />
            <div>
              <h2 className="text-sm font-bold text-red-950">
                Puesta a Cero del Sistema (Cargar Mis Propios Datos)
              </h2>
              <p className="text-xs text-red-700">
                Elimine todos los registros cargados de prueba para comenzar a operar con datos reales de su dependencia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPalabraConfirmacionVaciar('');
              setCrearBackupAntesDeVaciar(true);
              setIsVaciarModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs self-start sm:self-center"
          >
            <Trash2 className="w-4 h-4 text-red-200" />
            <span>Vaciar Todos los Datos Cargados</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              ¿Desea limpiar el sistema y comenzar desde cero con el personal, expedientes y guardias de su propia división?
            </p>
            <p className="text-slate-600 text-[11px]">
              Esta función borra en un solo clic todo el personal, expedientes, secuestros, inspecciones y libros de guardia.
              <strong> Incluye la opción de generar y descargar automáticamente una copia de seguridad en JSON antes de vaciar.</strong> Se mantendrán las configuraciones de membrete y los usuarios creados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPalabraConfirmacionVaciar('');
              setCrearBackupAntesDeVaciar(true);
              setIsVaciarModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white border border-red-300 hover:bg-red-100/70 text-red-800 font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-2xs"
          >
            Configurar Vaciado y Respaldo
          </button>
        </div>
      </div>

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

      {/* SECCIÓN I.5: CONTROL Y RECORDATORIOS DE MANTENIMIENTO DE MÓVILES (RTO Y SERVIS OFICIAL) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Control y Recordatorios de Mantenimiento de Móviles (RTO & Servis)
              </h2>
              <p className="text-xs text-slate-500">
                Personalice los períodos de anticipación para las alertas de Revisión Técnica Obligatoria (RTO) y servicios de mantenimiento preventivo.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* RTO Recordatorio */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <span className="font-bold text-blue-950 block text-xs">
              Anticipación de Alerta RTO (Días)
            </span>
            <p className="text-[11px] text-slate-600">
              Tiempo previo al vencimiento para activar notificaciones preventivas.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="180"
                value={formData.recordatorioRtoDias ?? 30}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 30;
                  const upd = { ...formData, recordatorioRtoDias: val };
                  setFormData(upd);
                  onSaveConfig(upd);
                }}
                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
              />
              <span className="text-slate-600 font-medium">días (ej. 30 días = 1 mes)</span>
            </div>
            <span className="text-[10px] text-blue-800 font-semibold block pt-1">
              * Nota: Las motocicletas / motovehículos están automáticamente exentas de este aviso.
            </span>
          </div>

          {/* Intervalo de Servis */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
            <span className="font-bold text-indigo-950 block text-xs">
              Intervalo de Servis Oficial (Frecuencia)
            </span>
            <p className="text-[11px] text-slate-600">
              Cada cuántos kilómetros se debe realizar el mantenimiento de la unidad.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1000"
                step="1000"
                value={formData.intervaloServiceKm ?? 10000}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10000;
                  const upd = { ...formData, intervaloServiceKm: val };
                  setFormData(upd);
                  onSaveConfig(upd);
                }}
                className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
              />
              <span className="text-slate-600 font-medium">Km (ej. cada 10.000 Km)</span>
            </div>
            <span className="text-[10px] text-indigo-800 font-semibold block pt-1">
              Establece el objetivo de odómetro para el próximo service programado.
            </span>
          </div>

          {/* Anticipación para Servis */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <span className="font-bold text-amber-950 block text-xs">
              Anticipación para Recordatorio de Servis
            </span>
            <p className="text-[11px] text-slate-600">
              Kilómetros previos a alcanzar el service para emitir la notificación.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                step="50"
                value={formData.recordatorioServiceKm ?? 500}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 500;
                  const upd = { ...formData, recordatorioServiceKm: val };
                  setFormData(upd);
                  onSaveConfig(upd);
                }}
                className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
              />
              <span className="text-slate-600 font-medium">Km antes (ej. 500 Km)</span>
            </div>
            <span className="text-[10px] text-amber-800 font-semibold block pt-1">
              Avisará en Notificaciones y Parque Automotor al restar esta distancia.
            </span>
          </div>
        </div>
      </div>

      {/* Confirmación para Cargar 5 Datos Ficticios por Módulo */}
      <ConfirmModal
        isOpen={isDemoConfirmOpen}
        title="Cargar 5 Datos Ficticios Completos por Módulo"
        message={`Se generarán 5 registros ficticios con todos los campos poblados en cada uno de los módulos operativos (Personal, Licencias Art. 7/11/15/42/47, Grupos, Partes de Guardia, Intervenciones, Inspecciones Oculares, Expedientes, Móviles, Accidentología, Folios, Charlas, Novedades, etc.) para la delegación seleccionada. ¿Desea continuar?`}
        confirmLabel="Sí, Cargar 5 Registros por Módulo"
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

      {/* Modal de Confirmación y Descarga Previa para Vaciar Base de Datos */}
      {isVaciarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 text-red-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Vaciar Sistema para Cargar Mis Propios Datos
                </h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará todos los registros cargados de prueba o anteriores para dejar la base de datos limpia.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
              <span className="font-bold block flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-700" />
                Registros que se vaciarán permanentemente:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-red-800 text-[11px]">
                <li>Personal policial, legajos y agentes</li>
                <li>Expedientes judiciales y casos falta de oficio</li>
                <li>Libros y partes diarios de guardia (incluyendo novedades de Cibercrimen)</li>
                <li>Intervenciones periciales, inspecciones oculares e informes técnicos</li>
                <li>Móviles policiales, reparaciones y recargos de servicio</li>
                <li>Accidentología, forenses y series de folios</li>
              </ul>
              <p className="text-[11px] font-semibold pt-1 border-t border-red-200 text-red-950">
                ✓ Se preservarán: Las cuentas de usuario y el membrete institucional configurado.
              </p>
            </div>

            {/* Opción de Backup Previo */}
            <label className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100/60 transition-colors">
              <input
                type="checkbox"
                checked={crearBackupAntesDeVaciar}
                onChange={(e) => setCrearBackupAntesDeVaciar(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-blue-950 block">
                  Crear y descargar automáticamente copia de seguridad completa (JSON) antes de vaciar
                </span>
                <span className="text-[11px] text-blue-800">
                  Recomendado: se guardará un archivo JSON con todos los datos actuales en sus descargas.
                </span>
              </div>
            </label>

            {/* Confirmación por palabra clave */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-800">
                Para confirmar la eliminación total, escriba la palabra <span className="text-red-700 font-mono font-bold">VACIAR</span>:
              </label>
              <input
                type="text"
                value={palabraConfirmacionVaciar}
                onChange={(e) => setPalabraConfirmacionVaciar(e.target.value)}
                placeholder='Escriba "VACIAR" o "CONFIRMAR"'
                className="w-full px-3 py-2 border-2 border-slate-300 focus:border-red-600 rounded-xl font-bold tracking-wider text-slate-900 text-center uppercase outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isWipingData}
                onClick={() => {
                  setIsVaciarModalOpen(false);
                  setPalabraConfirmacionVaciar('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isWipingData ||
                  (palabraConfirmacionVaciar.trim().toUpperCase() !== 'VACIAR' &&
                    palabraConfirmacionVaciar.trim().toUpperCase() !== 'CONFIRMAR')
                }
                onClick={handleVaciarTodo}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {isWipingData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Vaciando datos...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Todo y Comenzar de Cero</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exportar Respaldo Cifrado AES-256-GCM */}
      {isEncryptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-indigo-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-800 rounded-xl text-indigo-200">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Exportar Respaldo Cifrado (AES-256-GCM)</h3>
                  <p className="text-[11px] text-slate-300">
                    Protegido con PBKDF2-SHA256 e integridad SHA-256
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEncryptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmExportEncrypted} className="p-5 space-y-4 text-xs">
              {encryptError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{encryptError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Contraseña de Cifrado *</label>
                  <button
                    type="button"
                    onClick={() => setShowEncryptPass((v) => !v)}
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showEncryptPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showEncryptPass ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <input
                  type={showEncryptPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={encryptPass}
                  onChange={(e) => setEncryptPass(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-indigo-600"
                />
                {encryptPass.length > 0 && (() => {
                  const s = evaluarFortalezaPassword(encryptPass);
                  return (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Fortaleza:</span>
                        <span className={`font-bold ${s.colorClass}`}>{s.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${s.barColor}`} style={{ width: `${(s.score / 4) * 100}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmar Contraseña *
                </label>
                <input
                  type={showEncryptPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={encryptConfirm}
                  onChange={(e) => setEncryptConfirm(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEncryptModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Cifrar y Descargar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Descifrar Respaldo Cifrado al Importar */}
      {decryptModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-700 rounded-xl text-amber-100">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Respaldo Protegido con Cifrado</h3>
                  <p className="text-[11px] text-slate-300">
                    Ingrese la contraseña para descifrar y verificar integridad
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDecryptModal({
                    isOpen: false,
                    type: 'json',
                    password: '',
                    error: null,
                    showPass: false,
                  })
                }
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecryptImport} className="p-5 space-y-4 text-xs">
              {decryptModal.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{decryptModal.error}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Contraseña del Respaldo *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDecryptModal((prev) => ({ ...prev, showPass: !prev.showPass }))
                    }
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {decryptModal.showPass ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    <span>{decryptModal.showPass ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <input
                  type={decryptModal.showPass ? 'text' : 'password'}
                  required
                  value={decryptModal.password}
                  onChange={(e) =>
                    setDecryptModal((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Contraseña ingresada al exportar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setDecryptModal({
                      isOpen: false,
                      type: 'json',
                      password: '',
                      error: null,
                      showPass: false,
                    })
                  }
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Analizando...' : 'Descifrar y Previsualizar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Previsualización de Respaldo antes de Restaurar */}
      {restorePreview.isOpen && restorePreview.inspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-blue-100">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Previsualización de Respaldo e Integridad</h3>
                  <p className="text-[11px] text-slate-300">
                    {restorePreview.fileName || 'Archivo de Respaldo'} • Formato{' '}
                    {restorePreview.inspection.format.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRestorePreview({
                    isOpen: false,
                    inspection: null,
                    mode: 'merge',
                    selectedModules: [],
                  })
                }
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Verificación SHA-256 */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  restorePreview.inspection.checksumStatus === 'valid'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : restorePreview.inspection.checksumStatus === 'invalid'
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold">
                    {restorePreview.inspection.checksumStatus === 'valid' &&
                      'Integridad SHA-256 Verificada (Archivo Auténtico Sin Alteraciones)'}
                    {restorePreview.inspection.checksumStatus === 'invalid' &&
                      'ADVERTENCIA: El Checksum SHA-256 no coincide — el archivo pudo haber sido modificado manualmente'}
                    {restorePreview.inspection.checksumStatus === 'legacy-none' &&
                      'Respaldo compatible de versión anterior (sin sello SHA-256 integrado)'}
                  </div>
                  <div className="text-[11px] opacity-85 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>
                      Fecha exportación:{' '}
                      <strong>
                        {restorePreview.inspection.exportDate
                          ? new Date(restorePreview.inspection.exportDate).toLocaleString('es-AR')
                          : 'No especificada'}
                      </strong>
                    </span>
                    <span>
                      Versión: <strong>{restorePreview.inspection.version || '1.0'}</strong>
                    </span>
                    <span>
                      Alcance: <strong>{restorePreview.inspection.delegacionFiltro || 'TODAS'}</strong>
                    </span>
                    <span>
                      Total registros: <strong>{restorePreview.inspection.totalRecords}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de Modo de Restauración */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 block">Modo de Restauración:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestorePreview((prev) => ({ ...prev, mode: 'merge' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      restorePreview.mode === 'merge'
                        ? 'border-blue-700 bg-blue-50 text-blue-950 ring-1 ring-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Combinar / Actualizar (Recomendado)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Agrega registros nuevos y actualiza coincidencias sin borrar los datos existentes.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestorePreview((prev) => ({ ...prev, mode: 'replace' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      restorePreview.mode === 'replace'
                        ? 'border-red-600 bg-red-50 text-red-950 ring-1 ring-red-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">Reemplazar Módulos Seleccionados</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Limpia los módulos tildados antes de importar exactamente el contenido del respaldo.
                    </div>
                  </button>
                </div>
              </div>

              {/* Desglose de Módulos a Restaurar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Contenido detectado por módulo ({restorePreview.selectedModules.length} seleccionados):
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setRestorePreview((prev) => ({
                          ...prev,
                          selectedModules: Object.keys(prev.inspection?.recordCounts || {}),
                        }))
                      }
                      className="text-blue-700 hover:underline font-semibold cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRestorePreview((prev) => ({ ...prev, selectedModules: [] }))
                      }
                      className="text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {Object.entries(restorePreview.inspection.recordCounts).map(([modId, count]) => {
                    const meta = BACKUP_MODULES_CATALOG.find((m) => m.id === modId);
                    const checked = restorePreview.selectedModules.includes(modId);
                    return (
                      <label
                        key={modId}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                          checked
                            ? 'bg-white border-blue-300 text-slate-900 font-semibold'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setRestorePreview((prev) => ({
                                ...prev,
                                selectedModules: prev.selectedModules.includes(modId)
                                  ? prev.selectedModules.filter((x) => x !== modId)
                                  : [...prev.selectedModules, modId],
                              }))
                            }
                            className="w-3.5 h-3.5 text-blue-900 rounded"
                          />
                          <span className="truncate">{meta?.label || modId}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            count > 0 ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setRestorePreview({
                    isOpen: false,
                    inspection: null,
                    mode: 'merge',
                    selectedModules: [],
                  })
                }
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing || restorePreview.selectedModules.length === 0}
                onClick={handleApplyInspectedRestore}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isProcessing
                    ? 'Restaurando...'
                    : `Confirmar Restauración (${restorePreview.selectedModules.reduce(
                        (acc, id) => acc + (restorePreview.inspection?.recordCounts[id] || 0),
                        0
                      )} reg.)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
