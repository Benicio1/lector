/**
 * text-mode-controller.js — Controlador de Lectura de Texto Grande y Tipografías
 * Facilita la lectura para personas adultas extrayendo el texto con letra adaptable.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

export class TextModeController {
  constructor({ container, textEl, onSettingsChange }) {
    this.container = container;
    this.textEl = textEl;
    this.onSettingsChange = onSettingsChange || (() => {});

    this.fontSize = 24; // Tamaño inicial grande para adultos
    this.fontFamily = 'serif';
    this.lineHeight = 1.75;
    this.rawText = '';
  }

  setFontSize(size) {
    this.fontSize = Math.max(16, Math.min(42, Number(size) || 24));
    this.applyStyles();
    this.onSettingsChange({ fontSize: this.fontSize });
    return this.fontSize;
  }

  increaseFontSize(step = 3) {
    return this.setFontSize(this.fontSize + step);
  }

  decreaseFontSize(step = 3) {
    return this.setFontSize(this.fontSize - step);
  }

  setFontFamily(family) {
    const valid = ['serif', 'sans-serif', 'monospace', 'readable'];
    this.fontFamily = valid.includes(family) ? family : 'serif';
    this.applyStyles();
    this.onSettingsChange({ fontFamily: this.fontFamily });
    return this.fontFamily;
  }

  setPageText(input) {
    if (!input || (Array.isArray(input) && input.length === 0) || (typeof input === 'string' && !input.trim())) {
      this.textEl.innerHTML = `
        <div class="empty-page-text">
          <p>⚠️ Esta página contiene principalmente imágenes o un escaneo gráfico.</p>
          <p>Podés ver la página original tocando el botón <strong>"📄 PDF"</strong>.</p>
        </div>
      `;
      return;
    }

    if (Array.isArray(input)) {
      this.rawText = input.map(item => item.text).join('\n\n');
      this.textEl.innerHTML = input.map(item => {
        const escaped = this.escape(item.text);
        if (item.type === 'title') {
          return `<h2 class="reading-chapter-title">${escaped}</h2>`;
        }
        if (item.type === 'subtitle') {
          return `<h3 class="reading-section-title">${escaped}</h3>`;
        }
        return `<p class="reading-paragraph">${escaped}</p>`;
      }).join('');
    } else {
      this.rawText = String(input);
      const paragraphs = this.rawText
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      const items = paragraphs.length > 1
        ? paragraphs
        : this.rawText.split('\n').map(l => l.trim()).filter(Boolean);

      this.textEl.innerHTML = items.map(text => {
        const escaped = this.escape(text);
        if (this.isHeadingCandidate(text)) {
          return `<h2 class="reading-chapter-title">${escaped}</h2>`;
        }
        return `<p class="reading-paragraph">${escaped}</p>`;
      }).join('');
    }

    this.applyStyles();
    this.container.scrollTop = 0;
  }

  isHeadingCandidate(text) {
    if (!text) return false;
    const clean = text.trim();
    if (clean.length > 80) return false;
    if (/[.,;]$/.test(clean)) return false;

    // Palabras clave de capítulos o divisiones
    if (/^(cap[ií]tulo|parte|secci[oó]n|libro|acto|pr[oó]logo|ep[ií]logo|introducci[oó]n)\b/i.test(clean)) {
      return true;
    }

    // Título corto que inicia con mayúscula o número, y sin diálogo
    if (/^[\-—–"']/.test(clean)) return false;
    const words = clean.split(/\s+/);
    const isCapitalized = /^[A-ZÁÉÍÓÚÑ0-9¿¡]/.test(clean);
    return isCapitalized && words.length <= 8;
  }

  applyStyles() {
    this.textEl.style.fontSize = `${this.fontSize}px`;
    this.textEl.style.lineHeight = `${this.lineHeight}`;

    if (this.fontFamily === 'serif') {
      this.textEl.style.fontFamily = 'Georgia, Cambria, "Times New Roman", serif';
    } else if (this.fontFamily === 'sans-serif') {
      this.textEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    } else if (this.fontFamily === 'readable') {
      this.textEl.style.fontFamily = 'Verdana, Geneva, Tahoma, sans-serif';
    }
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
