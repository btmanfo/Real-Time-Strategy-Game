import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatSystemComponent } from '@app/components/chat-system/chat-system.component';
import { NotificationSnackbarComponent } from '@app/components/notification-snackbar/notification-snackbar.component';
import { PlayerListComponent } from '@app/components/player-list/player-list.component';
import { VirtualPlayerComponent } from '@app/components/virtual-player/virtual-player.component';
import { IS_OPEN } from '@app/constants/constants';
import { NotificationState } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { ValidationPlayerService } from '@app/services/validation-player-service/validation-player-service.service';
import { Player } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-validation-player',
    templateUrl: './validation-player.component.html',
    styleUrls: ['./validation-player.component.scss'],
    imports: [CommonModule, PlayerListComponent, NotificationSnackbarComponent, ChatSystemComponent, VirtualPlayerComponent, ChatSystemComponent],
    standalone: true,
})
export class ValidationPlayerComponent implements OnInit, OnDestroy {
    showVirtualPlayerModal = false;
    showLeaveConfirmationPopup = false;
    isChatOpen = IS_OPEN;
    private previousPlayers: Player[] = [];
    private source = '';
    private code = '';
    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(
        private readonly validationPlayerService: ValidationPlayerService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly notificationService: NotificationService,
        private readonly gameService: GameService,
    ) {}

    get gameServiceValue(): GameService {
        return this.gameService;
    }

    get previousPlayersValue(): Player[] {
        return this.previousPlayers;
    }

    get accessCodeValue(): string {
        return this.validationPlayerService.accessCode;
    }

    get playersValue(): Player[] {
        return this.validationPlayerService.players;
    }

    get isLockedValue(): boolean {
        return this.validationPlayerService.isLocked;
    }

    get isAdministrateurValue(): boolean {
        return this.validationPlayerService.isAdministrateur;
    }

    get showLeaveConfirmationPopupValue(): boolean {
        return this.showLeaveConfirmationPopup;
    }

    get notification(): NotificationState {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    @HostListener('window:unload', ['$event'])
    onBeforeUnload(event: Event): void {
        this.validationPlayerService.notifyServerOnLeave();
        localStorage.setItem('shouldRedirectToHome', 'true');
        event.preventDefault();
    }

    openVirtualPlayerModal(): void {
        this.showVirtualPlayerModal = true;
    }

    closeVirtualPlayerModal(): void {
        this.showVirtualPlayerModal = false;
    }

    generateVirtualPlayer(): void {
        if (!this.validationPlayerService.canAddVirtualPlayer()) return;
        this.openVirtualPlayerModal();
    }

    ngOnInit(): void {
        this.previousPlayers = [];
        if (this.shouldRedirectToHome()) {
            this.redirectToHome();
            return;
        }
        this.fetchQueryParams();
        this.initComponent();
    }

    ngOnDestroy(): void {
        this.validationPlayerService.destroy();
    }

    confirmLeaveRoom(): void {
        this.showLeaveConfirmationPopup = true;
    }

    closeLeaveConfirmationPopup(): void {
        this.showLeaveConfirmationPopup = false;
    }

    handleLeaveConfirmation(confirmed: boolean): void {
        this.closeLeaveConfirmationPopup();
        if (confirmed) {
            this.leaveRoom();
        }
    }

    leaveRoom(): void {
        this.validationPlayerService.notifyServerOnLeave();
        this.validationPlayerService.navigateHome();
    }

    adminManuallyKick(playerToKick: Player): void {
        this.validationPlayerService.adminManuallyKick(playerToKick);
    }

    toggleLock(): void {
        this.validationPlayerService.toggleLock();
    }

    startGame(): void {
        this.validationPlayerService.startGame();
    }

    isRoomFull(): boolean {
        return this.validationPlayerService.isRoomFull();
    }

    displayChat(): void {
        this.isChatOpen = !this.isChatOpen;
    }

    private shouldRedirectToHome(): boolean {
        const redirection = localStorage.getItem('shouldRedirectToHome');
        return redirection === 'true' && this.router.url !== '/playingGame';
    }

    private redirectToHome(): void {
        localStorage.setItem('shouldRedirectToHome', 'false');
        this.validationPlayerService.navigateHome();
    }

    private fetchQueryParams(): void {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.source = params['source'] ?? '';
            this.code = params['code'] ?? '';
        });
    }

    private initComponent(): void {
        this.validationPlayerService.init(this.source, this.code);
    }
}
