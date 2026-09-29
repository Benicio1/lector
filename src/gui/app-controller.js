/**
 * app-controller.js — Controlador Principal de la Interfaz del Lector Móvil
 * Integra PDF, modo letra grande para adultos, filtros y biblioteca reciente.
 * Cumple con el límite de 400 líneas de AGENTS.md.
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
  getRecentBooks,
  recordBookProgress,
  getSavedPage,
  removeRecentBook
} from '../core/library-store.js';

import { PdfViewer } from '../core/pdf-viewer.js';
import { TextModeController } from './text-mode-controller.js';
import { FilterModalController } from './filter-modal-controller.js';

export class AppController {
  constructor() {
    this.viewer = null;
    this.textController = null;
    this.filterModal = null;
    this.settings = loadSettings();
    this.currentFile = null;
    this.activePreset = this.settings.preset || PRESET_MODES.WARM;
    this.viewMode = this.settings.viewMode || 'page';

    this.cacheDom();
    this.initPdfViewer();
    this.initTextController();
    this.initFilterModal();
    this.bindEvents();
    this.renderRecentBooks();
    this.applyVisualFilters();
    this.updateModeUi();
  }

  cacheDom() {
    this.viewLibrary = document.getElementById('view-library');
    this.viewReader = document.getElementById('view-reader');
    this.fileInput = document.getElementById('file-input');
    this.btnPickFile = document.getElementById('btn-pick-file');
    this.btnSampleBook = document.getElementById('btn-sample-book');
    this.dropZone = document.getElementById('drop-zone');
    this.recentListEl = document.getElementById('recent-books-list');
    this.emptyRecentsEl = document.getElementById('empty-recents');

    this.pdfContainer = document.getElementById('pdf-viewport');
    this.textContainer = document.getElementById('text-view-container');
    this.textReadingContent = document.getElementById('text-reading-content');
    this.warmthOverlay = document.getElementById('warmth-overlay');

    this.docTitleEl = document.getElementById('doc-title');
    this.pageInfoEl = document.getElementById('page-info');
    this.btnBackHome = document.getElementById('btn-back-home');
    this.btnPrev = document.getElementById('btn-prev-page');
    this.btnNext = document.getElementById('btn-next-page');

    this.btnToggleViewMode = document.getElementById('btn-toggle-view-mode');
    this.btnFontDecrease = document.getElementById('btn-font-decrease');
    this.btnFontIncrease = document.getElementById('btn-font-increase');
    this.fontSizeLabel = document.getElementById('font-size-label');
    this.selectFontFamily = document.getElementById('select-font-family');
    this.btnOpenFilters = document.getElementById('btn-open-filters');
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
    this.filterModal = new FilterModalController({
      modalEl: document.getElementById('modal-filters'),
      chipsContainerEl: document.getElementById('preset-chips'),
      sliders: {
        brightness: {
          input: document.getElementById('slider-brightness'),
          valEl: document.getElementById('val-brightness')
        },
        warmth: {
          input: document.getElementById('slider-warmth'),
          valEl: document.getElementById('val-warmth')
        },
        contrast: {
          input: document.getElementById('slider-contrast'),
          valEl: document.getElementById('val-contrast')
        }
      },
      onFilterChange: (changes) => {
        if (changes.preset) this.activePreset = changes.preset;
        this.settings = saveSettings(changes);
        this.applyVisualFilters();
      },
      onReset: () => {
        const cfg = PRESET_CONFIGS[this.activePreset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
        this.settings = saveSettings({
          brightness: cfg.brightness,
          warmth: cfg.warmth,
          contrast: cfg.contrast
        });
        this.filterModal.syncSliders(this.settings);
        this.applyVisualFilters();
      }
    });
  }

  bindEvents() {
    this.btnPickFile.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files[0]));
    if (this.btnSampleBook) {
      this.btnSampleBook.addEventListener('click', () => this.loadSampleBook());
    }

    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleFileSelection(e.dataTransfer.files[0]);
    });

    this.btnBackHome.addEventListener('click', () => this.showLibraryView());
    this.btnPrev.addEventListener('click', () => this.navigatePage(-1));
    this.btnNext.addEventListener('click', () => this.navigatePage(1));

    this.btnToggleViewMode.addEventListener('click', () => {
      this.viewMode = this.viewMode === 'page' ? 'text' : 'page';
      this.settings = saveSettings({ viewMode: this.viewMode });
      this.updateModeUi();
      if (this.viewMode === 'text') this.syncCurrentPageText();
    });

    this.btnFontDecrease.addEventListener('click', () => {
      if (this.viewMode === 'text') {
        this.textController.decreaseFontSize(2);
      } else {
        this.viewer.zoom(0.85);
      }
      this.updateFontSizeLabel();
    });

    this.btnFontIncrease.addEventListener('click', () => {
      if (this.viewMode === 'text') {
        this.textController.increaseFontSize(2);
      } else {
        this.viewer.zoom(1.2);
      }
      this.updateFontSizeLabel();
    });

    if (this.selectFontFamily) {
      this.selectFontFamily.addEventListener('change', (e) => {
        this.textController.setFontFamily(e.target.value);
      });
    }

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

    if (isText) {
      this.btnToggleViewMode.innerHTML = '<span>📄</span> Ver PDF Original';
      this.btnToggleViewMode.classList.add('active-text-mode');
    } else {
      this.btnToggleViewMode.innerHTML = '<span>👓</span> Letra Grande';
      this.btnToggleViewMode.classList.remove('active-text-mode');
    }
    this.updateFontSizeLabel();
  }

  updateFontSizeLabel() {
    if (this.viewMode === 'text') {
      this.fontSizeLabel.textContent = `Letra: ${this.textController.fontSize}px`;
    } else {
      const pct = Math.round((this.viewer?.currentScale || 1.0) * 100);
      this.fontSizeLabel.textContent = `Zoom: ${pct}%`;
    }
  }

  async handleFileSelection(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }

    this.currentFile = file;
    this.docTitleEl.textContent = file.name;
    const initialPage = getSavedPage(file.name, file.size);

    this.viewLibrary.classList.add('hidden');
    this.viewReader.classList.remove('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      await this.viewer.loadDocument({ data: arrayBuffer }, {
        name: file.name,
        size: file.size,
        initialPage
      });
      if (this.viewMode === 'text') await this.syncCurrentPageText();
    } catch (err) {
      alert('Error al leer el archivo PDF: ' + err.message);
      this.showLibraryView();
    }
  }

  async loadSampleBook() {
    try {
      const res = await fetch('libro_de_ejemplo.pdf');
      const buf = await res.arrayBuffer();
      const fakeFile = {
        name: 'Libro de Ejemplo (Confort Visual).pdf',
        size: buf.byteLength,
        arrayBuffer: async () => buf
      };
      await this.handleFileSelection(fakeFile);
    } catch (err) {
      alert('No se pudo abrir el libro de ejemplo: ' + err.message);
    }
  }

  showLibraryView() {
    this.viewReader.classList.add('hidden');
    this.viewLibrary.classList.remove('hidden');
    this.renderRecentBooks();
  }

  renderRecentBooks() {
    const recents = getRecentBooks();
    this.recentListEl.innerHTML = '';
    if (!recents.length) {
      this.emptyRecentsEl.classList.remove('hidden');
      return;
    }

    this.emptyRecentsEl.classList.add('hidden');
    recents.forEach(book => {
      const card = document.createElement('div');
      card.className = 'book-card';
      const pct = Math.round((book.currentPage / book.totalPages) * 100);

      card.innerHTML = `
        <div class="book-card-main">
          <div class="book-icon">📖</div>
          <div class="book-info">
            <h4 class="book-title">${this.escapeHtml(book.name)}</h4>
            <div class="book-meta">Página ${book.currentPage} de ${book.totalPages} (${pct}%)</div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${pct}%"></div></div>
          </div>
        </div>
        <div class="book-card-actions">
          <button class="btn-resume-book">Continuar 📖</button>
          <button class="btn-del-book" title="Quitar">✕</button>
        </div>
      `;

      card.querySelector('.btn-resume-book').addEventListener('click', () => {
        alert(`Para reanudar "${book.name}", selecciona el archivo en tu teléfono. Se abrirá en la página ${book.currentPage}.`);
        this.fileInput.click();
      });

      card.querySelector('.btn-del-book').addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentBook(book.id);
        this.renderRecentBooks();
      });

      this.recentListEl.appendChild(card);
    });
  }

  updatePageUi(currentPage, totalPages) {
    this.pageInfoEl.textContent = `Página ${currentPage} de ${totalPages}`;
    this.btnPrev.disabled = currentPage <= 1;
    this.btnNext.disabled = currentPage >= totalPages;
    this.updateFontSizeLabel();
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
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}
