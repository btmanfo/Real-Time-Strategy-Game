import { Injectable } from '@angular/core';
import { BOT_ACTION_TIME, BOT_TIME_BETWEEN_TRIES, BOT_TOGGLE_DOOR_TIME, ITEM_TYPES } from '@app/constants/constants';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class ActionService {
    canAction: number;
    private readonly socket: Socket;

    constructor(
        private readonly combatService: CombatService,
        private readonly joinGameService: JoinGameService,
        private readonly movingGameService: MovingGameService,
        private readonly playingService: PlayingService,
        private readonly gameLogService: GameLogService,
    ) {
        this.canAction = 0;
        this.socket = this.joinGameService.socket;
    }

    emitToggleDoor(tile: Tile): void {
        this.socket.emit(SocketPlayerMovementLabels.ToggleDoor, {
            roomCode: this.joinGameService.pinCode,
            tile,
        });
        if (tile.image === './assets/images/Porte.png') {
            if (this.playingService.playerTurn) this.gameLogService.sendDoorLog(this.gameLogService.myRoom, this.playingService.playerTurn, false);
        } else if (this.playingService.playerTurn) {
            this.gameLogService.sendDoorLog(this.gameLogService.myRoom, this.playingService.playerTurn, true);
        }
    }

    activateAction() {
        if (!this.playingService.isPlayerTurn() || this.canAction === 2) {
            return;
        }
        this.canAction = this.canAction === 0 ? 1 : 0;
    }

    actionPlayer(): void {
        if (!this.playingService.isPlayerTurn()) {
            return;
        }
        this.movingGameService.setReachableForTiles([]);
        if (this.playingService.isPlayerTurn()) {
            const availableTiles = this.movingGameService.getAccessibleTiles();
            if (availableTiles) {
                this.movingGameService.setReachableForTiles(availableTiles);
            }
        }
    }

    emitStartFight(player: Player): void {
        this.socket.emit(SocketPlayerMovementLabels.StartFight, {
            roomCode: this.joinGameService.pinCode,
            players: [player, this.playingService.localPlayer],
        });
    }
    emitVirtualFight(player: Player, player2: Player): void {
        this.socket.emit(SocketPlayerMovementLabels.StartFight, {
            roomCode: this.joinGameService.pinCode,
            players: [player2, player],
        });
        this.combatService.updateIsInCombat(player.name, player2.name);
    }

    checkEndTurn(): void {
        const availableTiles = this.movingGameService.getAccessibleTiles();
        const canMoveOrAction = availableTiles.length !== 1 || this.canAction !== 2;
        const canMoveNoAction = this.checkSurroundingTiles() || availableTiles.length !== 1 || this.canAction !== 0;

        if ((!canMoveOrAction || !canMoveNoAction) && !this.movingGameService.isPopupItemChoiceVisible) {
            this.socket.emit(SocketPlayerMovementLabels.EndTurn, { roomCode: this.joinGameService.pinCode });
        }
    }

    checkSurroundingTiles(): boolean {
        const playerTile = this.movingGameService.getPlayerTile(this.playingService.localPlayer as Player);
        if (!playerTile) {
            return false;
        }
        const neighbors = this.movingGameService.getNeighbors(playerTile);
        return neighbors.some((neighbor) => {
            return (
                (neighbor.player || neighbor.image === './assets/images/Porte.png' || neighbor.image === './assets/images/Porte-ferme.png') &&
                (!neighbor.item?.name || neighbor.item.name === ITEM_TYPES.spawn)
            );
        });
    }

    isBot(player: Player): boolean {
        if (!player) {
            return false;
        }
        return player.isVirtualPlayer === true;
    }

    autoBotTurn(botPlayer: Player): void {
        this.canAction = 1;

        const executeBotAction = () => {
            if (botPlayer.agressive && this.tryBotAttackNearbyPlayer(botPlayer)) {
                setTimeout(() => {
                    if (this.canAction > 0) {
                        executeBotAction();
                    }
                }, BOT_ACTION_TIME);
                return;
            }

            if (this.tryBotToggleNearbyDoor(botPlayer)) {
                setTimeout(() => {
                    if (this.canAction > 0) {
                        executeBotAction();
                    }
                }, BOT_TOGGLE_DOOR_TIME);
                return;
            }

            if (!botPlayer.agressive && this.tryBotAttackNearbyPlayer(botPlayer)) {
                setTimeout(() => {
                    if (this.canAction > 0) {
                        executeBotAction();
                    }
                }, BOT_ACTION_TIME);
                return;
            }
        };
        setTimeout(executeBotAction, BOT_TIME_BETWEEN_TRIES);
    }

    tryBotAttackNearbyPlayer(botPlayer: Player): boolean {
        const botTile = this.movingGameService.getPlayerTile(botPlayer);
        if (!botTile) {
            return false;
        }

        const neighbors = this.movingGameService.getNeighbors(botTile);

        for (const neighbor of neighbors) {
            if (neighbor.player && neighbor.player.name !== botPlayer.name) {
                this.joinGameService.socket.emit(SocketWaitRoomLabels.CreateAndJoinGameRoom, {
                    firstPlayer: botPlayer,
                    secondPlayer: neighbor.player,
                });

                this.joinGameService.socket.emit(SocketPlayerMovementLabels.StartFight, {
                    roomCode: this.joinGameService.pinCode,
                    players: [botPlayer, neighbor.player],
                });
                this.canAction--;
                return true;
            }
        }

        return false;
    }

    tryBotToggleNearbyDoor(botPlayer: Player): boolean {
        const botTile = this.movingGameService.getPlayerTile(botPlayer);
        if (!botTile) {
            return false;
        }

        const neighbors = this.movingGameService.getNeighbors(botTile);

        for (const neighbor of neighbors) {
            if (neighbor.image === './assets/images/Porte.png' || neighbor.image === './assets/images/Porte-ferme.png') {
                this.emitToggleDoor(neighbor);
                this.canAction--;
                return true;
            }
        }
        return false;
    }
}
