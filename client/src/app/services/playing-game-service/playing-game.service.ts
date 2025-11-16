import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { COUNT_START, START_TIME_WITH_ATTEMPT, START_TIME_WITH_NO_ATTEMPT, TIME_DECREMENTATION_OF_A_SECOND } from '@app/constants/constants';
import { CreateRoomInterface, NotifcationInterface, OnMessageReceivedInterface, UpdateDiceRollsInterface } from '@app/interfaces/interface';
import { ActionService } from '@app/services/action-service/action.service';
import { ActionSocketService } from '@app/services/action-socket-service/action-socket.service';
import { BoardService } from '@app/services/board-service/board.service';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { DebugModeService } from '@app/services/debug-mode-service/debug-mode.service';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingBotService } from '@app/services/playing-bot-service/playing-bot.service';
import { PlayingItemsService } from '@app/services/playing-items-service/playing-items.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { PlayingSocketService } from '@app/services/playing-socket-service/playing-socket.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player, Tile } from '@common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class PlayingGameService implements OnDestroy {
    isDebugMode = false;
    showLeaveConfirmationPopup = false;
    isInFight = false;
    count = COUNT_START;
    emitValueToAttack = '';
    attackerRoll = 0;
    defenderRoll = 0;
    isPlayerSubmit = false;
    botCheckIntervalId: number;
    private intervalId: ReturnType<typeof setInterval>;
    private isInCombat = false;
    private isActionTriggered = false;
    private roomCode: string = '';
    private hasExecuted = false;
    private readonly socketSubscriptions: (() => void)[] = [];
    private readonly destroy$ = new Subject<void>();

    /* eslint-disable max-params*/
    // Nous avons besoins de ce nombre de service afin que de bien faire fonctionner notre phase de combat
    constructor(
        private readonly boardService: BoardService,
        private readonly router: Router,
        private readonly playingService: PlayingService,
        private readonly notificationService: NotificationService,
        private readonly playingSocketService: PlayingSocketService,
        private readonly movingGameService: MovingGameService,
        private readonly joinGameService: JoinGameService,
        private readonly debugModeService: DebugModeService,
        private readonly actionService: ActionService,
        private readonly playingItemsService: PlayingItemsService,
        private readonly gameLogService: GameLogService,
        private readonly combatService: CombatService,
        private readonly actionSocketService: ActionSocketService,
        private readonly playingBotService: PlayingBotService,
    ) {}

    get notification(): NotifcationInterface {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    get interval(): ReturnType<typeof setInterval> {
        return this.intervalId;
    }

    get inCombat(): boolean {
        return this.isInCombat;
    }

    get actionTriggered(): boolean {
        return this.isActionTriggered;
    }

    get room(): string {
        return this.roomCode;
    }

    get executed(): boolean {
        return this.hasExecuted;
    }

    set interval(value: ReturnType<typeof setInterval>) {
        this.intervalId = value;
    }

    set inCombat(value: boolean) {
        this.isInCombat = value;
    }

    set actionTriggered(value: boolean) {
        this.isActionTriggered = value;
    }

    set room(value: string) {
        this.roomCode = value;
    }

    set executed(value: boolean) {
        this.hasExecuted = value;
    }

    initialize(): void {
        this.handleReload();
        this.initializeGame();
        localStorage.setItem('hasQuit', 'false');
        this.subscribeToDebugMode();
        this.handleRoomCreation();
        this.handleMessageReception();
        this.actionSocketService.manageSocketEvents();
    }

    unloadNotification(): void {
        this.playingItemsService.dropLoserItems(this.playingService.localPlayer?.name as string);
        this.emitQuitGame();
        localStorage.setItem('isReloaded', 'true');
    }

    /**
     * Handle debug mode key press
     * @param isCurrentPlayerAdmin Whether the current player is admin
     * @returns Whether debug mode is enabled
     */
    toggleDebugMode(isCurrentPlayerAdmin: boolean): boolean {
        this.isDebugMode = this.debugModeService.toggleDebugMode(isCurrentPlayerAdmin);
        return this.isDebugMode;
    }

    emitIsInAttack(): void {
        if (this.playingService.localPlayer?.name && this.isPlayerSubmit === false) {
            if (this.combatService.attacker.name !== this.playingService.localPlayer?.name) {
                this.combatService.updateIsInCombat(this.playingService.localPlayer?.name, this.combatService.attacker.name);
            }
            if (this.combatService.defender.name !== this.playingService.localPlayer?.name) {
                this.combatService.updateIsInCombat(this.playingService.localPlayer?.name, this.combatService.defender.name);
            }
            this.isPlayerSubmit = true;
        }
    }

    /**
     * Check if the current player is in combat
     * @returns Whether the current player is in combat
     */
    isInCombatPlayer(): boolean {
        if (this.combatService.attacker.name === this.playingService.localPlayer?.name) {
            return true;
        }
        if (this.combatService.defender.name === this.playingService.localPlayer?.name) {
            return true;
        }
        return false;
    }

    activateInAttack(): void {
        this.isPlayerSubmit = false;
    }

    /**
     * Decrement the time limit for combat
     * @param decrementTime Time to decrement
     */
    decrementTimeLimit(decrementTime: number): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        if (this.isInFight) {
            this.count = decrementTime;

            this.intervalId = setInterval(() => {
                if (this.count > 0) {
                    this.count--;
                } else {
                    clearInterval(this.intervalId);
                    this.count = decrementTime;
                    this.emitValueToAttack = uuidv4();
                }
            }, TIME_DECREMENTATION_OF_A_SECOND);
        }
    }

    ngOnDestroy(): void {
        this.playingService.isPlaying = false;
        this.clearIntervals();
        this.unsubscribeFromSocketEvents();
        this.destroySocketEvents();
        this.destroy$.next();
        this.destroy$.complete();
    }

    activateAction(): void {
        if (this.playingService.isPlayerTurn()) {
            this.actionService.activateAction();
        }
    }

    endTurn(): void {
        if (this.playingService.isPlayerTurn()) {
            this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.EndTurn, {
                roomCode: this.playingService.joinGameService.pinCode,
            });
        }
    }

    /**
     * Handle mouse over tile event
     * @param tile Tile being hovered over
     */
    mouseOverTile(tile: Tile): void {
        if (this.playingService.localPlayer === null || !this.isActionTriggered) {
            return;
        }
        this.boardService.clearHighlightedPath();
        const path = this.movingGameService.findShortestPath(this.playingService.localPlayer, tile);
        this.boardService.highlightPath(path);
    }

    /**
     * Handle right click on tile
     * @param tile Tile being right-clicked
     */
    onTileRightClick(tile: Tile): void {
        this.playingService.teleportPlayer(tile);
    }

    toggleCombat(): boolean {
        this.isInCombat = !this.isInCombat;
        return this.isInCombat;
    }

    inCombatToggle(): void {
        this.hasExecuted = false;
    }

    /**
     * Execute combat function if not already executed
     * @returns Empty string (used for binding)
     */
    executeFunction(): string {
        if (!this.hasExecuted) {
            this.hasExecuted = true;
            this.isInFight = false;
        }
        return '';
    }

    /**
     * Update dice roll values
     * @param event Dice roll event
     */
    updateDiceRolls(event: UpdateDiceRollsInterface): void {
        this.attackerRoll = event.attackerRoll;
        this.defenderRoll = event.defenderRoll;
    }

    quitGame(): void {
        this.showLeaveConfirmationPopup = !this.showLeaveConfirmationPopup;
    }

    emitQuitGame(): void {
        localStorage.setItem('hasQuit', 'true');
        if (this.playingService.localPlayer) {
            const foundPlayer = this.playingService.players.find((player) => player.name === this.playingService.localPlayer?.name);
            if (foundPlayer?.isAdmin) {
                this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.DebugModeChanged, {
                    roomCode: this.playingService.joinGameService.pinCode,
                    isDebugMode: false,
                });
            }
        }
        this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.QuitGame, {
            map: this.boardService.tiles,
            player: this.playingService.localPlayer,
            roomCode: this.playingService.joinGameService.pinCode,
        });
        if (this.playingService.localPlayer) {
            this.gameLogService.sendAbandonLog(this.gameLogService.myRoom, this.playingService.localPlayer);
        }
    }

    /**
     * Handle leave confirmation response
     * @param condition Whether to leave the game
     */
    handleLeaveConfirmation(condition: boolean): void {
        this.showLeaveConfirmationPopup = false;
        if (condition) {
            this.notificationService.isTimedNotification = false;
            this.playingItemsService.dropLoserItems(this.playingService.localPlayer?.name as string);
            this.emitQuitGame();
        }
    }

    closeLeaveConfirmationPopup(): void {
        this.showLeaveConfirmationPopup = false;
    }

    emitEndTurn(): void {
        if (this.playingService.isPlayerTurn()) {
            const doesHaveTeleportPotion = this.playingService.localPlayer?.inventory?.some((item) => item.name === 'potion2');
            if (doesHaveTeleportPotion) {
                this.playingItemsService.teleportPotion();
            }
            this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.EndTurn, {
                roomCode: this.playingService.joinGameService.pinCode,
            });
        }
    }

    checkForBotTurn(): void {
        this.playingBotService.checkForBotTurn(this.handleBotFight.bind(this));
    }

    /**
     * Navigate to a specific route
     * @param route Route to navigate to
     */
    navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    /**
     * Handle bot fight
     * @param players Players in fight
     */
    private handleBotFight(players: Player[]): void {
        this.isInFight = true;
        this.playingService.handleFirstAttack(players[0], players[1]);

        this.joinGameService
            .onRoomCreated()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.roomCode = data.codeRoom;
                },
            });
    }

    private handleReload(): void {
        if (localStorage.getItem('isReloaded') === 'true') {
            localStorage.setItem('isReloaded', 'false');
            this.router.navigate(['/home']);
        }
    }

    private initializeGame(): void {
        this.playingService.initGame();
        this.playingSocketService.manageSocketEvents();
    }

    private subscribeToDebugMode(): void {
        this.playingService.joinGameService.socket.on(SocketPlayerMovementLabels.DebugModeChanged, (data: { isDebugMode: boolean }) => {
            this.isDebugMode = data.isDebugMode;
            this.playingService.isDebugMode = this.isDebugMode;
        });
    }

    private handleRoomCreation(): void {
        this.joinGameService
            .onRoomCreated()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data: CreateRoomInterface) => {
                this.roomCode = data.codeRoom;
                const localName = this.playingService.localPlayer?.name;
                this.isInFight = localName === data.theFirstPlayer.name || localName === data.theSecondPlayer.name;
            });
    }

    private handleMessageReception(): void {
        this.joinGameService
            .onMessageReceived()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data: OnMessageReceivedInterface) => {
                if (!this.isInFight || data.userName !== this.playingService.localPlayer?.name) return;

                if (data.message === 'Count to 3') {
                    this.decrementTimeLimit(START_TIME_WITH_NO_ATTEMPT);
                } else if (data.message === 'Count to 5') {
                    this.decrementTimeLimit(START_TIME_WITH_ATTEMPT);
                }
            });
    }

    private clearIntervals(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        if (this.botCheckIntervalId) {
            clearInterval(this.botCheckIntervalId);
        }
    }

    private unsubscribeFromSocketEvents(): void {
        this.socketSubscriptions?.forEach((unsubscribe) => {
            unsubscribe();
        });
    }

    private destroySocketEvents(): void {
        this.playingSocketService.destroySocketEvents();
    }
}
