import { VALUE_RADOMISER, VIRTUAL_PLAYER_STAT } from '@app/constants/constants';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { PlayerService } from '@app/services/player-service/player.service';
import { allUrlAvatar, DiceType, SocketWaitRoomLabels, VIRTUAL_PLAYER_NAME } from '@common/constants';
import { GameData, Player } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VirtualPlayerService {
    constructor(
        private readonly gameRoomService: GameRoomService,
        private readonly playerService: PlayerService,
    ) {}

    /**
     * Adds an attacker virtual player to a game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Promise<Player | { error: string }>} - The added virtual player or an error.
     */
    async addAttackerVirtualPlayer(roomCode: string): Promise<Player | { error: string }> {
        return this.addVirtualPlayer(roomCode, true);
    }

    /**
     * Adds a defensive virtual player to a game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Promise<Player | { error: string }>} - The added virtual player or an error.
     */
    async addDefensiveVirtualPlayer(roomCode: string): Promise<Player | { error: string }> {
        return this.addVirtualPlayer(roomCode, false);
    }

    /**
     * Adds a virtual player to a game room with the specified aggression.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {boolean} isAggressive - Determines if the virtual player is aggressive.
     * @returns {Promise<Player | { error: string }>} - The added virtual player or an error.
     */
    async addVirtualPlayer(roomCode: string, isAggressive: boolean): Promise<Player | { error: string }> {
        const game = await this.findGame(roomCode);
        if (!game) return { error: SocketWaitRoomLabels.RoomNotFound };

        if (this.gameRoomService.isRoomFull(roomCode)) {
            return { error: SocketWaitRoomLabels.IsRoomFull };
        }

        const allPossibleUrl = allUrlAvatar;
        const takenAvart: Set<string> = new Set();
        game.players.forEach((element) => {
            takenAvart.add(element.avatarUrl);
        });
        let selectedAvatarUrl = '';
        allPossibleUrl.forEach((element) => {
            if (!takenAvart.has(element)) {
                selectedAvatarUrl = element;
            }
        });

        const candidate = this.getRandomVirtualPlayerName();
        const uniqueName = this.playerService.getUniquePlayerName(game, candidate);
        const virtualPlayer = this.createVirtualPlayer(uniqueName, selectedAvatarUrl, isAggressive);

        game.players.push(virtualPlayer);
        return virtualPlayer;
    }

    /**
     * Removes a virtual player from a game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {string} playerName - The name of the virtual player to remove.
     * @returns {Promise<{ success?: boolean; error?: string }>} - The result of the removal.
     */
    async removeVirtualPlayer(roomCode: string, playerName: string): Promise<{ success?: boolean; error?: string }> {
        const game = await this.findGame(roomCode);
        if (!game) return { error: SocketWaitRoomLabels.RoomNotFound };

        const playerIndex = game.players.findIndex((p) => p.name === playerName && p.isVirtualPlayer);
        if (playerIndex === -1) {
            return { error: SocketWaitRoomLabels.VirtualPlayerNotFound };
        }

        game.players.splice(playerIndex, 1);

        return { success: true };
    }

    /**
     * Retrieves all virtual players from a game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Promise<Player[]>} - An array of virtual players.
     */
    async getVirtualPlayers(roomCode: string): Promise<Player[]> {
        const game = await this.findGame(roomCode);
        return game ? game.players.filter((player) => player.isVirtualPlayer) : [];
    }

    /**
     * Finds and returns the game associated with a room code.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Promise<GameData | null>} - The game data or null if not found.
     */
    private async findGame(roomCode: string): Promise<GameData | null> {
        const game = await this.gameRoomService.getGame(roomCode);
        if (!game) {
            return null;
        }
        return game;
    }

    /**
     * Generates a random virtual player name.
     *
     * @returns {string} - A randomly selected virtual player name.
     */
    private getRandomVirtualPlayerName(): string {
        return VIRTUAL_PLAYER_NAME[Math.floor(Math.random() * VIRTUAL_PLAYER_NAME.length)];
    }

    /**
     * Creates a virtual player object with generated statistics and the provided parameters.
     *
     * @param {string} name - The unique name of the virtual player.
     * @param {string} avatarUrl - The avatar URL to assign to the player.
     * @param {boolean} isAggressive - Determines if the virtual player is aggressive.
     * @returns {Player} - The constructed virtual player object.
     */
    private createVirtualPlayer(name: string, avatarUrl: string, isAggressive: boolean): Player {
        const attackIsFour = Math.random() < VALUE_RADOMISER;
        const attack = attackIsFour ? DiceType.FourFaces : DiceType.SixFaces;
        const defense = attackIsFour ? DiceType.SixFaces : DiceType.FourFaces;

        return {
            name,
            isVirtualPlayer: true,
            life: Math.random() < VALUE_RADOMISER ? VIRTUAL_PLAYER_STAT.default : VIRTUAL_PLAYER_STAT.max,
            speed: Math.random() < VALUE_RADOMISER ? VIRTUAL_PLAYER_STAT.default : VIRTUAL_PLAYER_STAT.max,
            attack,
            defense,
            coordinate: { x: 0, y: 0 },
            spawnPoint: { x: 0, y: 0 },
            isAdmin: false,
            victories: 0,
            agressive: isAggressive,
            stats: {
                nbVictory: 0,
                nbDefeat: 0,
                nbDamage: 0,
                nbLifeLost: 0,
                nbCombat: 0,
                nbEvasion: 0,
                name,
                nbItem: 0,
                pourcentageOfTile: 0,
                nbDoors: 0,
            },
            avatarUrl,
        };
    }
}
