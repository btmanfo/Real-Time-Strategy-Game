/* tslint:disable:no-unused-variable */
// Les variables non utilisées ne sont pas autorisées
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction

import { TestBed } from '@angular/core/testing';
import { ITEM_TYPES, ITEMS, TILE_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { EditionGridService } from '@app/services/edition-grid-service/edition-grid.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Item, Player, Tile } from '@common/interfaces';

class MockDragEvent {
    preventDefault: jasmine.Spy;
    dataTransfer: {
        getData: jasmine.Spy;
    };
    constructor() {
        this.preventDefault = jasmine.createSpy('preventDefault');
        this.dataTransfer = {
            getData: jasmine.createSpy('getData'),
        };
    }
}
describe('Service: EditionGrid', () => {
    let service: EditionGridService;
    let tileService: jasmine.SpyObj<TileService>;
    let mapService: jasmine.SpyObj<BoardService>;
    let itemSelectorService: jasmine.SpyObj<ItemSelectorService>;
    beforeEach(() => {
        tileService = jasmine.createSpyObj('TileService', ['getSelectedTile', 'getSelectedTileType', 'getSelectedTileCost']);
        mapService = jasmine.createSpyObj('BoardService', [
            'clearTile',
            'toggleDoor',
            'changeTile',
            'placeTile',
            'removeItemFromTile',
            'handleTileModification',
            'isTileBlocked',
            'isSpawningItem',
            'isReturningToContainer',
            'isMovingWithinMap',
            'tiles',
            'isAddingNewItem',
            'isRandomItem',
            'clearTileWhenItem',
        ]);
        mapService.tiles = [
            { position: { x: 0, y: 0 }, type: '', traversable: true, cost: 0 } as Tile,
            { position: { x: 1, y: 1 }, type: '', traversable: true, cost: 0, player: null } as Tile,
            { position: { x: 2, y: 2 }, type: '', traversable: true, cost: 0, player: null } as Tile,
            { position: { x: 3, y: 3 }, type: TILE_TYPES.wall, traversable: false, cost: 0 } as Tile,
            { position: { x: 4, y: 4 }, type: TILE_TYPES.door, traversable: true, cost: 0, image: './assets/images/Porte.png' } as Tile,
            { position: { x: 5, y: 5 }, type: TILE_TYPES.door, traversable: true, cost: 0, image: './assets/images/Porte-ferme.png' } as Tile,
            { position: { x: 6, y: 6 }, type: TILE_TYPES.ice, traversable: true, cost: 0 } as Tile,
            { position: { x: 7, y: 7 }, type: TILE_TYPES.water, traversable: true, cost: 0 } as Tile,
        ];
        itemSelectorService = jasmine.createSpyObj(
            'ItemSelectorService',
            [
                'getSelectedItemIndex',
                'selectItem',
                'selectItemIndex',
                'deselectItem',
                'getItems',
                'updateItemContainer',
                'set nSpawn',
                'set maxItems',
                'get nSpawn',
                'get maxItems',
            ],
            {
                items: ITEMS,
            },
        );
        itemSelectorService.getItems.and.returnValue([]);
        TestBed.configureTestingModule({
            providers: [
                EditionGridService,
                { provide: TileService, useValue: tileService },
                { provide: BoardService, useValue: mapService },
                { provide: ItemSelectorService, useValue: itemSelectorService },
            ],
        });
        service = TestBed.inject(EditionGridService);
    });

    describe('onMouseDown', () => {
        let event: MouseEvent;

        beforeEach(() => {
            event = new MouseEvent('mousedown', { button: 0 });
            (service as any).isMouseDown = false;
            (service as any).isMouseDownRight = false;
        });

        it('should return early when no tile is selected', () => {
            tileService.getSelectedTile.and.returnValue(null);
            spyOn(event, 'preventDefault');

            service.onMouseDown(event);

            expect((service as any).isMouseDown).toBeFalse();
            expect((service as any).isMouseDownRight).toBeFalse();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should handle left click when tile is selected', () => {
            tileService.getSelectedTile.and.returnValue({} as Tile);
            spyOn(event, 'preventDefault');

            service.onMouseDown(event);

            expect((service as any).isMouseDown).toBeTrue();
            expect((service as any).isMouseDownRight).toBeFalse();
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should handle right click when tile is selected', () => {
            const rightClickEvent = new MouseEvent('mousedown', { button: 2 });
            tileService.getSelectedTile.and.returnValue({} as Tile);
            spyOn(rightClickEvent, 'preventDefault');

            service.onMouseDown(rightClickEvent);

            expect((service as any).isMouseDown).toBeFalse();
            expect((service as any).isMouseDownRight).toBeTrue();
            expect(rightClickEvent.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Tile Interactions', () => {
        it('should handle right click on tile', () => {
            const tile = {} as Tile;
            const event = new MouseEvent('click', { button: 2 });
            const selectedTile = { type: TILE_TYPES.wall } as Tile;

            tileService.getSelectedTile.and.returnValue(selectedTile);

            service.onClickTile(event, tile);

            expect(mapService.clearTile).toHaveBeenCalledWith(tile);
        });
        it('should handle door interaction', () => {
            const tile = { type: TILE_TYPES.door } as Tile;
            const selectedTile = { type: TILE_TYPES.door } as Tile;
            const event = new MouseEvent('click', { button: 0 });

            tileService.getSelectedTile.and.returnValue(selectedTile);

            service.onClickTile(event, tile);

            expect(mapService.toggleDoor).toHaveBeenCalledWith(tile);
        });
    });

    describe('Drag and Drop', () => {
        it('should allow drop when item is selected', () => {
            const event = new DragEvent('dragover');
            mapService.isPlaying = false;
            spyOn(event, 'preventDefault');
            itemSelectorService.getSelectedItemIndex.and.returnValue(0);

            service.allowDrop(event);

            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should not allow drop when no item is selected', () => {
            const event = new DragEvent('dragover');
            spyOn(event, 'preventDefault');
            itemSelectorService.getSelectedItemIndex.and.returnValue(null);

            service.allowDrop(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('onClickItem', () => {
        it('should handle right click on item when no tile is selected', () => {
            const event = new MouseEvent('click', { button: 2 });
            mapService.isPlaying = false;
            const mockItem: Item = {
                name: 'test',
                position: { x: 1, y: 1 },
                image: 'test.png',
                id: 1,
                type: 'test',
                description: 'test',
                isOutOfContainer: true,
            };
            const tile: Tile = {
                item: mockItem,
                position: { x: 1, y: 1 },
                image: 'test.png',
                type: TILE_TYPES.empty,
                traversable: true,
                player: {} as Player,
                cost: 1,
            };

            tileService.getSelectedTile.and.returnValue(null);

            service.onClickItem(event, tile);

            expect(mapService.changeTile).toHaveBeenCalledWith({
                item: { name: '' } as Item,
                position: { x: 1, y: 1 },
                image: 'test.png',
            } as Tile);
        });

        it('should increment nSpawn when right clicking on a spawn item', () => {
            const event = new MouseEvent('click', { button: 2 });
            mapService.isPlaying = false;
            const mockItem: Item = {
                name: ITEM_TYPES.spawn,
                position: { x: 1, y: 1 },
                image: 'spawn.png',
                id: 1,
                type: 'spawn',
                description: 'spawn',
                isOutOfContainer: true,
            };
            const tile: Tile = {
                item: mockItem,
                position: { x: 1, y: 1 },
                image: 'spawn.png',
                type: TILE_TYPES.empty,
                traversable: true,
                player: {} as Player,
                cost: 1,
            };

            tileService.getSelectedTile.and.returnValue(null);

            itemSelectorService.nSpawn = 1;

            service.onClickItem(event, tile);

            expect(itemSelectorService.nSpawn).toBe(2);
            expect(mapService.changeTile).toHaveBeenCalled();
        });

        describe('resetItemState', () => {
            it('should reset item state when an item is selected', () => {
                const selectedIndex = 0;
                itemSelectorService.getSelectedItemIndex.and.returnValue(selectedIndex);

                service.resetItemState();

                expect(itemSelectorService.items[selectedIndex].isOutOfContainer).toBeFalse();
                expect(itemSelectorService.deselectItem).toHaveBeenCalled();
            });

            it('should only call deselectItem when no item is selected', () => {
                itemSelectorService.getSelectedItemIndex.and.returnValue(null);

                service.resetItemState();

                expect(itemSelectorService.deselectItem).toHaveBeenCalled();
            });
        });

        describe('onMouseLeave', () => {
            it('should reset both mouse states when mouse leaves', () => {
                (service as any).isMouseDown = true;
                (service as any).isMouseDownRight = true;

                service.onMouseLeave();

                expect((service as any).isMouseDown).toBeFalse();
                expect((service as any).isMouseDownRight).toBeFalse();
            });

            it('should handle mouse leave when states are already false', () => {
                (service as any).isMouseDown = false;
                (service as any).isMouseDownRight = false;

                service.onMouseLeave();

                expect((service as any).isMouseDown).toBeFalse();
                expect((service as any).isMouseDownRight).toBeFalse();
            });
        });
    });

    describe('onMouseMove', () => {
        let mockTile: Tile;
        let mockSelectedTile: Tile;
        let mockEvent: MouseEvent;

        beforeEach(() => {
            mockTile = { type: TILE_TYPES.empty } as Tile;
            mockSelectedTile = { type: TILE_TYPES.wall } as Tile;
            mockEvent = new MouseEvent('mousemove', { buttons: 1 });
        });

        it('should do nothing when no mouse button is pressed', () => {
            const noButtonEvent = new MouseEvent('mousemove', { buttons: 0 });

            service.onMouseMove(noButtonEvent, mockTile);

            expect(mapService.handleTileModification).not.toHaveBeenCalled();
            expect(mapService.clearTile).not.toHaveBeenCalled();
        });

        it('should do nothing when no tile is selected', () => {
            tileService.getSelectedTile.and.returnValue(null);

            service.onMouseMove(mockEvent, mockTile);

            expect(mapService.handleTileModification).not.toHaveBeenCalled();
            expect(mapService.clearTile).not.toHaveBeenCalled();
        });

        it('should handle tile modification when left mouse is down', () => {
            (service as any).isMouseDown = true;
            tileService.getSelectedTile.and.returnValue(mockSelectedTile);

            service.onMouseMove(mockEvent, mockTile);

            expect(mapService.handleTileModification).toHaveBeenCalledWith(mockTile, mockSelectedTile);
            expect(mapService.clearTile).not.toHaveBeenCalled();
        });

        it('should clear tile when right mouse is down', () => {
            (service as any).isMouseDownRight = true;
            tileService.getSelectedTile.and.returnValue(mockSelectedTile);

            service.onMouseMove(mockEvent, mockTile);

            expect(mapService.clearTile).toHaveBeenCalledWith(mockTile);
            expect(mapService.handleTileModification).not.toHaveBeenCalled();
        });
    });

    describe('onMouseUp', () => {
        it('should reset both mouse states', () => {
            (service as any).isMouseDown = true;
            (service as any).isMouseDownRight = true;

            service.onMouseUp();

            expect((service as any).isMouseDown).toBeFalse();
            expect((service as any).isMouseDownRight).toBeFalse();
        });

        it('should work when mouse states are already false', () => {
            (service as any).isMouseDown = false;
            (service as any).isMouseDownRight = false;

            service.onMouseUp();

            expect((service as any).isMouseDown).toBeFalse();
            expect((service as any).isMouseDownRight).toBeFalse();
        });
    });

    describe('onClickTile', () => {
        let mockTile: Tile;
        let mockEvent: MouseEvent;
        let mockSelectedTile: Tile;

        beforeEach(() => {
            mockTile = { type: TILE_TYPES.empty } as Tile;
            mockEvent = new MouseEvent('click');
            mockSelectedTile = { type: TILE_TYPES.wall } as Tile;
            spyOn(mockEvent, 'preventDefault');
        });

        it('should prevent default and return early if no tile is selected', () => {
            tileService.getSelectedTile.and.returnValue(null);

            service.onClickTile(mockEvent, mockTile);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mapService.placeTile).not.toHaveBeenCalled();
        });

        it('should handle right click by calling handleRightClick', () => {
            const rightClickEvent = new MouseEvent('click', { button: 2 });
            tileService.getSelectedTile.and.returnValue(mockSelectedTile);

            service.onClickTile(rightClickEvent, mockTile);

            expect(mapService.clearTile).toHaveBeenCalledWith(mockTile);
        });

        it('should handle door-to-door interaction', () => {
            const doorTile = { type: TILE_TYPES.door } as Tile;
            const selectedDoorTile = { type: TILE_TYPES.door } as Tile;
            tileService.getSelectedTile.and.returnValue(selectedDoorTile);

            service.onClickTile(mockEvent, doorTile);

            expect(mapService.toggleDoor).toHaveBeenCalledWith(doorTile);
        });

        it('should return early when trying to place non-door tile on door tile', () => {
            const doorTile = { type: TILE_TYPES.door } as Tile;
            const wallTile = { type: TILE_TYPES.wall } as Tile;
            tileService.getSelectedTile.and.returnValue(wallTile);

            service.onClickTile(mockEvent, doorTile);

            expect(mapService.placeTile).not.toHaveBeenCalled();
            expect(mapService.removeItemFromTile).not.toHaveBeenCalled();
        });

        it('should place tile in normal case', () => {
            tileService.getSelectedTile.and.returnValue(mockSelectedTile);

            service.onClickTile(mockEvent, mockTile);

            expect(mapService.placeTile).toHaveBeenCalledWith(mockTile, mockSelectedTile);
        });

        it('should reset mouse states', () => {
            (service as any).isMouseDown = true;
            (service as any).isMouseDownRight = true;
            tileService.getSelectedTile.and.returnValue(mockSelectedTile);

            service.onClickTile(mockEvent, mockTile);

            expect((service as any).isMouseDown).toBeFalse();
            expect((service as any).isMouseDownRight).toBeFalse();
        });

        it('should clear tile when selected tile is wall or door and tile has item', () => {
            (service as any).isMouseDown = true;
            (service as any).isMouseDownRight = true;
            (service as any).isMouseMoving = false;
            const wallTile = { type: TILE_TYPES.wall, item: { name: 'test' } } as Tile;
            const leftClickEvent = new MouseEvent('click', { button: 0 });
            tileService.getSelectedTile.and.returnValue({ type: TILE_TYPES.wall, item: { name: 'test' } as Item } as Tile);

            service.onClickTile(leftClickEvent, wallTile);

            expect(mapService.clearTileWhenItem).toHaveBeenCalledWith(wallTile, { type: TILE_TYPES.wall, item: { name: 'test' } as Item } as Tile);
        });
    });
    describe('onDragStart', () => {
        let mockEvent: DragEvent;
        let mockDataTransfer: DataTransfer;
        let setDataSpy: jasmine.Spy;

        beforeEach(() => {
            setDataSpy = jasmine.createSpy('setData');
            mockDataTransfer = {
                setData: setDataSpy,
            } as any as DataTransfer;
            mockEvent = {
                preventDefault: jasmine.createSpy('preventDefault') as () => void,
                dataTransfer: mockDataTransfer,
            } as DragEvent;
        });
        it('should call not allow drag if the game is playing', () => {
            mapService.isPlaying = true;
            const mockTile: Tile = {
                item: {
                    name: 'regularItem',
                    id: 1,
                } as Item,
            } as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
        it('should set basic data transfer for regular items', () => {
            const mockTile: Tile = {
                item: {
                    name: 'regularItem',
                    id: 1,
                } as Item,
            } as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(setDataSpy).toHaveBeenCalledWith('application', 'regularItem');
            expect(setDataSpy).toHaveBeenCalledWith('application/id', '1');
            expect(setDataSpy).not.toHaveBeenCalledWith('application/posx', jasmine.any(String));
            expect(setDataSpy).not.toHaveBeenCalledWith('application/posy', jasmine.any(String));
        });

        it('should set additional position data for spawn items', () => {
            const mockTile: Tile = {
                item: {
                    name: ITEM_TYPES.spawn,
                    id: 1,
                    position: { x: 10, y: 20 },
                } as Item,
            } as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(setDataSpy).toHaveBeenCalledWith('application', ITEM_TYPES.spawn);
            expect(setDataSpy).toHaveBeenCalledWith('application/id', '1');
            expect(setDataSpy).toHaveBeenCalledWith('application/posx', '10');
            expect(setDataSpy).toHaveBeenCalledWith('application/posy', '20');
        });

        it('should set additional position data for random items', () => {
            const mockTile: Tile = {
                item: {
                    name: ITEM_TYPES.random,
                    id: 1,
                    position: { x: 15, y: 25 },
                } as Item,
            } as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(setDataSpy).toHaveBeenCalledWith('application', ITEM_TYPES.random);
            expect(setDataSpy).toHaveBeenCalledWith('application/id', '1');
            expect(setDataSpy).toHaveBeenCalledWith('application/posx', '15');
            expect(setDataSpy).toHaveBeenCalledWith('application/posy', '25');
        });

        it('should select item and index when item exists in itemSelectorService', () => {
            const mockItem: Item = {
                name: 'potion1',
                id: 1,
            } as Item;
            const mockTile: Tile = {
                item: mockItem,
            } as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(itemSelectorService.selectItem).toHaveBeenCalledWith(mockItem);
            expect(itemSelectorService.selectItemIndex).toHaveBeenCalledWith(0);
        });

        it('should handle tile without item', () => {
            const mockTile: Tile = {} as Tile;

            service.onDragStart(mockEvent, mockTile);

            expect(setDataSpy).toHaveBeenCalledWith('application', 'inconnu');
            expect(setDataSpy).toHaveBeenCalledWith('application/id', 'undefined');
            expect(itemSelectorService.selectItem).not.toHaveBeenCalled();
            expect(itemSelectorService.selectItemIndex).not.toHaveBeenCalled();
        });

        it('should handle null dataTransfer', () => {
            const mockEventWithoutDataTransfer = {} as DragEvent;
            const mockTile: Tile = {
                item: { name: 'test', id: 1 } as Item,
            } as Tile;
            mapService.isPlaying = false;
            service.onDragStart(mockEventWithoutDataTransfer, mockTile);

            expect(setDataSpy).not.toHaveBeenCalled();
        });
    });

    describe('setCostTiles should set the cost of the tiles', () => {
        it('should set tile cost based on tile type', () => {
            service.setCostTiles();
            expect(mapService.tiles[0].cost).toBe(1);
            expect(mapService.tiles[3].cost).toBe(-1);
            expect(mapService.tiles[6].cost).toBe(0);
            expect(mapService.tiles[7].cost).toBe(2);
        });
        it('should handle special case for door images', () => {
            service.setCostTiles();
            expect(mapService.tiles[4].cost).toBe(-1);
        });
    });

    describe('onDrop', () => {
        let mockEvent: any;
        let mockTile: Tile;

        beforeEach(() => {
            mockEvent = new MockDragEvent();
            mockTile = { position: { x: 1, y: 1 }, type: TILE_TYPES.empty } as Tile;
        });

        it('should prevent default behavior of the event', () => {
            service.onDrop(mockEvent, mockTile);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should return early if itemName is missing or itemId is NaN', () => {
            mockEvent.dataTransfer.getData.and.returnValues('', 'NaN');

            service.onDrop(mockEvent, mockTile);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mapService.isTileBlocked).not.toHaveBeenCalled();
        });

        it('should return early if the tile is blocked', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(true);

            service.onDrop(mockEvent, mockTile);

            expect(mapService.isTileBlocked).toHaveBeenCalledWith(mockTile, jasmine.any(Number));
            expect(mapService.isReturningToContainer).not.toHaveBeenCalled();
        });

        it('should return early if the item is being returned to the container', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(true);

            service.onDrop(mockEvent, mockTile);

            expect(mapService.isReturningToContainer).toHaveBeenCalledWith(mockTile, jasmine.any(Number), jasmine.any(Number));
            expect(mapService.isMovingWithinMap).not.toHaveBeenCalled();
        });

        it('should return early if the item is moving within the map', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(false);
            mapService.isMovingWithinMap.and.returnValue(true);

            service.onDrop(mockEvent, mockTile);

            expect(mapService.isMovingWithinMap).toHaveBeenCalledWith(mockTile, jasmine.any(Number), 'testItem', 123);
            expect(mapService.isAddingNewItem).not.toHaveBeenCalled();
        });

        it('should return early if a new item is being added', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(false);
            mapService.isMovingWithinMap.and.returnValue(false);
            mapService.isAddingNewItem.and.returnValue(true);

            service.onDrop(mockEvent, mockTile);

            expect(mapService.isAddingNewItem).toHaveBeenCalledWith(mockTile, 'testItem', 123);
            expect(mapService.isRandomItem).not.toHaveBeenCalled();
        });

        it('should return early if a random item is being added', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(false);
            mapService.isMovingWithinMap.and.returnValue(false);
            mapService.isAddingNewItem.and.returnValue(false);
            mapService.isRandomItem.and.returnValue(true);

            service.onDrop(mockEvent, mockTile);

            expect(mapService.isRandomItem).toHaveBeenCalledWith(mockTile, 'testItem', 123);
            expect(mapService.isSpawningItem).not.toHaveBeenCalled();
        });

        it('should return early if a spawn item is being added', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(false);
            mapService.isMovingWithinMap.and.returnValue(false);
            mapService.isAddingNewItem.and.returnValue(false);
            mapService.isRandomItem.and.returnValue(false);
            mapService.isSpawningItem.and.returnValue(true);
            spyOn(service, 'resetItemState');
            service.onDrop(mockEvent, mockTile);

            expect(mapService.isSpawningItem).toHaveBeenCalledWith(mockTile, 'testItem', 123);
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should reset item state if no conditions are met', () => {
            mockEvent.dataTransfer.getData.and.returnValues('testItem', '123');
            mapService.isTileBlocked.and.returnValue(false);
            mapService.isReturningToContainer.and.returnValue(false);
            mapService.isMovingWithinMap.and.returnValue(false);
            mapService.isAddingNewItem.and.returnValue(false);
            mapService.isRandomItem.and.returnValue(false);
            mapService.isSpawningItem.and.returnValue(false);
            spyOn(service, 'resetItemState');

            service.onDrop(mockEvent, mockTile);

            expect(service.resetItemState).toHaveBeenCalled();
        });
    });
});

describe('EditionGridService', () => {
    let service: EditionGridService;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let itemSelectorServiceSpy: jasmine.SpyObj<ItemSelectorService>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;

    beforeEach(() => {
        boardServiceSpy = jasmine.createSpyObj(
            'BoardService',
            [
                'isTileBlocked',
                'isReturningToContainer',
                'isMovingWithinMap',
                'isAddingNewItem',
                'isRandomItem',
                'isSpawningItem',
                'clearTileWhenItem',
                'placeTile',
                'clearTile',
                'toggleDoor',
            ],
            {
                tiles: [],
            },
        );

        itemSelectorServiceSpy = jasmine.createSpyObj(
            'ItemSelectorService',
            ['getSelectedItemIndex', 'selectItem', 'selectItemIndex', 'deselectItem'],
            {
                items: [],
            },
        );

        tileServiceSpy = jasmine.createSpyObj('TileService', ['getSelectedTile']);

        TestBed.configureTestingModule({
            providers: [
                EditionGridService,
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: ItemSelectorService, useValue: itemSelectorServiceSpy },
                { provide: TileService, useValue: tileServiceSpy },
            ],
        });

        service = TestBed.inject(EditionGridService);
    });

    describe('onDrop', () => {
        let mockEvent: DragEvent;
        let mockTile: Tile;
        let dataTransfer: DataTransfer;

        beforeEach(() => {
            mockTile = { position: { x: 1, y: 1 }, type: '' } as Tile;
            dataTransfer = {
                getData: jasmine.createSpy('getData').and.callFake((key) => {
                    if (key === 'application') return 'testItem';
                    if (key === 'application/id') return '42';
                    return '';
                }),
            } as unknown as DataTransfer;

            mockEvent = {
                preventDefault: jasmine.createSpy('preventDefault'),
                dataTransfer,
            } as unknown as DragEvent;

            boardServiceSpy.tiles = [
                { position: { x: 0, y: 0 }, item: { id: 41, name: 'other' } } as Tile,
                { position: { x: 2, y: 2 }, item: { id: 42, name: 'testItem' } } as Tile,
            ];

            Object.defineProperty(itemSelectorServiceSpy, 'items', {
                value: [{ id: 1, name: 'testItem', isOutOfContainer: true }] as Item[],
                writable: true,
            });

            boardServiceSpy.isTileBlocked.and.returnValue(false);
            boardServiceSpy.isReturningToContainer.and.returnValue(false);
            boardServiceSpy.isMovingWithinMap.and.returnValue(false);
            boardServiceSpy.isAddingNewItem.and.returnValue(false);
            boardServiceSpy.isRandomItem.and.returnValue(false);
            boardServiceSpy.isSpawningItem.and.returnValue(false);

            spyOn(service, 'resetItemState');
        });

        it('should prevent default event behavior', () => {
            service.onDrop(mockEvent, mockTile);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should return early if itemName or itemId is invalid', () => {
            (dataTransfer.getData as jasmine.Spy).and.returnValue('');
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isTileBlocked).not.toHaveBeenCalled();
        });

        it('should find the correct item index', () => {
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isTileBlocked).toHaveBeenCalledWith(mockTile, 0);
        });

        it('should return early if isTileBlocked returns true', () => {
            boardServiceSpy.isTileBlocked.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isReturningToContainer).not.toHaveBeenCalled();
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should return early if isReturningToContainer returns true', () => {
            boardServiceSpy.isReturningToContainer.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isMovingWithinMap).not.toHaveBeenCalled();
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should return early if isMovingWithinMap returns true', () => {
            boardServiceSpy.isMovingWithinMap.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isAddingNewItem).not.toHaveBeenCalled();
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should return early if isAddingNewItem returns true', () => {
            boardServiceSpy.isAddingNewItem.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isRandomItem).not.toHaveBeenCalled();
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should return early if isRandomItem returns true', () => {
            boardServiceSpy.isRandomItem.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(boardServiceSpy.isSpawningItem).not.toHaveBeenCalled();
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should return early if isSpawningItem returns true', () => {
            boardServiceSpy.isSpawningItem.and.returnValue(true);
            service.onDrop(mockEvent, mockTile);
            expect(service.resetItemState).not.toHaveBeenCalled();
        });

        it('should call resetItemState if all conditions return false', () => {
            service.onDrop(mockEvent, mockTile);
            expect(service.resetItemState).toHaveBeenCalled();
        });
    });

    describe('onClickTile', () => {
        let mockEvent: MouseEvent;
        let mockTile: Tile;
        let selectedTile: Tile;

        beforeEach(() => {
            mockEvent = {
                button: 0,
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as MouseEvent;

            mockTile = {
                position: { x: 1, y: 1 },
                type: TILE_TYPES.door,
                item: { name: 'someItem' },
            } as Tile;

            selectedTile = {
                type: TILE_TYPES.wall,
            } as Tile;

            tileServiceSpy.getSelectedTile.and.returnValue(selectedTile);

            (service as any).isMouseMoving = false;
            (service as any).isMouseDown = true;
        });

        it('should also call clearTileWhenItem when door tile is selected and target has an item', () => {
            selectedTile.type = TILE_TYPES.door;
            mockTile.type = TILE_TYPES.ice;
            service.onClickTile(mockEvent, mockTile);
            expect(boardServiceSpy.clearTileWhenItem).toHaveBeenCalledWith(mockTile, selectedTile);
        });

        it('should not proceed if mouse is moving', () => {
            (service as any).isMouseMoving = true;
            service.onClickTile(mockEvent, mockTile);
            expect(boardServiceSpy.clearTileWhenItem).not.toHaveBeenCalled();
        });

        it('should not proceed if no tile is selected', () => {
            tileServiceSpy.getSelectedTile.and.returnValue(null);
            service.onClickTile(mockEvent, mockTile);
            expect(boardServiceSpy.clearTileWhenItem).not.toHaveBeenCalled();
        });
    });
});
