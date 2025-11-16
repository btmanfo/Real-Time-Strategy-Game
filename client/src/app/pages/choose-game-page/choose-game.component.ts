import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GameCardComponent } from '@app/components/games/games.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { NotificationSnackbarComponent } from '@app/components/notification-snackbar/notification-snackbar.component';
import { pageName } from '@app/constants/constants';
import { Game, NotifcationInterface } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-choose-game-page',
    imports: [RouterLink, GameCardComponent, HeaderComponent, NotificationSnackbarComponent, FormsModule],
    templateUrl: './choose-game.component.html',
    styleUrls: ['./choose-game.component.scss'],
})
export class ChooseGamePageComponent implements OnInit, OnDestroy {
    @Input() game: Game;
    @Input() showMenu: boolean = false;
    @Input() isAdmin: boolean = false;
    games: Game[] = [];
    filteredGames: Game[] = [];
    visibilityFilter: string = 'all';
    gameModeFilter: string = 'all';
    sizeFilter: string = 'all';
    gameModes: string[] = [];
    sizes: string[] = [];

    private readonly _title: string = pageName.chooseGamePage;
    private readonly _titleAdmin: string = pageName.adminPage;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly gameService: GameService,
        private readonly notificationService: NotificationService,
    ) {
        this.subscribeToNotifications();
    }

    get getTitleValue(): string {
        return this._title;
    }

    get getTitleAdminValue(): string {
        return this._titleAdmin;
    }

    get notification(): NotifcationInterface {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    ngOnInit(): void {
        this.loadGames();
        localStorage.setItem('shouldRedirectToHome', 'false');
        localStorage.setItem('isReloaded', 'false');
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onGameDeleted() {
        this.loadGames();
    }

    hidePopup() {
        this.notificationService.showModal = false;
        this.loadGames();
    }

    loadGames() {
        if (this.isAdmin) {
            this.gameService
                .getGames()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (games) => {
                        this.games = games;
                        this.extractFilterOptions();
                        this.applyFilters();
                    },
                });
        } else {
            this.gameService
                .getVisibleGames()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (games) => {
                        this.games = games;
                        this.extractFilterOptions();
                        this.applyFilters();
                    },
                });
        }
    }

    extractFilterOptions(): void {
        const modesSet = new Set<string>();
        this.games.forEach((game) => {
            if (game.gameMode) {
                modesSet.add(game.gameMode);
            }
        });
        this.gameModes = Array.from(modesSet);

        const sizesSet = new Set<string>();
        this.games.forEach((game) => {
            if (game.size) {
                sizesSet.add(game.size);
            }
        });
        this.sizes = Array.from(sizesSet);
    }

    applyFilters(): void {
        this.filteredGames = this.games.filter((game) => {
            if (this.visibilityFilter !== 'all') {
                const isVisible = this.visibilityFilter === 'visible';
                if (game.visibility !== isVisible) {
                    return false;
                }
            }

            if (this.gameModeFilter !== 'all' && game.gameMode !== this.gameModeFilter) {
                return false;
            }

            if (this.sizeFilter !== 'all' && game.size !== this.sizeFilter) {
                return false;
            }

            return true;
        });
    }

    onVisibilityFilterChange(): void {
        this.applyFilters();
    }

    onGameModeFilterChange(): void {
        this.applyFilters();
    }

    onSizeFilterChange(): void {
        this.applyFilters();
    }

    resetFilters(): void {
        this.visibilityFilter = 'all';
        this.gameModeFilter = 'all';
        this.sizeFilter = 'all';
        this.applyFilters();
    }

    private subscribeToNotifications(): void {
        this.notificationService.notification$.pipe(takeUntil(this.destroy$)).subscribe((message) => {
            if (message) {
                this.notificationService.errorMessages = [message];
                this.notificationService.showModal = true;
            }
        });
    }
}
