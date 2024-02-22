import {LOG_PRIMES, dot, mmod, monzosEqual, sub} from 'xen-dev-utils';

export type EdgeType = 'primary' | 'custom' | 'auxiliary';

export type Vertex = {
  x: number;
  y: number;
  index?: number;
};

export type Edge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: EdgeType;
};

export type Connection = {
  index1: number;
  index2: number;
  type: EdgeType;
};

export type LatticeOptions = {
  horizontalCoordinates: number[];
  verticalCoordinates: number[];
  maxDistance?: number;
  equaveIndex?: number;
  edgeMonzos?: number[][];
};

export type GridOptions = {
  modulus: number;

  delta1: number;
  delta1X: number;
  delta1Y: number;

  delta2: number;
  delta2X: number;
  delta2Y: number;

  minX: number;
  maxX: number;
  minY: number;
  maxY: number;

  edgeVectors?: number[][];

  range?: number;
};

// Coordinates are for SVG so positive y-direction points down.
// Based on Kraig Grady's coordinate system https://anaphoria.com/wilsontreasure.html
// Coordinates for prime 2 by Lumi Pakkanen.
// X-coordinates for every prime up to 23.
const KRAIG_GRADY_X = [-23, 40, 0, 13, -14, -8, -5, 7, 20];
// Y-coordinates for every prime up to 23.
const KRAIG_GRADY_Y = [-45, 0, -40, -11, -18, -4, -32, -25, -6];

// Sine quantized to integers according to Scott Dakota.
const SCOTT_DAKOTA_SINE = [
  // eslint-disable-next-line prettier/prettier
  0,    5,   9,   12,  14,  16,
  17,   16,  14,  12,  9,   5,
  0,   -5,  -9,  -12, -14, -16,
  -17, -16, -14, -12, -9,  -5
];

/**
 * Calculate the taxicab norm / Manhattan distance between two vectors.
 * @param a Prime exponents of a musical interval.
 * @param b Prime exponents of a musical interval.
 */
function taxicabDistance(a: number[], b: number[]): number {
  if (a.length > b.length) {
    return taxicabDistance(b, a);
  }
  let result = 0;
  for (let i = 0; i < a.length; ++i) {
    result += Math.abs(a[i] - b[i]);
  }
  for (let i = a.length; i < b.length; ++i) {
    result += Math.abs(b[i]);
  }
  return result;
}

/**
 * Connect monzos that are pre-processed to ignore equaves.
 * @param monzos Array of arrays of prime exponents of musical intervals (usually without prime 2).
 * @param maxDistance Maximum taxicab distance to connect.
 * @returns An array of connections and an array of auxillary nodes.
 */
