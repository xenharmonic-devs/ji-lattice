import {LOG_PRIMES, dot, mmod, monzosEqual, sub} from 'xen-dev-utils';
import {EdgeType} from './types';
import {connect, project, unproject} from './utils';
export * from './types';
export * from './lattice-3d';

/**
 * A vertex of a 2D graph.
 */
export type Vertex = {
  /** Horizontal coordinate. */
  x: number;
  /** Vertical coordinate. */
  y: number;
  /** Index to input array. */
  index?: number;
};

/**
 * A vertex of a 2D graph.
 */
export type MultiVertex = {
  /** Horizontal coordinate. */
  x: number;
  /** Vertical coordinate. */
  y: number;
  /** Indices to input array. */
  indices: number[];
};

/**
 * An edge connecting two vertices of a 2D graph.
 */
export type Edge = {
  /** First horizontal coordinate. */
  x1: number;
  /** First vertical coordinate. */
  y1: number;
  /** Second horizontal coordinate. */
  x2: number;
  /** Second vertical coordinate. */
  y2: number;
  /** Type of connection. */
  type: EdgeType;
};

/**
 * Options for {@link spanLattice}.
 */
export type LatticeOptions = {
  /** Mapping for prime x-coordinates. */
  horizontalCoordinates: number[];
  /** Mapping for prime y-coordinates. */
  verticalCoordinates: number[];
  /** Maximum prime-wise distance for connecting two inputs. */
  maxDistance?: number;
  /** Prime-count vectors of connections in addition the the primes. */
  edgeMonzos?: number[][];
  /** Flag to merge short edges into a long ones wherever possible. */
  mergeEdges?: boolean;
};

/**
 * Options for gridlines of {@link spanGrid}.
 */
export type GridLineOptions = {
  /** Span gridlines in the first direction. */
  delta1?: boolean;
  /** Span gridlines in the second direction. */
  delta2?: boolean;
  /** Span gridlines in the difference of the primary directions. */
  diagonal1?: boolean;
  /** Span gridlines in the sum of the primary directions. */
  diagonal2?: boolean;
};

/**
 * Options for {@link spanGrid}.
 */
