/**
 * recent-shelf.js — Renderizador del Historial de Libros Recientes
 * Administra las tarjetas de lectura previa y memoria de progreso.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

import { getRecentBooks, removeRecentBook } from '../core/library-store.js';

export class RecentShelf {
  constructor({ listEl, emptyEl, onSelectBook }) {
    this.listEl = listEl;
    this.emptyEl = emptyEl;
    this.onSelectBook = onSelectBook || (() => {});
  }

  render() {
    const recents = getRecentBooks();
    this.listEl.innerHTML = '';

    if (!recents.length) {
      this.emptyEl.classList.remove('hidden');
      return;
    }

    this.emptyEl.classList.add('hidden');
    recents.forEach(book => {
      const card = document.createElement('div');
      card.className = 'book-card';
      const pct = Math.round((book.currentPage / book.totalPages) * 100);

      card.innerHTML = `
        <div class="book-card-main">
          <div class="book-icon">📖</div>
          <div class="book-info">
            <h4 class="book-title">${this.escape(book.name)}</h4>
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
        this.onSelectBook(book);
      });

      card.querySelector('.btn-del-book').addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentBook(book.id);
        this.render();
      });

      this.listEl.appendChild(card);
    });
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
