/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-empty-function */
// Les fonctions vides sont utilisées pour les tests unitaires

import { TIME_BEFORE_TURN, TIME_TURN } from '@app/constants/constants';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { TimeService } from './time.service';

describe('TimeService', () => {
    let service: TimeService;
    let turnService: TurnService;
    let server: Server;
    let playingManagerService: PlayingManagerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimeService,
                {
                    provide: TurnService,
                    useValue: {
                        endTurn: jest.fn(),
                    },
                },
                {
                    provide: PlayingManagerService,
                    useValue: {
                        gamesPlayers: new Map(),
                        gamesPlayerTurn: new Map(),
                    },
                },
            ],
        }).compile();

        service = module.get<TimeService>(TimeService);
        turnService = module.get<TurnService>(TurnService);
        playingManagerService = module.get<PlayingManagerService>(PlayingManagerService);
        service.gamesCounter = new Map();

        Object.defineProperty(service, 'gamesInterval', {
            get: jest.fn().mockReturnValue(new Map()),
        });

        Object.defineProperty(service, 'gamesIsNotification', {
            get: jest.fn().mockReturnValue(new Map()),
        });

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;

        playingManagerService.gamesPlayers = new Map<string, Player[]>();
        playingManagerService.gamesPlayerTurn = new Map<string, Player>();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('startTimer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllTimers();
            service.stopTimer('room1');
        });

        it('should not start a new interval if one already exists', () => {
            service['gamesInterval'].set(
                'room1',
                setInterval(() => {}, 1000),
            );
            service.startTimer(TIME_TURN, server, 'room1', { name: 'player1' } as Player);
            expect(server.to).not.toHaveBeenCalled();
        });

        it('should set time and emit timeIncrement when start value is TIME_TURN', () => {
            service.startTimer(TIME_TURN, server, 'room1', { name: 'player1' } as Player);
            expect(service.gamesCounter.get('room1')).toBe(TIME_TURN);
            expect(server.to).toHaveBeenCalledWith('room1');
            expect(server.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.TimeIncrement,
                TIME_TURN,
                (service as any).gamesIsNotification.get('room1'),
            );
        });

        it('should call manageNotification when start value is TIME_BEFORE_TURN', () => {
            const manageNotificationSpy = jest.spyOn<any, any>(service, 'manageNotification');
            service.startTimer(TIME_BEFORE_TURN, server, 'room1', { name: 'player1' } as Player);
            expect(manageNotificationSpy).toHaveBeenCalled();
        });

        it('should decrement time and emit timeIncrement every tick', () => {
            service.startTimer(TIME_TURN, server, 'room1', { name: 'player1' } as Player);
            jest.advanceTimersByTime(1000);
            expect(service.gamesCounter.get('room1')).toBe(TIME_TURN - 1);
            expect(server.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.TimeIncrement,
                TIME_TURN - 1,
                (service as any).gamesIsNotification.get('room1'),
            );
        });

        it('should call manageEndTurn when time reaches 0 and start value is not TIME_BEFORE_TURN', () => {
            const endTurnSpy = jest.spyOn(turnService, 'endTurn');
            service.startTimer(TIME_TURN, server, 'room1', { name: 'player1' } as Player);
            jest.advanceTimersByTime((TIME_TURN + 1) * 1000);
            expect(endTurnSpy).toHaveBeenCalled();
        });

        it('should call startTurnTimer when time reaches 0 and start value is TIME_BEFORE_TURN', () => {
            const startTimerSpy = jest.spyOn(service, 'startTimer');
            service.startTimer(TIME_BEFORE_TURN, server, 'room1', { name: 'player1' } as Player);
            jest.advanceTimersByTime((TIME_BEFORE_TURN + 1) * 1000);
            expect(startTimerSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('stopTimer', () => {
        it('should clear interval and reset the interval to undefined', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            service['gamesInterval'].set(
                'room1',
                setInterval(() => {}, 1000),
            );
            service.stopTimer('room1');
            expect(clearIntervalSpy).toHaveBeenCalled();
            expect(service['gamesInterval'].get('room1')).toBeUndefined();
        });
    });

    describe('manageNotification', () => {
        it('should emit notificationTurn when start value is TIME_BEFORE_TURN and time equals the start value', () => {
            service.gamesCounter.set('room1', TIME_BEFORE_TURN);
            (service as any).manageNotification(server, TIME_BEFORE_TURN, 'room1', { name: 'player1', isVirtualPlayer: false } as Player);
            expect(server.to).toHaveBeenCalledWith('room1');
            expect(server.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.NotificationTurn, {
                message: "C'est au tour de player1 à jouer",
                isEnded: false,
            });
            expect((service as any).gamesIsNotification.get('room1')).toBe(true);
        });

        it('should not emit notificationTurn when start value is not TIME_BEFORE_TURN', () => {
            (service as any).manageNotification(server, TIME_TURN, 'room1', { name: 'player1' } as Player);
            expect(server.emit).not.toHaveBeenCalledWith(SocketPlayerMovementLabels.NotificationTurn, expect.anything());
        });

        it('should emit EmitVirtualPlayer event when player is a virtual player', () => {
            service.gamesCounter.set('room1', TIME_BEFORE_TURN);
            (server.emit as jest.Mock).mockClear();

            const virtualPlayer: Player = {
                name: 'AI Bot',
                isVirtualPlayer: true,
                life: 6,
                speed: 3,
                attack: '',
                defense: '',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
                avatarUrl: '',
            };

            (service as any).manageNotification(server, TIME_BEFORE_TURN, 'room1', virtualPlayer);

            expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.EmitVirtualPlayer, {
                codeRoom: 'room1',
                currentPlayer: virtualPlayer,
            });

            expect((service as any).gamesIsNotification.get('room1')).toBe(true);
        });
    });

    describe('startTurnTimer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllTimers();
            if (service && service.stopTimer) {
                service.stopTimer('room1');
            }
        });

        it('should emit special notification for virtual player when player is a virtual player', () => {
            const virtualPlayer = { name: 'virtualPlayer', isVirtualPlayer: true } as Player;
            service.gamesCounter.set('room1', TIME_BEFORE_TURN);
            (service as any).manageNotification(server, TIME_BEFORE_TURN, 'room1', virtualPlayer);

            expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.EmitVirtualPlayer, {
                codeRoom: 'room1',
                currentPlayer: virtualPlayer,
            });
        });
    });
});
