import { Personal } from '../types/police';

export interface BirthdayInfo {
  personal: Personal;
  birthDate: Date;
  day: number;
  month: number; // 0 - 11
  birthYear: number;
  currentAge: number;
  turningAge: number;
  daysRemaining: number;
  isToday: boolean;
  isTomorrow: boolean;
  formattedDate: string; // e.g. "14 de Febrero"
  nextBirthdayDate: Date;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Parsea con tolerancia fechas en formatos YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY
 */
export function parseBirthDate(fechaStr: string): { day: number; month: number; year: number } | null {
  if (!fechaStr || typeof fechaStr !== 'string') return null;

  const trimmed = fechaStr.trim();
  // Formato ISO: YYYY-MM-DD o YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // 0-based
    const day = parseInt(isoMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { day, month, year };
    }
  }

  // Formato latinoamericano: DD-MM-YYYY o DD/MM/YYYY
  const latamMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latamMatch) {
    const day = parseInt(latamMatch[1], 10);
    const month = parseInt(latamMatch[2], 10) - 1; // 0-based
    const year = parseInt(latamMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { day, month, year };
    }
  }

  return null;
}

export function getBirthdayInfo(personal: Personal, referenceDate: Date = new Date()): BirthdayInfo | null {
  if (!personal.fechaNacimiento) return null;
  const parsed = parseBirthDate(personal.fechaNacimiento);
  if (!parsed) return null;

  const { day, month, year } = parsed;

  const refYear = referenceDate.getFullYear();
  const todayAtMidnight = new Date(refYear, referenceDate.getMonth(), referenceDate.getDate());

  // Próximo cumpleaños en este año o en el siguiente
  let nextBirthday = new Date(refYear, month, day);
  if (nextBirthday < todayAtMidnight) {
    nextBirthday = new Date(refYear + 1, month, day);
  }

  const diffMs = nextBirthday.getTime() - todayAtMidnight.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isToday = daysRemaining === 0;
  const isTomorrow = daysRemaining === 1;

  const turningAge = nextBirthday.getFullYear() - year;
  const currentAge = isToday ? turningAge : turningAge - 1;

  const formattedDate = `${day} de ${MONTH_NAMES[month]}`;

  return {
    personal,
    birthDate: new Date(year, month, day),
    day,
    month,
    birthYear: year,
    currentAge,
    turningAge,
    daysRemaining,
    isToday,
    isTomorrow,
    formattedDate,
    nextBirthdayDate: nextBirthday,
  };
}

/**
 * Obtiene todos los cumpleaños de hoy
 */
export function getTodayBirthdays(personalList: Personal[], referenceDate: Date = new Date()): BirthdayInfo[] {
  return personalList
    .map((p) => getBirthdayInfo(p, referenceDate))
    .filter((info): info is BirthdayInfo => info !== null && info.isToday);
}

/**
 * Obtiene los cumpleaños de los próximos N días (ordenados cronológicamente)
 */
export function getUpcomingBirthdays(
  personalList: Personal[],
  daysAhead: number = 30,
  referenceDate: Date = new Date()
): BirthdayInfo[] {
  return personalList
    .map((p) => getBirthdayInfo(p, referenceDate))
    .filter((info): info is BirthdayInfo => info !== null && info.daysRemaining >= 0 && info.daysRemaining <= daysAhead)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Obtiene todos los cumpleaños de un mes específico (0 = Enero, 11 = Diciembre) ordenados por día
 */
export function getMonthBirthdays(personalList: Personal[], monthIndex: number): BirthdayInfo[] {
  const ref = new Date();
  return personalList
    .map((p) => getBirthdayInfo(p, ref))
    .filter((info): info is BirthdayInfo => info !== null && info.month === monthIndex)
    .sort((a, b) => a.day - b.day);
}

/**
 * Genera el texto institucional de felicitación para copiar al portapapeles o WhatsApp
 */
export function generateGreetingText(info: BirthdayInfo, institucion: string = 'División Policial'): string {
  const { personal, turningAge } = info;
  return `🎂 *SALUDO PROTOCOLAR DE CUMPLEAÑOS*\n\n` +
    `Estimado/a *${personal.jerarquia} ${personal.apellidoYNombre}* (Plaza: ${personal.plaza}):\n\n` +
    `En nombre de la jefatura y todos los camaradas de la *${institucion}* (${personal.seccionGrupo}), ` +
    `te hacemos llegar nuestras más sinceras felicitaciones en el día de tu cumpleaños (${turningAge} años).\n\n` +
    `Agradecemos tu constante compromiso, profesionalismo y vocación de servicio a la comunidad.\n\n` +
    `¡Que tengas una excelente jornada junto a tus seres queridos!\n` +
    `⭐ *Guardia Policial* ⭐`;
}
