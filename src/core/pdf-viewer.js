/**
 * pdf-viewer.js — Controlador de Renderizado de PDF con PDF.js
 * Orquesta la carga de documentos PDF en memoria, renderizado en canvas y zoom móvil.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

export class PdfViewer {
  constructor({ container, onPageChange, onError, onDocumentLoaded }) {
    this.container = container;
    this.onPageChange = onPageChange || (() => {});
    this.onError = onError || console.error;
    this.onDocumentLoaded = onDocumentLoaded || (() => {});

    this.pdfDoc = null;
    this.currentPageNum = 1;
    this.totalPages = 0;
    this.currentScale = 1.0;
    this.fitMode = 'width'; // 'width' | 'page' | 'custom'
    this.renderTask = null;
    this.isRendering = false;
    this.pendingPageNum = null;
    this.currentFileMeta = null;

    // Canvas principal
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pdf-page-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.container.appendChild(this.canvas);
  }

  /**
   * Carga un documento PDF desde ArrayBuffer o URL local.
   */
  async loadDocument(source, meta = {}) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js no está cargado en el entorno');
    }

    try {
      this.currentFileMeta = meta;
      const loadingTask = window.pdfjsLib.getDocument(source);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPageNum = Math.min(meta.initialPage || 1, this.totalPages);

      this.onDocumentLoaded({
        totalPages: this.totalPages,
        initialPage: this.currentPageNum,
        meta: this.currentFileMeta
      });

      await this.renderPage(this.currentPageNum);
    } catch (err) {
      this.onError(err);
      throw err;
    }
  }

  /**
   * Renderiza la página especificada en el canvas con el factor de escala óptimo.
   */
  async renderPage(pageNum) {
    if (this.isRendering) {
      this.pendingPageNum = pageNum;
      return;
    }

    this.isRendering = true;
    this.currentPageNum = pageNum;

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = this.calculateViewport(page);

      // Ajuste de densidad de píxeles para pantallas Retina/Móvil HD
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.canvas.width = Math.floor(viewport.width * dpr);
      this.canvas.height = Math.floor(viewport.height * dpr);
      this.canvas.style.width = `${Math.floor(viewport.width)}px`;
      this.canvas.style.height = `${Math.floor(viewport.height)}px`;

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };

      if (this.renderTask) {
        this.renderTask.cancel();
      }

      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;
      this.renderTask = null;
      this.isRendering = false;

      this.onPageChange({
        currentPage: this.currentPageNum,
        totalPages: this.totalPages,
        scale: this.currentScale
      });

      if (this.pendingPageNum !== null) {
        const next = this.pendingPageNum;
        this.pendingPageNum = null;
        await this.renderPage(next);
      }
    } catch (err) {
      this.isRendering = false;
      if (err.name !== 'RenderingCancelledException') {
        this.onError(err);
      }
    }
  }

  /**
   * Calcula el viewport y zoom según el modo de visualización móvil.
   */
  calculateViewport(page) {
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const containerWidth = Math.max(280, this.container.clientWidth - 16);
    const containerHeight = Math.max(300, this.container.clientHeight - 20);

    if (this.fitMode === 'width') {
      this.currentScale = containerWidth / unscaledViewport.width;
    } else if (this.fitMode === 'page') {
      const scaleW = containerWidth / unscaledViewport.width;
      const scaleH = containerHeight / unscaledViewport.height;
      this.currentScale = Math.min(scaleW, scaleH);
    }

    return page.getViewport({ scale: this.currentScale });
  }

  /**
   * Navega a la página siguiente.
   */
  async nextPage() {
    if (this.currentPageNum < this.totalPages) {
      await this.renderPage(this.currentPageNum + 1);
      return true;
    }
    return false;
  }

  /**
   * Navega a la página anterior.
   */
  async prevPage() {
    if (this.currentPageNum > 1) {
      await this.renderPage(this.currentPageNum - 1);
      return true;
    }
    return false;
  }

  /**
   * Salta a una página específica.
   */
  async goToPage(num) {
    const target = Math.min(this.totalPages, Math.max(1, Number(num) || 1));
    if (target !== this.currentPageNum) {
      await this.renderPage(target);
    }
  }

  /**
   * Incrementa o reduce el nivel de zoom táctil.
   */
  async zoom(factor) {
    this.fitMode = 'custom';
    this.currentScale = Math.max(0.5, Math.min(3.5, this.currentScale * factor));
    if (this.pdfDoc) {
      await this.renderPage(this.currentPageNum);
    }
  }

  /**
   * Reajusta a ancho completo del dispositivo.
   */
  async fitToWidth() {
    this.fitMode = 'width';
    if (this.pdfDoc) {
      await this.renderPage(this.currentPageNum);
    }
  }

  /**
   * Extrae el contenido de texto de la página analizando tamaño de fuentes
   * para detectar títulos de capítulos y subtítulos frente al texto normal.
   */
  async getPageText(pageNum = this.currentPageNum) {
    if (!this.pdfDoc) return [];
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      if (!textContent.items || !textContent.items.length) return [];

      const lines = [];
      let currentLine = null;

      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        const y = item.transform[5];
        const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]) || item.height || 12);

        if (!currentLine || Math.abs(currentLine.y - y) > 5) {
          if (currentLine) lines.push(currentLine);
          currentLine = { y, fontSize, text: item.str.trim() };
        } else {
          currentLine.text += ' ' + item.str.trim();
          currentLine.fontSize = Math.max(currentLine.fontSize, fontSize);
        }
      }
      if (currentLine) lines.push(currentLine);
      if (!lines.length) return [];

      const sizeHistogram = {};
      for (const line of lines) {
        const sz = line.fontSize;
        sizeHistogram[sz] = (sizeHistogram[sz] || 0) + line.text.length;
      }
      let bodyFontSize = 12;
      let maxCount = 0;
      for (const [sz, count] of Object.entries(sizeHistogram)) {
        if (count > maxCount) {
          maxCount = count;
          bodyFontSize = Number(sz);
        }
      }

      const blocks = [];
      for (const line of lines) {
        const text = line.text.trim();
        if (!text) continue;

        const isLarger = line.fontSize >= bodyFontSize * 1.15;
        const isMuchLarger = line.fontSize >= bodyFontSize * 1.35;
        const isShort = text.length <= 75;
        const noEndingDot = !/[.,;:]$/.test(text);
        const isChapterPattern = /^(cap[ií]tulo|parte|secci[oó]n|libro|acto|pr[oó]logo|ep[ií]logo|introducci[oó]n)\b/i.test(text);

        if ((isMuchLarger && isShort) || (isChapterPattern && isShort)) {
          blocks.push({ type: 'title', text });
        } else if (isLarger && isShort && noEndingDot) {
          blocks.push({ type: 'subtitle', text });
        } else {
          blocks.push({ type: 'paragraph', text });
        }
      }

      return blocks;
    } catch (err) {
      console.warn('[pdf-viewer] Error al extraer texto estructurado:', err);
      return [];
    }
  }

  /**
   * Libera recursos y memoria.
   */
  destroy() {
    if (this.renderTask) {
      this.renderTask.cancel();
    }
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
