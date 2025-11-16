/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable no-undef */
// Certains objets globaux sont utilisés sans import explicite pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ITEM_TYPES } from '@app/constants/constants';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels, TILE_TYPES } from '@common/constants';
import { Item, Player, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { ActionService } from './action.service';

describe('ActionService', () => {
    let service: ActionService;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let socketSpy: jasmine.SpyObj<Socket>;
    let gameLogServiceSpy: jasmine.SpyObj<GameLogService>;
    let mockCombatService: jasmine.SpyObj<CombatService>;

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit']);
        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', ['pinCode', 'socket']);
        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', [
            'getAccessibleTiles',
            'setReachableForTiles',
            'getPlayerTile',
            'getNeighbors',
            'isPopupItemChoiceVisible',
        ]);
        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['isPlayerTurn', 'localPlayer', 'playerTurn']);
        joinGameServiceSpy.pinCode = '1234';
        joinGameServiceSpy.socket = socketSpy;
        gameLogServiceSpy = jasmine.createSpyObj('GameLogService', ['sendDoorLog', 'myRoom']);
        gameLogServiceSpy.myRoom = '1234';
        mockCombatService = jasmine.createSpyObj('CombatService', ['updateIsInCombat']);

        TestBed.configureTestingModule({
            providers: [
                ActionService,
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: GameLogService, useValue: gameLogServiceSpy },
                { provide: CombatService, useValue: mockCombatService },
            ],
        });

        service = TestBed.inject(ActionService);
        (service as any).combatService = mockCombatService;
        (service as any).socket = socketSpy;
        (service as any).joinGameService = joinGameServiceSpy;
        (service as any).movingGameService = movingGameServiceSpy;
        (service as any).playingService = playingServiceSpy;
        (service as any).gameLogService = gameLogServiceSpy;

        jasmine.clock().install();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit toggleDoor event', () => {
        const mockTile: Tile = {
            position: { x: 0, y: 0 },
            type: 'A',
            cost: 1,
            traversable: true,
            item: null,
            player: null,
            image: '',
        };
        service.emitToggleDoor(mockTile);
        expect(socketSpy.emit).toHaveBeenCalledWith('toggleDoor', { roomCode: '1234', tile: mockTile });
    });

    it('should toggle canAction', () => {
        playingServiceSpy.isPlayerTurn.and.returnValue(true);
        service.canAction = 0;
        service.activateAction();
        expect(service.canAction).toBe(1);
        service.activateAction();
        expect(service.canAction).toBe(0);
    });

    it("should not toggle canAction when not player's turn", () => {
        playingServiceSpy.isPlayerTurn.and.returnValue(false);
        service.canAction = 0;
        service.activateAction();
        expect(service.canAction).toBe(0);
    });

    it('should set reachable tiles when actionPlayer is called', () => {
        const mockTiles: Tile[] = [{ position: { x: 0, y: 0 }, type: 'A', cost: 1, traversable: true, item: null, player: null, image: '' }];
        movingGameServiceSpy.getAccessibleTiles.and.returnValue(mockTiles);
        playingServiceSpy.isPlayerTurn.and.returnValue(true);
        service.actionPlayer();
        expect(movingGameServiceSpy.setReachableForTiles).toHaveBeenCalledWith(mockTiles);
    });

    it("should not set reachable tiles when not player's turn", () => {
        playingServiceSpy.isPlayerTurn.and.returnValue(false);
        service.actionPlayer();
        expect(movingGameServiceSpy.setReachableForTiles).not.toHaveBeenCalled();
    });

    it('should emit startFight event', () => {
        const mockPlayer: Player = {
            name: 'Player 1',
            victories: 0,
            avatarUrl: '1',
            life: 100,
            speed: 10,
            attack: '15',
            defense: '5',
            inventory: [],
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        } as Player;
        playingServiceSpy.localPlayer = { name: 'Player 2', victories: 0, avatarUrl: '2' } as Player;
        service.emitStartFight(mockPlayer);
        expect(socketSpy.emit).toHaveBeenCalledWith('startFight', { roomCode: '1234', players: [mockPlayer, playingServiceSpy.localPlayer] });
    });

    it('should not emit endTurn when conditions are not met', () => {
        movingGameServiceSpy.getAccessibleTiles.and.returnValue([
            { position: { x: 0, y: 0 }, type: 'A', cost: 1 } as Tile,
            { position: { x: 1, y: 1 }, type: 'B', cost: 2 } as Tile,
        ]);
        service.canAction = 2;
        spyOn(service, 'checkSurroundingTiles').and.returnValue(true);
        movingGameServiceSpy.isPopupItemChoiceVisible = false;
        service.checkEndTurn();
        expect(socketSpy.emit).not.toHaveBeenCalled();
    });

    it('should send log when door is closed', () => {
        const mockTile: Tile = {
            position: { x: 0, y: 0 },
            type: 'A',
            cost: 1,
            traversable: true,
            item: null,
            player: null,
            image: './assets/images/Porte.png',
        };
        const player: Player = {
            name: 'Player 1',
            victories: 0,
            avatarUrl: '',
            life: 100,
            speed: 10,
            attack: '10',
            defense: '5',
            inventory: [],
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        } as Player;
        playingServiceSpy.playerTurn = player;
        service.emitToggleDoor(mockTile);
        expect(gameLogServiceSpy.sendDoorLog).toHaveBeenCalledWith(gameLogServiceSpy.myRoom, player, false);
    });
    it('should send log when door is opened', () => {
        const mockTile: Tile = {
            position: { x: 0, y: 0 },
            type: 'A',
            cost: 1,
            traversable: true,
            item: null,
            player: null,
            image: './assets/images/Porte-ferme.png',
        };
        const player: Player = {
            name: 'Player 1',
            victories: 0,
            avatarUrl: '',
            life: 100,
            speed: 10,
            attack: '10',
            defense: '5',
            inventory: [],
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        } as Player;
        playingServiceSpy.playerTurn = player;
        service.emitToggleDoor(mockTile);
        expect(gameLogServiceSpy.sendDoorLog).toHaveBeenCalledWith(gameLogServiceSpy.myRoom, player, true);
    });

    describe('isBot', () => {
        it('should return true if the player is a bot', () => {
            const mockPlayer: Player = { isVirtualPlayer: true } as Player;
            expect(service.isBot(mockPlayer)).toBeTrue();
        });

        it('should return false if the player is not a bot', () => {
            const mockPlayer: Player = { isVirtualPlayer: false } as Player;
            expect(service.isBot(mockPlayer)).toBeFalse();
        });

        it('should return false if player is null or undefined', () => {
            expect(service.isBot(null as any)).toBeFalse();
            expect(service.isBot(undefined as any)).toBeFalse();
        });
    });

    describe('emitVirtualFight', () => {
        const mockPlayer1: Player = { name: 'Virtual1', isVirtualPlayer: true } as Player;
        const mockPlayer2: Player = { name: 'Virtual2', isVirtualPlayer: true } as Player;

        it('should emit startFight event with players in correct order and update combat status', () => {
            const expectedRoomCode = '1234';
            joinGameServiceSpy.pinCode = expectedRoomCode;

            service.emitVirtualFight(mockPlayer1, mockPlayer2);

            expect(socketSpy.emit).toHaveBeenCalledWith('startFight', {
                roomCode: expectedRoomCode,
                players: [mockPlayer2, mockPlayer1],
            });

            expect(mockCombatService.updateIsInCombat).toHaveBeenCalledWith(mockPlayer1.name, mockPlayer2.name);
        });

        it('should use the correct pinCode from joinGameService', () => {
            const differentPinCode = '9876';
            joinGameServiceSpy.pinCode = differentPinCode;

            service.emitVirtualFight(mockPlayer1, mockPlayer2);

            expect(socketSpy.emit).toHaveBeenCalledWith(
                'startFight',
                jasmine.objectContaining({
                    roomCode: differentPinCode,
                }),
            );
            expect(mockCombatService.updateIsInCombat).toHaveBeenCalledWith(mockPlayer1.name, mockPlayer2.name);
        });
    });

    describe('checkEndTurn', () => {
        beforeEach(() => {
            movingGameServiceSpy.isPopupItemChoiceVisible = false;
            spyOn(service, 'checkSurroundingTiles').and.returnValue(true);
        });

        it('should emit endTurn when stuck on 1 tile with full actions (canAction = 2)', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
            service.canAction = 2;
            movingGameServiceSpy.isPopupItemChoiceVisible = false;

            service.checkEndTurn();

            expect(socketSpy.emit).toHaveBeenCalledWith('endTurn', { roomCode: '1234' });
        });

        it('should emit endTurn when stuck on 1 tile with no actions (canAction = 0) and nothing to interact with', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
            service.canAction = 0;
            (service.checkSurroundingTiles as jasmine.Spy).and.returnValue(false);
            movingGameServiceSpy.isPopupItemChoiceVisible = false;

            service.checkEndTurn();

            expect(socketSpy.emit).toHaveBeenCalledWith('endTurn', { roomCode: '1234' });
        });

        it('should NOT emit endTurn when player can move (more than 1 tile)', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{}, {}] as Tile[]);
            service.canAction = 2;

            service.checkEndTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });

        it('should NOT emit endTurn when stuck on 1 tile but has actions left (canAction = 1)', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
            service.canAction = 1;

            service.checkEndTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });

        it('should NOT emit endTurn when stuck on 1 tile with no actions but CAN interact', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
            service.canAction = 0;
            (service.checkSurroundingTiles as jasmine.Spy).and.returnValue(true);

            service.checkEndTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });

        it('should NOT emit endTurn when item choice popup is visible', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 0, y: 0 } } as Tile]);
            service.canAction = 2;
            movingGameServiceSpy.isPopupItemChoiceVisible = true;

            service.checkEndTurn();

            expect(socketSpy.emit).not.toHaveBeenCalled();
        });
    });

    describe('checkSurroundingTiles', () => {
        it('should return true if a neighbor has a player', () => {
            const mockPlayerTile: Tile = { position: { x: 0, y: 0 } } as Tile;
            const mockNeighbors: Tile[] = [{ position: { x: 1, y: 0 }, player: { name: 'Neighbor' } as Player } as Tile];
            movingGameServiceSpy.getPlayerTile.and.returnValue(mockPlayerTile);
            movingGameServiceSpy.getNeighbors.and.returnValue(mockNeighbors);
            playingServiceSpy.localPlayer = { name: 'Me' } as Player;
            expect(service.checkSurroundingTiles()).toBeTrue();
        });

        it('should return true if a neighbor is a door', () => {
            const mockPlayerTile: Tile = { position: { x: 0, y: 0 } } as Tile;
            const mockNeighbors: Tile[] = [{ position: { x: 0, y: 1 }, image: './assets/images/Porte.png' } as Tile];
            movingGameServiceSpy.getPlayerTile.and.returnValue(mockPlayerTile);
            movingGameServiceSpy.getNeighbors.and.returnValue(mockNeighbors);
            playingServiceSpy.localPlayer = { name: 'Me' } as Player;
            expect(service.checkSurroundingTiles()).toBeTrue();
        });

        it('should return true if a neighbor has a player AND a spawn item', () => {
            const mockPlayerTile: Tile = { position: { x: 0, y: 0 } } as Tile;
            const mockNeighbors: Tile[] = [
                {
                    position: { x: 1, y: 0 },
                    player: { name: 'Neighbor' } as Player,
                    item: { name: ITEM_TYPES.spawn } as Item,
                    type: TILE_TYPES.empty,
                    cost: 1,
                    image: '',
                    traversable: true,
                } as Tile,
            ];
            movingGameServiceSpy.getPlayerTile.and.returnValue(mockPlayerTile);
            movingGameServiceSpy.getNeighbors.and.returnValue(mockNeighbors);
            playingServiceSpy.localPlayer = { name: 'Me' } as Player;
            expect(service.checkSurroundingTiles()).toBeTrue();
        });

        it('should return false if neighbors have no players/doors or only spawn items', () => {
            const mockPlayerTile: Tile = { position: { x: 0, y: 0 } } as Tile;
            const mockNeighbors: Tile[] = [
                { position: { x: 1, y: 0 }, item: { name: ITEM_TYPES.spawn } as Item } as Tile,
                { position: { x: 0, y: 1 }, type: 'empty' } as Tile,
            ];
            movingGameServiceSpy.getPlayerTile.and.returnValue(mockPlayerTile);
            movingGameServiceSpy.getNeighbors.and.returnValue(mockNeighbors);
            playingServiceSpy.localPlayer = { name: 'Me' } as Player;
            expect(service.checkSurroundingTiles()).toBeFalse();
        });

        it('should return false if playerTile is not found', () => {
            movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
            playingServiceSpy.localPlayer = { name: 'Me' } as Player;
            expect(service.checkSurroundingTiles()).toBeFalse();
        });
    });

    describe('autoBotTurn', () => {
        let tryBotAttackSpy: jasmine.Spy;
        let tryBotToggleDoorSpy: jasmine.Spy;
        const botPlayerAggressive: Player = { name: 'AggroBot', isVirtualPlayer: true, agressive: true } as Player;
        const botPlayerDefensive: Player = { name: 'DefBot', isVirtualPlayer: true, agressive: false } as Player;

        beforeEach(() => {
            tryBotAttackSpy = spyOn(service as any, 'tryBotAttackNearbyPlayer').and.returnValue(false);
            tryBotToggleDoorSpy = spyOn(service as any, 'tryBotToggleNearbyDoor').and.returnValue(false);
            service.canAction = 1;
        });

        it('should log start and set canAction to 1', () => {
            service.autoBotTurn(botPlayerAggressive);
            expect(service.canAction).toBe(1);
        });

        it('should call tryBotAttackNearbyPlayer first for aggressive bot', fakeAsync(() => {
            service.autoBotTurn(botPlayerAggressive);
            tick(800);
            expect(tryBotAttackSpy).toHaveBeenCalledWith(botPlayerAggressive);
            discardPeriodicTasks();
        }));

        it('should call tryBotToggleNearbyDoor if aggressive bot attack fails', fakeAsync(() => {
            tryBotAttackSpy.and.returnValue(false);
            service.autoBotTurn(botPlayerAggressive);
            tick(800);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledWith(botPlayerAggressive);
            discardPeriodicTasks();
        }));

        it('should call tryBotAttackNearbyPlayer last for defensive bot if door toggle fails', fakeAsync(() => {
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.and.returnValue(false);
            service.autoBotTurn(botPlayerDefensive);
            tick(800);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);
            discardPeriodicTasks();
        }));

        it('should execute again if aggressive attack succeeds and canAction > 0', fakeAsync(() => {
            tryBotAttackSpy.and.returnValue(true);
            service.canAction = 2;

            service.autoBotTurn(botPlayerAggressive);
            tick(800);

            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);

            service.canAction = 1;
            expect(service.canAction).toBe(1);

            tryBotAttackSpy.calls.reset();
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.calls.reset();
            tryBotToggleDoorSpy.and.returnValue(false);

            tick(1500);

            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);

            discardPeriodicTasks();
        }));

        it('should execute again if toggle door succeeds and canAction > 0', fakeAsync(() => {
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.and.returnValue(true);
            service.canAction = 2;

            service.autoBotTurn(botPlayerAggressive);
            tick(800);

            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);

            service.canAction = 1;
            expect(service.canAction).toBe(1);

            tryBotAttackSpy.calls.reset();
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.calls.reset();
            tryBotToggleDoorSpy.and.returnValue(false);

            tick(5000);

            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);

            discardPeriodicTasks();
        }));

        it('should execute defensive attack if door toggle fails and attack succeeds', fakeAsync(() => {
            tryBotToggleDoorSpy.and.returnValue(false);
            let attackCallCount = 0;
            tryBotAttackSpy.and.callFake(() => {
                attackCallCount++;
                return attackCallCount === 1;
            });
            service.canAction = 1;
            service.autoBotTurn(botPlayerDefensive);
            tick(800);

            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);

            service.canAction = 0;
            expect(service.canAction).toBe(0);

            tryBotAttackSpy.calls.reset();
            tryBotToggleDoorSpy.calls.reset();

            tick(1500);

            expect(tryBotAttackSpy).not.toHaveBeenCalled();
            expect(tryBotToggleDoorSpy).not.toHaveBeenCalled();

            discardPeriodicTasks();
        }));

        it('should execute again if defensive attack succeeds and canAction > 0', fakeAsync(() => {
            tryBotToggleDoorSpy.and.returnValue(false);
            let attackCallCount = 0;
            tryBotAttackSpy.and.callFake(() => {
                attackCallCount++;
                return attackCallCount === 1;
            });
            service.canAction = 2;

            service.autoBotTurn(botPlayerDefensive);
            tick(800);

            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);

            service.canAction = 1;
            expect(service.canAction).toBe(1);

            tryBotAttackSpy.calls.reset();
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.calls.reset();
            tryBotToggleDoorSpy.and.returnValue(false);

            tick(1500);

            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);

            discardPeriodicTasks();
        }));

        it('should log "No action possible" if all attempts fail', fakeAsync(() => {
            tryBotAttackSpy.and.returnValue(false);
            tryBotToggleDoorSpy.and.returnValue(false);
            service.autoBotTurn(botPlayerAggressive);
            tick(800);
            expect(tryBotAttackSpy).toHaveBeenCalledTimes(1);
            expect(tryBotToggleDoorSpy).toHaveBeenCalledTimes(1);
            discardPeriodicTasks();
        }));
    });

    describe('tryBotAttackNearbyPlayer', () => {
        const botPlayer: Player = { name: 'TestBot', isVirtualPlayer: true } as Player;
        const targetPlayer: Player = { name: 'Target', isVirtualPlayer: false } as Player;
        let botTile: Tile;
        let targetTile: Tile;
        let emptyNeighborTile: Tile;

        beforeEach(() => {
            service.canAction = 1;
            botTile = { position: { x: 1, y: 1 }, player: botPlayer, type: 'empty', cost: 1, image: '', item: null, traversable: true };
            targetTile = { position: { x: 1, y: 2 }, player: targetPlayer, type: 'empty', cost: 1, image: '', item: null, traversable: true };
            emptyNeighborTile = { position: { x: 0, y: 1 }, player: null, type: 'empty', cost: 1, image: '', item: null, traversable: true };

            movingGameServiceSpy.getPlayerTile.and.returnValue(botTile);
            movingGameServiceSpy.getNeighbors.and.returnValue([]);
        });

        it('should return false if bot tile not found', () => {
            movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
            expect(service.tryBotAttackNearbyPlayer(botPlayer)).toBeFalse();
            expect(movingGameServiceSpy.getNeighbors).not.toHaveBeenCalled();
            expect(service.canAction).toBe(1);
        });

        it('should return false if no neighbors found', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([]);
            expect(service.tryBotAttackNearbyPlayer(botPlayer)).toBeFalse();
            expect(service.canAction).toBe(1);
        });

        it('should return false if neighbors have no players or only self', () => {
            const selfTile = { ...botTile, position: { x: 2, y: 1 } };
            movingGameServiceSpy.getNeighbors.and.returnValue([emptyNeighborTile, selfTile]);
            expect(service.tryBotAttackNearbyPlayer(botPlayer)).toBeFalse();
            expect(service.canAction).toBe(1);
        });

        it('should return true, emit events, and decrement canAction if target found', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([emptyNeighborTile, targetTile]);
            const result = service.tryBotAttackNearbyPlayer(botPlayer);

            expect(result).toBeTrue();
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.CreateAndJoinGameRoom, {
                firstPlayer: botPlayer,
                secondPlayer: targetPlayer,
            });
            expect(socketSpy.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.StartFight, {
                roomCode: '1234',
                players: [botPlayer, targetPlayer],
            });
            expect(service.canAction).toBe(0);
        });
    });

    describe('tryBotToggleNearbyDoor', () => {
        const botPlayer: Player = { name: 'TestBot', isVirtualPlayer: true } as Player;
        let botTile: Tile;
        let doorTileOpen: Tile;
        let doorTileClosed: Tile;
        let emptyNeighborTile: Tile;

        beforeEach(() => {
            service.canAction = 1;
            botTile = { position: { x: 1, y: 1 }, player: botPlayer, type: 'empty', cost: 1, image: '', item: null, traversable: true };
            doorTileOpen = {
                position: { x: 1, y: 2 },
                image: './assets/images/Porte.png',
                type: TILE_TYPES.door,
                cost: null,
                item: null,
                player: null,
                traversable: false,
            };
            doorTileClosed = {
                position: { x: 0, y: 1 },
                image: './assets/images/Porte-ferme.png',
                type: TILE_TYPES.door,
                cost: null,
                item: null,
                player: null,
                traversable: true,
            };
            emptyNeighborTile = { position: { x: 2, y: 1 }, player: null, type: 'empty', cost: 1, image: '', item: null, traversable: true };

            movingGameServiceSpy.getPlayerTile.and.returnValue(botTile);
            movingGameServiceSpy.getNeighbors.and.returnValue([]);
            spyOn(service, 'emitToggleDoor').and.callThrough();
        });

        it('should return false and log if bot tile not found', () => {
            movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
            expect(service.tryBotToggleNearbyDoor(botPlayer)).toBeFalse();
            expect(movingGameServiceSpy.getNeighbors).not.toHaveBeenCalled();
            expect(service.canAction).toBe(1);
        });

        it('should return false and log if no neighbors found', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([]);
            expect(service.tryBotToggleNearbyDoor(botPlayer)).toBeFalse();
            expect(service.canAction).toBe(1);
        });

        it('should return false and log if no doors found among neighbors', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([emptyNeighborTile]);
            expect(service.tryBotToggleNearbyDoor(botPlayer)).toBeFalse();
            expect(service.canAction).toBe(1);
        });

        it('should return true, call emitToggleDoor, and decrement canAction if open door found', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([emptyNeighborTile, doorTileOpen]);
            const result = service.tryBotToggleNearbyDoor(botPlayer);

            expect(result).toBeTrue();
            expect(service.emitToggleDoor).toHaveBeenCalledWith(doorTileOpen);
            expect(service.canAction).toBe(0);
        });

        it('should return true, call emitToggleDoor, and decrement canAction if closed door found', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([doorTileClosed, emptyNeighborTile]);
            const result = service.tryBotToggleNearbyDoor(botPlayer);

            expect(result).toBeTrue();
            expect(service.emitToggleDoor).toHaveBeenCalledWith(doorTileClosed);
            expect(service.canAction).toBe(0);
        });
    });
});
