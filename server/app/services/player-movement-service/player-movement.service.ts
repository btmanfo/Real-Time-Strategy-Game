import { ANIMATION_INTERVAL, CHESTBOX_NAME, ITEM_TYPES } from '@app/constants/constants';
import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Game, GameData, Item, Player, PlayerMovementParams, Position, Tile } from '@common/interfaces';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
@Injectable()
export class PlayerMovementService {
    constructor(
        @Inject(forwardRef(() => GameRoomGateway))
        private readonly gameGateway: GameRoomGateway,
        @Inject(forwardRef(() => GameRoomService))
        private readonly gameRoomService: GameRoomService,
        @Inject(forwardRef(() => GameLogGateway))
        private readonly gameLogGateway: GameLogGateway,
        @Inject(forwardRef(() => PlayingManagerService))
        private readonly playingManagerService: PlayingManagerService,
    ) {}

    get _gameLogGateway(): GameLogGateway {
        return this.gameLogGateway;
    }
    /**
     * Animates a player's movement by emitting an 'animatePlayerMove' event with the movement path.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the movement animation should be broadcast.
     * @param {Tile[]} path - The sequence of tiles representing the player's movement path.
     * @param {Player} currentPlayer - The player performing the movement.
     * @param {Map<string, GameData>} games - A map containing game data for all active rooms.
     */
    animatePlayerMove(server: Server, roomCode: string, path: Tile[], currentPlayer: Player, game: Game): void {
        let index = 1;
        const interval = setInterval(() => {
            if (index < path.length) {
                const nextTile = path[index];
                const previousTile = path[index - 1];

                this.handleTileTransition(previousTile, nextTile, currentPlayer, roomCode);
                if (this.isItemOnTile(nextTile)) {
                    this.handleItemPickup(server, interval, { tile: nextTile, player: currentPlayer, roomCode, path, tileIndex: index });
                    return;
                }

                this.emitMovePlayer(server, roomCode, nextTile, previousTile, currentPlayer);
                this.playingManagerService.endGameCtf(server, roomCode, currentPlayer, game);
                index++;
            } else {
                this.endAnimation(interval, currentPlayer, server, roomCode, 0);
            }
        }, ANIMATION_INTERVAL);
    }

    /**
     * Toggles the door state by emitting a 'toggleDoor' event to all clients in the room.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the door is located.
     * @param {Tile} tile - The tile representing the door to be toggled.
     */
    toggleDoor(server: Server, roomCode: string, tile: Tile): void {
        server.to(roomCode).emit(SocketPlayerMovementLabels.ToggleDoor, tile);
    }

