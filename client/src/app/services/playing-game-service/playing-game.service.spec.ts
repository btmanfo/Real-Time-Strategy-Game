/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable no-unused-vars */
// Utilisation de fonction sans utiliser la totalité méthodes
/* eslint-disable @typescript-eslint/no-empty-function */
// Utilisation de methode vide

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { START_TIME_WITH_ATTEMPT, START_TIME_WITH_NO_ATTEMPT } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { ActionSocketService } from '@app/services/action-socket-service/action-socket.service';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { DebugModeService } from '@app/services/debug-mode-service/debug-mode.service';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingBotService } from '@app/services/playing-bot-service/playing-bot.service';
import { PlayingItemsService } from '@app/services/playing-items-service/playing-items.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { PlayingSocketService } from '@app/services/playing-socket-service/playing-socket.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player, Tile } from '@common/interfaces';
import { of } from 'rxjs';
import { PlayingGameService } from './playing-game.service';

describe('PlayingGameService', () => {
    let service: PlayingGameService;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let playingSocketServiceSpy: jasmine.SpyObj<PlayingSocketService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let debugModeServiceSpy: jasmine.SpyObj<DebugModeService>;
    let actionServiceSpy: jasmine.SpyObj<ActionService>;
    let playingItemsServiceSpy: jasmine.SpyObj<PlayingItemsService>;
    let gameLogServiceSpy: jasmine.SpyObj<GameLogService>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let actionSocketServiceSpy: jasmine.SpyObj<ActionSocketService>;
    let playingBotServiceSpy: jasmine.SpyObj<PlayingBotService>;
    let socketSpy: any;

    const mockPlayer1: Player = {
        name: 'Player1',
        avatarUrl: 'avatar1.png',
        life: 100,
        speed: 5,
        attack: '10',
        defense: '5',
        coordinate: { x: 0, y: 0 },
        isAdmin: true,
    };

    const mockPlayer2: Player = {
        name: 'Player2',
        avatarUrl: 'avatar2.png',
        life: 100,
        speed: 5,
        attack: '10',
        defense: '5',
        coordinate: { x: 1, y: 1 },
        isAdmin: false,
    };

    const mockTile: Tile = {
        position: { x: 2, y: 2 },
        type: 'empty',
        isReachable: true,
        isHighlighted: false,
        traversable: true,
        item: null,
        player: null,
        image: 'test-image.png',
        cost: 1,
    };

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on', 'off']);

        boardServiceSpy = jasmine.createSpyObj('BoardService', ['clearHighlightedPath', 'highlightPath'], { tiles: [mockTile] });
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['initGame', 'teleportPlayer', 'isPlayerTurn', 'handleFirstAttack'], {
            players: [mockPlayer1, mockPlayer2],
            localPlayer: mockPlayer1,
            isPlaying: true,
            isDebugMode: false,
            playerTurn: mockPlayer1,
            joinGameService: {
                socket: socketSpy,
                pinCode: 'TEST123',
            },
        });
        playingServiceSpy.isPlayerTurn.and.returnValue(true);

        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['showNotification'], {
            showModal: false,
            errorMessages: [],
            isTimedNotification: true,
        });

        playingSocketServiceSpy = jasmine.createSpyObj('PlayingSocketService', ['manageSocketEvents', 'destroySocketEvents']);

        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', ['findShortestPath']);
        movingGameServiceSpy.findShortestPath.and.returnValue([mockTile]);

        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['onRoomCreated', 'onMessageReceived'], {
            socket: socketSpy,
            pinCode: 'TEST123',
        });
        joinGameServiceSpy.onRoomCreated.and.returnValue(of({ codeRoom: 'ROOM42', theFirstPlayer: mockPlayer1, theSecondPlayer: mockPlayer2 }));
        joinGameServiceSpy.onMessageReceived.and.returnValue(of({ message: 'Count to 3', roomCode: 'ROOM42', userName: mockPlayer1.name ?? '' }));

        debugModeServiceSpy = jasmine.createSpyObj('DebugModeService', ['toggleDebugMode']);
        debugModeServiceSpy.toggleDebugMode.and.returnValue(true);

        actionServiceSpy = jasmine.createSpyObj('ActionService', ['activateAction', 'autoBotTurn', 'isBot']);

        playingItemsServiceSpy = jasmine.createSpyObj('PlayingItemsService', ['teleportPotion', 'dropLoserItems']);

        gameLogServiceSpy = jasmine.createSpyObj('GameLogService', ['sendAbandonLog'], { myRoom: 'ROOM42' });

        combatServiceSpy = jasmine.createSpyObj('CombatService', ['updateIsInCombat'], {
            attacker: mockPlayer1,
            defender: mockPlayer2,
            isInCombat: false,
        });

        actionSocketServiceSpy = jasmine.createSpyObj('ActionSocketService', ['manageSocketEvents']);

        playingBotServiceSpy = jasmine.createSpyObj('PlayingBotService', ['checkForBotTurn']);

        TestBed.configureTestingModule({
            providers: [
                PlayingGameService,
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                { provide: PlayingSocketService, useValue: playingSocketServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: DebugModeService, useValue: debugModeServiceSpy },
                { provide: ActionService, useValue: actionServiceSpy },
                { provide: PlayingItemsService, useValue: playingItemsServiceSpy },
                { provide: GameLogService, useValue: gameLogServiceSpy },
                { provide: CombatService, useValue: combatServiceSpy },
                { provide: ActionSocketService, useValue: actionSocketServiceSpy },
                { provide: PlayingBotService, useValue: playingBotServiceSpy },
            ],
        });

        service = TestBed.inject(PlayingGameService);

        service.showLeaveConfirmationPopup = false;

        Object.defineProperty(playingServiceSpy, 'isPlaying', {
            get: () => true,
            set: jasmine.createSpy('isPlayingSetter'),
        });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('initialize', () => {
        it('should call required initialization methods', () => {
            spyOn<any>(service, 'handleReload');
            spyOn<any>(service, 'initializeGame');
            spyOn<any>(service, 'subscribeToDebugMode');
            spyOn<any>(service, 'handleRoomCreation');
            spyOn<any>(service, 'handleMessageReception');

            service.initialize();

            expect(localStorage.getItem('hasQuit')).toBe('false');
            expect((service as any).handleReload).toHaveBeenCalled();
            expect((service as any).initializeGame).toHaveBeenCalled();
            expect((service as any).subscribeToDebugMode).toHaveBeenCalled();
            expect((service as any).handleRoomCreation).toHaveBeenCalled();
            expect((service as any).handleMessageReception).toHaveBeenCalled();
            expect(actionSocketServiceSpy.manageSocketEvents).toHaveBeenCalled();
        });
    });

    describe('unloadNotification', () => {
        it('should drop loser items, emit quit game, and set isReloaded', () => {
            spyOn(service, 'emitQuitGame');

            service.unloadNotification();
            if (mockPlayer1.name) expect(playingItemsServiceSpy.dropLoserItems).toHaveBeenCalledWith(mockPlayer1.name);
            expect(service.emitQuitGame).toHaveBeenCalled();
            expect(localStorage.getItem('isReloaded')).toBe('true');
        });
    });

    describe('toggleDebugMode', () => {
        it('should call debugModeService.toggleDebugMode and return result', () => {
            const result = service.toggleDebugMode(true);

            expect(debugModeServiceSpy.toggleDebugMode).toHaveBeenCalledWith(true);
            expect(result).toBeTrue();
            expect(service.isDebugMode).toBeTrue();
        });
    });

    describe('emitIsInAttack', () => {
        it('should update combat status and set isPlayerSubmit to true', () => {
            service.isPlayerSubmit = false;
            Object.defineProperty(combatServiceSpy, 'attacker', {
                get: () => ({
                    ...mockPlayer2,
                    name: 'Player2',
                }),
            });

            Object.defineProperty(combatServiceSpy, 'defender', {
                get: () => ({
                    ...mockPlayer2,
                    name: 'Player2',
                }),
            });

            service.emitIsInAttack();

            expect(combatServiceSpy.updateIsInCombat).toHaveBeenCalledWith(mockPlayer1.name, 'Player2');
            expect(combatServiceSpy.updateIsInCombat).toHaveBeenCalledWith(mockPlayer1.name, 'Player2');
            expect(service.isPlayerSubmit).toBeTrue();
        });

        it('should do nothing if isPlayerSubmit is already true', () => {
            service.isPlayerSubmit = true;

            service.emitIsInAttack();

            expect(combatServiceSpy.updateIsInCombat).not.toHaveBeenCalled();
        });
    });

    describe('isInCombatPlayer', () => {
        it('should return true if local player is attacker', () => {
            const result = service.isInCombatPlayer();

            expect(result).toBeTrue();
        });

        it('should return true if local player is defender', () => {
            Object.defineProperty(combatServiceSpy, 'attacker', { get: () => mockPlayer2 });
            Object.defineProperty(combatServiceSpy, 'defender', { get: () => mockPlayer1 });

            const result = service.isInCombatPlayer();

            expect(result).toBeTrue();
        });

        it('should return false if local player is neither attacker nor defender', () => {
            Object.defineProperty(combatServiceSpy, 'attacker', { get: () => mockPlayer2 });
            Object.defineProperty(combatServiceSpy, 'defender', { get: () => mockPlayer2 });

            const result = service.isInCombatPlayer();

            expect(result).toBeFalse();
        });
    });

    describe('activateInAttack', () => {
        it('should set isPlayerSubmit to false', () => {
            service.isPlayerSubmit = true;

            service.activateInAttack();

            expect(service.isPlayerSubmit).toBeFalse();
        });
    });

    describe('decrementTimeLimit', () => {
        it('should clear existing interval if exists', () => {
            spyOn(window, 'clearInterval');
            service.interval = setInterval(() => {}, 1000) as any;

            service.decrementTimeLimit(5);

            expect(clearInterval).toHaveBeenCalledWith(service.interval);
        });

        it('should not set new interval if isInFight is false', fakeAsync(() => {
            spyOn(window, 'setInterval').and.callThrough();
            service.isInFight = false;

            service.decrementTimeLimit(5);
            tick(1000);

            expect(setInterval).not.toHaveBeenCalled();
        }));

        it('should set interval and decrement count if isInFight is true', fakeAsync(() => {
            service.isInFight = true;
            service.count = 0;

            service.decrementTimeLimit(3);
            expect(service.count).toBe(3);

            tick(1000);
            expect(service.count).toBe(2);

            tick(1000);
            expect(service.count).toBe(1);

            tick(1000);
            expect(service.count).toBe(0);

            tick(1000);
            expect(service.count).toBe(3);
            expect(service.emitValueToAttack).toBeTruthy();

            clearInterval(service.interval);
        }));
    });

    describe('ngOnDestroy', () => {
        it('should perform complete cleanup', () => {
            spyOn<any>(service, 'clearIntervals');
            spyOn<any>(service, 'unsubscribeFromSocketEvents');
            spyOn<any>(service, 'destroySocketEvents');
            spyOn((service as any).destroy$, 'next');
            spyOn((service as any).destroy$, 'complete');

            service.ngOnDestroy();

            expect((service as any).clearIntervals).toHaveBeenCalled();
            expect((service as any).unsubscribeFromSocketEvents).toHaveBeenCalled();
            expect((service as any).destroySocketEvents).toHaveBeenCalled();
            expect((service as any).destroy$.next).toHaveBeenCalled();
            expect((service as any).destroy$.complete).toHaveBeenCalled();
        });
    });

    describe('activateAction', () => {
        it('should call actionService.activateAction if it is player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(true);

            service.activateAction();

            expect(actionServiceSpy.activateAction).toHaveBeenCalled();
        });

        it('should not call actionService.activateAction if it is not player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(false);

            service.activateAction();

            expect(actionServiceSpy.activateAction).not.toHaveBeenCalled();
        });
    });

    describe('endTurn', () => {
        it('should emit EndTurn event if it is player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(true);

            service.endTurn();

            expect(socketSpy.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndTurn, { roomCode: 'TEST123' });
        });

        it('should not emit EndTurn event if it is not player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(false);

            service.endTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });
    });

    describe('mouseOverTile', () => {
        it('should not do anything if localPlayer is null', () => {
            Object.defineProperty(playingServiceSpy, 'localPlayer', { get: () => null });
            service.actionTriggered = true;

            service.mouseOverTile(mockTile);

            expect(boardServiceSpy.clearHighlightedPath).not.toHaveBeenCalled();
        });

        it('should not do anything if actionTriggered is false', () => {
            service.actionTriggered = false;

            service.mouseOverTile(mockTile);

            expect(boardServiceSpy.clearHighlightedPath).not.toHaveBeenCalled();
        });

        it('should clear path, find shortest path, and highlight path', () => {
            service.actionTriggered = true;

            service.mouseOverTile(mockTile);

            expect(boardServiceSpy.clearHighlightedPath).toHaveBeenCalled();
            expect(movingGameServiceSpy.findShortestPath).toHaveBeenCalledWith(mockPlayer1, mockTile);
            expect(boardServiceSpy.highlightPath).toHaveBeenCalledWith([mockTile]);
        });
    });

    describe('onTileRightClick', () => {
        it('should call playingService.teleportPlayer with tile', () => {
            service.onTileRightClick(mockTile);

            expect(playingServiceSpy.teleportPlayer).toHaveBeenCalledWith(mockTile);
        });
    });

    describe('toggleCombat', () => {
        it('should toggle inCombat value and return new value', () => {
            service.inCombat = false;

            const result = service.toggleCombat();

            expect(service.inCombat).toBeTrue();
            expect(result).toBeTrue();

            const result2 = service.toggleCombat();

            expect(service.inCombat).toBeFalse();
            expect(result2).toBeFalse();
        });
    });

    describe('inCombatToggle', () => {
        it('should set executed to false', () => {
            service.executed = true;

            service.inCombatToggle();

            expect(service.executed).toBeFalse();
        });
    });

    describe('executeFunction', () => {
        it('should set executed to true and isInFight to false if not already executed', () => {
            service.executed = false;
            service.isInFight = true;

            const result = service.executeFunction();

            expect(service.executed).toBeTrue();
            expect(service.isInFight).toBeFalse();
            expect(result).toBe('');
        });

        it('should return empty string if already executed', () => {
            service.executed = true;
            service.isInFight = true;

            const result = service.executeFunction();

            expect(service.isInFight).toBeTrue();
            expect(result).toBe('');
        });
    });

    describe('updateDiceRolls', () => {
        it('should update attackerRoll and defenderRoll values', () => {
            service.attackerRoll = 0;
            service.defenderRoll = 0;

            service.updateDiceRolls({ attackerRoll: 6, defenderRoll: 4 });

            expect(service.attackerRoll).toBe(6);
            expect(service.defenderRoll).toBe(4);
        });
    });

    describe('quitGame', () => {
        it('should toggle showLeaveConfirmationPopup', () => {
            service.showLeaveConfirmationPopup = false;

            service.quitGame();

            expect(service.showLeaveConfirmationPopup).toBeTrue();

            service.quitGame();

            expect(service.showLeaveConfirmationPopup).toBeFalse();
        });
    });

    describe('emitQuitGame', () => {
        it('should set hasQuit localStorage, emit quit game event, and log abandonment', () => {
            service.emitQuitGame();

            expect(localStorage.getItem('hasQuit')).toBe('true');
            expect(socketSpy.emit).toHaveBeenCalledWith('quitGame', {
                map: boardServiceSpy.tiles,
                player: mockPlayer1,
                roomCode: 'TEST123',
            });
            expect(gameLogServiceSpy.sendAbandonLog).toHaveBeenCalledWith('ROOM42', mockPlayer1);
        });

        it('should not call sendAbandonLog if localPlayer is undefined', () => {
            Object.defineProperty(playingServiceSpy, 'localPlayer', { get: () => undefined });

            service.emitQuitGame();

            expect(gameLogServiceSpy.sendAbandonLog).not.toHaveBeenCalled();
        });
    });

    describe('closeLeaveConfirmationPopup', () => {
        it('should set showLeaveConfirmationPopup to false', () => {
            service.showLeaveConfirmationPopup = true;

            service.closeLeaveConfirmationPopup();

            expect(service.showLeaveConfirmationPopup).toBeFalse();
        });
    });

    describe('emitEndTurn', () => {
        it('should emit EndTurn if it is player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(true);

            service.emitEndTurn();

            expect(socketSpy.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndTurn, { roomCode: 'TEST123' });
        });

        it('should use teleport potion if player has one in inventory', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(true);
            Object.defineProperty(playingServiceSpy, 'localPlayer', {
                get: () => ({
                    ...mockPlayer1,
                    inventory: [
                        {
                            name: 'potion2',
                            image: 'potion.png',
                            id: 1,
                            type: 'potion',
                            position: { x: 0, y: 0 },
                            description: '',
                            isOutOfContainer: false,
                        },
                    ],
                }),
            });

            service.emitEndTurn();

            expect(playingItemsServiceSpy.teleportPotion).toHaveBeenCalled();
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndTurn, { roomCode: 'TEST123' });
        });

        it('should not emit EndTurn if it is not player turn', () => {
            playingServiceSpy.isPlayerTurn.and.returnValue(false);

            service.emitEndTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });
    });

    describe('checkForBotTurn', () => {
        it('should delegate to playingBotService.checkForBotTurn', () => {
            service.checkForBotTurn();

            expect(playingBotServiceSpy.checkForBotTurn).toHaveBeenCalledWith(jasmine.any(Function));
        });
    });

    describe('navigateTo', () => {
        it('should navigate to the specified route', () => {
            service.navigateTo('/home');

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
        });
    });

    describe('Private Methods', () => {
        describe('handleBotFight', () => {
            it('should set isInFight to true and call handleFirstAttack', () => {
                const players = [mockPlayer1, mockPlayer2];
                service.isInFight = false;

                (service as any).handleBotFight(players);

                expect(service.isInFight).toBeTrue();
                expect(playingServiceSpy.handleFirstAttack).toHaveBeenCalledWith(players[0], players[1]);
            });

            it('should subscribe to room creation events', () => {
                const players = [mockPlayer1, mockPlayer2];

                (service as any).handleBotFight(players);

                expect(joinGameServiceSpy.onRoomCreated).toHaveBeenCalled();
                expect(service.room).toBe('ROOM42');
            });
        });

        describe('handleReload', () => {
            it('should navigate to /home if isReloaded is true in localStorage', () => {
                localStorage.setItem('isReloaded', 'true');

                (service as any).handleReload();

                expect(localStorage.getItem('isReloaded')).toBe('false');
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
            });

            it('should do nothing if isReloaded is not true in localStorage', () => {
                localStorage.setItem('isReloaded', 'false');

                (service as any).handleReload();

                expect(routerSpy.navigate).not.toHaveBeenCalled();
            });
        });

        describe('initializeGame', () => {
            it('should call initGame and manageSocketEvents', () => {
                (service as any).initializeGame();

                expect(playingServiceSpy.initGame).toHaveBeenCalled();
                expect(playingSocketServiceSpy.manageSocketEvents).toHaveBeenCalled();
            });
        });

        describe('handleRoomCreation', () => {
            it('should set roomCode and isInFight based on local player name', () => {
                (service as any).handleRoomCreation();

                expect(service.room).toBe('ROOM42');
                expect(service.isInFight).toBeTrue();
            });

            it('should set isInFight to false if local player is not in the fight', () => {
                Object.defineProperty(playingServiceSpy, 'localPlayer', {
                    get: () => ({ ...mockPlayer1, name: 'OtherPlayer' }),
                });

                (service as any).handleRoomCreation();

                expect(service.isInFight).toBeFalse();
            });
        });

        describe('handleMessageReception', () => {
            it('should call decrementTimeLimit with START_TIME_WITH_NO_ATTEMPT when receiving "Count to 3"', () => {
                service.isInFight = true;
                spyOn(service, 'decrementTimeLimit');

                (service as any).handleMessageReception();

                expect(service.decrementTimeLimit).toHaveBeenCalledWith(START_TIME_WITH_NO_ATTEMPT);
            });

            it('should call decrementTimeLimit with START_TIME_WITH_ATTEMPT when receiving "Count to 5"', () => {
                service.isInFight = true;
                spyOn(service, 'decrementTimeLimit');
                joinGameServiceSpy.onMessageReceived.and.returnValue(
                    of({
                        message: 'Count to 5',
                        roomCode: 'ROOM42',
                        userName: mockPlayer1.name ?? '',
                    }),
                );

                (service as any).handleMessageReception();

                expect(service.decrementTimeLimit).toHaveBeenCalledWith(START_TIME_WITH_ATTEMPT);
            });

            it('should do nothing if not in fight', () => {
                service.isInFight = false;
                spyOn(service, 'decrementTimeLimit');

                (service as any).handleMessageReception();

                expect(service.decrementTimeLimit).not.toHaveBeenCalled();
            });

            it('should do nothing if message is for another player', () => {
                service.isInFight = true;
                spyOn(service, 'decrementTimeLimit');
                joinGameServiceSpy.onMessageReceived.and.returnValue(
                    of({
                        message: 'Count to 3',
                        roomCode: 'ROOM42',
                        userName: 'OtherPlayer',
                    }),
                );

                (service as any).handleMessageReception();

                expect(service.decrementTimeLimit).not.toHaveBeenCalled();
            });
        });

        describe('clearIntervals', () => {
            it('should clear interval and botCheckIntervalId if they exist', () => {
                spyOn(window, 'clearInterval');
                service.interval = 123 as any;
                (service as any).botCheckIntervalId = 456;

                (service as any).clearIntervals();

                expect(clearInterval).toHaveBeenCalledWith(123);
                expect(clearInterval).toHaveBeenCalledWith(456);
            });

            it('should not throw error if intervals are not set', () => {
                spyOn(window, 'clearInterval');
                service.interval = undefined as any;
                (service as any).botCheckIntervalId = undefined;

                expect(() => (service as any).clearIntervals()).not.toThrow();
                expect(clearInterval).not.toHaveBeenCalled();
            });
        });

        describe('unsubscribeFromSocketEvents', () => {
            it('should call each unsubscribe function in socketSubscriptions', () => {
                const unsubscribe1 = jasmine.createSpy('unsubscribe1');
                const unsubscribe2 = jasmine.createSpy('unsubscribe2');
                (service as any).socketSubscriptions = [unsubscribe1, unsubscribe2];

                (service as any).unsubscribeFromSocketEvents();

                expect(unsubscribe1).toHaveBeenCalled();
                expect(unsubscribe2).toHaveBeenCalled();
            });
        });

        describe('destroySocketEvents', () => {
            it('should call playingSocketService.destroySocketEvents', () => {
                (service as any).destroySocketEvents();

                expect(playingSocketServiceSpy.destroySocketEvents).toHaveBeenCalled();
            });
        });
    });

    describe('Getters and Setters', () => {
        it('should get and set interval', () => {
            const interval = setInterval(() => {}, 1000) as any;
            service.interval = interval;

            expect(service.interval).toBe(interval);

            clearInterval(interval);
        });

        it('should get and set inCombat', () => {
            service.inCombat = true;
            expect(service.inCombat).toBeTrue();

            service.inCombat = false;
            expect(service.inCombat).toBeFalse();
        });

        it('should get and set actionTriggered', () => {
            service.actionTriggered = true;
            expect(service.actionTriggered).toBeTrue();

            service.actionTriggered = false;
            expect(service.actionTriggered).toBeFalse();
        });

        it('should get and set room', () => {
            service.room = 'TEST_ROOM';
            expect(service.room).toBe('TEST_ROOM');
        });

        it('should get and set executed', () => {
            service.executed = true;
            expect(service.executed).toBeTrue();

            service.executed = false;
            expect(service.executed).toBeFalse();
        });

        it('should get notification', () => {
            expect(service.notification).toEqual({
                showModal: false,
                errorMessages: [],
            });
        });
    });
    describe('handleLeaveConfirmation', () => {
        it('should close popup and do nothing if condition is false', () => {
            service.showLeaveConfirmationPopup = true;
            spyOn(service, 'emitQuitGame');

            service.handleLeaveConfirmation(false);

            expect(service.showLeaveConfirmationPopup).toBeFalse();
            expect(service.emitQuitGame).not.toHaveBeenCalled();
            expect(playingItemsServiceSpy.dropLoserItems).not.toHaveBeenCalled();
        });

        it('should close popup, disable timed notifications, drop items and emit quitGame if condition is true', () => {
            service.showLeaveConfirmationPopup = true;

            Object.defineProperty(notificationServiceSpy, 'isTimedNotification', {
                get: () => true,
                set: (value) => {},
            });

            spyOn(service, 'emitQuitGame');

            service.handleLeaveConfirmation(true);

            expect(service.showLeaveConfirmationPopup).toBeFalse();
            expect(notificationServiceSpy.isTimedNotification).toBeTrue();
            if (mockPlayer1.name) expect(playingItemsServiceSpy.dropLoserItems).toHaveBeenCalledWith(mockPlayer1.name);
            expect(service.emitQuitGame).toHaveBeenCalled();
        });
    });
    describe('subscribeToDebugMode', () => {
        it('should listen for debugModeChanged events', () => {
            (service as any).subscribeToDebugMode();

            expect(socketSpy.on).toHaveBeenCalledWith('debugModeChanged', jasmine.any(Function));
        });

        it('should update isDebugMode when event is received', () => {
            service.isDebugMode = false;

            socketSpy.on.and.callFake((event: string, callback: (data: any) => void) => {
                if (event === 'debugModeChanged') {
                    callback({ isDebugMode: true });
                }
                return socketSpy;
            });

            Object.defineProperty(playingServiceSpy, 'isDebugMode', {
                get: () => false,
                set(value) {
                    this._isDebugMode = value;
                },
            });

            (service as any).subscribeToDebugMode();

            expect(service.isDebugMode).toBeTrue();
        });
    });
});
