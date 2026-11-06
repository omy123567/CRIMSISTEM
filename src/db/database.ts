import Dexie, { Table } from 'dexie';
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
  UsuarioSistema,
  InspeccionOcular,
  GrupoPersonal,
  DelegacionPolicial,
  RegistroAuditoria,
  SerieNumerario,
  FolioAsignado,
  AccidentologiaRegistro,
  RolSistema,
  AccionesRol,
} from '../types/police';

export class SisPolDatabase extends Dexie {
  personal!: Table<Personal, string>;
  expedientes!: Table<ExpedienteJudicial, string>;
  casosFaltaOficio!: Table<CasoFaltaOficio, string>;
  moviles!: Table<MovilPolicial, string>;
  reparaciones!: Table<ReparacionMecanica, string>;
  recargos!: Table<RecargoOperativo, string>;
  partesGuardia!: Table<ParteNovedadesGuardia, string>;
  intervenciones!: Table<IntervencionParte, string>;
  inspeccionesOculares!: Table<InspeccionOcular, string>;
  grupos!: Table<GrupoPersonal, string>;
  forenses!: Table<ForenseTurno, string>;
  licenciados!: Table<LicenciadoTurno, string>;
  informesTecnicos!: Table<InformeTecnico, string>;
  configuracion!: Table<ConfiguracionSistema, string>;
  usuarios!: Table<UsuarioSistema, string>;
  delegaciones!: Table<DelegacionPolicial, string>;
  auditoria!: Table<RegistroAuditoria, string>;
  seriesNumerario!: Table<SerieNumerario, string>;
  folios!: Table<FolioAsignado, string>;
  accidentologia!: Table<AccidentologiaRegistro, string>;
  roles!: Table<RolSistema, string>;

  constructor() {
    super('SisPolDB');
    this.version(1).stores({
      personal: 'id, dni, jerarquia, seccionGrupo, estado, apellidoYNombre',
      expedientes: 'id, nroExpediente, nroOficioLetras, fechaRegistro, dependenciaSolicitante, tipoRequerimiento, estadoEntrega',
      casosFaltaOficio: 'id, fechaRegistro, estado, dependenciaSolicitante, tipoRequerimiento',
      moviles: 'id, dominioPatente, nroMovilInterno, tipo, estadoOperativo, condicionGeneral',
      reparaciones: 'id, movilId, fecha, tipoIntervencion',
      recargos: 'id, fecha, tipoRecargo, grupoUOficina, estado',
      partesGuardia: 'id, fechaInicio, grupoGuardia, cerrado',
      intervenciones: 'id, parteId, nroCorrelativo, tipoIntervencion, hecho, inspeccionFecha',
      forenses: 'id, nombreMedico, turno',
      configuracion: 'id',
      usuarios: 'id, dni, rol, activo',
    });
    this.version(2).stores({
      inspeccionesOculares: 'id, nroIO, fecha, tipo, dependenciaSolicitante',
    });
    this.version(3).stores({
      grupos: 'id, nombre, activo',
    });
    this.version(4).stores({
      delegaciones: 'id, nombre, ciudad, activo',
      usuarios: 'id, username, email, delegacionId, rol, activo',
    });
    this.version(5).stores({
      licenciados: 'id, personalId, nombreLicenciado, turno, fecha, delegacionId',
      informesTecnicos: 'id, fecha, oficioNro, nroExpediente, caratula, juzgado, licenciadoACargoId, delegacionId',
    });
    this.version(6).stores({
      auditoria: 'id, fechaHora, usuarioId, username, rol, delegacionId, modulo, accion',
    });
    this.version(7).stores({
      seriesNumerario: 'id, nombre, anio, delegacionId',
      folios: 'id, serieId, numero, anio, categoriaDocumento, delegacionId, fechaAsignacion',
    });
    this.version(8).stores({
      accidentologia: 'id, codigo, fecha, delegacionId, intervencionId, tipoSiniestro, jerarquia',
    });
    this.version(9).stores({
      roles: 'id, nombre, activo',
    });
  }
}

export const db = new SisPolDatabase();

