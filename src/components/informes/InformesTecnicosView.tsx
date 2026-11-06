import React, { useState, useEffect, useMemo } from 'react';
import {
  InformeTecnico,
  Personal,
  ConfiguracionSistema,
  InspeccionOcular,
} from '../../types/police';
import { db } from '../../db/database';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  GraduationCap,
  Building,
  User,
  CheckCircle,
  Clock,
  Send,
  Paperclip,
  Trash2,
  Edit2,
  Eye,
  FileCheck2,
  Scale,
  Shield,
  ShieldAlert,
  FileUp,
  X,
  Link,
  Users,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { ModalOpcionesImpresion, OpcionesImpresion } from '../common/ModalOpcionesImpresion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

interface InformesTecnicosViewProps {
  informesList: InformeTecnico[];
  personalList: Personal[];
  config: ConfiguracionSistema;
  inspeccionesList?: InspeccionOcular[];
  onSaveInforme: (inf: InformeTecnico) => void;
  onDeleteInforme: (id: string) => void;
}

export const InformesTecnicosView: React.FC<InformesTecnicosViewProps> = ({
  informesList,
  personalList,
  config,
  inspeccionesList: propInspecciones = [],
  onSaveInforme,
  onDeleteInforme,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInforme, setSelectedInforme] = useState<InformeTecnico | null>(null);
  const [informeToDelete, setInformeToDelete] = useState<InformeTecnico | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [inspecciones, setInspecciones] = useState<InspeccionOcular[]>(propInspecciones);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    mode: 'list' | 'single';
    singleItem?: InformeTecnico;
  }>({ isOpen: false, mode: 'list' });

  useEffect(() => {
    if (propInspecciones.length > 0) {
      setInspecciones(propInspecciones);
    } else {
      db.inspeccionesOculares.toArray().then((ios: InspeccionOcular[]) => setInspecciones(ios || [])).catch(console.error);
    }
  }, [propInspecciones]);

  // Form State
  const [formData, setFormData] = useState<InformeTecnico>({
    id: 'inf-' + Date.now(),
    fecha: new Date().toISOString().split('T')[0],
    fechaRecepcion: new Date().toISOString().split('T')[0],
    oficioNro: '',
    tipoExpediente: 'Sumario Judicial',
    nroExpediente: '',
    anio: new Date().getFullYear(),
    caratula: '',
    juzgado: '',
    dependenciaInterviniente: '',
    personalInstruccion: '',
    licenciadoACargoId: '',
    licenciadoACargoNombre: '',
    auxiliarACargoId: '',
    auxiliarACargoNombre: '',
    auxiliarCargo: 'Auxiliar Notificador y Diligenciador Pericial',
    vincularInspeccionOcular: false,
    inspeccionOcularVinculadaId: '',
    inspeccionOcularNro: '',
    dictamenTexto: '',
    anexoOficioUrl: '',
    anexoOficioNombre: '',
    anexoInformeUrl: '',
    anexoInformeNombre: '',
    fechaElevacion: '',
    quienRecibio: '',
    cargoReceptor: '',
    estado: 'En Confección',
    delegacionId: config.delegacionId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleOpenModal = (inf?: InformeTecnico) => {
    if (inf) {
      setSelectedInforme(inf);
      setFormData({
        ...inf,
        auxiliarCargo: inf.auxiliarCargo || 'Auxiliar Notificador y Diligenciador Pericial',
      });
    } else {
      setSelectedInforme(null);
      // Auto-suggest first licenciado if available
      const primerLic = personalList.find((p) => p.esLicenciado) || personalList[0];
      const primerAux = personalList.find((p) => !p.esLicenciado) || personalList[1] || personalList[0];
      setFormData({
        id: 'inf-' + Date.now(),
        fecha: new Date().toISOString().split('T')[0],
        fechaRecepcion: new Date().toISOString().split('T')[0],
        oficioNro: '',
        tipoExpediente: 'Sumario Judicial',
        nroExpediente: '',
        anio: new Date().getFullYear(),
        caratula: '',
        juzgado: 'Juzgado de Instrucción y Correccional en Turno',
        dependenciaInterviniente: 'Comisaría Seccional Laguna Blanca',
        personalInstruccion: '',
        licenciadoACargoId: primerLic?.id || '',
        licenciadoACargoNombre: primerLic
          ? `${primerLic.jerarquia} ${primerLic.apellidoYNombre}`
          : '',
        auxiliarACargoId: primerAux?.id || '',
        auxiliarACargoNombre: primerAux
          ? `${primerAux.jerarquia} ${primerAux.apellidoYNombre}`
          : '',
        auxiliarCargo: 'Auxiliar Notificador y Diligenciador Pericial',
        vincularInspeccionOcular: false,
        inspeccionOcularVinculadaId: '',
        inspeccionOcularNro: '',
        dictamenTexto: '',
        anexoOficioUrl: '',
        anexoOficioNombre: '',
        anexoInformeUrl: '',
        anexoInformeNombre: '',
        fechaElevacion: '',
        quienRecibio: '',
        cargoReceptor: '',
        estado: 'En Confección',
        delegacionId: config.delegacionId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'oficio' | 'informe'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (tipo === 'oficio') {
        setFormData((prev) => ({
          ...prev,
          anexoOficioUrl: result,
          anexoOficioNombre: file.name,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          anexoInformeUrl: result,
          anexoInformeNombre: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLicenciadoSelect = (pId: string) => {
    const pers = personalList.find((p) => p.id === pId);
    if (pers) {
      setFormData((prev) => ({
        ...prev,
        licenciadoACargoId: pers.id,
        licenciadoACargoNombre: `${pers.jerarquia} ${pers.apellidoYNombre}`,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        licenciadoACargoId: '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caratula.trim() || !formData.oficioNro.trim()) {
      alert('Por favor complete el Oficio y la Carátula de la causa');
      return;
    }
    if (formData.involucraPersonalPolicial) {
      if (
        !formData.personalPolicial?.apellidoYNombre?.trim() ||
        !formData.personalPolicial?.plaza?.trim() ||
        !formData.personalPolicial?.jerarquia?.trim()
      ) {
        alert(
          'Al indicar que la causa involucra Personal Policial, es obligatorio especificar Jerarquía, Plaza, y Apellido y Nombre.'
        );
        return;
      }
    }
    onSaveInforme({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(false);
  };

  // Filtrado de informes
  const filteredList = informesList.filter((inf) => {
    const matchSearch =
      inf.caratula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.oficioNro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.nroExpediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.juzgado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.dependenciaInterviniente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.licenciadoACargoNombre.toLowerCase().includes(searchTerm.toLowerCase());

    const matchEstado =
      filtroEstado === 'todos' || inf.estado === filtroEstado;

    const matchTipo =
      filtroTipo === 'todos' || inf.tipoExpediente === filtroTipo;

    return matchSearch && matchEstado && matchTipo;
  });

  const handleExportListPdf = (opciones?: OpcionesImpresion) => {
    const orientacion = opciones?.orientacion === 'portrait' ? 'p' : 'l';
    let formato: any = 'a4';
    if (opciones?.tamano === 'legal') formato = [216, 356];
    else if (opciones?.tamano === 'letter') formato = 'letter';

    const doc = new jsPDF(orientacion, 'mm', formato);
    const finalY = drawPoliceHeader(
      doc,
      config,
      'LIBRO DE INFORMES TÉCNICOS PERICIALES Y ELEVACIONES'
    );

    const rows = filteredList.map((inf, i) => [
      String(i + 1),
      inf.fecha,
      inf.oficioNro,
      `${inf.tipoExpediente} N° ${inf.nroExpediente}/${inf.anio}`,
      inf.caratula,
      inf.juzgado,
      inf.dependenciaInterviniente,
      inf.licenciadoACargoNombre,
      inf.estado,
      inf.fechaElevacion ? `${inf.fechaElevacion} (${inf.quienRecibio || 'S/D'})` : 'Pendiente',
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [
        [
          'N°',
          'Fecha',
          'Oficio',
          'Expediente',
          'Carátula',
          'Juzgado/Fiscalía',
          'Dependencia',
          'Licenciado a Cargo',
          'Estado',
          'Elevación / Receptor',
        ],
      ],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 2,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 7 },
        1: { halign: 'center', cellWidth: 16 },
        2: { cellWidth: 22 },
        3: { cellWidth: 30 },
        4: { cellWidth: 50 },
        5: { cellWidth: 35 },
        6: { cellWidth: 35 },
        7: { cellWidth: 35 },
        8: { halign: 'center', cellWidth: 20 },
        9: { cellWidth: 26 },
      },
    });

    drawPoliceFooter(doc, config);
    doc.save(`Informes_Tecnicos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportSingleReportPdf = (inf: InformeTecnico, opciones?: OpcionesImpresion) => {
    const orientacion = opciones?.orientacion === 'landscape' ? 'l' : 'p';
    let formato: any = 'a4';
    if (opciones?.tamano === 'legal') formato = [216, 356];
    else if (opciones?.tamano === 'letter') formato = 'letter';

    const doc = new jsPDF(orientacion, 'mm', formato);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let finalY = drawPoliceHeader(
      doc,
      config,
      'CONSTANCIA OFICIAL DE INFORME TÉCNICO PERICIAL'
    );

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`OFICIO N°: ${inf.oficioNro.toUpperCase()}`, 15, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Registro: ${inf.fecha}`, pageWidth - 70, finalY + 6);

    const data = [
      ['Tipo de Sumario / Causa:', `${inf.tipoExpediente} N° ${inf.nroExpediente}/${inf.anio}`],
      ['Fecha del Oficio:', inf.fecha],
      ['Fecha de Recepción en Dependencia:', inf.fechaRecepcion || inf.fecha],
      ['Carátula de la Causa:', inf.caratula],
      ['Juzgado / Fiscalía Interviniente:', inf.juzgado],
      ['Dependencia Solicitante / Instructora:', inf.dependenciaInterviniente],
      ['Personal a Cargo de Instrucción:', inf.personalInstruccion || 'No indicado'],
      ['Licenciado a Cargo del Peritaje:', inf.licenciadoACargoNombre || 'A designar'],
      [
        'Auxiliar Designado (Diligenciamiento):',
        inf.auxiliarACargoNombre
          ? `${inf.auxiliarACargoNombre} (Cargo: ${inf.auxiliarCargo || 'Auxiliar Notificador y Diligenciador Pericial'})`
          : 'Sin auxiliar asignado',
      ],
      [
        'Inspección Ocular Vinculada:',
        inf.inspeccionOcularNro
          ? `I.O. N° ${inf.inspeccionOcularNro}`
          : 'Sin vinculación directa con I.O.',
      ],
      ['Estado del Trámite:', inf.estado],
      [
        'Elevación y Destino:',
        inf.fechaElevacion
          ? `Elevado el ${inf.fechaElevacion} - Recepcionado por: ${inf.quienRecibio || 'S/D'} ${
              inf.cargoReceptor ? `(${inf.cargoReceptor})` : ''
            }`
          : 'Aún en proceso interno / Sin elevar',
      ],
      ['Oficio Adjunto:', inf.anexoOficioNombre ? `ANEXADO: ${inf.anexoOficioNombre}` : 'Sin anexo digital'],
      ['Informe Pericial Adjunto:', inf.anexoInformeNombre ? `ANEXADO: ${inf.anexoInformeNombre}` : 'Sin anexo digital'],
    ];

    autoTable(doc, {
      startY: finalY + 12,
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 65, fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 7;

    // Dictamen texto si existe
    if (inf.dictamenTexto) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('EXTRACTO / DICTAMEN PERICIAL TÉCNICO:', 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const splitText = doc.splitTextToSize(inf.dictamenTexto, pageWidth - 30);
      doc.text(splitText, 15, currentY + 4.5);
      currentY += 6 + splitText.length * 3.8;
    }

    // Diligenciamiento asignado al auxiliar
    if (inf.auxiliarACargoNombre) {
      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('DILIGENCIAMIENTO Y NOTIFICACIÓN JUDICIAL:', 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const commText = `Se faculta y comisiona expresamente al Auxiliar ${inf.auxiliarACargoNombre}, en su carácter de ${inf.auxiliarCargo || 'Auxiliar Notificador y Diligenciador Pericial'}, para que proceda formalmente a la entrega, diligenciamiento y notificación del presente Informe Técnico Pericial ante el Magistrado / Autoridad requirente con las formalidades de estilo.`;
      const splitComm = doc.splitTextToSize(commText, pageWidth - 30);
      doc.text(splitComm, 15, currentY + 4.5);
      currentY += 6 + splitComm.length * 3.8;
    }

    // Firmas: Licenciado a la derecha y Auxiliar a la izquierda
    let sigY = currentY + 10;
    if (sigY > pageHeight - 35) {
      doc.addPage();
      sigY = 40;
    }

    doc.setDrawColor(50, 60, 75);
    doc.setLineWidth(0.4);

    // Firma del Auxiliar (a la izquierda)
    const auxX = 55;
    doc.line(auxX - 35, sigY + 12, auxX + 35, sigY + 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(inf.auxiliarACargoNombre || 'AUXILIAR DESIGNADO', auxX, sigY + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(inf.auxiliarCargo || 'Auxiliar Notificador / Diligenciador', auxX, sigY + 20, { align: 'center' });

    // Firma del Licenciado a Cargo (a la derecha)
    const licX = pageWidth - 55;
    doc.line(licX - 35, sigY + 12, licX + 35, sigY + 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(inf.licenciadoACargoNombre || 'LICENCIADO A CARGO', licX, sigY + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Perito Oficial / Licenciado Interviniente', licX, sigY + 20, { align: 'center' });

    drawPoliceFooter(doc, config);
    doc.save(`Informe_Tecnico_${inf.oficioNro.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-800 rounded-lg">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Informes Técnicos & Periciales
                </h1>
                <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Judicial & Pericial
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Carga, seguimiento, anexos documentales de oficios e informes, fechas de elevación y constancia de recepción judicial.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {informesList.length > 0 && (
            <button
              onClick={() => setPrintModalState({ isOpen: true, mode: 'list' })}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Libro en PDF</span>
            </button>
          )}

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cargar Informe Técnico</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar carátula, oficio, expediente, juzgado, perito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 font-medium">Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="todos">Todos los Estados</option>
              <option value="En Confección">En Confección</option>
              <option value="Elevado">Elevado</option>
              <option value="Recepcionado">Recepcionado</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-600 font-medium">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Sumario Judicial">Sumario Judicial</option>
              <option value="IPP">IPP</option>
              <option value="Causa Penal">Causa Penal</option>
              <option value="Expediente Pericial">Expediente Pericial</option>
              <option value="Actuación Prevencional">Actuación Prevencional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Informes Técnicos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No se encontraron Informes Técnicos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Haga clic en "+ Cargar Informe Técnico" para registrar un nuevo expediente pericial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Fecha / Recep.</th>
                  <th className="py-2.5 px-3">Oficio</th>
                  <th className="py-2.5 px-3">Expediente</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Carátula</th>
                  <th className="py-2.5 px-3">Juzgado / Dependencia</th>
                  <th className="py-2.5 px-3">Licenciado a Cargo</th>
                  <th className="py-2.5 px-3">Anexos</th>
                  <th className="py-2.5 px-3">Estado / Elevación</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((inf) => (
                  <tr key={inf.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{inf.fecha}</div>
                      {inf.fechaRecepcion && (
                        <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 mt-0.5 inline-block">
                          Recep: {inf.fechaRecepcion}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                      {inf.oficioNro}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{inf.tipoExpediente}</span>
                      <div className="text-[11px] font-mono text-slate-500">
                        N° {inf.nroExpediente} / {inf.anio}
                      </div>
                      {inf.inspeccionOcularNro && (
                        <div className="mt-1">
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded">
                            I.O. N° {inf.inspeccionOcularNro}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block line-clamp-2">
                        {inf.caratula}
                      </span>
                      {inf.personalInstruccion && (
                        <span className="text-[10px] text-slate-500">
                          Instr.: {inf.personalInstruccion}
                        </span>
                      )}
                      {inf.involucraPersonalPolicial && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>👮 Personal Policial: {inf.personalPolicial?.jerarquia} {inf.personalPolicial?.apellidoYNombre} (Plaza {inf.personalPolicial?.plaza})</span>
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block">{inf.juzgado}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                        {inf.dependenciaInterviniente}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                          <span className="font-semibold text-indigo-950">
                            {inf.licenciadoACargoNombre}
                          </span>
                        </div>
                        {inf.auxiliarACargoNombre && (
                          <div className="text-[10px] text-slate-500 pl-5">
                            <span className="font-medium text-slate-700">Aux:</span> {inf.auxiliarACargoNombre}
                            {inf.auxiliarCargo && (
                              <span className="text-[9px] block text-slate-400 truncate max-w-[150px]">
                                {inf.auxiliarCargo}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {inf.anexoOficioUrl ? (
                          <button
                            onClick={() =>
                              setPreviewFile({
                                name: inf.anexoOficioNombre || 'Oficio.pdf',
                                url: inf.anexoOficioUrl!,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline font-semibold"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Oficio</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin Oficio</span>
                        )}

                        {inf.anexoInformeUrl ? (
                          <button
                            onClick={() =>
                              setPreviewFile({
                                name: inf.anexoInformeNombre || 'Informe_Tecnico.pdf',
                                url: inf.anexoInformeUrl!,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline font-semibold"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Informe</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin Informe</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inf.estado === 'Recepcionado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inf.estado === 'Elevado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inf.estado}
                      </span>
                      {inf.fechaElevacion && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Elev.: {inf.fechaElevacion}
                        </div>
                      )}
                      {inf.quienRecibio && (
                        <div className="text-[10px] text-slate-600 font-medium truncate max-w-[120px]">
                          Rec.: {inf.quienRecibio}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            setPrintModalState({
                              isOpen: true,
                              mode: 'single',
                              singleItem: inf,
                            })
                          }
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                          title="Descargar Constancia en PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(inf)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Editar Informe Técnico"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInformeToDelete(inf)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Carga / Edición de Informe Técnico */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  {selectedInforme ? 'Modificar Informe Técnico' : 'Cargar Nuevo Informe Técnico Pericial'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Sección 1: Datos de Cabecera y Causa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha del Oficio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-blue-950 mb-1">
                    Fecha de Recepción *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaRecepcion || formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fechaRecepcion: e.target.value })}
                    className="w-full border border-blue-400 bg-blue-50/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Sumario / Exp. *
                  </label>
                  <select
                    value={formData.tipoExpediente}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoExpediente: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Sumario Judicial">Sumario Judicial</option>
                    <option value="IPP">IPP (Investigación Penal Prep.)</option>
                    <option value="Causa Penal">Causa Penal</option>
                    <option value="Expediente Pericial">Expediente Pericial</option>
                    <option value="Actuación Prevencional">Actuación Prevencional</option>
                    <option value="Investigación Actuada">Investigación Actuada</option>
                  </select>
                </div>
              </div>

              {/* N° Oficio y N° Sumario con / Año * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Oficio N° *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Oficio N° 102"
                      value={formData.oficioNro}
                      onChange={(e) => setFormData({ ...formData, oficioNro: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      / Año *
                    </label>
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2099}
                      value={formData.anio}
                      onChange={(e) =>
                        setFormData({ ...formData, anio: parseInt(e.target.value, 10) || 2026 })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      N° de Sumario / Exp. *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 423"
                      value={formData.nroExpediente}
                      onChange={(e) =>
                        setFormData({ ...formData, nroExpediente: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      / Año *
                    </label>
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2099}
                      value={formData.anio}
                      onChange={(e) =>
                        setFormData({ ...formData, anio: parseInt(e.target.value, 10) || 2026 })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Carátula */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Carátula *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. ACTUACIONES S/ INVESTIGACIÓN DEL HECHO C/ AUTORES DESCONOCIDOS..."
                  value={formData.caratula}
                  onChange={(e) => setFormData({ ...formData, caratula: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none uppercase"
                />
              </div>

              {/* Juzgado y Dependencia Interviniente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Juzgado / Fiscalía *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juzgado de Instrucción y Correccional N° 2"
                    value={formData.juzgado}
                    onChange={(e) => setFormData({ ...formData, juzgado: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dependencia Interviniente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Comisaría Laguna Blanca / Destacamento..."
                    value={formData.dependenciaInterviniente}
                    onChange={(e) =>
                      setFormData({ ...formData, dependenciaInterviniente: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Personal a Cargo de Instrucción y Licenciado a Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Personal a Cargo de la Instrucción
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Subcomisario García / Of. Insp. López"
                    value={formData.personalInstruccion}
                    onChange={(e) =>
                      setFormData({ ...formData, personalInstruccion: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Licenciado a Cargo *
                  </label>
                  <select
                    value={formData.licenciadoACargoId || ''}
                    onChange={(e) => handleLicenciadoSelect(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  >
                    <option value="">-- Seleccionar Licenciado de Nómina --</option>
                    {personalList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jerarquia} {p.apellidoYNombre} {p.esLicenciado ? '⭐ (Licenciado)' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="O escriba el nombre del Licenciado"
                    value={formData.licenciadoACargoNombre}
                    onChange={(e) =>
                      setFormData({ ...formData, licenciadoACargoNombre: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Auxiliar Designado (Diligenciamiento) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-800" />
                    <span>Auxiliar Designado (Diligenciamiento) *</span>
                  </label>
                  <select
                    value={formData.auxiliarACargoId || ''}
                    onChange={(e) => {
                      const p = personalList.find((item) => item.id === e.target.value);
                      if (p) {
                        setFormData((prev) => ({
                          ...prev,
                          auxiliarACargoId: p.id,
                          auxiliarACargoNombre: `${p.jerarquia} ${p.apellidoYNombre}`,
                        }));
                      } else {
                        setFormData((prev) => ({ ...prev, auxiliarACargoId: '' }));
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  >
                    <option value="">-- Seleccionar Auxiliar de Nómina --</option>
                    {personalList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jerarquia} {p.apellidoYNombre}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="O escriba el nombre del Auxiliar"
                    value={formData.auxiliarACargoNombre || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, auxiliarACargoNombre: e.target.value })
                    }
                    className="w-full mt-1 border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Cargo Asignado al Auxiliar */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo Asignado al Auxiliar (para Diligenciamiento en PDF) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Auxiliar Notificador y Diligenciador Pericial"
                    value={formData.auxiliarCargo || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, auxiliarCargo: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  />
                </div>
              </div>

              {/* Vinculación a Inspección Ocular */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-950">
                  <input
                    type="checkbox"
                    checked={formData.vincularInspeccionOcular || false}
                    onChange={(e) =>
                      setFormData({ ...formData, vincularInspeccionOcular: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-900 rounded"
                  />
                  <span className="flex items-center gap-1.5">
                    <Link className="w-4 h-4 text-blue-700" />
                    <span>¿Vincular a una Inspección Ocular (I.O.)?</span>
                  </span>
                </label>

                {formData.vincularInspeccionOcular && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Seleccionar de I.O. Registradas
                      </label>
                      <select
                        value={formData.inspeccionOcularVinculadaId || ''}
                        onChange={(e) => {
                          const found = inspecciones.find((i) => i.id === e.target.value);
                          if (found) {
                            setFormData({
                              ...formData,
                              inspeccionOcularVinculadaId: found.id,
                              inspeccionOcularNro: found.nroIO,
                              caratula: formData.caratula || found.hecho || '',
                            });
                          }
                        }}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white font-medium"
                      >
                        <option value="">-- Seleccionar I.O. --</option>
                        {inspecciones.map((io) => (
                          <option key={io.id} value={io.id}>
                            {io.nroIO} - {io.hecho} ({io.fecha})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Número de Inspección Ocular
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. I.O. Nº 004/2026"
                        value={formData.inspeccionOcularNro || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, inspeccionOcularNro: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dictamen o Resumen Pericial */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dictamen / Conclusiones del Informe Pericial
                </label>
                <textarea
                  rows={2}
                  placeholder="Detallar conclusiones técnicas, velocidad inferida, trayectoria balística, etc..."
                  value={formData.dictamenTexto || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, dictamenTexto: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                />
              </div>

              {/* CAUSA CON PERSONAL POLICIAL INVOLUCRADO */}
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
                              jerarquia: config.jerarquias[0] || 'Oficial Principal',
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
                    <span>¿Es una Causa / Informe con Personal Policial involucrado?</span>
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
                            <option key={j} value={j}>
                              {j}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Plaza N° *</label>
                        <input
                          type="text"
                          required
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
                          placeholder="Ej. 14205"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono font-bold text-blue-900"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Apellido y Nombre *</label>
                        <input
                          type="text"
                          required
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
                          placeholder="Ej. GONZALEZ Juan Carlos"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white uppercase font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">D.N.I.</label>
                        <input
                          type="text"
                          value={formData.personalPolicial?.dni || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              personalPolicial: {
                                ...formData.personalPolicial!,
                                dni: e.target.value,
                              },
                            })
                          }
                          placeholder="Sin puntos"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Rol / Condición</label>
                        <input
                          type="text"
                          list="lista-condiciones-policiales-inf"
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
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold text-amber-900"
                        />
                        <datalist id="lista-condiciones-policiales-inf">
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
                          placeholder="Unidad de destino/revista"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección de Anexos: Oficio e Informe */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-700" />
                  <span>Anexos Digitales (Oficio e Informe)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Anexo de Oficio */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Anexar Oficio (PDF / Imagen)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'oficio')}
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100"
                    />
                    {formData.anexoOficioNombre && (
                      <div className="mt-1 flex items-center justify-between text-[11px] text-blue-700 font-medium">
                        <span className="truncate">📎 {formData.anexoOficioNombre}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              anexoOficioUrl: '',
                              anexoOficioNombre: '',
                            }))
                          }
                          className="text-red-500 hover:text-red-700 ml-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Anexo de Informe */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Anexar Informe Pericial (PDF / Imagen)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'informe')}
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-emerald-50 file:text-emerald-700 file:font-semibold hover:file:bg-emerald-100"
                    />
                    {formData.anexoInformeNombre && (
                      <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
                        <span className="truncate">📎 {formData.anexoInformeNombre}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              anexoInformeUrl: '',
                              anexoInformeNombre: '',
                            }))
                          }
                          className="text-red-500 hover:text-red-700 ml-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de Elevación y Recepción */}
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-3">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-blue-700" />
                  <span>Elevación & Recepción Judicial</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Estado del Informe
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estado: e.target.value as 'En Confección' | 'Elevado' | 'Recepcionado',
                        })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                    >
                      <option value="En Confección">En Confección</option>
                      <option value="Elevado">Elevado</option>
                      <option value="Recepcionado">Recepcionado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Fecha de Elevación
                    </label>
                    <input
                      type="date"
                      value={formData.fechaElevacion || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaElevacion: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quién Recibió
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Dr. Martínez (Secretario)"
                      value={formData.quienRecibio || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, quienRecibio: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Guardar Informe Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Previsualización de Archivo Anexo */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate">📎 {previewFile.name}</span>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
              {previewFile.url.startsWith('data:image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[70vh] object-contain rounded shadow"
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[70vh] rounded border border-slate-300 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={!!informeToDelete}
        title="Eliminar Informe Técnico"
        message={`¿Confirma eliminar el informe técnico correspondiente al oficio ${informeToDelete?.oficioNro || ''} - Carátula: "${informeToDelete?.caratula || ''}"?`}
        confirmLabel="Eliminar Informe"
        isDestructive={true}
        onConfirm={() => {
          if (informeToDelete) {
            onDeleteInforme(informeToDelete.id);
            setInformeToDelete(null);
          }
        }}
        onClose={() => setInformeToDelete(null)}
      />

      {/* Modal de Configuración de Impresión */}
      <ModalOpcionesImpresion
        isOpen={printModalState.isOpen}
        titulo={
          printModalState.mode === 'single'
            ? `Imprimir Informe Técnico: Oficio ${printModalState.singleItem?.oficioNro || ''}`
            : 'Imprimir Libro de Informes Técnicos'
        }
        orientacionDefault={printModalState.mode === 'list' ? 'landscape' : 'portrait'}
        tamanoDefault="a4"
        onGenerar={(opciones) => {
          if (printModalState.mode === 'single' && printModalState.singleItem) {
            handleExportSingleReportPdf(printModalState.singleItem, opciones);
          } else {
            handleExportListPdf(opciones);
          }
        }}
        onClose={() => setPrintModalState({ isOpen: false, mode: 'list' })}
      />
    </div>
  );
};
