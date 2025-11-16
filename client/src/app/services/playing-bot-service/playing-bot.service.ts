import { Injectable, OnDestroy } from '@angular/core';
import { RETRY_COUNT, TIME_TICK } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { fromEvent, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class PlayingBotService implements OnDestroy {
    private isBotTurnInProgress = false;
    private botFightSubscription: Subscription | null;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly playingService: PlayingService,
        private readonly joinGameService: JoinGameService,
        private readonly actionService: ActionService,
    ) {}

    /**
     * Check if it's a bot's turn and handle it
     * @param onBotFight Callback to execute when a bot enters a fight
     */
    checkForBotTurn(onBotFight: (players: Player[]) => void): void {
        if (this.isBotTurnInProgress) {
            return;
        }

        const currentPlayer = this.playingService.playerTurn;
        if (!currentPlayer || !this.actionService.isBot(currentPlayer)) {
            return;
        }

        try {
            this.isBotTurnInProgress = true;
            this.handleBotTurn(currentPlayer, onBotFight);
        } catch (error) {
            throw Error('Error during bot turn:' + error);
        }
    }

    ngOnDestroy(): void {
        this.cleanupBotSubscription();
        this.destroy$.next();
        this.destroy$.complete();
    }
    cleanupBotSubscription(): void {
        if (this.botFightSubscription) {
            this.botFightSubscription.unsubscribe();
        }
        this.isBotTurnInProgress = false;
    }

    /**
     * Handle bot turn
     * @param botPlayer Bot player
     * @param onBotFight Callback to execute when a bot enters a fight
     */
    private handleBotTurn(botPlayer: Player, onBotFight: (players: Player[]) => void): void {
        if (this.botFightSubscription) {
            this.botFightSubscription.unsubscribe();
        }

        this.botFightSubscription = fromEvent(this.joinGameService.socket, SocketPlayerMovementLabels.StartFight)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (players: Player[]) => {
                    if (this.isBotInvolved(botPlayer, players)) {
                        onBotFight(players);
                    }
                },
            });

        this.executeBotTurnWithRetry(botPlayer);
    }

    /**
     * Check if a bot is involved in a fight
     * @param botPlayer Bot player
     * @param players Players in fight
     * @returns Whether the bot is involved
     */
    private isBotInvolved(botPlayer: Player, players: Player[]): boolean {
        return players.some((p) => p.name === botPlayer.name);
    }

    /**
     * Execute bot turn with retry mechanism
     * @param botPlayer Bot player
     * @param retryCount Number of retries left
     */
    private executeBotTurnWithRetry(botPlayer: Player, retryCount = RETRY_COUNT): void {
        const attemptBotTurn = () => {
            try {
                try {
                    this.actionService.autoBotTurn(botPlayer);
                } catch (error) {
                    if (retryCount > 0) {
                        setTimeout(() => attemptBotTurn(), TIME_TICK);
                    }
                }
            } catch (error) {
                if (retryCount > 0) {
                    setTimeout(() => attemptBotTurn(), TIME_TICK);
                }
            }
        };

        attemptBotTurn();
    }
}
