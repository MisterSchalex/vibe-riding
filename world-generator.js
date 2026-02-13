/**
 * World Generator — parses a user prompt into Three.js world parameters.
 * Keyword-based extraction: colors, shapes, mood, density, special elements.
 */

// --- Color mappings ---
const COLOR_KEYWORDS = {
  // Primaries
  red: 0xe53935, blue: 0x1e88e5, yellow: 0xfdd835, green: 0x43a047,
  orange: 0xfb8c00, purple: 0x8e24aa, pink: 0xec407a, cyan: 0x00bcd4,
  white: 0xf5f5f5, black: 0x1a1a1a, gold: 0xffc107, silver: 0xb0bec5,
  // Moods
  fire: 0xff5722, ice: 0x80deea, lava: 0xbf360c, ocean: 0x0277bd,
  forest: 0x2e7d32, desert: 0xd4a373, neon: 0x76ff03, midnight: 0x1a237e,
  sunset: 0xff7043, sunrise: 0xffab40, blood: 0xb71c1c, void: 0x0d0d0d,
  crystal: 0xb2ebf2, toxic: 0xaeea00, rust: 0x8d6e63, chrome: 0xcfd8dc,
  emerald: 0x00c853, ruby: 0xd50000, sapphire: 0x2962ff, amethyst: 0xaa00ff,
  coral: 0xff8a80, violet: 0x7c4dff, teal: 0x009688, magenta: 0xf50057,
  // German colors
  rot: 0xe53935, blau: 0x1e88e5, gelb: 0xfdd835, grün: 0x43a047,
  schwarz: 0x1a1a1a, weiß: 0xf5f5f5, lila: 0x8e24aa, rosa: 0xec407a,
  dunkel: 0x1a1a2e, hell: 0xf0f0ff
};

// --- Shape style mappings ---
const SHAPE_KEYWORDS = {
  // Geometric
  cube: 'angular', box: 'angular', square: 'angular', sharp: 'angular', block: 'angular', eckig: 'angular',
  // Organic
  sphere: 'organic', round: 'organic', smooth: 'organic', soft: 'organic', blob: 'organic', rund: 'organic', weich: 'organic',
  // Crystal
  crystal: 'crystal', gem: 'crystal', diamond: 'crystal', prism: 'crystal', kristall: 'crystal',
  // Spire
  tower: 'spire', spire: 'spire', tall: 'spire', spike: 'spire', turm: 'spire', hoch: 'spire',
  // Chaotic
  chaos: 'chaotic', broken: 'chaotic', shattered: 'chaotic', wild: 'chaotic', kaputt: 'chaotic',
  // Minimal
  minimal: 'minimal', clean: 'minimal', simple: 'minimal', empty: 'minimal', leer: 'minimal',
  // Spiral
  spiral: 'spiral', twist: 'spiral', helix: 'spiral', vortex: 'spiral', wirbel: 'spiral'
};

// --- Mood mappings ---
const MOOD_KEYWORDS = {
  calm: 'calm', peaceful: 'calm', quiet: 'calm', still: 'calm', serene: 'calm', ruhig: 'calm', friedlich: 'calm',
  dark: 'dark', horror: 'dark', scary: 'dark', evil: 'dark', shadow: 'dark', finster: 'dark', böse: 'dark',
  energetic: 'energetic', fast: 'energetic', loud: 'energetic', intense: 'energetic', laut: 'energetic', schnell: 'energetic',
  mystical: 'mystical', magic: 'mystical', enchanted: 'mystical', ancient: 'mystical', magisch: 'mystical', mystisch: 'mystical',
  futuristic: 'futuristic', cyber: 'futuristic', neon: 'futuristic', tech: 'futuristic', digital: 'futuristic',
  nature: 'nature', organic: 'nature', earth: 'nature', tree: 'nature', natur: 'nature', wald: 'nature',
  psychedelic: 'psychedelic', trippy: 'psychedelic', acid: 'psychedelic', rainbow: 'psychedelic',
  underwater: 'underwater', deep: 'underwater', ocean: 'underwater', wasser: 'underwater', meer: 'underwater'
};

// --- Mood → default palette ---
const MOOD_PALETTES = {
  calm:        { primary: 0x90caf9, secondary: 0xc5e1a5, accent: 0xfff59d, bg: 0xd4e6f1, fog: 0xc8dce8 },
  dark:        { primary: 0x4a148c, secondary: 0x880e4f, accent: 0xb71c1c, bg: 0x0a0a12, fog: 0x0d0d1a },
  energetic:   { primary: 0xff1744, secondary: 0xffea00, accent: 0x00e5ff, bg: 0x1a1a2e, fog: 0x121225 },
  mystical:    { primary: 0x7c4dff, secondary: 0x448aff, accent: 0xe040fb, bg: 0x1a1a2e, fog: 0x15152a },
  futuristic:  { primary: 0x00e5ff, secondary: 0x76ff03, accent: 0xf50057, bg: 0x0a0a1a, fog: 0x080818 },
  nature:      { primary: 0x4caf50, secondary: 0x8d6e63, accent: 0xfdd835, bg: 0xc8e6c9, fog: 0xb8d8ba },
  psychedelic: { primary: 0xff00ff, secondary: 0x00ff00, accent: 0xffff00, bg: 0x1a0033, fog: 0x140028 },
  underwater:  { primary: 0x0077b6, secondary: 0x00b4d8, accent: 0x90e0ef, bg: 0x03045e, fog: 0x023e8a },
  default:     { primary: 0x7ce0b4, secondary: 0xd6d9dc, accent: 0xde3640, bg: 0xaed0b2, fog: 0x98c4a0 }
};