function connect(monzos: number[][], maxDistance: number) {
  if (maxDistance > 2) {
    throw new Error('Only up to max distance = 2 implemented.');
  }

  const connections: Connection[] = [];
  const connectingMonzos: number[][] = [];

  if (maxDistance > 1) {
    for (let i = 0; i < monzos.length; ++i) {
      for (let j = i + 1; j < monzos.length; ++j) {
        const distance = taxicabDistance(monzos[i], monzos[j]);
        if (distance > 1 && distance <= maxDistance) {
          const len = Math.max(monzos[i].length, monzos[j].length);
          for (let k = 0; k < len; ++k) {
            const gap = (monzos[i][k] ?? 0) - (monzos[j][k] ?? 0);
            if (Math.abs(gap) === 2) {
              const monzo = [...monzos[j]];
              for (let l = monzos[j].length; l < monzos[i].length; ++l) {
                monzo[l] = 0;
              }
              monzo[k] += gap / 2;
              for (const existing of monzos.concat(connectingMonzos)) {
                if (monzosEqual(monzo, existing)) {
                  break;
                }
              }
              connectingMonzos.push(monzo);
              break;
            } else if (Math.abs(gap) === 1) {
              for (let l = k + 1; l < len; ++l) {
                const otherGap = (monzos[i][l] ?? 0) - (monzos[j][l] ?? 0);
                const monzo = [...monzos[j]];
                for (let m = monzos[j].length; m < monzos[i].length; ++m) {
                  monzo[m] = 0;
                }
                const otherWay = [...monzo];
                monzo[k] += gap;
                otherWay[l] += otherGap;
                let monzoUnique = true;
                let otherUnique = true;
                for (const existing of monzos.concat(connectingMonzos)) {
                  if (monzosEqual(monzo, existing)) {
                    monzoUnique = false;
                  }
                  if (monzosEqual(otherWay, existing)) {
                    otherUnique = false;
                  }
                }
                if (monzoUnique) {
                  connectingMonzos.push(monzo);
                }
                if (otherUnique) {
                  connectingMonzos.push(otherWay);
                }
              }
              break;
            }
          }
        }
      }
    }
  }
  const primaryLength = monzos.length;
  monzos = monzos.concat(connectingMonzos);
  for (let i = 0; i < monzos.length; ++i) {
    for (let j = i + 1; j < monzos.length; ++j) {
      const distance = taxicabDistance(monzos[i], monzos[j]);
      if (distance === 1) {
        connections.push({
          index1: i,
          index2: j,
          type:
            i < primaryLength && j < primaryLength ? 'primary' : 'auxiliary',
        });
      }
    }
  }
  return {
    connections,
    connectingMonzos,
  };
}

function prepare(monzo: number[], equaveIndex: number) {
  const result = [...monzo];
  result.splice(equaveIndex, 1);
  return result;
}

/**
 * Compute vertices and edges for a 2D graph representing the lattice of a musical scale in just intonation.
 * @param monzos Prime exponents of the musical intervals in the scale.
 * @param horizontalCoordinates Horizontal coordinates for each prime.
 * @param verticalCoordinates Vertical coordinates for each prime.
 * @param maxDistance Maximum distance to connect to (1 or 2).
 * @param equaveIndex Index of the prime of equivalence to ignore during distance calculation.
 * @returns Vertices and edges of the graph.
 */
export function spanLattice(monzos: number[][], options: LatticeOptions) {
  const equaveIndex = options.equaveIndex ?? 0;
  const maxDistance = options.maxDistance ?? 1;
  monzos = monzos.map(m => prepare(m, equaveIndex));
  const horizontalCoordinates = prepare(
    options.horizontalCoordinates,
    equaveIndex
  );
  const verticalCoordinates = prepare(options.verticalCoordinates, equaveIndex);

  const {connections, connectingMonzos} = connect(monzos, maxDistance);

  const vertices: Vertex[] = [];
  const edges: Edge[] = [];

  for (let index = 0; index < monzos.length; ++index) {
    vertices.push({
      index,
      x: dot(monzos[index], horizontalCoordinates),
      y: dot(monzos[index], verticalCoordinates),
    });
  }

  for (let i = 0; i < connectingMonzos.length; ++i) {
    vertices.push({
      index: undefined,
      x: dot(connectingMonzos[i], horizontalCoordinates),
      y: dot(connectingMonzos[i], verticalCoordinates),
    });
  }

  for (const connection of connections) {
    const {index1, index2, type} = connection;
    edges.push({
      x1: vertices[index1].x,
      y1: vertices[index1].y,
      x2: vertices[index2].x,
      y2: vertices[index2].y,
      type,
    });
  }

  if (options.edgeMonzos) {
    let ems = [...options.edgeMonzos];
    for (const em of ems) {
      em.splice(equaveIndex, 1);
    }
    ems = ems.concat(ems.map(em => em.map(e => -e)));
    for (let i = 0; i < monzos.length; ++i) {
      for (let j = i + 1; j < monzos.length; ++j) {
        const diff = sub(monzos[i], monzos[j]);
        for (const em of ems) {
          if (monzosEqual(diff, em)) {
            edges.push({
              x1: vertices[i].x,
              y1: vertices[i].y,
              x2: vertices[j].x,
              y2: vertices[j].y,
              type: 'custom',
            });
          }
        }
      }
    }
  }

  return {
    vertices,
    edges,
  };
}

