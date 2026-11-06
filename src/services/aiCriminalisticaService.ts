/**
 * Servicio de Generación de Labor Criminalística con Inteligencia Artificial (Gemini)
 * Cumple con los requerimientos periciales oficiales:
 * 1. Fijación fotográfica panorámica y de detalle.
 * 2. Relevamiento planimétrico del lugar.
 * 3. Levantamiento de rastros con cadena de custodia.
 * Más especificaciones según el tipo de hecho (balístico, accidentológico, robo, biológico).
 */

export interface GenerarLaborParams {
  sintesisHecho: string;
  hecho: string;
  tipoIntervencion: 'Criminalística' | 'Accidentológica';
  inspeccionLugar?: string;
}

export async function generarLaborCriminalisticaConIA(params: GenerarLaborParams): Promise<string> {
  const { sintesisHecho, hecho, tipoIntervencion, inspeccionLugar } = params;

  // 1. Intentar llamar al backend proxy con Gemini 3.8 Flash
  try {
    const res = await fetch('/api/gemini/generate-labor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sintesisHecho,
        hecho,
        tipoIntervencion,
        inspeccionLugar,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.laborCriminalistica && typeof data.laborCriminalistica === 'string') {
        return data.laborCriminalistica;
      }
    }
  } catch (err) {
    console.warn('No se pudo conectar al endpoint de IA Gemini, aplicando generador pericial offline:', err);
  }

  // 2. Fallback pericial determinístico conforme protocolo oficial estricto
  const lower = sintesisHecho.toLowerCase();
  const isVial = tipoIntervencion === 'Accidentológica' || lower.includes('siniestro') || lower.includes('colisión') || lower.includes('vehículo');
  const hasArma = lower.includes('arma') || lower.includes('disparo') || lower.includes('revólver') || lower.includes('pistola') || lower.includes('bala') || lower.includes('vaina');
  const hasRobo = lower.includes('robo') || lower.includes('hurto') || lower.includes('forzamiento') || lower.includes('cerradura') || lower.includes('vidrio') || lower.includes('reja');
  const hasLesionOSangre = lower.includes('sangre') || lower.includes('herido') || lower.includes('óbito') || lower.includes('fallecido') || lower.includes('lesion');

  const puntos: string[] = [
    '1. Fijación fotográfica panorámica y de detalle: Tomas de conjunto de la escena, vistas de aproximación de accesos e indicios, y fijación fotográfica de detalle con testigo métrico milimetrado.',
    '2. Relevamiento planimétrico del lugar: Confección de croquis y plano acotado a escala técnica, con fijación de punto cero referencial, distancias euclidianas y orientación cardinal norte.',
    '3. Levantamiento de rastros con cadena de custodia: Inspección ocular con reactivos físicos/químicos, levantamiento y envasado en bolsas de evidencia normalizadas con firma de perito y testigos de acta.',
  ];

  if (hasArma) {
    puntos.push(
      '4. Pericia Balística y Toma de Muestras: Secuestro del elemento balístico/arma con precinto de seguridad, rotulado de número de serie y calibre, y aplicación del kit de dermotest / levantamiento de residuos de deflagración por disparo en manos de los involucrados.'
    );
  } else if (isVial) {
    puntos.push(
      '4. Accidentología Vial: Relevamiento métrico de huellas de frenada, derrape y arrastre metálico; constatación de zonas de contacto inicial y deformaciones estructurales en rodados, y verificación de condiciones de iluminación y calzada.'
    );
  } else if (hasRobo) {
    puntos.push(
      '4. Verificación de Efracción y Rastros Papilares: Determinación de signos de violencia física o instrumental sobre aberturas, rejas o cajas, y exploraciones con reactivos pulverulentos para cotejo AFIS de impresiones dactilares latentes.'
    );
  } else if (hasLesionOSangre) {
    puntos.push(
      '4. Muestreo Biológico Forense: Hisopado esterilizado de manchas pardo-rojizas compatibles con sustancias hemáticas con conservación para análisis genético de ADN y remisión a laboratorio químico policial.'
    );
  } else {
    puntos.push(
      '4. Conservación de Evidencia Física: Rotulado individualizado, sellado hermético y remisión a la División Laboratorio Químico y Balístico bajo cadena de custodia judicial.'
    );
  }

  puntos.push('5. Elevación del respectivo informe pericial documentado con soporte fotográfico a requerimiento del magistrado interviniente.');

  return puntos.join('\n');
}
