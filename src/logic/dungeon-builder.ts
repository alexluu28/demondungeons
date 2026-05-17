export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DungeonBuilder {
  /**
   * Generates a 2D array grid of 0s (walls) and 1s (floors)
   */
  public static generateGrid(
    gridWidth: number,
    gridHeight: number,
    maxRooms: number,
  ): number[][] {
    // 1. Initialize the map completely filled with solid Walls (0)
    const grid: number[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(0));

    const rooms: Room[] = [];

    // Room constraint dimensions
    const minSize = 4;
    const maxSize = 8;

    for (let i = 0; i < maxRooms; i++) {
      // Randomize size and position boundaries safely away from map borders
      const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const x = Math.floor(Math.random() * (gridWidth - w - 2)) + 1;
      const y = Math.floor(Math.random() * (gridHeight - h - 2)) + 1;

      const newRoom: Room = { x, y, width: w, height: h };

      // 2. Check for overlaps against already established rooms
      const overlaps = rooms.some((room) => this.roomsOverlap(room, newRoom));

      if (!overlaps) {
        // Carve room floor space into grid
        this.carveRoom(grid, newRoom);

        // Connect this room to the previous room with corridors
        if (rooms.length > 0) {
          const prevRoom = rooms[rooms.length - 1];
          this.carveCorridors(grid, prevRoom, newRoom);
        }

        rooms.push(newRoom);
      }
    }

    return grid;
  }

  private static roomsOverlap(r1: Room, r2: Room): boolean {
    // Include a padding buffer of 1 tile so rooms don't fuse walls awkwardly
    return (
      r1.x < r2.x + r2.width + 1 &&
      r1.x + r1.width + 1 > r2.x &&
      r1.y < r2.y + r2.height + 1 &&
      r1.y + r1.height + 1 > r2.y
    );
  }

  private static carveRoom(grid: number[][], room: Room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        grid[y][x] = 1; // Mark as floor space
      }
    }
  }

  private static carveCorridors(grid: number[][], r1: Room, r2: Room) {
    // Grab the center coordinate coordinates of both rooms
    let cx1 = Math.floor(r1.x + r1.width / 2);
    let cy1 = Math.floor(r1.y + r1.height / 2);
    const cx2 = Math.floor(r2.x + r2.width / 2);
    const cy2 = Math.floor(r2.y + r2.height / 2);

    // Carve horizontally first, then vertically
    while (cx1 !== cx2) {
      grid[cy1][cx1] = 1;
      cx1 += cx1 < cx2 ? 1 : -1;
    }
    while (cy1 !== cy2) {
      grid[cy1][cx1] = 1;
      cy1 += cy1 < cy2 ? 1 : -1;
    }
  }
}
