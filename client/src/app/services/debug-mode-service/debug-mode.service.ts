import { Injectable } from '@angular/core';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';

@Injectable({
    providedIn: 'root',
})
export class DebugModeService {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly playingService: PlayingService,
        private readonly gameLogService: GameLogService,
    ) {}

    toggleDebugMode(isAdmin: boolean): boolean {
        if (!isAdmin) {
            this.notificationService.errorMessages = [];
            this.notificationService.errorMessages.push("Vous n'êtes pas autorisé à activer le mode débogage.");
            this.notificationService.showModal = true;
            return false;
        }

        const isDebugMode = !this.playingService.isDebugMode;

        this.playingService.joinGameService.socket.emit(SocketPlayerMovementLabels.DebugModeChanged, {
            roomCode: this.playingService.joinGameService.pinCode,
            isDebugMode,
        });

        this.playingService.isDebugMode = isDebugMode;

        this.notificationService.errorMessages = [];
        this.notificationService.errorMessages.push(`Mode débogage ${isDebugMode ? 'activé' : 'désactivé'}`);
        this.notificationService.showModal = true;
        if (this.playingService.localPlayer)
            this.gameLogService.sendDebugLog(this.gameLogService.myRoom, this.playingService.localPlayer, isDebugMode);

        return isDebugMode;
    }
}
