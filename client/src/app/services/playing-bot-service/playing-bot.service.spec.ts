/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable  @typescript-eslint/no-empty-function*/
// Fonctions vides nécessaires pour les stubs/mocks dans les tests unitaires
import { TestBed } from '@angular/core/testing';
import { ActionService } from '@app/services/action-service/action.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { PlayingBotService } from './playing-bot.service';

describe('PlayingBotService', () => {
    let service: PlayingBotService;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let actionServiceSpy: jasmine.SpyObj<ActionService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
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
        isVirtualPlayer: true,
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

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on', 'off', 'addEventListener', 'removeEventListener']);

        socketSpy.addEventListener.and.callFake((event: any, handler: any) => {
            if (event === SocketPlayerMovementLabels.StartFight) {
                socketSpy.startFightHandler = handler;
            }
        });

        playingServiceSpy = jasmine.createSpyObj('PlayingService', [], {
            playerTurn: mockPlayer1,
            players: [mockPlayer1, mockPlayer2],
        });

        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['onRoomCreated'], {
            socket: socketSpy,
        });

        actionServiceSpy = jasmine.createSpyObj('ActionService', ['autoBotTurn', 'isBot']);
        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['showNotification']);

        TestBed.configureTestingModule({
            providers: [
                PlayingBotService,
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: ActionService, useValue: actionServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        });

        service = TestBed.inject(PlayingBotService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('checkForBotTurn', () => {
        it('should not launch the bot turn if isBotTurnInProgress is already true', () => {
            (service as any).isBotTurnInProgress = true;
            const spyHandleBotTurn = spyOn<any>(service, 'handleBotTurn');

            service.checkForBotTurn(() => {});

            expect(spyHandleBotTurn).not.toHaveBeenCalled();
        });

        it('should do nothing if currentPlayer is null', () => {
            (service as any).isBotTurnInProgress = false;
            Object.defineProperty(playingServiceSpy, 'playerTurn', { get: () => null });
            const spyHandleBotTurn = spyOn<any>(service, 'handleBotTurn');

            service.checkForBotTurn(() => {});

            expect(spyHandleBotTurn).not.toHaveBeenCalled();
        });

        it('should do nothing if currentPlayer is not a bot', () => {
            (service as any).isBotTurnInProgress = false;
            actionServiceSpy.isBot.and.returnValue(false);
            const spyHandleBotTurn = spyOn<any>(service, 'handleBotTurn');

            service.checkForBotTurn(() => {});

            expect(spyHandleBotTurn).not.toHaveBeenCalled();
        });

        it('should initiate the bot turn if currentPlayer is a bot', () => {
            (service as any).isBotTurnInProgress = false;
            actionServiceSpy.isBot.and.returnValue(true);
            const spyHandleBotTurn = spyOn<any>(service, 'handleBotTurn');
            const callback = jasmine.createSpy('callback');

            service.checkForBotTurn(callback);

            expect((service as any).isBotTurnInProgress).toBeTrue();
            expect(spyHandleBotTurn).toHaveBeenCalledWith(mockPlayer1, callback);
        });

        it('should throw an exception if an error occurs in handleBotTurn', () => {
            (service as any).isBotTurnInProgress = false;
            actionServiceSpy.isBot.and.returnValue(true);

            spyOn<any>(service, 'handleBotTurn').and.throwError('Fake error');

            expect(() => service.checkForBotTurn(() => {})).toThrowError(/Error during bot turn/);
        });
    });

    describe('handleBotTurn', () => {
        it('should unsubscribe from previous botFightSubscription if exists', () => {
            const unsubscribeSpy = jasmine.createSpy('unsubscribe');
            (service as any).botFightSubscription = { unsubscribe: unsubscribeSpy };
            spyOn<any>(service, 'executeBotTurnWithRetry');

            (service as any).handleBotTurn(mockPlayer1, () => {});

            expect(unsubscribeSpy).toHaveBeenCalled();
        });

        it('should set up a subscription to StartFight events', () => {
            spyOn<any>(service, 'isBotInvolved').and.returnValue(true);
            spyOn<any>(service, 'executeBotTurnWithRetry');
            const callback = jasmine.createSpy('callback');

            (service as any).handleBotTurn(mockPlayer1, callback);

            const eventData = [mockPlayer1, mockPlayer2];

            socketSpy.startFightHandler(eventData);
            expect(callback).toHaveBeenCalledWith(eventData);
        });

        it('should not call the callback if bot is not involved', () => {
            spyOn<any>(service, 'isBotInvolved').and.returnValue(false);
            spyOn<any>(service, 'executeBotTurnWithRetry');
            const callback = jasmine.createSpy('callback');

            (service as any).handleBotTurn(mockPlayer1, callback);

            expect(callback).not.toHaveBeenCalled();
        });

        it('should call executeBotTurnWithRetry', () => {
            const executeSpy = spyOn<any>(service, 'executeBotTurnWithRetry');

            (service as any).handleBotTurn(mockPlayer1, () => {});

            expect(executeSpy).toHaveBeenCalledWith(mockPlayer1);
        });
    });

    describe('isBotInvolved', () => {
        it('should return true if bot is in players array', () => {
            const result = (service as any).isBotInvolved(mockPlayer1, [mockPlayer1, mockPlayer2]);
            expect(result).toBeTrue();
        });

        it('should return false if bot is not in players array', () => {
            const result = (service as any).isBotInvolved({ ...mockPlayer1, name: 'OtherBot' }, [mockPlayer1, mockPlayer2]);
            expect(result).toBeFalse();
        });
    });

    describe('executeBotTurnWithRetry', () => {
        it('should call actionService.autoBotTurn', () => {
            actionServiceSpy.autoBotTurn.and.returnValue();

            (service as any).executeBotTurnWithRetry(mockPlayer1);

            expect(actionServiceSpy.autoBotTurn).toHaveBeenCalledWith(mockPlayer1);
        });

        it('should retry when an exception is thrown', () => {
            jasmine.clock().install();

            let callCount = 0;
            actionServiceSpy.autoBotTurn.and.callFake(() => {
                callCount++;
                if (callCount === 1) throw new Error('Test error');
            });

            (service as any).executeBotTurnWithRetry(mockPlayer1);

            expect(callCount).toBe(1);
            jasmine.clock().tick(1001);
            expect(callCount).toBe(2);

            jasmine.clock().uninstall();
        });
    });

    describe('cleanupBotSubscription', () => {
        it('should unsubscribe from botFightSubscription and reset isBotTurnInProgress', () => {
            const unsubscribeSpy = jasmine.createSpy('unsubscribe');
            (service as any).botFightSubscription = { unsubscribe: unsubscribeSpy };
            (service as any).isBotTurnInProgress = true;

            service.cleanupBotSubscription();

            expect(unsubscribeSpy).toHaveBeenCalled();
            expect((service as any).isBotTurnInProgress).toBeFalse();
        });

        it('should not fail if botFightSubscription is null', () => {
            (service as any).botFightSubscription = null;
            (service as any).isBotTurnInProgress = true;

            expect(() => service.cleanupBotSubscription()).not.toThrow();
            expect((service as any).isBotTurnInProgress).toBeFalse();
        });
    });

    describe('ngOnDestroy', () => {
        it('should call cleanupBotSubscription and complete destroy$', () => {
            spyOn(service, 'cleanupBotSubscription');
            const nextSpy = spyOn((service as any).destroy$, 'next');
            const completeSpy = spyOn((service as any).destroy$, 'complete');

            service.ngOnDestroy();

            expect(service.cleanupBotSubscription).toHaveBeenCalled();
            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });
});
