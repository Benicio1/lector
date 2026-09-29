/**
 * filter-engine.js — Motor de Filtros de Luz y Confort Visual
 * Provee cálculo de matrices, estilos CSS y filtros ópticos para mitigar fatiga visual.
 * Cumple con el límite de 400 líneas de AGENTS.md.
 */

export const PRESET_MODES = {
  NORMAL: 'normal',
  WARM: 'warm',
  SEPIA: 'sepia',
  NIGHT: 'night',
  OLED: 'oled',
  EINK: 'eink'
};

export const PRESET_CONFIGS = {
  [PRESET_MODES.NORMAL]: {
    id: PRESET_MODES.NORMAL,
    name: 'Normal (Día)',
    icon: '☀️',
    description: 'Visualización fiel original sin alteraciones',
    brightness: 100,
    contrast: 100,
    warmth: 0,
    invert: 0,
    sepia: 0,
    grayscale: 0,
    canvasBg: '#ffffff',
    readerBg: '#f1f5f9',
    textColor: '#1e293b'
  },
  [PRESET_MODES.WARM]: {
    id: PRESET_MODES.WARM,
    name: 'Luz Cálida (Anti-Azul)',
    icon: '🌅',
    description: 'Bloquea el espectro azul fatigante para atardecer o noche',
    brightness: 96,
    contrast: 98,
    warmth: 48,
    invert: 0,
    sepia: 28,
    grayscale: 0,
    canvasBg: '#fef9ee',
    readerBg: '#1e1a16',
    textColor: '#292524'
  },
  [PRESET_MODES.SEPIA]: {
    id: PRESET_MODES.SEPIA,
    name: 'Sepia (Papel Libro)',
    icon: '📜',
    description: 'Tonalidad cálida de libro impreso con textura suave',
    brightness: 92,
    contrast: 96,
    warmth: 20,
    invert: 0,
    sepia: 72,
    grayscale: 0,
    canvasBg: '#f5ecd7',
    readerBg: '#211d17',
    textColor: '#2c2217'
  },
  [PRESET_MODES.NIGHT]: {
    id: PRESET_MODES.NIGHT,
    name: 'Modo Noche (Carbón)',
    icon: '🌙',
    description: 'Fondo oscuro antirreflejo con texto suave al ojo',
    brightness: 88,
    contrast: 105,
    warmth: 15,
    invert: 92,
    sepia: 12,
    grayscale: 0,
    canvasBg: '#1a1a1e',
    readerBg: '#121214',
    textColor: '#e4e4e7'
  },
  [PRESET_MODES.OLED]: {
    id: PRESET_MODES.OLED,
    name: 'OLED (Negro Puro)',
    icon: '⬛',
    description: 'Negro absoluto 100% que apaga píxeles en pantallas móviles',
    brightness: 84,
    contrast: 110,
    warmth: 5,
    invert: 100,
    sepia: 0,
    grayscale: 0,
    canvasBg: '#000000',
    readerBg: '#000000',
    textColor: '#d4d4d8'
  },
  [PRESET_MODES.EINK]: {
    id: PRESET_MODES.EINK,
    name: 'e-Ink (Tinta Electrónica)',
    icon: '📄',
    description: 'Escala de grises con alto contraste mate tipo lector e-reader',
    brightness: 95,
    contrast: 124,
    warmth: 0,
    invert: 0,
    sepia: 0,
    grayscale: 100,
    canvasBg: '#ebebe6',
    readerBg: '#18181b',
    textColor: '#18181b'
  }
};

/**
 * Normaliza y valida valores de ajuste fino.
 */
export function sanitizeFilterValues(values = {}) {
  const brightness = Math.min(140, Math.max(25, Number(values.brightness ?? 100)));
  const contrast = Math.min(150, Math.max(60, Number(values.contrast ?? 100)));
  const warmth = Math.min(100, Math.max(0, Number(values.warmth ?? 0)));
  const preset = PRESET_CONFIGS[values.preset] ? values.preset : PRESET_MODES.NORMAL;

  return { brightness, contrast, warmth, preset };
}

/**
 * Genera la cadena CSS de filtros aplicada al canvas del PDF.
 * @param {Object} options
 * @returns {string} filtro CSS (ej: "brightness(90%) contrast(100%) invert(...)")
 */
export function buildCanvasFilterStyle({ preset = PRESET_MODES.NORMAL, brightness = 100, contrast = 100 } = {}) {
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
  const parts = [];

  // 1. Inversión para modos oscuros
  if (config.invert > 0) {
    parts.push(`invert(${config.invert}%)`);
    parts.push('hue-rotate(180deg)');
  }

  // 2. Grayscale para modo tinta electrónica
  if (config.grayscale > 0) {
    parts.push(`grayscale(${config.grayscale}%)`);
  }

  // 3. Sepia para calidez o papel
  if (config.sepia > 0) {
    parts.push(`sepia(${config.sepia}%)`);
  }

  // 4. Brillo combinado (preset base * multiplicador de usuario)
  const effectiveBrightness = Math.round((config.brightness * brightness) / 100);
  parts.push(`brightness(${effectiveBrightness}%)`);

  // 5. Contraste combinado
  const effectiveContrast = Math.round((config.contrast * contrast) / 100);
  parts.push(`contrast(${effectiveContrast}%)`);

  return parts.join(' ');
}

/**
 * Calcula el overlay óptico de luz cálida (filtro ambarino anti-luz azul).
 * @param {number} warmth Nivel de 0 a 100
 * @param {string} preset Modo activo
 * @returns {Object} propiedades de estilo para la capa overlay
 */
export function buildWarmthOverlayStyle(warmth = 0, preset = PRESET_MODES.NORMAL) {
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
  const totalWarmth = Math.min(100, (config.warmth || 0) + warmth);

  if (totalWarmth <= 0) {
    return {
      display: 'none',
      opacity: 0,
      backgroundColor: 'transparent'
    };
  }

  // Opacidad proporcional con curva no lineal para que sea sutil al inicio
  const opacity = Math.min(0.65, (totalWarmth / 100) * 0.55).toFixed(3);
  
  // Tonalidad ámbar anaranjada de 2700K (bloquea longitudes de onda < 480nm)
  return {
    display: 'block',
    opacity: Number(opacity),
    backgroundColor: '#ff9800',
    mixBlendMode: 'multiply',
    pointerEvents: 'none'
  };
}

/**
 * Retorna la paleta de colores para el contenedor del lector según el preset.
 */
export function getThemePalette(preset = PRESET_MODES.NORMAL) {
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS[PRESET_MODES.NORMAL];
  return {
    canvasBg: config.canvasBg,
    readerBg: config.readerBg,
    textColor: config.textColor
  };
}
