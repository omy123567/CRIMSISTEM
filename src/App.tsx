import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from './types/police';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
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
import { LoginView } from './components/auth/LoginView';
import { CambiarPasswordModal } from './components/auth/CambiarPasswordModal';
import { registrarAuditoria } from './services/auditService';
import {
  syncWithServer,
  saveItemToServer,
  deleteItemFromServer,
} from './services/apiService';
import { PanelLeftOpen } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UsuarioSistema | null>(() => {
    try {
      const stored = sessionStorage.getItem('sispol_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.username || parsed.email)) {
          return parsed;
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
        setConfig(confArray[0]);
      } else {
        await db.configuracion.put(DEFAULT_CONFIG);
        setConfig(DEFAULT_CONFIG);
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

      // Si el usuario ya está logueado, sincronizar su sesión fresca
      if (currentUser) {
        const freshUser = usrs.find((u) => u.id === currentUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          sessionStorage.setItem('sispol_current_user', JSON.stringify(freshUser));
        }
      }
    } catch (error) {
      console.error('Error al inicializar la base de datos IndexedDB:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

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
      const confEspecifica = await db.configuracion.get(`config-${activeDelegacionId}`);
      if (!isMounted) return;

      if (confEspecifica) {
        setConfig(confEspecifica);
      } else if (targetDel) {
        const configNueva: ConfiguracionSistema = {
          ...DEFAULT_CONFIG,
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
          setConfig(configNueva);
        }
      }
    };
    sincronizarConfigYDelegacion();
    return () => {
      isMounted = false;
    };
  }, [activeDelegacionId, delegacionesList]);

  // Verificación de permiso de eliminación
  const verificarPermisoEliminar = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.rol === 'superusuario') return true;
    if (currentUser.puedeEliminar === false) {
      alert(
        'Acceso denegado: Su usuario no cuenta con autorización para eliminar registros del sistema. Contacte a un Administrador.'
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
    return seriesNumerarioList.filter(
      (s) => !s.delegacionId || s.delegacionId === activeDelegacionId
    );
  }, [seriesNumerarioList, activeDelegacionId]);

  const filteredFolios = useMemo(() => {
    return foliosList.filter(
      (f) => !f.delegacionId || f.delegacionId === activeDelegacionId
    );
  }, [foliosList, activeDelegacionId]);

  // Intervenciones de la delegación activa (combinadas de partes de guardia e independientes)
  const filteredIntervenciones = useMemo(() => {
    const fromPartes = filteredPartesGuardia.flatMap(
      (p) => p.intervenciones || []
    );
    const map = new Map<string, IntervencionParte>();
    for (const item of fromPartes) {
      map.set(item.id, item);
    }
    for (const item of intervencionesList) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (b.nroCorrelativo || 0) - (a.nroCorrelativo || 0)
    );
  }, [filteredPartesGuardia, intervencionesList]);

  // --- TRASLADO DE PERSONAL ENTRE DELEGACIONES ---
  const handleTransferirPersonal = async (
    personal: Personal,
    nuevaDelegacionId: string,
    motivo: string,
    disposicion: string,
    fecha: string
  ) => {
    const destinoDel = delegacionesList.find((d) => d.id === nuevaDelegacionId);
    const destinoNombre = destinoDel?.nombre || nuevaDelegacionId;
    const origenDel = delegacionesList.find(
      (d) => d.id === (personal.delegacionId || 'del-laguna-blanca')
    );
    const origenNombre = origenDel?.nombre || personal.delegacionId || 'Laguna Blanca';

    const nuevoTraslado = {
      id: 'tras-' + Date.now(),
      fecha,
      delegacionOrigenId: personal.delegacionId || 'del-laguna-blanca',
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
      historialTraslados: [
        ...(personal.historialTraslados || []),
        nuevoTraslado,
      ],
      updatedAt: new Date().toISOString(),
    };

    await db.personal.put(updatedPersonal);
    setPersonalList((prev) =>
      prev.map((p) => (p.id === updatedPersonal.id ? updatedPersonal : p))
    );
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
    // 1. Guardar en tabla directa de intervenciones
    await db.intervenciones.put(inter);
    saveItemToServer('intervenciones', inter);
    setIntervencionesList((prev) => {
      const idx = prev.findIndex((i) => i.id === inter.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = inter;
        return copy;
      }
      return [inter, ...prev];
    });

    await registrarAuditoria({
      currentUser: currentUser,
      delegacionId: activeDelegacionId,
      modulo: 'Intervenciones',
      accion: isNew ? 'CREAR' : 'MODIFICAR',
      descripcion: `${isNew ? 'Registró' : 'Modificó'} intervención ${inter.tipoIntervencion || ''} N° ${inter.nroCorrelativo} - ${inter.hecho || 'S/D'}`,
    });

    // 2. Si pertenece a un parte de guardia, actualizar el parte
    const parte = partesGuardiaList.find((p) => p.id === inter.parteId);
    if (parte) {
      const currentIntervenciones = parte.intervenciones || [];
      const idx = currentIntervenciones.findIndex((i) => i.id === inter.id);
      let updatedIntervenciones: IntervencionParte[];

      if (idx >= 0) {
        updatedIntervenciones = [...currentIntervenciones];
        updatedIntervenciones[idx] = inter;
      } else {
        updatedIntervenciones = [...currentIntervenciones, inter];
      }

      const parteActualizado: ParteNovedadesGuardia = {
        ...parte,
        intervenciones: updatedIntervenciones,
        updatedAt: new Date().toISOString(),
      };
      await handleSaveParte(parteActualizado);
    }

    // 3. Actualizar contador correlativo en la configuración de contadores
    if (inter.tipoIntervencion === 'Criminalística') {
      const nuevoUltimo = Math.max(
        config.ultimoNroIntervencionCriminalistica || 0,
        inter.nroCorrelativo
      );
      if (nuevoUltimo !== config.ultimoNroIntervencionCriminalistica) {
        await handleSaveConfig({
          ...config,
          ultimoNroIntervencionCriminalistica: nuevoUltimo,
        });
      }
    } else if (inter.tipoIntervencion === 'Accidentológica') {
      const nuevoUltimo = Math.max(
        config.ultimoNroIntervencionAccidentologica || 0,
        inter.nroCorrelativo
      );
      if (nuevoUltimo !== config.ultimoNroIntervencionAccidentologica) {
        await handleSaveConfig({
          ...config,
          ultimoNroIntervencionAccidentologica: nuevoUltimo,
        });
      }
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

      const faltanDatos = !tipoLesiones || !alcohotest;
      const datosFaltantes: string[] = [];
      if (!tipoLesiones) datosFaltantes.push('tipoLesiones');
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
    setInspeccionesList((prev) => {
      const idx = prev.findIndex((item) => item.id === entity.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entity;
        return copy;
      }
      return [entity, ...prev];
    });

    if (ins.nroIO) {
      const numPart = parseInt(ins.nroIO.replace(/\D/g, ''), 10);
      const updatedConfig: ConfiguracionSistema = {
        ...config,
        ultimoNroIntervencionCriminalistica: (config.ultimoNroIntervencionCriminalistica || 0) + 1,
        ultimoNroIO: Math.max(config.ultimoNroIO ?? 0, numPart),
      };
      await handleSaveConfig(updatedConfig);
    }
  };

  const handleDeleteInspeccion = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    await db.inspeccionesOculares.delete(id);
    deleteItemFromServer('inspeccionesOculares', id);
    setInspeccionesList((prev) => prev.filter((i) => i.id !== id));
  };

  // --- CRUD FORENSES ---
  const handleSaveForense = async (f: ForenseTurno) => {
    await db.forenses.put(f);
    saveItemToServer('forenses', f);
    setForensesList((prev) => {
      const idx = prev.findIndex((item) => item.id === f.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = f;
        return copy;
      }
      return [f, ...prev];
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
    await db.usuarios.put(u);
    saveItemToServer('usuarios', u);
    setUsuariosList((prev) => {
      const idx = prev.findIndex((item) => item.id === u.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = u;
        return copy;
      }
      return [u, ...prev];
    });

    if (currentUser?.id === u.id) {
      setCurrentUser(u);
      sessionStorage.setItem('sispol_current_user', JSON.stringify(u));
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!verificarPermisoEliminar()) return;
    if (currentUser?.id === id) {
      alert('No es posible eliminar su propio usuario activo en sesión.');
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
      alert('Los roles predeterminados del sistema no pueden eliminarse.');
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
  const handleSaveFolios = async (newFolios: FolioAsignado[]) => {
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

    await registrarAuditoria({
      currentUser: currentUser || undefined,
      modulo: 'Numerario',
      accion: 'MODIFICAR',
      descripcion: `Actualización de Folio N° ${folio.numero} (${folio.caratulaPersonalizada || folio.categoriaDocumento})`,
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

  // --- CAMBIO DE CONTRASEÑA ---
  const handleSavePassword = async (userId: string, newPass: string) => {
    const user = usuariosList.find((u) => u.id === userId);
    if (!user) return;

    const updatedUser: UsuarioSistema = {
      ...user,
      password: newPass,
      updatedAt: new Date().toISOString(),
    };
    await db.usuarios.put(updatedUser);
    saveItemToServer('usuarios', updatedUser);

    setUsuariosList((prev) =>
      prev.map((u) => (u.id === userId ? updatedUser : u))
    );

    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
      sessionStorage.setItem('sispol_current_user', JSON.stringify(updatedUser));
    }
  };

  // --- SESIÓN & LOGOUT ---
  const handleLoginSuccess = (user: UsuarioSistema) => {
    setCurrentUser(user);
    sessionStorage.setItem('sispol_current_user', JSON.stringify(user));
    setActiveDelegacionId(user.delegacionId || 'del-laguna-blanca');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sispol_current_user');
    setCurrentUser(null);
  };

  // --- CONFIGURACIÓN GENERAL (Aislada por Delegación) ---
  const handleSaveConfig = async (newConfig: ConfiguracionSistema) => {
    const configDelegacion: ConfiguracionSistema = {
      ...newConfig,
      id: `config-${activeDelegacionId}`,
      delegacionId: activeDelegacionId,
    };
    await db.configuracion.put(configDelegacion);
    saveItemToServer('configuracion', configDelegacion);
    setConfig(configDelegacion);
  };

  // Conteos para Badges
  const faltaOficioCount = filteredCasosFaltaOficio.filter((c) => c.estado === 'Pendiente').length;
  const movilesTallerCount = filteredMoviles.filter((m) => m.estadoOperativo === 'En Taller Mecánico').length;
  const armasRetenidasCount = filteredPersonal.filter((p) => p.armamento?.secuestradoORetenido).length;

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
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased relative">
      {/* Navbar Institucional con Selector de Delegación y Perfil */}
      <Navbar
        config={config}
        currentUser={currentUser}
        activeDelegacionId={activeDelegacionId}
        delegacionesList={delegacionesList}
        onSelectDelegacion={(newDelId) => setActiveDelegacionId(newDelId)}
        onOpenCambiarPassword={() => setIsPasswordModalOpen(true)}
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

      {/* Contenido Principal con Sidebar adaptativo */}
      <div
        className={`flex-1 flex flex-col md:flex-row w-full ${
          isSidebarVisible ? 'max-w-full xl:max-w-[1600px] 2xl:max-w-[1850px]' : 'max-w-full 2xl:max-w-[1900px]'
        } mx-auto px-2 sm:px-4 lg:px-6 transition-all min-w-0`}
      >
        {isSidebarVisible && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            currentUser={currentUser}
            onToggleCollapse={() => setIsSidebarVisible(false)}
            badgeCounts={{
              faltaOficio: faltaOficioCount,
              movilesTaller: movilesTallerCount,
              armasRetenidas: armasRetenidasCount,
              inspecciones:
                filteredInspecciones.length +
                filteredPartesGuardia.reduce(
                  (acc, p) => acc + (p.intervenciones?.length || 0),
                  0
                ),
            }}
          />
        )}

        <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              personalList={filteredPersonal}
              expedientesList={filteredExpedientes}
              casosFaltaOficioList={filteredCasosFaltaOficio}
              movilesList={filteredMoviles}
              partesGuardiaList={filteredPartesGuardia}
              inspeccionesList={filteredInspecciones}
              config={config}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'personal' && (
            <PersonnelView
              personalList={filteredPersonal}
              config={config}
              delegacionesList={delegacionesList}
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
              personalList={filteredPersonal}
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
              forensesList={forensesList}
              config={config}
              onSaveForense={handleSaveForense}
              onDeleteForense={handleDeleteForense}
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
            />
          )}

          {activeTab === 'usuarios' && currentUser && (
            <UsuariosView
              usuariosList={usuariosList}
              delegacionesList={delegacionesList}
              rolesList={rolesList}
              currentUser={currentUser}
              onSaveUsuario={handleSaveUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              onSaveRol={handleSaveRol}
              onDeleteRol={handleDeleteRol}
            />
          )}

          {activeTab === 'auditoria' && currentUser && currentUser.rol === 'superusuario' && (
            <AuditoriaView
              currentUser={currentUser}
              delegacionesList={delegacionesList}
              config={config}
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
    </div>
  );
}
