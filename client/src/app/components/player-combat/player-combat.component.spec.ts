/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/naming-convention */
// On doit mettre une majuscule pour être conforme à l'interface
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Le nombre de lignes est supérieur à la normale car il y a plusieurs tests à réaliser pour chaque fonction
/* eslint-disable  @typescript-eslint/no-empty-function */
// Certain de nos fichiers utilisent des fonctions vides

import { EventEmitter, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAX_ESCAPE_ATTEMPTS } from '@app/constants/constants';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Player } from '@common/interfaces';
import { of, Subject } from 'rxjs';
import { PlayerCombatComponent } from './player-combat.component';

describe('PlayerCombatComponent', () => {
    let component: PlayerCombatComponent;
    let fixture: ComponentFixture<PlayerCombatComponent>;
    let combatServiceSpy: jasmine.SpyObj<CombatService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let escapeAttemptsValue = 0;
    const mockAttacker: Player = {
        name: 'Attacker',
        avatarUrl: 'avatar1.png',
        life: 4,
        speed: 5,
        attack: '4 Faces',
        defense: '6 Faces',
        coordinate: { x: 0, y: 0 },
        isAdmin: false,
        victories: 0,
        isOnIce: false,
        spawnPoint: { x: 0, y: 0 },
    };

    const mockDefender: Player = {
        name: 'Defender',
        avatarUrl: 'avatar2.png',
        life: 4,
        speed: 5,
        attack: '6 Faces',
        defense: '4 Faces',
        coordinate: { x: 1, y: 1 },
        isAdmin: false,
        victories: 0,
        isOnIce: false,
        spawnPoint: { x: 1, y: 1 },
    };

    beforeEach(async () => {
        escapeAttemptsValue = 0;
        const socketSpy = jasmine.createSpyObj('Socket', ['on', 'emit', 'off']);

        combatServiceSpy = jasmine.createSpyObj('CombatService', ['attack', 'dodge', 'updateDodgeCount']);
        Object.defineProperty(combatServiceSpy, 'socket', { get: () => socketSpy });
        Object.defineProperty(combatServiceSpy, 'attacker', { get: () => mockAttacker });
        Object.defineProperty(combatServiceSpy, 'defender', { get: () => mockDefender });
        Object.defineProperty(combatServiceSpy, 'escapeAttempts', {
            get: () => escapeAttemptsValue,
        });

        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['getPlayer']);
        Object.defineProperty(playingServiceSpy, 'localPlayer', { get: () => mockAttacker });

        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', ['movePlayer']);
        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['joinAndCreateGameRoomCombat', 'onRoomCreated', 'sendMessage']);
        joinGameServiceSpy.onRoomCreated.and.returnValue(
            of({
                codeRoom: 'testRoom123',
                theFirstPlayer: mockAttacker,
                theSecondPlayer: mockDefender,
            }),
        );

        await TestBed.configureTestingModule({
            imports: [PlayerCombatComponent],
            providers: [
                { provide: CombatService, useValue: combatServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerCombatComponent);
        component = fixture.componentInstance;
        component.emitFirstPlayer = new EventEmitter<Player[]>();
    });

    afterEach(() => {
        if (fixture) {
            fixture.destroy();
        }
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with max escape attempts from constants', () => {
        expect(component.maxEscapeAttempts).toBe(MAX_ESCAPE_ATTEMPTS);
    });

    it('should set up socket listeners in constructor', () => {
        expect(combatServiceSpy.socket.on).toHaveBeenCalledWith('combatUpdate', jasmine.any(Function));
        expect(combatServiceSpy.socket.on).toHaveBeenCalledWith('combatRolls', jasmine.any(Function));
    });

    describe('ngOnInit', () => {
        it('should initialize attacker and defender from combatService', () => {
            component.ngOnInit();
            expect(component.attacker).toBe(mockAttacker);
            expect(component.defender).toBe(mockDefender);
        });

        it('should emit first players', () => {
            spyOn(component.emitFirstPlayer, 'emit');
            component.ngOnInit();
            expect(component.emitFirstPlayer.emit).toHaveBeenCalledWith([mockAttacker, mockDefender]);
        });

        it('should join and create game room combat', () => {
            component.ngOnInit();
            expect(joinGameServiceSpy.joinAndCreateGameRoomCombat).toHaveBeenCalledWith(mockAttacker, mockDefender);
        });
    });

    describe('ngOnChanges', () => {
        it('should call attack when isEmitValueToAttck changes', () => {
            spyOn(component, 'attack');
            const changes = { isEmitValueToAttck: new SimpleChange(null, 'newValue', true) };
            component.ngOnChanges(changes);
            expect(component.attack).toHaveBeenCalled();
        });

        it('should not call attack when other properties change', () => {
            spyOn(component, 'attack');
            const changes = { otherProperty: new SimpleChange(null, 'newValue', true) };
            component.ngOnChanges(changes);
            expect(component.attack).not.toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        it('should send message if roomCode exists and message is not empty', () => {
            component.roomCode = 'testRoom123';
            component.sendMessage('Hello', 'testRoom123');
            expect(joinGameServiceSpy.sendMessage).toHaveBeenCalledWith('testRoom123', 'Hello', 'testRoom123');
        });

        it('should not send message if roomCode does not exist', () => {
            component.roomCode = '';
            component.sendMessage('Hello', 'testRoom123');
            expect(joinGameServiceSpy.sendMessage).not.toHaveBeenCalled();
        });

        it('should not send message if message is empty', () => {
            component.roomCode = 'testRoom123';
            component.sendMessage('   ', 'testRoom123');
            expect(joinGameServiceSpy.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('attack', () => {
        it('should call combatService.attack if it is my turn', () => {
            component.attacker = mockAttacker;
            component.defender = mockDefender;
            spyOn(component, 'isMyTurn').and.returnValue(true);
            component.attack();
            expect(combatServiceSpy.attack).toHaveBeenCalledWith(mockAttacker, mockDefender);
        });

        it('should not call combatService.attack if it is not my turn', () => {
            component.attacker = mockAttacker;
            component.defender = mockDefender;
            spyOn(component, 'isMyTurn').and.returnValue(false);
            component.attack();
            expect(combatServiceSpy.attack).not.toHaveBeenCalled();
        });
    });

    describe('dodge', () => {
        it('should call combatService.dodge if it is my turn and escape is not disabled', () => {
            spyOn(component, 'isMyTurn').and.returnValue(true);
            spyOn(component, 'isEscapeDisabled').and.returnValue(false);
            component.dodge();
            expect(combatServiceSpy.dodge).toHaveBeenCalled();
        });

        it('should not call combatService.dodge if it is not my turn', () => {
            spyOn(component, 'isMyTurn').and.returnValue(false);
            spyOn(component, 'isEscapeDisabled').and.returnValue(false);
            component.dodge();
            expect(combatServiceSpy.dodge).not.toHaveBeenCalled();
        });

        it('should not call combatService.dodge if escape is disabled', () => {
            spyOn(component, 'isMyTurn').and.returnValue(true);
            spyOn(component, 'isEscapeDisabled').and.returnValue(true);
            component.dodge();
            expect(combatServiceSpy.dodge).not.toHaveBeenCalled();
        });
    });

    describe('isEscapeDisabled', () => {
        it('should return true when escape attempts reach max', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS;
            expect(component.isEscapeDisabled()).toBe(true);
        });

        it('should set hasSentEscapeWarning when exactly 1 attempt remains', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 1;
            component.hasPlayerSentEscapeWarning = false;
            component.isEscapeDisabled();
            expect(component.hasPlayerSentEscapeWarning).toBe(true);
        });

        it('should return false when escape attempts are less than max', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 1;
            expect(component.isEscapeDisabled()).toBe(false);
        });

        it('should set hasSentEscapeWarning when exactly 1 attempt remains (double test)', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 1;
            component.hasPlayerSentEscapeWarning = false;
            spyOn(component, 'sendMessage');
            component.isEscapeDisabled();
            expect(component.hasPlayerSentEscapeWarning).toBe(true);
        });

        it('should not set hasSentEscapeWarning when more than 1 attempt remains', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 2;
            component.hasPlayerSentEscapeWarning = false;
            spyOn(component, 'sendMessage');
            component.isEscapeDisabled();
            expect(component.hasPlayerSentEscapeWarning).toBe(false);
            expect(component.sendMessage).not.toHaveBeenCalled();
        });

        it('should not send warning when hasSentEscapeWarning is already true', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 1;
            component.hasPlayerSentEscapeWarning = true;
            spyOn(component, 'sendMessage');
            component.isEscapeDisabled();
            expect(component.hasPlayerSentEscapeWarning).toBe(true);
            expect(component.sendMessage).not.toHaveBeenCalled();
        });

        it('should return false when escape attempts are less than max (duplicate)', () => {
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS - 1;
            expect(component.isEscapeDisabled()).toBe(false);
        });
    });

    describe('isMyTurn', () => {
        it('should return true when attacker name matches my player name', () => {
            component.attacker = mockAttacker;
            expect(component.isMyTurn()).toBe(true);
        });

        it('should return false when attacker name does not match my player name', () => {
            component.attacker = mockDefender;
            expect(component.isMyTurn()).toBe(false);
        });

        it('should return false when attacker is undefined', () => {
            component.attacker = undefined;
            expect(component.isMyTurn()).toBe(false);
        });
    });

    describe('ngDoCheck', () => {
        it('should update previousDefenderName when defender changes', () => {
            component.defender = mockDefender;
            component.previousDefender = null;
            component.ngDoCheck();
            expect(component.previousDefenderNameValue).toBe(mockDefender.name as any);
        });

        it('should not send message when escape attempts are at max but warning flag is already set', () => {
            component.defender = mockDefender;
            component.previousDefender = null;
            escapeAttemptsValue = MAX_ESCAPE_ATTEMPTS;
            component.hasPlayerSentEscapeWarning = true;
            spyOn(component, 'sendMessage');
            component.ngDoCheck();
            expect(component.previousDefenderNameValue).toBe(mockDefender.name as any);
        });

        it('should not update previousDefenderName when defender name has not changed', () => {
            component.defender = mockDefender;
            component.previousDefender = mockDefender.name;
            spyOn(component, 'sendMessage');
            component.ngDoCheck();
            expect(component.previousDefenderNameValue).toBe(mockDefender.name);
            expect(component.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('socket event handlers', () => {
        let socketSpy: any;
        let combatUpdateHandler: any;
        let combatRollsHandler: any;

        beforeEach(() => {
            socketSpy = jasmine.createSpyObj('Socket', ['on', 'emit', 'off']);
            socketSpy.on.and.callFake((event: string, callback: any) => {
                if (event === 'combatUpdate') {
                    combatUpdateHandler = callback;
                } else if (event === 'combatRolls') {
                    combatRollsHandler = callback;
                }
                return socketSpy;
            });

            const newCombatServiceSpy = jasmine.createSpyObj('CombatService', ['attack', 'dodge']);
            Object.defineProperties(newCombatServiceSpy, {
                socket: { get: () => socketSpy },
                attacker: { get: () => mockAttacker },
                defender: { get: () => mockDefender },
                escapeAttempts: { get: () => escapeAttemptsValue },
            });

            TestBed.resetTestingModule()
                .configureTestingModule({
                    imports: [PlayerCombatComponent],
                    providers: [
                        { provide: CombatService, useValue: newCombatServiceSpy },
                        { provide: PlayingService, useValue: playingServiceSpy },
                        { provide: MovingGameService, useValue: movingGameServiceSpy },
                        { provide: JoinGameService, useValue: joinGameServiceSpy },
                    ],
                })
                .compileComponents();

            fixture = TestBed.createComponent(PlayerCombatComponent);
            component = fixture.componentInstance;
            component.diceRolled = new EventEmitter();
        });

        it('should handle combatRolls event and emit dice rolls', () => {
            expect(combatRollsHandler).toBeDefined();
            spyOn(component.diceRolled, 'emit');
            combatRollsHandler({
                attackerBonus: 5,
                defenderBonus: 3,
            });
            expect(component.attackerDiceRollValue).toBe(5);
            expect(component.defenderDiceRollValue).toBe(3);
            expect(component.diceRolled.emit).toHaveBeenCalledWith({
                attackerRoll: 5,
                defenderRoll: 3,
            });
        });

        it('should handle combatUpdate event', () => {
            expect(combatUpdateHandler).toBeDefined();
            combatUpdateHandler({
                attacker: mockDefender,
                defender: mockAttacker,
            });
            expect(component.attacker).toEqual(mockDefender);
            expect(component.defender).toEqual(mockAttacker);
        });

        describe('ngAfterViewInit', () => {
            it('should subscribe to onRoomCreated and update internal state', () => {
                const roomCreatedSubject = new Subject<any>();
                joinGameServiceSpy.onRoomCreated.and.returnValue(roomCreatedSubject.asObservable());

                spyOn(component, 'sendMessage');
                spyOn(component, 'handleBotTurn');

                component.ngAfterViewInit();

                const mockData = { codeRoom: 'roomXYZ' };
                roomCreatedSubject.next(mockData);

                expect(component.roomCode).toBe('roomXYZ');
                expect(component.sendMessage).toHaveBeenCalledWith('Count to 5', 'Attacker');
                expect((component as any).hasSentEscapeWarning).toBeTrue();
                expect(component.handleBotTurn).toHaveBeenCalled();
            });
        });

        describe('ngOnDestroy', () => {
            it('should clear botActionTimer if it exists', () => {
                const clearTimeoutSpy = spyOn(window, 'clearTimeout');

                (component as any).botActionTimer = 1234;

                component.ngOnDestroy();

                expect(clearTimeoutSpy).toHaveBeenCalledWith(1234);
            });

            it('should not throw if botActionTimer is undefined', () => {
                const clearTimeoutSpy = spyOn(window, 'clearTimeout');

                (component as any).botActionTimer = undefined;

                expect(() => component.ngOnDestroy()).not.toThrow();
                expect(clearTimeoutSpy).not.toHaveBeenCalled();
            });

            it('should call destroy$.next() and destroy$.complete()', () => {
                const destroyNextSpy = spyOn((component as any).destroy$, 'next');
                const destroyCompleteSpy = spyOn((component as any).destroy$, 'complete');

                component.ngOnDestroy();

                expect(destroyNextSpy).toHaveBeenCalled();
                expect(destroyCompleteSpy).toHaveBeenCalled();
            });
        });

        describe('isBotAggressive', () => {
            it('should return true if bot is virtual and aggressive', () => {
                const bot: Player = {
                    ...mockAttacker,
                    isVirtualPlayer: true,
                    agressive: true,
                } as any;

                expect(component['isBotAggressive'](bot)).toBeTrue();
            });

            it('should return false if bot is undefined', () => {
                expect(component['isBotAggressive'](undefined)).toBeFalse();
            });

            it('should return false if bot is not virtual', () => {
                const bot: Player = {
                    ...mockAttacker,
                    isVirtualPlayer: false,
                    agressive: true,
                } as any;

                expect(component['isBotAggressive'](bot)).toBeFalse();
            });

            it('should return false if bot is not aggressive', () => {
                const bot: Player = {
                    ...mockAttacker,
                    isVirtualPlayer: true,
                    agressive: false,
                } as any;

                expect(component['isBotAggressive'](bot)).toBeFalse();
            });

            it('should return false if bot is neither virtual nor aggressive', () => {
                const bot: Player = {
                    ...mockAttacker,
                    isVirtualPlayer: false,
                    agressive: false,
                } as any;

                expect(component['isBotAggressive'](bot)).toBeFalse();
            });
        });

        describe('handleBotTurn', () => {
            it('should clear existing botActionTimer if defined', () => {
                const clearTimeoutSpy = spyOn(window, 'clearTimeout');

                (component as any).botActionTimer = 1234;

                spyOn(component as any, 'isBot').and.returnValue(false);
                component.attacker = mockAttacker;

                component.handleBotTurn();

                expect(clearTimeoutSpy).toHaveBeenCalledWith(1234);
            });

            it('should not call clearTimeout if botActionTimer is undefined', () => {
                const clearTimeoutSpy = spyOn(window, 'clearTimeout');

                (component as any).botActionTimer = undefined;

                spyOn(component as any, 'isBot').and.returnValue(false);
                component.attacker = mockAttacker;

                component.handleBotTurn();

                expect(clearTimeoutSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe('Bot detection methods', () => {
        it('should correctly identify a bot player', () => {
            const botPlayer: Player = {
                ...mockAttacker,
                isVirtualPlayer: true,
            };
            expect(component.isBot(botPlayer)).toBeTrue();
            expect(component.isBot(mockAttacker)).toBeFalse();
            expect(component.isBot(undefined)).toBeFalse();
        });

        it('should correctly identify an aggressive bot player', () => {
            const aggressiveBot: Player = {
                ...mockAttacker,
                isVirtualPlayer: true,
                agressive: true,
            };
            const passiveBot: Player = {
                ...mockAttacker,
                isVirtualPlayer: true,
                agressive: false,
            };
            expect(component.isBotAggressive(aggressiveBot)).toBeTrue();
            expect(component.isBotAggressive(passiveBot)).toBeFalse();
            expect(component.isBotAggressive(mockAttacker)).toBeFalse();
            expect(component.isBotAggressive(undefined)).toBeFalse();
        });
    });

    describe('ngAfterViewInit', () => {
        it('should set room code and send initial message', () => {
            spyOn(component, 'sendMessage');
            spyOn(component, 'handleBotTurn');

            const onRoomCreatedSubject = of({
                codeRoom: 'testRoom123',
                theFirstPlayer: mockAttacker,
                theSecondPlayer: mockDefender,
            });

            joinGameServiceSpy.onRoomCreated.and.returnValue(onRoomCreatedSubject);

            component.ngAfterViewInit();

            expect(component.roomCode).toBe('testRoom123');
            expect(component.sendMessage).toHaveBeenCalledWith('Count to 5', mockAttacker.name || '');
            expect(component.hasPlayerSentEscapeWarning).toBeTrue();
            expect(component.handleBotTurn).toHaveBeenCalled();
        });
    });

    describe('Bot turn handling', () => {
        beforeEach(() => {
            jasmine.clock().uninstall();
            jasmine.clock().install();

            combatServiceSpy.attack.calls.reset();
            combatServiceSpy.dodge.calls.reset();
            if (combatServiceSpy.updateDodgeCount) {
                combatServiceSpy.updateDodgeCount.calls.reset();
            }
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('should clear existing timer when handling bot turn', () => {
            spyOn(window, 'clearTimeout');

            const fakeTimer = setTimeout(() => {}, 1000) as any;
            (component as any).botActionTimer = fakeTimer;

            component.handleBotTurn();
            expect(clearTimeout).toHaveBeenCalledWith(fakeTimer);
        });

        it('should set timer when attacker is a bot', () => {
            const botPlayer: Player = {
                ...mockAttacker,
                isVirtualPlayer: true,
            };
            component.attacker = botPlayer;

            spyOn(component, 'executeBotAction');
            spyOn(component, 'isBot').and.returnValue(true);

            component.handleBotTurn();

            jasmine.clock().tick(1000);
            expect(component.executeBotAction).toHaveBeenCalled();
        });

        it('should not set timer when attacker is not a bot', () => {
            component.attacker = mockAttacker;

            spyOn(component, 'executeBotAction');
            spyOn(component, 'isBot').and.returnValue(false);

            component.handleBotTurn();

            jasmine.clock().tick(1000);
            expect(component.executeBotAction).not.toHaveBeenCalled();
        });

        it('should do nothing if attacker or defender is undefined', () => {
            component.attacker = undefined;
            component.defender = mockDefender;

            combatServiceSpy.attack.calls.reset();
            combatServiceSpy.dodge.calls.reset();

            component.executeBotAction();
            expect(combatServiceSpy.attack).not.toHaveBeenCalled();
            expect(combatServiceSpy.dodge).not.toHaveBeenCalled();

            component.attacker = mockAttacker;
            component.defender = undefined;
            component.executeBotAction();
            expect(combatServiceSpy.attack).not.toHaveBeenCalled();
            expect(combatServiceSpy.dodge).not.toHaveBeenCalled();
        });

        it('should attack when bot is aggressive', () => {
            const aggressiveBot: Player = {
                ...mockAttacker,
                name: 'AggressiveBot',
                isVirtualPlayer: true,
                agressive: true,
            };
            component.attacker = aggressiveBot;
            component.defender = mockDefender;

            spyOn(component, 'isBotAggressive').and.returnValue(true);
            combatServiceSpy.attack.calls.reset();

            component.executeBotAction();
            expect(combatServiceSpy.attack).toHaveBeenCalledWith(aggressiveBot, mockDefender);
        });

        it('should dodge when non-aggressive bot has received damage and escape is not disabled', () => {
            const passiveBot: Player = {
                ...mockAttacker,
                name: 'PassiveBot',
                isVirtualPlayer: true,
                agressive: false,
            };
            component.attacker = passiveBot;
            component.defender = mockDefender;

            spyOn(component, 'isBot').and.returnValue(true);
            spyOn(component, 'isBotAggressive').and.returnValue(false);
            spyOn(component, 'isEscapeDisabled').and.returnValue(false);

            (component as any).botReceivedDamage = { PassiveBot: true };

            combatServiceSpy.dodge.calls.reset();
            combatServiceSpy.updateDodgeCount.calls.reset();

            component.executeBotAction();

            expect(combatServiceSpy.dodge).toHaveBeenCalled();
            expect(combatServiceSpy.updateDodgeCount).toHaveBeenCalledWith('PassiveBot');
        });

        it('should attack when non-aggressive bot has not received damage', () => {
            const passiveBot: Player = {
                ...mockAttacker,
                name: 'PassiveBot',
                isVirtualPlayer: true,
                agressive: false,
            };
            component.attacker = passiveBot;
            component.defender = mockDefender;

            spyOn(component, 'isBot').and.returnValue(true);
            spyOn(component, 'isBotAggressive').and.returnValue(false);
            combatServiceSpy.attack.calls.reset();

            (component as any).botReceivedDamage = {};

            component.executeBotAction();

            expect(combatServiceSpy.attack).toHaveBeenCalledWith(passiveBot, mockDefender);
        });

        it('should attack when non-aggressive bot would dodge but escape is disabled', () => {
            const passiveBot: Player = {
                ...mockAttacker,
                name: 'PassiveBot',
                isVirtualPlayer: true,
                agressive: false,
            };
            component.attacker = passiveBot;
            component.defender = mockDefender;

            spyOn(component, 'isBot').and.returnValue(true);
            spyOn(component, 'isBotAggressive').and.returnValue(false);
            spyOn(component, 'isEscapeDisabled').and.returnValue(true);

            (component as any).botReceivedDamage = { PassiveBot: true };

            combatServiceSpy.attack.calls.reset();

            component.executeBotAction();

            expect(combatServiceSpy.attack).toHaveBeenCalledWith(passiveBot, mockDefender);
        });
    });

    describe('CombatRolls socket handler bot damage tracking', () => {
        it('should track damage received by bot defender', () => {
            const botDefender: Player = {
                ...mockDefender,
                name: 'BotDefender',
                isVirtualPlayer: true,
            };

            component.defender = botDefender;
            spyOn(component, 'isBot').and.returnValue(true);

            (component as any).botReceivedDamage = {};

            const socketOnSpy = component['combatService'].socket.on as jasmine.Spy;

            const handlers = socketOnSpy.calls
                .all()
                .filter((call) => call.args[0] === 'combatRolls')
                .map((call) => call.args[1]);

            if (handlers.length > 0) {
                const combatRollsHandler = handlers[0];

                combatRollsHandler({
                    attackerBonus: 6,
                    defenderBonus: 3,
                });

                expect((component as any).botReceivedDamage['BotDefender']).toBe(true);
            } else {
                fail('combatRolls handler not found');
            }
        });

        it('should not track damage when attacker loses', () => {
            const botDefender: Player = {
                ...mockDefender,
                name: 'BotDefender',
                isVirtualPlayer: true,
            };

            component.defender = botDefender;
            spyOn(component, 'isBot').and.returnValue(true);

            (component as any).botReceivedDamage = {};

            const socketOnSpy = component['combatService'].socket.on as jasmine.Spy;

            const handlers = socketOnSpy.calls
                .all()
                .filter((call) => call.args[0] === 'combatRolls')
                .map((call) => call.args[1]);

            if (handlers.length > 0) {
                const combatRollsHandler = handlers[0];

                combatRollsHandler({
                    attackerBonus: 3,
                    defenderBonus: 6,
                });

                expect((component as any).botReceivedDamage['BotDefender']).toBeUndefined();
            } else {
                fail('combatRolls handler not found');
            }
        });
    });

    describe('ngOnDestroy', () => {
        it('should clear timer and complete subject on destroy', () => {
            spyOn(window, 'clearTimeout');

            const fakeTimer = setTimeout(() => {}, 1000) as any;
            (component as any).botActionTimer = fakeTimer;

            const destroySpy = spyOn((component as any).destroy$, 'next');
            const completeSpyy = spyOn((component as any).destroy$, 'complete');

            component.ngOnDestroy();

            expect(clearTimeout).toHaveBeenCalledWith(fakeTimer);
            expect(destroySpy).toHaveBeenCalled();
            expect(completeSpyy).toHaveBeenCalled();
        });

        it('should not fail if timer is undefined', () => {
            (component as any).botActionTimer = undefined;

            spyOn((component as any).destroy$, 'next');
            spyOn((component as any).destroy$, 'complete');

            expect(() => component.ngOnDestroy()).not.toThrow();
        });
    });

    describe('Getter methods', () => {
        it('should return correct combat service value', () => {
            expect(component.combatServiceValue).toBe(combatServiceSpy);
        });

        it('should return correct playing service value', () => {
            expect(component.playingServiceValue).toBe(playingServiceSpy);
        });

        it('should return correct dice roll values', () => {
            (component as any).attackerDiceRoll = 5;
            (component as any).defenderDiceRoll = 3;

            expect(component.attackerDiceRollValue).toBe(5);
            expect(component.defenderDiceRollValue).toBe(3);
        });

        it('should return correct previousDefenderNameValue', () => {
            (component as any).previousDefenderName = 'TestName';
            expect(component.previousDefenderNameValue).toBe('TestName');
        });
    });
});
