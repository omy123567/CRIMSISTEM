import React, { useState, useMemo } from 'react';
import {
  IntervencionParte,
  ConfiguracionSistema,
  InvolucradoIntervencion,
  TipoLesionPolicial,
  TipoAsistenciaMedica,
} from '../../types/police';
import {
  AlertTriangle,
  Plus,
  Edit2,
  X,
  Check,
  Activity,
  UserPlus,
  Car,
  FileText,
} from 'lucide-react';
import { esTipoLesionADeterminar } from '../../utils/lesionesUtils';

interface TipoLesionesCellProps {
  intervencion: IntervencionParte;
  config?: ConfiguracionSistema;
  onUpdateIntervencion: (updated: IntervencionParte) => void;
  readOnly?: boolean;
}

type TargetRef =
  | { kind: 'involucrado'; index: number }
  | { kind: 'vehiculo'; index: number }
  | { kind: 'lc' }
  | { kind: 'policial' };

interface LesionChipItem {
  key: string;
  target: TargetRef;
  label: string;
  valor: string;
  fallecido?: boolean;
  pendiente: boolean;
}

const TIPOS_LESION_ESTANDAR: TipoLesionPolicial[] = [
  'Sin Lesiones',
  'Leves',
  'Graves',
  'Gravísimas',
  'A Determinar',
];

const CONDICIONES_FALLBACK = [
  'Demorado / Aprehendido',
  'Damnificado / Víctima',
  'Denunciante',
  'Conductor',
  'Acompañante',
  'Peatón',
  'Imputado',
  'Testigo',
];

