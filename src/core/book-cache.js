/**
 * book-cache.js — Almacenamiento local persistente de archivos PDF en IndexedDB
 * Permite guardar el archivo PDF del libro para reanudar la lectura directamente
 * sin necesidad de que el usuario vuelva a buscar el archivo en su dispositivo.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

const DB_NAME = 'lector_pdf_db';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_files';

let dbPromise = null;
const memoryCache = new Map();

function getDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('[book-cache] Error al abrir IndexedDB:', request.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[book-cache] Excepción al inicializar IndexedDB:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Guarda el archivo PDF (ArrayBuffer o Blob) bajo el ID determinístico del libro.
 * Se almacena como Blob inmutable para evitar neutering/detachment de Web Workers.
 */
export async function saveBookFile(bookId, data) {
  if (!bookId || !data) return false;
  try {
    let toStore = data;
    if (typeof Blob !== 'undefined' && !(data instanceof Blob)) {
      toStore = new Blob([data], { type: 'application/pdf' });
    }
    const db = await getDb();
    if (!db) {
      memoryCache.set(bookId, toStore);
      return true;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(toStore, bookId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('[book-cache] Error al guardar en IndexedDB:', req.error);
        memoryCache.set(bookId, toStore);
        resolve(true);
      };
    });
  } catch (err) {
    console.warn('[book-cache] Excepción al guardar archivo:', err);
    memoryCache.set(bookId, data);
    return true;
  }
}

/**
 * Recupera el archivo PDF guardado en caché local como ArrayBuffer fresco e independiente.
 */
export async function getBookFile(bookId) {
  if (!bookId) return null;
  try {
    const db = await getDb();
    let result = null;
    if (db) {
      result = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(bookId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    }
    const item = result || memoryCache.get(bookId) || null;
    if (!item) return null;

    if (typeof Blob !== 'undefined' && item instanceof Blob) {
      return await item.arrayBuffer();
    }
    if (item instanceof ArrayBuffer) {
      return item.slice(0);
    }
    if (item.buffer instanceof ArrayBuffer) {
      return item.buffer.slice(0);
    }
    return item;
  } catch (err) {
    console.warn('[book-cache] Error al recuperar libro:', err);
    return null;
  }
}

/**
 * Elimina un archivo PDF de la caché local cuando se quita de la biblioteca.
 */
export async function deleteBookFile(bookId) {
  if (!bookId) return false;
  memoryCache.delete(bookId);
  try {
    const db = await getDb();
    if (!db) return true;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(bookId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
