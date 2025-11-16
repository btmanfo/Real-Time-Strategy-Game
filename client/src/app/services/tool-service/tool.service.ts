import { Injectable } from '@angular/core';
import { tiles } from '@app/constants/constants';
import { Tile } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class TileService {
    readonly tiles = tiles;

    private selectedTileSubject: Tile | null = null;

    /**
     * Retrieves the list of available tiles.
     * @returns {Tile[]} The array of tile objects.
     */
    getTiles() {
        return this.tiles;
    }

    /**
     * Selects a tile if its type is valid.
     * @param {Tile} tile - The tile to be selected.
     */
    selectTile(tile: Tile): void {
        if (this.hasValidType(tile.type)) this.selectedTileSubject = tile;
    }

    deselectTile(): void {
        this.selectedTileSubject = null;
    }

    /**
     * Retrieves the currently selected tile.
     * @returns {Tile | null} The selected tile, or null if none is selected.
     */
    getSelectedTile(): Tile | null {
        return this.selectedTileSubject;
    }

    /**
     * Creates a new tile of a given type.
     * @param {string} tileType - The type of tile to create.
     * @returns {Tile} The newly created tile object.
     * @throws Will throw an error if the tile type is any.
     */
    createTile(tileType: string): Tile {
        const tileConfig = this.tiles.find((tile) => tile.type === tileType);
        if (!tileConfig) {
            throw new Error('any tile type is invalid');
        }

        return {
            type: tileType,
            position: { x: 0, y: 0 },
            traversable: tileConfig.traversable,
            item: null,
            player: null,
            image: tileConfig.image,
        } as Tile;
    }

    /**
     * Checks if a given tile type is valid.
     * @param {string} type - The type of tile to validate.
     * @returns {boolean} True if the tile type is valid, false otherwise.
     */
    private hasValidType(type: string): boolean {
        return this.tiles.some((tile) => tile.type === type);
    }
}
