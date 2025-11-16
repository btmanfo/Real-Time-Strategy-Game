/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable prettier/prettier */
// Formatage personnalisé nécessaire pour lisibilité, structure de test ou alignement spécifique
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TIME_BETWEEN_TURNS_MS } from '@app/constants/constants';
import { GameWinHandlerInterface, PlayerMovementHandlerInterface, VirtualPlayerEmit } from '@app/interfaces/interface';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { BotService } from '@app/services/bot-service/bot.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingGridService } from '@app/services/playing-grid-service/playing-grid.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { PlayingSocketService } from './playing-socket.service';

describe('PlayingSocketService', () => {
    let service: PlayingSocketService;
    let mockSocket: jasmine.SpyObj<Socket>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockPlayingService: jasmine.SpyObj<PlayingService>;
    let mockBoardService: jasmine.SpyObj<BoardService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let mockMovingGameService: jasmine.SpyObj<MovingGameService>;
    let mockActionService: jasmine.SpyObj<ActionService>;
    let mockPlayingGridService: jasmine.SpyObj<PlayingGridService>;
    let mockJoinGameService: jasmine.SpyObj<JoinGameService>;
    let mockBotService: jasmine.SpyObj<BotService>;

    beforeEach(() => {
        mockSocket = jasmine.createSpyObj('Socket', ['on', 'off', 'emit']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockPlayingService = jasmine.createSpyObj('PlayingService', [
            'time',
            'boardServiceValue',
            'localPlayer',
            'joinGameService',
            'handleFirstAttack',
            'currentMovingPoints',
            'isVirtualPlayerTurn',
            'boardService',
            'movingGameService',
            'isPlayerTurn',
        ]);
        mockBoardService = jasmine.createSpyObj('BoardService', ['updateTiles', 'tiles', 'findTileByPlayerPosition']);
        mockPlayingService.localPlayer = { name: 'player1', spawnPoint: { x: 0, y: 0 } } as Player;
        mockPlayingService.currentMovingPoints = 2;
        mockPlayingService.time = 0;
        mockBoardService.tiles = [
            { position: { x: 0, y: 0 }, player: null } as Tile,
            { position: { x: 1, y: 1 }, player: null } as Tile,
            { position: { x: 2, y: 2 }, player: null } as Tile,
            { position: { x: 3, y: 3 }, player: null } as Tile,
            { position: { x: 4, y: 4 }, player: null } as Tile,
        ];
        mockNotificationService = jasmine.createSpyObj('NotificationService', ['showNotification', 'errorMessages', 'showModal']);
        mockNotificationService.errorMessages = [];
        mockNotificationService.showModal = false;
        mockMovingGameService = jasmine.createSpyObj('MovingGameService', [
            'getAccessibleTiles ',
            'getAccessibleTiles',
            'setReachableForTiles',
            'virtualGetAccessibleTiles',
            'emitAnimation',
            'setReachableForTiles',
            'getNeighbors',
            'isPopupItemChoiceVisible',
            'isPopupItemChoiceVisible',
        ]);
        mockMovingGameService.isPopupItemChoiceVisible = false;
        mockActionService = jasmine.createSpyObj('ActionService', ['checkSurroundingTiles', 'actionPlayer', 'emitVirtualFight', 'canAction']);
        mockMovingGameService.isPopupItemChoiceVisible = false;
        mockActionService = jasmine.createSpyObj('ActionService', ['checkSurroundingTiles', 'actionPlayer', 'emitVirtualFight', 'canAction']);
        mockPlayingGridService = jasmine.createSpyObj('PlayingGridService', ['moveVirtualPlayer']);
        mockJoinGameService = jasmine.createSpyObj('JoinGameService', ['pinCode', 'socket']);
        mockJoinGameService.socket = mockSocket;
        mockJoinGameService.pinCode = 'TEST_PIN';
        (mockPlayingService as any).joinGameService = mockJoinGameService;
        (mockPlayingService as any).boardServiceValue = mockBoardService;

        mockBotService = jasmine.createSpyObj('BotService', [
            'moveVirtualPlayer',
            'generateTimerRandom',
            'goToFlagOrSpawnPoint',
            'moveDefensePlayerToSpawn',
        ]);

        TestBed.configureTestingModule({
            providers: [
                PlayingSocketService,
                { provide: Router, useValue: mockRouter },
                { provide: PlayingService, useValue: mockPlayingService },
                { provide: BoardService, useValue: mockBoardService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: MovingGameService, useValue: mockMovingGameService },
                { provide: ActionService, useValue: mockActionService },
                { provide: PlayingGridService, useValue: mockPlayingGridService },
                { provide: BotService, useValue: mockBotService },
            ],
        });

        service = TestBed.inject(PlayingSocketService);
        (service as any)['socket'] = mockSocket; 
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('manageSocketEvents', () => {
        it('should initialize socket events if not already initialized', () => {
            service['isSocketEventsInitialized'] = false;
            service.manageSocketEvents();
            expect(service['isSocketEventsInitialized']).toBeTrue();
            expect(mockSocket.on).toHaveBeenCalled();
        });

        it('should not reinitialize socket events if already initialized', () => {
            service['isSocketEventsInitialized'] = true;
            service.manageSocketEvents();
            expect(mockSocket.on).not.toHaveBeenCalled();
        });
    });

    describe('destroySocketEvents', () => {
        it('should remove all socket event listeners', () => {
            service.destroySocketEvents();
            expect(mockSocket.off).toHaveBeenCalled();
        });
    });

    describe('endTurn', () => {
        it('should emit endTurn event if player is stuck or movement action is over', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([{} as Tile]);
            mockActionService.canAction = 2;
            service.endTurn();
            expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', { roomCode: mockPlayingService.joinGameService.pinCode });
        });

        it('should not emit endTurn event if conditions are not met', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([{} as Tile, {} as Tile]);
            mockActionService.canAction = 0;
            service.endTurn();
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it('should not emit endTurn event if isPopupItemChoiceVisible is true', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([{} as Tile]);
            mockActionService.canAction = 2;
            mockMovingGameService.isPopupItemChoiceVisible = true;
            service.endTurn();
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it('should emit endTurn event if movement action is over', () => {
            mockMovingGameService.getAccessibleTiles.and.returnValue([{} as Tile]);
            mockActionService.canAction = 0;
            mockActionService.checkSurroundingTiles.and.returnValue(false);
            service.endTurn();
            expect(mockSocket.emit).toHaveBeenCalledWith('endTurn', { roomCode: mockPlayingService.joinGameService.pinCode });
        });
    });

    describe('endGameWinHandler', () => {
        it('should show notification and navigate to endGame', fakeAsync(() => {
            const mockData: GameWinHandlerInterface = { winner: 'player1', name: 'player1' };
            service['endGameWinHandler'](mockData);
            tick(TIME_BETWEEN_TURNS_MS);
            expect(mockNotificationService.showNotification).toHaveBeenCalledWith('player1 a gagné la partie avec 3 victoires!', false);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/endGame'], jasmine.any(Object));
        }));
    });

    describe('endGameCtfHandler', () => {
        it('should navigate to endGame with correct query params and clear notifications after delay', fakeAsync(() => {
            const mockData = { team: 'BlueTeam' };
            mockNotificationService.errorMessages = ['Initial Error'];
            mockNotificationService.showModal = true;

            service['endGameCtfHandler'](mockData);
            tick(TIME_BETWEEN_TURNS_MS);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/endGame'], {
                queryParams: {
                    source: mockPlayingService.localPlayer?.name,
                    code: mockJoinGameService.pinCode,
                    mode: 'CTF',
                    winningTeam: mockData.team,
                },
            });
            expect(mockNotificationService.errorMessages).toEqual([]);
            expect(mockNotificationService.showModal).toBeFalse();
        }));
    });

    describe('playerMovementHandler', () => {
        it('should update board tiles and set reachable tiles', () => {
            const mockData: PlayerMovementHandlerInterface = {
                loser: { name: 'player1', avatarUrl: 'avatar1' } as Player,
                nextPosition: { x: 1, y: 1 },
            };
            mockBoardService.tiles = [
                { position: { x: 0, y: 0 }, player: { avatarUrl: 'avatar1' } } as Tile,
                { position: { x: 1, y: 1 }, player: null } as Tile,
            ];
            service['playerMovementHandler'](mockData);
            expect(mockBoardService.tiles[0].player).toBeNull();
            expect(mockBoardService.tiles[1].player).toEqual(mockData.loser);
        });
    });

    describe('endAnimationHandler', () => {
        it('should update currentMovingPoints, call endTurn, actionPlayer, and set isAnimated to false if local player matches', () => {
            const mockPlayer = {
                name: 'player1',
                agressive: false,
                defense: 'false',
                life: 100,
                speed: 10,
                attack: '15',
                position: { x: 0, y: 0 },
                avatarUrl: 'avatar1',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            } as Player;
            mockPlayingService.localPlayer = mockPlayer;
            const mockData = { player: mockPlayer, countNumberOfTilesLeft: 3 };

            const endTurnSpy = spyOn(service, 'endTurn');
            service['endAnimationHandler'](mockData);

            expect(mockPlayingService.currentMovingPoints).toBe(5);
            expect(endTurnSpy).toHaveBeenCalled();
            expect(mockActionService.actionPlayer).toHaveBeenCalled();
            expect(mockPlayingService.isAnimated).toBeFalse();
        });

        it('should check if players are next to each other for virtual fight', () => {
            const player1 = { name: 'player1' } as Player;
            const player2 = { name: 'player2' } as Player;
            (service as any).playersInfFight = [player1, player2];

            const mockTile = { position: { x: 0, y: 0 } } as Tile;
            mockBoardService.findTileByPlayerPosition.and.returnValue(mockTile);
            mockMovingGameService.getNeighbors.and.returnValue([{ player: { name: 'player2' } } as Tile]);

            const mockData = { player: { name: 'otherPlayer' } as Player, countNumberOfTilesLeft: 0 };
            service['endAnimationHandler'](mockData);

            expect(mockActionService.emitVirtualFight).toHaveBeenCalledWith(player1, player2);
            expect((service as any).playersInfFight).toEqual([]);
        });

        it('should not trigger virtual fight if players are not adjacent', () => {
            const player1 = { name: 'player1' } as Player;
            const player2 = { name: 'player2' } as Player;
            (service as any).playersInfFight = [player1, player2];

            const mockTile = { position: { x: 0, y: 0 } } as Tile;
            mockBoardService.findTileByPlayerPosition.and.returnValue(mockTile);
            mockMovingGameService.getNeighbors.and.returnValue([{ player: { name: 'player3' } } as Tile]);

            const mockData = { player: { name: 'otherPlayer' } as Player, countNumberOfTilesLeft: 0 };
            service['endAnimationHandler'](mockData);

            expect(mockActionService.emitVirtualFight).not.toHaveBeenCalled();
            expect((service as any).playersInfFight).toEqual([player1, player2]);
        });

        it('should not update player when local player does not match', () => {
            const localPlayer = {
                name: 'localPlayer',
                coordinate: { x: 0, y: 0 },
            } as Player;

            const otherPlayer = {
                name: 'otherPlayer',
                coordinate: { x: 1, y: 1 },
            } as Player;

            mockPlayingService.localPlayer = localPlayer;
            mockPlayingService.isAnimated = true;

            const mockData = { player: otherPlayer, countNumberOfTilesLeft: 3 };

            const endTurnSpy = spyOn(service, 'endTurn');
            service['endAnimationHandler'](mockData);

            expect(mockPlayingService.currentMovingPoints).toBe(2);
            expect(endTurnSpy).not.toHaveBeenCalled();
            expect(mockActionService.actionPlayer).not.toHaveBeenCalled();
            expect(mockPlayingService.isAnimated).toBeTrue();
        });
    });

    describe('notificationTurnHandler', () => {
        it('should show notification and set isTimedNotification to true if isEnded is false', () => {
            const mockData = { message: 'Test message', isEnded: false };

            service['notificationTurnHandler'](mockData);
            expect(mockNotificationService.errorMessages).toContain('Test message');
            expect(mockNotificationService.showModal).toBeTrue();
            expect(mockNotificationService.isTimedNotification).toBeTrue();
        });

        it('should clear notifications and set isTimedNotification to false if isEnded is true', () => {
            const mockData = { message: 'Test message', isEnded: true };

            service['notificationTurnHandler'](mockData);
            expect(mockNotificationService.errorMessages).toEqual([]);
            expect(mockNotificationService.showModal).toBeFalse();
            expect(mockNotificationService.isTimedNotification).toBeFalse();
        });
    });

    describe('emitVirtualPlayer', () => {
        beforeEach(() => {
            spyOn(service as any, 'moveVitutalPlayerToPlayer').and.returnValue(false);
            spyOn(service as any, 'isItemAttack').and.callThrough();
            spyOn(service as any, 'isItemDepense').and.callThrough();
        });

        it('should move virtual player to target position if botService provides a valid position', () => {
            const mockData = {
                currentPlayer: { name: 'virtualPlayer', agressive: false } as Player,
            } as VirtualPlayerEmit;

            const mockTile = { position: { x: 2, y: 2 }, player: null } as Tile;
            const accessibleTiles = [mockTile];

            mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
            mockBotService.goToFlagOrSpawnPoint.and.returnValue({ x: 2, y: 2 });

            service['emitVirtualPlayer'](mockData);

            expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(mockTile, mockData);
        });

        it('should try to move aggressive player to attack position', () => {
            const mockData = {
                currentPlayer: {
                    name: 'virtualPlayer',
                    agressive: true,
                    inventory: [{ name: 'item1' }],
                } as Player,
            } as VirtualPlayerEmit;

            const mockTileWithAttackItem = { position: { x: 1, y: 1 }, item: { name: 'epee1' } } as Tile;
            const mockOtherTile = { position: { x: 3, y: 3 }, item: { name: 'other' } } as Tile;
            const accessibleTiles = [mockTileWithAttackItem, mockOtherTile];

            mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
            mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);

            service['emitVirtualPlayer'](mockData);

            expect(service['isItemAttack']).toHaveBeenCalledWith(mockTileWithAttackItem, mockData);
            expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(mockTileWithAttackItem, mockData);
        });

        it('should check each tile for attack items with inventory space', () => {
            const mockData = {
                currentPlayer: {
                    name: 'virtualPlayer',
                    agressive: true,
                    inventory: [{ name: 'item1' }],
                } as Player,
            } as VirtualPlayerEmit;

            const potion1Tile = { position: { x: 1, y: 1 }, item: { name: 'potion1' } } as Tile;
            const sword1Tile = { position: { x: 2, y: 2 }, item: { name: 'epee1' } } as Tile;
            const sword2Tile = { position: { x: 3, y: 3 }, item: { name: 'epee2' } } as Tile;
            const accessibleTiles = [potion1Tile, sword1Tile, sword2Tile];

            mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
            mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);

            service['emitVirtualPlayer'](mockData);

            expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(potion1Tile, mockData);
        });

        it('should handle moveVitutalPlayerToPlayer returning true', () => {
            const mockData = {
                currentPlayer: {
                    name: 'virtualPlayer',
                    agressive: true,
                } as Player,
            } as VirtualPlayerEmit;

            const accessibleTiles = [{ position: { x: 1, y: 1 } } as Tile];
            mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
            mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);

            (service as any).moveVitutalPlayerToPlayer.and.returnValue(true);

            service['emitVirtualPlayer'](mockData);

            expect(service['isItemAttack']).not.toHaveBeenCalled();
            expect(mockBotService.moveVirtualPlayer).not.toHaveBeenCalled();
        });

        it('should handle moveDefensePlayerToSpawn returning true', () => {
            const mockData = {
                currentPlayer: {
                    name: 'virtualPlayer',
                    agressive: false,
                } as Player,
            } as VirtualPlayerEmit;

            const accessibleTiles = [{ position: { x: 1, y: 1 } } as Tile];
            mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
            mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);

            mockBotService.moveDefensePlayerToSpawn.and.returnValue(true);

            service['emitVirtualPlayer'](mockData);

            expect(service['isItemDepense']).not.toHaveBeenCalled();
        });
    });

    describe('moveVitutalPlayerToPlayer', () => {
        it('should return true if player found and move successful', () => {
            const mockCurrentPlayer = { name: 'currentPlayer' } as Player;
            const mockTargetPlayer = { name: 'targetPlayer' } as Player;

            const mockPlayerTile = {
                position: { x: 1, y: 1 },
                player: mockTargetPlayer,
            } as Tile;

            const mockAdjacentTile = {
                position: { x: 2, y: 1 },
                player: null,
            } as Tile;

            const accessibleTiles = [mockPlayerTile, mockAdjacentTile];

            mockBoardService.tiles = [mockPlayerTile, mockAdjacentTile];

            const mockData = {
                currentPlayer: mockCurrentPlayer,
            } as VirtualPlayerEmit;

            const result = service['moveVitutalPlayerToPlayer'](mockData, accessibleTiles);

            expect(result).toBeTrue();
            expect(mockBotService.moveVirtualPlayer).toHaveBeenCalled();
            expect((service as any).playersInfFight).toEqual([mockPlayerTile.player, mockCurrentPlayer]);
        });

        it('should return undefined if no player tile found', () => {
            const mockData = {
                currentPlayer: { name: 'currentPlayer' } as Player,
            } as VirtualPlayerEmit;

            const accessibleTiles = [{ position: { x: 1, y: 1 }, player: null } as Tile, { position: { x: 2, y: 2 }, player: null } as Tile];

            mockBoardService.tiles = accessibleTiles;

            const result = service['moveVitutalPlayerToPlayer'](mockData, accessibleTiles);

            expect(result).toBeUndefined();
            expect(mockBotService.moveVirtualPlayer).not.toHaveBeenCalled();
        });

        it('should return undefined if no adjacent tile found', () => {
            const mockCurrentPlayer = { name: 'currentPlayer' } as Player;
            const mockTargetPlayer = { name: 'targetPlayer' } as Player;

            const mockPlayerTile = {
                position: { x: 1, y: 1 },
                player: mockTargetPlayer,
            } as Tile;

            const accessibleTiles = [mockPlayerTile];

            mockBoardService.tiles = [mockPlayerTile];

            const mockData = {
                currentPlayer: mockCurrentPlayer,
            } as VirtualPlayerEmit;

            const result = service['moveVitutalPlayerToPlayer'](mockData, accessibleTiles);

            expect(result).toBeUndefined();
            expect(mockBotService.moveVirtualPlayer).not.toHaveBeenCalled();
        });

        it('should prioritize players with flags', () => {
            const mockCurrentPlayer = { name: 'currentPlayer' } as Player;
            const playerWithFlag = {
                name: 'playerWithFlag',
                inventory: [{ name: 'chestbox-2' }],
            } as Player;
            const regularPlayer = {
                name: 'regularPlayer',
                inventory: [{ name: 'other' }],
            } as Player;

            const flaggedPlayerTile = {
                position: { x: 3, y: 3 },
                player: playerWithFlag,
            } as Tile;

            const regularPlayerTile = {
                position: { x: 1, y: 1 },
                player: regularPlayer,
            } as Tile;

            const adjacentToFlagged = {
                position: { x: 4, y: 3 },
                player: null,
            } as Tile;

            const accessibleTiles = [regularPlayerTile, flaggedPlayerTile, adjacentToFlagged];
            mockBoardService.tiles = accessibleTiles;

            const mockData = {
                currentPlayer: mockCurrentPlayer,
            } as VirtualPlayerEmit;

            const result = service['moveVitutalPlayerToPlayer'](mockData, accessibleTiles);

            expect(result).toBeTrue();
            expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(jasmine.objectContaining({ position: { x: 4, y: 3 } }), mockData);
            expect((service as any).playersInfFight).toEqual([flaggedPlayerTile.player, mockCurrentPlayer]);
        });
    });

