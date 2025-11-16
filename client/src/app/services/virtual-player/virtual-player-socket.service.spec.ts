/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketWaitRoomLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { Subject } from 'rxjs';
import { VirtualPlayerSocketService } from './virtual-player-socket.service';

const createSocketSpy = () => ({
    on: jasmine.createSpy('on'),
    off: jasmine.createSpy('off'),
    emit: jasmine.createSpy('emit'),
});

describe('VirtualPlayerSocketService', () => {
    let service: VirtualPlayerSocketService;
    let socketSpy: any;
    let playingServiceMock: any;
    let playersSubjectSpy: jasmine.SpyObj<Subject<Player[]>>;

    beforeEach(() => {
        socketSpy = createSocketSpy();

        playersSubjectSpy = jasmine.createSpyObj('Subject', ['next']);

        playingServiceMock = {
            joinGameService: { socket: socketSpy },
            playersSubject: playersSubjectSpy,
        };

        TestBed.configureTestingModule({
            providers: [VirtualPlayerSocketService, { provide: PlayingService, useValue: playingServiceMock }],
        });
        service = TestBed.inject(VirtualPlayerSocketService);
    });

    it('should subscribe to the socket event on initialization', () => {
        expect(socketSpy.on).toHaveBeenCalledWith(SocketWaitRoomLabels.AddVirtualPlayer, jasmine.any(Function));
    });

    describe('destroySocketEvents', () => {
        it('should remove the socket event listener', () => {
            service.destroySocketEvents();
            expect(socketSpy.off).toHaveBeenCalledWith(SocketWaitRoomLabels.AddVirtualPlayer, jasmine.any(Function));
        });
    });

    describe('addAttackerVirtualPlayer', () => {
        it('should emit the addAttackerVirtualPlayer event with the room code', () => {
            const roomCode = 'ROOM123';
            service.addAttackerVirtualPlayer(roomCode);
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.AddAttackerVirtualPlayer, roomCode);
        });
    });

    describe('addDefensiveVirtualPlayer', () => {
        it('should emit the addDefensiveVirtualPlayer event with the room code', () => {
            const roomCode = 'ROOM456';
            service.addDefensiveVirtualPlayer(roomCode);
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.AddDefensiveVirtualPlayer, roomCode);
        });
    });

    describe('removeVirtualPlayer', () => {
        it('should emit the removeVirtualPlayer event with the room code and player name', () => {
            const roomCode = 'ROOM789';
            const playerName = 'Player1';
            service.removeVirtualPlayer(roomCode, playerName);
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.RemoveVirtualPlayer, { roomCode, playerName });
        });
    });

    describe('handleVirtualPlayerAdded', () => {
        it('should call playersSubject.next with the provided players', () => {
            const players: Player[] = [
                { name: 'Player1', life: 100, speed: 50, attack: '20', defense: '10', avatarUrl: '', coordinate: { x: 0, y: 0 }, isAdmin: false },
            ];
            (service as any).handleVirtualPlayerAdded({ players });
            expect(playersSubjectSpy.next).toHaveBeenCalledWith(players);
        });
    });
});
