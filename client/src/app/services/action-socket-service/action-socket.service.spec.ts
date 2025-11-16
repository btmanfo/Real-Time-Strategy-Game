/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TILE_TYPES, TIME_BETWEEN_TURNS_MS } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { ActionSocketService } from '@app/services/action-socket-service/action-socket.service';
import { BoardService } from '@app/services/board-service/board.service';
import { GameService } from '@app/services/game-service/game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingItemsService } from '@app/services/playing-items-service/playing-items.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Player, Position, Tile } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';

describe('ActionSocketService', () => {
    const createMockTile = (x: number, y: number): Tile => {
        return {
            position: { x, y },
            type: 'floor',
            traversable: true,
            image: 'image.png',
            player: null,
            item: null,
            isReachable: true,
            cost: 0,
        };
    };

    let service: ActionSocketService;
    let mockSocket: jasmine.SpyObj<any>;
    let mockBoardService: jasmine.SpyObj<BoardService>;
    let mockPlayingService: jasmine.SpyObj<PlayingService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockMovingGameService: jasmine.SpyObj<MovingGameService>;
    let mockActionService: jasmine.SpyObj<ActionService>;
    let mockPlayingItemsService: jasmine.SpyObj<PlayingItemsService>;

    const mockPlayer1: Player = {
        name: 'Player1',
        avatarUrl: 'avatar1',
        life: 6,
        speed: 3,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: 1, y: 1 },
        isAdmin: true,
    };

    const mockPlayer2: Player = {
        name: 'Player2',
        avatarUrl: 'avatar2',
        life: 6,
        speed: 3,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: 2, y: 2 },
        isAdmin: false,
    };

    let mockTile: Tile = {
        position: { x: 1, y: 1 },
        type: 'floor',
        traversable: true,
        image: 'image.png',
        player: null,
        item: null,
        isReachable: true,
        cost: 0,
    };

    const mockDoorTile: Tile = {
        position: { x: 3, y: 3 },
        type: TILE_TYPES.door,
        traversable: false,
        image: './assets/images/Porte.png',
        player: null,
        item: null,
        isReachable: false,
        cost: 0,
    };

    beforeEach(() => {
        mockSocket = jasmine.createSpyObj('Socket', ['on', 'off', 'emit']);
        mockActionService = jasmine.createSpyObj('ActionService', ['canAction', 'actionPlayer', 'checkEndTurn', 'checkSurroundingTiles']);
        mockActionService.canAction = 0;
        mockBoardService = jasmine.createSpyObj('BoardService', ['updateTiles', 'tiles'], {});
        mockBoardService.tiles = [mockTile, mockDoorTile];
        mockNotificationService = jasmine.createSpyObj('NotificationService', [
            'setIsTimedNotification',
            'showNotification',
            'errorMessages',
            'showModal',
        ]);
        mockPlayingItemsService = jasmine.createSpyObj('PlayingItemsService', ['replaceItem', 'dropLoserItems']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockNotificationService.errorMessages = [];
        mockNotificationService.showModal = false;

        mockGameService = jasmine.createSpyObj('GameService', ['setNewGame']);

        mockMovingGameService = jasmine.createSpyObj('MovingGameService', [
            'getAccessibleTiles',
            'setReachableForTiles',
            'animatePlayerMovement',
            'setIsOnIce',
            'isPopupItemChoiceVisible',
            'movePoints',
            'getPlayerTile',
        ]);
        mockMovingGameService.getAccessibleTiles.and.returnValue([mockTile]);
        mockMovingGameService.movePoints = 0;
        mockMovingGameService.isPopupItemChoiceVisible = false;
        mockPlayingService = jasmine.createSpyObj(
            'PlayingService',
            [
                'managePlayerTurn',
                'nextPlayer',
                'handleFirstAttack',
                'checkEndTurn',
                'updatePlayerHealth',
                'isPlaying',
                'updatePlayerVictories',
                'checkSurroundingTiles',
                'setPlayerTurn',
                'combat',
                'players',
                'playerTurn',
                'actionPlayer',
                'handleFirstAttack',
                'isPlayerTurn',
                'currentMovingPoints',
                'playerTurnSubject',
                'isVirtualPlayerTurn',
            ],
            {
                joinGameService: {
                    socket: mockSocket,
                    pinCode: 'TEST123',
                },
                boardService: mockBoardService,
                boardServiceValue: mockBoardService,
                combatService: jasmine.createSpyObj('CombatService', ['initCombat', 'setIsOnIce', 'setPlayers', 'handleOpponentQuit']),
                movingGameService: mockMovingGameService,
            },
        );
        mockPlayingService.playerTurnSubject = new BehaviorSubject<Player | null>(null);
        mockPlayingService.currentMovingPoints = 0;
        mockPlayingService.isPlaying = true;
        mockPlayingService.combat = false;
        mockActionService.canAction = 0;
        mockPlayingService.playerTurn = mockPlayer1;
        mockPlayingService.localPlayer = mockPlayer1;
        mockPlayingService.players = [mockPlayer1, mockPlayer2];
        TestBed.configureTestingModule({
            providers: [
                ActionSocketService,
                { provide: BoardService, useValue: mockBoardService },
                { provide: PlayingService, useValue: mockPlayingService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: Router, useValue: mockRouter },
                { provide: GameService, useValue: mockGameService },
                { provide: MovingGameService, useValue: mockMovingGameService },
                { provide: ActionService, useValue: mockActionService },
                { provide: PlayingItemsService, useValue: mockPlayingItemsService },
            ],
        });

        service = TestBed.inject(ActionSocketService);
        service = TestBed.inject(ActionSocketService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('manageSocketEvents', () => {
        it('should register all socket event handlers', () => {
            service.manageSocketEvents();

            expect(mockSocket.on).toHaveBeenCalledWith('endTurn', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('quitGame', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('animatePlayerMove', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('combatEscaped', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('combatEnded', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('combatUpdate', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('itemChoice', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('movePlayer', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('toggleDoor', jasmine.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('inventoryUpdate', jasmine.any(Function));
        });

        describe('destroySocketEvents', () => {
            it('should unregister all socket event handlers', () => {
                service.destroySocketEvents();

                expect(mockSocket.off).toHaveBeenCalledWith('endTurn', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('quitGame', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('animatePlayerMove', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('combatEscaped', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('combatEnded', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('combatUpdate', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('itemChoice', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('movePlayer', jasmine.any(Function));
                expect(mockSocket.off).toHaveBeenCalledWith('toggleDoor', jasmine.any(Function));
            });
            it('should not re-register socket events if already initialized', () => {
                service.manageSocketEvents();

                mockSocket.on.calls.reset();

                service.manageSocketEvents();

                expect(mockSocket.on).not.toHaveBeenCalled();
            });
        });

        describe('toggleDoorHandler', () => {
            it('should update tile and set reachable tiles when player is current turn player', () => {
                const updatedTile = { ...mockDoorTile, traversable: true, image: './assets/images/Porte-ferme.png' };
                mockBoardService.tiles = [mockTile, mockDoorTile];
                const handler = (service as any).toggleDoorHandler;
                mockMovingGameService.getAccessibleTiles.and.returnValue([mockTile]);
                handler(updatedTile);

                expect(mockBoardService.tiles[1]).toEqual(updatedTile);
                expect(mockMovingGameService.getAccessibleTiles).toHaveBeenCalled();
                expect(mockMovingGameService.setReachableForTiles).toHaveBeenCalled();
            });
        });

        describe('animatePlayerMoveHandler', () => {
            it('should call animatePlayerMovement with map and player', () => {
                const handler = (service as any).animatePlayerMoveHandler;
                handler({ map: [mockTile], player: mockPlayer1 });

                expect(mockMovingGameService.animatePlayerMovement).toHaveBeenCalledWith([mockTile], mockPlayer1);
            });
        });

        describe('combatUpdateHandler', () => {
            it('should update player health and notify subscribers', () => {
                const handler = (service as any).combatUpdateHandler;
                const updatedAttacker = { ...mockPlayer1, life: 4 };
                const updatedDefender = { ...mockPlayer2, life: 3 };

                handler({ attacker: updatedAttacker, defender: updatedDefender });

                expect(mockPlayingService.updatePlayerHealth).toHaveBeenCalledWith(updatedAttacker.name ?? '', updatedAttacker.life);
                expect(mockPlayingService.updatePlayerHealth).toHaveBeenCalledWith(updatedDefender.name ?? '', updatedDefender.life);
            });
        });

        describe('combatEscapedHandler', () => {
            it('should end combat mode and show notification', () => {
                const handler = (service as any).combatEscapedHandler;
                handler({ escapee: 'Player2' });

                expect(mockPlayingService.combat).toBeFalse();
                expect(mockNotificationService.showNotification).toHaveBeenCalledWith('Combat fini, Player2 a fui...', false);
            });
        });

        describe('endTurn', () => {
            let endTurn: any;
            beforeEach(() => {
                endTurn = (service as any).endTurn;
            });

            it('should emit endTurn when player is stuck', () => {
                mockMovingGameService.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
                mockActionService.canAction = 2;
                endTurn.call(service);
                expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', { roomCode: 'TEST123' });
            });

            it('should emit endTurn when movement action is over', () => {
                mockMovingGameService.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
                mockActionService.checkSurroundingTiles.and.returnValue(false);
                mockActionService.canAction = 0;
                endTurn.call(service);
                expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', { roomCode: 'TEST123' });
            });

            it('should not emit endTurn when conditions are not met', () => {
                mockMovingGameService.getAccessibleTiles.and.returnValue([
                    { position: { x: 0, y: 0 } } as Tile,
                    { position: { x: 1, y: 1 } } as Tile,
                ]);
                mockActionService.checkSurroundingTiles.and.returnValue(true);
                mockActionService.canAction = 0;
                endTurn.call(service);
                expect(mockSocket.emit).not.toHaveBeenCalled();
            });
        });

        describe('movePlayerHandler', () => {
            it('should update tile and player positions', () => {
                const nextTile: Tile = { position: { x: 1, y: 1 }, cost: 1 } as Tile;
                const previousTile: Tile = { position: { x: 0, y: 0 } } as Tile;
                const player: Player = {
                    name: 'Test Player',
                    inventory: [],
                    avatarUrl: 'default-avatar.png',
                    life: 10,
                    speed: 5,
                    attack: 'Sword',
                    defense: 'Shield',
                    coordinate: { x: 0, y: 0 },
                    isAdmin: false,
                };
                mockMovingGameService.isPopupItemChoiceVisible = true;
                mockMovingGameService.movePoints = 1;
                mockPlayingService.isPlayerTurn.and.returnValue(true);
                mockBoardService.tiles = [{ position: previousTile.position }, { position: nextTile.position }] as Tile[];
                (service as any).movePlayerHandler({ nextTile, previousTile, player });

                expect(mockBoardService.tiles[0].player).toBeNull();
                expect(mockBoardService.tiles[1].player).toEqual(player);
                expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
                expect(mockMovingGameService.movePoints).toBe(0);
            });

            it('should call setPlayer if player is turn', () => {
                const nextTile: Tile = { position: { x: 1, y: 1 } } as Tile;
                const previousTile: Tile = { position: { x: 0, y: 0 } } as Tile;
                const player: Player = {
                    name: 'Test Player',
                    inventory: [],
                    avatarUrl: 'default-avatar.png',
                    life: 10,
                    speed: 5,
                    attack: 'Sword',
                    defense: 'Shield',
                    coordinate: { x: 0, y: 0 },
                    isAdmin: false,
                };
                spyOn(service as any, 'setPlayer');
                mockPlayingService.isPlayerTurn.and.returnValue(true);

                (service as any).movePlayerHandler({ nextTile, previousTile, player });

                expect((service as any).setPlayer).toHaveBeenCalled();
            });

            it('should set popup to true if inventory length is 0', () => {
                const nextTile: Tile = { position: { x: 1, y: 1 } } as Tile;
                const previousTile: Tile = { position: { x: 0, y: 0 } } as Tile;
                const player: Player = {
                    name: 'Test Player',
                    inventory: [{} as Item, {} as Item, {} as Item],
                    life: 10,
                    speed: 5,
                    attack: 'Sword',
                    defense: 'Shield',
                    coordinate: { x: 0, y: 0 },
                    isAdmin: false,
                    avatarUrl: 'default-avatar.png',
                } as Player;
                mockPlayingService.isPlayerTurn.and.returnValue(true);

                (service as any).movePlayerHandler({ nextTile, previousTile, player });

                expect(mockMovingGameService.isPopupItemChoiceVisible).toBeTrue();
            });

            it('should handle null inventory by using empty array fallback', () => {
                const nextTile: Tile = { position: { x: 1, y: 1 }, cost: 1 } as Tile;
                const previousTile: Tile = { position: { x: 0, y: 0 } } as Tile;

                const player: Player = {
                    name: 'Test Player',
                    inventory: undefined,
                    avatarUrl: 'default-avatar.png',
                    life: 10,
                    speed: 5,
                    attack: 'Sword',
                    defense: 'Shield',
                    coordinate: { x: 0, y: 0 },
                    isAdmin: false,
                };

                mockMovingGameService.isPopupItemChoiceVisible = false;
                mockPlayingService.isPlayerTurn.and.returnValue(true);
                mockBoardService.tiles = [{ position: previousTile.position }, { position: nextTile.position }] as Tile[];

                (service as any).movePlayerHandler({ nextTile, previousTile, player });

                expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
            });
        });

        describe('setPlayer', () => {
            it('should update player coordinates and inventory', () => {
                const nextTile: Tile = { position: { x: 1, y: 1 } } as Tile;
                const previousTile: Tile = { position: { x: 0, y: 0 } } as Tile;
                const player: Player = {
                    name: 'Test Player',
                    inventory: [
                        {
                            name: 'Test Item',
                            id: 1,
                            description: 'A test item',
                            isOutOfContainer: false,
                            position: { x: 0, y: 0 },
                            image: 'test-image.png',
                            type: 'test-type',
                        } as Item,
                    ],
                } as Player;

                (service as any).setPlayer({ nextTile, previousTile, player });

                expect(mockPlayingService.localPlayer?.coordinate).toEqual(nextTile.position);
                expect(mockPlayingService.localPlayer?.inventory).toEqual(player.inventory);
                expect(mockPlayingService.playerTurn?.coordinate).toEqual(nextTile.position);
                expect(mockPlayingService.playerTurn?.inventory).toEqual(player.inventory);
            });
        });

        describe('itemChoiceHandler', () => {
            it('should set the item on the target tile and hide the popup', () => {
                const mockItem = { name: 'Test Item' } as Item;
                const mockPosition = { x: 1, y: 1 } as Position;
                mockTile = { position: mockPosition, item: null } as Tile;
                mockBoardService.tiles = [mockTile];

                service['itemChoiceHandler']({ item: mockItem, playerPosition: mockPosition, roomCode: '1234' });

                expect(mockTile.item).toEqual(mockItem);
                expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
            });

            it('should remove the item from the local player inventory if it is their turn', () => {
                const mockItem = { name: 'Test Item' } as Item;
                const mockPosition = { x: 1, y: 1 } as Position;
                mockTile = { position: mockPosition, item: null } as Tile;
                mockBoardService.tiles = [mockTile];
                mockPlayingService.isPlayerTurn.and.returnValue(true);
                mockPlayingService.localPlayer = {
                    name: 'Player1',
                    inventory: [{ name: 'Test Item' } as Item],
                } as Player;

                service['itemChoiceHandler']({ item: mockItem, playerPosition: mockPosition, roomCode: '1234' });

                expect(mockPlayingService.localPlayer.inventory).toEqual([]);
            });

            it('should remove the item from the dropping player inventory if it is not the local player\'s turn and the item is "chestbox-2"', () => {
                const mockItem = { name: 'chestbox-2' } as Item;
                const mockPosition = { x: 1, y: 1 } as Position;
                mockTile = { position: mockPosition, player: { name: 'Player2' } as Player, item: null } as Tile;
                mockBoardService.tiles = [mockTile];
                mockPlayingService.isPlayerTurn.and.returnValue(false);
                mockPlayingService.players = [{ name: 'Player2', inventory: [{ name: 'chestbox-2' } as Item] } as Player];

                service['itemChoiceHandler']({ item: mockItem, playerPosition: mockPosition, roomCode: '1234' });

                const droppingPlayer = mockPlayingService.players.find((p) => p.name === 'Player2');
                expect(droppingPlayer?.inventory).toEqual([]);
            });

            it('should not modify anything if the target tile is not found', () => {
                const mockItem = { name: 'Test Item' } as Item;
                const mockPosition = { x: 1, y: 1 } as Position;
                mockBoardService.tiles = [];

                service['itemChoiceHandler']({ item: mockItem, playerPosition: mockPosition, roomCode: '1234' });

                expect(mockBoardService.tiles.length).toBe(0);
                expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
            });

            it('should not remove the item from the local player inventory if the item is not found in the inventory', () => {
                const mockItem = { name: 'Nonexistent Item' } as Item;
                const mockPosition = { x: 1, y: 1 } as Position;
                mockTile = { position: mockPosition, item: null } as Tile;
                mockBoardService.tiles = [mockTile];
                mockPlayingService.isPlayerTurn.and.returnValue(true);
                mockPlayingService.localPlayer = {
                    name: 'Player1',
                    inventory: [{ name: 'Test Item' } as Item],
                } as Player;

                service['itemChoiceHandler']({ item: mockItem, playerPosition: mockPosition, roomCode: '1234' });

                expect(mockPlayingService.localPlayer.inventory).toEqual([{ name: 'Test Item' } as Item]);
            });

            it('should filter out item with matching name from localPlayer inventory', () => {
                const item1 = { name: 'TestItem1' } as Item;
                const item2 = { name: 'TestItem2' } as Item;
                const item3 = { name: 'TestItem3' } as Item;

                mockPlayingService.localPlayer = {
                    name: 'Player1',
                    inventory: [item1, item2, item3],
                    coordinate: { x: 0, y: 0 },
                    life: 10,
                    speed: 5,
                    attack: 'Attack',
                    defense: 'Defense',
                    avatarUrl: 'avatar-url',
                    isAdmin: false,
                } as Player;

                mockPlayingService.isPlayerTurn.and.returnValue(true);

                mockPlayingService.players = [
                    {
                        name: 'Player1',
                        inventory: [item1, item2, item3],
                        coordinate: { x: 0, y: 0 },
                        life: 10,
                        speed: 5,
                        attack: 'Attack',
                        defense: 'Defense',
                        avatarUrl: 'avatar-url',
                        isAdmin: false,
                    } as Player,
                ];

                const playerPosition = { x: 0, y: 0 };
                const tile = createMockTile(0, 0);
                tile.player = mockPlayingService.localPlayer;
                mockBoardService.tiles = [tile];

                service['itemChoiceHandler']({
                    item: item2,
                    playerPosition,
                    roomCode: 'TEST123',
                });

                expect(mockPlayingService.localPlayer.inventory).toEqual([item1, item3]);

                expect(mockPlayingService.players[0].inventory).toEqual([item1, item3]);
            });
        });

        describe('endTurnHandler', () => {
            it('should call replaceItem if notification is true', () => {
                (service as any).endTurnHandler({ roomCode: '1234', playerTurn: { name: 'Test Player' }, isNotification: true });
                expect(mockPlayingItemsService.replaceItem).toHaveBeenCalled();
            });

            it('should update player turn and call actionPlayer', () => {
                (service as any).endTurnHandler({ roomCode: '1234', playerTurn: { name: 'Test Player' }, isNotification: false });
                expect(mockPlayingService.playerTurn).toEqual({ name: 'Test Player' } as Player);
                expect(mockActionService.actionPlayer).toHaveBeenCalled();
            });

            it('should update player turn subject', () => {
                const player = { name: 'Test Player' } as Player;
                spyOn(mockPlayingService.playerTurnSubject, 'next');

                (service as any).endTurnHandler({ roomCode: '1234', playerTurn: player, isNotification: false });
                expect(mockPlayingService.playerTurnSubject.next).toHaveBeenCalledWith(player);
            });
        });

        describe('combatEndedHandler', () => {
            let handler: any;

            beforeEach(() => {
                handler = (service as any).combatEndedHandler;
            });

            it('should check end turn conditions if winner is current player', () => {
                mockPlayingService.playerTurn = {
                    name: 'Player1',
                    avatarUrl: 'avatar1',
                    life: 6,
                    speed: 3,
                    attack: '6 Faces',
                    defense: '4 Faces',
                    coordinate: { x: 1, y: 1 },
                    isAdmin: true,
                };
                spyOn(service as any, 'checkEndTurnConditions');

                handler({ winner: 'Player1', loser: 'Player2' });

                expect((service as any).checkEndTurnConditions).toHaveBeenCalled();
            });
        });

        describe('quitGameHandler', () => {
            it('should call handlePlayerLeft when no players remain', () => {
                spyOn<any>(service, 'isPlayerStillInGame').and.returnValue(false);
                spyOn<any>(service, 'handlePlayerLeft');

                service['quitGameHandler']([], []);

                expect(service['handlePlayerLeft']).toHaveBeenCalled();
            });

            it('should call handleOnlyOnePlayerLeft when one player remains', () => {
                spyOn<any>(service, 'isPlayerStillInGame').and.returnValue(true);
                spyOn<any>(service, 'isOnlyOnePlayerLeft').and.returnValue(true);
                spyOn<any>(service, 'handleOnlyOnePlayerLeft');

                service['quitGameHandler']([{} as Player], []);

                expect(service['handleOnlyOnePlayerLeft']).toHaveBeenCalled();
            });

            it('should update the game state when multiple players remain', () => {
                spyOn<any>(service, 'isPlayerStillInGame').and.returnValue(true);
                spyOn<any>(service, 'isOnlyOnePlayerLeft').and.returnValue(false);
                spyOn<any>(service, 'updateGameState');

                const players = [{} as Player, {} as Player];
                const map = [{} as Tile];

                service['quitGameHandler'](players, map);

                expect(service['updateGameState']).toHaveBeenCalledWith(players, map);
            });

            it('should handle combat quit if combat is active', () => {
                spyOn<any>(service, 'handleCombatQuit');
                mockPlayingService.combat = true;
                const players = [{ name: 'Player1' } as Player, { name: 'Player2' } as Player];
                const map = [{} as Tile];

                service['quitGameHandler'](players, map);

                expect(service['handleCombatQuit']).toHaveBeenCalledWith(players);
            });

            it('should update boardService.tiles', () => {
                const players = [{ name: 'Player1' } as Player, { name: 'Player2' } as Player];
                const map = [{} as Tile];

                service['quitGameHandler'](players, map);

                expect(mockBoardService.tiles).toEqual(map);
            });

            it('should not update boardService.tiles if no players', () => {
                const players = [{} as Player, {} as Player];
                const map = [{} as Tile];

                service['quitGameHandler'](players, map);

                expect(mockBoardService.tiles).not.toEqual(map);
            });

            it('should not update boardService.tiles if one player', () => {
                const players = [{ name: 'Player1' } as Player];
                const map = [{} as Tile];

                service['quitGameHandler'](players, map);

                expect(mockBoardService.tiles).not.toEqual(map);
            });
        });

        describe('findMissingPlayerName', () => {
            it('should return the name of the player who left', () => {
                const missingPlayerName = (service as any).findMissingPlayerName([mockPlayer1, mockPlayer2], [mockPlayer1]);
                expect(missingPlayerName).toBe('Player2');
            });

            it('should return null if no player left', () => {
                const missingPlayerName = (service as any).findMissingPlayerName([mockPlayer1, mockPlayer2], [mockPlayer1, mockPlayer2]);
                expect(missingPlayerName).toBeNull();
            });

            it('should return null if previous players list is empty', () => {
                const missingPlayerName = (service as any).findMissingPlayerName([], [mockPlayer1]);
                expect(missingPlayerName).toBeNull();
            });
        });

        describe('animatePlayerMoveHandler', () => {
            it('should call movingGameService.animatePlayerMovement with map and player', () => {
                const handler = (service as any).animatePlayerMoveHandler;
                const data = { map: [mockTile], player: mockPlayer1 };

                handler(data);

                expect(mockMovingGameService.animatePlayerMovement).toHaveBeenCalledWith(data.map, data.player);
            });
        });

        describe('hideNotificationAfterDelay', () => {
            it('should hide notification and clear error messages after delay', fakeAsync(() => {
                mockNotificationService.showModal = true;
                mockNotificationService.errorMessages = ['Test error message'];

                (service as any).hideNotificationAfterDelay();

                expect(mockNotificationService.showModal).toBeTrue();
                expect(mockNotificationService.errorMessages).toEqual(['Test error message']);

                tick(TIME_BETWEEN_TURNS_MS);

                expect(mockNotificationService.showModal).toBeFalse();
                expect(mockNotificationService.errorMessages).toEqual([]);
            }));

            it('should not hide notification immediately after being called', fakeAsync(() => {
                mockNotificationService.showModal = true;
                mockNotificationService.errorMessages = ['Test error message'];

                (service as any).hideNotificationAfterDelay();

                tick(100);

                expect(mockNotificationService.showModal).toBeTrue();
                expect(mockNotificationService.errorMessages).toEqual(['Test error message']);
            }));
        });
    });

    describe('checkEndTurnConditions', () => {
        beforeEach(() => {
            spyOn<any>(service, 'hideNotificationAfterDelay');
            mockSocket.emit.calls.reset();
        });

        it('should emit endTurn when player is stuck with one tile and canAction is 2', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([mockTile]);

            mockActionService.canAction = 2;

            mockPlayingService.localPlayer = mockPlayer1;
            mockPlayingService.playerTurn = mockPlayer1;

            (service as any).checkEndTurnConditions();

            expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', {
                roomCode: 'TEST123',
            });

            expect(service['hideNotificationAfterDelay']).not.toHaveBeenCalled();
        });

        it('should emit endTurn when movement action is over, canAction is 0, and only one tile is available', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([mockTile]);

            mockActionService.canAction = 0;
            mockActionService.checkSurroundingTiles.and.returnValue(false);

            mockPlayingService.localPlayer = mockPlayer1;
            mockPlayingService.playerTurn = mockPlayer1;

            (service as any).checkEndTurnConditions();

            expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', {
                roomCode: 'TEST123',
            });

            expect(service['hideNotificationAfterDelay']).not.toHaveBeenCalled();
        });

        it('should call hideNotificationAfterDelay when conditions for ending turn are not met (current player)', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([mockTile, { ...mockTile, position: { x: 2, y: 2 } }]);

            mockActionService.checkSurroundingTiles.and.returnValue(true);
            mockActionService.canAction = 2;

            mockPlayingService.localPlayer = mockPlayer1;
            mockPlayingService.playerTurn = mockPlayer1;

            (service as any).checkEndTurnConditions();

            expect(mockSocket.emit).not.toHaveBeenCalled();

            expect(service['hideNotificationAfterDelay']).toHaveBeenCalled();
        });

        it('should call hideNotificationAfterDelay when local player is not the current player turn', () => {
            mockPlayingService.localPlayer = mockPlayer1;
            mockPlayingService.playerTurn = mockPlayer2;

            (service as any).checkEndTurnConditions();

            expect(mockSocket.emit).not.toHaveBeenCalled();

            expect(service['hideNotificationAfterDelay']).toHaveBeenCalled();
        });
    });

    describe('handleTurnManagement', () => {
        beforeEach(() => {
            spyOn(service as any, 'checkEndTurnConditions');
        });

        it('should call checkEndTurnConditions when the winner is the current player turn', () => {
            const data = { winner: 'Player1', loser: 'Player2' };
            mockPlayingService.playerTurn = mockPlayer1;

            (service as any).handleTurnManagement(data);

            expect((service as any).checkEndTurnConditions).toHaveBeenCalled();
        });

        it("should emit endTurn when the loser is the current player turn and it is the local player's turn", () => {
            const data = { winner: 'Player2', loser: 'Player1' };
            mockPlayingService.playerTurn = mockPlayer1;

            mockPlayingService.isPlayerTurn.and.returnValue(true);

            mockSocket.emit.calls.reset();

            (service as any).handleTurnManagement(data);

            expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', {
                roomCode: 'TEST123',
            });

            expect((service as any).checkEndTurnConditions).not.toHaveBeenCalled();
        });

        it('should not call any methods when neither winner nor loser is the current player turn', () => {
            const data = { winner: 'Player3', loser: 'Player4' };
            mockPlayingService.playerTurn = mockPlayer1;

            (service as any).handleTurnManagement(data);

            expect((service as any).checkEndTurnConditions).not.toHaveBeenCalled();
        });
    });

    describe('handleCombatResult', () => {
        beforeEach(() => {
            mockNotificationService.errorMessages = [];
            mockNotificationService.showModal = false;
        });

        it('should show victory message when local player is the winner', () => {
            mockPlayingService.localPlayer = mockPlayer1;

            (service as any).handleCombatResult({
                winner: mockPlayer1.name as string,
                loser: mockPlayer2.name as string,
            });

            expect(mockNotificationService.errorMessages[0]).toBe('Vous avez remporté le combat');
            expect(mockNotificationService.showModal).toBeTrue();
        });

        it('should show defeat message when local player is the loser', () => {
            mockPlayingService.localPlayer = mockPlayer2;

            (service as any).handleCombatResult({
                winner: mockPlayer1.name as string,
                loser: mockPlayer2.name as string,
            });

            expect(mockNotificationService.errorMessages[0]).toBe('Vous avez perdu le combat');
            expect(mockNotificationService.showModal).toBeTrue();
        });

        it('should show generic message when local player is neither winner nor loser', () => {
            const localPlayer = {
                name: 'LocalPlayer',
                avatarUrl: 'avatar3',
                life: 6,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 3, y: 3 },
                isAdmin: false,
            } as Player;

            mockPlayingService.localPlayer = localPlayer;

            (service as any).handleCombatResult({
                winner: mockPlayer1.name as string,
                loser: mockPlayer2.name as string,
            });

            expect(mockNotificationService.errorMessages[0]).toBe(`Combat terminé, ${mockPlayer1.name} a gagné`);
            expect(mockNotificationService.showModal).toBeTrue();
        });
    });

    describe('handleInventoryUpdate', () => {
        beforeEach(() => {
            mockPlayingService.players = [
                {
                    name: 'Player1',
                    inventory: [],
                    coordinate: { x: 1, y: 1 },
                    life: 6,
                    speed: 3,
                    attack: '6 Faces',
                    defense: '4 Faces',
                    avatarUrl: 'avatar1',
                    isAdmin: false,
                } as Player,
                {
                    name: 'Player2',
                    inventory: [],
                    coordinate: { x: 2, y: 2 },
                    life: 6,
                    speed: 3,
                    attack: '6 Faces',
                    defense: '4 Faces',
                    avatarUrl: 'avatar2',
                    isAdmin: false,
                } as Player,
            ];
        });

        it('should update player inventory when player is found', () => {
            const newInventory = [{ name: 'Potion', id: 1 } as Item, { name: 'Sword', id: 2 } as Item];

            const originalPlayers = mockPlayingService.players;

            (service as any).handleInventoryUpdate({
                playerName: 'Player1',
                inventory: newInventory,
            });

            expect(mockPlayingService.players[0].inventory).toEqual(newInventory);

            expect(mockPlayingService.players).not.toBe(originalPlayers);
        });

        it('should not modify players array when player is not found', () => {
            const newInventory = [{ name: 'Potion', id: 1 } as Item];

            const originalPlayers = mockPlayingService.players;
            const originalPlayersStringified = JSON.stringify(originalPlayers);

            (service as any).handleInventoryUpdate({
                playerName: 'NonExistentPlayer',
                inventory: newInventory,
            });

            expect(JSON.stringify(mockPlayingService.players)).toEqual(originalPlayersStringified);
        });
    });

    describe('initializeSocketEvents', () => {
        it('should register inventory update handler and call handleInventoryUpdate when triggered', () => {
            const handleInventoryUpdateSpy = spyOn<any>(service, 'handleInventoryUpdate');

            (service as any).initializeSocketEvents();

            expect(mockSocket.on).toHaveBeenCalledWith('inventoryUpdate', jasmine.any(Function));

            const onCall = mockSocket.on.calls.mostRecent();
            const eventName = onCall.args[0];
            const callback = onCall.args[1];

            expect(eventName).toBe('inventoryUpdate');

            const inventoryUpdateData = {
                playerName: 'Player1',
                inventory: [{ name: 'TestItem', id: 1 } as Item],
            };

            callback(inventoryUpdateData);

            expect(handleInventoryUpdateSpy).toHaveBeenCalledWith(inventoryUpdateData);
        });
    });

    describe('choseItemStartTurn', () => {
        it('should add item to player inventory and show popup when item is found on player tile', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const mockInventory: Item[] = [];
            mockPlayingService.localPlayer = {
                name: 'LocalPlayer',
                inventory: mockInventory,
            } as Player;

            const mockItem = { name: 'potion' } as Item;
            mockTile.player = mockPlayingService.localPlayer;
            mockTile.item = mockItem;

            mockBoardService.tiles = [mockTile];
            spyOn(mockBoardService.tiles, 'find').and.returnValue(mockTile);

            mockMovingGameService.isPopupItemChoiceVisible = false;

            (service as any).choseItemStartTurn();

            expect(mockInventory.length).toBe(1);
            expect(mockInventory[0]).toBe(mockItem);

            expect(mockMovingGameService.isPopupItemChoiceVisible).toBeTrue();
        });

        it('should not add spawn item to inventory', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const mockInventory: Item[] = [];
            mockPlayingService.localPlayer = {
                name: 'LocalPlayer',
                inventory: mockInventory,
            } as Player;

            const mockItem = { name: 'spawn' } as Item;
            mockTile.player = mockPlayingService.localPlayer;
            mockTile.item = mockItem;

            mockBoardService.tiles = [mockTile];
            spyOn(mockBoardService.tiles, 'find').and.returnValue(mockTile);

            mockMovingGameService.isPopupItemChoiceVisible = false;

            (service as any).choseItemStartTurn();

            expect(mockInventory.length).toBe(0);

            expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
        });

        it('should not process when it is not player turn', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(false);

            const findSpy = spyOn(mockBoardService.tiles, 'find');

            mockMovingGameService.isPopupItemChoiceVisible = false;

            (service as any).choseItemStartTurn();

            expect(findSpy).not.toHaveBeenCalled();

            expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
        });

        it('should not process when player tile has no item', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const mockInventory: Item[] = [];
            mockPlayingService.localPlayer = {
                name: 'LocalPlayer',
                inventory: mockInventory,
            } as Player;

            mockTile.player = mockPlayingService.localPlayer;
            mockTile.item = null;

            mockBoardService.tiles = [mockTile];
            spyOn(mockBoardService.tiles, 'find').and.returnValue(mockTile);

            mockMovingGameService.isPopupItemChoiceVisible = false;

            (service as any).choseItemStartTurn();

            expect(mockInventory.length).toBe(0);

            expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
        });

        it('should handle case when player tile is not found', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const mockInventory: Item[] = [];
            mockPlayingService.localPlayer = {
                name: 'LocalPlayer',
                inventory: mockInventory,
            } as Player;

            spyOn(mockBoardService.tiles, 'find').and.returnValue(undefined);

            mockMovingGameService.isPopupItemChoiceVisible = false;

            (service as any).choseItemStartTurn();

            expect(mockInventory.length).toBe(0);

            expect(mockMovingGameService.isPopupItemChoiceVisible).toBeFalse();
        });
    });

    describe('handleCombatQuit', () => {
        it('should identify missing player and call handleOpponentQuit', () => {
            const previousPlayers = [mockPlayer1, mockPlayer2];
            const currentPlayers = [mockPlayer1];

            mockPlayingService.players = previousPlayers;

            spyOn<any>(service, 'findMissingPlayerName').and.callThrough();

            (service as any).handleCombatQuit(currentPlayers);

            expect(service['findMissingPlayerName']).toHaveBeenCalledWith(previousPlayers, currentPlayers);
        });

        it('should not call handleOpponentQuit when no player is missing', () => {
            const players = [mockPlayer1, mockPlayer2];
            mockPlayingService.players = players;

            spyOn<any>(service, 'findMissingPlayerName').and.callThrough();

            const handleOpponentQuitSpy = mockPlayingService.combatService.handleOpponentQuit;

            (service as any).handleCombatQuit(players);

            expect(service['findMissingPlayerName']).toHaveBeenCalledWith(players, players);

            expect(handleOpponentQuitSpy).not.toHaveBeenCalled();
        });

        it('should handle empty player lists gracefully', () => {
            mockPlayingService.players = [];

            spyOn<any>(service, 'findMissingPlayerName').and.callThrough();

            const handleOpponentQuitSpy = mockPlayingService.combatService.handleOpponentQuit;

            (service as any).handleCombatQuit([]);

            expect(service['findMissingPlayerName']).toHaveBeenCalledWith([], []);

            expect(handleOpponentQuitSpy).not.toHaveBeenCalled();
        });
    });

    describe('choseItemStartTurn tile finding logic', () => {
        it('should find the correct tile based on player name match', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const localPlayer = {
                name: 'LocalPlayer',
                inventory: [],
                life: 10,
                speed: 5,
                attack: 'Attack',
                defense: 'Defense',
                avatarUrl: 'avatar-url',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            } as Player;
            mockPlayingService.localPlayer = localPlayer;

            const playerTile = createMockTile(1, 1);
            playerTile.player = { ...localPlayer };
            playerTile.item = { name: 'health-potion' } as Item;

            const otherTile1 = createMockTile(0, 0);
            otherTile1.player = {
                name: 'OtherPlayer',
                life: 10,
                speed: 5,
                attack: 'Attack',
                defense: 'Defense',
                avatarUrl: 'avatar-url',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            } as Player;

            const otherTile2 = createMockTile(2, 2);
            otherTile2.player = null;

            mockBoardService.tiles = [otherTile1, playerTile, otherTile2];

            const findSpy = spyOn(mockBoardService.tiles, 'find').and.callThrough();

            (service as any).choseItemStartTurn();

            expect(findSpy).toHaveBeenCalled();

            expect(mockPlayingService.localPlayer.inventory?.length).toBe(1);
            expect(mockPlayingService.localPlayer.inventory?.[0]).toBe(playerTile.item);
        });

        it('should handle case where player exists on multiple tiles', () => {
            mockPlayingService.isPlayerTurn.and.returnValue(true);

            const localPlayer = {
                name: 'LocalPlayer',
                inventory: [],
                life: 10,
                speed: 5,
                attack: 'Attack',
                defense: 'Defense',
                avatarUrl: 'avatar-url',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            } as Player;
            mockPlayingService.localPlayer = localPlayer;

            const firstPlayerTile = createMockTile(1, 1);
            firstPlayerTile.player = { ...localPlayer };
            firstPlayerTile.item = { name: 'health-potion' } as Item;

            const secondPlayerTile = createMockTile(2, 2);
            secondPlayerTile.player = { ...localPlayer };
            secondPlayerTile.item = { name: 'sword' } as Item;

            mockBoardService.tiles = [firstPlayerTile, secondPlayerTile];

            spyOn(mockBoardService.tiles, 'find').and.callThrough();

            (service as any).choseItemStartTurn();

            expect(mockPlayingService.localPlayer.inventory?.length).toBe(1);
            expect(mockPlayingService.localPlayer.inventory?.[0]).toBe(firstPlayerTile.item);
        });
    });
});