export const TipoLesionesCell: React.FC<TipoLesionesCellProps> = ({
  intervencion,
  config,
  onUpdateIntervencion,
  readOnly = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'edit' | 'add'>('edit');
  const [selectedTarget, setSelectedTarget] = useState<TargetRef | null>(null);

  // Estado para edición rápida de lesión existente
  const [editTipoLesion, setEditTipoLesion] = useState<string>('Sin Lesiones');
  const [editFallecido, setEditFallecido] = useState<boolean>(false);
  const [editAsistencia, setEditAsistencia] = useState<TipoAsistenciaMedica | ''>('');
  const [editNosocomio, setEditNosocomio] = useState<string>('');
  const [editDetalle, setEditDetalle] = useState<string>('');

  // Estado para agregar nueva lesión / involucrado
  const [addKind, setAddKind] = useState<'involucrado' | 'lc' | 'vehiculo'>('involucrado');
  const [newNombre, setNewNombre] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newEdad, setNewEdad] = useState('');
  const [newCondicion, setNewCondicion] = useState(
    config?.condicionesInvolucrado?.[0] || 'Damnificado / Víctima'
  );
  const [newTipoLesion, setNewTipoLesion] = useState<TipoLesionPolicial>('Leves');
  const [newFallecido, setNewFallecido] = useState(false);
  const [newAsistencia, setNewAsistencia] = useState<TipoAsistenciaMedica | ''>('');
  const [newNosocomio, setNewNosocomio] = useState('');
  const [newDetalle, setNewDetalle] = useState('');
  const [newLcTipo, setNewLcTipo] = useState<string>('Leves');
  const [newVehiculoIndex, setNewVehiculoIndex] = useState<number>(0);
  const [newVehiculoLesion, setNewVehiculoLesion] = useState<string>('Leves');
  const [formError, setFormError] = useState<string | null>(null);

  const items: LesionChipItem[] = useMemo(() => {
    const list: LesionChipItem[] = [];
    (intervencion.involucrados || []).forEach((inv, idx) => {
      const val = inv.tipoLesion || 'Sin Lesiones';
      list.push({
        key: `inv-${inv.id || idx}`,
        target: { kind: 'involucrado', index: idx },
        label: inv.apellidoYNombre || 'Involucrado',
        valor: val,
        fallecido: Boolean(inv.fallecido),
        pendiente: esTipoLesionADeterminar(val),
      });
    });

    (intervencion.vehiculosSiniestro || []).forEach((v, idx) => {
      if (v.lesiones) {
        list.push({
          key: `veh-${v.id || idx}`,
          target: { kind: 'vehiculo', index: idx },
          label: v.identificador || 'Vehículo',
          valor: v.lesiones,
          pendiente: esTipoLesionADeterminar(v.lesiones),
        });
      }
    });

    if (intervencion.tipoLesionesLC) {
      list.push({
        key: 'lc',
        target: { kind: 'lc' },
        label: 'LC',
        valor: intervencion.tipoLesionesLC,
        pendiente: esTipoLesionADeterminar(intervencion.tipoLesionesLC),
      });
    }

    if (
      intervencion.personalPolicial?.tipoLesion &&
      !(intervencion.involucrados || []).some((i) => i.esPersonalPolicial)
    ) {
      list.push({
        key: 'policial',
        target: { kind: 'policial' },
        label: intervencion.personalPolicial.apellidoYNombre || 'Personal Policial',
        valor: intervencion.personalPolicial.tipoLesion,
        pendiente: esTipoLesionADeterminar(intervencion.personalPolicial.tipoLesion),
      });
    }

    return list;
  }, [intervencion]);

  const loadTargetIntoEditState = (target: TargetRef) => {
    setSelectedTarget(target);
    setFormError(null);

    if (target.kind === 'involucrado') {
      const inv = (intervencion.involucrados || [])[target.index];
      if (inv) {
        setEditTipoLesion(inv.tipoLesion || 'Sin Lesiones');
        setEditFallecido(Boolean(inv.fallecido));
        setEditAsistencia(inv.asistenciaMedica || '');
        setEditNosocomio(inv.nosocomioDestino || '');
        setEditDetalle(inv.detalleLesiones || '');
      }
    } else if (target.kind === 'vehiculo') {
      const veh = (intervencion.vehiculosSiniestro || [])[target.index];
      setEditTipoLesion(veh?.lesiones || 'Sin Lesiones');
      setEditFallecido(false);
      setEditAsistencia('');
      setEditNosocomio('');
      setEditDetalle('');
    } else if (target.kind === 'lc') {
      setEditTipoLesion(intervencion.tipoLesionesLC || 'A Determinar');
      setEditFallecido(false);
      setEditAsistencia('');
      setEditNosocomio('');
      setEditDetalle(intervencion.detalleLesionesLC || '');
    } else if (target.kind === 'policial') {
      setEditTipoLesion(intervencion.personalPolicial?.tipoLesion || 'A Determinar');
      setEditFallecido(false);
      setEditAsistencia('');
      setEditNosocomio('');
      setEditDetalle('');
    }
  };

  const openEditModal = (target: TargetRef) => {
    if (readOnly) return;
    setMode('edit');
    loadTargetIntoEditState(target);
    setModalOpen(true);
  };

  const openAddModal = () => {
    if (readOnly) return;
    setMode('add');
    setFormError(null);
    setAddKind('involucrado');
    setNewNombre('');
    setNewDni('');
    setNewEdad('');
    setNewCondicion(
      config?.condicionesInvolucrado?.[0] ||
        (intervencion.tipoIntervencion === 'Accidentológica'
          ? 'Conductor'
          : 'Damnificado / Víctima')
    );
    setNewTipoLesion('Leves');
    setNewFallecido(false);
    setNewAsistencia('');
    setNewNosocomio('');
    setNewDetalle('');
    setNewLcTipo(intervencion.tipoLesionesLC || 'Leves');
    setNewVehiculoIndex(0);
    setNewVehiculoLesion(
      intervencion.vehiculosSiniestro?.[0]?.lesiones || 'Leves'
    );
    setModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    const valorFinal = editTipoLesion.trim() || 'Sin Lesiones';
    const sinLesion = valorFinal === 'Sin Lesiones' || valorFinal === 'Ileso';

    if (selectedTarget.kind === 'involucrado') {
      const idx = selectedTarget.index;
      const actuales = [...(intervencion.involucrados || [])];
      const inv = actuales[idx];
      if (!inv) return;

      actuales[idx] = {
        ...inv,
        tipoLesion: valorFinal as TipoLesionPolicial,
        fallecido: editFallecido,
        asistenciaMedica: sinLesion ? undefined : editAsistencia || undefined,
        nosocomioDestino:
          !sinLesion && editAsistencia === 'Trasladado a nosocomio'
            ? editNosocomio.trim() || undefined
            : undefined,
        detalleLesiones: editDetalle.trim() || undefined,
      };

      const personalPolicialActualizado =
        inv.esPersonalPolicial && intervencion.personalPolicial
          ? {
              ...intervencion.personalPolicial,
              tipoLesion: valorFinal as TipoLesionPolicial,
            }
          : intervencion.personalPolicial;

      onUpdateIntervencion({
        ...intervencion,
        involucrados: actuales,
        personalPolicial: personalPolicialActualizado,
      });
    } else if (selectedTarget.kind === 'vehiculo') {
      const idx = selectedTarget.index;
      const vehs = [...(intervencion.vehiculosSiniestro || [])];
      if (!vehs[idx]) return;
      vehs[idx] = {
        ...vehs[idx],
        lesiones: valorFinal,
      };
      onUpdateIntervencion({
        ...intervencion,
        vehiculosSiniestro: vehs,
      });
    } else if (selectedTarget.kind === 'lc') {
      onUpdateIntervencion({
        ...intervencion,
        presentaLesionesLC: valorFinal !== 'Sin Lesiones',
        tipoLesionesLC: valorFinal,
        detalleLesionesLC: editDetalle.trim() || intervencion.detalleLesionesLC,
      });
    } else if (selectedTarget.kind === 'policial' && intervencion.personalPolicial) {
      onUpdateIntervencion({
        ...intervencion,
        personalPolicial: {
          ...intervencion.personalPolicial,
          tipoLesion: valorFinal as TipoLesionPolicial,
        },
      });
    }

    setModalOpen(false);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (addKind === 'involucrado') {
      if (!newNombre.trim()) {
        setFormError('Ingrese el Apellido y Nombre de la persona involucrada.');
        return;
      }
      const sinLesion = newTipoLesion === 'Sin Lesiones';
      const nuevoInv: InvolucradoIntervencion = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        apellidoYNombre: newNombre.trim().toUpperCase(),
        dni: newDni.trim() || 'S/D',
        edad: newEdad.trim() || '',
        condicion: newCondicion,
        funcionEnHecho: newCondicion,
        tipoLesion: newTipoLesion,
        fallecido: newFallecido,
        asistenciaMedica: sinLesion ? undefined : newAsistencia || undefined,
        nosocomioDestino:
          !sinLesion && newAsistencia === 'Trasladado a nosocomio'
            ? newNosocomio.trim() || undefined
            : undefined,
        detalleLesiones: newDetalle.trim() || undefined,
      };

      onUpdateIntervencion({
        ...intervencion,
        involucrados: [...(intervencion.involucrados || []), nuevoInv],
      });
      setModalOpen(false);
      return;
    }

    if (addKind === 'lc') {
      const val = newLcTipo.trim() || 'Leves';
      onUpdateIntervencion({
        ...intervencion,
        presentaLesionesLC: val !== 'Sin Lesiones',
        tipoLesionesLC: val,
        detalleLesionesLC: newDetalle.trim() || intervencion.detalleLesionesLC,
      });
      setModalOpen(false);
      return;
    }

    if (addKind === 'vehiculo') {
      const vehs = [...(intervencion.vehiculosSiniestro || [])];
      if (!vehs[newVehiculoIndex]) {
        setFormError('Seleccione un vehículo válido.');
        return;
      }
      vehs[newVehiculoIndex] = {
        ...vehs[newVehiculoIndex],
        lesiones: newVehiculoLesion.trim() || 'Leves',
      };
      onUpdateIntervencion({
        ...intervencion,
        vehiculosSiniestro: vehs,
      });
      setModalOpen(false);
    }
  };

  const condicionesList =
    config?.condicionesInvolucrado && config.condicionesInvolucrado.length > 0
      ? config.condicionesInvolucrado
      : CONDICIONES_FALLBACK;

  const tieneVehiculos = (intervencion.vehiculosSiniestro || []).length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {items.map((item) => {
          const baseClass = item.pendiente
            ? 'bg-amber-300 text-amber-950 border-amber-600 font-extrabold shadow-2xs hover:bg-amber-400/90'
            : item.valor === 'Sin Lesiones' || item.valor === 'Ileso'
            ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';

          return (
            <button
              key={item.key}
              type="button"
              disabled={readOnly}
              onClick={() => openEditModal(item.target)}
              title={
                readOnly
                  ? `${item.label}: ${item.valor}`
                  : 'Clic para editar o definir el tipo de lesión'
              }
              className={`inline-flex flex-wrap items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors text-left ${baseClass} ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              {item.pendiente && (
                <AlertTriangle className="w-3 h-3 text-amber-900 shrink-0" />
              )}
              <span className="font-normal opacity-80">{item.label}:</span>
              <span>{item.valor}</span>
              {item.fallecido && (
                <span className="px-1 rounded bg-slate-900 text-rose-200 text-[9px] font-extrabold">
                  FALLECIDO
                </span>
              )}
              {!readOnly && <Edit2 className="w-2.5 h-2.5 opacity-60 shrink-0" />}
            </button>
          );
        })}

        {!readOnly ? (
          <button
            type="button"
            onClick={openAddModal}
            title="Agregar o definir tipo de lesión en esta intervención"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-blue-400 bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-[10px] font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 shrink-0" />
            <span>{items.length === 0 ? 'Agregar lesión' : 'Agregar'}</span>
          </button>
        ) : (
          items.length === 0 && (
            <span className="text-[10px] text-slate-400">Sin registrar</span>
          )
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Gestión Rápida de Tipo de Lesiones</span>
                </div>
                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                  #{intervencion.nroCorrelativo} · {intervencion.hecho}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Switch Editar / Agregar */}
            <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('edit');
                    if (!selectedTarget && items[0]) {
                      loadTargetIntoEditState(items[0].target);
                    }
                  }}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    mode === 'edit'
                      ? 'border-blue-900 text-blue-900 bg-white rounded-t-md'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Definir / Editar ({items.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode('add');
                  setFormError(null);
                }}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  mode === 'add'
                    ? 'border-blue-900 text-blue-900 bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Nueva Lesión</span>
              </button>
            </div>

            {mode === 'edit' && selectedTarget ? (
              <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
                {items.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Elemento a actualizar
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((it) => {
                        const isSelected =
                          it.target.kind === selectedTarget.kind &&
                          ((it.target.kind === 'involucrado' &&
                            selectedTarget.kind === 'involucrado' &&
                            it.target.index === selectedTarget.index) ||
                            (it.target.kind === 'vehiculo' &&
                              selectedTarget.kind === 'vehiculo' &&
                              it.target.index === selectedTarget.index) ||
                            it.target.kind === 'lc' ||
                            it.target.kind === 'policial');

                        return (
                          <button
                            key={it.key}
                            type="button"
                            onClick={() => loadTargetIntoEditState(it.target)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                              isSelected
                                ? 'bg-blue-900 text-white border-blue-900'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Tipo de Lesión *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                    {TIPOS_LESION_ESTANDAR.map((tipo) => {
                      const active = editTipoLesion === tipo;
                      const isPend = tipo === 'A Determinar';
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setEditTipoLesion(tipo)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            active
                              ? isPend
                                ? 'bg-amber-400 text-amber-950 border-amber-700 ring-2 ring-amber-300'
                                : tipo === 'Sin Lesiones'
                                ? 'bg-slate-800 text-white border-slate-900'
                                : 'bg-rose-700 text-white border-rose-800'
                              : isPend
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 shrink-0" />}
                          <span>{tipo}</span>
                        </button>
                      );
                    })}
                  </div>

                  {(selectedTarget.kind === 'vehiculo' || selectedTarget.kind === 'lc') && (
                    <input
                      type="text"
                      value={editTipoLesion}
                      onChange={(e) => setEditTipoLesion(e.target.value)}
                      placeholder="O especifique descripción personalizada..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  )}
                </div>

                {selectedTarget.kind === 'involucrado' && (
                  <>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFallecido}
                        onChange={(e) => setEditFallecido(e.target.checked)}
                        className="w-4 h-4 accent-rose-700 rounded"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Persona Fallecida (Óbito)
                      </span>
                    </label>

                    {editTipoLesion !== 'Sin Lesiones' && editTipoLesion !== 'Ileso' && (
                      <div className="grid grid-cols-1 gap-2 p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Asistencia Médica
                          </label>
                          <select
                            value={editAsistencia}
                            onChange={(e) =>
                              setEditAsistencia(e.target.value as TipoAsistenciaMedica | '')
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="">-- Sin especificar --</option>
                            <option value="Asistido en el lugar">Asistido en el lugar</option>
                            <option value="Trasladado a nosocomio">Trasladado a nosocomio</option>
                          </select>
                        </div>

                        {editAsistencia === 'Trasladado a nosocomio' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Nosocomio / Hospital de Destino
                            </label>
                            <input
                              type="text"
                              value={editNosocomio}
                              onChange={(e) => setEditNosocomio(e.target.value)}
                              placeholder="Ej. Hospital Central / Nosocomio local"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Detalle / Observación de Lesión (opcional)
                      </label>
                      <input
                        type="text"
                        value={editDetalle}
                        onChange={(e) => setEditDetalle(e.target.value)}
                        placeholder="Ej. Traumatismo leve en brazo izquierdo..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {selectedTarget.kind === 'lc' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Detalle de Lesiones LC (opcional)
                    </label>
                    <input
                      type="text"
                      value={editDetalle}
                      onChange={(e) => setEditDetalle(e.target.value)}
                      placeholder="Detalle adicional..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveAdd} className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    ¿Qué desea agregar?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAddKind('involucrado');
                        setFormError(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        addKind === 'involucrado'
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Persona c/ Lesión</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddKind('lc');
                        setFormError(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        addKind === 'lc'
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lesión General (LC)</span>
                    </button>
                    {tieneVehiculos && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddKind('vehiculo');
                          setFormError(null);
                        }}
                        className={`col-span-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                          addKind === 'vehiculo'
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Asignar Lesión a Vehículo del Siniestro</span>
                      </button>
                    )}
                  </div>
                </div>

                {formError && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold">
                    {formError}
                  </div>
                )}

                {addKind === 'involucrado' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Apellido y Nombre *
                      </label>
                      <input
                        type="text"
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="Ej. PÉREZ JUAN CARLOS"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg uppercase"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          DNI
                        </label>
                        <input
                          type="text"
                          value={newDni}
                          onChange={(e) => setNewDni(e.target.value)}
                          placeholder="S/D"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Edad
                        </label>
                        <input
                          type="text"
                          value={newEdad}
                          onChange={(e) => setNewEdad(e.target.value)}
                          placeholder="Edad"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Condición
                        </label>
                        <select
                          value={newCondicion}
                          onChange={(e) => setNewCondicion(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        >
                          {condicionesList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tipo de Lesión *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {TIPOS_LESION_ESTANDAR.map((tipo) => {
                          const active = newTipoLesion === tipo;
                          const isPend = tipo === 'A Determinar';
                          return (
                            <button
                              key={tipo}
                              type="button"
                              onClick={() => setNewTipoLesion(tipo)}
                              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                active
                                  ? isPend
                                    ? 'bg-amber-400 text-amber-950 border-amber-700 ring-2 ring-amber-300'
                                    : tipo === 'Sin Lesiones'
                                    ? 'bg-slate-800 text-white border-slate-900'
                                    : 'bg-rose-700 text-white border-rose-800'
                                  : isPend
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 shrink-0" />}
                              <span>{tipo}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFallecido}
                        onChange={(e) => setNewFallecido(e.target.checked)}
                        className="w-4 h-4 accent-rose-700 rounded"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Persona Fallecida (Óbito)
                      </span>
                    </label>

                    {newTipoLesion !== 'Sin Lesiones' && (
                      <div className="grid grid-cols-1 gap-2 p-2.5 rounded-lg bg-rose-50/60 border border-rose-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Asistencia Médica
                          </label>
                          <select
                            value={newAsistencia}
                            onChange={(e) =>
                              setNewAsistencia(e.target.value as TipoAsistenciaMedica | '')
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="">-- Sin especificar --</option>
                            <option value="Asistido en el lugar">Asistido en el lugar</option>
                            <option value="Trasladado a nosocomio">Trasladado a nosocomio</option>
                          </select>
                        </div>

                        {newAsistencia === 'Trasladado a nosocomio' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Nosocomio / Hospital de Destino
                            </label>
                            <input
                              type="text"
                              value={newNosocomio}
                              onChange={(e) => setNewNosocomio(e.target.value)}
                              placeholder="Ej. Hospital Central"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Detalle de Lesión (opcional)
                      </label>
                      <input
                        type="text"
                        value={newDetalle}
                        onChange={(e) => setNewDetalle(e.target.value)}
                        placeholder="Observaciones médicas o lesiones..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {addKind === 'lc' && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tipo de Lesión General (LC) *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                        {TIPOS_LESION_ESTANDAR.map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => setNewLcTipo(tipo)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              newLcTipo === tipo
                                ? tipo === 'A Determinar'
                                  ? 'bg-amber-400 text-amber-950 border-amber-700'
                                  : 'bg-blue-900 text-white border-blue-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {tipo}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newLcTipo}
                        onChange={(e) => setNewLcTipo(e.target.value)}
                        placeholder="O escriba descripción de lesión..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Detalle adicional (opcional)
                      </label>
                      <input
                        type="text"
                        value={newDetalle}
                        onChange={(e) => setNewDetalle(e.target.value)}
                        placeholder="Descripción breve..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {addKind === 'vehiculo' && tieneVehiculos && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Vehículo del Siniestro
                      </label>
                      <select
                        value={newVehiculoIndex}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          setNewVehiculoIndex(idx);
                          setNewVehiculoLesion(
                            intervencion.vehiculosSiniestro?.[idx]?.lesiones || 'Leves'
                          );
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      >
                        {(intervencion.vehiculosSiniestro || []).map((v, idx) => (
                          <option key={v.id || idx} value={idx}>
                            {v.identificador} — {v.marca || ''} {v.modelo || ''} ({v.dominio || 's/p'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Lesiones en el Vehículo *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                        {TIPOS_LESION_ESTANDAR.map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => setNewVehiculoLesion(tipo)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              newVehiculoLesion === tipo
                                ? tipo === 'A Determinar'
                                  ? 'bg-amber-400 text-amber-950 border-amber-700'
                                  : 'bg-blue-900 text-white border-blue-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {tipo}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newVehiculoLesion}
                        onChange={(e) => setNewVehiculoLesion(e.target.value)}
                        placeholder="Descripción de lesiones..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Lesión</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
