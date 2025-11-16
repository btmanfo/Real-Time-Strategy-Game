import { Injectable } from '@angular/core';
import { TILE_TYPES } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player, Tile } from '@common/interfaces';
@Injectable({
    providedIn: 'root',
})
export class PlayingGridService {
    constructor(
        private readonly playingService: PlayingService,
        private readonly movingGameService: MovingGameService,
        private readonly notificationService: NotificationService,
        private readonly boardService: BoardService,
        private readonly actionService: ActionService,
    ) {}

    highlightTile(event: MouseEvent, tile: Tile): void {
        if (!this.playingService.isPlaying) {
            return;
        }
        const myplayer = this.playingService.localPlayer;
        if (!myplayer) {
            return;
        }
        if (!tile.isReachable) {
            this.boardService.tiles = this.boardService.tiles.map((t) => {
                t.isHighlighted = false;
                return t;
            });
            return;
        }
        const path = this.movingGameService.findShortestPath(myplayer, tile);
        this.boardService.tiles = this.boardService.tiles.map((t) => {
            t.isHighlighted = !!path.find((p) => p.position.x === t.position.x && p.position.y === t.position.y) && t.isReachable;
            return t;
        });
    }
    moveVirtualPlayer(tile: Tile, currentPlayer: Player): void {
        const oldTile = this.playingService.localPlayer ? this.movingGameService.getPlayerTile(this.playingService.localPlayer) : undefined;
        if (oldTile?.position.x === tile.position.x && oldTile?.position.y === tile.position.y) {
            return;
        }

        const myPlayer = this.playingService.localPlayer;
        if (!myPlayer) {
            return;
        }
        const path = this.movingGameService.findShortestPath(currentPlayer, tile);
        const totalCost = path.reduce((acc, curr) => acc + (curr.cost ?? 0), 0) - (oldTile?.cost ?? 0);

        this.playingService.currentMovingPoints -= totalCost;
        this.movingGameService.setReachableForTiles([]);
        this.movingGameService.animatePlayerMovement(path, currentPlayer);
    }

    toggleDoorAction(event: MouseEvent, tile: Tile) {
        if (!this.canToggleDoor(tile)) {
            return;
        }

        if (event.button === 0 && this.playingService.localPlayer) {
            this.handleDoorToggle(tile);
        }
    }

    chooseTileForMove(event: MouseEvent, tile: Tile): void {
        if (!this.isPlayerTurn()) {
            return;
        }

        if (event.button === 0 && this.playingService.localPlayer) {
            if (this.isEnemyTile(tile)) {
                this.handleFight(tile);
                return;
            }

            if (!this.canMoveToTile(tile)) {
                return;
            }

            this.movePlayer(tile);
        }
    }

    showInformation(event: MouseEvent, tile: Tile): void {
        if (event.button === 2 && this.playingService.isPlaying) {
            if (this.playingService.isDebugMode) {
                this.playingService.teleportPlayer(tile);
                return;
            }
            const type = this.getTileType(tile);
            const description = this.setDescriptionTile(tile);

            this.notificationService.errorMessages.push(
                'Type de tuile: ' + type + ', Coût: ' + (tile.cost === -1 ? 'Impossible de traverser' : tile.cost),
            );
            this.notificationService.errorMessages.push('Description de tuile: ' + description);
            if (tile.item?.name) {
                this.notificationService.errorMessages.push('Item: ' + tile.item?.name + ', ' + tile.item?.description);
            }
            if (tile.player?.name) {
                const avatarname = tile.player?.avatarUrl?.split('/')[tile.player?.avatarUrl?.split('/').length - 2];
                this.notificationService.errorMessages.push('Joueur: ' + tile.player?.name + ', Avatar: ' + avatarname);
            }
            this.notificationService.showModal = true;
        }
    }
    private canToggleDoor(tile: Tile): boolean {
        return this.playingService.isPlaying && !tile.player?.name && !tile.item?.name;
    }

    private isDoorTile(tile: Tile): boolean {
        return tile.image === './assets/images/Porte.png' || tile.image === './assets/images/Porte-ferme.png';
    }

    private handleDoorToggle(tile: Tile): void {
        if (!this.isDoorTile(tile) || this.actionService.canAction !== 1) {
            return;
        }

        const playerTile = this.boardService.tiles.find((t) => t.player?.name === this.playingService.localPlayer?.name);
        let neighborTiles = [] as Tile[];
        if (playerTile) {
            neighborTiles = this.movingGameService.getNeighbors(playerTile);
        }

        if (!this.isNeighborTile(tile, neighborTiles)) {
            this.actionService.canAction = 0;
            return;
        }
        this.toggleDoor(tile);
    }

