import React, { useState } from 'react';
import { MovilPolicial, ConfiguracionSistema } from '../../types/police';
import { X, Car, CheckCircle2 } from 'lucide-react';

interface MovilModalProps {
  movil?: MovilPolicial | null;
  config: ConfiguracionSistema;
  onSave: (m: MovilPolicial) => void;
  onClose: () => void;
}

export const MovilModal: React.FC<MovilModalProps> = ({
  movil,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(movil);

  const [formData, setFormData] = useState<MovilPolicial>(() => {
    if (movil) return { ...movil };
    return {
      id: 'mov-' + Date.now(),
      tipo: 'Patrullero',
      marca: 'Toyota',
      modelo: 'Hilux 4x4',
      dominioPatente: '',
      nroMovilInterno: 'M-',
      dependenciaAsignada: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      kilometrajeActual: 0,
      condicionGeneral: 'Bueno',
      estadoOperativo: 'En Servicio',
      ultimoServiceKm: 0,
      ultimoServiceFecha: new Date().toISOString().slice(0, 10),
      proximoServiceKm: 10000,
      vencimientoRTO: '',
      aseguradora: 'Nación Seguros S.A.',
      nroPoliza: '',
      vencimientoSeguro: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dominioPatente.trim() || !formData.nroMovilInterno.trim()) {
      alert('Debe ingresar Dominio/Patente y N° de Móvil Interno');
      return;
    }
    onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Editar Móvil: ${formData.nroMovilInterno}` : 'Nuevo Móvil Policial'}
              </h2>
              <p className="text-xs text-slate-300">
                Alta en el parque automotor, ficha técnica, RTO y seguros
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Fila 1: N° Interno, Patente, Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° Móvil / Interno *
              </label>
              <input
                type="text"
                required
                value={formData.nroMovilInterno}
                onChange={(e) => setFormData({ ...formData, nroMovilInterno: e.target.value })}
                placeholder="Ej. M-301"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Dominio / Patente *
              </label>
              <input
                type="text"
                required
                value={formData.dominioPatente}
                onChange={(e) => setFormData({ ...formData, dominioPatente: e.target.value.toUpperCase() })}
                placeholder="Ej. AF 342 PL"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Vehículo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="Patrullero">Patrullero (Auto Sedán)</option>
                <option value="Camioneta">Camioneta (Pick-up 4x4/4x2)</option>
                <option value="Utilitario">Utilitario / Furgón</option>
                <option value="Motovehículo">Motovehículo</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Marca, Modelo, Dependencia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Marca</label>
              <input
                type="text"
                required
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                placeholder="Toyota, Ford, Chevrolet..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Modelo</label>
              <input
                type="text"
                required
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                placeholder="Corolla, Ranger, Amarok..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dependencia Asignada</label>
              <select
                value={formData.dependenciaAsignada}
                onChange={(e) => setFormData({ ...formData, dependenciaAsignada: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {config.dependenciasPoliciales.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 3: Estados y Kilometraje */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kilometraje Actual</label>
              <input
                type="number"
                value={formData.kilometrajeActual}
                onChange={(e) => setFormData({ ...formData, kilometrajeActual: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Condición General</label>
              <select
                value={formData.condicionGeneral}
                onChange={(e) => setFormData({ ...formData, condicionGeneral: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado Operativo</label>
              <select
                value={formData.estadoOperativo}
                onChange={(e) => setFormData({ ...formData, estadoOperativo: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
              >
                <option value="En Servicio">En Servicio (Operativo)</option>
                <option value="En Taller Mecánico">En Taller Mecánico</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
                <option value="Baja definitiva">Baja definitiva</option>
              </select>
            </div>
          </div>

          {/* Mantenimiento Preventivo (Service) */}
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-2">
            <h3 className="font-bold text-blue-950">Mantenimiento Preventivo (Service)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Último Service (Km)</label>
                <input
                  type="number"
                  value={formData.ultimoServiceKm}
                  onChange={(e) => setFormData({ ...formData, ultimoServiceKm: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha Último Service</label>
                <input
                  type="date"
                  value={formData.ultimoServiceFecha}
                  onChange={(e) => setFormData({ ...formData, ultimoServiceFecha: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Próximo Service (Km)</label>
                <input
                  type="number"
                  value={formData.proximoServiceKm}
                  onChange={(e) => setFormData({ ...formData, proximoServiceKm: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* RTO y Seguro Automotor */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900">Documentación: RTO y Seguro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vencimiento RTO</label>
                <input
                  type="date"
                  value={formData.vencimientoRTO}
                  onChange={(e) => setFormData({ ...formData, vencimientoRTO: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Compañía Aseguradora</label>
                <input
                  type="text"
                  value={formData.aseguradora}
                  onChange={(e) => setFormData({ ...formData, aseguradora: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">N° de Póliza</label>
                <input
                  type="text"
                  value={formData.nroPoliza}
                  onChange={(e) => setFormData({ ...formData, nroPoliza: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vencimiento Seguro</label>
                <input
                  type="date"
                  value={formData.vencimientoSeguro}
                  onChange={(e) => setFormData({ ...formData, vencimientoSeguro: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>
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
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Móvil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
