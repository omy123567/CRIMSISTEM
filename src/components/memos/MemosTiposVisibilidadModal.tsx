import React, { useState, useMemo, useEffect } from 'react';
import {
  ConfiguracionSistema,
  PerfilAccesoFolio,
  SerieNumerario,
  TipoMemoCatalogoItem,
  UsuarioSistema,
} from '../../types/police';
import {
  ALL_PERFILES_ACCESO_FOLIO,
  PERFILES_ACCESO_FOLIO_INFO,
  buildUnifiedTiposMemosOptions,
  getPerfilFolioLabel,
  isTipoMemoHiddenForUser,
  normalizePerfilesVisibles,
  normalizeTipoKey,
  normalizeTiposMemoCatalogo,
  resolveUserFolioPerfil,
} from '../../utils/memosCatalogUtils';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  CheckCircle2,
  BookmarkCheck,
  Users,
  Check,
  Shield,
} from 'lucide-react';

interface MemosTiposVisibilidadModalProps {
  isOpen: boolean;
  config: ConfiguracionSistema;
  seriesList: SerieNumerario[];
  usuariosList: UsuarioSistema[];
  currentUser?: UsuarioSistema | null;
  activeDelegacionId: string;
  onSaveConfig: (cfg: ConfiguracionSistema) => Promise<void> | void;
  onSaveUsuario?: (user: UsuarioSistema) => Promise<void> | void;
  onSaveSerie?: (serie: SerieNumerario) => Promise<void> | void;
  onClose: () => void;
}

