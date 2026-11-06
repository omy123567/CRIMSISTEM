import React, { useState } from 'react';
import { ReparacionMecanica, MovilPolicial } from '../../types/police';
import { X, Wrench, CheckCircle2, Upload } from 'lucide-react';

interface ReparacionModalProps {
  movil: MovilPolicial;
  reparacion?: ReparacionMecanica | null;
  onSave: (rep: ReparacionMecanica) => void;
  onClose: () => void;
}

export const ReparacionModal: React.FC<ReparacionModalProps> = ({
  movil,
  reparacion,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(reparacion);

  const [formData, setFormData] = useState<ReparacionMecanica>(() => {
    if (reparacion) return { ...reparacion };
    return {
      id: 'rep-' + Date.now(),
      movilId: movil.id,
      fecha: new Date().toISOString().slice(0, 10),
      kilometraje: movil.kilometrajeActual,
      tipoIntervencion: 'Mecánica',
      tallerProveedor: 'Taller Mecánico Policial Central',
      descripcion: '',
      costoPresupuesto: 0,
      repuestosCambiados: '',
      createdAt: new Date().toISOString(),
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      alert('Describa los trabajos mecánicos realizados');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-700 rounded-lg text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? 'Editar Reparación' : `Nueva Reparación Mecánica - ${movil.nroMovilInterno}`}
              </h2>
              <p className="text-xs text-slate-300">
                Dominio: {movil.dominioPatente} • {movil.marca} {movil.modelo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha de Intervención</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kilometraje al Ingreso</label>
              <input
                type="number"
                required
                value={formData.kilometraje}
                onChange={(e) => setFormData({ ...formData, kilometraje: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Intervención</label>
              <select
                value={formData.tipoIntervencion}
                onChange={(e) => setFormData({ ...formData, tipoIntervencion: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="Mecánica">Mecánica General</option>
                <option value="Frenos">Frenos y Suspensión</option>
                <option value="Eléctrica">Electricidad / Batería</option>
                <option value="Neumáticos">Neumáticos / Alineación</option>
                <option value="Chapa y Pintura">Chapa y Pintura</option>
                <option value="Service Programado">Service Programado Oficial</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Costo / Presupuesto ($)</label>
              <input
                type="number"
                value={formData.costoPresupuesto}
                onChange={(e) => setFormData({ ...formData, costoPresupuesto: Number(e.target.value) })}
                placeholder="$ 0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Taller Mecánico / Proveedor</label>
            <input
              type="text"
              required
              value={formData.tallerProveedor}
              onChange={(e) => setFormData({ ...formData, tallerProveedor: e.target.value })}
              placeholder="Ej. Taller Policial Central / Concesionario Oficial"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Descripción de Trabajos Realizados *</label>
            <textarea
              rows={3}
              required
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalle exhaustivo de las fallas detectadas y reparaciones ejecutadas..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Repuestos Cambiados / Insumos</label>
            <input
              type="text"
              value={formData.repuestosCambiados}
              onChange={(e) => setFormData({ ...formData, repuestosCambiados: e.target.value })}
              placeholder="Ej. Pastillas de freno, filtro de aceite, correa de distribución..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-orange-700 hover:bg-orange-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Reparación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
