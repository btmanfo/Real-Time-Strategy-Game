import { Injectable } from '@angular/core';
import { ChatSocketEvent } from '@app/interfaces/interface';
import { ChatMessage } from '@common/interfaces';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ChatSocketService {
    private readonly socket: Socket;

    constructor() {
        this.socket = io(environment.serverUrlBase);
    }

    joinChatRoom(roomCode: string, playerName: string): void {
        this.socket.emit(ChatSocketEvent.JoinGameChat, { roomCode, playerName });
    }

    leaveChatRoom(roomCode: string, playerName: string): void {
        this.socket.emit(ChatSocketEvent.LeaveGameChat, { roomCode, playerName });
    }

    emitMessage(message: ChatMessage, roomCode: string): void {
        this.socket.emit(ChatSocketEvent.SendMessage, { message, roomCode });
    }

    onNewMessage(): Observable<ChatMessage> {
        return new Observable((observer) => {
            this.socket.on(ChatSocketEvent.NewMessage, (data: { message: string; playerName: string; timestamp: Date }) => {
                observer.next({
                    message: data.message,
                    playerName: data.playerName,
                    timestamp: new Date(data.timestamp),
                });
            });
        });
    }

    onChatHistory(): Observable<ChatMessage[]> {
        return new Observable((observer) => {
            this.socket.on(ChatSocketEvent.ChatHistory, (history: ChatMessage[]) => {
                observer.next(history);
            });
        });
    }

    onPlayerJoined(): Observable<string> {
        return new Observable((observer) => {
            this.socket.on(ChatSocketEvent.PlayerJoinedChat, (notification: string) => {
                observer.next(notification);
            });
        });
    }

    onPlayerLeft(): Observable<string> {
        return new Observable((observer) => {
            this.socket.on(ChatSocketEvent.PlayerLeftChat, (notification: string) => {
                observer.next(notification);
            });
        });
    }

    onError(): Observable<string> {
        return new Observable((observer) => {
            this.socket.on(ChatSocketEvent.ChatError, (error: string) => {
                observer.next(error);
            });
        });
    }
}
