import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, seedInitialDataIfEmpty, DEFAULT_CONFIG } from './db/database';
import {
  Personal,
  ExpedienteJudicial,
  CasoFaltaOficio,
  MovilPolicial,
  ReparacionMecanica,
  RecargoOperativo,
  ParteNovedadesGuardia,
  IntervencionParte,
  ForenseTurno,
  LicenciadoTurno,
  InformeTecnico,
  ConfiguracionSistema,
  InspeccionOcular,
  GrupoPersonal,
  UsuarioSistema,
  DelegacionPolicial,
  SerieNumerario,
  FolioAsignado,
  AccidentologiaRegistro,
  RolSistema,
  AvisoNovedad,
  EstadoOperativoVehiculo,
  PrioridadNovedad,
  CharlaPrevencion,
  LicenciaPolicial,
  SaldoLicenciaAnio,
  FeriadoDiaNoLaborable,
  MemoNota,
  InventarioBien,
  ActaCambioJefe,
} from './types/police';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { NovedadesDelegacionesView } from './components/novedades/NovedadesDelegacionesView';
import { CharlasPrevencionView, getDiasHastaCharla } from './components/charlas/CharlasPrevencionView';
import { DashboardView } from './components/dashboard/DashboardView';
import { PersonnelView } from './components/personnel/PersonnelView';
import { GruposView } from './components/grupos/GruposView';
import { ExpedientesView } from './components/expedientes/ExpedientesView';
import { MovilesView } from './components/moviles/MovilesView';
import { RecargosView } from './components/recargos/RecargosView';
import { GuardiasView } from './components/guardias/GuardiasView';
import { InspeccionesView } from './components/inspecciones/InspeccionesView';
import { IntervencionesView } from './components/intervenciones/IntervencionesView';
import { PersonasView } from './components/personas/PersonasView';
import { VehiculosView } from './components/vehiculos/VehiculosView';
import { ForenseView } from './components/forense/ForenseView';
import { LicenciadosView } from './components/licenciados/LicenciadosView';
import { InformesTecnicosView } from './components/informes/InformesTecnicosView';
import { CausasPolicialesView } from './components/causas-policiales/CausasPolicialesView';
import { AccidentologiaView } from './components/accidentologia/AccidentologiaView';
import { calcularCodigoMensual } from './components/accidentologia/AccidentologiaModal';
import { NumerarioView } from './components/numerario/NumerarioView';
import { ConfigView } from './components/config/ConfigView';
import { UsuariosView } from './components/usuarios/UsuariosView';
import { AuditoriaView } from './components/auditoria/AuditoriaView';
import { LicenciasPolicialesView } from './components/licencias/LicenciasPolicialesView';
import { MemosNotasView } from './components/memos/MemosNotasView';
import { InventarioView } from './components/inventario/InventarioView';
import { esTipoLesionADeterminar, getResumenLesionADeterminarIntervencion } from './utils/lesionesUtils';
import {
  extractNumeroFolioFromText,
  findMemoForFolio,
  findSerieForMemo,
  formatCodigoFolioConAnio,
  normalizeTiposMemoCatalogo,
  isMemoVisibleForUser,
  isJefeControlFoliosUser,
  sortSeriesNumerarioByOrden,
} from './utils/memosCatalogUtils';
import { PdfPreviewModal } from './components/common/PdfPreviewModal';
import { LoginView } from './components/auth/LoginView';
import { CambiarPasswordModal } from './components/auth/CambiarPasswordModal';
import { TwoFactorModal } from './components/auth/TwoFactorModal';
import { registrarAuditoria } from './services/auditService';
import {
  DEFAULT_FERIADOS_ARGENTINA,
  normalizeTiposLicenciaCatalogo,
} from './services/licenciaService';
import {
  syncWithServer,
  saveItemToServer,
  deleteItemFromServer,
  logoutOnServer,
  adminResetUser2faOnServer,
} from './services/apiService';
import { getAuthToken, subscribeAuthExpired } from './services/securityClient';
import {
  extractIoNumber,
  extractIoYear,
  formatNroIO,
  getLastLoadedIoNumber,
  getNextIoNumber,
  sanitizeUltimoNroIO,
} from './utils/numeracionUtils';
import { PanelLeftOpen, ShieldAlert, CheckCircle2, Clock, X } from 'lucide-react';

