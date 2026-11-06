import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ConfiguracionSistema,
  ParteNovedadesGuardia,
  ExpedienteJudicial,
  MovilPolicial,
  ReparacionMecanica,
  RecargoOperativo,
  Personal,
  InspeccionOcular,
  AccidentologiaRegistro,
} from '../types/police';

// Colores institucionales de la Policía
const POLICE_NAVY: [number, number, number] = [17, 38, 77]; // #11264d
const POLICE_LIGHT_BLUE: [number, number, number] = [217, 230, 243]; // #d9e6f3
const POLICE_BORDER: [number, number, number] = [30, 41, 59];
const TEXT_DARK: [number, number, number] = [15, 23, 42];

// Dibuja membrete oficial policial estándar (soporta múltiples líneas personalizadas, logos y lemas)
export function drawPoliceHeader(
  doc: jsPDF,
  config: ConfiguracionSistema,
  title: string,
  startY = 10
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const leftX = 14;
  const rightX = pageWidth - 14;

  let currentY = startY;

  // Si hay líneas de membrete personalizadas configuradas
  if (config.lineasMembrete && config.lineasMembrete.length > 0) {
    // Dibujar líneas centrales
    config.lineasMembrete.forEach((linea) => {
      if (!linea.texto.trim()) return;

      doc.setFont('helvetica', linea.negrita ? 'bold' : 'normal');

      // Tamaños
      if (linea.tamano === 'xl') doc.setFontSize(11);
      else if (linea.tamano === 'lg') doc.setFontSize(9.5);
      else if (linea.tamano === 'base') doc.setFontSize(8.5);
      else doc.setFontSize(7.5);

      // Colores
      if (linea.color === 'azul') {
        doc.setTextColor(POLICE_NAVY[0], POLICE_NAVY[1], POLICE_NAVY[2]);
      } else if (linea.color === 'gris') {
        doc.setTextColor(80, 95, 115);
      } else {
        doc.setTextColor(15, 23, 42);
      }

      doc.text(linea.texto, centerX, currentY, { align: 'center' });

      // Subrayado opcional
      if (linea.subrayado) {
        const textWidth = doc.getTextWidth(linea.texto);
        doc.setLineWidth(0.3);
        doc.setDrawColor(
          linea.color === 'azul' ? POLICE_NAVY[0] : 15,
          linea.color === 'azul' ? POLICE_NAVY[1] : 23,
          linea.color === 'azul' ? POLICE_NAVY[2] : 42
        );
        doc.line(centerX - textWidth / 2, currentY + 0.8, centerX + textWidth / 2, currentY + 0.8);
      }

      // Incremento de espacio vertical según tamaño
      currentY += linea.tamano === 'xl' || linea.tamano === 'lg' ? 4.5 : 3.8;
    });

    // Texto debajo del logo izquierdo (si está configurado)
    if (config.textoDebajoLogoIzquierdo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 115, 130);
      const splitLeft = doc.splitTextToSize(config.textoDebajoLogoIzquierdo, 38);
      doc.text(splitLeft, 22, currentY - 1, { align: 'center' });
    }

    // Texto debajo del logo derecho (si está configurado)
    if (config.textoDebajoLogoDerecho) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(POLICE_NAVY[0], POLICE_NAVY[1], POLICE_NAVY[2]);
      doc.text(config.textoDebajoLogoDerecho, rightX - 12, currentY - 1, { align: 'center' });
    }
  } else {
    // Formato clásico de fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(POLICE_NAVY[0], POLICE_NAVY[1], POLICE_NAVY[2]);
    doc.text((config.nombreInstitucion || 'POLICÍA DE LA PROVINCIA').toUpperCase(), centerX, currentY, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(50, 65, 85);
    doc.text((config.unidadRegional || '').toUpperCase(), centerX, currentY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text((config.dependencia || '').toUpperCase(), centerX, currentY + 9, { align: 'center' });

    currentY += 13;
  }

  // Doble línea oficial de separación
  doc.setDrawColor(POLICE_NAVY[0], POLICE_NAVY[1], POLICE_NAVY[2]);
  doc.setLineWidth(0.8);
  doc.line(leftX, currentY + 2, rightX, currentY + 2);
  doc.setLineWidth(0.3);
  doc.line(leftX, currentY + 3.2, rightX, currentY + 3.2);

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(POLICE_NAVY[0], POLICE_NAVY[1], POLICE_NAVY[2]);
    doc.text(title.toUpperCase(), centerX, currentY + 8.5, { align: 'center' });
    return currentY + 13;
  }

  return currentY + 6;
}

// Dibuja pie de página oficial con numeración
export function drawPoliceFooter(doc: jsPDF, config: ConfiguracionSistema) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, 196, pageHeight - 12);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(config.pieDePagina, 14, pageHeight - 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, 196, pageHeight - 8, { align: 'right' });
  }
}

/**
 * 1. PARTE DE NOVEDADES DE GUARDIA OFICIAL
 * Exactamente fiel a los modelos de las imágenes enviadas por el usuario
 */
