export type Jerarquia =
  | 'Comisario General'
  | 'Comisario Mayor'
  | 'Comisario Inspector'
  | 'Comisario'
  | 'Subcomisario'
  | 'Oficial Principal'
  | 'Oficial Inspector'
  | 'Oficial Subinspector'
  | 'Oficial Ayudante'
  | 'Suboficial Mayor'
  | 'Suboficial Principal'
  | 'Sargento Ayudante'
  | 'Sargento 1°'
  | 'Sargento'
  | 'Cabo 1°'
  | 'Cabo'
  | 'Agente';

export type EstadoPersonal = 'Activo' | 'Licencia Médica' | 'Licencia Anual' | 'Comisión' | 'Pasiva' | 'Retirado';

export interface Personal {
  id: string;
  apellidoYNombre: string;
  dni: string;
  sexo: 'M' | 'F' | 'Otro';
  jerarquia: Jerarquia | string;
  plaza: string;
  fechaNacimiento: string;
  estadoCivil: string;
  domicilio: string;
  email: string;
  telefono: string;
  seccionGrupo: string;
  estado: EstadoPersonal;
  fotoUrl?: string;

  // Licencia de conducir
  licenciaNro: string;
  licenciaCategoria: string;
  licenciaVencimiento: string;

  // Obra social
  obraSocialNro: string;
  credencialNro: string;

  // Documentaciones adjuntas (data URLs o base64)
  documentosAdjuntos?: Array<{
    id: string;
    nombre: string;
    tipo: string;
    dataUrl: string;
    fecha: string;
  }>;

  // Equipamiento a cargo
  armamento: {
    marca: string;
    modelo: string;
    serieNro: string;
    calibre: string;
    secuestradoORetenido: boolean;
    causaSecuestro?: string;
  };

  chaleco: {
    serieNro: string;
    talla: string;
    secuestradoORetenido: boolean;
    causaSecuestro?: string;
  };

