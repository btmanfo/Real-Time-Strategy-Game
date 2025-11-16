import { GameLogEntry } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameLogHistoryService {
    private logs: { [roomCode: string]: GameLogEntry[] } = {};

    getLogs(roomCode: string): GameLogEntry[] {
        return this.logs[roomCode] || [];
    }

    addLog(roomCode: string, log: GameLogEntry): void {
        if (!this.logs[roomCode]) {
            this.logs[roomCode] = [];
        }
        this.logs[roomCode].push(log);
    }

    clearLogs(roomCode: string): void {
        this.logs[roomCode] = [];
    }
}