export function generarPdfParteGuardia(
  parte: ParteNovedadesGuardia,
  config: ConfiguracionSistema,
  previewOnly?: boolean
): string {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    `PARTE DE NOVEDADES DE GUARDIA - ${parte.grupoGuardia.toUpperCase()}`,
    10
  );

  // Cuadro superior: Título con período exacto del modelo
  const tituloPeriodo = `NOVEDADES SERVICIO DE GUARDIA DE ${parte.horaInicio} HS. DEL ${parte.fechaInicio} A ${parte.horaFin} HS. DEL ${parte.fechaFin}`;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: tituloPeriodo, colSpan: 2, styles: { halign: 'center', fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 } }]],
    body: parte.funcionesPersonal.map((f) => [
      { content: f.funcion, styles: { fontStyle: 'bold', cellWidth: 85, textColor: TEXT_DARK } },
      { content: f.personalNombre || '---', styles: { textColor: TEXT_DARK } },
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 1.5;

  // Cuadro: FORENSE DE TURNO Y RELEVOS POLICIALES + TOTAL DE INTERVENCIONES
  const forensesRows: any[] = [];
  if (parte.forensesTurno && parte.forensesTurno.length > 0) {
    parte.forensesTurno.forEach((f) => {
      forensesRows.push([
        {
          content: `${f.medicoNombre}${f.turno ? ` (${f.turno}: ${f.horaIngreso} a ${f.horaEgreso || '--:--'} hs.)` : ''}`,
          styles: { fontStyle: 'bold' },
        },
        {
          content: `(- ${f.totalExaminados || 0} -) examinados${f.examinadosHastaHs ? ` hasta hs. ${f.examinadosHastaHs}` : ''}`,
          styles: { halign: 'center', fontStyle: 'bold' },
        },
      ]);
    });
  } else {
    forensesRows.push([
      { content: parte.forense?.medicoNombre || 'Médico Policial Forense en Turno', styles: { fontStyle: 'bold' } },
      { content: `Total (- ${parte.forense?.totalExaminados || 0} -) examinados hasta hs. ${parte.forense?.examinadosHastaHs || '07:00'}`, styles: { halign: 'center', fontStyle: 'bold' } },
    ]);
  }

  // Total de intervenciones row
  forensesRows.push([
    {
      content: `TOTAL DE INTERVENCIONES [ - ${String(parte.intervenciones.length).padStart(2, '0')} - ]`,
      colSpan: 2,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 244, 250], textColor: POLICE_NAVY },
    },
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'MÉDICO(S) FORENSE(S) DE TURNO & RELEVOS POLICIALES', colSpan: 2, styles: { halign: 'center', fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold', fontSize: 8.5 } }]],
    body: forensesRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 1.5;

  // Cuadro: MÓVILES AFECTADOS
  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'MÓVILES AFECTADOS', colSpan: 2, styles: { halign: 'center', fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold', fontSize: 8.5 } }]],
    body: parte.movilesAfectados.length > 0
      ? parte.movilesAfectados.map((m) => [
          { content: m.descripcion, styles: { textColor: TEXT_DARK } },
          { content: m.estado, styles: { fontStyle: 'bold', halign: 'center', textColor: m.estado === 'En servicio' ? [22, 101, 52] : [185, 28, 28] } },
        ])
      : [['Sin móviles asignados registrados en guardia', '']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // AHORA: Renderizado exacto de cada INTERVENCIÓN (Criminalística y Accidentológica)
  parte.intervenciones.forEach((interv, idx) => {
    // Si queda poco espacio en la página, saltar a nueva página
    if (currentY > 210) {
      doc.addPage();
      currentY = drawPoliceHeader(doc, config, 'PARTE DE NOVEDADES DE GUARDIA (CONTINUACIÓN)', 10);
    }

    const nroItem = String(idx + 1).padStart(2, '0');
    const headerTitle = interv.tipoIntervencion === 'Accidentológica'
      ? `INTERVENCIÓN ACCIDENTOLÓGICA Nº    ${interv.nroCorrelativo}    /${new Date(parte.fechaInicio).getFullYear()}-${config.siglasDependencia}.`
      : `INTERVENCIÓN CRIMINALÍSTICA Nº    ${interv.nroCorrelativo}    /${new Date(parte.fechaInicio).getFullYear()}-${config.siglasDependencia}.`;

    // Armamos las filas de la tabla según el modelo de las fotos
    const bodyRows: any[] = [
      [
        { content: 'HECHO:', styles: { fontStyle: 'bold', cellWidth: 26 } },
        { content: `"${interv.hecho.toUpperCase()}"`, styles: { fontStyle: 'bold', cellWidth: 70 } },
        { content: 'SOLICITUD\nREQUERIMIENTO:', styles: { fontStyle: 'bold', cellWidth: 32 } },
        { content: `${interv.solicitudHora} ${interv.solicitudVia}`, styles: { cellWidth: 54 } },
      ],
      [
        { content: 'INSPECCIÓN OCULAR\nOCURRIDO', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [245, 248, 252] } },
        { content: `FECHA: ${interv.inspeccionFecha}  |  HORA: ${interv.inspeccionHora}\nLUGAR: ${interv.inspeccionLugar}`, colSpan: 2, styles: {} },
      ],
      [
        { content: 'DEPENDENCIA:', styles: { fontStyle: 'bold' } },
        { content: interv.dependencia, colSpan: 3, styles: {} },
      ],
    ];

    if (interv.involucrados && interv.involucrados.length > 0) {
      const invTexto = interv.involucrados
        .map((inv) => `${inv.apellidoYNombre} (DNI: ${inv.dni}, Edad: ${inv.edad} años) - Función: ${inv.funcionEnHecho}`)
        .join('; ');
      bodyRows.push([
        { content: 'DEMORADO /\nINVOLUCRADO:', styles: { fontStyle: 'bold' } },
        { content: invTexto, colSpan: 3, styles: {} },
      ]);
    }

    if (interv.referencia) {
      bodyRows.push([
        { content: 'REFERENCIA:', styles: { fontStyle: 'bold' } },
        { content: interv.referencia, colSpan: 3, styles: {} },
      ]);
    }

    // Testigos de Acta (N° 1 y N° 2)
    const t1 = interv.testigos?.[0] ? `${interv.testigos[0].apellidoYNombre} - DNI: ${interv.testigos[0].dni} (${interv.testigos[0].edad} años)` : 'Sin testigos registrados';
    const t2 = interv.testigos?.[1] ? `${interv.testigos[1].apellidoYNombre} - DNI: ${interv.testigos[1].dni} (${interv.testigos[1].edad} años)` : '---';
    bodyRows.push([
      { content: 'TESTIGOS DE ACTA', styles: { fontStyle: 'bold' } },
      { content: `N° 1: ${t1}\nN° 2: ${t2}`, colSpan: 3, styles: {} },
    ]);

    // Personal Técnico Interviniente
    bodyRows.push([
      { content: 'PERSONAL TÉCNICO INTERVINIENTE', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY } },
    ]);
    bodyRows.push([
      { content: `PERITO / AUXILIAR:\n${interv.personalTecnico.peritoAuxiliar || '---'}`, colSpan: 2, styles: { halign: 'center' } },
      { content: `CHOFER / FOTÓGRAFO:\n${interv.personalTecnico.choferFotografo || '---'}`, styles: { halign: 'center' } },
      { content: `AUXILIAR:\n${interv.personalTecnico.auxiliar || '---'}`, styles: { halign: 'center' } },
    ]);

    // Si es Accidentológica, incluir los vehículos/rodados (MÓVIL UNO, MÓVIL DOS...)
    if (interv.tipoIntervencion === 'Accidentológica' && interv.vehiculosSiniestro) {
      interv.vehiculosSiniestro.forEach((v) => {
        bodyRows.push([
          { content: v.identificador.toUpperCase(), colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [235, 240, 248], textColor: POLICE_NAVY } },
        ]);
        bodyRows.push([
          { content: 'TIPO:', styles: { fontStyle: 'bold' } },
          { content: v.tipo, colSpan: 3, styles: {} },
        ]);
        bodyRows.push([
          { content: 'PROPIETARIO / CONDUCTOR:', styles: { fontStyle: 'bold' } },
          { content: v.propietarioOConductor, colSpan: 3, styles: {} },
        ]);
        bodyRows.push([
          { content: 'CIRCULACIÓN:', styles: { fontStyle: 'bold' } },
          { content: v.circulacion, colSpan: 3, styles: {} },
        ]);
        bodyRows.push([
          { content: 'ZONA DE CONTACTO:', styles: { fontStyle: 'bold' } },
          { content: v.zonaContacto, colSpan: v.lesiones ? 1 : 3, styles: {} },
          ...(v.lesiones ? [
            { content: 'LESIONES:', styles: { fontStyle: 'bold' } },
            { content: v.lesiones, styles: { fontStyle: 'bold', textColor: [180, 30, 30] } }
          ] : [])
        ]);
      });
    }

    // Síntesis del Hecho y Labor Criminalística
    bodyRows.push([
      { content: 'SÍNTESIS DEL HECHO', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY } },
    ]);
    bodyRows.push([
      { content: interv.sintesisHecho || 'Sin síntesis registrada.', colSpan: 4, styles: { cellPadding: 2 } },
    ]);
    bodyRows.push([
      { content: 'LABOR CRIMINALÍSTICA', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY } },
    ]);
    bodyRows.push([
      { content: interv.laborCriminalistica || 'Sin labor criminalística descripta.', colSpan: 4, styles: { cellPadding: 2 } },
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          { content: nroItem, styles: { halign: 'center', fontStyle: 'bold', cellWidth: 16, fillColor: POLICE_NAVY, textColor: [255, 255, 255] } },
          { content: headerTitle, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontSize: 8.5 } },
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 1.5, lineColor: POLICE_BORDER, lineWidth: 0.2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  });

  // SECCIÓN OFICIAL AL FINAL: DIVISIÓN CIBERCRIMEN
  if (parte.cibercrimenRegistros && parte.cibercrimenRegistros.length > 0) {
    if (currentY > 195) {
      doc.addPage();
      currentY = drawPoliceHeader(doc, config, 'PARTE DE NOVEDADES DE GUARDIA (CONTINUACIÓN)', 10);
    }

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'DIVISIÓN CIBERCRIMEN',
            colSpan: 4,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [30, 27, 75],
              textColor: [255, 255, 255],
              fontSize: 9.5,
              cellPadding: 2.2,
            },
          },
        ],
        [
          {
            content: 'REGISTRO DE ACTUACIONES, RESGUARDO DE EVIDENCIA Y TAREAS PERICIALES INFORMÁTICAS',
            colSpan: 4,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [240, 243, 250],
              textColor: [30, 27, 75],
              fontSize: 8,
              cellPadding: 1.5,
            },
          },
        ],
      ],
      body: [],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: POLICE_BORDER, lineWidth: 0.2 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 2.5;

    parte.cibercrimenRegistros.forEach((ciber, cIdx) => {
      if (currentY > 215) {
        doc.addPage();
        currentY = drawPoliceHeader(doc, config, 'PARTE DE NOVEDADES DE GUARDIA - DIVISIÓN CIBERCRIMEN', 10);
      }

      const ciberRows: any[] = [
        [
          { content: 'HORA:', styles: { fontStyle: 'bold', cellWidth: 26 } },
          { content: `${ciber.horaRegistro || '---'} hs.`, styles: { fontStyle: 'bold', cellWidth: 64 } },
          { content: 'PERSONAL A CARGO:', styles: { fontStyle: 'bold', cellWidth: 40 } },
          { content: ciber.personalACargo, styles: { fontStyle: 'bold', cellWidth: 52 } },
        ],
        [
          { content: 'DEPENDENCIA:', styles: { fontStyle: 'bold' } },
          { content: ciber.dependenciaSolicitante, colSpan: 3, styles: {} },
        ],
        [
          { content: 'TAREA REALIZADA:', styles: { fontStyle: 'bold' } },
          {
            content: ciber.tareaRealizada === 'Otro' ? ciber.otraTarea || 'Otro' : ciber.tareaRealizada,
            styles: { fontStyle: 'bold', textColor: [30, 27, 75] },
          },
          { content: 'PERSONA / DNI:', styles: { fontStyle: 'bold' } },
          {
            content: ciber.apellidoYNombre ? `${ciber.apellidoYNombre} (DNI: ${ciber.dni || '---'})` : 'Sin datos de persona / causante',
            styles: {},
          },
        ],
      ];

      if (ciber.conPersonalPolicialInvolucrado) {
        const ppiTxt = `SÍ: ${ciber.personalPolicial?.jerarquia || ''} (Plaza: ${ciber.personalPolicial?.plaza || 's/p'}) - Destino: ${ciber.personalPolicial?.destino || '---'} - ${ciber.personalPolicial?.unidadRegional || ''}`;
        ciberRows.push([
          { content: 'PERSONAL POLICIAL INVOLUCRADO (PPI):', colSpan: 2, styles: { fontStyle: 'bold', textColor: [180, 30, 30] } },
          { content: ppiTxt, colSpan: 2, styles: { fontStyle: 'bold' } },
        ]);
      }

      // Resumen de la Tarea Realizada
      ciberRows.push([
        {
          content: 'RESUMEN DE LA TAREA REALIZADA',
          colSpan: 4,
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [243, 244, 246], textColor: [30, 27, 75] },
        },
      ]);
      ciberRows.push([
        {
          content: ciber.resumenTarea || 'Sin resumen registrado.',
          colSpan: 4,
          styles: { cellPadding: 2.2, fontStyle: 'normal' },
        },
      ]);

      if (ciber.observaciones) {
        ciberRows.push([
          { content: 'OBSERVACIONES:', styles: { fontStyle: 'bold' } },
          { content: ciber.observaciones, colSpan: 3, styles: {} },
        ]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [
          [
            {
              content: String(cIdx + 1).padStart(2, '0'),
              styles: { halign: 'center', fontStyle: 'bold', cellWidth: 16, fillColor: [49, 46, 129], textColor: [255, 255, 255] },
            },
            {
              content: `ACTUACIÓN CIBERCRIMEN Nº ${String(cIdx + 1).padStart(2, '0')} - ${(ciber.tareaRealizada === 'Otro' ? ciber.otraTarea || 'OTRO' : ciber.tareaRealizada).toUpperCase()}`,
              colSpan: 3,
              styles: { halign: 'center', fontStyle: 'bold', fillColor: [49, 46, 129], textColor: [255, 255, 255], fontSize: 8.5 },
            },
          ],
        ],
        body: ciberRows,
        theme: 'grid',
        styles: { fontSize: 7.8, cellPadding: 1.5, lineColor: POLICE_BORDER, lineWidth: 0.2 },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 3.5;
    });
  }

  // Firma oficial exclusiva del Jefe (Ubicada a la derecha)
  if (currentY > 235) {
    doc.addPage();
    currentY = 40;
  }
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(125, currentY + 14, 185, currentY + 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('JEFE DE DIVISIÓN / UNIDAD', 155, currentY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma, Aclaración y Sello Oficial', 155, currentY + 22, { align: 'center' });

  drawPoliceFooter(doc, config);

  const filename = `Parte_Guardia_${parte.grupoGuardia.replace(/\s+/g, '_')}_${parte.fechaInicio}.pdf`;
  if (!previewOnly) {
    doc.save(filename);
  }

  return doc.output('bloburl').toString();
}

/**
 * 2. LIBRO DE REGISTRO DE EXPEDIENTES JUDICIALES
 */
export function generarPdfLibroExpedientes(
  expedientes: ExpedienteJudicial[],
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje para mayor amplitud
  const currentY = drawPoliceHeader(
    doc,
    config,
    'LIBRO DE REGISTRO GENERAL DE EXPEDIENTES JUDICIALES Y OFICIOS',
    10
  );

  const tableData = expedientes.map((exp, idx) => {
    // Si es Resguardo de Evidencia, especificar cantidad de personas
    let cantPersonas = '';
    if (exp.personasVinculadas && exp.personasVinculadas.length > 0) {
      cantPersonas = `\n(${exp.personasVinculadas.length} pers. vinculadas)`;
    }

    const ppiTexto = exp.ppi?.tienePPI
      ? `SÍ: ${exp.ppi.jerarquia || ''} ${exp.ppi.apellidoYNombre || ''} (DNI ${exp.ppi.dni || ''})`
      : 'NO';

    return [
      idx + 1,
      exp.fechaRegistro,
      exp.nroOficioLetras || '---',
      exp.nroExpediente || '---',
      exp.caratulaOrigen || '---',
      exp.dependenciaSolicitante || '---',
      `${exp.tipoRequerimiento}${cantPersonas}`,
      ppiTexto,
      exp.estadoEntrega === 'Entregado'
        ? `Entregado (${exp.fechaElevacion || 's/f'})`
        : 'Pendiente',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'N°',
      'Fecha',
      'N° Oficio / Letras',
      'N° Expediente',
      'Carátula / Origen',
      'Dependencia Solicitante',
      'Tipo Requerimiento',
      'PPI',
      'Estado Elevación'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: [200, 210, 225], lineWidth: 0.1 },
    margin: { left: 10, right: 10 },
  });

  // Firma oficial exclusiva del Jefe (A la derecha)
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < 185) {
    doc.setDrawColor(50, 60, 75);
    doc.setLineWidth(0.4);
    doc.line(220, finalY + 10, 285, finalY + 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('JEFE DE DIVISIÓN / UNIDAD', 252.5, finalY + 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Firma, Aclaración y Sello Oficial', 252.5, finalY + 19, { align: 'center' });
  }

  drawPoliceFooter(doc, config);
  doc.save(`Libro_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 3. FICHA TÉCNICA VEHICULAR CON FILTRO MODAL DE SECCIONES Y FECHAS DE REPARACIONES
 */
export interface OpcionesFichaVehicular {
  incluirIdentificacion: boolean;
  incluirCondicion: boolean;
  incluirService: boolean;
  incluirRtoYSeguro: boolean;
  incluirReparaciones: boolean;
  incluirFirma: boolean;
  periodoReparaciones: 'todas' | 'semanal' | 'mensual' | 'anual' | 'rango';
  fechaDesde?: string;
  fechaHasta?: string;
}

export function generarPdfFichaTecnicaVehicular(
  movil: MovilPolicial,
  todasReparaciones: ReparacionMecanica[],
  opciones: OpcionesFichaVehicular,
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    'FICHA TÉCNICA VEHICULAR',
    10
  );

  // Filtrado de reparaciones según el período
  let reparacionesFiltradas = todasReparaciones.filter((r) => r.movilId === movil.id);
  const now = new Date();

  if (opciones.periodoReparaciones === 'semanal') {
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(now.getDate() - 7);
    reparacionesFiltradas = reparacionesFiltradas.filter((r) => new Date(r.fecha) >= haceUnaSemana);
  } else if (opciones.periodoReparaciones === 'mensual') {
    const mesActual = now.getMonth();
    const anioActual = now.getFullYear();
    reparacionesFiltradas = reparacionesFiltradas.filter((r) => {
      const d = new Date(r.fecha);
      return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });
  } else if (opciones.periodoReparaciones === 'anual') {
    const anioActual = now.getFullYear();
    reparacionesFiltradas = reparacionesFiltradas.filter((r) => new Date(r.fecha).getFullYear() === anioActual);
  } else if (opciones.periodoReparaciones === 'rango' && opciones.fechaDesde && opciones.fechaHasta) {
    const desde = new Date(opciones.fechaDesde);
    const hasta = new Date(opciones.fechaHasta);
    reparacionesFiltradas = reparacionesFiltradas.filter((r) => {
      const d = new Date(r.fecha);
      return d >= desde && d <= hasta;
    });
  }

  const HEADER_FILL: [number, number, number] = [239, 246, 255]; // Azul claro de la imagen
  const HEADER_TEXT: [number, number, number] = [23, 37, 84]; // Azul marino oscuro
  const HEADER_BORDER: [number, number, number] = [191, 219, 254]; // Borde celeste

  // I. IDENTIFICACIÓN Y DATOS REGISTRALES
  if (opciones.incluirIdentificacion) {
    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'I. IDENTIFICACIÓN Y DATOS REGISTRALES',
            colSpan: 4,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
      ],
      body: [
        [
          { content: 'Interno Policial:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: `N° ${movil.nroMovilInterno}`, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: 'Dominio (Patente):', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.dominioPatente, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        ],
        [
          { content: 'Tipo de Móvil:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.tipo },
          { content: 'Año / Modelo:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: String(movil.anioModelo || '2022') },
        ],
        [
          { content: 'Marca:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.marca },
          { content: 'Modelo:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.modelo },
        ],
        [
          { content: 'Chasis N°:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.chasisNro || '8CHMD3410LP006518', styles: { fontStyle: 'normal' } },
          { content: 'Motor N°:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.motorNro || 'MD34EL007923', styles: { fontStyle: 'normal' } },
        ],
        [
          { content: 'Dependencia Asig.:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.dependenciaAsignada || config.dependencia || 'Delegación Policía Científica Laguna Blanca', colSpan: 3 },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 3;
  }

  // II. ESTADO OPERATIVO Y CONDICIÓN MECÁNICA
  if (opciones.incluirCondicion) {
    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'II. ESTADO OPERATIVO Y CONDICIÓN MECÁNICA',
            colSpan: 4,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
      ],
      body: [
        [
          { content: 'Estado de Revista:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.estadoOperativo.toUpperCase(), styles: { fontStyle: 'bold', textColor: movil.estadoOperativo === 'En Servicio' ? [22, 101, 52] : [185, 28, 28] } },
          { content: 'Condición General:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.condicionGeneral.toUpperCase(), styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 3;
  }

  // III. MANTENIMIENTO PREVENTIVO (SERVICE)
  if (opciones.incluirService) {
    const kmRestantes = movil.proximoServiceKm - movil.kilometrajeActual;
    const faltanText = kmRestantes > 0
      ? `Faltan ${kmRestantes.toLocaleString('es-AR')} Km para el próximo servis (Faltan: ${kmRestantes.toLocaleString('es-AR')} Km)`
      : `¡Service vencido por ${Math.abs(kmRestantes).toLocaleString('es-AR')} Km!`;

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'III. MANTENIMIENTO PREVENTIVO (SERVICE)',
            colSpan: 4,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
      ],
      body: [
        [
          { content: 'Odómetro Actual:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: `${movil.kilometrajeActual.toLocaleString('es-AR')} Km`, styles: { fontStyle: 'bold' } },
          { content: 'Próximo Service (+3000):', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: `${movil.proximoServiceKm.toLocaleString('es-AR')} Km`, styles: { fontStyle: 'bold' } },
        ],
        [
          { content: 'Último Service:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.ultimoServiceFecha || '15/09/2026' },
          { content: 'Km Último Service:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: `${movil.ultimoServiceKm.toLocaleString('es-AR')} Km` },
        ],
        [
          { content: 'Diagnóstico Service:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          {
            content: faltanText,
            colSpan: 3,
            styles: {
              fontStyle: 'bold',
              textColor: kmRestantes > 0 ? [21, 128, 61] : [185, 28, 28],
            },
          },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 1.5;

    // Barra gráfica de progreso de service idéntica a la imagen
    const barWidth = 182;
    const barHeight = 2.4;
    const progressPercent = Math.min(
      1,
      Math.max(
        0.1,
        (movil.kilometrajeActual - movil.ultimoServiceKm) /
          Math.max(1, movil.proximoServiceKm - movil.ultimoServiceKm)
      )
    );
    doc.setFillColor(238, 242, 255); // Fondo azul muy claro
    doc.roundedRect(14, currentY, barWidth, barHeight, 1.2, 1.2, 'F');
    doc.setFillColor(37, 99, 235); // Barra azul cargada
    doc.roundedRect(14, currentY, barWidth * progressPercent, barHeight, 1.2, 1.2, 'F');
    currentY += 4.5;
  }

  // IV. VERIFICACIÓN TÉCNICA VEHICULAR (RTO / VTV)
  if (opciones.incluirRtoYSeguro) {
    const rtoText = movil.tipo === 'Motovehículo'
      ? 'No exigible para este tipo de vehículo (Motocicleta)'
      : `Vencimiento RTO/VTV: ${movil.vencimientoRTO || '15/10/2027'} (Al día)`;

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'IV. VERIFICACIÓN TÉCNICA VEHICULAR (RTO / VTV)',
            colSpan: 2,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
      ],
      body: [
        [
          { content: rtoText, colSpan: 2, styles: { textColor: [51, 65, 85] } },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 3;

    // V. PÓLIZA Y COBERTURA DE SEGURO AUTOMOTOR
    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'V. PÓLIZA Y COBERTURA DE SEGURO AUTOMOTOR',
            colSpan: 4,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
      ],
      body: [
        [
          { content: 'Aseguradora:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.aseguradora || 'La Caja' },
          { content: 'Póliza N°:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.nroPoliza || '51900187668' },
        ],
        [
          { content: 'Vencimiento Seguro:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
          { content: movil.vencimientoSeguro || '13/10/2026', colSpan: 3 },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 3;
  }

  // VI. HISTORIAL DE REPARACIONES Y MANTENIMIENTO CORRECTIVO
  if (opciones.incluirReparaciones) {
    const rowsRep = reparacionesFiltradas.map((r) => [
      r.fecha,
      `[${r.tipoIntervencion}] ${r.descripcion}`,
      r.repuestosCambiados || r.descripcion,
      `${r.tallerProveedor} [Reparado] $${r.costoPresupuesto.toLocaleString('es-AR')}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          {
            content: 'VI. HISTORIAL DE REPARACIONES Y MANTENIMIENTO CORRECTIVO',
            colSpan: 4,
            styles: {
              fillColor: HEADER_FILL,
              textColor: HEADER_TEXT,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: HEADER_BORDER,
            },
          },
        ],
        ['Fecha', 'Avería / Novedad', 'Reparación / Solución', 'Taller / Estado'],
      ],
      body:
        rowsRep.length > 0
          ? rowsRep
          : [
              [
                {
                  content: 'Sin reparaciones mecánicas registradas en el período seleccionado.',
                  colSpan: 4,
                  styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 116, 139] },
                },
              ],
            ],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.15 },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 3;
  }

  // VII. OBSERVACIONES GENERALES Y NOVEDADES
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: 'VII. OBSERVACIONES GENERALES Y NOVEDADES',
          colSpan: 2,
          styles: {
            fillColor: HEADER_FILL,
            textColor: HEADER_TEXT,
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: HEADER_BORDER,
          },
        },
      ],
    ],
    body: [
      [
        {
          content: movil.observaciones || 'Sin observaciones mecánicas registradas a la fecha.',
          colSpan: 2,
          styles: { textColor: [51, 65, 85], fontStyle: 'normal' },
        },
      ],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Firma oficial exclusiva del Jefe (A la derecha)
  if (opciones.incluirFirma) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 40;
    }
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.4);
    doc.line(125, currentY + 14, 185, currentY + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('JEFE DE DIVISIÓN / UNIDAD', 155, currentY + 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Firma, Aclaración y Sello Oficial', 155, currentY + 22, { align: 'center' });
  }

  drawPoliceFooter(doc, config);
  doc.save(`Ficha_Tecnica_Movil_${movil.nroMovilInterno}_${movil.dominioPatente}.pdf`);
}