  observaciones?: string;
  delegacionId?: string;
  esLicenciado?: boolean;
  especialidadLicenciatura?: string;
  matriculaProfesional?: string;
  fechaMatriculacion?: string;
  historialTraslados?: Array<{
    id: string;
    delegacionOrigenId: string;
    delegacionOrigenNombre: string;
    delegacionDestinoId: string;
    delegacionDestinoNombre: string;
    fecha: string;
    motivo?: string;
    disposicion?: string;
    usuarioRegistro?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type TipoRequerimiento =
  | 'Escalamiento de datos'
  | 'Resguardo de Evidencia'
  | 'Resguardo c/ Escalamiento'
  | 'Descarga de filmaciones'
  | 'Extracción forense de teléfono'
  | 'Análisis informático'
  | 'Informe pericial'
  | 'Inspección ocular pericial'
  | 'Otro';

export interface PersonaVinculada {
  id: string;
  apellidoYNombre: string;
  dni: string;
  observaciones?: string;
}

export interface PersonalPolicialCausa {
  jerarquia: string;
  plaza?: string;
  apellidoYNombre: string;
  dni?: string;
  rol?: string; // "Imputado", "Damnificado", "Aprehendido / Demorado", "Conductor", "Testigo", "Involucrado"
  dependenciaRevista?: string;
  observaciones?: string;
  destino?: string;
  tipoLesion?: string;
  tipoRodado?: string;
}

export interface InspeccionOcular {
  id: string;
  nroIO: string; // ej. "I.O. N° 001/2026"
  fecha: string;
  hora: string;
  lugar: string; // Dirección / Lugar de ocurrido
  direccion?: string;
  hecho?: string;
  tipo: string; // "Criminalística", "Accidentológica Vial", "Balística", "Incendio", "Homicidio", "Otro"
  dependenciaSolicitante: string;
  expedienteVinculado?: string;
  personalInterviniente: string;
  perito?: string;
  fotografo?: string;
  cantidadFotografias: number;
  fotosConformeFotografo?: string;
  fotosConfirmadas?: boolean;
  confirmadoPorUsuario?: string;
  resumen: string;
  conclusiones?: string;
  fotosAdjuntas?: string[];
  origenGuardia?: boolean;
  intervencionId?: string;

  // Personal Policial Involucrado
  involucraPersonalPolicial?: boolean;
  personalPolicial?: PersonalPolicialCausa;

  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpedienteJudicial {
  id: string;
  nroOficioLetras?: string; // Compatibilidad
  nroOficio?: string; // N° de Oficio
  letraOficio?: string; // Letra (solamente mayúscula)
  anioOficio?: number | string; // Año del oficio
  nroExpediente: string; // N° Expediente
  anioExpediente?: number | string; // Año del expediente
  fechaRegistro: string; // Fecha de registro
  caratulaOrigen: string;
  juzgadoFiscalia: string;
  dependenciaSolicitante: string;
  tipoOficio: string;
  tipoRequerimiento: TipoRequerimiento | string;
  tareaRealizada: string; // Cuadro ampliado
  resumen?: string;
  observaciones?: string;

  // Asignación de investigación / Personal a cargo
  personalACargo?: string; // Personal a cargo (designado mediante botón)
  personalInstruccion?: string; // Compatibilidad
  supervisor?: string; // Supervisor a cargo

  // Vinculación a Inspección Ocular (I.O.)
  vincularInspeccionOcular?: boolean;
  inspeccionOcularVinculadaId?: string;
  inspeccionOcularDatos?: {
    nroIO: string;
    fecha: string;
    hora?: string;
    lugar: string;
    tipo: string;
    dependenciaSolicitante: string;
    perito?: string;
  };

  // Elevación
  estadoEntrega: 'Entregado' | 'No entregado';
  fechaElevacion?: string;
  personalElevo?: string;

  // Personal Policial Involucrado
  involucraPersonalPolicial?: boolean;
  personalPolicial?: PersonalPolicialCausa;
  ppi?: {
    tienePPI: boolean;
    jerarquia?: string;
    plaza?: string;
    apellidoYNombre?: string;
    dni?: string;
    rol?: string;
    dependencia?: string;
  };

  // Personas vinculadas (opcional/compatibilidad)
  personasVinculadas?: PersonaVinculada[];

  // Adjuntos de oficio y recibo
  adjuntosOficio?: string[];
  adjuntosRecibo?: string[];

  // Origen de casos de falta de oficio agrupados
  casosAgrupadosIds?: string[];

  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CasoFaltaOficio {
  id: string;
  fechaRegistro: string;
  origenIntervencion: string;
  dependenciaSolicitante: string;
  tipoRequerimiento: TipoRequerimiento | string;
  tareaRealizada: string;
  personasVinculadas?: PersonaVinculada[]; // Removido del formulario pero mantenido opcional para compatibilidad
  resumen?: string;
  observaciones?: string;

  // Personal Policial Involucrado
  involucraPersonalPolicial?: boolean;
  personalPolicial?: PersonalPolicialCausa;

  estado: 'Pendiente' | 'Oficio Recepcionado' | 'Agrupado';
  oficioVinculadoId?: string;
  fechaRecepcionOficio?: string;
  nroOficioAsignado?: string;
  delegacionId?: string;
  createdAt: string;
}

export type TipoVehiculo = 'Patrullero' | 'Camioneta' | 'Utilitario' | 'Motovehículo';
export type CondicionVehiculo = 'Bueno' | 'Regular' | 'Malo';
export type EstadoOperativoVehiculo = 'En Servicio' | 'En Taller Mecánico' | 'Fuera de Servicio' | 'Baja definitiva';

export interface ReparacionMecanica {
  id: string;
  movilId: string;
  fecha: string;
  kilometraje: number;
  tipoIntervencion: 'Mecánica' | 'Chapa y Pintura' | 'Eléctrica' | 'Neumáticos' | 'Frenos' | 'Service Programado' | 'Otro';
  tallerProveedor: string;
  descripcion: string;
  costoPresupuesto: number;
  repuestosCambiados: string;
  comprobanteUrl?: string;
  createdAt: string;
}

export interface MovilPolicial {
  id: string;
  tipo: TipoVehiculo;
  marca: string;
  modelo: string;
  dominioPatente: string;
  nroMovilInterno: string;
  dependenciaAsignada: string;
  kilometrajeActual: number;
  condicionGeneral: CondicionVehiculo;
  estadoOperativo: EstadoOperativoVehiculo;

  // Service Preventivo
  ultimoServiceKm: number;
  ultimoServiceFecha: string;
  proximoServiceKm: number;

  // Documentación
  vencimientoRTO: string;
  aseguradora: string;
  nroPoliza: string;
  vencimientoSeguro: string;

  reparaciones?: ReparacionMecanica[];
  chasisNro?: string;
  motorNro?: string;
  anioModelo?: string | number;
  observaciones?: string;
  fotoUrl?: string;
  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type EstadoRecargo = 'Vigente' | 'Finalizado' | 'Suspendido';

export interface RecargoOperativo {
  id: string;
  fecha: string;
  hora?: string; // Formato horario o presentación ej. "18:00 hs"
  horaPresentacion?: string; // Hora exacta de presentación obligatoria (selector reloj)
  horaDesde?: string;
  horaHasta?: string;
  horasCalculadas?: number;
  tipoRecargo: string;
  lugarCobertura?: string;
  seEncuentraDeGuardia: boolean;
  grupoUOficina?: string;
  oficina?: string; // Oficina o dependencia específica que instruye o a la que corresponde
  personalDesignado?: string; // Nombres o designación visible
  personalIds: string[]; // IDs de Personal asignados
  estado: EstadoRecargo;
  observaciones?: string;
  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForenseTurno {
  id: string;
  nombreMedico: string;
  turno: string; // ej. "Guardia Mañana", "Guardia Noche", "Relevo 1"
  horaIngreso: string;
  horaEgreso?: string;
  examinadosHastaHs: string;
  totalExaminados: number;
  observaciones?: string;
  delegacionId?: string;
}

export interface LicenciadoTurno {
  id: string;
  personalId?: string; // ID del personal seleccionado de la nómina
  nombreLicenciado: string; // Nombre completo con jerarquía
  dni?: string;
  jerarquia?: string;
  especialidad: string; // ej: "Lic. en Criminalística", "Lic. en Accidentología Vial", "Lic. en Sistemas / Informática Forense", etc.
  matriculaNro?: string;
  turno: string; // ej. "Guardia de 24 hs", "Guardia Noche (19:00 a 07:00 hs)", "Turno Rotativo", etc.
  fecha: string; // Fecha de guardia / turno (YYYY-MM-DD)
  horaIngreso: string; // ej: "07:00"
  horaEgreso?: string; // ej: "19:00"
  totalPericias?: number; // Total de informes o pericias técnicas confeccionadas
  hastaHs?: string; // ej. "18:30 hs."
  observaciones?: string;
  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InformeTecnico {
  id: string;
  fecha: string; // Fecha
  fechaRecepcion?: string; // Fecha de recepción del oficio / requerimiento
  oficioNro: string; // Oficio
  tipoExpediente: string; // tipo de Sumario/Expediente ej. "IPP", "Causa Penal", "Sumario Judicial", etc.
  nroExpediente: string; // N°
  anio: number; // / año ej: 2026
  caratula: string; // Carátula
  juzgado: string; // Juzgado / Fiscalía
  dependenciaInterviniente: string; // Dependencia Interviniente
  personalInstruccion: string; // Personal a Cargo de la Instrucción
  licenciadoACargoId?: string; // Licenciado a cargo (id personal)
  licenciadoACargoNombre: string; // Licenciado a cargo

  // Auxiliar designado para diligenciamiento
  auxiliarACargoId?: string;
  auxiliarACargoNombre?: string;
  auxiliarCargo?: string; // Cargo asignado al auxiliar para diligenciar el informe

  // Vinculación a Inspección Ocular
  vincularInspeccionOcular?: boolean;
  inspeccionOcularVinculadaId?: string;
  inspeccionOcularNro?: string;

  anexoOficioUrl?: string; // Oficio anexado (dataUrl o base64)
  anexoOficioNombre?: string;
  anexoInformeUrl?: string; // Informe pericial anexado (dataUrl o base64)
  anexoInformeNombre?: string;
  dictamenTexto?: string; // Conclusiones / Dictamen pericial
  fechaElevacion?: string; // Fecha de elevación
  quienRecibio?: string; // Quién recibió en destino
  cargoReceptor?: string;
  estado: 'En Confección' | 'Elevado' | 'Recepcionado';

  // Personal Policial Involucrado
  involucraPersonalPolicial?: boolean;
  personalPolicial?: PersonalPolicialCausa;

  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehiculoSiniestro {
  id: string;
  identificador: string; // "MÓVIL UNO", "MÓVIL DOS", etc.
  dominio?: string;      // Patente / Dominio ej. "AA 123 BB"
  tipo: string;
  marca?: string;
  modelo?: string;
  propietarioOConductor: string;
  choferInvolucradoId?: string; // ID de Persona Involucrada seleccionada como chofer
  choferNombre?: string;        // Nombre del chofer vinculado
  circulacion: string;
  zonaContacto: string;
  lesiones: string; // ej: "Sin lesiones aparentes", "Sí, carácter LEVE", "Grave", "Óbito"
}

export interface TestigoActa {
  id: string;
  apellidoYNombre: string;
  dni: string;
  edad: number | string;
  domicilio?: string;
}

export type TipoLesionPolicial = 'Sin Lesiones' | 'Leves' | 'Graves' | 'Gravísimas';
export type TipoAsistenciaMedica = 'Asistido en el lugar' | 'Trasladado a nosocomio';

export interface InvolucradoIntervencion {
  id: string;
  apellidoYNombre: string;
  dni: string;
  edad: number | string;
  condicion?: string; // "Demorado / Aprehendido", "Denunciante", "Damnificado / Víctima", "Testigo", "Imputado", etc.
  funcionEnHecho: string; // "Demorado", "Denunciante", "Damnificado", "Testigo", etc.
  domicilio?: string;
  telefono?: string;

  // Clasificación de Lesiones obligatoria
  tipoLesion?: TipoLesionPolicial;
  asistenciaMedica?: TipoAsistenciaMedica;
  nosocomioDestino?: string;
  detalleLesiones?: string;

  // Si es personal policial (obligatorio especificar si check activo)
  esPersonalPolicial?: boolean;
  jerarquia?: string;
  plaza?: string;
  unidadRegional?: string;
  destino?: string;
  alcohotest?: string;
}

export type TipoIntervencion = 'Criminalística' | 'Accidentológica';

export interface IntervencionParte {
  id: string;
  parteId: string;
  nroCorrelativo: number; // Ej. 3812
  codigoIntervencion: string; // Ej. "01 INTERVENCIÓN CRIMINALÍSTICA Nº 3812 /2026-DPC."
  tipoIntervencion: TipoIntervencion;
  hecho: string; // "SECUESTRO Y APREHENSION", "CONSTATACIÓN RELACIONADO A SINIESTRO VIAL", etc.
  solicitudHora: string; // "18:28 hs."
  solicitudVia: string; // "telefónica", "radial", "nota escrita", "personal"
  inspeccionFecha: string;
  inspeccionHora: string;
  inspeccionLugar: string;
  direccion?: string; // Lugar de ocurrido
  dependencia: string;
  referencia?: string;

  // Inspección Ocular complementaria
  nroIO?: string;
  perito?: string;
  fotografo?: string;
  fotosConformeFotografo?: boolean;
  fotosConfirmadas?: boolean;
  confirmadoPorUsuario?: string;
  fechaConfirmacionFotos?: string;

  // Personal Policial Involucrado en el Hecho
  involucraPersonalPolicial?: boolean;
  personalPolicial?: PersonalPolicialCausa;

  // Involucrados / Demorados
  involucrados: InvolucradoIntervencion[];

  // Testigos
  testigos: TestigoActa[];

  // Personal Técnico Interviniente
  personalTecnico: {
    peritoAuxiliar: string;
    choferFotografo: string;
    auxiliar: string;
  };

  // En caso de siniestro vial (Accidentológica)
  vehiculosSiniestro?: VehiculoSiniestro[];

  sintesisHecho: string;
  laborCriminalistica: string;
  createdAt: string;
}

export interface AsignacionFuncionGuardia {
  id: string;
  funcion: string; // Función primaria (ej: "Oficial de Servicio", "Oficial de Guardia", "Chofer")
  funcionSecundaria?: string; // Función secundaria opcional (ej: "Chofer", "Fotógrafo", "Perito Auxiliar")
  personalNombre: string;
  personalId?: string;
}

export interface MovilAfectadoGuardia {
  id: string;
  movilId?: string;
  descripcion: string; // Ej. "Móvil 301 - Ford Ranger"
  estado: 'En servicio' | 'Fuera de servicio';
}

export interface ForenseEnGuardia {
  id: string;
  medicoNombre: string;
  turno: string;
  horaIngreso: string;
  horaEgreso?: string;
  totalExaminados: number;
  examinadosHastaHs: string;
  observaciones?: string;
}

export interface ParteNovedadesGuardia {
  id: string;
  tipoGuardia?: string; // 'Brigada', 'Servicios - Técnicos', 'Administrativa', 'Pericial', 'Prevención', etc.
  dependencia?: string; // 'Comisaría Seccional Quinta', etc.
  fechaHoraDesde?: string; // e.g. "2026-10-21 08:00:00"
  fechaHoraHasta?: string; // e.g. "2026-10-21 13:00:00"
  fechaInicio: string; // ej. 2026-10-20
  horaInicio: string;  // ej. "19:00"
  fechaFin: string;    // ej. 2026-10-21
  horaFin: string;      // ej. "07:00"
  grupoGuardia: string;
  
  // Tabla de Funciones de Guardia
  funcionesPersonal: AsignacionFuncionGuardia[];

  // Forense de Turno (soporta uno principal para compatibilidad y lista múltiple de relevos)
  forense: {
    medicoNombre: string;
    totalExaminados: number;
    examinadosHastaHs: string;
  };
  forensesTurno?: ForenseEnGuardia[];

  // Móviles Afectados
  movilesAfectados: MovilAfectadoGuardia[];

  // Intervenciones de esta guardia específica
  intervenciones: IntervencionParte[];

  // Tareas de Cibercrimen de guardia (No suman a intervenciones policiales)
  cibercrimenRegistros?: RegistroCibercrimenGuardia[];

  // Conteo de Racionamiento de guardia
  racionamientoCount?: number;

  totalIntervenciones: number;
  observacionesGenerales?: string;
  cerrado: boolean;
  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistroCibercrimenGuardia {
  id: string;
  horaRegistro?: string;
  personalACargo: string; // Personal a cargo de la tarea
  dependenciaSolicitante: string; // Dependencia Solicitante
  tareaRealizada: 'Resguardo de Evidencia' | 'Descarga de Filmaciones' | 'Otro' | string; // Tarea realizada
  otraTarea?: string; // Si selecciona otro
  apellidoYNombre?: string; // En caso de Resguardo de Evidencia
  dni?: string; // DNI
  conPersonalPolicialInvolucrado?: boolean; // Especificar si es con personal policial Involucrado
  personalPolicial?: {
    jerarquia?: string;
    plaza?: string;
    unidadRegional?: string;
    destino?: string;
  };
  resumenTarea?: string; // Resumen de la tarea realizada / Síntesis operativa
  observaciones?: string;
}

export interface LineaMembrete {
  id: string;
  texto: string;
  negrita: boolean;
  subrayado: boolean;
  tamano: 'sm' | 'base' | 'lg' | 'xl';
  color: 'azul' | 'negro' | 'gris';
}

export interface ConfiguracionSistema {
  id: string;
  nombreInstitucion: string; // "POLICÍA DE LA PROVINCIA"
  unidadRegional: string;    // "DIRECCIÓN DE POLICÍA CIENTÍFICA"
  dependencia: string;       // "DIVISIÓN CRIMINALÍSTICA Y ACCIDENTOLOGÍA"
  siglasDependencia: string; // "DPC"
  subtituloReportes: string; // "Sistema Integral de Actuaciones y Novedades Operativas"
  logoUrl?: string;
  pieDePagina: string;

  // Membrete Oficial Policial Personalizable (Según Imagen Oficial Formosa / Cibercrimen)
  logoIzquierdoUrl?: string;
  textoDebajoLogoIzquierdo?: string; // ej: '"La seguridad pública es una construcción colectiva"'
  logoDerechoUrl?: string;
  textoDebajoLogoDerecho?: string;   // ej: 'D.G.P.C.'
  lineasMembrete?: LineaMembrete[];
  direccionDependencia?: string;
  contactoDependencia?: string;
  ciudadDependencia?: string;

  // Catálogos configurables
  jerarquias: string[];
  gruposGuardia: string[];
  tiposGuardia?: string[]; // 'Brigada', 'Servicios - Técnicos', 'Administrativa', 'Pericial', 'Prevención'
  medicosForensesCatalogo?: string[]; // Médicos forenses pre-cargados
  tiposRequerimiento: string[];
  tiposOficio: string[];
  juzgadosFiscalias: string[];
  dependenciasPoliciales: string[];
  unidadesRegionales?: string[]; // Catálogo de Unidades Regionales policiales
  destinosPoliciales?: string[]; // Catálogo de Destinos policiales
  hechosCriminalistica: string[];
  hechosAccidentologia?: string[];
  viasSolicitud: string[];
  tiposRecargo: string[];
  condicionesInvolucrado?: string[]; // "Demorado / Aprehendido", "Denunciante", "Damnificado / Víctima", "Testigo", "Imputado", "Conductor", "Acompañante"
  funcionesGuardiaCatalogo?: string[]; // "Oficial de servicio – Perito de turno", "Chofer – Fotógrafo", etc.

  // Supabase Sync opcional
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseSyncHabilitado?: boolean;
  ultimaSincronizacion?: string;

  // Control de Numerador de Intervención Criminalística y Accidentológica
  inicioNroIntervencionCriminalistica?: number; // ej. 3800 o 1
  ultimoNroIntervencionCriminalistica?: number; // ej. 3812
  inicioNroIntervencionAccidentologica?: number; // ej. 2500 o 1
  ultimoNroIntervencionAccidentologica?: number; // ej. 2584
  ultimaHoraIntervencion?: string; // ej. "18:28 hs."

  // Control de Numerador de Inspecciones Oculares (debe comenzar del 1 con opción de reseteo)
  inicioNroIO?: number; // ej. 1
  ultimoNroIO?: number; // ej. 0 (próxima es 1) o número alcanzado

  // Estructura y Orden de Módulos personalizable (Módulos principales y submódulos)
  estructuraModulos?: ModuloEstructuraConfig[];

  // Retención y depuración de registros de auditoría (configurable solo por superadmin)
  diasRetencionAuditoria?: number; // ej. 30, 60, 90, 180, 365 días

  // Delegación a la que pertenece esta configuración
  delegacionId?: string;
}

export interface ModuloEstructuraConfig {
  id: string; // ID del módulo / tab (ej. 'dashboard', 'guardias', 'inspecciones', etc.)
  label: string; // Título visible del módulo
  desc?: string; // Descripción breve
  orden: number; // Posición numérica de orden
  padreId?: string | null; // ID del módulo padre si es un submódulo (null si es módulo principal)
  visible?: boolean;
}

export interface GrupoPersonal {
  id: string;
  nombre: string; // ej. "Guardia A", "Guardia B", "Guardia C", "Sección Pericial Norte"
  descripcion?: string;
  color?: string; // clase o color hex
  jefeGrupo?: string; // Oficial / Perito a cargo
  personalIds: string[]; // IDs de miembros asignados
  funcionesSugeridas?: Array<{ funcion: string; personalNombre: string }>;
  activo: boolean;
  delegacionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccionesRol {
  // Operaciones de Datos / CRUD
  puedeCrear: boolean;            // Crear nuevos registros (expedientes, intervenciones, personal, etc.)
  puedeVer: boolean;              // Visualizar registros y reportes
  puedeModificar: boolean;        // Editar registros existentes
  puedeEliminar: boolean;         // Eliminar registros o datos sensibles

  // Exportación e Impresión
  puedeExportarPdf: boolean;      // Imprimir o exportar documentos oficiales a PDF
  puedeExportarCsv: boolean;      // Exportar planillas a Excel / CSV

  // Privilegios Especiales / Administrativos
  puedeVerOtrasDelegaciones: boolean;        // Conmutar y visualizar datos de otras delegaciones
  puedeModificarActuacionesCargadas: boolean;// Modificar actuaciones/partes/intervenciones ya guardadas/cerradas
  puedeAdministrarModulos: boolean;          // Ordenar y jerarquizar estructura de menú / submódulos
  puedeResetearContadores: boolean;          // Resetear numeradores oficiales (LC, SV, IO, Folios)
  puedeRecargarOtrasDelegaciones: boolean;   // Asignar recargos operativos a delegaciones ajenas
  puedeGestionarUsuarios: boolean;           // Crear, editar y administrar usuarios y roles
  puedeConfirmarFotografias?: boolean;       // Validar y confirmar cantidad de fotografías en Inspecciones Oculares
}

export type ColorRol = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';

export interface RolSistema {
  id: string;
  nombre: string;
  descripcion: string;
  color: ColorRol;
  esSistema?: boolean; // Roles predeterminados protegidos contra eliminación involuntaria
  modulosPermitidos: string[]; // Módulos a los que otorga acceso
  acciones: AccionesRol;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type RolUsuario = 'Operador' | 'Administrador' | 'superusuario' | string;

export interface DelegacionPolicial {
  id: string; // ej: 'del-laguna-blanca', 'del-clorinda'
  nombre: string; // ej: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA'
  siglas: string; // ej: 'DPC-LB'
  unidadRegional: string; // ej: 'DIRECCIÓN GENERAL DE POLICÍA CIENTÍFICA'
  ciudad: string; // ej: 'Laguna Blanca'
  direccion?: string;
  telefono?: string;
  email?: string;
  logoIzquierdoUrl?: string;
  textoDebajoLogoIzquierdo?: string;
  logoDerechoUrl?: string;
  textoDebajoLogoDerecho?: string;
  lineasMembrete?: LineaMembrete[];
  pieDePagina?: string;
  activo: boolean;
  createdAt: string;
}

export interface UsuarioSistema {
  id: string;
  apellidoYNombre: string;
  email: string;
  username: string; // Nombre de usuario para login
  password: string; // Contraseña
  delegacionId: string; // Delegación primaria asignada
  rol: RolUsuario; // 'Operador' | 'Administrador' | 'superusuario' o rol personalizado
  rolId?: string; // ID del RolSistema vinculado
  puedeVerOtrasDelegaciones: boolean;
  delegacionesPermitidas?: string[]; // IDs de delegaciones adicionales que puede ver
  modulosPermitidos: string[]; // Módulos a los que tiene acceso
  puedeEliminar: boolean; // Si tiene permisos para borrar registros

  // Acciones / permisos granulares
  accionesPersonalizadas?: Partial<AccionesRol>;

  // Permiso específico: Modificar actuaciones/intervenciones ya cargadas en Parte de Novedades, Inspecciones Oculares e Intervenciones
  puedeModificarActuacionesCargadas?: boolean;

  // Permiso específico: Administrar módulos, ordenarlos y definirlos como submódulos
  puedeAdministrarModulos?: boolean;

  // Permiso específico: Resetear o modificar contadores oficiales
  puedeResetearContadores?: boolean;

  // Permiso específico: Cargar o asignar recargos a otras delegaciones
  puedeRecargarOtrasDelegaciones?: boolean;

  // Permiso específico: Validar y confirmar cantidad de fotografías en Inspecciones Oculares
  puedeConfirmarFotografias?: boolean;

  activo: boolean;
  dni?: string;
  nombre?: string; // Compatibilidad
  ultimoAcceso?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistroAuditoria {
  id: string;
  fechaHora: string; // ISO string
  usuarioId: string;
  username: string;
  apellidoYNombre: string;
  rol: RolUsuario | string;
  delegacionId: string;
  delegacionNombre?: string;
  modulo: string; // "Recargos", "Guardias", "Inspecciones", "Contadores", "Usuarios", "Expedientes", etc.
  accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'LOGIN' | 'RESETEO_CONTADOR' | 'CAMBIO_PASSWORD' | 'TRASLADO' | 'OTRO';
  descripcion: string;
  detalles?: string;
}

export interface SerieNumerario {
  id: string;
  nombre: string; // ej: "Oficio Jefatura", "Oficio Vicedirección", "Memorándums", "Expedientes", "Circulares"
  prefijo: string; // ej: "Oficio J N°", "Mem. N°", "Exp. N°"
  anio: number; // ej: 2026
  limiteFolios: number; // ej: 1000, ampliable +100
  columnas: number; // 20
  color: string; // ej: "blue", "indigo", "emerald", "amber", "purple", "rose"
  delegacionId?: string;
  descripcion?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FolioAsignado {
  id: string;
  serieId: string;
  numero: number; // ej: 15
  codigoCaratula: string; // ej: "Oficio J N° 15/2026"
  caratulaPersonalizada?: string;
  categoriaDocumento: string; // "Oficio Judicial", "Memorándum", "Nota Interna", "Expediente", "Circular", etc.
  anio: number;
  asunto: string;
  destinatario: string;
  solicitante?: string;
  observaciones?: string;
  esRango?: boolean;
  rangoGrupoId?: string;
  rangoDesde?: number;
  rangoHasta?: number;
  usuarioRegistro?: string;
  fechaAsignacion: string; // YYYY-MM-DD
  horaAsignacion?: string;
  delegacionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccidentologiaRegistro {
  id: string;
  codigo: string; // ej: "Ene-01", "Feb-02", "Oct-01"
  delegacionId?: string;
  intervencionId?: string; // Vinculación a intervención si fue autogenerada
  parteId?: string;

  // 1° Módulo: Siniestros Viales con Personal Policial Involucrado
  fecha: string; // YYYY-MM-DD
  dia: string; // "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
  localidad: string;
  lugarOcurrido: string;
  horarioOcurrido: string; // "08:30" o "08:30 hs."
  dependenciaInterviniente: string;
  tipoSiniestro: string; // "Colisión", "Despiste", "Vuelco", "Caída", "Atropello"
  zona: string; // "Urbana", "Suburbana", "Rural", "Ruta"
  tipoVia: 'RECTA' | 'INTERSECCIÓN' | 'ROTONDA' | string;
  tipoCalzada: 'Asfalto' | 'Tierra' | 'Ripio' | string;
  estadoCalzada: 'Bueno' | 'Regular' | 'Malo' | string;
  senalizacion: 'SI' | 'NO' | string;
  anguloVisual: 'Bueno' | 'Regular' | 'Malo' | string;
  iluminacion: 'Bueno' | 'Regular' | 'Malo' | string;
  estadoClima: string; // "Despejado", "Lluvia", "Neblina", "Viento fuerte", etc.
  observacionesSiniestro?: string;

  // 2° Módulo: Datos Generales
  jerarquia: string;
  apellidoYNombre: string;
  edad: number | string;
  destino: string;
  unidadRegional: string;
  situacionLaboral: 'LIC.' | 'ACTIVO' | 'RETIRO' | 'A DISP. D1' | string;
  situacionServicio: 'ENTRANTE' | 'SALIENTE' | 'LICENCIA' | 'FRANCO' | string;
  tipoServicio: 'ENTRANTE' | 'SALIENTE' | 'FRANCO' | string;
  vestimenta: 'UNIFORMADO' | 'CIVIL' | string;
  tipoLesiones: string; // "Sin Lesiones", "Leves", "Graves", "Gravísimas", "Óbito"
  alcohotest: string; // "0.00 g/l (Negativo)", "Positivo 0.45 g/l", "No se realizó"
  observacionesPersonal?: string;

  // 3° Módulo: Rodados
  tipoRodadoPolicial: string;
  tipoRodadoOtros: string;
  otrosInvolucrados: string; // "Ninguno", "Animales", "Postes", etc.
  cascoPolicial: string; // "Colocado", "No colocado", "No aplica"
  cascoOtro: string; // "Colocado", "No colocado", "No aplica"
  resultadoPolicial: 'EMBESTIDO' | 'EMBISTENTE' | string;
  persPolHuellas: 'FRENADA' | 'DERRAPE' | 'SIN HUELLAS' | string;
  personalPolicialDinamica: 'CAIDA' | 'ARRASTRE' | 'IMPACTO DIRECTO' | string;
  evidencias: string;

  // Estado de completitud: si falta tipo de lesiones o alcohotest
  faltaDatos?: boolean;
  datosPendientes?: string[]; // ej: ['tipoLesiones', 'alcohotest']

  createdAt: string;
  updatedAt: string;
}


