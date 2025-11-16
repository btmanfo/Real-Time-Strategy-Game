/* eslint-disable max-params */
/**
 * Le constructeur injecte plusieurs services nécessaires pour gérer les fonctionnalités principales
 * de la classe, comme la gestion des sockets, des notifications, des mouvements, et des actions des bots.
 */
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CHESTBOX_NAME, SocketPlayingLabels, TIME_BETWEEN_TURNS_MS } from '@app/constants/constants';
import { DebugModeInterface, GameWinHandlerInterface, PlayerMovementHandlerInterface, VirtualPlayerEmit } from '@app/interfaces/interface';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { BotService } from '@app/services/bot-service/bot.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player, Position, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
@Injectable({
    providedIn: 'root',
})
export class PlayingSocketService {
    tiles: Tile[] = [];
    mockTile = {
        traversable: true,
        cost: 1,
        isHighlighted: false,
        isReachable: false,
        item: { name: '' },
        position: { x: 0, y: 0 },
    } as Tile;

    private readonly socket: Socket;
    private isSocketEventsInitialized: boolean;
    private readonly socketEvents;
    private playersInfFight: Player[] = [];

    constructor(
        private readonly playingService: PlayingService,
        private readonly router: Router,
        private readonly boardService: BoardService,
        private readonly notificationService: NotificationService,
        private readonly movingGameService: MovingGameService,
        private readonly actionService: ActionService,
        private readonly botService: BotService,
    ) {
        this.socket = this.playingService.joinGameService.socket;
        this.tiles = this.playingService.boardServiceValue.tiles;
        this.isSocketEventsInitialized = false;
        this.socketEvents = {
            [SocketPlayingLabels.EndGameWinVictories]: this.endGameWinHandler,
            [SocketPlayingLabels.PlayerMoved]: this.playerMovementHandler,
            [SocketPlayingLabels.DebugModeChanged]: this.debugModeChangedHandler,
            [SocketPlayingLabels.TimeIncrement]: this.timeIncrementHandler,
            [SocketPlayingLabels.NotificationTurn]: this.notificationTurnHandler,
            [SocketPlayingLabels.EndAnimation]: this.endAnimationHandler,
            [SocketPlayingLabels.StartFight]: this.startFightHandler,
            [SocketPlayingLabels.EndGameCtf]: this.endGameCtfHandler,
            [SocketPlayingLabels.EmitVirtualPlayer]: this.emitVirtualPlayer,
            [SocketPlayingLabels.RestartTurn]: this.restartTurnHandler,
        };
    }

    manageSocketEvents(): void {
        if (this.isSocketEventsInitialized) return;
        this.isSocketEventsInitialized = true;
        this.destroySocketEvents();
        for (const [eventName, eventHandler] of Object.entries(this.socketEvents)) this.socket.on(eventName, eventHandler.bind(this));
    }

    destroySocketEvents(): void {
        for (const [eventName, eventHandler] of Object.entries(this.socketEvents)) this.socket.off(eventName, eventHandler);
    }

    endTurn(): void {
        const availableTiles = this.movingGameService.getAccessibleTiles();
        const isPlayerStuck = availableTiles.length === 1 && this.actionService.canAction === 2;
        const isMovementActionOver = !this.actionService.checkSurroundingTiles() && this.actionService.canAction === 0 && availableTiles.length === 1;
        if ((isPlayerStuck || isMovementActionOver) && !this.movingGameService.isPopupItemChoiceVisible)
            this.playingService.joinGameService.socket.emit('endTurn', { roomCode: this.playingService.joinGameService.pinCode });
    }

    private readonly endGameCtfHandler = (data: { team: string }) => {
        setTimeout(() => {
            this.router.navigate(['/endGame'], {
                queryParams: {
                    source: this.playingService.localPlayer?.name,
                    code: this.playingService.joinGameService.pinCode,
                    mode: 'CTF',
                    winningTeam: data.team,
                },
            });
            this.notificationService.errorMessages = [];
            this.notificationService.showModal = false;
        }, TIME_BETWEEN_TURNS_MS);
    };

    private readonly restartTurnHandler = (data: { player: Player }) => {
        if (data.player.name === this.playingService.localPlayer?.name) {
            this.actionService.actionPlayer();
        }
    };

