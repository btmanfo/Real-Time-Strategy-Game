import { GameData } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerService {
    /**
     * Generates a unique name for a player within a game room.
     *
     * @param {GameData} game - The game data containing the list of players.
     * @param {string} baseName - The base name provided by the player.
     * @returns {string} A unique name that is not already used by any player in the game.
     */
    getUniquePlayerName(game: GameData, baseName: string): string {
        let uniqueName = baseName;
        let counter = 2;
        while (game.players.some((p) => p.name === uniqueName)) {
            uniqueName = `${baseName}-${counter}`;
            counter++;
        }

        return uniqueName;
    }
}
