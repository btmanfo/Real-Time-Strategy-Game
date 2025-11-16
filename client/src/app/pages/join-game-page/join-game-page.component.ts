import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationSnackbarComponent } from '@app/components/notification-snackbar/notification-snackbar.component';
import { FORMAT_INPUT_COUNT } from '@app/constants/constants';
import { NotifcationInterface } from '@app/interfaces/interface';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { Player } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-join-game-page',
    templateUrl: './join-game-page.component.html',
    styleUrls: ['./join-game-page.component.scss'],
    imports: [RouterLink, FormsModule, NotificationSnackbarComponent],
})
export class JoinGamePageComponent implements OnDestroy {
    userInput: string = '';
    displayedInput: string = '';
    private readonly player: Player;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly joingameSocketService: JoinGameService,
        private readonly notificationService: NotificationService,
        private readonly router: Router,
    ) {}

    get playerValue(): Player {
        return this.player;
    }

    get notification(): NotifcationInterface {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    formatPinInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        let digits = input.value.replace(/\D/g, '');
        digits = digits.substring(0, FORMAT_INPUT_COUNT);
        this.userInput = digits;
        this.displayedInput = digits.split('').join(' ');
        input.value = this.displayedInput;
    }

    isRoomExist(): void {
        if (!this.validateRoomCode()) return;

        this.joingameSocketService
            .isRoomExist(this.userInput)
            .pipe(takeUntil(this.destroy$))
            .subscribe((exists: boolean) => {
                if (!exists) {
                    this.handleRoomDoesNotExist();
                    return;
                }

                this.joingameSocketService.joinRoomSelectCharacter(this.userInput);
                this.checkIfRoomLockedOrFull();
            });
    }

    private validateRoomCode(): boolean {
        if (this.userInput.length !== FORMAT_INPUT_COUNT) {
            this.showError('Veuillez entrer un NIP à 4 chiffres.');
            return false;
        }

        if (!/^\d+$/.test(this.userInput)) {
            this.showError('Veuillez entrer uniquement des chiffres pour le code NIP.');
            return false;
        }

        return true;
    }

    private showError(message: string): void {
        this.notificationService.errorMessages.push(message);
        this.notificationService.showModal = true;
    }

    private checkIfRoomLockedOrFull(): void {
        this.joingameSocketService
            .isRoomLocked(this.userInput)
            .pipe(takeUntil(this.destroy$))
            .subscribe((isLocked: boolean) => {
                if (isLocked) {
                    this.showError('La salle est verrouillée. Vous ne pouvez pas y entrer.');
                    return;
                }

                this.joingameSocketService
                    .isRoomFull(this.userInput)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((isFull: boolean) => {
                        if (isFull) {
                            this.showError('Le max de joueur a été atteint. Vous ne pouvez pas y entrer.');
                            return;
                        }

                        this.handleRoomExists();
                    });
            });
    }

    private handleRoomExists(): void {
        this.joingameSocketService
            .getGameId(this.userInput)
            .pipe(takeUntil(this.destroy$))
            .subscribe((gameIdValue: string) => {
                this.router.navigate(['/selectCharacter', gameIdValue], { queryParams: { source: this.userInput, pin: this.userInput } });
            });
    }

    private handleRoomDoesNotExist(): void {
        this.notificationService.errorMessages.push('Le code NIP saisi est incorrect. Veuillez réessayer.');
        this.notificationService.showModal = true;
    }
}