    private isNeighborTile(tile: Tile, neighborTiles: Tile[]): boolean {
        return neighborTiles.some((neighbor) => tile.position.x === neighbor.position.x && tile.position.y === neighbor.position.y);
    }

    private toggleDoor(tile: Tile): void {
        tile.image = tile.image === './assets/images/Porte-ferme.png' ? './assets/images/Porte.png' : './assets/images/Porte-ferme.png';
        this.actionService.canAction = 2;
        tile.cost = tile.cost === 1 ? -1 : 1;
        this.actionService.emitToggleDoor(tile);
        tile.cost = tile.cost === 1 ? -1 : 1;

        if (this.movingGameService.getAccessibleTiles().length === 0) {
            this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.EndTurn, {
                roomCode: this.playingService.joinGameService.pinCode,
            });
        }

        if (this.playingService.localPlayer?.name === this.playingService.playerTurn?.name) {
            this.movingGameService.setReachableForTiles(this.movingGameService.getAccessibleTiles());
        }
    }
    private isPlayerTurn(): boolean {
        return this.playingService.isPlaying && this.playingService.localPlayer?.name === this.playingService.playerTurn?.name;
    }

    private isEnemyTile(tile: Tile): boolean {
        return !!tile.player && tile.player.name !== this.playingService.localPlayer?.name;
    }

    private handleFight(tile: Tile): void {
        if (this.actionService.canAction !== 1) {
            return;
        }

        const neighborTiles = this.movingGameService.getNeighbors(tile);
        const isNeighborTile = neighborTiles.some(
            (neighbor) =>
                neighbor.position.x === this.playingService.localPlayer?.coordinate.x &&
                neighbor.position.y === this.playingService.localPlayer?.coordinate.y,
        );
        const canFightCtf =
            this.playingService.localPlayer?.team !== tile.player?.team && this.playingService.gameServiceValue.getNewGame().gameMode === 'CTF';
        const canFightClassic = this.playingService.gameServiceValue.getNewGame().gameMode === 'Classique';
        if (isNeighborTile && (canFightCtf || canFightClassic)) {
            this.commitToFight(tile);
        }
    }

    private commitToFight(tile: Tile): void {
        this.actionService.canAction = 2;
        if (tile.player) {
            this.actionService.emitStartFight(tile.player);
        }
    }

    private canMoveToTile(tile: Tile): boolean {
        return !!tile.isReachable && this.actionService.canAction !== 1 && this.movingGameService.getAccessibleTiles().length > 1;
    }

    private movePlayer(tile: Tile): void {
        const oldTile = this.playingService.localPlayer ? this.movingGameService.getPlayerTile(this.playingService.localPlayer) : undefined;
        if (oldTile?.position.x === tile.position.x && oldTile?.position.y === tile.position.y) {
            return;
        }

        const myPlayer = this.playingService.localPlayer;
        if (!myPlayer) {
            return;
        }
        const path = this.movingGameService.findShortestPath(myPlayer, tile);
        const totalCost = path.reduce((acc, curr) => acc + (curr.cost ?? 0), 0) - (oldTile?.cost ?? 0);

        this.playingService.currentMovingPoints -= totalCost;
        this.movingGameService.setReachableForTiles([]);
        if (this.playingService.localPlayer) {
            this.movingGameService.animatePlayerMovement(path, this.playingService.localPlayer);
        }
    }

    private getTileType(tile: Tile): string {
        return tile.type === '' ? 'base' : tile.type ?? 'base';
    }
    private setDescriptionTile(tile: Tile): string {
        const type = this.getTileType(tile);
        const tileTypeDescriptions: { [key: string]: string } = {
            [TILE_TYPES.ice]: 'malus -2 attaque et -2 défense',
            [TILE_TYPES.wall]: 'tuile intraversable',
            [TILE_TYPES.door]: "porte qu'on peut ouvrir ou fermer",
            [TILE_TYPES.water]: "tuile d'eau difficile à traverser",
            base: 'tuile de base sans effet',
            default: 'Tuile de base',
        };
        return tileTypeDescriptions[type] || tileTypeDescriptions['default'];
    }
}
