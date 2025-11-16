/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-empty-function */
// fonctions vides sont souvent utilisées dans les tests pour simuler des comportements
/* eslint-disable max-lines */
// les tests couvrent de nombreux cas d'utilisation et scénarios
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques ne nécessitent pas d'être extraits en constantes, car ils sont utilisés
/* eslint-disable no-undef */
// éviter les erreurs liées à des variables ou des types qui ne sont pas explicitement définis dans le fichier
import { ITEM_TYPES } from '@app/constants/constants';
import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { CombatService } from '@app/services/combat-service/combat.service';
import { GameRoomService } from '@app/services/game-room-service/game-room.service';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { TimeService } from '@app/services/time-service/time.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Game, GameData, GlobalStatistics, Item, Player, PlayerMovementParams, Position, Tile } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { PlayerMovementService } from './player-movement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let serverMock: jest.Mocked<Server>;
    let timeServiceMock: jest.Mocked<TimeService>;
    let turnServiceMock: jest.Mocked<TurnService>;
    let gameRoomGatewayMock: Partial<GameRoomGateway>;
    let gameRoomServiceMock: jest.Mocked<GameRoomService>;
    let gameLogGatewayMock: Partial<GameLogGateway>;
    let combatServiceMock: jest.Mocked<CombatService>;
    let playingManagerServiceMock: jest.Mocked<PlayingManagerService>;

    const dummyItems: Item[] = [
        {
            name: 'item1',
            position: undefined,
            image: '',
            id: 0,
            type: '',
            description: '',
            isOutOfContainer: false,
        },
        {
            name: 'item2',
            position: undefined,
            image: '',
            id: 0,
            type: '',
            description: '',
            isOutOfContainer: false,
        },
    ];
    const NUMBER_OF_ITEMS_TO_SELECT = 2;

    beforeEach(async () => {
        timeServiceMock = {
            startTimer: jest.fn(),
            stopTimer: jest.fn(),
        } as any as jest.Mocked<TimeService>;

        turnServiceMock = {
            endTurn: jest.fn(),
        } as any as jest.Mocked<TurnService>;

        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {},
            socketsLeave: jest.fn(),
        } as any as jest.Mocked<Server>;

        combatServiceMock = {
            startFight: jest.fn(),
            combatUpdate: jest.fn(),
            combatEscaped: jest.fn(),
            combatEnded: jest.fn(),
        } as any as jest.Mocked<CombatService>;

        playingManagerServiceMock = {
            getGame: jest.fn(),
            getPlayers: jest.fn(),
            setPlayers: jest.fn(),
            getCurrentPlayer: jest.fn(),
            setCurrentPlayer: jest.fn(),
            isRoomFull: jest.fn(),
            isRoomEmpty: jest.fn(),
            isPlayerInRoom: jest.fn(),
            addPlayer: jest.fn(),
            removePlayer: jest.fn(),
            updateGame: jest.fn(),
            updatePlayers: jest.fn(),
            resetRoom: jest.fn(),
            gamesPlayers: new Map<string, Player[]>(),
            gamesPlayerTurn: new Map<string, Player>(),
            endGameCtf: jest.fn(),
        } as any as jest.Mocked<PlayingManagerService>;

        gameRoomGatewayMock = {
            games: new Map([
                [
                    'room1',
                    {
                        isLocked: false,
                        pin: '1234',
                        players: [{ name: 'player1' }, { name: 'player2' }] as Player[],
                        size: 'large',
                        updateMap: [],
                        game: { gameMode: 'CTF' } as Game,
                        roomCode: 'room1',
                        player: { name: 'player1' } as Player,
                        map: [],
                        playerPositions: { player1: ['x', 'y'] },
                        pourcentagePlayerScareModeved: { player1: 50 },
                        tile: { position: { x: 0, y: 0 } } as Tile,
                        glocalStatistics: {
                            allTime: 0,
                            secondTime: 0,
                            percentageOfTile: 50,
                            percentageOfDors: 60,
                            nbrPlayerOpenDoor: 5,
                            allDoors: [],
                            nbOfTakenFleg: 3,
                        } as GlobalStatistics,
                    },
                ],
            ]),
            handlePathToMove: jest.fn(),
        };

        gameRoomServiceMock = {
            games: new Map<string, GameData>(),
            getPlayer: jest.fn().mockReturnValue({ name: 'player1', inventory: [], stats: { nbItem: 0 } }),
            createRoom: jest.fn(),
            createCombatRoomService: jest.fn(),
            createSelectPlayerRoom: jest.fn(),
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            deleteRoom: jest.fn(),
            getRoomSize: jest.fn(),
            getGame: jest.fn(),
            getPlayers: jest.fn(),
            setPlayers: jest.fn(),
            getCurrentPlayer: jest.fn(),
            setCurrentPlayer: jest.fn(),
            isRoomFull: jest.fn(),
            isRoomEmpty: jest.fn(),
            isPlayerInRoom: jest.fn(),
            addPlayer: jest.fn(),
            removePlayer: jest.fn(),
            updateGame: jest.fn(),
            updatePlayers: jest.fn(),
            resetRoom: jest.fn(),
            getAllRooms: jest.fn(),
            getRoomCodes: jest.fn(),
        } as any as jest.Mocked<GameRoomService>;

        gameLogGatewayMock = {
            handleSendGameLog: jest.fn(),
            handleJoinRoom: jest.fn(),
            handleGetGameLogs: jest.fn(),
            handleNewGame: jest.fn(),
            handleConnection: jest.fn(),
            handleDisconnect: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerMovementService,
                { provide: TimeService, useValue: timeServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: PlayingManagerService, useValue: playingManagerServiceMock },
                { provide: TurnService, useValue: turnServiceMock },
                { provide: GameRoomGateway, useValue: gameRoomGatewayMock },
                { provide: GameRoomService, useValue: gameRoomServiceMock },
                { provide: GameLogGateway, useValue: gameLogGatewayMock },
                {
                    provide: 'SocketServer',
                    useValue: serverMock,
                },
            ],
        }).compile();

        service = module.get<PlayerMovementService>(PlayerMovementService);
        (service as any).gameLogGateway = gameLogGatewayMock;

        (service as any).ITEMS = dummyItems;
        (service as any).NUMBER_OF_ITEMS_TO_SELECT = NUMBER_OF_ITEMS_TO_SELECT;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return the gameLogGateway', () => {
        const gameLogGateWay = service._gameLogGateway;
        expect(gameLogGateWay).toBeDefined();
        expect(gameLogGateWay).toEqual(gameLogGatewayMock);
    });

    describe('animatePlayerMove', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            playingManagerServiceMock.gamesPlayerTurn.set('room1', { name: 'player1' } as Player);
            playingManagerServiceMock.gamesPlayers.set('room1', [{ name: 'player1' } as Player, { name: 'player2' } as Player]);

            jest.spyOn(service as any, 'setPlayerToNull').mockImplementation(() => {});
            jest.spyOn(service as any, 'setPlayerToNewTile').mockImplementation(() => {});
            jest.spyOn(service as any, 'emitMovePlayer').mockImplementation(() => {});
            jest.spyOn(service as any, 'endAnimation').mockImplementation(() => {});
            jest.spyOn(service as any, 'addItemInventory').mockImplementation(() => {});
            jest.spyOn(service as any, 'countTilesLeft').mockImplementation(() => 0);
        });

        it('should not call addItemInventory when tile has a spawn item', () => {
            jest.spyOn(service as any, 'manageItemPickupBot').mockImplementation(() => {
                return false;
            });

            const path: Tile[] = [
                { position: { x: 0, y: 0 } } as Tile,
                { position: { x: 1, y: 0 }, item: { name: 'potion1' } } as Tile,
                { position: { x: 2, y: 0 } } as Tile,
            ];
            const player = { name: 'player1', inventory: [] } as Player;

            service.animatePlayerMove(serverMock, 'room1', path, player, {} as Game);
            jest.advanceTimersByTime(150 * 2);

            expect((service as any).addItemInventory).toHaveBeenCalled();
        });

        it('should not call addItemInventory when tile has a spawn item', () => {
            jest.spyOn(service as any, 'manageItemPickupBot').mockImplementation(() => {
                return false;
            });
            const path: Tile[] = [
                { position: { x: 0, y: 0 } } as Tile,
                { position: { x: 1, y: 0 }, item: { name: ITEM_TYPES.spawn } } as Tile,
                { position: { x: 2, y: 0 } } as Tile,
            ];
            const player = { name: 'player1', inventory: [] } as Player;

            service.animatePlayerMove(serverMock, 'room1', path, player, {} as Game);
            jest.advanceTimersByTime(150 * 2);

            expect((service as any).addItemInventory).not.toHaveBeenCalled();
        });

        it('should not emit animatePlayerMove event when game does not exist', () => {
            jest.spyOn(service as any, 'manageItemPickupBot').mockImplementation(() => {
                return false;
            });
            const roomCode = 'nonexistentRoom';
            const path: Tile[] = [{ position: { x: 0, y: 0 } } as Tile];
            const player = { name: 'player1' } as Player;

            serverMock.to.mockClear();
            serverMock.emit.mockClear();

            service.animatePlayerMove(serverMock, roomCode, path, player, {} as Game);
            jest.advanceTimersByTime(150);

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(serverMock.emit).not.toHaveBeenCalled();
        });
    });

    describe('Socket events emission', () => {
        describe('toggleDoor', () => {
            it('should emit toggleDoor event', () => {
                const roomCode = 'room123';
                const tile = {
                    position: { x: 0, y: 0 },
                    type: 'door',
                    traversable: false,
                    item: null,
                    player: null,
                    image: 'door.png',
                    cost: 0,
                } as Tile;

                service.toggleDoor(serverMock, roomCode, tile);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('toggleDoor', tile);
            });
        });

        describe('playerMoved', () => {
            it('should emit playerMoved event', () => {
                const roomCode = 'room123';
                const loser = { name: 'player1' } as Player;
                const nextPosition = { x: 2, y: 3 } as Position;

                service.playerMoved(serverMock, roomCode, loser, nextPosition);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('playerMoved', { loser, nextPosition });
            });
        });

        describe('choseItem', () => {
            it('should emit itemChoice event with provided data', () => {
                const data = {
                    item: { name: 'sword' } as Item,
                    playerPosition: { x: 1, y: 2 } as Position,
                    roomCode: 'ROOM1',
                };

                service.choseItem(serverMock, data);

                expect(serverMock.to).toHaveBeenCalledWith('ROOM1');
                expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.ItemChoice, data);
            });
        });

        describe('notifyInventoryUpdate', () => {
            it('should emit inventoryUpdate event with player inventory', () => {
                const roomCode = 'room123';
                const player = {
                    name: 'player1',
                    inventory: [{ name: 'sword' } as Item],
                } as Player;

                playingManagerServiceMock.gamesPlayers.set(roomCode, [{ ...player }, { name: 'player2', inventory: [] } as Player]);

                service.notifyInventoryUpdate(serverMock, roomCode, player);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('inventoryUpdate', {
                    playerName: player.name,
                    inventory: player.inventory,
                });
            });

            it('should update the player in gamesPlayers with the new inventory', () => {
                const roomCode = 'room123';
                const player = {
                    name: 'player1',
                    inventory: [{ name: 'sword' } as Item],
                } as Player;

                const originalPlayers = [{ name: 'player1', inventory: [] } as Player, { name: 'player2', inventory: [] } as Player];

                playingManagerServiceMock.gamesPlayers.set(roomCode, [...originalPlayers]);

                service.notifyInventoryUpdate(serverMock, roomCode, player);

                const updatedPlayersList = playingManagerServiceMock.gamesPlayers.get(roomCode);
                const updatedPlayer = updatedPlayersList.find((p) => p.name === player.name);

                expect(updatedPlayer.inventory).toEqual(player.inventory);
            });
        });
    });

    describe('Private methods', () => {
        describe('addItemInventory', () => {
            beforeEach(() => {
                gameRoomGatewayMock.games.set('room123', {
                    glocalStatistics: { nbOfTakenFleg: 0 },
                } as any);
            });

            it('should initialize itemsUsed array if it does not exist', () => {
                const player = {
                    name: 'player1',
                    inventory: [],
                } as Player;

                const currentPlayer = {
                    name: 'player1',
                    stats: { nbItem: 0 },
                    itemsUsed: undefined,
                } as Player;

                const currentTile = {
                    position: { x: 1, y: 1 },
                    item: { name: 'potion' } as Item,
                } as Tile;

                (gameRoomServiceMock.games as any).get = jest.fn().mockReturnValue({
                    players: [],
                });

                gameRoomServiceMock.getPlayer.mockReturnValue(currentPlayer);

                (service as any).addItemInventory(currentTile, player, 'room123', serverMock);

                expect(currentPlayer.itemsUsed).toBeDefined();
                expect(currentPlayer.itemsUsed).toContainEqual({ name: 'potion' });
            });

            it('should add item to player inventory', () => {
                const player = {
                    name: 'player1',
                    inventory: [],
                } as Player;

                const currentPlayer = {
                    name: 'player1',
                    stats: { nbItem: 0 },
                    itemsUsed: [],
                } as Player;

                const currentTile = {
                    position: { x: 1, y: 1 },
                    item: { name: 'sword', description: 'sharp', image: 'sword.png' } as Item,
                } as Tile;

                (gameRoomServiceMock.games as any).get = jest.fn().mockReturnValue({
                    players: [],
                });

                gameRoomServiceMock.getPlayer.mockReturnValue(currentPlayer);

                playingManagerServiceMock.gamesPlayers.set('room123', [{ ...player }]);

                (service as any).addItemInventory(currentTile, player, 'room123', serverMock);

                expect(player.inventory).toContain(currentTile.item);
                expect(gameLogGatewayMock.handleSendGameLog).toHaveBeenCalledWith(null, {
                    type: 'item',
                    event: "player1 a ramassé l'objet sword",
                    players: [player],
                    room: 'room123',
                });
            });

            it('should handle flag pickup specially', () => {
                const player = {
                    name: 'player1',
                    inventory: [],
                } as Player;

                const currentPlayer = {
                    name: 'player1',
                    stats: { nbItem: 0 },
                    itemsUsed: [],
                } as Player;

                const currentTile = {
                    position: { x: 1, y: 1 },
                    item: { name: 'chestbox-2', description: 'flag', image: 'flag.png' } as Item,
                } as Tile;

                (gameRoomServiceMock.games as any).get = jest.fn().mockReturnValue({
                    players: [],
                });

                gameRoomServiceMock.getPlayer.mockReturnValue(currentPlayer);

                playingManagerServiceMock.gamesPlayers.set('room123', [{ ...player }]);

                (service as any).addItemInventory(currentTile, player, 'room123', serverMock);

                expect(gameLogGatewayMock.handleSendGameLog).toHaveBeenCalledWith(null, {
                    type: 'item',
                    event: 'player1 a capturé le drapeau ',
                    players: [player],
                    room: 'room123',
                });
            });

            it('should count the number of players with flags', () => {
                const player = {
                    name: 'player1',
                    inventory: [],
                } as Player;

                const currentPlayer = {
                    name: 'player1',
                    stats: { nbItem: 0 },
                    itemsUsed: [],
                } as Player;

                const currentTile = {
                    position: { x: 1, y: 1 },
                    item: { name: 'sword' } as Item,
                } as Tile;

                const mockPlayers = [
                    {
                        name: 'player1',
                        itemsUsed: [{ name: 'potion' }],
                    },
                    {
                        name: 'player2',
                        itemsUsed: [{ name: 'chestbox-2' }],
                    },
                    {
                        name: 'player3',
                        itemsUsed: [{ name: 'chestbox-2' }],
                    },
                    {
                        name: 'player4',
                        itemsUsed: undefined,
                    },
                ];

                (gameRoomServiceMock.games as any).get = jest.fn().mockReturnValue({
                    players: mockPlayers,
                });

                gameRoomServiceMock.getPlayer.mockReturnValue(currentPlayer);

                (service as any).addItemInventory(currentTile, player, 'room123', serverMock);

                expect(gameRoomGatewayMock.games.get('room123').glocalStatistics.nbOfTakenFleg).toBe(2);
            });
        });

        describe('endAnimation', () => {
            it('should clear interval, sync coordinates and emit event', () => {
                const clearSpy = jest.spyOn(global, 'clearInterval');

                const player = { name: 'P1', coordinate: { x: 0, y: 0 } } as Player;
                const updatedCoord = { x: 3, y: 3 };

                playingManagerServiceMock.gamesPlayerTurn.set('ROOM1', { name: 'P1', coordinate: updatedCoord } as Player);
                playingManagerServiceMock.gamesPlayers.set('ROOM1', [{ ...player, coordinate: { x: 0, y: 0 } }]);

                const interval = setInterval(jest.fn(), 1000);
                (service as any).endAnimation(interval, player, serverMock, 'ROOM1', 2);

                expect(clearSpy).toHaveBeenCalledWith(interval);
                expect(player.coordinate).toEqual(updatedCoord);
                expect(serverMock.to).toHaveBeenCalledWith('ROOM1');
                expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndAnimation, {
                    player,
                    countNumberOfTilesLeft: 2,
                });

                const foundPlayer = playingManagerServiceMock.gamesPlayers.get('ROOM1')[0];
                expect(foundPlayer.coordinate).toEqual(updatedCoord);
            });
        });

        describe('setPlayerToNewTile', () => {
            it('should set player on the tile and update coordinates', () => {
                const player = { name: 'P1' } as Player;
                const tile = { position: { x: 1, y: 2 } } as Tile;

                const handlePathToMoveSpy = jest.spyOn(gameRoomGatewayMock, 'handlePathToMove');

                (service as any).setPlayerToNewTile(player, tile, 'ROOM1');

                expect(tile.player).toEqual(player);
                expect(player.coordinate).toEqual({ x: 1, y: 2 });
                expect(handlePathToMoveSpy).toHaveBeenCalledWith(player, 'ROOM1');
            });
        });

        describe('updatePlayerInventory', () => {
            let currentTile: Tile;
            let currentPlayer: Player;
            let roomCode: string;

            beforeEach(() => {
                currentTile = {
                    item: { name: 'sword', description: 'sharp', image: 'sword.png' } as Item,
                } as Tile;

                currentPlayer = {
                    name: 'player1',
                    inventory: [],
                } as Player;

                roomCode = 'room123';

                playingManagerServiceMock.gamesPlayers.set(roomCode, [
                    { name: 'player1', inventory: [] } as Player,
                    { name: 'player2', inventory: [] } as Player,
                ]);

                jest.spyOn(service as any, 'notifyInventoryUpdate').mockImplementation(() => {});
            });

            it('should add the item to the player inventory', () => {
                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(currentPlayer.inventory).toContain(currentTile.item);
            });

            it('should not add the item if currentTile.item is undefined', () => {
                currentTile.item = undefined;

                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(currentPlayer.inventory).toEqual([]);
            });

            it('should not add the item if currentPlayer.inventory is undefined', () => {
                currentPlayer.inventory = undefined as unknown as Item[];

                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(currentPlayer.inventory).toBeUndefined();
            });

            it('should update the player inventory in gamesPlayers', () => {
                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                const playersInRoom = playingManagerServiceMock.gamesPlayers.get(roomCode);
                const updatedPlayer = playersInRoom?.find((player) => player.name === currentPlayer.name);

                expect(updatedPlayer?.inventory).toContain(currentTile.item);
            });

            it('should not update the player inventory if playersInRoom is undefined', () => {
                playingManagerServiceMock.gamesPlayers.delete(roomCode);

                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(currentPlayer.inventory).toContain(currentTile.item);
                expect(playingManagerServiceMock.gamesPlayers.get(roomCode)).toBeUndefined();
            });

            it('should call notifyInventoryUpdate with correct parameters', () => {
                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(service['notifyInventoryUpdate']).toHaveBeenCalledWith(serverMock, roomCode, currentPlayer);
            });

            it('should not call notifyInventoryUpdate if currentTile.item.name is empty', () => {
                currentTile.item.name = '';

                (service as any).updatePlayerInventory(currentTile, currentPlayer, roomCode, serverMock);

                expect(service['notifyInventoryUpdate']).not.toHaveBeenCalled();
            });
        });

        describe('setPlayerToNull', () => {
            it('should remove player from the tile', () => {
                const tile = {
                    position: { x: 0, y: 0 },
                    player: { name: 'P1' } as Player,
                } as Tile;

                (service as any).setPlayerToNull(tile);

                expect(tile.player).toBeNull();
            });
        });

        describe('countTilesLeft', () => {
            it('should return correct count of tiles left after current index', () => {
                const path = [
                    { position: { x: 0, y: 0 } } as Tile,
                    { position: { x: 1, y: 0 } } as Tile,
                    { position: { x: 2, y: 0 } } as Tile,
                    { position: { x: 3, y: 0 } } as Tile,
                ];

                const result = (service as any).countTilesLeft(path, 1);
                expect(result).toBe(2);
            });

            it('should return 0 when index is at end of path', () => {
                const path = [{ position: { x: 0, y: 0 } } as Tile, { position: { x: 1, y: 0 } } as Tile];

                const result = (service as any).countTilesLeft(path, 1);
                expect(result).toBe(0);
            });

            it('should handle empty path', () => {
                const path: Tile[] = [];

                const result = (service as any).countTilesLeft(path, 0);
                expect(result).toBe(0);
            });

            it('should handle negative index', () => {
                const path = [{ position: { x: 0, y: 0 } } as Tile, { position: { x: 1, y: 0 } } as Tile];

                const result = (service as any).countTilesLeft(path, -1);
                expect(result).toBe(2);
            });

            it('should handle index greater than path length', () => {
                const path = [{ position: { x: 0, y: 0 } } as Tile, { position: { x: 1, y: 0 } } as Tile];

                const result = (service as any).countTilesLeft(path, 10);
                expect(result).toBe(0);
            });
        });

        describe('emitMovePlayer', () => {
            it('should emit MovePlayer event with correct data', () => {
                const nextTile = { position: { x: 1, y: 1 } } as Tile;
                const previousTile = { position: { x: 0, y: 0 } } as Tile;
                const player = { name: 'P1' } as Player;
                const roomCode = 'ROOM1';

                (service as any).emitMovePlayer(serverMock, roomCode, nextTile, previousTile, player);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.MovePlayer, {
                    nextTile,
                    previousTile,
                    player,
                });
            });

            it('should handle null previousTile', () => {
                const nextTile = { position: { x: 1, y: 1 } } as Tile;
                const player = { name: 'P1' } as Player;
                const roomCode = 'ROOM1';

                (service as any).emitMovePlayer(serverMock, roomCode, nextTile, null, player);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.MovePlayer, {
                    nextTile,
                    previousTile: null,
                    player,
                });
            });
        });
    });

    describe('handleItemPickup', () => {
        let interval: NodeJS.Timer;
        let playerMovementParams: PlayerMovementParams;

        beforeEach(() => {
            serverMock = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any as jest.Mocked<Server>;

            interval = setInterval(() => {}, 1000);

            playerMovementParams = {
                tile: { item: { name: 'potion', description: '', image: '' } } as Tile,
                player: { name: 'player1', inventory: [] } as Player,
                roomCode: 'room1',
                path: [{ position: { x: 0, y: 0 } } as Tile, { position: { x: 1, y: 0 } } as Tile],
                tileIndex: 1,
            };
        });

        afterEach(() => {
            clearInterval(interval);
        });

        it('should call manageItemPickupBot and return if it returns true', () => {
            jest.spyOn(service as any, 'manageItemPickupBot').mockReturnValue(true);
            jest.spyOn(service as any, 'addItemInventory').mockImplementation(() => {});

            service['handleItemPickup'](serverMock, interval, playerMovementParams);

            expect(service['manageItemPickupBot']).toHaveBeenCalledWith(serverMock, interval, playerMovementParams);
            expect(service['addItemInventory']).not.toHaveBeenCalled();
        });

        it('should call addItemInventory and emit events if manageItemPickupBot returns false', () => {
            jest.spyOn(service as any, 'manageItemPickupBot').mockReturnValue(false);
            jest.spyOn(service as any, 'addItemInventory').mockImplementation(() => {});
            jest.spyOn(service as any, 'emitMovePlayer').mockImplementation(() => {});
            jest.spyOn(service as any, 'endAnimation').mockImplementation(() => {});
            jest.spyOn(service as any, 'countTilesLeft').mockReturnValue(1);

            service['handleItemPickup'](serverMock, interval, playerMovementParams);

            expect(service['addItemInventory']).toHaveBeenCalledWith(
                playerMovementParams.tile,
                playerMovementParams.player,
                playerMovementParams.roomCode,
                serverMock,
            );
            expect(playerMovementParams.tile.item).toEqual({ name: '', description: '', image: '' });
            expect(service['emitMovePlayer']).toHaveBeenCalledWith(
                serverMock,
                playerMovementParams.roomCode,
                playerMovementParams.tile,
                playerMovementParams.path[playerMovementParams.tileIndex - 1],
                playerMovementParams.player,
            );
            expect(service['endAnimation']).toHaveBeenCalledWith(interval, playerMovementParams.player, serverMock, playerMovementParams.roomCode, 1);
        });
    });

    describe('manageItemPickupBot', () => {
        let interval: NodeJS.Timer;
        let playerMovementParams: PlayerMovementParams;

        beforeEach(() => {
            serverMock = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any as jest.Mocked<Server>;

            interval = setInterval(() => {}, 1000);

            playerMovementParams = {
                tile: { item: { name: 'chestbox-2', description: '', image: '' } } as Tile,
                player: { name: 'player1', inventory: [{ name: 'potion' }] } as Player,
                roomCode: 'room1',
                path: [{ position: { x: 0, y: 0 } } as Tile, { position: { x: 1, y: 0 } } as Tile],
                tileIndex: 1,
            };
        });

        afterEach(() => {
            clearInterval(interval);
        });

        it('should return false if player inventory is not full or player is not virtual', () => {
            playerMovementParams.player.inventory = [];
            playerMovementParams.player.isVirtualPlayer = false;

            const result = service['manageItemPickupBot'](serverMock, interval, playerMovementParams);

            expect(result).toBe(false);
        });

        it('should swap items and call addItemInventory if conditions are met', () => {
            playerMovementParams.player.inventory = [{ name: 'potion' } as Item, { name: 'shield' } as Item];
            playerMovementParams.player.isVirtualPlayer = true;

            jest.spyOn(service as any, 'addItemInventory').mockImplementation(() => {});
            jest.spyOn(service as any, 'emitMovePlayer').mockImplementation(() => {});
            jest.spyOn(service as any, 'endAnimation').mockImplementation(() => {});
            jest.spyOn(service as any, 'countTilesLeft').mockReturnValue(1);

            const result = service['manageItemPickupBot'](serverMock, interval, playerMovementParams);

            expect(result).toBe(true);
            expect(playerMovementParams.tile.item).toEqual({ name: 'potion' });
            expect(playerMovementParams.player.inventory[0]).toEqual(expect.objectContaining({ name: 'chestbox-2' }));
            expect(service['emitMovePlayer']).toHaveBeenCalledWith(
                serverMock,
                playerMovementParams.roomCode,
                playerMovementParams.tile,
                playerMovementParams.path[playerMovementParams.tileIndex - 1],
                playerMovementParams.player,
            );
            expect(service['endAnimation']).toHaveBeenCalledWith(interval, playerMovementParams.player, serverMock, playerMovementParams.roomCode, 1);
        });
    });

    describe('countPlayersWithFlag', () => {
        it('should return 0 if there are no players in the game', () => {
            const currentGame: GameData = {
                players: [],
            } as GameData;

            const result = (service as any).countPlayersWithFlag(currentGame);

            expect(result).toBe(0);
        });

        it('should return 0 if no players have itemsUsed', () => {
            const currentGame: GameData = {
                players: [{ name: 'player1', itemsUsed: undefined } as Player, { name: 'player2', itemsUsed: undefined } as Player],
            } as GameData;

            const result = (service as any).countPlayersWithFlag(currentGame);

            expect(result).toBe(0);
        });

        it('should return the correct count of players with the flag', () => {
            const currentGame: GameData = {
                players: [
                    { name: 'player1', itemsUsed: [{ name: 'chestbox-2' }] } as Player,
                    { name: 'player2', itemsUsed: [{ name: 'potion' }] } as Player,
                    { name: 'player3', itemsUsed: [{ name: 'chestbox-2' }, { name: 'potion' }] } as Player,
                    { name: 'player4', itemsUsed: undefined } as Player,
                ],
            } as GameData;

            const result = (service as any).countPlayersWithFlag(currentGame);

            expect(result).toBe(2);
        });

        it('should handle a mix of players with and without itemsUsed', () => {
            const currentGame: GameData = {
                players: [
                    { name: 'player1', itemsUsed: [{ name: 'chestbox-2' }] } as Player,
                    { name: 'player2', itemsUsed: undefined } as Player,
                    { name: 'player3', itemsUsed: [{ name: 'potion' }] } as Player,
                    { name: 'player4', itemsUsed: [{ name: 'chestbox-2' }] } as Player,
                ],
            } as GameData;

            const result = (service as any).countPlayersWithFlag(currentGame);

            expect(result).toBe(2);
        });
        it('should return 0 if currentGame.players is undefined', () => {
            const currentGame: GameData = {
                players: undefined,
            } as GameData;

            const result = (service as any).countPlayersWithFlag(currentGame);

            expect(result).toBe(0);
        });
    });
});