function allUnique(vector: number[]) {
  for (let i = 0; i < vector.length; ++i) {
    for (let j = i + 1; j < vector.length; ++j) {
      if (vector[i] === vector[j]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calculate rounded logarithms modulo divisions. All forced to be unique.
 * @param logs Logarithms of primes.
 * @param divisions Number of divisions of the first prime.
 * @param searchResolution Resolution for GPV search. Set to 0 to disable (default).
 * @returns Array of steps for each prime modulo the number of divisions.
 */
export function modVal(
  logs: number[],
  divisions: number,
  searchResolution = 0
) {
  if (logs.length > divisions) {
    throw new Error(`Too many logarithms to fit into ${divisions} notes.`);
  }
  // Try to find a GPV.
  for (let i = 0; i < searchResolution; ++i) {
    const offset = (0.5 * i) / searchResolution;
    const normalizer = (divisions + offset) / logs[0];
    const modval = logs.map(l => mmod(Math.round(l * normalizer), divisions));
    if (allUnique(modval)) {
      return modval;
    }
    if (i) {
      const normalizer = (divisions - offset) / logs[0];
      const modval = logs.map(l => mmod(Math.round(l * normalizer), divisions));
      if (allUnique(modval)) {
        return modval;
      }
    }
  }
  // No GPV with unique entries found. Use force.
  const normalizer = divisions / logs[0];
  const val = logs.map(l => Math.round(l * normalizer), divisions);
  for (let i = 1; i < val.length; ++i) {
    const reserved = new Set<number>();
    for (let j = 0; j < i; ++j) {
      reserved.add(mmod(val[j], divisions));
    }
    if (!reserved.has(mmod(val[i], divisions))) {
      continue;
    }
    const s = Math.sign(logs[i] * divisions - val[i]);
    for (let j = 0; 2 * j <= divisions; ++j) {
      if (!reserved.has(mmod(val[i] + j * s, divisions))) {
        val[i] += j * s;
        break;
      }
      if (!reserved.has(mmod(val[i] - j * s, divisions))) {
        val[i] -= j * s;
        break;
      }
    }
  }
  return val.map(v => mmod(v, divisions));
}

/**
 * Get Kraig Grady's coordinates for the first 9 primes.
 * @param equaveIndex Index of the prime to use as the interval of equivalence.
 * @returns An array of horizontal coordinates for each prime and the same for vertical coordinates.
 */
export function kraigGrady9(equaveIndex = 0): LatticeOptions {
  return {
    horizontalCoordinates: [...KRAIG_GRADY_X],
    verticalCoordinates: [...KRAIG_GRADY_Y],
    equaveIndex,
  };
}

/**
 * Compute prime ring 24 coordinates based on Scott Dakota's conventions.
 * @param logs Logarithms of (formal) primes with the prime of equivalence first. Defaults to the actual primes.
 * @returns An array of horizontal coordinates for each prime and the same for vertical coordinates.
 */
export function scottDakota24(logs?: number[]): LatticeOptions {
  logs ??= LOG_PRIMES.slice(0, 24);
  const mv = modVal(logs, 24);
  const horizontalCoordinates: number[] = [];
  const verticalCoordinates: number[] = [];
  for (const steps of mv) {
    horizontalCoordinates.push(17 - SCOTT_DAKOTA_SINE[mmod(steps + 6, 24)]);
    verticalCoordinates.push(-SCOTT_DAKOTA_SINE[steps]);
  }
  return {
    horizontalCoordinates,
    verticalCoordinates,
    equaveIndex: 0,
  };
}

/**
 * Compute prime ring 72 coordinates.
 * @param logs Logarithms of (formal) primes with the prime of equivalence first. Defaults to the actual primes.
 * @returns An array of horizontal coordinates for each prime and the same for vertical coordinates.
 */
export function primeRing72(logs?: number[]): LatticeOptions {
  logs ??= LOG_PRIMES.slice(0, 72);
  const mv = modVal(logs, 72);
  const horizontalCoordinates: number[] = [];
  const verticalCoordinates: number[] = [];
  for (const steps of mv) {
    const theta = (Math.PI * steps) / 36;
    horizontalCoordinates.push(37 - Math.round(Math.cos(theta) * 36.7));
    verticalCoordinates.push(-Math.round(Math.sin(theta) * 36.7));
  }
  return {
    horizontalCoordinates,
    verticalCoordinates,
    equaveIndex: 0,
  };
}

export function spanGrid(steps: number[], options: GridOptions) {
  const {
    modulus,
    delta1,
    delta1X,
    delta1Y,
    delta2,
    delta2X,
    delta2Y,
    minX,
    maxX,
    minY,
    maxY,
    edgeVectors,
  } = options;
  const range = options.range ?? 100;

  steps = steps.map(s => mmod(s, modulus));

  const vertices: Vertex[] = [];
  for (let i = -range; i <= range; ++i) {
    for (let j = -range; j <= range; ++j) {
      const x = delta1X * i + delta2X * j;
      const y = delta1Y * i + delta2Y * j;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        const step = mmod(delta1 * i + delta2 * j, modulus);
        const index = steps.indexOf(step);
        if (index >= 0) {
          vertices.push({x, y, index});
        }
      }
    }
  }

  const edges: Edge[] = [];

  if (edgeVectors) {
    let evs = [...edgeVectors];
    evs = evs.concat(evs.map(ev => ev.map(e => -e)));
    for (let i = 0; i < vertices.length; ++i) {
      for (let j = i + 1; j < vertices.length; ++j) {
        const dx = vertices[i].x - vertices[j].x;
        const dy = vertices[i].y - vertices[j].y;
        for (const [vx, vy] of evs) {
          if (dx === vx && dy === vy) {
            edges.push({
              x1: vertices[i].x,
              y1: vertices[i].y,
              x2: vertices[j].x,
              y2: vertices[j].y,
              type: 'custom',
            });
          }
        }
      }
    }
  }

  return {vertices, edges};
}

export function shortestEdge(step: number, options: GridOptions) {
  const {
    modulus,
    delta1,
    delta1X,
    delta1Y,
    delta2,
    delta2X,
    delta2Y,
    minX,
    maxX,
    minY,
    maxY,
  } = options;
  const range = options.range ?? 100;

  step = mmod(step, modulus);

  const vertices: Vertex[] = [];
  for (let i = -range; i <= range; ++i) {
    for (let j = -range; j <= range; ++j) {
      const x = delta1X * i + delta2X * j;
      const y = delta1Y * i + delta2Y * j;
      // Grow search area to go from corner to corner.
      if (x >= 2 * minX && x <= 2 * maxX && y >= 2 * minY && y <= 2 * maxY) {
        const s = mmod(delta1 * i + delta2 * j, modulus);
        if (s === step) {
          vertices.push({x, y});
        }
      }
    }
  }

  if (!vertices.length) {
    throw new Error('Step not found on grid.');
  }

  let shortestX = NaN;
  let shortestY = NaN;
  let norm = Infinity;

  // Only compare against the origin
  for (let i = 0; i < vertices.length; ++i) {
    const dx = vertices[i].x;
    const dy = vertices[i].y;
    const l2 = dx * dx + dy * dy;
    if (l2 < norm) {
      norm = l2;
      shortestX = dx;
      shortestY = dy;
    }
  }

  return [shortestX, shortestY];
}
