import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../db/database';
import {
  RegistroAuditoria,
  UsuarioSistema,
  DelegacionPolicial,
  ConfiguracionSistema,
} from '../../types/police';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  User,
  Building2,
  Layers,
  Lock,
  Clock,
  Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPoliceHeader, drawPoliceFooter } from '../../services/pdfService';
import { ConfirmModal } from '../common/ConfirmModal';

interface AuditoriaViewProps {
  currentUser: UsuarioSistema;
  delegacionesList: DelegacionPolicial[];
  config: ConfiguracionSistema;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({
  currentUser,
  delegacionesList,
  config,
}) => {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('TODAS');
  const [filtroModulo, setFiltroModulo] = useState<string>('TODOS');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('TODOS');
  const [filtroDelegacion, setFiltroDelegacion] = useState<string>('TODAS');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroAuditoria | null>(null);
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState(false);
  const [retencionDias, setRetencionDias] = useState<number>(config.diasRetencionAuditoria || 90);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);

  // Verificar si es superusuario
  const esSuperusuario = currentUser.rol === 'superusuario';

  const loadAuditoria = async () => {
    setLoading(true);
    try {
      const all = await db.auditoria.toArray();
      all.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      setRegistros(all);
    } catch (err) {
      console.error('Error cargando registros de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditoria();
  }, []);

  const handleSavePoliticaRetencion = async (dias: number) => {
    setRetencionDias(dias);
    try {
      const cfg = await db.configuracion.get('sistema_config');
      if (cfg) {
        await db.configuracion.put({ ...cfg, diasRetencionAuditoria: dias });
      }
      setPurgeSuccessMsg(`Política actualizada: registros retenidos por ${dias} días.`);
      setTimeout(() => setPurgeSuccessMsg(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurgeLogsOlderThan = async () => {
    if (!esSuperusuario) return;
    try {
      const cutoffTime = Date.now() - retencionDias * 24 * 60 * 60 * 1000;
      const all = await db.auditoria.toArray();
      const idsToDelete = all
        .filter((r) => new Date(r.fechaHora).getTime() < cutoffTime)
        .map((r) => r.id);
      
      await db.auditoria.bulkDelete(idsToDelete);
      await loadAuditoria();
      setIsConfirmPurgeOpen(false);
      setPurgeSuccessMsg(`Se depuraron exitosamente ${idsToDelete.length} registros con más de ${retencionDias} días de antigüedad.`);
      setTimeout(() => setPurgeSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error purgando auditoría por retención:', err);
    }
  };

  // Mapa de delegaciones
  const delegacionesMap = useMemo(() => {
    const map = new Map<string, string>();
    delegacionesList.forEach((d) => map.set(d.id, d.nombre));
    return map;
  }, [delegacionesList]);

  // Lista única de usuarios y módulos presentes en los logs
  const usuariosUnicos = useMemo(() => {
    const setUsers = new Set<string>();
    registros.forEach((r) => {
      if (r.username) setUsers.add(r.username);
    });
    return Array.from(setUsers);
  }, [registros]);

  const modulosUnicos = useMemo(() => {
    const setMod = new Set<string>();
    registros.forEach((r) => {
      if (r.modulo) setMod.add(r.modulo);
    });
    return Array.from(setMod);
  }, [registros]);

  // Filtrado de auditoría
  const filteredRegistros = useMemo(() => {
    return registros.filter((reg) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        reg.descripcion.toLowerCase().includes(term) ||
        (reg.username && reg.username.toLowerCase().includes(term)) ||
        (reg.apellidoYNombre && reg.apellidoYNombre.toLowerCase().includes(term)) ||
        (reg.modulo && reg.modulo.toLowerCase().includes(term)) ||
        (reg.detalles && reg.detalles.toLowerCase().includes(term));

      const matchAccion = filtroAccion === 'TODAS' || reg.accion === filtroAccion;
      const matchModulo = filtroModulo === 'TODOS' || reg.modulo === filtroModulo;
      const matchUsuario = filtroUsuario === 'TODOS' || reg.username === filtroUsuario;
      const matchDelegacion =
        filtroDelegacion === 'TODAS' || reg.delegacionId === filtroDelegacion;

      let matchFecha = true;
      if (fechaDesde) {
        matchFecha = matchFecha && reg.fechaHora.slice(0, 10) >= fechaDesde;
      }
      if (fechaHasta) {
        matchFecha = matchFecha && reg.fechaHora.slice(0, 10) <= fechaHasta;
      }

      return matchSearch && matchAccion && matchModulo && matchUsuario && matchDelegacion && matchFecha;
    });
  }, [
    registros,
    searchTerm,
    filtroAccion,
    filtroModulo,
    filtroUsuario,
    filtroDelegacion,
    fechaDesde,
    fechaHasta,
  ]);

  // Estadísticas
  const stats = useMemo(() => {
    let creaciones = 0;
    let modificaciones = 0;
    let eliminaciones = 0;
    let reseteos = 0;
    let logins = 0;

    filteredRegistros.forEach((r) => {
      if (r.accion === 'CREAR') creaciones++;
      else if (r.accion === 'MODIFICAR') modificaciones++;
      else if (r.accion === 'ELIMINAR') eliminaciones++;
      else if (r.accion === 'RESETEO_CONTADOR') reseteos++;
      else if (r.accion === 'LOGIN') logins++;
    });

    return {
      total: filteredRegistros.length,
      creaciones,
      modificaciones,
      eliminaciones,
      reseteos,
      logins,
    };
  }, [filteredRegistros]);

  const handlePurgeLogs = async () => {
    try {
      await db.auditoria.clear();
      await loadAuditoria();
      setIsConfirmPurgeOpen(false);
    } catch (err) {
      console.error('Error purgando auditoría:', err);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const currentY = drawPoliceHeader(
      doc,
      config,
      'REGISTRO OFICIAL DE AUDITORÍA Y TRAZABILIDAD DE ACCIONES DEL SISTEMA',
      10
    );

    const rows = filteredRegistros.map((r, i) => {
      const fecha = new Date(r.fechaHora).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
      const delNombre = delegacionesMap.get(r.delegacionId) || r.delegacionNombre || r.delegacionId || 'Central';

      return [
        i + 1,
        fecha,
        `${r.apellidoYNombre}\n(@${r.username}) [${r.rol}]`,
        delNombre,
        r.modulo,
        r.accion,
        `${r.descripcion}${r.detalles ? `\nDetalles: ${r.detalles}` : ''}`,
      ];
    });

    autoTable(doc, {
      startY: currentY + 4,
      head: [
        [
          'N°',
          'Fecha y Hora',
          'Usuario y Rol',
          'Delegación',
          'Módulo',
          'Acción',
          'Descripción del Evento',
        ],
      ],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 45 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 'auto' },
      },
      didDrawPage: () => {
        drawPoliceFooter(doc, config);
      },
    });

    doc.save(`Auditoria_SISPOL_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getAccionBadge = (accion: string) => {
    switch (accion) {
      case 'CREAR':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'MODIFICAR':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'ELIMINAR':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'RESETEO_CONTADOR':
        return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'TRASLADO':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'CAMBIO_PASSWORD':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!esSuperusuario) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-red-200 p-8 text-center max-w-xl mx-auto my-12">
        <div className="p-4 bg-red-100 text-red-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-sm text-slate-600 mb-4">
          El módulo de <strong>Auditoría y Trazabilidad</strong> está reservado exclusivamente para
          el nivel de acceso <strong>Superusuario</strong>.
        </p>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
          Su rol actual: {currentUser.rol}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado Principal */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Auditoría y Trazabilidad de Acciones
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-700" />
                Exclusivo Superusuario
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Registro histórico cronológico de operaciones, modificaciones, reseteos de contadores y accesos de usuarios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAuditoria}
            className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Refrescar lista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Informe PDF</span>
          </button>

          {esSuperusuario && (
            <button
              type="button"
              onClick={() => setIsConfirmPurgeOpen(true)}
              className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              title="Depurar registros según política de retención"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Panel Exclusivo Superusuario: Política de Retención y Depuración de Auditoría */}
      {esSuperusuario && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-purple-950/90 text-white rounded-xl p-4 border border-purple-500/40 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-900/60 rounded-lg border border-purple-400/40 text-purple-300">
                <Lock className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-purple-200">
                    Política de Retención y Depuración de Registros de Auditoría
                  </h3>
                  <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded font-mono font-bold">
                    Superadmin
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Configure el tiempo de permanencia de los registros de auditoría y depure periódicamente datos antiguos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] text-slate-300 font-semibold">Retención:</span>
                <select
                  value={retencionDias}
                  onChange={(e) => handleSavePoliticaRetencion(Number(e.target.value))}
                  className="bg-slate-900 text-white text-xs font-bold rounded px-2 py-1 border border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                >
                  <option value={30}>30 días (1 mes)</option>
                  <option value={60}>60 días (2 meses)</option>
                  <option value={90}>90 días (3 meses - Recomendado)</option>
                  <option value={180}>180 días (6 meses)</option>
                  <option value={365}>365 días (1 año)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmPurgeOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Depurar registros &gt; {retencionDias} días</span>
              </button>
            </div>
          </div>

          {purgeSuccessMsg && (
            <div className="p-2 bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{purgeSuccessMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Tarjetas de Métricas de Auditoría */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Eventos
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{stats.total}</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Creaciones
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-900">{stats.creaciones}</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
              +CREAR
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Modificaciones
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-900">{stats.modificaciones}</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">
              MOD
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
            Eliminaciones
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-red-900">{stats.eliminaciones}</span>
            <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">
              DEL
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Reseteo Contadores
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-900">{stats.reseteos}</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">
              #0001
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
            Inicios de Sesión
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-900">{stats.logins}</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">
              LOGIN
            </span>
          </div>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Búsqueda libre */}
          <div className="sm:col-span-2 relative">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Buscar en logs
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Usuario, acción, descripción o detalle..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Filtro Acción */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tipo de Acción
            </label>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="TODAS">Todas las Acciones</option>
              <option value="CREAR">CREAR</option>
              <option value="MODIFICAR">MODIFICAR</option>
              <option value="ELIMINAR">ELIMINAR</option>
              <option value="RESETEO_CONTADOR">RESETEO_CONTADOR</option>
              <option value="LOGIN">LOGIN</option>
              <option value="TRASLADO">TRASLADO</option>
              <option value="CAMBIO_PASSWORD">CAMBIO_PASSWORD</option>
            </select>
          </div>

          {/* Filtro Módulo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Módulo
            </label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="TODOS">Todos los Módulos</option>
              {modulosUnicos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Usuario */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Usuario
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="TODOS">Todos los Usuarios</option>
              {usuariosUnicos.map((u) => (
                <option key={u} value={u}>
                  @{u}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Delegación */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Delegación
            </label>
            <select
              value={filtroDelegacion}
              onChange={(e) => setFiltroDelegacion(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              <option value="TODAS">Todas las Delegaciones</option>
              {delegacionesList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.siglas || d.ciudad}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[11px]">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[11px]">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white"
            />
          </div>

          {(searchTerm || filtroAccion !== 'TODAS' || filtroModulo !== 'TODOS' || filtroUsuario !== 'TODOS' || filtroDelegacion !== 'TODAS' || fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFiltroAccion('TODAS');
                setFiltroModulo('TODOS');
                setFiltroUsuario('TODOS');
                setFiltroDelegacion('TODAS');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="text-blue-900 hover:underline font-bold text-[11px] ml-auto cursor-pointer"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800 text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">N°</th>
                <th className="py-2.5 px-3 w-36">Fecha y Hora</th>
                <th className="py-2.5 px-3 w-48">Usuario / Operador</th>
                <th className="py-2.5 px-3 w-32">Delegación</th>
                <th className="py-2.5 px-3 w-28 text-center">Módulo</th>
                <th className="py-2.5 px-3 w-32 text-center">Acción</th>
                <th className="py-2.5 px-3">Descripción / Evento</th>
                <th className="py-2.5 px-3 w-16 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No se encontraron registros de auditoría con los criterios especificados.
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((reg, index) => {
                  const fechaObj = new Date(reg.fechaHora);
                  const fechaStr = fechaObj.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const horaStr = fechaObj.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const delNombre =
                    delegacionesMap.get(reg.delegacionId) ||
                    reg.delegacionNombre ||
                    reg.delegacionId;

                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRegistro(reg)}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900">{fechaStr}</div>
                        <div className="font-mono text-slate-500 text-[10px]">{horaStr} hs</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{reg.apellidoYNombre}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <span>@{reg.username}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-blue-900">{reg.rol}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{delNombre}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {reg.modulo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAccionBadge(
                            reg.accion
                          )}`}
                        >
                          {reg.accion}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 line-clamp-2">
                          {reg.descripcion}
                        </div>
                        {reg.detalles && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">
                            {reg.detalles}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedRegistro(reg)}
                          className="px-2 py-1 text-[10px] font-bold text-blue-900 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle Completo de Auditoría */}
      {selectedRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Detalle de Evento de Auditoría</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRegistro(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Tipo de Acción:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getAccionBadge(
                    selectedRegistro.accion
                  )}`}
                >
                  {selectedRegistro.accion}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block font-semibold text-slate-500 text-[10px]">Fecha y Hora:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {new Date(selectedRegistro.fechaHora).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="block font-semibold text-slate-500 text-[10px]">Módulo:</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedRegistro.modulo}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="block font-semibold text-slate-500 text-[10px]">Operador Responsable:</span>
                <div className="font-bold text-slate-900">{selectedRegistro.apellidoYNombre}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Usuario: @{selectedRegistro.username} | Rol: {selectedRegistro.rol}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="block font-semibold text-slate-500 text-[10px]">Delegación:</span>
                <span className="font-medium text-slate-900">
                  {delegacionesMap.get(selectedRegistro.delegacionId) ||
                    selectedRegistro.delegacionNombre ||
                    selectedRegistro.delegacionId}
                </span>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-1">
                <span className="block font-bold text-blue-950 text-xs">Descripción del Evento:</span>
                <p className="text-slate-800 text-xs leading-relaxed">{selectedRegistro.descripcion}</p>
              </div>

              {selectedRegistro.detalles && (
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 space-y-1 font-mono text-[11px]">
                  <span className="block font-bold text-slate-700">Detalles Técnicos:</span>
                  <p className="text-slate-800 break-words whitespace-pre-wrap">
                    {selectedRegistro.detalles}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRegistro(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Purga */}
      <ConfirmModal
        isOpen={isConfirmPurgeOpen}
        title="¿Depurar registros de auditoría antiguos?"
        message={`Esta acción eliminará de forma permanente los registros de auditoría que tengan más de ${retencionDias} días de antigüedad según la política de retención configurada. Se recomienda haber exportado el informe oficial en PDF previamente. ¿Desea continuar?`}
        confirmLabel={`Sí, depurar registros (> ${retencionDias} días)`}
        isDestructive={true}
        onConfirm={handlePurgeLogsOlderThan}
        onClose={() => setIsConfirmPurgeOpen(false)}
      />
    </div>
  );
};
