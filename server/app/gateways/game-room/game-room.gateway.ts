/* eslint-disable max-lines */
// Le nombre de lignes est élevé à cause du nombre élevé d'interfaces
import { MAP_GRID_SIZE, POURCENTAGE_CALCULATION } from '@app/constants/constants';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { StatisticsService } from '@app/services/statistics-service/statistics.service';
import { VirtualPlayerService } from '@app/services/virtual-player-service/virtual-player.service';
import { SocketEndGameStatistics, SocketWaitRoomLabels } from '@common/constants';
import {
    CombatRoomPayload,
    DamagePayload,
    Game,
    GameData,
    Player,
    PlayerActionPayload,
    PlayerInfoPayload,
    RoomAndPlayerInterface,
    RoomCodeInterface,
    RoomJoinPayload,
    RoomLeavePayload,
    StatisticsUpdatePayload,
    ToggleLockPayload,
    UpdateBoardPayload,
    UpdatePlayerDodgeCountInterface,
} from '@common/interfaces';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class GameRoomGateway {
    @WebSocketServer() server: Server;
    games: Map<string, GameData & { isDebugMode?: boolean }> = new Map();
    readonly rooms: Set<string> = new Set();
    readonly socketMap: Map<string, Socket> = new Map();
    readonly selectionPlayerRoom: Map<string, Set<string>> = new Map();

    constructor(
        private readonly gameRoomService: GameRoomService,
        private readonly virtualPlayerService: VirtualPlayerService,
        private readonly statisticsService: StatisticsService,
    ) {}

    /**
     * Creates a combat room and emits the room code along with player information.
     *
     * @param client - The client socket initiating the request.
     * @param payload - The payload containing the first and second player.
     */
    @SubscribeMessage(SocketWaitRoomLabels.CreateAndJoinGameRoom)
    async handleCreatAndJoinGameRoom(client: Socket, payload: CombatRoomPayload): Promise<void> {
        const roomCode = await this.gameRoomService.createCombatRoomService(payload.firstPlayer, payload.secondPlayer);
        this.server.emit(SocketWaitRoomLabels.CodeGameCombatRoom, {
            codeRoom: roomCode,
            theFirstPlayer: payload.firstPlayer,
            theSecondPlayer: payload.secondPlayer,
        });
    }

    /**
     * Updates the game board for a specific room.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing room code and board data.
     */
    @SubscribeMessage(SocketWaitRoomLabels.UpdateBoard)
    async handleUpdateBoard(client: Socket, payload: UpdateBoardPayload): Promise<void> {
        const game = this.games.get(payload.roomCode);
        if (game) {
            game.updateMap = payload.board;
        }
    }

    /**
     * Creates a new game room, sets up initial room data, joins the client to the room,
     * and emits the room creation event with the room code.
     *
     * @param client - The client socket initiating the room creation.
     * @param game - The game data used to create the room.
     * @returns The created room code.
     */
    @SubscribeMessage(SocketWaitRoomLabels.CreateRoom)
    async handleCreateRoom(client: Socket, game: Game): Promise<string> {
        const roomCode = await this.gameRoomService.createRoom(game, game.size);
        this.initializeNewRoom(roomCode, game, client);
        return roomCode;
    }

    /**
     * Handles a client request to join an existing room. It validates the request,
     * joins the client to the room, updates the socket mapping, and emits the updated players list.
     *
     * @param client - The client socket requesting to join the room.
     * @param payload - The payload containing the room code and player information.
     */
    @SubscribeMessage(SocketWaitRoomLabels.JoinRoom)
    async handleJoinRoom(client: Socket, payload: RoomJoinPayload): Promise<void> {
        const roomCode = payload.roomCode.toString();
        const result = await this.gameRoomService.joinRoom(roomCode, payload.player);

        if (!result) {
            client.emit(SocketWaitRoomLabels.RoomJoined, { success: false, reason: 'roomNotFound or invalidPlayer' });
            return;
        }

        if ('error' in result && result.error === 'roomFull') {
            client.emit(SocketWaitRoomLabels.RoomJoined, { success: false, reason: 'roomFull' });
            return;
        }

        const game = 'newGame' in result ? result.newGame : null;
        client.join(roomCode);

        if ('newPlayer' in result) {
            this.socketMap.set(result.newPlayer, client);
        }

        this.server.to(roomCode).emit(SocketWaitRoomLabels.PlayersList, game.players);
        client.emit(SocketWaitRoomLabels.RoomJoined, {
            success: true,
            playerJoin: 'newPlayer' in result ? result.newPlayer : null,
        });
    }

    /**
     * Handles a client request to leave a room. It removes the client from the room,
     * emits the updated players list or room destruction event, and sends a leave room response.
     *
     * @param client - The client socket requesting to leave the room.
     * @param payload - The payload containing room code, player information, and admin status.
     */
    @SubscribeMessage(SocketWaitRoomLabels.LeaveRoom)
    async handleLeaveRoom(client: Socket, payload: RoomLeavePayload): Promise<void> {
        const roomCode = payload.roomCode.toString();
        const result = await this.gameRoomService.leaveRoom(roomCode, payload.player);
        client.leave(roomCode);

        if (result.reason) {
            client.emit(SocketWaitRoomLabels.LeaveRoomResponse, { success: false, reason: result.reason });
            return;
        }

        const gameData = await this.gameRoomService.getGame(payload.roomCode);
        const players = gameData?.players || null;
        const responsePayload = { success: true, redirect: '/home', allPlayers: players };

        if (result.destroyed) {
            this.server.to(roomCode).emit(SocketWaitRoomLabels.RoomDestroyed, {
                message: 'La salle a été fermée par administrateur.',
                redirect: '/home',
            });
        } else {
            this.server.to(roomCode).emit(SocketWaitRoomLabels.PlayersList, result.game.players);
        }

        client.emit(SocketWaitRoomLabels.LeaveRoomResponse, responsePayload);
    }

    /**
     * Handles a client request to kick a player from a room. It removes the specified player,
     * notifies the kicked player, updates the players list, and emits a kick response.
     *
     * @param client - The client socket initiating the kick request.
     * @param payload - The payload containing the room code and the player to be kicked.
     */
    @SubscribeMessage(SocketWaitRoomLabels.KickPlayer)
    async handleKickPlayer(client: Socket, payload: PlayerActionPayload): Promise<void> {
        const roomCode = payload.roomCode.toString();
        const result = await this.gameRoomService.leaveRoom(roomCode, payload.player);
        const gameData = await this.gameRoomService.getGame(roomCode);
        const players = gameData ? gameData.players : [];

        if (result.reason) {
            client.emit(SocketWaitRoomLabels.KickResponse, { success: false, reason: result.reason });
            return;
        }

        this.handlePlayerKick(roomCode, payload.player, client, players);
    }

    /**
     * Checks if a room exists and emits the result back to the requesting client.
     *
     * @param client - The client socket requesting the room existence check.
     * @param roomCode - The room code to verify.
     */
    @SubscribeMessage(SocketWaitRoomLabels.IsRoomExist)
    handleIsRoomExist(client: Socket, roomCode: string): void {
        client.emit(SocketWaitRoomLabels.IsRoomExistResponse, this.gameRoomService.isRoomExist(roomCode));
    }

    /**
     * Checks if a room is locked and emits the lock status back to the requesting client.
     *
     * @param client - The client socket requesting the room lock status.
     * @param roomCode - The room code to verify.
     */
    @SubscribeMessage(SocketWaitRoomLabels.IsRoomLocked)
    handleIsRoomLocked(client: Socket, roomCode: string): void {
        client.emit(SocketWaitRoomLabels.IsRoomLockedResponse, this.gameRoomService.isRoomLocked(roomCode));
    }

    /**
     * Checks if a room is full and emits the capacity status back to the requesting client.
     *
     * @param client - The client socket requesting the room capacity check.
     * @param roomCode - The room code to verify.
     */
    @SubscribeMessage(SocketWaitRoomLabels.IsRoomFull)
    handleIsRoomFull(client: Socket, roomCode: string): void {
        client.emit(SocketWaitRoomLabels.GetRoomFull, this.gameRoomService.isRoomFull(roomCode));
    }

    /**
     * Toggles the lock status of a room and emits the updated status to all clients in the room.
     *
     * @param client - The client socket initiating the toggle request.
     * @param payload - The payload containing the room code and the new lock status.
     */
    @SubscribeMessage(SocketWaitRoomLabels.ToggleRoomLock)
    handleToggleRoomLock(client: Socket, payload: ToggleLockPayload): void {
        const game = this.gameRoomService.toggleRoomLock(payload.roomCode, payload.isLocked);
        if (game) {
            this.server.to(payload.roomCode).emit(SocketWaitRoomLabels.RoomLockStatus, payload.isLocked);
        }
    }

    /**
     * Retrieves the list of active players in a room and emits it back to the requesting client.
     *
     * @param client - The client socket requesting the active players list.
     * @param roomCode - The room code from which to retrieve active players.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetActivePlayers)
    handleGetActivePlayers(client: Socket, roomCode: string): void {
        client.emit(SocketWaitRoomLabels.ActivePlayers, this.gameRoomService.getActivePlayers(roomCode));
    }

    /**
     * Determines if the specified player is the first player in the room and emits the result.
     *
     * @param client - The client socket requesting the check.
     * @param payload - The payload containing the room code and player information.
     */
    @SubscribeMessage(SocketWaitRoomLabels.IsFirstPlayer)
    async handleIsFirstPlayer(client: Socket, payload: PlayerActionPayload): Promise<void> {
        const isFirst = await this.gameRoomService.isFirstPlayer(payload.roomCode, payload.player);
        client.emit(SocketWaitRoomLabels.IsFirstPlayerResponse, { isFirst });
    }

    /**
     * Retrieves the game ID for the specified room and emits it to the requesting client.
     *
     * @param client - The client socket requesting the game ID.
     * @param roomId - The room identifier for which to get the game ID.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetGameID)
    async handleGetGameId(client: Socket, roomId: string): Promise<void> {
        const gameData = await this.gameRoomService.getGame(roomId);
        const idOfGame = gameData.game.id;
        client.emit(SocketWaitRoomLabels.ReturnGameID, idOfGame);
    }

    /**
     * Retrieves the game size for the specified room and emits it to the requesting client.
     *
     * @param client - The client socket requesting the game size.
     * @param roomCode - The room identifier for which to get the game size.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetGameSize)
    async handleGetGameSize(client: Socket, roomCode: string): Promise<void> {
        const gameData = await this.gameRoomService.getGame(roomCode);
        const roomSize = gameData.game.size;
        client.emit(SocketWaitRoomLabels.ReturnGameSize, roomSize);
    }

    /**
     * Retrieves all game and player information for a specific room and emits it to the requesting client.
     *
     * @param client - The client socket requesting the information.
     * @param payload - The payload containing the player identifier and room code.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetAllPlayerAndGameInfo)
    handleGetAllInformation(client: Socket, payload: PlayerInfoPayload): void {
        const allInformation = this.gameRoomService.getAllInformationPlayer(payload.player, payload.roomCode);
        client.emit(SocketWaitRoomLabels.ToAllInformation, allInformation);
    }

    /**
     * Retrieves all global information for a specific room and emits it to all clients in the room.
     *
     * @param client - The client socket requesting the global information.
     * @param payload - The payload containing the room code.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetAllGlobalInfo)
    handleGetAll(client: Socket, payload: RoomCodeInterface): void {
        const allGlobalInfo = this.gameRoomService.games.get(payload.roomCode);
        client.emit(SocketWaitRoomLabels.ToAllForGame, allGlobalInfo);
    }

    /**
     * Updates the number of victories for a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the current player, room code, and number of victories.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerVictories)
    handleUpdatePlayerVictories(client: Socket, payload: StatisticsUpdatePayload): void {
        this.statisticsService.updatePlayerVictories(payload.currentPlayer, payload.roomCode, payload.nbVictories);
    }

    /**
     * Updates the number of losses for a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the current player, room code, and number of losses.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerLose)
    handleUpdatePlayerLose(client: Socket, payload: StatisticsUpdatePayload): void {
        this.statisticsService.updatePlayerLose(payload.currentPlayer, payload.roomCode, payload.nbLoses);
    }

    /**
     * Updates the number of combats for a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the current player and room code.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerCombatCount)
    handleUpdatePlayerCombatCount(client: Socket, payload: StatisticsUpdatePayload): void {
        this.statisticsService.updateCombatCount(payload.currentPlayer, payload.roomCode, payload.theSecondPlayer);
    }

    /**
     * Updates the number of dodges for a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the current player and room code.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerDodgeCount)
    handleUpdateDodgeCombatCount(client: Socket, payload: UpdatePlayerDodgeCountInterface): void {
        this.statisticsService.updateDodgeCount(payload.currentPlayer, payload.roomCode);
    }

    /**
     * Updates the number of life lost for a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the player name, room code, and damage dealt.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerLifeLost)
    handleUpdatePlayerLifeLost(client: Socket, payload: DamagePayload): void {
        this.statisticsService.updateLifeLost(payload.playerName, payload.roomCode, payload.dealDamage);
    }

    /**
     * Updates the damage dealt by a player and emits the updated statistics.
     *
     * @param client - The client socket initiating the update.
     * @param payload - The payload containing the room code, player name, and damage dealt.
     */
    @SubscribeMessage(SocketEndGameStatistics.UpdatePlayerDamages)
    handleUpdatePlayerDamages(client: Socket, payload: DamagePayload): void {
        this.statisticsService.updatePlayerDamages(payload.playerName, payload.roomCode, payload.dealDamage);
    }

    /**
     * Handles a player's choice of an attacker virtual player.
     *
     * @param client - The client socket sending the virtual player choice event.
     * @param roomCode - The room code where to add the virtual player.
     */
    @SubscribeMessage(SocketWaitRoomLabels.AddAttackerVirtualPlayer)
    async handleAddAttackerVirtualPlayer(client: Socket, roomCode: string): Promise<void> {
        await this.handleAddVirtualPlayer(client, roomCode, 'attacker');
    }

    /**
     * Handles a player's choice of a defensive virtual player.
     *
     * @param client - The client socket sending the virtual player choice event.
     * @param roomCode - The room code where to add the virtual player.
     */
    @SubscribeMessage(SocketWaitRoomLabels.AddDefensiveVirtualPlayer)
    async handleAddDefensiveVirtualPlayer(client: Socket, roomCode: string): Promise<void> {
        await this.handleAddVirtualPlayer(client, roomCode, 'defensive');
    }

    /**
     * Handles removing a virtual player from a room.
     *
     * @param client - The client socket sending the remove request.
     * @param payload - The payload containing the room code and player name.
     */
    @SubscribeMessage(SocketWaitRoomLabels.RemoveVirtualPlayer)
    async handleRemoveVirtualPlayer(client: Socket, payload: RoomAndPlayerInterface): Promise<void> {
        const result = await this.virtualPlayerService.removeVirtualPlayer(payload.roomCode, payload.playerName);

        if (result.error) {
            client.emit(SocketWaitRoomLabels.Error, { message: result.error });
            return;
        }

        const game = await this.gameRoomService.getGame(payload.roomCode);
        this.server.to(payload.roomCode).emit(SocketWaitRoomLabels.PlayersList, game.players);
    }

    /**
     * Updates player movement statistics and calculates percentage of map explored.
     *
     * @param currentPlayer - The player who moved.
     * @param roomCode - The room code where the movement occurred.
     */
    handlePathToMove(currentPlayer: Player, roomCode: string): void {
        const allGlobalInfo = this.games.get(roomCode);
        const key = `${currentPlayer.coordinate.x},${currentPlayer.coordinate.y}`;

        this.trackPlayerPosition(allGlobalInfo, key, currentPlayer.name);
        this.updateExplorationStatistics(allGlobalInfo, currentPlayer, roomCode);
    }

    /**
     * Initializes a new game room with default settings.
     *
     * @param roomCode - The code for the new room.
     * @param game - The game data.
     * @param client - The client socket that created the room.
     */
    initializeNewRoom(roomCode: string, game: Game, client: Socket): void {
        this.gameRoomService.createSelectPlayerRoom(roomCode);
        this.selectionPlayerRoom.set(roomCode, new Set());
        this.rooms.add(roomCode);

        const gameData: GameData = {
            pin: roomCode,
            players: [],
            isLocked: false,
            updateMap: [],
            game,
            size: game.size,
            playerPositions: {},
            pourcentagePlayerScareModeved: {},
            glocalStatistics: {
                allTime: 0,
                percentageOfTile: 0,
                percentageOfDors: 0,
                nbrPlayerOpenDoor: 0,
                secondTime: 0,
                allDoors: [],
                nbOfTakenFleg: 0,
            },
        };

        this.games.set(roomCode, gameData);
        client.join(roomCode);

        const playerGame = this.games.get(roomCode);
        this.initializeDoors(playerGame);

        client.emit(SocketWaitRoomLabels.RoomCreated, roomCode);
    }

    /**
     * Initializes doors tracking for a game.
     *
     * @param playerGame - The game data with map information.
     */
    initializeDoors(playerGame: GameData): void {
        for (const tile of playerGame.game.map) {
            if (tile.type === 'Porte') {
                playerGame.glocalStatistics.allDoors.push({
                    coordinate: tile.position,
                    isManipulated: false,
                });
            }
        }
    }

    /**
     * Handles the process of kicking a player from a room.
     *
     * @param roomCode - The room code.
     * @param player - The player to kick.
     * @param client - The client socket that initiated the kick.
     * @param players - The updated player list.
     */
    handlePlayerKick(roomCode: string, player: Player, client: Socket, players: Player[]): void {
        const kickedSocket = this.socketMap.get(player.name);

        if (kickedSocket) {
            kickedSocket.emit(SocketWaitRoomLabels.Kicked, {
                message: 'Vous avez été expulsé de la salle par administrateur.',
                redirect: '/home',
            });
            kickedSocket.leave(roomCode);
            this.socketMap.delete(player.name);
        }

        this.server.to(roomCode).emit(SocketWaitRoomLabels.PlayersList, players);
        client.emit(SocketWaitRoomLabels.KickResponse, {
            success: true,
            redirect: '/home',
            allPlayers: players,
        });
    }

    /**
     * Adds a virtual player to the game room.
     *
     * @param client - The client socket.
     * @param roomCode - The room code.
     * @param type - The type of virtual player ('attacker' or 'defensive').
     */
    async handleAddVirtualPlayer(client: Socket, roomCode: string, type: 'attacker' | 'defensive'): Promise<void> {
        const service = this.virtualPlayerService;
        const result = type === 'attacker' ? await service.addAttackerVirtualPlayer(roomCode) : await service.addDefensiveVirtualPlayer(roomCode);

        if ('error' in result) {
            client.emit(SocketWaitRoomLabels.Error, { message: result.error });
            return;
        }

        const game = await this.gameRoomService.getGame(roomCode);
        if (game) {
            this.server.to(roomCode).emit(SocketWaitRoomLabels.PlayersList, game.players);
        }
    }

    /**
     * Tracks a player's position in the game.
     *
     * @param gameInfo - The game information.
     * @param positionKey - The position key (x,y format).
     * @param playerName - The player's name.
     */
    trackPlayerPosition(gameInfo: GameData & { isDebugMode?: boolean }, positionKey: string, playerName: string): void {
        if (!gameInfo.playerPositions[positionKey]) {
            gameInfo.playerPositions[positionKey] = [];
        }

        if (!gameInfo.playerPositions[positionKey].includes(playerName)) {
            gameInfo.playerPositions[positionKey].push(playerName);
        }
    }

    /**
     * Updates exploration statistics for a player.
     *
     * @param gameInfo - The game information.
     * @param player - The player.
     * @param roomCode - The room code.
     */
    updateExplorationStatistics(gameInfo: GameData & { isDebugMode?: boolean }, player: Player, roomCode: string): void {
        const playerName = player.name;
        const totalTileCount = Object.keys(gameInfo.playerPositions).length;
        let playerPositionCount = 0;

        for (const players of Object.values(gameInfo.playerPositions)) {
            playerPositionCount += players.filter((p) => p === playerName).length;
        }

        gameInfo.pourcentagePlayerScareModeved[playerName] = playerPositionCount;

        this.updateMapExplorationPercentage(gameInfo, playerName, playerPositionCount, totalTileCount, roomCode);
    }

    /**
     * Updates the map exploration percentage based on map size.
     *
     * @param gameInfo - The game information.
     * @param playerName - The player's name.
     * @param playerPositionCount - Number of positions visited by player.
     * @param totalTileCount - Total number of tiles visited.
     * @param roomCode - The room code.
     */
    private updateMapExplorationPercentage(
        gameInfo: GameData & { isDebugMode?: boolean },
        playerName: string,
        playerPositionCount: number,
        totalTileCount: number,
        roomCode: string,
    ): void {
        const mapSize = gameInfo.game.size;
        let gridSize: number;

        switch (mapSize) {
            case 'Grande Taille':
                gridSize = MAP_GRID_SIZE.large;
                break;
            case 'Moyenne Taille':
                gridSize = MAP_GRID_SIZE.medium;
                break;
            case 'Petite Taille':
                gridSize = MAP_GRID_SIZE.small;
                break;
            default:
                return;
        }

        const playerPercentage = Math.ceil((playerPositionCount / gridSize) * POURCENTAGE_CALCULATION);
        const totalPercentage = Math.ceil((totalTileCount / gridSize) * POURCENTAGE_CALCULATION);

        this.statisticsService.updatePlayerPourcentageTile(playerName, roomCode, playerPercentage);
        gameInfo.glocalStatistics.percentageOfTile = totalPercentage;
    }
}
