/* eslint-disable no-unused-vars */
// Utilisation de fonction sans utiliser la totalité méthodes

import { Injectable } from '@angular/core';
import { TIME_BETWEEN_TURNS_MS } from '@app/constants/constants';
import { NotifcationVisibilityInterface } from '@app/interfaces/interface';
import { SocketNotificationLabels } from '@common/constants';
import { FindGameInterface } from '@common/interfaces';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    socket: Socket;
    errorMessages: string[] = [];
    isTimedNotification = false;
    showModal: boolean = false;

    private readonly gameDeletedSubject = new Subject<{ id: string; name: string }>();
    // Permet d'éviter des erreurs de lint vu que plaeyr$ doit etre avant vu qu'il est public
    /* eslint-disable-next-line @typescript-eslint/member-ordering */
    gameDeleted$ = this.gameDeletedSubject.asObservable();
    private readonly notificationSubject = new Subject<string>();
    // Permet d'éviter des erreurs de lint vu que plaeyr$ doit etre avant vu qu'il est public
    /* eslint-disable-next-line @typescript-eslint/member-ordering */
    notification$ = this.notificationSubject.asObservable();

    constructor() {
        this.socket = io(environment.serverUrlBase);
        this.listenForNotifications();
        this.listenForDeletedGame();
    }

    get gameDeleted(): Subject<{ id: string; name: string }> {
        return this.gameDeletedSubject;
    }

    get notification(): Subject<string> {
        return this.notificationSubject;
    }

    listenForNotifications() {
        this.socket.on(SocketNotificationLabels.VisibilityChanged, (data: NotifcationVisibilityInterface) => {
            const message = data.visibility ? `Le jeu ${data.name} est maintenant visible.` : `Le jeu ${data.name} a été rendu non visible.`;
            this.notificationSubject.next(message);
            this.showNotification(message);
        });
    }

    listenForDeletedGame() {
        this.socket.on(SocketNotificationLabels.GameDeleted, (data: FindGameInterface) => {
            const message = `Le jeu ${data.name} a été supprimé.`;
            this.notificationSubject.next(message);
            this.gameDeletedSubject.next(data);
            this.showNotification(message);
        });
    }

    /**
     * Affiche une notification via la snackbar.
     * @param message Le message à afficher.
     */
    showNotification(message: string, isTimed: boolean = false, timeout: number = TIME_BETWEEN_TURNS_MS): void {
        this.errorMessages = [message];
        this.showModal = true;
    }
}
