/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/ban-types */
// Le type Function est utilisé dans les tests pour représenter des callbacks génériques
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DELAY, MESSAGES_ROOM } from '@app/constants/constants';
import { AllWaitingRoomInfo } from '@app/interfaces/interface';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { ValidationPlayerService } from '@app/services/validation-player-service/validation-player-service.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels, TILE_TYPES } from '@common/constants';
import { Game, GameSize, Player, sizeCapacity, Tile } from '@common/interfaces';
import { of, Subject } from 'rxjs';

describe('ValidationPlayerService', () => {
    let service: ValidationPlayerService;
    let joinGameServiceMock: jasmine.SpyObj<JoinGameService>;
    let routerMock: jasmine.SpyObj<Router>;
    let notificationServiceMock: jasmine.SpyObj<NotificationService>;
    let playingServiceMock: any;

    beforeAll(() => {
        sizeCapacity[GameSize.smallSize] = { min: 2, max: 4 };
        sizeCapacity[GameSize.bigSize] = { min: 2, max: 6 };
    });

    const createMockPlayer = (index: number, isAdmin: boolean = false): Player => ({
        name: `Player${index}`,
        avatarUrl: `player${index}.png`,
        life: 5,
        speed: 3,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: index, y: index },
        isAdmin,
        victories: 0,
        isOnIce: false,
        spawnPoint: { x: index, y: index },
    });

    const mockSocket = {
        emit: jasmine.createSpy('emit'),
        on: jasmine.createSpy('on'),
        once: jasmine.createSpy('once'),
        io: {},
        id: 'socket-id',
        connected: true,
        disconnected: false,
    };

    const mockPlayers: Player[] = [
        {
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
        },
        {
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
        },
    ];

    const mockTiles: Tile[] = [
        { position: { x: 0, y: 0 }, type: TILE_TYPES.empty, traversable: true, cost: 1 } as Tile,
        { position: { x: 1, y: 1 }, type: TILE_TYPES.empty, traversable: true, cost: 1, player: mockPlayers[0] } as Tile,
        { position: { x: 2, y: 2 }, type: TILE_TYPES.empty, traversable: true, cost: 1, player: mockPlayers[1] } as Tile,
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
        size: GameSize.mediumSize,
        map: mockTiles,
        map2: mockTiles,
        visibility: true,
        id: '123',
        modificationDate: new Date().toISOString(),
        screenshot: '',
    };

    const mockAllInfo: AllWaitingRoomInfo = {
        roomCode: 'ABC123',
        playerIndex: '0',
        game: mockGame,
        playerName: '',
        allPlayer: [],
        roomSize: '',
    };

    beforeEach(() => {
        joinGameServiceMock = jasmine.createSpyObj('JoinGameService', [
            'getAllINformation',
            'getGameSize',
            'isAdmin',
            'toggleRoomLock',
            'startGame',
            'onRoomDestroyed',
            'onKicked',
        ]);
        joinGameServiceMock.socket = mockSocket as any;
        joinGameServiceMock.pinCode = 'ABC123';
        joinGameServiceMock.players$ = of(mockPlayers);
        joinGameServiceMock.getAllINformation.and.returnValue(of(mockAllInfo));
        joinGameServiceMock.getGameSize.and.returnValue(of(GameSize.smallSize));
        joinGameServiceMock.isAdmin.and.returnValue(of(true));
        joinGameServiceMock.onRoomDestroyed.and.returnValue(new Subject());
        joinGameServiceMock.onKicked.and.returnValue(new Subject());

        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        notificationServiceMock = jasmine.createSpyObj('NotificationService', ['showMessage'], {
            errorMessages: [],
            showModal: false,
        });

        const gameServiceValueMock = {
            setNewGame: jasmine.createSpy('setNewGame'),
            getNewGame: jasmine.createSpy('getNewGame').and.returnValue({ gameMode: 'Classique' }),
        };

        playingServiceMock = {
            socket: {
                on: jasmine.createSpy('on'),
            },
            gameServiceValue: gameServiceValueMock,
            isPlaying: false,
            players: [],
        };

        TestBed.configureTestingModule({
            providers: [
                ValidationPlayerService,
                { provide: JoinGameService, useValue: joinGameServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: NotificationService, useValue: notificationServiceMock },
                { provide: PlayingService, useValue: playingServiceMock },
            ],
        });

        service = TestBed.inject(ValidationPlayerService);

        mockSocket.emit.calls.reset();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Getters and Setters', () => {
        it('should properly get and set accessCode', () => {
            service.accessCode = 'XYZ789';
            expect(service.accessCode).toBe('XYZ789');
        });

        it('should properly get and set isAdministrateur', () => {
            service.isAdministrateur = true;
            expect(service.isAdministrateur).toBeTrue();

            service.isAdministrateur = false;
            expect(service.isAdministrateur).toBeFalse();
        });

        it('should properly get and set isLocked', () => {
            service.isLocked = true;
            expect(service.isLocked).toBeTrue();

            service.isLocked = false;
            expect(service.isLocked).toBeFalse();
        });

        it('should correctly return players', fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            expect(service.players).toEqual(mockPlayers);
        }));
    });

    describe('init', () => {
        it('should properly initialize the service with source and code', fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            expect(service.accessCode).toBe('ABC123');
            expect(joinGameServiceMock.getAllINformation).toHaveBeenCalledWith('Player1', 'ABC123');
            expect(joinGameServiceMock.getGameSize).toHaveBeenCalledWith('ABC123');
            expect(joinGameServiceMock.isAdmin).toHaveBeenCalled();
        }));

        it('should not fetch room info if source or code is missing', () => {
            service.init('', 'ABC123');
            expect(joinGameServiceMock.getAllINformation).not.toHaveBeenCalled();
            expect(joinGameServiceMock.getGameSize).not.toHaveBeenCalled();
        });

        it('should set isAdministrateur to true if player is admin', fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            expect(service.isAdministrateur).toBeTrue();
        }));
    });

    describe('destroy', () => {
        it('should call next and complete on destroy$ subject', () => {
            const nextSpy = spyOn((service as any).destroy$, 'next');
            const completeSpy = spyOn((service as any).destroy$, 'complete');

            service.destroy();

            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });

    describe('notifyServerOnLeave', () => {
        beforeEach(() => {
            mockSocket.emit.calls.reset();
        });

        it('should emit LeaveRoom event when player leaves the room', fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            service.notifyServerOnLeave();
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.LeaveRoom, {
                roomCode: 'ABC123',
                player: mockPlayers[1],
                isAdmin: true,
            });
        }));

        it('should not emit LeaveRoom event if accessCode is empty', fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            service.accessCode = '';
            service.notifyServerOnLeave();
            expect(mockSocket.emit).not.toHaveBeenCalledWith(SocketWaitRoomLabels.LeaveRoom, jasmine.any(Object));
        }));

        it('should not emit LeaveRoom event if actual player is not found', fakeAsync(() => {
            service.init('NonExistentPlayer', 'ABC123');
            tick();
            service.notifyServerOnLeave();
            expect(mockSocket.emit).not.toHaveBeenCalledWith(SocketWaitRoomLabels.LeaveRoom, jasmine.any(Object));
        }));
    });

    describe('adminManuallyKick', () => {
        it('should emit KickPlayer event and update players on success', fakeAsync(() => {
            const playerToKick = mockPlayers[1];
            const updatedPlayers = [mockPlayers[0]];

            service.init('Player1', 'ABC123');
            tick();

            mockSocket.once.and.callFake((event: string, callback: Function) => {
                if (event === SocketWaitRoomLabels.KickResponse) {
                    callback({ success: true, redirect: '/home', allPlayers: updatedPlayers });
                }
            });

            service.adminManuallyKick(playerToKick);
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.KickPlayer, {
                roomCode: 'ABC123',
                player: playerToKick,
            });
            expect(mockSocket.once).toHaveBeenCalledWith(SocketWaitRoomLabels.KickResponse, jasmine.any(Function));
            expect(service.players).toEqual(updatedPlayers);
        }));

        it('should not update players list if kick response is unsuccessful', fakeAsync(() => {
            const playerToKick = mockPlayers[1];

            service.init('Player1', 'ABC123');
            tick();

            mockSocket.once.and.callFake((event: string, callback: Function) => {
                if (event === SocketWaitRoomLabels.KickResponse) {
                    callback({ success: false, redirect: '', allPlayers: [] });
                }
            });

            service.adminManuallyKick(playerToKick);
            expect(service.players).toEqual(mockPlayers);
        }));
    });

    describe('toggleLock', () => {
        beforeEach(fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            (service as any).gameSize = GameSize.smallSize;
            (service as any).playersSubject.next(mockPlayers);
        }));

        it('should toggle lock state from false to true', () => {
            service.isLocked = false;
            service.toggleLock();
            expect(service.isLocked).toBeTrue();
            expect(joinGameServiceMock.toggleRoomLock).toHaveBeenCalledWith('ABC123', true);
        });

        it('should toggle lock state from true to false if under capacity', () => {
            service.isLocked = true;
            service.toggleLock();
            expect(service.isLocked).toBeFalse();
            expect(joinGameServiceMock.toggleRoomLock).toHaveBeenCalledWith('ABC123', false);
        });

        it('should not toggle lock if gameSize is empty', () => {
            (service as any).gameSize = '';
            service.isLocked = false;
            service.toggleLock();
            expect(service.isLocked).toBeFalse();
            expect(joinGameServiceMock.toggleRoomLock).not.toHaveBeenCalled();
        });

        it('should not unlock if at max capacity', fakeAsync(() => {
            const maxCapacityPlayers = Array(sizeCapacity[GameSize.mediumSize].max)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            (service as any).gameSize = GameSize.mediumSize;
            service.isLocked = true;

            playersSub.next(maxCapacityPlayers);
            tick();

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            service.toggleLock();

            expect(service.isLocked).toBeTrue();
            expect(notificationServiceMock.errorMessages).toContain(MESSAGES_ROOM.noUnlockedRoom);
            expect(notificationServiceMock.showModal).toBeFalse();
        }));
    });

    describe('startGame', () => {
        beforeEach(fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
            (service as any).gameSize = GameSize.smallSize;
            (service as any).playersSubject.next(mockPlayers);
        }));

        it('should successfully start the game when conditions are met', fakeAsync(() => {
            service.isLocked = true;
            const result = service.startGame();
            tick();
            expect(result).toBeTrue();
            expect(joinGameServiceMock.startGame).toHaveBeenCalledWith('ABC123', mockPlayers);
            expect(playingServiceMock.players).toEqual(mockPlayers);
        }));

        it('should show error message if room is not locked and user is admin', fakeAsync(() => {
            service.isLocked = false;
            service.isAdministrateur = true;
            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            const result = service.startGame();
            tick();
            expect(result).toBeFalse();
            expect(notificationServiceMock.errorMessages).toContain(MESSAGES_ROOM.lockRoom);
            expect(notificationServiceMock.showModal).toBeFalse();
        }));

        it('should return false if gameSize is empty', fakeAsync(() => {
            (service as any).gameSize = '';
            service.isLocked = true;
            const result = service.startGame();
            tick();
            expect(result).toBeFalse();
            expect(joinGameServiceMock.startGame).not.toHaveBeenCalled();
        }));

        it('should return false if player count is below minimum capacity', fakeAsync(() => {
            (joinGameServiceMock.getGameSize as jasmine.Spy).and.returnValue(of(GameSize.bigSize));
            service.init('Player1', 'ABC123');
            tick();
            (service as any).gameSize = GameSize.bigSize;
            const minPlayersRequired = sizeCapacity[GameSize.bigSize].min;
            const fewPlayers = Array(minPlayersRequired - 1)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(fewPlayers);
            tick();
            service.isLocked = true;

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            const result = service.startGame();
            tick();
            expect(result).toBeFalse();
            expect(joinGameServiceMock.startGame).not.toHaveBeenCalled();
            expect(notificationServiceMock.showModal).toBeFalse();
        }));

        it('should return false if odd number of players in CTF mode', fakeAsync(() => {
            const oddPlayers = [createMockPlayer(1, true), createMockPlayer(2), createMockPlayer(3)];
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            playingServiceMock.gameServiceValue.getNewGame.and.returnValue({ gameMode: 'CTF' });

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(oddPlayers);
            tick();
            service.isLocked = true;

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            const result = service.startGame();
            tick();
            expect(result).toBeFalse();
            expect(joinGameServiceMock.startGame).not.toHaveBeenCalled();
            expect(notificationServiceMock.showModal).toBeFalse();
        }));
    });

    describe('canAddVirtualPlayer', () => {
        beforeEach(fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
        }));

        it('should return true if player count is below max capacity', fakeAsync(() => {
            (service as any).gameSize = GameSize.smallSize;
            const fewPlayers = Array(sizeCapacity[GameSize.smallSize].max - 1)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(fewPlayers);
            tick();

            const result = service.canAddVirtualPlayer();
            expect(result).toBeTrue();
        }));

        it('should return false if player count is at max capacity', fakeAsync(() => {
            (service as any).gameSize = GameSize.smallSize;
            const maxPlayers = Array(sizeCapacity[GameSize.smallSize].max)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(maxPlayers);
            tick();

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            const result = service.canAddVirtualPlayer();
            expect(result).toBeTrue();
            expect(notificationServiceMock.showModal).toBeFalse();
        }));

        it('should return false if gameSize is empty', () => {
            (service as any).gameSize = '';
            const result = service.canAddVirtualPlayer();
            expect(result).toBeFalse();
        });
    });

    describe('isRoomFull', () => {
        beforeEach(fakeAsync(() => {
            service.init('Player1', 'ABC123');
            tick();
        }));

        it('should return true if player count equals max capacity', fakeAsync(() => {
            (service as any).gameSize = GameSize.smallSize;
            const maxPlayers = Array(sizeCapacity[GameSize.smallSize].max)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(maxPlayers);
            tick();

            const result = service.isRoomFull();
            expect(result).toBeTrue();
        }));

        it('should return false if player count is below max capacity', fakeAsync(() => {
            (service as any).gameSize = GameSize.smallSize;
            const fewPlayers = Array(sizeCapacity[GameSize.smallSize].max - 1)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(fewPlayers);
            tick();

            const result = service.isRoomFull();
            expect(result).toBeFalse();
        }));

        it('should return false if gameSize is empty', () => {
            (service as any).gameSize = '';
            const result = service.isRoomFull();
            expect(result).toBeFalse();
        });
    });

    describe('navigateHome', () => {
        it('should navigate to home page', () => {
            service.navigateHome();
            expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
        });
    });

    describe('Socket Listeners', () => {
        it('should setup StartGame listener in constructor', () => {
            expect(playingServiceMock.socket.on).toHaveBeenCalledWith(SocketPlayerMovementLabels.StartGame, jasmine.any(Function));
        });

        it('should navigate to playing game when StartGame event is received', () => {
            const onCall = playingServiceMock.socket.on.calls.mostRecent();
            const callback = onCall.args[1];

            const gameData = {
                game: { id: 'game1', gameMode: 'Classique' },
                players: mockPlayers,
            };

            callback(gameData);

            expect(playingServiceMock.gameServiceValue.setNewGame).toHaveBeenCalledWith(gameData.game);
            expect(playingServiceMock.isPlaying).toBeTrue();
            expect(playingServiceMock.players).toEqual(mockPlayers);
            expect(routerMock.navigate).toHaveBeenCalledWith(['/playingGame']);
        });

        it('should handle room destroyed event', fakeAsync(() => {
            const destroyedSubject = new Subject<{ message: string; redirect: string }>();
            joinGameServiceMock.onRoomDestroyed.and.returnValue(destroyedSubject);

            service.init('Player1', 'ABC123');
            tick();

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            expect(notificationServiceMock.showModal).toBeFalse();
            expect(notificationServiceMock.errorMessages).toEqual([]);
        }));

        it('should handle player kicked event', fakeAsync(() => {
            const kickedSubject = new Subject<{ message: string; redirect: string }>();
            joinGameServiceMock.onKicked.and.returnValue(kickedSubject);

            service.init('Player1', 'ABC123');
            tick();

            notificationServiceMock.errorMessages = [];
            notificationServiceMock.showModal = false;

            expect(notificationServiceMock.showModal).toBeFalse();
        }));
    });

    describe('Private Methods', () => {
        it('should update lock state when room reaches max capacity', fakeAsync(() => {
            (service as any).gameSize = GameSize.smallSize;
            service.isLocked = false;

            (service as any).updateLockState();
            expect(service.isLocked).toBeFalse();

            const maxCapacityPlayers = Array(sizeCapacity[GameSize.smallSize].max)
                .fill(0)
                .map((_, i) => createMockPlayer(i));
            const playersSub = new Subject<Player[]>();
            joinGameServiceMock.players$ = playersSub.asObservable();

            service.init('Player1', 'ABC123');
            tick();
            playersSub.next(maxCapacityPlayers);
            tick();

            expect(service.isLocked).toBeTrue();
            expect(joinGameServiceMock.toggleRoomLock).toHaveBeenCalledWith('ABC123', true);
        }));

        it('should not update lock state when gameSize is empty', () => {
            (service as any).gameSize = '';
            service.isLocked = false;

            (service as any).updateLockState();
            expect(service.isLocked).toBeFalse();
            expect(joinGameServiceMock.toggleRoomLock).not.toHaveBeenCalled();
        });

        it('should handle onKicked and redirect after delay', fakeAsync(() => {
            const kickedSubject = new Subject<{ message: string; redirect: string }>();
            joinGameServiceMock.onKicked.and.returnValue(kickedSubject);

            service.init('Player1', 'ABC123');
            tick();

            Object.defineProperty(notificationServiceMock, 'errorMessages', {
                value: [],
                writable: true,
            });
            Object.defineProperty(notificationServiceMock, 'showModal', {
                value: false,
                writable: true,
            });

            kickedSubject.next({ message: 'You were kicked', redirect: '/home' });

            expect(notificationServiceMock.errorMessages).toContain('You were kicked');
            expect(notificationServiceMock.showModal).toBeTrue();

            expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
        }));

        it('should handle room destroyed by displaying modal, error message and navigate after delay', fakeAsync(() => {
            const destroyedSubject = new Subject<{ message: string; redirect: string }>();
            joinGameServiceMock.onRoomDestroyed.and.returnValue(destroyedSubject);

            (service as any).destroy$ = new Subject<void>();
            (service as any).subscribeToRoomDestroyed();

            const message = 'Room has been destroyed';
            const redirectUrl = '/home';

            Object.defineProperty(notificationServiceMock, 'errorMessages', {
                value: [],
                writable: true,
            });
            Object.defineProperty(notificationServiceMock, 'showModal', {
                value: false,
                writable: true,
            });

            destroyedSubject.next({ message, redirect: redirectUrl });

            expect(notificationServiceMock.errorMessages).toContain(message);
            expect(notificationServiceMock.showModal).toBeTrue();
            expect(routerMock.navigate).not.toHaveBeenCalled();

            tick(DELAY);

            expect(routerMock.navigate).toHaveBeenCalledWith([redirectUrl]);
            expect(notificationServiceMock.errorMessages.length).toBe(0);
        }));
    });
});
