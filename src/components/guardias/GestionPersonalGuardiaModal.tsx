import React, { useState } from 'react';
import {
  ParteNovedadesGuardia,
  AsignacionFuncionGuardia,
  Personal,
  GrupoPersonal,
  ConfiguracionSistema,
} from '../../types/police';
import { X, Users, Plus, Trash2, CheckCircle2, Sparkles, Shield, UserCheck } from 'lucide-react';

interface GestionPersonalGuardiaModalProps {
  parte: ParteNovedadesGuardia;
  personalList: Personal[];
  gruposList?: GrupoPersonal[];
  config?: ConfiguracionSistema;
  onSave: (updatedParte: ParteNovedadesGuardia) => void;
  onClose: () => void;
}

export const GestionPersonalGuardiaModal: React.FC<GestionPersonalGuardiaModalProps> = ({
  parte,
  personalList,
  gruposList = [],
  config,
  onSave,
  onClose,
}) => {
  const catalogoFunciones = config?.funcionesGuardiaCatalogo || [
    'Oficial de Servicio',
    'Oficial de Guardia',
    'Chofer',
    'Fotógrafo',
    'Perito Auxiliar',
    'Operador de Comunicaciones',
    'Encargado de Guardia',
    'Servicio de Prevención',
  ];

  const [funciones, setFunciones] = useState<AsignacionFuncionGuardia[]>(() => {
    return [...parte.funcionesPersonal];
  });

  // Requerimiento: "aclaro que deben especificar primero la seccion de guardia que corresponda"
  const [seccionGuardia, setSeccionGuardia] = useState<string>(() => {
    return parte.tipoGuardia || parte.grupoGuardia || 'Guardia Entrante';
  });

  // Requerimiento: "en funciones permite habilitar agregar funcion adicional (check)"
  const [habilitarFuncionAdicional, setHabilitarFuncionAdicional] = useState<boolean>(() => {
    return funciones.some((f) => Boolean(f.funcionSecundaria));
  });
  const [nuevoConFuncionAdicional, setNuevoConFuncionAdicional] = useState<boolean>(false);

  const [nuevaFuncion1, setNuevaFuncion1] = useState('');
  const [nuevaFuncion2, setNuevaFuncion2] = useState('');
  const [nuevoEfectivo, setNuevoEfectivo] = useState('');

  const handleUpdate = (
    id: string,
    campo: 'funcion' | 'funcionSecundaria' | 'personalNombre',
    valor: string
  ) => {
    setFunciones((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const handleRemove = (id: string) => {
    setFunciones((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAdd = () => {
    if (!nuevaFuncion1.trim() && !nuevoEfectivo.trim()) return;
    setFunciones((prev) => [
      ...prev,
      {
        id: 'f-' + Date.now(),
        funcion: nuevaFuncion1.trim() || 'Oficial de Guardia',
        funcionSecundaria: (nuevoConFuncionAdicional && nuevaFuncion2.trim()) ? nuevaFuncion2.trim() : undefined,
        personalNombre: nuevoEfectivo.trim(),
      },
    ]);
    setNuevaFuncion1('');
    setNuevaFuncion2('');
    setNuevoEfectivo('');
    setNuevoConFuncionAdicional(false);
  };

  const handleCargarDesdeGrupo = (grupoId: string) => {
    const grupo = gruposList.find((g) => g.id === grupoId);
    if (!grupo) return;

    if (grupo.funcionesSugeridas && grupo.funcionesSugeridas.length > 0) {
      setFunciones(
        grupo.funcionesSugeridas.map((fs, idx) => ({
          id: 'f-grp-' + Date.now() + '-' + idx,
          funcion: fs.funcion,
          personalNombre: fs.personalNombre,
        }))
      );
      return;
    }

    const members = personalList.filter((p) => grupo.personalIds.includes(p.id));
    if (members.length > 0) {
      setFunciones(
        members.map((m, idx) => ({
          id: 'f-grp-' + Date.now() + '-' + idx,
          funcion:
            idx === 0
              ? 'Oficial de Servicio'
              : idx === 1
              ? 'Oficial de Guardia'
              : idx === 2
              ? 'Chofer'
              : 'Perito Auxiliar',
          personalNombre: `${m.jerarquia} ${m.apellidoYNombre}`,
        }))
      );
    }
  };

  const handleSave = () => {
    onSave({
      ...parte,
      tipoGuardia: seccionGuardia,
      grupoGuardia: seccionGuardia,
      funcionesPersonal: funciones,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-950 via-slate-900 to-indigo-950 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Personal y Asignación de Funciones de Guardia
              </h2>
              <p className="text-xs text-blue-200">
                Especifique la sección de guardia y asigne funciones principales o adicionales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Requerimiento: Especificar primero la Sección de Guardia que corresponda */}
          <div className="bg-blue-50/70 border-2 border-blue-300 p-3.5 rounded-xl shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-800" />
                  <span>1. SECCIÓN DE GUARDIA O DESTINO * (Especificar Primero)</span>
                </label>
                <p className="text-[11px] text-blue-800">
                  Indique a qué sección o turno corresponde este personal
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={seccionGuardia}
                  onChange={(e) => setSeccionGuardia(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-400 bg-white text-blue-950 focus:ring-2 focus:ring-blue-600 shadow-2xs"
                >
                  <option value="Guardia Entrante">Guardia Entrante</option>
                  <option value="Guardia Saliente">Guardia Saliente</option>
                  <option value="Guardia Activa">Guardia Activa</option>
                  <option value="Sección Pericial">Sección Pericial</option>
                  <option value="Sección Criminalística">Sección Criminalística</option>
                  <option value="Sección Cibercrimen">Sección Cibercrimen</option>
                  <option value="Sección Prevención">Sección Prevención</option>
                  <option value="Servicio de Brigada">Servicio de Brigada</option>
                  {config?.gruposGuardia?.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  {!['Guardia Entrante', 'Guardia Saliente', 'Guardia Activa', 'Sección Pericial', 'Sección Criminalística', 'Sección Cibercrimen', 'Sección Prevención', 'Servicio de Brigada', ...(config?.gruposGuardia || [])].includes(seccionGuardia) && (
                    <option value={seccionGuardia}>{seccionGuardia}</option>
                  )}
                </select>
                <input
                  type="text"
                  value={seccionGuardia}
                  onChange={(e) => setSeccionGuardia(e.target.value)}
                  placeholder="O redactar sección..."
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Requerimiento: "en funciones permite habilitar agregar funcion adicional (check)" */}
            <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-blue-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={habilitarFuncionAdicional}
                  onChange={(e) => setHabilitarFuncionAdicional(e.target.checked)}
                  className="w-4 h-4 text-blue-800 rounded border-blue-300 focus:ring-blue-500 cursor-pointer"
                />
                <span>Habilitar asignación de Función Adicional (Función 2) para el personal</span>
              </label>
              <span className="text-[10px] text-blue-700 font-mono font-semibold">
                {habilitarFuncionAdicional ? '✓ Función adicional habilitada' : 'Solo función principal'}
              </span>
            </div>
          </div>

          {/* Barra de precarga desde Grupo */}
          {gruposList.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span className="font-bold text-slate-800 text-xs">
                  Cargar lista precargada desde un Grupo:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) handleCargarDesdeGrupo(e.target.value);
                  }}
                  defaultValue=""
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-semibold"
                >
                  <option value="" disabled>
                    Seleccione un grupo...
                  </option>
                  {gruposList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre} ({g.personalIds.length} integrantes)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Lista de personal con 1 o 2 funciones */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase">
                Efectivos y Funciones Asignadas ({funciones.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {habilitarFuncionAdicional ? 'Con función principal y adicional' : 'Solo función principal'}
              </span>
            </div>

            {/* Encabezados de columnas */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 px-1">
              <div className={habilitarFuncionAdicional ? 'col-span-4' : 'col-span-5'}>Personal / Efectivo Policial</div>
              <div className={habilitarFuncionAdicional ? 'col-span-4' : 'col-span-6'}>Función Principal *</div>
              {habilitarFuncionAdicional && (
                <div className="col-span-3">Función Adicional</div>
              )}
              <div className="col-span-1 text-center">Acción</div>
            </div>

            {/* Filas */}
            <div className="space-y-2.5">
              {funciones.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs items-center"
                >
                  {/* Efectivo */}
                  <div className={habilitarFuncionAdicional ? 'sm:col-span-4' : 'sm:col-span-5'}>
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-0.5">
                      Efectivo
                    </label>
                    <input
                      type="text"
                      list={`pers-list-${f.id}`}
                      value={f.personalNombre}
                      onChange={(e) => handleUpdate(f.id, 'personalNombre', e.target.value)}
                      placeholder="Jerarquía y Nombre del efectivo"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600"
                    />
                    <datalist id={`pers-list-${f.id}`}>
                      {personalList.map((p) => (
                        <option
                          key={p.id}
                          value={`${p.jerarquia} ${p.apellidoYNombre}`}
                        />
                      ))}
                    </datalist>
                  </div>

                  {/* Función 1 */}
                  <div className={habilitarFuncionAdicional ? 'sm:col-span-4' : 'sm:col-span-6'}>
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-0.5">
                      Función Principal
                    </label>
                    <input
                      type="text"
                      list={`func-list-${f.id}`}
                      value={f.funcion}
                      onChange={(e) => handleUpdate(f.id, 'funcion', e.target.value)}
                      placeholder="Ej. Oficial de Servicio"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                    <datalist id={`func-list-${f.id}`}>
                      {catalogoFunciones.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  {/* Función 2 (opcional habilitada por check) */}
                  {habilitarFuncionAdicional && (
                    <div className="sm:col-span-3">
                      <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-0.5">
                        Función Adicional
                      </label>
                      <input
                        type="text"
                        list={`func2-list-${f.id}`}
                        value={f.funcionSecundaria || ''}
                        onChange={(e) =>
                          handleUpdate(f.id, 'funcionSecundaria', e.target.value)
                        }
                        placeholder="Opcional (Ej. Chofer)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                      />
                      <datalist id={`func2-list-${f.id}`}>
                        {catalogoFunciones.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* Eliminar */}
                  <div className="sm:col-span-1 flex justify-end sm:justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(f.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Eliminar asignación"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Input para agregar nueva asignación */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs block">
                  + Asignar nuevo efectivo a esta guardia:
                </span>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nuevoConFuncionAdicional}
                    onChange={(e) => setNuevoConFuncionAdicional(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-900 border-slate-300"
                  />
                  <span>Agregar función adicional a este efectivo</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className={nuevoConFuncionAdicional ? 'sm:col-span-4' : 'sm:col-span-5'}>
                  <input
                    type="text"
                    list="pers-list-add"
                    value={nuevoEfectivo}
                    onChange={(e) => setNuevoEfectivo(e.target.value)}
                    placeholder="Efectivo designado..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold focus:ring-2 focus:ring-blue-600"
                  />
                  <datalist id="pers-list-add">
                    {personalList.map((p) => (
                      <option
                        key={p.id}
                        value={`${p.jerarquia} ${p.apellidoYNombre}`}
                      />
                    ))}
                  </datalist>
                </div>

                <div className={nuevoConFuncionAdicional ? 'sm:col-span-4' : 'sm:col-span-6'}>
                  <input
                    type="text"
                    list="func-list-add-1"
                    value={nuevaFuncion1}
                    onChange={(e) => setNuevaFuncion1(e.target.value)}
                    placeholder="Función principal (ej. Oficial de Servicio)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-600"
                  />
                  <datalist id="func-list-add-1">
                    {catalogoFunciones.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {nuevoConFuncionAdicional && (
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      list="func-list-add-2"
                      value={nuevaFuncion2}
                      onChange={(e) => setNuevaFuncion2(e.target.value)}
                      placeholder="Función adicional (ej. Chofer)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-600"
                    />
                    <datalist id="func-list-add-2">
                      {catalogoFunciones.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                )}

                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="w-full h-full min-h-[34px] px-2 py-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-950 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                    title="Agregar efectivo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Asignaciones de Guardia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
