import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Game } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-games',
    imports: [RouterLink],
    templateUrl: './games.component.html',
    styleUrls: ['./games.component.scss'],
})
export class GameCardComponent implements OnDestroy {
    @Input() showMenu: boolean = true;
    @Input() game!: Game;
    @Input() isAdmin: boolean = false;
    @Output() gameDeleted = new EventEmitter<string>();

    games: Game[] = [];
    showDescriptions: boolean = false;
    showPopup: boolean = false;
    selectedGameId: string | null = null;
    private readonly destroy$ = new Subject<void>();
    private readonly subscriptions: Subscription[] = [];

    constructor(
        private readonly gameService: GameService,
        private readonly notification: NotificationService,
        private readonly router: Router,
    ) {}

    /**
     * Lifecycle hook that gets called when the component is destroyed.
     * Cleans up all active subscriptions.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Method to show the game description and hide the menu.
     */
    showDescription() {
        this.showMenu = false;
        this.showDescriptions = true;
    }

    /**
     * Method to hide the game description.
     */
    hideDescription() {
        this.showDescriptions = false;
    }

    /**
     * Method to confirm the deletion of a game.
     * @param id The ID of the game to delete.
     */
    confirmDelete(id: string) {
        this.selectedGameId = id;
        this.showPopup = true;
    }

    /**
     * Method to close the confirmation popup.
     */
    closePopup() {
        this.showPopup = false;
        this.selectedGameId = null;
    }

    /**
     * Method to delete a game using the GameService.
     * @param game The game object to be deleted.
     */
    deleteGame(game: Game) {
        const sub = this.gameService
            .deleteGame(game.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.closePopup();
                    this.gameDeleted.emit(game.id);
                    this.notification.listenForDeletedGame();
                },
            });

        this.subscriptions.push(sub);
    }

    /**
     * Method to toggle the visibility of a game.
     * @param game The game whose visibility is being toggled.
     */
    toggleVisibility(game: Game) {
        const newVisibility = !game.visibility;
        const sub = this.gameService
            .updateVisibility(game.id, newVisibility)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedGame) => {
                    game.visibility = updatedGame.visibility;
                    this.notification.listenForNotifications();
                },
            });

        this.subscriptions.push(sub);
    }

    /**
     * Method to navigate to the game editing page with the selected game.
     * @param game The game to edit.
     */
    modifyGame(game: Game) {
        this.gameService.setNewGame(game);
        localStorage.setItem('gameId', game.id);
        this.router.navigate(['/edition']);
    }

    getGame() {
        const sub = this.gameService
            .getGameById(this.game.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (game) => {
                    this.game = game;
                },
            });

        this.subscriptions.push(sub);
        this.gameService.setNewGame(this.game);
    }
}
