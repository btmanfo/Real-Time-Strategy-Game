/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable @typescript-eslint/no-shadow */
// Les variables sont réutilisées pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
// eslint-disable-file no-use-before-define
// On ne peut pas utiliser de fonctions avant de les avoir définies

import { TestBed } from '@angular/core/testing';
import { ITEM_TYPES, TILE_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { Item, Player, Tile } from '@common/interfaces';

describe('BoardService', () => {
    let service: BoardService;
    const MEDIUM_SIZE_MAP = 15;
    let itemServiceSpy: jasmine.SpyObj<ItemSelectorService>;
    beforeEach(() => {
        itemServiceSpy = jasmine.createSpyObj('ItemService', [
            'deselectItem',
            'selectItem',
            'selectItemIndex',
            'getSelectedItemIndex',
            'addDroppedItem',
            'items',
            'nSpawn',
            'nItems',
            'maxItems',
        ]);
        (itemServiceSpy as any).items = [{ isOutOfContainer: true }];
        (itemServiceSpy as any).nSpawn = 0;
        (itemServiceSpy as any).nItems = 0;
        (itemServiceSpy as any).maxItems = 5;

        TestBed.configureTestingModule({
            providers: [BoardService, { provide: ItemSelectorService, useValue: itemServiceSpy }],
        });

        service = TestBed.inject(BoardService);
    });

    it('should be created ', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize an empty map if  `setMap` is here with an empty board ', () => {
        service.setMap([], MEDIUM_SIZE_MAP);
        expect(service.getMap().length).toBe(MEDIUM_SIZE_MAP * MEDIUM_SIZE_MAP);
        expect(service.getMap().every((tile) => tile.traversable)).toBeTrue();
    });

    it('should copy the map given in  `setMap` instead of creating a new one', () => {
        const map: Tile[] = [
            { traversable: false, position: { x: 0, y: 0 }, item: { name: 'Rock', position: { x: 0, y: 0 } } as Item } as Tile,
            { traversable: true, position: { x: 1, y: 1 }, item: { name: '', position: {} } as Item } as Tile,
        ];

        service.setMap(map, MEDIUM_SIZE_MAP);
        expect(service.getMap()).toEqual(map);
    });

    it('should change the tile correctly', () => {
        const map: Tile[] = [
            { traversable: true, position: { x: 0, y: 0 }, item: { name: '', position: {} } as Item } as Tile,
            { traversable: true, position: { x: 1, y: 1 }, item: { name: '', position: {} } as Item } as Tile,
        ];
        service.setMap(map, MEDIUM_SIZE_MAP);
        const newTile: Tile = { traversable: false, position: { x: 0, y: 0 }, item: { name: 'Rock', position: { x: 0, y: 0 } } as Item } as Tile;
        service.changeTile(newTile);
        expect(service.getMap()[0]).toEqual(newTile);
    });

    it('should block tile if it is a door or wall and itemIndex is valid', () => {
        const tile = { type: TILE_TYPES.door } as any;
        expect(service.isTileBlocked(tile, 0)).toBeTrue();
        expect(itemServiceSpy.items[0].isOutOfContainer).toBeFalse();
    });

    it('should return to container if tile has an item and existingTileIndex is invalid', () => {
        const tile = { item: { name: 'item1' } } as any;
        expect(service.isReturningToContainer(tile, -1, 0)).toBeTrue();
        expect(itemServiceSpy.items[0].isOutOfContainer).toBeFalse();
    });

    it('should return true if same position', () => {
        spyOn(service, 'changeTile');
        const tile = { position: { x: 1, y: 1 }, item: null } as any;
        const originTile = { position: { x: 1, y: 1 } } as any;
        service.tiles = [originTile];

        expect(service.isMovingWithinMap(tile, 0, 'item1', 1)).toBeTrue();
        expect(service.changeTile).toHaveBeenCalledTimes(0);
    });
    it('should return true if item on tile', () => {
        spyOn(service, 'changeTile');
        const tile = { position: { x: 0, y: 0 }, item: { name: 'item' } as Item } as Tile;
        const originTile = { position: { x: 1, y: 1 } } as any;
        service.tiles = [originTile];

        expect(service.isMovingWithinMap(tile, 0, 'item1', 1)).toBeTrue();
        expect(service.changeTile).toHaveBeenCalledTimes(0);
    });
    it('should move item within map', () => {
        spyOn(service, 'changeTile');
        const tile = { position: { x: 1, y: 1 }, item: null } as any;
        const originTile = { position: { x: 0, y: 0 } } as any;
        service.tiles = [originTile];

        expect(service.isMovingWithinMap(tile, 0, 'item1', 1)).toBeTrue();
        expect(service.changeTile).toHaveBeenCalledTimes(2);
    });

    it('should place a tile', () => {
        const tile = { image: '', type: '' } as any;
        const selectedTile = { image: 'image1', type: 'grass' } as any;
        service.placeTile(tile, selectedTile);
        expect(tile.image).toBe('image1');
        expect(tile.type).toBe('grass');
    });

    it('should toggle a closed door', () => {
        const tile = { traversable: false, image: '' } as any;
        service.toggleDoor(tile);
        expect(tile.traversable).toBeTrue();
        expect(tile.image).toBe('./assets/images/Porte.png');
    });
    it('should toggle a opened door', () => {
        const tile = { traversable: true, image: '' } as any;
        service.toggleDoor(tile);
        expect(tile.traversable).toBeFalse();
        expect(tile.image).toBe('./assets/images/Porte.png');
    });

    it('should handle tile modification correctly', () => {
        const tile = { image: '', type: '' } as Tile;
        const selectedTile = { image: 'image1', type: 'grass' } as Tile;
        spyOn(service, 'shouldIgnoreDoorPlacement').and.returnValue(false);
        spyOn(service, 'isDoorInteraction').and.returnValue(false);
        spyOn(service, 'shouldRemoveItem').and.returnValue(false);
        spyOn(service, 'applyTileSelection');
        service.handleTileModification(tile, selectedTile);
        expect(service.applyTileSelection).toHaveBeenCalledWith(tile, selectedTile);
    });
    it('should change the tile image and type', () => {
        const tile = { image: '', type: '' } as Tile;
        const selectedTile = { image: 'image1', type: 'grass' } as Tile;
        service.applyTileSelection(tile, selectedTile);
        expect(tile.image).toBe('image1');
        expect(tile.type).toBe('grass');
    });
    it('should ignore door placement', () => {
        const tile = { type: TILE_TYPES.door } as Tile;
        const selectedTile = { type: TILE_TYPES.wall } as Tile;
        expect(service.shouldIgnoreDoorPlacement(tile, selectedTile)).toBeTrue();
    });
    it('should not clear tile if item not found', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'testItem' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };

        const mockItems = [{ name: 'test', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });

        service.removeItemFromTile(tile, { type: '' } as Tile);

        if (tile.item) {
            expect(tile.item.name).toBe('testItem');
            expect(mockItems[0].isOutOfContainer).toBe(true);
        }
    });
    it('should clear the tile and return the item to the container', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'testItem' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };

        const mockItems = [{ name: 'testItem', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });

        service.removeItemFromTile(tile, { type: '' } as Tile);

        if (tile.item) {
            expect(tile.item.name).toBe('');
            expect(mockItems[0].isOutOfContainer).toBe(false);
        }
    });

    it('should increment nSpawn if item is spawn', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'spawn' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };
        itemServiceSpy.nSpawn = 1;
        const mockItems = [{ name: 'spawn', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });
        service.removeItemFromTile(tile, { type: '' } as Tile);
        expect(itemServiceSpy.nSpawn).toBe(2);
    });

    it('should handle tile modification correctly', () => {
        const tile = { image: '', type: '' } as Tile;
        const selectedTile = { image: 'image1', type: 'grass' } as Tile;
        spyOn(service, 'shouldIgnoreDoorPlacement').and.returnValue(false);
        spyOn(service, 'isDoorInteraction').and.returnValue(false);
        spyOn(service, 'shouldRemoveItem').and.returnValue(false);
        spyOn(service, 'applyTileSelection');

        service.handleTileModification(tile, selectedTile);

        expect(service.applyTileSelection).toHaveBeenCalledWith(tile, selectedTile);
    });

    it('should handle tile modification with door interaction', () => {
        const tile = { image: '', type: 'door' } as Tile;
        const selectedTile = { image: 'image1', type: 'door' } as Tile;
        spyOn(service, 'shouldIgnoreDoorPlacement').and.returnValue(false);
        spyOn(service, 'isDoorInteraction').and.returnValue(true);
        spyOn(service, 'handleDoorInteraction');

        service.handleTileModification(tile, selectedTile);

        expect(service.handleDoorInteraction).toHaveBeenCalledWith(tile);
    });

    it('should handle tile modification with item removal', () => {
        const tile = { image: '', type: '', item: { name: 'item1' } } as Tile;
        const selectedTile = { image: 'image1', type: 'empty' } as Tile;
        spyOn(service, 'shouldIgnoreDoorPlacement').and.returnValue(false);
        spyOn(service, 'isDoorInteraction').and.returnValue(false);
        spyOn(service, 'shouldRemoveItem').and.returnValue(true);
        spyOn(service, 'handleItemRemoval');

        service.handleTileModification(tile, selectedTile);

        expect(service.handleItemRemoval).toHaveBeenCalledWith(tile);
    });
    it('should handle door interaction when type is door', () => {
        const mockTile = { traversable: false, image: 'image1', type: 'Porte' } as Tile;
        expect(service.isDoorInteraction(mockTile, mockTile)).toBeTrue();
    });
    it('should handle door interaction when type is not door', () => {
        const mockTile = { traversable: false, image: 'image1', type: 'eau' } as Tile;
        expect(service.isDoorInteraction(mockTile, mockTile)).toBeFalse();
    });
    it('should clear the tile and return the item to the container', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'testItem' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };

        const mockItems = [{ name: 'testItem', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });

        service.clearTileWhenItem(tile, { type: '' } as Tile);

        if (tile.item) {
            expect(tile.item.name).toBe('');
            expect(mockItems[0].isOutOfContainer).toBe(false);
        }
    });
    it('should handle shouldRemoveItem when type is door', () => {
        const mockTile = { type: TILE_TYPES.water, item: { name: 'item1' } } as Tile;
        const mockSelectedTile = { type: TILE_TYPES.door } as Tile;
        expect(service.shouldRemoveItem(mockTile, mockSelectedTile)).toBeFalse();
    });
    it('should handle shouldRemoveItem when type is wall', () => {
        const mockTile = { type: TILE_TYPES.water, item: { name: 'item1' } } as Tile;
        const mockSelectedTile = { type: TILE_TYPES.wall } as Tile;
        expect(service.shouldRemoveItem(mockTile, mockSelectedTile)).toBeTrue();
    });
    it('should handle shouldRemoveItem when type is neither wall or door', () => {
        const mockTile = { type: TILE_TYPES.ice, item: { name: 'item1' } } as Tile;
        const mockSelectedTile = { type: TILE_TYPES.water } as Tile;
        expect(service.shouldRemoveItem(mockTile, mockSelectedTile)).toBeFalse();
    });
    it('should handle shouldRemoveItem when no item', () => {
        const mockTile = { type: TILE_TYPES.water, item: { name: '' } } as Tile;
        const mockSelectedTile = { type: TILE_TYPES.wall } as Tile;
        expect(service.shouldRemoveItem(mockTile, mockSelectedTile)).toBeFalse();
    });
    it('should handle if item has no name', () => {
        const mockTile = { type: TILE_TYPES.water, item: {} } as Tile;
        const mockSelectedTile = { type: TILE_TYPES.wall } as Tile;
        expect(service.shouldRemoveItem(mockTile, mockSelectedTile)).toBeFalse();
    });
    it('should not clear tile if item not found', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'testItem' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };

        const mockItems = [{ name: 'test', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });

        service.clearTileWhenItem(tile, { type: '' } as Tile);

        if (tile.item) {
            expect(tile.item.name).toBe('testItem');
            expect(mockItems[0].isOutOfContainer).toBe(true);
        }
    });
    it('should increment nSpawn if item is spawn', () => {
        const tile: Tile = {
            position: { x: 0, y: 0 },
            item: { name: 'spawn' } as Item,
            image: '',
            type: '',
            traversable: true,
            player: {} as Player,
            cost: 0,
        };
        itemServiceSpy.nSpawn = 1;
        const mockItems = [{ name: 'spawn', isOutOfContainer: true } as Item];

        Object.defineProperty(itemServiceSpy, 'items', {
            get: () => mockItems,
            configurable: true,
        });
        service.clearTileWhenItem(tile, { type: '' } as Tile);
        expect(itemServiceSpy.nSpawn).toBe(2);
    });

    it('should handle door interaction by toggling traversability and image', () => {
        const tile: Tile = {
            position: { x: 1, y: 1 },
            type: TILE_TYPES.door,
            traversable: false,
            image: './assets/images/Porte.png',
            item: null,
            player: {} as Player,
            cost: 0,
        };
        service.handleDoorInteraction(tile);
        expect(tile.traversable).toBe(true);
        expect(tile.image).toBe('./assets/images/Porte-ferme.png');
        service.handleDoorInteraction(tile);
        expect(tile.traversable).toBe(false);
        expect(tile.image).toBe('./assets/images/Porte.png');
    });

    it('should clear the tile', () => {
        const tile: Tile = {
            position: { x: 1, y: 1 },
            cost: 0,
            type: TILE_TYPES.wall,
            image: 'some-image',
            item: null,
            player: {} as Player,
            traversable: true,
        };
        service.clearTile(tile);
        expect(tile.image).toBe('');
        expect(tile.type).toBe('');
    });
    it('should ignore door placement if conditions are met', () => {
        const tile = { type: TILE_TYPES.door } as Tile;
        const selectedTile = { type: TILE_TYPES.wall } as Tile;

        spyOn(service, 'shouldIgnoreDoorPlacement').and.returnValue(true);
        spyOn(service, 'applyTileSelection');

        service.handleTileModification(tile, selectedTile);

        expect(service.applyTileSelection).not.toHaveBeenCalled();
    });
    it('should handle if no tile is selected', () => {
        const tile: Tile = {} as Tile;
        const selectedTile: Tile = {} as Tile;
        service.applyTileSelection(tile, selectedTile);
        expect(tile.image).toBe('');
        expect(tile.type).toBe('');
    });
    it('should return false when itemIndex is less than 0', () => {
        const tile: Tile = { type: TILE_TYPES.door, position: { x: 0, y: 0 }, player: {} as Player } as Tile;
        const itemIndex = -1;

        const result = service.isTileBlocked(tile, itemIndex);
        expect(result).toBeFalse();
    });
    it('should return false when tile.item.name is falsy', () => {
        const tile: Tile = { item: null, cost: 0, position: { x: 0, y: 0 }, player: {} as Player, image: '', type: '', traversable: true };
        const existingTileIndex = -1;
        const itemIndex = 1;

        const result = service.isReturningToContainer(tile, existingTileIndex, itemIndex);
        expect(result).toBeFalse();
    });
    it('should return false when tile existing index is lower than 0 ', () => {
        const tile: Tile = { position: { x: 1, y: 1 }, cost: 0, item: null, traversable: true, player: {} as Player, image: '', type: '' };
        const existingTileIndex = -1;
        const data = 'newItem';
        const id = 123;
        const result = service.isMovingWithinMap(tile, existingTileIndex, data, id);
        expect(result).toBeFalse();
    });
    it('should handle when getSelectedindex is null ', () => {
        const tile: Tile = {
            position: { x: 1, y: 1 },
            cost: 0,
            item: { name: '' } as Item,
            traversable: true,
            player: {} as Player,
            image: '',
            type: '',
        };
        itemServiceSpy.getSelectedItemIndex.and.returnValue(null);
        const existingTileIndex = 0;
        const data = 'newItem';
        const id = 123;
        service.tiles = [{ position: { x: 1, y: 1 } } as Tile];

        const result = service.isMovingWithinMap(tile, existingTileIndex, data, id);
        expect(result).toBeTrue();
    });

    describe('MapService - isSpawningItem', () => {
        let service: BoardService;
        let mockItemService: jasmine.SpyObj<ItemSelectorService>;
        let mockItems: Item[];

        beforeEach(() => {
            mockItemService = jasmine.createSpyObj('ItemService', ['addDroppedItem', 'getSelectedItemIndex']);

            mockItems = [
                { name: 'item1', isOutOfContainer: false, id: 1, position: { x: 1, y: 1 }, image: '', type: '', description: '' },
                { name: 'item2', isOutOfContainer: false, id: 2, position: { x: 2, y: 2 }, image: '', type: '', description: '' },
                {
                    name: ITEM_TYPES.spawn,
                    isOutOfContainer: false,
                    id: 6,
                    position: { x: 3, y: 3 },
                    image: '',
                    type: ITEM_TYPES.spawn,
                    description: '',
                },
            ];

            Object.defineProperty(mockItemService, 'items', { get: () => mockItems });

            service = new BoardService(mockItemService);
        });
        it('should return true and decrement nSpawn if data is a spawn and nSpawn is more than 0', () => {
            mockItemService.nSpawn = 2;
            mockItemService.getSelectedItemIndex.and.returnValue(0);
            const tile: Tile = { position: { x: 1, y: 1 }, image: 'tile.png' } as Tile;
            const result = service.isSpawningItem(tile, ITEM_TYPES.spawn, 10);
            expect(result).toBeTrue();
            expect(mockItemService.nSpawn).toBe(1);
            expect(mockItemService.addDroppedItem).toHaveBeenCalled();
        });
        it('should return false if nspawn is equal to 0 ', () => {
            mockItemService.nSpawn = 0;

            const tile: Tile = { position: { x: 3, y: 3 }, image: 'tile.png' } as Tile;
            const result = service.isSpawningItem(tile, ITEM_TYPES.spawn, 30);

            expect(result).toBeFalse();
            expect(mockItemService.addDroppedItem).not.toHaveBeenCalled();
        });
        it('should handle when getSelectedindex is null ', () => {
            mockItemService.nSpawn = 2;
            mockItemService.getSelectedItemIndex.and.returnValue(null);

            const tile: Tile = { position: { x: 1, y: 1 }, image: 'tile.png' } as Tile;
            const result = service.isSpawningItem(tile, ITEM_TYPES.spawn, 10);

            expect(result).toBeTrue();
            expect(mockItemService.nSpawn).toBe(1);
            expect(mockItemService.addDroppedItem).toHaveBeenCalled();
        });

        it('should return false if data is not "spawn"', () => {
            mockItemService.nSpawn = 5;

            const tile: Tile = { position: { x: 4, y: 4 }, image: 'tile.png' } as Tile;
            const result = service.isSpawningItem(tile, 'autre_item', 40);

            expect(result).toBeFalse();
            expect(mockItemService.addDroppedItem).not.toHaveBeenCalled();
        });
    });

    describe('MapService - handleItemRemoval', () => {
        let service: BoardService;
        let mockItemService: jasmine.SpyObj<ItemSelectorService>;
        let mockItems: Item[];

        beforeEach(() => {
            mockItemService = jasmine.createSpyObj('ItemService', [], ['items']);

            mockItems = [
                { name: 'item1', isOutOfContainer: true, id: 1, position: { x: 1, y: 1 }, image: '', type: '', description: '' },
                { name: ITEM_TYPES.spawn, isOutOfContainer: true, id: 2, position: { x: 2, y: 2 }, image: '', type: '', description: '' },
                { name: 'item3', isOutOfContainer: true, id: 3, position: { x: 3, y: 3 }, image: '', type: '', description: '' },
            ];

            Object.defineProperty(mockItemService, 'items', { get: () => mockItems });

            service = new BoardService(mockItemService);
        });

        it('should set isOutOfContainer to false for the corresponding item', () => {
            const tile: Tile = { item: { name: 'item1' } } as Tile;

            service.handleItemRemoval(tile);

            expect(mockItems[0].isOutOfContainer).toBeFalse();
        });
        it('should not delete the item if it is not found', () => {
            const tile: Tile = { item: { name: 'item10' } } as Tile;

            service.handleItemRemoval(tile);

            expect(mockItems[0].name).not.toEqual('');
        });
        it('should increment nSpawn if item is deleted si a spawn', () => {
            mockItemService.nSpawn = 2;
            const tile: Tile = { item: { name: ITEM_TYPES.spawn } } as Tile;

            service.handleItemRemoval(tile);

            expect(mockItemService.nSpawn).toBe(3);
        });

        it('should clear the item field of the tile after the delete', () => {
            const tile: Tile = { item: { name: 'item1' } } as Tile;

            service.handleItemRemoval(tile);

            expect(tile.item?.name).toBe('');
        });
    });

    it('should return null if no tile is found at the given position', () => {
        const position = { x: 2, y: 2 };
        const tile = service.getTile(position);
        expect(tile).toBeNull();
    });

    it('should not update the tile if no tile is found at the given position', () => {
        const originalTiles = [...service.tiles];
        const newTile: Tile = { position: { x: 2, y: 2 }, isHighlighted: true } as Tile;
        service.updateTiles(newTile);
        expect(service.tiles).toEqual(originalTiles);
    });

    it('should highlight the tiles in the given path', () => {
        const itemServiceSpy = jasmine.createSpyObj('ItemService', ['deselectItem', 'selectItem', 'selectItemIndex', 'getSelectedItemIndex'], {
            items: [{ isOutOfContainer: true }],
            nItems: 0,
        });

        const service = new BoardService(itemServiceSpy);
        service.tiles = [
            { position: { x: 0, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 0, y: 1 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 1 }, isHighlighted: false } as Tile,
        ];

        const path: Tile[] = [service.tiles[0], service.tiles[2]];
        service.highlightPath(path);
        expect(service.tiles[0].isHighlighted).toBeTrue();
        expect(service.tiles[2].isHighlighted).toBeTrue();
        expect(service.tiles[1].isHighlighted).toBeFalse();
        expect(service.tiles[3].isHighlighted).toBeFalse();
        expect(service.highlightedTiles).toEqual(path);
    });

    it('should handle a path with duplicate tiles', () => {
        const itemServiceSpy = jasmine.createSpyObj('ItemService', ['deselectItem', 'selectItem', 'selectItemIndex', 'getSelectedItemIndex'], {
            items: [{ isOutOfContainer: true }],
            nItems: 0,
        });

        const service = new BoardService(itemServiceSpy);
        service.tiles = [
            { position: { x: 0, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 0, y: 1 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 1 }, isHighlighted: false } as Tile,
        ];

        const path: Tile[] = [service.tiles[0], service.tiles[0]];
        service.highlightPath(path);
        expect(service.tiles[0].isHighlighted).toBeTrue();
        expect(service.highlightedTiles).toEqual(path);
    });

    it('should clear all highlighted tiles', () => {
        const itemServiceSpy = jasmine.createSpyObj('ItemService', ['deselectItem', 'selectItem', 'selectItemIndex', 'getSelectedItemIndex'], {
            items: [{ isOutOfContainer: true }],
            nItems: 0,
        });

        const service = new BoardService(itemServiceSpy);
        service.tiles = [
            { position: { x: 0, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 0, y: 1 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 1 }, isHighlighted: false } as Tile,
        ];

        const path: Tile[] = [service.tiles[1], service.tiles[3]];
        service.highlightPath(path);
        service.clearHighlightedPath();
        expect(service.tiles.every((tile) => tile.isHighlighted === false)).toBeTrue();
        expect(service.highlightedTiles).toEqual([]);
    });

    it('should handle clearing when no tiles are highlighted', () => {
        const itemServiceSpy = jasmine.createSpyObj('ItemService', ['deselectItem', 'selectItem', 'selectItemIndex', 'getSelectedItemIndex'], {
            items: [{ isOutOfContainer: true }],
            nItems: 0,
        });

        const service = new BoardService(itemServiceSpy);
        service.tiles = [
            { position: { x: 0, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 0 }, isHighlighted: false } as Tile,
            { position: { x: 0, y: 1 }, isHighlighted: false } as Tile,
            { position: { x: 1, y: 1 }, isHighlighted: false } as Tile,
        ];

        service.clearHighlightedPath();
        expect(service.highlightedTiles).toEqual([]);
    });

    it('should update the tile if a tile is found at the given position', () => {
        const originalTiles = [
            { position: { x: 1, y: 1 }, isHighlighted: false } as Tile,
            { position: { x: 0, y: 0 }, isHighlighted: false } as Tile,
        ];
        service.tiles = [...originalTiles];
        const newTile: Tile = { position: { x: 1, y: 1 }, isHighlighted: true } as Tile;
        service.updateTiles(newTile);
        expect(service.tiles[0]).toEqual(newTile);
    });

    it('should return the tile if a tile is found at the given position', () => {
        const tile1: Tile = { position: { x: 1, y: 1 }, isHighlighted: false } as Tile;
        const tile2: Tile = { position: { x: 0, y: 0 }, isHighlighted: false } as Tile;
        service.tiles = [tile1, tile2];
        const position = { x: 1, y: 1 };
        const result = service.getTile(position);
        expect(result).toEqual(tile1);
    });

    describe('isRandomItem', () => {
        it('should return true and add a random item if conditions are met', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 } } as Tile;
            const mockData = ITEM_TYPES.random;
            const mockId = 123;

            itemServiceSpy.nItems = 0;
            itemServiceSpy.maxItems = 5;
            spyOn(service as any, 'outOfContainer');
            spyOn(service as any, 'updateTile');

            const result = service.isRandomItem(mockTile, mockData, mockId);

            expect(result).toBeTrue();
            expect(itemServiceSpy.nItems).toBe(1);
            expect(itemServiceSpy.addDroppedItem).toHaveBeenCalledWith(
                jasmine.objectContaining({ name: mockData, id: mockId, position: mockTile.position }),
            );
            expect((service as any).outOfContainer).toHaveBeenCalledWith(jasmine.any(Number), true);
            expect((service as any).updateTile).toHaveBeenCalledWith(mockTile, {
                tileName: mockData,
                tileID: mockId,
                tileCoordinate: mockTile.position,
            });
        });

        it('should return false if the item type is not random', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 } } as Tile;
            const mockData = 'non-random-item';
            const mockId = 123;

            const result = service.isRandomItem(mockTile, mockData, mockId);

            expect(result).toBeFalse();
        });

        it('should return false if the number of items exceeds the maximum', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 } } as Tile;
            const mockData = ITEM_TYPES.random;
            const mockId = 123;

            itemServiceSpy.nItems = 5;
            itemServiceSpy.maxItems = 5;

            const result = service.isRandomItem(mockTile, mockData, mockId);

            expect(result).toBeFalse();
        });

        it('should not add an item or update the tile if conditions are not met', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 } } as Tile;
            const mockData = ITEM_TYPES.random;
            const mockId = 123;

            itemServiceSpy.nItems = 5;
            itemServiceSpy.maxItems = 5;
            spyOn(service as any, 'outOfContainer');
            spyOn(service as any, 'updateTile');

            const result = service.isRandomItem(mockTile, mockData, mockId);

            expect(result).toBeFalse();
            expect(itemServiceSpy.addDroppedItem).not.toHaveBeenCalled();
            expect((service as any).outOfContainer).not.toHaveBeenCalled();
            expect((service as any).updateTile).not.toHaveBeenCalled();
        });
    });

    describe('isAddingNewItem', () => {
        it('should return true and add a new item if conditions are met', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null, image: '' } as Tile;
            const mockItemName = 'testItem';
            const mockItemId = 123;
            const mockItem = { name: mockItemName, isOutOfContainer: true, id: mockItemId, position: mockTile.position, image: '' };
            (itemServiceSpy as any).items = [
                { name: 'testItem', isOutOfContainer: false, id: 1, position: { x: 1, y: 1 }, image: '', type: '', description: '' },
                { name: 'item2', isOutOfContainer: false, id: 2, position: { x: 2, y: 2 }, image: '', type: '', description: '' },
                {
                    name: ITEM_TYPES.spawn,
                    isOutOfContainer: false,
                    id: 3,
                    position: { x: 3, y: 3 },
                    image: '',
                    type: ITEM_TYPES.spawn,
                    description: '',
                },
            ];
            service.tiles = [
                { position: { x: 1, y: 1 }, image: '' } as Tile,
                { position: { x: 2, y: 2 }, image: '' } as Tile,
                { position: { x: 3, y: 3 }, image: '' } as Tile,
            ];
            itemServiceSpy.nItems = 0;
            itemServiceSpy.maxItems = 5;
            spyOn(service, 'changeTile');

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeTrue();
            expect(itemServiceSpy.addDroppedItem).toHaveBeenCalledWith({
                name: mockItemName,
                isOutOfContainer: true,
                position: mockTile.position,
                id: mockItemId,
                image: '',
                type: '',
                description: '',
            } as Item);
            expect(service.changeTile).toHaveBeenCalledWith({
                item: { ...mockItem, type: '', description: '' },
                position: mockTile.position,
                image: '',
            } as Tile);
            expect(itemServiceSpy.nItems).toBe(1);
        });

        it('should return true if the tile already has an item', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: { name: 'existingItem' } as Item } as Tile;
            const mockItemName = 'testItem';
            const mockItemId = 123;

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeTrue();
        });

        it('should not increment nItems if the item type is a flag', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null } as Tile;
            const mockItemName = 'chestbox-2';
            const mockItemId = 123;
            (itemServiceSpy as any).items = [
                { name: 'chestbox-2', isOutOfContainer: false, id: 1, position: { x: 1, y: 1 }, image: '', type: 'Drapeau', description: '' },
                { name: 'item2', isOutOfContainer: false, id: 2, position: { x: 2, y: 2 }, image: '', type: '', description: '' },
            ];
            itemServiceSpy.nItems = 0;
            itemServiceSpy.maxItems = 5;
            spyOn(service, 'changeTile');

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeTrue();
            expect(itemServiceSpy.nItems).toBe(0);
        });

        it('should return false if the item name is "spawn"', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null } as Tile;
            const mockItemName = ITEM_TYPES.spawn;
            const mockItemId = 123;

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeFalse();
        });

        it('should return false if the item name is "random"', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null } as Tile;
            const mockItemName = ITEM_TYPES.random;
            const mockItemId = 123;

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeFalse();
        });

        it('should return false if the number of items exceeds the maximum and the item is not "chestbox-2"', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null } as Tile;
            const mockItemName = 'testItem';
            const mockItemId = 123;

            itemServiceSpy.nItems = 5;
            itemServiceSpy.maxItems = 5;

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeFalse();
        });

        it('should allow adding "chestbox-2" even if the number of items exceeds the maximum', () => {
            const mockTile: Tile = { position: { x: 1, y: 1 }, item: null, image: 'image.png' } as Tile;
            const mockItemName = 'chestbox-2';
            const mockItemId = 123;
            const mockItem = { name: 'chestbox-2', isOutOfContainer: false, id: 1, position: { x: 1, y: 1 } };
            const mockImage = 'image.png';
            service.tiles = [{ position: { x: 1, y: 1 }, image: mockImage } as Tile];
            (itemServiceSpy as any).items = [mockItem];
            itemServiceSpy.nItems = 5;
            itemServiceSpy.maxItems = 5;
            spyOn(service, 'changeTile');

            const result = service.isAddingNewItem(mockTile, mockItemName, mockItemId);

            expect(result).toBeTrue();
            expect(itemServiceSpy.addDroppedItem).toHaveBeenCalledWith({
                name: mockItemName,
                position: mockTile.position,
                isOutOfContainer: true,
                id: mockItemId,
            } as Item);
            expect(service.changeTile).toHaveBeenCalledWith({ item: mockItem, position: mockTile.position, image: mockImage } as Tile);
        });
    });
    describe('toggleDoor', () => {
        it('should make the door traversable and change the image to "Porte-ferme.png" if it is currently not traversable', () => {
            const mockTile: Tile = {
                traversable: false,
                image: './assets/images/Porte.png',
            } as Tile;

            service.toggleDoor(mockTile);

            expect(mockTile.traversable).toBeTrue();
            expect(mockTile.image).toBe('./assets/images/Porte-ferme.png');
        });

        it('should make the door not traversable and change the image to "Porte.png" if it is currently traversable', () => {
            const mockTile: Tile = {
                traversable: true,
                image: './assets/images/Porte-ferme.png',
            } as Tile;

            service.toggleDoor(mockTile);

            expect(mockTile.traversable).toBeFalse();
            expect(mockTile.image).toBe('./assets/images/Porte.png');
        });

        it('should toggle the door image correctly even if the image is not initially set to "Porte.png" or "Porte-ferme.png"', () => {
            const mockTile: Tile = {
                traversable: false,
                image: 'some-other-image.png',
            } as Tile;

            service.toggleDoor(mockTile);

            expect(mockTile.traversable).toBeTrue();
            expect(mockTile.image).toBe('./assets/images/Porte.png');
        });
    });

    it('should return the correct tile when position matches', () => {
        const mockTile: Tile = { position: { x: 2, y: 3 } } as Tile;
        service.tiles = [mockTile];
        const result = service.findTileByPosition({ x: 2, y: 3 });
        expect(result).toBe(mockTile);
    });

    it('should return undefined when no tile matches the given position', () => {
        service.tiles = [{ position: { x: 1, y: 1 } } as Tile];
        const result = service.findTileByPosition({ x: 0, y: 0 });
        expect(result).toBeUndefined();
    });

    it('should return the tile that matches the player coordinate', () => {
        const player: Player = { coordinate: { x: 2, y: 3 } } as Player;
        const matchingTile: Tile = { position: { x: 2, y: 3 } } as Tile;
        const otherTile: Tile = { position: { x: 1, y: 1 } } as Tile;

        service.tiles = [otherTile, matchingTile];

        const result = service.findTileByPlayerPosition(player);
        expect(result).toBe(matchingTile);
    });

    it('should return the tile that matches the player coordinate', () => {
        const player: Player = { coordinate: { x: 3, y: 4 } } as Player;
        const tile: Tile = { position: { x: 3, y: 4 } } as Tile;

        service.tiles = [tile];

        const result = service.findTileByPlayerPosition(player);
        expect(result).toBe(tile);
    });

    it('should return null when no tile matches the player coordinate', () => {
        const player: Player = { coordinate: { x: 10, y: 10 } } as Player;
        service.tiles = [{ position: { x: 1, y: 1 } } as Tile];

        const result = service.findTileByPlayerPosition(player);
        expect(result).toBeNull();
    });
});
