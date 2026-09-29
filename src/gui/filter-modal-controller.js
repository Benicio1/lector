/**
 * filter-modal-controller.js — Controlador del Modal de Confort Visual y Filtros
 * Administra los presets rápidos y deslizadores de brillo, calidez y contraste.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

import { PRESET_CONFIGS, PRESET_MODES } from '../core/filter-engine.js';

export class FilterModalController {
  constructor({ modalEl, chipsContainerEl, sliders, onFilterChange, onReset }) {
    this.modalEl = modalEl;
    this.chipsContainerEl = chipsContainerEl;
    this.sliders = sliders;
    this.onFilterChange = onFilterChange || (() => {});
    this.onReset = onReset || (() => {});
    this.activePreset = PRESET_MODES.WARM;

    this.bindEvents();
  }

  bindEvents() {
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    const closeBtn = this.modalEl.querySelector('#btn-close-filters');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const resetBtn = this.modalEl.querySelector('#btn-reset-filters');
    if (resetBtn) resetBtn.addEventListener('click', () => this.onReset());

    this.sliders.brightness.input.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.sliders.brightness.valEl.textContent = `${val}%`;
      this.onFilterChange({ brightness: val });
    });

    this.sliders.warmth.input.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.sliders.warmth.valEl.textContent = `${val}%`;
      this.onFilterChange({ warmth: val });
    });

    this.sliders.contrast.input.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.sliders.contrast.valEl.textContent = `${val}%`;
      this.onFilterChange({ contrast: val });
    });
  }

  open(currentSettings) {
    this.activePreset = currentSettings.preset || PRESET_MODES.WARM;
    this.renderChips();
    this.syncSliders(currentSettings);
    this.modalEl.classList.remove('hidden');
  }

  close() {
    this.modalEl.classList.add('hidden');
  }

  renderChips() {
    this.chipsContainerEl.innerHTML = '';
    Object.values(PRESET_CONFIGS).forEach(cfg => {
      const btn = document.createElement('button');
      btn.className = `chip-btn ${cfg.id === this.activePreset ? 'active' : ''}`;
      btn.innerHTML = `<span class="chip-icon">${cfg.icon}</span><span class="chip-name">${cfg.name}</span>`;
      btn.addEventListener('click', () => {
        this.activePreset = cfg.id;
        this.renderChips();
        this.onFilterChange({
          preset: cfg.id,
          brightness: cfg.brightness,
          warmth: cfg.warmth,
          contrast: cfg.contrast
        });
        this.syncSliders(cfg);
      });
      this.chipsContainerEl.appendChild(btn);
    });
  }

  syncSliders({ brightness = 100, warmth = 0, contrast = 100 } = {}) {
    this.sliders.brightness.input.value = brightness;
    this.sliders.brightness.valEl.textContent = `${brightness}%`;
    this.sliders.warmth.input.value = warmth;
    this.sliders.warmth.valEl.textContent = `${warmth}%`;
    this.sliders.contrast.input.value = contrast;
    this.sliders.contrast.valEl.textContent = `${contrast}%`;
  }
}
