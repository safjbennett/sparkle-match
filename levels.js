/* Sparkle Match — Level Definitions
 *
 * Each level has:
 *   id            - 1-indexed level number
 *   world         - 'unicorn' | 'mermaid' | 'winter' | 'fairy' (auto-applies theme)
 *   name          - short title shown in HUD
 *   type          - 'score' | 'jelly' | 'order' | 'mixed'
 *   moves         - move budget
 *   goal          - target score (for 'score' / 'mixed')
 *   jelly         - 6x6 grid of 0/1/2 (jelly layers per cell), for 'jelly' / 'mixed'
 *   orders        - array of { sym: '<theme symbol index>', count } for 'order' / 'mixed'
 *                   sym uses 0..5 to index into the world theme's symbol array
 *   blockers      - { chocolate: [{r,c}], meringue: [{r,c, hp}] }
 *   starThresholds - [t1, t2, t3] score thresholds for 1/2/3 stars
 */

// Helper to make a 6x6 jelly grid - "rect" of jelly inside the board
function jellyRect(rowStart, rowEnd, colStart, colEnd, layers) {
  layers = layers || 1;
  const grid = [];
  for (let r = 0; r < 6; r++) {
    grid[r] = [];
    for (let c = 0; c < 6; c++) {
      grid[r][c] = (r >= rowStart && r <= rowEnd && c >= colStart && c <= colEnd) ? layers : 0;
    }
  }
  return grid;
}
function jellyAll(layers) { return jellyRect(0, 5, 0, 5, layers); }
function jellyMix(coords1, coords2) {
  // coords1 gets 1 layer, coords2 gets 2 layers
  const grid = [];
  for (let r = 0; r < 6; r++) { grid[r] = []; for (let c = 0; c < 6; c++) grid[r][c] = 0; }
  coords1.forEach(({r, c}) => { grid[r][c] = 1; });
  coords2.forEach(({r, c}) => { grid[r][c] = 2; });
  return grid;
}

