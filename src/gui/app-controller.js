/**
 * app-controller.js — Controlador Principal de la Interfaz del Lector Móvil
 * Integra PDF, filtros de luz, gestos táctiles y biblioteca reciente.
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

export class AppController {
  constructor() {
    this.viewer = null;
    this.settings = loadSettings();
    this.currentFile = null;
    this.barsVisible = true;
    this.activePreset = this.settings.preset || PRESET_MODES.WARM;

    this.cacheDom();
    this.initPdfViewer();
    this.bindEvents();
    this.renderRecentBooks();
    this.applyVisualFilters();
  }

  cacheDom() {
    // Vistas principales
    this.viewLibrary = document.getElementById('view-library');
    this.viewReader = document.getElementById('view-reader');

    // Biblioteca
    this.fileInput = document.getElementById('file-input');
    this.btnPickFile = document.getElementById('btn-pick-file');
    this.dropZone = document.getElementById('drop-zone');
    this.recentListEl = document.getElementById('recent-books-list');
    this.emptyRecentsEl = document.getElementById('empty-recents');

    // Lector
    this.pdfContainer = document.getElementById('pdf-viewport');
    this.warmthOverlay = document.getElementById('warmth-overlay');
    this.headerBar = document.getElementById('reader-header');
    this.bottomBar = document.getElementById('reader-bottom-bar');
    this.docTitleEl = document.getElementById('doc-title');
    this.pageInfoEl = document.getElementById('page-info');
    this.pageSlider = document.getElementById('page-slider');

    // Botones de navegación
    this.btnBackHome = document.getElementById('btn-back-home');
    this.btnPrev = document.getElementById('btn-prev-page');
    this.btnNext = document.getElementById('btn-next-page');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnFitWidth = document.getElementById('btn-fit-width');

    // Modal de Filtros / Confort Visual
    this.btnOpenFilters = document.getElementById('btn-open-filters');
    this.modalFilters = document.getElementById('modal-filters');
    this.btnCloseFilters = document.getElementById('btn-close-filters');
    this.presetChipsContainer = document.getElementById('preset-chips');
    this.sliderBrightness = document.getElementById('slider-brightness');
    this.valBrightness = document.getElementById('val-brightness');
    this.sliderWarmth = document.getElementById('slider-warmth');
    this.valWarmth = document.getElementById('val-warmth');
    this.sliderContrast = document.getElementById('slider-contrast');
    this.valContrast = document.getElementById('val-contrast');
    this.btnResetFilters = document.getElementById('btn-reset-filters');
  }

  initPdfViewer() {
    this.viewer = new PdfViewer({
      container: this.pdfContainer,
      onPageChange: ({ currentPage, totalPages }) => {
        this.updatePageUi(currentPage, totalPages);
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
        console.error('[AppController] Error de visor:', err);
        alert('No se pudo renderizar la página del PDF: ' + err.message);
      }
    });
  }

  bindEvents() {
    // Selector de archivos
    this.btnPickFile.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files[0]));

    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    // Navegación de páginas
    this.btnBackHome.addEventListener('click', () => this.showLibraryView());
    this.btnPrev.addEventListener('click', () => this.viewer.prevPage());
    this.btnNext.addEventListener('click', () => this.viewer.nextPage());
    this.pageSlider.addEventListener('input', (e) => this.viewer.goToPage(e.target.value));

    // Zoom
    this.btnZoomIn.addEventListener('click', () => this.viewer.zoom(1.2));
    this.btnZoomOut.addEventListener('click', () => this.viewer.zoom(0.83));
    this.btnFitWidth.addEventListener('click', () => this.viewer.fitToWidth());

    // Inmersión y zonas táctiles
    this.setupTouchZones();

    // Filtros visuales
    this.btnOpenFilters.addEventListener('click', () => this.openFiltersModal());
    this.btnCloseFilters.addEventListener('click', () => this.closeFiltersModal());
    this.modalFilters.addEventListener('click', (e) => {
      if (e.target === this.modalFilters) this.closeFiltersModal();
    });

    this.sliderBrightness.addEventListener('input', (e) => {
      this.settings.brightness = Number(e.target.value);
      this.valBrightness.textContent = `${this.settings.brightness}%`;
      this.applyVisualFilters();
      saveSettings(this.settings);
    });

    this.sliderWarmth.addEventListener('input', (e) => {
      this.settings.warmth = Number(e.target.value);
      this.valWarmth.textContent = `${this.settings.warmth}%`;
      this.applyVisualFilters();
      saveSettings(this.settings);
    });

    this.sliderContrast.addEventListener('input', (e) => {
      this.settings.contrast = Number(e.target.value);
      this.valContrast.textContent = `${this.settings.contrast}%`;
      this.applyVisualFilters();
      saveSettings(this.settings);
    });

    this.btnResetFilters.addEventListener('click', () => {
      const cfg = PRESET_CONFIGS[this.activePreset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
      this.settings.brightness = cfg.brightness;
      this.settings.warmth = cfg.warmth;
      this.settings.contrast = cfg.contrast;
      this.syncSlidersUi();
      this.applyVisualFilters();
      saveSettings(this.settings);
    });

    // Teclado
    window.addEventListener('keydown', (e) => {
      if (this.viewReader.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        this.viewer.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.viewer.prevPage();
      } else if (e.key === 'Escape') {
        this.closeFiltersModal();
      }
    });

    // Redimensionado de ventana
    window.addEventListener('resize', () => {
      if (!this.viewReader.classList.contains('hidden')) {
        this.viewer.fitToWidth();
      }
    });
  }

  setupTouchZones() {
    let startX = 0;
    let startY = 0;

    this.pdfContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.pdfContainer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length !== 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Detección de Swipe horizontal
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
        if (deltaX < 0) this.viewer.nextPage();
        else this.viewer.prevPage();
        return;
      }

      // Tap simple en zonas de la pantalla (toque sin arrastrar)
      if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
        const width = window.innerWidth;
        const x = endX;
        if (x < width * 0.28) {
          this.viewer.prevPage();
        } else if (x > width * 0.72) {
          this.viewer.nextPage();
        } else {
          this.toggleImmersionBars();
        }
      }
    });
  }

  toggleImmersionBars() {
    this.barsVisible = !this.barsVisible;
    this.headerBar.classList.toggle('bars-hidden', !this.barsVisible);
    this.bottomBar.classList.toggle('bars-hidden', !this.barsVisible);
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
    } catch (err) {
      alert('Error al leer el archivo PDF: ' + err.message);
      this.showLibraryView();
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
          <div class="book-icon">📄</div>
          <div class="book-info">
            <h4 class="book-title">${this.escapeHtml(book.name)}</h4>
            <div class="book-meta">Página ${book.currentPage} de ${book.totalPages} (${pct}%)</div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${pct}%"></div></div>
          </div>
        </div>
        <div class="book-card-actions">
          <button class="btn-resume-book" title="Continuar lectura">Continuar 📖</button>
          <button class="btn-del-book" title="Quitar de recientes">✕</button>
        </div>
      `;

      card.querySelector('.btn-resume-book').addEventListener('click', () => {
        alert(`Para reabrir "${book.name}", selecciona el archivo desde tu teléfono. Tu progreso está guardado en la página ${book.currentPage}.`);
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
    this.pageInfoEl.textContent = `${currentPage} / ${totalPages}`;
    this.pageSlider.max = totalPages;
    this.pageSlider.value = currentPage;
    this.btnPrev.disabled = currentPage <= 1;
    this.btnNext.disabled = currentPage >= totalPages;
  }

  openFiltersModal() {
    this.renderPresetChips();
    this.syncSlidersUi();
    this.modalFilters.classList.remove('hidden');
  }

  closeFiltersModal() {
    this.modalFilters.classList.add('hidden');
  }

  renderPresetChips() {
    this.presetChipsContainer.innerHTML = '';
    Object.values(PRESET_CONFIGS).forEach(cfg => {
      const btn = document.createElement('button');
      btn.className = `chip-btn ${cfg.id === this.activePreset ? 'active' : ''}`;
      btn.innerHTML = `<span class="chip-icon">${cfg.icon}</span><span class="chip-name">${cfg.name}</span>`;
      btn.addEventListener('click', () => {
        this.selectPreset(cfg.id);
      });
      this.presetChipsContainer.appendChild(btn);
    });
  }

  selectPreset(presetId) {
    this.activePreset = presetId;
    const cfg = PRESET_CONFIGS[presetId];
    this.settings.preset = presetId;
    this.settings.brightness = cfg.brightness;
    this.settings.warmth = cfg.warmth;
    this.settings.contrast = cfg.contrast;

    this.renderPresetChips();
    this.syncSlidersUi();
    this.applyVisualFilters();
    saveSettings(this.settings);
  }

  syncSlidersUi() {
    this.sliderBrightness.value = this.settings.brightness;
    this.valBrightness.textContent = `${this.settings.brightness}%`;
    this.sliderWarmth.value = this.settings.warmth;
    this.valWarmth.textContent = `${this.settings.warmth}%`;
    this.sliderContrast.value = this.settings.contrast;
    this.valContrast.textContent = `${this.settings.contrast}%`;
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
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}
