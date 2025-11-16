/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
// Les types any sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { VirtualPlayerEmit } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { PlayingGridService } from '@app/services/playing-grid-service/playing-grid.service';
import { Item, Player, Tile } from '@common/interfaces';
import { BotService } from './bot.service';

describe('BotService', () => {
    let service: BotService;
    let playingGridService: jasmine.SpyObj<PlayingGridService>;
    let boardService: jasmine.SpyObj<BoardService>;

    const mockItem: Item = {
        name: '',
        position: { x: 0, y: 0 },
        image: 'default.png',
        id: 1,
        type: 'generic',
        description: 'Test item',
        isOutOfContainer: false,
    };

    const mockTile: Tile = {
        type: 'normal',
        traversable: true,
        cost: 1,
        isHighlighted: false,
        isReachable: false,
        item: mockItem,
        position: { x: 0, y: 0 },
        player: null,
        image: 'grass.png',
    };

    const mockPlayer: Player = {
        name: 'Player1',
        life: 100,
        speed: 3,
        attack: null,
        defense: null,
        avatarUrl: null,
        coordinate: { x: 0, y: 0 },
        isAdmin: false,
        isVirtualPlayer: true,
        spawnPoint: { x: 5, y: 5 },
        inventory: [],
    };

    beforeEach(() => {
        const playingGridSpy = jasmine.createSpyObj('PlayingGridService', ['moveVirtualPlayer']);
        const boardSpy = jasmine.createSpyObj('BoardService', [], {
            tiles: [],
        });

        TestBed.configureTestingModule({
            providers: [BotService, { provide: PlayingGridService, useValue: playingGridSpy }, { provide: BoardService, useValue: boardSpy }],
        });

        service = TestBed.inject(BotService);
        playingGridService = TestBed.inject(PlayingGridService) as jasmine.SpyObj<PlayingGridService>;
        boardService = TestBed.inject(BoardService) as jasmine.SpyObj<BoardService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('moveVirtualPlayer', () => {
        it('should call playingGridService.moveVirtualPlayer after a random delay', () => {
            jasmine.clock().install();

            const tile = { ...mockTile };
            const data: VirtualPlayerEmit = {
                codeRoom: 'room123',
                currentPlayer: mockPlayer,
            };

            spyOn(service, 'generateTimerRandom').and.returnValue(15000);

            service.moveVirtualPlayer(tile, data);

            expect(playingGridService.moveVirtualPlayer).not.toHaveBeenCalled();

            jasmine.clock().tick(15000);

            expect(playingGridService.moveVirtualPlayer).toHaveBeenCalledWith(tile, mockPlayer);

            jasmine.clock().uninstall();
        });
    });

    describe('generateTimerRandom', () => {
        it('should generate a random number between min and max (inclusive)', () => {
            spyOn(Math, 'random').and.returnValue(0.5);

            const result = service.generateTimerRandom(10000, 20000);

            expect(result).toBe(15000);
        });

        it('should handle min and max being the same', () => {
            const result = service.generateTimerRandom(10000, 10000);
            expect(result).toBe(10000);
        });
    });

    describe('hasFlag', () => {
        it('should return true when player has flag in inventory', () => {
            const flagItem: Item = {
                ...mockItem,
                name: 'chestbox-2',
            };

            const playerWithFlag: Player = {
                ...mockPlayer,
                inventory: [flagItem],
            };

            expect(service.hasFlag(playerWithFlag)).toBeTrue();
        });

        it('should return false when player does not have flag in inventory', () => {
            const otherItem: Item = {
                ...mockItem,
                name: 'other-item',
            };

            const playerWithoutFlag: Player = {
                ...mockPlayer,
                inventory: [otherItem],
            };

            expect(service.hasFlag(playerWithoutFlag)).toBeFalse();
        });

        it('should return false when player has no inventory', () => {
            const playerNoInventory: Player = {
                ...mockPlayer,
                inventory: undefined,
            };

            expect(service.hasFlag(playerNoInventory)).toBeFalse();
        });

        it('should return false when player inventory is empty', () => {
            const playerEmptyInventory: Player = {
                ...mockPlayer,
                inventory: [],
            };

            expect(service.hasFlag(playerEmptyInventory)).toBeFalse();
        });
    });

    describe('goToFlagOrSpawnPoint', () => {
        let accessibleTiles: Tile[];
        let flagItem: Item;

        beforeEach(() => {
            flagItem = {
                ...mockItem,
                name: 'chestbox-2',
            };

            accessibleTiles = [
                { ...mockTile, position: { x: 1, y: 1 } },
                { ...mockTile, position: { x: 2, y: 2 } },
                { ...mockTile, position: { x: 3, y: 3 } },
                { ...mockTile, position: { x: 5, y: 5 } },
            ];

            Object.defineProperty(boardService, 'tiles', {
                get: () => [{ ...mockTile, position: { x: 7, y: 7 }, item: flagItem }, ...accessibleTiles],
            });
        });

        it('should return null if player has flag but no spawn point', () => {
            const playerWithFlagNoSpawn: Player = {
                ...mockPlayer,
                spawnPoint: undefined,
                inventory: [flagItem],
            };

            const result = service.goToFlagOrSpawnPoint(playerWithFlagNoSpawn, accessibleTiles);

            expect(result).toBeNull();
        });

        it('should return spawn point position when player has flag and spawn is accessible', () => {
            const playerWithFlag: Player = {
                ...mockPlayer,
                inventory: [flagItem],
            };

            const result = service.goToFlagOrSpawnPoint(playerWithFlag, accessibleTiles);

            expect(result).toEqual({ x: 5, y: 5 });
        });

        it('should handle case when there are no accessible tiles', () => {
            const result = service.goToFlagOrSpawnPoint(mockPlayer, []);

            expect(result).toEqual({ x: 7, y: 7 });
        });

        it('should handle spawn point occupied by another player', () => {
            const playerWithFlag: Player = {
                ...mockPlayer,
                inventory: [flagItem],
            };

            const occupiedTiles = [...accessibleTiles];
            const spawnTileIndex = occupiedTiles.findIndex((t) => t.position.x === 5 && t.position.y === 5);
            occupiedTiles[spawnTileIndex] = {
                ...occupiedTiles[spawnTileIndex],
                player: {
                    ...mockPlayer,
                    name: 'OtherPlayer',
                },
            };

            const result = service.goToFlagOrSpawnPoint(playerWithFlag, occupiedTiles);

            expect(result).toEqual({ x: 5, y: 5 });
        });
    });

    describe('moveDefensePlayerToSpawn', () => {
        let accessibleTiles: Tile[];
        let flagCarrier: Player;
        let flagItem: Item;

        beforeEach(() => {
            flagItem = {
                ...mockItem,
                name: 'chestbox-2',
            };

            flagCarrier = {
                name: 'Enemy',
                life: 100,
                speed: 3,
                attack: null,
                defense: null,
                avatarUrl: null,
                coordinate: { x: 9, y: 9 },
                isAdmin: false,
                spawnPoint: { x: 8, y: 8 },
                inventory: [flagItem],
            };

            accessibleTiles = [
                { ...mockTile, position: { x: 1, y: 1 } },
                { ...mockTile, position: { x: 3, y: 3 } },
                { ...mockTile, position: { x: 7, y: 7 } },
                { ...mockTile, position: { x: 8, y: 7 } },
            ];

            Object.defineProperty(boardService, 'tiles', {
                get: () => [{ ...mockTile, position: { x: 9, y: 9 }, player: flagCarrier }, ...accessibleTiles],
            });

            spyOn(service, 'hasFlag').and.callFake((player) => player && player.name === 'Enemy');

            spyOn(service, 'moveVirtualPlayer');
        });

        it('should return undefined if no flag carrier is found', () => {
            Object.defineProperty(boardService, 'tiles', {
                get: () => accessibleTiles,
            });

            const data: VirtualPlayerEmit = {
                codeRoom: 'room123',
                currentPlayer: mockPlayer,
            };

            const result = service.moveDefensePlayerToSpawn(data, accessibleTiles);

            expect(result).toBeUndefined();
            expect(service.moveVirtualPlayer).not.toHaveBeenCalled();
        });

        it('should handle case when flag carrier has no spawn point', () => {
            flagCarrier.spawnPoint = undefined;

            const data: VirtualPlayerEmit = {
                codeRoom: 'room123',
                currentPlayer: mockPlayer,
            };

            const result = service.moveDefensePlayerToSpawn(data, accessibleTiles);

            expect(result).toBeUndefined();
            expect(service.moveVirtualPlayer).not.toHaveBeenCalled();
        });

        it('should find adjacent tile when closest tile is occupied', () => {
            accessibleTiles[2].player = {
                name: 'OtherPlayer',
                life: 100,
                speed: 3,
                attack: null,
                defense: null,
                avatarUrl: null,
                coordinate: { x: 7, y: 7 },
                isAdmin: false,
            };

            const data: VirtualPlayerEmit = {
                codeRoom: 'room123',
                currentPlayer: mockPlayer,
            };

            service.moveDefensePlayerToSpawn(data, accessibleTiles);

            expect(service.moveVirtualPlayer).toHaveBeenCalled();
            const callArgs = (service.moveVirtualPlayer as jasmine.Spy).calls.mostRecent().args;
            expect(callArgs[0].position).toEqual({ x: 8, y: 7 });
            expect(callArgs[1]).toEqual(data);
        });

        it('should return true when successfully moving to defend', () => {
            const data: VirtualPlayerEmit = {
                codeRoom: 'room123',
                currentPlayer: mockPlayer,
            };

            const result = service.moveDefensePlayerToSpawn(data, accessibleTiles);

            expect(result).toBeTrue();
        });
    });
    describe('Advanced BotService Tests', () => {
        describe('goToFlagOrSpawnPoint with closest tile logic', () => {
            it('should return the position of the closest accessible tile to the spawn point', () => {
                const playerWithFlag: Player = {
                    ...mockPlayer,
                    inventory: [{ ...mockItem, name: 'chestbox-2' }],
                    spawnPoint: { x: 10, y: 10 },
                };

                const accessibleTiles = [
                    { ...mockTile, position: { x: 8, y: 8 } },
                    { ...mockTile, position: { x: 7, y: 9 } },
                    { ...mockTile, position: { x: 9, y: 9 } },
                ];

                Object.defineProperty(boardService, 'tiles', {
                    get: () => accessibleTiles,
                });

                const result = service.goToFlagOrSpawnPoint(playerWithFlag, accessibleTiles);

                expect(result).toEqual({ x: 9, y: 9 });
            });

            it('should return the position of the closest accessible tile to the flag', () => {
                const playerWithoutFlag: Player = {
                    ...mockPlayer,
                    inventory: [],
                };

                const flagTile = { ...mockTile, position: { x: 15, y: 15 }, item: { ...mockItem, name: 'chestbox-2' } };

                const accessibleTiles = [
                    { ...mockTile, position: { x: 12, y: 12 } },
                    { ...mockTile, position: { x: 13, y: 13 } },
                    { ...mockTile, position: { x: 10, y: 10 } },
                ];

                Object.defineProperty(boardService, 'tiles', {
                    get: () => [flagTile, ...accessibleTiles],
                });

                const result = service.goToFlagOrSpawnPoint(playerWithoutFlag, accessibleTiles);

                expect(result).toEqual({ x: 13, y: 13 });
            });
        });

        describe('goToFlagOrSpawnPoint with flag target logic', () => {
            it('should return the flag position when targeting a flag and no accessible tiles are available', () => {
                const playerWithoutFlag: Player = {
                    ...mockPlayer,
                    inventory: [],
                };

                const flagTile = { ...mockTile, position: { x: 20, y: 20 }, item: { ...mockItem, name: 'chestbox-2' } };

                const accessibleTiles: Tile[] = [];

                Object.defineProperty(boardService, 'tiles', {
                    get: () => [flagTile],
                });

                const result = service.goToFlagOrSpawnPoint(playerWithoutFlag, accessibleTiles);

                expect(result).toEqual({ x: 20, y: 20 });
            });
        });

        describe('moveDefensePlayerToSpawn with complex scenarios', () => {
            let flagCarrier: Player;
            let flagItem: Item;

            beforeEach(() => {
                flagItem = {
                    ...mockItem,
                    name: 'chestbox-2',
                };

                flagCarrier = {
                    name: 'Enemy',
                    life: 100,
                    speed: 3,
                    attack: null,
                    defense: null,
                    avatarUrl: null,
                    coordinate: { x: 9, y: 9 },
                    isAdmin: false,
                    spawnPoint: { x: 8, y: 8 },
                    inventory: [flagItem],
                };

                spyOn(service, 'moveVirtualPlayer');
            });

            it('should handle case when no targetAccessibleTile is found', () => {
                Object.defineProperty(boardService, 'tiles', {
                    get: () => [{ ...mockTile, position: { x: 9, y: 9 }, player: flagCarrier }],
                });

                const accessibleTiles: Tile[] = [];

                const data: VirtualPlayerEmit = {
                    codeRoom: 'room123',
                    currentPlayer: mockPlayer,
                };

                const result = service.moveDefensePlayerToSpawn(data, accessibleTiles);

                expect(result).toBeUndefined();
                expect(service.moveVirtualPlayer).not.toHaveBeenCalled();
            });

            it('should handle direct spawn point availability correctly', () => {
                Object.defineProperty(boardService, 'tiles', {
                    get: () => [{ ...mockTile, position: { x: 9, y: 9 }, player: flagCarrier }],
                });

                const spawnTile = { ...mockTile, position: { x: 8, y: 8 } };
                const accessibleTiles = [spawnTile];

                const data: VirtualPlayerEmit = {
                    codeRoom: 'room123',
                    currentPlayer: mockPlayer,
                };

                service.moveDefensePlayerToSpawn(data, accessibleTiles);

                expect(service.moveVirtualPlayer).toHaveBeenCalled();
                const callArgs = (service.moveVirtualPlayer as jasmine.Spy).calls.mostRecent().args;
                expect(callArgs[0].position).toEqual({ x: 8, y: 8 });
            });

            it('should handle the case when both closest tile and all adjacent tiles are occupied', () => {
                Object.defineProperty(boardService, 'tiles', {
                    get: () => [{ ...mockTile, position: { x: 9, y: 9 }, player: flagCarrier }],
                });

                const occupiedClosestTile = {
                    ...mockTile,
                    position: { x: 7, y: 7 },
                    player: { ...mockPlayer, name: 'OccupyingPlayer1' },
                };

                const adjacentTiles = [
                    { ...mockTile, position: { x: 8, y: 7 }, player: { ...mockPlayer, name: 'OccupyingPlayer2' } },
                    { ...mockTile, position: { x: 6, y: 7 }, player: { ...mockPlayer, name: 'OccupyingPlayer3' } },
                    { ...mockTile, position: { x: 7, y: 8 }, player: { ...mockPlayer, name: 'OccupyingPlayer4' } },
                    { ...mockTile, position: { x: 7, y: 6 }, player: { ...mockPlayer, name: 'OccupyingPlayer5' } },
                ];

                const accessibleTiles = [occupiedClosestTile, ...adjacentTiles];

                const data: VirtualPlayerEmit = {
                    codeRoom: 'room123',
                    currentPlayer: mockPlayer,
                };

                const result = service.moveDefensePlayerToSpawn(data, accessibleTiles);

                expect(result).toBeUndefined();
                expect(service.moveVirtualPlayer).not.toHaveBeenCalled();
            });

            it('should use mockTile as template for movement', () => {
                Object.defineProperty(boardService, 'tiles', {
                    get: () => [{ ...mockTile, position: { x: 9, y: 9 }, player: flagCarrier }],
                });

                const spawnTile = { ...mockTile, position: { x: 8, y: 8 } };
                const accessibleTiles = [spawnTile];

                const data: VirtualPlayerEmit = {
                    codeRoom: 'room123',
                    currentPlayer: mockPlayer,
                };

                const mockTileValue = {
                    traversable: true,
                    cost: 1,
                    isHighlighted: false,
                    isReachable: false,
                    item: { name: '' },
                    position: { x: 0, y: 0 },
                } as Tile;

                (service as any).mockTile = mockTileValue;

                service.moveDefensePlayerToSpawn(data, accessibleTiles);

                expect(service.moveVirtualPlayer).toHaveBeenCalled();
                const callArgs = (service.moveVirtualPlayer as jasmine.Spy).calls.mostRecent().args;
                expect(callArgs[0].traversable).toBe(true);
                expect(callArgs[0].cost).toBe(1);
                expect(callArgs[0].position).toEqual({ x: 8, y: 8 });
            });
        });
    });
});
