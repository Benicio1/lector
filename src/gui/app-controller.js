/**
 * app-controller.js — Controlador Principal de la Interfaz del Lector Móvil
 * Integra modo letra grande para adultos, inmersión táctil, filtros y visor PDF.
 * Cumple estrictamente con el límite de 400 líneas de AGENTS.md.
 */

import {
  PRESET_MODES,
  PRESET_CONFIGS,
  sanitizeFilterValues,
  buildCanvasFilterStyle,
  buildWarmthOverlayStyle,
  getThemePalette
} from '../core/filter-engine.js';

import {
  loadSettings,
  saveSettings,
  recordBookProgress,
  getSavedPage,
  generateBookId
} from '../core/library-store.js';

import { saveBookFile, getBookFile } from '../core/book-cache.js';

import { PdfViewer } from '../core/pdf-viewer.js';
import { TextModeController } from './text-mode-controller.js';
import { FilterModalController } from './filter-modal-controller.js';
import { RecentShelf } from './recent-shelf.js';
import { ImmersionController } from './immersion-controller.js';

export class AppController {
  constructor() {
    this.viewer = null;
    this.textController = null;
    this.filterModal = null;
    this.recentShelf = null;
    this.immersion = null;
    this.settings = loadSettings();
    this.currentFile = null;
    this.activePreset = this.settings.preset || PRESET_MODES.WARM;
    this.viewMode = this.settings.viewMode || 'text';

    this.cacheDom();
    this.initPdfViewer();
    this.initTextController();
    this.initFilterModal();
    this.initRecentShelf();
    this.initImmersion();
    this.bindEvents();
    this.applyVisualFilters();
    this.updateModeUi();
  }

  cacheDom() {
    const byId = (id) => document.getElementById(id);
    this.viewLibrary = byId('view-library');
    this.viewReader = byId('view-reader');
    this.fileInput = byId('file-input');
    this.btnPickFile = byId('btn-pick-file');
    this.btnSampleBook = byId('btn-sample-book');
    this.dropZone = byId('drop-zone');
    this.recentListEl = byId('recent-books-list');
    this.emptyRecentsEl = byId('empty-recents');
    this.pdfContainer = byId('pdf-viewport');
    this.textContainer = byId('text-view-container');
    this.textReadingContent = byId('text-reading-content');
    this.warmthOverlay = byId('warmth-overlay');
    this.headerBar = byId('reader-header');
    this.fontControlsBar = byId('font-controls-bar');
    this.bottomBar = byId('reader-bottom-bar');
    this.docTitleEl = byId('doc-title');
    this.pageInfoEl = byId('page-info');
    this.btnBackHome = byId('btn-back-home');
    this.btnPrev = byId('btn-prev-page');
    this.btnNext = byId('btn-next-page');
    this.btnToggleViewMode = byId('btn-toggle-view-mode');
    this.controlsTextMode = byId('controls-text-mode');
    this.controlsPdfMode = byId('controls-pdf-mode');
    this.btnFontDecrease = byId('btn-font-decrease');
    this.btnFontIncrease = byId('btn-font-increase');
    this.fontSizeLabel = byId('font-size-label');
    this.selectFontFamily = byId('select-font-family');
    this.btnZoomDecrease = byId('btn-zoom-decrease');
    this.btnZoomIncrease = byId('btn-zoom-increase');
    this.zoomSizeLabel = byId('zoom-size-label');
    this.btnFitWidth = byId('btn-fit-width');
    this.btnOpenFilters = byId('btn-open-filters');
  }

  initPdfViewer() {
    this.viewer = new PdfViewer({
      container: this.pdfContainer,
      onPageChange: async ({ currentPage, totalPages }) => {
        this.updatePageUi(currentPage, totalPages);
        if (this.viewMode === 'text') await this.syncCurrentPageText();
        if (this.currentFile) {
          recordBookProgress({
            name: this.currentFile.name,
            size: this.currentFile.size,
            totalPages,
            currentPage
          });
        }
      },
      onError: (err) => {
        console.error('[AppController] Error visor:', err);
        alert('No se pudo abrir la página del PDF: ' + err.message);
      }
    });
  }

  initTextController() {
    this.textController = new TextModeController({
      container: this.textContainer,
      textEl: this.textReadingContent,
      onSettingsChange: (ch) => { this.settings = saveSettings(ch); }
    });
    this.textController.setFontSize(this.settings.fontSize || 24);
    this.textController.setFontFamily(this.settings.fontFamily || 'serif');
    if (this.selectFontFamily) this.selectFontFamily.value = this.settings.fontFamily || 'serif';
  }

