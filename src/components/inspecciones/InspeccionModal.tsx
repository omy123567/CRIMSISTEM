import React, { useState } from 'react';
import { InspeccionOcular, ConfiguracionSistema, Personal } from '../../types/police';
import { X, Camera, Eye, Upload, Trash2, CheckCircle2, ShieldCheck, UserCheck, AlertCircle, Sliders, ShieldAlert } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { ImageEditorModal } from '../common/ImageEditorModal';

interface InspeccionModalProps {
  inspeccion?: InspeccionOcular | null;
  personalList?: Personal[];
  config: ConfiguracionSistema;
  onSave: (io: InspeccionOcular) => void;
  onClose: () => void;
}

export const InspeccionModal: React.FC<InspeccionModalProps> = ({
  inspeccion,
  personalList = [],
  config,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(inspeccion);
  const añoActual = new Date().getFullYear();

  const personalOptions = personalList.map((p) => `${p.jerarquia} ${p.apellidoYNombre}`);

  const [formData, setFormData] = useState<InspeccionOcular>(() => {
    if (inspeccion) return { ...inspeccion };
    const defaultHecho = config.hechosCriminalistica?.[0] || 'Inspección Ocular / Relevamiento en Escena';
    const nextNro = Math.max(config.inicioNroIO || 1, (config.ultimoNroIO ?? 0) + 1);
    const nroSugerido = `I.O. Nº ${String(nextNro).padStart(3, '0')}/${añoActual}`;
    return {
      id: 'io-' + Date.now(),
      nroIO: nroSugerido,
      fecha: new Date().toISOString().slice(0, 10),
      hora: '10:00',
      lugar: '',
      direccion: '',
      hecho: defaultHecho,
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
    };
  });

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [editorPhotoIdx, setEditorPhotoIdx] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFormData((prev) => {
          const updatedFotos = [...(prev.fotosAdjuntas || []), dataUrl];
          return {
            ...prev,
            fotosAdjuntas: updatedFotos,
            cantidadFotografias: updatedFotos.length,
            fotosConformeFotografo: `${updatedFotos.length} tomas fotográficas conforme fotógrafo`,
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setFormData((prev) => {
      const list = [...(prev.fotosAdjuntas || [])];
      list.splice(idx, 1);
      return {
        ...prev,
        fotosAdjuntas: list,
        cantidadFotografias: list.length,
        fotosConformeFotografo: `${list.length} tomas fotográficas conforme fotógrafo`,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const direccionFinal = formData.direccion?.trim() || formData.lugar?.trim();
    if (!formData.nroIO.trim() || !direccionFinal) {
      alert('Debe completar el N° de I.O. y la Dirección (Lugar de ocurrido)');
      return;
    }

    if (formData.involucraPersonalPolicial) {
      if (
        !formData.personalPolicial?.apellidoYNombre?.trim() ||
        !formData.personalPolicial?.plaza?.trim() ||
        !formData.personalPolicial?.jerarquia?.trim()
      ) {
        alert(
          'Al indicar que la Inspección Ocular involucra Personal Policial, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }

    onSave({
      ...formData,
      lugar: direccionFinal,
      direccion: direccionFinal,
      personalInterviniente: [
        formData.perito ? `Perito: ${formData.perito}` : '',
        formData.fotografo ? `Fotógrafo: ${formData.fotografo}` : '',
      ]
        .filter(Boolean)
        .join(' - ') || formData.personalInterviniente || 'Personal Técnico Criminalística',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-lg text-blue-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {isEditing ? `Editar ${formData.nroIO}` : 'Nueva Inspección Ocular (I.O.)'}
              </h2>
              <p className="text-xs text-slate-300">
                Registro oficial pericial: N° I.O, Fecha, Dirección, Hecho, Fotos conforme fotógrafo, Perito y Fotógrafo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* N° I.O y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° I.O (Inspección Ocular) *
              </label>
              <input
                type="text"
                required
                value={formData.nroIO}
                onChange={(e) => setFormData({ ...formData, nroIO: e.target.value })}
                placeholder="Ej. I.O. Nº 045/2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hora de Intervención</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {/* Dirección (Lugar de Ocurrido) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección (Lugar de Ocurrido) *
            </label>
            <input
              type="text"
              required
              value={formData.direccion || formData.lugar}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value, lugar: e.target.value })
              }
              placeholder="Ej. Av. 25 de Mayo Nº 1450 entre Moreno y Rivadavia"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Hecho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hecho (Tipificación / Causa) *
              </label>
              <input
                type="text"
                required
                list="lista-hechos-io"
                value={formData.hecho || ''}
                onChange={(e) => setFormData({ ...formData, hecho: e.target.value })}
                placeholder="Seleccione o escriba el hecho (ej. Robo, Homicidio, Siniestro Vial)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              />
              <datalist id="lista-hechos-io">
                {(config.hechosCriminalistica || []).map((h: string) => (
                  <option key={h} value={h} />
                ))}
                {(config.hechosAccidentologia || []).map((h: string) => (
                  <option key={h} value={h} />
                ))}
                <option value="Homicidio en Ocasión de Robo" />
                <option value="Suicidio / Muerte Dudosa" />
                <option value="Robo con Violencia en las Personas" />
                <option value="Siniestro Vial con Lesionados Graves" />
                <option value="Siniestro Vial con Víctima Fatal" />
                <option value="Hallazgo de Cadáver" />
                <option value="Incendio y Explosión de Inmueble" />
                <option value="Abuso de Arma de Fuego" />
              </datalist>
            </div>

            <div>
              <SearchableSelect
                label="Dependencia Solicitante"
                value={formData.dependenciaSolicitante}
                onChange={(val) => setFormData({ ...formData, dependenciaSolicitante: val })}
                options={config.dependenciasPoliciales}
                placeholder="Buscar o escribir dependencia..."
                allowCustom={true}
              />
            </div>
          </div>

          {/* Perito y Fotógrafo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
            <div>
              <SearchableSelect
                label="Perito Interviniente *"
                value={formData.perito || ''}
                onChange={(val) => setFormData({ ...formData, perito: val })}
                options={personalOptions}
                placeholder="Buscar o ingresar Perito..."
                allowCustom={true}
                required
              />
            </div>

            <div>
              <SearchableSelect
                label="Fotógrafo Interviniente *"
                value={formData.fotografo || ''}
                onChange={(val) => setFormData({ ...formData, fotografo: val })}
                options={personalOptions}
                placeholder="Buscar o ingresar Fotógrafo..."
                allowCustom={true}
                required
              />
            </div>
          </div>

          {/* Fotos (conforme fotógrafo) y confirmación por otro usuario */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-slate-900">
                  Fotos (Conforme Fotógrafo) y Confirmación de Usuario
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Requerido por protocolo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fotos (Conforme Fotógrafo - Detalle/Cantidad)
                </label>
                <input
                  type="text"
                  value={formData.fotosConformeFotografo || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, fotosConformeFotografo: e.target.value })
                  }
                  placeholder="Ej. 18 tomas fotográficas conforme fotógrafo de turno"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cantidad de Tomas Fotográficas
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cantidadFotografias || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, cantidadFotografias: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Confirmación por otro usuario */}
            <div className="p-3 bg-white rounded-lg border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="confirm-fotos"
                  checked={Boolean(formData.fotosConfirmadas)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fotosConfirmadas: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-600"
                />
                <label htmlFor="confirm-fotos" className="cursor-pointer font-semibold text-slate-800">
                  Fotos confirmadas y verificadas por otro usuario / supervisor
                </label>
              </div>

              <div className="flex-1 sm:max-w-xs">
                <input
                  type="text"
                  list="lista-efectivos-confirmadores"
                  value={formData.confirmadoPorUsuario || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmadoPorUsuario: e.target.value,
                      fotosConfirmadas: Boolean(e.target.value.trim()),
                    })
                  }
                  placeholder="Usuario / Efectivo que confirma"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-slate-50 font-medium"
                />
                <datalist id="lista-efectivos-confirmadores">
                  {personalList.map((p) => (
                    <option
                      key={'conf-' + p.id}
                      value={`${p.jerarquia} ${p.apellidoYNombre}`}
                    />
                  ))}
                </datalist>
              </div>
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
                <span>¿Es una Inspección Ocular con Personal Policial involucrado?</span>
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
                      list="lista-condiciones-policiales-io"
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
                    <datalist id="lista-condiciones-policiales-io">
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
                      placeholder="Ej. Comisaría Laguna Blanca / Destacamento"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen / Conclusiones opcionales */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Síntesis del Relevamiento / Observaciones Técnicas
            </label>
            <textarea
              rows={2}
              value={formData.resumen}
              onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
              placeholder="Detalle del relevamiento criminalístico efectuado en el lugar..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          {/* Adjuntar Fotografías Opcionales */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Archivos de Fotografía Digital ({formData.fotosAdjuntas?.length || 0})
              </span>
              <label className="bg-blue-900 hover:bg-blue-950 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Adjuntar Imágenes</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {formData.fotosAdjuntas && formData.fotosAdjuntas.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
                {formData.fotosAdjuntas.map((foto, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg border border-slate-300 overflow-hidden group shadow-xs"
                  >
                    <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 text-white flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(foto)}
                        className="p-1 bg-white/20 hover:bg-white/40 rounded cursor-pointer"
                        title="Ver foto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorPhotoIdx(idx)}
                        className="p-1 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                        title="Editar foto (recortar, brillo, contraste)"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Inspección Ocular</span>
            </button>
          </div>
        </form>
      </div>

      {/* Editor Modal de Fotos de Inspección Ocular */}
      {editorPhotoIdx !== null && formData.fotosAdjuntas && formData.fotosAdjuntas[editorPhotoIdx] && (
        <ImageEditorModal
          isOpen={editorPhotoIdx !== null}
          imageSrc={formData.fotosAdjuntas[editorPhotoIdx]}
          title={`Editor de Foto Nº ${editorPhotoIdx + 1} - ${formData.nroIO}`}
          onSave={(editedUrl) => {
            setFormData((prev) => {
              const updated = [...(prev.fotosAdjuntas || [])];
              updated[editorPhotoIdx] = editedUrl;
              return { ...prev, fotosAdjuntas: updated };
            });
            setEditorPhotoIdx(null);
          }}
          onClose={() => setEditorPhotoIdx(null)}
        />
      )}

      {/* Modal Zoom Foto */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewPhoto}
              alt="Foto I.O."
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
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
