import { GameLogHistoryService } from '@app/services/game-log-history-service/game-log-history.service';
import { LogType, ROOM_PREFIX, SocketChatLogs, SocketWaitRoomLabels } from '@common/constants';
import { GameLogEntry, GameLogPayload, Player, RoomJoinData } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
export class GameLogGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private readonly server: Server;
    private readonly logger = new Logger(GameLogGateway.name);

    constructor(private readonly gameLogHistoryService: GameLogHistoryService) {}

    @SubscribeMessage(SocketWaitRoomLabels.JoinRoom)
    handleJoinRoom(@ConnectedSocket() socket: Socket, @MessageBody() data: RoomJoinData): void {
        const gameRoomId = this.getGameRoomId(data.roomCode);
        const playerRoomId = this.getPlayerRoomId(data.playerName);

        socket.join(gameRoomId);
        socket.join(playerRoomId);

        this.logger.log(`Socket ${socket.id} a rejoint la room ${gameRoomId} (joueur: ${data.playerName})`);
    }

    @SubscribeMessage(SocketChatLogs.GetGameLogs)
    handleGetGameLogs(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomCode?: string }): void {
        if (!this.isValidRoomData(data)) {
            return;
        }

        const logs = this.gameLogHistoryService.getLogs(data.roomCode);
        socket.emit(SocketChatLogs.GameLogsHistory, logs);
    }

    @SubscribeMessage(SocketChatLogs.SendGameLog)
    handleSendGameLog(@ConnectedSocket() socket: Socket, @MessageBody() payload: GameLogPayload): void {
        const roomCode = payload.room;

        const logEntry: GameLogEntry = {
            type: payload.type,
            event: payload.event,
            players: payload.players,
            timestamp: new Date(),
        };

        if (this.isCombatLog(payload) && this.hasPlayers(payload)) {
            this.sendCombatLogToPlayers(logEntry, payload.players);
        } else if (roomCode) {
            this.sendLogToGameRoom(logEntry, roomCode);
        }
    }

    @SubscribeMessage(SocketChatLogs.NewGame)
    handleNewGame(@ConnectedSocket() socket: Socket, @MessageBody() data: RoomJoinData): void {
        if (!this.isValidRoomData(data)) {
            return;
        }

        this.gameLogHistoryService.clearLogs(data.roomCode);

        const gameRoomId = this.getGameRoomId(data.roomCode);
        this.server.to(gameRoomId).emit(SocketChatLogs.GameLogsHistory, []);

        this.logger.log(`Nouvelle partie démarrée par ${data.playerName} dans la room ${data.roomCode}`);
    }

    handleConnection(@ConnectedSocket() socket: Socket): void {
        this.logger.log(`Client connecté: ${socket.id}`);
    }

    handleDisconnect(@ConnectedSocket() socket: Socket): void {
        this.logger.log(`Client déconnecté: ${socket.id}`);
    }

    private getGameRoomId(roomCode: string): string {
        return `${ROOM_PREFIX.game}${roomCode}`;
    }

    private getPlayerRoomId(playerName: string): string {
        return `${ROOM_PREFIX.player}${playerName}`;
    }

    private isValidRoomData(data: { roomCode?: string }): boolean {
        return Boolean(data?.roomCode);
    }

    private isCombatLog(payload: GameLogPayload): boolean {
        return payload.type === LogType.COMBAT;
    }

    private hasPlayers(payload: GameLogPayload): boolean {
        return Boolean(payload.players && payload.players.length > 0);
    }

    private sendCombatLogToPlayers(logEntry: GameLogEntry, players: Player[]): void {
        players.forEach((player) => {
            if (player.name) {
                const playerRoomId = this.getPlayerRoomId(player.name);
                this.server.to(playerRoomId).emit(SocketChatLogs.GameLogUpdate, logEntry);
            }
        });
    }

    private sendLogToGameRoom(logEntry: GameLogEntry, roomCode: string): void {
        this.gameLogHistoryService.addLog(roomCode, logEntry);

        const gameRoomId = this.getGameRoomId(roomCode);
        this.server.to(gameRoomId).emit(SocketChatLogs.GameLogUpdate, logEntry);
    }
}
