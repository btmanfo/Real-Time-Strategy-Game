/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { MAP_GRID_SIZE, POURCENTAGE_CALCULATION } from '@app/constants/constants';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { StatisticsService } from '@app/services/statistics-service/statistics.service';
import { VirtualPlayerService } from '@app/services/virtual-player-service/virtual-player.service';
import { SocketWaitRoomLabels } from '@common/constants';
import { Game, GameData, GameSize, Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

describe('GameRoomGateway', () => {
    let gateway: GameRoomGateway;
    let gameRoomService: GameRoomService;
    let server: Server;
    let adminClient: Socket;
    let kickedClient: Socket;
    let statisticsService: StatisticsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameRoomGateway,
                {
                    provide: GameRoomService,
                    useValue: {
                        createCombatRoomService: jest.fn().mockResolvedValue('ROOM123'),
                        createRoom: jest.fn(),
                        createSelectPlayerRoom: jest.fn(),
                        joinRoom: jest.fn(),
                        leaveRoom: jest.fn(),
                        isRoomExist: jest.fn(),
                        isRoomLocked: jest.fn(),
                        isRoomFull: jest.fn(),
                        toggleRoomLock: jest.fn(),
                        getActivePlayers: jest.fn(),
                        isFirstPlayer: jest.fn(),
                        getGame: jest.fn(),
                        getAllInformationPlayer: jest.fn(),
                        combatUpdate: jest.fn(),
                        combatEscaped: jest.fn(),
                        combatEnded: jest.fn(),
                        combatRolls: jest.fn(),
                        endGameWinVictories: jest.fn(),
                        updatePlayerPourcentageTile: jest.fn(),
                        updateLifeLost: jest.fn(),
                        updatePlayerVictories: jest.fn(),
                        updatePlayerLose: jest.fn(),
                        updateCombatCount: jest.fn(),
                        updateDodgeCount: jest.fn(),
                        updatePlayerDamages: jest.fn(),
                    },
                },
                {
                    provide: StatisticsService,
                    useValue: {
                        getAllGlobalInfo: jest.fn(),
                        updatePlayerVictories: jest.fn(),
                        updatePlayerLose: jest.fn(),
                        updatePlayerPourcentageTile: jest.fn(),
                        updatePlayerDamages: jest.fn(),
                        updateLifeLost: jest.fn(),
                        updateCombatCount: jest.fn(),
                        updateDodgeCount: jest.fn(),
                    },
                },
                {
                    provide: VirtualPlayerService,
                    useValue: {},
                },
            ],
        }).compile();

        gateway = module.get<GameRoomGateway>(GameRoomGateway);
        gameRoomService = module.get<GameRoomService>(GameRoomService);
        statisticsService = module.get<StatisticsService>(StatisticsService);
        gateway.server = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
            emit: jest.fn(),
            socketsLeave: jest.fn(),
        } as any;
        server = gateway.server;
        Object.defineProperty(gateway, 'server', { value: server });
        adminClient = {
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
            id: 'adminClientId',
        } as any as Socket;
        kickedClient = {
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
            id: 'kickedClientId',
        } as any as Socket;
        Object.defineProperty(gateway, 'socketMap', { value: new Map() });
        Object.defineProperty(gateway, 'rooms', { value: new Set() });
        Object.defineProperty(gateway, 'selectionPlayerRoom', { value: new Map() });
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('should call updateLifeLost with correct parameters when handleUpdatePlayerLifeLost is triggered', () => {
        const payload = {
            playerName: 'Alice',
            roomCode: 'ROOM456',
            dealDamage: 3,
        };

        gateway.handleUpdatePlayerLifeLost(adminClient, payload);

        expect(statisticsService.updateLifeLost).toHaveBeenCalledWith('Alice', 'ROOM456', 3);
    });

    describe('handleCreatAndJoinGameRoom', () => {
        it('should call createCombatRoomService and emit codeGameCombatRoom event with correct payload', async () => {
            const payload = {
                firstPlayer: { name: 'Alice' } as Player,
                secondPlayer: { name: 'Bob' } as Player,
            };

            await gateway.handleCreatAndJoinGameRoom(kickedClient as Socket, payload);

            expect(gameRoomService.createCombatRoomService).toHaveBeenCalledWith(payload.firstPlayer, payload.secondPlayer);

            expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.codeGameCombatRoom, {
                codeRoom: 'ROOM123',
                theFirstPlayer: payload.firstPlayer,
                theSecondPlayer: payload.secondPlayer,
            });
        });
    });

    describe('handleKickPlayer', () => {
        it('should emit kickResponse with success false if leaveRoom returns a reason', async () => {
            const payload = { roomCode: 'ROOM123', player: { name: 'Alice' } as Player };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue({ reason: 'Test failure' });

            await gateway.handleKickPlayer(kickedClient as Socket, payload);
            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith('ROOM123', payload.player);
            expect(kickedClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.kickResponse, {
                success: false,
                reason: 'Test failure',
            });
        });

        it('should kick the player successfully and emit playersList and kickResponse events', async () => {
            const payload = { roomCode: 'ROOM123', player: { name: 'Alice' } as Player };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue({});

            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ players: [{ name: 'Bob' }] });

            const kickedSocket: Partial<Socket> = {
                emit: jest.fn(),
                leave: jest.fn(),
            };
            (gateway as any).socketMap.set('Alice', kickedSocket as Socket);

            const toEmit = { emit: jest.fn() };
            (server.to as jest.Mock).mockReturnValue(toEmit);

            await gateway.handleKickPlayer(kickedClient as Socket, payload);

            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith('ROOM123', payload.player);
            expect(kickedSocket.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.Kicked, {
                message: 'Vous avez été expulsé de la salle par administrateur.',
                redirect: '/home',
            });
            expect(kickedSocket.leave).toHaveBeenCalledWith('ROOM123');
            expect((gateway as any).socketMap.has('Alice')).toBe(false);
            expect(server.to).toHaveBeenCalledWith('ROOM123');
            expect(toEmit.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.playersList, [{ name: 'Bob' }]);
            expect(kickedClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.kickResponse, {
                success: true,
                redirect: '/home',
                allPlayers: [{ name: 'Bob' }],
            });
        });
    });

    describe('handleCreateRoom', () => {
        it('should create a room and emit roomCreated event', async () => {
            const game: Game = {
                id: 'gameId',
                name: 'testGame',
                description: 'test',
                size: GameSize.smallSize,
                gameMode: 'mode',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '111111',
                screenshot: 'screenshotUrl',
            };
            const roomCode = 'room123';
            (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

            await gateway.handleCreateRoom(adminClient, game);

            expect(gameRoomService.createRoom).toHaveBeenCalledWith(game, GameSize.smallSize);
            expect(gameRoomService.createSelectPlayerRoom).toHaveBeenCalledWith(roomCode);
            expect(gateway['rooms'].has(roomCode)).toBe(true);
            expect(gateway['games'].has(roomCode)).toBe(true);
            expect(adminClient.join).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('roomCreated', roomCode);
        });

        it('should create a game with correct initial data structure', async () => {
            const game: Game = {
                id: 'gameId',
                name: 'testGame',
                description: 'test',
                size: GameSize.smallSize,
                gameMode: 'mode',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '111111',
                screenshot: 'screenshotUrl',
            };
            const roomCode = 'room123';
            (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

            await gateway.handleCreateRoom(adminClient, game);

            const createdGame = gateway.games.get(roomCode);
            expect(createdGame).toEqual({
                pin: roomCode,
                players: [],
                isLocked: false,
                updateMap: [],
                game,
                size: 'Petite Taille',
                playerPositions: {},
                pourcentagePlayerScareModeved: {},
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    secondTime: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
            });
        });

        it('should process doors in the map and add them to game statistics', async () => {
            const game: Game = {
                id: 'gameId',
                name: 'testGame',
                description: 'test',
                size: GameSize.smallSize,
                gameMode: 'mode',
                visibility: true,
                map: [
                    {
                        position: { x: 1, y: 1 },
                        type: 'Porte',
                        traversable: false,
                        item: undefined,
                        player: undefined,
                        image: '',
                        cost: 0,
                    },
                    {
                        position: { x: 2, y: 2 },
                        type: 'Mur',
                        traversable: false,
                        item: undefined,
                        player: undefined,
                        image: '',
                        cost: 0,
                    },
                    {
                        position: { x: 3, y: 3 },
                        type: 'Porte',
                        traversable: false,
                        item: undefined,
                        player: undefined,
                        image: '',
                        cost: 0,
                    },
                ],
                map2: [],
                modificationDate: '111111',
                screenshot: 'screenshotUrl',
            };
            const roomCode = 'room123';
            (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

            await gateway.handleCreateRoom(adminClient, game);

            const createdGame = gateway.games.get(roomCode);
            expect(createdGame.glocalStatistics.allDoors).toEqual([
                { coordinate: { x: 1, y: 1 }, isManipulated: false },
                { coordinate: { x: 3, y: 3 }, isManipulated: false },
            ]);
        });

        it('should return the roomCode from the method', async () => {
            const game: Game = {
                id: 'gameId',
                name: 'testGame',
                description: 'test',
                size: GameSize.smallSize,
                gameMode: 'mode',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '111111',
                screenshot: 'screenshotUrl',
            };
            const roomCode = 'room123';
            (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

            const result = await gateway.handleCreateRoom(adminClient, game);

            expect(result).toBe(roomCode);
        });
    });

    describe('handleJoinRoom', () => {
        it('should join a room successfully and emit roomJoined event with success true', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            const joinRoomResult = { newGame: { players: [player] }, newPlayer: player.name };
            (gameRoomService.joinRoom as jest.Mock).mockResolvedValue(joinRoomResult);
            const emitMock = jest.fn();
            server.to = jest.fn().mockReturnValue({ emit: emitMock });

            await gateway.handleJoinRoom(adminClient, { roomCode, player });

            expect(gameRoomService.joinRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.join).toHaveBeenCalledWith(roomCode);
            expect(gateway['socketMap'].has(player.name)).toBe(true);
            expect(emitMock).toHaveBeenCalledWith('playersList', [player]);
            expect(adminClient.emit).toHaveBeenCalledWith('roomJoined', { success: true, playerJoin: player.name });
        });

        it('should emit roomJoined event with success false if room is not found', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            (gameRoomService.joinRoom as jest.Mock).mockResolvedValue(false);

            await gateway.handleJoinRoom(adminClient, { roomCode, player });

            expect(gameRoomService.joinRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.emit).toHaveBeenCalledWith('roomJoined', { success: false, reason: 'roomNotFound or invalidPlayer' });
        });

        it('should emit roomJoined event with success false if room is full', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            const joinRoomResult = { error: 'roomFull' };
            (gameRoomService.joinRoom as jest.Mock).mockResolvedValue(joinRoomResult);

            await gateway.handleJoinRoom(adminClient, { roomCode, player });

            expect(gameRoomService.joinRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.emit).toHaveBeenCalledWith('roomJoined', { success: false, reason: 'roomFull' });
        });
    });

    describe('handleLeaveRoom', () => {
        it('should leave room successfully and emit leaveRoomResponse and playersList events', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            const leaveRoomResult = { game: { players: [player] }, destroyed: false };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue(leaveRoomResult);
            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ players: [player] });
            const emitMock = jest.fn();
            server.to = jest.fn().mockReturnValue({ emit: emitMock });

            await gateway.handleLeaveRoom(adminClient, { roomCode, player, isAdmin: false });

            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.leave).toHaveBeenCalledWith(roomCode);
            expect(emitMock).toHaveBeenCalledWith('playersList', [player]);
            expect(adminClient.emit).toHaveBeenCalledWith('leaveRoomResponse', { success: true, redirect: '/home', allPlayers: [player] });
        });

        it('should emit leaveRoomResponse with success false if there is a reason for failure', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            const leaveRoomResult = { reason: 'testReason' };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue(leaveRoomResult);

            await gateway.handleLeaveRoom(adminClient, { roomCode, player, isAdmin: false });

            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.leave).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('leaveRoomResponse', { success: false, reason: 'testReason' });
        });

        it('should emit roomDestroyed event if room is destroyed on leave', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            const leaveRoomResult = { destroyed: true };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue(leaveRoomResult);
            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ players: [] });
            const emitMock = jest.fn();
            server.to = jest.fn().mockReturnValue({ emit: emitMock });

            await gateway.handleLeaveRoom(adminClient, { roomCode, player, isAdmin: true });

            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.leave).toHaveBeenCalledWith(roomCode);
            expect(emitMock).toHaveBeenCalledWith(SocketWaitRoomLabels.RoomDestroyed, {
                message: 'La salle a été fermée par administrateur.',
                redirect: '/home',
            });
            expect(adminClient.emit).toHaveBeenCalledWith('leaveRoomResponse', { success: true, redirect: '/home', allPlayers: [] });
        });
    });

    describe('handleKickPlayer', () => {
        it('should emit kickResponse with success false if there is a reason for failure', async () => {
            const roomCode = 'room123';
            const playerToKick: Player = { name: 'kickedPlayer' } as Player;
            const kickPlayerResult = { reason: 'testReason' };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue(kickPlayerResult);

            await gateway.handleKickPlayer(adminClient, { roomCode, player: playerToKick });

            expect(gameRoomService.leaveRoom).toHaveBeenCalledWith(roomCode, playerToKick);
            expect(adminClient.emit).toHaveBeenCalledWith('kickResponse', { success: false, reason: 'testReason' });
        });

        it('should not emit kicked event if kickedSocket is not found', async () => {
            const roomCode = 'room123';
            const playerToKick: Player = { name: 'kickedPlayer' } as Player;
            const kickPlayerResult = { destroyed: false };
            (gameRoomService.leaveRoom as jest.Mock).mockResolvedValue(kickPlayerResult);
            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ players: [] });

            await gateway.handleKickPlayer(adminClient, { roomCode, player: playerToKick });

            expect(kickedClient.emit).not.toHaveBeenCalledWith('kicked', expect.anything());
            expect(adminClient.emit).toHaveBeenCalledWith('kickResponse', { success: true, redirect: '/home', allPlayers: [] });
        });
    });

    describe('handleIsRoomExist', () => {
        it('should emit isRoomExistResponse with the result from gameRoomService.isRoomExist', () => {
            const roomCode = 'room123';
            (gameRoomService.isRoomExist as jest.Mock).mockReturnValue(true);

            gateway.handleIsRoomExist(adminClient, roomCode);

            expect(gameRoomService.isRoomExist).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('isRoomExistResponse', true);
        });
    });

    describe('handleIsRoomLocked', () => {
        it('should emit isRoomLockedResponse with the result from gameRoomService.isRoomLocked', () => {
            const roomCode = 'room123';
            (gameRoomService.isRoomLocked as jest.Mock).mockReturnValue(true);

            gateway.handleIsRoomLocked(adminClient, roomCode);

            expect(gameRoomService.isRoomLocked).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('isRoomLockedResponse', true);
        });
    });

    describe('handleIsRoomFull', () => {
        it('should emit getRoomFull with the result from gameRoomService.isRoomFull', () => {
            const roomCode = 'room123';
            (gameRoomService.isRoomFull as jest.Mock).mockReturnValue(true);

            gateway.handleIsRoomFull(adminClient, roomCode);

            expect(gameRoomService.isRoomFull).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('getRoomFull', true);
        });
    });

    describe('handleToggleRoomLock', () => {
        it('should toggle room lock and emit roomLockStatus event if gameRoomService.toggleRoomLock returns game', () => {
            const roomCode = 'room123';
            const isLocked = true;
            const gameData: GameData = { roomCode: 'room123', players: [], isLocked: false } as GameData;
            (gameRoomService.toggleRoomLock as jest.Mock).mockReturnValue(gameData);
            const emitMock = jest.fn();
            server.to = jest.fn().mockReturnValue({ emit: emitMock });

            gateway.handleToggleRoomLock(adminClient, { roomCode, isLocked });

            expect(gameRoomService.toggleRoomLock).toHaveBeenCalledWith(roomCode, isLocked);
            expect(emitMock).toHaveBeenCalledWith('roomLockStatus', isLocked);
        });

        it('should not emit roomLockStatus event if gameRoomService.toggleRoomLock returns null', () => {
            const roomCode = 'room123';
            const isLocked = true;
            (gameRoomService.toggleRoomLock as jest.Mock).mockReturnValue(null);

            gateway.handleToggleRoomLock(adminClient, { roomCode, isLocked });

            expect(gameRoomService.toggleRoomLock).toHaveBeenCalledWith(roomCode, isLocked);
            expect(server.to(roomCode).emit).not.toHaveBeenCalledWith('roomLockStatus', expect.anything());
        });
    });

    describe('handleGetActivePlayers', () => {
        it('should emit activePlayers with the result from gameRoomService.getActivePlayers', () => {
            const roomCode = 'room123';
            const activePlayers = [{ name: 'player1' }, { name: 'player2' }] as Player[];
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue(activePlayers);

            gateway.handleGetActivePlayers(adminClient, roomCode);

            expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('activePlayers', activePlayers);
        });
    });

    describe('handleIsFirstPlayer', () => {
        it('should emit isFirstPlayerResponse with the result from gameRoomService.isFirstPlayer', async () => {
            const roomCode = 'room123';
            const player: Player = { name: 'testPlayer' } as Player;
            (gameRoomService.isFirstPlayer as jest.Mock).mockResolvedValue(true);

            await gateway.handleIsFirstPlayer(adminClient, { roomCode, player });

            expect(gameRoomService.isFirstPlayer).toHaveBeenCalledWith(roomCode, player);
            expect(adminClient.emit).toHaveBeenCalledWith('isFirstPlayerResponse', { isFirst: true });
        });
    });

    describe('handleGetGameId', () => {
        it('should emit returnGameID with the game id from gameRoomService.getGame', async () => {
            const roomCode = 'room123';
            const gameId = 'gameId123';
            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ game: { id: gameId } });

            await gateway.handleGetGameId(adminClient, roomCode);

            expect(gameRoomService.getGame).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('returnGameID', gameId);
        });
    });

    describe('handleGetGameSize', () => {
        it('should emit returnGameSize with the game size from gameRoomService.getGame', async () => {
            const roomCode = 'room123';
            const gameSize = 'Large Size';
            (gameRoomService.getGame as jest.Mock).mockResolvedValue({ game: { size: gameSize } });

            await gateway.handleGetGameSize(adminClient, roomCode);

            expect(gameRoomService.getGame).toHaveBeenCalledWith(roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('returnGameSize', gameSize);
        });
    });

    describe('handleGetAllInformation', () => {
        it('should emit toAllInformation with the result from gameRoomService.getAllInformationPlayer', () => {
            const roomCode = 'room123';
            const player = 'testPlayer';
            const allInformation = { roomCode, player };
            (gameRoomService.getAllInformationPlayer as jest.Mock).mockReturnValue(allInformation);

            gateway.handleGetAllInformation(adminClient, { player, roomCode });

            expect(gameRoomService.getAllInformationPlayer).toHaveBeenCalledWith(player, roomCode);
            expect(adminClient.emit).toHaveBeenCalledWith('toAllInformation', allInformation);
        });
    });

    describe('handleGetAll', () => {
        it('should emit all game information to the client', () => {
            const mockGameInfo = { someInfo: 'value' };
            const roomCode = 'room123';
            (gameRoomService as any).games = new Map([[roomCode, mockGameInfo]]);

            gateway.handleGetAll(adminClient, { roomCode });

            expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.toAllForGame, mockGameInfo);
        });
    });

    describe('handlePathToMove', () => {
        it('should update player position and statistics for Grande Taille', () => {
            const roomCode = 'room123';
            const currentPlayer = { name: 'player1', coordinate: { x: 1, y: 1 } } as Player;
            const mockGame: GameData = {
                isLocked: false,
                pin: '1234',
                players: [currentPlayer],
                size: '10',
                game: {
                    size: GameSize.bigSize,
                    id: '',
                    description: '',
                    name: '',
                    gameMode: '',
                    visibility: false,
                    map: [],
                    map2: [],
                    modificationDate: '',
                    screenshot: '',
                },
                playerPositions: {},
                pourcentagePlayerScareModeved: {},
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
            };
            gateway['games'].set(roomCode, mockGame);

            gateway.handlePathToMove(currentPlayer, roomCode);

            expect(mockGame.playerPositions['1,1']).toContain(currentPlayer.name);
            expect(statisticsService.updatePlayerPourcentageTile).toHaveBeenCalledWith(currentPlayer.name, roomCode, expect.any(Number));

            const expectedPercentage = Math.ceil((1 / MAP_GRID_SIZE.large) * POURCENTAGE_CALCULATION);
            expect(mockGame.glocalStatistics.percentageOfTile).toBe(expectedPercentage);
        });

        it('should update player position and statistics for Moyenne Taille', () => {
            const roomCode = 'room123';
            const currentPlayer = { name: 'player1', coordinate: { x: 1, y: 1 } } as Player;
            const mockGame: GameData = {
                isLocked: false,
                pin: '1234',
                players: [currentPlayer],
                size: '10',
                game: {
                    size: GameSize.mediumSize,
                    id: '',
                    description: '',
                    name: '',
                    gameMode: '',
                    visibility: false,
                    map: [],
                    map2: [],
                    modificationDate: '',
                    screenshot: '',
                },
                playerPositions: {},
                pourcentagePlayerScareModeved: {},
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
            };
            gateway['games'].set(roomCode, mockGame);

            gateway.handlePathToMove(currentPlayer, roomCode);

            expect(mockGame.playerPositions['1,1']).toContain(currentPlayer.name);
            expect(statisticsService.updatePlayerPourcentageTile).toHaveBeenCalled();
        });

        it('should update player position and statistics for Petite Taille', () => {
            const roomCode = 'room123';
            const currentPlayer = { name: 'player1', coordinate: { x: 1, y: 1 } } as Player;
            const mockGame: GameData = {
                isLocked: false,
                pin: '1234',
                players: [currentPlayer],
                size: '10',
                game: {
                    size: GameSize.smallSize,
                    id: '',
                    description: '',
                    name: '',
                    gameMode: '',
                    visibility: false,
                    map: [],
                    map2: [],
                    modificationDate: '',
                    screenshot: '',
                },
                playerPositions: {},
                pourcentagePlayerScareModeved: {},
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
            };
            gateway['games'].set(roomCode, mockGame);

            gateway.handlePathToMove(currentPlayer, roomCode);

            expect(mockGame.playerPositions['1,1']).toContain(currentPlayer.name);
            expect(statisticsService.updatePlayerPourcentageTile).toHaveBeenCalled();
        });
    });

    describe('Virtual player management', () => {
        describe('handleAddAttackerVirtualPlayer', () => {
            it('should handle error case', async () => {
                const mockVirtualPlayerService = {
                    addAttackerVirtualPlayer: jest.fn().mockResolvedValue({ error: 'Some error' }),
                };
                (gateway as any).virtualPlayerService = mockVirtualPlayerService;

                await gateway.handleAddAttackerVirtualPlayer(adminClient, 'room123');

                expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.error, { message: 'Some error' });
            });

            it('should handle success case', async () => {
                const mockVirtualPlayerService = {
                    addAttackerVirtualPlayer: jest.fn().mockResolvedValue({ success: true }),
                };
                (gateway as any).virtualPlayerService = mockVirtualPlayerService;
                const mockGame = { players: ['player1'] };
                (gameRoomService.getGame as jest.Mock).mockResolvedValue(mockGame);

                await gateway.handleAddAttackerVirtualPlayer(adminClient, 'room123');

                expect(server.to).toHaveBeenCalledWith('room123');
                expect(server.to('room123').emit).toHaveBeenCalledWith(SocketWaitRoomLabels.playersList, mockGame.players);
            });
        });

        describe('handleAddDefensiveVirtualPlayer', () => {
            it('should handle error case', async () => {
                const mockVirtualPlayerService = {
                    addDefensiveVirtualPlayer: jest.fn().mockResolvedValue({ error: 'Some error' }),
                };
                (gateway as any).virtualPlayerService = mockVirtualPlayerService;

                await gateway.handleAddDefensiveVirtualPlayer(adminClient, 'room123');

                expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.error, { message: 'Some error' });
            });
        });

        describe('handleRemoveVirtualPlayer', () => {
            it('should handle error case', async () => {
                const mockVirtualPlayerService = {
                    removeVirtualPlayer: jest.fn().mockResolvedValue({ error: 'Some error' }),
                };
                (gateway as any).virtualPlayerService = mockVirtualPlayerService;

                await gateway.handleRemoveVirtualPlayer(adminClient, { roomCode: 'room123', playerName: 'bot1' });

                expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.error, { message: 'Some error' });
            });

            it('should handle success case', async () => {
                const mockVirtualPlayerService = {
                    removeVirtualPlayer: jest.fn().mockResolvedValue({ success: true }),
                };
                (gateway as any).virtualPlayerService = mockVirtualPlayerService;
                const mockGame = { players: ['remaining player'] };
                (gameRoomService.getGame as jest.Mock).mockResolvedValue(mockGame);

                await gateway.handleRemoveVirtualPlayer(adminClient, { roomCode: 'room123', playerName: 'bot1' });

                expect(server.to).toHaveBeenCalledWith('room123');
                expect(server.to('room123').emit).toHaveBeenCalledWith(SocketWaitRoomLabels.playersList, mockGame.players);
            });

            describe('handleUpdateBoard', () => {
                it('should update the board for a game', async () => {
                    const roomCode = 'room123';
                    const mockTiles = [{ id: 1, position: { x: 0, y: 0 }, type: 'floor' }];
                    const mockGame = { updateMap: [] };
                    gateway.games.set(roomCode, mockGame as any);

                    await gateway.handleUpdateBoard(adminClient, { roomCode, board: mockTiles as any });

                    expect(gateway.games.get(roomCode).updateMap).toBe(mockTiles);
                });

                it('should handle updating board for a non-existent game without errors', async () => {
                    const roomCode = 'nonExistentRoom';
                    const mockTiles = [{ id: 1, position: { x: 0, y: 0 }, type: 'floor' }];
                    gateway.games = new Map();

                    const updateBoardPromise = gateway.handleUpdateBoard(adminClient, { roomCode, board: mockTiles as any });

                    await updateBoardPromise;
                    expect(true).toBeTruthy();
                });
            });
        });
    });

    describe('handleUpdatePlayerVictories', () => {
        it('should call gameRoomService.updatePlayerVictories with the correct parameters', () => {
            const payload = {
                currentPlayer: 'player1',
                roomCode: 'room123',
                nbVictories: 5,
            };

            gateway.handleUpdatePlayerVictories(adminClient, payload);

            expect(statisticsService.updatePlayerVictories).toHaveBeenCalledWith(payload.currentPlayer, payload.roomCode, payload.nbVictories);
        });
    });

    describe('handleUpdatePlayerLose', () => {
        it('should call gameRoomService.updatePlayerLose with the correct parameters', () => {
            const payload = {
                currentPlayer: 'player1',
                roomCode: 'room123',
                nbLoses: 3,
            };

            gateway.handleUpdatePlayerLose(adminClient, payload);

            expect(statisticsService.updatePlayerLose).toHaveBeenCalledWith(payload.currentPlayer, payload.roomCode, payload.nbLoses);
        });
    });

    describe('handleUpdateDodgeCombatCount', () => {
        it('should call gameRoomService.updateDodgeCount with the correct parameters', () => {
            const payload = {
                currentPlayer: 'player1',
                roomCode: 'room123',
            };

            gateway.handleUpdateDodgeCombatCount(adminClient, payload);

            expect(statisticsService.updateDodgeCount).toHaveBeenCalledWith(payload.currentPlayer, payload.roomCode);
        });
    });

    describe('handleUpdatePlayerDamages', () => {
        it('should call gameRoomService.updatePlayerDamages with the correct parameters', () => {
            const payload = {
                playerName: 'player1',
                roomCode: 'room123',
                dealDamage: 4,
            };

            gateway.handleUpdatePlayerDamages(adminClient, payload);

            expect(statisticsService.updatePlayerDamages).toHaveBeenCalledWith(payload.playerName, payload.roomCode, payload.dealDamage);
        });

        it('should handle success case for adding defensive virtual player', async () => {
            const mockVirtualPlayerService = {
                addDefensiveVirtualPlayer: jest.fn().mockResolvedValue({ success: true }),
            };
            (gateway as any).virtualPlayerService = mockVirtualPlayerService;
            const mockGame = { players: ['player1', 'defensive-bot'] };
            (gameRoomService.getGame as jest.Mock).mockResolvedValue(mockGame);

            await gateway.handleAddDefensiveVirtualPlayer(adminClient, 'room123');

            expect(mockVirtualPlayerService.addDefensiveVirtualPlayer).toHaveBeenCalledWith('room123');
            expect(gameRoomService.getGame).toHaveBeenCalledWith('room123');
            expect(server.to).toHaveBeenCalledWith('room123');
            expect(server.to('room123').emit).toHaveBeenCalledWith(SocketWaitRoomLabels.PlayersList, mockGame.players);
        });

        it('should not emit player list if game is not found after adding defensive virtual player', async () => {
            const mockVirtualPlayerService = {
                addDefensiveVirtualPlayer: jest.fn().mockResolvedValue({ success: true }),
            };
            (gateway as any).virtualPlayerService = mockVirtualPlayerService;
            (gameRoomService.getGame as jest.Mock).mockResolvedValue(null);

            await gateway.handleAddDefensiveVirtualPlayer(adminClient, 'room123');

            expect(mockVirtualPlayerService.addDefensiveVirtualPlayer).toHaveBeenCalledWith('room123');
            expect(gameRoomService.getGame).toHaveBeenCalledWith('room123');
            expect(server.to).not.toHaveBeenCalled();
        });

        describe('handleUpdatePlayerCombatCount', () => {
            it('should call gameRoomService.updateCombatCount with the correct parameters', () => {
                const payload = {
                    currentPlayer: 'player1',
                    roomCode: 'room123',
                    theSecondPlayer: 'player2',
                };

                gateway.handleUpdatePlayerCombatCount(adminClient, payload);

                expect(statisticsService.updateCombatCount).toHaveBeenCalledWith(payload.currentPlayer, payload.roomCode, payload.theSecondPlayer);
            });

            it('should handle combat count update with different player parameters', () => {
                const payload = {
                    currentPlayer: 'attacker',
                    roomCode: 'battle456',
                    theSecondPlayer: 'defender',
                };

                gateway.handleUpdatePlayerCombatCount(adminClient, payload);

                expect(statisticsService.updateCombatCount).toHaveBeenCalledWith('attacker', 'battle456', 'defender');
            });

            describe('handleCreateRoom', () => {
                it('should create a room and emit roomCreated event', async () => {
                    const game: Game = {
                        id: 'gameId',
                        name: 'testGame',
                        description: 'test',
                        size: GameSize.smallSize,
                        gameMode: 'mode',
                        visibility: true,
                        map: [],
                        map2: [],
                        modificationDate: '111111',
                        screenshot: 'screenshotUrl',
                    };
                    const roomCode = 'room123';
                    (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

                    await gateway.handleCreateRoom(adminClient, game);

                    expect(gameRoomService.createRoom).toHaveBeenCalledWith(game, GameSize.smallSize);
                    expect(gameRoomService.createSelectPlayerRoom).toHaveBeenCalledWith(roomCode);
                    expect(gateway['rooms'].has(roomCode)).toBe(true);
                    expect(gateway['games'].has(roomCode)).toBe(true);
                    expect(adminClient.join).toHaveBeenCalledWith(roomCode);
                    expect(adminClient.emit).toHaveBeenCalledWith('roomCreated', roomCode);
                });

                it('should create a game with correct initial data structure', async () => {
                    const game: Game = {
                        id: 'gameId',
                        name: 'testGame',
                        description: 'test',
                        size: GameSize.smallSize,
                        gameMode: 'mode',
                        visibility: true,
                        map: [],
                        map2: [],
                        modificationDate: '111111',
                        screenshot: 'screenshotUrl',
                    };
                    const roomCode = 'room123';
                    (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

                    await gateway.handleCreateRoom(adminClient, game);

                    const createdGame = gateway.games.get(roomCode);
                    expect(createdGame).toEqual({
                        pin: roomCode,
                        players: [],
                        isLocked: false,
                        updateMap: [],
                        game,
                        size: 'Petite Taille',
                        playerPositions: {},
                        pourcentagePlayerScareModeved: {},
                        glocalStatistics: {
                            allTime: 0,
                            percentageOfTile: 0,
                            percentageOfDors: 0,
                            nbrPlayerOpenDoor: 0,
                            secondTime: 0,
                            allDoors: [],
                            nbOfTakenFleg: 0,
                        },
                    });
                });

                it('should process doors in the map and add them to game statistics', async () => {
                    const game: Game = {
                        id: 'gameId',
                        name: 'testGame',
                        description: 'test',
                        size: GameSize.smallSize,
                        gameMode: 'mode',
                        visibility: true,
                        map: [
                            {
                                position: { x: 1, y: 1 },
                                type: 'Porte',
                                traversable: false,
                                item: undefined,
                                player: undefined,
                                image: '',
                                cost: 0,
                            },
                            {
                                position: { x: 2, y: 2 },
                                type: 'Mur',
                                traversable: false,
                                item: undefined,
                                player: undefined,
                                image: '',
                                cost: 0,
                            },
                            {
                                position: { x: 3, y: 3 },
                                type: 'Porte',
                                traversable: false,
                                item: undefined,
                                player: undefined,
                                image: '',
                                cost: 0,
                            },
                        ],
                        map2: [],
                        modificationDate: '111111',
                        screenshot: 'screenshotUrl',
                    };
                    const roomCode = 'room123';
                    (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

                    await gateway.handleCreateRoom(adminClient, game);

                    const createdGame = gateway.games.get(roomCode);
                    expect(createdGame.glocalStatistics.allDoors).toEqual([
                        { coordinate: { x: 1, y: 1 }, isManipulated: false },
                        { coordinate: { x: 3, y: 3 }, isManipulated: false },
                    ]);
                });

                it('should return the roomCode from the method', async () => {
                    const game: Game = {
                        id: 'gameId',
                        name: 'testGame',
                        description: 'test',
                        size: GameSize.smallSize,
                        gameMode: 'mode',
                        visibility: true,
                        map: [],
                        map2: [],
                        modificationDate: '111111',
                        screenshot: 'screenshotUrl',
                    };
                    const roomCode = 'room123';
                    (gameRoomService.createRoom as jest.Mock).mockResolvedValue(roomCode);

                    const result = await gateway.handleCreateRoom(adminClient, game);

                    expect(result).toBe(roomCode);
                });
            });
        });
    });
});
