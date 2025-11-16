import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CHESTBOX_NAME } from '@app/constants/constants';
import { GameService } from '@app/services/game-service/game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player } from '@common/interfaces';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-game-player-list',
    imports: [CommonModule],
    templateUrl: './game-player-list.component.html',
    styleUrls: ['./game-player-list.component.scss'],
    standalone: true,
})
export class GamePlayerListComponent implements OnChanges, OnInit, OnDestroy {
    @Input() players: Player[] = [];
    @Input() isAdmin: boolean = false;
    @Output() playerToDelete = new EventEmitter<Player>();
    @Output() playersUpdated = new EventEmitter<Player[]>();
    private readonly destroy$: Subject<void> = new Subject<void>();

    private currentPlayer: Player | null = null;
    private previousPlayers: Player[] = [];
    private readonly disconnectedPlayers: Set<string> = new Set();
    private playerTurnSubscription?: Subscription;

    /**
     * Component constructor.
     * @param playingService - Service for handling game play logic.
     */
    constructor(
        private readonly playingService: PlayingService,
        private readonly gameService: GameService,
    ) {}

    get gameServiceValue(): GameService {
        return this.gameService;
    }

    /**
     * Lifecycle hook called after data-bound properties are initialized.
     * Subscribes to player turn changes.
     */
    ngOnInit(): void {
        this.playerTurnSubscription = this.playingService.playerTurn$.pipe(takeUntil(this.destroy$)).subscribe((player: Player | null) => {
            this.currentPlayer = player;
        });
    }

    /**
     * Lifecycle hook called when any data-bound property changes.
     * @param changes - Object of changed properties.
     */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['players']) {
            const currentPlayerNames = new Set(this.players.map((p) => p.name));
            this.previousPlayers.forEach((player) => {
                if (player.name && !currentPlayerNames.has(player.name)) {
                    this.disconnectedPlayers.add(player.name);
                }
            });
            const allPlayers = [...this.players];
            const disconnectedPlayersToKeep = this.previousPlayers
                .filter((player) => player.name && this.disconnectedPlayers.has(player.name))
                .filter((player) => !currentPlayerNames.has(player.name));

            allPlayers.push(...disconnectedPlayersToKeep);
            this.players = allPlayers;
            this.previousPlayers = [...this.players];
        }
    }

    /**
     * Lifecycle hook called once the component is about to be destroyed.
     * Unsubscribes from all subscriptions to prevent memory leaks.
     */
    ngOnDestroy(): void {
        this.playerTurnSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Checks if a player is disconnected.
     * @param {string | null} playerName - The name of the player to check.
     * @returns {boolean} True if the player is disconnected, otherwise false.
     */
    isPlayerDisconnected(playerName: string | null): boolean {
        return !!playerName && this.disconnectedPlayers.has(playerName);
    }

    /**
     * Emits an event to delete the specified player.
     * @param {Player} player - The player to delete.
     */
    onDelete(player: Player): void {
        this.playerToDelete.emit(player);
    }

    /**
     * Updates the players list and emits an update event.
     * @param {Player[]} players - The new players list.
     */
    updatePlayers(players: Player[]): void {
        this.players = players;
        this.playersUpdated.emit(this.players);
    }

    /**
     * Checks if the provided avatar URL matches the current player's avatar.
     * @param {string | null | undefined} playerAvatarUrl - The avatar URL of a player.
     * @returns {boolean} True if the avatar URL matches the current player's avatar, otherwise false.
     */
    isCurrentPlayer(playerAvatarUrl: string | null | undefined): boolean {
        if (!playerAvatarUrl || !this.currentPlayer?.avatarUrl) return false;
        return this.currentPlayer.avatarUrl === playerAvatarUrl;
    }

    /**
     * Checks if a player has the flag item in their inventory
     * @param player The player to check
     * @returns boolean indicating if player has the flag
     */
    hasFlag(player: Player): boolean {
        return !!player?.inventory && player.inventory.some((item) => item && item.name === CHESTBOX_NAME);
    }
}
