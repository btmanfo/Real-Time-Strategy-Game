import { TIME_BEFORE_TURN, TIME_TICK, TIME_TURN } from '@app/constants/constants';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
@Injectable()
export class TimeService {
    gamesCounter: Map<string, number> = new Map();
    private readonly gamesInterval: Map<string, NodeJS.Timer | undefined> = new Map();
    private readonly gamesIsNotification: Map<string, boolean> = new Map();

    constructor(
        @Inject(forwardRef(() => TurnService))
        private readonly turnService: TurnService,
        @Inject(forwardRef(() => PlayingManagerService))
        private readonly playingManagerService: PlayingManagerService,
    ) {}

    startTimer(startValue: number, server: Server, roomCode: string, playerTurn: Player) {
        if (this.gamesInterval.get(roomCode)) return;
        this.gamesCounter.set(roomCode, startValue);
        server.to(roomCode).emit(SocketPlayerMovementLabels.TimeIncrement, this.gamesCounter.get(roomCode), this.gamesIsNotification.get(roomCode));
        this.manageNotification(server, startValue, roomCode, playerTurn);
        this.startInterval(server, roomCode, startValue);
    }

    stopTimer(roomCode: string) {
        clearInterval(this.gamesInterval.get(roomCode));
        this.gamesInterval.set(roomCode, undefined);
    }

    private startInterval(server: Server, roomCode: string, startValue: number) {
        this.gamesInterval.set(
            roomCode,
            setInterval(() => {
                if (this.gamesCounter.get(roomCode) > 0) {
                    this.gamesCounter.set(roomCode, this.gamesCounter.get(roomCode) - 1);
                    server
                        .to(roomCode)
                        .emit(SocketPlayerMovementLabels.TimeIncrement, this.gamesCounter.get(roomCode), this.gamesIsNotification.get(roomCode));
                } else if (startValue !== TIME_BEFORE_TURN) {
                    this.manageEndTurn(server, roomCode);
                } else {
                    this.startTurnTimer(server, roomCode);
                }
            }, TIME_TICK),
        );
    }

    private manageNotification(server: Server, startValue: number, roomCode: string, playerTurn: Player) {
        if (startValue === TIME_BEFORE_TURN && this.gamesCounter.get(roomCode) === TIME_BEFORE_TURN) {
            server.to(roomCode).emit(SocketPlayerMovementLabels.NotificationTurn, {
                message: "C'est au tour de " + playerTurn?.name + ' à jouer',
                isEnded: false,
            });
            if (playerTurn?.isVirtualPlayer) {
                server.to(roomCode).emit(SocketWaitRoomLabels.EmitVirtualPlayer, {
                    codeRoom: roomCode,
                    currentPlayer: playerTurn,
                });
            }
            this.gamesIsNotification.set(roomCode, true);
        }
    }

    private manageEndTurn(server: Server, roomCode: string) {
        this.turnService.endTurn(server, roomCode);
        this.changeTimer(server, roomCode, TIME_BEFORE_TURN);
    }

    private startTurnTimer(server: Server, roomCode: string) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.NotificationTurn, { message: '', isEnded: true });
        this.gamesIsNotification.set(roomCode, false);
        this.changeTimer(server, roomCode, TIME_TURN);
    }

    private changeTimer(server: Server, roomCode: string, time: number) {
        this.stopTimer(roomCode);
        const currentPlayer = this.playingManagerService.gamesPlayerTurn.get(roomCode);
        this.startTimer(time, server, roomCode, currentPlayer);
    }
}
