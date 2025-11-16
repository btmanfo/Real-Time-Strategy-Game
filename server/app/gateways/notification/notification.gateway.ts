import { SocketNotificationLabels } from '@common/constants';
import { GameDeletionPayload, VisibilityChangePayload } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
@WebSocketGateway({ cors: true })
export class NotificationGateway {
    @WebSocketServer()
    private server: Server;

    private readonly logger = new Logger(NotificationGateway.name);

    /**
     * Sets the server instance for the NotificationGateway.
     * This method is used in testing to inject a mock server for unit tests.
     *
     * @param server The mock or real server instance to set.
     */
    setServer(server: Server): void {
        this.server = server;
    }

    /**
     * Sends a notification about a visibility change for a game.
     *
     * @param name The name of the game whose visibility changed.
     * @param visibility The new visibility status of the game.
     */
    sendVisibilityChangeNotification(name: string, visibility: boolean): void {
        this.logger.log(`Notification envoyée pour le jeu "${name}", visibilité: ${visibility}`);

        const payload: VisibilityChangePayload = { name, visibility };
        this.server.emit(SocketNotificationLabels.VisibilityChanged, payload);
    }

    /**
     * Sends a notification about the deletion of a game.
     *
     * @param gameId The ID of the game that was deleted.
     * @param gameName The name of the game that was deleted.
     */
    sendGameDeletionNotification(gameId: string, gameName: string): void {
        this.logger.log(`Notification envoyée pour la suppression du jeu "${gameName}" (ID: ${gameId})`);

        const payload: GameDeletionPayload = { id: gameId, name: gameName };
        this.server.emit(SocketNotificationLabels.GameDeleted, payload);
    }
}
