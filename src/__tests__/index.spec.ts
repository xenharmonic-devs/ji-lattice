import {describe, it, expect} from 'vitest';
import {Fraction, LOG_PRIMES, circleDistance, toMonzo} from 'xen-dev-utils';
import {
  GridOptions,
  kraigGrady9,
  modVal,
  primeRing72,
  scottDakota24,
  shortestEdge,
  spanGrid,
  spanLattice,
} from '..';

describe('Modulo val calculator', () => {
  it('works for 24', () => {
    const logs = LOG_PRIMES.slice(0, 24);
    const mv = modVal(logs, 24);
    expect(mv).toEqual([
      0, 14, 8, 19, 11, 17, 2, 6, 13, 21, 23, 5, 9, 10, 12, 16, 20, 22, 1, 4, 3,
      7, 15, 18,
    ]);
    // Verify that most prime mappings stay intact.
    for (let i = 0; i < logs.length - 4; ++i) {
      const steps = Math.round((logs[i] / logs[0]) * 24);
      const damage = circleDistance(steps, mv[i], 24);
      expect(damage).toBeLessThan(2);
    }
  });

  it('works for 72', () => {
    const logs = LOG_PRIMES.slice(0, 72);
    const mv = modVal(logs, 72);
    expect(mv).toEqual([
      0, 42, 23, 58, 33, 50, 6, 18, 38, 62, 69, 15, 26, 31, 40, 52, 64, 67, 5,
      11, 14, 22, 27, 34, 43, 47, 49, 53, 55, 59, 71, 2, 7, 9, 16, 17, 21, 25,
      28, 30, 35, 36, 41, 44, 45, 46, 51, 57, 60, 61, 63, 65, 66, 70, 1, 3, 4,
      8, 10, 12, 13, 19, 20, 24, 29, 32, 37, 39, 48, 54, 56, 68,
    ]);
    // Verify that most prime mappings stay intact.
    for (let i = 0; i < logs.length - 11; ++i) {
      const steps = Math.round((logs[i] / logs[0]) * 72);
      const damage = circleDistance(steps, mv[i], 72);
      expect(damage).toBeLessThan(4);
    }
  });
});

