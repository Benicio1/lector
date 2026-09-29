# lector-pdf-pwa — Lector Móvil de PDFs con Filtros de Luz Antifatiga Visual

> **PROPÓSITO DEL PROYECTO:**  
> Aplicación web progresiva (PWA) de alto rendimiento diseñada específicamente para teléfonos inteligentes y tablets, que permite abrir cualquier archivo PDF local del dispositivo y leerlo con protección visual avanzada mediante filtros ópticos de luz (luz cálida anti-azul, sepia papel libro, modo noche carbón, negro puro OLED y e-Ink).

---

## 📱 Características Principales

1. **Selector Directo de Archivos del Teléfono:**
   - Abre cualquier documento PDF almacenado en la memoria interna, tarjeta SD o descargas del celular con un solo toque.
   - Procesamiento 100% local y privado en memoria: ningún archivo sale del teléfono ni viaja a ningún servidor.
2. **Paquete Completo de Filtros de Luz Antifatiga:**
   - **☀️ Normal (Día):** Renderizado original con máxima nitidez.
   - **🌅 Luz Cálida (Anti-Azul):** Filtro ámbar (2700K) que bloquea los picos de luz azul dañinos para conciliar el sueño y evitar ardor ocular.
   - **📜 Sepia (Papel Libro):** Emula la calidez relajante de las páginas de un libro impreso.
   - **🌙 Modo Noche (Carbón):** Inversión suave de alto confort para leer con luces apagadas.
   - **⬛ OLED (Negro Puro):** Fondo `#000000` con píxeles 100% apagados en pantallas AMOLED/OLED de móviles, descanso visual total y ahorro masivo de batería.
   - **📄 e-Ink (Tinta Electrónica):** Escala de grises con contraste mate tipo Kindle.
3. **Ajuste Fino de Confort:**
   - Sliders de **Brillo** (25% a 130%), **Calidez / Ámbar** (0% a 100%) y **Contraste de Texto** (70% a 140%).
4. **Experiencia Móvil Táctil e Inmersiva:**
   - Modo inmersión: un toque en el centro de la pantalla oculta las barras de navegación para lectura libre de distracciones.
   - Toque lateral o deslizamiento (swipe) para pasar de página.
   - Zoom táctil intuitivo (acercar, alejar y botón de ajuste perfecto al ancho).
5. **Memoria de Progreso Automática:**
   - Recuerda la última página leída de cada documento y el porcentaje completado en la pantalla de inicio.
6. **PWA 100% Offline e Instalable:**
   - Cuenta con Service Worker y Web App Manifest para instalar en la pantalla de inicio de Android/iOS como una app nativa, funcionando sin necesidad de internet.

---

## 🚀 Cómo Iniciar y Usar

### En la Computadora o Red Local (Wi-Fi):
Doble clic en `INICIAR_LECTOR.bat` o desde la terminal:
```bash
node server.mjs
```
El servidor mostrará la dirección IP local para abrirla en tu celular (ej: `http://192.168.1.XX:8080`).

### En el Teléfono Móvil:
1. Abre el enlace en Chrome / Safari.
2. Toca el botón **"Instalar"** en el banner superior (o en las opciones del navegador: *"Agregar a la pantalla principal"*).
3. ¡Listo! Tendrás la aplicación instalada en tu teléfono para abrir cualquier PDF cuando quieras, sin internet.

---

## 🧪 Pruebas Automatizadas
Para ejecutar la suite de pruebas unitarias:
```bash
npm test
```

---

## 🔗 Referencias
- [AGENTS.md](../../../AGENTS.md)
- [proyectos/web/README.md](../README.md)
- [docs/GUIA_DOCUMENTACION.md](../../../docs/GUIA_DOCUMENTACION.md)
