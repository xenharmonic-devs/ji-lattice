# Change log

## 0.0.3
 * Bug fix: Connect nodes that are one unit apart within epsilon tolerance. [#12](https://github.com/xenharmonic-devs/ji-lattice/issues/12)
 * Bug fix: Don't create "diagonal" edges even if the nodes are one unit apart. [#13](https://github.com/xenharmonic-devs/ji-lattice/issues/13)

## 0.0.2
 * Feature: Add the option to merge short edges into long ones to save drawing resources [#8](https://github.com/xenharmonic-devs/ji-lattice/issues/8)
 * Feature: Implement a helper to align prime directions horizontally

## 0.0.1
 * Feature: Collect overlapping steps in an equally tempered grid into a list of indices [#6](https://github.com/xenharmonic-devs/ji-lattice/issues/6)
 * Feature: Connect vertices separated by Manhattan distance of 2 through an auxiliary vertex
 * Bug fix: Support custom edges with auxiliary vertices [#7](https://github.com/xenharmonic-devs/ji-lattice/issues/7)