export type GridOptions = {
  /** Number of scale steps in the interval of equivalence. */
  modulus: number;

  /** Number of scale steps to take in the first direction. */
  delta1: number;
  /** Number of horizontal screen units to advance in the first direction. */
  delta1X: number;
  /** Number of vertical screen units to advance in the first direction. */
  delta1Y: number;

  /** Number of scale steps to take in the second direction. */
  delta2: number;
  /** Number of horizontal screen units to advance in the first direction. */
  delta2X: number;
  /** Number of vertical screen units to advance in the first direction. */
  delta2Y: number;

  /** Low horizontal extent of view in screen units. */
  minX: number;
  /** High horizontal extent of view in screen units. */
  maxX: number;
  /** Low vertical extent of view in screen units. */
  minY: number;
  /** High vertical extent of view in screen units. */
  maxY: number;

  /** Connect vertices separated by these screen units. */
  edgeVectors?: number[][];
  /** Options for calculating gridlines. */
  gridLines?: GridLineOptions;

  /** Flag to merge short edges into a long ones wherever possible. */
  mergeEdges?: boolean;

  /** Search range for discovering vertices and edges in view. */
  range?: number;
  /** Maximum number of vertices to return. */
  maxVertices?: number;
  /** Maximum number of edges to return. */
  maxEdges?: number;
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
 * Combine edges that share an endpoint and slope into longer ones.
 * @param edges Large number of short edges to merge.
 * @returns Smaller number of long edges.
 */
export function mergeEdges(edges: Edge[]) {
  // Choose a canonical orientation.
  const oriented: Edge[] = [];
  for (const edge of edges) {
    if (edge.x2 < edge.x1 || (edge.x2 === edge.x1 && edge.y2 < edge.y1)) {
      oriented.push({
        x1: edge.x2,
        y1: edge.y2,
        x2: edge.x1,
        y2: edge.y1,
        type: edge.type,
      });
    } else {
      oriented.push(edge);
    }
  }
  oriented.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1);
  const result: Edge[] = [];
  const spent = new Set<number>();
  for (let i = 0; i < oriented.length; ++i) {
    if (spent.has(i)) {
      continue;
    }
    // eslint-disable-next-line prefer-const
    let {x1, y1, x2, y2, type} = oriented[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    for (let j = i + 1; j < oriented.length; ++j) {
      const e = oriented[j];
      if (e.x1 === x2 && e.y1 === y2 && e.type === type) {
        const dex = e.x2 - e.x1;
        const dey = e.y2 - e.y1;
        if (dex * dy === dx * dey) {
          x2 = e.x2;
          y2 = e.y2;
          spent.add(j);
        }
      }
    }
    result.push({x1, x2, y1, y2, type});
  }
  return result;
}

/**
 * Compute vertices and edges for a 2D graph representing the lattice of a musical scale in just intonation.
 * @param monzos Prime exponents of the musical intervals in the scale.
 * @param options Options for connecting vertices in the graph.
 * @returns Vertices and edges of the graph.
 */
export function spanLattice(monzos: number[][], options: LatticeOptions) {
  const {horizontalCoordinates, verticalCoordinates} = options;
  const maxDistance = options.maxDistance ?? 1;

  const coordss = [horizontalCoordinates, verticalCoordinates];

  let projected = project(monzos, coordss);

  const {connections, connectingMonzos} = connect(projected, maxDistance);

  const unprojected = unproject(connectingMonzos, coordss);

  const vertices: Vertex[] = [];
  let edges: Edge[] = [];

  for (let index = 0; index < monzos.length; ++index) {
    vertices.push({
      index,
      x: dot(monzos[index], horizontalCoordinates),
      y: dot(monzos[index], verticalCoordinates),
    });
  }

  for (const monzo of unprojected) {
    vertices.push({
      index: undefined,
      x: dot(monzo, horizontalCoordinates),
      y: dot(monzo, verticalCoordinates),
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
    projected = projected.concat(connectingMonzos);
    let ems = project(options.edgeMonzos, coordss);
    ems = ems.concat(ems.map(em => em.map(e => -e)));
    for (let i = 0; i < projected.length; ++i) {
      for (let j = i + 1; j < projected.length; ++j) {
        const diff = sub(projected[i], projected[j]);
        for (const em of ems) {
          if (monzosEqual(diff, em)) {
            edges.push({
              x1: vertices[i].x,
              y1: vertices[i].y,
              x2: vertices[j].x,
              y2: vertices[j].y,
              type:
                i < monzos.length && j < monzos.length ? 'custom' : 'auxiliary',
            });
          }
        }
      }
    }
  }

  if (options.mergeEdges) {
    edges = mergeEdges(edges);
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
  const horizontalCoordinates = [...KRAIG_GRADY_X];
  const verticalCoordinates = [...KRAIG_GRADY_Y];
  horizontalCoordinates[equaveIndex] = 0;
  verticalCoordinates[equaveIndex] = 0;
  return {
    horizontalCoordinates,
    verticalCoordinates,
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
  };
}

/**
 * Compute prime ring 72 coordinates.
 * @param logs Logarithms of (formal) primes with the prime of equivalence first. Defaults to the actual primes.
 * @param round Round coordinates to nearest integers.
 * @returns An array of horizontal coordinates for each prime and the same for vertical coordinates.
 */
export function primeRing72(logs?: number[], round = true): LatticeOptions {
  logs ??= LOG_PRIMES.slice(0, 72);
  const mv = modVal(logs, 72);
  const horizontalCoordinates: number[] = [];
  const verticalCoordinates: number[] = [];
  for (const steps of mv) {
    const theta = (Math.PI * steps) / 36;
    if (round) {
      horizontalCoordinates.push(37 - Math.round(Math.cos(theta) * 36.7));
      verticalCoordinates.push(-Math.round(Math.sin(theta) * 36.7));
    } else {
      horizontalCoordinates.push(36.7 - Math.cos(theta) * 36.7);
      verticalCoordinates.push(-Math.sin(theta) * 36.7);
    }
  }
  return {
    horizontalCoordinates,
    verticalCoordinates,
  };
}

/**
 * Rotate coordinates to make one of the primes horizontal.
 * @param options Lattice options with coordinates to modify in-place.
 * @param horizontalIndex Index of prime to make horizontal.
 * @param tonnetzIndex Index of another prime to align with the up-left direction of a triangular lattice. Coordinates are sheared as necessary.
 */
export function align(
  options: LatticeOptions,
  horizontalIndex: number,
  tonnetzIndex?: number
) {
  const {horizontalCoordinates, verticalCoordinates} = options;

  if (tonnetzIndex === undefined) {
    const x = horizontalCoordinates[horizontalIndex];
    const y = verticalCoordinates[horizontalIndex];
    const c = 1 / Math.sqrt(1 + (y * y) / (x * x));
    const s = (y / x) * c;
    for (let i = 0; i < horizontalCoordinates.length; ++i) {
      const u = horizontalCoordinates[i];
      const v = verticalCoordinates[i];
      horizontalCoordinates[i] = u * c + v * s;
      verticalCoordinates[i] = v * c - u * s;
    }
  } else {
    const x1 = horizontalCoordinates[horizontalIndex];
    const y1 = verticalCoordinates[horizontalIndex];
    const x2 = horizontalCoordinates[tonnetzIndex];
    const y2 = verticalCoordinates[tonnetzIndex];

    const r1 = Math.hypot(x1, y1);
    const R2 = x2 * x2 + y2 * y2;
    const u2 = 0.5 * r1;
    // Solve: u2^2 + v2^2 = R2
    const v2 = -Math.sqrt(R2 - u2 * u2);

    // Solve:
    // [u_i, v_i] = A [x_i, y_i]
    // u1 = r1 = a00 x1 + a10 y1
    // v1 = 0  = a01 x1 + a11 y1
    // u2      = a00 x2 + a10 y2
    // v2      = a01 x2 + a11 y2

    const a00 = (r1 * y2 - u2 * y1) / (x1 * y2 - x2 * y1);
    const a01 = (-v2 * y1) / (x1 * y2 - x2 * y1);
    const a10 = (-r1 * x2 + u2 * x1) / (x1 * y2 - x2 * y1);
    const a11 = (v2 * x1) / (x1 * y2 - x2 * y1);

    for (let i = 0; i < horizontalCoordinates.length; ++i) {
      const u = horizontalCoordinates[i];
      const v = verticalCoordinates[i];
      horizontalCoordinates[i] = a00 * u + a10 * v;
      verticalCoordinates[i] = a01 * u + a11 * v;
    }
  }
}

function gridline(
  uX: number,
  uY: number,
  vX: number,
  vY: number,
  options: GridOptions
): Edge | undefined {
  if (!vX && !vY) {
    return undefined;
  }
  const {minX, maxX, minY, maxY} = options;
  const range = options.range ?? 100;
  let j, x, y;

  j = -range - 1;
  do {
    j++;
    x = uX + vX * j;
    y = uY + vY * j;
  } while (j <= range && (x < minX || x > maxX || y < minY || y > maxY));
  if (j > range) {
    return undefined;
  }
  j--;
  const x1 = uX + vX * j;
  const y1 = uY + vY * j;
  while (x >= minX && x <= maxX && y >= minY && y <= maxY) {
    j++;
    x = uX + vX * j;
    y = uY + vY * j;
  }
  const x2 = x;
  const y2 = y;
  return {x1, y1, x2, y2, type: 'gridline'};
}

/**
 * Span a grid representing an equal temperament with the given steps as vertices.
 * @param steps Equally tempered scale degrees to feature in the graph.
 * @param options Options for connecting scale degrees and calculating gridlines.
 * @returns Vertices and edges of the graph.
 */
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
    gridLines,
  } = options;
  const range = options.range ?? 100;
  const maxVertices = options.maxVertices ?? 1000;
  const maxEdges = options.maxEdges ?? 2000;

  steps = steps.map(s => mmod(s, modulus));

  const indices = new Map<number, number[]>();

  for (let i = 0; i < steps.length; ++i) {
    const idxs = indices.get(steps[i]) ?? [];
    idxs.push(i);
    indices.set(steps[i], idxs);
  }
  for (const idxs of indices.values()) {
    idxs.sort();
  }

  const vertices: MultiVertex[] = [];
  search: for (let i = -range; i <= range; ++i) {
    for (let j = -range; j <= range; ++j) {
      const x = delta1X * i + delta2X * j;
      const y = delta1Y * i + delta2Y * j;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        const step = mmod(delta1 * i + delta2 * j, modulus);
        if (indices.has(step)) {
          vertices.push({x, y, indices: indices.get(step)!});
          if (vertices.length >= maxVertices) {
            break search;
          }
          if (!delta1X && !delta1Y) {
            break search;
          }
          if (!delta2X && !delta2Y) {
            break search;
          }
        }
      }
    }
  }

  const edges: Edge[] = [];

  if (edgeVectors) {
    if (options.mergeEdges) {
      search: for (const [vx, vy] of edgeVectors) {
        const spent = new Set<number>();
        for (let i = 0; i < vertices.length; ++i) {
          if (spent.has(i)) {
            continue;
          }
          let x1 = vertices[i].x;
          let y1 = vertices[i].y;
          let x2 = vertices[i].x;
          let y2 = vertices[i].y;
          for (let j = i + 1; j < vertices.length; ++j) {
            if (vertices[j].x - x2 === vx && vertices[j].y - y2 === vy) {
              x2 = vertices[j].x;
              y2 = vertices[j].y;
              spent.add(j);
            }
            if (x1 - vertices[j].x === vx && y1 - vertices[j].y === vy) {
              x1 = vertices[j].x;
              y1 = vertices[j].y;
              spent.add(j);
            }
          }
          if (x1 !== x2 || y1 !== y2) {
            edges.push({x1, y1, x2, y2, type: 'custom'});
          }
          if (edges.length >= maxEdges) {
            break search;
          }
        }
      }
    } else {
      let evs = [...edgeVectors];
      evs = evs.concat(evs.map(ev => ev.map(e => -e)));
      search: for (let i = 0; i < vertices.length; ++i) {
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
              if (edges.length >= maxEdges) {
                break search;
              }
            }
          }
        }
      }
    }
  }

  if (gridLines) {
    for (let i = -range; i <= range; ++i) {
      if (edges.length >= maxEdges) {
        break;
      }
      if (gridLines.delta1) {
        const edge = gridline(
          delta2X * i,
          delta2Y * i,
          delta1X,
          delta1Y,
          options
        );
        if (edge) {
          edges.push(edge);
        }
      }
      if (!delta2X && !delta2Y) {
        break;
      }
    }
    for (let i = -range; i <= range; ++i) {
      if (edges.length >= maxEdges) {
        break;
      }
      let edge;
      const uX = delta1X * i;
      const uY = delta1Y * i;
      if (gridLines.delta2) {
        edge = gridline(uX, uY, delta2X, delta2Y, options);
        if (edge) {
          edges.push(edge);
        }
      }
      if (gridLines.diagonal1) {
        edge = gridline(uX, uY, delta1X - delta2X, delta1Y - delta2Y, options);
        if (edge) {
          edges.push(edge);
        }
      }
      if (gridLines.diagonal2) {
        edge = gridline(uX, uY, delta1X + delta2X, delta1Y + delta2Y, options);
        if (edge) {
          edges.push(edge);
        }
      }
      if (!delta1X && !delta1Y) {
        break;
      }
    }
  }

  return {vertices, edges};
}

/**
 * Compute the shorest edge corresponding to the given equally tempered difference.
 * @param step Difference between two equally tempered scale degrees.
 * @param options Options for grid geometry.
 * @returns Array of horizontal and vertical screen coordinates of the shortest edge found.
 */
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
  const maxVertices = options.maxVertices ?? 1000;

  step = mmod(step, modulus);

  const vertices: Vertex[] = [];
  search: for (let i = -range; i <= range; ++i) {
    for (let j = -range; j <= range; ++j) {
      const x = delta1X * i + delta2X * j;
      const y = delta1Y * i + delta2Y * j;
      // Grow search area to go from corner to corner.
      if (x >= 2 * minX && x <= 2 * maxX && y >= 2 * minY && y <= 2 * maxY) {
        const s = mmod(delta1 * i + delta2 * j, modulus);
        if (s === step) {
          vertices.push({x, y});
          if (vertices.length >= maxVertices) {
            break search;
          }
          if (!delta1X && !delta1Y) {
            break search;
          }
          if (!delta2X && !delta2Y) {
            break search;
          }
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
