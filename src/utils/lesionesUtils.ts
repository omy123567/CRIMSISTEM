import { IntervencionParte, ParteNovedadesGuardia } from '../types/police';

export const LESION_A_DETERMINAR = 'A Determinar';

export function esTipoLesionADeterminar(valor?: string | null): boolean {
  if (!valor) return false;
  return valor.trim().toLowerCase().includes('determinar');
}

export function getResumenLesionADeterminarIntervencion(interv: IntervencionParte): {
  tienePendiente: boolean;
  motivos: string[];
} {
  const motivos: string[] = [];

  (interv.involucrados || []).forEach((inv) => {
    if (esTipoLesionADeterminar(inv.tipoLesion)) {
      motivos.push(
        `Involucrado: ${inv.apellidoYNombre || 'Sin nombre'} (${inv.tipoLesion})`
      );
    }
  });

  (interv.vehiculosSiniestro || []).forEach((v) => {
    if (esTipoLesionADeterminar(v.lesiones)) {
      motivos.push(`${v.identificador || 'Vehículo'} (${v.lesiones})`);
    }
  });

  if (esTipoLesionADeterminar(interv.tipoLesionesLC)) {
    motivos.push(`Lesiones LC (${interv.tipoLesionesLC})`);
  }

  if (esTipoLesionADeterminar(interv.personalPolicial?.tipoLesion)) {
    const yaIncluido = (interv.involucrados || []).some(
      (i) => i.esPersonalPolicial && esTipoLesionADeterminar(i.tipoLesion)
    );
    if (!yaIncluido) {
      motivos.push(
        `Personal Policial: ${interv.personalPolicial?.apellidoYNombre || 'Efectivo'} (${interv.personalPolicial?.tipoLesion})`
      );
    }
  }

  return {
    tienePendiente: motivos.length > 0,
    motivos,
  };
}

export function getResumenLesionADeterminarParte(parte: ParteNovedadesGuardia): {
  cantidadIntervenciones: number;
  intervenciones: IntervencionParte[];
} {
  const pendientes = (parte.intervenciones || []).filter(
    (i) => getResumenLesionADeterminarIntervencion(i).tienePendiente
  );
  return {
    cantidadIntervenciones: pendientes.length,
    intervenciones: pendientes,
  };
}
