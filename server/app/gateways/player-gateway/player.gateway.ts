/* eslint-disable max-lines */
// Le nombre de lignes est élevé à cause du nombre élevé d'interfaces
import { POURCENTAGE_CALCULATION, TIME_BEFORE_TURN } from '@app/constants/constants';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { CombatService } from '@app/services/combat-service/combat.service';
import { PlayerMovementService } from '@app/services/player-movement-service/player-movement.service';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { TimeService } from '@app/services/time-service/time.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import {
    CharacterPayload,
    CombatPayload,
    GameData,
    ItemChoicePayload,
    MessagePayload,
    Player,
    PlayerMovePayload,
    PlayerPathPayload,
    RoomCodePayload,
    Tile,
} from '@common/interfaces';
import { forwardRef, Inject } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class PlayerGateway {
    @WebSocketServer() server: Server;
    // Tous ces services et Gateway sont nécéssaires pour gérer les évènements liés aux joueurs
    // eslint-disable-next-line max-params
    constructor(
        @Inject(forwardRef(() => PlayerMovementService))
        private readonly playerMovementService: PlayerMovementService,
        @Inject(forwardRef(() => TurnService))
        private readonly turnService: TurnService,
        @Inject(forwardRef(() => TimeService))
        private readonly timeService: TimeService,
        @Inject(forwardRef(() => GameRoomGateway))
        private readonly gameRoomGateway: GameRoomGateway,
        @Inject(forwardRef(() => CombatService))
        private readonly combatService: CombatService,
        @Inject(forwardRef(() => PlayingManagerService))
        private readonly playingManagerService: PlayingManagerService,
    ) {}

    /**
     * Handles the 'sendMessageCombatRoom' event received from a client.
     *
     * @param client - The client socket that sent the message.
     * @param payload - An object containing the roomCode and the message.
     */
    @SubscribeMessage(SocketWaitRoomLabels.SendMessageCombatRoom)
    handleSendMessage(client: Socket, payload: MessagePayload): void {
        client.emit(SocketWaitRoomLabels.OnSendMessageCombatRoom, {
            message: payload.message,
            roomCode: payload.roomCode,
            userName: payload.userName,
        });
    }

    /**
     * Handles a client request to join the room designated for player selection.
     * It verifies the room's existence, adds the client's socket ID to the selection set,
     * and notifies all clients in the room.
     *
     * @param client - The client socket requesting to join the selection room.
     * @param roomCode - The room code to join for player selection.
     */
    @SubscribeMessage(SocketWaitRoomLabels.JoinRoomSelectPlayer)
    handleJoinRoomSelectPlayer(client: Socket, roomCode: string): void {
        if (!this.isRoomValid(client, roomCode)) {
            return;
        }

        const players = this.gameRoomGateway.selectionPlayerRoom.get(roomCode);
        players.add(client.id);

        client.join(roomCode);
        this.server.to(roomCode).emit(SocketWaitRoomLabels.PlayerJoined, { playerId: client.id, roomCode });
    }

    /**
     * Handles a character selection event by verifying the room's existence and emitting an event
     * to notify clients to deselect the previous character.
     *
     * @param client - The client socket initiating the character selection.
     * @param payload - The payload containing the room code, player information, and the selected avatar URL.
     */
    @SubscribeMessage(SocketWaitRoomLabels.CharacterSelected)
    handleCharacterSelected(client: Socket, payload: CharacterPayload): void {
        if (!this.isRoomValid(client, payload.roomCode)) {
            return;
        }

        this.server.emit(SocketWaitRoomLabels.TheCharacterToDeselect, {
            theUrlOfSelectPlayer: payload.avatarUrl,
            theRoomCodeToDesable: payload.roomCode,
        });
    }

    /**
     * Handles a character deselection event by emitting an event to notify clients.
     *
     * @param client - The client socket initiating the character deselection.
     * @param payload - The payload containing the room code and the avatar URL to be deselected.
     */
    @SubscribeMessage(SocketWaitRoomLabels.CharacterDeselected)
    handleCharacterDeselected(client: Socket, payload: CharacterPayload): void {
        this.server.emit(SocketWaitRoomLabels.TheCharacterDeselected, {
            theUrlOfSelectPlayer: payload.avatarUrl,
            theRoomCodeToDesable: payload.roomCode,
        });
    }

    /**
     * Retrieves all global information for a specific room and emits it to the requesting client.
     *
     * @param client - The client socket requesting the global information.
     * @param payload - The payload containing the room code.
     */
    @SubscribeMessage(SocketWaitRoomLabels.GetAllGlobalInfo)
    handleGetAllGlobalInfo(client: Socket, payload: RoomCodePayload): void {
        const gameData = this.gameRoomGateway.games.get(payload.roomCode);
        if (!gameData) {
            this.sendError(client, `Room ${payload.roomCode} not found.`);
            return;
        }

        client.emit(SocketWaitRoomLabels.ToAllGlobalInfo, gameData.glocalStatistics);
    }

    /**
     * Initiates a fight by delegating to the player movement service to emit a 'startFight' event.
     *
     * @param client - The client socket initiating the fight.
     * @param data - The game data containing room code, players, and other necessary information.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.StartFight)
    handleStartFight(client: Socket, data: GameData): void {
        this.timeService.stopTimer(data.roomCode);
        this.combatService.startFight(this.server, data.roomCode, data.players, this.gameRoomGateway.games);
    }

    /**
     * Handles a player's move animation by delegating to the player movement service to animate movement.
     *
     * @param client - The client socket initiating the move animation.
     * @param data - The game data containing room code, movement path, and player information.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.AnimatePlayerMove)
    handleAnimatePlayerMove(client: Socket, data: GameData): void {
        const { roomCode, map: path, player, game } = data;
        this.playerMovementService.animatePlayerMove(this.server, roomCode, path, player, game);
    }

    /**
     * Toggles a door's state in the game by delegating to the player movement service.
     *
     * @param client - The client socket initiating the toggle door request.
     * @param data - The game data containing the room code and the tile representing the door.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.ToggleDoor)
    handleToggleDoor(client: Socket, data: GameData): void {
        const gameData = this.gameRoomGateway.games.get(data.roomCode);
        if (!gameData || !data.tile) {
            return;
        }

        this.playerMovementService.toggleDoor(this.server, data.roomCode, data.tile);
        this.updateDoorManipulationStatus(gameData, data.tile);
        this.calculateDoorManipulationPercentage(data.roomCode);
    }

    /**
     * Sends an update about a combat situation by delegating to the player movement service to emit a 'combatUpdate' event.
     *
     * @param client - The client socket sending the combat update.
     * @param payload - The payload containing the room code and combatant details.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.CombatUpdate)
    handleCombatUpdate(client: Socket, payload: CombatPayload): void {
        this.combatService.combatUpdate(this.server, payload.roomCode, payload.attacker, payload.defender);
    }

    /**
     * Notifies clients that a player has escaped from combat by delegating to the player movement service.
     *
     * @param client - The client socket sending the escape event.
     * @param payload - The payload containing the room code and the identifier of the escaping player.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.CombatEscaped)
    handleCombatEscaped(client: Socket, payload: CombatPayload): void {
        this.combatService.combatEscaped(this.server, payload.roomCode, payload.escapee);
    }

    /**
     * Concludes a combat by delegating to the player movement service to emit a 'combatEnded' event with winner and loser details.
     *
     * @param client - The client socket sending the combat end event.
     * @param payload - The payload containing the room code, winner, and loser.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.CombatEnded)
    handleCombatEnded(client: Socket, payload: CombatPayload): void {
        this.combatService.combatEnded(this.server, payload.roomCode, payload.winner, payload.loser);
        this.restartTimerAfterCombat(payload.roomCode);
    }

    /**
     * Notifies clients about a player's new position by delegating to the player movement service.
     *
     * @param client - The client socket sending the movement event.
     * @param payload - The payload containing the room code, player information, and the new position.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.PlayerMoved)
    handlePlayerMoved(client: Socket, payload: PlayerMovePayload): void {
        this.playerMovementService.playerMoved(this.server, payload.roomCode, payload.player, payload.nextPosition);
    }

    /**
     * Changes the debug mode state for a room by delegating to the player movement service.
     *
     * @param client - The client socket sending the debug mode change event.
     * @param data - The payload containing the room code and the new debug mode state.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.DebugModeChanged)
    handleDebugModeChange(client: Socket, data: { roomCode: string; isDebugMode: boolean }): void {
        this.playingManagerService.debugModeChanged(this.server, data.roomCode, data.isDebugMode);
    }

    /**
     * Sends combat roll bonuses for both attacker and defender by delegating to the player movement service.
     *
     * @param client - The client socket sending the combat roll event.
     * @param payload - The payload containing the room code and combat bonus values.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.CombatRolls)
    handleCombatRolls(client: Socket, payload: CombatPayload): void {
        this.combatService.combatRolls(this.server, payload.roomCode, payload.attackerBonus, payload.defenderBonus);
    }

    /**
     * Concludes the game by declaring a winner and notifying all clients in the room.
     *
     * @param client - The client socket sending the end game event.
     * @param payload - The payload containing the room code and the winner's identifier.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.EndGameWinVictories)
    handleEndGameWinVictories(client: Socket, payload: { roomCode: string; winner: string }): void {
        const gameData = this.gameRoomGateway.games.get(payload.roomCode);
        if (!gameData || gameData.game.gameMode === 'CTF') {
            return;
        }

        this.endGame(payload.roomCode, payload.winner);
    }

    /**
     * Handles a player's choice of item by delegating to the player movement service.
     *
     * @param client - The client socket sending the item choice event.
     * @param data - The payload containing the chosen item, player position, and room code.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.ItemChoice)
    handleItemChoice(client: Socket, data: ItemChoicePayload): void {
        this.playerMovementService.choseItem(this.server, data);
    }

    /**
     * Handles a player's movement request by delegating to the player movement service to animate the move.
     *
     * @param client - The client socket sending the movement request.
     * @param data - The payload containing the movement path, player information, and room code.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.StartMoving)
    handleMovePlayer(client: Socket, data: PlayerPathPayload): void {
        const gameData = this.gameRoomGateway.games.get(data.roomCode);
        if (!gameData) {
            return;
        }

        this.playerMovementService.animatePlayerMove(this.server, data.roomCode, data.path, data.player, gameData.game);
    }

    /**
     * Updates a player's inventory and notifies clients.
     *
     * @param client - The client socket requesting the inventory update.
     * @param data - The payload containing room code and player information.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.InventoryUpdate)
    handleInventoryUpdate(client: Socket, data: { roomCode: string; player: Player }): void {
        this.playerMovementService.notifyInventoryUpdate(this.server, data.roomCode, data.player);
    }

    /**
     * Starts the game by delegating to the player movement service, initializing game data and emitting a 'startGame' event.
     *
     * @param client - The client socket initiating the game start.
     * @param data - The game data containing room code, players, and game state information.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.StartGame)
    handleStartGame(client: Socket, data: GameData): void {
        this.playingManagerService.startGame(this.server, data.roomCode, data.players, this.gameRoomGateway.games);
    }

    /**
     * Handles a player's request to quit the game by delegating to the player movement service
     * and emitting appropriate events.
     *
     * @param client - The client socket initiating the quit request.
     * @param data - The game data containing room code, player, and map information.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.QuitGame)
    handleQuitGame(client: Socket, data: GameData): void {
        this.playingManagerService.quitGame(this.server, data.roomCode, data.player, data.map, this.gameRoomGateway.games);

        if (this.handleCurrentPlayerQuit(client, data)) {
            client.leave(data.roomCode);
            return;
        }

        this.playingManagerService.debugModeChanged(this.server, data.roomCode, false);
        this.server.socketsLeave(data.roomCode);
    }

    /**
     * Ends the current turn by delegating to the player movement service to emit an 'endTurn' event.
     *
     * @param client - The client socket initiating the end turn request.
     * @param data - The game data containing the room code.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.EndTurn)
    handleEndTurn(client: Socket, data: GameData): void {
        this.turnService.endTurn(this.server, data.roomCode);
        this.resetTimer(data.roomCode);
    }

    /**
     * Restarts the timer for a player's turn.
     *
     * @param client - The client socket requesting timer restart.
     * @param data - The payload containing room code and new time value.
     */
    @SubscribeMessage(SocketPlayerMovementLabels.RestartTimer)
    handleRestartTimer(client: Socket, data: { roomCode: string; time: number }): void {
        const currentPlayer = this.playingManagerService.gamesPlayerTurn.get(data.roomCode);
        this.timeService.startTimer(data.time, this.server, data.roomCode, currentPlayer);
    }

    @SubscribeMessage(SocketPlayerMovementLabels.RestartTurn)
    handleRestartTurn(client: Socket, data: { roomCode: string; player: Player }): void {
        this.server.to(data.roomCode).emit(SocketPlayerMovementLabels.RestartTurn, {
            player: data.player,
        });
    }

    /**
     * Animates a virtual player's movement by delegating to the player movement service.
     *
     * @param roomCode - The room code where the virtual player is located.
     * @param path - The path of tiles for the virtual player's movement.
     * @param player - The virtual player object containing information about the player.
     */
    vitualPlayerAnimate(roomCode: string, path: Tile[], player: Player): void {
        const gameData = this.gameRoomGateway.games.get(roomCode);
        if (!gameData) {
            return;
        }

        this.playerMovementService.animatePlayerMove(this.server, roomCode, path, player, gameData.game);
    }

    /**
     * Emits a virtual player event to all clients in the specified room.
     *
     * @param roomCode - The room code where the virtual player is located.
     * @param virtualPlayer - The virtual player object containing information about the player.
     */
    emitVirtualPlayer(roomCode: string, virtualPlayer: Player): void {
        this.server.emit(SocketWaitRoomLabels.EmitVirtualPlayer, {
            codeRoom: roomCode,
            currentPlayer: virtualPlayer,
        });
    }

    /**
     * Calculates the percentage of doors that have been manipulated in a room.
     *
     * @param roomCode - The room code to calculate door manipulation for.
     * @returns The percentage of manipulated doors, or 0 if no data is available.
     */
    calculateDoorManipulationPercentage(roomCode: string): number {
        const gameData = this.gameRoomGateway.games.get(roomCode);
        if (!gameData || !gameData.glocalStatistics) {
            return 0;
        }

        const allDoors = gameData.glocalStatistics.allDoors;
        const totalDoors = allDoors.length;

        if (totalDoors === 0) {
            return 0;
        }

        const manipulatedDoors = allDoors.filter((door) => door.isManipulated).length;
        const percentage = (manipulatedDoors / totalDoors) * POURCENTAGE_CALCULATION;

        gameData.glocalStatistics.percentageOfDors = percentage;
        return percentage;
    }

    /**
     * Verifies if a room exists and sends an error if not.
     *
     * @param client - The client socket to send errors to.
     * @param roomCode - The room code to verify.
     * @returns True if the room exists, false otherwise.
     */
    private isRoomValid(client: Socket, roomCode: string): boolean {
        if (!this.gameRoomGateway.rooms.has(roomCode)) {
            this.sendError(client, `Room ${roomCode} does not exist.`);
            return false;
        }
        return true;
    }

    /**
     * Sends an error message to a client.
     *
     * @param client - The client socket to send the error to.
     * @param message - The error message.
     */
    private sendError(client: Socket, message: string): void {
        client.emit(SocketWaitRoomLabels.Error, { message });
    }

    /**
     * Updates the manipulation status of a door.
     *
     * @param gameData - The game data containing door information.
     * @param tile - The tile representing the door.
     */
    private updateDoorManipulationStatus(gameData: GameData, tile: Tile): void {
        const door = gameData.glocalStatistics?.allDoors.find((d) => d.coordinate.x === tile.position.x && d.coordinate.y === tile.position.y);

        if (door && !door.isManipulated) {
            door.isManipulated = true;
        }
    }

    /**
     * Handles the case where the current player quits the game.
     *
     * @param client - The client socket of the quitting player.
     * @param data - The game data containing player information.
     * @returns True if handled, false if not the current player.
     */
    private handleCurrentPlayerQuit(client: Socket, data: GameData): boolean {
        const currentTurn = this.playingManagerService.gamesPlayerTurn.get(data.roomCode);
        const players = this.playingManagerService.gamesPlayers.get(data.roomCode) || [];

        if (currentTurn && data.player.name === currentTurn.name && players.length > 1) {
            client.leave(data.roomCode);
            return true;
        } else if (players.length > 1) {
            this.restartTimerAfterCombat(data.roomCode);
            return true;
        }

        return false;
    }

    /**
     * Ends the game and cleans up.
     *
     * @param roomCode - The room code where the game is ending.
     * @param winner - The name of the winning player.
     */
    private endGame(roomCode: string, winner: string): void {
        this.playingManagerService.endGameWinVictories(this.server, roomCode, winner);
        this.playingManagerService.debugModeChanged(this.server, roomCode, false);
        this.timeService.stopTimer(roomCode);
        this.server.socketsLeave(roomCode);
    }

    /**
     * Resets the turn timer.
     *
     * @param roomCode - The room code to reset the timer for.
     */
    private resetTimer(roomCode: string): void {
        this.timeService.stopTimer(roomCode);
        const currentPlayer = this.playingManagerService.gamesPlayerTurn.get(roomCode);
        this.timeService.startTimer(TIME_BEFORE_TURN, this.server, roomCode, currentPlayer);
    }

    /**
     * Restarts the timer after combat ends.
     *
     * @param roomCode - The room code to restart the timer for.
     */
    private restartTimerAfterCombat(roomCode: string): void {
        const currentPlayer = this.playingManagerService.gamesPlayerTurn.get(roomCode);
        this.timeService.startTimer(this.timeService.gamesCounter.get(roomCode), this.server, roomCode, currentPlayer);
    }
}
