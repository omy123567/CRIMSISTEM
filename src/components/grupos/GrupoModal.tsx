import React, { useState } from 'react';
import { GrupoPersonal, Personal, ConfiguracionSistema } from '../../types/police';
import { X, Users, Shield, Plus, Trash2, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';

interface GrupoModalProps {
  grupo?: GrupoPersonal | null;
  personalList: Personal[];
  config: ConfiguracionSistema;
  onSave: (grupo: GrupoPersonal) => void;
  onClose: () => void;
}

export const GrupoModal: React.FC<GrupoModalProps> = ({
  grupo,
  personalList,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(grupo);

  const [formData, setFormData] = useState<GrupoPersonal>(() => {
    if (grupo) return { ...grupo };
    return {
      id: 'grp-' + Date.now(),
      nombre: '',
      descripcion: '',
      color: '#1e3a8a',
      jefeGrupo: '',
      personalIds: [],
      funcionesSugeridas: [
        { funcion: 'Oficial de servicio – Perito de turno', personalNombre: '' },
        { funcion: 'Oficial de guardia – Perito de turno', personalNombre: '' },
        { funcion: 'Chofer – Fotógrafo', personalNombre: '' },
        { funcion: 'Servicio despeje / prevención', personalNombre: '' },
      ],
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [filtroPersonal, setFiltroPersonal] = useState('');
  const [nuevaFuncionNombre, setNuevaFuncionNombre] = useState('');
  const [nuevaFuncionEfectivo, setNuevaFuncionEfectivo] = useState('');

  const handleToggleMember = (personalId: string) => {
    setFormData((prev) => {
      const exists = prev.personalIds.includes(personalId);
      const newIds = exists
        ? prev.personalIds.filter((id) => id !== personalId)
        : [...prev.personalIds, personalId];
      return { ...prev, personalIds: newIds };
    });
  };

  const handleAddFuncion = () => {
    if (!nuevaFuncionNombre.trim()) return;
    setFormData((prev) => ({
      ...prev,
      funcionesSugeridas: [
        ...(prev.funcionesSugeridas || []),
        {
          funcion: nuevaFuncionNombre.trim(),
          personalNombre: nuevaFuncionEfectivo.trim(),
        },
      ],
    }));
    setNuevaFuncionNombre('');
    setNuevaFuncionEfectivo('');
  };

  const handleRemoveFuncion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      funcionesSugeridas: (prev.funcionesSugeridas || []).filter((_, i) => i !== index),
    }));
  };

  const handleUpdateFuncion = (index: number, campo: 'funcion' | 'personalNombre', valor: string) => {
    setFormData((prev) => {
      const updated = [...(prev.funcionesSugeridas || [])];
      updated[index] = { ...updated[index], [campo]: valor };
      return { ...prev, funcionesSugeridas: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('Por favor ingrese el nombre del grupo o sección.');
      return;
    }
    onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
  };

  const filteredPersonal = personalList.filter((p) => {
    const term = filtroPersonal.toLowerCase();
    return (
      p.apellidoYNombre.toLowerCase().includes(term) ||
      p.dni.includes(term) ||
      p.jerarquia.toLowerCase().includes(term) ||
      p.seccionGrupo.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <Users className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditing ? 'Editar Grupo / Sección de Guardia' : 'Crear Nuevo Grupo de Guardia'}
              </h2>
              <p className="text-xs text-blue-200">
                Designación de efectivos, jefatura de turno y funciones predefinidas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {/* Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Grupo / Guardia *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Guardia A, Guardia B, Brigada Pericial Norte, Sección Accidentología"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jefe / Oficial a Cargo
              </label>
              <input
                type="text"
                list="jefes-list"
                value={formData.jefeGrupo || ''}
                onChange={(e) => setFormData({ ...formData, jefeGrupo: e.target.value })}
                placeholder="Ej. Crio. Insp. ALVAREZ Marcos"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              />
              <datalist id="jefes-list">
                {personalList.map((p) => (
                  <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción / Especialidad Operativa
              </label>
              <input
                type="text"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Ej. Turno rotativo 24hs, pericias balísticas, levantamiento de rastros..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-900"
                />
                <span>Grupo Activo en Servicio</span>
              </label>
            </div>
          </div>

          {/* ASIGNACIÓN DE PERSONAL (MIEMBROS DEL GRUPO) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-700" />
                  Efectivos Policiales Asignados ({formData.personalIds.length} seleccionados)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Seleccione el personal que integra habitualmente este grupo o sección de guardia.
                </p>
              </div>
              <input
                type="text"
                value={filtroPersonal}
                onChange={(e) => setFiltroPersonal(e.target.value)}
                placeholder="Buscar por nombre, jerarquía, DNI..."
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 max-w-xs"
              />
            </div>

            {/* Grilla de selección rápida de personal */}
            <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-1 bg-white border border-slate-200 rounded-lg">
              {filteredPersonal.map((p) => {
                const isSelected = formData.personalIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleMember(p.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-medium shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">
                        {p.jerarquia} {p.apellidoYNombre}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        DNI {p.dni} • Plaza: {p.plaza || 'S/D'}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FUNCIONES PRECARGADAS DE LA GUARDIA (Según imagen adjunta image_a9bdfe7b.png) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-700" />
                  Funciones Pre-cargadas para la Guardia (Auto-llenado al elegir este grupo)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Al iniciar un nuevo Parte de Novedades y elegir este grupo, estas funciones y efectivos se precargarán automáticamente.
                </p>
              </div>
            </div>

            {/* Lista editable idéntica a image_a9bdfe7b.png */}
            <div className="space-y-2">
              {(formData.funcionesSugeridas || []).map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={f.funcion}
                    onChange={(e) => handleUpdateFuncion(idx, 'funcion', e.target.value)}
                    placeholder="Función (ej. Oficial de servicio – Perito de turno)"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                  />
                  <input
                    type="text"
                    list={`miembros-list-${idx}`}
                    value={f.personalNombre}
                    onChange={(e) => handleUpdateFuncion(idx, 'personalNombre', e.target.value)}
                    placeholder="Efectivo designado (Jerarquía y Nombre)"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
                  />
                  <datalist id={`miembros-list-${idx}`}>
                    {personalList
                      .filter((p) => formData.personalIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
                      ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => handleRemoveFuncion(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar función"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Input para agregar nueva función */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={nuevaFuncionNombre}
                onChange={(e) => setNuevaFuncionNombre(e.target.value)}
                placeholder="Nueva función (ej. Servicio despeje zona Sur)"
                className="w-full sm:flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
              />
              <input
                type="text"
                list="miembros-list-new"
                value={nuevaFuncionEfectivo}
                onChange={(e) => setNuevaFuncionEfectivo(e.target.value)}
                placeholder="Efectivo asignado"
                className="w-full sm:flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
              />
              <datalist id="miembros-list-new">
                {personalList.map((p) => (
                  <option key={p.id} value={`${p.jerarquia} ${p.apellidoYNombre}`} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={handleAddFuncion}
                className="w-full sm:w-auto px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Función</span>
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Grupo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