describe('Kraig Grady lattice', () => {
  it('works for a 7-limit box', () => {
    const monzos: number[][] = [];
    for (let i = 0; i < 3; ++i) {
      const fifths = new Fraction(3).pow(i)!.geoMod(2);
      monzos.push(toMonzo(fifths));
      monzos.push(toMonzo(fifths.mul(5).geoMod(2)));
      monzos.push(toMonzo(fifths.mul(7).geoMod(2)));
    }
    monzos[0].push(1);
    const {vertices, edges} = spanLattice(monzos, kraigGrady9());
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: 0, y: -40},
      {index: 2, x: 13, y: -11},
      {index: 3, x: 40, y: 0},
      {index: 4, x: 40, y: -40},
      {index: 5, x: 53, y: -11},
      {index: 6, x: 80, y: 0},
      {index: 7, x: 80, y: -40},
      {index: 8, x: 93, y: -11},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: 0, y2: -40, type: 'primary'},
      {x1: 0, y1: 0, x2: 13, y2: -11, type: 'primary'},
      {x1: 0, y1: 0, x2: 40, y2: 0, type: 'primary'},
      {x1: 0, y1: -40, x2: 40, y2: -40, type: 'primary'},
      {x1: 13, y1: -11, x2: 53, y2: -11, type: 'primary'},
      {x1: 40, y1: 0, x2: 40, y2: -40, type: 'primary'},
      {x1: 40, y1: 0, x2: 53, y2: -11, type: 'primary'},
      {x1: 40, y1: 0, x2: 80, y2: 0, type: 'primary'},
      {x1: 40, y1: -40, x2: 80, y2: -40, type: 'primary'},
      {x1: 53, y1: -11, x2: 93, y2: -11, type: 'primary'},
      {x1: 80, y1: 0, x2: 80, y2: -40, type: 'primary'},
      {x1: 80, y1: 0, x2: 93, y2: -11, type: 'primary'},
    ]);
  });

  it('connects in a straight line at max distance 2', () => {
    const monzos = [[1], [2, -1], [-3, 2]];
    const options = kraigGrady9();
    options.maxDistance = 2;
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: -40, y: 0},
      {index: 2, x: 80, y: 0},
      {index: undefined, x: 40, y: 0},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: -40, y2: 0, type: 'primary'},
      {x1: 0, y1: 0, x2: 40, y2: 0, type: 'auxiliary'},
      {x1: 80, y1: 0, x2: 40, y2: 0, type: 'auxiliary'},
    ]);
  });

  it("doesn't over-connect at max distance 2", () => {
    const monzos = [[1], [0, -1], [0, 1], [0, 0, 1]];
    const options = kraigGrady9();
    options.maxDistance = 2;
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: -40, y: 0},
      {index: 2, x: 40, y: 0},
      {index: 3, x: 0, y: -40},
      {index: undefined, x: -40, y: -40},
      {index: undefined, x: 40, y: -40},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: -40, y2: 0, type: 'primary'},
      {x1: 0, y1: 0, x2: 40, y2: 0, type: 'primary'},
      {x1: 0, y1: 0, x2: 0, y2: -40, type: 'primary'},
      {x1: -40, y1: 0, x2: -40, y2: -40, type: 'auxiliary'},
      {x1: 40, y1: 0, x2: 40, y2: -40, type: 'auxiliary'},
      {x1: 0, y1: -40, x2: -40, y2: -40, type: 'auxiliary'},
      {x1: 0, y1: -40, x2: 40, y2: -40, type: 'auxiliary'},
    ]);
  });

  it('works in 3.2.5', () => {
    const monzos = [[0, 1], [1], [0, 0, 1]];
    const options = kraigGrady9(1);
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: -23, y: -45},
      {index: 2, x: 0, y: -40},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: -23, y2: -45, type: 'primary'},
      {x1: 0, y1: 0, x2: 0, y2: -40, type: 'primary'},
    ]);
  });
});

describe("Scott Dakota's PR24 lattice", () => {
  it('works for abstract 5-limit', () => {
    const monzos = [
      [],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 0, 1],
      [0, 1, 1],
      [0, 2, 1],
    ];
    const options = scottDakota24();
    options.edgeMonzos = [[0, -2, -1]];
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: 31, y: 9},
      {index: 2, x: 62, y: 18},
      {index: 3, x: 93, y: 27},
      {index: 4, x: 26, y: -14},
      {index: 5, x: 57, y: -5},
      {index: 6, x: 88, y: 4},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: 31, y2: 9, type: 'primary'},
      {x1: 0, y1: 0, x2: 26, y2: -14, type: 'primary'},
      {x1: 31, y1: 9, x2: 62, y2: 18, type: 'primary'},
      {x1: 31, y1: 9, x2: 57, y2: -5, type: 'primary'},
      {x1: 62, y1: 18, x2: 93, y2: 27, type: 'primary'},
      {x1: 62, y1: 18, x2: 88, y2: 4, type: 'primary'},
      {x1: 26, y1: -14, x2: 57, y2: -5, type: 'primary'},
      {x1: 57, y1: -5, x2: 88, y2: 4, type: 'primary'},
      {x1: 0, y1: 0, x2: 88, y2: 4, type: 'custom'},
    ]);
  });

  it('works with max distance = 0', () => {
    const monzos = [[], [0, 1], [0, 0, 1]];
    const options = scottDakota24();
    options.maxDistance = 0;
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: 31, y: 9},
      {index: 2, x: 26, y: -14},
    ]);
    expect(edges).toHaveLength(0);
  });
});

