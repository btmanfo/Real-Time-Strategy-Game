import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DELAY, MESSAGES_ROOM, mockPlayer } from '@app/constants/constants';
import { AllWaitingRoomInfo } from '@app/interfaces/interface';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { GameData, Player, sizeCapacity } from '@common/interfaces';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ValidationPlayerService {
    private static hasRefreshed = false;
    private readonly destroy$ = new Subject<void>();
    private sourcePlayer = '';
    private code = '';
    private allInfo!: AllWaitingRoomInfo;
    private gameSize = '';
    private _accessCode = '';
    private _isAdministrateur = false;
    private _isLocked = false;

    private readonly playersSubject = new BehaviorSubject<Player[]>([]);
    // Permet d'éviter des erreurs de lint vu que plaeyr$ doit etre avant vu qu'il est public
    /* eslint-disable-next-line @typescript-eslint/member-ordering */
    players$ = this.playersSubject.asObservable();

    constructor(
        private readonly joinGameService: JoinGameService,
        private readonly router: Router,
        private readonly notificationService: NotificationService,
        private readonly playingService: PlayingService,
    ) {
        this.setupSocketListeners();
    }

    get accessCode(): string {
        return this._accessCode;
    }
    get isAdministrateur(): boolean {
        return this._isAdministrateur;
    }
    get isLocked(): boolean {
        return this._isLocked;
    }
    get players(): Player[] {
        return this.playersSubject.value;
    }

    set accessCode(value: string) {
        this._accessCode = value;
    }

    set isAdministrateur(value: boolean) {
        this._isAdministrateur = value;
    }

    set isLocked(value: boolean) {
        this._isLocked = value;
    }

    init(source: string, code: string): void {
        this._accessCode = this.joinGameService.pinCode;
        this.sourcePlayer = source;
        this.code = code;

        if (this.sourcePlayer && this.code) {
            this.fetchRoomInfo();
        }

        this.subscribeToPlayersList();
        this.subscribeToRoomDestroyed();
        this.subscribeToKicked();
        this.checkAdmin();
    }

    destroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    notifyServerOnLeave(): void {
        const actualPlayer = this.getActualPlayer();
        if (actualPlayer && this._accessCode) {
            this.joinGameService.socket.emit(SocketWaitRoomLabels.LeaveRoom, {
                roomCode: this._accessCode,
                player: actualPlayer,
                isAdmin: this._isAdministrateur,
            });
        }
    }

    adminManuallyKick(playerToKick: Player): void {
        this.joinGameService.socket.emit(SocketWaitRoomLabels.KickPlayer, {
            roomCode: this._accessCode,
            player: playerToKick,
        });
        this.joinGameService.socket.once(
            SocketWaitRoomLabels.KickResponse,
            (response: { success: boolean; redirect: string; allPlayers: Player[] }) => {
                if (response.success) {
                    this.playersSubject.next(response.allPlayers);
                }
            },
        );
    }

    toggleLock(): void {
        if (!this.gameSize) return;
        const capacity = sizeCapacity[this.gameSize];
        if (!capacity) return;

        if (!this._isLocked || (this._isLocked && this.players.length < capacity.max)) {
            this._isLocked = !this._isLocked;
            this.joinGameService.toggleRoomLock(this._accessCode, this._isLocked);
        } else if (this._isLocked && this.players.length >= capacity.max) {
            this.notificationService.errorMessages.push(MESSAGES_ROOM.noUnlockedRoom);
            this.notificationService.showModal = true;
        }
    }

    startGame(): boolean {
        if (!this.canStartGame()) return false;

        if (this._isLocked) {
            this.playingService.players = this.players;
            this.joinGameService.startGame(this._accessCode, this.players);
            return true;
        } else if (this._isAdministrateur) {
            this.notificationService.errorMessages.push(MESSAGES_ROOM.lockRoom);
            this.notificationService.showModal = true;
        }
        return false;
    }

    canAddVirtualPlayer(): boolean {
        const capacity = sizeCapacity[this.gameSize];
        if (!this.gameSize || !capacity) return false;
        return this.checkCondition(
            this.players.length <= capacity.max,
            `Impossible d'ajouter un bot car la salle a% atteint sa limite (${capacity.max} joueurs maximum).`,
        );
    }

    isRoomFull(): boolean {
        const capacity = sizeCapacity[this.gameSize];
        if (!capacity) {
            return false;
        }
        return this.players.length >= capacity.max;
    }

    navigateHome(): void {
        if (this.router.url === '/home') {
            if (!ValidationPlayerService.hasRefreshed) {
                ValidationPlayerService.hasRefreshed = true;
                window.location.reload();
            }
        } else {
            this.router.navigate(['/home']);
        }
    }

    private setupSocketListeners(): void {
        this.playingService.socket.on(SocketPlayerMovementLabels.StartGame, (game: GameData) => {
            this.playingService.gameServiceValue.setNewGame(game.game);
            this.playingService.isPlaying = true;
            this.playingService.players = game.players;
            this.router.navigate(['/playingGame']);
        });
    }

    private subscribeToPlayersList(): void {
        this.joinGameService.players$.pipe(takeUntil(this.destroy$)).subscribe((players: Player[]) => {
            this.playersSubject.next(players);
            this.playingService.players = players;
            this.updateLockState();
        });
    }

    private getActualPlayer(): Player | undefined {
        return this.players.find((p) => p.name === this.sourcePlayer);
    }

    private checkAdmin(): void {
        const actualPlayer = this.getActualPlayer();
        this.joinGameService
            .isAdmin(this._accessCode, actualPlayer ?? mockPlayer)
            .pipe(takeUntil(this.destroy$))
            .subscribe((isAdmin: boolean) => {
                this._isAdministrateur = isAdmin;
            });
    }

    private subscribeToRoomDestroyed(): void {
        this.joinGameService
            .onRoomDestroyed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
                this.notificationService.errorMessages.push(data.message);
                this.notificationService.showModal = true;
                setTimeout(() => {
                    this.router.navigate([data.redirect]);
                    this.notificationService.errorMessages = [];
                }, DELAY);
            });
    }

    private subscribeToKicked(): void {
        this.joinGameService
            .onKicked()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data: { message: string; redirect: string }) => {
                this.notificationService.errorMessages.push(data.message);
                this.notificationService.showModal = true;
                this.router.navigate([data.redirect]);
            });
    }

    private fetchRoomInfo(): void {
        this.joinGameService
            .getAllINformation(this.sourcePlayer, this.code)
            .pipe(takeUntil(this.destroy$))
            .subscribe((info: AllWaitingRoomInfo) => {
                this.allInfo = info;
                this._accessCode = this.allInfo.roomCode;
                this._isAdministrateur = this.allInfo.playerIndex === '0';
                this.fetchGameSize();
            });
    }

    private fetchGameSize(): void {
        if (this._accessCode) {
            this.joinGameService
                .getGameSize(this._accessCode)
                .pipe(takeUntil(this.destroy$))
                .subscribe((gameSize: string) => {
                    this.gameSize = gameSize;
                    this.updateLockState();
                });
        }
    }

    private updateLockState(): void {
        if (!this.gameSize) return;
        const capacity = sizeCapacity[this.gameSize];
        if (!capacity) return;
        if (this.players.length >= capacity.max && !this._isLocked) {
            this._isLocked = true;
            this.joinGameService.toggleRoomLock(this._accessCode, this._isLocked);
        }
    }

    private canStartGame(): boolean {
        const capacity = sizeCapacity[this.gameSize];
        if (!this.gameSize || !capacity) return false;
        const isPairCTF = this.checkCondition(
            (this.players.length % 2 === 0 && this.playingService.gameServiceValue.getNewGame().gameMode === 'CTF') ||
                this.playingService.gameServiceValue.getNewGame().gameMode === 'Classique',
            'Nombre de joueurs impair. Veuillez ajouter un joueur.',
        );
        const isGreaterThanCapacity = this.checkCondition(
            this.players.length >= capacity.min,
            `Nombre de joueurs insuffisant. Minimum ${capacity.min} joueurs requis.`,
        );
        return isPairCTF && isGreaterThanCapacity;
    }

    private checkCondition(condition: boolean, errorMessage: string): boolean {
        if (!condition) {
            this.notificationService.errorMessages.push(errorMessage);
            this.notificationService.showModal = true;
            return false;
        }
        return true;
    }
}
