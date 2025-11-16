import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { GlobalStatistics } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatisticsService {
    constructor(private readonly gameRoomService: GameRoomService) {}

    /**
     * Retrieves the game data for a given room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {GlobalStatistics | null} - The game data if found, otherwise null.
     */
    getAllGlobalInfo(roomCode: string): GlobalStatistics | null {
        const game = this.gameRoomService.games.get(String(roomCode));
        return game.glocalStatistics;
    }

    /**
     * Updates the global statistics for a given room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {GlobalStatistics} globalStatistics - The new global statistics to set.
     */
    updatePlayerVictories(playerName: string, roomCode: string, nbOfVictorie: number): void {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.nbVictory = nbOfVictorie;
        player.stats.nbCombat = player.stats.nbDefeat + player.stats.nbVictory;
    }

    /**
     * Updates the number of defeats for a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     * @param {number} nbPlayerLose - The number of defeats to set.
     */
    updatePlayerLose(playerName: string, roomCode: string, nbPlayerLose: number): void {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.nbDefeat = nbPlayerLose;
        player.stats.nbCombat = player.stats.nbDefeat + player.stats.nbVictory;
    }

    /**
     * Updates the percentage of tiles for a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     * @param {number} value - The new percentage value to set.
     */
    updatePlayerPourcentageTile(playerName: string, roomCode: string, value: number) {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.pourcentageOfTile = Math.ceil(value);
    }

    /**
     * Updates the number of damages dealt by a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     * @param {number} nbDamage - The number of damages to add.
     */
    updatePlayerDamages(playerName: string, roomCode: string, nbDamage: number) {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.nbDamage += nbDamage;
    }

    /**
     * Updates the number of life lost by a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     * @param {number} lifeLost - The number of life lost to add.
     */
    updateLifeLost(playerName: string, roomCode: string, lifeLost: number) {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.nbLifeLost += lifeLost;
    }

    /**
     * Updates the number of combats for a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     */
    updateCombatCount(playerName: string, roomCode: string, secondPlayer: string) {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        const gameSecondPlayer = this.gameRoomService.getPlayer(roomCode, secondPlayer);
        if (gameSecondPlayer.isVirtualPlayer) {
            gameSecondPlayer.stats.nbCombat += 1;
        }
        player.stats.nbCombat += 1;
    }

    /**
     * Updates the number of dodges for a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     */
    updateDodgeCount(playerName: string, roomCode: string) {
        const player = this.gameRoomService.getPlayer(roomCode, playerName);
        player.stats.nbEvasion += 1;
    }
}
