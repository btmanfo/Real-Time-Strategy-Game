/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable no-unused-vars */
// Utilisation de fonction sans utiliser la totalité méthodes
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Utilisation de assertation non null pour effectuées des tests

import { TestBed } from '@angular/core/testing';
import { ESCAPE_CHANCE, MAX_ESCAPE_ATTEMPTS, POTION1_EFFECT, RING_ITEM_ROLL_VALUE, SHIELD_EFFECT } from '@app/constants/constants';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { DiceType, SocketEndGameStatistics, SocketPlayerMovementLabels } from '@common/constants';
import { Item, Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { CombatService } from './combat-service.service';

const createMockItem = (name: string): Item => ({
    name,
    id: 1,
    position: { x: 0, y: 0 },
    image: '',
    type: 'mock',
    description: '',
    isOutOfContainer: false,
});

describe('CombatService', () => {
    let service: CombatService;
    let mockJoinGameService: jasmine.SpyObj<JoinGameService>;
    let mockSocket: jasmine.SpyObj<Socket>;
    let mockGameLogService: jasmine.SpyObj<GameLogService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;

    const mockAttacker: Player = {
        name: 'Player1',
        avatarUrl: 'avatar1',
        life: 4,
        attack: '4 Faces' as DiceType,
        defense: '6 Faces' as DiceType,
        speed: 6,
        coordinate: { x: 0, y: 0 },
        isAdmin: true,
        inventory: [],
        spawnPoint: { x: 0, y: 0 },
    };

    const mockDefender: Player = {
        name: 'Player2',
        avatarUrl: 'avatar2',
        life: 4,
        attack: '6 Faces' as DiceType,
        defense: '4 Faces' as DiceType,
        speed: 6,
        coordinate: { x: 1, y: 1 },
        isAdmin: false,
        inventory: [],
        spawnPoint: { x: 2, y: 2 },
    };

    const createMockTile = (player: Player | null, type: string, traversable: boolean, position: { x: number; y: number }): Tile => ({
        player,
        type,
        traversable,
        position,
        item: null,
        image: '',
        cost: 1,
    });

    beforeEach(() => {
        mockSocket = jasmine.createSpyObj('Socket', ['emit']);
        mockGameLogService = jasmine.createSpyObj('GameLogService', ['sendCombatAttackLog', 'sendCombatEvasionLog', 'sendCombatResultLog'], {
            myRoom: 'testRoom',
        });
        playingServiceSpy = jasmine.createSpyObj('PlayingService', [], {
            localPlayer: { name: 'Player1' },
        });

        mockJoinGameService = jasmine.createSpyObj('JoinGameService', [], {
            socket: mockSocket,
            pinCode: '1234',
            playingService: {
                isDebugMode: false,
                players: [mockAttacker, mockDefender],
                boardServiceValue: {
                    tiles: [
                        createMockTile(null, 'floor', true, { x: 0, y: 0 }),
                        createMockTile(null, 'floor', true, { x: 2, y: 2 }),
                        createMockTile(null, 'floor', true, { x: 1, y: 1 }),
                    ],
                    updateTiles: jasmine.createSpy('updateTiles'),
                },
                movingGameService: {
                    getPlayerTile: jasmine.createSpy('getPlayerTile').and.returnValue(createMockTile(mockDefender, 'floor', true, { x: 1, y: 1 })),
                },
            },
        });

        TestBed.configureTestingModule({
            providers: [
                CombatService,
                { provide: JoinGameService, useValue: mockJoinGameService },
                { provide: GameLogService, useValue: mockGameLogService },
                { provide: PlayingService, useValue: playingServiceSpy },
            ],
            teardown: { destroyAfterEach: false },
        });

        service = TestBed.inject(CombatService);
        service.initCombat(mockAttacker, mockDefender);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize with default values', () => {
        const combatState = service['combatState'].value;
        expect(combatState.escapeAttempts).toBe(0);
        expect(combatState.maxEscapeAttempts).toBe(MAX_ESCAPE_ATTEMPTS);
        expect(combatState.escapeChance).toBe(ESCAPE_CHANCE);
    });

    describe('Dependency Injection', () => {
        it('should get JoinGameService through injector the first time', () => {
            (service as any)._joinGameService = null;

            const joinGameService = service.joinGameService;

            expect(joinGameService).toBe(mockJoinGameService);
            expect((service as any)._joinGameService).toBe(mockJoinGameService);
        });

        it('should reuse cached JoinGameService on subsequent calls', () => {
            const injectorSpy = spyOn((service as any).injector, 'get');

            (service as any)._joinGameService = mockJoinGameService;

            const joinGameService = service.joinGameService;

            expect(injectorSpy).not.toHaveBeenCalled();
            expect(joinGameService).toBe(mockJoinGameService);
        });
    });

    describe('getters and setters', () => {
        it('should return attacker correctly', () => {
            service['combatState'].next({ ...service['combatState'].value, attacker: mockAttacker });
            expect(service.attacker).toEqual(mockAttacker);
        });

        it('should return defender correctly', () => {
            service['combatState'].next({ ...service['combatState'].value, defender: mockDefender });
            expect(service.defender).toEqual(mockDefender);
        });

        it('should get escape attempts correctly', () => {
            service['combatState'].next({ ...service['combatState'].value, escapeAttempts: 1 });
            expect(service.escapeAttempts).toBe(1);
        });

        it('should access combatState observable', () => {
            const state = service['combatState'].value;
            expect(state).toBeDefined();
            expect(state.maxEscapeAttempts).toBe(MAX_ESCAPE_ATTEMPTS);
        });
    });

    describe('initCombat', () => {
        it('should initialize combat with given players', () => {
            service.initCombat(mockAttacker, mockDefender);

            const state = service['combatState'].value;
            expect(state.attacker).toEqual(mockAttacker);
            expect(state.defender).toEqual(mockDefender);
            expect(state.escapeAttempts).toBe(0);
            expect(state.isActive).toBeTrue();
        });
    });

    describe('attack', () => {
        beforeEach(() => {
            service.initCombat(mockAttacker, mockDefender);
        });

        it('should do nothing if combat is not active', () => {
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service['combatState'].next({ ...service['combatState'].value, isActive: false });

            const initialState = { ...service['combatState'].value };
            service.attack(mockAttacker, mockDefender);

            expect(service['combatState'].value).toEqual(initialState);
        });

        it('should calculate correct attack and defense values for 6-sided dice', () => {
            const attackerWithD6 = { ...mockAttacker, attack: '6 Faces' as DiceType };
            const defenderWithD6 = { ...mockDefender, defense: '6 Faces' as DiceType, life: 4 };

            service.initCombat(attackerWithD6, defenderWithD6);

            service['combatState'].value.defender.life = 4;

            spyOn(service as any, 'rollDice').and.returnValues(5, 2);
            spyOn(service as any, 'calculateDamage').and.returnValue(3);

            service.attack(service['combatState'].value.attacker, service['combatState'].value.defender);
        });

        it('should apply ice penalty when attacker is on ice', () => {
            const attackerOnIce = {
                ...mockAttacker,
                attack: '6 Faces' as DiceType,
                isOnIce: true,
            };
            const defenderNotOnIce = {
                ...mockDefender,
                defense: '4 Faces' as DiceType,
                isOnIce: false,
            };

            service.initCombat(attackerOnIce, defenderNotOnIce);

            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(attackerOnIce, defenderNotOnIce);

            const damage = (service as any).calculateDamage(3, 2);

            expect(damage).toBeLessThan(3);
        });

        it('should apply ice penalty when defender is on ice', () => {
            const attackerNotOnIce = {
                ...mockAttacker,
                attack: '6 Faces' as DiceType,
                isOnIce: false,
            };
            const defenderOnIce = {
                ...mockDefender,
                defense: '4 Faces' as DiceType,
                isOnIce: true,
            };

            service.initCombat(attackerNotOnIce, defenderOnIce);

            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(attackerNotOnIce, defenderOnIce);

            const damage = (service as any).calculateDamage(3, 2);

            expect(damage).toBeGreaterThan(0);
        });

        it('should end combat when defender life reaches 0', () => {
            const weakDefender = { ...mockDefender, life: 1 };
            service.initCombat(mockAttacker, weakDefender);

            spyOn(service as any, 'rollDice').and.returnValues(4, 1);

            spyOn(service as any, 'endCombat');

            service.attack(mockAttacker, weakDefender);

            expect((service as any).endCombat).toHaveBeenCalled();
        });

        it('should emit combatUpdate event after attack', () => {
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(mockAttacker, mockDefender);

            expect(mockSocket.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.CombatUpdate, {
                roomCode: '1234',
                attacker: jasmine.any(Object),
                defender: jasmine.any(Object),
            });
        });

        it('should emit updatePlayerDamages and updatePlayerLifeLost when attacking', () => {
            service.initCombat(mockAttacker, mockDefender);

            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(mockAttacker, mockDefender);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketEndGameStatistics.UpdatePlayerDamages,
                jasmine.objectContaining({
                    roomCode: '1234',
                    playerName: mockAttacker.name,
                    dealDamage: jasmine.any(Number),
                }),
            );

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketEndGameStatistics.UpdatePlayerLifeLost,
                jasmine.objectContaining({
                    roomCode: '1234',
                    playerName: mockDefender.name,
                    dealDamage: jasmine.any(Number),
                }),
            );
        });
    });

    describe('dodge', () => {
        beforeEach(() => {
            service.initCombat(mockAttacker, mockDefender);
        });

        it('should return false if max escape attempts reached', () => {
            service['combatState'].next({ ...service['combatState'].value, escapeAttempts: MAX_ESCAPE_ATTEMPTS });
            const result = service.dodge();
            expect(result).toBeFalse();
        });

        it('should return false if combat is not active', () => {
            service['combatState'].next({ ...service['combatState'].value, isActive: false });
            const result = service.dodge();
            expect(result).toBeFalse();
        });

        it('should increment escape attempts', () => {
            spyOn(Math, 'random').and.returnValue(0.5);

            service.dodge();
            expect(service['combatState'].value.escapeAttempts).toBe(1);

            service.dodge();
            expect(service['combatState'].value.escapeAttempts).toBe(2);
        });

        it('should succeed escape with probability < escapeChance', () => {
            spyOn(Math, 'random').and.returnValue(0.2);
            spyOn(service as any, 'endCombatWithEscape');

            const result = service.dodge();

            expect(result).toBeTrue();
            expect((service as any).endCombatWithEscape).toHaveBeenCalled();
        });

        it('should fail escape with probability >= escapeChance', () => {
            spyOn(Math, 'random').and.returnValue(0.4);
            spyOn(service as any, 'endCombatWithEscape');

            const result = service.dodge();

            expect(result).toBeFalse();
            expect((service as any).endCombatWithEscape).not.toHaveBeenCalled();
        });

        it('should swap roles and emit combatUpdate on failed dodge', () => {
            spyOn(Math, 'random').and.returnValue(0.4);

            const originalAttacker = service['combatState'].value.attacker;
            const originalDefender = service['combatState'].value.defender;

            service.dodge();

            expect(service['combatState'].value.attacker.name).toBe(originalDefender.name);
            expect(service['combatState'].value.defender.name).toBe(originalAttacker.name);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.CombatUpdate,
                jasmine.objectContaining({
                    roomCode: '1234',
                }),
            );
        });

        it('should emit combatEscaped when escape is successful', () => {
            service.initCombat(mockAttacker, mockDefender);

            spyOn(Math, 'random').and.returnValue(0.1);

            service.dodge();

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.CombatEscaped,
                jasmine.objectContaining({
                    roomCode: '1234',
                    escapee: mockAttacker.name,
                }),
            );
        });

        it('should not allow more than max escape attempts', () => {
            service.initCombat(mockAttacker, mockDefender);

            spyOn(Math, 'random').and.returnValue(0.5);

            const firstAttempt = service.dodge();
            expect(firstAttempt).toBeFalse();
            expect(service.escapeAttempts).toBe(1);

            const secondAttempt = service.dodge();
            expect(secondAttempt).toBeFalse();
            expect(service.escapeAttempts).toBe(2);

            const thirdAttempt = service.dodge();
            expect(thirdAttempt).toBeFalse();
            expect(service.escapeAttempts).toBe(2);
        });

        it('should call sendCombatEvasionLog on dodge attempt', () => {
            service.initCombat(mockAttacker, mockDefender);
            spyOn(Math, 'random').and.returnValue(0.4);

            service.dodge();

            expect(mockGameLogService.sendCombatEvasionLog).toHaveBeenCalledWith(
                'testRoom',
                jasmine.any(Object),
                jasmine.any(Object),
                jasmine.any(Number),
                'Échouée',
            );
        });
    });

    describe('Item Bonuses', () => {
        it('should apply sword bonus for attacker with epee1', () => {
            const attackerWithSword = {
                ...mockAttacker,
                inventory: [createMockItem('epee1')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithSword, normalDefender);
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(attackerWithSword, normalDefender);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketEndGameStatistics.UpdatePlayerDamages,
                jasmine.objectContaining({ dealDamage: jasmine.any(Number) }),
            );

            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBeGreaterThan(0);
        });

        it('should apply sword bonus for attacker with epee2', () => {
            const attackerWithSword = {
                ...mockAttacker,
                inventory: [createMockItem('epee2')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithSword, normalDefender);
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(attackerWithSword, normalDefender);

            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBeGreaterThan(0);
        });

        it('should apply negative sword bonus for defender with epee1', () => {
            const normalAttacker = { ...mockAttacker };
            const defenderWithSword = {
                ...mockDefender,
                inventory: [createMockItem('epee1')],
            };

            service.initCombat(normalAttacker, defenderWithSword);
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(normalAttacker, defenderWithSword);

            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBeGreaterThan(0);
        });

        it('should apply shield effect for defender on ice', () => {
            const normalAttacker = { ...mockAttacker };
            const defenderWithShield = {
                ...mockDefender,
                isOnIce: true,
                inventory: [createMockItem('bouclier1')],
            };

            service.initCombat(normalAttacker, defenderWithShield);

            const bonus = (service as any).checkItemBonuses(defenderWithShield);
            expect(bonus).toBe(SHIELD_EFFECT);
        });

        it('should not apply shield effect for attacker on ice', () => {
            const attackerWithShield = {
                ...mockAttacker,
                isOnIce: true,
                inventory: [createMockItem('bouclier1')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithShield, normalDefender);

            const bonus = (service as any).checkItemBonuses(attackerWithShield);
            expect(bonus).toBe(0);
        });

        it('should apply potion1 effect for attacker', () => {
            const attackerWithPotion = {
                ...mockAttacker,
                inventory: [createMockItem('potion1')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithPotion, normalDefender);

            const rollsResult = (service as any).calculateDiceRolls();

            if (!mockJoinGameService.playingService.isDebugMode) {
                expect(rollsResult.attackerBonus).toBeGreaterThan(0);
            }
        });

        it('should handle player with undefined inventory in checkItemBonuses', () => {
            const playerNoInventory = { ...mockAttacker, inventory: undefined };

            service.initCombat(playerNoInventory, mockDefender);
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            service.attack(playerNoInventory, mockDefender);

            expect(mockSocket.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.CombatRolls, jasmine.anything());
        });

        it('should combine effects of multiple items', () => {
            const attackerWithItems = {
                ...mockAttacker,
                inventory: [createMockItem('epee1'), createMockItem('potion1')],
            };

            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithItems, normalDefender);
            spyOn(service as any, 'rollDice').and.returnValues(3, 2);

            const damage = (service as any).calculateDamage(3, 2);

            expect(damage).toBeGreaterThan(0);
        });
    });

    describe('rollDice method', () => {
        it('should roll dice correctly within range', () => {
            const faces = 6;
            const rollResults: number[] = [];

            const randomValues = [0.1, 0.3, 0.5, 0.7, 0.9, 0.99];
            let index = 0;
            spyOn(Math, 'random').and.callFake(() => {
                return randomValues[index++ % randomValues.length];
            });

            for (let i = 0; i < 6; i++) {
                const rollResult = (service as any).rollDice(faces);
                rollResults.push(rollResult);

                expect(rollResult).toBeGreaterThanOrEqual(1);
                expect(rollResult).toBeLessThanOrEqual(faces);
            }

            const uniqueValues = new Set(rollResults).size;
            expect(uniqueValues).toBeGreaterThan(1);
        });

        it('should return RING_ITEM_ROLL_VALUE when rolling 1 with bouclier2', () => {
            const attackerWithRing = {
                ...mockAttacker,
                inventory: [createMockItem('bouclier2')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithRing, normalDefender);

            spyOn(Math, 'random').and.returnValue(0);

            const rollResult = (service as any).rollDice(6);
            expect(rollResult).toBe(RING_ITEM_ROLL_VALUE);
        });

        it('should return normal roll when not rolling 1 with bouclier2', () => {
            const attackerWithRing = {
                ...mockAttacker,
                inventory: [createMockItem('bouclier2')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithRing, normalDefender);

            spyOn(Math, 'random').and.returnValue(0.4);

            const rollResult = (service as any).rollDice(6);
            expect(rollResult).toBe(3);
        });
    });

    describe('calculateDiceRolls', () => {
        it('should add POTION1_EFFECT when attacker has potion1', () => {
            const attackerWithPotion = {
                ...mockAttacker,
                inventory: [createMockItem('potion1')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithPotion, normalDefender);
            mockJoinGameService.playingService.isDebugMode = true;

            const result = (service as any).calculateDiceRolls();

            expect(result.attackerBonus).toBe(4 + POTION1_EFFECT);
        });

        it('should use normal dice values without potion', () => {
            const normalAttacker = { ...mockAttacker };
            const normalDefender = { ...mockDefender };

            service.initCombat(normalAttacker, normalDefender);
            mockJoinGameService.playingService.isDebugMode = true;

            const result = (service as any).calculateDiceRolls();

            expect(result.attackerBonus).toBe(4);
        });

        it('should use random values in normal mode', () => {
            mockJoinGameService.playingService.isDebugMode = false;

            spyOn<any>(service, 'rollDice').and.returnValue(3);

            service.attack(mockAttacker, mockDefender);

            expect((service as any).rollDice).toHaveBeenCalledTimes(2);
        });

        it('should use maximum attack and minimum defense values in debug mode', () => {
            service.initCombat(mockAttacker, mockDefender);

            mockJoinGameService.playingService.isDebugMode = true;

            spyOn(service as any, 'rollDice');

            service.attack(mockAttacker, mockDefender);

            expect((service as any).rollDice).not.toHaveBeenCalled();
        });
    });

    describe('checkSwordBonus', () => {
        it('should apply +2 attack bonus for attacker with epee1', () => {
            const attackerWithSword = {
                ...mockAttacker,
                inventory: [createMockItem('epee1')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithSword, normalDefender);

            const bonus = (service as any).checkSwordBonus(attackerWithSword);
            expect(bonus).toBe(2);
        });

        it('should apply +1 attack bonus for attacker with epee2', () => {
            const attackerWithSword = {
                ...mockAttacker,
                inventory: [createMockItem('epee2')],
            };
            const normalDefender = { ...mockDefender };

            service.initCombat(attackerWithSword, normalDefender);

            const bonus = (service as any).checkSwordBonus(attackerWithSword);
            expect(bonus).toBe(1);
        });

        it('should apply -2 defense malus for defender with epee1', () => {
            const normalAttacker = { ...mockAttacker };
            const defenderWithSword = {
                ...mockDefender,
                inventory: [createMockItem('epee1')],
            };

            service.initCombat(normalAttacker, defenderWithSword);

            const bonus = (service as any).checkSwordBonus(defenderWithSword);
            expect(bonus).toBe(-2);
        });

        it('should apply -1 defense malus for defender with epee2', () => {
            const normalAttacker = { ...mockAttacker };
            const defenderWithSword = {
                ...mockDefender,
                inventory: [createMockItem('epee2')],
            };

            service.initCombat(normalAttacker, defenderWithSword);

            const bonus = (service as any).checkSwordBonus(defenderWithSword);
            expect(bonus).toBe(-1);
        });

        it('should handle players with no inventory', () => {
            const attackerNoInventory = {
                ...mockAttacker,
                inventory: undefined,
            };

            service.initCombat(attackerNoInventory, mockDefender);

            const bonus = (service as any).checkSwordBonus(attackerNoInventory);
            expect(bonus).toBe(0);
        });
    });

    describe('updateIsInCombat and updateDodgeCount', () => {
        it('should emit updatePlayerCombatCount event', () => {
            service.updateIsInCombat('Player1', 'Player2');

            expect(mockSocket.emit).toHaveBeenCalledWith(SocketEndGameStatistics.UpdatePlayerCombatCount, {
                roomCode: '1234',
                currentPlayer: 'Player1',
                theSecondPlayer: 'Player2',
            });
        });

        it('should emit updatePlayerDodgeCount event', () => {
            service.updateDodgeCount('Player1');

            expect(mockSocket.emit).toHaveBeenCalledWith(SocketEndGameStatistics.UpdatePlayerDodgeCount, {
                roomCode: '1234',
                currentPlayer: 'Player1',
            });
        });
    });

    describe('handleOpponentQuit', () => {
        it('should do nothing if combat is not active', () => {
            service.initCombat(mockAttacker, mockDefender);
            service['combatState'].next({ ...service['combatState'].value, isActive: false });

            spyOn(service as any, 'healPlayers');

            service.handleOpponentQuit('Player1');

            expect((service as any).healPlayers).not.toHaveBeenCalled();
            expect(mockSocket.emit).not.toHaveBeenCalledWith(SocketPlayerMovementLabels.CombatEnded, jasmine.anything());
        });

        it('should handle attacker quitting correctly', () => {
            service.initCombat(mockAttacker, mockDefender);

            spyOn(service as any, 'healPlayers');

            service.handleOpponentQuit('Player1');

            expect((service as any).healPlayers).toHaveBeenCalled();
            expect(service['combatState'].value.isActive).toBeFalse();
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.CombatEnded, {
                roomCode: '1234',
                winner: 'Player2',
                loser: 'Player1',
            });
        });

        it('should handle defender quitting correctly', () => {
            service.initCombat(mockAttacker, mockDefender);

            spyOn(service as any, 'healPlayers');

            service.handleOpponentQuit(mockDefender.name!);

            expect((service as any).healPlayers).toHaveBeenCalled();
            expect(service['combatState'].value.isActive).toBeFalse();
            expect(mockSocket.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.CombatEnded, {
                roomCode: '1234',
                winner: 'Player1',
                loser: 'Player2',
            });
        });
    });

    describe('healPlayers', () => {
        it('should give less health to fast attacker and more health to slow defender', () => {
            const fastAttacker = { ...mockAttacker, speed: 6, life: 1 };
            const slowDefender = { ...mockDefender, speed: 4, life: 1 };

            service.initCombat(fastAttacker, slowDefender);

            (service as any).healPlayers();

            expect(service['combatState'].value.attacker.life).toBe(4);
            expect(service['combatState'].value.defender.life).toBe(6);
        });

        it('should give less health to fast defender and more health to slow attacker', () => {
            const slowAttacker = { ...mockAttacker, speed: 4, life: 1 };
            const fastDefender = { ...mockDefender, speed: 6, life: 1 };

            service.initCombat(slowAttacker, fastDefender);

            (service as any).healPlayers();

            expect(service['combatState'].value.attacker.life).toBe(6);
            expect(service['combatState'].value.defender.life).toBe(4);
        });

        it('should give more health to both players when they are slow', () => {
            const slowAttacker = { ...mockAttacker, speed: 4, life: 1 };
            const slowDefender = { ...mockDefender, speed: 4, life: 1 };

            service.initCombat(slowAttacker, slowDefender);

            (service as any).healPlayers();

            expect(service['combatState'].value.attacker.life).toBe(6);
            expect(service['combatState'].value.defender.life).toBe(6);
        });

        it('should give less health to both players when they are fast', () => {
            const fastAttacker = { ...mockAttacker, speed: 6, life: 1 };
            const fastDefender = { ...mockDefender, speed: 6, life: 1 };

            service.initCombat(fastAttacker, fastDefender);

            (service as any).healPlayers();

            expect(service['combatState'].value.attacker.life).toBe(4);
            expect(service['combatState'].value.defender.life).toBe(4);
        });

        it('should emit combatUpdate when healPlayers is called', () => {
            service.initCombat(mockAttacker, mockDefender);

            (service as any).healPlayers();

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.CombatUpdate,
                jasmine.objectContaining({
                    roomCode: '1234',
                    attacker: jasmine.any(Object),
                    defender: jasmine.any(Object),
                }),
            );
        });
    });

    describe('teleportLoserToSpawn', () => {
        it('should teleport loser to spawn point when spawn is empty', () => {
            const loserSpawnTile = createMockTile(null, 'floor', true, { x: 2, y: 2 });
            mockJoinGameService.playingService.boardServiceValue.tiles = [loserSpawnTile];
            mockJoinGameService.playingService.players = [mockDefender];

            (mockJoinGameService.playingService.movingGameService.getPlayerTile as jasmine.Spy).and.returnValue(
                createMockTile(mockDefender, 'floor', true, { x: 1, y: 1 }),
            );

            service.teleportLoserToSpawn(mockDefender.name!);

            expect(mockJoinGameService.playingService.boardServiceValue.updateTiles).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    position: { x: 2, y: 2 },
                    player: mockDefender,
                }),
            );

            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.PlayerMoved,
                jasmine.objectContaining({
                    roomCode: '1234',
                    player: mockDefender,
                    nextPosition: { x: 2, y: 2 },
                }),
            );
        });

        it('should teleport to nearest empty tile when spawn is occupied', () => {
            const occupiedSpawnTile = createMockTile(mockAttacker, 'floor', true, { x: 2, y: 2 });
            const emptyNearbyTile = createMockTile(null, 'floor', true, { x: 3, y: 3 });

            mockJoinGameService.playingService.boardServiceValue.tiles = [occupiedSpawnTile, emptyNearbyTile];
            mockJoinGameService.playingService.players = [mockDefender];

            (mockJoinGameService.playingService.movingGameService.getPlayerTile as jasmine.Spy).and.returnValue(
                createMockTile(mockDefender, 'floor', true, { x: 1, y: 1 }),
            );

            service.teleportLoserToSpawn(mockDefender.name!);

            expect(mockJoinGameService.playingService.boardServiceValue.updateTiles).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    position: { x: 3, y: 3 },
                    player: mockDefender,
                }),
            );
        });

        it('should handle case when no current tile is found', () => {
            const loserSpawnTile = createMockTile(null, 'floor', true, { x: 2, y: 2 });
            mockJoinGameService.playingService.boardServiceValue.tiles = [loserSpawnTile];
            mockJoinGameService.playingService.players = [mockDefender];

            (mockJoinGameService.playingService.movingGameService.getPlayerTile as jasmine.Spy).and.returnValue(null);

            service.teleportLoserToSpawn(mockDefender.name!);

            expect(mockJoinGameService.playingService.boardServiceValue.updateTiles).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    position: { x: 2, y: 2 },
                    player: mockDefender,
                }),
            );
        });
    });

    describe('findNearestEmptyTile', () => {
        it('should return the closest empty traversable tile', () => {
            const mockSpawnTile = createMockTile(null, 'floor', true, { x: 0, y: 0 });

            const mockTiles = [
                createMockTile(null, 'floor', true, { x: 1, y: 1 }),
                createMockTile(null, 'floor', true, { x: 2, y: 2 }),
                createMockTile(mockAttacker, 'floor', true, { x: 3, y: 3 }),
                createMockTile(null, 'wall', false, { x: 0, y: 1 }),
            ];

            mockJoinGameService.playingService.boardServiceValue.tiles = mockTiles;

            const result = (service as any).findNearestEmptyTile(mockSpawnTile);

            expect(result).toEqual(mockTiles[0]);
        });

        it('should return null if no empty tile is found', () => {
            const mockSpawnTile = createMockTile(null, 'floor', true, { x: 0, y: 0 });

            const mockTiles = [
                createMockTile(mockAttacker, 'floor', true, { x: 1, y: 1 }),
                createMockTile(mockDefender, 'floor', true, { x: 2, y: 2 }),
                createMockTile(null, 'wall', false, { x: 3, y: 3 }),
            ];

            mockJoinGameService.playingService.boardServiceValue.tiles = mockTiles;

            const result = (service as any).findNearestEmptyTile(mockSpawnTile);

            expect(result).toBeNull();
        });

        it('should find any available tile when spawnTile is null', () => {
            const mockTiles = [
                createMockTile(mockAttacker, 'floor', true, { x: 1, y: 1 }),
                createMockTile(null, 'floor', true, { x: 2, y: 2 }),
                createMockTile(null, 'wall', false, { x: 3, y: 3 }),
                createMockTile(mockDefender, 'floor', true, { x: 4, y: 4 }),
            ];

            mockJoinGameService.playingService.boardServiceValue.tiles = mockTiles;

            const result = (service as any).findNearestEmptyTile(null);

            expect(result).toEqual(mockTiles[1]);
        });

        it('should return null when no available tiles are found with null spawnTile', () => {
            const mockTiles = [
                createMockTile(mockAttacker, 'floor', true, { x: 1, y: 1 }),
                createMockTile(mockDefender, 'floor', true, { x: 2, y: 2 }),
                createMockTile(null, 'wall', false, { x: 3, y: 3 }),
            ];

            mockJoinGameService.playingService.boardServiceValue.tiles = mockTiles;

            const result = (service as any).findNearestEmptyTile(null);

            expect(result).toBeNull();
        });

        it('should return null when tiles array is empty', () => {
            mockJoinGameService.playingService.boardServiceValue.tiles = [];

            const result = (service as any).findNearestEmptyTile(null);

            expect(result).toBeNull();
        });
    });

    describe('calculateDamage', () => {
        it('should apply ice penalty for attacker only', () => {
            const attackerOnIce = { ...mockAttacker, isOnIce: true };
            const defenderNotOnIce = { ...mockDefender, isOnIce: false };

            service.initCombat(attackerOnIce, defenderNotOnIce);

            const damage = (service as any).calculateDamage(3, 2);

            expect(damage).toBe(0);
        });

        it('should apply ice penalty for defender only', () => {
            const attackerNotOnIce = { ...mockAttacker, isOnIce: false };
            const defenderOnIce = { ...mockDefender, isOnIce: true };

            service.initCombat(attackerNotOnIce, defenderOnIce);
            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBe(3);
        });

        it('should apply no ice penalties when neither player is on ice', () => {
            const attackerNotOnIce = { ...mockAttacker, isOnIce: false };
            const defenderNotOnIce = { ...mockDefender, isOnIce: false };

            service.initCombat(attackerNotOnIce, defenderNotOnIce);
            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBe(1);
        });

        it('should apply ice penalties for both players', () => {
            const attackerOnIce = { ...mockAttacker, isOnIce: true };
            const defenderOnIce = { ...mockDefender, isOnIce: true };

            service.initCombat(attackerOnIce, defenderOnIce);
            const damage = (service as any).calculateDamage(3, 2);
            expect(damage).toBe(1);
        });

        it('should handle zero or negative damage calculations', () => {
            const attackerNotOnIce = { ...mockAttacker, isOnIce: false };
            const defenderNotOnIce = { ...mockDefender, isOnIce: false };

            service.initCombat(attackerNotOnIce, defenderNotOnIce);
            const damage = (service as any).calculateDamage(2, 3);
            expect(damage).toBe(0);
        });
    });

    describe('gameLogService interactions', () => {
        it('should call sendCombatResultLog when combat ends due to defeat', () => {
            const weakDefender = { ...mockDefender, life: 1 };
            service.initCombat(mockAttacker, weakDefender);
            spyOn(service as any, 'rollDice').and.returnValues(4, 1);
            spyOn(service as any, 'endCombat').and.callThrough();

            service.attack(mockAttacker, weakDefender);

            expect((service as any).endCombat).toHaveBeenCalled();
        });
    });

    describe('Combat phase between bots', () => {
        let botAttacker: Player;
        let botDefender: Player;

        beforeEach(() => {
            botAttacker = {
                ...mockAttacker,
                name: 'Bot1',
                isVirtualPlayer: true,
                life: 10,
                spawnPoint: { x: 0, y: 0 },
            };
            botDefender = {
                ...mockDefender,
                name: 'Bot2',
                isVirtualPlayer: true,
                life: 10,
                spawnPoint: { x: 2, y: 2 },
            };

            mockJoinGameService.playingService.players = [botAttacker, botDefender];

            service.initCombat(botAttacker, botDefender);
        });

        it('should award victory to the attacker when Math.random() returns less than 0.5', () => {
            spyOn(Math, 'random').and.returnValue(0.3);
            (service as any).combatPhaseForBots();
            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.CombatEnded,
                jasmine.objectContaining({
                    winner: botAttacker.name,
                    loser: botDefender.name,
                }),
            );
            expect(mockGameLogService.sendCombatResultLog).toHaveBeenCalledWith(
                mockJoinGameService.pinCode,
                botAttacker,
                botDefender,
                botAttacker.name ?? '',
            );
            expect(service['combatState'].value.isActive).toBeTrue();
        });

        it('should award victory to the defender when Math.random() returns greater than or equal to 0.5', () => {
            spyOn(Math, 'random').and.returnValue(0.8);
            (service as any).combatPhaseForBots();
            expect(mockSocket.emit).toHaveBeenCalledWith(
                SocketPlayerMovementLabels.CombatEnded,
                jasmine.objectContaining({
                    winner: botDefender.name,
                    loser: botAttacker.name,
                }),
            );
            expect(mockGameLogService.sendCombatResultLog).toHaveBeenCalledWith(
                mockJoinGameService.pinCode,
                botAttacker,
                botDefender,
                botDefender.name ?? '',
            );
            expect(service['combatState'].value.isActive).toBeTrue();
        });
    });
});
