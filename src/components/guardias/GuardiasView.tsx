import React, { useState, useMemo } from 'react';
import {
  ParteNovedadesGuardia,
  IntervencionParte,
  Personal,
  MovilPolicial,
  ConfiguracionSistema,
  GrupoPersonal,
  TipoIntervencion,
  InspeccionOcular,
  UsuarioSistema,
} from '../../types/police';
import {
  ClipboardList,
  Plus,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  Shield,
  Layers,
  Search,
  ArrowLeft,
  Table as TableIcon,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Camera,
  ShieldCheck,
  Check,
  UserCheck,
  Filter,
} from 'lucide-react';
import { GuardiasTableView } from './GuardiasTableView';
import { ParteGuardiaModal } from './ParteGuardiaModal';
import { IntervencionModal } from './IntervencionModal';
import { InspeccionModal } from '../inspecciones/InspeccionModal';
import { ParteVisualPreview } from './ParteVisualPreview';
import { generarPdfParteGuardia } from '../../services/pdfService';

interface GuardiasViewProps {
  partesList: ParteNovedadesGuardia[];
  personalList: Personal[];
  movilesList: MovilPolicial[];
  gruposList?: GrupoPersonal[];
  config: ConfiguracionSistema;
  currentUser?: UsuarioSistema;
  onSaveParte: (parte: ParteNovedadesGuardia) => void;
  onDeleteParte: (id: string) => void;
  onSaveIntervencion: (interv: IntervencionParte) => void;
  onDeleteIntervencion: (id: string) => void;
  onSaveConfig?: (cfg: ConfiguracionSistema) => void;
}

export type GuardiaViewMode = 'tabla' | 'intervenciones' | 'detalle';