    /**
     * Emits an event indicating that a player has moved, along with the new position.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the movement occurred.
     * @param {Player} loser - The player who moved (or is affected by movement, context-dependent).
     * @param {Position} nextPosition - The new position of the player.
     */
    playerMoved(server: Server, roomCode: string, loser: Player, nextPosition: Position) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.PlayerMoved, { loser, nextPosition });
    }

    /**
     * Emits an event indicating that a player has chosen an item.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {object} data - The data containing the item and player information.
     */
    choseItem(server: Server, data: { item: Item; playerPosition: Position; roomCode: string }) {
        server.to(data.roomCode).emit(SocketPlayerMovementLabels.ItemChoice, data);
    }

    /**
     * Notifies all clients in a room about a player's inventory update.
     * This is especially important for the flag in CTF mode.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier.
     * @param {Player} currentPlayer - The player whose inventory has changed.
     */
    notifyInventoryUpdate(server: Server, roomCode: string, currentPlayer: Player): void {
        const newPlayer = { ...currentPlayer };
        const playerList = this.playingManagerService.gamesPlayers.get(roomCode);
        playerList.find((player) => player.name === currentPlayer.name).inventory = newPlayer.inventory;
        server.to(roomCode).emit(SocketPlayerMovementLabels.InventoryUpdate, {
            playerName: currentPlayer.name,
            inventory: currentPlayer.inventory,
        });
    }

    private handleTileTransition(previousTile: Tile | null, nextTile: Tile, player: Player, roomCode: string): void {
        this.setPlayerToNull(previousTile);
        this.setPlayerToNewTile(player, nextTile, roomCode);
    }

    private isItemOnTile(tile: Tile): boolean {
        return !!tile.item?.name && tile.item.name !== ITEM_TYPES.spawn;
    }

    private handleItemPickup(server: Server, interval: NodeJS.Timer, playerMovementParams: PlayerMovementParams): void {
        if (this.manageItemPickupBot(server, interval, playerMovementParams)) {
            return;
        }
        this.addItemInventory(playerMovementParams.tile, playerMovementParams.player, playerMovementParams.roomCode, server);
        playerMovementParams.tile.item = { name: '', description: '', image: '' } as Item;
        const countNumberOfTilesLeft = this.countTilesLeft(playerMovementParams.path, playerMovementParams.tileIndex);
        this.emitMovePlayer(
            server,
            playerMovementParams.roomCode,
            playerMovementParams.tile,
            playerMovementParams.path[playerMovementParams.tileIndex - 1],
            playerMovementParams.player,
        );
        this.endAnimation(interval, playerMovementParams.player, server, playerMovementParams.roomCode, countNumberOfTilesLeft);
    }

    private manageItemPickupBot(server: Server, interval: NodeJS.Timer, playerMovementParams: PlayerMovementParams): boolean {
        if (playerMovementParams.player.inventory.length === 2 && playerMovementParams.player.isVirtualPlayer) {
            if (playerMovementParams.tile.item.name === 'chestbox-2') {
                const oldItem = { ...playerMovementParams.player.inventory[0] };
                const flag = { ...playerMovementParams.tile.item };
                playerMovementParams.tile.item = oldItem;
                playerMovementParams.player.inventory[0] = flag;
                this.addItemInventory(playerMovementParams.tile, playerMovementParams.player, playerMovementParams.roomCode, server);
            }
            this.emitMovePlayer(
                server,
                playerMovementParams.roomCode,
                playerMovementParams.tile,
                playerMovementParams.path[playerMovementParams.tileIndex - 1],
                playerMovementParams.player,
            );
            const countNumberOfTilesLeft = this.countTilesLeft(playerMovementParams.path, playerMovementParams.tileIndex);
            this.endAnimation(interval, playerMovementParams.player, server, playerMovementParams.roomCode, countNumberOfTilesLeft);
            return true;
        }
        return false;
    }

    /**
     * Adds an item to a player's inventory if the item is present on the current tile.
     * If the item is a specific type (e.g., 'chestbox-2'), it updates the player's inventory in the game state.
     *
     * @param {Tile} currentTile - The tile where the player is currently located.
     * @param {Player} player - The player whose inventory is being updated.
     * @param {string} roomCode - The room identifier where the player is located.
     * @param {Server} server - The socket.io server instance.
     */
    private addItemInventory(currentTile: Tile, player: Player, roomCode: string, server: Server): void {
        const gameGateway = this.gameGateway.games.get(roomCode);
        const currentGame = this.gameRoomService.games.get(roomCode);
        const currentPlayer = this.gameRoomService.getPlayer(roomCode, player.name);

        this.updatePlayerItemsUsed(currentPlayer, currentTile);
        const numberOfPlayerWithFlag = this.countPlayersWithFlag(currentGame);
        gameGateway.glocalStatistics.nbOfTakenFleg = numberOfPlayerWithFlag;

        this.updatePlayerInventory(currentTile, player, roomCode, server);

        const logMessage = this.generateLogMessage(currentTile, player);
        this.logItemEvent(logMessage, player, roomCode);
    }

    private updatePlayerItemsUsed(player: Player, currentTile: Tile): void {
        const itemName = { name: currentTile.item.name };

        if (!player.itemsUsed) {
            player.itemsUsed = [];
        }
        if (!player.itemsUsed.includes(itemName)) {
            player.itemsUsed.push(itemName);
        }
        player.stats.nbItem = player.itemsUsed.length;
    }

    private countPlayersWithFlag(currentGame: GameData): number {
        let numberOfPlayerWithFlag = 0;

        if (!currentGame.players) {
            return numberOfPlayerWithFlag;
        }
        for (const myCurrentPlayer of currentGame.players) {
            if (!myCurrentPlayer.itemsUsed) {
                continue;
            }
            for (const playerItem of myCurrentPlayer.itemsUsed) {
                if (playerItem.name === CHESTBOX_NAME) {
                    numberOfPlayerWithFlag += 1;
                }
            }
        }

        return numberOfPlayerWithFlag;
    }

    private updatePlayerInventory(currentTile: Tile, currentPlayer: Player, roomCode: string, server: Server): void {
        if (!(currentTile.item && currentPlayer.inventory)) return;
        currentPlayer.inventory.push(currentTile.item);

        if (!currentTile.item.name) return;
        const playersInRoom = this.playingManagerService.gamesPlayers.get(roomCode);

        if (!playersInRoom) return;
        const playerToUpdate = playersInRoom.find((player) => player.name === currentPlayer.name);

        if (playerToUpdate) {
            playerToUpdate.inventory = currentPlayer.inventory;
        }
        this.notifyInventoryUpdate(server, roomCode, currentPlayer);
    }

    private generateLogMessage(currentTile: Tile, player: Player): string {
        if (currentTile.item.name === CHESTBOX_NAME) {
            return `${player.name} a capturé le drapeau `;
        }
        return `${player.name} a ramassé l'objet ${currentTile.item.name}`;
    }

    private logItemEvent(logMessage: string, player: Player, roomCode: string): void {
        const payload = {
            type: 'item',
            event: logMessage,
            players: [player],
            room: roomCode,
        };
        this.gameLogGateway.handleSendGameLog(null, payload);
    }
    /**
     * Ends the animation for a player by clearing the interval and updating the player's coordinate.
     *
     * @param {NodeJS.Timer} interval - The interval timer for the animation.
     * @param {Player} currentPlayer - The player whose animation is ending.
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the animation is taking place.
     * @param {number} countNumberOfTilesLeft - The number of tiles left in the path.
     */
    private endAnimation(interval: NodeJS.Timer, currentPlayer: Player, server: Server, roomCode: string, countNumberOfTilesLeft: number): void {
        clearInterval(interval);
        const playerTurn = this.playingManagerService.gamesPlayerTurn.get(roomCode);
        const players = this.playingManagerService.gamesPlayers.get(roomCode);
        currentPlayer.coordinate = playerTurn.coordinate;
        const foundPlayer = players.find((player) => player.name === currentPlayer.name);
        foundPlayer.coordinate = currentPlayer.coordinate;
        server.to(roomCode).emit(SocketPlayerMovementLabels.EndAnimation, { player: currentPlayer, countNumberOfTilesLeft });
    }

    /**
     * Sets the player to a new tile and updates the player's coordinate.
     *
     * @param {Player} playerToMove - The player who is moving.
     * @param {Tile} currentTile - The tile where the player is moving to.
     * @param {string} roomCode - The room identifier where the movement occurs.
     */
    private setPlayerToNewTile(playerToMove: Player, currentTile: Tile, roomCode: string): void {
        currentTile.player = playerToMove;
        playerToMove.coordinate = currentTile.position;
        this.gameGateway.handlePathToMove(playerToMove, roomCode);
    }

    /**
     * Sets the player's position to null on the previous tile.
     *
     * @param {Tile} previousTile - The tile where the player was before moving.
     */
    private setPlayerToNull(previousTile: Tile): void {
        previousTile.player = null;
    }

    /**
     * Counts the number of tiles left in the path after the current index.
     *
     * @param {Tile[]} path - The array of tiles representing the player's movement path.
     * @param {number} currentTileIndex - The current index in the path.
     * @returns {number} The count of tiles left in the path after the current index.
     */
    private countTilesLeft(path: Tile[], currentTileIndex: number): number {
        let countNumberOfTilesLeft = 0;
        for (let i = 0; i < path.length; i++) {
            if (i > currentTileIndex) {
                countNumberOfTilesLeft++;
            }
        }
        return countNumberOfTilesLeft;
    }

    /**
     * Emits an event to notify all clients in the room about a player's movement.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the movement occurred.
     * @param {Tile} nextTile - The tile where the player moved to.
     * @param {Tile} previousTile - The tile where the player moved from.
     * @param {Player} player - The player who moved.
     */
    private emitMovePlayer(server: Server, roomCode: string, nextTile: Tile, previousTile: Tile, player: Player): void {
        server.to(roomCode).emit(SocketPlayerMovementLabels.MovePlayer, { nextTile, previousTile, player });
    }
}
