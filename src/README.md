# src/ — Código Fuente Modular

## Propósito
Centralizar los módulos JavaScript organizados por capas de responsabilidad (Dominio/Core e Interfaz/GUI).

## Estructura
- `core/`: Lógica central de filtros ópticos, persistencia local y orquestación de renderizado PDF.
- `gui/`: Controladores de interacción de interfaz, gestos táctiles y ciclo de vida de instalación PWA.

## Reglas
- Ningún archivo puede superar las 400 líneas de código.
- Desacoplamiento entre la capa core y los elementos de presentación.

## Referencias
- [AGENTS.md](../../../../AGENTS.md)
- [README.md](../README.md)