export const GuardiasView: React.FC<GuardiasViewProps> = ({
  partesList,
  personalList,
  movilesList,
  gruposList = [],
  config,
  currentUser,
  onSaveParte,
  onDeleteParte,
  onSaveIntervencion,
  onDeleteIntervencion,
  onSaveConfig,
}) => {
  // Modo de visualización: 'tabla' (matriz de guardias), 'intervenciones' (tabla oficial de intervenciones), o 'detalle' (cuaderno de novedades)
  const [viewMode, setViewMode] = useState<GuardiaViewMode>('tabla');
  const [selectedParteId, setSelectedParteId] = useState<string>(() => {
    return partesList[0]?.id || '';
  });

  const [isParteModalOpen, setIsParteModalOpen] = useState(false);
  const [isIntervModalOpen, setIsIntervModalOpen] = useState(false);
  const [isInspeccionModalOpen, setIsInspeccionModalOpen] = useState(false);
  const [selectedInterv, setSelectedInterv] = useState<IntervencionParte | null>(null);
  const [tipoIntervencionForzado, setTipoIntervencionForzado] = useState<TipoIntervencion | null>(null);

  // Estados para tabla oficial de intervenciones
  const [searchTermInterv, setSearchTermInterv] = useState('');
  const [filtroHechoInterv, setFiltroHechoInterv] = useState('todos');
  const [confirmarFotosModal, setConfirmarFotosModal] = useState<{
    isOpen: boolean;
    interv: IntervencionParte;
    parteId: string;
  } | null>(null);
  const [usuarioConfirmador, setUsuarioConfirmador] = useState('');

  const activeParte = useMemo(() => {
    return partesList.find((p) => p.id === selectedParteId) || partesList[0] || null;
  }, [partesList, selectedParteId]);

  // CORRELATIVO ANUAL CONTROLADO:
  // "el contador de las INTERVENCIÓN CRIMINALÍSTICA se debe poder controlar desde un panel o similar al horario que se N° de ultima intervencion."
  const siguienteCorrelativo = useMemo(() => {
    let max = config.ultimoNroIntervencionCriminalistica || 3812;
    partesList.forEach((p) => {
      p.intervenciones.forEach((i) => {
        if (i.nroCorrelativo && i.nroCorrelativo > max) max = i.nroCorrelativo;
      });
    });
    return max + 1;
  }, [partesList, config.ultimoNroIntervencionCriminalistica]);

  const añoActual = useMemo(() => {
    return new Date().getFullYear();
  }, []);

  // Consolidado de todas las intervenciones de las guardias registradas
  const todasLasIntervenciones = useMemo(() => {
    const list: { interv: IntervencionParte; parte: ParteNovedadesGuardia }[] = [];
    partesList.forEach((p) => {
      (p.intervenciones || []).forEach((interv) => {
        list.push({ interv, parte: p });
      });
    });
    return list.sort((a, b) => {
      const fechaA = a.interv.inspeccionFecha || '';
      const fechaB = b.interv.inspeccionFecha || '';
      if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);
      return (b.interv.nroCorrelativo || 0) - (a.interv.nroCorrelativo || 0);
    });
  }, [partesList]);

  // Intervenciones filtradas
  const intervencionesFiltradas = useMemo(() => {
    return todasLasIntervenciones.filter(({ interv }) => {
      const term = searchTermInterv.toLowerCase();
      const nroIO = (interv.nroIO || `I.O. Nº ${interv.nroCorrelativo}/${añoActual}`).toLowerCase();
      const dir = (interv.direccion || interv.inspeccionLugar || '').toLowerCase();
      const hecho = (interv.hecho || '').toLowerCase();
      const perito = (interv.perito || interv.personalTecnico?.peritoAuxiliar || '').toLowerCase();
      const fotografo = (interv.fotografo || interv.personalTecnico?.choferFotografo || '').toLowerCase();

      const matchGeneral =
        nroIO.includes(term) ||
        dir.includes(term) ||
        hecho.includes(term) ||
        perito.includes(term) ||
        fotografo.includes(term);

      const matchHecho =
        filtroHechoInterv === 'todos' || interv.hecho === filtroHechoInterv;

      return matchGeneral && matchHecho;
    });
  }, [todasLasIntervenciones, searchTermInterv, filtroHechoInterv, añoActual]);

  // Cargar una nueva Inspección Ocular sumando +1 al contador de intervenciones
  const handleNuevaInspeccionOcular = () => {
    const nuevoCorrelativo = siguienteCorrelativo;
    if (onSaveConfig) {
      onSaveConfig({
        ...config,
        ultimoNroIntervencionCriminalistica: nuevoCorrelativo,
      });
    }
    setIsInspeccionModalOpen(true);
  };

  // Guardar la Inspección Ocular como Intervención de Guardia
  const handleSaveInspeccionOcularComoInterv = (io: InspeccionOcular) => {
    // Si no hay guardia activa, tomar la primera o crear una para hoy
    let targetParte = activeParte || partesList[0];
    if (!targetParte) {
      const hoy = new Date().toISOString().slice(0, 10);
      targetParte = {
        id: 'parte-' + Date.now(),
        fechaInicio: hoy,
        horaInicio: '08:00',
        fechaFin: hoy,
        horaFin: '08:00',
        tipoGuardia: 'Pericial',
        grupoGuardia: 'Guardia de Prevención y Criminalística',
        dependencia: config.dependencia || 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
        funcionesPersonal: [],
        forense: {
          medicoNombre: 'Dr. Forense de Turno',
          totalExaminados: 0,
          examinadosHastaHs: '07:00 hs',
        },
        movilesAfectados: [],
        intervenciones: [],
        totalIntervenciones: 0,
        cerrado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const nuevoNro = siguienteCorrelativo;

    const nuevaInterv: IntervencionParte = {
      id: io.id || 'interv-' + Date.now(),
      parteId: targetParte.id,
      nroCorrelativo: nuevoNro,
      codigoIntervencion: `01 INTERVENCIÓN CRIMINALÍSTICA Nº ${nuevoNro} /${añoActual}-DPC.`,
      tipoIntervencion: 'Criminalística',
      hecho: io.hecho || 'Inspección Ocular / Relevamiento en Escena',
      solicitudHora: io.hora ? `${io.hora} hs.` : '10:00 hs.',
      solicitudVia: 'Radial / Telefónica',
      inspeccionFecha: io.fecha,
      inspeccionHora: io.hora || '10:00',
      inspeccionLugar: io.direccion || io.lugar,
      direccion: io.direccion || io.lugar,
      dependencia: io.dependenciaSolicitante,
      referencia: io.expedienteVinculado || '',
      nroIO: io.nroIO,
      perito: io.perito,
      fotografo: io.fotografo,
      fotosConformeFotografo: true,
      fotosConfirmadas: Boolean(io.fotosConfirmadas),
      confirmadoPorUsuario: io.confirmadoPorUsuario || '',
      fechaConfirmacionFotos: io.fotosConfirmadas ? new Date().toISOString().slice(0, 10) : undefined,
      involucrados: [],
      testigos: [],
      personalTecnico: {
        peritoAuxiliar: io.perito || '',
        choferFotografo: io.fotografo || '',
        auxiliar: io.personalInterviniente || '',
      },
      sintesisHecho: io.resumen || `Inspección ocular realizada en ${io.direccion || io.lugar} conforme protocolo policial.`,
      laborCriminalistica: io.conclusiones || '1. Fijación fotográfica panorámica y de detalle; 2. Relevamiento planimétrico del lugar; 3. Levantamiento de rastros con cadena de custodia.',
      createdAt: new Date().toISOString(),
    };

    const nuevasInterv = [...(targetParte.intervenciones || []), nuevaInterv];
    const parteActualizado: ParteNovedadesGuardia = {
      ...targetParte,
      intervenciones: nuevasInterv,
      totalIntervenciones: nuevasInterv.length,
      updatedAt: new Date().toISOString(),
    };

    onSaveParte(parteActualizado);
    onSaveIntervencion(nuevaInterv);

    if (onSaveConfig) {
      onSaveConfig({
        ...config,
        ultimoNroIntervencionCriminalistica: nuevoNro,
        ultimaHoraIntervencion: io.hora ? `${io.hora} hs.` : config.ultimaHoraIntervencion,
      });
    }

    setIsInspeccionModalOpen(false);
  };

  // Confirmar fotos conforme fotógrafo por otro usuario
  const handleConfirmarFotosPorOtroUsuario = () => {
    if (!confirmarFotosModal || !usuarioConfirmador.trim()) {
      alert('Debe indicar el nombre o efectivo que confirma las fotografías');
      return;
    }

    const { interv, parteId } = confirmarFotosModal;
    const parte = partesList.find((p) => p.id === parteId);
    if (!parte) return;

    const intervActualizada: IntervencionParte = {
      ...interv,
      fotosConformeFotografo: true,
      fotosConfirmadas: true,
      confirmadoPorUsuario: usuarioConfirmador.trim(),
      fechaConfirmacionFotos: new Date().toISOString().slice(0, 10),
    };

    const nuevasInterv = parte.intervenciones.map((i) =>
      i.id === interv.id ? intervActualizada : i
    );

    const parteActualizado: ParteNovedadesGuardia = {
      ...parte,
      intervenciones: nuevasInterv,
      updatedAt: new Date().toISOString(),
    };

    onSaveParte(parteActualizado);
    onSaveIntervencion(intervActualizada);

    setConfirmarFotosModal(null);
    setUsuarioConfirmador('');
  };

  const handleSaveIntervencionWrapper = (interv: IntervencionParte) => {
    if (!activeParte) return;

    // Actualizar intervenciones en el parte
    const existe = activeParte.intervenciones.some((i) => i.id === interv.id);
    const nuevasInterv = existe
      ? activeParte.intervenciones.map((i) => (i.id === interv.id ? interv : i))
      : [...activeParte.intervenciones, interv];

    const parteActualizado: ParteNovedadesGuardia = {
      ...activeParte,
      intervenciones: nuevasInterv,
      totalIntervenciones: nuevasInterv.length,
      updatedAt: new Date().toISOString(),
    };

    onSaveParte(parteActualizado);
    onSaveIntervencion(interv);

    // Actualizar contador oficial en configuración si corresponde
    if (onSaveConfig && interv.nroCorrelativo) {
      const currentMax = config.ultimoNroIntervencionCriminalistica || 0;
      if (interv.nroCorrelativo >= currentMax) {
        onSaveConfig({
          ...config,
          ultimoNroIntervencionCriminalistica: interv.nroCorrelativo,
          ultimaHoraIntervencion: interv.inspeccionHora ? `${interv.inspeccionHora} hs.` : config.ultimaHoraIntervencion,
        });
      }
    }

    setIsIntervModalOpen(false);
  };

  const handleDeleteIntervencionWrapper = (intervId: string) => {
    if (!activeParte) return;
    const nuevasInterv = activeParte.intervenciones.filter((i) => i.id !== intervId);
    const parteActualizado: ParteNovedadesGuardia = {
      ...activeParte,
      intervenciones: nuevasInterv,
      totalIntervenciones: nuevasInterv.length,
      updatedAt: new Date().toISOString(),
    };
    onSaveParte(parteActualizado);
    onDeleteIntervencion(intervId);
  };

  return (
    <div className="space-y-4">
      {/* Selector de Modo de Vista y Título */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-900" />
            <span>Parte Oficial de Novedades de Guardia</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión y relevamiento de guardias policiales, personal afectado, móviles, forenses e intervenciones periciales discriminadas por turno.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedParteId('');
              setIsParteModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Turno de Guardia</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: TABLA MATRIZ ESTILO EXACTO A LA IMAGEN (IMAGE A9942D96 & 13F44ED9) */}
      {viewMode === 'tabla' && (
        <GuardiasTableView
          partesList={partesList}
          personalList={personalList}
          movilesList={movilesList}
          gruposList={gruposList}
          config={config}
          currentUser={currentUser}
          onSelectGuardia={(p) => {
            setSelectedParteId(p.id);
            setViewMode('detalle');
          }}
          onEditGuardia={(p) => {
            setSelectedParteId(p.id);
            setIsParteModalOpen(true);
          }}
          onDeleteGuardia={onDeleteParte}
          onNewGuardia={() => {
            setSelectedParteId('');
            setIsParteModalOpen(true);
          }}
          onSaveParte={onSaveParte}
          onSaveConfig={onSaveConfig}
          onNuevaIntervencionParaGuardia={(p, tipo) => {
            setSelectedParteId(p.id);
            setSelectedInterv(null);
            setTipoIntervencionForzado(tipo);
            setIsIntervModalOpen(true);
          }}
          onEditarIntervencion={(interv) => {
            const foundParte = partesList.find((p) => p.intervenciones.some((i) => i.id === interv.id));
            if (foundParte) setSelectedParteId(foundParte.id);
            setSelectedInterv(interv);
            setTipoIntervencionForzado(interv.tipoIntervencion);
            setIsIntervModalOpen(true);
          }}
        />
      )}

      {/* VISTA 2: TABLA DE TODAS LAS INTERVENCIONES REGISTRADAS OCURRIDAS EN LAS GUARDIAS CON ESTILO PARTE DE NOVEDADES */}
      {viewMode === 'intervenciones' && (
        <div className="space-y-4">
          {/* Barra Superior con Contador y Botón + Cargar Inspección Ocular */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-amber-300 uppercase flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>REGISTRO OFICIAL DE INTERVENCIONES E INSPECCIONES OCULARES (PARTE DE NOVEDADES)</span>
                </span>
                <span className="bg-blue-800 text-blue-100 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {todasLasIntervenciones.length} intervenciones totales
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Todas las intervenciones y relevamientos de guardia con N° I.O, Fecha, Dirección, Hecho, Fotos conforme fotógrafo, Perito y Fotógrafo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNuevaInspeccionOcular}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                title="Carga una nueva Inspección Ocular y suma +1 al contador oficial de intervenciones"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Cargar Inspección Ocular (+1 Intervención)</span>
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTermInterv}
                onChange={(e) => setSearchTermInterv(e.target.value)}
                placeholder="Buscar por N° I.O, Dirección/Lugar, Hecho, Perito o Fotógrafo..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <select
                value={filtroHechoInterv}
                onChange={(e) => setFiltroHechoInterv(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="todos">Todos los Hechos / Causas</option>
                {config.hechosCriminalistica.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLA FORMAL ESTILO PARTE DE NOVEDADES */}
          <div className="bg-white rounded-xl border-2 border-slate-800 shadow-md overflow-hidden">
            {/* Encabezado Matriz Policial */}
            <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                  PARTE OFICIAL DE NOVEDADES — RELEVAMIENTO DE INTERVENCIONES Y ESCENAS
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                DELEGACIÓN POLICÍA CIENTÍFICA - CONTROL DE AUDITORÍA Y PERICIAL
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider border-b-2 border-slate-900">
                  <tr>
                    <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap text-amber-300 font-bold">N° I.O</th>
                    <th className="border border-slate-600 px-3 py-2.5 whitespace-nowrap">Fecha</th>
                    <th className="border border-slate-600 px-3 py-2.5">Dirección (Lugar de ocurrido)</th>
                    <th className="border border-slate-600 px-3 py-2.5">Hecho</th>
                    <th className="border border-slate-600 px-3 py-2.5 text-center">Fotos (conforme fotógrafo)</th>
                    <th className="border border-slate-600 px-3 py-2.5">Perito</th>
                    <th className="border border-slate-600 px-3 py-2.5">Fotógrafo</th>
                    <th className="border border-slate-600 px-3 py-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {intervencionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 bg-slate-50">
                        <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span className="font-bold">No se encontraron intervenciones registradas</span>
                        <p className="text-xs text-slate-400 mt-1">
                          Haga clic en "+ Cargar Inspección Ocular" para registrar la primera intervención.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    intervencionesFiltradas.map(({ interv, parte }, idx) => {
                      const nroIO =
                        interv.nroIO ||
                        `I.O. Nº ${String(interv.nroCorrelativo || idx + 1).padStart(3, '0')}/${añoActual}`;
                      const direccion = interv.direccion || interv.inspeccionLugar || 'Sin dirección especificada';
                      const perito = interv.perito || interv.personalTecnico?.peritoAuxiliar || 'Perito de Guardia';
                      const fotografo = interv.fotografo || interv.personalTecnico?.choferFotografo || 'Fotógrafo de Guardia';
                      const estaConfirmado = Boolean(interv.fotosConfirmadas);

                      return (
                        <tr
                          key={interv.id}
                          className={idx % 2 === 0 ? 'bg-white hover:bg-amber-50/50' : 'bg-slate-50 hover:bg-amber-50/50'}
                        >
                          {/* 1. N° I.O */}
                          <td className="border border-slate-300 px-3 py-2.5 font-mono whitespace-nowrap">
                            <span className="font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {nroIO}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Int. #{interv.nroCorrelativo}
                            </div>
                          </td>

                          {/* 2. Fecha */}
                          <td className="border border-slate-300 px-3 py-2.5 font-mono whitespace-nowrap text-slate-700">
                            <div>{interv.inspeccionFecha}</div>
                            <div className="text-[10px] text-slate-500">{interv.inspeccionHora} hs</div>
                          </td>

                          {/* 3. Dirección (Lugar de ocurrido) */}
                          <td className="border border-slate-300 px-3 py-2.5 font-medium text-slate-900">
                            <div className="line-clamp-2">{direccion}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              <strong>Dependencia:</strong> {interv.dependencia}
                            </div>
                          </td>

                          {/* 4. Hecho */}
                          <td className="border border-slate-300 px-3 py-2.5">
                            <span className="font-bold text-slate-900 block">{interv.hecho}</span>
                            {interv.tipoIntervencion === 'Accidentológica' ? (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                Seg. Vial (Siniestro)
                              </span>
                            ) : (
                              <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold border border-blue-300">
                                Criminalística (LC)
                              </span>
                            )}
                          </td>

                          {/* 5. Fotos (conforme fotógrafo) - confirmado por otro usuario */}
                          <td className="border border-slate-300 px-3 py-2.5 text-center">
                            {estaConfirmado ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 px-2.5 py-1 rounded font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Conforme Fotógrafo</span>
                                </span>
                                <span className="text-[10px] text-slate-500 mt-1 italic">
                                  Confirmado por: <strong>{interv.confirmadoPorUsuario || 'Oficial de Guardia'}</strong>
                                  {interv.fechaConfirmacionFotos && ` (${interv.fechaConfirmacionFotos})`}
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Pendiente de Confirmación</span>
                                </span>
                                <button
                                  onClick={() =>
                                    setConfirmarFotosModal({
                                      isOpen: true,
                                      interv,
                                      parteId: parte.id,
                                    })
                                  }
                                  className="mt-0.5 bg-blue-900 hover:bg-blue-950 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                                  title="Confirmar por otro usuario que las fotos están conformes"
                                >
                                  ✓ Confirmar Fotos
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 6. Perito */}
                          <td className="border border-slate-300 px-3 py-2.5 font-semibold text-slate-800">
                            {perito}
                          </td>

                          {/* 7. Fotógrafo */}
                          <td className="border border-slate-300 px-3 py-2.5 font-semibold text-slate-800">
                            {fotografo}
                          </td>

                          {/* 8. Acciones */}
                          <td className="border border-slate-300 px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedParteId(parte.id);
                                  setSelectedInterv(interv);
                                  setTipoIntervencionForzado(interv.tipoIntervencion);
                                  setIsIntervModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-blue-900 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: DETALLE Y CARGA DE NOVEDADES DE LA GUARDIA SELECCIONADA */}
      {viewMode === 'detalle' && activeParte && (
        <div className="space-y-4">
          {/* Barra de Guardia Activa y Acciones */}
          <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode('tabla')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al Libro de Guardias</span>
                </button>
                <span className="bg-blue-700/80 text-blue-100 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {activeParte.tipoGuardia || 'Pericial'}
                </span>
                <span className="font-bold text-sm text-white">
                  {activeParte.dependencia || activeParte.grupoGuardia}
                </span>
                <span className="text-xs text-blue-200 font-mono">
                  ({activeParte.fechaInicio} {activeParte.horaInicio} a {activeParte.fechaFin} {activeParte.horaFin} hs)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  <strong>Novedades exclusivas de esta guardia:</strong> Las intervenciones cargadas aquí pertenecen a este turno y no se mezclan con otras guardias.
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Selector Rápido de Guardias */}
              <select
                value={activeParte.id}
                onChange={(e) => setSelectedParteId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-white text-xs font-semibold focus:outline-none"
              >
                {partesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fechaInicio} - {p.tipoGuardia || 'Guardia'} ({p.dependencia || p.grupoGuardia}) [{p.intervenciones.length} int.]
                  </option>
                ))}
              </select>

              {/* Botón Cargar LC exclusivo */}
              <button
                onClick={() => {
                  setSelectedInterv(null);
                  setTipoIntervencionForzado('Criminalística');
                  setIsIntervModalOpen(true);
                }}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                title="Cargar intervención de Labor Criminalística (LC - Hechos no de tránsito)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cargar LC</span>
              </button>

              {/* Botón Cargar Seg. Vial exclusivo */}
              <button
                onClick={() => {
                  setSelectedInterv(null);
                  setTipoIntervencionForzado('Accidentológica');
                  setIsIntervModalOpen(true);
                }}
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                title="Cargar intervención de Seguridad Vial (Seg. Vial - Siniestros Viales)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cargar Seg. Vial</span>
              </button>

              <button
                onClick={() => setIsParteModalOpen(true)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                title="Editar Datos de la Guardia"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Guardia</span>
              </button>

              <button
                onClick={() => generarPdfParteGuardia(activeParte, config)}
                className="bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                title="Exportar PDF Oficial de esta Guardia"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Oficial</span>
              </button>
            </div>
          </div>

          {/* Renderizado de la Vista Oficial Formateada */}
          <ParteVisualPreview
            parte={activeParte}
            config={config}
            onClose={() => setViewMode('tabla')}
            onEditParte={() => setIsParteModalOpen(true)}
            onAddIntervencion={() => {
              setSelectedInterv(null);
              setTipoIntervencionForzado('Criminalística');
              setIsIntervModalOpen(true);
            }}
            onEditIntervencion={(interv) => {
              setSelectedInterv(interv);
              setTipoIntervencionForzado(interv.tipoIntervencion);
              setIsIntervModalOpen(true);
            }}
            onDeleteIntervencion={handleDeleteIntervencionWrapper}
          />
        </div>
      )}

      {/* Si no hay guardias */}
      {partesList.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No hay partes de guardia registrados</h3>
          <p className="text-xs text-slate-500 mt-1">
            Abra un nuevo libro de novedades de guardia para comenzar a cargar intervenciones y personal.
          </p>
          <button
            onClick={() => setIsParteModalOpen(true)}
            className="mt-4 bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
          >
            Crear Primer Turno de Guardia
          </button>
        </div>
      )}

      {/* Modal Configuración / Carga de Guardia */}
      {isParteModalOpen && (
        <ParteGuardiaModal
          parte={selectedParteId ? activeParte : null}
          personalList={personalList}
          movilesList={movilesList}
          gruposList={gruposList}
          config={config}
          currentUser={currentUser}
          onSaveConfig={onSaveConfig}
          onSave={(data) => {
            onSaveParte(data);
            setSelectedParteId(data.id);
            setIsParteModalOpen(false);
            setViewMode('detalle');
          }}
          onClose={() => setIsParteModalOpen(false)}
        />
      )}

      {/* Modal Nueva / Editar Intervención Correlativa de la Guardia Activa */}
      {isIntervModalOpen && activeParte && (
        <IntervencionModal
          intervencion={selectedInterv}
          tipoForzado={selectedInterv ? selectedInterv.tipoIntervencion : tipoIntervencionForzado}
          siguienteCorrelativo={siguienteCorrelativo}
          añoActual={añoActual}
          parteId={activeParte.id}
          partesList={partesList}
          config={config}
          funcionesGuardia={activeParte.funcionesPersonal}
          personalList={personalList}
          gruposList={gruposList}
          onSave={handleSaveIntervencionWrapper}
          onSaveConfig={onSaveConfig}
          onClose={() => {
            setIsIntervModalOpen(false);
            setTipoIntervencionForzado(null);
          }}
        />
      )}

      {/* Modal Carga de Inspección Ocular (+1 Intervención al contador) */}
      {isInspeccionModalOpen && (
        <InspeccionModal
          inspeccion={{
            id: 'io-' + Date.now(),
            nroIO: `I.O. Nº ${String(siguienteCorrelativo).padStart(3, '0')}/${añoActual}`,
            fecha: new Date().toISOString().slice(0, 10),
            hora: '10:00',
            lugar: '',
            direccion: '',
            hecho: config.hechosCriminalistica?.[0] || 'Inspección Ocular / Relevamiento en Escena',
            tipo: 'Criminalística',
            dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
            expedienteVinculado: '',
            personalInterviniente: '',
            perito: '',
            fotografo: '',
            cantidadFotografias: 0,
            fotosConformeFotografo: 'Conforme relevamiento del fotógrafo de guardia',
            fotosConfirmadas: false,
            confirmadoPorUsuario: '',
            resumen: '',
            conclusiones: '',
            fotosAdjuntas: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          personalList={personalList}
          config={config}
          onSave={handleSaveInspeccionOcularComoInterv}
          onClose={() => setIsInspeccionModalOpen(false)}
        />
      )}

      {/* Modal Confirmación de Fotos Conforme Fotógrafo por otro Usuario */}
      {confirmarFotosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Confirmación de Fotografías</h3>
              </div>
              <button
                onClick={() => setConfirmarFotosModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Usted está por certificar como usuario / oficial supervisor que el relevamiento fotográfico de la intervención{' '}
                <strong className="text-blue-950 font-bold">
                  {confirmarFotosModal.interv.nroIO || `Int. #${confirmarFotosModal.interv.nroCorrelativo}`}
                </strong>{' '}
                ({confirmarFotosModal.interv.hecho}) se encuentra <strong>conforme al protocolo pericial</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nombre y Jerarquía del Usuario que Confirma *
                </label>
                <input
                  type="text"
                  list="personal-confirmadores-lista"
                  value={usuarioConfirmador}
                  onChange={(e) => setUsuarioConfirmador(e.target.value)}
                  placeholder="Ej. Principal MARTÍNEZ Carlos / Oficial de Servicio"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  autoFocus
                />
                <datalist id="personal-confirmadores-lista">
                  {personalList.map((p) => (
                    <option key={'c-' + p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
                  ))}
                </datalist>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmarFotosModal(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarFotosPorOtroUsuario}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Certificar y Confirmar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
