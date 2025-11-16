import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class TurnService {
    constructor(
        @Inject(forwardRef(() => GameLogGateway))
        private readonly gameLogGateway: GameLogGateway,
        @Inject(forwardRef(() => PlayingManagerService))
        private readonly playingManagerService: PlayingManagerService,
    ) {}

    /**
     * Ends the current turn by emitting an 'endTurn' event to all clients in the room.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier for which the turn is ending.
     * @param {Map<string, GameData>} games - A map containing game data for all active rooms.
     */
    endTurn(server: Server, roomCode: string): void {
        const currentPlayer = this.playingManagerService.gamesPlayerTurn.get(roomCode);
        this.nextPlayer(roomCode);
        server.to(roomCode).emit(SocketPlayerMovementLabels.EndTurn, {
            roomCode,
            playerTurn: this.playingManagerService.gamesPlayerTurn.get(roomCode),
            isNotification: true,
        });
        const logMessage = `c'est le tour  à ${this.playingManagerService.gamesPlayerTurn.get(roomCode)?.name}`;
        this.gameLogGateway.handleSendGameLog(null, {
            type: 'global',
            event: logMessage,
            room: roomCode,
            players: [currentPlayer, this.playingManagerService.gamesPlayerTurn.get(roomCode)],
        });
    }

    /**
     * Ends the current turn for a specific player in a room.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier for which the turn is ending.
     * @param {string} playerName - The name of the player whose turn is ending.
     */
    private nextPlayer(roomCode: string): void {
        const index = this.playingManagerService.gamesPlayers
            .get(roomCode)
            .findIndex((player) => player.name === this.playingManagerService.gamesPlayerTurn.get(roomCode)?.name);
        const gamesPlayers = this.playingManagerService.gamesPlayers.get(roomCode);
        if (index === gamesPlayers.length - 1) {
            const nextPlayer = gamesPlayers[0];
            this.playingManagerService.gamesPlayerTurn.set(roomCode, nextPlayer);
        } else {
            const nextPlayer = gamesPlayers[index + 1];
            this.playingManagerService.gamesPlayerTurn.set(roomCode, nextPlayer);
        }
    }
}