    private readonly endAnimationHandler = (data: { player: Player; countNumberOfTilesLeft: number }) => {
        if (this.playingService.localPlayer?.name === data.player.name) {
            this.playingService.currentMovingPoints += data.countNumberOfTilesLeft;
            this.endTurn();
            this.actionService.actionPlayer();
            this.playingService.isAnimated = false;
        }
        if (this.playersInfFight.length === 2) {
            const player1IsNextToPlayer2 = this.movingGameService
                .getNeighbors(this.boardService.findTileByPlayerPosition(this.playersInfFight[0]) as Tile)
                .some((tile) => tile.player?.name === this.playersInfFight[1].name);
            if (player1IsNextToPlayer2) {
                this.actionService.emitVirtualFight(this.playersInfFight[0], this.playersInfFight[1]);
                this.playersInfFight = [];
            }
        }
    };

    private readonly notificationTurnHandler = (data: { message: string; isEnded: boolean }) => {
        if (!data.isEnded) {
            this.notificationService.errorMessages.push(data.message);
            this.notificationService.showModal = true;
            this.notificationService.isTimedNotification = true;
        } else {
            this.notificationService.errorMessages = [];
            this.notificationService.showModal = false;
            this.notificationService.isTimedNotification = false;
        }
    };

    private readonly emitVirtualPlayer = (data: VirtualPlayerEmit) => {
        let playerMove = false;
        let findItem = true;

        const accessibleTiles = this.movingGameService.virtualGetAccessibleTiles(data.currentPlayer);

        const targetFound = this.tryMoveToTarget(data, accessibleTiles);
        if (targetFound) {
            playerMove = true;
            findItem = false;
        }

        if (data.currentPlayer.agressive && findItem) {
            playerMove = this.handleAggressiveBehavior(data, accessibleTiles);
        } else {
            playerMove = this.handleDefensiveBehavior(data, accessibleTiles, findItem);
        }

        if (!playerMove && findItem) {
            this.moveToRandomTile(data, accessibleTiles);
        }
    };

    private tryMoveToTarget(data: VirtualPlayerEmit, accessibleTiles: Tile[]): boolean {
        const targetPosition = this.botService.goToFlagOrSpawnPoint(data.currentPlayer, accessibleTiles);
        if (!targetPosition) return false;

        const destinationTile = accessibleTiles.find(
            (tile) => tile.position.x === targetPosition.x && tile.position.y === targetPosition.y && !tile.player,
        );

        if (destinationTile) {
            this.botService.moveVirtualPlayer(destinationTile, data);
            return true;
        }

        return false;
    }

    private handleAggressiveBehavior(data: VirtualPlayerEmit, accessibleTiles: Tile[]): boolean {
        for (const tile of accessibleTiles) {
            const moved = this.moveVitutalPlayerToPlayer(data, accessibleTiles);
            if (moved === true) return true;

            if (this.isItemAttack(tile, data)) {
                this.botService.moveVirtualPlayer(tile, data);
                return true;
            }
        }
        return false;
    }

    private handleDefensiveBehavior(data: VirtualPlayerEmit, accessibleTiles: Tile[], findItem: boolean): boolean {
        for (const tile of accessibleTiles) {
            const moved = this.botService.moveDefensePlayerToSpawn(data, accessibleTiles);
            if (moved === true) return true;

            if (findItem && this.isItemDepense(tile)) {
                this.botService.moveVirtualPlayer(tile, data);
                return true;
            }
        }
        return false;
    }

    private moveToRandomTile(data: VirtualPlayerEmit, accessibleTiles: Tile[]): void {
        const randomIndex = this.botService.generateTimerRandom(0, accessibleTiles.length);
        const singleTile = accessibleTiles[randomIndex];
        this.botService.moveVirtualPlayer(singleTile, data);
    }

    private isItemDepense(tile: Tile) {
        if (tile.item?.name === 'bouclier1' || tile.item?.name === 'bouclier2' || tile.item?.name === 'potion2') {
            return true;
        } else {
            return false;
        }
    }

    private isItemAttack(tile: Tile, data: VirtualPlayerEmit) {
        if (
            (tile.item?.name === 'potion1' || tile.item?.name === 'epee1' || tile.item?.name === 'epee2') &&
            (data.currentPlayer.inventory?.length as number) < 2
        ) {
            return true;
        } else {
            return false;
        }
    }

