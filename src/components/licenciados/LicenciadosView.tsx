import React, { useState, useMemo } from 'react';
import { Personal, ConfiguracionSistema } from '../../types/police';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Award,
  Search,
  Filter,
  Download,
  FileText,
  BadgeCheck,
  UserCheck,
  Building,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';

interface LicenciadosViewProps {
  personalList: Personal[];
  config: ConfiguracionSistema;
  onSavePersonal: (p: Personal) => void;
  // Compatibilidad con props anteriores
  licenciadosList?: any[];
  onSaveLicenciado?: (l: any) => void;
  onDeleteLicenciado?: (id: string) => void;
}

export const LicenciadosView: React.FC<LicenciadosViewProps> = ({
  personalList = [],
  config,
  onSavePersonal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('todas');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPersonalId, setSelectedPersonalId] = useState<string>('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    especialidad: 'Licenciatura en Criminalística',
    matricula: '',
    fechaMatriculacion: new Date().toISOString().split('T')[0],
  });

  // Modal confirmación para quitar condición de licenciado
  const [personalToUnlicense, setPersonalToUnlicense] = useState<Personal | null>(null);

  // Lista de personal que YA son licenciados
  const licenciados = useMemo(() => {
    return personalList.filter((p) => p.esLicenciado === true);
  }, [personalList]);

  // Lista de personal que todavía NO son licenciados (disponibles para designar)
  const personalDisponibleParaLicenciatura = useMemo(() => {
    return personalList.filter((p) => !p.esLicenciado);
  }, [personalList]);

  // Especialidades únicas presentes
  const especialidadesUnicas = useMemo(() => {
    const set = new Set<string>();
    licenciados.forEach((l) => {
      if (l.especialidadLicenciatura) set.add(l.especialidadLicenciatura);
    });
    return Array.from(set);
  }, [licenciados]);

  // Filtrado de la lista
  const filteredLicenciados = useMemo(() => {
    return licenciados.filter((lic) => {
      const matchSearch =
        lic.apellidoYNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lic.jerarquia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lic.dni.includes(searchTerm) ||
        (lic.plaza && lic.plaza.includes(searchTerm)) ||
        (lic.especialidadLicenciatura &&
          lic.especialidadLicenciatura.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lic.matriculaProfesional &&
          lic.matriculaProfesional.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lic.seccionGrupo && lic.seccionGrupo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchEsp =
        filtroEspecialidad === 'todas' ||
        lic.especialidadLicenciatura === filtroEspecialidad;

      return matchSearch && matchEsp;
    });
  }, [licenciados, searchTerm, filtroEspecialidad]);

  // Abrir modal para agregar o editar
  const handleOpenModalNuevo = () => {
    setIsEditingExisting(false);
    setSelectedPersonalId(personalDisponibleParaLicenciatura[0]?.id || '');
    setFormData({
      especialidad: 'Licenciatura en Criminalística',
      matricula: '',
      fechaMatriculacion: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenModalEditar = (p: Personal) => {
    setIsEditingExisting(true);
    setSelectedPersonalId(p.id);
    setFormData({
      especialidad: p.especialidadLicenciatura || 'Licenciatura en Criminalística',
      matricula: p.matriculaProfesional || '',
      fechaMatriculacion: p.fechaMatriculacion || new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonalId) {
      alert('Por favor seleccione un efectivo policial de la nómina.');
      return;
    }
    if (!formData.especialidad.trim()) {
      alert('Por favor especifique la especialidad o título de grado.');
      return;
    }
    if (!formData.matricula.trim()) {
      alert('Por favor ingrese el número de Matrícula Profesional.');
      return;
    }

    const pers = personalList.find((p) => p.id === selectedPersonalId);
    if (!pers) return;

    const updatedPersonal: Personal = {
      ...pers,
      esLicenciado: true,
      especialidadLicenciatura: formData.especialidad.trim(),
      matriculaProfesional: formData.matricula.trim(),
      fechaMatriculacion: formData.fechaMatriculacion,
      updatedAt: new Date().toISOString(),
    };

    onSavePersonal(updatedPersonal);
    setIsModalOpen(false);
  };

  const handleQuitarLicenciado = (p: Personal) => {
    const updatedPersonal: Personal = {
      ...p,
      esLicenciado: false,
      updatedAt: new Date().toISOString(),
    };
    onSavePersonal(updatedPersonal);
    setPersonalToUnlicense(null);
  };

  // Exportar Nómina Oficial a PDF
  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    drawPoliceHeader(
      doc,
      config,
      'NÓMINA INSTITUCIONAL DE PERSONAL POLICIAL LICENCIADO Y PERITOS UNIVERSITARIOS',
      10
    );

    const headers = [
      [
        'N°',
        'JERARQUÍA',
        'APELLIDO Y NOMBRE',
        'LICENCIATURA / ESPECIALIDAD',
        'MATRÍCULA PROFESIONAL',
        'PLAZA N°',
        'D.N.I.',
        'SECCIÓN / REVISTA',
      ],
    ];

    const bodyData = filteredLicenciados.map((lic, idx) => [
      (idx + 1).toString(),
      lic.jerarquia,
      lic.apellidoYNombre.toUpperCase(),
      lic.especialidadLicenciatura || 'Licenciado',
      lic.matriculaProfesional || 'En trámite',
      lic.plaza || 's/p',
      lic.dni,
      lic.seccionGrupo || 'Policía Científica',
    ]);

    autoTable(doc, {
      startY: 48,
      head: headers,
      body: bodyData,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [17, 38, 77], // Police Navy
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 55, fontStyle: 'bold' },
        3: { cellWidth: 55 },
        4: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
        7: { cellWidth: 35 },
      },
      didDrawPage: () => {
        drawPoliceFooter(doc, config);
      },
    });

    doc.save(`Nomina_Personal_Licenciado_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header institucional */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 p-6 rounded-2xl shadow-xl text-white border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Nómina Institucional de Grado Académico</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Personal Policial Licenciado</span>
              <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full font-mono border border-indigo-400/30">
                {licenciados.length} Efectivos
              </span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Registro y asiento de los efectivos policiales cargados en la nómina (Personal y Legajos)
              que poseen título de grado universitario de Licenciatura y Matrícula Profesional habilitante.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer border border-slate-600"
              title="Descargar listado oficial en PDF"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Nómina PDF</span>
            </button>

            <button
              onClick={handleOpenModalNuevo}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer border border-blue-400"
            >
              <Plus className="w-4 h-4" />
              <span>+ Designar Personal Licenciado</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block">
              Total Licenciados
            </span>
            <span className="text-2xl font-black text-slate-900">{licenciados.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              De {personalList.length} efectivos en nómina
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">
              Matriculados Registrados
            </span>
            <span className="text-2xl font-black text-emerald-950">
              {licenciados.filter((l) => Boolean(l.matriculaProfesional)).length}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              Con matrícula profesional asentada
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <BadgeCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-800 uppercase block">
              Especialidades / Títulos
            </span>
            <span className="text-2xl font-black text-indigo-950">
              {especialidadesUnicas.length || 1}
            </span>
            <span className="text-[10px] text-indigo-600 block mt-0.5">
              Áreas profesionales distintas
            </span>
          </div>
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Jerarquía, Nombre, Matrícula, Especialidad..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filtroEspecialidad}
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="todas">Todas las Especialidades</option>
            {especialidadesUnicas.map((esp) => (
              <option key={esp} value={esp}>
                {esp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla Oficial de Licenciados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredLicenciados.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              No hay Personal Policial registrado como Licenciado
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilice el botón "+ Designar Personal Licenciado" para seleccionar a un efectivo de la nómina
              existente y asignarle su título de grado universitario y matrícula profesional.
            </p>
            {personalDisponibleParaLicenciatura.length > 0 && (
              <button
                onClick={handleOpenModalNuevo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Designar ahora</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Jerarquía</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Apellido y Nombre</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Licenciado (Especialidad / Título)</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Matrícula Profesional</th>
                  <th className="py-2.5 px-3">Plaza N°</th>
                  <th className="py-2.5 px-3">D.N.I.</th>
                  <th className="py-2.5 px-3">Sección / Destino</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLicenciados.map((lic) => (
                  <tr key={lic.id} className="hover:bg-indigo-50/30 transition-colors">
                    {/* Jerarquía */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-semibold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {lic.jerarquia}
                      </span>
                    </td>

                    {/* Apellido y Nombre */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>{lic.apellidoYNombre}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Estado: {lic.estado}
                      </div>
                    </td>

                    {/* Licenciado (Especialidad) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                        <GraduationCap className="w-4 h-4 text-indigo-700 shrink-0" />
                        <span>{lic.especialidadLicenciatura || 'Licenciado'}</span>
                      </div>
                      {lic.fechaMatriculacion && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Fecha Mat.: {lic.fechaMatriculacion}
                        </div>
                      )}
                    </td>

                    {/* Matrícula */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2.5 py-1 rounded shadow-2xs inline-block">
                        {lic.matriculaProfesional || 'En trámite'}
                      </span>
                    </td>

                    {/* Plaza N° */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {lic.plaza || 's/p'}
                    </td>

                    {/* DNI */}
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {lic.dni}
                    </td>

                    {/* Sección / Destino */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-800">
                      {lic.seccionGrupo || 'Policía Científica'}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModalEditar(lic)}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Especialidad y Matrícula"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPersonalToUnlicense(lic)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Quitar condición de Licenciado"
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

      {/* Modal para Registrar / Designar / Editar Personal Licenciado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {isEditingExisting
                    ? 'Editar Datos Profesionales del Licenciado'
                    : 'Designar Efectivo como Personal Licenciado'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Selección del Personal de la Nómina */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Efectivo Policial (Seleccionar desde Nómina del Personal) *
                </label>
                {isEditingExisting ? (
                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300 font-bold text-slate-900">
                    {(() => {
                      const p = personalList.find((item) => item.id === selectedPersonalId);
                      return p
                        ? `${p.jerarquia} ${p.apellidoYNombre} (Plaza: ${p.plaza || 's/p'} - DNI: ${p.dni})`
                        : 'Efectivo seleccionado';
                    })()}
                  </div>
                ) : (
                  <select
                    required
                    value={selectedPersonalId}
                    onChange={(e) => setSelectedPersonalId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {personalDisponibleParaLicenciatura.length === 0 ? (
                      <option value="">No hay efectivos disponibles sin licenciatura</option>
                    ) : (
                      personalDisponibleParaLicenciatura.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} {p.apellidoYNombre} (Plaza: {p.plaza || 's/p'} - DNI: {p.dni})
                        </option>
                      ))
                    )}
                  </select>
                )}
                <span className="text-[10px] text-slate-500 block mt-1">
                  Se asienta directamente sobre el legajo del efectivo policial.
                </span>
              </div>

              {/* Especialidad / Título de Grado */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Licenciado en... (Especialidad / Título de Grado Universitario) *
                </label>
                <input
                  type="text"
                  required
                  list="lista-titulos-licenciados"
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  placeholder="Ej. Licenciatura en Criminalística"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <datalist id="lista-titulos-licenciados">
                  <option value="Licenciatura en Criminalística" />
                  <option value="Licenciatura en Accidentología Vial y Transporte" />
                  <option value="Licenciatura en Seguridad Pública" />
                  <option value="Licenciatura en Peritajes Balísticos" />
                  <option value="Licenciatura en Informática Forense / Ciberdelito" />
                  <option value="Licenciatura en Documentología y Caligrafía Forense" />
                  <option value="Licenciatura en Psicología Policial" />
                  <option value="Licenciatura en Bioquímica y Genética Forense" />
                  <option value="Licenciatura en Criminología" />
                </datalist>
              </div>

              {/* Matrícula Profesional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Matrícula Profesional *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    placeholder="Ej. M.P. N° 4582 / CP"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha de Registro / Matrícula
                  </label>
                  <input
                    type="date"
                    value={formData.fechaMatriculacion}
                    onChange={(e) =>
                      setFormData({ ...formData, fechaMatriculacion: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <BadgeCheck className="w-4 h-4 text-amber-400" />
                  <span>{isEditingExisting ? 'Guardar Cambios' : 'Confirmar Licenciatura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación para Quitar Licenciado */}
      <ConfirmModal
        isOpen={Boolean(personalToUnlicense)}
        title="Quitar Condición de Licenciado"
        message={`¿Confirma que desea retirar la designación de Licenciado al efectivo ${personalToUnlicense?.jerarquia} ${personalToUnlicense?.apellidoYNombre}? El legajo continuará activo en la nómina del personal.`}
        confirmText="Sí, quitar licenciatura"
        cancelText="Cancelar"
        onConfirm={() => personalToUnlicense && handleQuitarLicenciado(personalToUnlicense)}
        onCancel={() => setPersonalToUnlicense(null)}
      />
    </div>
  );
};
