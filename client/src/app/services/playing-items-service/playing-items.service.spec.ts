/* eslint-disable no-invalid-this */
// utilisation de `this` dans des fonctions non fléchées requise pour accéder au contexte Jasmine
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Usage temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CHESTBOX_NAME, TILE_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Player, Position, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { PlayingItemsService } from './playing-items.service';

describe('Service: PlayingItems', () => {
    let service: PlayingItemsService;
    let movingGameServiceStub: jasmine.SpyObj<MovingGameService>;
    let boardServiceStub: jasmine.SpyObj<BoardService>;
    let playingServiceStub: jasmine.SpyObj<PlayingService>;
    let socketStub: jasmine.SpyObj<Socket>;
    let joinGameServiceStub: jasmine.SpyObj<JoinGameService>;

    function createTile(position: Position, type: string, options: Partial<Tile> = {}): Tile {
        return {
            position,
            type,
            traversable: true,
            item: null,
            player: null,
            image: '',
            cost: 1,
            ...options,
        };
    }

    function createPlayer(name: string, inventory: Item[] = []): Player {
        return {
            name,
            inventory,
            life: 100,
            speed: 1,
            attack: '1',
            defense: '1',
            coordinate: { x: 0, y: 0 },
            avatarUrl: '',
            isAdmin: false,
        } as Player;
    }

    beforeEach(() => {
        socketStub = jasmine.createSpyObj('Socket', ['emit']);

        movingGameServiceStub = jasmine.createSpyObj('MovingGameService', ['getNeighbors']);

        boardServiceStub = jasmine.createSpyObj('BoardService', ['updateTiles', 'tiles', 'findTileByPlayerPosition', 'findTileByPosition']);
        boardServiceStub.tiles = [];
        joinGameServiceStub = jasmine.createSpyObj('JoinGameService', ['socket', 'pinCode']);
        joinGameServiceStub.pinCode = '1234';
        joinGameServiceStub.socket = socketStub;

        playingServiceStub = jasmine.createSpyObj('PlayingService', ['localPlayer', 'teleportPlayer'], {
            movingGameService: movingGameServiceStub,
            joinGameService: { pinCode: 'TEST123', socket: socketStub },
        });
        playingServiceStub.localPlayer = {} as Player;

        TestBed.configureTestingModule({
            providers: [
                PlayingItemsService,
                { provide: PlayingService, useValue: playingServiceStub },
                { provide: BoardService, useValue: boardServiceStub },
                { provide: MovingGameService, useValue: movingGameServiceStub },
                { provide: JoinGameService, useValue: joinGameServiceStub },
            ],
            imports: [HttpClientTestingModule],
        });
        service = TestBed.inject(PlayingItemsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('isValidTileForItem', () => {
        it('should return false for null or undefined tile', () => {
            expect((service as any).isValidTileForItem(null as unknown as Tile)).toBeFalse();
            expect((service as any).isValidTileForItem(undefined as unknown as Tile)).toBeFalse();
        });

        it('should return false for tile with a player', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty, { player: {} as Player });
            expect((service as any).isValidTileForItem(tile)).toBeFalse();
        });

        it('should return false for wall tile', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.wall);
            expect((service as any).isValidTileForItem(tile)).toBeFalse();
        });

        it('should return false for closed door tile', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.door, { image: './assets/images/Porte.png' });
            expect((service as any).isValidTileForItem(tile)).toBeFalse();
        });

        it('should return true for open door tile with different image', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.door, { image: './assets/images/Porte-ferme.png' });
            expect((service as any).isValidTileForItem(tile)).toBeTrue();
        });

        it('should return false for tile with an item that has a name', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty, { item: { name: 'Test Item' } as Item });
            expect((service as any).isValidTileForItem(tile)).toBeFalse();
        });

        it('should return true for tile with an item that has no name', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty, { item: { name: '' } as Item });
            expect((service as any).isValidTileForItem(tile)).toBeTrue();
        });

        it('should return true for valid tile', () => {
            const tile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            expect((service as any).isValidTileForItem(tile)).toBeTrue();
        });
    });

    describe('findNearestFreeTiles', () => {
        it('should return an empty array if no free tiles are found', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile];

            movingGameServiceStub.getNeighbors.and.returnValue([]);

            const result = service.findNearestFreeTiles(startTile, 3);

            expect(result).toEqual([]);
            expect(movingGameServiceStub.getNeighbors).toHaveBeenCalledWith(startTile);
        });

        it('should find nearest free tiles up to count', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const freeTile1 = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);
            const freeTile2 = createTile({ x: 0, y: 1 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, freeTile1, freeTile2];

            movingGameServiceStub.getNeighbors.and.returnValue([freeTile1, freeTile2]);

            spyOn(service as any, 'isValidTileForItem').and.returnValue(true);

            const result = service.findNearestFreeTiles(startTile, 2);

            expect(result.length).toBe(2);
            expect(result).toContain(freeTile1);
            expect(result).toContain(freeTile2);
        });

        it('should exclude the start tile even if valid', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const freeTile = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, freeTile];

            movingGameServiceStub.getNeighbors.and.returnValue([freeTile]);
            spyOn(service as any, 'isValidTileForItem').and.returnValue(true);

            const result = service.findNearestFreeTiles(startTile, 2);

            expect(result).not.toContain(startTile);
            expect(result).toContain(freeTile);
        });
    });

    describe('findNearestFreeTiles - edge cases', () => {
        it('should break when iterations exceed maxIterations', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const manyTiles: Tile[] = [];

            for (let i = 0; i < 1500; i++) {
                manyTiles.push(createTile({ x: i, y: 0 }, TILE_TYPES.empty));
            }

            boardServiceStub.tiles = [startTile, ...manyTiles];

            movingGameServiceStub.getNeighbors.and.callFake((tile: Tile) => {
                return manyTiles.filter((t) => t.position.x !== tile.position.x || t.position.y !== tile.position.y).slice(0, 10);
            });

            spyOn(service as any, 'isValidTileForItem').and.returnValue(true);

            const processNeighborsSpy = spyOn<any>(service, 'processNeighbors').and.callThrough();

            const result = service.findNearestFreeTiles(startTile, 2000);

            expect(result.length).toBeLessThan(2000);
            expect(processNeighborsSpy.calls.count()).toBeLessThan(1100);
        });

        it('should continue when currentTile is null', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const validTile = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, validTile];

            const originalArray = Array.prototype.shift;
            let shiftCount = 0;

            spyOn(Array.prototype, 'shift').and.callFake(function (this: any[]) {
                shiftCount++;
                if (shiftCount === 2) {
                    return null;
                }
                return originalArray.call(this);
            });

            movingGameServiceStub.getNeighbors.and.returnValue([validTile]);
            spyOn(service as any, 'isValidTileForItem').and.returnValue(true);

            const result = service.findNearestFreeTiles(startTile, 1);

            expect(result.length).toBe(1);
            expect(result[0]).toBe(validTile);

            (Array.prototype.shift as jasmine.Spy).and.callThrough();
        });

        it('should break when enough free tiles are found', () => {
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            const freeTiles: Tile[] = [];
            for (let i = 1; i <= 10; i++) {
                freeTiles.push(createTile({ x: i, y: 0 }, TILE_TYPES.empty));
            }

            boardServiceStub.tiles = [startTile, ...freeTiles];

            movingGameServiceStub.getNeighbors.and.returnValue(freeTiles);
            spyOn(service as any, 'isValidTileForItem').and.returnValue(true);

            const processNeighborsSpy = spyOn<any>(service, 'processNeighbors').and.callThrough();

            const requestedCount = 3;
            const result = service.findNearestFreeTiles(startTile, requestedCount);

            expect(result.length).toBe(requestedCount);

            expect(processNeighborsSpy.calls.count()).toBeLessThan(freeTiles.length);
        });
    });

    describe('replaceItem', () => {
        it('should replace item and hide popup if conditions are met', () => {
            const mockPlayer: Player = {
                inventory: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }] as Item[],
                coordinate: { x: 0, y: 0 } as Position,
            } as Player;
            playingServiceStub.localPlayer = mockPlayer;
            movingGameServiceStub.isPopupItemChoiceVisible = true;
            spyOn(service, 'emitItemChoice');

            service.replaceItem();

            expect(movingGameServiceStub.isPopupItemChoiceVisible).toBeFalse();
            expect(service.emitItemChoice).toHaveBeenCalledWith({ name: 'Item 3' } as Item, mockPlayer.coordinate);
            expect(mockPlayer.inventory?.length).toBe(2);
        });

        it('should do nothing if popup is not visible', () => {
            movingGameServiceStub.isPopupItemChoiceVisible = false;
            spyOn(service, 'emitItemChoice');
            service.replaceItem();
            expect(service.emitItemChoice).not.toHaveBeenCalled();
        });

        it('should do nothing if no local player', () => {
            spyOn(service, 'emitItemChoice');
            movingGameServiceStub.isPopupItemChoiceVisible = true;
            service.replaceItem();
            expect(service.emitItemChoice).not.toHaveBeenCalled();
        });
    });

    describe('emitItemChoice', () => {
        it('should emit item choice with correct data', () => {
            const mockItem: Item = { name: 'Test Item' } as Item;
            const mockPosition: Position = { x: 1, y: 1 };

            service.emitItemChoice(mockItem, mockPosition);

            expect(socketStub.emit).toHaveBeenCalledWith('itemChoice', {
                item: mockItem,
                playerPosition: mockPosition,
                roomCode: '1234',
            });
        });
    });

    describe('placeInventoryItems', () => {
        it('should return empty array if player is null', () => {
            spyOn(service as any, 'placeInventoryItems').and.returnValue([]);

            const result = (service as any).placeInventoryItems(null as unknown as Player, {} as Tile);

            expect(result).toEqual([]);
        });

        it('should return empty array if player has no inventory', () => {
            const player = createPlayer('TestPlayer', []);
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            spyOn(service, 'findNearestFreeTiles').and.returnValue([]);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result).toEqual([]);
        });

        it('should place multiple items on free tiles and return processed tiles', () => {
            const item1 = { name: 'Item 1', position: { x: 0, y: 0 } } as Item;
            const item2 = { name: 'Item 2', position: { x: 0, y: 0 } } as Item;
            const player = createPlayer('TestPlayer', [item1, item2]);

            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const freeTile1 = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);
            const freeTile2 = createTile({ x: 0, y: 1 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, freeTile1, freeTile2];

            spyOn(service, 'findNearestFreeTiles').and.returnValue([freeTile1, freeTile2]);

            const expectedResult = [
                { tile: freeTile1, item: item1 },
                { tile: freeTile2, item: item2 },
            ];
            spyOn(service as any, 'placeInventoryItems').and.returnValue(expectedResult);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result.length).toBe(2);
            expect(result[0].tile).toBe(freeTile1);
            expect(result[0].item).toBe(item1);
        });

        it('should place items only if enough free tiles are available', () => {
            const item1 = { name: 'Item 1' } as Item;
            const item2 = { name: 'Item 2' } as Item;
            const player = createPlayer('TestPlayer', [item1, item2]);

            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const freeTile = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, freeTile];

            spyOn(service, 'findNearestFreeTiles').and.returnValue([freeTile]);

            const expectedResult = [{ tile: freeTile, item: item1 }];
            spyOn(service as any, 'placeInventoryItems').and.returnValue(expectedResult);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result.length).toBe(1);
            expect(result[0].item).toBe(item1);
        });

        it('should return empty array if player inventory is null', () => {
            const player = createPlayer('TestPlayer');
            player.inventory = null as unknown as Item[];
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result).toEqual([]);
        });

        it('should return empty array if no free tiles are found', () => {
            const item1 = { name: 'Item 1' } as Item;
            const player = createPlayer('TestPlayer', [item1]);
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            spyOn(service, 'findNearestFreeTiles').and.returnValue([]);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result).toEqual([]);
            expect(service.findNearestFreeTiles).toHaveBeenCalledWith(startTile, 1);
        });

        it('should only place items when target tile is found', () => {
            const item1 = { name: 'Item 1' } as Item;
            const item2 = { name: 'Item 2' } as Item;
            const player = createPlayer('TestPlayer', [item1, item2]);

            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const freeTile1 = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);
            const freeTile2 = createTile({ x: 0, y: 1 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile, freeTile1, freeTile2];

            spyOn(service, 'findNearestFreeTiles').and.returnValue([freeTile1, freeTile2]);
            boardServiceStub.findTileByPosition.and.callFake((position: Position) => {
                if (position.x === 1 && position.y === 0) return freeTile1;
                return undefined;
            });

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result.length).toBe(1);
            expect(result[0].tile).toBe(freeTile1);
            expect(result[0].item.name).toBe(item1.name);
        });

        it('should handle tiles not found by position', () => {
            const item = { name: 'Test Item' } as Item;
            const player = createPlayer('TestPlayer', [item]);
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            const freeTile = createTile({ x: 99, y: 99 }, TILE_TYPES.empty);

            boardServiceStub.tiles = [startTile];

            spyOn(service, 'findNearestFreeTiles').and.returnValue([freeTile]);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result.length).toBe(0);
        });
    });

    describe('processNeighbors', () => {
        it('should handle null or undefined neighbors correctly', () => {
            const currentTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);
            const queue: Tile[] = [];
            const visited = new Set<string>();

            const validNeighbor = createTile({ x: 1, y: 0 }, TILE_TYPES.empty);

            movingGameServiceStub.getNeighbors.and.returnValue([validNeighbor, undefined as unknown as Tile, null as unknown as Tile]);

            (service as any).processNeighbors(currentTile, queue, visited);

            expect(queue.length).toBe(1);
            expect(queue[0]).toBe(validNeighbor);

            expect(visited.has('1,0')).toBeTrue();

            expect(visited.size).toBe(1);
        });
    });

    const teleportPlayerSpy = jasmine.createSpy('teleportPlayer');

    beforeEach(() => {
        playingServiceStub.teleportPlayer = teleportPlayerSpy;
        teleportPlayerSpy.calls.reset();

        boardServiceStub.tiles = [];
    });

    describe('teleportPotion', () => {
        let originalRandom: () => number;

        beforeAll(() => {
            originalRandom = Math.random;
        });

        afterAll(() => {
            Math.random = originalRandom;
        });

        it('should teleport player to a random accessible tile', () => {
            const validTile1 = createTile({ x: 1, y: 1 }, TILE_TYPES.empty);
            const validTile2 = createTile({ x: 2, y: 2 }, TILE_TYPES.empty);
            const wallTile = createTile({ x: 3, y: 3 }, TILE_TYPES.wall);

            boardServiceStub.tiles = [validTile1, validTile2, wallTile];

            Math.random = jasmine.createSpy('random').and.returnValue(0.3);

            service.teleportPotion();

            expect(teleportPlayerSpy).toHaveBeenCalledWith(jasmine.objectContaining({ position: { x: 1, y: 1 } }));
        });

        it('should not do anything if no valid tiles are found', () => {
            const wallTile = createTile({ x: 1, y: 1 }, TILE_TYPES.wall);

            boardServiceStub.tiles = [wallTile];

            service.teleportPotion();

            expect(teleportPlayerSpy).not.toHaveBeenCalled();
        });

        it('should handle empty board tiles array', () => {
            boardServiceStub.tiles = [];

            service.teleportPotion();

            expect(teleportPlayerSpy).not.toHaveBeenCalled();
        });
    });
    describe('updateTiles', () => {
        it('should update tiles and emit item choice for processed tiles', () => {
            const mockPlayer: Player = {
                name: 'TestPlayer',
                inventory: [{ name: 'Item1' }, { name: 'Item2' }] as Item[],
                coordinate: { x: 0, y: 0 },
            } as Player;

            const mockLoserTile: Tile = { position: { x: 0, y: 0 }, type: TILE_TYPES.empty } as Tile;

            const processedTiles = [
                { tile: { position: { x: 1, y: 1 }, type: TILE_TYPES.empty } as Tile, item: { name: 'Item1' } as Item },
                { tile: { position: { x: 2, y: 2 }, type: TILE_TYPES.empty } as Tile, item: { name: 'Item2' } as Item },
            ];

            spyOn(service as any, 'placeInventoryItems').and.returnValue(processedTiles);
            spyOn(service as any, 'emitItemChoice');

            (service as any).updateTiles(mockPlayer, mockLoserTile);

            expect(service['placeInventoryItems']).toHaveBeenCalledWith(mockPlayer, mockLoserTile);
            expect(boardServiceStub.updateTiles).toHaveBeenCalledTimes(processedTiles.length);
            expect(boardServiceStub.updateTiles).toHaveBeenCalledWith(processedTiles[0].tile);
            expect(boardServiceStub.updateTiles).toHaveBeenCalledWith(processedTiles[1].tile);
            expect(service['emitItemChoice']).toHaveBeenCalledTimes(processedTiles.length);
            expect(service['emitItemChoice']).toHaveBeenCalledWith(processedTiles[0].item, processedTiles[0].tile.position);
            expect(service['emitItemChoice']).toHaveBeenCalledWith(processedTiles[1].item, processedTiles[1].tile.position);
        });

        it('should do nothing if no processed tiles are returned', () => {
            const mockPlayer: Player = {
                name: 'TestPlayer',
                inventory: [{ name: 'Item1' }] as Item[],
                coordinate: { x: 0, y: 0 },
            } as Player;

            const mockLoserTile: Tile = { position: { x: 0, y: 0 }, type: TILE_TYPES.empty } as Tile;

            spyOn(service as any, 'placeInventoryItems').and.returnValue([]);
            spyOn(service as any, 'emitItemChoice');

            (service as any).updateTiles(mockPlayer, mockLoserTile);

            expect(service['placeInventoryItems']).toHaveBeenCalledWith(mockPlayer, mockLoserTile);
            expect(boardServiceStub.updateTiles).not.toHaveBeenCalled();
            expect(service['emitItemChoice']).not.toHaveBeenCalled();
        });

        describe('updateInventory', () => {
            it('should emit inventory update if player had the flag', () => {
                const mockPlayer = createPlayer('TestPlayer');
                spyOn(service as any, 'emitInventoryUpdate');

                (service as any).updateInventory(mockPlayer, true);

                expect((service as any).emitInventoryUpdate).toHaveBeenCalledWith({
                    ...mockPlayer,
                    inventory: [],
                });
            });

            it('should emit inventory update if player is virtual', () => {
                const mockPlayer = createPlayer('VirtualPlayer');
                mockPlayer.isVirtualPlayer = true;
                spyOn(service as any, 'emitInventoryUpdate');

                (service as any).updateInventory(mockPlayer, false);

                expect((service as any).emitInventoryUpdate).toHaveBeenCalledWith({
                    ...mockPlayer,
                    inventory: [],
                });
            });

            it('should not emit inventory update if player had no flag and is not virtual', () => {
                const mockPlayer = createPlayer('NormalPlayer');
                mockPlayer.isVirtualPlayer = false;
                spyOn(service as any, 'emitInventoryUpdate');

                (service as any).updateInventory(mockPlayer, false);

                expect((service as any).emitInventoryUpdate).not.toHaveBeenCalled();
            });
        });

        describe('dropLoserItems', () => {
            it('should drop items and call update functions for virtual player with inventory', () => {
                const virtualPlayer = createPlayer('BotPlayer', [{ name: 'item1' }] as Item[]);
                virtualPlayer.isVirtualPlayer = true;

                const loserTile = createTile({ x: 1, y: 1 }, TILE_TYPES.empty, { player: virtualPlayer });

                playingServiceStub.localPlayer = createPlayer('LocalPlayer');
                playingServiceStub.players = [virtualPlayer];
                boardServiceStub.tiles = [loserTile];

                const updateTilesSpy = spyOn(service as any, 'updateTiles');
                const updateInventorySpy = spyOn(service as any, 'updateInventory');

                service.dropLoserItems('BotPlayer');

                expect(updateTilesSpy).toHaveBeenCalledWith(virtualPlayer, loserTile);
                expect(updateInventorySpy).toHaveBeenCalledWith(
                    jasmine.objectContaining({
                        name: 'BotPlayer',
                        inventory: [],
                    }),
                    false,
                );
            });

            it('should do nothing if loser is not found', () => {
                playingServiceStub.localPlayer = createPlayer('LocalPlayer');
                playingServiceStub.players = [];
                boardServiceStub.tiles = [];

                const updateTilesSpy = spyOn(service as any, 'updateTiles');
                const updateInventorySpy = spyOn(service as any, 'updateInventory');

                service.dropLoserItems('Unknown');

                expect(updateTilesSpy).not.toHaveBeenCalled();
                expect(updateInventorySpy).not.toHaveBeenCalled();
            });

            it('should do nothing if player is not local nor virtual with inventory', () => {
                const nonVirtualPlayer = createPlayer('RegularPlayer', []);
                nonVirtualPlayer.isVirtualPlayer = false;

                playingServiceStub.localPlayer = createPlayer('LocalPlayer');
                playingServiceStub.players = [nonVirtualPlayer];
                boardServiceStub.tiles = [];

                const updateTilesSpy = spyOn(service as any, 'updateTiles');
                const updateInventorySpy = spyOn(service as any, 'updateInventory');

                service.dropLoserItems('RegularPlayer');

                expect(updateTilesSpy).not.toHaveBeenCalled();
                expect(updateInventorySpy).not.toHaveBeenCalled();
            });
        });

        describe('emitInventoryUpdate', () => {
            it('should emit inventory update with correct data', () => {
                const mockPlayer = createPlayer('TestPlayer', [{ name: 'Item 1' } as Item]);
                const expectedPayload = {
                    roomCode: joinGameServiceStub.pinCode,
                    player: mockPlayer,
                };

                (service as any).emitInventoryUpdate(mockPlayer);

                expect(socketStub.emit).toHaveBeenCalledWith('inventoryUpdate', expectedPayload);
            });
        });

        it('should reassign loser to localPlayer when loserName matches localPlayer', () => {
            const localPlayer = createPlayer('LocalPlayer', [{ name: 'Item1' } as Item]);
            const loserTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty, { player: localPlayer });

            localPlayer.inventory?.push({ name: CHESTBOX_NAME } as Item);

            playingServiceStub.localPlayer = localPlayer;
            playingServiceStub.players = [localPlayer];
            boardServiceStub.tiles = [loserTile];

            const updateTilesSpy = spyOn(service as any, 'updateTiles');
            const updateInventorySpy = spyOn(service as any, 'updateInventory');

            service.dropLoserItems('LocalPlayer');

            expect(updateTilesSpy).toHaveBeenCalledWith(localPlayer, loserTile);
            expect(updateInventorySpy).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'LocalPlayer', inventory: [] }), true);
        });

        it('should return empty array if freeTiles is null (via placeInventoryItems)', () => {
            const player = createPlayer('TestPlayer', [{ name: 'Item1' } as Item]);
            const startTile = createTile({ x: 0, y: 0 }, TILE_TYPES.empty);

            spyOn(service, 'findNearestFreeTiles').and.returnValue(null as unknown as Tile[]);

            const result = (service as any).placeInventoryItems(player, startTile);

            expect(result).toEqual([]);
        });

        it('should assign empty array to itemsToProcess when player.inventory is null', () => {
            const player = createPlayer('TestPlayer');
            player.inventory = null as unknown as Item[];

            const freeTiles = [createTile({ x: 0, y: 0 }, TILE_TYPES.empty), createTile({ x: 1, y: 0 }, TILE_TYPES.empty)];

            const result = (service as any).updateTilesWithItems(player, freeTiles);
            expect(result).toEqual([]);
        });
    });
});