export const MemosTiposVisibilidadModal: React.FC<MemosTiposVisibilidadModalProps> = ({
  isOpen,
  config,
  seriesList,
  usuariosList,
  currentUser,
  activeDelegacionId,
  onSaveConfig,
  onSaveUsuario,
  onSaveSerie,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tipos' | 'visibilidad'>('tipos');
  const [newNombre, setNewNombre] = useState('');
  const [newPrefijo, setNewPrefijo] = useState('');
  const [newPerfilesVisibles, setNewPerfilesVisibles] = useState<PerfilAccesoFolio[]>([
    ...ALL_PERFILES_ACCESO_FOLIO,
  ]);
  const [notice, setNotice] = useState<string | null>(null);

  const isSuperUser = currentUser?.rol === 'superusuario';

  const editableUsers = useMemo(() => {
    return usuariosList.filter(
      (u) =>
        u.rol !== 'superusuario' &&
        (isSuperUser ||
          currentUser?.puedeVerOtrasDelegaciones ||
          u.delegacionId === activeDelegacionId)
    );
  }, [usuariosList, isSuperUser, currentUser?.puedeVerOtrasDelegaciones, activeDelegacionId]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [draftHiddenKeys, setDraftHiddenKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    setNewPerfilesVisibles([...ALL_PERFILES_ACCESO_FOLIO]);
    if (!selectedUserId && editableUsers.length > 0) {
      const first = editableUsers[0];
      setSelectedUserId(first.id);
      setDraftHiddenKeys(first.tiposMemosOcultos || []);
    } else if (selectedUserId) {
      const found = editableUsers.find((u) => u.id === selectedUserId);
      if (found) setDraftHiddenKeys(found.tiposMemosOcultos || []);
    }
  }, [isOpen, editableUsers, selectedUserId]);

  if (!isOpen) return null;

  const catalogoActual = normalizeTiposMemoCatalogo(config.tiposMemoCatalogo);
  const customOnlyCatalogo = (config.tiposMemoCatalogo || []).filter((t) => !t.esDefault);
  const unifiedOptions = buildUnifiedTiposMemosOptions(config, seriesList);

  const toggleNewPerfil = (perfil: PerfilAccesoFolio) => {
    setNewPerfilesVisibles((prev) =>
      prev.includes(perfil) ? prev.filter((p) => p !== perfil) : [...prev, perfil]
    );
  };

  const handleAddTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newNombre.trim();
    if (!clean) return;
    const exists = unifiedOptions.some(
      (t) => normalizeTipoKey(t.nombre) === normalizeTipoKey(clean)
    );
    if (exists) {
      setNotice(`El Tipo / Serie "${clean}" ya existe en Control de Folios.`);
      return;
    }

    const cleanPrefijo = newPrefijo.trim() || `${clean} N°`;
    if (onSaveSerie) {
      await onSaveSerie({
        id: `serie-${Date.now()}`,
        nombre: clean,
        prefijo: cleanPrefijo,
        anio: new Date().getFullYear(),
        limiteFolios: 1000,
        columnas: 20,
        color: 'blue',
        delegacionId: activeDelegacionId,
        descripcion: 'Serie creada desde Memos y Notas',
        perfilesVisibles: [...newPerfilesVisibles],
        createdAt: new Date().toISOString(),
      });
    } else {
      const item: TipoMemoCatalogoItem = {
        id: `tm-${Date.now()}`,
        nombre: clean,
        prefijo: cleanPrefijo,
        esDefault: false,
        activo: true,
        perfilesVisibles: [...newPerfilesVisibles],
      };
      await onSaveConfig({
        ...config,
        tiposMemoCatalogo: [...catalogoActual, item],
      });
    }

    setNewNombre('');
    setNewPrefijo('');
    setNewPerfilesVisibles([...ALL_PERFILES_ACCESO_FOLIO]);
    setNotice(`Se agregó "${clean}" y quedó sincronizado con Control de Folios.`);
  };

  const handleToggleSeriePerfil = async (serie: SerieNumerario, perfil: PerfilAccesoFolio) => {
    if (!onSaveSerie) return;
    const current = normalizePerfilesVisibles(serie.perfilesVisibles);
    const next = current.includes(perfil)
      ? current.filter((p) => p !== perfil)
      : [...current, perfil];
    await onSaveSerie({
      ...serie,
      perfilesVisibles: next,
      updatedAt: new Date().toISOString(),
    });
    const label = getPerfilFolioLabel(perfil);
    setNotice(
      `"${serie.nombre}" ahora está ${next.includes(perfil) ? 'VISIBLE' : 'OCULTO'} para el perfil ${label}.`
    );
  };

  const handleToggleCatalogoPerfil = async (
    item: TipoMemoCatalogoItem,
    perfil: PerfilAccesoFolio
  ) => {
    const current = normalizePerfilesVisibles(item.perfilesVisibles);
    const next = current.includes(perfil)
      ? current.filter((p) => p !== perfil)
      : [...current, perfil];
    const updated = catalogoActual.map((t) =>
      t.id === item.id || normalizeTipoKey(t.nombre) === normalizeTipoKey(item.nombre)
        ? { ...t, perfilesVisibles: next }
        : t
    );
    await onSaveConfig({
      ...config,
      tiposMemoCatalogo: updated,
    });
    const label = getPerfilFolioLabel(perfil);
    setNotice(
      `"${item.nombre}" ahora está ${next.includes(perfil) ? 'VISIBLE' : 'OCULTO'} para el perfil ${label}.`
    );
  };

  const handleToggleTipoActivo = async (id: string) => {
    const updated = catalogoActual.map((t) =>
      t.id === id ? { ...t, activo: !t.activo } : t
    );
    await onSaveConfig({
      ...config,
      tiposMemoCatalogo: updated,
    });
  };

  const handleDeleteCustomTipo = async (id: string) => {
    const updated = catalogoActual.filter((t) => t.id !== id || t.esDefault);
    await onSaveConfig({
      ...config,
      tiposMemoCatalogo: updated,
    });
    setNotice('Tipo personalizado eliminado del catálogo.');
  };

  const handleSelectUser = (uid: string) => {
    setSelectedUserId(uid);
    const user = editableUsers.find((u) => u.id === uid);
    setDraftHiddenKeys(user?.tiposMemosOcultos || []);
    setNotice(null);
  };

  const toggleOptionVisibility = (key: string, serieFolioId?: string, nombre?: string) => {
    setDraftHiddenKeys((prev) => {
      const targetKeys = [
        key,
        serieFolioId ? `serie:${serieFolioId}` : '',
        nombre ? normalizeTipoKey(nombre) : '',
      ].filter(Boolean);
      const isCurrentlyHidden = prev.some(
        (item) =>
          targetKeys.includes(item) ||
          (nombre && normalizeTipoKey(item) === normalizeTipoKey(nombre))
      );
      if (isCurrentlyHidden) {
        return prev.filter(
          (item) =>
            !targetKeys.includes(item) &&
            (!nombre || normalizeTipoKey(item) !== normalizeTipoKey(nombre))
        );
      }
      return [...prev, key];
    });
  };

  const handleSaveUserVisibility = async () => {
    if (!onSaveUsuario || !selectedUserId) return;
    const target = editableUsers.find((u) => u.id === selectedUserId);
    if (!target) return;
    await onSaveUsuario({
      ...target,
      tiposMemosOcultos: draftHiddenKeys,
      updatedAt: new Date().toISOString(),
    });
    setNotice(`Visibilidad de tipos/folios actualizada para @${target.username}.`);
  };

  const selectedUserObj = editableUsers.find((u) => u.id === selectedUserId) || null;
  const selectedUserPerfil = selectedUserObj ? resolveUserFolioPerfil(selectedUserObj) : 'comun';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-400/30 text-blue-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Configurar Tipos / Series de Folio y Visibilidad por Perfil
              </h2>
              <p className="text-[11px] text-slate-300">
                Defina qué puede ver Usuarios Comunes, Jefe y Mayoría / Judicial, además de excepciones por usuario
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tipos')}
            className={`px-3.5 py-2 rounded-t-lg text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'tipos'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Tipos / Series y Visibilidad por Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visibilidad')}
            className={`px-3.5 py-2 rounded-t-lg text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'visibilidad'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Ocultar para Usuario Puntual</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {notice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {activeTab === 'tipos' ? (
            <div className="space-y-5">
              {/* Formulario para agregar nuevo tipo */}
              <form
                onSubmit={handleAddTipo}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <h3 className="font-bold text-slate-900">Agregar Nuevo Tipo / Serie de Folio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nombre del Tipo / Serie *
                    </label>
                    <input
                      type="text"
                      value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                      placeholder="Ej: Nota Reservada, Oficio Jefatura, Parte Especial..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Prefijo Sugerido
                    </label>
                    <input
                      type="text"
                      value={newPrefijo}
                      onChange={(e) => setNewPrefijo(e.target.value)}
                      placeholder="Ej: Nota Res. N°"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Perfiles habilitados para el nuevo tipo */}
                <div className="pt-1 space-y-1.5">
                  <span className="font-semibold text-slate-700 block">
                    Visible para los siguientes perfiles:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PERFILES_ACCESO_FOLIO_INFO.map((p) => {
                      const checked = newPerfilesVisibles.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                            checked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNewPerfil(p.id)}
                            className="w-3.5 h-3.5 accent-emerald-700"
                          />
                          <span className="truncate">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Tipo / Serie</span>
                  </button>
                </div>
              </form>

              {/* Series heredadas desde Control de Folios con matriz por perfil */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <BookmarkCheck className="w-4 h-4 text-blue-800" />
                    <span>
                      Series sincronizadas desde &ldquo;Control de Folios&rdquo; ({seriesList.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Haga clic en cada perfil para habilitar (<strong className="text-emerald-700">Visible</strong>) o restringir (<strong className="text-red-700">Oculto</strong>)
                  </span>
                </div>

                {seriesList.length === 0 ? (
                  <p className="text-slate-500 italic">
                    No hay series cargadas en Control de Folios para esta delegación.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {seriesList.map((s) => {
                      const perfiles = normalizePerfilesVisibles(s.perfilesVisibles);
                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-950 truncate">{s.nombre}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 shrink-0">
                                Control de Folios
                              </span>
                            </div>
                            <div className="text-[11px] text-blue-800 font-mono mt-0.5">
                              Prefijo: {s.prefijo} · Año {s.anio}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {PERFILES_ACCESO_FOLIO_INFO.map((p) => {
                              const visible = perfiles.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={!onSaveSerie}
                                  onClick={() => handleToggleSeriePerfil(s, p.id)}
                                  title={`${visible ? 'Ocultar' : 'Habilitar'} "${s.nombre}" para ${p.label} (${p.desc})`}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                                    visible
                                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                                      : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-900'
                                  }`}
                                >
                                  {visible ? (
                                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-red-700" />
                                  )}
                                  <span>{p.shortLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catálogo secundario (solo si Control de Folios está vacío o si hay tipos personalizados extra) */}
              {(seriesList.length === 0 || customOnlyCatalogo.length > 0) && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800">
                    {seriesList.length === 0
                      ? `Tipos de respaldo (${catalogoActual.length})`
                      : `Tipos personalizados adicionales (${customOnlyCatalogo.length})`}
                  </h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {(seriesList.length === 0 ? catalogoActual : customOnlyCatalogo).map((t) => {
                      const perfiles = normalizePerfilesVisibles(t.perfilesVisibles);
                      return (
                        <div
                          key={t.id}
                          className="px-3.5 py-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">
                              {t.nombre}{' '}
                              {!t.activo && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  (Inactivo)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Prefijo: {t.prefijo || `${t.nombre} N°`}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {PERFILES_ACCESO_FOLIO_INFO.map((p) => {
                              const visible = perfiles.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleToggleCatalogoPerfil(t, p.id)}
                                  title={`${visible ? 'Ocultar' : 'Habilitar'} "${t.nombre}" para ${p.label}`}
                                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                                    visible
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'bg-red-50 border-red-300 text-red-900'
                                  }`}
                                >
                                  {visible ? (
                                    <Eye className="w-3 h-3 text-emerald-700" />
                                  ) : (
                                    <EyeOff className="w-3 h-3 text-red-700" />
                                  )}
                                  <span>{p.shortLabel}</span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => handleToggleTipoActivo(t.id)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                                t.activo
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {t.activo ? 'Activo' : 'Inactivo'}
                            </button>
                            {!t.esDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTipo(t.id)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Eliminar tipo personalizado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!onSaveUsuario || editableUsers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                  No hay usuarios editables disponibles en esta delegación para restringir tipos o folios.
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-800" />
                      <span>Seleccionar Usuario</span>
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleSelectUser(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    >
                      {editableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.apellidoYNombre} (@{u.username}) — {u.rol} [Perfil:{' '}
                          {getPerfilFolioLabel(resolveUserFolioPerfil(u))}]
                        </option>
                      ))}
                    </select>
                    {selectedUserObj && (
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-900 pt-1">
                        <Shield className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>
                          Perfil efectivo de acceso a Folios:{' '}
                          <strong>{getPerfilFolioLabel(selectedUserPerfil)}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedUserObj && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-600">
                        Marque los tipos de documentos o series de <strong>Control de Folios</strong> que desea{' '}
                        <strong className="text-red-700">ocultar / quitar</strong> puntualmente para{' '}
                        <strong>{selectedUserObj.apellidoYNombre}</strong>. Los tipos restringidos a su perfil ({getPerfilFolioLabel(selectedUserPerfil)}) ya figuran ocultos automáticamente.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                        {unifiedOptions.map((opt) => {
                          const hiddenByProfile = !opt.perfilesVisibles.includes(selectedUserPerfil);
                          const simulatedUser: UsuarioSistema = {
                            ...selectedUserObj,
                            tiposMemosOcultos: draftHiddenKeys,
                          };
                          const isHidden = isTipoMemoHiddenForUser(
                            opt,
                            simulatedUser,
                            undefined,
                            seriesList,
                            config
                          );
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              disabled={hiddenByProfile}
                              onClick={() =>
                                toggleOptionVisibility(opt.key, opt.serieFolioId, opt.nombre)
                              }
                              className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                                hiddenByProfile
                                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 cursor-not-allowed opacity-85'
                                  : isHidden
                                  ? 'bg-red-50 border-red-300 text-red-950 cursor-pointer'
                                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold truncate">{opt.nombre}</div>
                                <div className="text-[10px] text-slate-500">
                                  {hiddenByProfile
                                    ? `Restringido al perfil ${getPerfilFolioLabel(selectedUserPerfil)}`
                                    : opt.esDeControlFolios
                                    ? 'Serie Control de Folios'
                                    : 'Tipo Memos y Notas'}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                                  hiddenByProfile
                                    ? 'bg-amber-600 text-white'
                                    : isHidden
                                    ? 'bg-red-600 text-white'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {hiddenByProfile ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    <span>Por Perfil</span>
                                  </>
                                ) : isHidden ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    <span>Oculto</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>Visible</span>
                                  </>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveUserVisibility}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Guardar Visibilidad del Usuario</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