describe('Prime ring 72 coordinates', () => {
  it('is horizontally as unique as possible', () => {
    const {horizontalCoordinates} = primeRing72();
    expect(new Set(horizontalCoordinates).size).toBe(35);
  });

  it('is vertically as unique as possible', () => {
    const {verticalCoordinates} = primeRing72();
    expect(new Set(verticalCoordinates).size).toBe(35);
  });

  it('connects a combination product set at max distance = 2', () => {
    const options = primeRing72();
    options.maxDistance = 2;
    const monzos = [
      [-1, -1, 0, 1],
      [-2, 0, 1],
      [-3, -1, 1, 1],
      [0, -1, 1],
      [-2, 0, 0, 1],
      [1],
    ];
    const {vertices, edges} = spanLattice(monzos, options);
    expect(vertices).toEqual([
      {index: 0, x: -45, y: 16},
      {index: 1, x: 53, y: -33},
      {index: 2, x: 8, y: -17},
      {index: 3, x: -16, y: -51},
      {index: 4, x: 24, y: 34},
      {index: 5, x: 0, y: 0},
      {index: undefined, x: -69, y: -18},
      {index: undefined, x: 77, y: 1},
    ]);
    expect(edges).toEqual([
      {x1: -45, y1: 16, x2: 8, y2: -17, type: 'primary'},
      {x1: -45, y1: 16, x2: 24, y2: 34, type: 'primary'},
      {x1: -45, y1: 16, x2: -69, y2: -18, type: 'auxiliary'},
      {x1: 53, y1: -33, x2: -16, y2: -51, type: 'primary'},
      {x1: 53, y1: -33, x2: 0, y2: 0, type: 'primary'},
      {x1: 53, y1: -33, x2: 77, y2: 1, type: 'auxiliary'},
      {x1: 8, y1: -17, x2: -16, y2: -51, type: 'primary'},
      {x1: 8, y1: -17, x2: 77, y2: 1, type: 'auxiliary'},
      {x1: -16, y1: -51, x2: -69, y2: -18, type: 'auxiliary'},
      {x1: 24, y1: 34, x2: 0, y2: 0, type: 'primary'},
      {x1: 24, y1: 34, x2: 77, y2: 1, type: 'auxiliary'},
      {x1: 0, y1: 0, x2: -69, y2: -18, type: 'auxiliary'},
    ]);
  });
});