const ensureConfigLicencias = (conf: ConfiguracionSistema): ConfiguracionSistema => {
  let updated: ConfiguracionSistema = {
    ...conf,
    tiposLicenciaCatalogo: normalizeTiposLicenciaCatalogo(conf.tiposLicenciaCatalogo),
    tiposMemoCatalogo: normalizeTiposMemoCatalogo(conf.tiposMemoCatalogo),
  };
  if (
    updated.estructuraModulos &&
    updated.estructuraModulos.length > 0 &&
    !updated.estructuraModulos.some((m) => m.id === 'licencias')
  ) {
    updated = {
      ...updated,
      estructuraModulos: [
        ...updated.estructuraModulos,
        {
          id: 'licencias',
          label: 'Licencia Policial',
          desc: 'Régimen, Saldos, Feriados y Reportes',
          visible: true,
          orden: updated.estructuraModulos.length,
          padreId: null,
          colorTonalidad: 'esmeralda',
        },
      ],
    };
  }
  if (
    updated.estructuraModulos &&
    updated.estructuraModulos.length > 0 &&
    !updated.estructuraModulos.some((m) => m.id === 'memos-notas')
  ) {
    updated = {
      ...updated,
      estructuraModulos: [
        ...updated.estructuraModulos,
        {
          id: 'memos-notas',
          label: 'Memos y Notas',
          desc: 'Memorándums, Nota V, Notas & Anexos',
          visible: true,
          orden: updated.estructuraModulos.length,
          padreId: null,
          colorTonalidad: 'cian',
        },
      ],
    };
  }
  if (
    updated.estructuraModulos &&
    updated.estructuraModulos.length > 0 &&
    !updated.estructuraModulos.some((m) => m.id === 'inventario')
  ) {
    updated = {
      ...updated,
      estructuraModulos: [
        ...updated.estructuraModulos,
        {
          id: 'inventario',
          label: 'Inventario y Cambio de Jefe',
          desc: 'Patrimonio, Bienes y Actas de Relevo',
          visible: true,
          orden: updated.estructuraModulos.length,
          padreId: null,
          colorTonalidad: 'azul',
        },
      ],
    };
  }
  return updated;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UsuarioSistema | null>(() => {
    try {
      const stored = sessionStorage.getItem('sispol_current_user');
      if (stored) {
        if (navigator.onLine && !getAuthToken()) {
          sessionStorage.removeItem('sispol_current_user');
          return null;
        }
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.username || parsed.email)) {
          return { ...parsed, password: '' };
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [inactivityCountdown, setInactivityCountdown] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const showNotice = useCallback((text: string, isError: boolean = true) => {
    setActionNotice({ text, isError });
    setTimeout(() => setActionNotice(null), 4500);
  }, []);

  // Estados de datos
  const [config, setConfig] = useState<ConfiguracionSistema>(DEFAULT_CONFIG);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [gruposList, setGruposList] = useState<GrupoPersonal[]>([]);
  const [expedientesList, setExpedientesList] = useState<ExpedienteJudicial[]>([]);
  const [casosFaltaOficioList, setCasosFaltaOficioList] = useState<CasoFaltaOficio[]>([]);
  const [movilesList, setMovilesList] = useState<MovilPolicial[]>([]);
  const [reparacionesList, setReparacionesList] = useState<ReparacionMecanica[]>([]);
  const [recargosList, setRecargosList] = useState<RecargoOperativo[]>([]);
  const [partesGuardiaList, setPartesGuardiaList] = useState<ParteNovedadesGuardia[]>([]);
  const [inspeccionesList, setInspeccionesList] = useState<InspeccionOcular[]>([]);
  const [forensesList, setForensesList] = useState<ForenseTurno[]>([]);
  const [licenciadosList, setLicenciadosList] = useState<LicenciadoTurno[]>([]);
  const [informesTecnicosList, setInformesTecnicosList] = useState<InformeTecnico[]>([]);
  const [intervencionesList, setIntervencionesList] = useState<IntervencionParte[]>([]);
  const [usuariosList, setUsuariosList] = useState<UsuarioSistema[]>([]);
  const [delegacionesList, setDelegacionesList] = useState<DelegacionPolicial[]>([]);
  const [seriesNumerarioList, setSeriesNumerarioList] = useState<SerieNumerario[]>([]);
  const [foliosList, setFoliosList] = useState<FolioAsignado[]>([]);
  const [accidentologiaList, setAccidentologiaList] = useState<AccidentologiaRegistro[]>([]);
  const [rolesList, setRolesList] = useState<RolSistema[]>([]);
  const [novedadesList, setNovedadesList] = useState<AvisoNovedad[]>([]);
  const [charlasList, setCharlasList] = useState<CharlaPrevencion[]>([]);
  const [licenciasPolicialesList, setLicenciasPolicialesList] = useState<LicenciaPolicial[]>([]);
  const [saldosLicenciasList, setSaldosLicenciasList] = useState<SaldoLicenciaAnio[]>([]);
  const [feriadosList, setFeriadosList] = useState<FeriadoDiaNoLaborable[]>([]);
  const [memosNotasList, setMemosNotasList] = useState<MemoNota[]>([]);
  const [inventarioBienesList, setInventarioBienesList] = useState<InventarioBien[]>([]);
  const [actasCambioJefeList, setActasCambioJefeList] = useState<ActaCambioJefe[]>([]);

  // Delegación activa en visualización
  const [activeDelegacionId, setActiveDelegacionId] = useState<string>(() => {
    return currentUser?.delegacionId || 'del-laguna-blanca';
  });

  // Carga de datos desde Servidor Central Ubuntu e IndexedDB
  const reloadAllData = useCallback(async () => {
    try {
      // 1. Sincronizar primero con el servidor central Ubuntu si hay conexión
      await syncWithServer();
      await seedInitialDataIfEmpty();

      const confArray = await db.configuracion.toArray();
      if (confArray.length > 0) {
        const activeConf =
          confArray.find((c) => c.id === `config-${activeDelegacionId}`) || confArray[0];
        const latestStructConf = [...confArray]
          .filter((c) => c.estructuraModulos && c.estructuraModulos.length > 0)
          .sort((a, b) =>
            (b.estructuraModulosUpdatedAt || '').localeCompare(a.estructuraModulosUpdatedAt || '')
          )[0];
        if (
          latestStructConf?.estructuraModulos &&
          (!activeConf.estructuraModulos ||
            (latestStructConf.estructuraModulosUpdatedAt || '') >
              (activeConf.estructuraModulosUpdatedAt || ''))
        ) {
          setConfig(
            ensureConfigLicencias({
              ...activeConf,
              estructuraModulos: latestStructConf.estructuraModulos,
              estructuraModulosUpdatedAt: latestStructConf.estructuraModulosUpdatedAt,
            })
          );
        } else {
          setConfig(ensureConfigLicencias(activeConf));
        }
      } else {
        await db.configuracion.put(DEFAULT_CONFIG);
        setConfig(ensureConfigLicencias(DEFAULT_CONFIG));
      }

      const [
        pers,
        grps,
        exps,
        cfos,
        movs,
        reps,
        recs,
        partes,
        inss,
        fors,
        lics,
        infs,
        ints,
        usrs,
        dels,
        ser,
        fol,
        acc,
        roles,
        novs,
        charlas,
        licsPol,
        saldosLic,
        fers,
        memos,
        invBienes,
        actasJefe,
      ] = await Promise.all([
        db.personal.toArray(),
        db.grupos.toArray(),
        db.expedientes.toArray(),
        db.casosFaltaOficio.toArray(),
        db.moviles.toArray(),
        db.reparaciones.toArray(),
        db.recargos.toArray(),
        db.partesGuardia.toArray(),
        db.inspeccionesOculares.toArray(),
        db.forenses.toArray(),
        db.licenciados.toArray(),
        db.informesTecnicos.toArray(),
        db.intervenciones.toArray(),
        db.usuarios.toArray(),
        db.delegaciones.toArray(),
        db.seriesNumerario.toArray(),
        db.folios.toArray(),
        db.accidentologia.toArray(),
        db.roles.toArray(),
        db.novedadesDelegaciones.toArray(),
        db.charlasPrevencion.toArray(),
        db.licenciasPoliciales.toArray(),
        db.saldosLicencias.toArray(),
        db.feriados.toArray(),
        db.memosNotas.toArray(),
        db.inventarioBienes.toArray(),
        db.actasCambioJefe.toArray(),
      ]);

      setPersonalList(pers);
      setGruposList(grps);
      setExpedientesList(exps);
      setCasosFaltaOficioList(cfos);
      setMovilesList(movs);
      setReparacionesList(reps);
      setRecargosList(recs);
      setPartesGuardiaList(partes);
      setInspeccionesList(inss);
      setForensesList(fors);
      setLicenciadosList(lics);
      setInformesTecnicosList(infs);
      setIntervencionesList(ints);
      setUsuariosList(usrs);
      setDelegacionesList(dels);
      setSeriesNumerarioList(ser);
      setFoliosList(fol);
      setAccidentologiaList(acc);
      setRolesList(roles);
      setNovedadesList(novs);
      setCharlasList(charlas);
      setLicenciasPolicialesList(licsPol);
      setSaldosLicenciasList(saldosLic);
      setFeriadosList(fers && fers.length > 0 ? fers : DEFAULT_FERIADOS_ARGENTINA);
      setMemosNotasList(memos);
      setInventarioBienesList(invBienes);
      setActasCambioJefeList(actasJefe);

      // Si el usuario ya está logueado, sincronizar su sesión fresca sin contraseñas en claro
      if (currentUser) {
        const freshUser = usrs.find((u) => u.id === currentUser.id);
        if (freshUser) {
          const sanitizedFresh: UsuarioSistema = { ...freshUser, password: '' };
          setCurrentUser(sanitizedFresh);
          sessionStorage.setItem('sispol_current_user', JSON.stringify(sanitizedFresh));
        }
      }
    } catch (error) {
      console.error('Error al inicializar la base de datos IndexedDB:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, activeDelegacionId]);

  useEffect(() => {
    reloadAllData();

    // Sincronización periódica automática con el servidor cada 25 segundos
    const syncInterval = setInterval(() => {
      syncWithServer().then((synced) => {
        if (synced) reloadAllData();
      });
    }, 25000);

    // Sincronización al enfocar la pestaña o pantalla
    const handleFocus = () => {
      syncWithServer().then((synced) => {
        if (synced) reloadAllData();
      });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [reloadAllData]);

  // Si cambia el usuario y no tiene delegación seleccionada, sincronizar con su delegación
  useEffect(() => {
    if (currentUser?.delegacionId) {
      setActiveDelegacionId((prev) => {
        // Si el usuario no tiene permisos para ver otras delegaciones, forzar su delegación asignada
        if (currentUser.rol !== 'superusuario' && !currentUser.puedeVerOtrasDelegaciones) {
          return currentUser.delegacionId;
        }
        return prev || currentUser.delegacionId;
      });
    }
  }, [currentUser]);

  // Sincronizar configuración y numeradores propios e independientes de la delegación activa
  useEffect(() => {
    let isMounted = true;
    const sincronizarConfigYDelegacion = async () => {
      const targetDel = delegacionesList.find((d) => d.id === activeDelegacionId);
      const allConfigs = await db.configuracion.toArray();
      const confEspecifica = allConfigs.find((c) => c.id === `config-${activeDelegacionId}`);
      const latestStructConf = [...allConfigs]
        .filter((c) => c.estructuraModulos && c.estructuraModulos.length > 0)
        .sort((a, b) =>
          (b.estructuraModulosUpdatedAt || '').localeCompare(a.estructuraModulosUpdatedAt || '')
        )[0];
      if (!isMounted) return;

      if (confEspecifica) {
        const shouldAdoptLatest = Boolean(
          latestStructConf?.estructuraModulos &&
            (!confEspecifica.estructuraModulos ||
              (latestStructConf.estructuraModulosUpdatedAt || '') >
                (confEspecifica.estructuraModulosUpdatedAt || ''))
        );
        const resolvedConf = shouldAdoptLatest
          ? {
              ...confEspecifica,
              estructuraModulos: latestStructConf!.estructuraModulos,
              estructuraModulosUpdatedAt: latestStructConf!.estructuraModulosUpdatedAt,
            }
          : confEspecifica;
        setConfig(ensureConfigLicencias(resolvedConf));
      } else if (targetDel) {
        const configNueva: ConfiguracionSistema = {
          ...DEFAULT_CONFIG,
          estructuraModulos:
            latestStructConf?.estructuraModulos ||
            config.estructuraModulos ||
            DEFAULT_CONFIG.estructuraModulos,
          estructuraModulosUpdatedAt:
            latestStructConf?.estructuraModulosUpdatedAt || config.estructuraModulosUpdatedAt,
          id: `config-${activeDelegacionId}`,
          delegacionId: activeDelegacionId,
          dependencia: targetDel.nombre,
          siglasDependencia: targetDel.siglas,
          direccionDependencia: targetDel.direccion,
          contactoDependencia: `Tel.: ${targetDel.telefono} / E-mail: ${targetDel.email}`,
          lineasMembrete:
            targetDel.lineasMembrete && targetDel.lineasMembrete.length > 0
              ? targetDel.lineasMembrete
              : DEFAULT_CONFIG.lineasMembrete,
          logoIzquierdoUrl: targetDel.logoIzquierdoUrl || DEFAULT_CONFIG.logoIzquierdoUrl,
          logoDerechoUrl: targetDel.logoDerechoUrl || DEFAULT_CONFIG.logoDerechoUrl,
          textoDebajoLogoIzquierdo:
            targetDel.textoDebajoLogoIzquierdo || DEFAULT_CONFIG.textoDebajoLogoIzquierdo,
          textoDebajoLogoDerecho:
            targetDel.textoDebajoLogoDerecho || DEFAULT_CONFIG.textoDebajoLogoDerecho,
          pieDePagina: targetDel.pieDePagina || DEFAULT_CONFIG.pieDePagina,
          // Numeradores independientes para cada delegación (comienzan en 1)
          inicioNroIO: 1,
          ultimoNroIO: 0,
          inicioNroIntervencionCriminalistica: 1,
          ultimoNroIntervencionCriminalistica: 0,
          inicioNroIntervencionAccidentologica: 1,
          ultimoNroIntervencionAccidentologica: 0,
        };
        await db.configuracion.put(configNueva);
        if (isMounted) {
          setConfig(ensureConfigLicencias(configNueva));
        }
      }
    };
    sincronizarConfigYDelegacion();
    return () => {
      isMounted = false;
    };
  }, [activeDelegacionId, delegacionesList, currentUser?.id]);

  // Verificación de permiso de eliminación
  const verificarPermisoEliminar = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.rol === 'superusuario') return true;
    if (currentUser.puedeEliminar === false) {
      showNotice(
        'Acceso denegado: Su usuario no cuenta con autorización para eliminar registros del sistema. Contacte a un Administrador.',
        true
      );
      return false;
    }
    return true;
  };

  // --- FILTRADO DE DATOS POR DELEGACIÓN ACTIVA ---
  // Aislamiento estricto: cada delegación carga y ve sus propios datos
  const filteredPersonal = useMemo(() => {
    return personalList.filter(
      (p) => (p.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [personalList, activeDelegacionId]);

  const filteredGrupos = useMemo(() => {
    return gruposList.filter(
      (g) => (g.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [gruposList, activeDelegacionId]);

  const filteredExpedientes = useMemo(() => {
    return expedientesList.filter(
      (e) => (e.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [expedientesList, activeDelegacionId]);

  const filteredCasosFaltaOficio = useMemo(() => {
    return casosFaltaOficioList.filter(
      (c) => (c.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [casosFaltaOficioList, activeDelegacionId]);

  const filteredMoviles = useMemo(() => {
    return movilesList.filter(
      (m) => (m.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [movilesList, activeDelegacionId]);

  const filteredRecargos = useMemo(() => {
    return recargosList.filter(
      (r) => (r.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [recargosList, activeDelegacionId]);

  const filteredPartesGuardia = useMemo(() => {
    return partesGuardiaList.filter(
      (p) => (p.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [partesGuardiaList, activeDelegacionId]);

  const filteredInspecciones = useMemo(() => {
    return inspeccionesList.filter(
      (i) => (i.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [inspeccionesList, activeDelegacionId]);

  const filteredLicenciados = useMemo(() => {
    return licenciadosList.filter(
      (lic) => (lic.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [licenciadosList, activeDelegacionId]);

  const filteredInformesTecnicos = useMemo(() => {
    return informesTecnicosList.filter(
      (inf) => (inf.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [informesTecnicosList, activeDelegacionId]);

  const filteredSeriesNumerario = useMemo(() => {
    const scoped = seriesNumerarioList.filter(
      (s) => !s.delegacionId || s.delegacionId === activeDelegacionId
    );
    return sortSeriesNumerarioByOrden(scoped);
  }, [seriesNumerarioList, activeDelegacionId]);

  const filteredFolios = useMemo(() => {
    return foliosList.filter(
      (f) => !f.delegacionId || f.delegacionId === activeDelegacionId
    );
  }, [foliosList, activeDelegacionId]);

  const filteredCharlas = useMemo(() => {
    return charlasList.filter(
      (c) => (c.delegacionId || 'del-laguna-blanca') === activeDelegacionId
    );
  }, [charlasList, activeDelegacionId]);

  const filteredForenses = useMemo(() => {
    return forensesList.filter(
      (f) => !f.delegacionId || f.delegacionId === activeDelegacionId
    );
  }, [forensesList, activeDelegacionId]);

  const filteredLicenciasPoliciales = useMemo(() => {
    return licenciasPolicialesList.filter(
      (l) => !l.delegacionId || l.delegacionId === activeDelegacionId
    );
  }, [licenciasPolicialesList, activeDelegacionId]);

  const filteredSaldosLicencias = useMemo(() => {
    return saldosLicenciasList.filter(
      (s) => !s.delegacionId || s.delegacionId === activeDelegacionId
    );
  }, [saldosLicenciasList, activeDelegacionId]);

  const filteredMemosNotas = useMemo(() => {
    return memosNotasList.filter(
      (m) =>
        (!m.delegacionId || m.delegacionId === activeDelegacionId) &&
        isMemoVisibleForUser(m, currentUser, seriesNumerarioList, config)
    );
  }, [memosNotasList, activeDelegacionId, currentUser, seriesNumerarioList, config]);

  const filteredInventarioBienes = useMemo(() => {
    return inventarioBienesList.filter(
      (b) => !b.delegacionId || b.delegacionId === activeDelegacionId
    );
  }, [inventarioBienesList, activeDelegacionId]);

  const filteredActasCambioJefe = useMemo(() => {
    return actasCambioJefeList.filter(
      (a) => !a.delegacionId || a.delegacionId === activeDelegacionId
    );
  }, [actasCambioJefeList, activeDelegacionId]);

  // Intervenciones de la delegación activa (combinadas de partes de guardia e independientes)
  const filteredIntervenciones = useMemo(() => {
    const otherDelegacionParteIds = new Set(
      partesGuardiaList
        .filter((p) => (p.delegacionId || 'del-laguna-blanca') !== activeDelegacionId)
        .map((p) => p.id)
    );
    const fromPartes = filteredPartesGuardia.flatMap(
      (p) => p.intervenciones || []
    );
    const map = new Map<string, IntervencionParte>();
    for (const item of fromPartes) {
      map.set(item.id, item);
    }
    for (const item of intervencionesList) {
      if (item.parteId && otherDelegacionParteIds.has(item.parteId)) continue;
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (b.nroCorrelativo || 0) - (a.nroCorrelativo || 0)
    );
  }, [filteredPartesGuardia, intervencionesList, partesGuardiaList, activeDelegacionId]);

  // --- TRASLADO DE PERSONAL ENTRE DELEGACIONES ---
  const handleTransferirPersonal = async (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string,
    prioridadNotificacion: PrioridadNovedad = 'Urgente'
  ) => {
    const origenId = personal.delegacionId || activeDelegacionId || 'del-laguna-blanca';
    const destinoDel = delegacionesList.find((d) => d.id === nuevaDelegacionId);
    const destinoNombre = destinoDel?.nombre || nuevaDelegacionId;
    const origenDel = delegacionesList.find((d) => d.id === origenId);
    const origenNombre = origenDel?.nombre || origenId || 'Delegación Origen';

    const nuevoTraslado = {
      id: 'tras-' + Date.now(),
      fecha,
      delegacionOrigenId: origenId,
      delegacionOrigenNombre: origenNombre,
      delegacionDestinoId: nuevaDelegacionId,
      delegacionDestinoNombre: destinoNombre,
      disposicion,
      motivo,
      observaciones: `Trasladado desde ${origenNombre} hacia ${destinoNombre}`,
    };

    const updatedPersonal: Personal = {
      ...personal,
      delegacionId: nuevaDelegacionId,
      destinoActual: destinoDel ? `${destinoDel.nombre} (${destinoDel.ciudad})` : nuevaDelegacionId,
      historialTraslados: [
        ...(personal.historialTraslados || []),
        nuevoTraslado,
      ],
      updatedAt: new Date().toISOString(),
    };

    await db.personal.put(updatedPersonal);
    saveItemToServer('personal', updatedPersonal);
    setPersonalList((prev) =>
      prev.map((p) => (p.id === updatedPersonal.id ? updatedPersonal : p))
    );

    // Emitir aviso inter-delegación automático a la delegación destino correspondiente
    const ahoraIso = new Date().toISOString();
    const emisorNombre =
      currentUser?.apellidoYNombre || currentUser?.username || 'Oficial de Turno';
    const avisoTraslado: AvisoNovedad = {
      id: `nov-traslado-${Date.now()}`,
      remitenteUsuarioId: currentUser?.id || 'sistema',
      remitenteUsuarioNombre: emisorNombre,
      emisorNombre,
      emisorUsername: currentUser?.username || 'sistema',
      origenDelegacionId: origenId,
      origenDelegacionNombre: origenNombre,
      destinatarioDelegacionId: nuevaDelegacionId,
      destinatarioDelegacionNombre: destinoNombre,
      destinoDelegacionId: nuevaDelegacionId,
      destinoDelegacionNombre: destinoNombre,
      mensaje: `TRASLADO DE EFECTIVO POLICIAL: Se notifica el traslado de ${personal.jerarquia} ${personal.apellidoYNombre} (DNI ${personal.dni}${personal.cedulaProvincial ? `, CP ${personal.cedulaProvincial}` : ''}, Plaza: ${personal.plaza || 's/p'}) desde ${origenNombre} hacia la dotación de ${destinoNombre}. Disposición: ${disposicion || 'S/N'}. Motivo: ${motivo || 'Reasignación de destino'}. Fecha de pase: ${fecha}.`,
      prioridad: prioridadNotificacion,
      tipo: 'traslado_personal',
      esTrasladoPersonal: true,
      personalTrasladadoId: personal.id,
      personalTrasladadoNombre: `${personal.jerarquia} ${personal.apellidoYNombre}`,
      fechaHora: ahoraIso,
      leidoPor: [],
      createdAt: ahoraIso,
    };
    await db.novedadesDelegaciones.put(avisoTraslado);
    saveItemToServer('novedadesDelegaciones', avisoTraslado);
    setNovedadesList((prev) => [avisoTraslado, ...prev]);

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Personal',
      accion: 'MODIFICAR',
      descripcion: `Traslado de personal: ${personal.jerarquia} ${personal.apellidoYNombre} transferido de ${origenNombre} a ${destinoNombre}`,
      delegacionId: activeDelegacionId,
    });
  };

  // --- CRUD PERSONAL ---
  const handleSavePersonal = async (p: Personal) => {
    const entity: Personal = {
      ...p,
      delegacionId: p.delegacionId || activeDelegacionId,
    };
    await db.personal.put(entity);
    saveItemToServer('personal', entity);
    setPersonalList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeletePersonal = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.personal.delete(id);
    deleteItemFromServer('personal', id);
    setPersonalList((prev) => prev.filter((p) => p.id !== id));
  };

  // --- CRUD GRUPOS ---
  const handleSaveGrupo = async (g: GrupoPersonal) => {
    const entity: GrupoPersonal = {
      ...g,
      delegacionId: g.delegacionId || activeDelegacionId,
    };
    await db.grupos.put(entity);
    saveItemToServer('grupos', entity);
    setGruposList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteGrupo = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.grupos.delete(id);
    deleteItemFromServer('grupos', id);
    setGruposList((prev) => prev.filter((g) => g.id !== id));
  };

  // --- CRUD EXPEDIENTES ---
  const handleSaveExpediente = async (exp: ExpedienteJudicial) => {
    const entity: ExpedienteJudicial = {
      ...exp,
      delegacionId: exp.delegacionId || activeDelegacionId,
    };
    await db.expedientes.put(entity);
    saveItemToServer('expedientes', entity);
    setExpedientesList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteExpediente = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.expedientes.delete(id);
    deleteItemFromServer('expedientes', id);
    setExpedientesList((prev) => prev.filter((e) => e.id !== id));
  };

  // --- CRUD FALTA DE OFICIO ---
  const handleSaveCasoFaltaOficio = async (c: CasoFaltaOficio) => {
    const entity: CasoFaltaOficio = {
      ...c,
      delegacionId: c.delegacionId || activeDelegacionId,
    };
    await db.casosFaltaOficio.put(entity);
    saveItemToServer('casosFaltaOficio', entity);
    setCasosFaltaOficioList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteCasoFaltaOficio = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.casosFaltaOficio.delete(id);
    deleteItemFromServer('casosFaltaOficio', id);
    setCasosFaltaOficioList((prev) => prev.filter((c) => c.id !== id));
  };

  // Consolidar casos agrupados en un nuevo expediente
  const handleConsolidarAgrupacion = async (nuevoExp: ExpedienteJudicial, casosIds: string[]) => {
    const expWithDel: ExpedienteJudicial = {
      ...nuevoExp,
      delegacionId: nuevoExp.delegacionId || activeDelegacionId,
    };
    await db.expedientes.put(expWithDel);
    saveItemToServer('expedientes', expWithDel);
    setExpedientesList((prev) => [expWithDel, ...prev]);

    for (const casoId of casosIds) {
      const c = casosFaltaOficioList.find((item) => item.id === casoId);
      if (c) {
        const updated: CasoFaltaOficio = {
          ...c,
          estado: 'Agrupado',
          oficioVinculadoId: expWithDel.id,
          nroOficioAsignado: expWithDel.nroOficioLetras,
          fechaRecepcionOficio: expWithDel.fechaRegistro,
        };
        await db.casosFaltaOficio.put(updated);
        saveItemToServer('casosFaltaOficio', updated);
      }
    }

    setCasosFaltaOficioList((prev) =>
      prev.map((c) =>
        casosIds.includes(c.id)
          ? {
              ...c,
              estado: 'Agrupado',
              oficioVinculadoId: expWithDel.id,
              nroOficioAsignado: expWithDel.nroOficioLetras,
              fechaRecepcionOficio: expWithDel.fechaRegistro,
            }
          : c
      )
    );
  };

  // --- CRUD MÓVILES ---
  const handleSaveMovil = async (m: MovilPolicial) => {
    const entity: MovilPolicial = {
      ...m,
      delegacionId: m.delegacionId || activeDelegacionId,
    };
    await db.moviles.put(entity);
    saveItemToServer('moviles', entity);
    setMovilesList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteMovil = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.moviles.delete(id);
    deleteItemFromServer('moviles', id);
    setMovilesList((prev) => prev.filter((m) => m.id !== id));
  };

  // --- CRUD REPARACIONES ---
  const handleSaveReparacion = async (r: ReparacionMecanica) => {
    await db.reparaciones.put(r);
    saveItemToServer('reparaciones', r);
    setReparacionesList((prev) => [r, ...prev]);

    const movil = movilesList.find((m) => m.id === r.movilId);
    if (movil && r.kilometraje > movil.kilometrajeActual) {
      const movilActualizado: MovilPolicial = {
        ...movil,
        kilometrajeActual: r.kilometraje,
        ultimoServiceKm:
          r.tipoIntervencion === 'Service Programado' ? r.kilometraje : movil.ultimoServiceKm,
        ultimoServiceFecha:
          r.tipoIntervencion === 'Service Programado' ? r.fecha : movil.ultimoServiceFecha,
        proximoServiceKm:
          r.tipoIntervencion === 'Service Programado' ? r.kilometraje + 10000 : movil.proximoServiceKm,
        updatedAt: new Date().toISOString(),
      };
      await handleSaveMovil(movilActualizado);
    }
  };

  const handleDeleteReparacion = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.reparaciones.delete(id);
    deleteItemFromServer('reparaciones', id);
    setReparacionesList((prev) => prev.filter((r) => r.id !== id));
  };

  // --- CRUD RECARGOS ---
  const handleSaveRecargo = async (rec: RecargoOperativo) => {
    const isEdit = recargosList.some((r) => r.id === rec.id);
    const entity: RecargoOperativo = {
      ...rec,
      delegacionId: rec.delegacionId || activeDelegacionId,
    };
    await db.recargos.put(entity);
    saveItemToServer('recargos', entity);
    setRecargosList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser,
      modulo: 'Recargos',
      accion: isEdit ? 'MODIFICAR' : 'CREAR',
      descripcion: `${isEdit ? 'Modificación' : 'Registro'} de recargo de servicio (${entity.tipoRecargo}) para el ${entity.fecha} a las ${entity.horaPresentacion || entity.hora}. Oficina: ${entity.oficina || 'General'}. Personal: ${entity.personalDesignado}.`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleDeleteRecargo = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const rec = recargosList.find((r) => r.id === id);
    await db.recargos.delete(id);
    deleteItemFromServer('recargos', id);
    setRecargosList((prev) => prev.filter((r) => r.id !== id));

    if (rec) {
      await registrarAuditoria({
        currentUser,
        modulo: 'Recargos',
        accion: 'ELIMINAR',
        descripcion: `Eliminación de recargo operativo del ${rec.fecha} (${rec.tipoRecargo}) asignado a: ${rec.personalDesignado || 'N/A'}.`,
        delegacionId: rec.delegacionId,
      });
    }
  };

  // --- CRUD PARTES DE GUARDIA & INTERVENCIONES ---
  const handleSaveParte = async (p: ParteNovedadesGuardia) => {
    const isNew = !partesGuardiaList.some((item) => item.id === p.id);
    const entity: ParteNovedadesGuardia = {
      ...p,
      delegacionId: p.delegacionId || activeDelegacionId,
    };
    await db.partesGuardia.put(entity);
    saveItemToServer('partesGuardia', entity);
    setPartesGuardiaList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    // Sincronizar novedades de móviles con Parque Automotor (Odómetro, Estado, Reparaciones)
    if (p.movilesAfectados && p.movilesAfectados.length > 0) {
      let movilesUpdated = false;
      const updatedMovilesList = [...movilesList];

      for (const m of p.movilesAfectados) {
        const movilIndex = updatedMovilesList.findIndex(
          (mv) =>
            mv.id === m.movilId ||
            `${mv.nroMovilInterno} ${mv.marca} ${mv.modelo} (${mv.dominioPatente})`.toLowerCase() === m.descripcion.toLowerCase() ||
            (m.descripcion.includes(mv.nroMovilInterno) && m.descripcion.includes(mv.dominioPatente))
        );

        if (movilIndex >= 0) {
          const target = { ...updatedMovilesList[movilIndex] };
          let changed = false;

          // Odómetro / Km actual
          if (m.kmActual && m.kmActual > target.kilometrajeActual) {
            target.kilometrajeActual = m.kmActual;
            changed = true;
          }

          // Estado operativo
          const mappedEstado: EstadoOperativoVehiculo =
            m.estado === 'En servicio'
              ? 'En Servicio'
              : m.estado === 'En taller'
              ? 'En Taller Mecánico'
              : 'Fuera de Servicio';

          if (target.estadoOperativo !== mappedEstado) {
            target.estadoOperativo = mappedEstado;
            changed = true;
          }

          // Condición general
          if (m.condicionGeneral && target.condicionGeneral !== m.condicionGeneral) {
            target.condicionGeneral = m.condicionGeneral;
            changed = true;
          }

          // Reparación reportada
          if (m.requiereReparacion && (m.novedadesMecanicas || m.tipoReparacion)) {
            const nuevaRep: ReparacionMecanica = {
              id: 'rep-g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              movilId: target.id,
              fecha: p.fechaInicio || new Date().toISOString().slice(0, 10),
              kilometraje: m.kmActual || target.kilometrajeActual,
              tipoIntervencion: (m.tipoReparacion as any) || 'Mecánica',
              tallerProveedor: m.tallerProveedor || 'Taller Central Policial',
              descripcion: `[Guardia ${p.fechaInicio} ${p.grupoGuardia}] ${m.novedadesMecanicas || 'Novedad mecánica registrada en guardia'}`,
              costoPresupuesto: m.costoPresupuesto || 0,
              repuestosCambiados: m.repuestosCambiados || '',
              createdAt: new Date().toISOString(),
            };

            await db.reparaciones.put(nuevaRep);
            saveItemToServer('reparaciones', nuevaRep);
            target.reparaciones = [nuevaRep, ...(target.reparaciones || [])];
            changed = true;
          }

          if (changed) {
            target.updatedAt = new Date().toISOString();
            await db.moviles.put(target);
            saveItemToServer('moviles', target);
            updatedMovilesList[movilIndex] = target;
            movilesUpdated = true;
          }
        }
      }

      if (movilesUpdated) {
        setMovilesList(updatedMovilesList);
      }
    }

    await registrarAuditoria({
      currentUser: currentUser,
      delegacionId: entity.delegacionId,
      modulo: 'Guardias',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró nuevo' : 'Modificó'} parte de novedades (${entity.fechaInicio} ${entity.horaInicio} a ${entity.fechaFin} ${entity.horaFin} - ${entity.grupoGuardia})`,
    });
  };

  const handleDeleteParte = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.partesGuardia.delete(id);
    deleteItemFromServer('partesGuardia', id);
    setPartesGuardiaList((prev) => prev.filter((p) => p.id !== id));

    await registrarAuditoria({
      currentUser: currentUser,
      delegacionId: activeDelegacionId,
      modulo: 'Guardias',
      accion: 'ELIMINAR',
      descripcion: `Eliminó parte de novedades de guardia ID ${id}`,
    });
  };

  const handleSaveIntervencion = async (inter: IntervencionParte) => {
    const isNew = !intervencionesList.some((i) => i.id === inter.id);
    const anioInt = inter.inspeccionFecha
      ? Number(inter.inspeccionFecha.slice(0, 4)) || new Date().getFullYear()
      : new Date().getFullYear();

    // Asignar I.O. correlativa automática no repetida si no tiene una asignada
    let finalNroIO = inter.nroIO;
    if (!finalNroIO || !finalNroIO.trim()) {
      const nextIoNum = getNextIoNumber({
        inspecciones: filteredInspecciones,
        partesGuardia: filteredPartesGuardia,
        intervenciones: filteredIntervenciones,
        config,
        anio: anioInt,
        delegacionId: activeDelegacionId,
      });
      finalNroIO = formatNroIO(nextIoNum, anioInt);
    }

    const interFinal: IntervencionParte = {
      ...inter,
      nroIO: finalNroIO,
    };

    // 1. Guardar en tabla directa de intervenciones
    await db.intervenciones.put(interFinal);
    saveItemToServer('intervenciones', interFinal);
    setIntervencionesList((prev) => {
      const idx = prev.findIndex((i) => i.id === interFinal.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = interFinal;
        return copy;
      }
      return [interFinal, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser,
      delegacionId: activeDelegacionId,
      modulo: 'Intervenciones',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Modificó'} intervención ${interFinal.tipoIntervencion || ''} N° ${interFinal.nroCorrelativo} (${interFinal.nroIO}) - ${interFinal.hecho || 'S/D'}`,
    });

    // 2. Si pertenece a un parte de guardia, actualizar el parte
    const parte = partesGuardiaList.find((p) => p.id === interFinal.parteId);
    if (parte) {
      const currentIntervenciones = parte.intervenciones || [];
      const idx = currentIntervenciones.findIndex((i) => i.id === interFinal.id);
      let updatedIntervenciones: IntervencionParte[];

      if (idx >= 0) {
        updatedIntervenciones = [...currentIntervenciones];
        updatedIntervenciones[idx] = interFinal;
      } else {
        updatedIntervenciones = [...currentIntervenciones, interFinal];
      }

      const parteActualizado: ParteNovedadesGuardia = {
        ...parte,
        intervenciones: updatedIntervenciones,
        updatedAt: new Date().toISOString(),
      };
      await handleSaveParte(parteActualizado);
    }

    // 3. Actualizar contadores independientes por tipo (LC vs Accidentológica) y último N° de I.O.
    const nextConfig: ConfiguracionSistema = { ...config };
    let configChanged = false;

    if (interFinal.tipoIntervencion === 'Criminalística') {
      const nuevoUltimo = Math.max(
        config.ultimoNroIntervencionCriminalistica || 0,
        interFinal.nroCorrelativo || 0
      );
      if (nuevoUltimo !== config.ultimoNroIntervencionCriminalistica) {
        nextConfig.ultimoNroIntervencionCriminalistica = nuevoUltimo;
        configChanged = true;
      }
    } else if (interFinal.tipoIntervencion === 'Accidentológica') {
      const nuevoUltimo = Math.max(
        config.ultimoNroIntervencionAccidentologica || 0,
        interFinal.nroCorrelativo || 0
      );
      if (nuevoUltimo !== config.ultimoNroIntervencionAccidentologica) {
        nextConfig.ultimoNroIntervencionAccidentologica = nuevoUltimo;
        configChanged = true;
      }
    }

    const ioNum = extractIoNumber(interFinal.nroIO);
    if (ioNum > 0) {
      const sanitizedPrevIo = sanitizeUltimoNroIO(config.ultimoNroIO);
      const nuevoUltimoIo = Math.max(sanitizedPrevIo, ioNum);
      if (nuevoUltimoIo !== config.ultimoNroIO) {
        nextConfig.ultimoNroIO = nuevoUltimoIo;
        configChanged = true;
      }
    }

    if (configChanged) {
      await handleSaveConfig(nextConfig);
    }

    // 4. Sincronización automática con módulo de Accidentología Vial si es siniestro con personal policial
    const esAccidente =
      inter.tipoIntervencion === 'Accidentológica' ||
      (inter.hecho || '').toUpperCase().includes('SINIESTRO') ||
      (inter.hecho || '').toUpperCase().includes('COLIS') ||
      (inter.hecho || '').toUpperCase().includes('TRANSITO') ||
      (inter.hecho || '').toUpperCase().includes('TRÁNSITO');

    const polInvolucrado = (inter.involucrados || []).find((i) => i.esPersonalPolicial);
    const tienePersonalPolicial =
      inter.involucraPersonalPolicial ||
      Boolean(inter.personalPolicial?.apellidoYNombre) ||
      Boolean(polInvolucrado);

    if (esAccidente && tienePersonalPolicial) {
      const regExistente = accidentologiaList.find((a) => a.intervencionId === inter.id);
      const fecha = inter.inspeccionFecha || new Date().toISOString().slice(0, 10);
      const codigo = regExistente ? regExistente.codigo : calcularCodigoMensual(fecha, accidentologiaList);

      const jerarquia = polInvolucrado?.jerarquia || inter.personalPolicial?.jerarquia || 'Oficial';
      const apellidoYNombre = polInvolucrado?.apellidoYNombre || inter.personalPolicial?.apellidoYNombre || 'Personal Policial';
      const edad = polInvolucrado?.edad || 30;
      const destino = polInvolucrado?.destino || inter.personalPolicial?.destino || config.dependencia || 'División Policía Científica';
      const unidadRegional = polInvolucrado?.unidadRegional || config.unidadRegional || 'Unidad Regional Cuatro';

      const tipoLesiones = polInvolucrado?.tipoLesion || inter.personalPolicial?.tipoLesion || '';
      const alcohotest = polInvolucrado?.alcohotest || '';

      const tipoLesionPendiente = !tipoLesiones || esTipoLesionADeterminar(tipoLesiones);
      const faltanDatos = tipoLesionPendiente || !alcohotest;
      const datosFaltantes: string[] = [];
      if (tipoLesionPendiente) datosFaltantes.push('tipoLesiones');
      if (!alcohotest) datosFaltantes.push('alcohotest');

      const accReg: AccidentologiaRegistro = {
        id: regExistente ? regExistente.id : `acc-auto-${inter.id}`,
        codigo,
        delegacionId: activeDelegacionId,
        intervencionId: inter.id,
        fecha,
        dia: regExistente?.dia || 'Día de guardia',
        localidad: config.ciudadDependencia || 'Laguna Blanca',
        lugarOcurrido: inter.inspeccionLugar || inter.direccion || 'Lugar de guardia',
        horarioOcurrido: inter.inspeccionHora ? `${inter.inspeccionHora} hs.` : '08:00 hs.',
        dependenciaInterviniente: inter.dependencia || config.dependencia || 'Comisaría',
        tipoSiniestro: inter.hecho || 'Colisión vial',
        zona: regExistente?.zona || 'Urbana',
        tipoVia: regExistente?.tipoVia || 'RECTA',
        tipoCalzada: regExistente?.tipoCalzada || 'Asfalto',
        estadoCalzada: regExistente?.estadoCalzada || 'Bueno',
        senalizacion: regExistente?.senalizacion || 'SI',
        anguloVisual: regExistente?.anguloVisual || 'Bueno',
        iluminacion: regExistente?.iluminacion || 'Bueno',
        estadoClima: regExistente?.estadoClima || 'Despejado',
        observacionesSiniestro: inter.sintesisHecho || '',
        jerarquia,
        apellidoYNombre,
        edad,
        destino,
        unidadRegional,
        situacionLaboral: regExistente?.situacionLaboral || 'ACTIVO',
        situacionServicio: regExistente?.situacionServicio || 'ENTRANTE',
        tipoServicio: regExistente?.tipoServicio || 'ENTRANTE',
        vestimenta: regExistente?.vestimenta || 'UNIFORMADO',
        tipoLesiones: tipoLesiones || (regExistente?.tipoLesiones || 'Pendiente de registrar'),
        alcohotest: alcohotest || (regExistente?.alcohotest || 'Pendiente de registrar'),
        observacionesPersonal: '',
        tipoRodadoPolicial: inter.personalPolicial?.tipoRodado || regExistente?.tipoRodadoPolicial || 'Motocicleta oficial',
        tipoRodadoOtros: regExistente?.tipoRodadoOtros || 'Automóvil',
        otrosInvolucrados: regExistente?.otrosInvolucrados || 'Ninguno',
        cascoPolicial: regExistente?.cascoPolicial || 'Colocado',
        cascoOtro: regExistente?.cascoOtro || 'No aplica',
        resultadoPolicial: regExistente?.resultadoPolicial || 'EMBESTIDO',
        persPolHuellas: regExistente?.persPolHuellas || 'FRENADA',
        personalPolicialDinamica: regExistente?.personalPolicialDinamica || 'CAIDA',
        evidencias: inter.laborCriminalistica || regExistente?.evidencias || '',
        faltaDatos: faltanDatos,
        datosPendientes: datosFaltantes,
        createdAt: regExistente?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await handleSaveAccidentologia(accReg);
    }
  };

  const handleDeleteIntervencion = async (interId: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.intervenciones.delete(interId);
    deleteItemFromServer('intervenciones', interId);
    setIntervencionesList((prev) => prev.filter((i) => i.id !== interId));

    const parte = partesGuardiaList.find((p) =>
      (p.intervenciones || []).some((i) => i.id === interId)
    );
    if (parte) {
      const updatedIntervenciones = (parte.intervenciones || []).filter(
        (i) => i.id !== interId
      );
      const parteActualizado: ParteNovedadesGuardia = {
        ...parte,
        intervenciones: updatedIntervenciones,
        updatedAt: new Date().toISOString(),
      };
      await handleSaveParte(parteActualizado);
    }
  };

  // --- CRUD INSPECCIONES OCULARES ---
  const handleSaveInspeccion = async (ins: InspeccionOcular) => {
    const entity: InspeccionOcular = {
      ...ins,
      delegacionId: ins.delegacionId || activeDelegacionId,
    };
    await db.inspeccionesOculares.put(entity);
    saveItemToServer('inspeccionesOculares', entity);

    const nextInspecciones = (() => {
      const idx = inspeccionesList.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...inspeccionesList];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...inspeccionesList];
    })();
    setInspeccionesList(nextInspecciones);

    // Sincronizar si proviene de una intervención de guardia / intervenciones
    if (entity.intervencionId) {
      const linkedInterv = intervencionesList.find((i) => i.id === entity.intervencionId);
      if (linkedInterv) {
        const updatedInterv: IntervencionParte = {
          ...linkedInterv,
          nroIO: entity.nroIO,
          fotosConfirmadas: Boolean(entity.fotosConfirmadas),
          confirmadoPorUsuario: entity.confirmadoPorUsuario,
          perito: entity.perito || linkedInterv.perito,
          fotografo: entity.fotografo || linkedInterv.fotografo,
        };
        await db.intervenciones.put(updatedInterv);
        saveItemToServer('intervenciones', updatedInterv);
        setIntervencionesList((prev) =>
          prev.map((i) => (i.id === updatedInterv.id ? updatedInterv : i))
        );
      }

      const parteConInterv = partesGuardiaList.find((p) =>
        (p.intervenciones || []).some((i) => i.id === entity.intervencionId)
      );
      if (parteConInterv) {
        const updatedParte: ParteNovedadesGuardia = {
          ...parteConInterv,
          intervenciones: (parteConInterv.intervenciones || []).map((i) =>
            i.id === entity.intervencionId
              ? {
                  ...i,
                  nroIO: entity.nroIO,
                  fotosConfirmadas: Boolean(entity.fotosConfirmadas),
                  confirmadoPorUsuario: entity.confirmadoPorUsuario,
                  perito: entity.perito || i.perito,
                  fotografo: entity.fotografo || i.fotografo,
                }
              : i
          ),
          updatedAt: new Date().toISOString(),
        };
        await db.partesGuardia.put(updatedParte);
        saveItemToServer('partesGuardia', updatedParte);
        setPartesGuardiaList((prev) =>
          prev.map((p) => (p.id === updatedParte.id ? updatedParte : p))
        );
      }
    }

    if (entity.nroIO) {
      const anioRef =
        extractIoYear(entity.nroIO) ||
        (entity.fecha ? Number(entity.fecha.slice(0, 4)) : 0) ||
        new Date().getFullYear();
      const delegacionRef = entity.delegacionId || activeDelegacionId;
      const lastLoaded = getLastLoadedIoNumber({
        inspecciones: nextInspecciones.filter(
          (i) => !i.delegacionId || i.delegacionId === delegacionRef
        ),
        partesGuardia: partesGuardiaList.filter(
          (p) => (p.delegacionId || 'del-laguna-blanca') === delegacionRef
        ),
        intervenciones: filteredIntervenciones,
        anio: anioRef,
        delegacionId: delegacionRef,
      });
      const currentNum = extractIoNumber(entity.nroIO);
      const nuevoUltimoIO = Math.max(lastLoaded, currentNum);

      if (nuevoUltimoIO !== config.ultimoNroIO) {
        await handleSaveConfig({
          ...config,
          ultimoNroIO: nuevoUltimoIO,
        });
      }
    }
  };

  const handleDeleteInspeccion = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.inspeccionesOculares.delete(id);
    deleteItemFromServer('inspeccionesOculares', id);
    const remaining = inspeccionesList.filter((i) => i.id !== id);
    setInspeccionesList(remaining);

    const anioActual = new Date().getFullYear();
    const lastLoaded = getLastLoadedIoNumber({
      inspecciones: remaining.filter(
        (i) => !i.delegacionId || i.delegacionId === activeDelegacionId
      ),
      partesGuardia: filteredPartesGuardia,
      intervenciones: filteredIntervenciones,
      anio: anioActual,
      delegacionId: activeDelegacionId,
    });
    if (lastLoaded !== sanitizeUltimoNroIO(config.ultimoNroIO)) {
      await handleSaveConfig({
        ...config,
        ultimoNroIO: lastLoaded,
      });
    }
  };

  // --- CRUD FORENSES ---
  const handleSaveForense = async (f: ForenseTurno) => {
    const entity: ForenseTurno = {
      ...f,
      delegacionId: f.delegacionId || activeDelegacionId,
    };
    await db.forenses.put(entity);
    saveItemToServer('forenses', entity);
    setForensesList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteForense = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.forenses.delete(id);
    deleteItemFromServer('forenses', id);
    setForensesList((prev) => prev.filter((f) => f.id !== id));
  };

  // --- CRUD LICENCIADOS ---
  const handleSaveLicenciado = async (lic: LicenciadoTurno) => {
    const entity: LicenciadoTurno = {
      ...lic,
      delegacionId: lic.delegacionId || activeDelegacionId,
    };
    await db.licenciados.put(entity);
    saveItemToServer('licenciados', entity);
    setLicenciadosList((prev) => {
      const idx = prev.findIndex((l) => l.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteLicenciado = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.licenciados.delete(id);
    deleteItemFromServer('licenciados', id);
    setLicenciadosList((prev) => prev.filter((l) => l.id !== id));
  };

  // --- CRUD INFORMES TÉCNICOS ---
  const handleSaveInformeTecnico = async (inf: InformeTecnico) => {
    const entity: InformeTecnico = {
      ...inf,
      delegacionId: inf.delegacionId || activeDelegacionId,
    };
    await db.informesTecnicos.put(entity);
    saveItemToServer('informesTecnicos', entity);
    setInformesTecnicosList((prev) => {
      const idx = prev.findIndex((i) => i.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });
  };

  const handleDeleteInformeTecnico = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.informesTecnicos.delete(id);
    deleteItemFromServer('informesTecnicos', id);
    setInformesTecnicosList((prev) => prev.filter((i) => i.id !== id));
  };

  // --- CRUD USUARIOS ---
  const handleSaveUsuario = async (u: UsuarioSistema) => {
    const saved = await saveItemToServer('usuarios', u);
    const sanitized: UsuarioSistema = { ...(saved || u), password: '' };

    setUsuariosList((prev) => {
      const idx = prev.findIndex((item) => item.id === sanitized.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = sanitized;
        return copy;
      }
      return [sanitized, ...prev];
    });

    if (currentUser?.id === sanitized.id) {
      setCurrentUser(sanitized);
      sessionStorage.setItem('sispol_current_user', JSON.stringify(sanitized));
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    if (currentUser?.id === id) {
      showNotice('No es posible eliminar su propio usuario activo en sesión.', true);
      return;
    }
    await db.usuarios.delete(id);
    deleteItemFromServer('usuarios', id);
    setUsuariosList((prev) => prev.filter((u) => u.id !== id));
  };

  // --- CRUD ROLES Y PERMISOS ---
  const handleSaveRol = async (rol: RolSistema) => {
    const isNew = !rolesList.some((r) => r.id === rol.id);
    await db.roles.put(rol);
    saveItemToServer('roles', rol);
    setRolesList((prev) => {
      const idx = prev.findIndex((item) => item.id === rol.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = rol;
        return copy;
      }
      return [...prev, rol];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      delegacionId: activeDelegacionId,
      modulo: 'Usuarios',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Definió nuevo' : 'Actualizó'} rol institucional: "${rol.nombre}"`,
      detalles: `Acciones asignadas: ${Object.keys(rol.acciones || {}).filter(k => (rol.acciones as any)[k]).join(', ')}`,
    });
  };

  const handleDeleteRol = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const rol = rolesList.find((r) => r.id === id);
    if (!rol) return;
    if (rol.esSistema) {
      showNotice('Los roles predeterminados del sistema no pueden eliminarse.', true);
      return;
    }
    await db.roles.delete(id);
    deleteItemFromServer('roles', id);
    setRolesList((prev) => prev.filter((r) => r.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      delegacionId: activeDelegacionId,
      modulo: 'Usuarios',
      accion: 'ELIMINAR',
      descripcion: `Eliminó rol institucional: "${rol.nombre}" (ID: ${id})`,
    });
  };

  // --- CRUD DELEGACIONES ---
  const handleSaveDelegacion = async (d: DelegacionPolicial) => {
    await db.delegaciones.put(d);
    saveItemToServer('delegaciones', d);
    setDelegacionesList((prev) => {
      const idx = prev.findIndex((item) => item.id === d.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = d;
        return copy;
      }
      return [d, ...prev];
    });
  };

  // --- CRUD NUMERARIO Y CONTROL DE FOLIOS ---
  const handleSaveFolios = async (
    newFolios: FolioAsignado[],
    options?: { createLinkedMemo?: boolean }
  ) => {
    const withDelegacion = newFolios.map((f) => ({
      ...f,
      delegacionId: f.delegacionId || activeDelegacionId,
    }));
    await db.folios.bulkPut(withDelegacion);
    for (const fol of withDelegacion) {
      saveItemToServer('folios', fol);
    }
    setFoliosList((prev) => {
      const map = new Map<string, FolioAsignado>();
      prev.forEach((f) => map.set(f.id, f));
      withDelegacion.forEach((f) => map.set(f.id, f));
      return Array.from(map.values());
    });

    if (options?.createLinkedMemo && withDelegacion.length === 1) {
      const fol = withDelegacion[0];
      const alreadyLinked = findMemoForFolio(fol, memosNotasList, seriesNumerarioList);
      if (!alreadyLinked) {
        const ser = seriesNumerarioList.find((s) => s.id === fol.serieId);
        const tipoDoc = ser?.nombre || fol.categoriaDocumento || 'Memorandum';
        const delId = fol.delegacionId || activeDelegacionId;
        const activeDel = delegacionesList.find((d) => d.id === delId);
        const nowIso = new Date().toISOString();
        const linkedMemo: MemoNota = {
          id: `memo-fol-${fol.id}`,
          tipo: tipoDoc,
          serieFolioId: ser?.id || fol.serieId,
          serieFolioNombre: ser?.nombre || tipoDoc,
          folioId: fol.id,
          nroFolioMemo:
            fol.caratulaPersonalizada ||
            fol.codigoCaratula ||
            formatCodigoFolioConAnio(ser?.prefijo || `${tipoDoc} N°`, fol.numero, fol.anio),
          anio: fol.anio || new Date().getFullYear(),
          fecha: fol.fechaAsignacion || nowIso.slice(0, 10),
          asunto: fol.asunto,
          destino: fol.destinatario || 'Dependencia / Destinatario',
          remitenteArea: fol.solicitante || activeDel?.nombre || config.dependencia || '',
          estado: 'Emitido',
          prioridad: 'Normal',
          observaciones: fol.observaciones || undefined,
          delegacionId: delId,
          delegacionNombre: activeDel?.nombre || config.dependencia,
          usuarioRegistroId: currentUser?.id,
          usuarioRegistroNombre:
            currentUser?.apellidoYNombre || currentUser?.username || fol.usuarioRegistro,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await db.memosNotas.put(linkedMemo);
        saveItemToServer('memosNotas', linkedMemo);
        setMemosNotasList((prev) => [linkedMemo, ...prev]);
      }
    }

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'CREAR',
      descripcion: `Asignación de folio(s) [${withDelegacion.map((f) => f.numero).join(', ')}] - Carátula: ${withDelegacion[0]?.caratulaPersonalizada || withDelegacion[0]?.categoriaDocumento}. Asunto: ${withDelegacion[0]?.asunto || ''}`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleUpdateFolio = async (folio: FolioAsignado) => {
    await db.folios.put(folio);
    saveItemToServer('folios', folio);
    setFoliosList((prev) => prev.map((f) => (f.id === folio.id ? folio : f)));

    const linkedMemo = memosNotasList.find((m) => m.folioId === folio.id);
    if (
      linkedMemo &&
      folio.codigoCaratula &&
      linkedMemo.nroFolioMemo !== folio.codigoCaratula
    ) {
      const updatedMemo: MemoNota = {
        ...linkedMemo,
        nroFolioMemo: folio.codigoCaratula,
        updatedAt: new Date().toISOString(),
      };
      await db.memosNotas.put(updatedMemo);
      saveItemToServer('memosNotas', updatedMemo);
      setMemosNotasList((prev) =>
        prev.map((m) => (m.id === updatedMemo.id ? updatedMemo : m))
      );
    }

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'MODIFICAR',
      descripcion: `Actualización de Folio N° ${folio.numero} (${folio.caratulaPersonalizada || folio.codigoCaratula || folio.categoriaDocumento})`,
      delegacionId: folio.delegacionId || activeDelegacionId,
    });
  };

  const handleLiberarFolio = async (folio: FolioAsignado, liberarRangoCompleto?: boolean) => {
    if (!verificarPermisoEliminar()) return;

    if (liberarRangoCompleto && folio.rangoGrupoId) {
      const foliosGrupo = foliosList.filter(
        (f) => f.rangoGrupoId === folio.rangoGrupoId && f.serieId === folio.serieId
      );
      const ids = foliosGrupo.map((f) => f.id);
      await db.folios.bulkDelete(ids);
      for (const id of ids) {
        deleteItemFromServer('folios', id);
      }
      setFoliosList((prev) => prev.filter((f) => !ids.includes(f.id)));

      await registrarAuditoria({
        currentUser: currentUser || undefined,
        modulo: 'Numerario',
        accion: 'ELIMINAR',
        descripcion: `Liberación de rango de folios [${foliosGrupo.map((f) => f.numero).join(', ')}] de la serie ID ${folio.serieId}`,
        delegacionId: folio.delegacionId || activeDelegacionId,
      });
    } else {
      await db.folios.delete(folio.id);
      deleteItemFromServer('folios', folio.id);
      setFoliosList((prev) => prev.filter((f) => f.id !== folio.id));

      await registrarAuditoria({
        currentUser: currentUser || undefined,
        modulo: 'Numerario',
        accion: 'ELIMINAR',
        descripcion: `Liberación de Folio N° ${folio.numero} de la serie ID ${folio.serieId}`,
        delegacionId: folio.delegacionId || activeDelegacionId,
      });
    }
  };

  const handleSaveSerie = async (serie: SerieNumerario) => {
    const entity: SerieNumerario = {
      ...serie,
      orden:
        typeof serie.orden === 'number'
          ? serie.orden
          : filteredSeriesNumerario.length + 1,
      delegacionId: serie.delegacionId || activeDelegacionId,
    };
    await db.seriesNumerario.put(entity);
    saveItemToServer('seriesNumerario', entity);
    setSeriesNumerarioList((prev) => {
      const idx = prev.findIndex((s) => s.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [...prev, entity];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'CREAR',
      descripcion: `Guardado / actualización de Serie de Numerario "${entity.nombre}" (${entity.anio})`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleReorderSeries = async (orderedSeries: SerieNumerario[]) => {
    if (!isJefeControlFoliosUser(currentUser)) return;
    const nowIso = new Date().toISOString();
    const updatedList = orderedSeries.map((s, idx) => ({
      ...s,
      orden: idx + 1,
      updatedAt: nowIso,
    }));
    await db.seriesNumerario.bulkPut(updatedList);
    for (const s of updatedList) {
      await saveItemToServer('seriesNumerario', s);
    }
    const updatedMap = new Map(updatedList.map((s) => [s.id, s]));
    setSeriesNumerarioList((prev) =>
      prev.map((s) => updatedMap.get(s.id) || s)
    );

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'MODIFICAR',
      descripcion: `Reordenamiento de Folios por Jefe: ${updatedList.map((s) => `${s.orden}.${s.nombre}`).join(', ')}`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleDeleteSerie = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const s = seriesNumerarioList.find((item) => item.id === id);
    await db.folios.where('serieId').equals(id).delete();
    await db.seriesNumerario.delete(id);
    deleteItemFromServer('seriesNumerario', id);
    setSeriesNumerarioList((prev) => prev.filter((item) => item.id !== id));
    setFoliosList((prev) => prev.filter((f) => f.serieId !== id));

    if (s) {
      await registrarAuditoria({
        currentUser: currentUser || undefined,
        modulo: 'Numerario',
        accion: 'ELIMINAR',
        descripcion: `Eliminación completa de Serie de Numerario "${s.nombre}" y todos sus folios asociados`,
        delegacionId: activeDelegacionId,
      });
    }
  };

  const handleResetSerie = async (serieId: string) => {
    if (!verificarPermisoEliminar()) return;
    const s = seriesNumerarioList.find((item) => item.id === serieId);
    const foliosAEliminar = foliosList.filter((f) => f.serieId === serieId);
    await db.folios.where('serieId').equals(serieId).delete();
    for (const fol of foliosAEliminar) {
      deleteItemFromServer('folios', fol.id);
    }
    setFoliosList((prev) => prev.filter((f) => f.serieId !== serieId));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'ELIMINAR',
      descripcion: `REINICIO SEGURO DE NUMERARIO: Se eliminaron ${foliosAEliminar.length} folios de la serie "${s?.nombre || serieId}" (${s?.anio || ''})`,
      delegacionId: activeDelegacionId,
    });
  };

  // --- ACCIDENTOLOGÍA VIAL CON PERSONAL POLICIAL INVOLUCRADO ---
  const handleSaveAccidentologia = async (registro: AccidentologiaRegistro) => {
    await db.accidentologia.put(registro);
    saveItemToServer('accidentologia', registro);
    setAccidentologiaList((prev) => {
      const exists = prev.some((r) => r.id === registro.id);
      return exists ? prev.map((r) => (r.id === registro.id ? registro : r)) : [registro, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Accidentología',
      accion: 'CREAR',
      descripcion: `Registro de Siniestro Vial ${registro.codigo} (${registro.jerarquia} ${registro.apellidoYNombre})`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleDeleteAccidentologia = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = accidentologiaList.find((r) => r.id === id);
    await db.accidentologia.delete(id);
    deleteItemFromServer('accidentologia', id);
    setAccidentologiaList((prev) => prev.filter((r) => r.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Accidentología',
      accion: 'ELIMINAR',
      descripcion: `Eliminación de Siniestro Vial ${target?.codigo || id} (${target?.jerarquia || ''} ${target?.apellidoYNombre || ''})`,
      delegacionId: activeDelegacionId,
    });
  };

  // --- NOVEDADES INTER-DELEGACIONES ---
  const handleCrearNovedad = async (avisoData: Omit<AvisoNovedad, 'id' | 'createdAt'> | AvisoNovedad) => {
    const aviso: AvisoNovedad = {
      ...avisoData,
      id: 'id' in avisoData && avisoData.id ? avisoData.id : `nov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: 'createdAt' in avisoData && avisoData.createdAt ? avisoData.createdAt : new Date().toISOString(),
    };
    await db.novedadesDelegaciones.put(aviso);
    saveItemToServer('novedadesDelegaciones', aviso);
    setNovedadesList((prev) => [aviso, ...prev.filter((n) => n.id !== aviso.id)]);

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Novedades Inter-Delegaciones',
      accion: 'CREAR',
      descripcion: `Aviso emitido con prioridad [${aviso.prioridad}] para ${aviso.destinatarioDelegacionNombre || aviso.destinatarioDelegacionId}. Mensaje: ${aviso.mensaje.substring(0, 60)}...`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleEliminarNovedad = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.novedadesDelegaciones.delete(id);
    deleteItemFromServer('novedadesDelegaciones', id);
    setNovedadesList((prev) => prev.filter((n) => n.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Novedades Inter-Delegaciones',
      accion: 'ELIMINAR',
      descripcion: `Eliminación de aviso de novedad inter-delegación ID: ${id}`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleMarcarLeidoNovedad = async (id: string) => {
    if (!currentUser) return;
    const item = novedadesList.find((n) => n.id === id);
    if (!item) return;
    const leidoPor = item.leidoPor || [];
    if (!leidoPor.includes(currentUser.id)) {
      const updated: AvisoNovedad = { ...item, leidoPor: [...leidoPor, currentUser.id] };
      await db.novedadesDelegaciones.put(updated);
      saveItemToServer('novedadesDelegaciones', updated);
      setNovedadesList((prev) => prev.map((n) => (n.id === id ? updated : n)));
    }
  };

  // --- CRUD CHARLAS Y PREVENCIÓN COMUNITARIA ---
  const handleSaveCharla = async (charla: CharlaPrevencion) => {
    const isNew = !charlasList.some((c) => c.id === charla.id);
    const entity: CharlaPrevencion = {
      ...charla,
      delegacionId: charla.delegacionId || activeDelegacionId,
    };
    await db.charlasPrevencion.put(entity);
    saveItemToServer('charlasPrevencion', entity);
    setCharlasList((prev) => {
      const idx = prev.findIndex((c) => c.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Charlas y Prevención Comunitaria',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Actualizó'} charla preventiva "${entity.tema}" (${entity.fecha} ${entity.hora} hs) en ${entity.lugarInstitucion} (${entity.localidad}). Disertante: ${entity.disertanteNombre}`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleDeleteCharla = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = charlasList.find((c) => c.id === id);
    await db.charlasPrevencion.delete(id);
    deleteItemFromServer('charlasPrevencion', id);
    setCharlasList((prev) => prev.filter((c) => c.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Charlas y Prevención Comunitaria',
      accion: 'ELIMINAR',
      descripcion: `Eliminó charla preventiva "${target?.tema || id}" (${target?.fecha || ''})`,
      delegacionId: target?.delegacionId || activeDelegacionId,
    });
  };

  // --- CRUD LICENCIAS POLICIALES, SALDOS Y FERIADOS ---
  const handleSaveLicencia = async (lic: LicenciaPolicial) => {
    const isNew = !licenciasPolicialesList.some((l) => l.id === lic.id);
    const ownerPersonal = personalList.find((p) => p.id === lic.personalId);
    const entity: LicenciaPolicial = {
      ...lic,
      delegacionId: ownerPersonal?.delegacionId || lic.delegacionId || activeDelegacionId,
    };
    await db.licenciasPoliciales.put(entity);
    saveItemToServer('licenciasPoliciales', entity);
    setLicenciasPolicialesList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Licencia Policial',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Actualizó'} licencia ${entity.tipoLicencia} (${entity.diasHabilesSolicitados} días hábiles${entity.fueInterrumpida ? ', INTERRUMPIDA Art. 15' : ''}) para ${entity.jerarquia} ${entity.apellidoYNombre} (Salida: ${entity.fechaSalida}, Reanudación: ${entity.fechaReanudacion} 08:00 hs)`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleDeleteLicencia = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = licenciasPolicialesList.find((l) => l.id === id);
    await db.licenciasPoliciales.delete(id);
    deleteItemFromServer('licenciasPoliciales', id);
    setLicenciasPolicialesList((prev) => prev.filter((l) => l.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Licencia Policial',
      accion: 'ELIMINAR',
      descripcion: `Eliminó licencia ${target?.tipoLicencia || ''} de ${target?.jerarquia || ''} ${target?.apellidoYNombre || id} (${target?.fechaSalida || ''})`,
      delegacionId: target?.delegacionId || activeDelegacionId,
    });
  };

  const handleSaveSaldoLicencia = async (saldo: SaldoLicenciaAnio) => {
    const ownerPersonal = personalList.find((p) => p.id === saldo.personalId);
    const entity: SaldoLicenciaAnio = {
      ...saldo,
      delegacionId: ownerPersonal?.delegacionId || saldo.delegacionId || activeDelegacionId,
    };
    await db.saldosLicencias.put(entity);
    saveItemToServer('saldosLicencias', entity);
    setSaldosLicenciasList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [...prev, entity];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Licencia Policial',
      accion: 'MODIFICAR',
      descripcion: `Actualizó saldo de licencia período ${entity.anio} (Personal ID ${entity.personalId}): ${entity.diasCorrespondientes} corresp., ${entity.diasUsados} usados, vencido=${entity.vencido ? 'SÍ' : 'NO'}`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleSaveFeriado = async (feriado: FeriadoDiaNoLaborable) => {
    await db.feriados.put(feriado);
    saveItemToServer('feriados', feriado);
    setFeriadosList((prev) => {
      const idx = prev.findIndex((f) => f.id === feriado.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = feriado;
        return copy;
      }
      return [...prev, feriado].sort((a, b) => a.fecha.localeCompare(b.fecha));
    });
  };

  const handleSaveFeriadosBulk = async (nuevos: FeriadoDiaNoLaborable[]) => {
    if (!nuevos || nuevos.length === 0) return;
    await db.feriados.bulkPut(nuevos);
    await Promise.all(nuevos.map((f) => saveItemToServer('feriados', f)));
    setFeriadosList((prev) => {
      const map = new Map<string, FeriadoDiaNoLaborable>();
      for (const f of prev) map.set(f.id, f);
      for (const f of nuevos) map.set(f.id, f);
      return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
    });
  };

  const handleDeleteFeriado = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.feriados.delete(id);
    deleteItemFromServer('feriados', id);
    setFeriadosList((prev) => prev.filter((f) => f.id !== id));
  };

  // --- CRUD MEMOS Y NOTAS ---
  const handleSaveMemoNota = async (
    memo: MemoNota,
    options?: { syncControlFolios?: boolean }
  ) => {
    const isNew = !memosNotasList.some((m) => m.id === memo.id);
    const delId = memo.delegacionId || activeDelegacionId;
    const matchedSerie = findSerieForMemo(
      memo.tipo,
      seriesNumerarioList,
      memo.serieFolioId,
      delId
    );
    const resolvedAnio =
      memo.anio || Number((memo.fecha || '').slice(0, 4)) || new Date().getFullYear();
    const extractedNum = extractNumeroFolioFromText(memo.nroFolioMemo);

    let resolvedFolioId = memo.folioId;

    if (options?.syncControlFolios !== false && matchedSerie && extractedNum !== null) {
      const matchingExistingFolio = foliosList.find(
        (f) =>
          f.serieId === matchedSerie.id &&
          f.numero === extractedNum &&
          (!f.anio || f.anio === resolvedAnio)
      );

      if (matchingExistingFolio) {
        resolvedFolioId = matchingExistingFolio.id;
      } else {
        const now = new Date();
        const createdFolio: FolioAsignado = {
          id: `fol-${matchedSerie.id}-${extractedNum}-${Date.now()}`,
          serieId: matchedSerie.id,
          numero: extractedNum,
          codigoCaratula:
            memo.nroFolioMemo.trim() ||
            formatCodigoFolioConAnio(matchedSerie.prefijo, extractedNum, resolvedAnio),
          categoriaDocumento: matchedSerie.nombre,
          anio: resolvedAnio,
          asunto: memo.asunto,
          destinatario: memo.destino || '',
          solicitante: memo.remitenteArea || '',
          observaciones: memo.observaciones || '',
          esRango: false,
          usuarioRegistro:
            memo.usuarioRegistroNombre ||
            currentUser?.apellidoYNombre ||
            currentUser?.username,
          fechaAsignacion: memo.fecha || now.toISOString().slice(0, 10),
          horaAsignacion: now.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          delegacionId: delId,
          createdAt: now.toISOString(),
        };
        await db.folios.put(createdFolio);
        saveItemToServer('folios', createdFolio);
        setFoliosList((prev) => [...prev, createdFolio]);
        resolvedFolioId = createdFolio.id;
      }
    }

    const entity: MemoNota = {
      ...memo,
      delegacionId: delId,
      serieFolioId: memo.serieFolioId || matchedSerie?.id,
      serieFolioNombre: memo.serieFolioNombre || matchedSerie?.nombre,
      folioId: resolvedFolioId,
    };
    await db.memosNotas.put(entity);
    saveItemToServer('memosNotas', entity);
    setMemosNotasList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Memos y Notas',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Actualizó'} ${entity.tipo} "${entity.nroFolioMemo}" — Asunto: ${entity.asunto} (Destino: ${entity.destino})`,
      delegacionId: entity.delegacionId || activeDelegacionId,
    });
  };

  const handleDeleteMemoNota = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = memosNotasList.find((m) => m.id === id);
    await db.memosNotas.delete(id);
    deleteItemFromServer('memosNotas', id);
    setMemosNotasList((prev) => prev.filter((m) => m.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Memos y Notas',
      accion: 'ELIMINAR',
      descripcion: `Eliminó ${target?.tipo || 'documento'} "${target?.nroFolioMemo || id}" (${target?.asunto || ''})`,
      delegacionId: target?.delegacionId || activeDelegacionId,
    });
  };

  // --- CRUD INVENTARIO Y CAMBIO DE JEFE ---
  const handleSaveInventarioBien = async (bien: InventarioBien) => {
    const isNew = !inventarioBienesList.some((b) => b.id === bien.id);
    const entity: InventarioBien = {
      ...bien,
      delegacionId: bien.delegacionId || activeDelegacionId,
    };
    await db.inventarioBienes.put(entity);
    await saveItemToServer('inventarioBienes', entity);
    setInventarioBienesList((prev) => {
      const idx = prev.findIndex((b) => b.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Inventario y Cambio de Jefe',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Actualizó'} bien "${entity.nroInventario} - ${entity.denominacion}" (${entity.estadoConservacion})`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleBulkImportInventarioBienes = async (bienes: InventarioBien[]) => {
    if (!bienes || bienes.length === 0) return;
    const entities = bienes.map((b) => ({
      ...b,
      delegacionId: b.delegacionId || activeDelegacionId,
    }));
    await db.inventarioBienes.bulkPut(entities);
    for (const ent of entities) {
      await saveItemToServer('inventarioBienes', ent);
    }
    setInventarioBienesList((prev) => {
      const map = new Map(prev.map((x) => [x.id, x]));
      for (const ent of entities) map.set(ent.id, ent);
      return Array.from(map.values());
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Inventario y Cambio de Jefe',
      accion: 'CREAR',
      descripcion: `Importó automáticamente ${entities.length} bien(es) desde módulos del sistema al inventario.`,
      delegacionId: activeDelegacionId,
    });
  };

  const handleDeleteInventarioBien = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = inventarioBienesList.find((b) => b.id === id);
    await db.inventarioBienes.delete(id);
    await deleteItemFromServer('inventarioBienes', id);
    setInventarioBienesList((prev) => prev.filter((b) => b.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Inventario y Cambio de Jefe',
      accion: 'ELIMINAR',
      descripcion: `Eliminó bien "${target?.nroInventario || id} - ${target?.denominacion || ''}"`,
      delegacionId: target?.delegacionId || activeDelegacionId,
    });
  };

  const handleSaveActaCambioJefe = async (acta: ActaCambioJefe) => {
    const isNew = !actasCambioJefeList.some((a) => a.id === acta.id);
    const entity: ActaCambioJefe = {
      ...acta,
      delegacionId: acta.delegacionId || activeDelegacionId,
    };
    await db.actasCambioJefe.put(entity);
    await saveItemToServer('actasCambioJefe', entity);
    setActasCambioJefeList((prev) => {
      const idx = prev.findIndex((a) => a.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Inventario y Cambio de Jefe',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Confeccionó' : 'Actualizó'} ${entity.nroActa} (${entity.tipoCambio}) — Saliente: ${entity.jefeSaliente?.apellidoYNombre} / Entrante: ${entity.jefeEntrante?.apellidoYNombre}`,
      delegacionId: entity.delegacionId,
    });
  };

  const handleDeleteActaCambioJefe = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    const target = actasCambioJefeList.find((a) => a.id === id);
    await db.actasCambioJefe.delete(id);
    await deleteItemFromServer('actasCambioJefe', id);
    setActasCambioJefeList((prev) => prev.filter((a) => a.id !== id));

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Inventario y Cambio de Jefe',
      accion: 'ELIMINAR',
      descripcion: `Eliminó Acta de Cambio de Jefe "${target?.nroActa || id}"`,
      delegacionId: target?.delegacionId || activeDelegacionId,
    });
  };

  // --- CAMBIO DE CONTRASEÑA ---
  const handleSavePassword = async (
    userId: string,
    _newPass: string,
    updatedUserFromServer?: UsuarioSistema
  ) => {
    const existing = usuariosList.find((u) => u.id === userId);
    if (!existing && !updatedUserFromServer) return;

    const sanitizedUser: UsuarioSistema = {
      ...(existing || {}),
      ...(updatedUserFromServer || {}),
      password: '',
      updatedAt: new Date().toISOString(),
    } as UsuarioSistema;

    setUsuariosList((prev) =>
      prev.map((u) => (u.id === userId ? sanitizedUser : u))
    );

    if (currentUser?.id === userId) {
      setCurrentUser(sanitizedUser);
      sessionStorage.setItem('sispol_current_user', JSON.stringify(sanitizedUser));
    }
  };

  const handleUserSecurityUpdated = (updatedUser: UsuarioSistema) => {
    const sanitizedUser: UsuarioSistema = { ...updatedUser, password: '' };
    setUsuariosList((prev) =>
      prev.map((u) => (u.id === sanitizedUser.id ? sanitizedUser : u))
    );
    if (currentUser?.id === sanitizedUser.id) {
      setCurrentUser(sanitizedUser);
      sessionStorage.setItem('sispol_current_user', JSON.stringify(sanitizedUser));
    }
  };

  const handleAdminReset2fa = async (userId: string) => {
    const res = await adminResetUser2faOnServer(userId);
    if (!res.success || !res.user) {
      showNotice(res.error || 'No se pudo restablecer el 2FA del usuario.', true);
      return;
    }
    handleUserSecurityUpdated(res.user);
    showNotice(
      `Se restableció Google Authenticator (2FA) y dispositivos de confianza para @${res.user.username}.`,
      false
    );
  };

  // --- SESIÓN & LOGOUT ---
  const handleLoginSuccess = (user: UsuarioSistema) => {
    const sanitizedUser: UsuarioSistema = { ...user, password: '' };
    setCurrentUser(sanitizedUser);
    sessionStorage.setItem('sispol_current_user', JSON.stringify(sanitizedUser));
    setActiveDelegacionId(sanitizedUser.delegacionId || 'del-laguna-blanca');
    setActiveTab('dashboard');
    lastActivityRef.current = Date.now();
    setInactivityCountdown(null);
    // Sincronizar datos del servidor inmediatamente tras autenticación con token
    setTimeout(() => {
      reloadAllData();
    }, 50);
  };

  const handleLogout = useCallback(() => {
    logoutOnServer();
    sessionStorage.removeItem('sispol_current_user');
    setInactivityCountdown(null);
    setCurrentUser(null);
  }, []);

  // Suscripción a expiración de token (401 en el servidor)
  useEffect(() => {
    return subscribeAuthExpired(() => {
      sessionStorage.removeItem('sispol_current_user');
      setInactivityCountdown(null);
      setCurrentUser(null);
    });
  }, []);

  // Cierre de sesión automático por inactividad (aviso a los 19 min, cierre a los 20 min)
  useEffect(() => {
    if (!currentUser) {
      setInactivityCountdown(null);
      return;
    }

    lastActivityRef.current = Date.now();
    const WARN_AFTER_MS = 19 * 60 * 1000;
    const LOGOUT_AFTER_MS = 20 * 60 * 1000;

    const markActivity = () => {
      if (inactivityCountdown === null) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));

    const timer = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= LOGOUT_AFTER_MS) {
        handleLogout();
      } else if (elapsed >= WARN_AFTER_MS) {
        const secsLeft = Math.max(1, Math.ceil((LOGOUT_AFTER_MS - elapsed) / 1000));
        setInactivityCountdown(secsLeft);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
    };
  }, [currentUser, inactivityCountdown, handleLogout]);

  // --- CONFIGURACIÓN GENERAL (Aislada por Delegación pero Estructura de Módulos Compartida) ---
  const handleSaveConfig = async (newConfig: ConfiguracionSistema) => {
    const structTimestamp =
      newConfig.estructuraModulosUpdatedAt ||
      (newConfig.estructuraModulos ? new Date().toISOString() : undefined);

    const configDelegacion: ConfiguracionSistema = {
      ...newConfig,
      estructuraModulosUpdatedAt: structTimestamp,
      id: `config-${activeDelegacionId}`,
      delegacionId: activeDelegacionId,
    };
    await db.configuracion.put(configDelegacion);
    saveItemToServer('configuracion', configDelegacion);

    // Propagar estructuraModulos y carpetas a todas las configuraciones para visibilidad universal
    if (newConfig.estructuraModulos && newConfig.estructuraModulos.length > 0) {
      try {
        const allConfigs = await db.configuracion.toArray();
        const existingConfigIds = new Set(allConfigs.map((c) => c.id));
        for (const cfg of allConfigs) {
          if (cfg.id !== configDelegacion.id) {
            const updated: ConfiguracionSistema = {
              ...cfg,
              estructuraModulos: newConfig.estructuraModulos,
              estructuraModulosUpdatedAt: structTimestamp,
              ...(newConfig.tiposLicenciaCatalogo
                ? { tiposLicenciaCatalogo: newConfig.tiposLicenciaCatalogo }
                : {}),
              ...(newConfig.tiposMemoCatalogo
                ? { tiposMemoCatalogo: newConfig.tiposMemoCatalogo }
                : {}),
            };
            await db.configuracion.put(updated);
            saveItemToServer('configuracion', updated);
          }
        }
        // Asegurar que todas las delegaciones registradas reciban la estructura actualizada aunque no tuvieran config propia aún
        for (const del of delegacionesList) {
          const targetId = `config-${del.id}`;
          if (!existingConfigIds.has(targetId) && targetId !== configDelegacion.id) {
            const createdCfg: ConfiguracionSistema = {
              ...DEFAULT_CONFIG,
              id: targetId,
              delegacionId: del.id,
              dependencia: del.nombre,
              siglasDependencia: del.siglas,
              direccionDependencia: del.direccion,
              contactoDependencia: `Tel.: ${del.telefono} / E-mail: ${del.email}`,
              lineasMembrete:
                del.lineasMembrete && del.lineasMembrete.length > 0
                  ? del.lineasMembrete
                  : DEFAULT_CONFIG.lineasMembrete,
              logoIzquierdoUrl: del.logoIzquierdoUrl || DEFAULT_CONFIG.logoIzquierdoUrl,
              logoDerechoUrl: del.logoDerechoUrl || DEFAULT_CONFIG.logoDerechoUrl,
              textoDebajoLogoIzquierdo:
                del.textoDebajoLogoIzquierdo || DEFAULT_CONFIG.textoDebajoLogoIzquierdo,
              textoDebajoLogoDerecho:
                del.textoDebajoLogoDerecho || DEFAULT_CONFIG.textoDebajoLogoDerecho,
              pieDePagina: del.pieDePagina || DEFAULT_CONFIG.pieDePagina,
              estructuraModulos: newConfig.estructuraModulos,
              estructuraModulosUpdatedAt: structTimestamp,
              ...(newConfig.tiposLicenciaCatalogo
                ? { tiposLicenciaCatalogo: newConfig.tiposLicenciaCatalogo }
                : {}),
              ...(newConfig.tiposMemoCatalogo
                ? { tiposMemoCatalogo: newConfig.tiposMemoCatalogo }
                : {}),
            };
            await db.configuracion.put(createdCfg);
            saveItemToServer('configuracion', createdCfg);
          }
        }
      } catch (err) {
        console.error('Error propagando estructura de módulos:', err);
      }
    }

    setConfig(configDelegacion);
  };

  // Conteos para Badges
  const faltaOficioCount = filteredCasosFaltaOficio.filter((c) => c.estado === 'Pendiente').length;
  const movilesTallerCount = filteredMoviles.filter((m) => m.estadoOperativo === 'En Taller Mecánico').length;
  const armasRetenidasCount = filteredPersonal.filter((p) => p.armamento?.secuestradoORetenido).length;
  const charlasProximasCount = filteredCharlas.filter((c) => {
    if (c.estado === 'Realizada' || c.estado === 'Suspendida') return false;
    const diff = getDiasHastaCharla(c.fecha);
    return diff >= 0 && diff <= 7;
  }).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="font-mono text-sm tracking-wider text-blue-200">
          INICIALIZANDO SISTEMA POLICIAL SIS.POL...
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, renderizar Portal de Acceso Oficial
  if (!currentUser) {
    return (
      <LoginView
        usuariosList={usuariosList}
        delegacionesList={delegacionesList}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased relative overflow-x-hidden">
      {/* Navbar Institucional con Selector de Delegación y Perfil */}
      <Navbar
        config={config}
        currentUser={currentUser}
        activeDelegacionId={activeDelegacionId}
        delegacionesList={delegacionesList}
        novedadesList={novedadesList}
        movilesList={movilesList}
        charlasList={filteredCharlas}
        intervencionesADeterminarCount={
          filteredIntervenciones.filter((i) => getResumenLesionADeterminarIntervencion(i).tienePendiente).length
        }
        onNavigateToNovedades={() => setActiveTab('novedades-delegaciones')}
        onNavigateToMoviles={() => setActiveTab('moviles')}
        onNavigateToCharlas={() => setActiveTab('charlas-prevencion')}
        onNavigateToIntervenciones={() => setActiveTab('intervenciones')}
        onSelectDelegacion={(newDelId) => setActiveDelegacionId(newDelId)}
        onOpenCambiarPassword={() => setIsPasswordModalOpen(true)}
        onOpenTwoFactor={() => setIsTwoFactorModalOpen(true)}
        onLogout={handleLogout}
        onOpenBackups={() => setActiveTab('config')}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={() => setIsSidebarVisible((prev) => !prev)}
      />

      {/* Botón flotante para restaurar menú cuando está oculto */}
      {!isSidebarVisible && (
        <button
          type="button"
          onClick={() => setIsSidebarVisible(true)}
          className="fixed left-0 top-24 z-30 bg-blue-900 text-white px-2.5 py-2 rounded-r-xl shadow-lg border border-l-0 border-blue-700 hover:bg-blue-800 flex items-center gap-1.5 text-xs font-bold transition-all animate-in slide-in-from-left duration-200 cursor-pointer"
          title="Mostrar menú de módulos"
        >
          <PanelLeftOpen className="w-4 h-4 text-blue-200" />
          <span className="hidden sm:inline">Módulos</span>
        </button>
      )}

      {/* Contenido Principal con Sidebar pegado al borde izquierdo */}
      <div className="flex-1 flex flex-col md:flex-row w-full transition-all min-w-0">
        {isSidebarVisible && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            currentUser={currentUser}
            onToggleCollapse={() => setIsSidebarVisible(false)}
            config={config}
            onSaveConfig={handleSaveConfig}
            badgeCounts={{
              faltaOficio: faltaOficioCount,
              movilesTaller: movilesTallerCount,
              armasRetenidas: armasRetenidasCount,
              charlasProximas: charlasProximasCount,
              memosNotas: filteredMemosNotas.length,
              inventarioBienes: filteredInventarioBienes.length,
              inspecciones:
                filteredInspecciones.length +
                filteredPartesGuardia.reduce(
                  (acc, p) => acc + (p.intervenciones?.length || 0),
                  0
                ),
            }}
          />
        )}

        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              personalList={filteredPersonal}
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              movilesList={filteredMoviles}
              partesGuardiaList={filteredPartesGuardia}
              inspeccionesList={filteredInspecciones}
              charlasList={filteredCharlas}
              intervencionesList={filteredIntervenciones}
              recargosList={filteredRecargos}
              memosNotasList={filteredMemosNotas}
              foliosList={filteredFolios}
              seriesNumerarioList={filteredSeriesNumerario}
              accidentologiaList={accidentologiaList.filter(
                (a) => !a.delegacionId || a.delegacionId === activeDelegacionId
              )}
              licenciasPolicialesList={filteredLicenciasPoliciales}
              saldosLicenciasList={filteredSaldosLicencias}
              informesTecnicosList={filteredInformesTecnicos}
              reparacionesList={reparacionesList}
              novedadesList={novedadesList}
              gruposList={filteredGrupos}
              forensesList={filteredForenses}
              inventarioBienesList={filteredInventarioBienes}
              actasCambioJefeList={filteredActasCambioJefe}
              currentUser={currentUser || undefined}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'personal' && (
            <PersonnelView
              personalList={filteredPersonal}
              config={config}
              delegacionesList={delegacionesList}
              currentUser={currentUser || undefined}
              onSavePersonal={handleSavePersonal}
              onDeletePersonal={handleDeletePersonal}
              onTransferirPersonal={handleTransferirPersonal}
            />
          )}

          {activeTab === 'grupos' && (
            <GruposView
              gruposList={filteredGrupos}
              personalList={filteredPersonal}
              config={config}
              onSaveGrupo={handleSaveGrupo}
              onDeleteGrupo={handleDeleteGrupo}
              onNavigateToGuardias={() => setActiveTab('guardias')}
            />
          )}

          {activeTab === 'expedientes' && (
            <ExpedientesView
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              personalList={filteredPersonal}
              config={config}
              onSaveExpediente={handleSaveExpediente}
              onDeleteExpediente={handleDeleteExpediente}
              onSaveCasoFaltaOficio={handleSaveCasoFaltaOficio}
              onDeleteCasoFaltaOficio={handleDeleteCasoFaltaOficio}
              onConsolidarAgrupacion={handleConsolidarAgrupacion}
              initialSubTab="expedientes"
            />
          )}

          {activeTab === 'falta-oficio' && (
            <ExpedientesView
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              personalList={filteredPersonal}
              config={config}
              onSaveExpediente={handleSaveExpediente}
              onDeleteExpediente={handleDeleteExpediente}
              onSaveCasoFaltaOficio={handleSaveCasoFaltaOficio}
              onDeleteCasoFaltaOficio={handleDeleteCasoFaltaOficio}
              onConsolidarAgrupacion={handleConsolidarAgrupacion}
              initialSubTab="falta-oficio"
            />
          )}

          {activeTab === 'moviles' && (
            <MovilesView
              movilesList={filteredMoviles}
              reparacionesList={reparacionesList}
              config={config}
              delegacionesList={delegacionesList}
              currentUser={currentUser || undefined}
              onSaveMovil={handleSaveMovil}
              onDeleteMovil={handleDeleteMovil}
              onSaveReparacion={handleSaveReparacion}
              onDeleteReparacion={handleDeleteReparacion}
            />
          )}

          {activeTab === 'recargos' && (
            <RecargosView
              recargosList={filteredRecargos}
              personalList={personalList}
              licenciasPoliciales={filteredLicenciasPoliciales}
              config={config}
              currentUser={currentUser || undefined}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              onSaveRecargo={handleSaveRecargo}
              onDeleteRecargo={handleDeleteRecargo}
            />
          )}

          {activeTab === 'guardias' && (
            <GuardiasView
              partesList={filteredPartesGuardia}
              personalList={filteredPersonal}
              movilesList={filteredMoviles}
              gruposList={filteredGrupos}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              licenciasPoliciales={filteredLicenciasPoliciales}
              inspeccionesList={filteredInspecciones}
              config={config}
              currentUser={currentUser || undefined}
              onSaveParte={handleSaveParte}
              onDeleteParte={handleDeleteParte}
              onSaveIntervencion={handleSaveIntervencion}
              onDeleteIntervencion={handleDeleteIntervencion}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {activeTab === 'inspecciones' && (
            <InspeccionesView
              inspeccionesList={filteredInspecciones}
              partesGuardiaList={filteredPartesGuardia}
              intervencionesList={filteredIntervenciones}
              personalList={filteredPersonal}
              delegacionesList={delegacionesList}
              gruposList={filteredGrupos}
              activeDelegacionId={activeDelegacionId}
              config={config}
              currentUser={currentUser || undefined}
              onSaveInspeccion={handleSaveInspeccion}
              onDeleteInspeccion={handleDeleteInspeccion}
              onSaveConfig={handleSaveConfig}
              onNavigateToGuardias={() => setActiveTab('guardias')}
            />
          )}

          {activeTab === 'intervenciones' && (
            <IntervencionesView
              intervencionesList={filteredIntervenciones}
              partesList={filteredPartesGuardia}
              config={config}
              personalList={filteredPersonal}
              gruposList={filteredGrupos}
              currentUser={currentUser || undefined}
              onSaveIntervencion={handleSaveIntervencion}
              onDeleteIntervencion={handleDeleteIntervencion}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {activeTab === 'causas-policiales' && (
            <CausasPolicialesView
              intervencionesList={filteredIntervenciones}
              inspeccionesList={filteredInspecciones}
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              informesTecnicosList={filteredInformesTecnicos}
              personalList={filteredPersonal}
              config={config}
            />
          )}

          {activeTab === 'personas' && (
            <PersonasView
              partesGuardiaList={filteredPartesGuardia}
              config={config}
              onNavigateToGuardias={() => setActiveTab('guardias')}
            />
          )}

          {activeTab === 'vehiculos' && (
            <VehiculosView
              partesGuardiaList={filteredPartesGuardia}
              config={config}
              onNavigateToGuardias={() => setActiveTab('guardias')}
            />
          )}

          {activeTab === 'forense' && (
            <ForenseView
              forensesList={filteredForenses}
              partesGuardiaList={filteredPartesGuardia}
              config={config}
              activeDelegacionId={activeDelegacionId}
              onSaveForense={handleSaveForense}
              onDeleteForense={handleDeleteForense}
              onSaveParte={handleSaveParte}
            />
          )}

          {activeTab === 'licenciados' && (
            <LicenciadosView
              personalList={filteredPersonal}
              config={config}
              onSavePersonal={handleSavePersonal}
              licenciadosList={filteredLicenciados}
              onSaveLicenciado={handleSaveLicenciado}
              onDeleteLicenciado={handleDeleteLicenciado}
            />
          )}

          {activeTab === 'informes-tecnicos' && (
            <InformesTecnicosView
              informesList={filteredInformesTecnicos}
              personalList={filteredPersonal}
              config={config}
              inspeccionesList={filteredInspecciones}
              onSaveInforme={handleSaveInformeTecnico}
              onDeleteInforme={handleDeleteInformeTecnico}
            />
          )}

          {activeTab === 'accidentologia' && (
            <AccidentologiaView
              accidentologiaList={accidentologiaList}
              personalList={filteredPersonal}
              intervencionesList={intervencionesList}
              config={config}
              currentUser={currentUser || undefined}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              onSaveRegistro={handleSaveAccidentologia}
              onDeleteRegistro={handleDeleteAccidentologia}
            />
          )}

          {activeTab === 'numerario' && (
            <NumerarioView
              seriesList={filteredSeriesNumerario}
              foliosList={filteredFolios}
              memosList={filteredMemosNotas}
              config={config}
              personalList={personalList}
              currentUser={currentUser || undefined}
              activeDelegacionId={activeDelegacionId}
              delegacionesList={delegacionesList}
              onSaveFolios={handleSaveFolios}
              onUpdateFolio={handleUpdateFolio}
              onLiberarFolio={handleLiberarFolio}
              onSaveSerie={handleSaveSerie}
              onDeleteSerie={handleDeleteSerie}
              onResetSerie={handleResetSerie}
              onReorderSeries={handleReorderSeries}
            />
          )}

          {activeTab === 'memos-notas' && (
            <MemosNotasView
              memosList={filteredMemosNotas}
              seriesList={filteredSeriesNumerario}
              foliosList={filteredFolios}
              usuariosList={usuariosList}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              config={config}
              currentUser={currentUser}
              onSaveMemo={handleSaveMemoNota}
              onDeleteMemo={handleDeleteMemoNota}
              onSaveConfig={handleSaveConfig}
              onSaveUsuario={handleSaveUsuario}
              onSaveSerie={handleSaveSerie}
            />
          )}

          {activeTab === 'inventario' && (
            <InventarioView
              bienesList={filteredInventarioBienes}
              actasList={filteredActasCambioJefe}
              personalList={filteredPersonal}
              movilesList={filteredMoviles}
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              seriesNumerarioList={filteredSeriesNumerario}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              config={config}
              currentUser={currentUser}
              onSaveBien={handleSaveInventarioBien}
              onBulkImportBienes={handleBulkImportInventarioBienes}
              onDeleteBien={handleDeleteInventarioBien}
              onSaveActa={handleSaveActaCambioJefe}
              onDeleteActa={handleDeleteActaCambioJefe}
            />
          )}

          {activeTab === 'usuarios' && currentUser && (
            <UsuariosView
              usuariosList={usuariosList}
              delegacionesList={delegacionesList}
              rolesList={rolesList}
              seriesNumerarioList={filteredSeriesNumerario}
              config={config}
              currentUser={currentUser}
              onSaveUsuario={handleSaveUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              onSaveRol={handleSaveRol}
              onDeleteRol={handleDeleteRol}
              onAdminReset2fa={handleAdminReset2fa}
              onUserUpdated={handleUserSecurityUpdated}
            />
          )}

          {activeTab === 'auditoria' && currentUser && currentUser.rol === 'superusuario' && (
            <AuditoriaView
              currentUser={currentUser}
              delegacionesList={delegacionesList}
              config={config}
            />
          )}

          {activeTab === 'novedades-delegaciones' && (
            <NovedadesDelegacionesView
              novedadesList={novedadesList}
              delegacionesList={delegacionesList}
              currentUser={currentUser || undefined}
              activeDelegacionId={activeDelegacionId}
              config={config}
              onCrearNovedad={handleCrearNovedad}
              onMarcarLeido={handleMarcarLeidoNovedad}
              onEliminarNovedad={handleEliminarNovedad}
            />
          )}

          {activeTab === 'charlas-prevencion' && (
            <CharlasPrevencionView
              charlasList={filteredCharlas}
              personalList={personalList}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              currentUser={currentUser || undefined}
              config={config}
              onSaveCharla={handleSaveCharla}
              onDeleteCharla={handleDeleteCharla}
            />
          )}

          {activeTab === 'licencias' && (
            <LicenciasPolicialesView
              personalList={personalList}
              licencias={licenciasPolicialesList}
              saldosLicencias={saldosLicenciasList}
              feriados={feriadosList}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              config={config}
              currentUser={currentUser || undefined}
              onSaveLicencia={handleSaveLicencia}
              onDeleteLicencia={handleDeleteLicencia}
              onSaveSaldoLicencia={handleSaveSaldoLicencia}
              onSaveFeriado={handleSaveFeriado}
              onSaveFeriadosBulk={handleSaveFeriadosBulk}
              onDeleteFeriado={handleDeleteFeriado}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {activeTab === 'config' && (
            <ConfigView
              config={config}
              currentUser={currentUser || undefined}
              onSaveConfig={handleSaveConfig}
              onReloadAllData={reloadAllData}
              delegacionesList={delegacionesList}
              activeDelegacionId={activeDelegacionId}
              onSaveDelegacion={handleSaveDelegacion}
            />
          )}
        </main>
      </div>

      {/* Modal para que el usuario autenticado cambie su contraseña */}
      {isPasswordModalOpen && currentUser && (
        <CambiarPasswordModal
          currentUser={currentUser}
          onSavePassword={handleSavePassword}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}

      {/* Modal para configurar Google Authenticator (2FA) y Dispositivos de Confianza */}
      {isTwoFactorModalOpen && currentUser && (
        <TwoFactorModal
          currentUser={currentUser}
          onUserUpdated={handleUserSecurityUpdated}
          onClose={() => setIsTwoFactorModalOpen(false)}
        />
      )}

      {/* Aviso no bloqueante de seguridad / permisos */}
      {actionNotice && (
        <div
          className={`fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white border rounded-xl shadow-2xl p-3.5 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-4 ${
            actionNotice.isError ? 'border-red-500/50' : 'border-emerald-500/50'
          }`}
        >
          {actionNotice.isError ? (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-relaxed">{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal de Cierre de Sesión Automático por Inactividad */}
      {inactivityCountdown !== null && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-300 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sesión Inactiva por Seguridad
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Por protocolo de protección de datos policiales, su sesión se cerrará automáticamente en{' '}
                  <strong className="text-red-700 font-mono text-sm">{inactivityCountdown}s</strong> si no registra actividad.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar Sesión Ahora
              </button>
              <button
                type="button"
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setInactivityCountdown(null);
                }}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Mantener Sesión Activa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Visor Universal de Previsualización, Orientación y Tamaño de Papel PDF */}
      <PdfPreviewModal />
    </div>
  );
}
