# ji-lattice
Algorithms for projecting just intonation and equally tempered scales onto the screen.

## Installation ##
```bash
npm i ji-lattice
```

## Documentation
Below are some examples. The main API documentation is hosted on the project [Github pages](https://xenharmonic-devs.github.io/ji-lattice).

To generate documentation locally run:
```bash
npm run doc
```

## Just intonation
```typescript
import {toMonzo} from 'xen-dev-utils';
import {spanLattice, kraigGrady9} from 'ji-lattice';

// The musical scale we wish to plot:
const hirajoshi = ['9/8', '6/5', '3/2', '8/5', '2/1'];

// Convert to the format understood by the library.
const monzos = hirajoshi.map(toMonzo);

// Use Kraig Grady's coordinate system https://anaphoria.com/wilsontreasure.html
const options = kraigGrady9();

// Obtain vertices and edges of the lattice suitable for vector graphics.
const {vertices, edges} = spanLattice(monzos, options);

/*
 * SVG coordinates: x grows towards the right, y grows towards the bottom.
 *

  const vertices = [
    {
      index: 0,
      x: 80,
      y: 0,
    }, {
      index: 1,
      x: 40,
      y: 40,
    }, {
      index: 2,
      x: 40,
      y: 0,
    }, {
      index: 3,
      x: 0,
      y: 40,
    }, {
      index: 4,
      x: 0,
      y: 0,
    }
  ];
  const edges = [
    {
      x1: 80,
      y1: 0,
      x2: 40,
      y2: 0,
      type: "primary",
    }, {
      x1: 40,
      y1: 40,
      x2: 40,
      y2: 0,
      type: "primary",
    }, {
      x1: 40,
      y1: 40,
      x2: 0,
      y2: 40,
      type: "primary",
    }, {
      x1: 40,
      y1: 0,
      x2: 0,
      y2: 0,
      type: "primary",
    }, {
      x1: 0,
      y1: 40,
      x2: 0,
      y2: 0,
      type: "primary",
    }
  ];
*/
```

## Equal temperament
```typescript
import {spanGrid} from 'ji-lattice';

const numberOfNotesPerOctave = 12;
const pentatonicMajor = [0, 2, 4, 7, 9];
const perfectFifth = 7;
const majorThird = 4;

const options = {
  modulus: numberOfNotesPerOctave,
  delta1: perfectFifth,
  delta1X: 1,
  delta1Y: 0,
  delta2: majorThird,
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
};

const {vertices, edges} = spanGrid(pentatonicMajor, options);

/*
const vertices = [
  {x: -2, y: 2, indices: [1]},
  {x: -2, y: -1, indices: [1]},
  {x: -1, y: 2, indices: [4]},
  {x: -1, y: -1, indices: [4]},
  {x: 0, y: 2, indices: [2]},
  {x: 0, y: 0, indices: [0]},
  {x: 0, y: -1, indices: [2]},
  {x: 1, y: 0, indices: [3]},
  {x: 2, y: 0, indices: [1]},
];

const edges = [
  {x1: -2, y1: 2, x2: -1, y2: 2, type: 'custom'},
  {x1: -2, y1: -1, x2: -1, y2: -1, type: 'custom'},
  {x1: -1, y1: 2, x2: 0, y2: 2, type: 'custom'},
  {x1: -1, y1: -1, x2: 0, y2: -1, type: 'custom'},
  {x1: 0, y1: 0, x2: 0, y2: -1, type: 'custom'},
  {x1: 0, y1: 0, x2: 1, y2: 0, type: 'custom'},
  {x1: 1, y1: 0, x2: 2, y2: 0, type: 'custom'},
];
*/
```
