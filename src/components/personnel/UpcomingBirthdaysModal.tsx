import React, { useState, useMemo } from 'react';
import { Personal, ConfiguracionSistema } from '../../types/police';
import {
  BirthdayInfo,
  getTodayBirthdays,
  getUpcomingBirthdays,
  getMonthBirthdays,
  generateGreetingText,
} from '../../services/birthdayService';
import {
  X,
  Cake,
  Calendar,
  Gift,
  PartyPopper,
  Clock,
  Phone,
  Copy,
  Check,
  Search,
  Printer,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

interface UpcomingBirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalList: Personal[];
  config: ConfiguracionSistema;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const UpcomingBirthdaysModal: React.FC<UpcomingBirthdaysModalProps> = ({
  isOpen,
  onClose,
  personalList,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<'proximos' | 'meses' | 'hoy'>('proximos');
  const [diasRango, setDiasRango] = useState<number>(30);
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(() => new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cumpleaños de hoy
  const todayBirthdays = useMemo(() => {
    return getTodayBirthdays(personalList);
  }, [personalList]);

  // Próximos según rango de días (30, 60, 90)
  const upcomingBirthdays = useMemo(() => {
    return getUpcomingBirthdays(personalList, diasRango);
  }, [personalList, diasRango]);

  // Cumpleaños del mes seleccionado
  const monthBirthdays = useMemo(() => {
    return getMonthBirthdays(personalList, mesSeleccionado);
  }, [personalList, mesSeleccionado]);

  // Filtrado según búsqueda
  const filteredList = useMemo(() => {
    const source =
      activeTab === 'hoy'
        ? todayBirthdays
        : activeTab === 'meses'
        ? monthBirthdays
        : upcomingBirthdays;

    if (!searchTerm.trim()) return source;
    const q = searchTerm.toLowerCase();
    return source.filter(
      (b) =>
        b.personal.apellidoYNombre.toLowerCase().includes(q) ||
        b.personal.jerarquia.toLowerCase().includes(q) ||
        b.personal.seccionGrupo.toLowerCase().includes(q) ||
        b.personal.plaza.toLowerCase().includes(q)
    );
  }, [activeTab, todayBirthdays, monthBirthdays, upcomingBirthdays, searchTerm]);

  const handleCopyGreeting = (info: BirthdayInfo) => {
    const text = generateGreetingText(info, config.dependencia || 'División Policial');
    navigator.clipboard.writeText(text);
    setCopiedId(info.personal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Exportar cronograma a PDF para la cartelera de guardia
  const handleExportPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const titulo =
      activeTab === 'hoy'
        ? 'CUMPLEAÑEROS DE LA JORNADA - SALUDO PROTOCOLAR'
        : activeTab === 'meses'
        ? `CRONOGRAMA DE CUMPLEAÑOS - MES DE ${MONTH_NAMES[mesSeleccionado].toUpperCase()}`
        : `CRONOGRAMA DE PRÓXIMOS CUMPLEAÑOS (PRÓXIMOS ${diasRango} DÍAS)`;

    const currentY = drawPoliceHeader(doc, config, titulo, 10);

    const rows = filteredList.map((b, idx) => [
      idx + 1,
      b.formattedDate,
      b.isToday ? '¡HOY!' : b.isTomorrow ? 'MAÑANA' : `En ${b.daysRemaining} días`,
      b.personal.jerarquia,
      b.personal.apellidoYNombre,
      b.personal.plaza,
      b.personal.seccionGrupo,
      `${b.turningAge} años`,
      b.personal.telefono || '---',
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [
        [
          'N°',
          'Fecha',
          'Término',
          'Jerarquía',
          'Apellido y Nombre',
          'Plaza',
          'Guardia/Sección',
          'Edad',
          'Teléfono',
        ],
      ],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [24, 43, 73], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    drawPoliceFooter(doc, config);
    doc.save(`Cronograma_Cumpleaños_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/30 flex items-center justify-center shadow-inner">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  Gestión de Personal & Guardia
                </span>
                {todayBirthdays.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    {todayBirthdays.length} ¡Hoy!
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Aviso y Cronograma de Próximos Cumpleaños
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              title="Descargar cronograma oficial en PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors border border-blue-600/40 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas y Filtros */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Pestañas */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-2xs">
            <button
              onClick={() => setActiveTab('proximos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'proximos'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Próximos Cumpleaños</span>
              <span className="text-[10px] bg-blue-800 px-1.5 py-0.2 rounded-full text-blue-100">
                {upcomingBirthdays.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('meses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'meses'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Por Mes</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-full text-slate-700">
                {MONTH_NAMES[mesSeleccionado]}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('hoy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'hoy'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Hoy en la Guardia</span>
              {todayBirthdays.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                  {todayBirthdays.length}
                </span>
              )}
            </button>
          </div>

          {/* Opciones secundarias según pestaña */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'proximos' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Rango:</span>
                <select
                  value={diasRango}
                  onChange={(e) => setDiasRango(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={15}>Próximos 15 días</option>
                  <option value={30}>Próximos 30 días</option>
                  <option value={60}>Próximos 60 días</option>
                  <option value={90}>Próximos 90 días</option>
                </select>
              </div>
            )}

            {activeTab === 'meses' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Mes:</span>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, jerarquía, plaza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Contenido / Listado */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Cake className="w-12 h-12 mx-auto text-slate-300 mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-slate-700">No se encontraron registros de cumpleaños</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === 'hoy'
                  ? 'Ningún efectivo policial de la dotación cumple años en el día de la fecha.'
                  : 'No hay efectivos que coincidan con el criterio o rango seleccionado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((info) => {
                const { personal, turningAge, formattedDate, daysRemaining, isToday, isTomorrow } = info;

                return (
                  <div
                    key={personal.id}
                    className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isToday
                        ? 'bg-linear-to-br from-amber-50 to-yellow-50/60 border-amber-300 shadow-sm ring-1 ring-amber-400'
                        : isTomorrow
                        ? 'bg-linear-to-br from-orange-50 to-white border-orange-200'
                        : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
                    }`}
                  >
                    {/* Badge superior */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isToday
                              ? 'bg-amber-500 text-white shadow-xs animate-bounce'
                              : 'bg-blue-50 text-blue-900 border border-blue-100'
                          }`}
                        >
                          <Cake className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {personal.jerarquia} {personal.apellidoYNombre}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Plaza: <strong className="text-slate-700">{personal.plaza}</strong></span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-medium">
                              {personal.seccionGrupo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isToday ? (
                          <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                            ¡Cumple Hoy!
                          </span>
                        ) : isTomorrow ? (
                          <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Mañana
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                            En {daysRemaining} días
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Información central */}
                    <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100 text-xs my-2 flex items-center justify-between">
                      <div>
                        <div className="text-slate-500 text-[11px]">Fecha de Cumpleaños:</div>
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-800" />
                          <span>{formattedDate}</span>
                          <span className="text-slate-400 font-normal">({personal.fechaNacimiento})</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-slate-500 text-[11px]">Cumple:</div>
                        <div className="text-sm font-extrabold text-indigo-700">
                          {turningAge} años
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Contacto & Protocolo */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-1">
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Estado: <strong className="text-slate-700">{personal.estado}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyGreeting(info)}
                          title="Copiar saludo protocolar oficial"
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-semibold transition-colors"
                        >
                          {copiedId === personal.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-600 text-[11px]">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copiar Saludo</span>
                            </>
                          )}
                        </button>

                        {personal.telefono && (
                          <a
                            href={`https://wa.me/${personal.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar WhatsApp de felicitación"
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition-colors text-[11px]"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total en nómina: <strong className="text-slate-800">{personalList.length} efectivos</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