describe('Grid spanner', () => {
  it('spans pentatonic major in 12-TET', () => {
    const steps = [0, 2, 4, 7, 9];
    const {vertices, edges} = spanGrid(steps, {
      modulus: 12,
      delta1: 7,
      delta1X: 1,
      delta1Y: 0,
      delta2: 4,
      delta2X: 0,
      delta2Y: -1,
      minX: -2,
      maxX: 2,
      minY: -2,
      maxY: 2,
      edgeVectors: [
        [1, 0],
        [0, -1],
      ],
      gridLines: {delta1: true, delta2: true},
    });
    expect(vertices).toEqual([
      {x: -2, y: 2, indices: [1]}, // [x]
      {x: -2, y: -1, indices: [1]}, // [x]
      {x: -1, y: 2, indices: [4]}, // [x]
      {x: -1, y: -1, indices: [4]}, // Sixth
      {x: 0, y: 2, indices: [2]}, // [x]
      {x: 0, y: 0, indices: [0]}, // Origin
      {x: 0, y: -1, indices: [2]}, // Third
      {x: 1, y: 0, indices: [3]}, // Fifth
      {x: 2, y: 0, indices: [1]}, // Second
    ]);
    expect(edges).toEqual([
      {x1: -2, y1: 2, x2: -1, y2: 2, type: 'custom'},
      {x1: -2, y1: -1, x2: -1, y2: -1, type: 'custom'},
      {x1: -1, y1: 2, x2: 0, y2: 2, type: 'custom'},
      {x1: -1, y1: -1, x2: 0, y2: -1, type: 'custom'},
      {x1: 0, y1: 0, x2: 0, y2: -1, type: 'custom'},
      {x1: 0, y1: 0, x2: 1, y2: 0, type: 'custom'},
      {x1: 1, y1: 0, x2: 2, y2: 0, type: 'custom'},
      {x1: -3, y1: 2, x2: 3, y2: 2, type: 'gridline'},
      {x1: -2, y1: 3, x2: -2, y2: -3, type: 'gridline'},
      {x1: -3, y1: 1, x2: 3, y2: 1, type: 'gridline'},
      {x1: -1, y1: 3, x2: -1, y2: -3, type: 'gridline'},
      {x1: -3, y1: -0, x2: 3, y2: 0, type: 'gridline'},
      {x1: 0, y1: 3, x2: 0, y2: -3, type: 'gridline'},
      {x1: -3, y1: -1, x2: 3, y2: -1, type: 'gridline'},
      {x1: 1, y1: 3, x2: 1, y2: -3, type: 'gridline'},
      {x1: -3, y1: -2, x2: 3, y2: -2, type: 'gridline'},
      {x1: 2, y1: 3, x2: 2, y2: -3, type: 'gridline'},
    ]);
  });

  it('tempers the tones to "mean-tone" in 19-TET', () => {
    const steps = [-3 * 19 + 2 * 30, 19 + 44 - 2 * 30];
    const {vertices, edges} = spanGrid(steps, {
      modulus: 19,
      delta1: 30,
      delta1X: 1,
      delta1Y: 0,
      delta2: 44,
      delta2X: 0,
      delta2Y: -1,
      minX: -2,
      maxX: 2,
      minY: -2,
      maxY: 2,
    });
    expect(vertices).toEqual([
      {x: -2, y: -1, indices: [0, 1]},
      {x: 2, y: 0, indices: [0, 1]},
    ]);
    expect(edges).toHaveLength(0);
  });

  it('spans some primes in 311-TET', () => {
    const p311 = LOG_PRIMES.slice(1, 6).map(l =>
      Math.round((311 * l) / LOG_PRIMES[0])
    );
    const options: GridOptions = {
      modulus: 311,
      delta1: 296,
      delta1X: 14,
      delta1Y: 2,
      delta2: 242,
      delta2X: 7,
      delta2Y: -8,
      minX: -400,
      maxX: 400,
      minY: -250,
      maxY: 250,
      edgeVectors: [],
    };
    for (const step of p311) {
      options.edgeVectors!.push(shortestEdge(step, options));
    }
    expect(options.edgeVectors).toEqual([
      [63, 0],
      [28, -68],
      [56, 8],
      [42, -12],
      [-28, -22],
    ]);
    const steps = [0, ...p311];
    steps.push(p311[0] + p311[1]);
    steps.push(2 * p311[0] + p311[1]);
    steps.push(2 * p311[0] + 2 * p311[1]);
    steps.push(3 * p311[0] + 2 * p311[1]);
    const {vertices, edges} = spanGrid(steps, options);
    expect(vertices).toHaveLength(101);
    expect(edges).toHaveLength(93);
  });

  it('generates a triangular grid for 53-TET', () => {
    const options: GridOptions = {
      modulus: 53,
      delta1: 84,
      delta1X: 6,
      delta1Y: 0,
      delta2: 123,
      delta2X: 3,
      delta2Y: -5,
      minX: -41.1,
      maxX: 41.1,
      minY: -21.1,
      maxY: 21.1,
      gridLines: {
        delta1: true,
        delta2: true,
        diagonal1: true,
      },
    };
    const {edges} = spanGrid([], options);
    const slopes = new Set<number>();
    for (const edge of edges) {
      const slope = (3 * (edge.y2 - edge.y1)) / (edge.x2 - edge.x1);
      expect([0, 5, -5]).toContain(slope);
      slopes.add(slope);
    }
    expect(slopes).toHaveLength(3);
  });

  it('has sanity limits on the number of elements', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const options: GridOptions = {
      modulus: 12,
      delta1: 19,
      delta1X: 1,
      delta1Y: 0,
      delta2: 28,
      delta2X: 0,
      delta2Y: -1,
      minX: -120.60687285223368,
      maxX: 120.60687285223368,
      minY: -60.2,
      maxY: 60.2,
      edgeVectors: [
        [1, 0],
        [0, -1],
      ],
      gridLines: {
        delta1: true,
        delta2: true,
        diagonal1: false,
        diagonal2: false,
      },
    };

    const {vertices, edges} = spanGrid(steps, options);
    expect(vertices.length).toBeLessThanOrEqual(1000);
    expect(edges.length).toBeLessThanOrEqual(1000);
  });
});
