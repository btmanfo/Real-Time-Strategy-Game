import { Injectable } from '@angular/core';
import { DATA_ROUTE_ITEM_ID, DATA_ROUTE_ITEM_POSITIONX, DATA_ROUTE_ITEM_POSITIONY, DATA_ROUTE_NAME, ITEM_TYPES } from '@app/constants/constants';
import { Coordinate } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Item } from '@common/interfaces';
@Injectable({
    providedIn: 'root',
})
export class DragDropItems {
    constructor(
        private readonly itemSelectorService: ItemSelectorService,
        private readonly tileService: TileService,
        private readonly mapService: BoardService,
    ) {}

    /**
     * Handles the start of a drag event for an item.
     * @param event - The drag event.
     * @param item - The item being dragged.
     * @param index - The index of the item in the list.
     */
    onDragStart(event: DragEvent, item: Item, index: number) {
        this.tileService.deselectTile();
        this.itemSelectorService.selectItem(item);
        this.itemSelectorService.selectItemIndex(index);
        event.dataTransfer?.setData(DATA_ROUTE_NAME, item.name);
        event.dataTransfer?.setData(DATA_ROUTE_ITEM_ID, `${this.itemSelectorService.counter++}`);
    }

    /**
     * Checks if an item is out of the container.
     * @param item - The item to check.
     * @returns True if the item is out of the container, false otherwise.
     */
    outOfContainer(item: Item) {
        return item.isOutOfContainer;
    }

    /**
     * Allows a drop event if the dragged item is valid.
     * @param event - The drag event.
     */
    allowDrop(event: DragEvent) {
        if (event.dataTransfer?.types.includes(DATA_ROUTE_NAME)) {
            event.preventDefault();
        }
    }

    /**
     * Handles the drop event for an item onto the board.
     * @param event - The drop event.
     * @param item - The item being dropped.
     */
    onDrop(event: DragEvent, item: Item): void {
        event.preventDefault();
        const { x, y } = this.getDraggedPosition(event);
        const index = this.findTileIndex(item, x, y);

        // Utilisations de l'opérateur ternaire sans retour, pour simplifier le code
        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        index !== -1 ? (this.updateTileAndDroppedItems(index, item), this.handleSpawnItem(item)) : this.itemSelectorService.deselectItem();
    }

    private getDraggedPosition(event: DragEvent): Coordinate {
        return {
            x: parseInt(event.dataTransfer?.getData(DATA_ROUTE_ITEM_POSITIONX) ?? '', 10),
            y: parseInt(event.dataTransfer?.getData(DATA_ROUTE_ITEM_POSITIONY) ?? '', 10),
        };
    }

    private findTileIndex(item: Item, x: number, y: number): number {
        return item.name === ITEM_TYPES.spawn || item.name === ITEM_TYPES.random
            ? this.mapService.getMap().findIndex((tile) => tile.item?.name && tile.item?.position.x === x && tile.item?.position.y === y)
            : this.mapService.getMap().findIndex((tile) => item.name === (tile.item?.name ?? ''));
    }

    private updateTileAndDroppedItems(index: number, item: Item): void {
        const tile = { ...this.mapService.getMap()[index], item: { ...item, name: '' } };
        const selectedIndex = this.itemSelectorService.getSelectedItemIndex();
        if (selectedIndex !== null) {
            const selectedItem = this.itemSelectorService.items.find((x) => x.id === selectedIndex);
            if (selectedItem) {
                selectedItem.isOutOfContainer = false;
            }
        }
        const newDroppedItems = this.itemSelectorService
            .getDroppedItems()
            .filter((droppedItem) => item.position.x !== droppedItem.position.x || item.position.y !== droppedItem.position.y);

        this.itemSelectorService.setDroppedItems(newDroppedItems);
        this.mapService.changeTile(tile);
        if (item.name !== ITEM_TYPES.spawn && item.type !== ITEM_TYPES.flag) {
            this.itemSelectorService.nItems--;
        }
    }

    private handleSpawnItem(item: Item): void {
        if (item.name === ITEM_TYPES.spawn) {
            this.itemSelectorService.nSpawn++;
        }
    }
}
