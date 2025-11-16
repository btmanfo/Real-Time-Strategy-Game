/* eslint-disable max-lines */
// La grande quantité de branches requiert beacoup de tests
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { GlobalStatistics, Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
    let service: StatisticsService;
    let gameRoomServiceMock: Partial<GameRoomService>;

    beforeEach(async () => {
        gameRoomServiceMock = {
            games: new Map(),
            getPlayer: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [StatisticsService, { provide: GameRoomService, useValue: gameRoomServiceMock }],
        }).compile();

        service = module.get<StatisticsService>(StatisticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllGlobalInfo', () => {
        it('should return global statistics for a valid room', () => {
            const roomCode = 'room1';
            const globalStats: GlobalStatistics = { allTime: 0, secondTime: 0 } as any;
            gameRoomServiceMock.games.set(roomCode, { glocalStatistics: globalStats } as any);

            const result = service.getAllGlobalInfo(roomCode);
            expect(result).toEqual(globalStats);
        });
    });

    describe('updatePlayerVictories', () => {
        it('should update the number of victories for a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { nbVictory: 0 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updatePlayerVictories(playerName, roomCode, 5);
            expect(player.stats.nbVictory).toBe(5);
        });
    });

    describe('updatePlayerLose', () => {
        it('should update the number of defeats for a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { nbDefeat: 0 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updatePlayerLose(playerName, roomCode, 3);
            expect(player.stats.nbDefeat).toBe(3);
        });
    });

    describe('updatePlayerPourcentageTile', () => {
        it('should update the percentage of tiles for a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { pourcentageOfTile: 0 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updatePlayerPourcentageTile(playerName, roomCode, 42.7);
            expect(player.stats.pourcentageOfTile).toBe(43);
        });
    });

    describe('updatePlayerDamages', () => {
        it('should add damages to a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { nbDamage: 10 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updatePlayerDamages(playerName, roomCode, 15);
            expect(player.stats.nbDamage).toBe(25);
        });
    });

    describe('updateLifeLost', () => {
        it('should add life lost to a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { nbLifeLost: 5 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updateLifeLost(playerName, roomCode, 10);
            expect(player.stats.nbLifeLost).toBe(15);
        });
    });

    describe('updateCombatCount', () => {
        it('should increment combat count for both players', () => {
            const playerName = 'player1';
            const secondPlayerName = 'player2';
            const roomCode = 'room1';
            const player: Player = { stats: { nbCombat: 0 } } as any;
            const secondPlayer: Player = { stats: { nbCombat: 0 }, isVirtualPlayer: true } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockImplementation((room, name) => (name === playerName ? player : secondPlayer));

            service.updateCombatCount(playerName, roomCode, secondPlayerName);
            expect(player.stats.nbCombat).toBe(1);
            expect(secondPlayer.stats.nbCombat).toBe(1);
        });
    });

    describe('updateDodgeCount', () => {
        it('should increment dodge count for a player', () => {
            const playerName = 'player1';
            const roomCode = 'room1';
            const player: Player = { stats: { nbEvasion: 0 } } as any;
            (gameRoomServiceMock.getPlayer as jest.Mock).mockReturnValue(player);

            service.updateDodgeCount(playerName, roomCode);
            expect(player.stats.nbEvasion).toBe(1);
        });
    });
});
