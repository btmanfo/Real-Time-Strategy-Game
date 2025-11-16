import { PlayerService } from '@app/services/player-service/player.service';
import { generatePin } from '@app/utils/pin-generator';
import { Game, GameData, Player, PlayerAndGame, sizeCapacity } from '@common/interfaces';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameRoomService {
    readonly games: Map<string, GameData> = new Map();
    private readonly rooms: Set<string> = new Set();
    private readonly selectionPlayerRoom: Set<string> = new Set();
    private readonly combatRoom: Set<string> = new Set();
    private readonly gamesCombatRoom: Map<string, Player[]> = new Map();

    constructor(private readonly playerService: PlayerService) {}

    /**
     * Creates a new game room with a specified size and returns the room code (PIN).
     * By default, the room size is set to "Medium".
     *
     * @param {Game} gameToAdd - The game instance to be added to the room.
     * @param {RoomSize} size - The size of the room (e.g., "small", "medium", "large").
     * @returns {Promise<string>} The generated room code (PIN) for the created game room.
     * @throws {Error} If the provided room size is invalid.
     */
    async createRoom(gameToAdd: Game, size: string): Promise<string> {
        if (!Object.hasOwn(sizeCapacity, size)) {
            throw new Error(`Taille de salle invalide : "${size}"`);
        }

        const roomCode = generatePin();
        this.rooms.add(roomCode);

        const gameData = {
            pin: roomCode,
            players: [],
            isLocked: false,
            game: { ...gameToAdd, size },
        } as GameData;

        this.games.set(roomCode, gameData);

        return roomCode;
    }

    /**
     * Creates a combat room for two players and returns the room code.
     *
     * @param {Player} firstPlayer - The first player.
     * @param {Player} secondPlayer - The second player.
     * @returns {Promise<string>} The generated room code for the combat room.
     */
    async createCombatRoomService(firstPlayer: Player, secondPlayer: Player): Promise<string> {
        const roomCode = uuidv4();
        this.combatRoom.add(roomCode);
        this.gamesCombatRoom.set(roomCode, [firstPlayer, secondPlayer]);
        return roomCode;
    }

    /**
     * Retrieves the players in a combat room.
     *
     * @param {string} roomCode - The unique code of the combat room.
     * @returns {Player[]} An array of players in the combat room.
     */
    async createSelectPlayerRoom(roomCode: string) {
        this.selectionPlayerRoom.add(roomCode);
    }

    /**
     * Allows a player to join an existing game room.
     *
     * @param {string} roomCode - The unique code (PIN) of the room.
     * @param {Player} player - The player attempting to join the room.
     * @returns {Promise<PlayerAndGame | { error: string; currentPlayers: number; capacity: number }>}
     *          - If successful, returns the player and updated game data.
     *          - If the room is full, returns an error object with the current number of players and the room capacity.
     * @throws {Error} If the room size is invalid.
     */
    async joinRoom(roomCode: string, player: Player): Promise<PlayerAndGame | { error: string; currentPlayers: number; capacity: number }> {
        const game = this.validatePlayerAndGame(roomCode, player);
        if (!game) return null;

        const maxCapacity = sizeCapacity[game.game.size];
        if (!maxCapacity) {
            throw new Error(`Taille de salle invalide : "${game.game.size}"`);
        }

        if (game.players.length === maxCapacity.max) {
            return { error: 'roomFull', currentPlayers: game.players.length, capacity: maxCapacity.max };
        }

        player.name = this.playerService.getUniquePlayerName(game, player.name);
        player.isAdmin = game.players.length === 0;
        game.players.push(player);

        const playerAndGame: PlayerAndGame = { newPlayer: player.name, newGame: game };
        return playerAndGame;
    }

    /**
     * Handles a player leaving a game room.
     * If the player is the administrator, the room is deleted.
     * Otherwise, the player is simply removed from the list.
     *
     * @param {string} roomCode - The unique code identifying the game room.
     * @param {Player} player - The player attempting to leave the room.
     * @returns {Promise<{ game?: GameData; isAdmin?: boolean; destroyed?: boolean; reason?: string }>}
     * - `game`: The updated game data if the room still exists.
     * - `isAdmin`: Boolean indicating whether the player was the admin.
     * - `destroyed`: Boolean indicating if the room was closed (only when the admin leaves).
     * - `reason`: Error message if the player or room was not found.
     */
    async leaveRoom(roomCode: string, player: Player): Promise<{ game?: GameData; isAdmin?: boolean; destroyed?: boolean; reason?: string }> {
        const game = await this.getGame(roomCode);
        if (!game) return { reason: 'roomNotFound' };

        const uniqueName = this.playerService.getUniquePlayerName(game, player.name);
        const playerIndex = game.players.findIndex((p) => p.name === player.name || p.name === uniqueName);
        if (playerIndex === -1) return { reason: 'playerNotFound' };

        const isAdmin = playerIndex === 0;
        if (isAdmin) {
            this.games.delete(roomCode);
            this.rooms.delete(roomCode);
            return { game, isAdmin, destroyed: true };
        } else {
            game.players.splice(playerIndex, 1);
            return { game, isAdmin: false, destroyed: false };
        }
    }

    /**
     * Retrieves the game data for a given room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Promise<GameData | null>} - The game data if found, otherwise null.
     */
    async getGame(roomCode: string): Promise<GameData | null> {
        return this.games.get(roomCode) || null;
    }

    /**
     * Retrieves all relevant information about a player in a specific game room.
     *
     * @param {string} playerName - The name of the player.
     * @param {string} roomCode - The unique code of the room.
     * @returns {object} - An object containing the game data, player details, player index, and all players in the room.
     * - `game`: The game data for the room.
     * - `player`: The player object if found.
     * - `playerIndex`: The index of the player in the list.
     * - `roomCode`: The room code.
     * - `allPlayer`: The list of all players in the room.
     * - If the room is not found, returns `{ error: 'roomNotFound' }`.
     */
    getAllInformationPlayer(playerName: string, roomCode: string): object {
        const game = this.games.get(String(roomCode));
        if (!game) {
            return { error: 'roomNotFound' };
        }
        const uniqueName = this.playerService.getUniquePlayerName(game, playerName);
        const player = game.players.find((p) => p.name === playerName || p.name === uniqueName);
        const playerIndex = game.players.findIndex((p) => p.name === playerName || p.name === uniqueName);
        const allPlayer = game.players;
        return { game, player, playerIndex, roomCode, allPlayer };
    }

    /**
     * Retrieves the list of active players in a given room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {Player[]} - An array of players in the room. Returns an empty array if the room doesn't exist.
     */
    getActivePlayers(roomCode: string): Player[] {
        const game = this.games.get(roomCode);
        return game ? game.players : [];
    }

    /**
     * Toggles the lock status of a room, preventing or allowing players to join.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {boolean} isLocked - The desired lock state (true = locked, false = unlocked).
     * @returns {GameData | null} - The updated game data if the room exists, otherwise null.
     */
    toggleRoomLock(roomCode: string, isLocked: boolean): GameData | null {
        const game = this.games.get(roomCode);
        if (game) {
            game.isLocked = isLocked;
            return game;
        }
        return null;
    }

    /**
     * Checks if a given room exists.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {boolean} - True if the room exists, otherwise false.
     */
    isRoomExist(roomCode: string): boolean {
        return this.rooms.has(roomCode);
    }

    /**
     * Checks if a given room is currently locked.
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {boolean} - True if the room is locked, otherwise false.
     */
    isRoomLocked(roomCode: string): boolean {
        const game = this.games.get(roomCode);
        return game ? game.isLocked : false;
    }

    /**
     * Checks if a given room is full (i.e., has reached its maximum player capacity).
     *
     * @param {string} roomCode - The unique code of the room.
     * @returns {boolean} - True if the room is full, otherwise false.
     */
    isRoomFull(roomCode: string): boolean {
        const game = this.games.get(roomCode);
        if (!game) return false;

        const maxCapacity = sizeCapacity[game.game.size];
        return game.players.length === maxCapacity.max;
    }

    /**
     * Determines if a given player is the first player (admin) in a room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {Player} player - The player to check.
     * @returns {Promise<boolean>} - True if the player is the admin, otherwise false.
     */
    async isFirstPlayer(roomCode: string, player: Player): Promise<boolean> {
        const game = this.games.get(roomCode);
        if (!game) return false;
        const uniqueName = this.playerService.getUniquePlayerName(game, player.name);
        const foundPlayer = game.players.find((p) => p.name === player.name || p.name === uniqueName);
        return foundPlayer ? !!foundPlayer.isAdmin : false;
    }

    /**
     * Selects a character for a player in a specific game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {Player} player - The player selecting the character.
     * @param {string} avatarUrl - The URL of the selected character's avatar.
     * @returns {GameData | null} - The updated game data if successful, otherwise null.
     */
    selectCharacter(roomCode: string, player: Player, avatarUrl: string): GameData | null {
        const game = this.games.get(roomCode);
        if (!game) return null;
        const uniqueName = this.playerService.getUniquePlayerName(game, player.name);
        const foundPlayer = game.players.find((p) => p.name === player.name || p.name === uniqueName);
        if (foundPlayer) {
            foundPlayer.avatarUrl = avatarUrl;
        }
        return game;
    }

    /**
     * Deselects a character for a player in a specific game room.
     *
     * @param {string} roomCode - The unique code of the room.
     * @param {Player} player - The player deselecting the character.
     * @returns {GameData | null} - The updated game data if successful, otherwise null.
     */
    deselectCharacter(roomCode: string, player: Player): GameData | null {
        const game = this.games.get(roomCode);
        if (!game) return null;
        const uniqueName = this.playerService.getUniquePlayerName(game, player.name);
        const foundPlayer = game.players.find((p) => p.name === player.name || p.name === uniqueName);
        if (foundPlayer) {
            foundPlayer.avatarUrl = null;
        }
        return game;
    }

    /**
     * Retrieves a player from a game using the room code and the given player name.
     *
     * @param {string} roomCode - The room code.
     * @param {string} playerName - The name of the player.
     * @returns {Player} - The matching player.
     */
    getPlayer(roomCode: string, playerName: string): Player {
        const game = this.games.get(String(roomCode));
        if (!game) return undefined;

        const uniqueName = this.playerService.getUniquePlayerName(game, playerName);
        return game.players.find((p) => p.name === playerName || p.name === uniqueName);
    }

    /**
     * Validates if a player and game room exist and are accessible.
     *
     * @param {string} roomCode - The unique code of the game room.
     * @param {Player} player - The player attempting to join the room.
     * @returns {GameData | null} - The game data if the room exists and is accessible, otherwise null.
     */
    private validatePlayerAndGame(roomCode: string, player: Player): GameData | null {
        if (!player?.name) {
            return null;
        }

        const game = this.games.get(roomCode);
        if (!game) {
            return null;
        }

        if (game.isLocked) {
            return null;
        }
        return game;
    }
}
