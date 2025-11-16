/* eslint-disable max-lines */
// La grande quantité de branches requiert beacoup de tests
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { PlayerService } from '@app/services/player-service/player.service';
import { Game, GameData, Player } from '@common/interfaces';
import * as uuid from 'uuid';

jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

describe('GameRoomService', () => {
    let gameRoomService: GameRoomService;
    let playerService: PlayerService;
    let mockGame: Game;
    let standardRoomCode: string;
    let mockPlayer: Player;

    beforeEach(async () => {
        playerService = {
            getUniquePlayerName: jest.fn((game: GameData, name: string) => `${name}_unique`),
        } as unknown as PlayerService;

        mockPlayer = {
            name: 'TestPlayer',
            stats: {
                nbVictory: 0,
                nbDefeat: 0,
                nbDamage: 0,
                nbLifeLost: 0,
                nbCombat: 0,
                nbEvasion: 0,
                pourcentageOfTile: 0,
            },
            isAdmin: true,
        } as Player;

        gameRoomService = new GameRoomService(playerService);
        mockGame = { id: 'game1' } as Game;
        standardRoomCode = await gameRoomService.createRoom(mockGame, 'Moyenne Taille');

        await gameRoomService.joinRoom(standardRoomCode, mockPlayer);
    });

    describe('getPlayer', () => {
        it('should return undefined if game does not exist', () => {
            const result = (gameRoomService as any).getPlayer('nonexistentRoom', 'TestPlayer');
            expect(result).toBeUndefined();
        });

        it('should return player if found in room', () => {
            const result = (gameRoomService as any).getPlayer(standardRoomCode, 'TestPlayer');
            expect(result).toBeDefined();
            expect(result.name).toBe('TestPlayer_unique');
        });

        it('should return player when searching by unique name', () => {
            const result = (gameRoomService as any).getPlayer(standardRoomCode, 'TestPlayer_unique');
            expect(result).toBeDefined();
            expect(result.name).toBe('TestPlayer_unique');
        });
    });

    describe('createRoom', () => {
        it('should create a room with valid size', async () => {
            const newRoomCode = await gameRoomService.createRoom({ id: 'newGame' } as Game, 'Moyenne Taille');
            const gameData = await gameRoomService.getGame(newRoomCode);
            expect(gameData).toBeDefined();
            expect(gameData.game.size).toBe('Moyenne Taille');
            expect(gameData.players).toEqual([]);
        });

        it('should throw an error for invalid room size', async () => {
            const invalidGame: Game = { id: 'game2' } as Game;
            await expect(gameRoomService.createRoom(invalidGame, 'Invalid')).rejects.toThrow('Taille de salle invalide : "Invalid"');
        });
    });

    describe('joinRoom', () => {
        it('should return null if room is not found', async () => {
            const result = await gameRoomService.joinRoom('NONEXISTENT', { name: 'Alice' } as Player);
            expect(result).toBeNull();
        });

        it('should allow a player to join a room if not full', async () => {
            const player: Player = { name: 'Alice' } as Player;
            const result = await gameRoomService.joinRoom(standardRoomCode, player);

            expect(result).toHaveProperty('newPlayer', 'Alice_unique');
            expect(result).toHaveProperty('newGame');

            if ('newPlayer' in result) {
                expect(result.newPlayer).toBe('Alice_unique');
            }

            if ('newGame' in result) {
                expect(result.newGame.players[0].isAdmin).toBe(true);
            }
        });

        it('should return an error object if the room is full', async () => {
            for (let i = 1; i <= 4; i++) {
                await gameRoomService.joinRoom(standardRoomCode, { name: `Player${i}` } as Player);
            }

            const result = await gameRoomService.joinRoom(standardRoomCode, { name: 'Player5' } as Player);
            expect(result).toEqual({ error: 'roomFull', currentPlayers: 4, capacity: 4 });
        });

        it('should throw an error if the room has an invalid size', async () => {
            const invalidGame: Game = { id: 'gameInvalid' } as Game;
            const fakeRoomCode = 'FAKE';
            const invalidGameData: GameData = {
                pin: fakeRoomCode,
                players: [],
                isLocked: false,
                size: 'Petite Taille',
                game: { ...invalidGame },
                pourcentagePlayerScareModeved: {},
                playerPositions: {},
            };

            (gameRoomService as any).games.set(fakeRoomCode, invalidGameData);
            await expect(gameRoomService.joinRoom(fakeRoomCode, { name: 'Bob' } as Player)).rejects.toThrow('Taille de salle invalide : "undefined');
        });
    });

    describe('leaveRoom', () => {
        it('should return a reason if room is not found', async () => {
            const result = await gameRoomService.leaveRoom('NONEXISTENT', { name: 'Alice' } as Player);
            expect(result).toEqual({ reason: 'roomNotFound' });
        });

        it('should return a reason if player is not found', async () => {
            const result = await gameRoomService.leaveRoom(standardRoomCode, { name: 'NonExistent' } as Player);
            expect(result).toEqual({ reason: 'playerNotFound' });
        });

        it('should destroy the room if the admin leaves', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];

            const adminPlayer = { name: 'Admin', isAdmin: true } as Player;
            const joinResult = await gameRoomService.joinRoom(standardRoomCode, adminPlayer);

            if ('newPlayer' in joinResult) {
                const result = await gameRoomService.leaveRoom(standardRoomCode, { name: joinResult.newPlayer } as Player);
                expect(result).toHaveProperty('destroyed', true);
                expect(result).toHaveProperty('isAdmin', true);
            }
        });

        it('should remove the player if a non-admin leaves', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];

            const bobJoinResult = await gameRoomService.joinRoom(standardRoomCode, { name: 'Bob' } as Player);

            let bobUnique: string | undefined;
            if ('newPlayer' in bobJoinResult) {
                bobUnique = bobJoinResult.newPlayer;
                const result = await gameRoomService.leaveRoom(standardRoomCode, { name: bobUnique } as Player);
                expect(result).toHaveProperty('destroyed', true);
                expect(result.game.players.length).toBe(1);
                expect(result.game.players[0].name).toBe('Bob_unique');
            }
        });
    });

    describe('leaveRoom - non-admin player', () => {
        it('should remove the player and keep the room intact', async () => {
            const roomCode = 'testRoom123';
            const adminPlayer = { name: 'Admin', isAdmin: true } as Player;
            const regularPlayer = { name: 'Regular', isAdmin: false } as Player;

            const gameData = {
                pin: roomCode,
                players: [adminPlayer, regularPlayer],
                isLocked: false,
                game: { id: 'testGame', size: 'Grande Taille' } as Game,
            } as GameData;

            gameRoomService.games.set(roomCode, gameData);
            (gameRoomService as any).rooms.add(roomCode);

            const result = await gameRoomService.leaveRoom(roomCode, regularPlayer);

            expect(result.destroyed).toBe(false);
            expect(result.isAdmin).toBe(false);
            expect(result.game.players.length).toBe(1);
            expect(result.game.players[0]).toBe(adminPlayer);

            const gameAfterLeave = gameRoomService.games.get(roomCode);
            expect(gameAfterLeave).toBeDefined();
            expect(gameAfterLeave.players.length).toBe(1);
            expect(gameAfterLeave.players[0]).toBe(adminPlayer);
        });
    });

    describe('getAllInformationPlayer', () => {
        beforeEach(async () => {
            await gameRoomService.joinRoom(standardRoomCode, { name: 'Alice' } as Player);
        });

        it('should return an error if the room is not found', () => {
            const info = gameRoomService.getAllInformationPlayer('Alice', 'NONEXISTENT');
            expect(info).toEqual({ error: 'roomNotFound' });
        });

        it('should return player information when room and player exist', () => {
            const info: any = gameRoomService.getAllInformationPlayer('Alice', standardRoomCode);

            expect(info).toBeDefined();
            expect(info).toHaveProperty('game');
            expect(info).toHaveProperty('player');
            expect(info.player).toHaveProperty('name', 'Alice_unique');
            expect(info).toHaveProperty('playerIndex');
            expect(info).toHaveProperty('roomCode', standardRoomCode);
            expect(info).toHaveProperty('allPlayer');
            expect(info.allPlayer.length).toBeGreaterThan(0);
        });

        it('should handle when player is not found in the room', () => {
            const info = gameRoomService.getAllInformationPlayer('NonExistent', standardRoomCode);

            expect(info).toHaveProperty('player', undefined);
            expect(info).toHaveProperty('playerIndex', -1);
        });

        it('should correctly handle player at index 0', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];

            await gameRoomService.joinRoom(standardRoomCode, { name: 'FirstPlayer' } as Player);

            const info = gameRoomService.getAllInformationPlayer('FirstPlayer_unique', standardRoomCode);

            expect(info).toBeDefined();
            expect(info).toHaveProperty('playerIndex', 0);
        });

        it('should provide correct info for admin player', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];
            await gameRoomService.joinRoom(standardRoomCode, { name: 'Admin' } as Player);

            const info: any = gameRoomService.getAllInformationPlayer('Admin_unique', standardRoomCode);

            expect(info).toBeDefined();
            expect(info.player.isAdmin).toBe(true);
        });
    });

    describe('getActivePlayers', () => {
        it('should return an empty array if room does not exist', () => {
            const players = gameRoomService.getActivePlayers('NONEXISTENT');
            expect(players).toEqual([]);
        });

        it('should return players if room exists', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];

            await gameRoomService.joinRoom(standardRoomCode, { name: 'Alice' } as Player);
            const players = gameRoomService.getActivePlayers(standardRoomCode);
            expect(players.length).toBe(1);
            expect(players[0].name).toContain('Alice_unique');
        });
    });

    describe('room status methods', () => {
        it('should toggle room lock status', async () => {
            let updatedGame = gameRoomService.toggleRoomLock(standardRoomCode, true);
            expect(updatedGame.isLocked).toBe(true);

            updatedGame = gameRoomService.toggleRoomLock(standardRoomCode, false);
            expect(updatedGame.isLocked).toBe(false);
        });

        it('should return null when toggling non-existent room', () => {
            const updatedGame = gameRoomService.toggleRoomLock('NONEXISTENT', true);
            expect(updatedGame).toBeNull();
        });

        it('should check if room exists', () => {
            expect(gameRoomService.isRoomExist(standardRoomCode)).toBe(true);
            expect(gameRoomService.isRoomExist('NONEXISTENT')).toBe(false);
        });

        it('should check if room is locked', () => {
            expect(gameRoomService.isRoomLocked(standardRoomCode)).toBe(false);

            gameRoomService.toggleRoomLock(standardRoomCode, true);
            expect(gameRoomService.isRoomLocked(standardRoomCode)).toBe(true);
        });

        it('should check if room is full', async () => {
            expect(gameRoomService.isRoomFull(standardRoomCode)).toBe(false);

            for (let i = 1; i <= 4; i++) {
                await gameRoomService.joinRoom(standardRoomCode, { name: `Player${i}` } as Player);
            }

            expect(gameRoomService.isRoomFull(standardRoomCode)).toBe(true);
        });
    });

    describe('isFirstPlayer', () => {
        it('should return false if room does not exist', async () => {
            const result = await gameRoomService.isFirstPlayer('NONEXISTENT', { name: 'Alice' } as Player);
            expect(result).toBe(false);
        });

        it('should identify admin vs non-admin players', async () => {
            const gameData = gameRoomService['games'].get(standardRoomCode);
            gameData.players = [];

            const adminPlayer = { name: 'Admin', isAdmin: true } as Player;
            await gameRoomService.joinRoom(standardRoomCode, adminPlayer);

            const regularPlayer = { name: 'Bob', isAdmin: false } as Player;
            await gameRoomService.joinRoom(standardRoomCode, regularPlayer);

            const adminResult = await gameRoomService.isFirstPlayer(standardRoomCode, { name: 'Admin_unique' } as Player);
            expect(adminResult).toBe(true);

            const regularResult = await gameRoomService.isFirstPlayer(standardRoomCode, { name: 'Bob_unique' } as Player);
            expect(regularResult).toBe(false);
        });
    });

    describe('character selection methods', () => {
        beforeEach(async () => {
            await gameRoomService.joinRoom(standardRoomCode, { name: 'Alice' } as Player);
        });

        it('should update avatarUrl on selection', () => {
            const updatedGame = gameRoomService.selectCharacter(standardRoomCode, { name: 'Alice' } as Player, 'http://avatar.url');

            const player = updatedGame.players.find((p) => p.name.includes('Alice'));
            expect(player).toHaveProperty('avatarUrl', 'http://avatar.url');
        });

        it('should reset avatarUrl on deselection', () => {
            gameRoomService.selectCharacter(standardRoomCode, { name: 'Alice' } as Player, 'http://avatar.url');

            const updatedGame = gameRoomService.deselectCharacter(standardRoomCode, { name: 'Alice' } as Player);

            const player = updatedGame.players.find((p) => p.name.includes('Alice'));
            expect(player).toHaveProperty('avatarUrl', null);
        });

        it('should handle non-existent room for selection/deselection', () => {
            expect(gameRoomService.selectCharacter('NON_EXISTENT', { name: 'Alice' } as Player, 'avatar.url')).toBeNull();
            expect(gameRoomService.deselectCharacter('NON_EXISTENT', { name: 'Alice' } as Player)).toBeNull();
        });
    });

    describe('validatePlayerAndGame', () => {
        it('should handle various validation scenarios', () => {
            expect((gameRoomService as any).validatePlayerAndGame(standardRoomCode, {} as Player)).toBeNull();
            expect((gameRoomService as any).validatePlayerAndGame('NONEXISTENT', { name: 'Alice' } as Player)).toBeNull();
            gameRoomService.toggleRoomLock(standardRoomCode, true);
            expect((gameRoomService as any).validatePlayerAndGame(standardRoomCode, { name: 'Alice' } as Player)).toBeNull();

            gameRoomService.toggleRoomLock(standardRoomCode, false);
            expect((gameRoomService as any).validatePlayerAndGame(standardRoomCode, { name: 'Alice' } as Player)).toBeDefined();
        });

        it('should handle player name mismatch', async () => {
            await gameRoomService.joinRoom(standardRoomCode, { name: 'ExistingPlayer' } as Player);

            const result = (gameRoomService as any).validatePlayerAndGame(standardRoomCode, {
                name: 'DifferentName',
            } as Player);

            expect(result).toBeDefined();
            const playerExists = result.players.some((p) => p.name === 'DifferentName');
            expect(playerExists).toBe(false);
        });
    });

    describe('createCombatRoomService', () => {
        it('should create a combat room with players', async () => {
            const firstPlayer: Player = {
                name: 'Player1',
                avatarUrl: 'avatar1',
                life: 6,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 1, y: 1 },
                isAdmin: true,
            } as Player;

            const secondPlayer: Player = {
                name: 'Player2',
                avatarUrl: 'avatar2',
                life: 6,
                speed: 3,
                attack: '6 Faces',
                defense: '4 Faces',
                coordinate: { x: 2, y: 2 },
                isAdmin: false,
            } as Player;

            const mockUuid = 'mock-uuid-value';
            (uuid.v4 as jest.Mock).mockReturnValue(mockUuid);

            const addSpy = jest.spyOn(gameRoomService['combatRoom'], 'add');
            const setSpy = jest.spyOn(gameRoomService['gamesCombatRoom'], 'set');
            const logSpy = jest.spyOn(console, 'log');

            const roomCode = await gameRoomService.createCombatRoomService(firstPlayer, secondPlayer);

            expect(roomCode).toBe(mockUuid);
            expect(addSpy).toHaveBeenCalledWith(mockUuid);
            expect(setSpy).toHaveBeenCalledWith(mockUuid, [firstPlayer, secondPlayer]);

            addSpy.mockRestore();
            setSpy.mockRestore();
            logSpy.mockRestore();
            jest.clearAllMocks();
        });

        it('should create unique rooms for different player pairs', async () => {
            const player1 = { name: 'Player1' } as Player;
            const player2 = { name: 'Player2' } as Player;
            const player3 = { name: 'Player3' } as Player;

            (uuid.v4 as jest.Mock).mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');

            const roomCode1 = await gameRoomService.createCombatRoomService(player1, player2);
            const roomCode2 = await gameRoomService.createCombatRoomService(player1, player3);

            expect(roomCode1).toBe('uuid-1');
            expect(roomCode2).toBe('uuid-2');
            expect(gameRoomService['gamesCombatRoom'].get('uuid-1')).toEqual([player1, player2]);
            expect(gameRoomService['gamesCombatRoom'].get('uuid-2')).toEqual([player1, player3]);

            jest.clearAllMocks();
        });
    });

    describe('createSelectPlayerRoom', () => {
        it('should handle selection room creation', async () => {
            const addSpy = jest.spyOn(gameRoomService['selectionPlayerRoom'], 'add');

            const roomCode = 'select-test-123';
            await gameRoomService.createSelectPlayerRoom(roomCode);

            expect(addSpy).toHaveBeenCalledWith(roomCode);
            expect(gameRoomService['selectionPlayerRoom'].has(roomCode)).toBe(true);

            const roomCode2 = 'select-test-456';
            await gameRoomService.createSelectPlayerRoom(roomCode2);

            expect(gameRoomService['selectionPlayerRoom'].has(roomCode)).toBe(true);
            expect(gameRoomService['selectionPlayerRoom'].has(roomCode2)).toBe(true);

            await gameRoomService.createSelectPlayerRoom(roomCode);
            expect(gameRoomService['selectionPlayerRoom'].has(roomCode)).toBe(true);

            addSpy.mockRestore();
        });
    });
    describe('GameRoomService Edge Cases', () => {
        beforeEach(async () => {
            playerService = {
                getUniquePlayerName: jest.fn((game: GameData, name: string) => `${name}_unique`),
            } as unknown as PlayerService;

            gameRoomService = new GameRoomService(playerService);
            mockGame = { id: 'game1' } as Game;
            standardRoomCode = await gameRoomService.createRoom(mockGame, 'Moyenne Taille');
        });

        describe('getGame', () => {
            it('should return null for non-existent room', async () => {
                const result = await gameRoomService.getGame('non-existent-room');
                expect(result).toBeNull();
            });

            it('should return valid GameData for existing room', async () => {
                const result = await gameRoomService.getGame(standardRoomCode);
                expect(result).not.toBeNull();
                expect(result.pin).toBe(standardRoomCode);
                expect(result.game.id).toBe('game1');
            });
        });

        describe('isRoomLocked', () => {
            it('should return false for non-existent room', () => {
                const result = gameRoomService.isRoomLocked('non-existent-room');
                expect(result).toBeFalsy();
            });
        });

        describe('isRoomFull', () => {
            it('should return false for non-existent room', () => {
                const result = gameRoomService.isRoomFull('non-existent-room');
                expect(result).toBeFalsy();
            });
        });

        describe('joinRoom additional tests', () => {
            it('should join room with null player information', async () => {
                const result = await gameRoomService.joinRoom(standardRoomCode, null);
                expect(result).toBeNull();
            });

            it('should join room with undefined player name', async () => {
                const result = await gameRoomService.joinRoom(standardRoomCode, { name: undefined } as Player);
                expect(result).toBeNull();
            });

            it('should join room with empty player name', async () => {
                const player: Player = { name: '' } as Player;
                const result = await gameRoomService.joinRoom(standardRoomCode, player);
                expect(result).toBeNull();
            });

            it('should handle joinRoom with invalid room code format', async () => {
                const result = await gameRoomService.joinRoom(null, { name: 'Player1' } as Player);
                expect(result).toBeNull();
            });
        });

        describe('toggleRoomLock additional tests', () => {
            it('should handle toggleRoomLock with invalid room code', () => {
                const result = gameRoomService.toggleRoomLock(undefined, true);
                expect(result).toBeNull();
            });

            it('should properly toggle lock multiple times', () => {
                expect(gameRoomService.isRoomLocked(standardRoomCode)).toBeFalsy();

                gameRoomService.toggleRoomLock(standardRoomCode, true);
                expect(gameRoomService.isRoomLocked(standardRoomCode)).toBeTruthy();

                gameRoomService.toggleRoomLock(standardRoomCode, true);
                expect(gameRoomService.isRoomLocked(standardRoomCode)).toBeTruthy();

                gameRoomService.toggleRoomLock(standardRoomCode, false);
                expect(gameRoomService.isRoomLocked(standardRoomCode)).toBeFalsy();
            });
        });

        describe('combined GameRoomService actions', () => {
            it('should handle player joining, character selection, and leaving', async () => {
                const gameData = gameRoomService['games'].get(standardRoomCode);
                gameData.players = [];

                const player = { name: 'TestPlayerFlow' } as Player;

                const joinResult = await gameRoomService.joinRoom(standardRoomCode, player);
                expect('newPlayer' in joinResult).toBeTruthy();

                if ('newPlayer' in joinResult) {
                    const playerName = joinResult.newPlayer;

                    const selectResult = gameRoomService.selectCharacter(standardRoomCode, { name: playerName } as Player, 'avatar-url');
                    expect(selectResult).not.toBeNull();

                    const playerWithAvatar = selectResult.players.find((p) => p.name === playerName);
                    expect(playerWithAvatar.avatarUrl).toBe('avatar-url');

                    const deselectResult = gameRoomService.deselectCharacter(standardRoomCode, { name: playerName } as Player);
                    expect(deselectResult).not.toBeNull();

                    const playerWithoutAvatar = deselectResult.players.find((p) => p.name === playerName);
                    expect(playerWithoutAvatar.avatarUrl).toBeNull();

                    const playerInfo = gameRoomService.getAllInformationPlayer(playerName, standardRoomCode);
                    expect(playerInfo).not.toHaveProperty('error');
                    expect(playerInfo['player'].name).toBe(playerName);

                    const isAdminResult = await gameRoomService.isFirstPlayer(standardRoomCode, { name: playerName } as Player);
                    expect(isAdminResult).toBeTruthy();

                    const leaveResult = await gameRoomService.leaveRoom(standardRoomCode, { name: playerName } as Player);
                    expect(leaveResult.destroyed).toBeTruthy();

                    const gameAfterLeave = await gameRoomService.getGame(standardRoomCode);
                    expect(gameAfterLeave).toBeNull();
                }
            });
        });

        describe('createRoom with different sizes', () => {
            it('should create rooms with different valid sizes', async () => {
                const smallRoomCode = await gameRoomService.createRoom({ id: 'game-small' } as Game, 'Petite Taille');
                const largeRoomCode = await gameRoomService.createRoom({ id: 'game-large' } as Game, 'Grande Taille');

                const smallRoom = await gameRoomService.getGame(smallRoomCode);
                const largeRoom = await gameRoomService.getGame(largeRoomCode);

                expect(smallRoom.game.size).toBe('Petite Taille');
                expect(largeRoom.game.size).toBe('Grande Taille');
            });
        });

        describe('player operations with non-existent players', () => {
            it('should handle character select/deselect for non-existent player', () => {
                const selectResult = gameRoomService.selectCharacter(standardRoomCode, { name: 'NonExistentPlayer' } as Player, 'avatar-url');
                expect(selectResult).not.toBeNull();

                expect(selectResult.players.some((p) => p.avatarUrl === 'avatar-url')).toBeFalsy();

                const deselectResult = gameRoomService.deselectCharacter(standardRoomCode, { name: 'NonExistentPlayer' } as Player);
                expect(deselectResult).not.toBeNull();
            });
        });
    });
});
