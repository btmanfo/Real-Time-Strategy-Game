import { GameController } from '@app/controllers/game.controller';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { NotificationGateway } from '@app/gateways/notification/notification.gateway';
import { GamesModule } from '@app/modules/game.modules';
import { Game, gameSchema } from '@app/schema/game.schema';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { GameService } from '@app/services/game-service/game.service';
import { PlayerMovementService } from '@app/services/player-movement-service/player-movement.service';
import { Logger } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

describe('GamesModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        const MOCK_GAME_MODEL = {
            find: jest.fn(),
            create: jest.fn(),
        };

        module = await Test.createTestingModule({
            imports: [GamesModule, MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }])],
        })
            .overrideProvider(getModelToken(Game.name))
            .useValue(MOCK_GAME_MODEL)
            .compile();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide GameController', () => {
        const gameController = module.get<GameController>(GameController);
        expect(gameController).toBeDefined();
    });

    it('should provide GameService', () => {
        const gameService = module.get<GameService>(GameService);
        expect(gameService).toBeDefined();
    });

    it('should provide GameGateway', () => {
        const gameRoomGateway = module.get<GameRoomGateway>(GameRoomGateway);
        expect(gameRoomGateway).toBeDefined();
    });

    it('should provide NotificationGateway', () => {
        const notificationGateway = module.get<NotificationGateway>(NotificationGateway);
        expect(notificationGateway).toBeDefined();
    });

    it('should provide GameRoomService', () => {
        const gameRoomService = module.get<GameRoomService>(GameRoomService);
        expect(gameRoomService).toBeDefined();
    });

    it('should provide PlayerMovementService', () => {
        const playerMovementService = module.get<PlayerMovementService>(PlayerMovementService);
        expect(playerMovementService).toBeDefined();
    });

    it('should provide Logger', () => {
        const logger = module.get<Logger>(Logger);
        expect(logger).toBeDefined();
    });
});
