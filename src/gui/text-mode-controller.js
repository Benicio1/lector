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

  setPageText(text) {
    this.rawText = text || '';
    if (!this.rawText.trim()) {
      this.textEl.innerHTML = `
        <div class="empty-page-text">
          <p>⚠️ Esta página contiene principalmente imágenes o un escaneo gráfico.</p>
          <p>Podés ver la página original tocando el botón <strong>"📄 Ver PDF Original"</strong>.</p>
        </div>
      `;
      return;
    }

    // Formatear párrafos respetando saltos de línea
    const paragraphs = this.rawText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    if (paragraphs.length <= 1) {
      // Si no hay dobles saltos, dividir por saltos simples
      const lines = this.rawText.split('\n').map(l => l.trim()).filter(Boolean);
      this.textEl.innerHTML = lines.map(line => `<p class="reading-paragraph">${this.escape(line)}</p>`).join('');
    } else {
      this.textEl.innerHTML = paragraphs.map(p => `<p class="reading-paragraph">${this.escape(p)}</p>`).join('');
    }

    this.applyStyles();
    this.container.scrollTop = 0;
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