const LEVELS = [
  // ====== UNICORN MEADOW (1-5) ======
  {
    id: 1,
    world: 'unicorn',
    name: 'Welcome to the Meadow',
    type: 'score',
    moves: 25,
    goal: 1000,
    starThresholds: [1000, 2200, 4000]
  },
  {
    id: 2,
    world: 'unicorn',
    name: 'Sparkle Practice',
    type: 'score',
    moves: 22,
    goal: 1500,
    starThresholds: [1500, 3000, 5500]
  },
  {
    id: 3,
    world: 'unicorn',
    name: 'Unicorn Roundup',
    type: 'order',
    moves: 25,
    orders: [{sym: 0, count: 8}, {sym: 2, count: 6}], // 8 unicorns, 6 rainbows
    starThresholds: [800, 1800, 3500]
  },
  {
    id: 4,
    world: 'unicorn',
    name: 'Jelly Adventure',
    type: 'jelly',
    moves: 22,
    jelly: jellyRect(1, 4, 1, 4, 1), // 4x4 inner block
    starThresholds: [1200, 2500, 4500]
  },
  {
    id: 5,
    world: 'unicorn',
    name: 'Meadow Finale',
    type: 'score',
    moves: 25,
    goal: 3500,
    starThresholds: [3500, 5500, 8500]
  },

  // ====== MERMAID LAGOON (6-10) ======
  {
    id: 6,
    world: 'mermaid',
    name: 'Lagoon Welcome',
    type: 'score',
    moves: 25,
    goal: 3000,
    starThresholds: [3000, 5000, 8000]
  },
  {
    id: 7,
    world: 'mermaid',
    name: 'Pearl Collection',
    type: 'order',
    moves: 25,
    orders: [{sym: 1, count: 6}, {sym: 5, count: 5}], // 6 shells, 5 dolphins
    starThresholds: [1500, 3000, 5000]
  },
  {
    id: 8,
    world: 'mermaid',
    name: 'Ocean Floor',
    type: 'jelly',
    moves: 25,
    jelly: jellyMix(
      // 1-layer: outer ring
      [{r:0,c:0},{r:0,c:1},{r:0,c:4},{r:0,c:5},
       {r:1,c:0},{r:1,c:5},{r:4,c:0},{r:4,c:5},
       {r:5,c:0},{r:5,c:1},{r:5,c:4},{r:5,c:5}],
      // 2-layer: center 2x2
      [{r:2,c:2},{r:2,c:3},{r:3,c:2},{r:3,c:3}]
    ),
    starThresholds: [2000, 4000, 7000]
  },
  {
    id: 9,
    world: 'mermaid',
    name: 'Tide Pool',
    type: 'score',
    moves: 22,
    goal: 5000,
    starThresholds: [5000, 7500, 11000]
  },
  {
    id: 10,
    world: 'mermaid',
    name: 'Choco Coral',
    type: 'score',
    moves: 28,
    goal: 4500,
    blockers: {
      chocolate: [{r:0,c:0},{r:0,c:5},{r:5,c:0},{r:5,c:5}]
    },
    starThresholds: [4500, 7500, 12000]
  },

  // ====== WINTER WONDER (11-15) ======
  {
    id: 11,
    world: 'winter',
    name: 'First Snow',
    type: 'score',
    moves: 25,
    goal: 5000,
    starThresholds: [5000, 8000, 12000]
  },
  {
    id: 12,
    world: 'winter',
    name: 'Frosted Cells',
    type: 'jelly',
    moves: 25,
    jelly: jellyAll(1),
    starThresholds: [3000, 6000, 10000]
  },
  {
    id: 13,
    world: 'winter',
    name: 'Crystal Hunt',
    type: 'order',
    moves: 28,
    orders: [{sym: 3, count: 6}, {sym: 0, count: 5}, {sym: 5, count: 5}], // 6 diamonds, 5 snowflakes, 5 stars
    starThresholds: [2000, 4500, 7500]
  },
  {
    id: 14,
    world: 'winter',
    name: 'Ice Castle',
    type: 'mixed',
    moves: 28,
    goal: 4000,
    jelly: jellyRect(2, 3, 1, 4, 1), // a 2x4 strip across the middle
    blockers: {
      meringue: [{r:0,c:2,hp:1},{r:0,c:3,hp:1},{r:5,c:2,hp:2},{r:5,c:3,hp:2}]
    },
    starThresholds: [4000, 7000, 11000]
  },
  {
    id: 15,
    world: 'winter',
    name: 'Blizzard',
    type: 'score',
    moves: 25,
    goal: 9000,
    blockers: {
      chocolate: [{r:0,c:0},{r:0,c:5}]
    },
    starThresholds: [9000, 13000, 18000]
  },

  // ====== FAIRY GARDEN (16-20) ======
  {
    id: 16,
    world: 'fairy',
    name: 'Garden Path',
    type: 'score',
    moves: 25,
    goal: 7000,
    starThresholds: [7000, 11000, 16000]
  },
  {
    id: 17,
    world: 'fairy',
    name: 'Butterfly Hunt',
    type: 'order',
    moves: 25,
    orders: [{sym: 4, count: 8}, {sym: 1, count: 6}], // 8 butterflies, 6 blossoms
    starThresholds: [2500, 5000, 9000]
  },
  {
    id: 18,
    world: 'fairy',
    name: 'Mushroom Meadow',
    type: 'jelly',
    moves: 28,
    jelly: jellyAll(2),
    starThresholds: [4000, 8000, 13000]
  },
  {
    id: 19,
    world: 'fairy',
    name: 'Enchanted Grove',
    type: 'mixed',
    moves: 28,
    goal: 6000,
    orders: [{sym: 3, count: 5}], // 5 mushrooms
    blockers: {
      chocolate: [{r:2,c:2},{r:2,c:3},{r:3,c:2},{r:3,c:3}],
      meringue: [{r:0,c:0,hp:1},{r:0,c:5,hp:1},{r:5,c:0,hp:1},{r:5,c:5,hp:1}]
    },
    starThresholds: [6000, 10000, 15000]
  },
  {
    id: 20,
    world: 'fairy',
    name: 'Fairy Queen',
    type: 'score',
    moves: 25,
    goal: 12000,
    blockers: {
      meringue: [{r:0,c:1,hp:2},{r:0,c:4,hp:2},{r:5,c:1,hp:2},{r:5,c:4,hp:2}]
    },
    starThresholds: [12000, 18000, 26000]
  },
];

// Export for both browser globals and Node test usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS };
} else {
  window.LEVELS = LEVELS;
}
