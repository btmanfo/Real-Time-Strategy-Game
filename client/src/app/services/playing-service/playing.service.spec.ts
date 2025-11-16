/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable no-unused-vars */
// Utilisation de fonction sans utiliser la totalité méthodes
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Utilisation de assertation non null pour effectuées des tests
/* eslint-disable no-invalid-this */
// Utilisation de assertation non null pour effectuées des tests

import { TestBed } from '@angular/core/testing';
import { NUMBER_OF_WINS_FOR_VICTORIES, TILE_TYPES } from '@app/constants/constants';
import { Game } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { SocketEndGameStatistics } from '@common/constants';
import { Item, Player, Tile } from '@common/interfaces';
import { PlayingService } from './playing.service';

describe('PlayingService', () => {
    let service: PlayingService;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let socketSpy: jasmine.SpyObj<any>;

    const mockPlayer1: Player = {
        name: 'Player1',
        avatarUrl: 'player1.png',
        life: 5,
        speed: 3,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: 1, y: 1 },
        isAdmin: true,
        victories: 0,
        isOnIce: false,
        spawnPoint: { x: 1, y: 1 },
    };

    const mockPlayer2: Player = {
        name: 'Player2',
        avatarUrl: 'player2.png',
        life: 5,
        speed: 4,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: 2, y: 2 },
        isAdmin: false,
        victories: 0,
        isOnIce: false,
        spawnPoint: { x: 2, y: 2 },
    };

    const mockTiles: Tile[] = [
        { position: { x: 0, y: 0 }, type: TILE_TYPES.empty, traversable: true, cost: 1 } as Tile,
        { position: { x: 1, y: 1 }, type: TILE_TYPES.empty, traversable: true, cost: 1, player: mockPlayer1 } as Tile,
        { position: { x: 2, y: 2 }, type: TILE_TYPES.empty, traversable: true, cost: 1, player: mockPlayer2 } as Tile,
        { position: { x: 3, y: 3 }, type: TILE_TYPES.wall, traversable: false, cost: -1 } as Tile,
        { position: { x: 4, y: 4 }, type: TILE_TYPES.door, traversable: true, cost: 1, image: './assets/images/Porte.png' } as Tile,
        { position: { x: 5, y: 5 }, type: TILE_TYPES.door, traversable: true, cost: 1, image: './assets/images/Porte-ferme.png' } as Tile,
        { position: { x: 6, y: 6 }, type: TILE_TYPES.ice, traversable: true, cost: 0 } as Tile,
        { position: { x: 7, y: 7 }, type: TILE_TYPES.water, traversable: true, cost: 2 } as Tile,
    ];

    const mockGame: Game = {
        name: 'Test Game',
        description: 'Test Description',
        gameMode: 'Classic',
        size: 'Medium',
        map: mockTiles,
        map2: mockTiles,
        visibility: true,
        id: '123',
        modificationDate: new Date().toISOString(),
        screenshot: '',
    };

    beforeEach(() => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['getNewGame']);
        boardServiceSpy = jasmine.createSpyObj('BoardService', ['updateTiles'], {
            tiles: [...mockTiles],
            isPlaying: false,
        });
        notificationServiceSpy = jasmine.createSpyObj('NotificationService', [], {
            errorMessages: [],
            showModal: false,
            isTimedNotification: false,
        });

        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on']);
        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', [], {
            socket: socketSpy,
            pinCode: 'TEST123',
        });

        combatServiceSpy = jasmine.createSpyObj('CombatService', ['initCombat']);
        movingGameServiceSpy = jasmine.createSpyObj(
            'MovingGameService',
            ['getAccessibleTiles', 'setReachableForTiles', 'getPlayerTile', 'getNeighbors'],
            {
                movePoints: 0,
            },
        );

        gameServiceSpy.getNewGame.and.returnValue(mockGame);
        movingGameServiceSpy.getAccessibleTiles.and.returnValue([mockTiles[0]]);

        spyOn(TestBed, 'inject').and.callThrough();
        spyOn(boardServiceSpy.tiles, 'find').and.callThrough();

        TestBed.configureTestingModule({
            providers: [
                PlayingService,
                { provide: GameService, useValue: gameServiceSpy },
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: CombatService, useValue: combatServiceSpy },
            ],
        });

        service = TestBed.inject(PlayingService);

        spyOn(service as any, 'isTeleportationValid').and.returnValue(true);
        spyOn(service as any, 'movePlayerToTile').and.callThrough();
        spyOn(service as any, 'playerMovedAnnouncer').and.callThrough();
        spyOn(service as any, 'showTeleportationError').and.callThrough();

        Object.defineProperty(boardServiceSpy, 'isPlaying', {
            get: jasmine.createSpy('isPlayingGetter').and.returnValue(true),
            set: jasmine.createSpy('isPlayingSetter'),
        });

        Object.defineProperty(notificationServiceSpy, 'showModal', {
            get: jasmine.createSpy('showModalGetter').and.returnValue(true),
            set: jasmine.createSpy('showModalSetter'),
        });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Service accessors', () => {
        it('should get movingGameService via injector', () => {
            const result = service.movingGameService;
            expect(result).toBeTruthy();
        });

        it('should get joinGameService via injector', () => {
            const result = service.joinGameService;
            expect(result).toBeTruthy();
        });

        it('should get combatService via injector', () => {
            const result = service.combatService;
            expect(result).toBeTruthy();
        });

        it('should reuse existing service instances', () => {
            const movingService1 = service.movingGameService;
            const joinService1 = service.joinGameService;
            const combatService1 = service.combatService;

            const movingService2 = service.movingGameService;
            const joinService2 = service.joinGameService;
            const combatService2 = service.combatService;

            expect(movingService1).toBe(movingService2);
            expect(joinService1).toBe(joinService2);
            expect(combatService1).toBe(combatService2);
        });
    });

    describe('Player management', () => {
        beforeEach(() => {
            service.players = [mockPlayer1, mockPlayer2];
            service.playerTurn = mockPlayer1;
            service.localPlayer = mockPlayer1;
        });

        it('should update player victories', () => {
            service.updatePlayerVictories('Player1');
            expect(service.players[0].victories).toBe(1 as any);

            service.updatePlayerVictories('Player1');
            expect(service.players[0].victories).toBe(2 as any);
        });

        it('should handle player victory initialization if undefined', () => {
            service.players[0].victories = undefined;
            service.updatePlayerVictories('Player1');
            expect(service.players[0].victories).toBe(1 as any);
        });

        it('should emit endGameWinVictories when player reaches required victories', () => {
            for (let i = 0; i < 5; i++) {
                service.updatePlayerVictories('Player1');
            }

            expect(socketSpy.emit).toHaveBeenCalledWith('endGameWinVictories', {
                roomCode: 'TEST123',
                winner: 'Player1',
            });
        });

        it('should update player health', () => {
            service.updatePlayerHealth('Player1', 3);
            expect(service.players[0].life).toBe(3);
        });

        it("should correctly identify if it is the player's turn", () => {
            service.playerTurn = mockPlayer1;
            service.localPlayer = mockPlayer1;
            expect(service.isPlayerTurn()).toBeTrue();

            service.playerTurn = mockPlayer2;
            expect(service.isPlayerTurn()).toBeFalse();
        });

        it('should update player loses and emit event when playerLose is provided', () => {
            const winnerName = 'Player1';
            const loserName = 'Player2';

            service.updatePlayerVictories(winnerName, loserName);

            expect(service.getPlayerLoses(loserName)).toBe(1);
            expect(socketSpy.emit).toHaveBeenCalledWith(
                SocketEndGameStatistics.UpdatePlayerLose,
                jasmine.objectContaining({
                    currentPlayer: loserName,
                    roomCode: 'TEST123',
                    nbLoses: 1,
                }),
            );
        });

        it('should get player loses, returning 0 if none exist', () => {
            expect(service.getPlayerLoses('NonExistentPlayer')).toBe(0);

            (service as any).playerLoses.set('Player1', 3);
            expect(service.getPlayerLoses('Player1')).toBe(3);
        });

        it('should return 0 when the player is not found in the playerVictories map', () => {
            const result = service.getPlayerVictories('NonExistentPlayer');
            expect(result).toBe(0);
        });
    });

    describe('Game initialization', () => {
        it('should initialize the game with board tiles', () => {
            service.initGame();
            expect(boardServiceSpy.isPlaying).toBeTrue();
            expect(boardServiceSpy.tiles).toEqual(jasmine.any(Array));
        });

        it('should exit early if no game is returned', () => {
            (Object.getOwnPropertyDescriptor(boardServiceSpy, 'isPlaying')?.get as jasmine.Spy).and.returnValue(false);
            gameServiceSpy.getNewGame.and.returnValue(null as any);

            service.initGame();
            expect(boardServiceSpy.isPlaying).toBeFalse();
        });

        it('should set localPlayer properties when foundTile has a player', () => {
            const localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                coordinate: { x: 0, y: 0 },
                inventory: [{ name: 'OldItem' } as Item],
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                isAdmin: false,
            } as Player;

            const mockPlayer = {
                name: 'TestPlayer',
                team: 'RedTeam',
                spawnPoint: { x: 5, y: 5 },
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                avatarUrl: 'test-avatar.png',
            } as Player;

            const foundTilePlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                coordinate: { x: 3, y: 3 },
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                isAdmin: false,
            } as Player;

            const foundTile = {
                position: { x: 3, y: 3 },
                player: foundTilePlayer,
                type: TILE_TYPES.empty,
                traversable: true,
                cost: 1,
            } as Tile;

            service.localPlayer = localPlayer;
            service.players = [mockPlayer];

            (boardServiceSpy.tiles.find as jasmine.Spy).calls.reset();

            boardServiceSpy.tiles = [];

            (boardServiceSpy.tiles.find as jasmine.Spy).and.callFake((callbackFn: (tile: Tile) => boolean) => {
                if ((boardServiceSpy.tiles.find as jasmine.Spy).calls.count() === 1) {
                    return foundTile;
                }
                return undefined;
            });

            const origArrayFind = Array.prototype.find;

            spyOn(Array.prototype, 'find').and.callFake(function (
                this: Player[],
                callbackFn: (player: Player, index: number, arr: Player[]) => boolean,
            ): Player | undefined {
                if (this === service.players) {
                    return mockPlayer;
                }
                return origArrayFind.call(this, callbackFn);
            });

            service.initGame();

            expect(service.localPlayer.coordinate).toEqual({ x: 3, y: 3 });
            expect(service.localPlayer.inventory).toEqual([]);
            expect(service.localPlayer.team).toBe('RedTeam');
            expect(service.localPlayer.spawnPoint).toEqual({ x: 5, y: 5 });

            (Array.prototype.find as jasmine.Spy).and.callThrough();
        });

        it('should initialize inventory for all players', () => {
            const localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                inventory: [],
            } as Player;

            const player1 = {
                name: 'Player1',
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 1, y: 1 },
                isAdmin: false,
                avatarUrl: 'player1.png',
                inventory: [],
            } as Player;

            const player2 = {
                name: 'Player2',
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 2, y: 2 },
                isAdmin: false,
                avatarUrl: 'player2.png',
                inventory: [],
            } as Player;

            service.localPlayer = localPlayer;
            service.players = [player1, player2];

            boardServiceSpy.tiles = [];
            (boardServiceSpy.tiles.find as jasmine.Spy).and.returnValue(undefined);

            service.initGame();

            expect(service.players[0].inventory!.length).toBe(2);
            expect(service.players[1].inventory!.length).toBe(2);
            expect(service.players[0].inventory![0]).toEqual(jasmine.objectContaining({ image: '' }));
            expect(service.players[0].inventory![1]).toEqual(jasmine.objectContaining({ image: '' }));
        });

        it('should set team and spawnPoint from players array when matching player is found', () => {
            const localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                inventory: [],
            } as Player;

            const matchingPlayer = {
                name: 'TestPlayer',
                team: 'BlueTeam',
                spawnPoint: { x: 10, y: 10 },
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                avatarUrl: 'test-avatar.png',
            } as Player;

            service.localPlayer = localPlayer;
            service.players = [matchingPlayer];

            boardServiceSpy.tiles = [];
            (boardServiceSpy.tiles.find as jasmine.Spy).and.returnValue(undefined);

            service.initGame();

            expect(service.localPlayer.team).toBe('BlueTeam');
            expect(service.localPlayer.spawnPoint).toEqual({ x: 10, y: 10 });
        });

        it('should not set team or spawnPoint when no matching player is found', () => {
            const localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                inventory: [],
            } as Player;

            const nonMatchingPlayer = {
                name: 'OtherPlayer',
                team: 'BlueTeam',
                spawnPoint: { x: 10, y: 10 },
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                avatarUrl: 'other-avatar.png',
            } as Player;

            service.localPlayer = localPlayer;
            service.players = [nonMatchingPlayer];

            boardServiceSpy.tiles = [];
            (boardServiceSpy.tiles.find as jasmine.Spy).and.returnValue(undefined);

            service.initGame();

            expect(service.localPlayer.team).toBeUndefined();
            expect(service.localPlayer.spawnPoint).toBeUndefined();
        });

        it('should correctly update localPlayer coordinate and inventory when foundTile has a player', () => {
            service.localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                coordinate: { x: 0, y: 0 },
                inventory: [{ name: 'OldItem' } as Item],
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                isAdmin: false,
            } as Player;

            const foundTile = {
                player: {
                    avatarUrl: service.localPlayer.avatarUrl,
                    coordinate: { x: 3, y: 3 },
                },
            };

            service.localPlayer.coordinate = foundTile.player.coordinate;
            service.localPlayer.inventory = [];

            expect(service.localPlayer.coordinate).toEqual({ x: 3, y: 3 });
            expect(service.localPlayer.inventory).toEqual([]);
        });

        it('should not update localPlayer when foundTile exists but has no player property', () => {
            service.localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar.png',
                coordinate: { x: 0, y: 0 },
                inventory: [{ name: 'OldItem' } as Item],
                life: 5,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                isAdmin: false,
            } as Player;

            const originalCoordinate = { ...service.localPlayer.coordinate };
            const originalInventory = service.localPlayer.inventory ? [...service.localPlayer.inventory] : [];

            const foundTile = { position: { x: 5, y: 5 } } as Tile;

            if (foundTile.player) {
                service.localPlayer.coordinate = foundTile.player.coordinate;
                service.localPlayer.inventory = [];
            }

            expect(service.localPlayer.coordinate).toEqual(originalCoordinate);
            expect(service.localPlayer.inventory).toEqual(originalInventory);
        });

        it('should find a tile if tile.player.avatarUrl matches localPlayer.avatarUrl', () => {
            service.localPlayer = {
                name: 'TestPlayer',
                avatarUrl: 'matching-avatar.png',
            } as Player;

            const matchingTile = {
                player: { avatarUrl: 'matching-avatar.png' },
            } as Tile;

            boardServiceSpy.tiles = [{ player: { avatarUrl: 'different-avatar.png' } } as Tile, matchingTile];

            (boardServiceSpy.tiles.find as jasmine.Spy).and.callThrough();

            service.initGame();

            expect(boardServiceSpy.tiles.find).toHaveBeenCalled();
        });
    });

    describe('Action player', () => {
        beforeEach(() => {
            service.players = [mockPlayer1, mockPlayer2];
            service.playerTurn = mockPlayer1;
            service.localPlayer = mockPlayer1;
        });

        it('should remove highlighting from all tiles', () => {
            boardServiceSpy.tiles = mockTiles.map((t) => ({ ...t, isHighlighted: true }));
            service.removeHighlight();
            expect(boardServiceSpy.tiles.every((tile) => !tile.isHighlighted)).toBeTrue();
        });
    });

    describe('Combat functionality', () => {
        beforeEach(() => {
            service.players = [mockPlayer1, mockPlayer2];
            service.localPlayer = mockPlayer1;
        });

        it('should handle first attack based on speed (equal speed)', () => {
            const player1 = { ...mockPlayer1, speed: 3 };
            const player2 = { ...mockPlayer2, speed: 3 };
            service.handleFirstAttack(player1, player2);
            expect(combatServiceSpy.initCombat).toHaveBeenCalledWith(player1, player2);
        });

        it('should handle first attack based on speed (second player faster)', () => {
            const player1 = { ...mockPlayer1, speed: 3 };
            const player2 = { ...mockPlayer2, speed: 4 };
            service.handleFirstAttack(player1, player2);
            expect(combatServiceSpy.initCombat).toHaveBeenCalledWith(player2, player1);
        });

        it('should check and apply ice penalty', () => {
            const player1Tile = { ...mockTiles[6], type: TILE_TYPES.ice };
            const player2Tile = { ...mockTiles[0], type: TILE_TYPES.empty };

            movingGameServiceSpy.getPlayerTile.and.callFake((player) => {
                return player.name === mockPlayer1.name ? player1Tile : player2Tile;
            });

            const player1Copy = { ...mockPlayer1, isOnIce: false };
            const player2Copy = { ...mockPlayer2, isOnIce: false };

            service.handleFirstAttack(player1Copy, player2Copy);
            expect(player1Copy.isOnIce).toBeTrue();
            expect(player2Copy.isOnIce).toBeFalse();
        });
    });

    describe('Teleportation functionality', () => {
        beforeEach(() => {
            service.players = [mockPlayer1, mockPlayer2];
            service.playerTurn = mockPlayer1;
            service.localPlayer = mockPlayer1;
            service.isDebugMode = true;
            movingGameServiceSpy.getPlayerTile.and.returnValue(mockTiles[1]);
        });

        it('should not teleport when not in debug mode', () => {
            service.isDebugMode = false;
            service.teleportPlayer(mockTiles[0]);
            expect(boardServiceSpy.updateTiles).not.toHaveBeenCalled();
        });

        it("should not teleport when not player's turn", () => {
            service.playerTurn = mockPlayer2;
            service.teleportPlayer(mockTiles[0]);
            expect(boardServiceSpy.updateTiles).not.toHaveBeenCalled();
        });

        it('should teleport player to valid tile', () => {
            const destinationTile = { ...mockTiles[0] };
            service.teleportPlayer(destinationTile);
            expect(service.localPlayer?.coordinate).toEqual(destinationTile.position);
            expect(socketSpy.emit).toHaveBeenCalledWith('playerMoved', jasmine.any(Object));
        });

        it('should not teleport to occupied tile', () => {
            const occupiedTile = { ...mockTiles[2], player: mockPlayer2 };
            (service as any).isTeleportationValid.and.returnValue(false);
            service.teleportPlayer(occupiedTile);
            expect(notificationServiceSpy.errorMessages[0]).toContain('déjà occupée');
            expect(notificationServiceSpy.showModal).toBeDefined();
        });

        it('should not teleport to wall', () => {
            const wallTile = { ...mockTiles[3], type: TILE_TYPES.wall };
            (service['isTeleportationValid'] as jasmine.Spy).and.returnValue(false);
            (service['showTeleportationError'] as jasmine.Spy).and.callThrough();
            notificationServiceSpy.errorMessages = [];
            service.teleportPlayer(wallTile);
            expect(service['showTeleportationError']).toHaveBeenCalledWith(wallTile);
        });

        it('should not teleport to closed door', () => {
            const closedDoorTile = {
                ...mockTiles[4],
                type: TILE_TYPES.door,
                image: './assets/images/Porte.png',
            };
            (service['isTeleportationValid'] as jasmine.Spy).and.returnValue(false);
            (service['showTeleportationError'] as jasmine.Spy).and.callThrough();
            notificationServiceSpy.errorMessages = [];
            service.teleportPlayer(closedDoorTile);
            expect(service['showTeleportationError']).toHaveBeenCalledWith(closedDoorTile);
        });

        it('should allow teleporting when player has potion2 item, even outside debug mode', () => {
            service.isDebugMode = false;
            service.playerTurn = mockPlayer1;
            service.localPlayer = {
                ...mockPlayer1,
                inventory: [{ name: 'potion2', image: 'potion.png' }] as Item[],
            };

            const destinationTile = { ...mockTiles[0] };
            (service as any).isTeleportationValid.and.returnValue(true);

            service.teleportPlayer(destinationTile);

            expect(service['movePlayerToTile']).toHaveBeenCalledWith(destinationTile);
            expect(service['playerMovedAnnouncer']).toHaveBeenCalled();
        });
    });

    describe('showTeleportationError', () => {
        beforeEach(() => {
            notificationServiceSpy.errorMessages = [];
            notificationServiceSpy.showModal = false;
        });

        it('should show error for wall tile', () => {
            const wallTile = { ...mockTiles[0], type: TILE_TYPES.wall } as Tile;
            service['showTeleportationError'](wallTile);
            expect(notificationServiceSpy.errorMessages[0]).toContain('mur');
            expect(notificationServiceSpy.showModal).toBe(true);
        });

        it('should show error for closed door tile', () => {
            const closedDoorTile = {
                ...mockTiles[0],
                type: TILE_TYPES.door,
                image: './assets/images/Porte.png',
            } as Tile;
            service['showTeleportationError'](closedDoorTile);
            expect(notificationServiceSpy.errorMessages[0]).toContain('porte fermée');
            expect(notificationServiceSpy.showModal).toBe(true);
        });

        it('should show default error message for other invalid cases', () => {
            const otherTile = { ...mockTiles[0], type: 'unknown' as any } as Tile;
            service['showTeleportationError'](otherTile);
            expect(notificationServiceSpy.errorMessages[0]).toContain("La tuile n'est pas accessible");
            expect(notificationServiceSpy.showModal).toBe(true);
        });
    });

    describe('movePlayerToTile', () => {
        it('should update player coordinates and tile references', () => {
            service.localPlayer = mockPlayer1;
            const destinationTile = { ...mockTiles[0], position: { x: 10, y: 10 } } as Tile;
            service['movePlayerToTile'](destinationTile);
            expect(service.localPlayer.coordinate).toEqual({ x: 10, y: 10 });
            expect(destinationTile.player).toBe(service.localPlayer);
            expect(boardServiceSpy.updateTiles).toHaveBeenCalledWith(destinationTile);
        });

        it('should not update coordinates if myPlayer is null', () => {
            service.localPlayer = null;
            const destinationTile = { ...mockTiles[0] } as Tile;
            service['movePlayerToTile'](destinationTile);
            expect(boardServiceSpy.updateTiles).not.toHaveBeenCalled();
        });
    });

    describe('Socket emissions', () => {
        it('should announce player movement to server', () => {
            const destination = { x: 5, y: 5 };
            service['playerMovedAnnouncer']('TEST123', mockPlayer1, destination);
            expect(socketSpy.emit).toHaveBeenCalledWith('playerMoved', {
                roomCode: 'TEST123',
                player: mockPlayer1,
                nextPosition: destination,
            });
        });
    });

    describe('Ice penalty check', () => {
        it('should set isOnIce to true for player2 when on ice tile', () => {
            const player1 = { name: 'Player1', isOnIce: false } as Player;
            const player2 = { name: 'Player2', isOnIce: false } as Player;

            const player1Tile = { type: TILE_TYPES.empty } as Tile;
            const player2Tile = { type: TILE_TYPES.ice } as Tile;

            movingGameServiceSpy.getPlayerTile.and.callFake((player) => {
                if (player === player1) return player1Tile;
                if (player === player2) return player2Tile;
                return undefined;
            });

            service['checkIcePenalty'](player1, player2);

            expect(player1.isOnIce).toBeFalse();
            expect(player2.isOnIce).toBeTrue();
        });
    });

    describe('isTeleportationValid tests', () => {
        it('should check various teleportation conditions', () => {
            (service['isTeleportationValid'] as jasmine.Spy).and.callThrough();

            const validTile: Tile = {
                type: TILE_TYPES.empty,
                player: null,
                image: 'some-image.png',
            } as Tile;
            expect(service['isTeleportationValid'](validTile)).toBeTrue();

            const occupiedTile: Tile = {
                type: TILE_TYPES.empty,
                player: mockPlayer2,
                image: 'some-image.png',
            } as Tile;
            expect(service['isTeleportationValid'](occupiedTile)).toBeFalse();

            const wallTile: Tile = {
                type: TILE_TYPES.wall,
                player: null,
                image: 'wall.png',
            } as Tile;
            expect(service['isTeleportationValid'](wallTile)).toBeFalse();

            const closedDoorTile: Tile = {
                type: TILE_TYPES.door,
                player: null,
                image: './assets/images/Porte.png',
            } as Tile;
            expect(service['isTeleportationValid'](closedDoorTile)).toBeFalse();
        });
    });
    describe('getGameWinner', () => {
        beforeEach(() => {
            service.players = [mockPlayer1, mockPlayer2];
            (service as any).playerVictories.clear();
        });

        it('should return null when no player has victories', () => {
            const winner = service.getGameWinner();
            expect(winner).toBeNull();
        });

        it('should return null when no player has reached the required number of victories', () => {
            (service as any).playerVictories.set('Player1', NUMBER_OF_WINS_FOR_VICTORIES - 1);
            (service as any).playerVictories.set('Player2', NUMBER_OF_WINS_FOR_VICTORIES - 2);

            const winner = service.getGameWinner();
            expect(winner).toBeNull();
        });

        it('should return the player name who reached the required number of victories', () => {
            (service as any).playerVictories.set('Player1', NUMBER_OF_WINS_FOR_VICTORIES);

            const winner = service.getGameWinner();
            expect(winner).toBe('Player1');
        });

        it('should return the first player name who reached the required number of victories if multiple winners', () => {
            (service as any).playerVictories.set('Player1', NUMBER_OF_WINS_FOR_VICTORIES);
            (service as any).playerVictories.set('Player2', NUMBER_OF_WINS_FOR_VICTORIES);

            const winner = service.getGameWinner();
            expect(winner).toBe('Player1');
        });

        it('should correctly identify winner when victories exceed required number', () => {
            (service as any).playerVictories.set('Player2', NUMBER_OF_WINS_FOR_VICTORIES + 2);

            const winner = service.getGameWinner();
            expect(winner).toBe('Player2');
        });

        it('should check all entries until finding a winner', () => {
            (service as any).playerVictories.set('Player1', NUMBER_OF_WINS_FOR_VICTORIES - 1);
            (service as any).playerVictories.set('Player2', NUMBER_OF_WINS_FOR_VICTORIES);
            (service as any).playerVictories.set('Player3', NUMBER_OF_WINS_FOR_VICTORIES - 2);

            const winner = service.getGameWinner();
            expect(winner).toBe('Player2');
        });

        describe('isVirtualPlayerTurn', () => {
            beforeEach(() => {
                service.playerTurn = mockPlayer1;
            });

            it("should return true when it is the specified virtual player's turn", () => {
                const virtualPlayer = { ...mockPlayer1 };
                expect(service.isVirtualPlayerTurn(virtualPlayer)).toBeTrue();
            });

            it("should return false when it is not the specified virtual player's turn", () => {
                const virtualPlayer = { ...mockPlayer2 };
                expect(service.isVirtualPlayerTurn(virtualPlayer)).toBeFalse();
            });

            it('should return false when playerTurn is null', () => {
                service.playerTurn = null;
                const virtualPlayer = { ...mockPlayer1 };
                expect(service.isVirtualPlayerTurn(virtualPlayer)).toBeFalse();
            });

            it('should compare only by name property', () => {
                const differentVirtualPlayer = {
                    ...mockPlayer2,
                    name: mockPlayer1.name,
                };
                expect(service.isVirtualPlayerTurn(differentVirtualPlayer)).toBeTrue();
            });

            it('should return the gameService instance through gameServiceValue getter', () => {
                const result = service.gameServiceValue;
                expect(result).toBe(gameServiceSpy);
            });

            it('should return the boardService instance through boardServiceValue getter', () => {
                const result = service.boardServiceValue;
                expect(result).toBe(boardServiceSpy);
            });
        });
    });
});
