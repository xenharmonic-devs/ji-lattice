import {describe, it, expect} from 'vitest';
import {Fraction, LOG_PRIMES, toMonzo} from 'xen-dev-utils';
import {WGP9, primeSphere, spanLattice3D} from '../lattice-3d';

describe('Wilson-Grady-Pakkanen lattice', () => {
  it('works for a 7-limit box', () => {
    const monzos: number[][] = [];
    for (let i = 0; i < 3; ++i) {
      const fifths = new Fraction(3).pow(i)!.geoMod(2);
      monzos.push(toMonzo(fifths));
      monzos.push(toMonzo(fifths.mul(5).geoMod(2)));
      monzos.push(toMonzo(fifths.mul(7).geoMod(2)));
    }
    monzos[0].push(1);
    const {vertices, edges} = spanLattice3D(monzos, WGP9());
    expect(vertices).toEqual([
      {index: 0, x: 0, y: 0, z: 0},
      {index: 1, x: 0, y: -40, z: 0},
      {index: 2, x: 0, y: 0, z: 40},
      {index: 3, x: 40, y: 0, z: 0},
      {index: 4, x: 40, y: -40, z: 0},
      {index: 5, x: 40, y: 0, z: 40},
      {index: 6, x: 80, y: 0, z: 0},
      {index: 7, x: 80, y: -40, z: 0},
      {index: 8, x: 80, y: 0, z: 40},
    ]);
    expect(edges).toEqual([
      {x1: 0, y1: 0, z1: 0, x2: 0, y2: -40, z2: 0, type: 'primary'}, // 1 -> 5
      {x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 40, type: 'primary'}, // 1 -> 7
      {x1: 0, y1: 0, z1: 0, x2: 40, y2: 0, z2: 0, type: 'primary'}, // 1 -> 3
      {x1: 0, y1: -40, z1: 0, x2: 40, y2: -40, z2: 0, type: 'primary'}, // 5 -> 15
      {x1: 0, y1: 0, z1: 40, x2: 40, y2: 0, z2: 40, type: 'primary'}, // 7 -> 21
      {x1: 40, y1: 0, z1: 0, x2: 40, y2: -40, z2: 0, type: 'primary'}, // 3 -> 15
      {x1: 40, y1: 0, z1: 0, x2: 40, y2: 0, z2: 40, type: 'primary'}, // 3 -> 21
      {x1: 40, y1: 0, z1: 0, x2: 80, y2: 0, z2: 0, type: 'primary'}, // 3 -> 9
      {x1: 40, y1: -40, z1: 0, x2: 80, y2: -40, z2: 0, type: 'primary'}, // 15 -> 45
      {x1: 40, y1: 0, z1: 40, x2: 80, y2: 0, z2: 40, type: 'primary'}, // 21 -> 63
      {x1: 80, y1: 0, z1: 0, x2: 80, y2: -40, z2: 0, type: 'primary'}, // 9 -> 45
      {x1: 80, y1: 0, z1: 0, x2: 80, y2: 0, z2: 40, type: 'primary'}, // 9 -> 63
    ]);
  });
});

describe('Prime sphere coordinates', () => {
  it('produces coordinates for the 11-limit', () => {
    const {horizontalCoordinates, verticalCoordinates, depthwiseCoordinates} =
      primeSphere(LOG_PRIMES.slice(0, 5));
    const coords: string[] = [];
    for (let i = 0; i < 5; ++i) {
      coords.push(
        `${horizontalCoordinates[i].toFixed(3)}, ${verticalCoordinates[
          i
        ].toFixed(3)}, ${depthwiseCoordinates[i].toFixed(3)}`
      );
    }
    expect(coords).toEqual([
      '0.000, -0.000, 0.000',
      '1.861, 0.509, 0.000', // 3/2 points right and a little down
      '1.437, -0.900, -0.000', // 5/4 points right-up
      '0.647, 0.211, 0.912', // 7/4 points into the screen
      '1.968, 0.086, -0.237', // 11/8 does whatever
    ]);
  });
});
