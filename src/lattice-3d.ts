import {LOG_PRIMES, dot, monzosEqual, sub} from 'xen-dev-utils';
import {EdgeType} from './types';
import {connect, project, unproject} from './utils';

const EPSILON = 1e-6;

/**
 * A vertex of a 3D graph.
 */
export type Vertex3D = {
  /** Horizontal coordinate. */
  x: number;
  /** Vertical coordinate. */
  y: number;
  /** Depthwise coordinate. */
  z: number;
  /** Index to input array. */
  index?: number;
};

/**
 * An edge connecting two vertices of a 3D graph.
 */
export type Edge3D = {
  /** First horizontal coordinate. */
  x1: number;
  /** First vertical coordinate. */
  y1: number;
  /** First depthwise coordinate. */
  z1: number;
  /** Second horizontal coordinate. */
  x2: number;
  /** Second vertical coordinate. */
  y2: number;
  /** Second depthwise coordinate. */
  z2: number;
  /** Type of connection. */
  type: EdgeType;
};

/**
 * Options for {@link spanLattice3D}.
 */
export type LatticeOptions3D = {
  /** Mapping for prime x-coordinates. */
  horizontalCoordinates: number[];
  /** Mapping for prime y-coordinates. */
  verticalCoordinates: number[];
  /** Mapping for prime z-coordinates. */
  depthwiseCoordinates: number[];
  /** Maximum prime-wise distance for connecting two inputs. */
  maxDistance?: number;
  /** Prime-count vectors of connections in addition the the primes. */
  edgeMonzos?: number[][];
  /** Flag to merge short edges into a long ones wherever possible. */
  mergeEdges?: boolean;
};

// Coordinates are based on SVG so positive y-direction points down.
// Based on Kraig Grady's coordinate system https://anaphoria.com/wilsontreasure.html
// Coordinates for prime 2 and third dimension by Lumi Pakkanen.
// X-coordinates for every prime up to 23.
const WGP_X = [23, 40, 0, 0, -14, -8, -5, 0, 20];
// Y-coordinates for every prime up to 23.
const WGP_Y = [-45, 0, -40, 0, -18, -4, -32, -25, -3];
// Z-coordinates for every prime up to 23.
const WGP_Z = [19, 0, 0, 40, 13, 2, 5, 9, 15];

/**
 * Combine edges that share an endpoint and slope into longer ones.
 * @param edges Large number of short edges to merge.
 * @returns Smaller number of long edges.
 */
export function mergeEdges3D(edges: Edge3D[]) {
  // Choose a canonical orientation.
  const oriented: Edge3D[] = [];
  for (const edge of edges) {
    if (
      edge.x2 < edge.x1 ||
      (edge.x2 === edge.x1 && edge.y2 < edge.y1) ||
      (edge.y2 === edge.y1 && edge.z2 < edge.z1)
    ) {
      oriented.push({
        x1: edge.x2,
        y1: edge.y2,
        z1: edge.z2,
        x2: edge.x1,
        y2: edge.y1,
        z2: edge.z1,
        type: edge.type,
      });
    } else {
      oriented.push(edge);
    }
  }
  oriented.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1 || a.z1 - b.z1);
  const result: Edge3D[] = [];
  const spent = new Set<number>();
  for (let i = 0; i < oriented.length; ++i) {
    if (spent.has(i)) {
      continue;
    }
    // eslint-disable-next-line prefer-const
    let {x1, y1, x2, y2, z1, z2, type} = oriented[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    for (let j = i + 1; j < oriented.length; ++j) {
      const e = oriented[j];
      if (e.x1 === x2 && e.y1 === y2 && e.z1 === e.z2 && e.type === type) {
        const dex = e.x2 - e.x1;
        const dey = e.y2 - e.y1;
        const dez = e.z2 - e.z1;
        if (dex * dy === dx * dey && dex * dz === dz * dez) {
          x2 = e.x2;
          y2 = e.y2;
          z2 = e.z2;
          spent.add(j);
        }
      }
    }
    result.push({x1, x2, y1, y2, z1, z2, type});
  }
  return result;
}

/**
 * Compute vertices and edges for a 2D graph representing the lattice of a musical scale in just intonation.
 * @param monzos Prime exponents of the musical intervals in the scale.
 * @param options Options for connecting vertices in the graph.
 * @returns Vertices and edges of the graph.
 */
