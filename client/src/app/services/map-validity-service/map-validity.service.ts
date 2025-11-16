import { Injectable } from '@angular/core';
import {
    ERROR_MESSAGES,
    HALF_MAP_LENGTH,
    ITEM_TYPES,
    LARGE_MAP_SIZE,
    MapSize,
    MEDIUM_MAP_SIZE,
    SMALL_MAP_SIZE,
    TILE_TYPES,
} from '@app/constants/constants';
import { Coordinate, DFSParams, Game, StartPointParams } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { Tile } from '@common/interfaces';
@Injectable({
    providedIn: 'root',
})
export class MapValidityService {
    editorGame: Game;
    itemQuantity: number;
    private readonly directions = [
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
    ];

    constructor(
        private readonly mapService: BoardService,
        private readonly itemService: ItemSelectorService,
        private readonly notificationService: NotificationService,
    ) {
        this.itemQuantity = this.itemService.nSpawn;
    }

    notGroundType = (type: string): boolean => {
        return type === TILE_TYPES.door || type === TILE_TYPES.wall;
    };

    converterSize(): number {
        switch (this.editorGame.size) {
            case MapSize.Large:
                return LARGE_MAP_SIZE;
            case MapSize.Medium:
                return MEDIUM_MAP_SIZE;
            case MapSize.Small:
                return SMALL_MAP_SIZE;
            default:
                return 0;
        }
    }

    checkMap(validateGame: Game): boolean {
        this.editorGame = structuredClone(validateGame);
        this.editorGame.map = this.mapService.tiles;
        return this.isMapValid();
    }

    isMapValid(): boolean {
        const validations = [
            this.checkDoorValidity(),
            this.checkWallPlacement(),
            this.checkMapUsage(),
            this.checkSpawnUsage(),
            this.checkNumberOfItems(),
            this.checkFlagInMode(),
        ];
        if (this.notificationService.errorMessages.length > 0) {
            this.notificationService.showModal = true;
        }
        return validations.every((validation) => validation);
    }

    checkFlagInMode(): boolean {
        if (this.editorGame.gameMode === 'CTF') {
            const hasFlag = this.editorGame.map.some((tile) => tile.item?.type === ITEM_TYPES.flag);

            if (!hasFlag) {
                if (!this.findErrorMessage(ERROR_MESSAGES.flagRequired)) {
                    this.notificationService.errorMessages.push(ERROR_MESSAGES.flagRequired);
                }
                return false;
            }
        }
        return true;
    }

    checkDoorValidity() {
        for (let i = 0; i < this.editorGame.map.length; i++) {
            if (this.editorGame.map[i].type === TILE_TYPES.door) {
                if (!this.isValidDoorPlacement(i)) {
                    return false;
                }
            }
        }
        return true;
    }

    findErrorMessage(errorMessage: string): boolean {
        return this.notificationService.errorMessages.find((message) => message === errorMessage) !== undefined;
    }

