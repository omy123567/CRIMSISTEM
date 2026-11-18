import React, { useState, useMemo } from 'react';
import {
  ForenseTurno,
  ConfiguracionSistema,
  ParteNovedadesGuardia,
} from '../../types/police';
import {
  Stethoscope,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Users,
  ClipboardList,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { GestionForenseGuardiaModal } from '../guardias/GestionForenseGuardiaModal';

interface ForenseViewProps {
  forensesList: ForenseTurno[];
  partesGuardiaList?: ParteNovedadesGuardia[];
  config: ConfiguracionSistema;
  activeDelegacionId?: string;
  onSaveForense: (f: ForenseTurno) => void;
  onDeleteForense: (id: string) => void;
  onSaveParte?: (parte: ParteNovedadesGuardia) => void;
}

export const ForenseView: React.FC<ForenseViewProps> = ({
  forensesList,
  partesGuardiaList = [],
  config,
  activeDelegacionId = 'del-laguna-blanca',
  onSaveForense,
  onDeleteForense,
  onSaveParte,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForense, setSelectedForense] = useState<ForenseTurno | null>(null);
  const [forenseToDelete, setForenseToDelete] = useState<ForenseTurno | null>(null);
  const [guardiaModalParte, setGuardiaModalParte] = useState<ParteNovedadesGuardia | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [customMedicoMode, setCustomMedicoMode] = useState(false);

  const medicosCatalogo = config.medicosForensesCatalogo || [];

  // Forenses cargados en Partes de Novedades de Guardia
  const guardiasConForense = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (partesGuardiaList || [])
      .map((p) => {
        const medicos =
          p.forensesTurno && p.forensesTurno.length > 0
            ? p.forensesTurno.filter((f) => f.medicoNombre.trim().length > 0)
            : p.forense?.medicoNombre?.trim()
            ? [
                {
                  id: `legacy-${p.id}`,
                  medicoNombre: p.forense.medicoNombre.trim(),
                  turno: '',
                  horaIngreso: p.horaInicio || '',
                  horaEgreso: p.horaFin || '',
                  totalExaminados: p.forense.totalExaminados || 0,
                  examinadosHastaHs: p.forense.examinadosHastaHs || '',
                },
              ]
            : [];

        const totalExaminados = medicos.reduce(
          (acc, m) => acc + (Number(m.totalExaminados) || 0),
          0
        );

        return { parte: p, medicos, totalExaminados };
      })
      .filter(({ parte, medicos }) => {
        if (medicos.length === 0) return false;
        if (!q) return true;
        const matchDoc = medicos.some((m) => m.medicoNombre.toLowerCase().includes(q));
        const matchGuardia =
          (parte.tipoGuardia || '').toLowerCase().includes(q) ||
          (parte.grupoGuardia || '').toLowerCase().includes(q) ||
          (parte.fechaInicio || '').includes(q);
        return matchDoc || matchGuardia;
      })
      .sort((a, b) => (b.parte.fechaInicio || '').localeCompare(a.parte.fechaInicio || ''));
  }, [partesGuardiaList, searchTerm]);

  // Registros directos filtrados
  const filteredForenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return forensesList.filter((f) => {
      if (!q) return true;
      return (
        f.nombreMedico.toLowerCase().includes(q) ||
        (f.turno || '').toLowerCase().includes(q) ||
        (f.observaciones || '').toLowerCase().includes(q)
      );
    });
  }, [forensesList, searchTerm]);

  const totalExaminadosGlobal =
    guardiasConForense.reduce((acc, g) => acc + g.totalExaminados, 0) +
    filteredForenses.reduce((acc, f) => acc + (Number(f.totalExaminados) || 0), 0);

  const [formData, setFormData] = useState<ForenseTurno>({
    id: 'for-' + Date.now(),
    nombreMedico: medicosCatalogo[0] || '',
    turno: '',
    horaIngreso: '',
    horaEgreso: '',
    examinadosHastaHs: '',
    totalExaminados: 0,
    observaciones: '',
    delegacionId: activeDelegacionId,
  });

  const handleOpenModal = (f?: ForenseTurno) => {
    setFormError(null);
    if (f) {
      setSelectedForense(f);
      setFormData(f);
      setCustomMedicoMode(
        medicosCatalogo.length === 0 ||
          (Boolean(f.nombreMedico) && !medicosCatalogo.includes(f.nombreMedico))
      );
    } else {
      const defaultDoc = medicosCatalogo[0] || '';
      setSelectedForense(null);
      setFormData({
        id: 'for-' + Date.now(),
        nombreMedico: defaultDoc,
        turno: '',
        horaIngreso: '',
        horaEgreso: '',
        examinadosHastaHs: '',
        totalExaminados: 0,
        observaciones: '',
        delegacionId: activeDelegacionId,
      });
      setCustomMedicoMode(medicosCatalogo.length === 0);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreMedico.trim()) {
      setFormError('Debe indicar el Médico de Turno.');
      return;
    }
    onSaveForense({
      ...formData,
      nombreMedico: formData.nombreMedico.trim(),
      totalExaminados: Math.max(0, Number(formData.totalExaminados) || 0),
      delegacionId: formData.delegacionId || activeDelegacionId,
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Forense Policial de Turno
            </h1>
            <span className="bg-teal-50 text-teal-900 border border-teal-200 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono tabular-nums">
              {totalExaminadosGlobal} examinados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Médicos de turno asignados en Partes de Novedades y registros directos con cantidad de examinados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cargar Médico de Turno</span>
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por médico de turno, guardia o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-teal-600"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap px-2 tabular-nums">
          {guardiasConForense.length + filteredForenses.length} registros
        </span>
      </div>

      {/* Forenses asignados desde Partes de Novedades */}
      {guardiasConForense.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-teal-700" />
            <span>Forenses en Partes de Novedades ({guardiasConForense.length})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guardiasConForense.map(({ parte, medicos, totalExaminados }) => (
              <div
                key={parte.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-teal-400 p-4 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {parte.tipoGuardia || parte.grupoGuardia}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono tabular-nums">
                          <Calendar className="w-3 h-3" />
                          <span>{parte.fechaInicio}</span>
                        </div>
                      </div>
                    </div>

                    <span className="bg-teal-50 text-teal-900 border border-teal-200 text-xs px-2.5 py-1 rounded-lg font-extrabold font-mono tabular-nums shrink-0">
                      {totalExaminados} exam.
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/70">
                    {medicos.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-slate-800 truncate">
                          {m.medicoNombre}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-teal-900 shrink-0">
                          {m.totalExaminados || 0} exam.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {onSaveParte && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setGuardiaModalParte(parte)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Cargar Examinados / Agregar Forense</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registros independientes */}
      {filteredForenses.length > 0 && (
        <div className="space-y-3">
          {guardiasConForense.length > 0 && (
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-blue-700" />
              <span>Registros Directos de Forense ({filteredForenses.length})</span>
            </h2>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredForenses.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {f.nombreMedico}
                      </h3>
                      <span className="text-[11px] text-slate-500">Médico de Turno</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-500">
                    Cantidad Examinados
                  </span>
                  <span className="text-xl font-extrabold text-blue-950 font-mono tabular-nums">
                    {f.totalExaminados}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(f)}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setForenseToDelete(f)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío cuando no hay registros en ninguno */}
      {guardiasConForense.length === 0 && filteredForenses.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">
            No se encontraron forenses policiales
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cargue un Médico de Turno aquí o habilítelo en un Parte de Novedades de Guardia.
          </p>
        </div>
      )}

      {/* Modal simplificado: solo Médico de Turno + Cantidad Examinados */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden text-xs animate-in fade-in">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-300" />
                <span>{selectedForense ? 'Editar Forense de Turno' : 'Cargar Médico de Turno'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">
                  Médico de Turno *
                </label>
                {medicosCatalogo.length > 0 && (
                  <select
                    value={customMedicoMode ? '__CUSTOM__' : formData.nombreMedico}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setCustomMedicoMode(true);
                        setFormData({ ...formData, nombreMedico: '' });
                      } else {
                        setCustomMedicoMode(false);
                        setFormData({ ...formData, nombreMedico: val });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold"
                  >
                    <option value="">-- Seleccionar Médico de Turno --</option>
                    {medicosCatalogo.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__CUSTOM__">Otro médico (escribir nombre)...</option>
                  </select>
                )}

                {customMedicoMode && (
                  <input
                    type="text"
                    required
                    value={formData.nombreMedico}
                    onChange={(e) => setFormData({ ...formData, nombreMedico: e.target.value })}
                    placeholder="Nombre del Médico de Turno..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cantidad Examinados
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalExaminados}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalExaminados: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums font-bold text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de gestión de examinados / agregar otro forense para una Guardia */}
      {guardiaModalParte && onSaveParte && (
        <GestionForenseGuardiaModal
          parte={guardiaModalParte}
          config={config}
          onSave={(updated) => {
            onSaveParte(updated);
            setGuardiaModalParte(null);
          }}
          onClose={() => setGuardiaModalParte(null)}
        />
      )}

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!forenseToDelete}
        title="Eliminar Registro de Forense"
        message={`¿Está seguro de eliminar el registro del médico "${forenseToDelete?.nombreMedico}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Registro"
        cancelText="Cancelar"
        danger={true}
        onConfirm={() => {
          if (forenseToDelete) {
            onDeleteForense(forenseToDelete.id);
            setForenseToDelete(null);
          }
        }}
        onCancel={() => setForenseToDelete(null)}
      />
    </div>
  );
};
