import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { NOTIFICANTION_DELAY } from '@app/constants/constants';
import { NotificationService } from '@app/services/notification-service/notification.service';

@Component({
    selector: 'app-notification-snackbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-snackbar.component.html',
    styleUrl: './notification-snackbar.component.scss',
})
export class NotificationSnackbarComponent implements OnInit, OnChanges {
    @Input() duration: number = NOTIFICANTION_DELAY;
    private timeoutId: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly notificationService: NotificationService,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    get notificationServiceValue(): NotificationService {
        return this.notificationService;
    }

    /**
     * Lifecycle hook that is called when the component is initialized.
     * It starts a timeout to close the notification after a specified duration.
     * @returns {void}
     */
    ngOnInit(): void {
        this.startTimeout();
    }

    /**
     * Lifecycle hook that is called when the component's inputs change.
     * @returns {void}
     */
    ngOnChanges(): void {
        this.restartTimeout();
    }

    restartTimeout(): void {
        clearTimeout(this.timeoutId);
        this.startTimeout();
        this.cdr.detectChanges();
    }

    closeAllNotifications(): void {
        this.notificationService.showModal = false;
        this.notificationService.errorMessages = [];
        this.cdr.detectChanges();
    }

    private startTimeout(): void {
        this.timeoutId = setTimeout(() => {
            this.closeAllNotifications();
        }, this.duration);
    }
}
