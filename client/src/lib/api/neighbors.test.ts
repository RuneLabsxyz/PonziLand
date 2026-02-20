import { describe, expect, it } from 'vitest';
import { maxNeighbors, Neighbors } from './neighbors';

// Helper matching contracts/src/helpers/coord.cairo::position_to_index
function positionToIndex(row: number, col: number): number {
  return row * 256 + col;
}

describe('maxNeighbors', () => {
  it('should return 3 for corner positions', () => {
    // Top-left corner (0, 0)
    expect(maxNeighbors(positionToIndex(0, 0))).toBe(3);
    // Top-right corner (0, 255)
    expect(maxNeighbors(positionToIndex(0, 255))).toBe(3);
    // Bottom-left corner (255, 0)
    expect(maxNeighbors(positionToIndex(255, 0))).toBe(3);
    // Bottom-right corner (255, 255)
    expect(maxNeighbors(positionToIndex(255, 255))).toBe(3);
  });

  it('should return 5 for edge positions (not corners)', () => {
    // Top edge
    expect(maxNeighbors(positionToIndex(0, 1))).toBe(5);
    expect(maxNeighbors(positionToIndex(0, 127))).toBe(5);
    expect(maxNeighbors(positionToIndex(0, 254))).toBe(5);

    // Bottom edge
    expect(maxNeighbors(positionToIndex(255, 1))).toBe(5);
    expect(maxNeighbors(positionToIndex(255, 127))).toBe(5);
    expect(maxNeighbors(positionToIndex(255, 254))).toBe(5);

    // Left edge
    expect(maxNeighbors(positionToIndex(1, 0))).toBe(5);
    expect(maxNeighbors(positionToIndex(127, 0))).toBe(5);
    expect(maxNeighbors(positionToIndex(254, 0))).toBe(5);

    // Right edge
    expect(maxNeighbors(positionToIndex(1, 255))).toBe(5);
    expect(maxNeighbors(positionToIndex(127, 255))).toBe(5);
    expect(maxNeighbors(positionToIndex(254, 255))).toBe(5);
  });

  it('should return 8 for interior positions', () => {
    expect(maxNeighbors(positionToIndex(1, 1))).toBe(8);
    expect(maxNeighbors(positionToIndex(127, 127))).toBe(8);
    expect(maxNeighbors(positionToIndex(254, 254))).toBe(8);
    expect(maxNeighbors(positionToIndex(5, 5))).toBe(8);
    expect(maxNeighbors(positionToIndex(100, 200))).toBe(8);
  });

  it('should match Cairo contract test cases exactly', () => {
    // From contracts/src/helpers/coord.cairo::test_max_neighbors
    expect(maxNeighbors(positionToIndex(0, 0))).toBe(3);
    expect(maxNeighbors(positionToIndex(0, 1))).toBe(5);
    expect(maxNeighbors(positionToIndex(1, 0))).toBe(5);
    expect(maxNeighbors(positionToIndex(0, 254))).toBe(5);
    expect(maxNeighbors(positionToIndex(254, 0))).toBe(5);
    expect(maxNeighbors(positionToIndex(1, 1))).toBe(8);
    expect(maxNeighbors(positionToIndex(127, 127))).toBe(8);
  });
});

