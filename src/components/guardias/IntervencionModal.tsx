import React, { useState, useMemo } from 'react';
import {
  IntervencionParte,
  TipoIntervencion,
  InvolucradoIntervencion,
  TestigoActa,
  VehiculoSiniestro,
  ConfiguracionSistema,
  AsignacionFuncionGuardia,
  Personal,
  GrupoPersonal,
  ParteNovedadesGuardia,
  TipoLesionPolicial,
  TipoAsistenciaMedica,
  UsuarioSistema,
} from '../../types/police';
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Car,
  Users,
  CheckCircle2,
  Sparkles,
  Loader2,
  UserPlus,
  ChevronDown,
  Tag,
  Search,
  Check,
  Camera,
  Activity,
  AlertCircle,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Lock,
  Hash,
  UserCheck,
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { generarLaborCriminalisticaConIA } from '../../services/aiCriminalisticaService';

interface IntervencionModalProps {
  intervencion?: IntervencionParte | null;
  tipoForzado?: TipoIntervencion | null;
  siguienteCorrelativo: number;
  añoActual: number;
  parteId: string;
  config: ConfiguracionSistema;
  funcionesGuardia?: AsignacionFuncionGuardia[];
  personalList?: Personal[];
  gruposList?: GrupoPersonal[];
  partesList?: ParteNovedadesGuardia[];
  currentUser?: UsuarioSistema;
  isReadOnly?: boolean;
  onSave: (interv: IntervencionParte) => void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
  onClose: () => void;
}

