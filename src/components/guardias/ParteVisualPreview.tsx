import React from 'react';
import {
  ParteNovedadesGuardia,
  IntervencionParte,
  ConfiguracionSistema,
} from '../../types/police';
import { Download, Printer, Plus, Edit2, Trash2, X, Eye } from 'lucide-react';
import { generarPdfParteGuardia } from '../../services/pdfService';
import { ConfirmModal } from '../common/ConfirmModal';

interface ParteVisualPreviewProps {
  parte: ParteNovedadesGuardia;
  config: ConfiguracionSistema;
  onEditParte?: () => void;
  onAddIntervencion?: () => void;
  onEditIntervencion?: (interv: IntervencionParte) => void;
  onDeleteIntervencion?: (id: string) => void;
  onClose?: () => void;
}

export const ParteVisualPreview: React.FC<ParteVisualPreviewProps> = ({
  parte,
  config,
  onEditParte,
  onAddIntervencion,
  onEditIntervencion,
  onDeleteIntervencion,
  onClose,
}) => {
  const [deleteIntervConfirm, setDeleteIntervConfirm] = React.useState<{
    isOpen: boolean;
    interv: IntervencionParte | null;
  }>({ isOpen: false, interv: null });
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handlePreviewPdf = () => {
    const url = generarPdfParteGuardia(parte, config, true);
    setPdfPreviewUrl(url);
  };

  const handleExportPdf = () => {
    generarPdfParteGuardia(parte, config);
  };

  return (
    <div className="space-y-4">
      {/* Botonera de acciones oficiales */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white p-3 rounded-xl shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-blue-200">
            Vista del Parte Oficial de Guardia (Modelo Policía Científica)
          </span>
          <span className="text-[11px] bg-blue-800 text-blue-100 px-2 py-0.5 rounded font-mono">
            {parte.grupoGuardia}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onAddIntervencion && (
            <button
              onClick={onAddIntervencion}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Intervención Correlativa</span>
            </button>
          )}

          {onEditParte && (
            <button
              onClick={onEditParte}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Guardia</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewPdf}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Abrir Vista Preliminar interactiva del PDF"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Preliminar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Descargar documento PDF oficial firmado"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar PDF</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm ml-1"
              title="Cerrar Vista Preliminar"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          )}
        </div>
      </div>

      {/* MAQUETA VISUAL EXACTA AL MODELO DE LAS IMÁGENES PROVISTAS */}
      <div className="bg-white p-4 sm:p-8 rounded-xl border border-slate-300 shadow-md font-sans text-slate-900 text-[11px] leading-tight space-y-6 print:border-none print:shadow-none print:p-0">
        {/* TABLA SUPERIOR 1: CUADRO DE NOVEDADES DEL SERVICIO */}
        <div className="border-2 border-slate-900 overflow-hidden">
          {/* Fila Título Azul */}
          <div className="bg-[#11264d] text-white text-center font-bold text-xs py-2 px-3 tracking-wider uppercase border-b-2 border-slate-900">
            NOVEDADES SERVICIO DE GUARDIA DE {parte.horaInicio} HS. DEL {parte.fechaInicio} A {parte.horaFin} HS. DEL {parte.fechaFin}
          </div>

          {/* Tabla de funciones asignadas */}
          <table className="w-full border-collapse">
            <tbody>
              {parte.funcionesPersonal.map((f, i) => (
                <tr key={f.id || i} className="border-b border-slate-900">
                  <td className="w-1/2 p-1.5 px-3 font-bold border-r border-slate-900 underline decoration-slate-400">
                    {f.funcion}
                  </td>
                  <td className="w-1/2 p-1.5 px-3 font-semibold text-slate-800">
                    {f.personalNombre || '-----------------------------'}
                  </td>
                </tr>
              ))}

              {/* FORENSE(S) DE TURNO Y RELEVOS POLICIALES */}
              <tr className="border-b border-slate-900 bg-[#d9e6f3]">
                <td colSpan={2} className="text-center font-bold text-xs py-1.5 uppercase tracking-wide text-[#11264d]">
                  MÉDICO(S) FORENSE(S) DE TURNO & RELEVOS POLICIALES
                </td>
              </tr>
              {parte.forensesTurno && parte.forensesTurno.length > 0 ? (
                parte.forensesTurno.map((f, fIdx) => (
                  <tr key={f.id || fIdx} className="border-b border-slate-900">
                    <td className="p-1.5 px-3 font-semibold border-r border-slate-900">
                      <span className="font-bold text-slate-900">{f.medicoNombre}</span>
                      {f.turno && (
                        <span className="ml-2 text-[11px] text-slate-600 font-mono">
                          ({f.turno}: {f.horaIngreso} a {f.horaEgreso || '--:--'} hs.)
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 px-3 text-center font-bold text-slate-900">
                      (- {f.totalExaminados || 0} -) examinados{f.examinadosHastaHs ? ` hasta hs. ${f.examinadosHastaHs}` : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-slate-900">
                  <td className="p-1.5 px-3 font-semibold border-r border-slate-900">
                    {parte.forense?.medicoNombre || 'Médico Policial de Turno'}
                  </td>
                  <td className="p-1.5 px-3 text-center font-bold">
                    Total (- {parte.forense?.totalExaminados || 0} -) examinados hasta hs. {parte.forense?.examinadosHastaHs || '07:00'}
                  </td>
                </tr>
              )}

              {/* TOTAL DE INTERVENCIONES */}
              <tr className="border-b-2 border-slate-900 bg-slate-100">
                <td colSpan={2} className="text-center font-extrabold text-xs py-2 text-[#11264d]">
                  TOTAL DE INTERVENCIONES [ - {String(parte.intervenciones.length).padStart(2, '0')} - ]
                </td>
              </tr>

              {/* MÓVILES AFECTADOS */}
              <tr className="border-b border-slate-900 bg-[#d9e6f3]">
                <td colSpan={2} className="text-center font-bold text-xs py-1.5 uppercase tracking-wide text-[#11264d]">
                  MÓVILES AFECTADOS
                </td>
              </tr>
              {parte.movilesAfectados.length > 0 ? (
                parte.movilesAfectados.map((m, idx) => (
                  <tr key={m.id || idx} className="border-b border-slate-900 last:border-b-0">
                    <td className="p-1.5 px-3 border-r border-slate-900 font-semibold">{m.descripcion}</td>
                    <td className={`p-1.5 px-3 text-center font-bold ${m.estado === 'En servicio' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {m.estado}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-2 text-center text-slate-500 italic">
                    Sin móviles asignados registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* LISTADO DE INTERVENCIONES CORRELATIVAS (CRIMINALÍSTICA & ACCIDENTOLÓGICA) */}
        <div className="space-y-6">
          {parte.intervenciones.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl">
              <span className="text-slate-500 font-semibold">
                No hay intervenciones correlativas registradas en este turno de guardia.
              </span>
              <div className="mt-2">
                <button
                  onClick={onAddIntervencion}
                  className="bg-blue-900 text-white font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
                >
                  + Agregar Primera Intervención Correlativa
                </button>
              </div>
            </div>
          ) : (
            parte.intervenciones.map((interv, idx) => {
              const itemNum = String(idx + 1).padStart(2, '0');
              const headerTitle = interv.tipoIntervencion === 'Accidentológica'
                ? `INTERVENCIÓN ACCIDENTOLÓGICA Nº    ${interv.nroCorrelativo}    /${new Date(parte.fechaInicio).getFullYear()}-${config.siglasDependencia}.`
                : `INTERVENCIÓN CRIMINALÍSTICA Nº    ${interv.nroCorrelativo}    /${new Date(parte.fechaInicio).getFullYear()}-${config.siglasDependencia}.`;

              return (
                <div key={interv.id} className="border-2 border-slate-900 relative group overflow-hidden">
                  {/* Botones de acción flotantes para edición */}
                  {(onEditIntervencion || onDeleteIntervencion) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditIntervencion && (
                        <button
                          onClick={() => onEditIntervencion(interv)}
                          className="bg-white/90 hover:bg-white text-slate-900 p-1 rounded shadow-md cursor-pointer"
                          title="Editar intervención"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteIntervencion && (
                        <button
                          onClick={() => setDeleteIntervConfirm({ isOpen: true, interv })}
                          className="bg-red-600 hover:bg-red-700 text-white p-1 rounded shadow-md cursor-pointer"
                          title="Eliminar intervención"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Header Azul del Bloque de Intervención */}
                  <div className="bg-[#11264d] text-white flex border-b-2 border-slate-900">
                    <div className="w-16 border-r-2 border-slate-900 flex items-center justify-center font-bold text-sm bg-[#0e1f3d]">
                      {itemNum}
                    </div>
                    <div className="flex-1 py-1.5 px-3 text-center font-bold text-xs tracking-wider">
                      {headerTitle}
                    </div>
                  </div>

                  {/* Tabla con estructura oficial de casillas */}
                  <table className="w-full border-collapse text-[11px]">
                    <tbody>
                      {/* Fila HECHO y SOLICITUD REQUERIMIENTO */}
                      <tr className="border-b border-slate-900">
                        <td className="w-20 p-1.5 px-2 font-bold underline border-r border-slate-900">
                          HECHO:
                        </td>
                        <td className="p-1.5 px-2 font-bold border-r border-slate-900">
                          "{interv.hecho}"
                        </td>
                        <td className="w-36 p-1.5 px-2 font-bold underline border-r border-slate-900">
                          SOLICITUD REQUERIMIENTO:
                        </td>
                        <td className="p-1.5 px-2">
                          {interv.solicitudHora} {interv.solicitudVia}
                        </td>
                      </tr>

                      {/* Fila INSPECCIÓN OCULAR OCURRIDO */}
                      <tr className="border-b border-slate-900">
                        <td colSpan={2} className="p-1.5 px-2 text-center font-bold underline border-r border-slate-900 bg-slate-50">
                          INSPECCIÓN OCULAR
                        </td>
                        <td colSpan={2} className="p-1.5 px-2 text-center font-bold underline bg-slate-50">
                          OCURRIDO
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="p-1 px-2 font-bold text-center border-r border-slate-900">FECHA</td>
                        <td className="p-1 px-2 font-bold text-center border-r border-slate-900">HORA</td>
                        <td colSpan={2} className="p-1 px-2 font-bold text-center">LUGAR</td>
                      </tr>
                      <tr className="border-b border-slate-900 font-medium">
                        <td className="p-1.5 px-2 text-center border-r border-slate-900">{interv.inspeccionFecha}</td>
                        <td className="p-1.5 px-2 text-center border-r border-slate-900">{interv.inspeccionHora}</td>
                        <td colSpan={2} className="p-1.5 px-2">{interv.inspeccionLugar}</td>
                      </tr>

                      {/* DEPENDENCIA */}
                      <tr className="border-b border-slate-900">
                        <td className="p-1.5 px-2 font-bold underline border-r border-slate-900">DEPENDENCIA:</td>
                        <td colSpan={3} className="p-1.5 px-2 font-semibold">{interv.dependencia}</td>
                      </tr>

                      {/* DEMORADO / PERSONAL INVOLUCRADO */}
                      {interv.involucrados && interv.involucrados.length > 0 && (
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 px-2 font-bold underline border-r border-slate-900">DEMORADO:</td>
                          <td colSpan={3} className="p-1.5 px-2">
                            {interv.involucrados.map((inv) => (
                              <span key={inv.id} className="mr-3 font-medium">
                                <strong>{inv.apellidoYNombre}</strong>, DNI: {inv.dni}, {inv.edad} años. ({inv.funcionEnHecho})
                              </span>
                            ))}
                          </td>
                        </tr>
                      )}

                      {/* REFERENCIA */}
                      {interv.referencia && (
                        <tr className="border-b border-slate-900">
                          <td className="p-1.5 px-2 font-bold underline border-r border-slate-900">REFERENCIA:</td>
                          <td colSpan={3} className="p-1.5 px-2 font-medium">{interv.referencia}</td>
                        </tr>
                      )}

                      {/* TESTIGOS DE ACTA: Nº 1 y Nº 2 */}
                      <tr className="border-b border-slate-900">
                        <td className="p-1.5 px-2 font-bold underline border-r border-slate-900">TESTIGOS DE ACTA</td>
                        <td className="w-16 p-1.5 px-2 font-bold border-r border-slate-900 text-center">Nº 1:</td>
                        <td colSpan={2} className="p-1.5 px-2">
                          {interv.testigos?.[0]?.apellidoYNombre
                            ? `${interv.testigos[0].apellidoYNombre} (DNI: ${interv.testigos[0].dni}, Edad: ${interv.testigos[0].edad} años)`
                            : '----------------------------------------'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="border-r border-slate-900"></td>
                        <td className="p-1.5 px-2 font-bold border-r border-slate-900 text-center">Nº 2</td>
                        <td colSpan={2} className="p-1.5 px-2">
                          {interv.testigos?.[1]?.apellidoYNombre
                            ? `${interv.testigos[1].apellidoYNombre} (DNI: ${interv.testigos[1].dni}, Edad: ${interv.testigos[1].edad} años)`
                            : '----------------------------------------'}
                        </td>
                      </tr>

                      {/* PERSONAL TÉCNICO INTERVINIENTE */}
                      <tr className="border-b border-slate-900 bg-[#d9e6f3]">
                        <td colSpan={4} className="text-center font-bold text-xs py-1 uppercase text-[#11264d]">
                          PERSONAL TÉCNICO INTERVINIENTE
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900 text-center font-bold text-[10px]">
                        <td colSpan={2} className="p-1 border-r border-slate-900">PERITO-AUXILIAR</td>
                        <td className="p-1 border-r border-slate-900">CHOFER M-301 / FOTÓGRAFO</td>
                        <td className="p-1">AUXILIAR</td>
                      </tr>
                      <tr className="border-b border-slate-900 text-center font-semibold">
                        <td colSpan={2} className="p-1.5 border-r border-slate-900">
                          {interv.personalTecnico.peritoAuxiliar || '---'}
                        </td>
                        <td className="p-1.5 border-r border-slate-900">
                          {interv.personalTecnico.choferFotografo || '---'}
                        </td>
                        <td className="p-1.5">
                          {interv.personalTecnico.auxiliar || '---'}
                        </td>
                      </tr>

                      {/* EN CASO DE SINIESTROS VIALES: VEHÍCULOS / RODADOS (MÓVIL UNO, MÓVIL DOS...) */}
                      {interv.tipoIntervencion === 'Accidentológica' &&
                        interv.vehiculosSiniestro?.map((v) => (
                          <React.Fragment key={v.id}>
                            <tr className="border-b border-slate-900 bg-[#e6effa]">
                              <td colSpan={4} className="text-center font-bold text-[11px] py-1 tracking-wider text-[#11264d]">
                                {v.identificador.toUpperCase()}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-900">
                              <td className="p-1 px-2 font-bold underline border-r border-slate-900">TIPO</td>
                              <td colSpan={3} className="p-1 px-2">{v.tipo}</td>
                            </tr>
                            <tr className="border-b border-slate-900">
                              <td className="p-1 px-2 font-bold underline border-r border-slate-900">
                                {v.identificador === 'MÓVIL DOS' ? 'CONDUCTOR' : 'PROPIETARIO'}
                              </td>
                              <td colSpan={3} className="p-1 px-2">{v.propietarioOConductor}</td>
                            </tr>
                            <tr className="border-b border-slate-900">
                              <td className="p-1 px-2 font-bold underline border-r border-slate-900">CIRCULACIÓN</td>
                              <td colSpan={3} className="p-1 px-2">{v.circulacion}</td>
                            </tr>
                            <tr className="border-b border-slate-900">
                              <td className="p-1 px-2 font-bold underline border-r border-slate-900">Z. CONTACTO</td>
                              <td className="p-1 px-2 border-r border-slate-900">{v.zonaContacto}</td>
                              <td className="p-1 px-2 font-bold underline border-r border-slate-900">LESIONES</td>
                              <td className="p-1 px-2 font-bold text-red-800">{v.lesiones || 'Ileso'}</td>
                            </tr>
                          </React.Fragment>
                        ))}

                      {/* SÍNTESIS DEL HECHO */}
                      <tr className="border-b border-slate-900 bg-[#d9e6f3]">
                        <td colSpan={4} className="text-center font-bold text-xs py-1 uppercase text-[#11264d]">
                          SÍNTESIS DEL HECHO
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td colSpan={4} className="p-2.5 whitespace-pre-line text-slate-800">
                          {interv.sintesisHecho}
                        </td>
                      </tr>

                      {/* LABOR CRIMINALÍSTICA */}
                      <tr className="border-b border-slate-900 bg-[#d9e6f3]">
                        <td colSpan={4} className="text-center font-bold text-xs py-1 uppercase text-[#11264d]">
                          LABOR CRIMINALÍSTICA
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="p-2.5 whitespace-pre-line text-slate-800 font-mono text-[10.5px]">
                          {interv.laborCriminalistica}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>

        {/* SECCIÓN FINAL DIVISIÓN CIBERCRIMEN (REGISTRO COMPLETO DE LA GUARDIA CON RESUMEN DE TAREAS) */}
        {parte.cibercrimenRegistros && parte.cibercrimenRegistros.length > 0 && (
          <div className="border-2 border-slate-900 overflow-hidden space-y-0">
            {/* Header Oficial Azul de la División Cibercrimen */}
            <div className="bg-[#11264d] text-white text-center font-bold text-xs py-2 px-3 tracking-wider uppercase border-b-2 border-slate-900">
              DIVISIÓN CIBERCRIMEN
            </div>
            <div className="bg-[#d9e6f3] text-[#11264d] text-center font-bold text-[10.5px] py-1 px-3 border-b border-slate-900 uppercase">
              REGISTRO DE NOVEDADES OPERATIVAS & PERICIALES INFORMÁTICAS DE LA GUARDIA
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 text-slate-800 font-bold text-[10px]">
                  <th className="p-1.5 px-2 border-r border-slate-900 w-12 text-center">Nº</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 w-16 text-center">HORA</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 w-44 text-left">PERSONAL A CARGO</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 w-40 text-left">DEPENDENCIA</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 text-left">TAREA REALIZADA & RESUMEN</th>
                  <th className="p-1.5 px-2 text-left w-36">PERSONA / PPI</th>
                </tr>
              </thead>
              <tbody>
                {parte.cibercrimenRegistros.map((c, cIdx) => {
                  const tareaDesc = c.tareaRealizada === 'Otro' ? c.otraTarea || 'Otro' : c.tareaRealizada;
                  const personaDni = c.apellidoYNombre ? `${c.apellidoYNombre} (DNI: ${c.dni || '---'})` : null;
                  const ppi = c.conPersonalPolicialInvolucrado
                    ? `${c.personalPolicial?.jerarquia || ''} (Plaza: ${c.personalPolicial?.plaza || 's/p'}) - ${c.personalPolicial?.destino || ''}`
                    : null;

                  return (
                    <tr key={c.id || cIdx} className="border-b border-slate-900 last:border-b-0 hover:bg-slate-50">
                      <td className="p-1.5 px-2 border-r border-slate-900 text-center font-bold font-mono">
                        {String(cIdx + 1).padStart(2, '0')}
                      </td>
                      <td className="p-1.5 px-2 border-r border-slate-900 text-center font-mono font-bold">
                        {c.horaRegistro || '---'} hs
                      </td>
                      <td className="p-1.5 px-2 border-r border-slate-900 font-semibold text-slate-900">
                        {c.personalACargo}
                      </td>
                      <td className="p-1.5 px-2 border-r border-slate-900 font-medium text-slate-800">
                        {c.dependenciaSolicitante}
                      </td>
                      <td className="p-1.5 px-2 border-r border-slate-900 space-y-1.5">
                        <div className="font-bold text-slate-900">{tareaDesc}</div>
                        {c.resumenTarea && (
                          <div className="text-[10.5px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 whitespace-pre-line leading-relaxed">
                            <span className="font-bold text-blue-950 block text-[9px] uppercase tracking-wider mb-1">
                              Resumen de la Tarea Realizada:
                            </span>
                            {c.resumenTarea}
                          </div>
                        )}
                      </td>
                      <td className="p-1.5 px-2 text-slate-800 text-[10px]">
                        {personaDni && (
                          <div className="font-semibold text-slate-900">{personaDni}</div>
                        )}
                        {ppi && (
                          <div className="text-red-700 font-bold font-mono mt-0.5">PPI: {ppi}</div>
                        )}
                        {!personaDni && !ppi && <span className="text-slate-400">---</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Botón de cierre inferior */}
        {onClose && (
          <div className="flex justify-end pt-4 border-t border-slate-200 print:hidden">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cerrar Vista Preliminar</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Confirmación Eliminar Intervención */}
      <ConfirmModal
        isOpen={deleteIntervConfirm.isOpen}
        title="Eliminar Intervención"
        message={`¿Confirma eliminar definitivamente la intervención pericial N° ${deleteIntervConfirm.interv?.nroCorrelativo || ''} (${deleteIntervConfirm.interv?.hecho || ''})?`}
        confirmLabel="Eliminar Intervención"
        isDestructive={true}
        onConfirm={() => {
          if (deleteIntervConfirm.interv && onDeleteIntervencion) {
            onDeleteIntervencion(deleteIntervConfirm.interv.id);
          }
        }}
        onClose={() => setDeleteIntervConfirm({ isOpen: false, interv: null })}
      />

      {/* MODAL VISTA PRELIMINAR DEL DOCUMENTO PDF INTERACTIVO */}
      {pdfPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-hidden"
          onClick={() => setPdfPreviewUrl(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del visor PDF */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs sm:text-sm text-slate-100">
                  Vista Preliminar de Impresión PDF Oficial
                </span>
                <span className="bg-blue-800 text-blue-100 text-[10px] px-2 py-0.5 rounded font-mono">
                  {parte.tipoGuardia || parte.grupoGuardia}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generarPdfParteGuardia(parte, config);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  title="Descargar archivo PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewUrl(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visor interactivo iframe del PDF */}
            <div className="flex-1 w-full bg-slate-200">
              <iframe
                src={pdfPreviewUrl}
                title="Vista Preliminar PDF Parte de Guardia"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
