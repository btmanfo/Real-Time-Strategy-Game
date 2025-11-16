import { ChatHistoryService } from '@app/services/chat-history-service/chat-history.service';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { CHAT_ROOM_PREFIX, ERROR_MESSAGES, SocketChatLabels } from '@common/constants';
import { MessageInRoomInterface, PlayerInGameInterface } from '@common/interfaces';
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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private readonly server: Server;
    private readonly logger = new Logger(ChatGateway.name);

    constructor(
        private readonly gameRoomService: GameRoomService,
        private readonly chatHistoryService: ChatHistoryService,
    ) {}

    @SubscribeMessage(SocketChatLabels.JoinGameChat)
    async handleJoinGame(@ConnectedSocket() socket: Socket, @MessageBody() data: PlayerInGameInterface): Promise<void> {
        if (!this.isPlayerInRoom(data.roomCode, data.playerName)) {
            socket.emit(SocketChatLabels.ChatError, ERROR_MESSAGES.notInGame);
            return;
        }

        const chatRoomId = this.getChatRoomId(data.roomCode);
        socket.join(chatRoomId);

        const history = this.chatHistoryService.getMessages(data.roomCode);
        socket.emit(SocketChatLabels.ChatHistory, history);
    }

    @SubscribeMessage(SocketChatLabels.SendMessage)
    async handleMessage(@ConnectedSocket() socket: Socket, @MessageBody() data: MessageInRoomInterface): Promise<void> {
        if (!this.isPlayerInRoom(data.roomCode, data.message.playerName)) {
            socket.emit(SocketChatLabels.ChatError, ERROR_MESSAGES.notInGame);
            return;
        }

        const messageData = {
            message: data.message.message,
            playerName: data.message.playerName,
            timestamp: new Date(),
        };

        this.chatHistoryService.addMessage(data.roomCode, messageData);

        const chatRoomId = this.getChatRoomId(data.roomCode);
        this.server.to(chatRoomId).emit(SocketChatLabels.NewMessage, messageData);
    }

    @SubscribeMessage(SocketChatLabels.LeaveGameChat)
    handleLeaveGame(@ConnectedSocket() socket: Socket, @MessageBody() data: PlayerInGameInterface): void {
        const chatRoomId = this.getChatRoomId(data.roomCode);
        socket.leave(chatRoomId);
    }

    handleConnection(@ConnectedSocket() socket: Socket): void {
        this.logger.log(`Nouveau joueur connecté au chat: ${socket.id}`);
    }

    handleDisconnect(@ConnectedSocket() socket: Socket): void {
        this.logger.log(`Joueur déconnecté du chat: ${socket.id}`);
    }

    private isPlayerInRoom(roomCode: string, playerName: string): boolean {
        const players = this.gameRoomService.getActivePlayers(roomCode);
        return players.some((player) => player.name === playerName);
    }

    private getChatRoomId(roomCode: string): string {
        return `${CHAT_ROOM_PREFIX}${roomCode}`;
    }
}
