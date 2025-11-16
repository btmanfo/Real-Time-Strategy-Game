import { GameLogEntry } from '@common/interfaces';
import { GameLogHistoryService } from './game-log-history.service';

describe('GameLogHistoryService', () => {
    let service: GameLogHistoryService;

    beforeEach(() => {
        service = new GameLogHistoryService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return an empty array if no logs exist for the room', () => {
        const logs = service.getLogs('room1');
        expect(logs).toEqual([]);
    });

    it('should add a log and retrieve it correctly', () => {
        const log: GameLogEntry = {
            timestamp: new Date(),
            type: 'info',
            event: 'Game started',
            players: [],
        };

        service.addLog('room1', log);
        const logs = service.getLogs('room1');

        expect(logs.length).toBe(1);
        expect(logs[0]).toEqual(log);
    });

    it('should accumulate multiple logs for the same room', () => {
        const log1: GameLogEntry = {
            timestamp: new Date(),
            type: 'info',
            event: 'Player joined',
            players: [],
        };

        const log2: GameLogEntry = {
            timestamp: new Date(),
            type: 'warning',
            event: 'Player left',
            players: [],
        };

        service.addLog('room2', log1);
        service.addLog('room2', log2);

        const logs = service.getLogs('room2');

        expect(logs.length).toBe(2);
        expect(logs).toContainEqual(log1);
        expect(logs).toContainEqual(log2);
    });

    it('should clear all logs for a specific room', () => {
        const log: GameLogEntry = {
            timestamp: new Date(),
            type: 'info',
            event: 'Player scored',
            players: [],
        };

        service.addLog('room3', log);
        expect(service.getLogs('room3').length).toBe(1);

        service.clearLogs('room3');
        expect(service.getLogs('room3')).toEqual([]);
    });
});
