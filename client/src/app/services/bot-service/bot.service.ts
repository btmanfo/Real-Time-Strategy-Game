import { Injectable } from '@angular/core';
import { CHESTBOX_NAME, MAX_BOT_START_TURN, MIN_BOT_START_TURN, mockTile } from '@app/constants/constants';
import { VirtualPlayerEmit } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { PlayingGridService } from '@app/services/playing-grid-service/playing-grid.service';
import { Player, Position, Tile } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class BotService {
    constructor(
        private readonly playingGridService: PlayingGridService,
        private readonly boardService: BoardService,
    ) {}

    moveVirtualPlayer(tile: Tile, data: VirtualPlayerEmit) {
        setTimeout(
            () => {
                this.playingGridService.moveVirtualPlayer(tile, data.currentPlayer);
            },
            this.generateTimerRandom(MIN_BOT_START_TURN, MAX_BOT_START_TURN),
        );
    }

    generateTimerRandom(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    goToFlagOrSpawnPoint(currentPlayer: Player, accessibleTiles: Tile[]): Position | null {
        const allTilesOfMap = this.boardService.tiles;
        let targetPosition: Position | null = null;

        if (this.hasFlag(currentPlayer)) {
            if (!currentPlayer.spawnPoint) return null;
            const spawnTile = allTilesOfMap.find(
                (tile) => tile.position.x === currentPlayer.spawnPoint?.x && tile.position.y === currentPlayer.spawnPoint?.y && !tile.player,
            );
            targetPosition = spawnTile ? spawnTile.position : currentPlayer.spawnPoint;
        } else {
            const flaggedTile = allTilesOfMap.find((tile) => tile.item?.name === CHESTBOX_NAME);
            if (flaggedTile) {
                targetPosition = flaggedTile.position;
            }
        }

        if (targetPosition) {
            const exactAccessibleTile = accessibleTiles.find(
                (tile) => tile.position.x === targetPosition?.x && tile.position.y === targetPosition?.y && !tile.player,
            );
            if (exactAccessibleTile) {
                return exactAccessibleTile.position;
            } else {
                const closestAccessibleTile = accessibleTiles.reduce(
                    (closest: Tile | null, tile: Tile) => {
                        const currentDistance = closest
                            ? Math.abs(closest.position.x - targetPosition?.x) + Math.abs(closest.position.y - targetPosition?.y)
                            : Infinity;
                        const newDistance = Math.abs(tile.position.x - targetPosition?.x) + Math.abs(tile.position.y - targetPosition?.y);
                        return newDistance < currentDistance ? tile : closest;
                    },
                    null as Tile | null,
                );
                return closestAccessibleTile ? closestAccessibleTile.position : targetPosition;
            }
        }
        return targetPosition;
    }

    hasFlag(player: Player): boolean {
        return !!player?.inventory && player.inventory.some((item) => item && item.name === CHESTBOX_NAME);
    }

    moveDefensePlayerToSpawn(data: VirtualPlayerEmit, accessibleTiles: Tile[]): boolean | undefined {
        if (!data.currentPlayer.name) return;

        const flaggedTileFullMap = this.findFlaggedPlayerTile(data.currentPlayer.name);

        if (!flaggedTileFullMap?.player?.spawnPoint) return;

        const spawnPoint = flaggedTileFullMap.player.spawnPoint;
        const targetPosition = this.findBestPositionNearSpawn(spawnPoint, accessibleTiles);

        if (!targetPosition) return;

        this.executeVirtualPlayerMovement(targetPosition, data);
        return true;
    }

    /**
     * Finds a tile with a player carrying the flag (other than the current player)
     * @param currentPlayerName The name of the current player
     * @returns The tile containing the player with the flag, or undefined if none found
     */
    private findFlaggedPlayerTile(currentPlayerName: string): Tile | undefined {
        return this.boardService.tiles.find((tile) => tile.player && tile.player.name !== currentPlayerName && this.hasFlag(tile.player));
    }

    /**
     * Finds the best position for the bot to move to near an opponent's spawn point
     * @param spawnPoint The spawn point to target
     * @param accessibleTiles Tiles the bot can move to
     * @returns The best position to move to, or null if none available
     */
    private findBestPositionNearSpawn(spawnPoint: Position, accessibleTiles: Tile[]): Position | null {
        const spawnTile = accessibleTiles.find((tile) => tile.position.x === spawnPoint.x && tile.position.y === spawnPoint.y && !tile.player);

        if (spawnTile && !spawnTile.player) {
            return spawnTile.position;
        }

        const closestTile = this.findClosestAccessibleTile(spawnPoint, accessibleTiles);
        if (!closestTile) return null;

        if (!closestTile.player) {
            return closestTile.position;
        }

        return this.findAdjacentFreeTile(closestTile, accessibleTiles);
    }

    /**
     * Finds the closest accessible tile to a target position
     * @param targetPosition The position to get close to
     * @param accessibleTiles Tiles the bot can move to
     * @returns The closest tile or null if no accessible tiles
     */
    private findClosestAccessibleTile(targetPosition: Position, accessibleTiles: Tile[]): Tile | null {
        return accessibleTiles.reduce(
            (closest: Tile | null, tile: Tile) => {
                const currentDistance = closest
                    ? Math.abs(closest.position.x - targetPosition.x) + Math.abs(closest.position.y - targetPosition.y)
                    : Infinity;
                const newDistance = Math.abs(tile.position.x - targetPosition.x) + Math.abs(tile.position.y - targetPosition.y);
                return newDistance < currentDistance ? tile : closest;
            },
            null as Tile | null,
        );
    }

    /**
     * Finds an adjacent free tile to the given tile
     * @param tile The tile to find adjacent tiles for
     * @param accessibleTiles Tiles the bot can move to
     * @returns The position of an adjacent free tile, or null if none available
     */
    private findAdjacentFreeTile(tile: Tile, accessibleTiles: Tile[]): Position | null {
        const adjacentOffsets = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        for (const offset of adjacentOffsets) {
            const adjacentX = tile.position.x + offset.x;
            const adjacentY = tile.position.y + offset.y;
            const adjacentTile = accessibleTiles.find((t) => t.position.x === adjacentX && t.position.y === adjacentY && !t.player);

            if (adjacentTile) {
                return adjacentTile.position;
            }
        }

        return null;
    }

    /**
     * Executes the movement of a virtual player to the target position
     * @param targetPosition The position to move to
     * @param data The virtual player data
     */
    private executeVirtualPlayerMovement(targetPosition: Position, data: VirtualPlayerEmit): void {
        const moveTile = { ...mockTile };
        moveTile.position = { ...targetPosition };
        this.moveVirtualPlayer(moveTile, data);
    }
}
