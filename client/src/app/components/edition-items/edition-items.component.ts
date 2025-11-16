import { Component, OnDestroy, OnInit } from '@angular/core';
import { ITEMS_CATEGORIES, ITEM_TYPES } from '@app/constants/constants';
import { AppMaterialModule } from '@app/modules/material.module';
import { BoardService } from '@app/services/board-service/board.service';
import { DragDropItems } from '@app/services/drag-drop-items-service/drag-drop-items.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Item } from '@common/interfaces';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-edition-items',
    templateUrl: './edition-items.component.html',
    styleUrls: ['./edition-items.component.scss'],
    imports: [AppMaterialModule],
})
export class EditionItemsComponent implements OnInit, OnDestroy {
    categories = ITEMS_CATEGORIES;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly itemService: ItemSelectorService,
        private readonly tileService: TileService,
        private readonly mapService: BoardService,
        private readonly dragDropItems: DragDropItems,
        private readonly gameService: GameService,
    ) {}

    /**
     * Getter to access the ItemSelectorService.
     * @returns {ItemSelectorService} The injected ItemSelectorService instance.
     */
    get serviceItem(): ItemSelectorService {
        return this.itemService;
    }

    /**
     * Getter to access the TileService.
     * @returns {TileService} The injected TileService instance.
     */
    get serviceTile(): TileService {
        return this.tileService;
    }

    /**
     * Getter to access the BoardService.
     * @returns {BoardService} The injected BoardService instance.
     */
    get serviceMap(): BoardService {
        return this.mapService;
    }

    /**
     * Getter to access the DragDropItems service.
     * @returns {DragDropItems} The injected DragDropItems instance.
     */
    get serviceDragDrop(): DragDropItems {
        return this.dragDropItems;
    }

    /**
     * Initialization method called automatically by Angular when the component is created.
     */
    ngOnInit(): void {
        this.resetDroppedItems();
        this.populateDroppedItems();
        this.updateItemStates();
        this.itemService.counter += this.itemService.getDroppedItems().length;
    }

    /**
     * Cleanup method called before the component is destroyed.
     * Cancels subscriptions and frees resources.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Resets the dropped items by clearing the list and resetting each item's state.
     */
    resetDroppedItems(): void {
        this.itemService.setDroppedItems([]);
        const items = this.itemService.getItems();
        if (items) {
            items.forEach((x) => {
                x.isOutOfContainer = false;
            });
        }
    }

    /**
     * Populates the dropped items based on the tiles from the board.
     */
    populateDroppedItems(): void {
        const map = this.mapService.getMap();
        if (map) {
            for (const tile of map) {
                if (tile.item?.name) {
                    this.itemService.addDroppedItem(tile.item);
                }
            }
        }
    }

    /**
     * Updates the state of items based on the dropped items.
     */
    updateItemStates(): void {
        const items = this.itemService.getItems();
        if (items) {
            for (const dropped of this.itemService.getDroppedItems()) {
                for (const item of items) {
                    if (this.changeItemState(item, dropped)) {
                        break;
                    }
                }
            }
        }
    }

    isCaptureTheFlag(): boolean {
        const game = this.gameService.getNewGame();
        return game && game.gameMode === 'CTF';
    }

    /**
     * Changes the state of an item based on the dropped item.
     * @param {Item} item - The item to update.
     * @param {Item} dropped - The dropped item.
     * @returns {boolean} Returns true if the state was updated, otherwise false.
     */
    private changeItemState(item: Item, dropped: Item): boolean {
        if (item.name === dropped.name && item.name !== ITEM_TYPES.spawn) {
            item.isOutOfContainer = true;
            return true;
        } else if (item.name === dropped.name && item.name === ITEM_TYPES.spawn) {
            this.itemService.nSpawn--;
            if (this.itemService.nSpawn === 0) {
                item.isOutOfContainer = true;
            }
        }
        return false;
    }
}
