import React, { useState, useMemo } from 'react';
import { Personal, ConfiguracionSistema } from '../../types/police';
import {
  BirthdayInfo,
  getBirthdayInfo,
  getTodayBirthdays,
  getUpcomingBirthdays,
  getMonthBirthdays,
  generateGreetingText,
} from '../../services/birthdayService';
import {
  Cake,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Gift,
  Phone,
  Copy,
  Check,
  Clock,
  Sparkles,
  Users,
  Search,
} from 'lucide-react';

interface BirthdayDashboardWidgetProps {
  personalList: Personal[];
  config: ConfiguracionSistema;
  onNavigateToPersonnel?: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export const BirthdayDashboardWidget: React.FC<BirthdayDashboardWidgetProps> = ({
  personalList,
  config,
  onNavigateToPersonnel,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Cumpleaños de hoy
  const todayBirthdays = useMemo(() => {
    return getTodayBirthdays(personalList);
  }, [personalList]);

  // Próximos cumpleaños (próximos 30 días)
  const upcomingBirthdays = useMemo(() => {
    return getUpcomingBirthdays(personalList, 30);
  }, [personalList]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Cumpleaños del mes en curso del calendario
  const monthBirthdays = useMemo(() => {
    return getMonthBirthdays(personalList, currentMonth);
  }, [personalList, currentMonth]);

  // Mapa de días del mes a cumpleañeros
  const birthdaysByDay = useMemo(() => {
    const map = new Map<number, BirthdayInfo[]>();
    monthBirthdays.forEach((info) => {
      const arr = map.get(info.day) || [];
      arr.push(info);
      map.set(info.day, arr);
    });
    return map;
  }, [monthBirthdays]);

  // Matriz de días del mes para el grid del calendario
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // getDay() devuelve 0 para domingo; ajustamos para que la semana empiece en Lunes (0) a Domingo (6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      birthdays: BirthdayInfo[];
      isToday: boolean;
    }> = [];

    // Días del mes anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        birthdays: [],
        isToday: false,
      });
    }

    const today = new Date();
    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        today.getDate() === d &&
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;

      cells.push({
        day: d,
        isCurrentMonth: true,
        birthdays: birthdaysByDay.get(d) || [],
        isToday,
      });
    }

    // Días del siguiente mes para completar las filas
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        birthdays: [],
        isToday: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth, birthdaysByDay]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  const handleCopyGreeting = (info: BirthdayInfo) => {
    const text = generateGreetingText(info, config.dependencia || 'División Policial');
    navigator.clipboard.writeText(text);
    setCopiedId(info.personal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Cumpleañeros del día seleccionado en el calendario
  const selectedDayBirthdays = useMemo(() => {
    if (!selectedDay) return [];
    return birthdaysByDay.get(selectedDay) || [];
  }, [selectedDay, birthdaysByDay]);

  // Lista filtrada si hay búsqueda
  const filteredMonthBirthdays = useMemo(() => {
    if (!searchFilter.trim()) return monthBirthdays;
    const q = searchFilter.toLowerCase();
    return monthBirthdays.filter(
      (b) =>
        b.personal.apellidoYNombre.toLowerCase().includes(q) ||
        b.personal.jerarquia.toLowerCase().includes(q) ||
        b.personal.seccionGrupo.toLowerCase().includes(q) ||
        b.personal.plaza.toLowerCase().includes(q)
    );
  }, [monthBirthdays, searchFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Alerta de Cumpleaños de Hoy */}
      {todayBirthdays.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-4 shadow-inner relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-4 pointer-events-none">
            <Cake className="w-32 h-32" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl text-yellow-100 ring-2 ring-white/30 shadow-sm animate-pulse">
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                    ¡Cumpleaños Hoy!
                  </span>
                  <span className="text-xs text-amber-100 font-medium">
                    {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {todayBirthdays.length === 1
                    ? `¡Hoy cumple años ${todayBirthdays[0].personal.apellidoYNombre}!`
                    : `¡${todayBirthdays.length} integrantes de la dotación celebran su cumpleaños hoy!`}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {todayBirthdays.map((info) => (
                <div
                  key={info.personal.id}
                  className="bg-white/15 hover:bg-white/25 transition-colors border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs backdrop-blur-sm"
                >
                  <Gift className="w-4 h-4 text-yellow-200" />
                  <span className="font-semibold">{info.personal.jerarquia} {info.personal.apellidoYNombre}</span>
                  <span className="bg-yellow-400 text-slate-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                    {info.turningAge} años
                  </span>
                  <button
                    onClick={() => handleCopyGreeting(info)}
                    title="Copiar saludo protocolar oficial"
                    className="ml-1 p-1 hover:bg-white/30 rounded text-white"
                  >
                    {copiedId === info.personal.id ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {info.personal.telefono && (
                    <a
                      href={`https://wa.me/${info.personal.telefono.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Enviar WhatsApp"
                      className="p-1 hover:bg-white/30 rounded text-white"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-5 py-3 border-b border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cake className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">Alerta y Calendario de Cumpleaños Policial</span>
          </div>
          <div className="text-xs text-blue-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-300" />
            {upcomingBirthdays.length > 0 ? (
              <span>
                Próximo: <strong className="text-white">{upcomingBirthdays[0].personal.apellidoYNombre}</strong> ({upcomingBirthdays[0].daysRemaining === 1 ? 'mañana' : `en ${upcomingBirthdays[0].daysRemaining} días`})
              </span>
            ) : (
              <span>No hay cumpleaños en los próximos 30 días</span>
            )}
          </div>
        </div>
      )}

      {/* Cuerpo Principal del Calendario */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Calendario Mensual */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            {/* Header del Calendario */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-base">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h4>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                  {monthBirthdays.length} {monthBirthdays.length === 1 ? 'cumpleaños' : 'cumpleaños'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleGoToday}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors mr-1"
                >
                  Hoy
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Días de la Semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Celdas del Calendario */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, idx) => {
                const hasBirthdays = cell.birthdays.length > 0;
                const isSelected = selectedDay === cell.day && cell.isCurrentMonth;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDay(cell.day);
                      }
                    }}
                    disabled={!cell.isCurrentMonth}
                    className={`min-h-[46px] p-1 rounded-lg border transition-all flex flex-col items-center justify-between relative ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 border-transparent cursor-default bg-slate-50/50'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                        : cell.isToday
                        ? 'border-amber-400 bg-amber-50/60 font-bold'
                        : hasBirthdays
                        ? 'border-pink-200 bg-pink-50/40 hover:bg-pink-100/50'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        cell.isToday
                          ? 'w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-white font-bold'
                          : isSelected
                          ? 'font-bold text-indigo-700'
                          : cell.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Indicador de cumpleaños */}
                    {hasBirthdays && (
                      <div className="w-full flex items-center justify-center gap-0.5 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-rose-500 text-white rounded text-[10px] font-bold shadow-xs">
                          <Cake className="w-2.5 h-2.5" />
                          {cell.birthdays.length > 1 && <span>{cell.birthdays.length}</span>}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detalle del Día Seleccionado en Calendario */}
            {selectedDay && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Detalle del {selectedDay} de {MONTH_NAMES[currentMonth]}:
                  </span>
                  <span>{selectedDayBirthdays.length} cumpleañero(s)</span>
                </div>

                {selectedDayBirthdays.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay cumpleaños registrados para este día.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayBirthdays.map((info) => (
                      <div
                        key={info.personal.id}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">
                              {info.personal.jerarquia} {info.personal.apellidoYNombre}
                            </span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-medium">
                              {info.personal.seccionGrupo}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                            <span>Plaza: {info.personal.plaza}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">Cumple {info.turningAge} años</span>
                            {info.personal.telefono && (
                              <>
                                <span>•</span>
                                <span>Tel: {info.personal.telefono}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyGreeting(info)}
                            title="Copiar saludo protocolar"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            {copiedId === info.personal.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          {info.personal.telefono && (
                            <a
                              href={`https://wa.me/${info.personal.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar felicitación por WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna Derecha: Próximos Cumpleaños (30 Días) */}
          <div className="lg:col-span-5 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-5 pt-4 lg:pt-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-slate-800 text-sm">Próximos Cumpleaños (30 días)</h4>
              </div>
              <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                {upcomingBirthdays.length}
              </span>
            </div>

            {/* Búsqueda rápida */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cumpleañero en el mes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Lista scrollable */}
            <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Cake className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                  No hay cumpleaños en los próximos 30 días.
                </div>
              ) : (
                upcomingBirthdays.map((info) => {
                  const isToday = info.isToday;
                  const isTomorrow = info.isTomorrow;

                  return (
                    <div
                      key={info.personal.id}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isToday
                          ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                          : isTomorrow
                          ? 'bg-orange-50/60 border-orange-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">
                              {info.personal.jerarquia} {info.personal.apellidoYNombre}
                            </span>
                            {isToday ? (
                              <span className="bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                                ¡Hoy!
                              </span>
                            ) : isTomorrow ? (
                              <span className="bg-orange-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                                Mañana
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 font-semibold text-[10px] px-1.5 py-0.2 rounded">
                                en {info.daysRemaining} días
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-medium text-slate-700">{info.formattedDate}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">Cumple {info.turningAge} años</span>
                            <span>•</span>
                            <span>{info.personal.seccionGrupo}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyGreeting(info)}
                            title="Copiar saludo"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          >
                            {copiedId === info.personal.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botón de acceso a Nómina Completa */}
            {onNavigateToPersonnel && (
              <button
                onClick={onNavigateToPersonnel}
                className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Ver Nómina Completa en Personal y Legajos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
