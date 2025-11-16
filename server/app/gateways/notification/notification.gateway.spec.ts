import { NotificationGateway } from '@app/gateways/notification/notification.gateway';
import { SocketNotificationLabels } from '@common/constants';
import { Server } from 'socket.io';

describe('NotificationGateway', () => {
    let gateway: NotificationGateway;
    let server: Server;

    beforeEach(() => {
        gateway = new NotificationGateway();
        server = {
            emit: jest.fn(),
        } as unknown as Server;
        gateway.setServer(server);
    });

    it('should be defined correctly', () => {
        expect(gateway).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server instance correctly', () => {
            const newServer = { emit: jest.fn() } as unknown as Server;
            gateway.setServer(newServer);
            gateway.sendVisibilityChangeNotification('TestGame', true);
            expect(newServer.emit).toHaveBeenCalled();
        });
    });

    describe('sendVisibilityChangeNotification', () => {
        it('should log and emit visibility change event with correct data', () => {
            const name = 'TestGame';
            const visibility = true;
            gateway.sendVisibilityChangeNotification(name, visibility);
            expect(server.emit).toHaveBeenCalledWith(SocketNotificationLabels.VisibilityChanged, { name, visibility });
        });

        it('should work with empty or unexpected values', () => {
            gateway.sendVisibilityChangeNotification('', false);
            expect(server.emit).toHaveBeenCalledWith(SocketNotificationLabels.VisibilityChanged, { name: '', visibility: false });
        });
    });

    describe('sendGameDeletionNotification', () => {
        it('should log and emit game deletion event with correct data', () => {
            const gameId = 'GAME123';
            const gameName = 'TestGame';
            gateway.sendGameDeletionNotification(gameId, gameName);
            expect(server.emit).toHaveBeenCalledWith('gameDeleted', { id: gameId, name: gameName });
        });

        it('should work with empty values', () => {
            gateway.sendGameDeletionNotification('', '');
            expect(server.emit).toHaveBeenCalledWith('gameDeleted', { id: '', name: '' });
        });
    });
});
