/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { PlayerService } from '@app/services/player-service/player.service';
import { GameData, Player } from '@common/interfaces';

describe('PlayerService', () => {
    let playerService: PlayerService;
    let mockLogger: { log: jest.Mock };

    beforeEach(() => {
        mockLogger = { log: jest.fn() };
        playerService = new PlayerService();
        (playerService as any).logger = mockLogger;
    });

    it('should return the same name if it is unique in the game', () => {
        const game: GameData = { players: [] } as GameData;
        const result = playerService.getUniquePlayerName(game, 'Alice');
        expect(result).toBe('Alice');
    });

    it('should add a suffix if the name already exists', () => {
        const game: GameData = {
            players: [{ name: 'Alice' }] as Player[],
        } as GameData;

        const result = playerService.getUniquePlayerName(game, 'Alice');
        expect(result).toBe('Alice-2');
    });

    it('should increment the suffix correctly if multiple players have the same base name', () => {
        const game: GameData = {
            players: [{ name: 'Alice' }, { name: 'Alice-2' }, { name: 'Alice-3' }] as Player[],
        } as GameData;

        const result = playerService.getUniquePlayerName(game, 'Alice');
        expect(result).toBe('Alice-4');
    });

    it('should handle names with similar formats correctly', () => {
        const game: GameData = {
            players: [{ name: 'Alice' }, { name: 'Alice-2' }, { name: 'Alice-4' }] as Player[],
        } as GameData;

        const result = playerService.getUniquePlayerName(game, 'Alice');
        expect(result).toBe('Alice-3');
    });

    it('should work for different base names', () => {
        const game: GameData = {
            players: [{ name: 'Bob' }] as Player[],
        } as GameData;

        const result = playerService.getUniquePlayerName(game, 'Alice');
        expect(result).toBe('Alice');
    });
});
