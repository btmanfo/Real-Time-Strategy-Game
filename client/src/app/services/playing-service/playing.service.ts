import { Injectable, Injector } from '@angular/core';
import { CLOSED_DOOR, NUMBER_OF_WINS_FOR_VICTORIES, TILE_TYPES } from '@app/constants/constants';
import { Coordinate } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { SocketEndGameStatistics, SocketPlayerMovementLabels } from '@common/constants';
import { Item, Player, Tile } from '@common/interfaces';
import { BehaviorSubject, Observable } from 'rxjs';
import { Socket } from 'socket.io-client';
@Injectable({
    providedIn: 'root',
})
export class PlayingService {
    time: number = 0;
    playerTurn: Player | null = null;
    localPlayer: Player | null = null;
    playersSubject = new BehaviorSubject<Player[]>([]);
    players$ = this.playersSubject.asObservable();
    players: Player[] = [];
    isPlaying: boolean = false;
    currentMovingPoints: number = 0;
    isAnimated: boolean = false;
    combat: boolean = false;
    socket: Socket;
    activePlayer: string = '';
    isDebugMode: boolean = false;

    playerTurnSubject = new BehaviorSubject<Player | null>(null);
    playerTurn$ = this.playerTurnValue;

    private _joinGameService: JoinGameService | null = null;
    private _combatService: CombatService | null = null;
    private _movingGameService: MovingGameService | null = null;
    private readonly playerVictories: Map<string, number> = new Map();
    private readonly playerLoses: Map<string, number> = new Map();

    constructor(
        private readonly gameService: GameService,
        private readonly boardService: BoardService,
        private readonly injector: Injector,
        private readonly notificationService: NotificationService,
    ) {
        this.socket = this.joinGameService.socket;
    }

    get movingGameService(): MovingGameService {
        this._movingGameService ??= this.injector.get(MovingGameService);
        return this._movingGameService;
    }

    get joinGameService(): JoinGameService {
        this._joinGameService ??= this.injector.get(JoinGameService);
        return this._joinGameService;
    }

    get combatService(): CombatService {
        this._combatService ??= this.injector.get(CombatService);
        return this._combatService;
    }

    get gameServiceValue(): GameService {
        return this.gameService;
    }

    get boardServiceValue(): BoardService {
        return this.boardService;
    }

    get playerTurnValue(): Observable<Player | null> {
        return this.playerTurnSubject.asObservable();
    }

    initGame(): void {
        this.boardService.isPlaying = true;
        const game = this.gameService.getNewGame();
        if (!game) {
            this.boardService.isPlaying = false;
            return;
        }
        this.boardService.tiles = game.map;
        this.boardService.tiles = this.boardService.tiles.map((tile) => {
            tile.isHighlighted = false;
            tile.isReachable = false;
            return tile;
        });
        if (this.localPlayer) {
            const foundTile = this.boardService.tiles.find((tile) => {
                return this.localPlayer && tile.player?.avatarUrl === this.localPlayer.avatarUrl;
            });
            if (foundTile?.player) {
                this.localPlayer.coordinate = foundTile.player.coordinate;
                this.localPlayer.inventory = [];
            }
            this.players.forEach((player) => {
                player.inventory = [{ image: '' }, { image: '' }] as Item[];
            });
            this.localPlayer.team = this.players.find((player) => player.name === this.localPlayer?.name)?.team;
            this.localPlayer.spawnPoint = this.players.find((player) => player.name === this.localPlayer?.name)?.spawnPoint;
        }

        this.players.forEach((player) => {
            if (player.avatarUrl === this.localPlayer?.avatarUrl && player.name !== this.localPlayer.name) {
                this.localPlayer.name = player.name;
            }
        });
    }

    /**
     * Updates the victory count for a player
     * @param playerName The name of the player who won
     * @param playerLose The name of the player who lost (optional)
     */
    updatePlayerVictories(playerName: string, playerLose?: string): void {
        const currentVictories = this.playerVictories.get(playerName) ?? 0;
        const newVictoryCount = currentVictories + 1;

        if (playerLose) {
            const currentLoses = this.playerLoses.get(playerLose) ?? 0;
            const newLoseCount = currentLoses + 1;
            this.playerLoses.set(playerLose, newLoseCount);
        }

        this.playerVictories.set(playerName, newVictoryCount);

        const player = this.findPlayerByName(playerName);
        if (player) {
            player.victories ??= 0;

            player.victories = newVictoryCount;

            this.joinGameService.socket.emit(SocketEndGameStatistics.UpdatePlayerVictories, {
                currentPlayer: player.name,
                roomCode: this.joinGameService.pinCode,
                nbVictories: this.getPlayerVictories(playerName),
            });

            if (playerLose) {
                this.joinGameService.socket.emit(SocketEndGameStatistics.UpdatePlayerLose, {
                    currentPlayer: playerLose,
                    roomCode: this.joinGameService.pinCode,
                    nbLoses: this.getPlayerLoses(playerLose),
                });
            }
        }

        this.checkWinner(playerName);
    }
    /**
     * Checks if a player has reached the number of victories required to win the game
     * and triggers the end game logic if so.
     * @param playerName The name of the player to check
     */
    checkWinner(playerName: string): void {
        const victories = this.getPlayerVictories(playerName);
        if (victories >= NUMBER_OF_WINS_FOR_VICTORIES) {
            this.joinGameService.socket.emit(SocketPlayerMovementLabels.EndGameWinVictories, {
                roomCode: this.joinGameService.pinCode,
                winner: playerName,
            });
        }
    }