describe('Neighbors.getLocations', () => {
  it('should return 8 locations for interior positions', () => {
    const loc = BigInt(positionToIndex(5, 5));
    const result = Neighbors.getLocations(loc);
    expect(result.array).toHaveLength(8);
  });

  it('should return 5 locations for edge positions', () => {
    // Top edge (row=0, col=5)
    const topEdge = BigInt(positionToIndex(0, 5));
    expect(Neighbors.getLocations(topEdge).array).toHaveLength(5);

    // Left edge (row=5, col=0)
    const leftEdge = BigInt(positionToIndex(5, 0));
    expect(Neighbors.getLocations(leftEdge).array).toHaveLength(5);

    // Bottom edge (row=255, col=5)
    const bottomEdge = BigInt(positionToIndex(255, 5));
    expect(Neighbors.getLocations(bottomEdge).array).toHaveLength(5);

    // Right edge (row=5, col=255)
    const rightEdge = BigInt(positionToIndex(5, 255));
    expect(Neighbors.getLocations(rightEdge).array).toHaveLength(5);
  });

  it('should return 3 locations for corner positions', () => {
    // Top-left corner (0,0)
    const topLeft = BigInt(positionToIndex(0, 0));
    expect(Neighbors.getLocations(topLeft).array).toHaveLength(3);

    // Top-right corner (0,255)
    const topRight = BigInt(positionToIndex(0, 255));
    expect(Neighbors.getLocations(topRight).array).toHaveLength(3);

    // Bottom-left corner (255,0)
    const bottomLeft = BigInt(positionToIndex(255, 0));
    expect(Neighbors.getLocations(bottomLeft).array).toHaveLength(3);

    // Bottom-right corner (255,255)
    const bottomRight = BigInt(positionToIndex(255, 255));
    expect(Neighbors.getLocations(bottomRight).array).toHaveLength(3);
  });

  it('should have array length equal to maxNeighbors for any position', () => {
    const positions = [
      [0, 0],
      [0, 5],
      [5, 0],
      [0, 255],
      [255, 0],
      [255, 255],
      [1, 1],
      [127, 127],
      [100, 200],
    ];

    for (const [row, col] of positions) {
      const index = positionToIndex(row, col);
      const locations = Neighbors.getLocations(BigInt(index));
      expect(locations.array).toHaveLength(maxNeighbors(index));
    }
  });

  it('should only contain valid in-bounds locations in array', () => {
    // Top-left corner (0,0): only right, down, downRight are valid
    const topLeft = BigInt(positionToIndex(0, 0));
    const result = Neighbors.getLocations(topLeft);

    const expectedLocations = [
      BigInt(positionToIndex(0, 1)), // right
      BigInt(positionToIndex(1, 0)), // down
      BigInt(positionToIndex(1, 1)), // downRight
    ];

    expect(result.array).toHaveLength(3);
    for (const expected of expectedLocations) {
      expect(result.array).toContain(expected);
    }
  });

  it('should contain all 8 neighbors for interior position', () => {
    const loc = BigInt(positionToIndex(5, 5));
    const result = Neighbors.getLocations(loc);

    const expectedLocations = [
      BigInt(positionToIndex(4, 4)), // upLeft
      BigInt(positionToIndex(4, 5)), // up
      BigInt(positionToIndex(4, 6)), // upRight
      BigInt(positionToIndex(5, 4)), // left
      BigInt(positionToIndex(5, 6)), // right
      BigInt(positionToIndex(6, 4)), // downLeft
      BigInt(positionToIndex(6, 5)), // down
      BigInt(positionToIndex(6, 6)), // downRight
    ];

    expect(result.array).toHaveLength(8);
    for (const expected of expectedLocations) {
      expect(result.array).toContain(expected);
    }
  });

  it('should not contain negative or out-of-bounds locations', () => {
    // Test corner position — should have no negative values
    const topLeft = BigInt(positionToIndex(0, 0));
    const result = Neighbors.getLocations(topLeft);

    for (const loc of result.array) {
      expect(loc).toBeGreaterThanOrEqual(0n);
      // Max valid location: 255 * 256 + 255 = 65535
      expect(loc).toBeLessThanOrEqual(BigInt(positionToIndex(255, 255)));
    }
  });

  it('should still provide named direction properties even for edge positions', () => {
    // Named properties are always present (used for positional UI grid)
    const topLeft = BigInt(positionToIndex(0, 0));
    const result = Neighbors.getLocations(topLeft);

    // These are out of bounds but still available for UI rendering
    expect(result.up).toBeDefined();
    expect(result.left).toBeDefined();
    expect(result.upLeft).toBeDefined();
    // These are valid
    expect(result.right).toBe(BigInt(positionToIndex(0, 1)));
    expect(result.down).toBe(BigInt(positionToIndex(1, 0)));
    expect(result.downRight).toBe(BigInt(positionToIndex(1, 1)));
  });

  it('should handle bottom-right corner correctly', () => {
    const bottomRight = BigInt(positionToIndex(255, 255));
    const result = Neighbors.getLocations(bottomRight);

    const expectedLocations = [
      BigInt(positionToIndex(254, 254)), // upLeft
      BigInt(positionToIndex(254, 255)), // up
      BigInt(positionToIndex(255, 254)), // left
    ];

    expect(result.array).toHaveLength(3);
    for (const expected of expectedLocations) {
      expect(result.array).toContain(expected);
    }
  });
});
