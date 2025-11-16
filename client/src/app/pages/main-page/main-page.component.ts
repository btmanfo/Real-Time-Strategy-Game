import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { NotificationService } from '@app/services/notification-service/notification.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, NotificationPopupComponent],
})
export class MainPageComponent {
    constructor(private readonly notificationService: NotificationService) {}

    get notification(): { showModal: boolean; errorMessages: string[] } {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }
}
