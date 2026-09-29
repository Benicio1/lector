# src/core/ — Lógica de Dominio y Procesamiento

## Propósito
Alojar los motores puros de cálculo de filtros de luz, almacenamiento local de progreso de lectura y orquestación de renderizado PDF.

## Archivos
- `filter-engine.js`: Cálculo de matrices CSS, presets de confort visual (luz cálida, sepia, noche, OLED, e-Ink) y capa óptica anti-azul.
- `library-store.js`: Almacenamiento en LocalStorage de libros recientes, marcadores y ajustes de lectura.
- `pdf-viewer.js`: Adaptador para interacción con PDF.js, escalado dinámico al ancho de pantalla y navegación de páginas.

## Referencias
- [AGENTS.md](../../../../../AGENTS.md)
- [src/README.md](../README.md)