export const IntervencionModal: React.FC<IntervencionModalProps> = ({
  intervencion,
  tipoForzado,
  siguienteCorrelativo,
  añoActual,
  parteId,
  config,
  funcionesGuardia = [],
  personalList = [],
  gruposList = [],
  partesList = [],
  currentUser,
  isReadOnly = false,
  onSave,
  onSaveConfig,
  onClose,
}) => {
  const isEditing = Boolean(intervencion);
  const tipoEfectivo: TipoIntervencion = intervencion
    ? intervencion.tipoIntervencion
    : (tipoForzado || 'Criminalística');
  const isTypeLocked = Boolean(tipoForzado || isEditing);

  // Privilegios para modificar el código correlativo generado
  const esPrivilegiado = useMemo(() => {
    return currentUser?.rol === 'superusuario' || currentUser?.rol === 'administrador';
  }, [currentUser?.rol]);

  // Base de búsqueda de personas pre-cargadas (por DNI)
  const poolPersonas = useMemo(() => {
    const map = new Map<string, { apellidoYNombre: string; edad: string | number; condicion?: string }>();

    // De personal policial
    personalList.forEach((p) => {
      const clean = p.dni?.trim();
      if (clean) {
        map.set(clean, {
          apellidoYNombre: `${p.jerarquia} ${p.apellidoYNombre}`,
          edad: p.fechaNacimiento
            ? Math.floor((Date.now() - new Date(p.fechaNacimiento).getTime()) / 31557600000)
            : 'Mayor',
          condicion: 'Personal Policial',
        });
      }
    });

    // De partes e intervenciones previas
    (partesList || []).forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        (interv.involucrados || []).forEach((inv) => {
          const clean = inv.dni?.trim();
          if (clean && clean !== 'S/D' && !map.has(clean)) {
            map.set(clean, {
              apellidoYNombre: inv.apellidoYNombre,
              edad: inv.edad,
              condicion: inv.condicion || inv.funcionEnHecho,
            });
          }
        });
        (interv.testigos || []).forEach((test) => {
          const clean = test.dni?.trim();
          if (clean && clean !== 'S/D' && !map.has(clean)) {
            map.set(clean, {
              apellidoYNombre: test.apellidoYNombre,
              edad: test.edad,
              condicion: 'Testigo de Acta',
            });
          }
        });
      });
    });

    return map;
  }, [personalList, partesList]);

  // Base de búsqueda de vehículos pre-cargados (por Dominio / Patente)
  const poolVehiculos = useMemo(() => {
    const map = new Map<string, { tipo: string; marca?: string; modelo?: string; propietarioOConductor: string; circulacion?: string }>();

    (partesList || []).forEach((parte) => {
      (parte.intervenciones || []).forEach((interv) => {
        (interv.vehiculosSiniestro || []).forEach((v) => {
          const cleanDom = (v.dominio || '').trim().toUpperCase();
          if (cleanDom && cleanDom !== 'S/D' && !map.has(cleanDom)) {
            map.set(cleanDom, {
              tipo: v.tipo,
              marca: v.marca,
              modelo: v.modelo,
              propietarioOConductor: v.propietarioOConductor,
              circulacion: v.circulacion,
            });
          }
        });
      });
    });

    return map;
  }, [partesList]);

  const [formData, setFormData] = useState<IntervencionParte>(() => {
    if (intervencion) return { ...intervencion };
    const correlativo = siguienteCorrelativo;
    const siglas = config.siglasDependencia || 'DPC';
    const isVial = tipoEfectivo === 'Accidentológica';

    const defaultVehiculos = isVial
      ? [
          {
            id: 'vs-1',
            identificador: 'MÓVIL UNO',
            tipo: 'Automóvil',
            propietarioOConductor: '',
            circulacion: '',
            zonaContacto: '',
            lesiones: 'Ileso',
          },
          {
            id: 'vs-2',
            identificador: 'MÓVIL DOS',
            tipo: 'Motovehículo',
            propietarioOConductor: '',
            circulacion: '',
            zonaContacto: '',
            lesiones: 'Sí, carácter LEVE',
          },
        ]
      : [];

    // Pre-cargar personal técnico sugerido de la guardia si existe
    const peritoDefault = funcionesGuardia.find((f) =>
      f.funcion.toLowerCase().includes('perito') || f.funcion.toLowerCase().includes('servicio')
    )?.personalNombre || '';

    const choferDefault = funcionesGuardia.find((f) =>
      f.funcion.toLowerCase().includes('chofer') || f.funcion.toLowerCase().includes('fotógrafo')
    )?.personalNombre || '';

    const auxiliarDefault = funcionesGuardia.find((f) =>
      f.funcion.toLowerCase().includes('auxiliar') || f.funcion.toLowerCase().includes('guardia')
    )?.personalNombre || '';

    return {
      id: 'int-' + Date.now(),
      parteId,
      nroCorrelativo: correlativo,
      codigoIntervencion: isVial
        ? `INTERVENCIÓN ACCIDENTOLÓGICA Nº    ${correlativo}    /${añoActual}-${siglas}.`
        : `INTERVENCIÓN CRIMINALÍSTICA Nº    ${correlativo}    /${añoActual}-${siglas}.`,
      tipoIntervencion: tipoEfectivo,
      hecho: isVial
        ? 'CONSTATACIÓN RELACIONADO A SINIESTRO VIAL'
        : (config.hechosCriminalistica[0] || 'SECUESTRO Y APREHENSION'),
      solicitudHora: '18:00 hs.',
      solicitudVia: 'vía telefónica.',
      inspeccionFecha: new Date().toISOString().slice(0, 10),
      inspeccionHora: '18:15',
      inspeccionLugar: '',
      dependencia: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      referencia: '',
      involucrados: [],
      testigos: [
        { id: 't-1', apellidoYNombre: '', dni: '', edad: '' },
        { id: 't-2', apellidoYNombre: '', dni: '', edad: '' },
      ],
      personalTecnico: {
        peritoAuxiliar: peritoDefault,
        choferFotografo: choferDefault,
        auxiliar: auxiliarDefault,
      },
      vehiculosSiniestro: defaultVehiculos,
      sintesisHecho: '',
      laborCriminalistica: isVial
        ? '1. Fijación fotográfica de daños vehiculares y punto de impacto.\n2. Relevamiento planimétrico de calzada, huellas de frenada y arrastre.\n3. Verificación de documentación y secuestro preventivo.'
        : '1. Fijación fotográfica panorámica y de detalle.\n2. Relevamiento planimétrico del lugar.\n3. Levantamiento de rastros con cadena de custodia.',
      createdAt: new Date().toISOString(),
    };
  });

  // Estado de IA generando Labor Criminalística
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Estados de catálogo dinámico Hecho
  const [mostrarNuevoHechoInput, setMostrarNuevoHechoInput] = useState(false);
  const [nuevoHechoTexto, setNuevoHechoTexto] = useState('');

  // Estados de catálogo dinámico: Solicitud Vía, Referencia/Causa, Tipo de Lesión
  const [mostrarNuevaViaInput, setMostrarNuevaViaInput] = useState(false);
  const [nuevaViaTexto, setNuevaViaTexto] = useState('');
  const [mostrarNuevaCausaInput, setMostrarNuevaCausaInput] = useState(false);
  const [nuevaCausaTexto, setNuevaCausaTexto] = useState('');
  const [mostrarNuevoTipoLesionInput, setMostrarNuevoTipoLesionInput] = useState(false);
  const [nuevoTipoLesionTexto, setNuevoTipoLesionTexto] = useState('');

  // Estados de búsqueda y mensajes
  const [msgPersonaEncontrada, setMsgPersonaEncontrada] = useState<string | null>(null);
  const [msgVehiculoEncontrado, setMsgVehiculoEncontrado] = useState<string | null>(null);

  // Estados de nuevo Involucrado con lesiones estrictas, asistencia médica y condición policial
  const [nuevoInv, setNuevoInv] = useState<{
    apellidoYNombre: string;
    dni: string;
    edad: string;
    condicion: string;
    funcionEnHecho: string;
    domicilio: string;
    telefono: string;
    tipoLesion: TipoLesionPolicial;
    asistenciaMedica: TipoAsistenciaMedica;
    nosocomioDestino: string;
    esPersonalPolicial: boolean;
    jerarquia: string;
    plaza: string;
    unidadRegional: string;
    destino: string;
    alcohotest: string;
  }>({
    apellidoYNombre: '',
    dni: '',
    edad: '',
    condicion: 'Demorado / Aprehendido',
    funcionEnHecho: 'Demorado / Aprehendido',
    domicilio: '',
    telefono: '',
    tipoLesion: 'Sin Lesiones',
    asistenciaMedica: 'Asistido en el lugar',
    nosocomioDestino: '',
    esPersonalPolicial: false,
    jerarquia: config.jerarquias[0] || 'Oficial',
    plaza: '',
    unidadRegional: config.unidadesRegionales?.[0] || 'Unidad Regional Cuatro (Laguna Blanca)',
    destino: config.destinosPoliciales?.[0] || config.dependencia || 'División Policía Científica Laguna Blanca',
    alcohotest: '0.00 g/l (Negativo)',
  });
  const [mostrarNuevaCondicionInput, setMostrarNuevaCondicionInput] = useState(false);
  const [nuevaCondicionTexto, setNuevaCondicionTexto] = useState('');

  // Opciones de personal policial para SearchableSelect
  const personalOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; sublabel?: string }> = [];
    funcionesGuardia.forEach((f) => {
      list.push({
        value: f.personalNombre,
        label: `${f.personalNombre} (${f.funcion})`,
        sublabel: 'Guardia Actual',
      });
    });
    personalList.forEach((p) => {
      const name = `${p.jerarquia} ${p.apellidoYNombre}`;
      if (!list.some((item) => item.value === name || item.value === p.apellidoYNombre)) {
        list.push({
          value: name,
          label: `${name} - ${p.seccionGrupo}`,
          sublabel: `Plaza: ${p.plaza}`,
        });
      }
    });
    return list;
  }, [funcionesGuardia, personalList]);

  // Manejador del botón "Buscar en registros" para Personas por DNI
  const handleBuscarPersonaPorDNI = () => {
    const dniTrim = nuevoInv.dni.trim();
    if (!dniTrim) {
      setMsgPersonaEncontrada('Ingrese un DNI en el campo para buscar en los registros.');
      setTimeout(() => setMsgPersonaEncontrada(null), 3500);
      return;
    }

    const found = poolPersonas.get(dniTrim);
    if (found) {
      setNuevoInv((prev) => ({
        ...prev,
        apellidoYNombre: found.apellidoYNombre,
        edad: found.edad !== undefined && found.edad !== null ? String(found.edad) : prev.edad,
        condicion: found.condicion || prev.condicion,
        funcionEnHecho: found.condicion || prev.funcionEnHecho,
      }));
      setMsgPersonaEncontrada(`✓ Registro encontrado: ${found.apellidoYNombre} (${found.edad} años). Datos autocompletados.`);
      setTimeout(() => setMsgPersonaEncontrada(null), 4000);
    } else {
      setMsgPersonaEncontrada(`No se encontraron registros previos para el DNI ${dniTrim}. Puede completar manualmente.`);
      setTimeout(() => setMsgPersonaEncontrada(null), 4000);
    }
  };

  // Selector de personal externo
  const [mostrarPersonalExterno, setMostrarPersonalExterno] = useState<{
    rol: 'peritoAuxiliar' | 'choferFotografo' | 'auxiliar' | null;
  }>({ rol: null });

  // Lista de condiciones disponibles
  const listaCondiciones = config.condicionesInvolucrado || [
    'Demorado / Aprehendido',
    'Denunciante',
    'Damnificado / Víctima',
    'Testigo',
    'Imputado',
    'Conductor',
    'Acompañante',
    'Sospechoso',
    'Examinado Forense',
    'Otro',
  ];

  // Si cambia el tipo entre Criminalística y Accidentológica
  const handleCambioTipo = (tipo: TipoIntervencion) => {
    if (isTypeLocked && tipo !== tipoEfectivo) return;
    const siglas = config.siglasDependencia || 'DPC';
    const nuevoCodigo = tipo === 'Accidentológica'
      ? `INTERVENCIÓN ACCIDENTOLÓGICA Nº    ${formData.nroCorrelativo}    /${añoActual}-${siglas}.`
      : `INTERVENCIÓN CRIMINALÍSTICA Nº    ${formData.nroCorrelativo}    /${añoActual}-${siglas}.`;

    const nuevoHecho = tipo === 'Accidentológica'
      ? 'CONSTATACIÓN RELACIONADO A SINIESTRO VIAL'
      : (config.hechosCriminalistica[0] || 'SECUESTRO Y APREHENSION');

    let nuevosVehiculos = formData.vehiculosSiniestro || [];
    if (tipo === 'Accidentológica' && nuevosVehiculos.length === 0) {
      nuevosVehiculos = [
        {
          id: 'vs-1',
          identificador: 'MÓVIL UNO',
          tipo: 'Automóvil',
          propietarioOConductor: '',
          circulacion: '',
          zonaContacto: '',
          lesiones: 'Ileso',
        },
        {
          id: 'vs-2',
          identificador: 'MÓVIL DOS',
          tipo: 'Motovehículo',
          propietarioOConductor: '',
          circulacion: '',
          zonaContacto: '',
          lesiones: 'Sí, carácter LEVE',
        },
      ];
    }

    setFormData((prev) => ({
      ...prev,
      tipoIntervencion: tipo,
      codigoIntervencion: nuevoCodigo,
      hecho: nuevoHecho,
      vehiculosSiniestro: nuevosVehiculos,
    }));
  };

  // Agregar nuevo Hecho al catálogo
  const handleGuardarNuevoHecho = () => {
    if (!nuevoHechoTexto.trim()) return;
    const textoUpper = nuevoHechoTexto.trim().toUpperCase();
    if (!config.hechosCriminalistica.includes(textoUpper)) {
      const updatedHechos = [...config.hechosCriminalistica, textoUpper];
      if (onSaveConfig) {
        onSaveConfig({ ...config, hechosCriminalistica: updatedHechos });
      }
    }
    setFormData((prev) => ({ ...prev, hecho: textoUpper }));
    setNuevoHechoTexto('');
    setMostrarNuevoHechoInput(false);
  };

  // Agregar nueva Condición al catálogo
  const handleGuardarNuevaCondicion = () => {
    if (!nuevaCondicionTexto.trim()) return;
    const texto = nuevaCondicionTexto.trim();
    const actuales = config.condicionesInvolucrado || listaCondiciones;
    if (!actuales.some((c) => c.toLowerCase() === texto.toLowerCase())) {
      const updated = [...actuales, texto];
      if (onSaveConfig) {
        onSaveConfig({ ...config, condicionesInvolucrado: updated });
      }
    }
    setNuevoInv((prev) => ({ ...prev, condicion: texto, funcionEnHecho: texto }));
    setNuevaCondicionTexto('');
    setMostrarNuevaCondicionInput(false);
  };

  // Agregar nueva Vía de Solicitud sin duplicados
  const handleGuardarNuevaVia = () => {
    if (!nuevaViaTexto.trim()) return;
    const texto = nuevaViaTexto.trim();
    const actuales = config.viasSolicitud || ['vía telefónica.', 'vía radial.', 'por escrito.', 'comparecencia personal en guardia.'];
    if (!actuales.some((v) => v.toLowerCase() === texto.toLowerCase())) {
      const updated = [...actuales, texto];
      if (onSaveConfig) {
        onSaveConfig({ ...config, viasSolicitud: updated });
      }
    }
    setFormData((prev) => ({ ...prev, solicitudVia: texto }));
    setNuevaViaTexto('');
    setMostrarNuevaViaInput(false);
  };

  // Agregar nueva Causa / Referencia sin duplicados
  const handleGuardarNuevaCausa = () => {
    if (!nuevaCausaTexto.trim()) return;
    const texto = nuevaCausaTexto.trim();
    const actuales = config.causasReferencia || ['Sumario Judicial', 'Actuaciones Prevencionales', 'Expediente', 'Causa Penal', 'Oficio Judicial'];
    if (!actuales.some((c) => c.toLowerCase() === texto.toLowerCase())) {
      const updated = [...actuales, texto];
      if (onSaveConfig) {
        onSaveConfig({ ...config, causasReferencia: updated });
      }
    }
    setFormData((prev) => ({ ...prev, referencia: texto }));
    setNuevaCausaTexto('');
    setMostrarNuevaCausaInput(false);
  };

  // Agregar nuevo Tipo de Lesión sin duplicados
  const handleGuardarNuevoTipoLesion = () => {
    if (!nuevoTipoLesionTexto.trim()) return;
    const texto = nuevoTipoLesionTexto.trim();
    const actuales = config.tiposLesionCatalogo || ['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas', 'Óbito'];
    if (!actuales.some((l) => l.toLowerCase() === texto.toLowerCase())) {
      const updated = [...actuales, texto];
      if (onSaveConfig) {
        onSaveConfig({ ...config, tiposLesionCatalogo: updated });
      }
    }
    setFormData((prev) => ({ ...prev, tipoLesionesLC: texto }));
    setNuevoInv((prev) => ({ ...prev, tipoLesion: texto as any }));
    setNuevoTipoLesionTexto('');
    setMostrarNuevoTipoLesionInput(false);
  };

  // Agregar involucrado a la intervención
  const handleAddInvolucrado = () => {
    if (!nuevoInv.apellidoYNombre.trim()) return;
    const esPol = Boolean(nuevoInv.esPersonalPolicial);
    const cond = esPol ? (nuevoInv.condicion || 'Personal Policial') : (nuevoInv.condicion || nuevoInv.funcionEnHecho || 'Demorado / Aprehendido');
    const nuevo: InvolucradoIntervencion = {
      id: 'inv-' + Date.now(),
      apellidoYNombre: nuevoInv.apellidoYNombre.trim().toUpperCase(),
      dni: nuevoInv.dni.trim(),
      edad: nuevoInv.edad || 'Mayor',
      condicion: cond,
      funcionEnHecho: cond,
      domicilio: nuevoInv.domicilio,
      telefono: nuevoInv.telefono,
      tipoLesion: nuevoInv.tipoLesion,
      asistenciaMedica: nuevoInv.tipoLesion !== 'Sin Lesiones' ? nuevoInv.asistenciaMedica : undefined,
      nosocomioDestino:
        nuevoInv.tipoLesion !== 'Sin Lesiones' && nuevoInv.asistenciaMedica === 'Trasladado a nosocomio'
          ? nuevoInv.nosocomioDestino
          : undefined,
      esPersonalPolicial: esPol,
      jerarquia: esPol ? (nuevoInv.jerarquia || config.jerarquias[0] || 'Oficial') : undefined,
      plaza: esPol ? nuevoInv.plaza : undefined,
      unidadRegional: esPol ? (nuevoInv.unidadRegional || config.unidadesRegionales?.[0] || 'Unidad Regional Cuatro (Laguna Blanca)') : undefined,
      destino: esPol ? (nuevoInv.destino || config.destinosPoliciales?.[0] || config.dependencia || 'División Policía Científica Laguna Blanca') : undefined,
      alcohotest: esPol ? (nuevoInv.alcohotest || '0.00 g/l (Negativo)') : undefined,
    };

    setFormData((prev) => {
      const updatedInvs = [...prev.involucrados, nuevo];
      const hasPoliceInvolucrado = updatedInvs.some((i) => i.esPersonalPolicial) || prev.involucraPersonalPolicial;
      const policeData = esPol
        ? {
            jerarquia: nuevoInv.jerarquia || config.jerarquias[0] || 'Oficial',
            plaza: nuevoInv.plaza || 'S/D',
            apellidoYNombre: nuevoInv.apellidoYNombre.trim().toUpperCase(),
            dni: nuevoInv.dni.trim(),
            rol: cond,
            destino: nuevoInv.destino || config.destinosPoliciales?.[0] || config.dependencia || 'División Policía Científica',
            tipoLesion: nuevoInv.tipoLesion || 'Sin Lesiones',
            tipoRodado: '',
          }
        : prev.personalPolicial;

      return {
        ...prev,
        involucrados: updatedInvs,
        involucraPersonalPolicial: hasPoliceInvolucrado,
        personalPolicial: policeData || prev.personalPolicial,
      };
    });

    setNuevoInv({
      apellidoYNombre: '',
      dni: '',
      edad: '',
      condicion: 'Demorado / Aprehendido',
      funcionEnHecho: 'Demorado / Aprehendido',
      domicilio: '',
      telefono: '',
      tipoLesion: 'Sin Lesiones',
      asistenciaMedica: 'Asistido en el lugar',
      nosocomioDestino: '',
      esPersonalPolicial: false,
      jerarquia: config.jerarquias[0] || 'Oficial',
      plaza: '',
      unidadRegional: config.unidadesRegionales?.[0] || 'Unidad Regional Cuatro (Laguna Blanca)',
      destino: config.destinosPoliciales?.[0] || config.dependencia || 'División Policía Científica Laguna Blanca',
      alcohotest: '0.00 g/l (Negativo)',
    });
  };

  // Agregar vehículo siniestrado
  const handleAddVehiculoSiniestro = () => {
    const numeroLetras = ['TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE'];
    const count = (formData.vehiculosSiniestro?.length || 0);
    const idLetra = count < 2 ? (count === 0 ? 'UNO' : 'DOS') : (numeroLetras[count - 2] || String(count + 1));

    const nuevoV: VehiculoSiniestro = {
      id: 'vs-' + Date.now(),
      identificador: `MÓVIL ${idLetra}`,
      tipo: 'Automóvil',
      propietarioOConductor: '',
      circulacion: '',
      zonaContacto: '',
      lesiones: 'Ileso',
    };
    setFormData((prev) => ({
      ...prev,
      vehiculosSiniestro: [...(prev.vehiculosSiniestro || []), nuevoV],
    }));
  };

  const handleUpdateVehiculo = (idx: number, campo: keyof VehiculoSiniestro, valor: string) => {
    const list = [...(formData.vehiculosSiniestro || [])];
    list[idx] = { ...list[idx], [campo]: valor };
    setFormData((prev) => ({ ...prev, vehiculosSiniestro: list }));
  };

  const handleRemoveVehiculo = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      vehiculosSiniestro: prev.vehiculosSiniestro?.filter((_, i) => i !== idx),
    }));
  };

  // GENERAR LABOR CRIMINALÍSTICA CON IA GEMINI
  const handleGenerarLaborConIA = async () => {
    if (!formData.sintesisHecho.trim()) {
      setAiError('Escriba primero una "Síntesis del Hecho" para que la I.A. elabore la labor criminalística adecuada.');
      setTimeout(() => setAiError(null), 4000);
      return;
    }

    try {
      setIsGeneratingAi(true);
      setAiError(null);
      const resultado = await generarLaborCriminalisticaConIA({
        sintesisHecho: formData.sintesisHecho,
        hecho: formData.hecho,
        tipoIntervencion: formData.tipoIntervencion,
        inspeccionLugar: formData.inspeccionLugar,
      });

      if (resultado) {
        setFormData((prev) => ({
          ...prev,
          laborCriminalistica: resultado,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setAiError('Ocurrió un inconveniente al generar con IA. Se mantuvo la labor previa.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.inspeccionLugar.trim()) {
      alert('Indique el lugar donde ocurrió la inspección ocular');
      return;
    }
    if (formData.involucraPersonalPolicial) {
      if (
        !formData.personalPolicial?.apellidoYNombre?.trim() ||
        !formData.personalPolicial?.plaza?.trim() ||
        !formData.personalPolicial?.jerarquia?.trim()
      ) {
        alert(
          'Al indicar que el hecho involucra Personal Policial, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }

    if (isReadOnly) {
      alert('Actuación pericial bloqueada: Las intervenciones ya cargadas no pueden modificarse salvo que cuente con el permiso específico asignado.');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? `Editar: ${formData.codigoIntervencion}` : 'Nueva Intervención de Guardia Correlativa'}
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                {formData.codigoIntervencion}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Banner si la intervención está bloqueada en modo solo consulta */}
          {isReadOnly && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-center gap-2.5 text-amber-950 font-semibold text-xs shadow-2xs">
              <Lock className="w-4 h-4 text-amber-800 shrink-0" />
              <div>
                <span className="block font-bold">Actuación Pericial Bloqueada (Solo Consulta)</span>
                <span className="text-[11px] font-normal text-amber-900 block">
                  Por protocolo pericial, las intervenciones ya cargadas no pueden modificarse salvo que cuente con el permiso específico autorizado.
                </span>
              </div>
            </div>
          )}

          {/* Selector de Tipo de Intervención: Criminalística vs Accidentológica */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
            {isTypeLocked && (
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-600 font-medium pb-1 border-b border-slate-200">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Tipo fijado para esta carga:</span>
                  <strong className="text-blue-900 font-bold uppercase">
                    {tipoEfectivo === 'Criminalística'
                      ? 'Labor Criminalística (LC - Hechos no de Tránsito)'
                      : 'Seguridad Vial (Seg. Vial - Siniestros Viales)'}
                  </strong>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded font-bold">
                  EXCLUSIVO
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <button
                type="button"
                disabled={isTypeLocked && tipoEfectivo !== 'Criminalística'}
                onClick={() => !isTypeLocked && handleCambioTipo('Criminalística')}
                className={`py-2 px-3 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                  formData.tipoIntervencion === 'Criminalística'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : isTypeLocked
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-40 select-none'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer'
                }`}
                title="Labor Criminalística (LC - Hechos no de tránsito)"
              >
                <span>LC (Criminalística - No Tránsito)</span>
              </button>

              <button
                type="button"
                disabled={isTypeLocked && tipoEfectivo !== 'Accidentológica'}
                onClick={() => !isTypeLocked && handleCambioTipo('Accidentológica')}
                className={`py-2 px-3 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                  formData.tipoIntervencion === 'Accidentológica'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : isTypeLocked
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-40 select-none'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 cursor-pointer'
                }`}
                title="Seguridad Vial (Seg. Vial - Siniestros Viales)"
              >
                <span>Seg. Vial (Accidentología)</span>
              </button>
            </div>
          </div>

          {/* N° / Código Oficial de la Intervención con control de privilegios (Superusuario / Admin) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Hash className="w-4 h-4 text-blue-800" />
                <span>N° / Código Oficial de Intervención *</span>
              </label>
              {esPrivilegiado ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  <span>Edición Habilitada (Superusuario / Admin)</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Código Protegido (Solo Administrador puede modificar)</span>
                </span>
              )}
            </div>
            <input
              type="text"
              required
              readOnly={!esPrivilegiado}
              value={formData.codigoIntervencion}
              onChange={(e) => setFormData({ ...formData, codigoIntervencion: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-xs border ${
                esPrivilegiado
                  ? 'border-blue-400 bg-white text-blue-950 focus:ring-2 focus:ring-blue-500'
                  : 'border-slate-300 bg-slate-100 text-slate-700 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Labor Criminalística (LC - Hechos no de Tránsito): Tipo de Lesiones con Checkbox */}
          {formData.tipoIntervencion === 'Criminalística' && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.presentaLesionesLC)}
                    onChange={(e) => setFormData({ ...formData, presentaLesionesLC: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                  />
                  <Activity className="w-4 h-4 text-red-600" />
                  <span>¿Presenta / Registrar Tipo de Lesiones en la Víctima / Demorado?</span>
                </label>
                {formData.presentaLesionesLC && (
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoTipoLesionInput(!mostrarNuevoTipoLesionInput)}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    {mostrarNuevoTipoLesionInput ? 'Cancelar' : '+ Nuevo Tipo de Lesión'}
                  </button>
                )}
              </div>

              {formData.presentaLesionesLC && mostrarNuevoTipoLesionInput && (
                <div className="flex gap-1.5 p-2 bg-red-50/60 rounded-lg border border-red-200 animate-in fade-in">
                  <input
                    type="text"
                    value={nuevoTipoLesionTexto}
                    onChange={(e) => setNuevoTipoLesionTexto(e.target.value)}
                    placeholder="Nuevo tipo de lesión..."
                    className="flex-1 px-2.5 py-1 text-xs border border-red-300 rounded bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleGuardarNuevoTipoLesion}
                    className="bg-red-800 text-white px-3 py-1 rounded font-bold text-xs cursor-pointer hover:bg-red-900"
                  >
                    Guardar
                  </button>
                </div>
              )}

              {formData.presentaLesionesLC && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-100 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Lesión (Normado)</label>
                    <select
                      value={formData.tipoLesionesLC || 'Leves'}
                      onChange={(e) => setFormData({ ...formData, tipoLesionesLC: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-red-950"
                    >
                      {(config.tiposLesionCatalogo || ['Sin Lesiones', 'Leves', 'Graves', 'Gravísimas', 'Óbito']).map((tl) => (
                        <option key={tl} value={tl}>{tl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Detalle / Diagnóstico Médico de Lesiones</label>
                    <input
                      type="text"
                      value={formData.detalleLesionesLC || ''}
                      onChange={(e) => setFormData({ ...formData, detalleLesionesLC: e.target.value })}
                      placeholder="Ej. Escoriaciones en rostro, TEC sin pérdida de conocimiento..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fila 1: HECHO (Configurable / Catálogo) con opción de selección o agregado en línea */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-blue-700" />
                  <span>HECHO (Configurable / Catálogo) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarNuevoHechoInput(!mostrarNuevoHechoInput)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  {mostrarNuevoHechoInput ? 'Cancelar' : '+ Agregar Hecho'}
                </button>
              </div>

              {mostrarNuevoHechoInput ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={nuevoHechoTexto}
                    onChange={(e) => setNuevoHechoTexto(e.target.value.toUpperCase())}
                    placeholder="Nuevo tipo de hecho..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 bg-white uppercase font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleGuardarNuevoHecho}
                    className="bg-blue-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer hover:bg-blue-950"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={formData.hecho}
                    onChange={(e) => setFormData({ ...formData, hecho: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-blue-950 uppercase"
                  >
                    {config.hechosCriminalistica.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                    {!config.hechosCriminalistica.includes(formData.hecho) && (
                      <option value={formData.hecho}>{formData.hecho}</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Solicitud Hora</label>
                <input
                  type="text"
                  value={formData.solicitudHora}
                  onChange={(e) => setFormData({ ...formData, solicitudHora: e.target.value })}
                  placeholder="Ej. 18:28 hs."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Solicitud Vía</label>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaViaInput(!mostrarNuevaViaInput)}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    {mostrarNuevaViaInput ? 'Cancelar' : '+ Nueva'}
                  </button>
                </div>
                {mostrarNuevaViaInput ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={nuevaViaTexto}
                      onChange={(e) => setNuevaViaTexto(e.target.value)}
                      placeholder="Nueva vía..."
                      className="flex-1 px-2 py-1 rounded border border-blue-400 bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleGuardarNuevaVia}
                      className="bg-blue-900 text-white px-2 py-1 rounded font-bold text-[10px]"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.solicitudVia}
                    onChange={(e) => setFormData({ ...formData, solicitudVia: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    {(config.viasSolicitud || [
                      'vía telefónica.',
                      'vía radial.',
                      'por escrito.',
                      'comparecencia personal en guardia.',
                    ]).map((via) => (
                      <option key={via} value={via}>
                        {via}
                      </option>
                    ))}
                    {formData.solicitudVia && !(config.viasSolicitud || []).includes(formData.solicitudVia) && (
                      <option value={formData.solicitudVia}>{formData.solicitudVia}</option>
                    )}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Fila 2: Inspección Ocular Ocurrido (Fecha, Hora, Lugar) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 block text-xs">
              INSPECCIÓN OCULAR OCURRIDO
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Fecha</label>
                <input
                  type="date"
                  required
                  value={formData.inspeccionFecha}
                  onChange={(e) => setFormData({ ...formData, inspeccionFecha: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Hora</label>
                <input
                  type="text"
                  required
                  value={formData.inspeccionHora}
                  onChange={(e) => setFormData({ ...formData, inspeccionHora: e.target.value })}
                  placeholder="Ej. 18:45"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-0.5">Lugar Ocurrido *</label>
                <input
                  type="text"
                  required
                  value={formData.inspeccionLugar}
                  onChange={(e) => setFormData({ ...formData, inspeccionLugar: e.target.value })}
                  placeholder="Ej. Av. Gutnisky y Antártida Argentina"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Fila 3: Dependencia y Referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <SearchableSelect
                label="DEPENDENCIA SOLICITANTE"
                value={formData.dependencia}
                onChange={(val) => setFormData({ ...formData, dependencia: val })}
                options={config.dependenciasPoliciales}
                placeholder="Buscar o escribir dependencia..."
                allowCustom={true}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">REFERENCIA / Causa</label>
                <button
                  type="button"
                  onClick={() => setMostrarNuevaCausaInput(!mostrarNuevaCausaInput)}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  {mostrarNuevaCausaInput ? 'Cancelar' : '+ Nueva Causa'}
                </button>
              </div>

              {mostrarNuevaCausaInput ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={nuevaCausaTexto}
                    onChange={(e) => setNuevaCausaTexto(e.target.value)}
                    placeholder="Nueva causa / referencia..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-blue-400 bg-white text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleGuardarNuevaCausa}
                    className="bg-blue-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <select
                    value={formData.referencia || ''}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="">-- Seleccionar Causa o Referencia --</option>
                    {(config.causasReferencia || [
                      'Sumario Judicial',
                      'Actuaciones Prevencionales',
                      'Expediente',
                      'Causa Penal',
                      'Oficio Judicial',
                    ]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {formData.referencia && !(config.causasReferencia || []).includes(formData.referencia) && (
                      <option value={formData.referencia}>{formData.referencia}</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* HECHO CON PERSONAL POLICIAL INVOLUCRADO */}
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2.5 shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
              <input
                type="checkbox"
                checked={formData.involucraPersonalPolicial || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    involucraPersonalPolicial: checked,
                    personalPolicial: checked
                      ? formData.personalPolicial || {
                          jerarquia: config.jerarquias[0] || 'Oficial Subinspector',
                          plaza: '',
                          apellidoYNombre: '',
                          rol: 'Imputado',
                          dependenciaRevista: '',
                        }
                      : undefined,
                  });
                }}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="flex items-center gap-1.5 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>¿Es un hecho con Personal Policial involucrado?</span>
              </span>
            </label>

            {formData.involucraPersonalPolicial && (
              <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-3">
                <div className="text-[11px] text-amber-900 font-medium">
                  Indique los datos obligatorios del efectivo policial (Jerarquía, Plaza, Apellido y Nombre):
                </div>

                {personalList.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Seleccionar desde Nómina Policial (Opcional para autocompletar):
                    </label>
                    <select
                      onChange={(e) => {
                        const p = personalList.find((item) => item.id === e.target.value);
                        if (p) {
                          setFormData({
                            ...formData,
                            personalPolicial: {
                              ...formData.personalPolicial,
                              jerarquia: p.jerarquia,
                              plaza: p.plaza || '',
                              apellidoYNombre: p.apellidoYNombre,
                              dni: p.dni,
                              rol: formData.personalPolicial?.rol || 'Imputado',
                              dependenciaRevista: p.seccionGrupo || '',
                            },
                          });
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50"
                    >
                      <option value="">-- Seleccionar efectivo de la nómina --</option>
                      {personalList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} {p.apellidoYNombre} (Plaza: {p.plaza || 's/p'}) - DNI {p.dni}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jerarquía *</label>
                    <select
                      value={formData.personalPolicial?.jerarquia || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            jerarquia: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                    >
                      {config.jerarquias.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Plaza N° *</label>
                    <input
                      type="text"
                      required={formData.involucraPersonalPolicial}
                      value={formData.personalPolicial?.plaza || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            plaza: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. 1420"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Apellido y Nombre *</label>
                    <input
                      type="text"
                      required={formData.involucraPersonalPolicial}
                      value={formData.personalPolicial?.apellidoYNombre || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            apellidoYNombre: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. Gómez, Ramón Eduardo"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Condición / Rol en el Hecho</label>
                    <input
                      type="text"
                      list="lista-condiciones-policiales-int"
                      value={formData.personalPolicial?.rol || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            rol: e.target.value,
                          },
                        })
                      }
                      placeholder="Seleccione o escriba condición..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                    <datalist id="lista-condiciones-policiales-int">
                      <option value="Imputado" />
                      <option value="Damnificado / Víctima" />
                      <option value="Aprehendido / Demorado" />
                      <option value="Conductor Siniestro" />
                      <option value="Acompañante" />
                      <option value="Testigo" />
                      <option value="Denunciante" />
                      <option value="Involucrado" />
                      <option value="Sumariado Administrativo" />
                      <option value="Franco de Servicio" />
                      <option value="En Acto de Servicio" />
                      <option value="Personal en Disponibilidad / Pasiva" />
                      <option value="Personal Retirado" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dependencia de Revista</label>
                    <input
                      type="text"
                      value={formData.personalPolicial?.dependenciaRevista || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalPolicial: {
                            ...formData.personalPolicial!,
                            dependenciaRevista: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. Comisaría Laguna Blanca / Comando"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DEMORADO / PERSONAS INVOLUCRADAS (Con selección de CONDICIÓN prepargada) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block">
                DEMORADO / PERSONAS INVOLUCRADAS ({formData.involucrados.length})
              </span>
              <button
                type="button"
                onClick={() => setMostrarNuevaCondicionInput(!mostrarNuevaCondicionInput)}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
              >
                {mostrarNuevaCondicionInput ? 'Cerrar' : '+ Nueva Condición'}
              </button>
            </div>

            {mostrarNuevaCondicionInput && (
              <div className="flex gap-1.5 p-2 bg-white rounded-lg border border-blue-200">
                <input
                  type="text"
                  value={nuevaCondicionTexto}
                  onChange={(e) => setNuevaCondicionTexto(e.target.value)}
                  placeholder="Ej. Damnificado / Víctima, Testigo, etc."
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded"
                />
                <button
                  type="button"
                  onClick={handleGuardarNuevaCondicion}
                  className="bg-blue-900 text-white px-3 py-1 rounded font-bold text-xs cursor-pointer hover:bg-blue-950"
                >
                  Guardar Condición
                </button>
              </div>
            )}

            {msgPersonaEncontrada && (
              <div className="flex items-center gap-1.5 p-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold animate-in fade-in">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                <span>{msgPersonaEncontrada}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Selector Moderno Segmentado: Particular / Civil vs Efectivo Policial */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">Tipo de Involucrado:</span>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoInv((prev) => ({
                          ...prev,
                          esPersonalPolicial: false,
                          condicion: 'Demorado / Aprehendido',
                          funcionEnHecho: 'Demorado / Aprehendido',
                        }));
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        !nuevoInv.esPersonalPolicial
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Particular / Civil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoInv((prev) => ({
                          ...prev,
                          esPersonalPolicial: true,
                          condicion: 'Personal Policial',
                          funcionEnHecho: 'Personal Policial',
                          jerarquia: prev.jerarquia || config.jerarquias[0] || 'Oficial Subayudante',
                          unidadRegional: prev.unidadRegional || config.unidadRegional || 'Unidad Regional Cuatro (Laguna Blanca)',
                          destino: prev.destino || config.dependencia || '',
                        }));
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        nuevoInv.esPersonalPolicial
                          ? 'bg-blue-900 text-white shadow-xs'
                          : 'text-blue-900 hover:bg-blue-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Efectivo Policial</span>
                    </button>
                  </div>
                </div>

                {nuevoInv.esPersonalPolicial && personalList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                    <select
                      onChange={(e) => {
                        const p = personalList.find((item) => item.id === e.target.value);
                        if (p) {
                          setNuevoInv((prev) => ({
                            ...prev,
                            apellidoYNombre: p.apellidoYNombre,
                            dni: p.dni,
                            jerarquia: p.jerarquia,
                            plaza: p.plaza || '',
                            destino: p.seccionGrupo || config.dependencia || '',
                            unidadRegional: config.unidadRegional || 'Unidad Regional Cuatro (Laguna Blanca)',
                            edad: p.fechaNacimiento
                              ? String(Math.floor((Date.now() - new Date(p.fechaNacimiento).getTime()) / 31557600000))
                              : '30',
                          }));
                        }
                      }}
                      defaultValue=""
                      className="text-[11px] py-1 px-2 border border-blue-300 rounded-md bg-white text-blue-950 font-semibold"
                    >
                      <option value="">-- Autocompletar con efectivo de nómina --</option>
                      {personalList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} {p.apellidoYNombre} (DNI {p.dni})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Campos específicos cuando el involucrado ES Personal Policial */}
              {nuevoInv.esPersonalPolicial && (
                <div className="p-3 bg-white rounded-lg border-2 border-blue-300 shadow-2xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Datos Policiales Obligatorios (Jerarquía, Plaza, Unidad Regional y Destino)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Jerarquía *</label>
                      <select
                        value={nuevoInv.jerarquia}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, jerarquia: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold text-slate-900"
                      >
                        {config.jerarquias.map((j) => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Plaza / Carnet Policial *</label>
                      <input
                        type="text"
                        placeholder="Ej. 4235 / Carnet 890"
                        value={nuevoInv.plaza}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, plaza: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Unidad Regional *</label>
                      <select
                        value={nuevoInv.unidadRegional}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, unidadRegional: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-900"
                      >
                        {(config.unidadesRegionales && config.unidadesRegionales.length > 0
                          ? config.unidadesRegionales
                          : [
                              'Unidad Regional Uno (Formosa Capital)',
                              'Unidad Regional Dos (Pirané)',
                              'Unidad Regional Tres (Clorinda)',
                              'Unidad Regional Cuatro (Laguna Blanca)',
                              'Unidad Regional Cinco (Las Lomitas)',
                              'Unidad Regional Seis (Ingeniero Juárez)',
                              'Unidad Regional Siete (General Güemes)'
                            ]
                        ).map((ur) => (
                          <option key={ur} value={ur}>{ur}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Destino Policial *</label>
                      <select
                        value={nuevoInv.destino}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, destino: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-900"
                      >
                        {(config.destinosPoliciales && config.destinosPoliciales.length > 0
                          ? config.destinosPoliciales
                          : [
                              'División Policía Científica Laguna Blanca',
                              'División Investigación Cibercrimen',
                              'Comisaría Laguna Blanca',
                              'Comisaría Clorinda',
                              'Destacamento Riacho He-Hé',
                              'Comisaría El Espinillo',
                              'Comisaría Misión Tacaaglé',
                              'División Comando Radioeléctrico Policial',
                              'División Tránsito Policial'
                            ]
                        ).map((dest) => (
                          <option key={dest} value={dest}>{dest}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Alcohotest *</label>
                      <select
                        value={nuevoInv.alcohotest}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, alcohotest: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold text-slate-900"
                      >
                        <option value="0.00 g/l (Negativo)">0.00 g/l (Negativo)</option>
                        <option value="Positivo (Mayor a 0.00 g/l)">Positivo (Mayor a 0.00 g/l)</option>
                        <option value="No se realizó">No se realizó</option>
                        <option value="Extracción sanguínea en nosocomio">Extracción sanguínea en nosocomio</option>
                        <option value="Se negó a realizar el test">Se negó a realizar el test</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Valor exacto / Observación Alcohotest</label>
                      <input
                        type="text"
                        value={nuevoInv.alcohotest}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, alcohotest: e.target.value })}
                        placeholder="Ej. 0.00 g/l o valor detectado"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fila 1: DNI con botón Buscar en Registros, Apellido y Nombre, Edad, Condición */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4 flex gap-1">
                  <input
                    type="text"
                    placeholder="DNI"
                    value={nuevoInv.dni}
                    onChange={(e) => setNuevoInv({ ...nuevoInv, dni: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarPersonaPorDNI}
                    className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                    title="Buscar en registros de personas por DNI y autocompletar"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar en registros</span>
                  </button>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Apellido y Nombre *"
                    value={nuevoInv.apellidoYNombre}
                    onChange={(e) => setNuevoInv({ ...nuevoInv, apellidoYNombre: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <input
                    type="text"
                    placeholder="Edad"
                    value={nuevoInv.edad}
                    onChange={(e) => setNuevoInv({ ...nuevoInv, edad: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs text-center"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={nuevoInv.condicion}
                    onChange={(e) =>
                      setNuevoInv({ ...nuevoInv, condicion: e.target.value, funcionEnHecho: e.target.value })
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-semibold text-slate-800 text-xs"
                  >
                    {nuevoInv.esPersonalPolicial && (
                      <option value="Personal Policial">Personal Policial Involucrado</option>
                    )}
                    {listaCondiciones.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 2: Clasificación Estricta de Lesiones y Asistencia Médica */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-red-600" />
                    <span>Tipo de Lesión (Normado) *</span>
                  </label>
                  <select
                    value={nuevoInv.tipoLesion}
                    onChange={(e) =>
                      setNuevoInv({ ...nuevoInv, tipoLesion: e.target.value as TipoLesionPolicial })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-bold text-slate-900"
                  >
                    <option value="Sin Lesiones">Sin Lesiones</option>
                    <option value="Leves">Leves</option>
                    <option value="Graves">Graves</option>
                    <option value="Gravísimas">Gravísimas</option>
                  </select>
                </div>

                {nuevoInv.tipoLesion !== 'Sin Lesiones' ? (
                  <>
                    <div>
                      <label className="block font-bold text-amber-900 text-[11px] mb-1">
                        Asistencia Médica *
                      </label>
                      <select
                        value={nuevoInv.asistenciaMedica}
                        onChange={(e) =>
                          setNuevoInv({ ...nuevoInv, asistenciaMedica: e.target.value as TipoAsistenciaMedica })
                        }
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-amber-50 text-xs font-semibold text-amber-950"
                      >
                        <option value="Asistido en el lugar">Asistido en el lugar</option>
                        <option value="Trasladado a nosocomio">Trasladado a nosocomio</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        {nuevoInv.asistenciaMedica === 'Trasladado a nosocomio'
                          ? 'Nosocomio de Traslado *'
                          : 'Médico / Ambulancia Interviniente'}
                      </label>
                      <input
                        type="text"
                        value={nuevoInv.nosocomioDestino}
                        onChange={(e) => setNuevoInv({ ...nuevoInv, nosocomioDestino: e.target.value })}
                        placeholder={
                          nuevoInv.asistenciaMedica === 'Trasladado a nosocomio'
                            ? 'Ej. Hospital Distrital Laguna Blanca'
                            : 'Ej. Personal de Salud en el lugar / SIPEC'
                        }
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAddInvolucrado}
                      className="px-4 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{nuevoInv.esPersonalPolicial ? 'Agregar Efectivo Policial' : 'Agregar Persona Involucrada'}</span>
                    </button>
                  </div>
                )}
              </div>

              {nuevoInv.tipoLesion !== 'Sin Lesiones' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddInvolucrado}
                    className="px-4 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{nuevoInv.esPersonalPolicial ? 'Agregar Efectivo Policial c/ Lesión' : 'Agregar Persona Involucrada con Lesión'}</span>
                  </button>
                </div>
              )}
            </div>

            {formData.involucrados.length > 0 && (
              <div className="space-y-2 pt-1">
                {formData.involucrados.map((inv) => (
                  <div
                    key={inv.id}
                    className={`p-2.5 rounded-lg border ${
                      inv.esPersonalPolicial
                        ? 'bg-blue-50/70 border-blue-300'
                        : 'bg-white border-slate-200'
                    } flex items-start justify-between gap-2 shadow-2xs`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {inv.esPersonalPolicial && (
                          <span className="bg-blue-900 text-white font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            POLICÍA
                          </span>
                        )}
                        <strong>
                          {inv.esPersonalPolicial && inv.jerarquia ? `${inv.jerarquia} ` : ''}
                          {inv.apellidoYNombre}
                        </strong>
                        <span className="text-slate-600 font-mono text-[11px]">(DNI: {inv.dni || 'S/D'}, {inv.edad} años)</span>
                        <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-slate-300">
                          {inv.condicion || inv.funcionEnHecho}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.tipoLesion === 'Sin Lesiones'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Lesión: {inv.tipoLesion || 'Sin Lesiones'}
                        </span>
                      </div>

                      {inv.esPersonalPolicial && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-900 font-medium">
                          {inv.plaza && <span>Plaza: <strong className="font-mono">{inv.plaza}</strong></span>}
                          {inv.unidadRegional && <span>UR: <strong>{inv.unidadRegional}</strong></span>}
                          {inv.destino && <span>Destino: <strong>{inv.destino}</strong></span>}
                          {inv.alcohotest && <span className="text-slate-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">Alcohotest: <strong>{inv.alcohotest}</strong></span>}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          involucrados: prev.involucrados.filter((i) => i.id !== inv.id),
                        }))
                      }
                      className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded hover:bg-red-50"
                      title="Eliminar involucrado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TESTIGOS DE ACTA: N° 1 y N° 2 */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <span className="font-bold text-slate-900 block">TESTIGOS DE ACTA</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Testigo 1 */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">Testigo Nº 1:</span>
                  {formData.testigos[0]?.dni && poolPersonas.has(formData.testigos[0].dni.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = poolPersonas.get(formData.testigos[0].dni.trim())!;
                        const list = [...formData.testigos];
                        list[0] = { ...list[0], apellidoYNombre: found.apellidoYNombre, edad: found.edad };
                        setFormData({ ...formData, testigos: list });
                      }}
                      className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                    >
                      Autocompletar ({poolPersonas.get(formData.testigos[0].dni.trim())?.apellidoYNombre})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Apellido y Nombre"
                  value={formData.testigos[0]?.apellidoYNombre || ''}
                  onChange={(e) => {
                    const list = [...formData.testigos];
                    list[0] = { ...list[0], apellidoYNombre: e.target.value };
                    setFormData({ ...formData, testigos: list });
                  }}
                  className="w-full px-2 py-1 rounded border border-slate-300"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="DNI Testigo 1"
                      value={formData.testigos[0]?.dni || ''}
                      onChange={(e) => {
                        const list = [...formData.testigos];
                        list[0] = { ...list[0], dni: e.target.value };
                        setFormData({ ...formData, testigos: list });
                      }}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const dni = formData.testigos[0]?.dni?.trim();
                        if (!dni) return;
                        const found = poolPersonas.get(dni);
                        if (found) {
                          const list = [...formData.testigos];
                          list[0] = { ...list[0], apellidoYNombre: found.apellidoYNombre, edad: String(found.edad) };
                          setFormData({ ...formData, testigos: list });
                        } else {
                          alert(`No se encontró persona previa con DNI ${dni}. Complete nombre y edad.`);
                        }
                      }}
                      className="px-2 py-1 bg-blue-900 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-blue-950"
                      title="Buscar Testigo por DNI"
                    >
                      <Search className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Edad"
                    value={formData.testigos[0]?.edad || ''}
                    onChange={(e) => {
                      const list = [...formData.testigos];
                      list[0] = { ...list[0], edad: e.target.value };
                      setFormData({ ...formData, testigos: list });
                    }}
                    className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Testigo 2 */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">Testigo Nº 2:</span>
                  {formData.testigos[1]?.dni && poolPersonas.has(formData.testigos[1].dni.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const found = poolPersonas.get(formData.testigos[1].dni.trim())!;
                        const list = [...formData.testigos];
                        list[1] = { ...list[1], apellidoYNombre: found.apellidoYNombre, edad: found.edad };
                        setFormData({ ...formData, testigos: list });
                      }}
                      className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                    >
                      Autocompletar ({poolPersonas.get(formData.testigos[1].dni.trim())?.apellidoYNombre})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Apellido y Nombre"
                  value={formData.testigos[1]?.apellidoYNombre || ''}
                  onChange={(e) => {
                    const list = [...formData.testigos];
                    list[1] = { ...list[1], apellidoYNombre: e.target.value };
                    setFormData({ ...formData, testigos: list });
                  }}
                  className="w-full px-2 py-1 rounded border border-slate-300 font-medium text-xs"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="DNI Testigo 2"
                      value={formData.testigos[1]?.dni || ''}
                      onChange={(e) => {
                        const list = [...formData.testigos];
                        list[1] = { ...list[1], dni: e.target.value };
                        setFormData({ ...formData, testigos: list });
                      }}
                      className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const dni = formData.testigos[1]?.dni?.trim();
                        if (!dni) return;
                        const found = poolPersonas.get(dni);
                        if (found) {
                          const list = [...formData.testigos];
                          list[1] = { ...list[1], apellidoYNombre: found.apellidoYNombre, edad: String(found.edad) };
                          setFormData({ ...formData, testigos: list });
                        } else {
                          alert(`No se encontró persona previa con DNI ${dni}. Complete nombre y edad.`);
                        }
                      }}
                      className="px-2 py-1 bg-blue-900 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-blue-950"
                      title="Buscar Testigo por DNI"
                    >
                      <Search className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Edad"
                    value={formData.testigos[1]?.edad || ''}
                    onChange={(e) => {
                      const list = [...formData.testigos];
                      list[1] = { ...list[1], edad: e.target.value };
                      setFormData({ ...formData, testigos: list });
                    }}
                    className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PERSONAL TÉCNICO INTERVINIENTE (Con opciones de la guardia y opción de agregar de otra sección) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block">
                PERSONAL TÉCNICO INTERVINIENTE (De la Guardia o Sección)
              </span>
              <span className="text-[11px] text-slate-500">
                Seleccione efectivos del turno o agregue de otra sección
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <SearchableSelect
                  label="PERITO - AUXILIAR"
                  value={formData.personalTecnico.peritoAuxiliar}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      personalTecnico: { ...formData.personalTecnico, peritoAuxiliar: val },
                    })
                  }
                  options={personalOptions}
                  placeholder="Buscar o escribir Perito..."
                  allowCustom={true}
                />
              </div>

              <div>
                <SearchableSelect
                  label="CHOFER / FOTÓGRAFO"
                  value={formData.personalTecnico.choferFotografo}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      personalTecnico: { ...formData.personalTecnico, choferFotografo: val },
                    })
                  }
                  options={personalOptions}
                  placeholder="Buscar o escribir Chofer/Fotógrafo..."
                  allowCustom={true}
                />
              </div>

              <div>
                <SearchableSelect
                  label="AUXILIAR DE GUARDIA"
                  value={formData.personalTecnico.auxiliar}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      personalTecnico: { ...formData.personalTecnico, auxiliar: val },
                    })
                  }
                  options={personalOptions}
                  placeholder="Buscar o escribir Auxiliar..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Opción de agregar personal de otra sección o grupo */}
            <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-blue-700" />
                <span>¿Requiere sumar personal de otra sección o grupo policial?</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const sel = e.target.value;
                    if (!sel) return;
                    // Agregar al auxiliar o sugerir
                    setFormData((prev) => ({
                      ...prev,
                      personalTecnico: {
                        ...prev.personalTecnico,
                        auxiliar: prev.personalTecnico.auxiliar
                          ? `${prev.personalTecnico.auxiliar} / ${sel}`
                          : sel,
                      },
                    }));
                    e.target.value = '';
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700"
                >
                  <option value="">+ Seleccionar de Nómina General (Otra Sección)</option>
                  {personalList.map((p) => (
                    <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre} (${p.seccionGrupo})`}>
                      {p.jerarquia} {p.apellidoYNombre} - {p.seccionGrupo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Datalist general */}
            <datalist id="guardia-personal-options">
              {funcionesGuardia.map((f, i) => (
                <option key={i} value={f.personalNombre} />
              ))}
              {personalList.map((p) => (
                <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
              ))}
            </datalist>
          </div>

          {/* EN CASO DE SINIESTROS VIALES: VEHÍCULOS / RODADOS (MÓVIL UNO, DOS...) */}
          {formData.tipoIntervencion === 'Accidentológica' && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-800" />
                  <span className="font-bold text-amber-950">
                    DATOS DE VEHÍCULOS / RODADOS INTERVINIENTES EN SINIESTRO VIAL
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddVehiculoSiniestro}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Móvil / Rodado</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.vehiculosSiniestro?.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="p-3 bg-white rounded-lg border border-amber-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-extrabold text-blue-900 tracking-wider">
                        {v.identificador}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehiculo(idx)}
                        className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>

                    {v.dominio && v.dominio.trim().length >= 3 && poolVehiculos.has(v.dominio.trim().toUpperCase()) && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg text-xs animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-amber-950">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            <strong>Vehículo encontrado en base previa:</strong> {poolVehiculos.get(v.dominio.trim().toUpperCase())?.tipo} ({poolVehiculos.get(v.dominio.trim().toUpperCase())?.propietarioOConductor})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const found = poolVehiculos.get(v.dominio!.trim().toUpperCase())!;
                            const list = [...(formData.vehiculosSiniestro || [])];
                            list[idx] = {
                              ...list[idx],
                              tipo: found.tipo || list[idx].tipo,
                              propietarioOConductor: found.propietarioOConductor || list[idx].propietarioOConductor,
                              circulacion: found.circulacion || list[idx].circulacion,
                            };
                            setFormData({ ...formData, vehiculosSiniestro: list });
                          }}
                          className="bg-amber-800 text-white px-2.5 py-0.5 rounded font-bold text-[11px] hover:bg-amber-900 cursor-pointer"
                        >
                          Autocompletar Datos
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <div className="lg:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">DOMINIO / PATENTE</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={v.dominio || ''}
                            onChange={(e) => handleUpdateVehiculo(idx, 'dominio', e.target.value.toUpperCase())}
                            placeholder="AF 123 CD"
                            className="flex-1 px-2 py-1 rounded border border-slate-300 text-xs font-mono font-bold uppercase bg-white min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const dom = v.dominio?.trim().toUpperCase();
                              if (!dom) {
                                alert('Ingrese un dominio/patente para buscar en los registros');
                                return;
                              }
                              const found = poolVehiculos.get(dom);
                              if (found) {
                                const list = [...(formData.vehiculosSiniestro || [])];
                                list[idx] = {
                                  ...list[idx],
                                  tipo: found.tipo || list[idx].tipo,
                                  propietarioOConductor: found.propietarioOConductor || list[idx].propietarioOConductor,
                                  circulacion: found.circulacion || list[idx].circulacion,
                                };
                                setFormData({ ...formData, vehiculosSiniestro: list });
                              } else {
                                alert(`No se registraron antecedentes para el dominio ${dom}.`);
                              }
                            }}
                            className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                            title="Buscar en registros de vehículos"
                          >
                            <Search className="w-3 h-3" />
                            <span>Buscar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">TIPO DE RODADO</label>
                        <input
                          type="text"
                          value={v.tipo}
                          onChange={(e) => handleUpdateVehiculo(idx, 'tipo', e.target.value)}
                          placeholder="Automóvil Sedán / Moto 110cc"
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>CHOFER / CONDUCTOR</span>
                          {formData.involucrados.length > 0 && (
                            <span className="text-[10px] text-blue-800 font-semibold">
                              (Vincular Involucrado)
                            </span>
                          )}
                        </label>

                        {formData.involucrados.length > 0 && (
                          <select
                            value={v.choferInvolucradoId || ''}
                            onChange={(e) => {
                              const selId = e.target.value;
                              if (!selId || selId === 'manual') {
                                const list = [...(formData.vehiculosSiniestro || [])];
                                list[idx] = {
                                  ...list[idx],
                                  choferInvolucradoId: undefined,
                                  choferNombre: undefined,
                                };
                                setFormData({ ...formData, vehiculosSiniestro: list });
                              } else {
                                const selectedInv = formData.involucrados.find((i) => i.id === selId);
                                if (selectedInv) {
                                  const textVal = selectedInv.esPersonalPolicial
                                    ? `[POLICÍA] ${selectedInv.jerarquia || ''} ${selectedInv.apellidoYNombre} (DNI ${selectedInv.dni || 'S/D'})`
                                    : `${selectedInv.apellidoYNombre} (DNI ${selectedInv.dni || 'S/D'})`;
                                  const list = [...(formData.vehiculosSiniestro || [])];
                                  list[idx] = {
                                    ...list[idx],
                                    choferInvolucradoId: selectedInv.id,
                                    choferNombre: selectedInv.apellidoYNombre,
                                    propietarioOConductor: textVal,
                                  };
                                  setFormData({ ...formData, vehiculosSiniestro: list });
                                }
                              }
                            }}
                            className="w-full px-2 py-1 rounded border border-blue-300 bg-blue-50/70 text-xs font-semibold text-blue-950 focus:bg-white"
                          >
                            <option value="">-- Seleccionar Chofer de Personas Involucradas --</option>
                            {formData.involucrados.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.esPersonalPolicial ? '👮 Efectivo: ' : '👤 '}
                                {inv.apellidoYNombre} ({inv.condicion || inv.funcionEnHecho}) - DNI: {inv.dni || 'S/D'}
                              </option>
                            ))}
                            <option value="manual">Otro / Escribir manualmente...</option>
                          </select>
                        )}

                        <input
                          type="text"
                          value={v.propietarioOConductor}
                          onChange={(e) =>
                            handleUpdateVehiculo(idx, 'propietarioOConductor', e.target.value)
                          }
                          placeholder={formData.involucrados.length === 0 ? "Primero cargue personas involucradas o escriba nombre, DNI" : "Nombre, DNI o Chofer asignado"}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          CIRCULACIÓN
                        </label>
                        <input
                          type="text"
                          value={v.circulacion}
                          onChange={(e) => handleUpdateVehiculo(idx, 'circulacion', e.target.value)}
                          placeholder="Sentido calle, carril"
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          ZONA DE CONTACTO
                        </label>
                        <input
                          type="text"
                          value={v.zonaContacto}
                          onChange={(e) => handleUpdateVehiculo(idx, 'zonaContacto', e.target.value)}
                          placeholder="Lateral derecho, paragolpe"
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-2 bg-slate-50 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          TIPO DE LESIONES DEL CONDUCTOR/OCUPANTES *
                        </label>
                        <select
                          value={
                            v.lesiones.includes('Gravísimas')
                              ? 'Gravísimas'
                              : v.lesiones.includes('Graves')
                              ? 'Graves'
                              : v.lesiones.includes('Leves') || v.lesiones.includes('LEVE')
                              ? 'Leves'
                              : 'Sin Lesiones'
                          }
                          onChange={(e) => {
                            const tipo = e.target.value;
                            if (tipo === 'Sin Lesiones') {
                              handleUpdateVehiculo(idx, 'lesiones', 'Sin Lesiones');
                            } else {
                              handleUpdateVehiculo(idx, 'lesiones', `${tipo} (Asistido en el lugar)`);
                            }
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                        >
                          <option value="Sin Lesiones">Sin Lesiones</option>
                          <option value="Leves">Leves</option>
                          <option value="Graves">Graves</option>
                          <option value="Gravísimas">Gravísimas</option>
                        </select>
                      </div>

                      {!v.lesiones.includes('Sin Lesiones') && (
                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                            ASISTENCIA MÉDICA Y DETALLE *
                          </label>
                          <div className="flex gap-1.5">
                            <select
                              value={v.lesiones.includes('trasladado') || v.lesiones.includes('Trasladado') ? 'Trasladado a nosocomio' : 'Asistido en el lugar'}
                              onChange={(e) => {
                                const asist = e.target.value;
                                const tipoLesion = v.lesiones.includes('Gravísimas') ? 'Gravísimas' : v.lesiones.includes('Graves') ? 'Graves' : 'Leves';
                                handleUpdateVehiculo(idx, 'lesiones', `${tipoLesion} (${asist})`);
                              }}
                              className="px-2 py-1 rounded border border-amber-300 text-xs bg-amber-50 font-semibold"
                            >
                              <option value="Asistido en el lugar">Asistido en el lugar</option>
                              <option value="Trasladado a nosocomio">Trasladado a nosocomio</option>
                            </select>
                            <input
                              type="text"
                              value={v.lesiones}
                              onChange={(e) => handleUpdateVehiculo(idx, 'lesiones', e.target.value)}
                              placeholder="Detalle de nosocomio o asistencia..."
                              className="flex-1 px-2 py-1 rounded border border-slate-300 text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SÍNTESIS DEL HECHO */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">SÍNTESIS DEL HECHO *</label>
              <span className="text-[11px] text-slate-500">
                Detalle circunstancias, secuestros, armas, rodados o personas
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={formData.sintesisHecho}
              onChange={(e) => setFormData({ ...formData, sintesisHecho: e.target.value })}
              placeholder="Relato circunstanciado de los hechos y constataciones en el lugar..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* LABOR CRIMINALÍSTICA (Con botón de IA) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">LABOR CRIMINALÍSTICA *</label>

              {/* BOTÓN I.A. REQUERIDO POR EL USUARIO */}
              <button
                type="button"
                onClick={handleGenerarLaborConIA}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 bg-linear-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Generar puntos periciales oficiales con I.A. a partir de la Síntesis del Hecho"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Redactando con I.A...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Completar Labor Criminalística con I.A.</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {aiError}
              </p>
            )}

            <p className="text-[10px] text-slate-500">
              Estructura formal obligatoria: 1. Fijación fotográfica panorámica y de detalle; 2. Relevamiento planimétrico del lugar; 3. Levantamiento de rastros con cadena de custodia.
            </p>

            <textarea
              rows={4}
              required
              value={formData.laborCriminalistica}
              onChange={(e) => setFormData({ ...formData, laborCriminalistica: e.target.value })}
              placeholder="1. Fijación fotográfica panorámica y de detalle... 2. Relevamiento planimétrico... 3. Levantamiento de rastros..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-[11px] leading-relaxed"
            />
          </div>

          {/* Footer Modal */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Intervención</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
