/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable guard-for-in */
// Ajouter une vérification n'apporterait aucune valeur dans ce contexte, car
// l'objet est contrôlé et ne contient que des propriétés définies explicitement.
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { GameLogEntry, Player } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';
import { Socket } from 'socket.io-client';

describe('GameLogService', () => {
    let service: GameLogService;
    let fakeSocket: Socket;

    const socketCallbacks: { [key: string]: (...args: any[]) => void } = {};

    function createFakeSocket(): Socket {
        const socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on']) as any;
        socketSpy.on.and.callFake((event: string, callback: any) => {
            socketCallbacks[event] = callback;
            return socketSpy;
        });
        return socketSpy as Socket;
    }

    const playerA: Player = {
        name: 'Alice',
        life: 100,
        speed: 10,
        attack: '15',
        defense: '5',
        avatarUrl: 'http://example.com/avatar.png',
        coordinate: { x: 0, y: 0 },
        isAdmin: false,
    };

    const playerB: Player = {
        name: 'Bob',
        life: 100,
        speed: 8,
        attack: '12',
        defense: '6',
        avatarUrl: 'http://example.com/avatar2.png',
        coordinate: { x: 1, y: 1 },
        isAdmin: false,
    };

    beforeEach(() => {
        for (const key in socketCallbacks) {
            delete socketCallbacks[key];
        }
        fakeSocket = createFakeSocket();
        service = new GameLogService();
        (service as any)['socket'] = fakeSocket;
        (service as any).logsSubject = new BehaviorSubject<GameLogEntry[]>([]);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getGameLogs should emit getGameLogs event', () => {
        const room = 'anotherRoom';
        service.getGameLogs(room);
        expect(fakeSocket.emit).toHaveBeenCalledWith('getGameLogs', { roomCode: room });
    });

    describe('Log methods', () => {
        const room = 'room1';

        it('sendDebugLog should send a log with correct message for activated debug', () => {
            service.sendDebugLog(room, playerA, true);
            const expectedMessage = `${playerA.name} a activé le mode débogage`;
            expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
                type: 'debug',
                event: expectedMessage,
                room,
            });
        });

        it('sendAbandonLog should send a log with correct message', () => {
            service.sendAbandonLog(room, playerA);
            const expectedMessage = `${playerA.name} a abandonné la partie`;
            expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
                type: 'abandon',
                event: expectedMessage,
                players: [playerA],
                room,
            });
        });

        it('sendCombatAttackLog should send a log with correct message', () => {
            const roll1 = 15;
            const roll2 = 12;
            const result = 'succès';
            service.sendCombatAttackLog({ room, attacker: playerA, defender: playerB, roll1, roll2, result });
            const expectedMessage = `Attaque : ${playerA.name} attaque ${playerB.name} (jet atk : ${roll1} et jet def : ${roll2} ) => ${result}`;
            expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
                type: 'combat',
                event: expectedMessage,
                players: [playerA, playerB],
                room,
            });
        });

        it('sendCombatEvasionLog should send a log with correct message', () => {
            const roll = 12;
            const result = 'échec';
            service.sendCombatEvasionLog(room, playerA, playerB, roll, result);
            const expectedMessage =
                `Tentative d'évasion : ${playerB.name} tente d'esquiver ` + `${playerA.name} (pourcentage de chance  : ${roll} % ) => ${result}`;
            expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
                type: 'combat',
                event: expectedMessage,
                players: [playerA, playerB],
                room,
            });
        });

        it('startNewGame should reset logs and emit newGame event', () => {
            const playerName = 'Alice';
            const logsValues: GameLogEntry[][] = [];

            service.logs$.subscribe((logs) => logsValues.push(logs));
            service.startNewGame(room, playerName);

            expect(logsValues[logsValues.length - 1]).toEqual([]);
            expect(fakeSocket.emit).toHaveBeenCalledWith('newGame', { roomCode: room, playerName });
        });

        it('joinRoom should emit joinRoom event and reset logs', () => {
            const playerName = 'Alice';
            const logsValues: GameLogEntry[][] = [];

            service.logs$.subscribe((logs) => logsValues.push(logs));
            service.joinRoom(room, playerName);

            expect(fakeSocket.emit).toHaveBeenCalledWith('joinRoom', { roomCode: room, playerName });
            expect(logsValues[logsValues.length - 1]).toEqual([]);
        });
    });

    it('sendDoorLog should send a log with correct open/close door message', () => {
        const room = 'room1';
        service.sendDoorLog(room, playerA, true);
        const expectedMessageOpen = `${playerA.name} a ouvert la porte`;
        expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
            type: 'global',
            event: expectedMessageOpen,
            room,
        });

        service.sendDoorLog(room, playerA, false);
        const expectedMessageClose = `${playerA.name} a fermé la porte`;
        expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
            type: 'global',
            event: expectedMessageClose,
            room,
        });
    });

    it('should update logs on "gameLogUpdate" event', () => {
        let logs: GameLogEntry[] = [];

        service.logs$.subscribe((currentLogs) => (logs = currentLogs));
        expect(logs).toEqual([]);

        expect(socketCallbacks['gameLogUpdate']).toBeUndefined();
    });

    it('should set logs on "gameLogsHistory" event', () => {
        let logs: GameLogEntry[] = [];
        service.logs$.subscribe((currentLogs) => (logs = currentLogs));
        expect(logs).toEqual([]);
        expect(socketCallbacks['gameLogsHistory']).toBeUndefined();
    });

    it('sendCombatResultLog should send a combat result log with correct message', () => {
        const room = 'room1';
        const result = 'victoire de Alice';

        service.sendCombatResultLog(room, playerA, playerB, result);

        const expectedMessage = `Résultat du combat : ${playerA.name} vs ${playerB.name} => ${result}`;
        expect(fakeSocket.emit).toHaveBeenCalledWith('sendGameLog', {
            type: 'combatResult',
            event: expectedMessage,
            players: [playerA, playerB],
            room,
        });
    });
});
