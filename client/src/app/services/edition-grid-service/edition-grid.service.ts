import { Injectable } from '@angular/core';
import { ITEM_TYPES, TILE_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Item, Tile } from '@common/interfaces';
@Injectable({
    providedIn: 'root',
})
export class EditionGridService {
    private isMouseDown = false;
    private isMouseDownRight = false;
    private isMouseMoving = false;
    constructor(
        private readonly boardService: BoardService,
        private readonly itemSelectorService: ItemSelectorService,
        private readonly tileService: TileService,
    ) {}
    /**
     * Handles drag over events for item placement.
     * @param event - The drag event
     */
    allowDrop(event: DragEvent) {
        const index = this.itemSelectorService.getSelectedItemIndex();
        if (index !== null && !this.boardService.isPlaying) {
            event.preventDefault();
        }
    }

    /**
     * Processes item dropping on the grid.
     * @param event - The drop event
     * @param tile - The tile being dropped on
     */
    onDrop(event: DragEvent, tile: Tile) {
        event.preventDefault();

        const itemName = event.dataTransfer?.getData('application');
        const itemId = parseInt(event.dataTransfer?.getData('application/id') ?? '', 10);
        if (!itemName || isNaN(itemId)) return;

        const existingTileIndex = this.boardService.tiles.findIndex((t) => t.item?.id === itemId);
        const itemIndex = this.itemSelectorService.items.findIndex((item) => item.name === itemName);
        if (this.boardService.isTileBlocked(tile, itemIndex)) return;
        if (this.boardService.isReturningToContainer(tile, existingTileIndex, itemIndex)) return;
        if (this.boardService.isMovingWithinMap(tile, existingTileIndex, itemName, itemId)) return;
        if (this.boardService.isAddingNewItem(tile, itemName, itemId)) return;
        if (this.boardService.isRandomItem(tile, itemName, itemId)) return;
        if (this.boardService.isSpawningItem(tile, itemName, itemId)) return;

        this.resetItemState();
    }

    /**
     * Initiates drag operation for items.
     * @param event - The drag start event
     * @param tile - The tile being dragged
     */
    onDragStart(event: DragEvent, tile: Tile) {
        if (this.boardService.isPlaying) event.preventDefault();
        event.dataTransfer?.setData('application', tile.item?.name ?? 'inconnu');
        event.dataTransfer?.setData('application/id', `${tile.item?.id}`);
        if (tile.item?.name === ITEM_TYPES.spawn || tile.item?.name === ITEM_TYPES.random) {
            event.dataTransfer?.setData('application/posx', `${tile.item?.position.x}`);
            event.dataTransfer?.setData('application/posy', `${tile.item?.position.y}`);
        }
        const item = this.itemSelectorService.items.find((x) => tile.item?.name === x.name);
        if (item) {
            this.itemSelectorService.selectItem(tile.item as Item);
            this.itemSelectorService.selectItemIndex(item.id);
        }
    }

    /**
     * Handles clicking on items in the grid.
     * @param event - The mouse event
     * @param tile - The tile being clicked
     */
    onClickItem(event: MouseEvent, tile: Tile) {
        if (!this.boardService.isPlaying) {
            if (event.button === 2 && !this.tileService.getSelectedTile()) {
                const targetItemIndex = this.itemSelectorService.items.findIndex((item) => item.name === tile.item?.name);
                if (targetItemIndex >= 0) this.itemSelectorService.items[targetItemIndex].isOutOfContainer = false;
                if (tile.item?.name === ITEM_TYPES.spawn) this.itemSelectorService.nSpawn++;

                this.boardService.changeTile({
                    item: { name: '' } as Item,
                    position: { x: tile.position.x, y: tile.position.y },
                    image: tile.image,
                } as Tile);
                if (ITEM_TYPES.spawn === tile.item?.name || ITEM_TYPES.flag === tile.item?.type) {
                    return;
                } else if (tile.item?.type !== ITEM_TYPES.flag) {
                    this.itemSelectorService.nItems--;
                }
            }
        }
    }