    getGameWinner(): string | null {
        for (const [playerName, victories] of this.playerVictories.entries()) {
            if (victories >= NUMBER_OF_WINS_FOR_VICTORIES) {
                return playerName;
            }
        }
        return null;
    }

    /**
     * Gets the number of victories for a player
     * @param playerName The name of the player
     * @returns The number of victories (0 if none)
     */
    getPlayerVictories(playerName: string): number {
        return this.playerVictories.get(playerName) ?? 0;
    }

    getPlayerLoses(playerName: string): number {
        return this.playerLoses.get(playerName) ?? 0;
    }

    updatePlayerHealth(playerName: string, newHealth: number): void {
        const player = this.players.find((p) => p.name === playerName);
        if (player) {
            player.life = newHealth;
        }
    }

    isPlayerTurn(): boolean {
        return this.playerTurn?.name === this.localPlayer?.name;
    }

    isVirtualPlayerTurn(vituralPlayer: Player): boolean {
        return this.playerTurn?.name === vituralPlayer.name;
    }
    /**
     * Teleports player to a new location if valid in debug mode
     * @param tile The destination tile for teleportation
     */
    teleportPlayer(tile: Tile): void {
        if ((!this.isDebugMode || !this.isPlayerTurn()) && !this.localPlayer?.inventory?.some((item) => item.name === 'potion2')) {
            return;
        }

        if (this.isTeleportationValid(tile)) {
            this.movePlayerToTile(tile);
            if (this.localPlayer) {
                this.playerMovedAnnouncer(this.joinGameService.pinCode, this.localPlayer, tile.position);
            }
        } else {
            this.showTeleportationError(tile);
        }
    }

    removeHighlight(): void {
        this.boardService.tiles = this.boardService.tiles.map((tile) => {
            tile.isHighlighted = false;
            return tile;
        });
    }

    /**
     * Determines which player attacks first based on speed and initializes combat
     * La première attaque va au joueur avec la plus grande rapidité ou l'attaquant en cas d'égalité
     * @param player1 The first player (original attacker)
     * @param player2 The second player (defender)
     */
    handleFirstAttack(player1: Player, player2: Player): void {
        this.checkIcePenalty(player1, player2);
        let attacker: Player;
        let defender: Player;

        if (player2.speed > player1.speed) {
            attacker = player2;
            defender = player1;
        } else {
            attacker = player1;
            defender = player2;
        }
        this.combatService.initCombat(attacker, defender);
    }
    private checkIcePenalty(player1: Player, player2: Player): void {
        const player1Tile = this.movingGameService.getPlayerTile(player1);
        const player2Tile = this.movingGameService.getPlayerTile(player2);
        if (player1Tile?.type === TILE_TYPES.ice) {
            player1.isOnIce = true;
        }
        if (player2Tile?.type === TILE_TYPES.ice) {
            player2.isOnIce = true;
        }
    }

    private findPlayerByName(name: string): Player | undefined {
        return this.players.find((player) => player.name === name);
    }

    private isTeleportationValid(tile: Tile): boolean {
        const isClosedDoor = tile.type === TILE_TYPES.door && tile.image === CLOSED_DOOR;
        const isWall = tile.type === TILE_TYPES.wall;

        return !tile.player && !isWall && !isClosedDoor && !tile.item?.name;
    }

    /**
     * Moves player to the destination tile
     * @param destinationTile The tile to move player to
     */
    private movePlayerToTile(destinationTile: Tile): void {
        const previousTile = this.movingGameService.getPlayerTile(this.localPlayer as Player);
        if (previousTile) {
            previousTile.player = null;
            this.boardService.updateTiles(previousTile);
        }

        if (this.localPlayer) {
            this.localPlayer.coordinate = destinationTile.position;
            destinationTile.player = this.localPlayer;
            this.boardService.updateTiles(destinationTile);
        }
    }

    private showTeleportationError(tile: Tile): void {
        const isClosedDoor = tile.type === TILE_TYPES.door && tile.image === './assets/images/Porte.png';
        const isWall = tile.type === TILE_TYPES.wall;

        this.notificationService.errorMessages = [];

        if (tile.player) {
            this.notificationService.errorMessages.push('La tuile est déjà occupée par un joueur, téléportation impossible.');
        } else if (isWall) {
            this.notificationService.errorMessages.push('Impossible de se téléporter sur un mur.');
        } else if (isClosedDoor) {
            this.notificationService.errorMessages.push('Impossible de se téléporter sur une porte fermée.');
        } else {
            this.notificationService.errorMessages.push("La tuile n'est pas accessible, téléportation impossible.");
        }

        this.notificationService.showModal = true;
    }

    private playerMovedAnnouncer(roomCode: string, player: Player, nextPosition: Coordinate): void {
        this.joinGameService.socket.emit(SocketPlayerMovementLabels.PlayerMoved, {
            roomCode,
            player,
            nextPosition,
        });
    }
}