  initFilterModal() {
    const byId = (id) => document.getElementById(id);
    this.filterModal = new FilterModalController({
      modalEl: byId('modal-filters'),
      chipsContainerEl: byId('preset-chips'),
      sliders: {
        brightness: { input: byId('slider-brightness'), valEl: byId('val-brightness') },
        warmth: { input: byId('slider-warmth'), valEl: byId('val-warmth') },
        contrast: { input: byId('slider-contrast'), valEl: byId('val-contrast') }
      },
      onFilterChange: (changes) => {
        if (changes.preset) this.activePreset = changes.preset;
        this.settings = saveSettings(changes);
        this.applyVisualFilters();
      },
      onReset: () => {
        const cfg = PRESET_CONFIGS[this.activePreset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
        this.settings = saveSettings({ brightness: cfg.brightness, warmth: cfg.warmth, contrast: cfg.contrast });
        this.filterModal.syncSliders(this.settings);
        this.applyVisualFilters();
      }
    });
  }

  initRecentShelf() {
    this.recentShelf = new RecentShelf({
      listEl: this.recentListEl,
      emptyEl: this.emptyRecentsEl,
      onSelectBook: (book) => this.resumeBook(book)
    });
    this.recentShelf.render();
  }

  initImmersion() {
    this.immersion = new ImmersionController({
      viewReader: this.viewReader,
      headerBar: this.headerBar,
      fontControlsBar: this.fontControlsBar,
      bottomBar: this.bottomBar,
      textContainer: this.textContainer,
      pdfContainer: this.pdfContainer
    });
  }

  bindEvents() {
    this.btnPickFile.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files[0]));
    if (this.btnSampleBook) this.btnSampleBook.addEventListener('click', () => this.loadSampleBook());