    /**
     * Processes clicks on grid tiles.
     * @param event - The mouse event
     * @param tile - The tile being clicked
     */
    onClickTile(event: MouseEvent, tile: Tile) {
        event.preventDefault();
        const selectedTile = this.tileService.getSelectedTile();
        if (!selectedTile || this.isMouseMoving) return;

        this.isMouseDown = false;
        this.isMouseDownRight = false;

        if (event.button === 2) {
            this.handleRightClick(tile);
        } else if (selectedTile.type === TILE_TYPES.door && tile.type === TILE_TYPES.door) {
            this.handleDoorInteraction(tile, selectedTile);
        } else if (selectedTile.type !== TILE_TYPES.door && tile.type === TILE_TYPES.door) {
            return;
        } else if ((selectedTile?.type === TILE_TYPES.wall || selectedTile?.type === TILE_TYPES.door) && tile.item?.name) {
            this.boardService.clearTileWhenItem(tile, selectedTile);
        } else {
            this.boardService.placeTile(tile, selectedTile);
        }
    }
    /**
     * Handles mouse button press events.
     * @param event - The mouse down event
     */
    onMouseDown(event: MouseEvent): void {
        if (!this.hasSelectedTile()) {
            return;
        }
        if (event.button === 0) {
            event.preventDefault();
            this.isMouseDown = true;
        } else if (event.button === 2) {
            this.isMouseDownRight = true;
        }
    }

    /**
     * Handles mouse button release events.
     */
    onMouseUp(): void {
        this.isMouseDown = false;
        this.isMouseDownRight = false;
        this.isMouseMoving = false;
    }

    /**
     * Handles mouse leaving the grid area.
     */
    onMouseLeave(): void {
        this.isMouseDown = false;
        this.isMouseDownRight = false;
    }

    /**
     * Processes mouse movement over the grid.
     * @param event - The mouse move event
     * @param tile - The tile being moved over
     */
    onMouseMove(event: MouseEvent, tile: Tile) {
        if (event.buttons === 0) return;
        this.isMouseMoving = true;
        const selectedTile = this.tileService.getSelectedTile();
        if (!selectedTile) return;

        if (this.isMouseDown) {
            this.boardService.handleTileModification(tile, selectedTile);
        } else if (this.isMouseDownRight) {
            this.boardService.clearTile(tile);
        }
    }

    /**
     * Resets the state of selected items.
     */
    resetItemState(): void {
        const selectedIndex = this.itemSelectorService.getSelectedItemIndex();
        if (selectedIndex !== null) {
            this.itemSelectorService.items[selectedIndex].isOutOfContainer = false;
        }
        this.itemSelectorService.deselectItem();
    }

    setCostTiles() {
        const tileCosts = new Map<string, number>([
            [TILE_TYPES.ice, 0],
            [TILE_TYPES.water, 2],
            [TILE_TYPES.door, 1],
        ]);
        this.boardService.tiles = this.boardService.tiles.map((tile) => {
            if (!tile.type) {
                tile.cost = 1;
                return tile;
            }
            if (tile.image === './assets/images/Porte.png') {
                tile.cost = -1;
                return tile;
            }
            tile.cost = tileCosts.get(tile.type) ?? -1;
            return tile;
        });
    }

    /**
     * Handles right-click actions on tiles.
     * @param tile - The tile being right-clicked
     */
    private handleRightClick(tile: Tile): void {
        this.boardService.clearTile(tile);
    }

    /**
     * Manages interactions between door tiles.
     * @param tile - The target door tile
     * @param selectedTile - The selected door tile
     */
    private handleDoorInteraction(tile: Tile, selectedTile: Tile): void {
        if (selectedTile.type === TILE_TYPES.door && tile.type === TILE_TYPES.door) {
            this.boardService.toggleDoor(tile);
        }
    }

    /**
     * Checks if there is a currently selected tile.
     * @returns True if a tile is selected, false otherwise
     */
    private readonly hasSelectedTile = (): boolean => this.tileService.getSelectedTile() !== null;
}
