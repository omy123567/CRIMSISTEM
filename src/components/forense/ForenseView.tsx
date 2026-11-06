import React, { useState, useMemo } from 'react';
import { ForenseTurno, ConfiguracionSistema } from '../../types/police';
import { Stethoscope, Plus, Clock, UserCheck, Trash2, Edit2, CheckCircle2, Search, Filter } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

interface ForenseViewProps {
  forensesList: ForenseTurno[];
  config: ConfiguracionSistema;
  onSaveForense: (f: ForenseTurno) => void;
  onDeleteForense: (id: string) => void;
}

export const ForenseView: React.FC<ForenseViewProps> = ({
  forensesList,
  config,
  onSaveForense,
  onDeleteForense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForense, setSelectedForense] = useState<ForenseTurno | null>(null);
  const [forenseToDelete, setForenseToDelete] = useState<ForenseTurno | null>(null);

  // Filtrado reactivo en tiempo real
  const filteredForenses = useMemo(() => {
    return forensesList.filter((f) => {
      if (filtroTurno !== 'todos' && !f.turno.toLowerCase().includes(filtroTurno.toLowerCase())) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchMedico = f.nombreMedico.toLowerCase().includes(term);
        const matchTurno = f.turno.toLowerCase().includes(term);
        const matchObs = (f.observaciones || '').toLowerCase().includes(term);
        if (!matchMedico && !matchTurno && !matchObs) return false;
      }
      return true;
    });
  }, [forensesList, searchTerm, filtroTurno]);

  const [formData, setFormData] = useState<ForenseTurno>({
    id: 'for-' + Date.now(),
    nombreMedico: '',
    turno: 'Guardia Noche (19:00 a 07:00 hs)',
    horaIngreso: '19:00',
    horaEgreso: '07:00',
    examinadosHastaHs: '06:30 hs.',
    totalExaminados: 0,
    observaciones: '',
  });

  const handleOpenModal = (f?: ForenseTurno) => {
    if (f) {
      setSelectedForense(f);
      setFormData(f);
    } else {
      setSelectedForense(null);
      setFormData({
        id: 'for-' + Date.now(),
        nombreMedico: '',
        turno: 'Guardia Noche (19:00 a 07:00 hs)',
        horaIngreso: '19:00',
        horaEgreso: '07:00',
        examinadosHastaHs: '07:00 hs.',
        totalExaminados: 0,
        observaciones: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreMedico.trim()) {
      alert('Ingrese el nombre del médico legista / forense');
      return;
    }
    onSaveForense(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Cuerpo Médico & Forense Policial de Turno
            </h1>
            <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Turnos & Relevos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro de facultativos de guardia, horas de ingreso, relevos médicos y cómputo de personas examinadas.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cargar Forense / Relevo</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar facultativo, turno u observaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="todos">Todos los Turnos</option>
            <option value="Mañana">Guardia Mañana (07:00 a 19:00 hs)</option>
            <option value="Noche">Guardia Noche (19:00 a 07:00 hs)</option>
            <option value="Relevo">Relevos Especiales</option>
          </select>
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap px-2">
            {filteredForenses.length} {filteredForenses.length === 1 ? 'médico' : 'médicos'}
          </span>
        </div>
      </div>

      {/* Tarjetas de Forenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForenses.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No se encontraron forenses policiales</h3>
            <p className="text-xs text-slate-500 mt-1">
              Pruebe cambiando el término de búsqueda o cargue un nuevo facultativo de turno.
            </p>
          </div>
        ) : (
          filteredForenses.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-900">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{f.nombreMedico}</h3>
                      <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {f.turno}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 py-2 border-y border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hora Ingreso:</span>
                    <span className="font-bold font-mono text-slate-800">{f.horaIngreso} hs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hora Egreso / Relevo:</span>
                    <span className="font-bold font-mono text-slate-800">{f.horaEgreso || 'En curso'}</span>
                  </div>
                </div>

                <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Total de Personas Examinadas
                  </div>
                  <div className="text-2xl font-extrabold text-blue-950 font-mono mt-0.5">
                    {f.totalExaminados}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    registrados hasta hs. {f.examinadosHastaHs}
                  </div>
                </div>

                {f.observaciones && (
                  <div className="mt-2 text-slate-500 text-[11px] italic">
                    {f.observaciones}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenModal(f)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setForenseToDelete(f)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Eliminar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Forense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-300 p-6 space-y-4 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-900" />
                <span>{selectedForense ? 'Editar Forense' : 'Cargar Forense / Relevo Policial'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Médico Forense de Guardia *
                </label>
                {config.medicosForensesCatalogo && config.medicosForensesCatalogo.length > 0 && (
                  <div className="mb-1.5">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData({ ...formData, nombreMedico: e.target.value });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 text-xs font-semibold mb-1"
                    >
                      <option value="">-- Seleccionar de la lista pre-cargada --</option>
                      {config.medicosForensesCatalogo.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <input
                  type="text"
                  required
                  value={formData.nombreMedico}
                  onChange={(e) => setFormData({ ...formData, nombreMedico: e.target.value })}
                  placeholder="Ej. Dr. Guillermo Navarro (o seleccione arriba)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Turno de Cobertura</label>
                <input
                  type="text"
                  required
                  value={formData.turno}
                  onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                  placeholder="Ej. Guardia Noche / Relevo Mañana"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora Ingreso</label>
                  <input
                    type="text"
                    value={formData.horaIngreso}
                    onChange={(e) => setFormData({ ...formData, horaIngreso: e.target.value })}
                    placeholder="19:00"
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora Egreso / Relevo</label>
                  <input
                    type="text"
                    value={formData.horaEgreso || ''}
                    onChange={(e) => setFormData({ ...formData, horaEgreso: e.target.value })}
                    placeholder="07:00"
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cantidad Examinados
                  </label>
                  <input
                    type="number"
                    value={formData.totalExaminados}
                    onChange={(e) => setFormData({ ...formData, totalExaminados: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hasta hs:</label>
                  <input
                    type="text"
                    value={formData.examinadosHastaHs}
                    onChange={(e) => setFormData({ ...formData, examinadosHastaHs: e.target.value })}
                    placeholder="07:00 hs."
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={formData.observaciones || ''}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Detalles sobre autopsias, derivaciones hospitalarias..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!forenseToDelete}
        title="Eliminar Registro de Forense"
        message={`¿Está seguro de eliminar el registro de turno y examinados del Dr./Dra. "${forenseToDelete?.nombreMedico}"? Esta acción no se puede deshacer.`}
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