    private moveVitutalPlayerToPlayer(data: VirtualPlayerEmit, accessibleTiles: Tile[]) {
        const allTilesOfMap = this.boardService.tiles;
        let targetPosition: Position | null = null;

        const flaggedTileFullMap = allTilesOfMap.find(
            (tile) => tile.player && tile.player.name !== data.currentPlayer.name && this.hasFlag(tile.player),
        );

        let targetAccessibleTile: Tile | null = null;
        if (flaggedTileFullMap) {
            targetAccessibleTile = accessibleTiles.reduce((closest: Tile | null, tile: Tile) => {
                const distanceCurrent = closest
                    ? Math.abs(closest.position.x - flaggedTileFullMap.position.x) + Math.abs(closest.position.y - flaggedTileFullMap.position.y)
                    : Infinity;
                const distanceNew =
                    Math.abs(tile.position.x - flaggedTileFullMap.position.x) + Math.abs(tile.position.y - flaggedTileFullMap.position.y);
                return distanceNew < distanceCurrent ? tile : closest;
            }, null);
        }
        const playerTile = targetAccessibleTile ?? accessibleTiles.find((tile) => tile.player?.name && tile.player.name !== data.currentPlayer.name);

        if (!playerTile) return;

        const adjacentOffsets = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        for (const offset of adjacentOffsets) {
            const adjacentX = playerTile.position.x + offset.x;
            const adjacentY = playerTile.position.y + offset.y;

            const adjacentTile = accessibleTiles.find((tile) => tile.position.x === adjacentX && tile.position.y === adjacentY && !tile.player);

            if (adjacentTile) {
                targetPosition = adjacentTile.position;
                break;
            }
        }
        if (targetPosition && playerTile.player?.name && data.currentPlayer.name) {
            this.playersInfFight = [playerTile.player, data.currentPlayer];
        }

        if (!targetPosition) return;

        const firstTile = this.mockTile;
        firstTile.position = { ...targetPosition };
        this.botService.moveVirtualPlayer(firstTile, data);
        return true;
    }

    private hasFlag(player: Player): boolean {
        return !!player?.inventory && player.inventory.some((item) => item && item.name === CHESTBOX_NAME);
    }

    private readonly timeIncrementHandler = (time: number) => {
        this.playingService.time = time;
    };

    private readonly endGameWinHandler = (data: GameWinHandlerInterface) => {
        this.notificationService.showNotification(data.winner + ' a gagné la partie avec 3 victoires!', false);
        this.playingService.isPlaying = false;
        this.playingService.combat = false;

        setTimeout(() => {
            this.router.navigate(['/endGame'], {
                queryParams: { source: this.playingService.localPlayer?.name, code: this.playingService.joinGameService.pinCode },
            });
            this.notificationService.errorMessages = [];
            this.notificationService.showModal = false;
        }, TIME_BETWEEN_TURNS_MS);
    };

    private readonly startFightHandler = (player: Player[]) => {
        this.playingService.handleFirstAttack(player[0], player[1]);
        this.playingService.combat = true;
    };

    private readonly playerMovementHandler = (data: PlayerMovementHandlerInterface) => {
        this.boardService.tiles = this.boardService.tiles.map((tile: Tile) => {
            if (tile.player?.avatarUrl === data.loser.avatarUrl) tile.player = null;
            return tile;
        });
        const spawnTile = this.boardService.tiles.find(
            (tile: { position: { x: number; y: number } }) => tile.position.x === data.nextPosition.x && tile.position.y === data.nextPosition.y,
        );
        if (spawnTile) {
            spawnTile.player = data.loser;
            if (this.playingService.localPlayer && this.playingService.isPlayerTurn() && this.playingService.localPlayer.spawnPoint)
                this.playingService.localPlayer.coordinate = this.playingService.localPlayer.spawnPoint;
            if (data.loser.name === this.playingService.localPlayer?.name) this.playingService.localPlayer.coordinate = spawnTile.position;
            this.boardService.updateTiles(spawnTile);
            this.movingGameService.setReachableForTiles([]);
            if (this.playingService.isPlayerTurn()) this.movingGameService.setReachableForTiles(this.movingGameService.getAccessibleTiles());
        }
    };

    private readonly debugModeChangedHandler = (data: DebugModeInterface) => {
        this.playingService.isDebugMode = data.isDebugMode;
        if (data.isDebugMode && this.playingService.isPlayerTurn()) {
            this.movingGameService.setReachableForTiles(this.movingGameService.getAccessibleTiles());
        }
    };
}
