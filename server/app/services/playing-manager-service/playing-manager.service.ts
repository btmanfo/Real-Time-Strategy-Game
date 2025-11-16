import { CHESTBOX_NAME, ITEM_TYPES, ITEMS, NUMBER_OF_ITEMS_TO_SELECT, SPEED_SELECTOR, TIME_BY_SECOND } from '@app/constants/constants';
import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { TimeService } from '@app/services/time-service/time.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Game, GameData, Player, Tile } from '@common/interfaces';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class PlayingManagerService {
    endGameEmitted = false;
    gamesPlayers: Map<string, Player[]> = new Map<string, Player[]>();
    gamesPlayerTurn: Map<string, Player> = new Map<string, Player>();
    constructor(
        @Inject(forwardRef(() => TimeService))
        private readonly timeService: TimeService,
        @Inject(forwardRef(() => GameRoomGateway))
        private readonly gameGateway: GameRoomGateway,
        @Inject(forwardRef(() => GameLogGateway))
        private readonly gameLogGateway: GameLogGateway,
    ) {}
    /**
     * Handles a player quitting the game by removing the player from the room, updating the map,
     * and emitting a 'quitGame' event. If only one player remains, the room is deleted.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier from which the player is quitting.
     * @param {Player} player - The player who is quitting.
     * @param {Tile[]} map - The current map of tiles for the room.
     * @param {Map<string, GameData>} games - A map containing game data for all active rooms.
     */
    quitGame(server: Server, roomCode: string, player: Player, map: Tile[], games: Map<string, GameData>): void {
        const game = games.get(roomCode);
        if (game) {
            game.players = game.players.filter((p) => p.name !== player.name);
            this.gamesPlayers.set(roomCode, game.players);
            const updatedMap = map.map((tile) => {
                if (tile.player?.name === player.name) {
                    tile.player = undefined;
                }
                return tile;
            });
            server.to(roomCode).emit(SocketPlayerMovementLabels.QuitGame, game.players, updatedMap);
            if (game.players.length === 1) {
                games.delete(roomCode);
            }
        }
    }

    /**
     * Starts the game by initializing player spawn positions, setting the game state, and emitting a 'startGame' event.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the game is starting.
     * @param {Player[]} players - The list of players participating in the game.
     * @param {Map<string, GameData>} games - A map containing game data for all active rooms.
     */
    startGame(server: Server, roomCode: string, players: Player[], games: Map<string, GameData>): void {
        const gameData = games.get(roomCode);
        if (gameData) {
            gameData.game.map = this.setPlayersSpawn(gameData.game, players);
            gameData.game.map2 = [];
            gameData.players = players;
            if (gameData.game.gameMode === 'CTF') {
                gameData.players = this.setRandomTeams(gameData.players);
            }
            gameData.players = this.setOrderPlayers(gameData.players);
            this.setRandomItems(gameData.game.map);
            gameData.players.forEach((player) => {
                player.inventory = [];
            });
            this.gamesPlayerTurn.set(roomCode, null);
            this.gamesPlayers.set(roomCode, gameData.players);
            server.to(roomCode).emit(SocketPlayerMovementLabels.StartGame, gameData);
            const gameStatstics = this.gameGateway.games.get(roomCode).glocalStatistics;
            gameStatstics.allTime = Math.floor(Date.now() / TIME_BY_SECOND);
        }
    }
    /**
     * Emits an event to signal the end of the game with the victorious player's information.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the game is played.
     * @param {string} winner - The name or identifier of the winning player.
     */
    endGameWinVictories(server: Server, roomCode: string, winner: string): void {
        const gameRoom = this.gameGateway.games.get(roomCode);
        if (gameRoom && gameRoom.glocalStatistics) {
            gameRoom.glocalStatistics.secondTime = Math.floor(Date.now() / TIME_BY_SECOND);
        }
        server.to(roomCode).emit(SocketPlayerMovementLabels.EndGameWinVictories, { winner });
        const playersInGame = this.gamesPlayers.get(roomCode) || [];
        const payload = {
            type: 'combatStart',
            event: `Fin de partie. Joueurs actifs : ${playersInGame.map((player) => player.name).join(', ')}`,
            players: playersInGame,
            room: roomCode,
        };
        if (!this.endGameEmitted && this.gameLogGateway && typeof this.gameLogGateway.handleSendGameLog === 'function') {
            this.gameLogGateway.handleSendGameLog(null, payload);
            this.endGameEmitted = true;
        }
    }
    /**
     * Emits an event indicating that the debug mode state has changed.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the debug mode change applies.
     * @param {boolean} isDebugMode - The new state of the debug mode.
     */
    debugModeChanged(server: Server, roomCode: string, isDebugMode: boolean) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.DebugModeChanged, { isDebugMode });
    }
    /**
     * Ends the game in Capture The Flag (CTF) mode if the player is on their spawn point and has the flag.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the game is played.
     * @param {Player} player - The player to check for end game conditions.
     * @param {Game} game - The current game instance.
     */
    endGameCtf(server: Server, roomCode: string, player: Player, game: Game): void {
        const gameStatstics = this.gameGateway.games.get(roomCode).glocalStatistics;
        gameStatstics.secondTime = Math.floor(Date.now() / TIME_BY_SECOND);
        if (game.gameMode === 'CTF') {
            const isOnSpawn = player.coordinate.x === player.spawnPoint.x && player.coordinate.y === player.spawnPoint.y;
            const hasFlag = player.inventory.some((item) => item.name === CHESTBOX_NAME);
            if (!(isOnSpawn && hasFlag)) {
                return;
            }
            this.emitEndGameCtf(server, roomCode, player.team);
            const payload = {
                type: 'combatStart',
                event: `Fin de partie. Joueurs actifs : ${this.gamesPlayers
                    .get(roomCode)
                    .map((p) => p.name)
                    .join(', ')}`,
                players: this.gamesPlayers.get(roomCode),
                room: roomCode,
            };
            this.gameLogGateway.handleSendGameLog(null, payload);
        }
    }

    /**
     * Sets the spawn positions for all players in the game and updates the game map accordingly.
     *
     * @param {Game} game - The game instance containing map information.
     * @param {Player[]} players - The list of players to assign spawn positions.
     * @returns {Tile[]} The updated map with players' spawn positions set.
     */
    private setPlayersSpawn(game: Game, players: Player[]): Tile[] {
        const map = game.map.concat(game.map2);
        const spawns = map.filter((tile) => tile.item?.name === 'spawn');

        this.shuffle(spawns);
        this.setPlayers(players, map, spawns);
        for (let i = players.length; i < spawns.length; i++) {
            const spawn = spawns[i];
            const targetTile = map.find((tile) => tile.position?.x === spawn.position?.x && tile.position?.y === spawn.position?.y);
            if (targetTile) {
                targetTile.item = undefined;
            }
        }
        return map;
    }

    private setPlayers(players: Player[], map: Tile[], spawns: Tile[]): void {
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const spawn = spawns[i];
            if (!spawn?.position) continue;

            const targetTile = map.find((tile) => tile.position?.x === spawn.position?.x && tile.position?.y === spawn.position?.y);
            if (!targetTile) continue;

            player.coordinate = targetTile.position;
            targetTile.player = { ...player, coordinate: targetTile.position };
            player.spawnPoint = { ...targetTile.position };
            targetTile.player = { ...player, coordinate: targetTile.position };
        }
    }

    /**
     * Shuffles an array of tiles using the Fisher-Yates algorithm.
     *
     * @param {Tile[]} array - The array of tiles to shuffle.
     */
    private shuffle<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Sets random teams for the players in the game. Players are shuffled and divided into two teams.
     *
     * @param {Player[]} players - The array of players to assign to teams.
     * @returns {Player[]} The updated array of players with assigned teams.
     */
    private setRandomTeams(players: Player[]): Player[] {
        const shuffledPlayers = [...players];
        this.shuffle(shuffledPlayers);

        const midIndex = Math.ceil(shuffledPlayers.length / 2);
        const teamA = shuffledPlayers.slice(0, midIndex);
        const teamB = shuffledPlayers.slice(midIndex);

        teamA.forEach((player) => (player.team = 'teamA'));
        teamB.forEach((player) => (player.team = 'teamB'));

        return players;
    }
    /**
     * Sets random items on the map, ensuring that each item is unique and not already present.
     *
     * @param {Tile[]} map - The array of tiles representing the game map.
     */
    private setRandomItems(map: Tile[]): void {
        const foundItems = map.filter((t) => t.item?.name && t.item?.name !== ITEM_TYPES.random);
        const items = ITEMS.slice(0, NUMBER_OF_ITEMS_TO_SELECT);
        let itemsLeft = items.filter((i) => !foundItems.some((f) => f.item?.name === i.name));
        map.forEach((tile) => {
            if (tile.item?.name === ITEM_TYPES.random) {
                const randomIndex = Math.floor(Math.random() * itemsLeft.length);
                const randomItem = itemsLeft[randomIndex];
                tile.item = randomItem;
                itemsLeft = itemsLeft.filter((i) => i.name !== randomItem.name);
            }
        });
    }

    /**
     * Emits an event to signal the end of the game in Capture The Flag (CTF) mode.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the game is played.
     * @param {string} team - The team that won the game.
     */
    private emitEndGameCtf(server: Server, roomCode: string, team: string): void {
        server.to(roomCode).emit(SocketPlayerMovementLabels.EndGameCtf, { team });
        this.debugModeChanged(server, roomCode, false);
        this.timeService.stopTimer(roomCode);
        server.socketsLeave(roomCode);
    }
    /**
     * Orders the players based on their speed, placing players with higher speed first.
     * In the case of equal speed, the order is randomized.
     *
     * @param {Player[]} players - The array of players to order.
     */
    private setOrderPlayers(players: Player[]): Player[] {
        return players.sort((player1, player2) => {
            if (player2.speed === player1.speed) {
                return Math.random() - SPEED_SELECTOR;
            }
            return player2.speed - player1.speed;
        });
    }
}
