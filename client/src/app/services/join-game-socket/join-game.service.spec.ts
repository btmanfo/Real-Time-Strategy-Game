/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
import { fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AllWaitingRoomInfo, Game } from '@app/interfaces/interface';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { GameService } from '@app/services/game-service/game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { GlobalStatistics, Player } from '@common/interfaces';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io-client';
import { JoinGameService } from './join-game.service';

describe('JoinGameService', () => {
    let service: JoinGameService;
    let mockSocket: jasmine.SpyObj<Socket>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockPlayingService: jasmine.SpyObj<PlayingService>;
    let mockGameLogService: jasmine.SpyObj<GameLogService>;

    const mockPlayer: Player = {
        name: 'Player1',
        avatarUrl: 'avatar1',
        isAdmin: true,
        coordinate: { x: 0, y: 0 },
        life: 4,
        attack: '4 Faces',
        defense: '4 Faces',
        speed: 5,
    };

    const mockGame: Game = {
        id: 'game1',
        description: 'Test game',
        name: 'Test Game',
        size: 'medium',
        gameMode: 'standard',
        map: [],
        map2: [],
        screenshot: '',
        visibility: true,
        modificationDate: new Date().toISOString(),
    };

    const roomCode = 'room123';
    const mockPlayers: Player[] = [
        {
            name: 'Player1',
            avatarUrl: 'avatar1.png',
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
            life: 3,
            attack: 'A',
            defense: 'B',
            speed: 5,
        },
    ];

    const firstPlayer: Player = {
        name: 'Player1',
        avatarUrl: 'avatar1.png',
        isAdmin: true,
        coordinate: { x: 0, y: 0 },
        life: 4,
        attack: 'Attack1',
        defense: 'Defense1',
        speed: 6,
    };

    const secondPlayer: Player = {
        name: 'Player2',
        avatarUrl: 'avatar2.png',
        isAdmin: false,
        coordinate: { x: 1, y: 1 },
        life: 3,
        attack: 'Attack2',
        defense: 'Defense2',
        speed: 5,
    };

    beforeEach(() => {
        mockSocket = jasmine.createSpyObj('Socket', ['on', 'once', 'emit', 'removeAllListeners', 'disconnect']);

        mockGameService = jasmine.createSpyObj('GameService', ['getNewGame', 'setNewGame']);
        mockGameService.getNewGame.and.returnValue(mockGame);

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        mockPlayingService = jasmine.createSpyObj('PlayingService', [], {
            isPlaying: false,
            players: [],
            myPlayer: null,
        });

        mockGameLogService = jasmine.createSpyObj('GameLogService', ['joinRoom']);

        TestBed.configureTestingModule({
            providers: [
                JoinGameService,
                { provide: GameService, useValue: mockGameService },
                { provide: Router, useValue: mockRouter },
                { provide: PlayingService, useValue: mockPlayingService },
                { provide: GameLogService, useValue: mockGameLogService },
            ],
        });

        (window as any).io = () => mockSocket;

        service = TestBed.inject(JoinGameService);

        (service as any).socket = mockSocket;
        (service as any).gameLogService = mockGameLogService;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should disconnect and remove listeners on destroy', () => {
        service.ngOnDestroy();
        expect(mockSocket.removeAllListeners).toHaveBeenCalled();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should update playersSubject when PlayersList event is received', () => {
        service.initSocketPlayersList();
        expect(mockSocket.on).toHaveBeenCalledWith(SocketWaitRoomLabels.PlayersList, (service as any).playerListHandler);
    });

    describe('playerListHandler', () => {
        it('should update playersSubject with the provided players', fakeAsync(() => {
            const mockPlayersList: Player[] = [
                {
                    name: 'Player1',
                    avatarUrl: 'avatar1.png',
                    isAdmin: false,
                    coordinate: { x: 0, y: 0 },
                    life: 3,
                    attack: 'A',
                    defense: 'B',
                    speed: 5,
                },
                {
                    name: 'Player2',
                    avatarUrl: 'avatar2.png',
                    isAdmin: true,
                    coordinate: { x: 1, y: 1 },
                    life: 4,
                    attack: 'C',
                    defense: 'D',
                    speed: 6,
                },
            ];

            (service as any).playerListHandler(mockPlayersList);
            service.players$.subscribe((players) => {
                expect(players).toEqual(mockPlayersList);
            });
        }));
    });

    describe('createRoom', () => {
        it('should emit createRoom and handle roomCreated response', (done) => {
            mockSocket.once.and.callFake((event, callback) => {
                if (event === 'roomCreated') {
                    setTimeout(async () => callback(roomCode), 10);
                }
                return mockSocket;
            });

            service.createRoom().subscribe((result) => {
                expect(result).toBe(roomCode);
                expect(service.pinCode).toBe(roomCode);
                expect(mockSocket.emit).toHaveBeenCalledWith('createRoom', mockGame);
                done();
            });
        });
    });

    describe('toggleRoomLock', () => {
        it('should emit toggleRoomLock event', () => {
            const isLocked = true;
            service.toggleRoomLock(roomCode, isLocked);
            expect(mockSocket.emit).toHaveBeenCalledWith('toggleRoomLock', { roomCode, isLocked });
        });
    });

    describe('startGame', () => {
        it('should emit startGame event', () => {
            service.startGame(roomCode, mockPlayers);
            expect(mockSocket.emit).toHaveBeenCalledWith('startGame', {
                roomCode,
                players: mockPlayers,
            });
        });
    });

    describe('selectCharacter', () => {
        it('should emit characterSelected event', () => {
            const avatarUrl = 'avatar1';
            service.player = mockPlayer;
            service.selectCharacter(roomCode, avatarUrl);
            expect(mockSocket.emit).toHaveBeenCalledWith('characterSelected', {
                roomCode,
                player: mockPlayer,
                avatarUrl,
            });
        });
    });

    describe('deselectCharacterForRoom', () => {
        it('should emit characterDeselected event', () => {
            const avatarUrl = 'avatar1';
            service.deselectCharacterForRoom(roomCode, avatarUrl);
            expect(mockSocket.emit).toHaveBeenCalledWith('characterDeselected', { roomCode, avatarUrl });
        });
    });

    describe('onCharacterSelected', () => {
        it('should listen to characterSelected event', (done) => {
            const avatarUrl = 'avatar1';

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'characterSelected') {
                    setTimeout(async () => callback(avatarUrl), 10);
                }
                return mockSocket;
            });

            service.onCharacterSelected().subscribe((result) => {
                expect(result).toBe(avatarUrl);
                done();
            });
        });
    });

    describe('joinRoomSelectCharacter', () => {
        it('should emit joinRoomSelectPlayer event', () => {
            service.joinRoomSelectCharacter(roomCode);
            expect(mockSocket.emit).toHaveBeenCalledWith('joinRoomSelectPlayer', roomCode);
        });
    });

    describe('onRoomDestroyed', () => {
        it('should listen to roomDestroyed event', (done) => {
            const data = { message: 'Room destroyed', redirect: '/home' };

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'roomDestroyed') {
                    setTimeout(async () => callback(data), 10);
                }
                return mockSocket;
            });

            service.onRoomDestroyed().subscribe((result) => {
                expect(result).toEqual(data);
                done();
            });
        });
    });

    describe('isRoomExist', () => {
        it('should emit isRoomExist and handle isRoomExistResponse', (done) => {
            const exists = true;

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'isRoomExistResponse') {
                    setTimeout(async () => callback(exists), 10);
                }
                return mockSocket;
            });

            service.isRoomExist(roomCode).subscribe((result) => {
                expect(result).toBe(exists);
                expect(mockSocket.emit).toHaveBeenCalledWith('isRoomExist', roomCode);
                done();
            });
        });
    });

    describe('isRoomLocked', () => {
        it('should emit isRoomLocked and handle isRoomLockedResponse', (done) => {
            const isLocked = true;

            mockSocket.once.and.callFake((event, callback) => {
                if (event === 'isRoomLockedResponse') {
                    setTimeout(async () => callback(isLocked), 10);
                }
                return mockSocket;
            });

            service.isRoomLocked(roomCode).subscribe((result) => {
                expect(result).toBe(isLocked);
                expect(mockSocket.emit).toHaveBeenCalledWith('isRoomLocked', roomCode);
                done();
            });
        });
    });

    describe('isRoomFull', () => {
        it('should emit isRoomFull and handle getRoomFull', (done) => {
            const isFull = true;

            mockSocket.once.and.callFake((event, callback) => {
                if (event === 'getRoomFull') {
                    setTimeout(async () => callback(isFull), 10);
                }
                return mockSocket;
            });

            service.isRoomFull(roomCode).subscribe((result) => {
                expect(result).toBe(isFull);
                expect(mockSocket.emit).toHaveBeenCalledWith('isRoomFull', String(roomCode));
                done();
            });
        });
    });

    describe('validatePlayerSelection', () => {
        it('should emit playerValidated event', () => {
            service.validatePlayerSelection(roomCode, mockPlayer);
            expect(mockSocket.emit).toHaveBeenCalledWith('playerValidated', { roomCode, player: mockPlayer });
        });
    });

    describe('onCharacterToDeselect', () => {
        it('should listen to theCharacterToDeselect event', (done) => {
            const data = { theUrlOfSelectPlayer: 'avatar1', theRoomCodeToDesable: roomCode };

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'theCharacterToDeselect') {
                    setTimeout(async () => callback(data), 10);
                }
                return mockSocket;
            });

            service.onCharacterToDeselect().subscribe((result) => {
                expect(result).toEqual(data);
                done();
            });
        });
    });

    describe('onCharacterDeselected', () => {
        it('should listen to theCharacterDeselected event', (done) => {
            const data = { theUrlOfSelectPlayer: 'avatar1', theRoomCodeToDesable: roomCode };

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'theCharacterDeselected') {
                    setTimeout(async () => callback(data), 10);
                }
                return mockSocket;
            });

            service.onCharacterDeselected().subscribe((result) => {
                expect(result).toEqual(data);
                done();
            });
        });
    });

    describe('getActivePlayers', () => {
        it('should emit getActivePlayers and handle activePlayers', (done) => {
            const players = [mockPlayer];

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'activePlayers') {
                    setTimeout(async () => callback(players), 10);
                }
                return mockSocket;
            });

            service.getActivePlayers(roomCode).subscribe((result) => {
                expect(result).toEqual(players);
                expect(mockSocket.emit).toHaveBeenCalledWith('getActivePlayers', roomCode);
                done();
            });
        });
    });

    describe('isAdmin', () => {
        it('should emit isFirstPlayer and handle isFirstPlayerResponse', (done) => {
            const response = { isFirst: true };

            mockSocket.once.and.callFake((event, callback) => {
                if (event === 'isFirstPlayerResponse') {
                    setTimeout(async () => callback(response), 10);
                }
                return mockSocket;
            });

            service.isAdmin(roomCode, mockPlayer).subscribe((result) => {
                expect(result).toBe(response.isFirst);
                expect(mockSocket.emit).toHaveBeenCalledWith('isFirstPlayer', { roomCode, player: mockPlayer });
                done();
            });
        });
    });

    describe('getGameId', () => {
        it('should emit getGameID and handle returnGameID', (done) => {
            const gameId = 'game1';

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'returnGameID') {
                    setTimeout(async () => callback(gameId), 10);
                }
                return mockSocket;
            });

            service.getGameId(roomCode).subscribe((result) => {
                expect(result).toBe(gameId);
                expect(mockSocket.emit).toHaveBeenCalledWith('getGameID', roomCode);
                done();
            });
        });
    });

    describe('getGameSize', () => {
        it('should emit getGameSize and handle returnGameSize', (done) => {
            const gameSize = 'medium';

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'returnGameSize') {
                    setTimeout(async () => callback(gameSize), 10);
                }
                return mockSocket;
            });

            service.getGameSize(roomCode).subscribe((result) => {
                expect(result).toBe(gameSize);
                expect(mockSocket.emit).toHaveBeenCalledWith('getGameSize', roomCode);
                done();
            });
        });
    });

    describe('onKicked', () => {
        it('should listen to kicked event', (done) => {
            const data = { message: 'You were kicked', redirect: '/home' };

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'kicked') {
                    setTimeout(async () => callback(data), 10);
                }
                return mockSocket;
            });

            service.onKicked().subscribe((result) => {
                expect(result).toEqual(data);
                done();
            });
        });
    });

    describe('onPlayersList', () => {
        it('should return the players$ observable', () => {
            const players$ = new Observable<Player[]>();
            (service as any).players$ = players$;
            const result = service.onPlayersList();
            expect(result).toBe(players$);
        });
    });

    it('should complete the observable if player is null', (done) => {
        service.joinRoom(roomCode, null as any).subscribe({
            complete: done,
            next: () => fail('should not have nexted'),
            error: () => fail('should not have errored'),
        });
    });

    it('should update player with response player if provided', (done) => {
        const updatedPlayer = { ...mockPlayer, name: 'Player2' };
        const responseData = {
            success: true,
            player: updatedPlayer,
        };

        mockSocket.once.and.callFake((event, callback) => {
            if (event === 'roomJoined') {
                setTimeout(async () => callback(responseData), 10);
            }
            return mockSocket;
        });

        service.joinRoom(roomCode, mockPlayer).subscribe(() => {
            expect(service.player).toBe(updatedPlayer);
            done();
        });
    });

    describe('joinRoom', () => {
        it('should call gameLogService.joinRoom with empty string when player name is null', () => {
            const playerWithNullName: Player = {
                ...mockPlayer,
                name: null as any,
            };

            const responseData = {
                success: true,
            };

            mockSocket.once.and.callFake((event, callback) => {
                if (event === SocketWaitRoomLabels.RoomJoined) {
                    setTimeout(async () => callback(responseData), 10);
                }
                return mockSocket;
            });

            service.joinRoom(roomCode, playerWithNullName);
            expect(mockGameLogService.joinRoom).toHaveBeenCalledWith(roomCode, '');
        });

        it('should call gameLogService.joinRoom with empty string when player name is undefined', () => {
            const playerWithUndefinedName: Player = {
                ...mockPlayer,
                name: null,
            };

            const responseData = {
                success: true,
            };

            mockSocket.once.and.callFake((event, callback) => {
                if (event === SocketWaitRoomLabels.RoomJoined) {
                    setTimeout(async () => callback(responseData), 10);
                }
                return mockSocket;
            });

            service.joinRoom(roomCode, playerWithUndefinedName);
            expect(mockGameLogService.joinRoom).toHaveBeenCalledWith(roomCode, '');
        });

        it('should call gameLogService.joinRoom with correct parameters', () => {
            service.joinRoom(roomCode, mockPlayer);
            expect(mockGameLogService.joinRoom).toHaveBeenCalledWith(roomCode, mockPlayer.name || '');
        });
    });

    describe('getAllInformation', () => {
        it('should emit getAllPlayerAndGameInfo and handle toAllInformation response', (done) => {
            const player = 'Player1';
            const allValue: AllWaitingRoomInfo = {
                game: mockGame,
                playerName: player,
                playerIndex: '1',
                roomCode,
                allPlayer: [mockPlayer],
                roomSize: '2',
            };

            mockSocket.on.and.callFake((event, callback) => {
                if (event === 'toAllInformation') {
                    setTimeout(async () => callback(allValue), 10);
                }
                return mockSocket;
            });

            service.getAllINformation(player, roomCode).subscribe((result) => {
                expect(result).toEqual(allValue);
                expect(mockSocket.emit).toHaveBeenCalledWith('getAllPlayerAndGameInfo', { player, roomCode });
                done();
            });
        });
    });

    describe('startGame (combat room)', () => {
        it('should emit startGame event with roomCode and players', () => {
            service.startGame(roomCode, mockPlayers);
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.StartGame, { roomCode, players: mockPlayers });
        });
    });

    describe('joinAndCreateGameRoomCombat', () => {
        it('should emit createAndJoinGameRoom event with firstPlayer and secondPlayer', () => {
            service.joinAndCreateGameRoomCombat(firstPlayer, secondPlayer);
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.CreateAndJoinGameRoom, { firstPlayer, secondPlayer });
        });
    });

    describe('onRoomCreated', () => {
        it('should emit observable with room creation data', (done) => {
            const data = { codeRoom: roomCode, theFirstPlayer: firstPlayer, theSecondPlayer: secondPlayer };

            mockSocket.on.and.callFake((event: string, callback: (data: any) => void) => {
                if (event === SocketWaitRoomLabels.codeGameCombatRoom) {
                    setTimeout(() => callback(data), 10);
                }
                return mockSocket;
            });

            service.onRoomCreated().subscribe((result) => {
                expect(result).toEqual(data);
                done();
            });
        });
    });

    describe('onMessageReceived', () => {
        it('should emit observable with received message data', (done) => {
            const messageData = { message: 'Hello', roomCode, userName: 'thomas' };
            mockSocket.on.and.callFake((event: string, callback: (data: any) => void) => {
                if (event === SocketWaitRoomLabels.onSendMessageCombatRoom) {
                    setTimeout(() => callback(messageData), 10);
                }
                return mockSocket;
            });

            service.onMessageReceived().subscribe((result) => {
                expect(result).toEqual(messageData);
                done();
            });
        });

        describe('sendMessage', () => {
            it('should emit sendMessageCombatRoom event with roomCode, message and userName', () => {
                const message = 'Hello World';
                const userName = 'Player1';

                service.sendMessage(roomCode, message, userName);

                expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.SendMessageCombatRoom, { roomCode, message, userName });
            });

            describe('emitVirtualPlayer', () => {
                it('should return Observable that emits virtual player data when socket emits', (done) => {
                    const mockVirtualPlayerData = {
                        currentPlayer: mockPlayer,
                        roomCode: 'room123',
                    };

                    mockSocket.on.and.callFake((event, callback) => {
                        if (event === SocketWaitRoomLabels.EmitVirtualPlayer) {
                            setTimeout(async () => callback(mockVirtualPlayerData), 10);
                        }
                        return mockSocket;
                    });

                    service.emitVirtualPlayer().subscribe((data) => {
                        expect(data).toBeDefined();
                        expect(data.currentPlayer).toBeDefined();
                        done();
                    });
                });

                describe('getAllInfo', () => {
                    it('should emit GetAllGame and handle ToAllForGame response', (done) => {
                        const mockGameData = {
                            isLocked: false,
                            pin: roomCode,
                            players: mockPlayers,
                            size: 'medium',
                            game: mockGame,
                            playerPositions: {},
                        };

                        mockSocket.on.and.callFake((event, callback) => {
                            if (event === SocketWaitRoomLabels.ToAllForGame) {
                                setTimeout(async () => callback(mockGameData), 10);
                            }
                            return mockSocket;
                        });

                        service.getAllInfo(roomCode).subscribe((result) => {
                            expect(result).toBeDefined();
                            expect(result.players).toBeDefined();
                            expect(result.pin).toBe(roomCode);
                            expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.GetAllGame, { roomCode });
                            done();
                        });
                    });

                    describe('getAllGlobalInfo', () => {
                        it('should emit GetAllGlobalInfo and handle ToAllGlobalInfo response', (done) => {
                            const mockGlobalStats: GlobalStatistics = {
                                allTime: 3600,
                                percentageOfTile: 50,
                                percentageOfDors: 30,
                                nbrPlayerOpenDoor: 5,
                                allDoors: [],
                                nbOfTakenFleg: 2,
                            };

                            mockSocket.on.and.callFake((event, callback) => {
                                if (event === SocketWaitRoomLabels.ToAllGlobalInfo) {
                                    setTimeout(async () => callback(mockGlobalStats), 10);
                                }
                                return mockSocket;
                            });

                            service.getAllGlobalInfo(roomCode).subscribe((result) => {
                                expect(result).toBeDefined();
                                expect(result.allTime).toBe(3600);
                                expect(mockSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.GetAllGlobalInfo, { roomCode });
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
