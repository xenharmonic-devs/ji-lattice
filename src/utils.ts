import {monzosEqual} from 'xen-dev-utils';
import {type EdgeType} from './types';

// Small radius of tolerance to accept near unit distances between fractional coordinates as edges.
const EPSILON = 1e-6;

type Connection = {
  index1: number;
  index2: number;
  type: EdgeType;
};

/**
 * Calculate the taxicab norm / Manhattan distance between two integral vectors.
 * Restrict movement to whole steps for fractional vectors.
 * Has a tolerance for small errors.
 * @param a Prime exponents of a musical interval.
 * @param b Prime exponents of a musical interval.
 * @returns Integer representing the number of "moves" required to reach `b`from `a`. `NaN` if no legal moves exist.
 */
function taxicabDistance(
  a: number[],
  b: number[],
  tolerance = EPSILON
): number {
  if (a.length > b.length) {
    return taxicabDistance(b, a);
  }
  let result = 0;
  for (let i = 0; i < a.length; ++i) {
    const distance = Math.abs(a[i] - b[i]);
    const move = Math.round(distance);
    if (Math.abs(distance - move) <= tolerance) {
      result += move;
    } else {
      return NaN;
    }
  }
  for (let i = a.length; i < b.length; ++i) {
    const distance = Math.abs(b[i]);
    const move = Math.round(distance);
    if (Math.abs(distance - move) <= tolerance) {
      result += move;
    } else {
      return NaN;
    }
  }
  return result;
}

/**
 * Connect monzos that are pre-processed to ignore equaves.
 * @param monzos Array of arrays of prime exponents of musical intervals (usually without prime 2).
 * @param maxDistance Maximum taxicab distance to connect.
 * @returns An array of connections and an array of auxillary nodes.
 */
export function connect(monzos: number[][], maxDistance: number) {
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
          gapSearch: for (let k = 0; k < len; ++k) {
            const gap = (monzos[i][k] ?? 0) - (monzos[j][k] ?? 0);
            if (Math.abs(gap) === 2) {
              const monzo = [...monzos[j]];
              for (let l = monzos[j].length; l < monzos[i].length; ++l) {
                monzo[l] = 0;
              }
              monzo[k] += gap / 2;
              for (const existing of monzos.concat(connectingMonzos)) {
                if (monzosEqual(monzo, existing)) {
                  break gapSearch;
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
                break gapSearch;
              }
            }
          }
        }
      }
    }
  }
  if (maxDistance >= 1) {
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
  }
  return {
    connections,
    connectingMonzos,
  };
}

export function project(monzos: number[][], coordss: number[][]) {
  const projected = monzos.map(m => [...m]);
  const limit = Math.max(...coordss.map(coords => coords.length));
  for (const m of projected) {
    m.length = Math.min(limit, m.length);
  }
  for (let i = limit - 1; i >= 0; --i) {
    if (coordss.map(coords => coords[i]).some(Boolean)) {
      continue;
    }
    for (const m of projected) {
      m.splice(i, 1);
    }
  }
  return projected;
}

export function unproject(monzos: number[][], coordss: number[][]) {
  if (!monzos.length) {
    return [];
  }
  const unprojected = monzos.map(m => [...m]);
  const limit = Math.max(...coordss.map(coords => coords.length));
  for (let i = 0; i < limit; ++i) {
    if (coordss.map(coords => coords[i]).some(Boolean)) {
      continue;
    }
    for (const u of unprojected) {
      u.splice(i, 0, 0);
    }
  }
  return unprojected;
}
