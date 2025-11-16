/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { Socket } from 'socket.io-client';
import { NotificationService } from '@app/services/notification-service/notification.service';

describe('NotificationService', () => {
    let service: NotificationService;
    let socketHelper: SocketTestHelper;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        socketHelper = new SocketTestHelper();
        service = TestBed.inject(NotificationService);

        service.socket = socketHelper as any as Socket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call socket.on when listenForNotifications is called', () => {
        const onSpy = spyOn(service.socket, 'on');
        service.listenForNotifications();
        expect(onSpy).toHaveBeenCalledWith('visibilityChanged', jasmine.any(Function));
    });

    it('should call socket.on when listenForDeletedGame is called', () => {
        const onSpy = spyOn(service.socket, 'on');
        service.listenForDeletedGame();
        expect(onSpy).toHaveBeenCalledWith('gameDeleted', jasmine.any(Function));
    });

    it('should handle visibilityChanged with visibility true', () => {
        const messageSpy = spyOn(service.notification, 'next');
        const mockData = { name: 'Game 1', visibility: true };

        service.listenForNotifications();
        service.socket.emit('visibilityChanged', mockData);

        expect(messageSpy).toHaveBeenCalledWith('Le jeu Game 1 est maintenant visible.');
    });

    it('should handle visibilityChanged with visibility false', () => {
        const messageSpy = spyOn(service.notification, 'next');
        const mockData = { name: 'Game 1', visibility: false };

        service.listenForNotifications();
        service.socket.emit('visibilityChanged', mockData);

        expect(messageSpy).toHaveBeenCalledWith('Le jeu Game 1 a été rendu non visible.');
    });

    it('should emit game deletion with correct data on gameDeleted', () => {
        const gameDeletedSpy = spyOn(service.gameDeleted, 'next');
        const mockData = { id: '123', name: 'Game 1' };

        service.listenForDeletedGame();
        service.socket.emit('gameDeleted', mockData);

        expect(gameDeletedSpy).toHaveBeenCalledWith(mockData);
    });

    it('should show an untimed notification and keep it visible', () => {
        const message = 'Untimed Notification';
        service.showNotification(message, false);

        expect(service.showModal).toBe(true);
        expect(service.errorMessages).toEqual([message]);
    });

    it('should show untimed notification and keep it visible', () => {
        const message = 'Untimed Notification';
        service.showNotification(message, false);

        expect(service.showModal).toBe(true);
        expect(service.errorMessages).toEqual([message]);
    });

    it('should show untimed notification and keep it visible', () => {
        const message = 'Untimed Notification';
        service.showNotification(message, false);

        expect(service.showModal).toBe(true);
        expect(service.errorMessages).toEqual([message]);
    });
});
