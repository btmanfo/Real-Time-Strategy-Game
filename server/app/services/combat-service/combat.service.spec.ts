/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { Game, GameData, Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { CombatService } from './combat.service';

describe('Service: Combat', () => {
    let service: CombatService;
    let gameLogGatewayMock: Partial<GameLogGateway>;
    let serverMock: jest.Mocked<Server>;
    beforeEach(async () => {
        gameLogGatewayMock = {
            handleSendGameLog: jest.fn(),
            handleJoinRoom: jest.fn(),
            handleGetGameLogs: jest.fn(),
            handleNewGame: jest.fn(),
            handleConnection: jest.fn(),
            handleDisconnect: jest.fn(),
        };
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {},
            socketsLeave: jest.fn(),
        } as any as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatService,
                { provide: GameLogGateway, useValue: gameLogGatewayMock },
                {
                    provide: 'SocketServer',
                    useValue: serverMock,
                },
            ],
        }).compile();

        service = module.get<CombatService>(CombatService);
        (service as any).gameLogGateway = gameLogGatewayMock;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    describe('startFight', () => {
        it('should emit startFight event when game exists', () => {
            const roomCode = 'room123';
            const players = [{ name: 'player1' }, { name: 'player2' }] as Player[];
            const games = new Map<string, GameData>();
            games.set(roomCode, { game: {} as Game, players: [] } as GameData);

            service.startFight(serverMock, roomCode, players, games);

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('startFight', players);
        });

        it('should not emit startFight event when game does not exist', () => {
            const roomCode = 'room123';
            const players = [{ name: 'player1' }, { name: 'player2' }] as Player[];
            const games = new Map<string, GameData>();

            service.startFight(serverMock, roomCode, players, games);

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(serverMock.emit).not.toHaveBeenCalled();
        });

        it('should call handleSendGameLog with the expected payload when game exists', () => {
            const roomCode = 'room123';
            const players = [{ name: 'player1' }, { name: 'player2' }] as Player[];
            const games = new Map<string, GameData>();
            const gameData: GameData = { game: {} as Game, players: [] } as GameData;
            games.set(roomCode, gameData);
            const handleSendGameLog = (service as any).gameLogGateway.handleSendGameLog;

            service.startFight(serverMock, roomCode, players, games);

            const expectedPayload = {
                type: 'combatStart',
                event: `Combat : ${players[0].name} vs ${players[1].name}`,
                players,
                room: roomCode,
            };

            expect(handleSendGameLog).toHaveBeenCalledWith(null, expectedPayload);
        });

        it('should handle null gameLogGateway gracefully', () => {
            const roomCode = 'room123';
            const players = [{ name: 'player1' }, { name: 'player2' }] as Player[];
            const games = new Map<string, GameData>();
            games.set(roomCode, { game: {} as Game, players: [] } as GameData);

            (service as any).gameLogGateway = null;

            expect(() => {
                service.startFight(serverMock, roomCode, players, games);
            }).not.toThrow();
        });
    });

    describe('combatUpdate', () => {
        it('should emit combatUpdate event', () => {
            const roomCode = 'room123';
            const attacker = { name: 'attacker' } as Player;
            const defender = { name: 'defender' } as Player;

            service.combatUpdate(serverMock, roomCode, attacker, defender);

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('combatUpdate', { attacker, defender });
        });
    });

    describe('combatEscaped', () => {
        it('should emit combatEscaped event', () => {
            const roomCode = 'room123';
            const escapee = 'player1';

            service.combatEscaped(serverMock, roomCode, escapee);

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('combatEscaped', { escapee });
        });
    });

    describe('combatEnded', () => {
        it('should emit combatEnded event', () => {
            const roomCode = 'room123';
            const winner = 'player1';
            const loser = 'player2';

            service.combatEnded(serverMock, roomCode, winner, loser);

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('combatEnded', { winner, loser });
        });
    });

    describe('combatRolls', () => {
        it('should emit combatRolls event', () => {
            const roomCode = 'room123';
            const attackerBonus = 5;
            const defenderBonus = 3;

            service.combatRolls(serverMock, roomCode, attackerBonus, defenderBonus);

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('combatRolls', { attackerBonus, defenderBonus });
        });
    });
});
