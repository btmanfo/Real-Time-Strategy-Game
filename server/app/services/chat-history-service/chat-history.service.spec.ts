import { ChatMessage } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatHistoryService } from './chat-history.service';

describe('ChatHistoryService', () => {
    let service: ChatHistoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatHistoryService],
        }).compile();

        service = module.get<ChatHistoryService>(ChatHistoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getMessages', () => {
        it('should return an empty array if no messages exist for the room', () => {
            const messages = service.getMessages('nonexistentRoom');
            expect(messages).toEqual([]);
        });

        it('should return the messages for the specified room', () => {
            const roomCode = 'testRoom';
            const message1: ChatMessage = {
                message: 'Hello',
                playerName: 'Player1',
                timestamp: new Date(),
            };
            const message2: ChatMessage = {
                message: 'World',
                playerName: 'Player2',
                timestamp: new Date(),
            };

            service['messages'][roomCode] = [message1, message2];

            const messages = service.getMessages(roomCode);
            expect(messages).toEqual([message1, message2]);
        });
    });

    describe('addMessage', () => {
        it('should add a message to an existing room', () => {
            const roomCode = 'testRoom';
            const message: ChatMessage = {
                message: 'Test message',
                playerName: 'TestPlayer',
                timestamp: new Date(),
            };

            service['messages'][roomCode] = [];
            service.addMessage(roomCode, message);

            expect(service['messages'][roomCode]).toEqual([message]);
        });

        it('should create a new room and add a message if the room does not exist', () => {
            const roomCode = 'newRoom';
            const message: ChatMessage = {
                message: 'New room message',
                playerName: 'NewPlayer',
                timestamp: new Date(),
            };

            service.addMessage(roomCode, message);

            expect(service['messages'][roomCode]).toEqual([message]);
        });

        it('should add multiple messages to the same room', () => {
            const roomCode = 'multiRoom';
            const message1: ChatMessage = {
                message: 'First message',
                playerName: 'Player1',
                timestamp: new Date(),
            };
            const message2: ChatMessage = {
                message: 'Second message',
                playerName: 'Player2',
                timestamp: new Date(),
            };

            service.addMessage(roomCode, message1);
            service.addMessage(roomCode, message2);

            expect(service['messages'][roomCode]).toEqual([message1, message2]);
        });
    });
});
