import { Injectable } from '@angular/core';
import { CHESTBOX_NAME, CLOSED_DOOR, GRID_SIZES, ITEM_TYPES, OPEN_DOOR, TILE_TYPES } from '@app/constants/constants';
import { Coordinate } from '@app/interfaces/interface';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { Item, Player, Position, Tile } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class BoardService {
    highlightedTiles: Tile[] = [];
    tiles: Tile[] = [];
    gridSize: number = GRID_SIZES.MEDIUM;
    isPlaying = false;

    constructor(private readonly itemService: ItemSelectorService) {}

    /**
     * Sets the map by cloning a provided map or creating a new one.
     * @param map - The map array to set.
     * @param gridSize - The grid size to define the map dimensions.
     */
    setMap(map: Tile[], gridSize: number): void {
        if (map.length > 0) {
            this.tiles = structuredClone(map);
            const it = map.filter((tile) => tile.item?.name && tile.item?.name !== ITEM_TYPES.spawn && tile.item?.name !== CHESTBOX_NAME).length;
            this.itemService.nItems = it;
        } else {
            this.tiles = [];
            for (let index = 0; index < gridSize; index++) {
                for (let index2 = 0; index2 < gridSize; index2++) {
                    this.tiles.push({ traversable: true, position: { x: index, y: index2 }, item: { name: '', position: {} } as Item } as Tile);
                }
            }
        }
    }

    /**
     * Returns the current map of tiles.
     * @returns The array of tiles representing the map.
     */
    getMap() {
        return this.tiles;
    }

    /**
     * Changes a tile in the map by its position.
     * @param newTile - The new tile to replace the existing one.
     */
    changeTile(newTile: Tile): void {
        const index = this.tiles.findIndex((tile) => tile.position.x === newTile.position.x && tile.position.y === newTile.position.y);
        if (index !== -1) {
            this.tiles[index] = newTile;
        }
    }

    findTileByPosition(position: Position): Tile | undefined {
        return this.tiles.find((tile) => tile.position.x === position.x && tile.position.y === position.y);
    }

    findTileByPlayerPosition(player: Player): Tile | null {
        return this.tiles.find((tile) => tile.position.x === player.coordinate.x && tile.position.y === player.coordinate.y) || null;
    }

    /**
     * Checks if the tile is blocked by a wall or door and handles item removal if necessary.
     * @param tile - The tile to check.
     * @param itemIndex - The index of the item in the container.
     * @returns A boolean indicating if the tile is blocked.
     */
    isTileBlocked(tile: Tile, itemIndex: number): boolean {
        if ([TILE_TYPES.door, TILE_TYPES.wall].includes(tile.type) && itemIndex >= 0 && tile.image !== OPEN_DOOR) {
            this.outOfContainer(itemIndex, false);
            return true;
        }
        return false;
    }

    /**
     * Checks if an item is being returned to a container.
     * @param tile - The tile to check.
     * @param existingTileIndex - The index of the tile the item is moving from.
     * @param itemIndex - The index of the item being returned.
     * @returns A boolean indicating if the item is being returned to the container.
     */
    isReturningToContainer(tile: Tile, existingTileIndex: number, itemIndex: number): boolean {
        if (tile.item?.name && existingTileIndex < 0) {
            if (itemIndex >= 0) {
                this.outOfContainer(itemIndex, false);
            }
            return true;
        }
        return false;
    }

    /**
     * Checks if an item is moving within the map and updates the tiles accordingly.
     * @param tile - The target tile for the move.
     * @param existingTileIndex - The index of the current tile of the item.
     * @param data - The data for the item (e.g., spawn type).
     * @param id - The ID of the item being moved.
     * @returns A boolean indicating if the move is successful.
     */
    isMovingWithinMap(tile: Tile, existingTileIndex: number, data: string, id: number): boolean {
        if (existingTileIndex >= 0) {
            const originTile = this.tiles[existingTileIndex];

            if (originTile.position.x === tile.position.x && originTile.position.y === tile.position.y) return true;
            if (tile.item?.name) return true;

            this.updateTile(tile, { tileName: data, tileID: id, tileCoordinate: tile.position });
            this.resetOriginTile(originTile);
            return true;
        }
        return false;
    }

    isRandomItem(tile: Tile, data: string, id: number): boolean {
        if (data === ITEM_TYPES.random && this.itemService.nItems < this.itemService.maxItems) {
            this.itemService.nItems++;

            const newItem: Item = { name: data, isOutOfContainer: true, id, position: tile.position } as Item;
            this.itemService.addDroppedItem(newItem);
            this.outOfContainer(this.itemService.getSelectedItemIndex() ?? 0, true);
            this.updateTile(tile, { tileName: data, tileID: id, tileCoordinate: tile.position });
            return true;
        }
        return false;
    }

    /**
     * Spawns a new item on the specified tile.
     * @param tile - The tile where the item will be spawned.
     * @param data - The type of item to spawn.
     * @param id - The ID of the item being spawned.
     * @returns A boolean indicating if the item spawn was successful.
     */
    isSpawningItem(tile: Tile, data: string, id: number): boolean {
        if (data === ITEM_TYPES.spawn && this.itemService.nSpawn > 0) {
            this.itemService.nSpawn--;

            const newItem: Item = { name: data, isOutOfContainer: true, id, position: tile.position } as Item;
            this.itemService.addDroppedItem(newItem);
            this.outOfContainer(this.itemService.getSelectedItemIndex() ?? 0, true);
            this.updateTile(tile, { tileName: data, tileID: id, tileCoordinate: tile.position });
            return true;
        }
        return false;
    }

    /**
     * Places a selected tile on top of another tile.
     * @param tile - The tile to modify.
     * @param selectedTile - The selected tile to place on the target tile.
     */
    placeTile(tile: Tile, selectedTile: Tile): void {
        tile.image = selectedTile.image;
        tile.type = selectedTile.type;
    }

    /**
     * Clears a tile when an item is removed.
     * @param tile - The tile to clear.
     * @param type - The type of tile to place in its place.
     */
    clearTileWhenItem(tile: Tile, type: Tile): void {
        const indexTile = this.itemService.items.findIndex((x: Item) => x.name === tile.item?.name);
        if (indexTile === -1) return;
        this.outOfContainer(indexTile, false);
        if (this.itemService.items[indexTile].name === ITEM_TYPES.spawn) {
            this.itemService.nSpawn++;
        } else if (this.itemService.items[indexTile].type !== ITEM_TYPES.flag) {
            this.itemService.nItems--;
        }
        tile.item = { name: '' } as Item;
        this.placeTile(tile, type);
    }

    /**
     * Removes an item from a tile and places a selected tile in its place.
     * @param tile - The tile to modify.
     * @param selectedTile - The selected tile to place on the target tile.
     */
    removeItemFromTile(tile: Tile, selectedTile: Tile): void {
        const indexTile = this.itemService.items.findIndex((x: Item) => x.name === tile.item?.name);
        if (indexTile === -1) return;
        this.setOutOfContainer(indexTile, false);
        if (this.itemService.items[indexTile].name === ITEM_TYPES.spawn) {
            this.itemService.nSpawn++;
        }
        tile.item = { name: '' } as Item;
        this.placeTile(tile, selectedTile);
    }
    /**
     * Handles tile modification based on the selected tile.
     * @param tile - The tile to modify.
     * @param selectedTile - The tile selected for modification.
     */
    handleTileModification(tile: Tile, selectedTile: Tile) {
        if (this.shouldIgnoreDoorPlacement(tile, selectedTile)) return;
        if (this.isDoorInteraction(tile, selectedTile)) {
            this.handleDoorInteraction(tile);
        } else {
            this.applyTileSelection(tile, selectedTile);
        }
        if (this.shouldRemoveItem(tile, selectedTile)) {
            this.handleItemRemoval(tile);
        }
    }

    /**
     * Determines if a door placement should be ignored.
     * @param tile - The tile to check.
     * @param selectedTile - The selected tile.
     * @returns A boolean indicating if the door placement should be ignored.
     */
    shouldIgnoreDoorPlacement(tile: Tile, selectedTile: Tile): boolean {
        return tile.type === TILE_TYPES.door && selectedTile.type !== TILE_TYPES.door;
    }

    /**
     * Checks if the selected tile interacts with the door type.
     * @param tile - The tile to check.
     * @param selectedTile - The selected tile.
     * @returns A boolean indicating if the interaction is a door interaction.
     */
    isDoorInteraction(tile: Tile, selectedTile: Tile): boolean {
        return selectedTile.type === TILE_TYPES.door && tile.type === TILE_TYPES.door;
    }

    /**
     * Handles the interaction with a door, toggling its traversability.
     * @param tile - The tile representing the door.
     */
    handleDoorInteraction(tile: Tile) {
        tile.traversable = !tile.traversable;
        tile.image = tile.image === CLOSED_DOOR ? OPEN_DOOR : CLOSED_DOOR;
        tile.type = TILE_TYPES.door;
    }

    /**
     * Determines if an item should be removed based on the selected tile.
     * @param tile - The tile to check.
     * @param selectedTile - The selected tile.
     * @returns A string or boolean indicating if the item should be removed.
     */
    shouldRemoveItem(tile: Tile, selectedTile: Tile): string | boolean {
        const isItemRemovable = (selectedTile.type === TILE_TYPES.wall || selectedTile.image === CLOSED_DOOR) && tile.item?.name;
        return !!isItemRemovable;
    }

    /**
     * Removes an item from a tile.
     * @param tile - The tile to modify.
     */
    handleItemRemoval(tile: Tile) {
        const itemIndex = this.itemService.items.findIndex((x: Item) => x.name === tile.item?.name);
        if (itemIndex === -1) return;

        this.outOfContainer(itemIndex, false);

        if (this.itemService.items[itemIndex].name === ITEM_TYPES.spawn) {
            this.itemService.nSpawn++;
        } else if (this.itemService.items[itemIndex].type !== ITEM_TYPES.flag) {
            this.itemService.nItems--;
        }
        tile.item = { name: '' } as Item;
    }

    /**
     * Applies the selected tile's properties to the given tile.
     * @param tile - The tile to modify.
     * @param selectedTile - The selected tile.
     */
    applyTileSelection(tile: Tile, selectedTile: Tile) {
        tile.image = selectedTile.image ?? '';
        tile.type = selectedTile.type ?? '';
    }

    /**
     * Clears the properties of a tile (image and type).
     * @param tile - The tile to clear.
     */
    clearTile(tile: Tile): void {
        tile.image = '';
        tile.type = '';
    }

    /**
     * Toggles the traversability of a door tile.
     * @param tile - The tile representing the door.
     */
    toggleDoor(tile: Tile): void {
        tile.traversable = !tile.traversable;
        tile.image = tile.image === CLOSED_DOOR ? OPEN_DOOR : CLOSED_DOOR;
    }
    highlightPath(path: Tile[]): void {
        path.forEach((tile) => {
            tile.isHighlighted = true;
            this.highlightedTiles.push(tile);
        });
    }

    clearHighlightedPath(): void {
        this.highlightedTiles.forEach((tile) => {
            tile.isHighlighted = false;
        });
        this.highlightedTiles = [];
    }

    getTile(position: Coordinate): Tile | null {
        return this.tiles.find((tile) => tile.position.x === position.x && tile.position.y === position.y) || null;
    }

    updateTiles(tile: Tile) {
        const index = this.tiles.findIndex((t) => t.position.x === tile.position.x && t.position.y === tile.position.y);
        if (index !== -1) {
            this.tiles[index] = tile;
        }
    }

    isAddingNewItem(tile: Tile, itemName: string, itemId: number): boolean {
        if (
            (this.itemService.nItems < this.itemService.maxItems || itemName === CHESTBOX_NAME) &&
            itemName !== ITEM_TYPES.spawn &&
            itemName !== ITEM_TYPES.random
        ) {
            if (tile.item?.name) return true;

            const newItem: Item = this.itemService.items.find((x) => x.name === itemName) as Item;
            newItem.position = tile.position;
            newItem.isOutOfContainer = true;
            newItem.id = itemId;
            this.itemService.addDroppedItem(newItem);
            const foundItemIndex = this.itemService.items.findIndex((x) => x.name === itemName);
            if (foundItemIndex !== -1) {
                this.itemService.items[foundItemIndex].isOutOfContainer = true;
            }
            this.changeTile({ item: newItem, position: tile.position, image: tile.image } as Tile);
            if (newItem.type !== ITEM_TYPES.flag) {
                this.itemService.nItems++;
            }
            return true;
        }
        return false;
    }

    /**
     * Marks an item as being out of the container or back in.
     * @param itemIndex - The index of the item.
     * @param isOut - Whether the item is out of the container or not.
     */
    private outOfContainer(itemIndex: number, isOut: boolean) {
        this.itemService.items[itemIndex].isOutOfContainer = isOut;
    }

    /**
     * Updates a tile with a new item and its properties.
     * @param tile - The tile to update.
     * @param tileName - The type of item.
     * @param tileID - The ID of the item.
     * @param tileCoordinate - The position of the item.
     */
    private updateTile(tile: Tile, update: { tileName: string; tileID: number; tileCoordinate: Coordinate }) {
        this.changeTile({
            item: {
                name: update.tileName,
                isOutOfContainer: true,
                id: update.tileID,
                position: update.tileCoordinate,
                description: this.itemService.items.find((it) => it.name === update.tileName)?.description ?? '',
                type: this.itemService.items.find((it) => it.name === update.tileName)?.type ?? '',
            } as Item,
            position: update.tileCoordinate,
            image: tile.image,
        } as Tile);
    }

    /**
     * Resets the origin tile to its default state.
     * @param originTile - The origin tile to reset.
     */
    private resetOriginTile(originTile: Tile) {
        this.changeTile({
            item: { name: '', isOutOfContainer: false } as Item,
            position: originTile.position,
            image: originTile.image,
        } as Tile);
    }

    private setOutOfContainer(itemIndex: number, isOut: boolean) {
        this.itemService.items[itemIndex].isOutOfContainer = isOut;
    }
}
