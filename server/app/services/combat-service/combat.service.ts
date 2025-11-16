import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { SocketPlayerMovementLabels } from '@common/constants';
import { GameData, Player } from '@common/interfaces';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class CombatService {
    constructor(
        @Inject(forwardRef(() => GameLogGateway))
        private readonly gameLogGateway: GameLogGateway,
    ) {}

    /**
     * Starts a fight in the specified room by emitting a 'startFight' event.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the fight will start.
     * @param {Player[]} players - The list of players involved in the fight.
     * @param {Map<string, GameData>} games - A map containing game data for all active rooms.
     */
    startFight(server: Server, roomCode: string, players: Player[], games: Map<string, GameData>): void {
        const game = games.get(roomCode);
        if (!game) return;
        server.to(roomCode).emit(SocketPlayerMovementLabels.StartFight, players);
        const payload = {
            type: 'combatStart',
            event: `Combat : ${players[0].name} vs ${players[1].name}`,
            players,
            room: roomCode,
        };
        if (this.gameLogGateway && typeof this.gameLogGateway.handleSendGameLog === 'function') {
            this.gameLogGateway.handleSendGameLog(null, payload);
        }
    }

    /**
     * Emits a combat update event to inform clients about a change in the combat state.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the combat is taking place.
     * @param {Player} attacker - The player initiating the combat.
     * @param {Player} defender - The player defending in the combat.
     */
    combatUpdate(server: Server, roomCode: string, attacker: Player, defender: Player) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.CombatUpdate, { attacker, defender });
    }

    /**
     * Emits an event to indicate that a player has escaped from combat.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the combat is taking place.
     * @param {string} escapee - The name or identifier of the player who escaped.
     */
    combatEscaped(server: Server, roomCode: string, escapee: string) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.CombatEscaped, { escapee });
    }

    /**
     * Emits an event signaling the end of a combat, providing the winner and loser details.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the combat ended.
     * @param {string} winner - The name or identifier of the winning player.
     * @param {string} loser - The name or identifier of the losing player.
     */
    combatEnded(server: Server, roomCode: string, winner: string, loser: string) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.CombatEnded, { winner, loser });
    }

    /**
     * Emits an event with the combat roll bonuses for both attacker and defender.
     *
     * @param {Server} server - The socket.io server instance.
     * @param {string} roomCode - The room identifier where the combat is taking place.
     * @param {number} attackerBonus - The bonus value for the attacker.
     * @param {number} defenderBonus - The bonus value for the defender.
     */
    combatRolls(server: Server, roomCode: string, attackerBonus: number, defenderBonus: number) {
        server.to(roomCode).emit(SocketPlayerMovementLabels.CombatRolls, { attackerBonus, defenderBonus });
    }
}
