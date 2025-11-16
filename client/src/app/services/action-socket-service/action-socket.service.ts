/* eslint-disable max-params */
/**
 * Le constructeur injecte plusieurs services nécessaires pour gérer les fonctionnalités principales
 * de la classe, comme la gestion des sockets, des items, des mouvements, et des combats.
 */
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
    CHESTBOX_NAME,
    EndTurnPayload,
    InventoryUpdatePayload,
    ITEM_TYPES,
    ItemChoicePayload,
    MovePlayerPayload,
    SetPlayerPayload,
    SocketActionLabels,
    START_TIME_WITH_NO_ATTEMPT,
    TIME_BETWEEN_TURNS_MS,
} from '@app/constants/constants';
import { AnimatePlayerMoveHandle, CombatHandlerInterface, EscapedHandlerInterface } from '@app/interfaces/interface';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { GameService } from '@app/services/game-service/game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingItemsService } from '@app/services/playing-items-service/playing-items.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { Game, Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class ActionSocketService {
    tiles: Tile[] = [];
    private readonly socket: Socket;
    private isSocketEventsInitialized: boolean;
    private readonly socketEvents;

    constructor(
        private readonly playingService: PlayingService,
        private readonly router: Router,
        private readonly gameService: GameService,
        private readonly boardService: BoardService,
        private readonly notificationService: NotificationService,
        private readonly combatService: CombatService,
        private readonly movingGameService: MovingGameService,
        private readonly actionService: ActionService,
        private readonly playingItemsService: PlayingItemsService,
    ) {
        this.socket = this.playingService.joinGameService.socket;
        this.tiles = this.playingService.boardServiceValue.tiles;
        this.isSocketEventsInitialized = false;
        this.socketEvents = {
            [SocketActionLabels.EndTurn]: this.endTurnHandler,
            [SocketActionLabels.QuitGame]: this.quitGameHandler,
            [SocketActionLabels.AnimatePlayerMove]: this.animatePlayerMoveHandler,
            [SocketActionLabels.CombatEscaped]: this.combatEscapedHandler,
            [SocketActionLabels.CombatEnded]: this.combatEndedHandler,
            [SocketActionLabels.CombatUpdate]: this.combatUpdateHandler,
            [SocketActionLabels.ItemChoice]: this.itemChoiceHandler,
            [SocketActionLabels.MovePlayer]: this.movePlayerHandler,
            [SocketActionLabels.ToggleDoor]: this.toggleDoorHandler,
        };
    }

    manageSocketEvents(): void {
        if (this.isSocketEventsInitialized) return;
        this.isSocketEventsInitialized = true;
        this.destroySocketEvents();
        for (const [eventName, eventHandler] of Object.entries(this.socketEvents)) this.socket.on(eventName, eventHandler.bind(this));
        this.initializeSocketEvents();
    }

    destroySocketEvents(): void {
        for (const [eventName, eventHandler] of Object.entries(this.socketEvents)) this.socket.off(eventName, eventHandler);
    }

    endTurn(): void {
        const availableTiles = this.movingGameService.getAccessibleTiles();
        const isPlayerStuck = availableTiles.length === 1 && this.actionService.canAction === 2;
        const isMovementActionOver = !this.actionService.checkSurroundingTiles() && this.actionService.canAction === 0 && availableTiles.length === 1;
        if ((isPlayerStuck || isMovementActionOver) && !this.movingGameService.isPopupItemChoiceVisible)
            this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.EndTurn, {
                roomCode: this.playingService.joinGameService.pinCode,
            });
    }

    private initializeSocketEvents(): void {
        this.socket.on(SocketPlayerMovementLabels.InventoryUpdate, (data: InventoryUpdatePayload) => {
            this.handleInventoryUpdate(data);
        });
    }

    private handleInventoryUpdate(data: InventoryUpdatePayload): void {
        const player = this.playingService.players.find((p) => p.name === data.playerName);
        if (player) {
            player.inventory = data.inventory;
            this.playingService.players = [...this.playingService.players];
        }
    }

    private readonly movePlayerHandler = (data: MovePlayerPayload) => {
        const newIndexTile = this.playingService.boardServiceValue.tiles.findIndex((t) => {
            return data.nextTile.position.x === t.position.x && data.nextTile.position.y === t.position.y;
        });
        const oldIndexTile = this.playingService.boardServiceValue.tiles.findIndex((t) => {
            return data.previousTile.position.x === t.position.x && data.previousTile.position.y === t.position.y;
        });
        if (oldIndexTile !== -1) this.playingService.boardServiceValue.tiles[oldIndexTile].player = null;
        if (newIndexTile !== -1) {
            this.playingService.boardServiceValue.tiles[newIndexTile] = { ...data.nextTile, isHighlighted: false, isReachable: false };
            this.playingService.boardServiceValue.tiles[newIndexTile].player = data.player;
        }
        if (this.playingService.isPlayerTurn()) {
            this.movingGameService.isPopupItemChoiceVisible = (data.player.inventory ?? []).length === START_TIME_WITH_NO_ATTEMPT;
            this.movingGameService.movePoints -= data.nextTile.cost ?? 0;
            if (this.playingService.localPlayer && this.playingService.playerTurn) this.setPlayer(data);
        }
        this.socket.emit(SocketWaitRoomLabels.UpdateBoard, {
            roomCode: this.playingService.joinGameService.pinCode,
            board: this.playingService.boardServiceValue.tiles,
        });
    };

    private setPlayer(data: SetPlayerPayload) {
        if (this.playingService.localPlayer && this.playingService.playerTurn) {
            this.playingService.localPlayer.coordinate = data.nextTile.position;
            this.playingService.localPlayer.inventory = data.player.inventory;
            this.playingService.playerTurn.coordinate = data.nextTile.position;
            this.playingService.playerTurn.inventory = data.player.inventory;
        }
    }

    private readonly itemChoiceHandler = (data: ItemChoicePayload) => {
        const targetTile = this.boardService.tiles.find(
            (tile) => tile.position.x === data.playerPosition.x && tile.position.y === data.playerPosition.y,
        );
        if (!targetTile) return;
        if (this.playingService.isPlayerTurn() && this.playingService.localPlayer?.inventory) {
            const localPlayer = this.playingService.players.find((p) => p.name === this.playingService.localPlayer?.name);
            if (localPlayer) {
                const itemInventory = localPlayer.inventory?.find((item) => item.name === data.item.name);
                if (itemInventory && localPlayer.inventory) {
                    localPlayer.inventory = localPlayer.inventory.filter((item) => item.name !== data.item.name);
                }
            }
            this.playingService.localPlayer.inventory = this.playingService.localPlayer?.inventory.filter((item) => item.name !== data.item.name);
        }
        if (!this.playingService.isPlayerTurn() && data.item.name === CHESTBOX_NAME) {
            const name = this.boardService.tiles.find(
                (tile) => tile.position.x === data.playerPosition.x && tile.position.y === data.playerPosition.y,
            )?.player?.name;
            const droppingPlayer = this.playingService.players.find((p) => p.name === name);
            if (droppingPlayer) {
                droppingPlayer.inventory = droppingPlayer.inventory?.filter((item) => item.name !== data.item.name);
            }
        }

        targetTile.item = data.item;
        this.movingGameService.isPopupItemChoiceVisible = false;
    };

    private readonly endTurnHandler = (data: EndTurnPayload) => {
        if (data) {
            if (data.isNotification) {
                this.playingItemsService.replaceItem();
            }
            this.playingService.playerTurn = data.playerTurn;
            this.actionService.canAction = 0;
            this.playingService.currentMovingPoints = this.playingService.localPlayer?.speed as number;
            this.movingGameService.movePoints = this.playingService.localPlayer?.speed as number;
            this.movingGameService.setReachableForTiles([]);
            this.actionService.actionPlayer();
            this.updatePlayerTurn(data.playerTurn);
            this.choseItemStartTurn();
        }
    };

    private choseItemStartTurn() {
        if (this.playingService.isPlayerTurn()) {
            const playerTile = this.playingService.boardServiceValue.tiles.find(
                (tile) => tile.player?.name === this.playingService.localPlayer?.name,
            );
            if (playerTile?.item?.name && playerTile.item.name !== ITEM_TYPES.spawn) {
                this.playingService.localPlayer?.inventory?.push(playerTile.item);
                this.movingGameService.isPopupItemChoiceVisible = true;
            }
        }
    }

    private updatePlayerTurn(player: Player | null) {
        this.playingService.playerTurnSubject.next(player);
    }

    private readonly toggleDoorHandler = (tile: Tile) => {
        const i = this.playingService.boardServiceValue.tiles.findIndex((t) => {
            return tile.position.x === t.position.x && tile.position.y === t.position.y;
        });
        tile.isHighlighted = false;
        tile.isReachable = false;
        this.playingService.boardServiceValue.tiles[i] = tile;
        const availableTiles = this.movingGameService.getAccessibleTiles();
        this.socket.emit(SocketWaitRoomLabels.UpdateBoard, {
            roomCode: this.playingService.joinGameService.pinCode,
            board: this.playingService.boardServiceValue.tiles,
        });

        if (this.playingService.localPlayer?.name === this.playingService.playerTurn?.name)
            this.movingGameService.setReachableForTiles(availableTiles);
        this.actionService.checkEndTurn();
    };

    /**
     * Handles the event when a player quits the game.
     * @param players - The list of remaining players in the game.
     * @param map - The updated map of tiles after a player quits.
     */
    private readonly quitGameHandler = (players: Player[], map: Tile[]) => {
        if (!this.isPlayerStillInGame(players)) {
            if (this.playingService.isPlayerTurn()) {
                this.socket.emit(SocketPlayerMovementLabels.EndTurn, {
                    roomCode: this.playingService.joinGameService.pinCode,
                });
            } else {
                this.socket.emit(SocketPlayerMovementLabels.RestartTimer, {
                    roomCode: this.playingService.joinGameService.pinCode,
                    time: this.playingService.time,
                });
                this.socket.emit(SocketPlayerMovementLabels.RestartTurn, {
                    roomCode: this.playingService.joinGameService.pinCode,
                    player: { ...this.playingService.playerTurn },
                });
            }
            this.handlePlayerLeft();
            return;
        } else if (this.playingService.combat) this.handleCombatQuit(players);

        if (this.isOnlyOnePlayerLeft(players)) {
            this.handleOnlyOnePlayerLeft();
            return;
        }

        this.updateGameState(players, map);

        this.boardService.tiles = map;
        this.socket.emit(SocketWaitRoomLabels.UpdateBoard, {
            roomCode: this.playingService.joinGameService.pinCode,
            board: this.playingService.boardServiceValue.tiles,
        });
    };

    private isPlayerStillInGame(players: Player[]): boolean {
        return players.some((p) => p.name === this.playingService.localPlayer?.name);
    }

    private handlePlayerLeft(): void {
        this.playingService.isDebugMode = false;
        this.tiles = [];
        this.gameService.setNewGame({
            id: '',
            description: '',
            name: '',
            size: '0',
            map: [],
            players: [],
            status: '',
            gameMode: '',
            visibility: false,
            map2: [],
            modificationDate: '',
            screenshot: '',
        } as unknown as Game);
        this.router.navigate(['/home']);
        this.playingService.isPlaying = false;
        this.playingService.combat = false;
        this.playingService.players = [];
        this.playingService.localPlayer = null;
        this.playingService.playerTurn = null;
    }

    private isOnlyOnePlayerLeft(players: Player[]): boolean {
        return players.length === 1 && players[0].name === this.playingService.localPlayer?.name;
    }

    private handleOnlyOnePlayerLeft(): void {
        this.notificationService.showNotification('La partie est terminée, car il ne reste plus de joueurs', false);
        this.socket.emit(SocketPlayerMovementLabels.QuitGame, {
            roomCode: this.playingService.joinGameService.pinCode,
        });
        this.router.navigate(['/home']);
        this.playingService.isPlaying = false;
        this.playingService.combat = false;
    }

    private updateGameState(players: Player[], map: Tile[]): void {
        this.playingService.players = players;
        this.tiles = map;
    }

    private handleCombatQuit(players: Player[]): void {
        const quittingPlayerName = this.findMissingPlayerName(this.playingService.players, players);
        if (quittingPlayerName) this.combatService.handleOpponentQuit(quittingPlayerName);
        this.playingService.combat = false;
    }

    private findMissingPlayerName(previousPlayers: Player[], currentPlayers: Player[]): string | null {
        for (const prev of previousPlayers) {
            if (!currentPlayers.some((curr) => curr.name === prev.name)) return prev.name;
        }
        return null;
    }

    private readonly animatePlayerMoveHandler = (data: AnimatePlayerMoveHandle) => {
        this.movingGameService.animatePlayerMovement(data.map, data.player);
    };

    private readonly combatUpdateHandler = (data: { attacker: Player; defender: Player }) => {
        if (data.attacker.name && data.defender.name) {
            this.playingService.updatePlayerHealth(data.attacker.name, data.attacker.life);
            this.playingService.updatePlayerHealth(data.defender.name, data.defender.life);
        }
    };

    private readonly combatEndedHandler = (data: CombatHandlerInterface) => {
        this.playingService.updatePlayerVictories(data.winner, data.loser);
        this.playingService.combat = false;
        this.playingItemsService.dropLoserItems(data.loser);
        this.combatService.teleportLoserToSpawn(data.loser);
        this.handleCombatResult(data);
        this.handleTurnManagement(data);
        this.socket.emit(SocketWaitRoomLabels.UpdateBoard, {
            roomCode: this.playingService.joinGameService.pinCode,
            board: this.playingService.boardServiceValue.tiles,
        });
    };

    private handleCombatResult(data: { winner: string; loser: string }) {
        if (this.playingService.localPlayer?.name === data.winner) {
            this.notificationService.errorMessages = ['Vous avez remporté le combat'];
        } else if (this.playingService.localPlayer?.name === data.loser) {
            this.notificationService.errorMessages = ['Vous avez perdu le combat'];
        } else {
            this.notificationService.errorMessages = [`Combat terminé, ${data.winner} a gagné`];
        }
        this.notificationService.showModal = true;
    }

    private handleTurnManagement(data: CombatHandlerInterface) {
        if (this.playingService.playerTurn?.name === data.winner) {
            this.checkEndTurnConditions();
        } else if (this.playingService.playerTurn?.name === data.loser && this.playingService.isPlayerTurn()) {
            this.socket.emit(SocketPlayerMovementLabels.EndTurn, { roomCode: this.playingService.joinGameService.pinCode });
        }
    }

    private checkEndTurnConditions() {
        const availableTiles = this.movingGameService.getAccessibleTiles();
        const isLocalPlayerTurn = this.playingService.localPlayer?.name === this.playingService.playerTurn?.name;

        if (isLocalPlayerTurn) {
            const isPlayerStuck = availableTiles.length === 1 && this.actionService.canAction === 2;
            const isMovementActionOver =
                !this.actionService.checkSurroundingTiles() && this.actionService.canAction === 0 && availableTiles.length === 1;

            if (isPlayerStuck || isMovementActionOver) {
                this.socket.emit(SocketPlayerMovementLabels.EndTurn, { roomCode: this.playingService.joinGameService.pinCode });
            } else {
                this.hideNotificationAfterDelay();
            }
        } else {
            this.hideNotificationAfterDelay();
        }
    }

    private hideNotificationAfterDelay() {
        setTimeout(() => {
            this.notificationService.showModal = false;
            this.notificationService.errorMessages = [];
        }, TIME_BETWEEN_TURNS_MS);
    }

    private readonly combatEscapedHandler = (data: EscapedHandlerInterface) => {
        this.socket.emit(SocketPlayerMovementLabels.RestartTimer, {
            roomCode: this.playingService.joinGameService.pinCode,
            time: this.playingService.time,
        });
        this.playingService.combat = false;
        this.notificationService.showNotification('Combat fini, ' + data.escapee + ' a fui...', false);
    };
}