export const DEFAULT_CONFIG: ConfiguracionSistema = {
  id: 'global-config',
  delegacionId: 'del-laguna-blanca',
  nombreInstitucion: 'POLICÍA DE LA PROVINCIA DE FORMOSA',
  unidadRegional: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN',
  dependencia: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
  siglasDependencia: 'DPC',
  subtituloReportes: 'CRIMINI-SISTEM - GESTIÓN POLICIAL Y PERICIAL',
  diasRetencionAuditoria: 90,
  pieDePagina: 'Documento Reservado de Uso Oficial Interno - Prohibida su divulgación sin autorización judicial.',
  logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
  textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
  logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
  textoDebajoLogoDerecho: 'D.G.P.C.',
  direccionDependencia: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
  contactoDependencia: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar',
  lineasMembrete: [
    { id: 'l-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
    { id: 'l-2', texto: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
    { id: 'l-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
    { id: 'l-4', texto: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    { id: 'l-5', texto: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
  ],
  jerarquias: [
    'Comisario General',
    'Comisario Mayor',
    'Comisario Inspector',
    'Comisario',
    'Subcomisario',
    'Oficial Principal',
    'Oficial Inspector',
    'Oficial Subinspector',
    'Oficial Ayudante',
    'Suboficial Mayor',
    'Suboficial Principal',
    'Sargento Ayudante',
    'Sargento 1°',
    'Sargento',
    'Cabo 1°',
    'Cabo',
    'Agente'
  ],
  gruposGuardia: [
    'Guardia A',
    'Guardia B',
    'Guardia C',
    'Guardia D',
    'Brigada de Investigaciones',
    'Oficina de Sumarios',
    'Sección Criminalística Pericial',
    'Sección Accidentología Vial',
    'Secretaría General'
  ],
  tiposGuardia: [
    'Brigada',
    'Servicios - Técnicos',
    'Administrativa',
    'Pericial',
    'Prevención',
    'Guardia de Prevención y Seguridad',
    'Comando Radioeléctrico'
  ],
  medicosForensesCatalogo: [
    'Dr. Guillermo Navarro (Médico Legista Forense)',
    'Dra. Claudia Montenegro (Médica Forense de Turno)',
    'Dr. Marcelo Gómez (Médico de Policía)',
    'Dr. Raúl Esteche (Médico Forense de Guardia)',
    'Dra. Silvina Aranda (Médica Legista)'
  ],
  tiposRequerimiento: [
    'Escalamiento de datos',
    'Resguardo de Evidencia',
    'Resguardo c/ Escalamiento',
    'Descarga de filmaciones',
    'Extracción forense de teléfono',
    'Análisis informático',
    'Informe pericial',
    'Inspección ocular pericial',
    'Balística y Rastros',
    'Planimetría y Fotografía'
  ],
  tiposOficio: [
    'Instrucción Penal Preparatoria (IPP)',
    'Causa Penal',
    'Exhorto Judicial',
    'Medida Cautelar',
    'Expediente Contravencional',
    'Actuación de Oficio',
    'Requerimiento Fiscal Preliminar'
  ],
  juzgadosFiscalias: [
    'UFI N° 1 - Delitos Complejos',
    'UFI N° 2 - Delitos Culposos y Siniestros Viales',
    'UFI N° 3 - Delitos Contra la Propiedad',
    'Juzgado de Garantías N° 1',
    'Juzgado de Garantías N° 2',
    'Juzgado Correccional N° 1',
    'Fiscalía de Instrucción Penal en Turno'
  ],
  dependenciasPoliciales: [
    'Comisaría Seccional 1ra',
    'Comisaría Seccional 2da',
    'Comisaría Seccional 3ra',
    'Comisaría Seccional 4ta',
    'Comisaría Seccional 5ta',
    'Comisaría de la Mujer y la Familia',
    'Dirección General de Investigaciones',
    'División Comando Radioeléctrico',
    'División Tránsito Policial'
  ],
  unidadesRegionales: [
    'Unidad Regional Uno (Formosa Capital)',
    'Unidad Regional Dos (Pirané)',
    'Unidad Regional Tres (Clorinda)',
    'Unidad Regional Cuatro (Laguna Blanca)',
    'Unidad Regional Cinco (Las Lomitas)',
    'Unidad Regional Seis (Ingeniero Juárez)',
    'Unidad Regional Siete (General Güemes)'
  ],
  destinosPoliciales: [
    'División Policía Científica Laguna Blanca',
    'División Investigación Cibercrimen',
    'Comisaría Laguna Blanca',
    'Comisaría Clorinda',
    'Destacamento Riacho He-Hé',
    'Comisaría El Espinillo',
    'Comisaría Misión Tacaaglé',
    'División Comando Radioeléctrico Policial',
    'División Tránsito Policial',
    'Dirección General de Policía Científica',
    'Comisaría Seccional 1ra',
    'Comisaría Seccional 2da',
    'Comisaría Seccional 3ra',
    'Comisaría Seccional 4ta'
  ],
  hechosCriminalistica: [
    'SECUESTRO Y APREHENSION',
    'SECUESTRO DE MOTOCICLETA RECUPERADA',
    'CONSTATACIÓN RELACIONADO A SINIESTRO VIAL',
    'HOMICIDIO EN OCASIÓN DE ROBO',
    'HURTO CALIFICADO',
    'ROBO AGRAVADO POR USO DE ARMA',
    'HALLAZGO DE ARMA DE FUEGO',
    'AVERIGUACIÓN DE ILÍCITO',
    'INSPECCIÓN OCULAR POR INCENDIO',
    'SUICIDIO - AUTOAGRESIÓN'
  ],
  viasSolicitud: [
    'Telefónica',
    'Radial (Frecuencia Policial)',
    'Nota Oficial Escrita',
    'Correo Electrónico Oficial',
    'Presencial en Guardia'
  ],
  tiposRecargo: [
    'Operativo nocturno saturación',
    'Prevención bancaria y comercial',
    'Evento deportivo masivo',
    'Custodia judicial fija',
    'Control vehicular y alcoholemia',
    'Refuerzo de guardia fin de semana',
    'Operativo especial de verano/invierno'
  ],
  condicionesInvolucrado: [
    'Demorado / Aprehendido',
    'Denunciante',
    'Damnificado / Víctima',
    'Testigo',
    'Imputado',
    'Conductor',
    'Acompañante',
    'Sospechoso',
    'Examinado Forense',
    'Otro'
  ],
  funcionesGuardiaCatalogo: [
    'Oficial de servicio – Perito de turno',
    'Oficial de guardia – Perito de turno',
    'Chofer – Fotógrafo',
    'Servicio despeje / prevención',
    'Perito auxiliar en Criminalística',
    'Planímetro de turno',
    'Fotógrafo pericial',
    'Técnico de laboratorio',
    'Operador de guardia'
  ],
  supabaseSyncHabilitado: false,
  inicioNroIntervencionCriminalistica: 3800,
  ultimoNroIntervencionCriminalistica: 3814,
  inicioNroIntervencionAccidentologica: 2500,
  ultimoNroIntervencionAccidentologica: 2584,
  ultimaHoraIntervencion: '18:28 hs.',
  inicioNroIO: 1,
  ultimoNroIO: 2,
  estructuraModulos: [
    { id: 'dashboard', label: 'Dashboard Ejecutivo', desc: 'KPIs y Estadísticas', orden: 1, padreId: null, visible: true },
    { id: 'personal', label: 'Personal y Legajos', desc: 'Nómina, Armas y Chalecos', orden: 2, padreId: null, visible: true },
    { id: 'grupos', label: 'Grupos', desc: 'Secciones de Guardia & Nómina', orden: 3, padreId: null, visible: true },
    { id: 'expedientes', label: 'Expedientes Judiciales', desc: 'Oficios, Tareas y PPI', orden: 4, padreId: null, visible: true },
    { id: 'falta-oficio', label: 'Casos Falta de Oficio', desc: 'Urgencias preliminares', orden: 5, padreId: null, visible: true },
    { id: 'moviles', label: 'Parque Automotor', desc: 'Móviles y Reparaciones', orden: 6, padreId: null, visible: true },
    { id: 'recargos', label: 'Recargos Operativos', desc: 'Servicios extraordinarios', orden: 7, padreId: null, visible: true },
    { id: 'guardias', label: 'Parte de Novedades', desc: 'Guardia & Criminalística', orden: 8, padreId: null, visible: true },
    { id: 'inspecciones', label: 'Inspecciones Oculares', desc: 'Intervenciones Criminalísticas', orden: 9, padreId: null, visible: true },
    { id: 'intervenciones', label: 'Intervenciones', desc: 'LC & Siniestros Viales', orden: 10, padreId: null, visible: true },
    { id: 'causas-policiales', label: 'Causas c/ Pers. Policial', desc: 'Hechos con Efectivos Policiales', orden: 11, padreId: null, visible: true },
    { id: 'personas', label: 'Personas', desc: 'Involucrados & Testigos', orden: 12, padreId: null, visible: true },
    { id: 'vehiculos', label: 'Vehículos', desc: 'Rodados en Siniestros Viales', orden: 13, padreId: null, visible: true },
    { id: 'forense', label: 'Forense Policial', desc: 'Médico y Examinados', orden: 14, padreId: null, visible: true },
    { id: 'licenciados', label: 'Licenciado', desc: 'Personal Profesional', orden: 15, padreId: null, visible: true },
    { id: 'informes-tecnicos', label: 'Informes Técnicos', desc: 'Oficios, Dictámenes & Elevación', orden: 16, padreId: null, visible: true },
    { id: 'numerario', label: 'Control de Folios', desc: 'Numerario y Asignación de Folios', orden: 17, padreId: null, visible: true },
    { id: 'usuarios', label: 'Gestión de Usuarios', desc: 'Roles, Permisos & Cuentas', orden: 18, padreId: null, visible: true },
    { id: 'config', label: 'Configuración & Membrete', desc: 'Ajustes, Membrete & Backups', orden: 19, padreId: null, visible: true },
  ],
};

export const DEFAULT_DELEGACIONES: DelegacionPolicial[] = [
  {
    id: 'del-laguna-blanca',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
    siglas: 'DPC-LB',
    unidadRegional: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN',
    ciudad: 'Laguna Blanca',
    direccion: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
    telefono: '3704-040169',
    email: 'pol.delgcrimlagunablanca@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'l-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'l-2', texto: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'l-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'l-4', texto: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'l-5', texto: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
  {
    id: 'del-clorinda',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA CLORINDA',
    siglas: 'DPC-CLO',
    unidadRegional: 'UNIDAD REGIONAL TRES - CLORINDA',
    ciudad: 'Clorinda',
    direccion: 'Av. San Martín N° 850 - Clorinda - C.P. 3610',
    telefono: '3718-422100',
    email: 'pol.delgcrimclorinda@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Clorinda.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'lc-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'lc-2', texto: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'lc-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA CLORINDA', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'lc-4', texto: 'Av. San Martín N° 850 - Clorinda - C.P. 3610', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'lc-5', texto: 'Tel.: 3718-422100 / E-mail: pol.delgcrimclorinda@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
  {
    id: 'del-formosa-central',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA FORMOSA CAPITAL',
    siglas: 'DPC-FSA',
    unidadRegional: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA CENTRAL',
    ciudad: 'Formosa Capital',
    direccion: 'Calle Saavedra N° 350 - Formosa Capital - C.P. 3600',
    telefono: '3704-428900',
    email: 'pol.cientificaformosa@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Dirección General Policía Científica Central.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'lf-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'lf-2', texto: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'lf-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA FORMOSA CAPITAL', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'lf-4', texto: 'Calle Saavedra N° 350 - Formosa Capital - C.P. 3600', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'lf-5', texto: 'Tel.: 3704-428900 / E-mail: pol.cientificaformosa@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
  {
    id: 'del-las-lomitas',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA LAS LOMITAS',
    siglas: 'DPC-LL',
    unidadRegional: 'UNIDAD REGIONAL CINCO - LAS LOMITAS',
    ciudad: 'Las Lomitas',
    direccion: 'Ruta Nacional 81 Km 1450 - Las Lomitas - C.P. 3630',
    telefono: '3715-432010',
    email: 'pol.delgcrimlaslomitas@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Delegación Las Lomitas.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'lll-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'lll-2', texto: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'lll-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA LAS LOMITAS', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'lll-4', texto: 'Ruta Nacional 81 Km 1450 - Las Lomitas - C.P. 3630', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'lll-5', texto: 'Tel.: 3715-432010 / E-mail: pol.delgcrimlaslomitas@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
  {
    id: 'del-el-colorado',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA EL COLORADO',
    siglas: 'DPC-COL',
    unidadRegional: 'UNIDAD REGIONAL DOS - PIRANÉ / EL COLORADO',
    ciudad: 'El Colorado',
    direccion: 'Av. 25 de Mayo y Calle Fontana - El Colorado - C.P. 3603',
    telefono: '3704-481120',
    email: 'pol.delgcrimelcolorado@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Delegación El Colorado.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'lcol-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'lcol-2', texto: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'lcol-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA EL COLORADO', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'lcol-4', texto: 'Av. 25 de Mayo y Calle Fontana - El Colorado - C.P. 3603', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'lcol-5', texto: 'Tel.: 3704-481120 / E-mail: pol.delgcrimelcolorado@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
  {
    id: 'del-pirane',
    nombre: 'DELEGACIÓN POLICÍA CIENTÍFICA PIRANÉ',
    siglas: 'DPC-PIR',
    unidadRegional: 'UNIDAD REGIONAL DOS - PIRANÉ',
    ciudad: 'Pirané',
    direccion: 'Calle Alberdi N° 420 - Pirané - C.P. 3622',
    telefono: '3717-461300',
    email: 'pol.delgcrimpirane@formosa.gov.ar',
    logoIzquierdoUrl: '/assets/aistudio/image_0de80603.png',
    textoDebajoLogoIzquierdo: '"La seguridad pública es una construcción colectiva"',
    logoDerechoUrl: '/assets/aistudio/ChatGPT_Image_25_mar_2026__11_53_05_a.m.-removebg-preview_0693dcbf.png',
    textoDebajoLogoDerecho: 'D.G.P.C.',
    pieDePagina: 'Documento Reservado de Uso Oficial Interno - Delegación Pirané.',
    activo: true,
    createdAt: new Date().toISOString(),
    lineasMembrete: [
      { id: 'lpir-1', texto: 'POLICÍA DE LA PROVINCIA DE FORMOSA', negrita: true, subrayado: false, tamano: 'xl', color: 'azul' },
      { id: 'lpir-2', texto: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA', negrita: true, subrayado: false, tamano: 'lg', color: 'azul' },
      { id: 'lpir-3', texto: 'DELEGACIÓN POLICÍA CIENTÍFICA PIRANÉ', negrita: true, subrayado: true, tamano: 'lg', color: 'azul' },
      { id: 'lpir-4', texto: 'Calle Alberdi N° 420 - Pirané - C.P. 3622', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
      { id: 'lpir-5', texto: 'Tel.: 3717-461300 / E-mail: pol.delgcrimpirane@formosa.gov.ar', negrita: false, subrayado: false, tamano: 'sm', color: 'gris' },
    ],
  },
];

export const DEFAULT_ROLES: RolSistema[] = [
  {
    id: 'rol-superusuario',
    nombre: 'Superusuario',
    descripcion: 'Control absoluto e irrestricto de toda la plataforma, delegaciones y auditoría forense del sistema.',
    color: 'purple',
    esSistema: true,
    modulosPermitidos: [
      'dashboard', 'personal', 'grupos', 'expedientes', 'falta-oficio',
      'moviles', 'recargos', 'guardias', 'inspecciones', 'intervenciones',
      'causas-policiales', 'accidentologia', 'personas', 'vehiculos',
      'forense', 'licenciados', 'informes-tecnicos', 'numerario',
      'usuarios', 'auditoria', 'config'
    ],
    acciones: {
      puedeCrear: true,
      puedeVer: true,
      puedeModificar: true,
      puedeEliminar: true,
      puedeExportarPdf: true,
      puedeExportarCsv: true,
      puedeVerOtrasDelegaciones: true,
      puedeModificarActuacionesCargadas: true,
      puedeAdministrarModulos: true,
      puedeResetearContadores: true,
      puedeRecargarOtrasDelegaciones: true,
      puedeGestionarUsuarios: true,
      puedeConfirmarFotografias: true,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rol-admin',
    nombre: 'Administrador',
    descripcion: 'Gestión integral departamental, control de personal, usuarios de delegación y orden de módulos.',
    color: 'blue',
    esSistema: true,
    modulosPermitidos: [
      'dashboard', 'personal', 'grupos', 'expedientes', 'falta-oficio',
      'moviles', 'recargos', 'guardias', 'inspecciones', 'intervenciones',
      'causas-policiales', 'accidentologia', 'personas', 'vehiculos',
      'forense', 'licenciados', 'informes-tecnicos', 'numerario',
      'usuarios', 'config'
    ],
    acciones: {
      puedeCrear: true,
      puedeVer: true,
      puedeModificar: true,
      puedeEliminar: true,
      puedeExportarPdf: true,
      puedeExportarCsv: true,
      puedeVerOtrasDelegaciones: true,
      puedeModificarActuacionesCargadas: true,
      puedeAdministrarModulos: true,
      puedeResetearContadores: false,
      puedeRecargarOtrasDelegaciones: true,
      puedeGestionarUsuarios: true,
      puedeConfirmarFotografias: true,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rol-perito',
    nombre: 'Oficial de Servicio / Perito',
    descripcion: 'Personal pericial a cargo de inspecciones oculares, levantamiento de rastros, accidentología y pericias.',
    color: 'emerald',
    esSistema: false,
    modulosPermitidos: [
      'dashboard', 'personal', 'guardias', 'inspecciones', 'intervenciones',
      'causas-policiales', 'accidentologia', 'expedientes', 'falta-oficio',
      'vehiculos', 'personas', 'forense', 'licenciados', 'informes-tecnicos', 'numerario'
    ],
    acciones: {
      puedeCrear: true,
      puedeVer: true,
      puedeModificar: true,
      puedeEliminar: false,
      puedeExportarPdf: true,
      puedeExportarCsv: true,
      puedeVerOtrasDelegaciones: false,
      puedeModificarActuacionesCargadas: true,
      puedeAdministrarModulos: false,
      puedeResetearContadores: false,
      puedeRecargarOtrasDelegaciones: false,
      puedeGestionarUsuarios: false,
      puedeConfirmarFotografias: true,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rol-operador',
    nombre: 'Operador de Guardia',
    descripcion: 'Efectivo asignado a la carga y seguimiento de novedades operativas del turno de guardia.',
    color: 'slate',
    esSistema: true,
    modulosPermitidos: [
      'dashboard', 'guardias', 'inspecciones', 'intervenciones',
      'vehiculos', 'personas', 'accidentologia', 'expedientes', 'falta-oficio'
    ],
    acciones: {
      puedeCrear: true,
      puedeVer: true,
      puedeModificar: false,
      puedeEliminar: false,
      puedeExportarPdf: true,
      puedeExportarCsv: false,
      puedeVerOtrasDelegaciones: false,
      puedeModificarActuacionesCargadas: false,
      puedeAdministrarModulos: false,
      puedeResetearContadores: false,
      puedeRecargarOtrasDelegaciones: false,
      puedeGestionarUsuarios: false,
      puedeConfirmarFotografias: false,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rol-instructor',
    nombre: 'Instructor Judicial / Sumariante',
    descripcion: 'Gestión de expedientes judiciales, oficios, requerimientos de fiscalías y resguardo de evidencia.',
    color: 'indigo',
    esSistema: false,
    modulosPermitidos: [
      'dashboard', 'expedientes', 'falta-oficio', 'inspecciones',
      'causas-policiales', 'personas', 'vehiculos', 'informes-tecnicos', 'numerario'
    ],
    acciones: {
      puedeCrear: true,
      puedeVer: true,
      puedeModificar: true,
      puedeEliminar: false,
      puedeExportarPdf: true,
      puedeExportarCsv: true,
      puedeVerOtrasDelegaciones: false,
      puedeModificarActuacionesCargadas: false,
      puedeAdministrarModulos: false,
      puedeResetearContadores: false,
      puedeRecargarOtrasDelegaciones: false,
      puedeGestionarUsuarios: false,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rol-auditor',
    nombre: 'Auditor de Gestión',
    descripcion: 'Supervisión y control de calidad institucional, auditoría de folios, novedades y estadísticas.',
    color: 'amber',
    esSistema: false,
    modulosPermitidos: [
      'dashboard', 'personal', 'expedientes', 'guardias', 'inspecciones',
      'intervenciones', 'accidentologia', 'numerario', 'auditoria'
    ],
    acciones: {
      puedeCrear: false,
      puedeVer: true,
      puedeModificar: false,
      puedeEliminar: false,
      puedeExportarPdf: true,
      puedeExportarCsv: true,
      puedeVerOtrasDelegaciones: true,
      puedeModificarActuacionesCargadas: false,
      puedeAdministrarModulos: false,
      puedeResetearContadores: false,
      puedeRecargarOtrasDelegaciones: false,
      puedeGestionarUsuarios: false,
    },
    activo: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_USUARIOS: UsuarioSistema[] = [
  {
    id: 'usr-cibercrimen-lb',
    apellidoYNombre: 'División Cibercrimen Laguna Blanca',
    email: 'divcibercrimenlagunablanca@gmail.com',
    username: 'cibercrimen',
    password: 'cibercrimen2026',
    delegacionId: 'del-laguna-blanca',
    rol: 'superusuario',
    puedeVerOtrasDelegaciones: true,
    delegacionesPermitidas: [
      'del-laguna-blanca',
      'del-clorinda',
      'del-formosa-central',
      'del-las-lomitas',
      'del-el-colorado',
      'del-pirane',
    ],
    modulosPermitidos: [
      'dashboard',
      'personal',
      'grupos',
      'expedientes',
      'falta-oficio',
      'moviles',
      'recargos',
      'guardias',
      'inspecciones',
      'intervenciones',
      'personas',
      'vehiculos',
      'forense',
      'licenciados',
      'informes-tecnicos',
      'numerario',
      'accidentologia',
      'usuarios',
      'config',
    ],
    puedeEliminar: true,
    activo: true,
    dni: '30445566',
    nombre: 'División Cibercrimen',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-superadmin',
    apellidoYNombre: 'Comisario Mayor D.G.P.C.',
    email: 'superadmin.dpc@formosa.gov.ar',
    username: 'superadmin',
    password: 'admin123',
    delegacionId: 'del-laguna-blanca',
    rol: 'superusuario',
    puedeVerOtrasDelegaciones: true,
    delegacionesPermitidas: [
      'del-laguna-blanca',
      'del-clorinda',
      'del-formosa-central',
      'del-las-lomitas',
      'del-el-colorado',
      'del-pirane',
    ],
    modulosPermitidos: [
      'dashboard',
      'personal',
      'grupos',
      'expedientes',
      'falta-oficio',
      'moviles',
      'recargos',
      'guardias',
      'inspecciones',
      'intervenciones',
      'personas',
      'vehiculos',
      'forense',
      'licenciados',
      'informes-tecnicos',
      'numerario',
      'accidentologia',
      'usuarios',
      'config',
    ],
    puedeEliminar: true,
    activo: true,
    dni: '28001122',
    nombre: 'Comisario Mayor D.G.P.C.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-lb',
    apellidoYNombre: 'Crio. Insp. ALVAREZ Marcos',
    email: 'alvarez.marcos@formosa.gov.ar',
    username: 'admin.lb',
    password: 'laguna123',
    delegacionId: 'del-laguna-blanca',
    rol: 'Administrador',
    puedeVerOtrasDelegaciones: false,
    delegacionesPermitidas: ['del-laguna-blanca'],
    modulosPermitidos: [
      'dashboard',
      'personal',
      'grupos',
      'expedientes',
      'falta-oficio',
      'moviles',
      'recargos',
      'guardias',
      'inspecciones',
      'intervenciones',
      'personas',
      'vehiculos',
      'forense',
      'licenciados',
      'informes-tecnicos',
      'numerario',
      'accidentologia',
      'usuarios',
      'config',
    ],
    puedeEliminar: true,
    activo: true,
    dni: '32456789',
    nombre: 'ALVAREZ Marcos',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-operador-lb',
    apellidoYNombre: 'Of. Ppal. GOMEZ Valeria',
    email: 'gomez.valeria@formosa.gov.ar',
    username: 'operador.lb',
    password: 'operador123',
    delegacionId: 'del-laguna-blanca',
    rol: 'Operador',
    puedeVerOtrasDelegaciones: false,
    delegacionesPermitidas: ['del-laguna-blanca'],
    modulosPermitidos: [
      'dashboard',
      'guardias',
      'inspecciones',
      'expedientes',
      'falta-oficio',
      'personas',
      'vehiculos',
    ],
    puedeEliminar: false,
    activo: true,
    dni: '35112449',
    nombre: 'GOMEZ Valeria',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-clorinda',
    apellidoYNombre: 'Subcrio. FERNANDEZ Raúl',
    email: 'fernandez.raul@formosa.gov.ar',
    username: 'admin.clorinda',
    password: 'clorinda123',
    delegacionId: 'del-clorinda',
    rol: 'Administrador',
    puedeVerOtrasDelegaciones: false,
    delegacionesPermitidas: ['del-clorinda'],
    modulosPermitidos: [
      'dashboard',
      'personal',
      'grupos',
      'expedientes',
      'falta-oficio',
      'moviles',
      'recargos',
      'guardias',
      'inspecciones',
      'personas',
      'vehiculos',
      'forense',
      'usuarios',
      'config',
    ],
    puedeEliminar: true,
    activo: true,
    dni: '30882199',
    nombre: 'FERNANDEZ Raúl',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-supervisor-regional',
    apellidoYNombre: 'Crio. Mayor BENITEZ Hugo',
    email: 'benitez.hugo@formosa.gov.ar',
    username: 'supervisor.dpc',
    password: 'super123',
    delegacionId: 'del-formosa-central',
    rol: 'Administrador',
    puedeVerOtrasDelegaciones: true,
    delegacionesPermitidas: ['del-formosa-central', 'del-laguna-blanca', 'del-clorinda'],
    modulosPermitidos: [
      'dashboard',
      'expedientes',
      'guardias',
      'inspecciones',
      'moviles',
      'recargos',
    ],
    puedeEliminar: false,
    activo: true,
    dni: '27554901',
    nombre: 'BENITEZ Hugo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_LICENCIADOS: LicenciadoTurno[] = [
  {
    id: 'lic-1',
    personalId: 'pers-2',
    nombreLicenciado: 'Of. Ppal. GOMEZ, Valeria Beatriz',
    jerarquia: 'Oficial Principal',
    dni: '35112449',
    especialidad: 'Licenciatura en Criminalística',
    matriculaNro: 'MP-0422',
    turno: 'Guardia de 24 hs (07:00 a 07:00 hs)',
    fecha: new Date().toISOString().slice(0, 10),
    horaIngreso: '07:00',
    horaEgreso: '07:00',
    totalPericias: 4,
    hastaHs: '18:30 hs.',
    observaciones: 'A cargo de peritajes en siniestros y levantamiento de huellas e indicios balísticos.',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lic-2',
    personalId: 'pers-1',
    nombreLicenciado: 'Crio. ALVAREZ, Marcos Emilio',
    jerarquia: 'Comisario',
    dni: '32456789',
    especialidad: 'Licenciatura en Accidentología y Seguridad Vial',
    matriculaNro: 'MP-0188',
    turno: 'Turno Rotativo Especial',
    fecha: new Date().toISOString().slice(0, 10),
    horaIngreso: '08:00',
    horaEgreso: '20:00',
    totalPericias: 2,
    hastaHs: '19:45 hs.',
    observaciones: 'Relevamiento planimétrico y reconstrucción cinemática de siniestro vial sobre RN 86.',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_INFORMES_TECNICOS: InformeTecnico[] = [
  {
    id: 'inf-1',
    fecha: new Date().toISOString().slice(0, 10),
    oficioNro: 'Of. Judicial N° 142/26',
    tipoExpediente: 'Instrucción Penal Preparatoria (IPP)',
    nroExpediente: '104/26',
    anio: 2026,
    caratula: 'NN S/ ROBO CALIFICADO POR EL USO DE ARMA DE FUEGO',
    juzgado: 'Juzgado de Instrucción y Correccional N° 2 - Clorinda',
    dependenciaInterviniente: 'Comisaría Seccional Laguna Blanca',
    personalInstruccion: 'Of. Insp. RUIZ Darío (Instructor Policial)',
    licenciadoACargoId: 'pers-2',
    licenciadoACargoNombre: 'Lic. en Criminalística - Of. Ppal. GOMEZ Valeria',
    anexoOficioNombre: 'Oficio_Judicial_142_SolicitudPericia.pdf',
    anexoInformeNombre: 'Informe_Tecnico_Pericial_Balistico_104_26.pdf',
    dictamenTexto: 'Se procedió al cotejo microscópico balístico sobre vainas servidas calibre 9x19 mm secuestradas en el lugar del hecho, arrojando correspondencia unívoca con el percutor del arma secuestrada.',
    fechaElevacion: new Date().toISOString().slice(0, 10),
    quienRecibio: 'Mesa de Entradas Juzgado Instrucción N° 2 - Recibió: Sec. Dr. MARTÍNEZ Juan',
    cargoReceptor: 'Secretario Actuario',
    estado: 'Elevado',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inf-2',
    fecha: new Date().toISOString().slice(0, 10),
    oficioNro: 'Of. Fiscal N° 88/26',
    tipoExpediente: 'Causa Penal',
    nroExpediente: '79/26',
    anio: 2026,
    caratula: 'BENITEZ S/ HOMICIDIO CULPOSO EN SINIESTRO VIAL',
    juzgado: 'UFI N° 2 - Delitos Culposos y Siniestros Viales',
    dependenciaInterviniente: 'Comisaría El Espinillo',
    personalInstruccion: 'Subcrio. FERNANDEZ Raúl',
    licenciadoACargoId: 'pers-1',
    licenciadoACargoNombre: 'Lic. en Accidentología Vial - Crio. ALVAREZ Marcos',
    anexoOficioNombre: 'Oficio_Fiscal_88_RequerimientoAccidentologico.pdf',
    anexoInformeNombre: 'Pericia_Mecanica_Accidentologia_79_26.pdf',
    dictamenTexto: 'Se determinó la velocidad crítica de derrape y punto de impacto primario en intersección de RN 86 Km 1342. Rodado embistente circulaba a exceso de velocidad reglamentaria.',
    estado: 'En Confección',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SERIES_NUMERARIO: SerieNumerario[] = [
  {
    id: 'serie-oficio-jefatura',
    nombre: 'Oficio Jefatura',
    prefijo: 'Oficio J N°',
    anio: 2026,
    limiteFolios: 1000,
    columnas: 20,
    color: 'blue',
    delegacionId: 'del-laguna-blanca',
    descripcion: 'Oficios judiciales y comunicaciones oficiales emitidas por Jefatura de Delegación',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'serie-oficio-vicedireccion',
    nombre: 'Oficio Vicedirección',
    prefijo: 'Oficio V N°',
    anio: 2026,
    limiteFolios: 1000,
    columnas: 20,
    color: 'indigo',
    delegacionId: 'del-laguna-blanca',
    descripcion: 'Oficios, informes elevados y resoluciones de Vicedirección y Subjefatura',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'serie-memorandums',
    nombre: 'Memorándums',
    prefijo: 'Mem. N°',
    anio: 2026,
    limiteFolios: 1000,
    columnas: 20,
    color: 'emerald',
    delegacionId: 'del-laguna-blanca',
    descripcion: 'Memorándums internos, disposiciones operativas y directivas de servicio',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'serie-expedientes',
    nombre: 'Expedientes',
    prefijo: 'Exp. N°',
    anio: 2026,
    limiteFolios: 1000,
    columnas: 20,
    color: 'amber',
    delegacionId: 'del-laguna-blanca',
    descripcion: 'Control de folios para carátulas de expedientes periciales y sumarios',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'serie-circulares',
    nombre: 'Circulares',
    prefijo: 'Circ. N°',
    anio: 2026,
    limiteFolios: 1000,
    columnas: 20,
    color: 'purple',
    delegacionId: 'del-laguna-blanca',
    descripcion: 'Circulares generales y notificaciones de interés institucional',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_FOLIOS: FolioAsignado[] = [
  {
    id: 'fol-1',
    serieId: 'serie-oficio-jefatura',
    numero: 1,
    codigoCaratula: 'Oficio J N° 1/2026',
    categoriaDocumento: 'Oficio Judicial',
    anio: 2026,
    asunto: 'Elevación de informe pericial balístico s/ Causa N° 104/26',
    destinatario: 'Juzgado de Instrucción y Correccional N° 2 - Clorinda',
    solicitante: 'Crio. Insp. ALVAREZ Marcos',
    observaciones: 'Remitido con constancia de recepción de mesa de entradas actuaria',
    fechaAsignacion: '2026-10-15',
    horaAsignacion: '09:30',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-2',
    serieId: 'serie-oficio-jefatura',
    numero: 2,
    codigoCaratula: 'Oficio J N° 2/2026',
    categoriaDocumento: 'Oficio Judicial',
    anio: 2026,
    asunto: 'Requerimiento técnico pericial accidentológico RN 86',
    destinatario: 'Fiscalía de Instrucción Penal en Turno',
    solicitante: 'Of. Ppal. GOMEZ Valeria',
    observaciones: 'Tramitado de urgencia con relevamiento cinemático',
    fechaAsignacion: '2026-10-18',
    horaAsignacion: '11:15',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-15',
    serieId: 'serie-oficio-jefatura',
    numero: 15,
    codigoCaratula: 'Oficio J N° 15/2026',
    categoriaDocumento: 'Oficio Judicial',
    anio: 2026,
    asunto: 'Resguardo de evidencia digital y extracción forense UFED',
    destinatario: 'UFI N° 1 - Delitos Complejos',
    solicitante: 'Of. Insp. RUIZ Darío',
    fechaAsignacion: '2026-10-24',
    horaAsignacion: '14:20',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  // Bloque por rango continuo 21 al 25
  {
    id: 'fol-21',
    serieId: 'serie-oficio-jefatura',
    numero: 21,
    codigoCaratula: 'Oficio J N° 21-25/2026',
    categoriaDocumento: 'Expediente',
    anio: 2026,
    asunto: 'Actuación prevencional integral s/ Siniestro Vial con víctimas múltiples',
    destinatario: 'Juzgado de Instrucción y Correccional en Turno',
    solicitante: 'Crio. ALVAREZ Marcos',
    esRango: true,
    rangoDesde: 21,
    rangoHasta: 25,
    fechaAsignacion: '2026-10-26',
    horaAsignacion: '16:45',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-22',
    serieId: 'serie-oficio-jefatura',
    numero: 22,
    codigoCaratula: 'Oficio J N° 21-25/2026',
    categoriaDocumento: 'Expediente',
    anio: 2026,
    asunto: 'Actuación prevencional integral s/ Siniestro Vial con víctimas múltiples (Cuerpo 2)',
    destinatario: 'Juzgado de Instrucción y Correccional en Turno',
    solicitante: 'Crio. ALVAREZ Marcos',
    esRango: true,
    rangoDesde: 21,
    rangoHasta: 25,
    fechaAsignacion: '2026-10-26',
    horaAsignacion: '16:45',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-23',
    serieId: 'serie-oficio-jefatura',
    numero: 23,
    codigoCaratula: 'Oficio J N° 21-25/2026',
    categoriaDocumento: 'Expediente',
    anio: 2026,
    asunto: 'Actuación prevencional integral s/ Siniestro Vial con víctimas múltiples (Cuerpo 3)',
    destinatario: 'Juzgado de Instrucción y Correccional en Turno',
    solicitante: 'Crio. ALVAREZ Marcos',
    esRango: true,
    rangoDesde: 21,
    rangoHasta: 25,
    fechaAsignacion: '2026-10-26',
    horaAsignacion: '16:45',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-24',
    serieId: 'serie-oficio-jefatura',
    numero: 24,
    codigoCaratula: 'Oficio J N° 21-25/2026',
    categoriaDocumento: 'Expediente',
    anio: 2026,
    asunto: 'Actuación prevencional integral s/ Siniestro Vial con víctimas múltiples (Cuerpo 4)',
    destinatario: 'Juzgado de Instrucción y Correccional en Turno',
    solicitante: 'Crio. ALVAREZ Marcos',
    esRango: true,
    rangoDesde: 21,
    rangoHasta: 25,
    fechaAsignacion: '2026-10-26',
    horaAsignacion: '16:45',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-25',
    serieId: 'serie-oficio-jefatura',
    numero: 25,
    codigoCaratula: 'Oficio J N° 21-25/2026',
    categoriaDocumento: 'Expediente',
    anio: 2026,
    asunto: 'Actuación prevencional integral s/ Siniestro Vial con víctimas múltiples (Anexo pericial)',
    destinatario: 'Juzgado de Instrucción y Correccional en Turno',
    solicitante: 'Crio. ALVAREZ Marcos',
    esRango: true,
    rangoDesde: 21,
    rangoHasta: 25,
    fechaAsignacion: '2026-10-26',
    horaAsignacion: '16:45',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  // Muestras en serie Memorándums
  {
    id: 'fol-mem-1',
    serieId: 'serie-memorandums',
    numero: 1,
    codigoCaratula: 'Mem. N° 1/2026',
    categoriaDocumento: 'Memorándum',
    anio: 2026,
    asunto: 'Protocolo de actuación pericial en recargos de fin de semana',
    destinatario: 'Personal de Guardia y Peritos',
    solicitante: 'Jefatura de División',
    fechaAsignacion: '2026-10-02',
    horaAsignacion: '08:00',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fol-mem-2',
    serieId: 'serie-memorandums',
    numero: 2,
    codigoCaratula: 'Mem. N° 2/2026',
    categoriaDocumento: 'Memorándum',
    anio: 2026,
    asunto: 'Cronograma de relevamiento y mantenimiento vehicular preventivo',
    destinatario: 'Responsable de Parque Automotor',
    solicitante: 'Jefatura de División',
    fechaAsignacion: '2026-10-10',
    horaAsignacion: '10:00',
    delegacionId: 'del-laguna-blanca',
    createdAt: new Date().toISOString(),
  },
];

// Semilla inicial de datos para demostración inmediata
export async function seedInitialDataIfEmpty() {
  // 1. Asegurar siempre existencia de Delegaciones oficiales
  const countDel = await db.delegaciones.count();
  if (countDel < DEFAULT_DELEGACIONES.length) {
    await db.delegaciones.bulkPut(DEFAULT_DELEGACIONES);
  }

  // 2. Asegurar siempre existencia de TODOS los usuarios predefinidos (incluyendo cibercrimen y superadmin)
  for (const usr of DEFAULT_USUARIOS) {
    const existing = await db.usuarios.get(usr.id);
    if (!existing || !existing.username || !existing.password) {
      await db.usuarios.put(usr);
    }
  }

  // Sanear usuario legacy si existía sin username
  try {
    const legacy = await db.usuarios.get('usr-1');
    if (legacy && !legacy.username) {
      await db.usuarios.delete('usr-1');
    }
  } catch (e) {
    // ignore
  }

  // 3. Asegurar configuración inicial
  const countConf = await db.configuracion.count();
  if (countConf === 0) {
    await db.configuracion.put(DEFAULT_CONFIG);
  }

  const countPersonal = await db.personal.count();
  if (countPersonal > 0) {
    // Sanear registros existentes para asegurar que pertenezcan a Laguna Blanca si no tienen delegacionId
    try {
      const [allPersonal, allExp, allCasos, allMov, allRec, allPart, allIns, allGrp] =
        await Promise.all([
          db.personal.toArray(),
          db.expedientes.toArray(),
          db.casosFaltaOficio.toArray(),
          db.moviles.toArray(),
          db.recargos.toArray(),
          db.partesGuardia.toArray(),
          db.inspeccionesOculares.toArray(),
          db.grupos.toArray(),
        ]);

      const fixPers = allPersonal.filter((p) => !p.delegacionId);
      if (fixPers.length > 0) {
        await db.personal.bulkPut(fixPers.map((p) => ({ ...p, delegacionId: 'del-laguna-blanca' })));
      }

      const fixExp = allExp.filter((e) => !e.delegacionId);
      if (fixExp.length > 0) {
        await db.expedientes.bulkPut(fixExp.map((e) => ({ ...e, delegacionId: 'del-laguna-blanca' })));
      }

      const fixCasos = allCasos.filter((c) => !c.delegacionId);
      if (fixCasos.length > 0) {
        await db.casosFaltaOficio.bulkPut(fixCasos.map((c) => ({ ...c, delegacionId: 'del-laguna-blanca' })));
      }

      const fixMov = allMov.filter((m) => !m.delegacionId);
      if (fixMov.length > 0) {
        await db.moviles.bulkPut(fixMov.map((m) => ({ ...m, delegacionId: 'del-laguna-blanca' })));
      }

      const fixRec = allRec.filter((r) => !r.delegacionId);
      if (fixRec.length > 0) {
        await db.recargos.bulkPut(fixRec.map((r) => ({ ...r, delegacionId: 'del-laguna-blanca' })));
      }

      const fixPart = allPart.filter((p) => !p.delegacionId);
      if (fixPart.length > 0) {
        await db.partesGuardia.bulkPut(fixPart.map((p) => ({ ...p, delegacionId: 'del-laguna-blanca' })));
      }

      const fixIns = allIns.filter((i) => !i.delegacionId);
      if (fixIns.length > 0) {
        await db.inspeccionesOculares.bulkPut(fixIns.map((i) => ({ ...i, delegacionId: 'del-laguna-blanca' })));
      }

      const fixGrp = allGrp.filter((g) => !g.delegacionId);
      if (fixGrp.length > 0) {
        await db.grupos.bulkPut(fixGrp.map((g) => ({ ...g, delegacionId: 'del-laguna-blanca' })));
      }
    } catch {
      // ignore
    }

    // Asegurar existencia de licenciados e informes técnicos si la tabla está vacía
    const countLic = await db.licenciados.count();
    if (countLic === 0) {
      await db.licenciados.bulkPut(DEFAULT_LICENCIADOS);
    }
    const countInf = await db.informesTecnicos.count();
    if (countInf === 0) {
      await db.informesTecnicos.bulkPut(DEFAULT_INFORMES_TECNICOS);
    }
    const countSeries = await db.seriesNumerario.count();
    if (countSeries === 0) {
      await db.seriesNumerario.bulkPut(DEFAULT_SERIES_NUMERARIO);
      await db.folios.bulkPut(DEFAULT_FOLIOS);
    }
    const countRoles = await db.roles.count();
    if (countRoles === 0) {
      await db.roles.bulkPut(DEFAULT_ROLES);
    }
    return;
  }

  // 2. Personal policial
  const p1: Personal = {
    id: 'pers-1',
    apellidoYNombre: 'ALVAREZ, Marcos Emilio',
    dni: '32456789',
    sexo: 'M',
    jerarquia: 'Comisario',
    plaza: 'P-1044',
    fechaNacimiento: '1984-05-12',
    estadoCivil: 'Casado',
    domicilio: 'Av. San Martín 1420',
    email: 'marcos.alvarez@policia.gob.ar',
    telefono: '3704-551122',
    seccionGrupo: 'Guardia A',
    estado: 'Activo',
    licenciaNro: 'B-32456789',
    licenciaCategoria: 'B2 / Profesional C',
    licenciaVencimiento: '2027-11-20',
    obraSocialNro: 'IOSP-99212',
    credencialNro: 'POL-0455',
    armamento: {
      marca: 'Bersa',
      modelo: 'Thunder 9 Pro',
      serieNro: 'F92810',
      calibre: '9x19 mm',
      secuestradoORetenido: false,
    },
    chaleco: {
      serieNro: 'RB2-8841',
      talla: 'L',
      secuestradoORetenido: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p2: Personal = {
    id: 'pers-2',
    apellidoYNombre: 'GOMEZ, Valeria Beatriz',
    dni: '36112233',
    sexo: 'F',
    jerarquia: 'Oficial Principal',
    plaza: 'P-1280',
    fechaNacimiento: '1990-08-25',
    estadoCivil: 'Soltera',
    domicilio: 'Calle Rivadavia 850',
    email: 'valeria.gomez@policia.gob.ar',
    telefono: '3704-884433',
    seccionGrupo: 'Guardia A',
    estado: 'Activo',
    licenciaNro: 'B-36112233',
    licenciaCategoria: 'B1',
    licenciaVencimiento: '2026-12-15',
    obraSocialNro: 'IOSP-10492',
    credencialNro: 'POL-0899',
    armamento: {
      marca: 'Taurus',
      modelo: 'PT 92 AFS',
      serieNro: 'T39401',
      calibre: '9x19 mm',
      secuestradoORetenido: false,
    },
    chaleco: {
      serieNro: 'ARM-5501',
      talla: 'M',
      secuestradoORetenido: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p3: Personal = {
    id: 'pers-3',
    apellidoYNombre: 'BENITEZ, Ramón Ignacio',
    dni: '29881245',
    sexo: 'M',
    jerarquia: 'Sargento 1°',
    plaza: 'P-0932',
    fechaNacimiento: '1981-02-14',
    estadoCivil: 'Casado',
    domicilio: 'B° Eva Perón Mz 14 C 8',
    email: 'ramon.benitez@policia.gob.ar',
    telefono: '3704-229988',
    seccionGrupo: 'Guardia A',
    estado: 'Activo',
    licenciaNro: 'P-29881245',
    licenciaCategoria: 'D2 Transporte / Móvil',
    licenciaVencimiento: '2027-04-10',
    obraSocialNro: 'IOSP-77211',
    credencialNro: 'POL-0312',
    armamento: {
      marca: 'Bersa',
      modelo: 'TPR 9',
      serieNro: 'K88129',
      calibre: '9x19 mm',
      secuestradoORetenido: false,
    },
    chaleco: {
      serieNro: 'DEF-9012',
      talla: 'XL',
      secuestradoORetenido: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p4: Personal = {
    id: 'pers-4',
    apellidoYNombre: 'CABRERA, Luciana Soledad',
    dni: '38990112',
    sexo: 'F',
    jerarquia: 'Oficial Subinspector',
    plaza: 'P-1540',
    fechaNacimiento: '1995-11-03',
    estadoCivil: 'Soltera',
    domicilio: 'Calle Fontana 320',
    email: 'luciana.cabrera@policia.gob.ar',
    telefono: '3704-667788',
    seccionGrupo: 'Guardia B',
    estado: 'Licencia Médica',
    licenciaNro: 'B-38990112',
    licenciaCategoria: 'B1',
    licenciaVencimiento: '2026-11-05',
    obraSocialNro: 'IOSP-99110',
    credencialNro: 'POL-1102',
    armamento: {
      marca: 'Bersa',
      modelo: 'Thunder 9',
      serieNro: 'G44120',
      calibre: '9x19 mm',
      secuestradoORetenido: true,
      causaSecuestro: 'Retención preventiva por licencia médica prolongada art. 45',
    },
    chaleco: {
      serieNro: 'DEF-4411',
      talla: 'S',
      secuestradoORetenido: true,
      causaSecuestro: 'Depositado en Sala de Armas por licencia médica',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.personal.bulkPut([p1, p2, p3, p4]);

  // 3. Móviles Policiales
  const m1: MovilPolicial = {
    id: 'mov-301',
    tipo: 'Patrullero',
    marca: 'Toyota',
    modelo: 'Corolla 2.0 SEG',
    dominioPatente: 'AF 342 PL',
    nroMovilInterno: 'M-301',
    dependenciaAsignada: 'División Criminalística',
    kilometrajeActual: 48500,
    condicionGeneral: 'Bueno',
    estadoOperativo: 'En Servicio',
    ultimoServiceKm: 40000,
    ultimoServiceFecha: '2026-06-15',
    proximoServiceKm: 50000,
    vencimientoRTO: '2027-02-15',
    aseguradora: 'Nación Seguros S.A.',
    nroPoliza: 'POL-992318',
    vencimientoSeguro: '2027-01-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const m2: MovilPolicial = {
    id: 'mov-305',
    tipo: 'Camioneta',
    marca: 'Ford',
    modelo: 'Ranger 4x4 3.2 TDCi',
    dominioPatente: 'AD 910 QR',
    nroMovilInterno: 'M-305',
    dependenciaAsignada: 'División Accidentología Vial',
    kilometrajeActual: 112400,
    condicionGeneral: 'Regular',
    estadoOperativo: 'En Taller Mecánico',
    ultimoServiceKm: 100000,
    ultimoServiceFecha: '2026-03-20',
    proximoServiceKm: 110000,
    vencimientoRTO: '2026-11-01', // Próximo a vencer en días
    aseguradora: 'Provincia Seguros',
    nroPoliza: 'PS-449102',
    vencimientoSeguro: '2026-10-30', // Alerta por vencer
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const m3: MovilPolicial = {
    id: 'mov-110',
    tipo: 'Motovehículo',
    marca: 'Yamaha',
    modelo: 'TDM 900',
    dominioPatente: 'A 045 TRP',
    nroMovilInterno: 'M-110',
    dependenciaAsignada: 'Comando Radioeléctrico',
    kilometrajeActual: 32100,
    condicionGeneral: 'Bueno',
    estadoOperativo: 'En Servicio',
    ultimoServiceKm: 30000,
    ultimoServiceFecha: '2026-08-10',
    proximoServiceKm: 35000,
    vencimientoRTO: '2027-08-15',
    aseguradora: 'Nación Seguros S.A.',
    nroPoliza: 'POL-100293',
    vencimientoSeguro: '2027-05-20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.moviles.bulkPut([m1, m2, m3]);

  // Reparaciones de demostración
  const rep1: ReparacionMecanica = {
    id: 'rep-1',
    movilId: 'mov-305',
    fecha: '2026-10-18',
    kilometraje: 112400,
    tipoIntervencion: 'Frenos',
    tallerProveedor: 'Taller Mecánico Central Policial',
    descripcion: 'Cambio de pastillas y rectificación de discos delanteros, purgado de circuito hidráulico ABS.',
    costoPresupuesto: 185000,
    repuestosCambiados: 'Juego pastillas de freno cerámicas, líquido DOT 4',
    createdAt: new Date().toISOString(),
  };
  await db.reparaciones.put(rep1);

  // 4. Expedientes Judiciales & Resguardo de Evidencia
  const exp1: ExpedienteJudicial = {
    id: 'exp-101',
    nroOficioLetras: 'OF-Nº 458/26-UFI1',
    nroExpediente: 'IPP-04-00-019283-26',
    caratulaOrigen: 'C/ NN S/ ROBO AGRAVADO EN POBLADO Y EN BANDA',
    fechaRegistro: '2026-10-14',
    juzgadoFiscalia: 'UFI N° 1 - Delitos Complejos',
    dependenciaSolicitante: 'Comisaría Seccional 2da',
    tipoOficio: 'Instrucción Penal Preparatoria (IPP)',
    tipoRequerimiento: 'Resguardo de Evidencia',
    tareaRealizada: 'Extracción de registros telefónicos y pericia fotográfica digital de terminales secuestradas.',
    resumen: 'Se recibe solicitud de pericia digital y resguardo de evidencia informática. Se vinculan tres personas secuestradas con teléfonos.',
    observaciones: 'Entregado con cadena de custodia firmada por perito interviniente.',
    estadoEntrega: 'Entregado',
    fechaElevacion: '2026-10-17',
    personalElevo: 'Of. Ppal. GOMEZ Valeria',
    ppi: {
      tienePPI: false,
    },
    personasVinculadas: [
      { id: 'pv-1', apellidoYNombre: 'SOSA, Lautaro Andrés', dni: '40192834', observaciones: 'Titular celular Samsung Galaxy' },
      { id: 'pv-2', apellidoYNombre: 'FERREYRA, Brian Gastón', dni: '41992019', observaciones: 'Titular celular Motorola G20' },
      { id: 'pv-3', apellidoYNombre: 'MENDOZA, Carlos Ariel', dni: '38192004', observaciones: 'Titular celular iPhone 11' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const exp2: ExpedienteJudicial = {
    id: 'exp-102',
    nroOficioLetras: 'OF-Nº 512/26-UFI2',
    nroExpediente: 'IPP-04-00-020119-26',
    caratulaOrigen: 'GIMENEZ ROBERTO S/ LESIONES CULPOSAS EN ACCIDENTE DE TRÁNSITO',
    fechaRegistro: '2026-10-19',
    juzgadoFiscalia: 'UFI N° 2 - Delitos Culposos y Siniestros Viales',
    dependenciaSolicitante: 'División Tránsito Policial',
    tipoOficio: 'Causa Penal',
    tipoRequerimiento: 'Inspección ocular pericial',
    tareaRealizada: 'Relevamiento planimétrico y fotográfico en intersección semaforizada.',
    resumen: 'Pericia accidentológica con determinación de punto de impacto y cálculo de velocidad aproximada.',
    estadoEntrega: 'No entregado',
    ppi: {
      tienePPI: true,
      jerarquia: 'Cabo 1°',
      apellidoYNombre: 'RODRIGUEZ, Matías',
      dni: '35889012',
    },
    personasVinculadas: [
      { id: 'pv-4', apellidoYNombre: 'GIMENEZ, Roberto', dni: '28192301' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.expedientes.bulkPut([exp1, exp2]);

  // 5. Casos Falta de Oficio
  const cfo1: CasoFaltaOficio = {
    id: 'cfo-201',
    fechaRegistro: '2026-10-18',
    origenIntervencion: 'Urgencia dispuesta por Fiscal de Turno vía telefónica',
    dependenciaSolicitante: 'Comisaría Seccional 1ra',
    tipoRequerimiento: 'Resguardo de Evidencia',
    tareaRealizada: 'Descarga inmediata de DVR de cámaras de seguridad en banco céntrico antes del sobreescritura de 72 hs.',
    personasVinculadas: [
      { id: 'pv-5', apellidoYNombre: 'MORALES, Javier Esteban', dni: '33100293' },
      { id: 'pv-6', apellidoYNombre: 'CASTILLO, Nora Mabel', dni: '27889110' },
    ],
    resumen: 'Resguardo preventivo urgente de filmaciones de seguridad. Se esperan actuaciones formales de Fiscalía.',
    estado: 'Pendiente',
    createdAt: new Date().toISOString(),
  };

  await db.casosFaltaOficio.put(cfo1);

  // 6. Parte de Novedades de Guardia correlativo (idéntico al modelo de imagen de las fotos provistas por el usuario)
  const añoActual = 2026;
  const parte1: ParteNovedadesGuardia = {
    id: 'parte-2026-10-20',
    fechaInicio: '2026-10-20',
    horaInicio: '19:00',
    fechaFin: '2026-10-21',
    horaFin: '07:00',
    grupoGuardia: 'Guardia A',
    funcionesPersonal: [
      { id: 'f-1', funcion: 'Oficial de servicio – Perito de turno', personalNombre: 'Crio. ALVAREZ, Marcos Emilio' },
      { id: 'f-2', funcion: 'Oficial de guardia – Perito de turno', personalNombre: 'Of. Ppal. GOMEZ, Valeria Beatriz' },
      { id: 'f-3', funcion: 'Chofer – Fotógrafo', personalNombre: 'Sgto. 1° BENITEZ, Ramón Ignacio' },
      { id: 'f-4', funcion: 'Servicio despeje boliche zona Sur', personalNombre: 'Cabo 1° TORRES, Cristian' },
      { id: 'f-5', funcion: 'Oficina Carga examinados Forense Policial', personalNombre: 'Of. Ayte. DIAZ, Florencia' },
      { id: 'f-6', funcion: 'Fotógrafo – Auxiliar', personalNombre: 'Sgto. PAREDES, Marcelo' },
    ],
    forense: {
      medicoNombre: 'Dr. Guillermo Navarro (Médico Legista Forense)',
      totalExaminados: 40,
      examinadosHastaHs: '06:30 hs.',
    },
    movilesAfectados: [
      { id: 'ma-1', descripcion: 'Móvil M-301 Toyota Corolla (Patrullero)', estado: 'En servicio' },
      { id: 'ma-2', descripcion: 'Móvil M-305 Ford Ranger (Criminalística)', estado: 'Fuera de servicio' },
      { id: 'ma-3', descripcion: 'Móvil M-110 Yamaha TDM (Prevención)', estado: 'En servicio' },
    ],
    intervenciones: [
      {
        id: 'int-3812',
        parteId: 'parte-2026-10-20',
        nroCorrelativo: 3812,
        codigoIntervencion: `01 INTERVENCIÓN CRIMINALÍSTICA Nº 3812 /${añoActual}-DPC.`,
        tipoIntervencion: 'Criminalística',
        hecho: 'SECUESTRO Y APREHENSION',
        solicitudHora: '18:28 hs.',
        solicitudVia: 'vía telefónica.',
        inspeccionFecha: '2026-10-20',
        inspeccionHora: '18:45',
        inspeccionLugar: 'Av. 25 de Mayo y Calle Mitre',
        dependencia: 'Comisaría Seccional 1ra',
        referencia: 'En causa caratulada s/ Tentativa de Robo y Tenencia de Arma de Fuego',
        involucrados: [
          {
            id: 'inv-1',
            apellidoYNombre: 'MARTINEZ, Lucas Joaquín',
            dni: '43990122',
            edad: 23,
            funcionEnHecho: 'Demorado / Aprehendido',
          },
        ],
        testigos: [
          {
            id: 't-1',
            apellidoYNombre: 'LOPEZ, Gustavo Adolfo',
            dni: '25441990',
            edad: 48,
          },
          {
            id: 't-2',
            apellidoYNombre: 'FERNANDEZ, Silvana Noemí',
            dni: '31889201',
            edad: 39,
          },
        ],
        personalTecnico: {
          peritoAuxiliar: 'Crio. ALVAREZ Marcos',
          choferFotografo: 'Sgto 1° BENITEZ Ramón (M-301)',
          auxiliar: 'Of. Ppal GOMEZ Valeria',
        },
        sintesisHecho: 'Comisionados al lugar por requerimiento radial y telefónico, se constata personal de la Seccional 1ra manteniendo demorado a un masculino mayor de edad a quien se le secuestró un arma de fuego tipo revólver calibre .32 corto.',
        laborCriminalistica: '1. Toma de vistas fotográficas panorámicas, de aproximación y detalle de la escena.\n2. Levantamiento con cadena de custodia de arma secuestrada.\n3. Aplicación de hisopado para prueba de dermotest / residuos de disparo al demorado.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-3813',
        parteId: 'parte-2026-10-20',
        nroCorrelativo: 3813,
        codigoIntervencion: `02 INTERVENCIÓN CRIMINALÍSTICA Nº 3813 /${añoActual}-DPC.`,
        tipoIntervencion: 'Criminalística',
        hecho: 'SECUESTRO DE MOTOCICLETA RECUPERADA',
        solicitudHora: '20:15 hs.',
        solicitudVia: 'telefónica de base 911.',
        inspeccionFecha: '2026-10-20',
        inspeccionHora: '20:30',
        inspeccionLugar: 'Barrio Obrero Mz 10 Lote 4',
        dependencia: 'Comisaría Seccional 3ra',
        involucrados: [
          {
            id: 'inv-2',
            apellidoYNombre: 'RUIZ, Braian Ezequiel',
            dni: '44102948',
            edad: 21,
            funcionEnHecho: 'Demorado en averiguación de procedencia',
          },
        ],
        testigos: [
          {
            id: 't-3',
            apellidoYNombre: 'ACUÑA, Roberto Carlos',
            dni: '22890123',
            edad: 52,
          },
          {
            id: 't-4',
            apellidoYNombre: 'VERA, María Elena',
            dni: '30491823',
            edad: 43,
          },
        ],
        personalTecnico: {
          peritoAuxiliar: 'Of. Ppal. GOMEZ Valeria',
          choferFotografo: 'Sgto 1° BENITEZ Ramón (M-301)',
          auxiliar: 'Sgto. PAREDES Marcelo',
        },
        sintesisHecho: 'Personal policial procede a la retención de un motovehículo marca Honda Wave 110cc sin dominio colocado, con número de motor aparentemente rebajado y adulterado con cuño no original.',
        laborCriminalistica: '1. Verificación físico-mecánica de numeración de cuadro y motor.\n2. Levantamiento de revenido químico preliminar.\n3. Tomas fotográficas del rodado para expediente judicial.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int-2584',
        parteId: 'parte-2026-10-20',
        nroCorrelativo: 2584,
        codigoIntervencion: `04 INTERVENCIÓN ACCIDENTOLÓGICA Nº 2584 /${añoActual}-DPC.`,
        tipoIntervencion: 'Accidentológica',
        hecho: 'CONSTATACIÓN RELACIONADO A SINIESTRO VIAL',
        solicitudHora: '12:15 hs.',
        solicitudVia: 'telefónica comando radioeléctrico.',
        inspeccionFecha: '2026-10-20',
        inspeccionHora: '12:35',
        inspeccionLugar: 'Av. Gutnisky esquina Av. Antártida Argentina',
        dependencia: 'Comisaría Seccional 2da',
        testigos: [
          {
            id: 't-5',
            apellidoYNombre: 'CASTILLO, Sergio',
            dni: '29881726',
            edad: 44,
          },
          {
            id: 't-6',
            apellidoYNombre: 'ORTEGA, Jimena',
            dni: '37119024',
            edad: 32,
          },
        ],
        personalTecnico: {
          peritoAuxiliar: 'Crio. ALVAREZ Marcos',
          choferFotografo: 'Sgto 1° BENITEZ Ramón (M-301)',
          auxiliar: 'Of. Ppal GOMEZ Valeria',
        },
        vehiculosSiniestro: [
          {
            id: 'vs-1',
            identificador: 'MÓVIL UNO',
            tipo: 'Automóvil Sedán (Volkswagen Gol Trend)',
            propietarioOConductor: 'GONZALEZ, Pedro Hernán (DNI: 34.567.890)',
            circulacion: 'Por Av. Gutnisky en sentido Norte-Sur',
            zonaContacto: 'Lateral derecho y óptica delantera derecha',
            lesiones: 'Ileso',
          },
          {
            id: 'vs-2',
            identificador: 'MÓVIL DOS',
            tipo: 'Motovehículo (Motomel Blitz 110 cc)',
            propietarioOConductor: 'BENITEZ, Claudia Andrea (DNI: 41.200.344)',
            circulacion: 'Por Av. Antártida Argentina de Este a Oeste cruzando encrucijada',
            zonaContacto: 'Rueda delantera, barrales y guardabarros',
            lesiones: 'Sí, carácter LEVE (escoriaciones en miembro inferior derecho, trasladada al Hospital Central)',
          },
        ],
        sintesisHecho: 'Colisión por embestimiento perpendicular en encrucijada con calzada de asfalto seco en buenas condiciones de visibilidad.',
        laborCriminalistica: '1. Fijación del lugar con vistas métricas y planimetría a escala.\n2. Fijación de huellas de frenada y derrape de 4.20 metros.\n3. Marcación de zonas de contacto y deformaciones estructurales en ambos rodados.',
        createdAt: new Date().toISOString(),
        involucrados: [],
      },
      {
        id: 'int-3814',
        parteId: 'parte-2026-10-20',
        nroCorrelativo: 3814,
        codigoIntervencion: `03 INTERVENCIÓN CRIMINALÍSTICA Nº 3814 /${añoActual}-DPC.`,
        tipoIntervencion: 'Criminalística',
        hecho: 'HOMICIDIO EN OCASIÓN DE ROBO',
        solicitudHora: '22:40 hs.',
        solicitudVia: 'radial comando radioeléctrico.',
        inspeccionFecha: '2026-10-20',
        inspeccionHora: '22:55',
        inspeccionLugar: 'Av. Italia y Calle Fontana',
        dependencia: 'Comisaría Seccional 4ta',
        referencia: 'IPP-04-00-019940-26',
        involucrados: [
          {
            id: 'inv-3',
            apellidoYNombre: 'BENITEZ, Esteban Raúl',
            dni: '38992100',
            edad: 29,
            funcionEnHecho: 'Damnificado / Víctima',
            tipoLesion: 'Graves',
            asistenciaMedica: 'Trasladado a nosocomio',
            nosocomioDestino: 'Hospital Central',
          },
        ],
        testigos: [
          {
            id: 't-7',
            apellidoYNombre: 'SUAREZ, Miguel Ángel',
            dni: '27104928',
            edad: 46,
          },
        ],
        personalTecnico: {
          peritoAuxiliar: 'Crio. ALVAREZ Marcos',
          choferFotografo: 'Sgto 1° BENITEZ Ramón (M-301)',
          auxiliar: 'Of. Ppal GOMEZ Valeria',
        },
        sintesisHecho: 'Relevamiento en vía pública por hecho con arma blanca y herido grave.',
        laborCriminalistica: '1. Fijación fotográfica métrica y panorámica del lugar.\n2. Búsqueda y levantamiento de manchas pardo-rojizas (presunta sangre).\n3. Secuestro de arma blanca tipo puñal con cabo de madera.',
        createdAt: new Date().toISOString(),
      },
    ],
    tipoGuardia: 'Pericial - Criminalística',
    dependencia: 'División Criminalística Central',
    fechaHoraDesde: '2026-10-20 19:00:00',
    fechaHoraHasta: '2026-10-21 07:00:00',
    racionamientoCount: 6,
    forensesTurno: [
      {
        id: 'fg-1',
        medicoNombre: 'Dr. Guillermo Navarro (Médico Legista Forense)',
        turno: 'Guardia Noche (19:00 a 07:00 hs)',
        horaIngreso: '19:00',
        horaEgreso: '07:00',
        totalExaminados: 40,
        examinadosHastaHs: '06:30 hs.',
        observaciones: 'Sin novedades médico-legales extraordinarias.',
      },
    ],
    totalIntervenciones: 4,
    cerrado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Más turnos de guardia representativos (fieles al estilo del sistema oficial)
  const parte2: ParteNovedadesGuardia = {
    id: 'parte-2026-10-21-brigada',
    tipoGuardia: 'Brigada',
    dependencia: 'Comisaría Seccional Quinta',
    fechaHoraDesde: '2026-10-21 09:30:00',
    fechaHoraHasta: '2026-10-21 15:00:00',
    fechaInicio: '2026-10-21',
    horaInicio: '09:30',
    fechaFin: '2026-10-21',
    horaFin: '15:00',
    grupoGuardia: 'Brigada de Investigaciones',
    funcionesPersonal: [
      { id: 'f2-1', funcion: 'Jefe de Brigada de Turno', personalNombre: 'Of. Ppal. GOMEZ, Valeria Beatriz' },
      { id: 'f2-2', funcion: 'Auxiliar Operativo de Calle', personalNombre: 'Sgto. 1° BENITEZ, Ramón Ignacio' },
    ],
    forense: {
      medicoNombre: 'Dra. Claudia Montenegro (Médica Forense de Turno)',
      totalExaminados: 12,
      examinadosHastaHs: '14:00 hs.',
    },
    forensesTurno: [
      {
        id: 'fg-2',
        medicoNombre: 'Dra. Claudia Montenegro (Médica Forense de Turno)',
        turno: 'Guardia Diurna (08:00 a 14:00 hs)',
        horaIngreso: '08:00',
        horaEgreso: '14:00',
        totalExaminados: 12,
        examinadosHastaHs: '14:00 hs.',
      },
    ],
    movilesAfectados: [
      { id: 'ma-201', descripcion: 'Móvil M-301 Toyota Corolla', estado: 'En servicio' },
    ],
    intervenciones: [],
    racionamientoCount: 2,
    totalIntervenciones: 0,
    cerrado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const parte3: ParteNovedadesGuardia = {
    id: 'parte-2026-10-21-servicios',
    tipoGuardia: 'Servicios - Técnicos',
    dependencia: 'Comisaría Lucio V. Mansilla',
    fechaHoraDesde: '2026-10-21 08:00:00',
    fechaHoraHasta: '2026-10-21 13:00:00',
    fechaInicio: '2026-10-21',
    horaInicio: '08:00',
    fechaFin: '2026-10-21',
    horaFin: '13:00',
    grupoGuardia: 'Guardia B',
    funcionesPersonal: [
      { id: 'f3-1', funcion: 'Oficial de Servicio Técnico', personalNombre: 'Crio. ALVAREZ, Marcos Emilio' },
      { id: 'f3-2', funcion: 'Chofer Operativo', personalNombre: 'Cabo 1° TORRES, Cristian' },
    ],
    forense: {
      medicoNombre: 'Dr. Marcelo Gómez (Médico de Policía)',
      totalExaminados: 8,
      examinadosHastaHs: '12:30 hs.',
    },
    forensesTurno: [
      {
        id: 'fg-3',
        medicoNombre: 'Dr. Marcelo Gómez (Médico de Policía)',
        turno: 'Guardia Mañana',
        horaIngreso: '08:00',
        horaEgreso: '13:00',
        totalExaminados: 8,
        examinadosHastaHs: '12:30 hs.',
      },
    ],
    movilesAfectados: [],
    intervenciones: [],
    racionamientoCount: 2,
    totalIntervenciones: 0,
    cerrado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const parte4: ParteNovedadesGuardia = {
    id: 'parte-2026-10-21-admin',
    tipoGuardia: 'Administrativa',
    dependencia: 'Subcría. Antenor Gauna',
    fechaHoraDesde: '2026-10-21 08:00:00',
    fechaHoraHasta: '2026-10-21 13:00:00',
    fechaInicio: '2026-10-21',
    horaInicio: '08:00',
    fechaFin: '2026-10-21',
    horaFin: '13:00',
    grupoGuardia: 'Guardia C',
    funcionesPersonal: [
      { id: 'f4-1', funcion: 'Encargado de Mesa de Entradas', personalNombre: 'Of. Subinspector CABRERA Luciana' },
      { id: 'f4-2', funcion: 'Sumariante de Turno', personalNombre: 'Sgto. PAREDES Marcelo' },
      { id: 'f4-3', funcion: 'Operador de Guardia', personalNombre: 'Of. Ayte. DIAZ Florencia' },
    ],
    forense: {
      medicoNombre: 'Dr. Raúl Esteche (Médico Forense de Guardia)',
      totalExaminados: 5,
      examinadosHastaHs: '12:00 hs.',
    },
    movilesAfectados: [],
    intervenciones: [],
    racionamientoCount: 3,
    totalIntervenciones: 0,
    cerrado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.partesGuardia.bulkPut([parte1, parte2, parte3, parte4]);
  for (const int of parte1.intervenciones) {
    await db.intervenciones.put(int);
  }

  // 7. Inspecciones Oculares Iniciales (Comienzan desde el 1)
  const io1: InspeccionOcular = {
    id: 'io-1',
    nroIO: 'I.O. Nº 001/2026',
    fecha: '2026-10-20',
    hora: '18:45',
    lugar: 'Av. Gutnisky esquina Av. Antártida Argentina',
    tipo: 'Accidentológica Vial',
    dependenciaSolicitante: 'Comisaría Seccional 2da',
    expedienteVinculado: 'IPP-04-00-020119-26',
    personalInterviniente: 'Crio. ALVAREZ Marcos (Perito) - Sgto. 1° BENITEZ Ramón (Fotógrafo)',
    perito: 'Crio. ALVAREZ Marcos',
    fotografo: 'Sgto. 1° BENITEZ Ramón',
    cantidadFotografias: 14,
    fotosConformeFotografo: '14 tomas fotográficas conforme fotógrafo',
    fotosConfirmadas: true,
    confirmadoPorUsuario: 'Of. Ppal. GOMEZ Valeria',
    resumen: 'Inspección ocular por colisión perpendicular con herido leve. Fijación de huellas de frenada y deformaciones.',
    conclusiones: 'Se constató zona de impacto lateral sobre vehículo menor y arrastre metálico.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const io2: InspeccionOcular = {
    id: 'io-2',
    nroIO: 'I.O. Nº 002/2026',
    fecha: '2026-10-20',
    hora: '21:10',
    lugar: 'Calle Moreno N° 1420 - Local Comercial',
    tipo: 'Criminalística',
    dependenciaSolicitante: 'Comisaría Seccional 1ra',
    expedienteVinculado: 'OF-Nº 458/26-UFI1',
    personalInterviniente: 'Of. Ppal. GOMEZ Valeria (Perito Auxiliar)',
    perito: 'Of. Ppal. GOMEZ Valeria',
    fotografo: 'Sgto. PAREDES Marcelo',
    cantidadFotografias: 8,
    fotosConformeFotografo: '8 tomas fotográficas conforme fotógrafo',
    fotosConfirmadas: true,
    confirmadoPorUsuario: 'Crio. ALVAREZ Marcos',
    resumen: 'Inspección ocular por forzamiento de cerradura y rotura de panel vidriado.',
    conclusiones: 'Levantamiento de rastros papilares en mostrador y trozos de vidrio con posibles manchas hemáticas.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.inspeccionesOculares.bulkPut([io1, io2]);

  // 8. Recargos operativos
  const rec1: RecargoOperativo = {
    id: 'rec-1',
    fecha: '2026-10-21',
    horaDesde: '18:00',
    horaHasta: '23:00',
    horasCalculadas: 5,
    tipoRecargo: 'Operativo nocturno saturación',
    lugarCobertura: 'Jurisdicción Comisaría 2da - Zona Bancaria y Comercial',
    seEncuentraDeGuardia: false,
    grupoUOficina: 'Guardia A',
    personalIds: ['pers-1', 'pers-3'],
    estado: 'Vigente',
    observaciones: 'Servicio extraordinario orden de operaciones N° 44/26.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.recargos.put(rec1);

  // 9. Usuarios del sistema y Delegaciones
  await db.usuarios.bulkPut(DEFAULT_USUARIOS);
  await db.delegaciones.bulkPut(DEFAULT_DELEGACIONES);

  // 10. Grupos de Guardia y Secciones
  const g1: GrupoPersonal = {
    id: 'grp-1',
    nombre: 'Guardia A',
    descripcion: 'Sección operativa y pericial de turno rotativo diurno/nocturno',
    color: '#1e3a8a',
    jefeGrupo: 'Crio. Inspector ALVAREZ Marcos',
    personalIds: ['pers-1', 'pers-2', 'pers-3', 'pers-4'],
    funcionesSugeridas: [
      { funcion: 'Oficial de servicio – Perito de turno', personalNombre: 'Crio. Insp. ALVAREZ Marcos' },
      { funcion: 'Oficial de guardia – Perito de turno', personalNombre: 'Of. Ppal. GOMEZ Valeria' },
      { funcion: 'Chofer – Fotógrafo', personalNombre: 'Sgto. 1° BENITEZ Ramón' },
      { funcion: 'Servicio despeje / prevención', personalNombre: 'Cabo QUIROGA Lucas' }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const g2: GrupoPersonal = {
    id: 'grp-2',
    nombre: 'Guardia B',
    descripcion: 'Sección criminalística y accidentología vial de relevo',
    color: '#047857',
    jefeGrupo: 'Subcrio. FERNANDEZ Raúl',
    personalIds: ['pers-2', 'pers-5', 'pers-6'],
    funcionesSugeridas: [
      { funcion: 'Oficial de servicio – Perito de turno', personalNombre: 'Subcrio. FERNANDEZ Raúl' },
      { funcion: 'Oficial de guardia', personalNombre: 'Of. Subinsp. LOPEZ Brenda' },
      { funcion: 'Chofer – Fotógrafo', personalNombre: 'Cabo 1° SOSA Martín' }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const g3: GrupoPersonal = {
    id: 'grp-3',
    nombre: 'Guardia C',
    descripcion: 'Guardia especializada en delitos complejos e incendios',
    color: '#7c3aed',
    jefeGrupo: 'Of. Ppal. GOMEZ Valeria',
    personalIds: ['pers-2', 'pers-4', 'pers-6'],
    funcionesSugeridas: [
      { funcion: 'Oficial de servicio', personalNombre: 'Of. Ppal. GOMEZ Valeria' },
      { funcion: 'Perito Auxiliar', personalNombre: 'Cabo QUIROGA Lucas' }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const g4: GrupoPersonal = {
    id: 'grp-4',
    nombre: 'Brigada Pericial Criminalística',
    descripcion: 'Equipo técnico forense de alta complejidad',
    color: '#b45309',
    jefeGrupo: 'Crio. Inspector ALVAREZ Marcos',
    personalIds: ['pers-1', 'pers-3', 'pers-5'],
    funcionesSugeridas: [
      { funcion: 'Jefe de Brigada', personalNombre: 'Crio. Insp. ALVAREZ Marcos' },
      { funcion: 'Planímetro y Fotógrafo', personalNombre: 'Sgto. 1° BENITEZ Ramón' }
    ],
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.grupos.bulkPut([g1, g2, g3, g4]);
  await db.licenciados.bulkPut(DEFAULT_LICENCIADOS);
  await db.informesTecnicos.bulkPut(DEFAULT_INFORMES_TECNICOS);

  const countAuditoria = await db.auditoria.count();
  if (countAuditoria === 0) {
    const ahora = new Date();
    await db.auditoria.bulkPut([
      {
        id: 'aud-init-1',
        fechaHora: new Date(ahora.getTime() - 86400000).toISOString(),
        usuarioId: 'usr-super-1',
        username: 'divcibercrimenlagunablanca@gmail.com',
        apellidoYNombre: 'Superusuario Administrador General',
        rol: 'superusuario',
        delegacionId: 'del-laguna-blanca',
        delegacionNombre: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
        modulo: 'Sistema',
        accion: 'LOGIN',
        descripcion: 'Inicio de sesión exitoso en la plataforma',
        detalles: 'Ingreso al sistema con privilegios de Superusuario',
      },
      {
        id: 'aud-init-2',
        fechaHora: new Date(ahora.getTime() - 43200000).toISOString(),
        usuarioId: 'usr-super-1',
        username: 'divcibercrimenlagunablanca@gmail.com',
        apellidoYNombre: 'Superusuario Administrador General',
        rol: 'superusuario',
        delegacionId: 'del-laguna-blanca',
        delegacionNombre: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
        modulo: 'Configuración',
        accion: 'MODIFICAR',
        descripcion: 'Ajuste de parámetros y membrete oficial de delegación',
        detalles: 'Actualización de membrete y numeradores independientes',
      },
      {
        id: 'aud-init-3',
        fechaHora: ahora.toISOString(),
        usuarioId: 'usr-super-1',
        username: 'divcibercrimenlagunablanca@gmail.com',
        apellidoYNombre: 'Superusuario Administrador General',
        rol: 'superusuario',
        delegacionId: 'del-laguna-blanca',
        delegacionNombre: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
        modulo: 'Guardias',
        accion: 'CREAR',
        descripcion: 'Apertura de turno de guardia y asignación de personal',
        detalles: 'Guardia de Prevención y Criminalística asignada',
      },
    ]);
  }

  // 12. Registros iniciales de Accidentología Vial con Personal Policial Involucrado
  const countAccidentologia = await db.accidentologia.count();
  if (countAccidentologia === 0) {
    const acc1: AccidentologiaRegistro = {
      id: 'acc-1',
      codigo: 'Ene-01',
      delegacionId: 'del-laguna-blanca',
      fecha: '2026-01-14',
      dia: 'Miércoles',
      localidad: 'Laguna Blanca',
      lugarOcurrido: 'Av. San Martín y Calle 9 de Julio',
      horarioOcurrido: '07:45 hs.',
      dependenciaInterviniente: 'Comisaría Laguna Blanca',
      tipoSiniestro: 'Colisión por alcance',
      zona: 'Urbana',
      tipoVia: 'INTERSECCIÓN',
      tipoCalzada: 'Asfalto',
      estadoCalzada: 'Bueno',
      senalizacion: 'SI',
      anguloVisual: 'Bueno',
      iluminacion: 'Bueno',
      estadoClima: 'Despejado',
      observacionesSiniestro: 'Ocurrido en intersección céntrica semaforizada con visibilidad óptima.',
      jerarquia: 'Sargento 1°',
      apellidoYNombre: 'BENITEZ Ramón',
      edad: 38,
      destino: 'Delegación Policía Científica Laguna Blanca',
      unidadRegional: 'UR-4 Laguna Blanca',
      situacionLaboral: 'ACTIVO',
      situacionServicio: 'ENTRANTE',
      tipoServicio: 'ENTRANTE',
      vestimenta: 'UNIFORMADO',
      tipoLesiones: 'Leves (escoriaciones en miembro superior)',
      alcohotest: '0.00 g/l (Negativo)',
      observacionesPersonal: 'Efectivo asistido en el lugar y derivado preventivamente a nosocomio para placas radiográficas.',
      tipoRodadoPolicial: 'Motocicleta oficial Honda Tornado 250cc',
      tipoRodadoOtros: 'Automóvil particular Fiat Cronos',
      otrosInvolucrados: 'Ninguno',
      cascoPolicial: 'Colocado',
      cascoOtro: 'No aplica',
      resultadoPolicial: 'EMBESTIDO',
      persPolHuellas: 'FRENADA',
      personalPolicialDinamica: 'CAIDA',
      evidencias: 'Impronta de frenada de 8 metros, restos de plástico y mica refractaria, desprendimiento de espejo retrovisor.',
      createdAt: '2026-01-14T08:30:00.000Z',
      updatedAt: '2026-01-14T08:30:00.000Z',
    };

    const acc2: AccidentologiaRegistro = {
      id: 'acc-2',
      codigo: 'Feb-01',
      delegacionId: 'del-laguna-blanca',
      fecha: '2026-02-05',
      dia: 'Jueves',
      localidad: 'Laguna Blanca',
      lugarOcurrido: 'Ruta Nacional 86 Km 1320',
      horarioOcurrido: '19:30 hs.',
      dependenciaInterviniente: 'Comisaría Laguna Blanca',
      tipoSiniestro: 'Despiste y vuelco',
      zona: 'Ruta',
      tipoVia: 'RECTA',
      tipoCalzada: 'Asfalto',
      estadoCalzada: 'Regular',
      senalizacion: 'SI',
      anguloVisual: 'Bueno',
      iluminacion: 'Regular',
      estadoClima: 'Lluvia leve',
      observacionesSiniestro: 'Calzada resbaladiza con acumulación de agua por precipitaciones pluviales.',
      jerarquia: 'Cabo 1°',
      apellidoYNombre: 'SOSA Martín',
      edad: 31,
      destino: 'División Tránsito Policial',
      unidadRegional: 'UR-4 Laguna Blanca',
      situacionLaboral: 'ACTIVO',
      situacionServicio: 'SALIENTE',
      tipoServicio: 'SALIENTE',
      vestimenta: 'CIVIL',
      tipoLesiones: 'Graves (traumatismo cerrado de tórax)',
      alcohotest: '0.00 g/l (Negativo)',
      observacionesPersonal: 'Derivado en ambulancia de emergencia a Hospital de Alta Complejidad Formosa.',
      tipoRodadoPolicial: 'Automóvil Chevrolet Corsa particular',
      tipoRodadoOtros: 'Sin otro rodado',
      otrosInvolucrados: 'Guardarraíl perimetral y alcantarilla',
      cascoPolicial: 'No aplica',
      cascoOtro: 'No aplica',
      resultadoPolicial: 'EMBISTENTE',
      persPolHuellas: 'DERRAPE',
      personalPolicialDinamica: 'ARRASTRE',
      evidencias: 'Improntas de derrape sobre cinta asfáltica de 14.5 metros, deformación estructural de paragolpes delantero.',
      createdAt: '2026-02-05T20:15:00.000Z',
      updatedAt: '2026-02-05T20:15:00.000Z',
    };

    await db.accidentologia.bulkPut([acc1, acc2]);
  }

  const countRoles = await db.roles.count();
  if (countRoles === 0) {
    await db.roles.bulkPut(DEFAULT_ROLES);
  }
}