it('should move to random tile as fallback if no items match criteria - fix', () => {

    mockBotService.moveVirtualPlayer.calls.reset();
    mockBotService.moveDefensePlayerToSpawn.calls.reset();
    mockBotService.goToFlagOrSpawnPoint.calls.reset();
    mockBotService.generateTimerRandom.calls.reset();
    
    const mockData = {
      currentPlayer: {
        name: 'virtualPlayer',
        agressive: false,
      } as Player,
    } as VirtualPlayerEmit;
  
    const mockTile = { 
      position: { x: 3, y: 3 }, 
      item: { name: 'other' } 
    } as Tile;
    
    const accessibleTiles = [mockTile];
    
    mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
    mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);
    mockBotService.moveDefensePlayerToSpawn.and.returnValue(undefined);
    mockBotService.generateTimerRandom.and.returnValue(0);
    
    spyOn(service as any, 'moveVitutalPlayerToPlayer').and.returnValue(undefined);
    spyOn(service as any, 'isItemDepense').and.returnValue(false);
    spyOn(service as any, 'isItemAttack').and.returnValue(false);
    
    service['emitVirtualPlayer'](mockData);
    
    expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(mockTile, mockData);
  });
  
  it('should try to move defensive player to defensive position - fix', () => {
    mockBotService.moveVirtualPlayer.calls.reset();
    mockBotService.moveDefensePlayerToSpawn.calls.reset();
    mockBotService.goToFlagOrSpawnPoint.calls.reset();
    
    const mockData = {
      currentPlayer: {
        name: 'virtualPlayer',
        agressive: false,
      } as Player,
    } as VirtualPlayerEmit;
  
    const shieldTile = { 
      position: { x: 2, y: 2 }, 
      item: { name: 'bouclier1' } 
    } as Tile;
    
    const accessibleTiles = [shieldTile];
    
    mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
    mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);
    mockBotService.moveDefensePlayerToSpawn.and.returnValue(undefined);
    
    spyOn(service as any, 'moveVitutalPlayerToPlayer').and.returnValue(undefined);
 
    const isItemDepenseSpy = spyOn(service as any, 'isItemDepense');
    isItemDepenseSpy.and.callFake((tile: Tile) => {
      return tile.item?.name === 'bouclier1';
    });
    
    service['emitVirtualPlayer'](mockData);
    
    expect(isItemDepenseSpy).toHaveBeenCalledWith(shieldTile);
    expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(shieldTile, mockData);
  });
  
  it('should check each tile for defensive items - fix', () => {
    mockBotService.moveVirtualPlayer.calls.reset();
    mockBotService.moveDefensePlayerToSpawn.calls.reset();
    mockBotService.goToFlagOrSpawnPoint.calls.reset();
    
    const mockData = {
      currentPlayer: {
        name: 'virtualPlayer',
        agressive: false,
      } as Player,
    } as VirtualPlayerEmit;
  
    const shield1Tile = { position: { x: 1, y: 1 }, item: { name: 'bouclier1' } } as Tile;
    const shield2Tile = { position: { x: 2, y: 2 }, item: { name: 'bouclier2' } } as Tile;
    const potion2Tile = { position: { x: 3, y: 3 }, item: { name: 'potion2' } } as Tile;
    
    const accessibleTiles = [shield1Tile, shield2Tile, potion2Tile];
    
    mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
    mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);
    mockBotService.moveDefensePlayerToSpawn.and.returnValue(undefined);
    
    spyOn(service as any, 'moveVitutalPlayerToPlayer').and.returnValue(undefined);
    
    const isItemDepenseSpy = spyOn(service as any, 'isItemDepense');
    isItemDepenseSpy.and.callFake((tile: Tile) => {
      return tile.item?.name === 'bouclier1';
    });
    
    service['emitVirtualPlayer'](mockData);
    
    expect(isItemDepenseSpy).toHaveBeenCalledWith(shield1Tile);
    expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(shield1Tile, mockData);
  });
  
  describe('Original emitVirtualPlayer tests with fixed configuration', () => {
    it('should move virtual player to target position if botService provides a valid position', () => {
      mockBotService.moveVirtualPlayer.calls.reset();
      
      const mockData = {
        currentPlayer: { 
          name: 'virtualPlayer', 
          agressive: false 
        } as Player,
      } as VirtualPlayerEmit;
  
      const mockTile = { position: { x: 2, y: 2 }, player: null } as Tile;
      const accessibleTiles = [mockTile];
  
      mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
      mockBotService.goToFlagOrSpawnPoint.and.returnValue({ x: 2, y: 2 });
  
      service['emitVirtualPlayer'](mockData);
  
      expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(mockTile, mockData);
    });
  
    it('should try to move aggressive player to attack position', () => {
      mockBotService.moveVirtualPlayer.calls.reset();
      
      const mockData = {
        currentPlayer: {
          name: 'virtualPlayer',
          agressive: true,
          inventory: [{ name: 'item1' }],
        } as Player,
      } as VirtualPlayerEmit;
  
      const attackTile = { position: { x: 1, y: 1 }, item: { name: 'epee1' } } as Tile;
      const accessibleTiles = [attackTile];
  
      mockMovingGameService.virtualGetAccessibleTiles.and.returnValue(accessibleTiles);
      mockBotService.goToFlagOrSpawnPoint.and.returnValue(null);
      
      spyOn(service as any, 'moveVitutalPlayerToPlayer').and.returnValue(undefined);
      
      const isItemAttackSpy = spyOn(service as any, 'isItemAttack');
      isItemAttackSpy.and.callFake((tile: Tile) => {
        return tile.item?.name === 'epee1';
      });
  
      service['emitVirtualPlayer'](mockData);
  
      expect(isItemAttackSpy).toHaveBeenCalledWith(attackTile, mockData);
      expect(mockBotService.moveVirtualPlayer).toHaveBeenCalledWith(attackTile, mockData);
    });

    describe('restartTurnHandler', () => {
        it('should call actionPlayer if the data player is the local player', () => {
            const mockPlayer = { name: 'player1' } as Player;
            mockPlayingService.localPlayer = mockPlayer;
    
            (service as any).restartTurnHandler.call(service, { player: mockPlayer });
    
            expect(mockActionService.actionPlayer).toHaveBeenCalled();
        });
    
        it('should not call actionPlayer if the data player is not the local player', () => {
            const mockPlayer = { name: 'otherPlayer' } as Player;
            mockPlayingService.localPlayer = { name: 'player1' } as Player;
    
            (service as any).restartTurnHandler.call(service, { player: mockPlayer });
    
            expect(mockActionService.actionPlayer).not.toHaveBeenCalled();
        });
    });  
    
    describe('isItemDepense', () => {
        it('should return true for bouclier1', () => {
            const tile = { item: { name: 'bouclier1' } } as Tile;
            const result = (service as any).isItemDepense(tile);
            expect(result).toBeTrue();
        });
    
        it('should return true for bouclier2', () => {
            const tile = { item: { name: 'bouclier2' } } as Tile;
            const result = (service as any).isItemDepense(tile);
            expect(result).toBeTrue();
        });
    
        it('should return true for potion2', () => {
            const tile = { item: { name: 'potion2' } } as Tile;
            const result = (service as any).isItemDepense(tile);
            expect(result).toBeTrue();
        });
    
        it('should return false for unknown item', () => {
            const tile = { item: { name: 'randomItem' } } as Tile;
            const result = (service as any).isItemDepense(tile);
            expect(result).toBeFalse();
        });
    
        it('should return false if tile has no item', () => {
            const tile = {} as Tile;
            const result = (service as any).isItemDepense(tile);
            expect(result).toBeFalse();
        });
    });

    describe('debugModeChangedHandler', () => {
        it('should set isDebugMode and call setReachableForTiles if isPlayerTurn is true and debug mode is active', () => {
            const mockTiles = [{} as Tile];
            const data = { isDebugMode: true };
    
            mockPlayingService.isPlayerTurn.and.returnValue(true);
            mockMovingGameService.getAccessibleTiles.and.returnValue(mockTiles);
    
            (service as any).debugModeChangedHandler(data);
    
            expect(mockPlayingService.isDebugMode).toBeTrue();
            expect(mockMovingGameService.setReachableForTiles).toHaveBeenCalledWith(mockTiles);
        });
    
        it('should set isDebugMode and not call setReachableForTiles if debug mode is inactive', () => {
            const data = { isDebugMode: false };
    
            (service as any).debugModeChangedHandler(data);
    
            expect(mockPlayingService.isDebugMode).toBeFalse();
            expect(mockMovingGameService.setReachableForTiles).not.toHaveBeenCalled();
        });
    
        it('should set isDebugMode and not call setReachableForTiles if isPlayerTurn is false', () => {
            const data = { isDebugMode: true };
    
            mockPlayingService.isPlayerTurn.and.returnValue(false);
    
            (service as any).debugModeChangedHandler(data);
    
            expect(mockPlayingService.isDebugMode).toBeTrue();
            expect(mockMovingGameService.setReachableForTiles).not.toHaveBeenCalled();
        });
    });
  });
});