/**
 * 4. PLANILLA OFICIAL DE RECARGOS OPERATIVOS PARA FIRMA
 */
export function generarPdfPlanillaRecargos(
  recargos: RecargoOperativo[],
  personalMap: Map<string, Personal>,
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const currentY = drawPoliceHeader(
    doc,
    config,
    'PLANILLA OFICIAL DE LIQUIDACIÓN Y CUMPLIMIENTO DE RECARGOS DE SERVICIO',
    10
  );

  const tableRows: any[] = [];
  let index = 1;

  recargos.forEach((rec) => {
    rec.personalIds.forEach((pid) => {
      const p = personalMap.get(pid);
      tableRows.push([
        index++,
        rec.fecha,
        p ? `${p.jerarquia} ${p.apellidoYNombre}` : 'No encontrado',
        p ? p.dni : '---',
        p ? p.plaza : '---',
        rec.tipoRecargo,
        rec.lugarCobertura,
        `${rec.horaDesde} a ${rec.horaHasta} (${rec.horasCalculadas} hs)`,
        rec.seEncuentraDeGuardia ? 'SÍ' : 'NO',
        rec.estado,
        '____________________', // Espacio para firma
      ]);
    });
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'N°',
      'Fecha',
      'Personal Policial',
      'DNI',
      'Plaza',
      'Tipo de Recargo',
      'Lugar de Cobertura',
      'Horario / Horas',
      'De Guardia',
      'Estado',
      'Firma Efectivo'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.6, lineColor: [200, 210, 225], lineWidth: 0.1 },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < 185) {
    doc.setDrawColor(50, 60, 75);
    doc.setLineWidth(0.4);
    doc.line(220, finalY + 10, 285, finalY + 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('JEFE DE DIVISIÓN / UNIDAD', 252.5, finalY + 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Firma, Aclaración y Sello Oficial', 252.5, finalY + 19, { align: 'center' });
  }

  drawPoliceFooter(doc, config);
  doc.save(`Planilla_Recargos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 5. LEGAJO INDIVIDUAL DE PERSONAL POLICIAL
 */
export function generarPdfLegajoPersonal(
  personal: Personal,
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    `LEGAJO POLICIAL INDIVIDUAL - ${personal.jerarquia.toUpperCase()} ${personal.apellidoYNombre.toUpperCase()}`,
    12
  );

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'DATOS PERSONALES Y SITUACIÓN DE REVISTA', colSpan: 4, styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [
      [
        { content: 'APELLIDO Y NOMBRE:', styles: { fontStyle: 'bold' } },
        { content: personal.apellidoYNombre },
        { content: 'JERARQUÍA:', styles: { fontStyle: 'bold' } },
        { content: personal.jerarquia, styles: { fontStyle: 'bold', textColor: POLICE_NAVY } },
      ],
      [
        { content: 'DNI / SEXO:', styles: { fontStyle: 'bold' } },
        { content: `${personal.dni} / ${personal.sexo}` },
        { content: 'PLAZA / LEGAJO:', styles: { fontStyle: 'bold' } },
        { content: personal.plaza },
      ],
      [
        { content: 'ESTADO DE REVISTA:', styles: { fontStyle: 'bold' } },
        { content: personal.estado, styles: { fontStyle: 'bold', textColor: personal.estado === 'Activo' ? [22, 101, 52] : [185, 28, 28] } },
        { content: 'SECCIÓN / GRUPO:', styles: { fontStyle: 'bold' } },
        { content: personal.seccionGrupo },
      ],
      [
        { content: 'FECHA NACIMIENTO:', styles: { fontStyle: 'bold' } },
        { content: personal.fechaNacimiento || '---' },
        { content: 'ESTADO CIVIL:', styles: { fontStyle: 'bold' } },
        { content: personal.estadoCivil || '---' },
      ],
      [
        { content: 'DOMICILIO:', styles: { fontStyle: 'bold' } },
        { content: personal.domicilio || '---', colSpan: 3 },
      ],
      [
        { content: 'TELÉFONO / EMAIL:', styles: { fontStyle: 'bold' } },
        { content: `${personal.telefono}  |  ${personal.email}`, colSpan: 3 },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'LICENCIA DE CONDUCIR Y COBERTURA MÉDICA', colSpan: 4, styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [
      [
        { content: 'LICENCIA DE CONDUCIR N°:', styles: { fontStyle: 'bold' } },
        { content: personal.licenciaNro || 'Sin registrar' },
        { content: 'CATEGORÍA / VTO:', styles: { fontStyle: 'bold' } },
        { content: `${personal.licenciaCategoria || '---'} (Vto: ${personal.licenciaVencimiento || '---'})` },
      ],
      [
        { content: 'OBRA SOCIAL N°:', styles: { fontStyle: 'bold' } },
        { content: personal.obraSocialNro || '---' },
        { content: 'CREDENCIAL POLICIAL N°:', styles: { fontStyle: 'bold' } },
        { content: personal.credencialNro || '---' },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Equipamiento a Cargo: Armamento y Chaleco Balístico (Con verificación de retención)
  const arm = personal.armamento;
  const chal = personal.chaleco;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'EQUIPAMIENTO POLICIAL PROVISTO A CARGO', colSpan: 4, styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [
      [
        { content: 'ARMAMENTO:', styles: { fontStyle: 'bold' } },
        { content: `${arm.marca} ${arm.modelo} Cal. ${arm.calibre} - Serie N°: ${arm.serieNro}` },
        { content: 'ESTADO ARMA:', styles: { fontStyle: 'bold' } },
        {
          content: arm.secuestradoORetenido ? `RETENIDA/SECUESTRADA: ${arm.causaSecuestro || 'Sin causa especificada'}` : 'VIGENTE EN PODER DEL EFECTIVO',
          styles: { fontStyle: 'bold', textColor: arm.secuestradoORetenido ? [185, 28, 28] : [22, 101, 52] },
        },
      ],
      [
        { content: 'CHALECO BALÍSTICO:', styles: { fontStyle: 'bold' } },
        { content: `Serie N°: ${chal.serieNro} - Talla: ${chal.talla}` },
        { content: 'ESTADO CHALECO:', styles: { fontStyle: 'bold' } },
        {
          content: chal.secuestradoORetenido ? `RETENIDO: ${chal.causaSecuestro || 'Sin causa'}` : 'VIGENTE ASIGNADO',
          styles: { fontStyle: 'bold', textColor: chal.secuestradoORetenido ? [185, 28, 28] : [22, 101, 52] },
        },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  // Firma oficial exclusiva de la persona que se registra (A la derecha)
  let finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY > 230) {
    doc.addPage();
    finalY = 40;
  }
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(115, finalY + 16, 190, finalY + 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 38, 77);
  doc.text(`${personal.jerarquia.toUpperCase()} ${personal.apellidoYNombre.toUpperCase()}`, 152.5, finalY + 21, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`D.N.I. N° ${personal.dni} - Plaza/Legajo N° ${personal.plaza || 'S/D'}`, 152.5, finalY + 25, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.text('Firma y Aclaración de la Persona / Efectivo Registrado', 152.5, finalY + 29, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Legajo_${personal.dni}_${personal.apellidoYNombre.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 6. REPORTE EJECUTIVO DE GESTIÓN Y ESTADÍSTICAS
 */
export function generarPdfReporteEjecutivo(
  stats: {
    totalPersonalActivo: number;
    personalLicencia: number;
    expedientesPeriodo: number;
    faltaOficio: number;
    ppiCount: number;
    movilesOperativos: number;
    movilesTaller: number;
    resguardoTotalPersonas: number;
    periodoNombre: string;
    tareasDistribucion: { name: string; count: number }[];
    dependenciasDistribucion: { name: string; count: number }[];
  },
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    `REPORTE OFICIAL RÁPIDO DE GESTIÓN POLICIAL - ${stats.periodoNombre.toUpperCase()}`,
    12
  );

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'INDICADORES CLAVE DE RENDIMIENTO OPERATIVO (KPIS)', colSpan: 2, styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [
      ['Total Personal de Planta Activo', `${stats.totalPersonalActivo} efectivos`],
      ['Personal en Uso de Licencia (Médica / Anual)', `${stats.personalLicencia} efectivos`],
      ['Expedientes Judiciales Tramitados en Período', `${stats.expedientesPeriodo} causas`],
      ['Intervenciones Urgentes sin Oficio Formal (Falta de Oficio)', `${stats.faltaOficio} casos`],
      ['Causas Judiciales con Personal Policial Involucrado (PPI)', `${stats.ppiCount} causas`],
      ['Parque Automotor Operativo vs Taller', `${stats.movilesOperativos} operativos / ${stats.movilesTaller} en taller`],
      ['Total Personas en Resguardo de Evidencia (Regla de Conteo)', `${stats.resguardoTotalPersonas} personas vinculadas`],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'DISTRIBUCIÓN POR TAREA OPERATIVA / REQUERIMIENTO', colSpan: 2, styles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' } }]],
    body: stats.tareasDistribucion.map((t) => [t.name, `${t.count} intervenciones/personas`]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'DISTRIBUCIÓN POR DEPENDENCIA JUDICIAL / SOLICITANTE', colSpan: 2, styles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' } }]],
    body: stats.dependenciasDistribucion.map((d) => [d.name, `${d.count} requerimientos`]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  // Firma oficial exclusiva del Jefe (A la derecha)
  let finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY > 235) {
    doc.addPage();
    finalY = 40;
  }
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(125, finalY + 14, 185, finalY + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('JEFE DE DIVISIÓN / UNIDAD', 155, finalY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma, Aclaración y Sello Oficial', 155, finalY + 22, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Reporte_Gestion_${stats.periodoNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 7. ACTA OFICIAL DE INSPECCIÓN OCULAR (I.O.)
 */
export function generarPdfInspeccionOcular(
  io: any,
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    `ACTA OFICIAL DE INSPECCIÓN OCULAR - ${io.nroIO}`,
    12
  );

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'DATOS DE LA INSPECCIÓN OCULAR PERICIAL', colSpan: 4, styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' } }]],
    body: [
      [
        { content: 'N° INSPECCIÓN OCULAR:', styles: { fontStyle: 'bold' } },
        { content: io.nroIO, styles: { fontStyle: 'bold', textColor: POLICE_NAVY } },
        { content: 'TIPO DE INSPECCIÓN:', styles: { fontStyle: 'bold' } },
        { content: io.tipo },
      ],
      [
        { content: 'FECHA Y HORA:', styles: { fontStyle: 'bold' } },
        { content: `${io.fecha} a las ${io.hora} hs.` },
        { content: 'CANTIDAD FOTOGRAFÍAS:', styles: { fontStyle: 'bold' } },
        { content: `${io.cantidadFotografias} tomas fotográficas` },
      ],
      [
        { content: 'LUGAR OCURRIDO:', styles: { fontStyle: 'bold' } },
        { content: io.lugar, colSpan: 3 },
      ],
      [
        { content: 'DEPENDENCIA SOLICITANTE:', styles: { fontStyle: 'bold' } },
        { content: io.dependenciaSolicitante, colSpan: 3 },
      ],
      [
        { content: 'EXPEDIENTE / CAUSA:', styles: { fontStyle: 'bold' } },
        { content: io.expedienteVinculado || 'Sin expediente formal vinculado aún', colSpan: 3 },
      ],
      [
        { content: 'PERSONAL TÉCNICO INTERVINIENTE:', styles: { fontStyle: 'bold' } },
        { content: io.personalInterviniente || 'Personal Pericial de Guardia', colSpan: 3 },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'DESCRIPCIÓN DE LA ESCENA Y RELEVAMIENTO OCULAR', colSpan: 1, styles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' } }]],
    body: [
      [{ content: io.resumen || 'Sin descripción.', styles: { cellPadding: 3, fontSize: 8.5 } }],
    ],
    theme: 'grid',
    styles: { lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  if (io.conclusiones) {
    autoTable(doc, {
      startY: currentY,
      head: [[{ content: 'CONCLUSIONES PERICIALES PRELIMINARES', colSpan: 1, styles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' } }]],
      body: [
        [{ content: io.conclusiones, styles: { cellPadding: 3, fontSize: 8.5 } }],
      ],
      theme: 'grid',
      styles: { lineColor: POLICE_BORDER, lineWidth: 0.2 },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  } else {
    currentY += 12;
  }

  // Firma oficial exclusiva del Jefe (A la derecha)
  if (currentY > 230) {
    doc.addPage();
    currentY = 40;
  }
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(125, currentY + 15, 185, currentY + 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('JEFE DE DIVISIÓN / UNIDAD', 155, currentY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma, Aclaración y Sello Oficial', 155, currentY + 24, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Inspeccion_Ocular_${io.nroIO.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

/**
 * 8. REPORTE ESTADÍSTICO DE INSPECCIONES OCULARES POR TIPO
 */
export function generarPdfReporteInspeccionesOcularesPorTipo(
  inspecciones: InspeccionOcular[],
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    'REPORTE OFICIAL DE INSPECCIONES OCULARES PERICIALES POR TIPO',
    12
  );

  // Estadísticas agrupadas por Tipo
  const porTipo: Record<string, { count: number; fotos: number }> = {};
  let totalFotos = 0;

  inspecciones.forEach((io) => {
    const t = io.tipo || 'Otras';
    if (!porTipo[t]) {
      porTipo[t] = { count: 0, fotos: 0 };
    }
    porTipo[t].count += 1;
    porTipo[t].fotos += io.cantidadFotografias || 0;
    totalFotos += io.cantidadFotografias || 0;
  });

  const resumenFilas = Object.entries(porTipo).map(([tipo, data]) => [
    tipo,
    `${data.count} actas`,
    `${data.fotos} fotos`,
    `${Math.round((data.count / (inspecciones.length || 1)) * 100)} %`,
  ]);

  // Tabla Resumen por Tipo
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: `RESUMEN GENERAL: ${inspecciones.length} INSPECCIONES OCULARES (${totalFotos} FOTOGRAFÍAS RELEVADAS)`,
          colSpan: 4,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
      ['Tipo de Inspección Ocular', 'Total Actas', 'Fotografías Periciales', 'Proporción'],
    ],
    body:
      resumenFilas.length > 0
        ? resumenFilas
        : [['Sin inspecciones registradas', '0', '0', '0%']],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Tabla Detallada de Inspecciones
  const detalleFilas = inspecciones.map((io, idx) => [
    idx + 1,
    io.nroIO,
    `${io.fecha}\n${io.hora} hs`,
    io.tipo,
    io.lugar,
    io.dependenciaSolicitante,
    `${io.cantidadFotografias} f.`,
    io.resumen || '---',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: 'NÓMINA DETALLADA DE INSPECCIONES OCULARES REALIZADAS',
          colSpan: 8,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
      ['N°', 'N° I.O.', 'Fecha/Hora', 'Tipo', 'Lugar', 'Dependencia Solicitante', 'Fotos', 'Resumen / Hecho'],
    ],
    body:
      detalleFilas.length > 0
        ? detalleFilas
        : [['---', 'Sin inspecciones registradas', '', '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 22 },
      3: { cellWidth: 24 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
      6: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 'auto' },
    },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY > 235) {
    doc.addPage();
  }
  const firmaY = finalY > 235 ? 40 : finalY;
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(125, firmaY + 15, 185, firmaY + 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('JEFE DE DIVISIÓN / UNIDAD', 155, firmaY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma, Aclaración y Sello Oficial', 155, firmaY + 24, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Reporte_Inspecciones_Oculares_Por_Tipo_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 9. FORMULARIO OFICIAL EN BLANCO PARA REGISTRO DE PERSONAL A MANO
 * Diseñado con renglones de llenado manual y firma del nuevo personal en el LADO IZQUIERDO.
 */
export function generarPdfFormularioRegistroMano(config: ConfiguracionSistema) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = drawPoliceHeader(
    doc,
    config,
    'FORMULARIO OFICIAL DE DECLARACIÓN JURADA E INSCRIPCIÓN DE PERSONAL',
    12
  );

  // Cuadro informativo superior
  autoTable(doc, {
    startY: currentY,
    body: [
      [
        {
          content:
            'INSTRUCCIONES DE LLENADO: El presente formulario debe ser completado a mano con letra imprenta clara, legible y tinta indeleble (azul o negra). Los datos consignados tienen carácter de Declaración Jurada oficial ante la Institución Policial.',
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            fillColor: [241, 245, 249],
            textColor: [30, 41, 59],
            fontStyle: 'italic',
          },
        },
      ],
    ],
    theme: 'grid',
    styles: { lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECCIÓN 1: DATOS PERSONALES Y FILIATORIOS
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: '1. DATOS DE IDENTIFICACIÓN PERSONAL Y DOMICILIO (LLENADO A MANO)',
          colSpan: 2,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
    ],
    body: [
      [
        { content: 'APELLIDO Y NOMBRES COMPLETOS:\n\n____________________________________________________________________', styles: { cellPadding: 2.5 } },
        { content: 'D.N.I. N°:\n\n[   ][   ] . [   ][   ][   ] . [   ][   ][   ]', styles: { cellPadding: 2.5 } },
      ],
      [
        { content: 'SEXO:    [   ] Masculino (M)        [   ] Femenino (F)        [   ] Otro', styles: { cellPadding: 2.2 } },
        { content: 'FECHA DE NACIMIENTO:   ______ / ______ / ____________', styles: { cellPadding: 2.2 } },
      ],
      [
        { content: 'ESTADO CIVIL:   [   ] Soltero/a      [   ] Casado/a      [   ] Conviviente      [   ] Divorciado/a      [   ] Viudo/a', colSpan: 2, styles: { cellPadding: 2.2 } },
      ],
      [
        { content: 'DOMICILIO REAL:\n\nCalle / Ruta: ___________________________________________  N°: _________  Piso/Dpto: _________\n\nBarrio: ________________________________  Localidad / Depto: ________________________________', colSpan: 2, styles: { cellPadding: 2.5 } },
      ],
      [
        { content: 'TELÉFONO DE CONTACTO / CELULAR:\n\n________________________________________________________', styles: { cellPadding: 2.5 } },
        { content: 'CORREO ELECTRÓNICO:\n\n________________________________________________________', styles: { cellPadding: 2.5 } },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECCIÓN 2: SITUACIÓN DE REVISTA Y DESTINO
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: '2. DATOS DE REVISTA Y DESTINO POLICIAL',
          colSpan: 2,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
    ],
    body: [
      [
        { content: 'JERARQUÍA POLICIAL ACTUAL:\n\n________________________________________________________', styles: { cellPadding: 2.5 } },
        { content: 'N° DE PLAZA / N° DE LEGAJO PERSONAL:\n\n________________________________________________________', styles: { cellPadding: 2.5 } },
      ],
      [
        { content: 'SECCIÓN / GRUPO DE GUARDIA ASIGNADO:\n\n________________________________________________________', styles: { cellPadding: 2.5 } },
        { content: 'SITUACIÓN DE REVISTA:\n\n[   ] ACTIVO      [   ] EN COMISIÓN      [   ] LICENCIA      [   ] OTRO', styles: { cellPadding: 2.5 } },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECCIÓN 3: HABILITACIONES Y COBERTURA MÉDICA
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: '3. HABILITACIÓN DE CONDUCIR Y COBERTURA MÉDICA',
          colSpan: 3,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
    ],
    body: [
      [
        { content: 'LICENCIA DE CONDUCIR N°:\n\n______________________________' },
        { content: 'CATEGORÍA / CLASES:\n\n______________________________' },
        { content: 'VENCIMIENTO LICENCIA:\n\n______ / ______ / ____________' },
      ],
      [
        { content: 'OBRA SOCIAL (N° AFILIADO):\n\n______________________________' },
        { content: 'CREDENCIAL POLICIAL N°:\n\n______________________________', colSpan: 2 },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECCIÓN 4: EQUIPAMIENTO POLICIAL PROVISTO A CARGO
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: '4. EQUIPAMIENTO POLICIAL PROVISTO A CARGO (ARMAMENTO Y PROTECCIÓN BALÍSTICA)',
          colSpan: 2,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
    ],
    body: [
      [
        {
          content:
            'ARMAMENTO PROVISTO:\nMarca: ________________________________  Modelo: ________________________________\nCalibre: _______________________________  N° de Serie: ____________________________\nEstado:   [   ] Afectado en Mano / Normal         [   ] Secuestrado / Retenido por Sumario',
          styles: { cellPadding: 2.5 },
        },
        {
          content:
            'CHALECO BALÍSTICO PROVISTO:\nN° de Serie: ___________________________  Talle:  [  ] S   [  ] M   [  ] L   [  ] XL\nNivel Balístico: ________________________  Fecha Vto: ______ / ______ / ____________\nEstado:   [   ] Normal / En poder                  [   ] Retenido / En Depósito',
          styles: { cellPadding: 2.5 },
        },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // CLÁUSULA DE DECLARACIÓN JURADA
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(50, 60, 75);
  doc.text(
    'DECLARO BAJO JURAMENTO que todos los datos contenidos en el presente formulario son verídicos, exactos y completos. Asimismo, me comprometo formalmente a notificar de inmediato cualquier cambio de domicilio, contacto, habilitación o equipamiento oficial a la División Personal y Superioridad dentro del plazo reglamentario.',
    14,
    currentY,
    { maxWidth: 182, align: 'justify' }
  );

  currentY += 12;

  // FIRMA DEL NUEVO PERSONAL UBICADA ESTRICTAMENTE EN EL LADO IZQUIERDO
  // A la derecha: Espacio para recepción oficial
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);

  // Línea Izquierda: FIRMA DEL NUEVO PERSONAL
  doc.line(16, currentY + 12, 88, currentY + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 38, 77);
  doc.text('FIRMA DEL NUEVO PERSONAL', 52, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Aclaración: ____________________________________', 52, currentY + 20, { align: 'center' });
  doc.text('D.N.I. N°: _______________________________________', 52, currentY + 24, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.text('(Firma del Efectivo que se Registra - Lado Izquierdo)', 52, currentY + 28, { align: 'center' });

  // Línea Derecha: RECEPCIÓN OFICIAL
  doc.line(122, currentY + 12, 194, currentY + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('RECEPCIONADO DIVISIÓN PERSONAL / GUARDIA', 158, currentY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Firma, Aclaración y Sello de la Autoridad Receptora', 158, currentY + 20, { align: 'center' });
  doc.text('Fecha de Ingreso al Sistema: ______ / ______ / 2026', 158, currentY + 24, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Formulario_Registro_Personal_Llenado_Manual_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 10. REPORTE OFICIAL DEL MÓDULO DE ACCIDENTOLOGÍA VIAL (PERSONAL POLICIAL INVOLUCRADO)
 */
export function generarPdfReporteAccidentologia(
  registros: AccidentologiaRegistro[],
  config: ConfiguracionSistema
) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal para tabla integral
  let currentY = drawPoliceHeader(
    doc,
    config,
    'INFORME ESTADÍSTICO Y RELEVAMIENTO DE ACCIDENTOLOGÍA VIAL (PERSONAL POLICIAL INVOLUCRADO)',
    10
  );

  const filas = registros.map((r, idx) => [
    idx + 1,
    r.codigo,
    `${r.fecha}\n${r.horarioOcurrido}`,
    `${r.lugarOcurrido}\n(${r.localidad})`,
    `${r.jerarquia}\n${r.apellidoYNombre}\n(${r.destino})`,
    `${r.tipoServicio}\n(${r.situacionLaboral})`,
    `${r.tipoRodadoPolicial}\nvs\n${r.tipoRodadoOtros}`,
    `Casco: ${r.cascoPolicial}\nRol: ${r.resultadoPolicial}`,
    `${r.tipoLesiones}\nAlc: ${r.alcohotest}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        {
          content: `CONSOLIDADO OFICIAL: ${registros.length} REGISTROS DE SINIESTROS VIALES CON EFECTIVOS POLICIALES`,
          colSpan: 9,
          styles: { fillColor: POLICE_NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
        },
      ],
      [
        'N°',
        'Código',
        'Fecha / Hora',
        'Lugar y Localidad',
        'Efectivo Involucrado / Destino',
        'Servicio / Revista',
        'Rodados Involucrados',
        'Dinámica / Casco',
        'Lesiones / Alcohotest',
      ],
    ],
    body:
      filas.length > 0
        ? filas
        : [['---', 'Sin siniestros registrados', '', '', '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, lineColor: POLICE_BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: POLICE_LIGHT_BLUE, textColor: POLICE_NAVY, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, fontStyle: 'bold', textColor: POLICE_NAVY, halign: 'center' },
      2: { cellWidth: 22 },
      3: { cellWidth: 42 },
      4: { cellWidth: 50 },
      5: { cellWidth: 25 },
      6: { cellWidth: 48 },
      7: { cellWidth: 32 },
      8: { cellWidth: 34 },
    },
    margin: { left: 10, right: 10 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY > 175) {
    doc.addPage();
    finalY = 30;
  }

  // Firma oficial exclusiva del Jefe a la DERECHA
  doc.setDrawColor(50, 60, 75);
  doc.setLineWidth(0.4);
  doc.line(200, finalY + 12, 275, finalY + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('JEFE DE DIVISIÓN / UNIDAD', 237.5, finalY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma, Aclaración y Sello Oficial', 237.5, finalY + 20, { align: 'center' });

  drawPoliceFooter(doc, config);
  doc.save(`Reporte_Accidentologia_Policial_${new Date().toISOString().slice(0, 10)}.pdf`);
}

