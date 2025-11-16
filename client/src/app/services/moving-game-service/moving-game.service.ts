import { Injectable, Injector } from '@angular/core';
import { TILE_TYPES } from '@app/constants/constants';
import { TileAndCostInterface } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class MovingGameService {
    movePoints: number;
    isPopupItemChoiceVisible: boolean;
    private _playingService: PlayingService | null;
    private _joinGameService: JoinGameService | null;
    private readonly socket: Socket;

    constructor(
        private readonly boardService: BoardService,
        private readonly injector: Injector,
    ) {
        this.socket = this.joinGameService.socket;
        this.movePoints = 0;
        this.isPopupItemChoiceVisible = false;
        this._playingService = null;
    }

    get playingService(): PlayingService {
        this._playingService ??= this.injector.get(PlayingService);
        return this._playingService;
    }

    get joinGameService(): JoinGameService {
        this._joinGameService ??= this.injector.get(JoinGameService);
        return this._joinGameService;
    }

    emitAnimation(path: Tile[], player: Player) {
        this.socket.emit(SocketPlayerMovementLabels.AnimatePlayerMove, {
            roomCode: this.joinGameService.pinCode,
            map: path,
            player,
        });
    }

    setReachableForTiles(map: Tile[]) {
        this.boardService.tiles = this.boardService.tiles.map((tile: Tile) => {
            tile.isReachable = false;
            return tile;
        });
        for (const tile of map) {
            const reachedTile = this.boardService.tiles.find((boardTile) => {
                return boardTile.position.x === tile.position.x && boardTile.position.y === tile.position.y;
            });
            if (reachedTile) {
                reachedTile.isReachable = true;
            }
        }
    }

    getPlayerTile(player: Player): Tile | undefined {
        return this.boardService.tiles.find((tile) => {
            return tile.player?.name === player.name;
        });
    }
    getAccessibleTiles(): Tile[] {
        const player = this.playingService.localPlayer as Player;
        const accessibleTiles: Tile[] = [];
        const visited: Map<string, number> = new Map();
        const playerTile = this.getPlayerTile(player) as Tile;
        const queue: { tile: Tile; cost: number }[] = [{ tile: playerTile, cost: 0 }];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current?.tile) continue;
            const currentTile = current.tile;
            const currentCost = current.cost;
            const key = `${currentTile.position.x},${currentTile.position.y}`;

            if ((visited.get(key) ?? Infinity) <= currentCost) continue;
            visited.set(key, currentCost);

            if (currentCost > this.playingService.currentMovingPoints) continue;

            accessibleTiles.push(currentTile);

            const neighbors = this.getNeighbors(currentTile);
            this.addNeighborsToQueue(neighbors, queue, currentCost);
        }
        return accessibleTiles;
    }

    virtualGetAccessibleTiles(myPlayer: Player): Tile[] {
        const accessibleTiles: Tile[] = [];
        const visited: Map<string, number> = new Map();
        const playerTile = this.getPlayerTile(myPlayer) as Tile;
        const queue: { tile: Tile; cost: number }[] = [{ tile: playerTile, cost: 0 }];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current?.tile) continue;
            const currentTile = current.tile;
            const currentCost = current.cost;
            const key = `${currentTile.position.x},${currentTile.position.y}`;

            if ((visited.get(key) ?? Infinity) <= currentCost) continue;
            visited.set(key, currentCost);

            if (currentCost > this.playingService.currentMovingPoints) continue;

            accessibleTiles.push(currentTile);

            const neighbors = this.getNeighbors(currentTile);
            this.addVirtualNeighborsToQueue(neighbors, queue, currentCost);
        }
        return accessibleTiles;
    }

    getNeighbors(tile: Tile): Tile[] {
        const grid = this.boardService.tiles;
        const neighbors: Tile[] = [];
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
        ];

        for (const { dx, dy } of directions) {
            const newX = tile.position.x + dx;
            const newY = tile.position.y + dy;
            const dimensions = Math.sqrt(grid.length);
            const isWithinMap = newX >= 0 && newX < dimensions && newY >= 0 && newY < dimensions;
            if (isWithinMap) {
                neighbors.push(grid[newX * dimensions + newY]);
            }
        }
        return neighbors;
    }

    findShortestPath(player: Player, target: Tile): Tile[] {
        const distances: Map<string, number> = new Map();
        const previous: Map<string, Tile | null> = new Map();
        const queue: { tile: Tile; cost: number }[] = [];
        const visited: Set<string> = new Set();

        const startTile = this.getPlayerTile(player) as Tile;
        const startKey = `${startTile.position.x},${startTile.position.y}`;
        distances.set(startKey, 0);
        queue.push({ tile: startTile, cost: 0 });

        while (queue.length > 0) {
            queue.sort((a, b) => a.cost - b.cost);
            const shifted: { tile: Tile; cost: number } | undefined = queue.shift();
            const { tile: currentTile, cost: currentCost } = shifted as { tile: Tile; cost: number };
            const currentKey = `${currentTile.position.x},${currentTile.position.y}`;

            if (visited.has(currentKey)) continue;
            visited.add(currentKey);

            if (currentTile === target) break;

            this.addNeighborsToQueueShortestPath(queue, currentCost, distances, previous, currentTile);
        }

        return this.constructPathFromTarget(target, previous);
    }

    animatePlayerMovement(path: Tile[], playerToMove: Player): void {
        this.playingService.socket.emit(SocketPlayerMovementLabels.StartMoving, {
            path,
            player: playerToMove,
            roomCode: this.playingService.joinGameService.pinCode,
        });
    }

    private addNeighborsToQueue(neighbors: Tile[], queue: TileAndCostInterface[], currentCost: number): void {
        for (const neighbor of neighbors) {
            if (neighbor.type === TILE_TYPES.wall || neighbor.image === './assets/images/Porte.png' || neighbor.player) continue;

            const neighborCost = currentCost + (neighbor.cost ?? 0);
            if (neighborCost <= this.playingService.currentMovingPoints) {
                queue.push({ tile: neighbor, cost: neighborCost });
            }
        }
    }

    private addVirtualNeighborsToQueue(neighbors: Tile[], queue: TileAndCostInterface[], currentCost: number): void {
        for (const neighbor of neighbors) {
            if (neighbor.type === TILE_TYPES.wall || neighbor.image === './assets/images/Porte.png') continue;

            const neighborCost = currentCost + (neighbor.cost ?? 0);
            if (neighborCost <= this.playingService.currentMovingPoints) {
                queue.push({ tile: neighbor, cost: neighborCost });
            }
        }
    }

    private addNeighborsToQueueShortestPath(
        queue: TileAndCostInterface[],
        currentCost: number,
        distances: Map<string, number>,
        previous: Map<string, Tile | null>,
        currentTile: Tile,
    ): void {
        const neighbors = this.getNeighbors(currentTile);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.position.x},${neighbor.position.y}`;
            const newDist = currentCost + (neighbor.cost as number);
            const currentDistance = distances.get(neighborKey) ?? Infinity;

            const isLowerCost = newDist < currentDistance;
            const isTraversable = neighbor.type !== TILE_TYPES.wall;
            const isDoor = !neighbor.image?.includes('Porte.png');
            const hasNoPlayer = !neighbor.player;

            if (isLowerCost && isTraversable && isDoor && hasNoPlayer) {
                distances.set(neighborKey, newDist);
                previous.set(neighborKey, currentTile);
                queue.push({ tile: neighbor, cost: newDist });
            }
        }
    }

    private constructPathFromTarget(target: Tile, previous: Map<string, Tile | null>): Tile[] {
        const path: Tile[] = [];
        let current: Tile | null = target;
        while (current) {
            path.unshift(current);
            current = previous.get(`${current.position.x},${current.position.y}`) || null;
        }

        return path;
    }
}
