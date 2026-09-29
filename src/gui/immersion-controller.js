/**
 * immersion-controller.js — Gestor de Inmersión y Gestos Táctiles
 * Discrimina entre deslizamiento y tap para auto-ocultar barras sin interrumpir lectura.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

export class ImmersionController {
  constructor({
    viewReader,
    headerBar,
    fontControlsBar,
    bottomBar,
    textContainer,
    pdfContainer
  }) {
    this.viewReader = viewReader;
    this.headerBar = headerBar;
    this.fontControlsBar = fontControlsBar;
    this.bottomBar = bottomBar;
    this.textContainer = textContainer;
    this.pdfContainer = pdfContainer;

    this.barsHidden = false;
    this.autoHideTimeout = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindTapDetection();
  }

  bindEvents() {
    const keepAlive = () => {
      if (!this.barsHidden) this.scheduleAutoHide(4500);
    };
    this.headerBar.addEventListener('click', keepAlive);
    this.fontControlsBar.addEventListener('click', keepAlive);
    this.bottomBar.addEventListener('click', keepAlive);
  }

  bindTapDetection() {
    let startPos = null;
    let isSliding = false;
    let lastScrollTime = 0;

    const onScroll = () => {
      lastScrollTime = Date.now();
      isSliding = true;
    };
    this.textContainer.addEventListener('scroll', onScroll, { passive: true });
    this.pdfContainer.addEventListener('scroll', onScroll, { passive: true });

    this.viewReader.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, select, input, a, .filters-sheet, .font-stepper, .reader-top-bar, .reader-bottom-nav')) {
        return;
      }
      startPos = { x: e.clientX, y: e.clientY, time: Date.now() };
      isSliding = false;
    }, { passive: true });

    this.viewReader.addEventListener('pointermove', (e) => {
      if (!startPos) return;
      if (Math.abs(e.clientX - startPos.x) > 8 || Math.abs(e.clientY - startPos.y) > 8) {
        isSliding = true;
      }
    }, { passive: true });

    this.viewReader.addEventListener('pointercancel', () => {
      startPos = null;
      isSliding = true;
    }, { passive: true });

    this.viewReader.addEventListener('pointerup', (e) => {
      if (!startPos) return;
      const duration = Date.now() - startPos.time;
      const moved = Math.abs(e.clientX - startPos.x) > 8 || Math.abs(e.clientY - startPos.y) > 8;
      const scrolledRecently = Date.now() - lastScrollTime < 350;
      startPos = null;

      // Si deslizó por la pantalla para leer o hizo scroll, NO intervenir
      if (isSliding || moved || scrolledRecently || duration > 350) return;

      this.handleScreenTap();
    });
  }

  handleScreenTap() {
    if (this.barsHidden) {
      this.toggleImmersion(false);
      this.scheduleAutoHide(3800);
    } else {
      this.toggleImmersion(true);
    }
  }

  scheduleAutoHide(ms = 4000) {
    clearTimeout(this.autoHideTimeout);
    this.autoHideTimeout = setTimeout(() => {
      if (!this.barsHidden) this.toggleImmersion(true);
    }, ms);
  }

  toggleImmersion(forceState) {
    this.barsHidden = forceState !== undefined ? forceState : !this.barsHidden;
    this.viewReader.classList.toggle('bars-hidden', this.barsHidden);
    this.headerBar.classList.toggle('bars-hidden', this.barsHidden);
    this.fontControlsBar.classList.toggle('bars-hidden', this.barsHidden);
    this.bottomBar.classList.toggle('bars-hidden', this.barsHidden);

    clearTimeout(this.autoHideTimeout);
    if (!this.barsHidden) {
      this.scheduleAutoHide(4000);
    }
  }

  resetOnExit() {
    this.toggleImmersion(false);
  }
}
