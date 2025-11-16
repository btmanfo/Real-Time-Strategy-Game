import { Injectable } from '@angular/core';
import { formatLog, GetGameLogsPayload, JoinRoomPayload, LOG_TEMPLATES, NewGamePayload, SendGameLogPayload } from '@app/constants/constants';
import { GameLogInterface } from '@app/interfaces/interface';
import { SocketChatLogs, SocketWaitRoomLabels } from '@common/constants';
import { GameLogEntry, Player } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
@Injectable({
    providedIn: 'root',
})
export class GameLogService {
    myRoom = '';
    private readonly logsSubject = new BehaviorSubject<GameLogEntry[]>([]);
    // pour utiliser le logsSubject dans logs$ il faut l'instancier avant
    // eslint-disable-next-line @typescript-eslint/member-ordering
    logs$ = this.logsSubject.asObservable();
    private readonly socket: Socket;

    constructor() {
        this.socket = io(environment.serverUrlBase);

        this.socket.on(SocketChatLogs.GameLogUpdate, (log: GameLogEntry) => {
            const updatedLogs: GameLogEntry[] = [...this.logsSubject.value, log];
            this.logsSubject.next(updatedLogs);
        });

        this.socket.on(SocketChatLogs.GameLogsHistory, (logs: GameLogEntry[]) => {
            this.logsSubject.next(logs);
        });
    }

    joinRoom(room: string, playerName: string): void {
        this.logsSubject.next([]);
        const payload: JoinRoomPayload = { roomCode: room, playerName };
        this.socket.emit(SocketWaitRoomLabels.JoinRoom, payload);
        this.myRoom = room;
        this.getGameLogs(room);
    }

    getGameLogs(room: string): void {
        const payload: GetGameLogsPayload = { roomCode: room };
        this.socket.emit(SocketChatLogs.GetGameLogs, payload);
    }

    startNewGame(room: string, playerName: string): void {
        this.logsSubject.next([]);
        const payload: NewGamePayload = { roomCode: room, playerName };
        this.socket.emit(SocketChatLogs.NewGame, payload);
    }

    sendCombatResultLog(room: string, attacker: Player, defender: Player, result: string): void {
        const message = formatLog(LOG_TEMPLATES.combatResult, { attacker: attacker.name ?? '', defender: defender.name ?? '', result });
        const payload: SendGameLogPayload = {
            type: 'combatResult',
            event: message,
            players: [attacker, defender],
            room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }

    sendDoorLog(room: string, player: Player, isOpen: boolean): void {
        const state = isOpen ? 'ouvert' : 'fermé';
        const message = formatLog(LOG_TEMPLATES.door, { player: player.name ?? '', state });
        const payload: SendGameLogPayload = {
            type: 'global',
            event: message,
            room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }

    sendDebugLog(room: string, player: Player, activated: boolean): void {
        const state = activated ? 'activé' : 'désactivé';
        const message = formatLog(LOG_TEMPLATES.debug, { player: player.name ?? '', state });
        const payload: SendGameLogPayload = {
            type: 'debug',
            event: message,
            room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }

    sendAbandonLog(room: string, player: Player): void {
        const message = formatLog(LOG_TEMPLATES.abandon, { player: player.name ?? '' });
        const payload: SendGameLogPayload = {
            type: 'abandon',
            event: message,
            players: [player],
            room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }

    sendCombatAttackLog(gameLogData: GameLogInterface): void {
        const message = formatLog(LOG_TEMPLATES.combatAttack, {
            attacker: gameLogData.attacker.name ?? '',
            defender: gameLogData.defender.name ?? '',
            roll1: gameLogData.roll1.toString(),
            roll2: gameLogData.roll2.toString(),
            result: gameLogData.result,
        });

        const payload: SendGameLogPayload = {
            type: 'combat',
            event: message,
            players: [gameLogData.attacker, gameLogData.defender],
            room: gameLogData.room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }

    sendCombatEvasionLog(room: string, attacker: Player, defender: Player, chances: number, result: string): void {
        const message = formatLog(LOG_TEMPLATES.combatEvasion, {
            attacker: attacker.name ?? '',
            defender: defender.name ?? '',
            chances: chances.toString(),
            result,
        });

        const payload: SendGameLogPayload = {
            type: 'combat',
            event: message,
            players: [attacker, defender],
            room,
        };
        this.socket.emit(SocketChatLogs.SendGameLog, payload);
    }
}
