import { Injectable } from '@angular/core';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketWaitRoomLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { Subject } from 'rxjs';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class VirtualPlayerSocketService {
    virtualPlayerInfo$ = new Subject<Player | null>();
    private readonly socket: Socket;

    constructor(private readonly playingService: PlayingService) {
        this.socket = this.playingService.joinGameService.socket;
        this.manageSocketEvents();
    }

    manageSocketEvents(): void {
        this.socket.on(SocketWaitRoomLabels.AddVirtualPlayer, this.handleVirtualPlayerAdded.bind(this));
    }

    destroySocketEvents(): void {
        this.socket.off(SocketWaitRoomLabels.AddVirtualPlayer, this.handleVirtualPlayerAdded);
    }

    /**
     * Emits an event to add an attacker virtual player to the specified room.
     * @param roomCode The unique code of the game room.
     */
    addAttackerVirtualPlayer(roomCode: string): void {
        this.socket.emit(SocketWaitRoomLabels.AddAttackerVirtualPlayer, roomCode);
    }

    /**
     * Emits an event to add a defensive virtual player to the specified room.
     * @param roomCode The unique code of the game room.
     */
    addDefensiveVirtualPlayer(roomCode: string): void {
        this.socket.emit(SocketWaitRoomLabels.AddDefensiveVirtualPlayer, roomCode);
    }

    /**
     * Emits an event to remove a virtual player from the specified room.
     * @param roomCode The unique code of the game room.
     * @param playerName The name of the virtual player to remove.
     */
    removeVirtualPlayer(roomCode: string, playerName: string): void {
        this.socket.emit(SocketWaitRoomLabels.RemoveVirtualPlayer, { roomCode, playerName });
    }

    /**
     * Handles the event when a virtual player has been added.
     * @param data The payload containing the updated list of players.
     */
    private handleVirtualPlayerAdded(data: { players: Player[] }): void {
        this.playingService.playersSubject.next(data.players);
    }
}
