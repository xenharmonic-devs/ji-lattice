/**
 * The type of an edge connecting two vertices or a gridline.
 *
 * `"primary"`: Prime-wise connection between two vertices.
 *
 * `"custom"`: User-defined connection between two vertices.
 *
 * `"auxiliary"`: Connection where at least one vertex is auxiliary.
 *
 * `"gridline"`: Line extending across the screen.
 */
export type EdgeType = 'primary' | 'custom' | 'auxiliary' | 'gridline';
