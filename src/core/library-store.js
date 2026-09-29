/**
 * library-store.js — Gestión de Biblioteca Local y Memoria de Progreso
 * Persiste libros recientes, última página leída y configuraciones de lectura.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

const STORAGE_KEYS = {
  SETTINGS: 'lector_confort_settings',
  RECENTS: 'lector_confort_recents',
  BOOKMARKS: 'lector_confort_bookmarks'
};

const DEFAULT_SETTINGS = {
  preset: 'warm',
  brightness: 95,
  warmth: 30,
  contrast: 100,
  readingMode: 'paged', // 'paged' | 'continuous'
  fitMode: 'width' // 'width' | 'page' | 'custom'
};

/**
 * Helper seguro para acceder a storage (compatible con Node.js en tests).
 */
function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // En memoria para entornos de prueba
  if (!globalThis._mockStorage) {
    globalThis._mockStorage = new Map();
  }
  return {
    getItem: (k) => globalThis._mockStorage.get(k) || null,
    setItem: (k, v) => globalThis._mockStorage.set(k, String(v)),
    removeItem: (k) => globalThis._mockStorage.delete(k),
    clear: () => globalThis._mockStorage.clear()
  };
}

/**
 * Carga configuraciones de usuario guardadas.
 */
export function loadSettings() {
  try {
    const raw = getStorage().getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Guarda configuraciones de usuario.
 */
export function saveSettings(settings) {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    getStorage().setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[library-store] Error al guardar configuraciones:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Genera una huella simple (ID) para el archivo PDF basada en nombre y tamaño.
 */
export function generateBookId(name, size) {
  const cleanName = (name || 'doc').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${cleanName}_${size || 0}`;
}

/**
 * Obtiene la lista de libros leídos recientemente.
 */
export function getRecentBooks() {
  try {
    const raw = getStorage().getItem(STORAGE_KEYS.RECENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Registra o actualiza un libro en la biblioteca reciente con su última página.
 */
export function recordBookProgress({ name, size, totalPages, currentPage }) {
  if (!name) return null;
  const id = generateBookId(name, size);
  const recents = getRecentBooks().filter(b => b.id !== id);

  const entry = {
    id,
    name,
    size: Number(size) || 0,
    totalPages: Number(totalPages) || 1,
    currentPage: Math.max(1, Number(currentPage) || 1),
    updatedAt: Date.now()
  };

  // Guardar al inicio (máximo 15 libros recientes)
  recents.unshift(entry);
  if (recents.length > 15) recents.pop();

  try {
    getStorage().setItem(STORAGE_KEYS.RECENTS, JSON.stringify(recents));
  } catch (err) {
    console.warn('[library-store] No se pudo guardar progreso reciente:', err);
  }

  return entry;
}

/**
 * Obtiene la última página leída guardada de un libro.
 */
export function getSavedPage(name, size) {
  const id = generateBookId(name, size);
  const found = getRecentBooks().find(b => b.id === id);
  return found ? found.currentPage : 1;
}

/**
 * Elimina un libro de la lista reciente.
 */
export function removeRecentBook(id) {
  const recents = getRecentBooks().filter(b => b.id !== id);
  try {
    getStorage().setItem(STORAGE_KEYS.RECENTS, JSON.stringify(recents));
    return true;
  } catch {
    return false;
  }
}