// --- Density keywords ---
const DENSITY_KEYWORDS = {
  sparse: 'sparse', empty: 'sparse', few: 'sparse', leer: 'sparse', wenig: 'sparse',
  dense: 'dense', packed: 'dense', full: 'dense', crowded: 'dense', voll: 'dense', viele: 'dense',
  massive: 'massive', huge: 'massive', epic: 'massive', gigantic: 'massive', riesig: 'massive', groß: 'massive'
};

function extractKeywords(prompt) {
  const lower = prompt.toLowerCase();
  const words = lower.split(/[\s,;.!?]+/).filter(Boolean);
  return { lower, words };
}

function findColors(words, lower) {
  const found = [];
  for (const [keyword, hex] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(keyword)) {
      found.push(hex);
    }
  }
  return found;
}

function findFirst(words, lower, map) {
  for (const [keyword, value] of Object.entries(map)) {
    if (lower.includes(keyword)) return value;
  }
  return null;
}

function hashPrompt(prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Generate world parameters from a user prompt.
 */
export function generateWorldParams(prompt) {
  const { lower, words } = extractKeywords(prompt);
  const hash = hashPrompt(prompt);

  // Detect mood
  const mood = findFirst(words, lower, MOOD_KEYWORDS) || 'default';
  const palette = { ...MOOD_PALETTES[mood] || MOOD_PALETTES.default };

  // Override with explicit colors from prompt
  const explicitColors = findColors(words, lower);
  if (explicitColors.length >= 1) palette.primary = explicitColors[0];
  if (explicitColors.length >= 2) palette.secondary = explicitColors[1];
  if (explicitColors.length >= 3) palette.accent = explicitColors[2];

  // Detect shape style
  const shapeStyle = findFirst(words, lower, SHAPE_KEYWORDS) || 'angular';

  // Detect density
  const densityKey = findFirst(words, lower, DENSITY_KEYWORDS) || 'normal';
  const densityMap = { sparse: 3, normal: 5, dense: 8, massive: 12 };
  const floorCount = densityMap[densityKey] || 5;

  // Building dimensions influenced by hash for uniqueness
  const buildingWidth = 10 + (hash % 8);
  const buildingDepth = 8 + (hash % 6);
  const floorHeight = 2.5 + (hash % 10) / 10;

  // Room size
  const roomSize = densityKey === 'massive' ? 100 : densityKey === 'dense' ? 80 : 70;

  // Particle count
  const particleCount = densityKey === 'sparse' ? 400 : densityKey === 'dense' ? 2000 : densityKey === 'massive' ? 3500 : 1000;

  // Beacon count (3-8 based on floors)
  const beaconCount = Math.min(8, Math.max(3, floorCount));

  // Rotation speed
  const rotationSpeed = mood === 'energetic' ? 0.004 : mood === 'calm' ? 0.0008 : 0.0015;

  // Fog distance
  const fogNear = mood === 'dark' ? 15 : mood === 'underwater' ? 20 : 45;
  const fogFar = mood === 'dark' ? 80 : mood === 'underwater' ? 100 : 200;

  // Light intensity
  const lightIntensity = mood === 'dark' ? 0.3 : mood === 'energetic' ? 1.5 : 0.8;

  // Beat multiplier
  const beatMult = mood === 'energetic' ? 2.5 : mood === 'calm' ? 0.8 : mood === 'psychedelic' ? 3.0 : 1.5;

  // Special features based on keywords
  const hasOrb = lower.includes('orb') || lower.includes('kugel') || lower.includes('sphere') || hash % 3 !== 0;
  const hasRing = lower.includes('ring') || lower.includes('torus') || lower.includes('portal') || hash % 4 === 0;
  const hasPillars = lower.includes('pillar') || lower.includes('säule') || lower.includes('column') || hash % 2 === 0;
  const pillarCount = hasPillars ? (4 + (hash % 5)) : 0;

  // Generate a ritual order unique to this world
  const ritualOrder = [];
  const indices = Array.from({ length: beaconCount }, (_, i) => i);
  let tempIndices = [...indices];
  const seededRand = (seed) => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  let seed = hash;
  for (let i = 0; i < Math.min(5, beaconCount); i++) {
    seed = (seed * 16807) % 2147483647;
    const idx = Math.floor(seededRand(seed) * tempIndices.length);
    ritualOrder.push(tempIndices.splice(idx, 1)[0]);
  }

  return {
    prompt,
    mood,
    palette,
    shapeStyle,
    floorCount,
    buildingWidth,
    buildingDepth,
    floorHeight,
    roomSize,
    particleCount,
    beaconCount,
    rotationSpeed,
    fog: { near: fogNear, far: fogFar, color: palette.fog },
    lightIntensity,
    beatMult,
    hasOrb,
    hasRing,
    hasPillars,
    pillarCount,
    ritualOrder,
    seed: hash
  };
}
