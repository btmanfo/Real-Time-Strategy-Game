/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { ChatSocketEvent } from '@app/interfaces/interface';
import { ChatMessage } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { ChatSocketService } from './chat-system-socket.service';

describe('ChatSocketService', () => {
    let service: ChatSocketService;
    let fakeSocket: Socket;

    let newMessageCallback: ((data: { message: string; playerName: string; timestamp: Date }) => void) | undefined;
    let chatHistoryCallback: ((history: ChatMessage[]) => void) | undefined;
    let playerJoinedCallback: ((notification: string) => void) | undefined;
    let playerLeftCallback: ((notification: string) => void) | undefined;
    let errorCallback: ((error: string) => void) | undefined;

    function createFakeSocket(): Socket {
        const socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on']) as any;
        socketSpy.on.and.callFake((event: string, callback: any) => {
            switch (event) {
                case ChatSocketEvent.NewMessage:
                    newMessageCallback = callback;
                    break;
                case ChatSocketEvent.ChatHistory:
                    chatHistoryCallback = callback;
                    break;
                case ChatSocketEvent.PlayerJoinedChat:
                    playerJoinedCallback = callback;
                    break;
                case ChatSocketEvent.PlayerLeftChat:
                    playerLeftCallback = callback;
                    break;
                case ChatSocketEvent.ChatError:
                    errorCallback = callback;
                    break;
            }
            return socketSpy;
        });
        return socketSpy as Socket;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ChatSocketService],
        });
        service = TestBed.inject(ChatSocketService);
        fakeSocket = createFakeSocket();
        (service as any).socket = fakeSocket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('joinChatRoom should emit JoinGameChat event with roomCode and playerName', () => {
        const roomCode = 'room123';
        const playerName = 'Alice';
        service.joinChatRoom(roomCode, playerName);
        expect(fakeSocket.emit).toHaveBeenCalledWith(ChatSocketEvent.JoinGameChat, { roomCode, playerName });
    });

    it('leaveChatRoom should emit LeaveGameChat event with roomCode and playerName', () => {
        const roomCode = 'room123';
        const playerName = 'Alice';
        service.leaveChatRoom(roomCode, playerName);
        expect(fakeSocket.emit).toHaveBeenCalledWith(ChatSocketEvent.LeaveGameChat, { roomCode, playerName });
    });

    it('emitMessage should emit SendMessage event with message and roomCode', () => {
        const roomCode = 'room123';
        const message: ChatMessage = {
            message: 'Hello world',
            playerName: 'Alice',
            timestamp: new Date(),
        };
        service.emitMessage(message, roomCode);
        expect(fakeSocket.emit).toHaveBeenCalledWith(ChatSocketEvent.SendMessage, { message, roomCode });
    });

    it('onNewMessage should emit a ChatMessage with correct conversion for timestamp', (done) => {
        const testData = {
            message: 'New message',
            playerName: 'Bob',
            timestamp: new Date('2020-01-01T10:00:00'),
        };

        service.onNewMessage().subscribe((msg) => {
            expect(msg.message).toEqual(testData.message);
            expect(msg.playerName).toEqual(testData.playerName);
            expect(msg.timestamp instanceof Date).toBeTrue();
            if (msg.timestamp instanceof Date) {
                expect(msg.timestamp.toISOString()).toEqual(new Date(testData.timestamp).toISOString());
            }
            done();
        });

        if (newMessageCallback) {
            newMessageCallback(testData);
        }
    });

    it('onChatHistory should emit an array of ChatMessage', (done) => {
        const history: ChatMessage[] = [
            { message: 'Hello', playerName: 'Alice', timestamp: new Date() },
            { message: 'Hi', playerName: 'Bob', timestamp: new Date() },
        ];

        service.onChatHistory().subscribe((chatHistory) => {
            expect(chatHistory).toEqual(history);
            done();
        });

        if (chatHistoryCallback) {
            chatHistoryCallback(history);
        }
    });

    it('onPlayerJoined should emit a notification string', (done) => {
        const notification = 'Alice has joined';
        service.onPlayerJoined().subscribe((msg) => {
            expect(msg).toEqual(notification);
            done();
        });

        if (playerJoinedCallback) {
            playerJoinedCallback(notification);
        }
    });

    it('onPlayerLeft should emit a notification string', (done) => {
        const notification = 'Bob has left';
        service.onPlayerLeft().subscribe((msg) => {
            expect(msg).toEqual(notification);
            done();
        });

        if (playerLeftCallback) {
            playerLeftCallback(notification);
        }
    });

    it('onError should emit an error string', (done) => {
        const error = 'Chat error occurred';
        service.onError().subscribe((err) => {
            expect(err).toEqual(error);
            done();
        });

        if (errorCallback) {
            errorCallback(error);
        }
    });
});
