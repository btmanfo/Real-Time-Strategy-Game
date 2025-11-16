import { Injectable } from '@angular/core';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';

@Injectable({
    providedIn: 'root',
})
export class GameManagementService {
    showLeaveConfirmationPopup: boolean = false;

    constructor(
        private readonly playingService: PlayingService,
        private readonly notificationService: NotificationService,
    ) {}

    quitGame(): boolean {
        this.showLeaveConfirmationPopup = !this.showLeaveConfirmationPopup;
        return this.showLeaveConfirmationPopup;
    }

    emitQuitGame(): void {
        this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.QuitGame, {
            map: this.playingService.boardServiceValue.tiles,
            player: this.playingService.localPlayer,
            roomCode: this.playingService.joinGameService.pinCode,
        });
    }

    handleLeaveConfirmation(condition: boolean): void {
        this.showLeaveConfirmationPopup = false;
        if (condition) {
            this.notificationService.isTimedNotification = false;
            this.emitQuitGame();
        }
    }

    closeLeaveConfirmationPopup(): void {
        this.showLeaveConfirmationPopup = false;
    }
}
