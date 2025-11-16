import { ChatMessage } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatHistoryService {
    private messages: { [roomCode: string]: ChatMessage[] } = {};

    getMessages(roomCode: string): ChatMessage[] {
        return this.messages[roomCode] || [];
    }

    addMessage(roomCode: string, message: ChatMessage): void {
        if (!this.messages[roomCode]) {
            this.messages[roomCode] = [];
        }
        this.messages[roomCode].push(message);
    }
}
