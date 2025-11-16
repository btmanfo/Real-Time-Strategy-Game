/* eslint-disable @typescript-eslint/no-explicit-any */
// Les any sont autorisés ici car il s'agit de tests unitaires
import { GameLogHistoryService } from '@app/services/game-log-history-service/game-log-history.service';
import { Player } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameLogGateway } from './game-log.gateway';

jest.mock('@app/services/game-log-history-service/game-log-history.service');

describe('GameLogGateway', () => {
    let gateway: GameLogGateway;
    let mockSocket: Partial<Socket>;
    let gameLogHistoryService: jest.Mocked<GameLogHistoryService>;
    let serverEmitMock: jest.Mock;

    beforeEach(async () => {
        serverEmitMock = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameLogGateway, GameLogHistoryService],
        }).compile();

        gateway = module.get<GameLogGateway>(GameLogGateway);
        gameLogHistoryService = module.get(GameLogHistoryService);
        (gateway as any).server = {
            to: jest.fn().mockReturnValue({ emit: serverEmitMock }),
        } as any as Server;

        mockSocket = {
            id: 'socket-1',
            join: jest.fn(),
            emit: jest.fn(),
        };
    });

    it('should log on initialization', () => {
        const loggerSpy = jest.spyOn(Logger.prototype, 'log');
        new GameLogGateway(gameLogHistoryService);
        expect(loggerSpy).not.toHaveBeenCalledWith('GameLogGateway initialisé');
    });

    it('should handle joinRoom correctly', () => {
        gateway.handleJoinRoom(mockSocket as Socket, { roomCode: 'ABC', playerName: 'Alice' });
        expect(mockSocket.join).toHaveBeenCalledWith('game-room-ABC');
        expect(mockSocket.join).toHaveBeenCalledWith('player-Alice');
    });

    it('should emit gameLogsHistory when handleGetGameLogs is called', () => {
        const fakeLogs = [{ type: 'info', event: 'start', timestamp: new Date() }];
        gameLogHistoryService.getLogs.mockReturnValue(fakeLogs);

        gateway.handleGetGameLogs(mockSocket as Socket, { roomCode: 'XYZ' });

        expect(gameLogHistoryService.getLogs).toHaveBeenCalledWith('XYZ');
        expect(mockSocket.emit).toHaveBeenCalledWith('gameLogsHistory', fakeLogs);
    });

    it('should emit log to specific players on combat log', () => {
        const player: Player = { name: 'Bob' } as Player;
        const payload = {
            type: 'combat',
            event: 'attack',
            players: [player],
            room: 'ABC',
        };

        gateway.handleSendGameLog(mockSocket as Socket, payload);

        expect((gateway as any).server.to).toHaveBeenCalledWith('player-Bob');
        expect(serverEmitMock).toHaveBeenCalledWith(
            'gameLogUpdate',
            expect.objectContaining({
                type: 'combat',
                event: 'attack',
                players: [player],
            }),
        );
    });

    it('should store and broadcast non-combat logs', () => {
        const payload = {
            type: 'info',
            event: 'player joined',
            room: 'DEF',
        };

        gateway.handleSendGameLog(mockSocket as Socket, payload);

        expect(gameLogHistoryService.addLog).toHaveBeenCalled();
        expect((gateway as any).server.to).toHaveBeenCalledWith('game-room-DEF');
        expect(serverEmitMock).toHaveBeenCalled();
    });

    it('should clear logs and notify clients on newGame', () => {
        const data = { roomCode: 'ROOM1', playerName: 'Charlie' };

        gateway.handleNewGame(mockSocket as Socket, data);

        expect(gameLogHistoryService.clearLogs).toHaveBeenCalledWith('ROOM1');
        expect((gateway as any).server.to).toHaveBeenCalledWith('game-room-ROOM1');
        expect(serverEmitMock).toHaveBeenCalledWith('gameLogsHistory', []);
    });

    it('should do nothing if data or roomCode is missing in getGameLogs', () => {
        gateway.handleGetGameLogs(mockSocket as Socket, null as any);
        gateway.handleGetGameLogs(mockSocket as Socket, {} as any);

        expect(gameLogHistoryService.getLogs).not.toHaveBeenCalled();
        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    describe('GameLogGateway Additional Tests', () => {
        let loggerSpy: jest.SpyInstance;

        beforeEach(async () => {
            serverEmitMock = jest.fn();

            const module: TestingModule = await Test.createTestingModule({
                providers: [GameLogGateway, GameLogHistoryService],
            }).compile();

            gateway = module.get<GameLogGateway>(GameLogGateway);
            gameLogHistoryService = module.get(GameLogHistoryService);
            (gateway as any).server = {
                to: jest.fn().mockReturnValue({ emit: serverEmitMock }),
            } as any as Server;

            mockSocket = {
                id: 'socket-1',
                join: jest.fn(),
                emit: jest.fn(),
            };

            loggerSpy = jest.spyOn((gateway as any).logger, 'log');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('Connection Handlers', () => {
            it('should log when a client connects', () => {
                gateway.handleConnection(mockSocket as Socket);
                expect(loggerSpy).toHaveBeenCalledWith('Client connecté: socket-1');
            });

            it('should log when a client disconnects', () => {
                gateway.handleDisconnect(mockSocket as Socket);
                expect(loggerSpy).toHaveBeenCalledWith('Client déconnecté: socket-1');
            });
        });

        describe('Private Helpers', () => {
            it('should generate correct game room ID', () => {
                const roomId = (gateway as any).getGameRoomId('TEST123');
                expect(roomId).toBe('game-room-TEST123');
            });

            it('should generate correct player room ID', () => {
                const playerId = (gateway as any).getPlayerRoomId('PlayerOne');
                expect(playerId).toBe('player-PlayerOne');
            });

            it('should validate room data correctly', () => {
                expect((gateway as any).isValidRoomData({ roomCode: 'ABC' })).toBe(true);
                expect((gateway as any).isValidRoomData({})).toBe(false);
                expect((gateway as any).isValidRoomData(null)).toBe(false);
                expect((gateway as any).isValidRoomData(undefined)).toBe(false);
                expect((gateway as any).isValidRoomData({ roomCode: '' })).toBe(false);
            });

            it('should identify combat logs correctly', () => {
                expect((gateway as any).isCombatLog({ type: 'combat' })).toBe(true);
                expect((gateway as any).isCombatLog({ type: 'info' })).toBe(false);
                expect((gateway as any).isCombatLog({ type: 'error' })).toBe(false);
            });

            it('should check for players correctly', () => {
                expect((gateway as any).hasPlayers({ players: [{ name: 'Alice' }] })).toBe(true);
                expect((gateway as any).hasPlayers({ players: [] })).toBe(false);
                expect((gateway as any).hasPlayers({})).toBe(false);
                expect((gateway as any).hasPlayers({ players: null })).toBe(false);
            });

            it('should send combat logs to specific players', () => {
                const logEntry = {
                    type: 'combat',
                    event: 'attack',
                    players: [{ name: 'Alice' }, { name: 'Bob' }],
                    timestamp: new Date(),
                };

                (gateway as any).sendCombatLogToPlayers(logEntry, logEntry.players);

                expect((gateway as any).server.to).toHaveBeenCalledWith('player-Alice');
                expect((gateway as any).server.to).toHaveBeenCalledWith('player-Bob');
                expect(serverEmitMock).toHaveBeenCalledTimes(2);
                expect(serverEmitMock).toHaveBeenCalledWith('gameLogUpdate', logEntry);
            });

            it('should handle players without names in combat logs', () => {
                const logEntry = {
                    type: 'combat',
                    event: 'attack',
                    players: [{ name: 'Alice' }, { name: null }, { name: '' }],
                    timestamp: new Date(),
                };

                (gateway as any).sendCombatLogToPlayers(logEntry, logEntry.players);

                expect((gateway as any).server.to).toHaveBeenCalledTimes(1);
                expect((gateway as any).server.to).toHaveBeenCalledWith('player-Alice');
            });

            it('should send game logs to room and store them', () => {
                const logEntry = {
                    type: 'info',
                    event: 'gameStart',
                    timestamp: new Date(),
                };

                (gateway as any).sendLogToGameRoom(logEntry, 'TEST123');

                expect(gameLogHistoryService.addLog).toHaveBeenCalledWith('TEST123', logEntry);
                expect((gateway as any).server.to).toHaveBeenCalledWith('game-room-TEST123');
                expect(serverEmitMock).toHaveBeenCalledWith('gameLogUpdate', logEntry);
            });
        });

        describe('Comprehensive Public Method Tests', () => {
            it('should log when joining a room', () => {
                gateway.handleJoinRoom(mockSocket as Socket, { roomCode: 'ABC', playerName: 'Alice' });
                expect(loggerSpy).toHaveBeenCalledWith('Socket socket-1 a rejoint la room game-room-ABC (joueur: Alice)');
            });

            it('should not process getGameLogs with invalid data', () => {
                gateway.handleGetGameLogs(mockSocket as Socket, undefined as any);
                gateway.handleGetGameLogs(mockSocket as Socket, null as any);

                expect(gameLogHistoryService.getLogs).not.toHaveBeenCalled();
                expect(mockSocket.emit).not.toHaveBeenCalled();
            });

            it('should not process newGame with invalid data', () => {
                gateway.handleNewGame(mockSocket as Socket, null as any);

                expect(gameLogHistoryService.clearLogs).not.toHaveBeenCalled();
                expect(serverEmitMock).not.toHaveBeenCalled();
            });

            it('should handle sendGameLog without room specified', () => {
                const payload = {
                    type: 'info',
                    event: 'message',
                    players: [],
                };

                gateway.handleSendGameLog(mockSocket as Socket, payload);

                expect(gameLogHistoryService.addLog).not.toHaveBeenCalled();
                expect((gateway as any).server.to).not.toHaveBeenCalled();
            });

            it('should handle sendGameLog with combat type but no players', () => {
                const payload = {
                    type: 'combat',
                    event: 'attack',
                    room: 'XYZ',
                };

                gateway.handleSendGameLog(mockSocket as Socket, payload);

                expect(gameLogHistoryService.addLog).toHaveBeenCalled();
                expect((gateway as any).server.to).toHaveBeenCalledWith('game-room-XYZ');
            });

            it('should log when a new game is created', () => {
                gateway.handleNewGame(mockSocket as Socket, { roomCode: 'GAME001', playerName: 'Moderator' });

                expect(loggerSpy).toHaveBeenCalledWith('Nouvelle partie démarrée par Moderator dans la room GAME001');
            });
        });
    });
});
