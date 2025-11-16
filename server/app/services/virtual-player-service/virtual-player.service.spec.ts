/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { VIRTUAL_PLAYER_STAT } from '@app/constants/constants';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { PlayerService } from '@app/services/player-service/player.service';
import { SocketWaitRoomLabels, VIRTUAL_PLAYER_NAME, allUrlAvatar } from '@common/constants';
import { GameData, Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerService } from './virtual-player.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let gameRoomService: Partial<GameRoomService>;
    let playerService: Partial<PlayerService>;
    let dummyGame: GameData;

    beforeEach(async () => {
        dummyGame = {
            pin: 'ROOM1',
            game: { id: 'game1', name: 'Test Game', size: 'Moyenne Taille' },
            players: [
                {
                    name: 'Sam',
                    isVirtualPlayer: false,
                    life: 100,
                    speed: 10,
                    attack: '5',
                    defense: '3',
                    coordinate: { x: 0, y: 0 },
                    spawnPoint: { x: 0, y: 0 },
                    isAdmin: true,
                    victories: 0,
                    stats: {
                        nbVictory: 0,
                        nbDefeat: 0,
                        nbDamage: 0,
                        nbLifeLost: 0,
                        nbCombat: 0,
                        nbEvasion: 0,
                        name: 'Sam',
                        nbItem: 0,
                        pourcentageOfTile: 0,
                        nbDoors: 0,
                    },
                    avatarUrl: allUrlAvatar[0],
                },
            ],
            isLocked: false,
            glocalStatistics: { allTime: 0, percentageOfTile: 0, percentageOfDors: 0, nbrPlayerOpenDoor: 0, secondTime: 0 },
        } as unknown as GameData;

        gameRoomService = {
            getGame: jest.fn().mockResolvedValue(dummyGame),
            isRoomFull: jest.fn().mockReturnValue(false),
        };

        playerService = {
            getUniquePlayerName: jest.fn((game: GameData, baseName: string) => {
                let uniqueName = baseName;
                let counter = 2;
                while (game.players.some((p) => p.name === uniqueName)) {
                    uniqueName = `${baseName}-${counter}`;
                    counter++;
                }
                return uniqueName;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                { provide: GameRoomService, useValue: gameRoomService },
                { provide: PlayerService, useValue: playerService },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
    });

    describe('addAttackerVirtualPlayer', () => {
        it('should add a virtual player with aggressive mode (attacker)', async () => {
            const result = await service.addAttackerVirtualPlayer('ROOM1');
            expect(result).toHaveProperty('isVirtualPlayer', true);
            expect((result as Player).agressive).toBe(true);
        });
    });

    describe('addDefensiveVirtualPlayer', () => {
        it('should add a virtual player with defensive mode', async () => {
            const result = await service.addDefensiveVirtualPlayer('ROOM1');
            expect(result).toHaveProperty('isVirtualPlayer', true);
            expect((result as Player).agressive).toBe(false);
        });
    });

    describe('addVirtualPlayer', () => {
        it('should return an error if game is not found', async () => {
            (gameRoomService.getGame as jest.Mock).mockResolvedValueOnce(null);
            const result = await service.addVirtualPlayer('invalid-room', false);
            expect(result).toEqual({ error: SocketWaitRoomLabels.RoomNotFound });
        });

        it('should return an error if the room is full', async () => {
            (gameRoomService.isRoomFull as jest.Mock).mockReturnValueOnce(true);
            const result = await service.addVirtualPlayer('ROOM1', false);
            expect(result).toEqual({ error: SocketWaitRoomLabels.IsRoomFull });
        });
    });

    describe('removeVirtualPlayer', () => {
        it('should return an error if game is not found', async () => {
            (gameRoomService.getGame as jest.Mock).mockResolvedValueOnce(null);
            const result = await service.removeVirtualPlayer('invalid-room', 'Bot-1');
            expect(result).toEqual({ error: SocketWaitRoomLabels.RoomNotFound });
        });

        it('should return an error if the virtual player is not found', async () => {
            const result = await service.removeVirtualPlayer('ROOM1', 'NonExistingBot');
            expect(result).toEqual({ error: SocketWaitRoomLabels.VirtualPlayerNotFound });
        });

        it('should remove the virtual player if found', async () => {
            const virtualPlayer: Player = {
                name: 'Bot-1',
                isVirtualPlayer: true,
                life: 50,
                speed: 5,
                attack: '4 Faces',
                defense: '4 Faces',
                coordinate: { x: 0, y: 0 },
                spawnPoint: { x: 0, y: 0 },
                isAdmin: false,
                victories: 0,
                agressive: false,
                stats: {
                    nbVictory: 0,
                    nbDefeat: 0,
                    nbDamage: 0,
                    nbLifeLost: 0,
                    nbCombat: 0,
                    nbEvasion: 0,
                    name: 'Bot-1',
                    nbItem: 0,
                    pourcentageOfTile: 0,
                    nbDoors: 0,
                },
                avatarUrl: allUrlAvatar[1],
            };
            dummyGame.players.push(virtualPlayer);
            const result = await service.removeVirtualPlayer('ROOM1', 'Bot-1');
            expect(result).toEqual({ success: true });
            expect(dummyGame.players.find((p) => p.name === 'Bot-1')).toBeUndefined();
        });
    });

    describe('getVirtualPlayers', () => {
        it('should return an empty array if game is not found', async () => {
            (gameRoomService.getGame as jest.Mock).mockResolvedValueOnce(null);
            const result = await service.getVirtualPlayers('invalid-room');
            expect(result).toEqual([]);
        });

        it('should return only virtual players from the game', async () => {
            dummyGame.players = [
                {
                    name: 'Sam',
                    isVirtualPlayer: false,
                    life: 100,
                    speed: 10,
                    attack: '5',
                    defense: '3',
                    coordinate: { x: 0, y: 0 },
                    spawnPoint: { x: 0, y: 0 },
                    isAdmin: true,
                    victories: 0,
                    stats: {
                        nbVictory: 0,
                        nbDefeat: 0,
                        nbDamage: 0,
                        nbLifeLost: 0,
                        nbCombat: 0,
                        nbEvasion: 0,
                        name: 'Sam',
                        nbItem: 0,
                        pourcentageOfTile: 0,
                        nbDoors: 0,
                    },
                    avatarUrl: allUrlAvatar[0],
                },
                {
                    name: 'Bot-1',
                    isVirtualPlayer: true,
                    life: 50,
                    speed: 5,
                    attack: '4 Faces',
                    defense: '4 Faces',
                    coordinate: { x: 0, y: 0 },
                    spawnPoint: { x: 0, y: 0 },
                    isAdmin: false,
                    victories: 0,
                    agressive: false,
                    stats: {
                        nbVictory: 0,
                        nbDefeat: 0,
                        nbDamage: 0,
                        nbLifeLost: 0,
                        nbCombat: 0,
                        nbEvasion: 0,
                        name: 'Bot-1',
                        nbItem: 0,
                        pourcentageOfTile: 0,
                        nbDoors: 0,
                    },
                    avatarUrl: allUrlAvatar[1],
                },
                {
                    name: 'Bot-2',
                    isVirtualPlayer: true,
                    life: 50,
                    speed: 5,
                    attack: '6 Faces',
                    defense: '6 Faces',
                    coordinate: { x: 0, y: 0 },
                    spawnPoint: { x: 0, y: 0 },
                    isAdmin: false,
                    victories: 0,
                    agressive: true,
                    stats: {
                        nbVictory: 0,
                        nbDefeat: 0,
                        nbDamage: 0,
                        nbLifeLost: 0,
                        nbCombat: 0,
                        nbEvasion: 0,
                        name: 'Bot-2',
                        nbItem: 0,
                        pourcentageOfTile: 0,
                        nbDoors: 0,
                    },
                    avatarUrl: allUrlAvatar[2],
                },
            ];
            const result = await service.getVirtualPlayers('ROOM1');
            expect(result.length).toBe(2);
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Bot-1', isVirtualPlayer: true }),
                    expect.objectContaining({ name: 'Bot-2', isVirtualPlayer: true }),
                ]),
            );
        });
    });

    describe('private helper methods', () => {
        it('getRandomVirtualPlayerName should return one of the virtual player names', () => {
            const name = (service as any).getRandomVirtualPlayerName();
            expect(VIRTUAL_PLAYER_NAME).toContain(name);
        });

        it('createVirtualPlayer should create a player with correct properties', () => {
            const name = 'TestBot';
            const avatarUrl = allUrlAvatar[1];
            const isAggressive = true;
            const player: Player = (service as any).createVirtualPlayer(name, avatarUrl, isAggressive);
            expect(player).toMatchObject({
                name,
                isVirtualPlayer: true,
                agressive: isAggressive,
                avatarUrl,
            });
            expect([VIRTUAL_PLAYER_STAT.default, VIRTUAL_PLAYER_STAT.max]).toContain(player.life);
            expect([VIRTUAL_PLAYER_STAT.default, VIRTUAL_PLAYER_STAT.max]).toContain(player.speed);
            expect(['4 Faces', '6 Faces']).toContain(player.attack);
            expect(['4 Faces', '6 Faces']).toContain(player.defense);
        });

        it('should set life and speed to default or max values based on random values', () => {
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValueOnce(0.2).mockReturnValueOnce(0.2).mockReturnValueOnce(0.8).mockReturnValueOnce(0.8);

            try {
                let player = (service as any).createVirtualPlayer('TestBot1', 'avatar.png', true);
                expect(player.life).toBe(VIRTUAL_PLAYER_STAT.default);
                expect(player.speed).toBe(VIRTUAL_PLAYER_STAT.max);

                player = (service as any).createVirtualPlayer('TestBot2', 'avatar2.png', false);
                expect(player.life).toBe(VIRTUAL_PLAYER_STAT.max);
                expect(player.speed).toBe(VIRTUAL_PLAYER_STAT.max);
            } finally {
                Math.random = originalRandom;
            }
        });
    });
});
