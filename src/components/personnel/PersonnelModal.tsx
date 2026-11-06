import React, { useState } from 'react';
import { Personal, ConfiguracionSistema } from '../../types/police';
import { X, Shield, AlertTriangle, Upload, Eye, Trash2, CheckCircle2, Printer } from 'lucide-react';
import { generarPdfLegajoPersonal } from '../../services/pdfService';

interface PersonnelModalProps {
  personal?: Personal | null;
  config: ConfiguracionSistema;
  onSave: (data: Personal) => void;
  onClose: () => void;
}

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  personal,
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(personal);

  const [formData, setFormData] = useState<Personal>(() => {
    if (personal) return { ...personal };
    return {
      id: 'pers-' + Date.now(),
      apellidoYNombre: '',
      dni: '',
      sexo: 'M',
      jerarquia: config.jerarquias[7] || 'Oficial Subinspector',
      plaza: '',
      fechaNacimiento: '',
      estadoCivil: 'Soltero/a',
      domicilio: '',
      email: '',
      telefono: '',
      seccionGrupo: config.gruposGuardia[0] || 'Guardia A',
      estado: 'Activo',
      licenciaNro: '',
      licenciaCategoria: 'B1 Particular',
      licenciaVencimiento: '',
      obraSocialNro: '',
      credencialNro: '',
      armamento: {
        marca: 'Bersa',
        modelo: 'Thunder 9 Pro',
        serieNro: '',
        calibre: '9x19 mm',
        secuestradoORetenido: false,
        causaSecuestro: '',
      },
      chaleco: {
        serieNro: '',
        talla: 'M',
        secuestradoORetenido: false,
        causaSecuestro: '',
      },
      documentosAdjuntos: [],
      observaciones: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeTab, setActiveTab] = useState<'general' | 'licencia' | 'equipamiento' | 'adjuntos'>('general');
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<string | null>(null);

  // Manejo de carga de archivos de imagen para legajo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          documentosAdjuntos: [
            ...(prev.documentosAdjuntos || []),
            {
              id: 'doc-' + Date.now() + Math.random().toString(36).substr(2, 4),
              nombre: file.name,
              tipo: file.type,
              dataUrl,
              fecha: new Date().toISOString().slice(0, 10),
            },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDoc = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      documentosAdjuntos: prev.documentosAdjuntos?.filter((d) => d.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apellidoYNombre.trim() || !formData.dni.trim()) {
      alert('Por favor complete Apellido y Nombre y DNI');
      return;
    }
    onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-lg text-blue-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Editar Legajo: ${formData.apellidoYNombre}` : 'Nuevo Efectivo Policial'}
              </h2>
              <p className="text-xs text-slate-300">
                Ficha oficial de personal, armas, chalecos y situación de revista
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold">
          {[
            { id: 'general', label: '1. Datos Personales & Revista' },
            { id: 'licencia', label: '2. Licencia de Conducir & Obra Social' },
            { id: 'equipamiento', label: '3. Armamento & Chaleco Balístico' },
            { id: 'adjuntos', label: `4. Documentaciones Adjuntas (${formData.documentosAdjuntos?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-blue-900 text-blue-900 font-bold bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Apellido y Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.apellidoYNombre}
                    onChange={(e) => setFormData({ ...formData, apellidoYNombre: e.target.value })}
                    placeholder="Ej. PEREZ, Juan Carlos"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    placeholder="Ej. 34567890"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jerarquía Policial</label>
                  <select
                    value={formData.jerarquia}
                    onChange={(e) => setFormData({ ...formData, jerarquia: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {config.jerarquias.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plaza / Legajo N°</label>
                  <input
                    type="text"
                    value={formData.plaza}
                    onChange={(e) => setFormData({ ...formData, plaza: e.target.value })}
                    placeholder="Ej. P-1420"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sexo</label>
                  <select
                    value={formData.sexo}
                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="M">Masculino (M)</option>
                    <option value="F">Femenino (F)</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado de Revista</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Licencia Médica">Licencia Médica</option>
                    <option value="Licencia Anual">Licencia Anual</option>
                    <option value="Comisión">Comisión</option>
                    <option value="Pasiva">Pasiva</option>
                    <option value="Retirado">Retirado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sección / Grupo de Guardia</label>
                  <select
                    value={formData.seccionGrupo}
                    onChange={(e) => setFormData({ ...formData, seccionGrupo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {config.gruposGuardia.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Civil</label>
                  <input
                    type="text"
                    value={formData.estadoCivil}
                    onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                    placeholder="Soltero/a, Casado/a, etc."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Domicilio Real</label>
                  <input
                    type="text"
                    value={formData.domicilio}
                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                    placeholder="Calle, Número, Barrio, Localidad"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej. 3704-123456"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-Mail Oficial / Personal</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@policia.gob.ar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'licencia' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Licencia Nacional de Conducir</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Licencia de Conducir N°</label>
                    <input
                      type="text"
                      value={formData.licenciaNro}
                      onChange={(e) => setFormData({ ...formData, licenciaNro: e.target.value })}
                      placeholder="Ej. B-34567890"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Categoría Habilitada</label>
                    <select
                      value={formData.licenciaCategoria}
                      onChange={(e) => setFormData({ ...formData, licenciaCategoria: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="A1 / A2 Motovehículos">A1 / A2 Motovehículos</option>
                      <option value="B1 Particular Autos">B1 Particular Autos</option>
                      <option value="B2 Camionetas / Utilitarios">B2 Camionetas / Utilitarios</option>
                      <option value="C1 / C2 Camiones">C1 / C2 Camiones</option>
                      <option value="D1 / D2 Transporte / Móvil Policial">D1 / D2 Transporte Policial</option>
                      <option value="E Especial">E Especial Maquinaria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={formData.licenciaVencimiento}
                      onChange={(e) => setFormData({ ...formData, licenciaVencimiento: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Obra Social y Credencial Policial</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Obra Social N° / Afiliado</label>
                    <input
                      type="text"
                      value={formData.obraSocialNro}
                      onChange={(e) => setFormData({ ...formData, obraSocialNro: e.target.value })}
                      placeholder="Ej. IOSP-192834"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Credencial Policial N°</label>
                    <input
                      type="text"
                      value={formData.credencialNro}
                      onChange={(e) => setFormData({ ...formData, credencialNro: e.target.value })}
                      placeholder="Ej. POL-0892"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equipamiento' && (
            <div className="space-y-4">
              {/* Armamento provisto */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Armamento Provisto a Cargo</span>
                    {formData.armamento.secuestradoORetenido ? (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-300">
                        RETENIDO / SECUESTRADO
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                        ASIGNADO EN PODER
                      </span>
                    )}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.armamento.marca}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          armamento: { ...formData.armamento, marca: e.target.value },
                        })
                      }
                      placeholder="Bersa, Taurus, Glock..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.armamento.modelo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          armamento: { ...formData.armamento, modelo: e.target.value },
                        })
                      }
                      placeholder="Thunder 9, TPR 9..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Serie N°</label>
                    <input
                      type="text"
                      value={formData.armamento.serieNro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          armamento: { ...formData.armamento, serieNro: e.target.value },
                        })
                      }
                      placeholder="Ej. F92810"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Calibre</label>
                    <input
                      type="text"
                      value={formData.armamento.calibre}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          armamento: { ...formData.armamento, calibre: e.target.value },
                        })
                      }
                      placeholder="9x19 mm, .40..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {/* Switch de secuestro / retención */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.armamento.secuestradoORetenido}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          armamento: {
                            ...formData.armamento,
                            secuestradoORetenido: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-red-700">
                      Corroborar si fue secuestrado o retenido
                    </span>
                  </label>

                  {formData.armamento.secuestradoORetenido && (
                    <div className="mt-2">
                      <label className="block font-semibold text-red-800 mb-1">
                        Especificar causa de secuestro / retención y número de expediente
                      </label>
                      <textarea
                        rows={2}
                        value={formData.armamento.causaSecuestro || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            armamento: {
                              ...formData.armamento,
                              causaSecuestro: e.target.value,
                            },
                          })
                        }
                        placeholder="Motivo de la retención preventiva, resolución ministerial, causa judicial o depósito de sala de armas..."
                        className="w-full px-3 py-2 rounded-lg border border-red-300 bg-red-50/50 text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Chaleco balístico */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Chaleco Balístico Provisto</span>
                    {formData.chaleco.secuestradoORetenido ? (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-300">
                        RETENIDO
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                        ASIGNADO EN PODER
                      </span>
                    )}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chaleco Serie N°</label>
                    <input
                      type="text"
                      value={formData.chaleco.serieNro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chaleco: { ...formData.chaleco, serieNro: e.target.value },
                        })
                      }
                      placeholder="Ej. RB2-9901"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Talla</label>
                    <select
                      value={formData.chaleco.talla}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chaleco: { ...formData.chaleco, talla: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="S">S (Small)</option>
                      <option value="M">M (Medium)</option>
                      <option value="L">L (Large)</option>
                      <option value="XL">XL (Extra Large)</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                </div>

                {/* Retención chaleco */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.chaleco.secuestradoORetenido}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          chaleco: {
                            ...formData.chaleco,
                            secuestradoORetenido: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-red-700">
                      Corroborar si fue secuestrado o retenido
                    </span>
                  </label>

                  {formData.chaleco.secuestradoORetenido && (
                    <div className="mt-2">
                      <label className="block font-semibold text-red-800 mb-1">
                        Causa de retención de chaleco
                      </label>
                      <input
                        type="text"
                        value={formData.chaleco.causaSecuestro || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            chaleco: {
                              ...formData.chaleco,
                              causaSecuestro: e.target.value,
                            },
                          })
                        }
                        placeholder="Ej. Vencimiento balístico o depósito transitorio"
                        className="w-full px-3 py-2 rounded-lg border border-red-300 bg-red-50/50 text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adjuntos' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-semibold text-slate-700">
                  Adjuntar Documentación Oficial (JPG, PNG, Imágenes)
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  DNI, Título secundario/universitario, Cursos policiales, Partida de matrimonio, Licencia
                </p>
                <label className="bg-blue-900 hover:bg-blue-950 text-white font-semibold px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-2 text-xs">
                  <span>Seleccionar Archivos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Lista de adjuntos */}
              {formData.documentosAdjuntos && formData.documentosAdjuntos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.documentosAdjuntos.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col justify-between"
                    >
                      <div className="h-28 overflow-hidden rounded bg-slate-200 flex items-center justify-center">
                        <img
                          src={doc.dataUrl}
                          alt={doc.nombre}
                          className="h-full w-full object-cover cursor-pointer"
                          onClick={() => setSelectedPreviewDoc(doc.dataUrl)}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="truncate font-medium text-slate-700 max-w-[120px]" title={doc.nombre}>
                          {doc.nombre}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewDoc(doc.dataUrl)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Ver vista previa completa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDoc(doc.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Modal */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            {formData.apellidoYNombre ? (
              <button
                type="button"
                onClick={() => generarPdfLegajoPersonal(formData, config)}
                className="px-3.5 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 font-semibold transition-colors flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                title="Generar Ficha Personal oficial con firma del efectivo registrado"
              >
                <Printer className="w-4 h-4 text-blue-700" />
                <span>Imprimir Ficha Personal (PDF)</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEditing ? 'Guardar Cambios' : 'Registrar Efectivo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Visor Modal de Imagen */}
      {selectedPreviewDoc && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewDoc(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={selectedPreviewDoc}
              alt="Vista previa documento"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPreviewDoc(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1.5 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
