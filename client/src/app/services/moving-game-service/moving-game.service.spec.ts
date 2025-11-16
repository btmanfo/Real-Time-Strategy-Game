/* eslint-disable @typescript-eslint/no-explicit-any */
// the magic number 300 is used to simulate the time it takes to move a player
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Utilisation temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires */

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TILE_TYPES } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player, Tile } from '@common/interfaces';
import { MovingGameService } from './moving-game.service';

describe('MovingGame', () => {
    let service: MovingGameService;
    let mockBoardService: jasmine.SpyObj<BoardService>;
    let mockPlayingService: jasmine.SpyObj<PlayingService>;
    let mockActionService: jasmine.SpyObj<ActionService>;
    let mockJoinGameService: jasmine.SpyObj<JoinGameService>;
    const mockPlayer = { avatarUrl: 'player1', coordinate: { x: 0, y: 0 } } as Player;
    beforeEach(() => {
        mockActionService = jasmine.createSpyObj('ActionService', [
            'emitStartFight',
            'emitToggleDoor',
            'checkEndTurn',
            'canAction',
            'actionPlayer',
            'checkSurroundingTiles',
        ]);
        mockActionService.canAction = 0;
        mockBoardService = jasmine.createSpyObj('BoardService', [
            'setCostTiles',
            'getNeighbors',
            'tiles',
            'getPlayerTile',
            'constructPathFromTarget',
        ]);
        mockBoardService.tiles = [
            { position: { x: 0, y: 0 }, player: { avatarUrl: '' } as Player, type: '', traversable: true, cost: 1, isReachable: false } as Tile,
        ];
        mockPlayingService = jasmine.createSpyObj(
            'PlayingService',
            ['isPlayerTurn', 'socket', 'localPlayer', 'currentMovingPoints', 'joinGameService'],
            {
                playerTurn: mockPlayer,
            },
        );
        mockJoinGameService = jasmine.createSpyObj('JoinGameService', ['socket']);
        mockJoinGameService.socket = jasmine.createSpyObj('Socket', ['emit']);
        (mockPlayingService as any).joinGameService = mockJoinGameService;
        mockPlayingService.socket = mockJoinGameService.socket;
        mockPlayingService.localPlayer = mockPlayer;
        mockPlayingService.currentMovingPoints = 5;
        TestBed.configureTestingModule({
            providers: [
                MovingGameService,
                { provide: BoardService, useValue: mockBoardService },
                { provide: PlayingService, useValue: mockPlayingService },
                { provide: ActionService, useValue: mockActionService },
                { provide: JoinGameService, useValue: mockJoinGameService },
            ],
            imports: [HttpClientTestingModule],
        });
        service = TestBed.inject(MovingGameService);
    });

    describe('setReachableForTiles', () => {
        it('should set reachable tiles', () => {
            const tile = { position: { x: 0, y: 0 }, isReachable: true, cost: 1 } as Tile;
            mockBoardService.tiles = [tile];
            service.setReachableForTiles([tile]);
            expect(tile.isReachable).toBeTrue();
        });
    });
    describe('getPlayerTile', () => {
        it('should get player tile', () => {
            const player = { coordinate: { x: 0, y: 0 } } as Player;
            mockBoardService.tiles = [{ position: { x: 0, y: 0 } } as Tile];
            const tile = service.getPlayerTile(player);
            expect(tile).toBe(mockBoardService.tiles[0]);
        });
    });
    describe('getNeighbors', () => {
        it('should get neighbor tiles', () => {
            const tile = { position: { x: 0, y: 0 } } as Tile;
            const neighbor1 = { position: { x: 0, y: 1 } } as Tile;
            const neighbor2 = { position: { x: 1, y: 0 } } as Tile;
            mockBoardService.tiles = [tile, neighbor1, neighbor2];
            const neighbors = service.getNeighbors(tile);
            expect(neighbors.length).toBe(2);
        });
    });
    describe('getAccessibleTiles', () => {
        it('should get accessible tiles', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 1;
            const tile = { position: { x: 0, y: 0 } } as Tile;
            const neighbor1 = { position: { x: 0, y: 1 }, cost: 1 } as Tile;
            const neighbor2 = { position: { x: 1, y: 0 }, cost: 2 } as Tile;
            const inaccessibleTile = { position: { x: 1, y: 1 }, cost: 1, type: TILE_TYPES.wall } as Tile;
            mockBoardService.tiles = [tile, neighbor2, neighbor1, inaccessibleTile];
            const accessibleTiles = service.getAccessibleTiles();
            expect(accessibleTiles.length).toBe(2);
            expect(accessibleTiles[0]).toEqual(tile);
            expect(accessibleTiles[1]).toEqual(neighbor1);
        });

        it('should get no accessible tiles', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 0;
            const tile = { position: { x: 0, y: 0 } } as Tile;
            const neighbor1 = { position: { x: 0, y: 1 }, cost: 1 } as Tile;
            const neighbor2 = { position: { x: 1, y: 0 }, cost: 1 } as Tile;
            const inaccessibleTile = { position: { x: 1, y: 1 }, cost: 1 } as Tile;
            mockBoardService.tiles = [tile, neighbor2, neighbor1, inaccessibleTile];
            const accessibleTiles = service.getAccessibleTiles();
            expect(accessibleTiles.length).toBe(1);
            expect(accessibleTiles[0]).toBe(tile);
        });
        it('should return an empty array if player tile is not found', () => {
            spyOn(service, 'getPlayerTile').and.returnValue(undefined);
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, avatarUrl: 'pl' } as Player;
            const accessibleTiles = service.getAccessibleTiles();
            expect(accessibleTiles).toEqual([]);
        });

        it('should skip tiles with cost higher than current moving points (trigger continue)', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 0;

            const tile = { position: { x: 0, y: 0 }, cost: 0 } as Tile;
            const expensiveNeighbor = { position: { x: 0, y: 1 }, cost: 1 } as Tile;

            mockBoardService.tiles = [tile, expensiveNeighbor];

            spyOn(service, 'getNeighbors').and.callFake((t: Tile) => {
                if (t === tile) return [expensiveNeighbor];
                return [];
            });

            spyOn(service as any, 'addNeighborsToQueue').and.callFake((neighbors: any, queue: any, currentCost: number) => {
                for (const neighbor of neighbors) {
                    queue.push({ tile: neighbor, cost: currentCost + neighbor.cost });
                }
            });

            const accessibleTiles = service.getAccessibleTiles();

            expect(accessibleTiles).toEqual([tile]);
        });
    });
    describe('virtualGetAccessibleTiles', () => {
        it('should get accessible tiles', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 1;
            const tile = { position: { x: 0, y: 0 } } as Tile;
            const neighbor1 = { position: { x: 0, y: 1 }, cost: 1 } as Tile;
            const neighbor2 = { position: { x: 1, y: 0 }, cost: 2 } as Tile;
            const inaccessibleTile = { position: { x: 1, y: 1 }, cost: 1, type: TILE_TYPES.wall } as Tile;
            mockBoardService.tiles = [tile, neighbor2, neighbor1, inaccessibleTile];
            const accessibleTiles = service.virtualGetAccessibleTiles(mockPlayingService.localPlayer);
            expect(accessibleTiles.length).toBe(2);
            expect(accessibleTiles[0]).toEqual(tile);
            expect(accessibleTiles[1]).toEqual(neighbor1);
        });

        it('should get no accessible tiles', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 0;
            const tile = { position: { x: 0, y: 0 } } as Tile;
            const neighbor1 = { position: { x: 0, y: 1 }, cost: 1 } as Tile;
            const neighbor2 = { position: { x: 1, y: 0 }, cost: 1 } as Tile;
            const inaccessibleTile = { position: { x: 1, y: 1 }, cost: 1 } as Tile;
            mockBoardService.tiles = [tile, neighbor2, neighbor1, inaccessibleTile];
            const accessibleTiles = service.virtualGetAccessibleTiles(mockPlayingService.localPlayer);
            expect(accessibleTiles.length).toBe(1);
            expect(accessibleTiles[0]).toBe(tile);
        });
        it('should return an empty array if player tile is not found', () => {
            spyOn(service, 'getPlayerTile').and.returnValue(undefined);
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, avatarUrl: 'pl' } as Player;
            const accessibleTiles = service.virtualGetAccessibleTiles(mockPlayingService.localPlayer);
            expect(accessibleTiles).toEqual([]);
        });

        it('should skip tiles with cost higher than current moving points (trigger continue)', () => {
            mockPlayingService.localPlayer = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
            mockPlayingService.currentMovingPoints = 0;

            const tile = { position: { x: 0, y: 0 }, cost: 0 } as Tile;
            const expensiveNeighbor = { position: { x: 0, y: 1 }, cost: 1 } as Tile;

            mockBoardService.tiles = [tile, expensiveNeighbor];

            spyOn(service, 'getNeighbors').and.callFake((t: Tile) => {
                if (t === tile) return [expensiveNeighbor];
                return [];
            });

            spyOn(service as any, 'addNeighborsToQueue').and.callFake((neighbors: any, queue: any, currentCost: number) => {
                for (const neighbor of neighbors) {
                    queue.push({ tile: neighbor, cost: currentCost + neighbor.cost });
                }
            });

            const accessibleTiles = service.virtualGetAccessibleTiles(mockPlayingService.localPlayer);

            expect(accessibleTiles).toEqual([tile]);
        });
    });

    describe('findShortestPath', () => {
        it('should find shortest path', () => {
            const player = { position: { x: 0, y: 0 }, avatarUrl: 'player1' } as unknown as Player;
            const target = { position: { x: 2, y: 2 } } as Tile;
            mockBoardService.tiles = [
                { position: { x: 0, y: 0 }, isReachable: true, cost: 1, player } as unknown as Tile,
                { position: { x: 0, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 0, y: 2 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 1, y: 0 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 1, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 1, y: 2 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 0 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 2 }, isReachable: true, cost: 1 } as Tile,
            ];
            const path = service.findShortestPath(player, target);

            expect(path).toBeInstanceOf(Array);
            expect(path.length).toBeGreaterThan(0);

            const pathPositions = path.map((tile) => `${tile.position.x},${tile.position.y}`);
            expect(pathPositions).toContain('0,0');
            expect(pathPositions).toContain('2,2');
        });

        it('should break the loop when the target is reached', () => {
            const player = {
                coordinate: { x: 0, y: 0 },
                avatarUrl: 'player1',
                name: '',
                life: 100,
                speed: 1,
                attack: '10',
                defense: '5',
                isAdmin: false,
            } as Player;

            const target = { position: { x: 1, y: 0 }, isReachable: true, cost: 1 } as Tile;
            const startTile = { position: { x: 0, y: 0 }, isReachable: true, cost: 1, player } as Tile;

            mockBoardService.tiles = [startTile, target];

            spyOn(service, 'getPlayerTile').and.returnValue(startTile);
            spyOn(service as any, 'constructPathFromTarget').and.returnValue([startTile, target]);
            const serviceSpy = spyOn(service as any, 'addNeighborsToQueueShortestPath').and.callFake((queue: any) => {
                queue.push({ tile: target, cost: 1 });
            });

            const path = service.findShortestPath(player, target);

            expect(serviceSpy).toHaveBeenCalled();
            expect(path).toEqual([startTile, target]);
        });

        it('should break the loop if the queue becomes empty before reaching the target', () => {
            const player: Player = {
                coordinate: { x: 0, y: 0 },
                avatarUrl: 'player1',
                name: 'Player1',
                life: 100,
                speed: 1,
                attack: '10',
                defense: '5',
                isAdmin: false,
            };
            const target = { position: { x: 2, y: 2 } } as Tile;
            const startTile = { position: { x: 0, y: 0 }, isReachable: true, cost: 1, player } as Tile;
            mockBoardService.tiles = [
                startTile,
                { position: { x: 0, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 0, y: 2 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 1, y: 0 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 1, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 0 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 1 }, isReachable: true, cost: 1 } as Tile,
                { position: { x: 2, y: 2 }, isReachable: true, cost: 1 } as Tile,
            ];
            spyOn(service, 'getNeighbors').and.returnValue([]);
            spyOn(service, 'getPlayerTile').and.returnValue(startTile);
            spyOn(service as any, 'constructPathFromTarget').and.returnValue([]);
            const path = service.findShortestPath(player, target);
            expect(path).toBeInstanceOf(Array);
            expect(path.length).toBe(0);
        });
        it('should skip already visited tiles (trigger continue)', () => {
            const player = {
                coordinate: { x: 0, y: 0 },
                avatarUrl: 'player1',
                name: '',
                life: 100,
                speed: 1,
                attack: '10',
                defense: '5',
                isAdmin: false,
            } as Player;

            const startTile = { position: { x: 0, y: 0 }, isReachable: true, cost: 1, player } as Tile;

            spyOn(service, 'getPlayerTile').and.returnValue(startTile);
            spyOn(service as any, 'constructPathFromTarget').and.returnValue([]);

            const serviceSpy = spyOn(service as any, 'addNeighborsToQueueShortestPath').and.callFake((queue: any[]) => {
                queue.push({ tile: startTile, cost: 1 });
            });

            service.findShortestPath(player, { position: { x: 10, y: 10 } } as Tile);
            expect(serviceSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('emitAnimation', () => {
        it('should emit animatePlayerMove event', () => {
            const roomCode = 'room123';
            mockPlayingService.joinGameService.pinCode = roomCode;
            const map = [{ position: { x: 0, y: 0 } } as Tile];
            const player = { avatarUrl: 'player1' } as Player;
            service.emitAnimation(map, player);
            expect(mockPlayingService.joinGameService.socket.emit).toHaveBeenCalledWith('animatePlayerMove', { roomCode, map, player });
        });
    });

    describe('animatePlayerMovement', () => {
        it('should emit animate player movement', () => {
            const map = [{ position: { x: 0, y: 0 } } as Tile];
            const player = { avatarUrl: 'player1' } as Player;
            const roomCode = 'room123';
            mockPlayingService.joinGameService.pinCode = roomCode;
            service.animatePlayerMovement(map, player);
            expect(mockPlayingService.joinGameService.socket.emit).toHaveBeenCalledWith('startMoving', { path: map, player, roomCode });
        });
    });

    it('should skip tiles when currentCost > currentMovingPoints (trigger continue)', () => {
        const player: Player = { coordinate: { x: 0, y: 0 }, speed: 1 } as Player;
        mockPlayingService.currentMovingPoints = 0;

        const playerTile: Tile = { position: { x: 0, y: 0 }, cost: 0 } as Tile;
        const expensiveNeighbor: Tile = { position: { x: 0, y: 1 }, cost: 2 } as Tile;

        mockBoardService.tiles = [playerTile, expensiveNeighbor];

        spyOn(service, 'getPlayerTile').and.returnValue(playerTile);
        spyOn(service, 'getNeighbors').and.returnValue([expensiveNeighbor]);

        spyOn(service as any, 'addVirtualNeighborsToQueue').and.callFake((neighbors: any[], queue: any[], currentCost: number) => {
            for (const neighbor of neighbors) {
                queue.push({ tile: neighbor, cost: currentCost + neighbor.cost });
            }
        });

        const result = service.virtualGetAccessibleTiles(player);

        expect(result).toEqual([playerTile]);
    });
});
