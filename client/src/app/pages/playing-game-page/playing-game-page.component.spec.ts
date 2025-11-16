/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DEBUG_KEY } from '@app/constants/constants';
import { UpdateDiceRollsInterface } from '@app/interfaces/interface';
import { ActionService } from '@app/services/action-service/action.service';
import { ActionSocketService } from '@app/services/action-socket-service/action-socket.service';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { DebugModeService } from '@app/services/debug-mode-service/debug-mode.service';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingBotService } from '@app/services/playing-bot-service/playing-bot.service';
import { PlayingGameService } from '@app/services/playing-game-service/playing-game.service';
import { PlayingItemsService } from '@app/services/playing-items-service/playing-items.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { PlayingSocketService } from '@app/services/playing-socket-service/playing-socket.service';
import { Game, GameSize, Player, Tile } from '@common/interfaces';
import { PlayingGamePageComponent } from './playing-game-page.component';

describe('PlayingGamePageComponent', () => {
    let component: PlayingGamePageComponent;
    let fixture: ComponentFixture<PlayingGamePageComponent>;
    let playingGameServiceSpy: jasmine.SpyObj<PlayingGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let actionServiceSpy: jasmine.SpyObj<ActionService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let playingSocketServiceSpy: jasmine.SpyObj<PlayingSocketService>;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let debugModeServiceSpy: jasmine.SpyObj<DebugModeService>;
    let playingItemsServiceSpy: jasmine.SpyObj<PlayingItemsService>;
    let gameLogServiceSpy: jasmine.SpyObj<GameLogService>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let actionSocketServiceSpy: jasmine.SpyObj<ActionSocketService>;
    let playingBotServiceSpy: jasmine.SpyObj<PlayingBotService>;
    let socketSpy: unknown;

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

    const mockGame: Game = {
        name: 'TestGame',
        gameMode: 'Classic',
        id: '1',
        description: 'Test description',
        size: GameSize.smallSize,
        visibility: true,
        map: [],
        map2: [],
        modificationDate: '2023-01-01',
        screenshot: '',
    };

    beforeEach(async () => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on', 'off']);

        gameServiceSpy = jasmine.createSpyObj('GameService', ['getNewGame', 'setNewGame']);
        gameServiceSpy.getNewGame.and.returnValue(mockGame);

        boardServiceSpy = jasmine.createSpyObj('BoardService', ['clearHighlightedPath', 'highlightPath'], {
            tiles: [mockTile],
        });

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['onRoomCreated', 'onMessageReceived'], {
            socket: socketSpy,
            pinCode: 'TEST123',
        });

        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['showNotification'], {
            showModal: false,
            errorMessages: [],
        });

        playingSocketServiceSpy = jasmine.createSpyObj('PlayingSocketService', ['manageSocketEvents', 'destroySocketEvents']);

        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', ['findShortestPath']);
        movingGameServiceSpy.findShortestPath.and.returnValue([mockTile]);

        debugModeServiceSpy = jasmine.createSpyObj('DebugModeService', ['toggleDebugMode']);
        debugModeServiceSpy.toggleDebugMode.and.returnValue(true);

        actionServiceSpy = jasmine.createSpyObj('ActionService', ['activateAction', 'autoBotTurn', 'isBot']);

        playingItemsServiceSpy = jasmine.createSpyObj('PlayingItemsService', ['teleportPotion', 'dropLoserItems']);

        gameLogServiceSpy = jasmine.createSpyObj('GameLogService', ['sendAbandonLog'], {
            myRoom: 'ROOM42',
        });

        combatServiceSpy = jasmine.createSpyObj('CombatService', ['updateIsInCombat'], {
            attacker: mockPlayer1,
            defender: mockPlayer2,
        });

        actionSocketServiceSpy = jasmine.createSpyObj('ActionSocketService', ['manageSocketEvents']);

        playingBotServiceSpy = jasmine.createSpyObj('PlayingBotService', ['checkForBotTurn']);

        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['initGame', 'teleportPlayer', 'isPlayerTurn', 'handleFirstAttack'], {
            players: [mockPlayer1, mockPlayer2],
            localPlayer: mockPlayer1,
            isPlaying: true,
            isDebugMode: false,
            playerTurn: mockPlayer1,
            joinGameService: joinGameServiceSpy,
        });

        playingGameServiceSpy = jasmine.createSpyObj(
            'PlayingGameService',
            [
                'initialize',
                'ngOnDestroy',
                'unloadNotification',
                'toggleDebugMode',
                'emitIsInAttack',
                'isInCombatPlayer',
                'activateInAttack',
                'activateAction',
                'endTurn',
                'mouseOverTile',
                'onTileRightClick',
                'toggleCombat',
                'inCombatToggle',
                'executeFunction',
                'updateDiceRolls',
                'quitGame',
                'handleLeaveConfirmation',
                'closeLeaveConfirmationPopup',
                'emitEndTurn',
                'checkForBotTurn',
            ],
            {
                isDebugMode: false,
                showLeaveConfirmationPopup: false,
                isInFight: false,
                count: 5,
                emitValueToAttack: 'attack123',
                attackerRoll: 5,
                defenderRoll: 3,
                notification: { showModal: false, errorMessages: [] },
                inCombat: false,
                actionTriggered: false,
            },
        );

        Object.defineProperty(playingGameServiceSpy, 'actionTriggered', {
            get: () => false,
            set: jasmine.createSpy('actionTriggeredSetter'),
        });

        await TestBed.configureTestingModule({
            imports: [PlayingGamePageComponent, HttpClientTestingModule],
            providers: [
                { provide: PlayingGameService, useValue: playingGameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: ActionService, useValue: actionServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: PlayingSocketService, useValue: playingSocketServiceSpy },
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: DebugModeService, useValue: debugModeServiceSpy },
                { provide: PlayingItemsService, useValue: playingItemsServiceSpy },
                { provide: GameLogService, useValue: gameLogServiceSpy },
                { provide: CombatService, useValue: combatServiceSpy },
                { provide: ActionSocketService, useValue: actionSocketServiceSpy },
                { provide: PlayingBotService, useValue: playingBotServiceSpy },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayingGamePageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Getters', () => {
        it('should get isDebugMode from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'isDebugMode', { get: () => false });
            expect(component.isDebugMode).toBeFalse();

            Object.defineProperty(playingGameServiceSpy, 'isDebugMode', { get: () => true });
            expect(component.isDebugMode).toBeTrue();
        });

        it('should get showLeaveConfirmationPopup from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'showLeaveConfirmationPopup', { get: () => false });
            expect(component.showLeaveConfirmationPopup).toBeFalse();

            Object.defineProperty(playingGameServiceSpy, 'showLeaveConfirmationPopup', { get: () => true });
            expect(component.showLeaveConfirmationPopup).toBeTrue();
        });

        it('should get isInFight from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'isInFight', { get: () => false });
            expect(component.isInFight).toBeFalse();

            Object.defineProperty(playingGameServiceSpy, 'isInFight', { get: () => true });
            expect(component.isInFight).toBeTrue();
        });

        it('should get count from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'count', { get: () => 5 });
            expect(component.count).toBe(5);

            Object.defineProperty(playingGameServiceSpy, 'count', { get: () => 10 });
            expect(component.count).toBe(10);
        });

        it('should get emitValueToAttack from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'emitValueToAttack', { get: () => 'attack123' });
            expect(component.emitValueToAttack).toBe('attack123');

            Object.defineProperty(playingGameServiceSpy, 'emitValueToAttack', { get: () => 'newAttack' });
            expect(component.emitValueToAttack).toBe('newAttack');
        });

        it('should get attackerRoll from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'attackerRoll', { get: () => 5 });
            expect(component.attackerRoll).toBe(5);

            Object.defineProperty(playingGameServiceSpy, 'attackerRoll', { get: () => 8 });
            expect(component.attackerRoll).toBe(8);
        });

        it('should get defenderRoll from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'defenderRoll', { get: () => 3 });
            expect(component.defenderRoll).toBe(3);

            Object.defineProperty(playingGameServiceSpy, 'defenderRoll', { get: () => 7 });
            expect(component.defenderRoll).toBe(7);
        });

        it('should get notification from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'notification', {
                get: () => ({ showModal: false, errorMessages: [] }),
            });
            expect(component.notification).toEqual({ showModal: false, errorMessages: [] });

            Object.defineProperty(playingGameServiceSpy, 'notification', {
                get: () => ({ showModal: true, errorMessages: ['error'] }),
            });
            expect(component.notification).toEqual({ showModal: true, errorMessages: ['error'] });
        });

        it('should get inCombat from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'inCombat', { get: () => false });
            expect(component.inCombat).toBeFalse();

            Object.defineProperty(playingGameServiceSpy, 'inCombat', { get: () => true });
            expect(component.inCombat).toBeTrue();
        });

        it('should get actionTriggered from service', () => {
            Object.defineProperty(playingGameServiceSpy, 'actionTriggered', { get: () => false });
            expect(component.actionTriggered).toBeFalse();

            Object.defineProperty(playingGameServiceSpy, 'actionTriggered', { get: () => true });
            expect(component.actionTriggered).toBeTrue();
        });
    });

    describe('Setters', () => {
        it('should set actionTriggered in service', () => {
            let actionTriggeredValue = false;
            Object.defineProperty(playingGameServiceSpy, 'actionTriggered', {
                get: () => actionTriggeredValue,
                set: (value) => {
                    actionTriggeredValue = value;
                },
            });

            component.actionTriggered = true;

            expect(actionTriggeredValue).toBeTrue();
        });
    });

    describe('Lifecycle methods', () => {
        it('should call initialize on ngOnInit', () => {
            component.ngOnInit();

            expect(playingGameServiceSpy.initialize).toHaveBeenCalled();
        });

        it('should call ngOnDestroy on component destruction', () => {
            component.ngOnDestroy();

            expect(playingGameServiceSpy.ngOnDestroy).toHaveBeenCalled();
        });
    });

    describe('HostListeners', () => {
        it('unloadNotification should call service method', () => {
            component.unloadNotification();

            expect(playingGameServiceSpy.unloadNotification).toHaveBeenCalled();
        });

        it('handleKeyDown should call toggleDebugMode with correct admin status for d key', () => {
            const event = new KeyboardEvent('keydown', { key: DEBUG_KEY });
            const target = document.createElement('div');
            Object.defineProperty(event, 'target', { value: target });

            component.handleKeyDown(event);

            expect(playingGameServiceSpy.toggleDebugMode).toHaveBeenCalledWith(true);
        });

        it('handleKeyDown should not call toggleDebugMode for non-d keys', () => {
            const event = new KeyboardEvent('keydown', { key: 'a' });
            const target = document.createElement('div');
            Object.defineProperty(event, 'target', { value: target });

            component.handleKeyDown(event);

            expect(playingGameServiceSpy.toggleDebugMode).not.toHaveBeenCalled();
        });

        it('handleKeyDown should not call toggleDebugMode for input elements', () => {
            const event = new KeyboardEvent('keydown', { key: DEBUG_KEY });
            const target = document.createElement('input');
            Object.defineProperty(event, 'target', { value: target });

            component.handleKeyDown(event);

            expect(playingGameServiceSpy.toggleDebugMode).not.toHaveBeenCalled();
        });
    });

    describe('Delegated methods', () => {
        it('emitIsInAttack should call service method', () => {
            component.emitIsInAttack();

            expect(playingGameServiceSpy.emitIsInAttack).toHaveBeenCalled();
        });

        it('isInCombatPlayer should call and return service method result', () => {
            playingGameServiceSpy.isInCombatPlayer.and.returnValue(true);

            const result = component.isInCombatPlayer();

            expect(playingGameServiceSpy.isInCombatPlayer).toHaveBeenCalled();
            expect(result).toBeTrue();
        });

        it('activateInAttack should call service method', () => {
            component.activateInAttack();

            expect(playingGameServiceSpy.activateInAttack).toHaveBeenCalled();
        });

        it('activateAction should call service method', () => {
            component.activateAction();

            expect(playingGameServiceSpy.activateAction).toHaveBeenCalled();
        });

        it('endTurn should call service method', () => {
            component.endTurn();

            expect(playingGameServiceSpy.endTurn).toHaveBeenCalled();
        });

        it('mouseOverTile should call service method with tile', () => {
            component.mouseOverTile(mockTile);

            expect(playingGameServiceSpy.mouseOverTile).toHaveBeenCalledWith(mockTile);
        });

        it('onTileRightClick should call preventDefault and service method', () => {
            const event = new MouseEvent('contextmenu');
            spyOn(event, 'preventDefault');

            component.onTileRightClick(event, mockTile);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(playingGameServiceSpy.onTileRightClick).toHaveBeenCalledWith(mockTile);
        });

        it('toggleCombat should call and return service method result', () => {
            playingGameServiceSpy.toggleCombat.and.returnValue(true);

            const result = component.toggleCombat();

            expect(playingGameServiceSpy.toggleCombat).toHaveBeenCalled();
            expect(result).toBeTrue();
        });

        it('inCombatToggle should call service method', () => {
            component.inCombatToggle();

            expect(playingGameServiceSpy.inCombatToggle).toHaveBeenCalled();
        });

        it('executeFunction should call and return service method result', () => {
            playingGameServiceSpy.executeFunction.and.returnValue('result');

            const result = component.executeFunction();

            expect(playingGameServiceSpy.executeFunction).toHaveBeenCalled();
            expect(result).toBe('result');
        });

        it('updateDiceRolls should call service method with event', () => {
            const diceEvent: UpdateDiceRollsInterface = { attackerRoll: 6, defenderRoll: 4 };

            component.updateDiceRolls(diceEvent);

            expect(playingGameServiceSpy.updateDiceRolls).toHaveBeenCalledWith(diceEvent);
        });

        it('quitGame should call service method', () => {
            component.quitGame();

            expect(playingGameServiceSpy.quitGame).toHaveBeenCalled();
        });

        it('handleLeaveConfirmation should call service method with condition', () => {
            component.handleLeaveConfirmation(true);

            expect(playingGameServiceSpy.handleLeaveConfirmation).toHaveBeenCalledWith(true);
        });

        it('closeLeaveConfirmationPopup should call service method', () => {
            component.closeLeaveConfirmationPopup();

            expect(playingGameServiceSpy.closeLeaveConfirmationPopup).toHaveBeenCalled();
        });

        it('emitEndTurn should call service method', () => {
            component.emitEndTurn();

            expect(playingGameServiceSpy.emitEndTurn).toHaveBeenCalled();
        });

        it('checkForBotTurn should call service method', () => {
            component.checkForBotTurn();

            expect(playingGameServiceSpy.checkForBotTurn).toHaveBeenCalled();
        });
    });
});
