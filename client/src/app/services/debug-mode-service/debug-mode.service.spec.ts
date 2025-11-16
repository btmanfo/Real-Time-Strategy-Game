/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player } from '@common/interfaces';
import { DebugModeService } from './debug-mode.service';
import SpyObj = jasmine.SpyObj;

describe('DebugModeService', () => {
    let service: DebugModeService;
    let notificationServiceSpy: SpyObj<NotificationService>;
    let playingServiceSpy: SpyObj<PlayingService>;
    let gameLogServiceSpy: SpyObj<GameLogService>;
    let socketSpy: SpyObj<any>;

    const mockLocalPlayer: Player = {
        name: 'TestPlayer',
        avatarUrl: 'test-avatar.png',
        isAdmin: true,
        coordinate: { x: 0, y: 0 },
        life: 4,
        attack: 'Test Attack',
        defense: 'Test Defense',
        speed: 5,
    };

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit']);

        const joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['dummyMethod'], {
            socket: socketSpy,
            pinCode: 'test-pin',
        });

        let debugModeValue = false;
        let errorMessagesValue: string[] = [];
        let showModalValue = false;

        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['dummyMethod'], {
            joinGameService: joinGameServiceSpy,
            localPlayer: mockLocalPlayer,
        });

        const isDebugModeGetterSpy = jasmine.createSpy('isDebugModeGetter').and.callFake(() => debugModeValue);
        const isDebugModeSetterSpy = jasmine.createSpy('isDebugModeSetter').and.callFake((value: boolean) => {
            debugModeValue = value;
        });

        Object.defineProperty(playingServiceSpy, 'isDebugMode', {
            get: isDebugModeGetterSpy,
            set: isDebugModeSetterSpy,
        });

        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['dummyMethod']);

        const errorMessagesGetterSpy = jasmine.createSpy('errorMessagesGetter').and.callFake(() => errorMessagesValue);
        const errorMessagesSetterSpy = jasmine.createSpy('errorMessagesSetter').and.callFake((value: string[]) => {
            errorMessagesValue = value;
        });

        Object.defineProperty(notificationServiceSpy, 'errorMessages', {
            get: errorMessagesGetterSpy,
            set: errorMessagesSetterSpy,
        });

        Object.defineProperty(notificationServiceSpy, 'showModal', {
            get: jasmine.createSpy('showModalGetter').and.callFake(() => showModalValue),
            set: jasmine.createSpy('showModalSetter').and.callFake((value: boolean) => {
                showModalValue = value;
            }),
        });

        gameLogServiceSpy = jasmine.createSpyObj('GameLogService', ['sendDebugLog'], {
            myRoom: 'test-room',
        });

        TestBed.configureTestingModule({
            providers: [
                DebugModeService,
                { provide: NotificationService, useValue: notificationServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: GameLogService, useValue: gameLogServiceSpy },
            ],
        });

        service = TestBed.inject(DebugModeService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('toggleDebugMode', () => {
        it('should deny access and return false when user is not admin', () => {
            const result = service.toggleDebugMode(false);

            expect(result).toBeFalse();
            expect(notificationServiceSpy.errorMessages).toEqual(["Vous n'êtes pas autorisé à activer le mode débogage."]);
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(socketSpy.emit).not.toHaveBeenCalled();
            expect(gameLogServiceSpy.sendDebugLog).not.toHaveBeenCalled();
        });

        it('should enable debug mode and return true when user is admin and debug mode is off', () => {
            playingServiceSpy.isDebugMode = false;

            const result = service.toggleDebugMode(true);

            expect(result).toBeTrue();
            expect(playingServiceSpy.isDebugMode).toBeTrue();
            expect(socketSpy.emit).toHaveBeenCalledWith('debugModeChanged', {
                roomCode: 'test-pin',
                isDebugMode: true,
            });
            expect(notificationServiceSpy.errorMessages).toEqual(['Mode débogage activé']);
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(gameLogServiceSpy.sendDebugLog).toHaveBeenCalledWith('test-room', mockLocalPlayer, true);
        });

        it('should disable debug mode and return false when user is admin and debug mode is on', () => {
            playingServiceSpy.isDebugMode = true;

            const result = service.toggleDebugMode(true);

            expect(result).toBeFalse();
            expect(playingServiceSpy.isDebugMode).toBeFalse();
            expect(socketSpy.emit).toHaveBeenCalledWith('debugModeChanged', {
                roomCode: 'test-pin',
                isDebugMode: false,
            });
            expect(notificationServiceSpy.errorMessages).toEqual(['Mode débogage désactivé']);
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(gameLogServiceSpy.sendDebugLog).toHaveBeenCalledWith('test-room', mockLocalPlayer, false);
        });

        it('should not call sendDebugLog when localPlayer is null', () => {
            Object.defineProperty(playingServiceSpy, 'localPlayer', {
                get: () => null,
            });

            const result = service.toggleDebugMode(true);

            expect(result).toBeTrue();
            expect(gameLogServiceSpy.sendDebugLog).not.toHaveBeenCalled();
        });
    });
});