    this.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleFileSelection(e.dataTransfer.files[0]);
    });

    this.btnBackHome.addEventListener('click', () => this.showLibraryView());
    this.btnPrev.addEventListener('click', () => this.navigatePage(-1));
    this.btnNext.addEventListener('click', () => this.navigatePage(1));

    // Conmutador entre Modo Letra Grande y Modo PDF Original
    this.btnToggleViewMode.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'page' ? 'text' : 'page';
      this.settings = saveSettings({ viewMode: this.viewMode });
      this.updateModeUi();
      if (this.viewMode === 'text') this.syncCurrentPageText();
    });

    // Controles de tamaño de letra (Modo Texto)
    this.btnFontDecrease.addEventListener('click', () => {
      this.fontSizeLabel.textContent = `${this.textController.decreaseFontSize(2)}px`;
    });
    this.btnFontIncrease.addEventListener('click', () => {
      this.fontSizeLabel.textContent = `${this.textController.increaseFontSize(2)}px`;
    });
    if (this.selectFontFamily) {
      this.selectFontFamily.addEventListener('change', (e) => this.textController.setFontFamily(e.target.value));
    }

    // Controles de zoom (Modo PDF)
    this.btnZoomDecrease?.addEventListener('click', () => { this.viewer.zoom(0.85); this.updateZoomLabel(); });
    this.btnZoomIncrease?.addEventListener('click', () => { this.viewer.zoom(1.2); this.updateZoomLabel(); });
    this.btnFitWidth?.addEventListener('click', () => { this.viewer.fitToWidth(); this.updateZoomLabel(); });
    this.btnOpenFilters.addEventListener('click', () => this.filterModal.open(this.settings));

    window.addEventListener('keydown', (e) => {
      if (this.viewReader.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') this.navigatePage(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') this.navigatePage(-1);
    });
  }

  async navigatePage(delta) {
    if (delta > 0) await this.viewer.nextPage();
    else await this.viewer.prevPage();
  }

  async syncCurrentPageText() {
    if (!this.viewer) return;
    const text = await this.viewer.getPageText();
    this.textController.setPageText(text);
  }

  updateModeUi() {
    const isText = this.viewMode === 'text';
    this.textContainer.classList.toggle('hidden', !isText);
    this.pdfContainer.classList.toggle('hidden', isText);

    if (this.controlsTextMode && this.controlsPdfMode) {
      this.controlsTextMode.classList.toggle('hidden', !isText);
      this.controlsPdfMode.classList.toggle('hidden', isText);
    }

    if (isText) {
      this.btnToggleViewMode.innerHTML = '<span>📄</span> PDF';
      this.btnToggleViewMode.classList.add('active-text-mode');
      this.fontSizeLabel.textContent = `${this.textController.fontSize}px`;
    } else {
      this.btnToggleViewMode.innerHTML = '<span>👓</span> Texto';
      this.btnToggleViewMode.classList.remove('active-text-mode');
      this.updateZoomLabel();
    }
  }

  updateZoomLabel() {
    const pct = Math.round((this.viewer?.currentScale || 1.0) * 100);
    if (this.zoomSizeLabel) this.zoomSizeLabel.textContent = `${pct}%`;
  }

  async resumeBook(book) {
    if (!book) return;
    try {
      const cached = await getBookFile(book.id);
      if (cached) {
        await this.openDocumentBuffer(cached, {
          name: book.name,
          size: book.size,
          initialPage: book.currentPage
        });
        return;
      }
    } catch (err) {
      console.warn('[AppController] Error al reanudar libro desde caché:', err);
    }
    this.pendingResumePage = book.currentPage;
    this.fileInput.click();
  }

  async openDocumentBuffer(data, { name, size, initialPage = 1 } = {}) {
    this.currentFile = { name, size };
    this.docTitleEl.textContent = name;
    this.viewLibrary.classList.add('hidden');
    this.viewReader.classList.remove('hidden');
    this.immersion.toggleImmersion(false);

    try {
      let bufferToLoad = data;
      if (data instanceof ArrayBuffer) {
        bufferToLoad = data.slice(0);
      } else if (data && data.buffer instanceof ArrayBuffer) {
        bufferToLoad = data.buffer.slice(0);
      }
      await this.viewer.loadDocument({ data: bufferToLoad }, { name, size, initialPage });
      if (this.viewMode === 'text') await this.syncCurrentPageText();
    } catch (err) {
      alert('Error al leer el archivo PDF: ' + err.message);
      this.showLibraryView();
    }
  }

  async handleFileSelection(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }

    const initialPage = this.pendingResumePage || getSavedPage(file.name, file.size);
    this.pendingResumePage = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bookId = generateBookId(file.name, file.size);
      await saveBookFile(bookId, arrayBuffer);
      await this.openDocumentBuffer(arrayBuffer, {
        name: file.name,
        size: file.size,
        initialPage
      });
    } catch (err) {
      alert('Error al leer el archivo PDF: ' + err.message);
      this.showLibraryView();
    }
  }

  async loadSampleBook() {
    try {
      const res = await fetch('libro_de_ejemplo.pdf');
      const buf = await res.arrayBuffer();
      const name = 'Libro de Ejemplo (Confort Visual).pdf';
      const size = buf.byteLength;
      const initialPage = getSavedPage(name, size);
      const bookId = generateBookId(name, size);
      await saveBookFile(bookId, buf);
      await this.openDocumentBuffer(buf, { name, size, initialPage });
    } catch (err) {
      alert('No se pudo abrir el libro de ejemplo: ' + err.message);
    }
  }

  showLibraryView() {
    this.immersion.resetOnExit();
    this.viewReader.classList.add('hidden');
    this.viewLibrary.classList.remove('hidden');
    this.recentShelf.render();
  }

  updatePageUi(currentPage, totalPages) {
    this.pageInfoEl.textContent = `Página ${currentPage} de ${totalPages}`;
    this.btnPrev.disabled = currentPage <= 1;
    this.btnNext.disabled = currentPage >= totalPages;
  }

  applyVisualFilters() {
    const { brightness, contrast, warmth } = sanitizeFilterValues(this.settings);
    const filterStyle = buildCanvasFilterStyle({
      preset: this.activePreset,
      brightness,
      contrast
    });

    if (this.viewer && this.viewer.canvas) {
      this.viewer.canvas.style.filter = filterStyle;
    }

    const overlayStyle = buildWarmthOverlayStyle(warmth, this.activePreset);
    this.warmthOverlay.style.display = overlayStyle.display;
    this.warmthOverlay.style.opacity = overlayStyle.opacity;
    this.warmthOverlay.style.backgroundColor = overlayStyle.backgroundColor;
    this.warmthOverlay.style.mixBlendMode = overlayStyle.mixBlendMode || 'normal';

    const palette = getThemePalette(this.activePreset);
    document.documentElement.style.setProperty('--reader-canvas-bg', palette.canvasBg);
    document.documentElement.style.setProperty('--reader-viewport-bg', palette.readerBg);
    document.documentElement.style.setProperty('--reader-text-color', palette.textColor);
    document.documentElement.style.setProperty('--reader-heading-color', palette.headingColor);
  }
}
