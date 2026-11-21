import React, { useState } from 'react';
import { X, Printer, FileText, Check, Eye, Download, CheckSquare, Square, ZoomIn } from 'lucide-react';
import { PdfCanvasPreview } from './PdfCanvasPreview';

export type OrientacionPapel = 'portrait' | 'landscape';
export type TamanoPapel = 'a4' | 'oficio' | 'legal' | 'letter';

export interface SeccionesImpresion {
  encabezado: boolean;
  funcionesPersonal: boolean;
  forenses: boolean;
  moviles: boolean;
  lc: boolean;
  siniestros: boolean;
  cibercrimen: boolean;
  novedadesRelevo: boolean;
  firmaJefe: boolean;
}

export interface OpcionesImpresion {
  orientacion: OrientacionPapel;
  tamano: TamanoPapel;
  incluirFirmaJefe: boolean;
  secciones: SeccionesImpresion;
  esVistaPrevia?: boolean;
}

interface ModalOpcionesImpresionProps {
  isOpen: boolean;
  titulo?: string;
  orientacionDefault?: OrientacionPapel;
  tamanoDefault?: TamanoPapel;
  previewUrl?: string | null;
  onGenerar: (opciones: OpcionesImpresion) => void;
  onClose: () => void;
}

export const ModalOpcionesImpresion: React.FC<ModalOpcionesImpresionProps> = ({
  isOpen,
  titulo = 'Configuración de Impresión / Exportación PDF',
  orientacionDefault = 'portrait',
  tamanoDefault = 'a4',
  previewUrl,
  onGenerar,
  onClose,
}) => {
  const [orientacion, setOrientacion] = useState<OrientacionPapel>(orientacionDefault);
  const [tamano, setTamano] = useState<TamanoPapel>(tamanoDefault);
  const [incluirFirmaJefe, setIncluirFirmaJefe] = useState<boolean>(true);

  // Selección de qué datos ver en el reporte
  const [secciones, setSecciones] = useState<SeccionesImpresion>({
    encabezado: true,
    funcionesPersonal: true,
    forenses: true,
    moviles: true,
    lc: true,
    siniestros: true,
    cibercrimen: true,
    novedadesRelevo: true,
    firmaJefe: true,
  });

  const [activePreview, setActivePreview] = useState<string | null>(previewUrl || null);

  React.useEffect(() => {
    if (previewUrl) {
      setActivePreview(previewUrl);
    }
  }, [previewUrl]);

  if (!isOpen) return null;

  const toggleSeccion = (key: keyof SeccionesImpresion) => {
    setSecciones((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const seleccionarTodas = (valor: boolean) => {
    setSecciones({
      encabezado: valor,
      funcionesPersonal: valor,
      forenses: valor,
      moviles: valor,
      lc: valor,
      siniestros: valor,
      cibercrimen: valor,
      novedadesRelevo: valor,
      firmaJefe: valor,
    });
  };

  const handleDescargar = () => {
    onGenerar({
      orientacion,
      tamano,
      incluirFirmaJefe: secciones.firmaJefe,
      secciones,
      esVistaPrevia: false,
    });
    onClose();
  };

  const handleVistaPrevia = () => {
    onGenerar({
      orientacion,
      tamano,
      incluirFirmaJefe: secciones.firmaJefe,
      secciones,
      esVistaPrevia: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in duration-200 flex flex-col ${
        activePreview ? 'max-w-5xl w-full max-h-[95vh]' : 'max-w-xl w-full'
      }`}>
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">{titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activePreview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-700" />
                  <span>Vista Preliminar en Vivo del Documento</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePreview(null)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-bold px-2.5 py-1 bg-white border border-slate-300 rounded cursor-pointer"
                  >
                    Ajustar Opciones
                  </button>
                  <button
                    type="button"
                    onClick={handleDescargar}
                    className="text-[11px] bg-blue-900 hover:bg-blue-950 text-white font-bold px-3 py-1 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>

              <div className="h-[65vh] w-full rounded-lg border border-slate-300 overflow-hidden bg-slate-200 shadow-inner">
                <PdfCanvasPreview src={activePreview} className="w-full h-full" />
              </div>
            </div>
          ) : (
            <>
              {/* 1. Qué datos incluir en el reporte */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 block">
                    1. Selección de Datos a Incluir en el Documento:
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => seleccionarTodas(true)}
                      className="text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => seleccionarTodas(false)}
                      className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-800">
                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.funcionesPersonal}
                      onChange={() => toggleSeccion('funcionesPersonal')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Personal y Funciones de Guardia</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.forenses}
                      onChange={() => toggleSeccion('forenses')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Médico(s) Forense(s) y Total Examinados</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.moviles}
                      onChange={() => toggleSeccion('moviles')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Móviles Policiales de Guardia</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.lc}
                      onChange={() => toggleSeccion('lc')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Labor Criminalística (LC - No Tránsito)</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.siniestros}
                      onChange={() => toggleSeccion('siniestros')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Siniestros Viales / Accidentología</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-indigo-50/60 rounded border border-indigo-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.cibercrimen}
                      onChange={() => toggleSeccion('cibercrimen')}
                      className="w-4 h-4 text-indigo-900 rounded"
                    />
                    <span className="font-bold text-indigo-950">División Cibercrimen (con Resumen)</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.novedadesRelevo}
                      onChange={() => toggleSeccion('novedadesRelevo')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Acta / Libro de Novedades del Servicio</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={secciones.firmaJefe}
                      onChange={() => toggleSeccion('firmaJefe')}
                      className="w-4 h-4 text-blue-900 rounded"
                    />
                    <span className="font-semibold">Bloque de Firma de Jefatura y Oficial</span>
                  </label>
                </div>
              </div>

              {/* 2. Orientación de Página */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  2. Orientación de Página
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-lg border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      orientacion === 'portrait'
                        ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orientacion"
                      value="portrait"
                      checked={orientacion === 'portrait'}
                      onChange={() => setOrientacion('portrait')}
                      className="hidden"
                    />
                    <div className="w-4 h-6 border-2 border-current rounded-xs" />
                    <span>Vertical (Portrait)</span>
                  </label>

                  <label
                    className={`p-3 rounded-lg border-2 cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      orientacion === 'landscape'
                        ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orientacion"
                      value="landscape"
                      checked={orientacion === 'landscape'}
                      onChange={() => setOrientacion('landscape')}
                      className="hidden"
                    />
                    <div className="w-6 h-4 border-2 border-current rounded-xs" />
                    <span>Horizontal (Landscape)</span>
                  </label>
                </div>
              </div>

              {/* 3. Tamaño de Papel */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  3. Tamaño de Papel (Texto adaptado automáticamente)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'a4', label: 'A4 (210 x 297 mm)', desc: '210 × 297 mm' },
                    { id: 'oficio', label: 'Oficio (216 x 330 mm)', desc: '216 × 330 mm' },
                    { id: 'legal', label: 'Legal (216 x 356 mm)', desc: '216 × 356 mm' },
                    { id: 'letter', label: 'Carta (216 x 279 mm)', desc: '216 × 279 mm' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-2.5 rounded-lg border-2 cursor-pointer text-center flex flex-col items-center justify-center transition-all ${
                        tamano === opt.id
                          ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tamano"
                        value={opt.id}
                        checked={tamano === opt.id}
                        onChange={() => setTamano(opt.id as TamanoPapel)}
                        className="hidden"
                      />
                      <span className="text-[11px] font-bold block">{opt.id.toUpperCase()}</span>
                      <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">
                        {opt.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleVistaPrevia}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-blue-300" />
                    <span>Vista Preliminar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDescargar}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