    isValidDoorPlacement(index: number): boolean {
        try {
            if (this.isVerticalDoor(index)) {
                return this.checkVerticalDoor(index);
            } else if (this.isHorizontalDoor(index)) {
                return this.checkHorizontalDoor(index);
            } else {
                if (!this.findErrorMessage(ERROR_MESSAGES.doorPlacement)) {
                    this.notificationService.errorMessages.push(ERROR_MESSAGES.doorPlacement);
                }
                return false;
            }
        } catch {
            if (!this.findErrorMessage(ERROR_MESSAGES.doorPlacement)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.doorPlacement);
            }
            return false;
        }
    }

    isVerticalDoor(index: number): boolean {
        return (
            this.editorGame.map[index - this.converterSize()].type === TILE_TYPES.wall &&
            this.editorGame.map[index + this.converterSize()].type === TILE_TYPES.wall
        );
    }

    isHorizontalDoor(index: number): boolean {
        return this.editorGame.map[index - 1].type === TILE_TYPES.wall && this.editorGame.map[index + 1].type === TILE_TYPES.wall;
    }

    checkVerticalDoor(index: number): boolean {
        const map = this.editorGame.map;
        const isTopNotGroundTile = this.notGroundType(map[index - 1].type);
        const isRightGroundTile = this.notGroundType(map[index + 1].type);

        if (isTopNotGroundTile || isRightGroundTile) {
            if (!this.findErrorMessage(ERROR_MESSAGES.terrainTiles)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.terrainTiles);
            }
            return false;
        }
        return true;
    }

    checkHorizontalDoor(index: number): boolean {
        const map = this.editorGame.map;
        const size = this.converterSize();
        const isTopNotGroundTile = this.notGroundType(map[index - size].type);
        const isBottomNotGroundTile = this.notGroundType(map[index + size].type);

        if (isTopNotGroundTile || isBottomNotGroundTile) {
            if (!this.findErrorMessage(ERROR_MESSAGES.terrainTiles)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.terrainTiles);
            }
            return false;
        }
        return true;
    }

    checkWallPlacement() {
        const size = this.converterSize();
        const map = this.editorGame.map;
        const grid = this.createGrid(size, map);
        const start = this.findStartPoint({ grid, size });

        if (!start) {
            return false;
        }

        const visited = this.performDFS({ grid, size, start });

        if (this.areAllTilesVisited(grid, size, visited)) {
            return true;
        } else {
            if (!this.findErrorMessage(ERROR_MESSAGES.wallBlocking)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.wallBlocking);
            }
            return false;
        }
    }

    /**
     * Creates a 2D grid representation of the map for pathfinding.
     * @param {number} size - The size of the grid.
     * @param {Tile[]} map - The array of tiles representing the map.
     * @returns {string[][]} - A 2D array representing the grid where '#' is wall and '.' is passable.
     */
    createGrid(size: number, map: Tile[]): string[][] {
        const grid: string[][] = Array.from({ length: size }, () => Array(size).fill('#'));
        for (const tile of map) {
            const { x, y } = tile.position;
            const type = tile.type;
            grid[y][x] = type === TILE_TYPES.wall ? '#' : '.';
        }
        return grid;
    }

    /**
     * Finds the first passable tile in the grid to start pathfinding.
     * @param {string[][]} grid - The 2D grid representation of the map.
     * @param {number} size - The size of the grid.
     * @returns {{ x: number; y: number } | null} - Coordinates of the start point or null if none found.
     */
    findStartPoint({ grid, size }: StartPointParams): Coordinate | null {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] === '.') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    /**
     * Performs a Depth-First Search to find all accessible tiles.
     * @param {string[][]} grid - The 2D grid representation of the map.
     * @param {number} size - The size of the grid.
     * @param {{ x: number; y: number }} start - The starting coordinates.
     * @returns {Set<string>} - Set of visited coordinates in "x,y" format.
     */
    performDFS({ grid, size, start }: DFSParams): Set<string> {
        const queue = [start];
        const visited = new Set<string>();
        visited.add(this.key(start.x, start.y));

        while (queue.length > 0) {
            const current = queue.shift();
            if (current) {
                this.processNode(current, grid, size, queue, visited);
            }
        }
        return visited;
    }

    /**
     * Checks if all passable tiles in the grid have been visited.
     * @param {string[][]} grid - The 2D grid representation of the map.
     * @param {number} size - The size of the grid.
     * @param {Set<string>} visited - Set of visited coordinates.
     * @returns {boolean} - True if all passable tiles were visited, false otherwise.
     */
    areAllTilesVisited(grid: string[][], size: number, visited: Set<string>): boolean {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] === '.' && !visited.has(`${x},${y}`)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Checks if terrain tiles (walls and doors) don't exceed half the map size.
     * @returns {boolean} - True if terrain usage is valid, false if it exceeds the limit.
     */
    checkMapUsage(): boolean {
        const terrainTiles = this.editorGame.map.filter((element) => [TILE_TYPES.wall, TILE_TYPES.door].includes(element.type)).length;

        const isValidTerrainRatio = terrainTiles <= this.editorGame.map.length / HALF_MAP_LENGTH;

        if (!isValidTerrainRatio) {
            if (!this.findErrorMessage(ERROR_MESSAGES.mapTerrain)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.mapTerrain);
            }
            return false;
        }
        return true;
    }

    /**
     * Verifies if all required spawn points have been placed.
     * @returns {boolean} - True if all spawn points are placed, false otherwise.
     */
    checkSpawnUsage(): boolean {
        if (this.itemService.nSpawn === 0) {
            return true;
        } else {
            if (!this.findErrorMessage(ERROR_MESSAGES.spawnPlacement)) {
                this.notificationService.errorMessages.push(ERROR_MESSAGES.spawnPlacement);
            }
            return false;
        }
    }

    private key(x: number, y: number): string {
        return `${x},${y}`;
    }

    private isValidMove(x: number, y: number, grid: string[][], size: number, visited: Set<string>): boolean {
        return x >= 0 && y >= 0 && x < size && y < size && grid[y][x] === '.' && !visited.has(this.key(x, y));
    }

    private processNode(
        current: { x: number; y: number },
        grid: string[][],
        size: number,
        queue: { x: number; y: number }[],
        visited: Set<string>,
    ): void {
        const { x, y } = current;

        for (const { dx, dy } of this.directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (this.isValidMove(nx, ny, grid, size, visited)) {
                visited.add(this.key(nx, ny));
                queue.push({ x: nx, y: ny });
            }
        }
    }

    private checkNumberOfItems(): boolean {
        if (this.itemService.nItems === this.itemService.maxItems) {
            return true;
        }
        this.notificationService.errorMessages.push(ERROR_MESSAGES.itemPlacement);
        return false;
    }
}
