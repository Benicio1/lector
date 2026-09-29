/**
 * lector.test.mjs — Pruebas Unitarias y de Integración para Lector Confort PDF
 * Valida el motor de filtros de luz, cálculos ópticos, paletas y persistencia local.
 * Ejecutable nativamente con Node.js Test Runner: `npm test` o `node --test test/lector.test.mjs`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PRESET_MODES,
  PRESET_CONFIGS,
  sanitizeFilterValues,
  buildCanvasFilterStyle,
  buildWarmthOverlayStyle,
  getThemePalette
} from '../src/core/filter-engine.js';

import {
  loadSettings,
  saveSettings,
  generateBookId,
  getRecentBooks,
  recordBookProgress,
  getSavedPage,
  removeRecentBook
} from '../src/core/library-store.js';

describe('Motor de Filtros de Luz y Confort Visual (filter-engine)', () => {
  it('debe tener definidos los 6 presets requeridos', () => {
    const required = ['normal', 'warm', 'sepia', 'night', 'oled', 'eink'];
    for (const key of required) {
      assert.ok(PRESET_CONFIGS[key], `Falta preset: ${key}`);
      assert.ok(PRESET_CONFIGS[key].name, `Preset ${key} debe tener nombre`);
      assert.ok(typeof PRESET_CONFIGS[key].brightness === 'number');
      assert.ok(typeof PRESET_CONFIGS[key].contrast === 'number');
    }
  });

  it('debe sanitizar valores extremos o inválidos', () => {
    const clean = sanitizeFilterValues({
      brightness: 9999,
      contrast: -50,
      warmth: 300,
      preset: 'inexistente'
    });

    assert.equal(clean.brightness, 140);
    assert.equal(clean.contrast, 60);
    assert.equal(clean.warmth, 100);
    assert.equal(clean.preset, PRESET_MODES.NORMAL);
  });

  it('debe generar filtro CSS adecuado para Modo Normal', () => {
    const css = buildCanvasFilterStyle({
      preset: PRESET_MODES.NORMAL,
      brightness: 100,
      contrast: 100
    });

    assert.ok(css.includes('brightness(100%)'));
    assert.ok(css.includes('contrast(100%)'));
    assert.ok(!css.includes('invert'));
  });

  it('debe generar inversión y rotación de tono para Modo Noche y OLED', () => {
    const nightCss = buildCanvasFilterStyle({ preset: PRESET_MODES.NIGHT, brightness: 100, contrast: 100 });
    assert.ok(nightCss.includes('invert(92%)'));
    assert.ok(nightCss.includes('hue-rotate(180deg)'));

    const oledCss = buildCanvasFilterStyle({ preset: PRESET_MODES.OLED, brightness: 100, contrast: 100 });
    assert.ok(oledCss.includes('invert(100%)'));
  });

  it('debe aplicar sepia en modo Sepia y escala de grises en modo e-Ink', () => {
    const sepiaCss = buildCanvasFilterStyle({ preset: PRESET_MODES.SEPIA, brightness: 100, contrast: 100 });
    assert.ok(sepiaCss.includes('sepia(72%)'));

    const einkCss = buildCanvasFilterStyle({ preset: PRESET_MODES.EINK, brightness: 100, contrast: 100 });
    assert.ok(einkCss.includes('grayscale(100%)'));
  });

  it('debe calcular correctamente la capa overlay de luz cálida (anti-azul)', () => {
    // Normal sin calidez adicional -> display: none
    const normalOverlay = buildWarmthOverlayStyle(0, PRESET_MODES.NORMAL);
    assert.equal(normalOverlay.display, 'none');

    // Luz cálida -> activo con tono ámbar y blend multiply
    const warmOverlay = buildWarmthOverlayStyle(20, PRESET_MODES.WARM);
    assert.equal(warmOverlay.display, 'block');
    assert.equal(warmOverlay.backgroundColor, '#ff9800');
    assert.equal(warmOverlay.mixBlendMode, 'multiply');
    assert.ok(warmOverlay.opacity > 0 && warmOverlay.opacity <= 1);
  });

  it('debe devolver paletas de colores válidas según el preset', () => {
    const oledPalette = getThemePalette(PRESET_MODES.OLED);
    assert.equal(oledPalette.canvasBg, '#000000');
    assert.equal(oledPalette.readerBg, '#000000');
    assert.equal(oledPalette.headingColor, '#f59e0b');

    const sepiaPalette = getThemePalette(PRESET_MODES.SEPIA);
    assert.equal(sepiaPalette.canvasBg, '#f5ecd7');
    assert.equal(sepiaPalette.headingColor, '#78350f');
  });
});

describe('Persistencia y Biblioteca de Lectura (library-store)', () => {
  it('debe guardar y recuperar configuraciones', () => {
    saveSettings({ preset: 'oled', brightness: 75 });
    const loaded = loadSettings();
    assert.equal(loaded.preset, 'oled');
    assert.equal(loaded.brightness, 75);
  });

  it('debe generar un ID determinístico para el archivo PDF', () => {
    const id1 = generateBookId('Mi Libro Favorito.pdf', 1048576);
    const id2 = generateBookId('Mi Libro Favorito.pdf', 1048576);
    const id3 = generateBookId('Otro Libro.pdf', 1048576);

    assert.equal(id1, id2);
    assert.notEqual(id1, id3);
    assert.ok(id1.includes('1048576'));
  });

  it('debe registrar el progreso de lectura y recordar la página actual', () => {
    recordBookProgress({
      name: 'Novela.pdf',
      size: 500000,
      totalPages: 320,
      currentPage: 42
    });

    const savedPage = getSavedPage('Novela.pdf', 500000);
    assert.equal(savedPage, 42);

    const recents = getRecentBooks();
    assert.ok(recents.length >= 1);
    assert.equal(recents[0].name, 'Novela.pdf');
    assert.equal(recents[0].currentPage, 42);
  });

  it('debe permitir eliminar un libro de la lista reciente', () => {
    recordBookProgress({
      name: 'Temporal.pdf',
      size: 12345,
      totalPages: 10,
      currentPage: 2
    });

    const id = generateBookId('Temporal.pdf', 12345);
    const removed = removeRecentBook(id);
    assert.equal(removed, true);

    const pageAfter = getSavedPage('Temporal.pdf', 12345);
    assert.equal(pageAfter, 1); // default 1 al no existir
  });
});

import { TextModeController } from '../src/gui/text-mode-controller.js';

describe('Modo Letra Grande y Tipografías (TextModeController)', () => {
  it('debe ajustar y limitar el tamaño de letra entre 16px y 42px', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    assert.equal(controller.fontSize, 24);
    controller.setFontSize(50);
    assert.equal(controller.fontSize, 42); // capped at 42
    controller.setFontSize(10);
    assert.equal(controller.fontSize, 16); // min at 16

    controller.increaseFontSize(4);
    assert.equal(controller.fontSize, 20);
    controller.decreaseFontSize(2);
    assert.equal(controller.fontSize, 18);
  });

  it('debe configurar tipografías válidas', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    controller.setFontFamily('sans-serif');
    assert.equal(controller.fontFamily, 'sans-serif');
    assert.ok(mockTextEl.style.fontFamily.includes('Segoe UI') || mockTextEl.style.fontFamily.includes('Roboto'));

    controller.setFontFamily('readable');
    assert.equal(controller.fontFamily, 'readable');
    assert.ok(mockTextEl.style.fontFamily.includes('Verdana'));
  });

  it('debe formatear párrafos para lectura fluida', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    controller.setPageText('Primer párrafo largo.\n\nSegundo párrafo claro.');
    assert.ok(mockTextEl.innerHTML.includes('<p class="reading-paragraph">Primer párrafo largo.</p>'));
    assert.ok(mockTextEl.innerHTML.includes('<p class="reading-paragraph">Segundo párrafo claro.</p>'));
  });

  it('debe renderizar bloques estructurados distinguiendo títulos de capítulos y subtítulos', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    const blocks = [
      { type: 'title', text: 'La infancia minusválida' },
      { type: 'subtitle', text: 'Sección Primera' },
      { type: 'paragraph', text: 'El sol de la mañana entraba tímidamente por la ventana.' }
    ];

    controller.setPageText(blocks);
    assert.ok(mockTextEl.innerHTML.includes('<h2 class="reading-chapter-title">La infancia minusválida</h2>'));
    assert.ok(mockTextEl.innerHTML.includes('<h3 class="reading-section-title">Sección Primera</h3>'));
    assert.ok(mockTextEl.innerHTML.includes('<p class="reading-paragraph">El sol de la mañana entraba tímidamente por la ventana.</p>'));
  });

  it('debe detectar títulos de capítulos en texto plano sin la palabra capítulo', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    controller.setPageText('La infancia minusválida\n\nEl sol de la mañana entraba por la ventana.');
    assert.ok(mockTextEl.innerHTML.includes('<h2 class="reading-chapter-title">La infancia minusválida</h2>'));
    assert.ok(mockTextEl.innerHTML.includes('<p class="reading-paragraph">El sol de la mañana entraba por la ventana.</p>'));
  });

  it('debe unir líneas continuas que no terminan en punto para evitar pausas artificiales', () => {
    const mockContainer = { scrollTop: 0 };
    const mockTextEl = { style: {}, innerHTML: '' };
    const controller = new TextModeController({
      container: mockContainer,
      textEl: mockTextEl
    });

    // Líneas partidas por el ancho de la página en el PDF pero pertenecientes a la misma oración
    const rawContinuousLines = 'El sonido atraviesa la villa envuelta en las\nsombras, rebota en los galpones del ferrocarril y\nsuena como la trompeta de un ángel.';
    controller.setPageText(rawContinuousLines);

    // Debe generar UN ÚNICO párrafo continuo, sin separar 'las' de 'sombras' ni 'y' de 'suena'
    assert.ok(mockTextEl.innerHTML.includes('<p class="reading-paragraph">El sonido atraviesa la villa envuelta en las sombras, rebota en los galpones del ferrocarril y suena como la trompeta de un ángel.</p>'));
    const paragraphMatches = mockTextEl.innerHTML.match(/<p class="reading-paragraph">/g);
    assert.equal(paragraphMatches.length, 1);
  });
});

import { saveBookFile, getBookFile, deleteBookFile } from '../src/core/book-cache.js';

describe('Caché Local Persistente de Libros (book-cache)', () => {
  it('debe guardar, recuperar y eliminar datos binarios de libros para reanudación directa', async () => {
    const bookId = 'haroldo_conti_como_un_leon_524288';
    const fakeData = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer; // %PDF-1.7

    // Guardar
    const saved = await saveBookFile(bookId, fakeData);
    assert.equal(saved, true);

    // Recuperar directamente sin buscar en el dispositivo
    const retrieved = await getBookFile(bookId);
    assert.ok(retrieved);
    const view = new Uint8Array(retrieved);
    assert.equal(view[0], 37);
    assert.equal(view[1], 80);

    // Eliminar al quitar de biblioteca
    const deleted = await deleteBookFile(bookId);
    assert.equal(deleted, true);

    const afterDelete = await getBookFile(bookId);
    assert.equal(afterDelete, null);
  });
});

import { AppController } from '../src/gui/app-controller.js';

describe('Controlador Principal (AppController)', () => {
  it('debe exportar la clase AppController correctamente sin errores de sintaxis', () => {
    assert.equal(typeof AppController, 'function');
  });
});

