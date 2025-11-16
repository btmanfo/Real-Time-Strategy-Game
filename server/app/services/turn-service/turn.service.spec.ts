import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Player } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { TurnService } from './turn.service';

describe('TurnService', () => {
    let service: TurnService;
    let gameLogGateway: Partial<GameLogGateway>;
    let playingManagerService: Partial<PlayingManagerService>;
    let server: Partial<Server>;

    beforeEach(async () => {
        gameLogGateway = {
            handleSendGameLog: jest.fn(),
        };

        playingManagerService = {
            gamesPlayers: new Map(),
            gamesPlayerTurn: new Map(),
        };

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnService,
                { provide: GameLogGateway, useValue: gameLogGateway },
                { provide: PlayingManagerService, useValue: playingManagerService },
            ],
        }).compile();

        service = module.get<TurnService>(TurnService);
    });

    it('should end the turn and emit the correct events', () => {
        const roomCode = 'room1';
        const players = [{ name: 'player1' }, { name: 'player2' }];
        playingManagerService.gamesPlayers.set(roomCode, players as Player[]);
        playingManagerService.gamesPlayerTurn.set(roomCode, players[0] as Player);

        service.endTurn(server as Server, roomCode);

        expect(server.to).toHaveBeenCalledWith(roomCode);
        expect(server.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndTurn, {
            roomCode,
            playerTurn: players[1],
            isNotification: true,
        });
        expect(gameLogGateway.handleSendGameLog).toHaveBeenCalledWith(null, {
            type: 'global',
            event: "c'est le tour  à player2",
            room: roomCode,
            players: [players[0], players[1]],
        });
    });

    it('should loop back to the first player when the last player ends their turn', () => {
        const roomCode = 'room1';
        const players = [{ name: 'player1' }, { name: 'player2' }];
        playingManagerService.gamesPlayers.set(roomCode, players as Player[]);
        playingManagerService.gamesPlayerTurn.set(roomCode, players[1] as Player);

        service.endTurn(server as Server, roomCode);

        expect(playingManagerService.gamesPlayerTurn.get(roomCode)).toBe(players[0]);
    });
});
