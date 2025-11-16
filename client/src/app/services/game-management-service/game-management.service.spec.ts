import { TestBed } from '@angular/core/testing';
import { BoardService } from '@app/services/board-service/board.service';
import { GameManagementService } from '@app/services/game-management-service/game-management.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import SpyObj = jasmine.SpyObj;

describe('GameManagementService', () => {
    let service: GameManagementService;
    let playingServiceSpy: SpyObj<PlayingService>;
    let notificationServiceSpy: SpyObj<NotificationService>;
    let socketSpy: SpyObj<Socket>;
    let boardServiceSpy: SpyObj<BoardService>;

    const mockPlayer: Player = {
        name: 'TestPlayer',
        avatarUrl: 'test.png',
        life: 100,
        speed: 5,
        attack: '10',
        defense: '5',
        coordinate: { x: 0, y: 0 },
        isAdmin: true,
    };

    const mockTile: Tile = {
        position: { x: 0, y: 0 },
        type: 'normal',
        isReachable: true,
        isHighlighted: false,
        traversable: true,
        item: null,
        player: null,
        image: 'tile.png',
        cost: 1,
    };

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit']);
        boardServiceSpy = jasmine.createSpyObj('BoardService', ['dummyMethod'], {
            tiles: [mockTile],
        });

        const joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['dummyMethod'], {
            socket: socketSpy,
            pinCode: 'TEST123',
        });

        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['dummyMethod'], {
            joinGameService: joinGameServiceSpy,
            boardService: boardServiceSpy,
            localPlayer: mockPlayer,
        });

        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['dummyMethod']);

        let isTimedNotificationValue = true;
        Object.defineProperty(notificationServiceSpy, 'isTimedNotification', {
            get: jasmine.createSpy('isTimedNotificationGetter').and.callFake(() => isTimedNotificationValue),
            set: jasmine.createSpy('isTimedNotificationSetter').and.callFake((value: boolean) => {
                isTimedNotificationValue = value;
            }),
        });

        TestBed.configureTestingModule({
            providers: [
                GameManagementService,
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        });

        service = TestBed.inject(GameManagementService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should toggle and return showLeaveConfirmationPopup value when quitGame is called', () => {
        expect(service.showLeaveConfirmationPopup).toBeFalse();

        const firstResult = service.quitGame();
        expect(firstResult).toBeTrue();
        expect(service.showLeaveConfirmationPopup).toBeTrue();

        const secondResult = service.quitGame();
        expect(secondResult).toBeFalse();
        expect(service.showLeaveConfirmationPopup).toBeFalse();
    });

    it('should handle leave confirmation when condition is false', () => {
        service.showLeaveConfirmationPopup = true;

        service.handleLeaveConfirmation(false);

        expect(service.showLeaveConfirmationPopup).toBeFalse();
        expect(notificationServiceSpy.isTimedNotification).toBeTrue();
        expect(socketSpy.emit).not.toHaveBeenCalled();
    });

    it('should close leave confirmation popup', () => {
        service.showLeaveConfirmationPopup = true;

        service.closeLeaveConfirmationPopup();

        expect(service.showLeaveConfirmationPopup).toBeFalse();
    });

    it('should handle leave confirmation when condition is true', () => {
        service.showLeaveConfirmationPopup = true;
        spyOn(service, 'emitQuitGame');

        service.handleLeaveConfirmation(true);

        expect(service.showLeaveConfirmationPopup).toBeFalse();
        expect(notificationServiceSpy.isTimedNotification).toBeFalse();
        expect(service.emitQuitGame).toHaveBeenCalled();
    });

    it('should handle leave confirmation when condition is false', () => {
        service.showLeaveConfirmationPopup = true;
        spyOn(service, 'emitQuitGame');

        service.handleLeaveConfirmation(false);

        expect(service.showLeaveConfirmationPopup).toBeFalse();
        expect(service.emitQuitGame).not.toHaveBeenCalled();
    });

    it('should emit quit game event with correct parameters', () => {
        Object.defineProperty(playingServiceSpy, 'boardServiceValue', {
            get: () => boardServiceSpy,
        });

        service.emitQuitGame();

        expect(socketSpy.emit).toHaveBeenCalledWith('quitGame', {
            map: [mockTile],
            player: mockPlayer,
            roomCode: 'TEST123',
        });
    });

    it('should access the correct properties from playing service when emitting quit game', () => {
        Object.defineProperty(playingServiceSpy, 'boardServiceValue', {
            get: () => boardServiceSpy,
        });

        service.emitQuitGame();

        expect(playingServiceSpy.joinGameService.socket).toBe(socketSpy);
        expect(playingServiceSpy.boardServiceValue.tiles).toEqual([mockTile]);
        expect(playingServiceSpy.localPlayer).toBe(mockPlayer);
        expect(playingServiceSpy.joinGameService.pinCode).toBe('TEST123');
    });
});
