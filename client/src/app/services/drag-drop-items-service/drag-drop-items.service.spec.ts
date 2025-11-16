/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { ITEMS } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { DragDropItems } from '@app/services/drag-drop-items-service/drag-drop-items.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Item, Tile } from '@common/interfaces';

describe('DragDropItems', () => {
    let service: DragDropItems;
    let itemSelectorServiceSpy: jasmine.SpyObj<ItemSelectorService>;
    let tileSpy: jasmine.SpyObj<TileService>;
    let mapServiceSpy: jasmine.SpyObj<BoardService>;

    beforeEach(() => {
        itemSelectorServiceSpy = jasmine.createSpyObj('ItemSelectorService', [
            'setDroppedItems',
            'selectItem',
            'selectItemIndex',
            'deselectItem',
            'getItems',
            'getDroppedItems',
            'getSelectedItemIndex',
            'items',
        ]);
        (itemSelectorServiceSpy as any).items = ITEMS;
        tileSpy = jasmine.createSpyObj('TileService', ['deselectTile', 'deselectTileType']);
        mapServiceSpy = jasmine.createSpyObj('CarteService', ['changeTile', 'getMap']);

        TestBed.configureTestingModule({
            providers: [
                DragDropItems,
                { provide: ItemSelectorService, useValue: itemSelectorServiceSpy },
                { provide: TileService, useValue: tileSpy },
                { provide: BoardService, useValue: mapServiceSpy },
            ],
        });

        service = TestBed.inject(DragDropItems);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should handle drag start correctly', () => {
        const mockEvent = { dataTransfer: { setData: jasmine.createSpy() } } as any;
        const mockItem: Item = { name: 'testItem', isOutOfContainer: false, position: { x: 0, y: 0 } } as Item;
        service.onDragStart(mockEvent, mockItem, 1);

        expect(tileSpy.deselectTile).toHaveBeenCalled();
        expect(itemSelectorServiceSpy.selectItem).toHaveBeenCalledWith(mockItem);
        expect(itemSelectorServiceSpy.selectItemIndex).toHaveBeenCalledWith(1);
        expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledWith('application', mockItem.name);
    });

    it('should return item.isOutOfContainer when calling outOfContainer', () => {
        const mockItem: Item = { name: 'testItem', isOutOfContainer: true, position: { x: 0, y: 0 } } as Item;
        expect(service.outOfContainer(mockItem)).toBeTrue();
    });

    it('should allow drop if correct data type is present', () => {
        const mockEvent = { dataTransfer: { types: ['application'] }, preventDefault: jasmine.createSpy() } as any;
        service.allowDrop(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not allow drop if incorrect data type is present', () => {
        const mockEvent = { dataTransfer: { types: ['otherType'] }, preventDefault: jasmine.createSpy() } as any;
        service.allowDrop(mockEvent);
        expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle item drop correctly for spawn', () => {
        const mockEvent = {
            dataTransfer: {
                getData: (type: string) => (type === 'application/posx' ? '10' : '20'),
            },
            preventDefault: jasmine.createSpy(),
        } as any;
        const mockItem: Item = itemSelectorServiceSpy.items[0];
        const mockTile = [{ item: mockItem, position: { x: 10, y: 20 }, type: 'Eau' } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 10, y: 20 } } as Item]);
        itemSelectorServiceSpy.getSelectedItemIndex.and.returnValue(0);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly other items', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => '',
            },
            preventDefault: jasmine.createSpy(),
        } as any;
        const mockItem: Item = itemSelectorServiceSpy.items[0];
        const mockTile = [{ item: mockItem, position: { x: 10, y: 20 }, type: 'Eau' } as Tile];
        itemSelectorServiceSpy.getSelectedItemIndex.and.returnValue(0);
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 10, y: 20 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly when there is no item on the map', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => '',
            },
            preventDefault: jasmine.createSpy(),
        } as any;

        itemSelectorServiceSpy.getItems.and.returnValue([
            {
                position: { x: 0, y: 0 },
                name: 'potion1',
                isOutOfContainer: true,
            } as Item,
        ]);

        const mockItem: Item = { name: 'potion1', isOutOfContainer: true, position: { x: 10, y: 20 } } as Item;
        const mockTile = [{ position: { x: 10, y: 20 }, type: 'Eau' } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 10, y: 20 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).not.toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly when there is no item on the map', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => '',
            },
            preventDefault: jasmine.createSpy(),
        } as any;

        itemSelectorServiceSpy.getItems.and.returnValue([
            {
                position: { x: 0, y: 0 },
                name: 'spawn',
                isOutOfContainer: true,
            } as Item,
        ]);

        const mockItem: Item = { name: 'spawn', isOutOfContainer: true, position: { x: 10, y: 20 } } as Item;
        const mockTile = [{ position: { x: 10, y: 20 }, type: 'Eau' } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 10, y: 20 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).not.toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly when there is an item random on the map', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => '',
            },
            preventDefault: jasmine.createSpy(),
        } as any;
        (service as any).getDraggedPosition = () => ({ x: 0, y: 0 });
        itemSelectorServiceSpy.getItems.and.returnValue([
            {
                position: { x: 0, y: 0 },
                name: 'random',
                isOutOfContainer: true,
            } as Item,
        ]);

        const mockItem: Item = { name: 'random', isOutOfContainer: true, position: { x: 0, y: 0 } } as Item;
        const mockTile = [{ position: { x: 10, y: 20 }, type: 'Eau', item: { name: 'testItem', position: { x: 0, y: 0 } } } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 0, y: 0 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly when there is an item random on the map', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => '',
            },
            preventDefault: jasmine.createSpy(),
        } as any;
        (service as any).getDraggedPosition = () => ({ x: 0, y: 0 });
        itemSelectorServiceSpy.getItems.and.returnValue([
            {
                position: { x: 0, y: 0 },
                name: 'spawn',
                isOutOfContainer: true,
            } as Item,
        ]);

        const mockItem: Item = { name: 'spawn', isOutOfContainer: true, position: { x: 0, y: 0 } } as Item;
        const mockTile = [{ position: { x: 10, y: 20 }, type: 'Eau', item: { name: 'testItem', position: { x: 0, y: 0 } } } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 0, y: 0 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
    it('should handle item drop correctly when getData returns undefined', () => {
        const mockEvent = {
            dataTransfer: {
                getData: () => undefined,
            },
            preventDefault: jasmine.createSpy(),
        } as any;

        itemSelectorServiceSpy.getItems.and.returnValue([
            {
                position: { x: 0, y: 0 },
                name: 'potion1',
                isOutOfContainer: true,
            } as Item,
        ]);
        const mockItem: Item = { name: 'potion1', isOutOfContainer: true, position: { x: 10, y: 20 } } as Item;
        const mockTile = [{ position: { x: 10, y: 20 }, type: 'Eau' } as Tile];
        mapServiceSpy.getMap.and.returnValue(mockTile);
        itemSelectorServiceSpy.getDroppedItems.and.returnValue([{ position: { x: 10, y: 20 } } as Item]);
        expect(mapServiceSpy.getMap().length).toBe(1);
        service.onDrop(mockEvent, mockItem);
        expect(mapServiceSpy.changeTile).not.toHaveBeenCalled();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should deselect item if no valid tile is found on drop', () => {
        const mockEvent = {
            dataTransfer: {
                getData: jasmine.createSpy().and.returnValue(''),
            },
            preventDefault: jasmine.createSpy(),
        } as any;
        const mockItem: Item = { name: 'otherItem', isOutOfContainer: false, position: { x: 0, y: 0 } } as Item;
        mapServiceSpy.getMap.and.returnValue([]);
        service.onDrop(mockEvent, mockItem);
        expect(itemSelectorServiceSpy.deselectItem).toHaveBeenCalled();
    });
});
