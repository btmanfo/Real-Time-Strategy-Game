import { Injectable } from '@angular/core';
import { CHESTBOX_NAME, CLOSED_DOOR, TILE_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Item, Player, Position, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class PlayingItemsService {
    private readonly socket: Socket;
    constructor(
        private readonly movingGameService: MovingGameService,
        private readonly boardService: BoardService,
        private readonly playingService: PlayingService,
        private readonly joinGameService: JoinGameService,
    ) {
        this.socket = this.joinGameService.socket;
    }

    dropLoserItems(loserName: string): void {
        let loser = this.playingService.players.find((player) => player.name === loserName);
        if (this.playingService.localPlayer?.name === loserName || (loser?.isVirtualPlayer && loser.inventory?.length !== 0)) {
            if (this.playingService.localPlayer?.name === loserName) {
                loser = this.playingService.localPlayer;
            }
            const hadFlag = loser?.inventory?.some((item) => item.name === CHESTBOX_NAME) ?? false;
            const loserTile = this.boardService.tiles.find((tile) => tile.player?.name === loserName);

            if (loserTile) {
                this.updateTiles(loser as Player, loserTile);
            }

            (loser as Player).inventory = [];
            loser = { ...loser, inventory: [] } as Player;
            this.updateInventory(loser, hadFlag);
        }
    }

    findNearestFreeTiles(startTile: Tile, count: number): Tile[] {
        const freeTiles: Tile[] = [];
        const visited = new Set<string>();
        const queue: Tile[] = [startTile];

        visited.add(this.getPositionKey(startTile.position));

        while (queue.length > 0 && freeTiles.length < count) {
            const currentTile = queue.shift();
            if (!currentTile) continue;

            if (this.isValidTileForItem(currentTile) && currentTile !== startTile) {
                freeTiles.push(currentTile);
                if (freeTiles.length >= count) break;
            }

            this.processNeighbors(currentTile, queue, visited);
        }

        return freeTiles;
    }

    teleportPotion() {
        const findAccessibleTiles = (accessibleTile: Tile) =>
            accessibleTile.type !== TILE_TYPES.wall &&
            accessibleTile.image !== './assets/images/Porte.png' &&
            !accessibleTile.player &&
            !accessibleTile.item?.name;
        const grid = this.boardService.tiles.filter(findAccessibleTiles);
        const randomIndex = Math.floor(Math.random() * grid.length);
        const tile = grid[randomIndex];
        if (tile) {
            this.playingService.teleportPlayer(tile);
        }
    }

    replaceItem() {
        if (this.movingGameService.isPopupItemChoiceVisible && this.playingService.localPlayer?.inventory) {
            this.movingGameService.isPopupItemChoiceVisible = false;
            this.emitItemChoice(this.playingService.localPlayer?.inventory[2], this.playingService.localPlayer?.coordinate);
            this.playingService.localPlayer.inventory = [...this.playingService.localPlayer.inventory.slice(0, 2)];
        }
    }

    emitItemChoice(item: Item, playerPosition: Position) {
        this.socket.emit(SocketPlayerMovementLabels.ItemChoice, {
            item,
            playerPosition,
            roomCode: this.joinGameService.pinCode,
        });
    }

    private isValidTileForItem(tile: Tile): boolean {
        if (!tile) {
            return false;
        }

        const isClosedDoor = tile.type === TILE_TYPES.door && tile.image === CLOSED_DOOR;
        const isValid = !tile.player && tile.type !== TILE_TYPES.wall && !isClosedDoor && !tile.item?.name;

        return isValid;
    }

    private placeInventoryItems(player: Player, startTile: Tile): { tile: Tile; item: Item }[] {
        if (!player.inventory) {
            return [];
        }

        const freeTiles = this.findNearestFreeTiles(startTile, player.inventory.length);

        return freeTiles ? this.updateTilesWithItems(player, freeTiles) : [];
    }

    private updateTilesWithItems(player: Player, freeTiles: Tile[]): { tile: Tile; item: Item }[] {
        let freeTileIndex = 0;
        const itemsToProcess = player.inventory ? [...player.inventory] : [];
        const processedTiles: { tile: Tile; item: Item }[] = [];
        for (const inventoryItem of itemsToProcess) {
            if (freeTileIndex < freeTiles.length) {
                const item = structuredClone(inventoryItem);
                const targetPosition = freeTiles[freeTileIndex].position;
                const targetTile = this.boardService.findTileByPosition(targetPosition);

                if (targetTile && item) {
                    targetTile.item = item;
                    processedTiles.push({ tile: targetTile, item });
                    freeTileIndex++;
                }
            }
        }
        return processedTiles;
    }

    private emitInventoryUpdate(player: Player) {
        this.socket.emit(SocketPlayerMovementLabels.InventoryUpdate, {
            roomCode: this.joinGameService.pinCode,
            player,
        });
    }

    private updateTiles(loser: Player, loserTile: Tile): void {
        const processedTiles = this.placeInventoryItems(loser, loserTile);
        if (processedTiles && processedTiles.length > 0) {
            for (const { tile, item } of processedTiles) {
                this.boardService.updateTiles(tile);
                this.emitItemChoice(item, tile.position);
            }
        }
    }

    private updateInventory(loser: Player, hadFlag: boolean): void {
        if (hadFlag || loser.isVirtualPlayer) {
            const playerUpdate = {
                ...loser,
                inventory: [],
            };
            this.emitInventoryUpdate(playerUpdate);
        }
    }

    private getPositionKey(position: Position): string {
        return `${position.x},${position.y}`;
    }

    private processNeighbors(currentTile: Tile, queue: Tile[], visited: Set<string>): void {
        const neighbors = this.movingGameService.getNeighbors(currentTile);
        for (const neighbor of neighbors) {
            if (!neighbor) continue;

            const key = this.getPositionKey(neighbor.position);
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
            }
        }
    }
}
