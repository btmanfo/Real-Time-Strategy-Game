/* eslint-disable max-lines */
// Cela est nécessaire pour coordonner la logique du combat
import { Injectable, Injector } from '@angular/core';
import {
    baseStats,
    COMBAT_FACTOR,
    ESCAPE_CHANCE,
    FOUR_SIDED_DICE,
    ICE_PENALTY,
    MAX_ESCAPE_ATTEMPTS,
    POTION1_EFFECT,
    RANDOM_WINNING_CHANCE,
    RING_ITEM_ROLL_VALUE,
    SHIELD_EFFECT,
    SIX_SIDED_DICE,
} from '@app/constants/constants';
import { CalculateDiceRollsInterface } from '@app/interfaces/interface';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { DiceType, SocketEndGameStatistics, SocketPlayerMovementLabels } from '@common/constants';
import { CombatState, Player, Tile } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';
import { Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class CombatService {
    socket: Socket;

    private readonly combatState = new BehaviorSubject<CombatState>({
        attacker: {} as Player,
        defender: {} as Player,
        escapeAttempts: 0,
        maxEscapeAttempts: MAX_ESCAPE_ATTEMPTS,
        escapeChance: ESCAPE_CHANCE,
        isActive: false,
    });
    private _playingService: PlayingService | null = null;
    private _joinGameService: JoinGameService | null = null;
    constructor(
        private readonly gameLogService: GameLogService,
        private readonly injector: Injector,
    ) {
        this.socket = this.joinGameService.socket;
    }

    get playingService(): PlayingService {
        this._playingService ??= this.injector.get(PlayingService);
        return this._playingService;
    }

    get joinGameService(): JoinGameService {
        this._joinGameService ??= this.injector.get(JoinGameService);
        return this._joinGameService;
    }

    get attacker(): Player {
        return this.combatState.value.attacker;
    }

    get defender(): Player {
        return this.combatState.value.defender;
    }

    get escapeAttempts(): number {
        return this.combatState.value.escapeAttempts;
    }

    /**
     * Initializes a combat between two players
     * @param attacker The player who initiated combat
     * @param defender The player being attacked
     * @param isOnIce Whether combat is on an ice tile (applies penalty)
     */
    initCombat(attacker: Player, defender: Player): void {
        if (defender.isVirtualPlayer && attacker.isVirtualPlayer) {
            this.combatState.next({
                ...this.combatState.value,
                attacker,
                defender,
                escapeAttempts: 0,
                isActive: true,
            });
            this.combatPhaseForBots();
        } else {
            this.combatState.next({
                ...this.combatState.value,
                attacker,
                defender,
                escapeAttempts: 0,
                isActive: true,
            });
        }
    }

    /**
     * Attempts to escape from combat
     * Players have limited escape attempts with a set success chance
     * @returns Boolean indicating if escape was successful
     */
    dodge(): boolean {
        if (this.combatState.value.escapeAttempts >= this.combatState.value.maxEscapeAttempts || !this.combatState.value.isActive) {
            return false;
        }

        const currentState = this.combatState.value;
        this.combatState.next({
            ...currentState,
            escapeAttempts: currentState.escapeAttempts + 1,
        });

        const escaped = Math.random() < currentState.escapeChance;

        if (escaped) {
            this.combatState.next({
                ...this.combatState.value,
                isActive: false,
            });
            this.endCombatWithEscape();
        } else {
            this.combatState.next({
                ...this.combatState.value,
                attacker: structuredClone(this.combatState.value.defender),
                defender: structuredClone(this.combatState.value.attacker),
            });

            this.combatUpdateAnnouncer(this.joinGameService.pinCode, this.combatState.value.attacker, this.combatState.value.defender);
        }
        const result = escaped ? 'Réussie' : 'Échouée';
        this.gameLogService.sendCombatEvasionLog(
            this.gameLogService.myRoom,
            this.attacker,
            this.defender,
            Math.floor(currentState.escapeChance * COMBAT_FACTOR),
            result,
        );
        return escaped;
    }

    /**
     * Handles opponent abandonment and declares the remaining player as winner
     * @param quittingPlayerName The name of the player who abandoned the game
     */
    handleOpponentQuit(quittingPlayerName: string): void {
        if (!this.combatState.value.isActive) {
            return;
        }
        const attacker = this.combatState.value.attacker;
        const winner = quittingPlayerName === attacker.name ? this.combatState.value.defender : this.combatState.value.attacker;

        this.healPlayers();
        this.combatState.next({
            ...this.combatState.value,
            isActive: false,
        });
        if (winner.name) this.combatEndedAnnouncer(this.joinGameService.pinCode, winner.name, quittingPlayerName);
    }

    /**
     * Executes an attack with dice rolls and damage calculation
     * @param attackerSet The attacking player
     * @param defenderSet The defending player
     */
    attack(attackerSet: Player, defenderSet: Player): void {
        if (!this.combatState.value.isActive) return;
        this.updateCombatStateWithPlayers(attackerSet, defenderSet);
        const { attackerBonus, defenderBonus } = this.calculateDiceRolls();
        this.emitCombatRolls(attackerBonus, defenderBonus);
        const damage = this.calculateDamage(attackerBonus, defenderBonus);
        this.gameLogService.sendCombatAttackLog({
            room: this.gameLogService.myRoom,
            attacker: this.attacker,
            defender: this.defender,
            roll1: attackerBonus,
            roll2: defenderBonus,
            result: `Dégâts infligés : ${this.calculateDamage(attackerBonus, defenderBonus)}`,
        });
        this.socket.emit(SocketEndGameStatistics.UpdatePlayerDamages, {
            roomCode: this.joinGameService.pinCode,
            playerName: attackerSet.name,
            dealDamage: damage,
        });
        this.socket.emit(SocketEndGameStatistics.UpdatePlayerLifeLost, {
            roomCode: this.joinGameService.pinCode,
            playerName: defenderSet.name,
            dealDamage: damage,
        });
        this.applyDamageAndCheckCombatEnd(damage);
    }

    updateIsInCombat(playerName: string | null, secondPlayer: string | null) {
        this.socket.emit(SocketEndGameStatistics.UpdatePlayerCombatCount, {
            roomCode: this.joinGameService.pinCode,
            currentPlayer: playerName,
            theSecondPlayer: secondPlayer,
        });
    }

    updateDodgeCount(playerName: string | null) {
        this.socket.emit(SocketEndGameStatistics.UpdatePlayerDodgeCount, { roomCode: this.joinGameService.pinCode, currentPlayer: playerName });
    }

    /**
     * Teleports the defeated player back to their spawn point
     * @param loserName Name of the player who lost the combat
     */
    teleportLoserToSpawn(loserName: string): void {
        const playingService = this.joinGameService.playingService;
        const loser = playingService.players.find((player) => player.name === loserName) as Player;

        const spawnTile = playingService.boardServiceValue.tiles.find(
            (tile) => tile.position.x === loser.spawnPoint?.x && tile.position.y === loser.spawnPoint?.y,
        );

        const currentTile = playingService.movingGameService.getPlayerTile(loser);
        if (currentTile) {
            currentTile.player = null;
        }
        if (spawnTile) {
            if (!spawnTile.player) {
                this.handleTeleportPositionChanged(loser, spawnTile);
            } else {
                const nearestEmptyTile = this.findNearestEmptyTile(spawnTile);
                if (nearestEmptyTile) {
                    this.handleTeleportPositionChanged(loser, nearestEmptyTile);
                }
            }
        }
    }

    private updateCombatStateWithPlayers(attackerSet: Player, defenderSet: Player): void {
        this.combatState.next({
            ...this.combatState.value,
            attacker: attackerSet,
            defender: defenderSet,
        });
    }

    /**
     * Calculates dice rolls for both players based on their stats
     * @returns Object containing attacker and defender bonus values
     */
    private calculateDiceRolls(): CalculateDiceRollsInterface {
        const { attacker, defender } = this.combatState.value;

        let attackerDiceValue = attacker.attack === DiceType.FourFaces ? FOUR_SIDED_DICE : SIX_SIDED_DICE;
        const defenderDiceValue = defender.defense === DiceType.FourFaces ? FOUR_SIDED_DICE : SIX_SIDED_DICE;
        if (attacker.inventory?.find((item) => item.name === 'potion1')) {
            attackerDiceValue = attackerDiceValue + POTION1_EFFECT;
        }

        if (this.joinGameService.playingService.isDebugMode) {
            return {
                attackerBonus: attackerDiceValue,
                defenderBonus: 1,
            };
        }
        return {
            attackerBonus: this.rollDice(attackerDiceValue),
            defenderBonus: this.rollDice(defenderDiceValue),
        };
    }

    /**
     * Calculates damage based on dice rolls and ice penalties
     * @returns The calculated damage value
     */
    private calculateDamage(attackerBonus: number, defenderBonus: number): number {
        const { attacker, defender } = this.combatState.value;

        const icePenaltyAttacker = attacker.isOnIce ? ICE_PENALTY : 0;
        const icePenaltyDefender = defender.isOnIce ? ICE_PENALTY : 0;

        const itemBonusAttacker = this.checkItemBonuses(attacker);
        const itemBonusDefender = this.checkItemBonuses(defender);

        const attackerTotal = baseStats.attack + itemBonusAttacker + attackerBonus - icePenaltyAttacker;
        const defenderTotal = baseStats.defense + itemBonusDefender + defenderBonus - icePenaltyDefender;

        return Math.max(0, attackerTotal - defenderTotal);
    }

    /**
     * Checks for item bonuses and applies them to combat calculations
     * @param player The player to check for item bonuses
     * @returns The total bonus from all applicable items
     */
    private checkItemBonuses(player: Player): number {
        let bonus = 0;
        if (player.inventory && player.inventory.length > 0) {
            bonus += this.checkSwordBonus(player);

            if (player.inventory.some((item) => item.name === 'bouclier1') && player.isOnIce) {
                if (player === this.combatState.value.defender) {
                    bonus += SHIELD_EFFECT;
                }
            }
        }
        return bonus;
    }

    /**
     * Checks if player has a sword and applies appropriate bonus or malus
     * - When attacking with epee1: +2 attack bonus
     * - When attacking with epee2: +1 attack bonus
     * - When defending with any sword: -1 defense malus
     * @param player The player to check for sword item
     * @returns The calculated sword bonus or malus
     */
    private checkSwordBonus(player: Player): number {
        if (!player.inventory) return 0;

        let swordBonus = 0;
        const hasEpee1 = player.inventory.some((item) => item.name === 'epee1');
        const hasEpee2 = player.inventory.some((item) => item.name === 'epee2');

        if (player === this.combatState.value.attacker) {
            if (hasEpee1) swordBonus += 2;
            if (hasEpee2) swordBonus += 1;
        } else if (player === this.combatState.value.defender) {
            if (hasEpee1) swordBonus -= 2;
            if (hasEpee2) swordBonus -= 1;
        }
        return swordBonus;
    }

    private applyDamageAndCheckCombatEnd(damage: number): void {
        const attackerTempo = structuredClone(this.combatState.value.attacker);
        const defenderTempo = structuredClone(this.combatState.value.defender);

        defenderTempo.life = Math.max(0, defenderTempo.life - damage);

        if (defenderTempo.life <= 0) {
            this.endCombat();
            return;
        }

        this.combatUpdateAnnouncer(this.joinGameService.pinCode, defenderTempo, attackerTempo);
    }

    private endCombat(): void {
        const { attacker, defender } = this.combatState.value;
        const loserName = defender.name;
        const winnerName = attacker.name;
        if (winnerName && loserName) this.combatEndedAnnouncer(this.joinGameService.pinCode, winnerName, loserName);
        this.healPlayers();

        this.combatState.next({
            ...this.combatState.value,
            isActive: false,
        });
        if (winnerName) this.gameLogService.sendCombatResultLog(this.gameLogService.myRoom, this.attacker, this.defender, winnerName);
    }

    private endCombatWithEscape(): void {
        this.healPlayers();
        if (this.playingService.localPlayer?.name) {
            this.updateDodgeCount(this.playingService.localPlayer?.name);
        }

        this.socket.emit(SocketPlayerMovementLabels.CombatEscaped, {
            roomCode: this.joinGameService.pinCode,
            escapee: this.combatState.value.attacker.name,
        });
    }

    private healPlayers(): void {
        const { attacker, defender } = this.combatState.value;
        const maxHealthAttacker = attacker.speed > baseStats.speed ? baseStats.life : baseStats.life + 2;
        const maxHealthDefender = defender.speed > baseStats.speed ? baseStats.life : baseStats.life + 2;
        attacker.life = maxHealthAttacker;
        defender.life = maxHealthDefender;

        this.combatState.next({
            ...this.combatState.value,
        });
        this.combatUpdateAnnouncer(this.joinGameService.pinCode, this.combatState.value.attacker, this.combatState.value.defender);
    }

    private handleTeleportPositionChanged(loser: Player, nextTile: Tile): void {
        loser.coordinate = nextTile.position;
        nextTile.player = loser;
        const boardServiceValue = this.joinGameService.playingService.boardServiceValue;
        boardServiceValue.updateTiles(nextTile);
        this.playerMovedAnnouncer(this.joinGameService.pinCode, loser, loser.coordinate);
    }

    /**
     * Finds the closest empty walkable tile to the given spawn point
     * @param spawnTile The tile representing the spawn point
     * @returns The closest empty tile or null if none found
     */
    private findNearestEmptyTile(spawnTile: Tile | null): Tile | null {
        const playingService = this.joinGameService.playingService;
        const allTiles = playingService.boardServiceValue.tiles;

        if (!spawnTile) return allTiles.find((tile) => !tile.player && tile.type !== 'wall' && tile.traversable) || null;

        const tilesWithDistance = allTiles
            .filter((tile) => !tile.player && tile.type !== 'wall' && tile.traversable)
            .map((tile) => ({
                tile,
                distance: Math.sqrt(Math.pow(tile.position.x - spawnTile.position.x, 2) + Math.pow(tile.position.y - spawnTile.position.y, 2)),
            }))
            .sort((a, b) => a.distance - b.distance);

        return tilesWithDistance.length > 0 ? tilesWithDistance[0].tile : null;
    }

    /**
     * Simulates a dice roll with the given number of faces
     * @param faces Number of faces on the dice
     * @returns Random number between 1 and faces
     */
    private rollDice(faces: number): number {
        const rolledDice = Math.floor(Math.random() * faces) + 1;
        const attacker = this.combatState.value.attacker;
        const checkForRing = attacker.inventory?.find((item) => item.name === 'bouclier2');
        if (rolledDice === 1 && checkForRing) {
            return RING_ITEM_ROLL_VALUE;
        }
        return rolledDice;
    }

    private emitCombatRolls(attackerBonus: number, defenderBonus: number): void {
        this.socket.emit(SocketPlayerMovementLabels.CombatRolls, {
            roomCode: this.joinGameService.pinCode,
            attackerBonus,
            defenderBonus,
        });
    }

    private combatUpdateAnnouncer(roomCode: string, attacker: Player, defender: Player): void {
        this.socket.emit(SocketPlayerMovementLabels.CombatUpdate, {
            roomCode,
            attacker,
            defender,
        });
    }

    private combatEndedAnnouncer(roomCode: string, winner: string, loser: string): void {
        this.socket.emit(SocketPlayerMovementLabels.CombatEnded, {
            roomCode,
            winner,
            loser,
        });
    }

    private playerMovedAnnouncer(roomCode: string, player: Player, nextPosition: { x: number; y: number }): void {
        this.socket.emit(SocketPlayerMovementLabels.PlayerMoved, {
            roomCode,
            player,
            nextPosition,
        });
    }

    private combatPhaseForBots(): void {
        const isAttackerWinner = Math.random() < RANDOM_WINNING_CHANCE;
        if (isAttackerWinner) {
            this.combatEndedAnnouncer(this.joinGameService.pinCode, this.attacker.name ?? '', this.defender.name ?? '');
            this.teleportLoserToSpawn(this.defender.name ?? '');
            if (this._joinGameService && this.attacker.name)
                this.gameLogService.sendCombatResultLog(this._joinGameService.pinCode, this.attacker, this.defender, this.attacker.name);
        } else {
            this.combatEndedAnnouncer(this.joinGameService.pinCode, this.defender.name ?? '', this.attacker.name ?? '');
            this.teleportLoserToSpawn(this.attacker.name ?? '');
            if (this._joinGameService && this.defender.name)
                this.gameLogService.sendCombatResultLog(this._joinGameService.pinCode, this.attacker, this.defender, this.defender.name);
        }
    }
}
