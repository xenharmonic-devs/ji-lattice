import {describe, it, expect} from 'vitest';
import {Fraction, LOG_PRIMES, circleDistance, toMonzo} from 'xen-dev-utils';
import {
  KRAIG_GRADY_X,
  KRAIG_GRADY_Y,
  modVal,
  primeRing72,
  scottDakota24,
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
    const {vertices, edges} = spanLattice(monzos, KRAIG_GRADY_X, KRAIG_GRADY_Y);
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
      {x1: 0, y1: 0, x2: 0, y2: -40, primary: true},
      {x1: 0, y1: 0, x2: 13, y2: -11, primary: true},
      {x1: 0, y1: 0, x2: 40, y2: 0, primary: true},
      {x1: 0, y1: -40, x2: 40, y2: -40, primary: true},
      {x1: 13, y1: -11, x2: 53, y2: -11, primary: true},
      {x1: 40, y1: 0, x2: 40, y2: -40, primary: true},
      {x1: 40, y1: 0, x2: 53, y2: -11, primary: true},
      {x1: 40, y1: 0, x2: 80, y2: 0, primary: true},
      {x1: 40, y1: -40, x2: 80, y2: -40, primary: true},
      {x1: 53, y1: -11, x2: 93, y2: -11, primary: true},
      {x1: 80, y1: 0, x2: 80, y2: -40, primary: true},
      {x1: 80, y1: 0, x2: 93, y2: -11, primary: true},
    ]);
  });

  it('connects in a straight line at max distance 2', () => {
    const monzos = [[1], [2, -1], [-3, 2]];
    const {vertices, edges} = spanLattice(
      monzos,
      KRAIG_GRADY_X,
      KRAIG_GRADY_Y,
      2
    );
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0},
      {index: 1, x: -40, y: 0},
      {index: 2, x: 80, y: 0},
      {index: undefined, x: 40, y: 0},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, x2: -40, y2: 0, primary: true},
      {x1: 0, y1: 0, x2: 40, y2: 0, primary: false},
      {x1: 80, y1: 0, x2: 40, y2: 0, primary: false},
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
    const {horizontalCoordinates, verticalCoordinates} = scottDakota24();
    const {vertices, edges} = spanLattice(
      monzos,
      horizontalCoordinates,
      verticalCoordinates
    );
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
      {x1: 0, y1: 0, x2: 31, y2: 9, primary: true},
      {x1: 0, y1: 0, x2: 26, y2: -14, primary: true},
      {x1: 31, y1: 9, x2: 62, y2: 18, primary: true},
      {x1: 31, y1: 9, x2: 57, y2: -5, primary: true},
      {x1: 62, y1: 18, x2: 93, y2: 27, primary: true},
      {x1: 62, y1: 18, x2: 88, y2: 4, primary: true},
      {x1: 26, y1: -14, x2: 57, y2: -5, primary: true},
      {x1: 57, y1: -5, x2: 88, y2: 4, primary: true},
    ]);
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
    const {horizontalCoordinates, verticalCoordinates} = primeRing72();
    const monzos = [
      [-1, -1, 0, 1],
      [-2, 0, 1],
      [-3, -1, 1, 1],
      [0, -1, 1],
      [-2, 0, 0, 1],
      [1],
    ];
    const {vertices, edges} = spanLattice(
      monzos,
      horizontalCoordinates,
      verticalCoordinates,
      2
    );
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
      {x1: -45, y1: 16, x2: 8, y2: -17, primary: true},
      {x1: -45, y1: 16, x2: 24, y2: 34, primary: true},
      {x1: -45, y1: 16, x2: -69, y2: -18, primary: false},
      {x1: 53, y1: -33, x2: -16, y2: -51, primary: true},
      {x1: 53, y1: -33, x2: 0, y2: 0, primary: true},
      {x1: 53, y1: -33, x2: 77, y2: 1, primary: false},
      {x1: 8, y1: -17, x2: -16, y2: -51, primary: true},
      {x1: 8, y1: -17, x2: 77, y2: 1, primary: false},
      {x1: -16, y1: -51, x2: -69, y2: -18, primary: false},
      {x1: 24, y1: 34, x2: 0, y2: 0, primary: true},
      {x1: 24, y1: 34, x2: 77, y2: 1, primary: false},
      {x1: 0, y1: 0, x2: -69, y2: -18, primary: false},
    ]);
  });
});
