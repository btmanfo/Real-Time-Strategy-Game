import { Injectable } from '@angular/core';
import { ID_ITEM_START, ITEMS, NUMBER_OF_ITEMS_MEDIUM } from '@app/constants/constants';
import { Item } from '@common/interfaces';
@Injectable({
    providedIn: 'root',
})
export class ItemSelectorService {
    readonly items: Item[] = ITEMS;
    maxItems: number = NUMBER_OF_ITEMS_MEDIUM;
    counter: number = ID_ITEM_START;
    nSpawn: number = NUMBER_OF_ITEMS_MEDIUM;
    nItems: number = 0;

    private droppedItem: Item[] = [];
    private selectedItemSubject: Item | null = null;
    private selectedItemIndexSubject: number | null = null;

    /**
     * Retrieves the list of dropped items.
     * @returns {Item[]} List of dropped items.
     */
    getDroppedItems(): Item[] {
        return this.droppedItem;
    }

    /**
     * Updates the list of dropped items.
     * @param {Item[]} newItems - New list of dropped items.
     */
    setDroppedItems(newItems: Item[]) {
        this.droppedItem = newItems;
    }

    /**
     * Adds a new item to the list of dropped items if it has a valid name.
     * @param {Item} item - The item to add.
     */
    addDroppedItem(item: Item) {
        if (item.name) {
            this.droppedItem.push(item);
        }
    }

    /**
     * Selects an item if it has a valid name.
     * @param {Item} item - The item to select.
     */
    selectItem(item: Item) {
        if (item.name) {
            this.selectedItemSubject = item;
        }
    }

    /**
     * Retrieves the list of available items.
     * @returns {Item[]} List of available items.
     */
    getItems(): Item[] {
        return this.items;
    }

    /**
     * Selects an item by its index if the index is valid.
     * @param {number} index - Index of the item to select.
     */
    selectItemIndex(index: number) {
        if (index >= 0) {
            this.selectedItemIndexSubject = index;
        }
    }

    /**
     * Deselects the currently selected item and its index.
     */
    deselectItem() {
        this.selectedItemSubject = null;
        this.selectedItemIndexSubject = null;
    }

    /**
     * Retrieves the currently selected item.
     * @returns {Item | null} The selected item or null if no item is selected.
     */
    getSelectedItem(): Item | null {
        return this.selectedItemSubject;
    }

    /**
     * Retrieves the index of the currently selected item.
     * @returns {number | null} The index of the selected item or null if no item is selected.
     */
    getSelectedItemIndex(): number | null {
        return this.selectedItemIndexSubject;
    }
}
