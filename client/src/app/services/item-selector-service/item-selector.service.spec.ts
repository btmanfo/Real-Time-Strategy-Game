import { TestBed } from '@angular/core/testing';
import { Item } from '@common/interfaces';
import { ItemSelectorService } from './item-selector.service';

describe('ItemService', () => {
    let service: ItemSelectorService;

    const potion = 'potion1';
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ItemSelectorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return null if no selected item', () => {
        expect(service.getSelectedItem()).toBeNull();
    });
    it('should set dropped items correctly', () => {
        const mockItems = [{ name: potion } as Item];
        service.setDroppedItems(mockItems);
        expect(service.getDroppedItems()).toEqual(mockItems);
    });
    it('should add dropped item correctly', () => {
        const mockItems = [{ name: potion } as Item];
        service.setDroppedItems(mockItems);
        const mockItem = { name: potion } as Item;
        service.addDroppedItem(mockItem);
        expect(service.getDroppedItems().length).toEqual(2);
    });
    it('should return droppedItems', () => {
        expect(service.getDroppedItems()).toEqual([]);
    });

    it('should return null if no selected item index', () => {
        expect(service.getSelectedItemIndex()).toBeNull();
    });

    it('should select an item index', () => {
        const mockIndex = 2;
        service.selectItemIndex(mockIndex);
        expect(service.getSelectedItemIndex()).toEqual(2);
    });

    it('should select an item', () => {
        const mockItem = { type: potion, name: potion } as Item;
        service.selectItem(mockItem);
        expect(service.getSelectedItem()).toEqual(mockItem);
    });

    it('should deselect an item', () => {
        const mockItem = { name: potion } as Item;
        service.selectItem(mockItem);
        service.deselectItem();
        expect(service.getSelectedItemIndex()).toBeNull();
        expect(service.getSelectedItem()).toBeNull();
    });

    it('should handle selecting and deselecting item index', () => {
        service.selectItemIndex(1);
        expect(service.getSelectedItemIndex()).toEqual(1);
        service.deselectItem();
        expect(service.getSelectedItemIndex()).toBeNull();
    });

    it('should handle selecting and deselecting item', () => {
        const mockItem = { name: potion } as Item;
        service.selectItem(mockItem);
        expect(service.getSelectedItem()).toEqual(mockItem);
        service.deselectItem();
        expect(service.getSelectedItem()).toBeNull();
    });

    it('should return list of items', () => {
        expect(service.getItems()).toEqual(service['items']);
    });
});
