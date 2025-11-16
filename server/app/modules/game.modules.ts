import { GameController } from '@app/controllers/game.controller';
import { ChatGateway } from '@app/gateways/chat-system-gateway/chat-system.gateway';
import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { NotificationGateway } from '@app/gateways/notification/notification.gateway';
import { Game, gameSchema } from '@app/schema/game.schema';
import { ChatHistoryService } from '@app/services/chat-history-service/chat-history.service';
import { GameLogHistoryService } from '@app/services/game-log-history-service/game-log-history.service';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { GameService } from '@app/services/game-service/game.service';
import { PlayerMovementService } from '@app/services/player-movement-service/player-movement.service';
import { PlayerService } from '@app/services/player-service/player.service';
import { VirtualPlayerService } from '@app/services/virtual-player-service/virtual-player.service';
import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimeService } from '@app/services/time-service/time.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { PlayerGateway } from '@app/gateways/player-gateway/player.gateway';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { CombatService } from '@app/services/combat-service/combat.service';
import { StatisticsService } from '@app/services/statistics-service/statistics.service';
@Module({
    controllers: [GameController],
    providers: [
        GameService,
        GameRoomService,
        PlayerMovementService,
        PlayerService,
        VirtualPlayerService,
        Logger,
        GameRoomGateway,
        PlayerGateway,
        NotificationGateway,
        TimeService,
        TurnService,
        ChatGateway,
        ChatHistoryService,
        GameLogGateway,
        GameLogHistoryService,
        CombatService,
        PlayingManagerService,
        StatisticsService,
    ],
    imports: [MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }])],
    exports: [
        PlayerService,
        CombatService,
        GameRoomService,
        PlayerMovementService,
        TimeService,
        TurnService,
        VirtualPlayerService,
        PlayingManagerService,
        StatisticsService,
    ],
})
export class GamesModule {}