export function spanLattice3D(monzos: number[][], options: LatticeOptions3D) {
  const {horizontalCoordinates, verticalCoordinates, depthwiseCoordinates} =
    options;
  const maxDistance = options.maxDistance ?? 1;

  const coordss = [
    verticalCoordinates,
    horizontalCoordinates,
    depthwiseCoordinates,
  ];
  let projected = project(monzos, coordss);

  const {connections, connectingMonzos} = connect(projected, maxDistance);

  const unprojected = unproject(connectingMonzos, coordss);

  const vertices: Vertex3D[] = [];
  let edges: Edge3D[] = [];

  for (let index = 0; index < monzos.length; ++index) {
    vertices.push({
      index,
      x: dot(monzos[index], horizontalCoordinates),
      y: dot(monzos[index], verticalCoordinates),
      z: dot(monzos[index], depthwiseCoordinates),
    });
  }

  for (const monzo of unprojected) {
    vertices.push({
      index: undefined,
      x: dot(monzo, horizontalCoordinates),
      y: dot(monzo, verticalCoordinates),
      z: dot(monzo, depthwiseCoordinates),
    });
  }

  for (const connection of connections) {
    const {index1, index2, type} = connection;
    edges.push({
      x1: vertices[index1].x,
      y1: vertices[index1].y,
      z1: vertices[index1].z,
      x2: vertices[index2].x,
      y2: vertices[index2].y,
      z2: vertices[index2].z,
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
              z1: vertices[i].z,
              x2: vertices[j].x,
              y2: vertices[j].y,
              z2: vertices[j].z,
              type:
                i < monzos.length && j < monzos.length ? 'custom' : 'auxiliary',
            });
          }
        }
      }
    }
  }

  if (options.mergeEdges) {
    edges = mergeEdges3D(edges);
  }

  return {
    vertices,
    edges,
  };
}

/**
 * Get Wilson-Grady-Pakkanen coordinates for the first 9 primes.
 * @param equaveIndex Index of the prime to use as the interval of equivalence.
 * @returns An array of horizontal coordinates for each prime and the same for vertical and depthwise coordinates.
 */
export function WGP9(equaveIndex = 0): LatticeOptions3D {
  const horizontalCoordinates = [...WGP_X];
  const verticalCoordinates = [...WGP_Y];
  const depthwiseCoordinates = [...WGP_Z];
  horizontalCoordinates[equaveIndex] = 0;
  verticalCoordinates[equaveIndex] = 0;
  depthwiseCoordinates[equaveIndex] = 0;
  return {
    horizontalCoordinates,
    verticalCoordinates,
    depthwiseCoordinates,
  };
}

/**
 * Compute coordinates based on sizes of primes that lie on the surface of a sphere offset on the x-axis.
 * @param equaveIndex Index of the prime to use as the interval of equivalence.
 * @param logs Logarithms of (formal) primes with the prime of equivalence first. Defaults to the first 24 actual primes.
 * @param searchResolution Search resolution for optimizing orthogonality of the resulting set.
 * @returns An array of horizontal coordinates for each prime and the same for vertical and depthwise coordinates.
 */
export function primeSphere(
  equaveIndex = 0,
  logs?: number[],
  searchResolution = 1024
) {
  logs ??= LOG_PRIMES.slice(0, 24);
  const dp = (2 * Math.PI) / searchResolution;
  const horizontalCoordinates: number[] = [];
  const verticalCoordinates: number[] = [];
  const depthwiseCoordinates: number[] = [];
  const dt = (2 * Math.PI) / logs[equaveIndex];
  for (const log of logs) {
    const theta = log * dt;
    const x = 1 - Math.cos(theta);
    const u = Math.sin(theta);
    let y = -u;
    let z = 0;
    if (horizontalCoordinates.length > 1) {
      // Find the most orthogonal rotation around the x-axis
      let bestError = Infinity;
      for (let j = 0; j < searchResolution; ++j) {
        const phi = dp * j;
        const yc = Math.cos(phi) * u;
        const zc = Math.sin(-phi) * u;
        let error = 0;
        for (let i = 0; i < horizontalCoordinates.length; ++i) {
          error +=
            (x * horizontalCoordinates[i] +
              yc * verticalCoordinates[i] +
              zc * depthwiseCoordinates[i]) **
            2;
        }
        if (error + EPSILON < bestError) {
          bestError = error;
          y = yc;
          z = zc;
        }
      }
    }
    horizontalCoordinates.push(x);
    verticalCoordinates.push(y);
    depthwiseCoordinates.push(z);
  }
  return {
    horizontalCoordinates,
    verticalCoordinates,
    depthwiseCoordinates,
  };
}
