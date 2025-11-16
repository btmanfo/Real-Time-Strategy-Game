import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@app/services/notification-service/notification.service';

@Component({
    selector: 'app-notification-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-popup.component.html',
    styleUrl: './notification-popup.component.scss',
})
export class NotificationPopupComponent {
    @Input() message: string[] = [];
    @Output() closePage = new EventEmitter<void>();

    constructor(
        private readonly _notificationService: NotificationService,
        private readonly router: Router,
    ) {}

    get notificationService(): NotificationService {
        return this._notificationService;
    }

    closeModal() {
        if (
            this.notificationService.errorMessages.includes('Le jeu a été mis à jour avec succès !') ||
            this.notificationService.errorMessages.includes('Le jeu a été créé avec succès !')
        ) {
            this.router.navigate(['/adminPage']);
        }
        this.notificationService.showModal = false;
        this.notificationService.errorMessages = [];
        this.closePage.emit();
    }

    /**
     * Checks if the message is a success message.
     * @param message The message to check.
     * @returns boolean - True if the message is a success message, false otherwise.
     */
    isSuccessMessage(message: string): boolean {
        return message === 'Le jeu a été mis à jour avec succès !' || message === 'Le jeu a été créé avec succès !';
    }
}
