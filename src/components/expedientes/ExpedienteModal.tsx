import React, { useState, useEffect } from 'react';
import {
  ExpedienteJudicial,
  ConfiguracionSistema,
  TipoRequerimiento,
  Personal,
  InspeccionOcular,
} from '../../types/police';
import {
  X,
  FileText,
  AlertTriangle,
  Upload,
  UserCheck,
  Calendar,
  Eye,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Trash2,
  Link2,
  Search,
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { db } from '../../db/database';

interface ExpedienteModalProps {
  expediente?: ExpedienteJudicial | null;
  config: ConfiguracionSistema;
  personalList?: Personal[];
  onSave: (exp: ExpedienteJudicial) => void;
  onClose: () => void;
}

export const ExpedienteModal: React.FC<ExpedienteModalProps> = ({
  expediente,
  config,
  personalList = [],
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(expediente);
  const anioActualDefault = new Date().getFullYear();

  const [formData, setFormData] = useState<ExpedienteJudicial>(() => {
    if (expediente) {
      return {
        ...expediente,
        ppi: expediente.ppi || { tienePPI: false, jerarquia: 'Oficial Ayudante', apellidoYNombre: '', dni: '' },
      };
    }
    return {
      id: 'exp-' + Date.now(),
      nroOficioLetras: '',
      nroOficio: '',
      letraOficio: '',
      anioOficio: anioActualDefault,
      nroExpediente: '',
      anioExpediente: anioActualDefault,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      caratulaOrigen: '',
      juzgadoFiscalia: config.juzgadosFiscalias[0] || 'UFI N° 1',
      dependenciaSolicitante: config.dependenciasPoliciales[0] || 'Comisaría Seccional 1ra',
      tipoOficio: config.tiposOficio[0] || 'Instrucción Penal Preparatoria (IPP)',
      tipoRequerimiento: 'Resguardo de Evidencia',
      tareaRealizada: '',
      resumen: '',
      observaciones: '',
      personalACargo: '',
      personalInstruccion: '',
      supervisor: '',
      vincularInspeccionOcular: false,
      inspeccionOcularVinculadaId: '',
      inspeccionOcularDatos: {
        nroIO: '',
        fecha: new Date().toISOString().slice(0, 10),
        hora: '08:00',
        lugar: '',
        tipo: 'Criminalística',
        dependenciaSolicitante: config.dependenciasPoliciales[0] || '',
        perito: '',
      },
      estadoEntrega: 'No entregado',
      fechaElevacion: '',
      personalElevo: '',
      ppi: {
        tienePPI: false,
        jerarquia: 'Oficial Ayudante',
        apellidoYNombre: '',
        dni: '',
      },
      adjuntosOficio: [],
      adjuntosRecibo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [listaIOs, setListaIOs] = useState<InspeccionOcular[]>([]);
  const [showPersonalSelector, setShowPersonalSelector] = useState(false);
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<string | null>(null);
  const [editorTarget, setEditorTarget] = useState<{
    src: string;
    field: 'adjuntosOficio' | 'adjuntosRecibo';
    index: number;
  } | null>(null);

  // Cargar inspecciones oculares disponibles para vinculación
  useEffect(() => {
    db.inspeccionesOculares.toArray().then((ios: InspeccionOcular[]) => {
      setListaIOs(ios || []);
    }).catch(console.error);
  }, []);

  const updatePpi = (patch: Partial<NonNullable<ExpedienteJudicial['ppi']>>) => {
    setFormData((prev) => ({
      ...prev,
      ppi: {
        tienePPI: false,
        ...(prev.ppi || {}),
        ...patch,
      },
    }));
  };

  const personalOptions = personalList.map((p) => `${p.jerarquia} ${p.apellidoYNombre}`);

  // Manejo de imágenes de oficios y recibos
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: 'adjuntosOficio' | 'adjuntosRecibo'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          [campo]: [...(prev[campo] || []), dataUrl],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveEditedImage = (editedDataUrl: string) => {
    if (!editorTarget) return;
    const { field, index } = editorTarget;
    setFormData((prev) => {
      const updatedList = [...(prev[field] || [])];
      updatedList[index] = editedDataUrl;
      return {
        ...prev,
        [field]: updatedList,
      };
    });
    setEditorTarget(null);
  };

  const handleVincularIOSelect = (ioId: string) => {
    const selectedIO = listaIOs.find((io) => io.id === ioId);
    if (selectedIO) {
      setFormData((prev) => ({
        ...prev,
        inspeccionOcularVinculadaId: selectedIO.id,
        inspeccionOcularDatos: {
          nroIO: selectedIO.nroIO,
          fecha: selectedIO.fecha,
          hora: selectedIO.hora,
          lugar: selectedIO.lugar || selectedIO.direccion || '',
          tipo: selectedIO.tipo,
          dependenciaSolicitante: selectedIO.dependenciaSolicitante,
          perito: selectedIO.perito || selectedIO.personalInterviniente,
        },
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nroExpediente.trim()) {
      alert('Debe ingresar el N° de Expediente');
      return;
    }

    const tienePPI = Boolean(formData.ppi?.tienePPI);
    const ppiData = formData.ppi;

    if (tienePPI && ppiData) {
      if (
        !ppiData.apellidoYNombre?.trim() ||
        !ppiData.plaza?.trim() ||
        !ppiData.jerarquia?.trim()
      ) {
        alert(
          'Al indicar que la causa registra Personal Policial Involucrado, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }

    // Compatibilidad nroOficioLetras
    const nroOficioFormateado = formData.nroOficio?.trim()
      ? `${formData.nroOficio}${formData.letraOficio ? ' ' + formData.letraOficio.toUpperCase() : ''}/${formData.anioOficio || anioActualDefault}`
      : formData.nroOficioLetras || '';

    onSave({
      ...formData,
      nroOficioLetras: nroOficioFormateado,
      personalInstruccion: formData.personalACargo || formData.personalInstruccion,
      involucraPersonalPolicial: tienePPI,
      personalPolicial: tienePPI && ppiData
        ? {
            jerarquia: ppiData.jerarquia || config.jerarquias[0],
            plaza: ppiData.plaza || '',
            apellidoYNombre: ppiData.apellidoYNombre || '',
            dni: ppiData.dni,
            rol: ppiData.rol || 'Imputado',
            dependenciaRevista: ppiData.dependencia,
          }
        : undefined,
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Expediente: ${formData.nroExpediente || formData.nroOficioLetras}` : 'Nuevo Expediente Judicial / Tarea Operativa'}
              </h2>
              <p className="text-xs text-slate-300">
                Registro oficial con vinculación de oficio, personal a cargo y requerimiento
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Fila 1: N° Expediente / Año, Fecha de registro, N° Oficio, Letra (solamente mayúscula), Año */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
            <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>Identificación Oficial de la Causa & Oficio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* N° Expediente */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  N° Expediente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nroExpediente}
                  onChange={(e) => setFormData({ ...formData, nroExpediente: e.target.value })}
                  placeholder="Ej. IPP-04-00-019283"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900"
                />
              </div>

              {/* / Año (Expediente) */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  / Año *
                </label>
                <input
                  type="number"
                  required
                  min="1990"
                  max="2050"
                  value={formData.anioExpediente || anioActualDefault}
                  onChange={(e) => {
                    const anio = parseInt(e.target.value) || anioActualDefault;
                    setFormData({ ...formData, anioExpediente: anio });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono font-medium text-slate-800"
                />
              </div>

              {/* Fecha de Registro */}
              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha de registro *</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.fechaRegistro}
                  onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* N° de Oficio, Letra (solamente mayúscula), Año */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-blue-200/60">
              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">
                  N° de Oficio
                </label>
                <input
                  type="text"
                  value={formData.nroOficio || formData.nroOficioLetras || ''}
                  onChange={(e) => setFormData({ ...formData, nroOficio: e.target.value })}
                  placeholder="Ej. OF-458"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1" title="Solamente mayúsculas">
                  Letra (solamente mayúscula)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.letraOficio || ''}
                  onChange={(e) => setFormData({ ...formData, letraOficio: e.target.value.toUpperCase() })}
                  placeholder="Ej. UFI, J, A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-bold text-blue-900 tracking-wider"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Año (Oficio)
                </label>
                <input
                  type="number"
                  min="1990"
                  max="2050"
                  value={formData.anioOficio || anioActualDefault}
                  onChange={(e) => {
                    const anio = parseInt(e.target.value) || anioActualDefault;
                    setFormData({ ...formData, anioOficio: anio });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Botón Personal a cargo (reemplaza 'Instrucción y Supervisión del Expediente') */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                  Asignación Operativa
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {formData.personalACargo || formData.personalInstruccion ? (
                    <span className="text-blue-900">{formData.personalACargo || formData.personalInstruccion}</span>
                  ) : (
                    <span className="text-slate-400 italic font-normal">Sin personal designado a cargo</span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPersonalSelector(!showPersonalSelector)}
              className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Personal a cargo</span>
            </button>
          </div>

          {/* Selector desplegable de Personal a cargo */}
          {showPersonalSelector && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950 text-xs">
                  Seleccionar o ingresar Personal a cargo de la tarea:
                </label>
                <button
                  type="button"
                  onClick={() => setShowPersonalSelector(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs"
                >
                  Cerrar
                </button>
              </div>
              <SearchableSelect
                label="Efectivo Policial / Perito Asignado"
                value={formData.personalACargo || formData.personalInstruccion || ''}
                onChange={(val) => {
                  setFormData({ ...formData, personalACargo: val, personalInstruccion: val });
                }}
                options={personalOptions}
                placeholder="Buscar o escribir nombre y jerarquía del personal a cargo..."
                allowCustom={true}
              />
            </div>
          )}

          {/* Expediente Origen / Carátula Judicial */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expediente Origen / Carátula Judicial *
            </label>
            <input
              type="text"
              required
              value={formData.caratulaOrigen}
              onChange={(e) => setFormData({ ...formData, caratulaOrigen: e.target.value })}
              placeholder="Ej. C/ NN S/ ROBO AGRAVADO POR EL USO DE ARMA DE FUEGO"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold"
            />
          </div>

          {/* Juzgado, Dependencia y Tipos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <SearchableSelect
                label="Juzgado / Fiscalía"
                value={formData.juzgadoFiscalia}
                onChange={(val) => setFormData({ ...formData, juzgadoFiscalia: val })}
                options={config.juzgadosFiscalias}
                placeholder="Buscar o escribir juzgado..."
                allowCustom={true}
              />
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

            <div>
              <SearchableSelect
                label="Tipo de Oficio"
                value={formData.tipoOficio}
                onChange={(val) => setFormData({ ...formData, tipoOficio: val })}
                options={config.tiposOficio}
                placeholder="Buscar o escribir tipo de oficio..."
                allowCustom={true}
              />
            </div>

            <div>
              <SearchableSelect
                label="Tipo Requerimiento *"
                value={formData.tipoRequerimiento}
                onChange={(val) => setFormData({ ...formData, tipoRequerimiento: val })}
                options={config.tiposRequerimiento}
                placeholder="Buscar o seleccionar requerimiento..."
                allowCustom={true}
                required
              />
            </div>
          </div>

          {/* Cuadro ampliado de Tarea Realizada (sin resumen/síntesis) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs flex items-center justify-between">
              <span>Tarea Realizada (Detalle Operativo y Pericial)</span>
              <span className="text-[11px] text-slate-400 font-normal">Cuadro técnico ampliado</span>
            </label>
            <textarea
              rows={6}
              value={formData.tareaRealizada}
              onChange={(e) => setFormData({ ...formData, tareaRealizada: e.target.value })}
              placeholder="Describa ampliamente las pericias, relevamientos, actuaciones y diligencias periciales u operativas realizadas en el marco de la presente causa judicial..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 leading-relaxed font-sans"
            />
          </div>

          {/* Opción de vincular a una Inspección Ocular mediante check */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
              <input
                type="checkbox"
                checked={Boolean(formData.vincularInspeccionOcular)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vincularInspeccionOcular: e.target.checked,
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-indigo-900 flex items-center gap-1.5 text-xs">
                <Link2 className="w-4 h-4 text-indigo-700" />
                <span>¿Vincular a una Inspección Ocular (I.O.)?</span>
              </span>
            </label>

            {formData.vincularInspeccionOcular && (
              <div className="space-y-3 pt-2 border-t border-indigo-200">
                {listaIOs.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-950 mb-1">
                      Seleccionar desde Inspecciones Oculares registradas (Autocompletar):
                    </label>
                    <select
                      value={formData.inspeccionOcularVinculadaId || ''}
                      onChange={(e) => handleVincularIOSelect(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white"
                    >
                      <option value="">-- Seleccionar Inspección Ocular existente --</option>
                      {listaIOs.map((io) => (
                        <option key={io.id} value={io.id}>
                          {io.nroIO} - {io.tipo} ({io.fecha}) | {io.dependenciaSolicitante}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">N° I.O. *</label>
                    <input
                      type="text"
                      required={formData.vincularInspeccionOcular}
                      value={formData.inspeccionOcularDatos?.nroIO || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspeccionOcularDatos: {
                            ...(formData.inspeccionOcularDatos || { fecha: '', lugar: '', tipo: '', dependenciaSolicitante: '' }),
                            nroIO: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. I.O. N° 045/2026"
                      className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Fecha y Hora</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        value={formData.inspeccionOcularDatos?.fecha || ''}
                        onChange={(e) => {
                          const base = formData.inspeccionOcularDatos || {
                            nroIO: '',
                            fecha: '',
                            lugar: '',
                            tipo: '',
                            dependenciaSolicitante: '',
                          };
                          setFormData({
                            ...formData,
                            inspeccionOcularDatos: {
                              ...base,
                              fecha: e.target.value,
                            },
                          });
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-indigo-300 bg-white text-[11px]"
                      />
                      <input
                        type="time"
                        value={formData.inspeccionOcularDatos?.hora || '08:00'}
                        onChange={(e) => {
                          const base = formData.inspeccionOcularDatos || {
                            nroIO: '',
                            fecha: '',
                            lugar: '',
                            tipo: '',
                            dependenciaSolicitante: '',
                          };
                          setFormData({
                            ...formData,
                            inspeccionOcularDatos: {
                              ...base,
                              hora: e.target.value,
                            },
                          });
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-indigo-300 bg-white text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Tipo de Inspección</label>
                    <input
                      type="text"
                      value={formData.inspeccionOcularDatos?.tipo || 'Criminalística'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspeccionOcularDatos: {
                            ...(formData.inspeccionOcularDatos || { nroIO: '', fecha: '', lugar: '', dependenciaSolicitante: '' }),
                            tipo: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. Criminalística / Accidentológica"
                      className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Lugar de Ocurrido</label>
                    <input
                      type="text"
                      value={formData.inspeccionOcularDatos?.lugar || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspeccionOcularDatos: {
                            ...(formData.inspeccionOcularDatos || { nroIO: '', fecha: '', tipo: '', dependenciaSolicitante: '' }),
                            lugar: e.target.value,
                          },
                        })
                      }
                      placeholder="Dirección, cruce de calles, ruta o coordenadas"
                      className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-indigo-900 mb-1">Perito / Oficial Actuante</label>
                    <input
                      type="text"
                      value={formData.inspeccionOcularDatos?.perito || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inspeccionOcularDatos: {
                            ...(formData.inspeccionOcularDatos || { nroIO: '', fecha: '', lugar: '', tipo: '', dependenciaSolicitante: '' }),
                            perito: e.target.value,
                          },
                        })
                      }
                      placeholder="Nombre y jerarquía del perito"
                      className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PPI: Personal Policial Involucrado */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={formData.ppi?.tienePPI || false}
                onChange={(e) => updatePpi({ tienePPI: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-purple-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span>¿Registra Personal Policial Involucrado (PPI)?</span>
              </span>
            </label>

            {formData.ppi?.tienePPI && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                {personalList.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-950 mb-1">
                      Seleccionar desde Nómina Policial (Opcional para autocompletar):
                    </label>
                    <select
                      onChange={(e) => {
                        const p = personalList.find((item) => item.id === e.target.value);
                        if (p) {
                          updatePpi({
                            jerarquia: p.jerarquia,
                            plaza: p.plaza || '',
                            apellidoYNombre: p.apellidoYNombre,
                            dni: p.dni,
                            dependencia: p.seccionGrupo || '',
                          });
                        }
                      }}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white"
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">Jerarquía *</label>
                    <select
                      value={formData.ppi?.jerarquia || 'Oficial Ayudante'}
                      onChange={(e) => updatePpi({ jerarquia: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white"
                    >
                      {config.jerarquias.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">Plaza N° *</label>
                    <input
                      type="text"
                      required={formData.ppi?.tienePPI || false}
                      value={formData.ppi?.plaza || ''}
                      onChange={(e) => updatePpi({ plaza: e.target.value })}
                      placeholder="Ej. 1420"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">Apellido y Nombre *</label>
                    <input
                      type="text"
                      required={formData.ppi?.tienePPI || false}
                      value={formData.ppi?.apellidoYNombre || ''}
                      onChange={(e) => updatePpi({ apellidoYNombre: e.target.value })}
                      placeholder="Efectivo involucrado"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">DNI del Efectivo</label>
                    <input
                      type="text"
                      value={formData.ppi?.dni || ''}
                      onChange={(e) => updatePpi({ dni: e.target.value })}
                      placeholder="DNI"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">
                      Rol / Condición en la Causa *
                    </label>
                    <input
                      type="text"
                      list="lista-condiciones-policiales-exp"
                      value={formData.ppi?.rol || ''}
                      onChange={(e) => updatePpi({ rol: e.target.value })}
                      placeholder="Seleccione o escriba condición..."
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white font-semibold text-slate-800"
                    />
                    <datalist id="lista-condiciones-policiales-exp">
                      <option value="Imputado" />
                      <option value="Damnificado / Víctima" />
                      <option value="Conductor" />
                      <option value="Acompañante" />
                      <option value="Testigo" />
                      <option value="Demorado / Aprehendido" />
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
                    <label className="block font-semibold text-purple-900 mb-1">Dependencia de Revista</label>
                    <input
                      type="text"
                      value={formData.ppi?.dependencia || ''}
                      onChange={(e) => updatePpi({ dependencia: e.target.value })}
                      placeholder="Unidad/Comisaría/Fuerza donde revista"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estado de Elevación / Entrega */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h3 className="font-bold text-slate-800">Estado de Elevación y Entrega</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado de Entrega</label>
                <select
                  value={formData.estadoEntrega}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estadoEntrega: e.target.value as any,
                      fechaElevacion: e.target.value === 'Entregado' && !formData.fechaElevacion ? new Date().toISOString().slice(0, 10) : formData.fechaElevacion,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="No entregado">No entregado (En trámite)</option>
                  <option value="Entregado">Entregado / Elevado</option>
                </select>
              </div>

              {formData.estadoEntrega === 'Entregado' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fecha de Elevación</label>
                    <input
                      type="date"
                      value={formData.fechaElevacion || ''}
                      onChange={(e) => setFormData({ ...formData, fechaElevacion: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <SearchableSelect
                      label="Personal que Elevó"
                      value={formData.personalElevo || ''}
                      onChange={(val) => setFormData({ ...formData, personalElevo: val })}
                      options={personalOptions}
                      placeholder="Buscar o escribir personal..."
                      allowCustom={true}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Adjuntos Digitales: Oficio y Recibo con Visor Modal y Editor de Documentos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Adjuntos Oficio */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Imágenes de Oficio</span>
                  <span className="text-[10px] text-slate-500">Documentación judicial remitida</span>
                </div>
                <label className="text-[11px] bg-blue-900 text-white px-2.5 py-1 rounded-lg cursor-pointer hover:bg-blue-950 inline-flex items-center gap-1 font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'adjuntosOficio')}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {formData.adjuntosOficio?.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg border border-slate-300 overflow-hidden group shadow-xs bg-white">
                    <img src={img} alt="Oficio" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewImg(img)}
                        className="p-1 bg-white/20 hover:bg-white/40 text-white rounded cursor-pointer"
                        title="Ver en grande"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ src: img, field: 'adjuntosOficio', index: i })}
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                        title="Editar documento (recortar, brillo, contraste)"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.adjuntosOficio || [])];
                          updated.splice(i, 1);
                          setFormData({ ...formData, adjuntosOficio: updated });
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.adjuntosOficio || formData.adjuntosOficio.length === 0) && (
                  <div className="text-[11px] text-slate-400 italic py-2">
                    Sin imágenes de oficio cargadas
                  </div>
                )}
              </div>
            </div>

            {/* Adjuntos Recibo */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Imágenes de Recibo / Elevación</span>
                  <span className="text-[10px] text-slate-500">Constancia firmada o sello de entrega</span>
                </div>
                <label className="text-[11px] bg-blue-900 text-white px-2.5 py-1 rounded-lg cursor-pointer hover:bg-blue-950 inline-flex items-center gap-1 font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'adjuntosRecibo')}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {formData.adjuntosRecibo?.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg border border-slate-300 overflow-hidden group shadow-xs bg-white">
                    <img src={img} alt="Recibo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewImg(img)}
                        className="p-1 bg-white/20 hover:bg-white/40 text-white rounded cursor-pointer"
                        title="Ver en grande"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ src: img, field: 'adjuntosRecibo', index: i })}
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                        title="Editar documento (recortar, brillo, contraste)"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.adjuntosRecibo || [])];
                          updated.splice(i, 1);
                          setFormData({ ...formData, adjuntosRecibo: updated });
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.adjuntosRecibo || formData.adjuntosRecibo.length === 0) && (
                  <div className="text-[11px] text-slate-400 italic py-2">
                    Sin imágenes de recibo cargadas
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Modal */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Expediente'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Editor Modal de Documentos Adjuntos */}
      {editorTarget && (
        <ImageEditorModal
          isOpen={Boolean(editorTarget)}
          imageSrc={editorTarget.src}
          title={editorTarget.field === 'adjuntosOficio' ? 'Editor de Documento: Oficio Judicial' : 'Editor de Documento: Recibo / Elevación'}
          onSave={handleSaveEditedImage}
          onClose={() => setEditorTarget(null)}
        />
      )}

      {/* Visor modal de imagen con zoom */}
      {selectedPreviewImg && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPreviewImg}
              alt="Adjunto digital"
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPreviewImg(null)}
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
