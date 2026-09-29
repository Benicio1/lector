/**
 * pwa-manager.js — Gestor de Instalación PWA y Soporte Offline
 * Registra el Service Worker y expone el banner de instalación táctil en Android/iOS.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

export class PwaManager {
  constructor({ installBannerEl, installBtnEl, onStatusChange }) {
    this.installBannerEl = installBannerEl;
    this.installBtnEl = installBtnEl;
    this.onStatusChange = onStatusChange || (() => {});
    this.deferredPrompt = null;
    this.isInstalled = false;

    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupNetworkMonitoring();
  }

  /**
   * Registra el Service Worker local para funcionamiento 100% offline.
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        this.onStatusChange({ offlineReady: true, registration });
      } catch (err) {
        console.warn('[pwa-manager] No se pudo registrar ServiceWorker:', err);
      }
    }
  }

  /**
   * Captura el evento nativo de instalación PWA en navegadores móviles.
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Evita el infobar mini genérico de Chrome
      e.preventDefault();
      this.deferredPrompt = e;

      if (this.installBannerEl) {
        this.installBannerEl.classList.remove('hidden');
      }

      this.onStatusChange({ canInstall: true });
    });

    if (this.installBtnEl) {
      this.installBtnEl.addEventListener('click', async () => {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          this.isInstalled = true;
          if (this.installBannerEl) {
            this.installBannerEl.classList.add('hidden');
          }
        }
        this.deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      if (this.installBannerEl) {
        this.installBannerEl.classList.add('hidden');
      }
      this.onStatusChange({ installed: true });
    });
  }

  /**
   * Monitorea cambios de conexión Wi-Fi / Datos.
   */
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.onStatusChange({ online: true });
    });
    window.addEventListener('offline', () => {
      this.onStatusChange({ online: false });
    });
  }
}
