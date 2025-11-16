/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { ChatGateway } from '@app/gateways/chat-system-gateway/chat-system.gateway';
import { ChatHistoryService } from '@app/services/chat-history-service/chat-history.service';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { ChatMessage, Player } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let gameRoomService: GameRoomService;
    let chatHistoryService: ChatHistoryService;
    let server: Server;
    let socket: Socket;

    beforeEach(async () => {
        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                {
                    provide: GameRoomService,
                    useValue: {
                        getActivePlayers: jest.fn(),
                    },
                },
                {
                    provide: ChatHistoryService,
                    useValue: {
                        getMessages: jest.fn(),
                        addMessage: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        gameRoomService = module.get<GameRoomService>(GameRoomService);
        chatHistoryService = module.get<ChatHistoryService>(ChatHistoryService);

        Object.defineProperty(gateway, 'server', {
            value: server,
            configurable: true,
        });

        socket = {
            id: 'testSocketId',
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
        } as any;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('should handle join game chat and emit chatError if player not in game', async () => {
        const data = { roomCode: 'testRoom', playerName: 'testPlayer' };
        (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([]);

        await gateway.handleJoinGame(socket, data);

        expect(socket.emit).toHaveBeenCalledWith('chatError', 'Vous devez être dans la partie pour accéder au chat');
    });

    it('should handle send message and emit chatError if player not in game', async () => {
        const data = {
            message: { message: 'testMessage', playerName: 'testPlayer' } as ChatMessage,
            roomCode: 'testRoom',
        };
        (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([]);

        await gateway.handleMessage(socket, data);

        expect(socket.emit).toHaveBeenCalledWith('chatError', 'Vous devez être dans la partie pour accéder au chat');
    });

    describe('handleJoinGame', () => {
        it('should join the correct chat room', async () => {
            const data = { roomCode: 'testRoom', playerName: 'testPlayer' };
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' } as Player]);
            (chatHistoryService.getMessages as jest.Mock).mockReturnValue([]);

            await gateway.handleJoinGame(socket, data);

            expect(socket.join).toHaveBeenCalledWith(`chat-${data.roomCode}`);
        });

        it('should emit the chat history to the joining socket', async () => {
            const data = { roomCode: 'testRoom', playerName: 'testPlayer' };
            const chatHistory = [{ message: 'testMessage', playerName: 'testPlayer', timestamp: new Date() } as ChatMessage];
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' } as Player]);
            (chatHistoryService.getMessages as jest.Mock).mockReturnValue(chatHistory);

            await gateway.handleJoinGame(socket, data);

            expect(socket.emit).toHaveBeenCalledWith('chatHistory', chatHistory);
        });

        it('should emit an empty chat history when there are no previous messages', async () => {
            const data = { roomCode: 'testRoom', playerName: 'testPlayer' };
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' } as Player]);
            (chatHistoryService.getMessages as jest.Mock).mockReturnValue([]);

            await gateway.handleJoinGame(socket, data);

            expect(socket.emit).toHaveBeenCalledWith('chatHistory', []);
        });
    });

    describe('handleMessage', () => {
        it('should emit chatError if player is not in game', async () => {
            const data = {
                message: { message: 'testMessage', playerName: 'testPlayer' } as ChatMessage,
                roomCode: 'testRoom',
            };
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([]);

            await gateway.handleMessage(socket, data);

            expect(socket.emit).toHaveBeenCalledWith('chatError', 'Vous devez être dans la partie pour accéder au chat');
        });

        describe('handleLeaveGame', () => {
            it('should leave the specified chat room', () => {
                const data = { roomCode: 'testRoom', playerName: 'testPlayer' };

                gateway.handleLeaveGame(socket, data);

                expect(socket.leave).toHaveBeenCalledWith(`chat-${data.roomCode}`);
            });
        });

        describe('handleMessage', () => {
            it('should add message with a timestamp', async () => {
                const data = {
                    message: { message: 'testMessage', playerName: 'testPlayer' } as ChatMessage,
                    roomCode: 'testRoom',
                };
                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' } as Player]);
                const addMessageSpy = jest.spyOn(chatHistoryService, 'addMessage');

                await gateway.handleMessage(socket, data);

                expect(addMessageSpy).toHaveBeenCalledWith(
                    data.roomCode,
                    expect.objectContaining({
                        timestamp: expect.any(Date),
                    }),
                );
            });
        });

        it('should emit newMessage to the correct room', async () => {
            const data = {
                message: { message: 'testMessage', playerName: 'testPlayer' } as ChatMessage,
                roomCode: 'testRoom',
            };
            (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' } as Player]);

            await gateway.handleMessage(socket, data);

            expect(server.to).toHaveBeenCalledWith(`chat-${data.roomCode}`);
            expect(server.emit).toHaveBeenCalledWith(
                'newMessage',
                expect.objectContaining({
                    message: data.message.message,
                    playerName: data.message.playerName,
                    timestamp: expect.any(Date),
                }),
            );
        });
    });
    describe('ChatGateway Additional Tests', () => {
        describe('handleConnection', () => {
            it('should log a message when a new player connects', () => {
                const loggerSpy = jest.spyOn(gateway['logger'], 'log');

                gateway.handleConnection(socket);

                expect(loggerSpy).toHaveBeenCalledWith(`Nouveau joueur connecté au chat: ${socket.id}`);
            });
        });

        describe('handleDisconnect', () => {
            it('should log a message when a player disconnects', () => {
                const loggerSpy = jest.spyOn(gateway['logger'], 'log');

                gateway.handleDisconnect(socket);

                expect(loggerSpy).toHaveBeenCalledWith(`Joueur déconnecté du chat: ${socket.id}`);
            });
        });

        describe('isPlayerInRoom', () => {
            it('should return true when player is in the room', () => {
                const roomCode = 'testRoom';
                const playerName = 'testPlayer';

                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' }, { name: 'otherPlayer' }]);

                const result = gateway['isPlayerInRoom'](roomCode, playerName);

                expect(result).toBe(true);
                expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(roomCode);
            });

            it('should return false when player is not in the room', () => {
                const roomCode = 'testRoom';
                const playerName = 'nonExistentPlayer';

                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' }, { name: 'otherPlayer' }]);

                const result = gateway['isPlayerInRoom'](roomCode, playerName);

                expect(result).toBe(false);
                expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(roomCode);
            });

            it('should return false when the room is empty', () => {
                const roomCode = 'emptyRoom';
                const playerName = 'testPlayer';

                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([]);

                const result = gateway['isPlayerInRoom'](roomCode, playerName);

                expect(result).toBe(false);
                expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(roomCode);
            });
        });

        describe('getChatRoomId', () => {
            it('should return the correct chat room ID format', () => {
                const roomCode = 'testRoom';
                const expectedRoomId = 'chat-testRoom';

                const result = gateway['getChatRoomId'](roomCode);

                expect(result).toBe(expectedRoomId);
            });

            it('should work with numeric room codes', () => {
                const roomCode = '12345';
                const expectedRoomId = 'chat-12345';

                const result = gateway['getChatRoomId'](roomCode);

                expect(result).toBe(expectedRoomId);
            });

            it('should work with empty room codes', () => {
                const roomCode = '';
                const expectedRoomId = 'chat-';

                const result = gateway['getChatRoomId'](roomCode);

                expect(result).toBe(expectedRoomId);
            });
        });

        describe('handleJoinGame comprehensive tests', () => {
            it('should handle join game chat successfully for a player in the game', async () => {
                const data = { roomCode: 'testRoom', playerName: 'testPlayer' };
                const chatHistory = [{ message: 'test', playerName: 'someone', timestamp: new Date() }];

                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' }]);
                (chatHistoryService.getMessages as jest.Mock).mockReturnValue(chatHistory);

                await gateway.handleJoinGame(socket, data);

                expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(data.roomCode);
                expect(socket.join).toHaveBeenCalledWith('chat-testRoom');
                expect(chatHistoryService.getMessages).toHaveBeenCalledWith(data.roomCode);
                expect(socket.emit).toHaveBeenCalledWith('chatHistory', chatHistory);

                expect(socket.emit).not.toHaveBeenCalledWith('chatError', expect.any(String));
            });
        });

        describe('handleMessage comprehensive tests', () => {
            it('should process and broadcast message when player is in the game', async () => {
                const message = { message: 'Hello World!', playerName: 'testPlayer' };
                const data = { roomCode: 'testRoom', message };

                (gameRoomService.getActivePlayers as jest.Mock).mockReturnValue([{ name: 'testPlayer' }]);

                await gateway.handleMessage(socket, data);

                expect(gameRoomService.getActivePlayers).toHaveBeenCalledWith(data.roomCode);

                expect(chatHistoryService.addMessage).toHaveBeenCalledWith(
                    data.roomCode,
                    expect.objectContaining({
                        message: message.message,
                        playerName: message.playerName,
                        timestamp: expect.any(Date),
                    }),
                );

                expect(server.to).toHaveBeenCalledWith('chat-testRoom');
                expect(server.emit).toHaveBeenCalledWith(
                    'newMessage',
                    expect.objectContaining({
                        message: message.message,
                        playerName: message.playerName,
                        timestamp: expect.any(Date),
                    }),
                );

                expect(socket.emit).not.toHaveBeenCalledWith('chatError', expect.any(String));
            });
        });

        describe('handleLeaveGame comprehensive tests', () => {
            it('should leave the chat room without errors', () => {
                const data = { roomCode: 'testRoom', playerName: 'testPlayer' };

                gateway.handleLeaveGame(socket, data);

                expect(socket.leave).toHaveBeenCalledWith('chat-testRoom');
            });

            it('should work even if the player was not in the room', () => {
                const data = { roomCode: 'nonExistentRoom', playerName: 'testPlayer' };

                gateway.handleLeaveGame(socket, data);

                expect(socket.leave).toHaveBeenCalledWith('chat-nonExistentRoom');
            });
        });
    });
});
