/* eslint-disable @typescript-eslint/no-empty-function */
// fonctions vides sont souvent utilisées dans les tests pour simuler des comportements
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// les tests couvrent de nombreux cas d'utilisation et scénarios
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques ne nécessitent pas d'être extraits en constantes, car ils sont utilisés
// uniquement dans le contexte des tests
/* eslint-disable no-undef */
// éviter les erreurs liées à des variables ou des types qui ne sont pas explicitement définis dans le fichier
import { ITEM_TYPES, POURCENTAGE_CALCULATION } from '@app/constants/constants';
import { GameLogGateway } from '@app/gateways/game-log-gateway/game-log.gateway';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { TimeService } from '@app/services/time-service/time.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { Game, GameData, GlobalStatistics, Item, Player, Tile } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { PlayingManagerService } from './playing-manager.service';

describe('PlayingManagerService', () => {
    let service: PlayingManagerService;
    let serverMock: jest.Mocked<Server>;
    let timeServiceMock: jest.Mocked<TimeService>;
    let gameRoomGatewayMock: Partial<GameRoomGateway>;
    let gameLogGatewayMock: Partial<GameLogGateway>;

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

        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {},
            socketsLeave: jest.fn(),
        } as any as jest.Mocked<Server>;

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
                PlayingManagerService,
                { provide: TimeService, useValue: timeServiceMock },
                { provide: GameRoomGateway, useValue: gameRoomGatewayMock },
                { provide: GameLogGateway, useValue: gameLogGatewayMock },
                {
                    provide: 'SocketServer',
                    useValue: serverMock,
                },
            ],
        }).compile();

        service = module.get<PlayingManagerService>(PlayingManagerService);

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

    describe('Socket events emission', () => {
        describe('debugModeChanged', () => {
            it('should emit debugModeChanged event to the room', () => {
                const roomCode = 'room123';
                const isDebugMode = true;

                service.debugModeChanged(serverMock, roomCode, isDebugMode);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('debugModeChanged', { isDebugMode });
            });

            it('should emit debug mode disabled event when isDebugMode is false', () => {
                const roomCode = 'room123';
                const isDebugMode = false;

                service.debugModeChanged(serverMock, roomCode, isDebugMode);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('debugModeChanged', { isDebugMode });
            });

            it('should work with empty room code', () => {
                const roomCode = '';
                const isDebugMode = true;

                service.debugModeChanged(serverMock, roomCode, isDebugMode);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith('debugModeChanged', { isDebugMode });
            });
        });
    });

    describe('quitGame', () => {
        it('should handle case where player is not in the game players array but is on the map', () => {
            const roomCode = 'room123';
            const playerToRemove = { name: 'playerNotInArray' } as Player;
            const player2 = { name: 'player2' } as Player;
            const player3 = { name: 'player3' } as Player;

            const map = [
                {
                    position: { x: 0, y: 0 },
                    type: 'grass',
                    traversable: true,
                    item: null,
                    player: { name: 'playerNotInArray' } as Player,
                    image: 'grass.png',
                    cost: 1,
                } as Tile,
            ];

            const games = new Map<string, GameData>();
            games.set(roomCode, {
                game: {} as Game,
                players: [player2, player3],
            } as GameData);

            service.quitGame(serverMock, roomCode, playerToRemove, map, games);

            expect(games.get(roomCode)).toBeDefined();
            expect(games.get(roomCode).players.length).toBe(2);
            expect(map[0].player).toBeUndefined();
        });

        it('should handle case where player is in game players array but not on map', () => {
            const roomCode = 'room123';
            const playerToRemove = { name: 'player1' } as Player;
            const player2 = { name: 'player2' } as Player;
            const player3 = { name: 'player3' } as Player;

            const map = [
                {
                    position: { x: 0, y: 0 },
                    type: 'grass',
                    traversable: true,
                    item: null,
                    player: null,
                    image: 'grass.png',
                    cost: 1,
                } as Tile,
            ];

            const games = new Map<string, GameData>();
            games.set(roomCode, {
                game: {} as Game,
                players: [playerToRemove, player2, player3],
            } as GameData);

            service.quitGame(serverMock, roomCode, playerToRemove, map, games);

            expect(games.get(roomCode)).toBeDefined();
            expect(games.get(roomCode).players.length).toBe(2);
            expect(games.get(roomCode).players).not.toContainEqual(playerToRemove);
        });

        it('should delete game when only one player remains after quit', () => {
            const roomCode = 'room123';
            const playerToRemove = { name: 'player1' } as Player;
            const lastPlayer = { name: 'lastPlayer' } as Player;

            const map = [
                {
                    position: { x: 0, y: 0 },
                    type: 'grass',
                    traversable: true,
                    item: null,
                    player: { name: 'player1' } as Player,
                    image: 'grass.png',
                    cost: 1,
                } as Tile,
            ];

            const games = new Map<string, GameData>();
            games.set(roomCode, {
                game: {} as Game,
                players: [playerToRemove, lastPlayer],
            } as GameData);

            service.quitGame(serverMock, roomCode, playerToRemove, map, games);

            expect(games.has(roomCode)).toBeFalsy();
            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith('quitGame', [lastPlayer], expect.anything());
        });

        it('should update gamesPlayers map with the remaining players', () => {
            const roomCode = 'room123';
            const playerToRemove = { name: 'player1' } as Player;
            const player2 = { name: 'player2' } as Player;
            const player3 = { name: 'player3' } as Player;

            const map = [
                {
                    position: { x: 0, y: 0 },
                    type: 'grass',
                    traversable: true,
                    item: null,
                    player: null,
                    image: 'grass.png',
                    cost: 1,
                } as Tile,
            ];

            const games = new Map<string, GameData>();
            games.set(roomCode, {
                game: {} as Game,
                players: [playerToRemove, player2, player3],
            } as GameData);

            service.quitGame(serverMock, roomCode, playerToRemove, map, games);

            expect(service.gamesPlayers.get(roomCode)).toEqual([player2, player3]);
        });

        it('should handle case when game does not exist', () => {
            const roomCode = 'nonexistentRoom';
            const playerToRemove = { name: 'player1' } as Player;
            const map = [] as Tile[];
            const games = new Map<string, GameData>();

            expect(() => {
                service.quitGame(serverMock, roomCode, playerToRemove, map, games);
            }).not.toThrow();

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(serverMock.emit).not.toHaveBeenCalled();
        });
    });

    describe('startGame', () => {
        it('should initialize and start game when valid room exists', () => {
            const roomCode = 'room123';
            const players = [
                { name: 'player1', inventory: [] },
                { name: 'player2', inventory: [] },
            ] as Player[];
            const games = new Map<string, GameData>();

            const gameData = {
                game: { map: [], map2: [], gameMode: 'solo' } as Game,
                players: [],
            } as GameData;

            games.set(roomCode, gameData);
            gameRoomGatewayMock.games.set(roomCode, {
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
                isLocked: false,
                pin: '',
                players: [],
                size: '',
                game: undefined,
                playerPositions: undefined,
            });

            const setPlayersSpawnSpy = jest.spyOn(service as any, 'setPlayersSpawn').mockReturnValue([]);
            const setRandomItemsSpy = jest.spyOn(service as any, 'setRandomItems').mockImplementation(() => {});
            const setOrderPlayersSpy = jest.spyOn(service as any, 'setOrderPlayers').mockReturnValue(players);

            jest.spyOn(Date, 'now').mockReturnValue(1234567890 * 1000);

            service.startGame(serverMock, roomCode, players, games);

            expect(setPlayersSpawnSpy).toHaveBeenCalledWith(gameData.game, players);
            expect(setRandomItemsSpy).toHaveBeenCalled();
            expect(setOrderPlayersSpy).toHaveBeenCalledWith(players);
            expect(gameData.game.map2).toEqual([]);
            expect(service.gamesPlayerTurn.get(roomCode)).toBeNull();
            expect(service.gamesPlayers.get(roomCode)).toEqual(players);
            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.StartGame, gameData);
            expect(gameRoomGatewayMock.games.get(roomCode).glocalStatistics.allTime).toBeDefined();
        });

        it('should set random teams when game mode is CTF', () => {
            const roomCode = 'room123';
            const players = [
                { name: 'player1', inventory: [] },
                { name: 'player2', inventory: [] },
            ] as Player[];
            const games = new Map<string, GameData>();

            const gameData = {
                game: { map: [], map2: [], gameMode: 'CTF' } as Game,
                players: [],
            } as GameData;

            games.set(roomCode, gameData);
            gameRoomGatewayMock.games.set(roomCode, {
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
                isLocked: false,
                pin: '',
                players: [],
                size: '',
                game: undefined,
                playerPositions: undefined,
            });

            jest.spyOn(service as any, 'setPlayersSpawn').mockReturnValue([]);
            jest.spyOn(service as any, 'setRandomItems').mockImplementation(() => {});
            jest.spyOn(service as any, 'setOrderPlayers').mockReturnValue(players);
            const setRandomTeamsSpy = jest.spyOn(service as any, 'setRandomTeams').mockReturnValue(players);

            service.startGame(serverMock, roomCode, players, games);

            expect(setRandomTeamsSpy).toHaveBeenCalledWith(players);
        });

        it('should initialize empty inventory for each player', () => {
            const roomCode = 'room123';
            const players = [
                { name: 'player1', inventory: ['old item'] },
                { name: 'player2', inventory: ['old item'] },
            ] as any as Player[];
            const games = new Map<string, GameData>();

            const gameData = {
                game: { map: [], map2: [], gameMode: 'solo' } as Game,
                players: [],
            } as GameData;

            games.set(roomCode, gameData);
            gameRoomGatewayMock.games.set(roomCode, {
                glocalStatistics: {
                    allTime: 0,
                    percentageOfTile: 0,
                    percentageOfDors: 0,
                    nbrPlayerOpenDoor: 0,
                    allDoors: [],
                    nbOfTakenFleg: 0,
                },
                isLocked: false,
                pin: '',
                players: [],
                size: '',
                game: undefined,
                playerPositions: undefined,
            });

            jest.spyOn(service as any, 'setPlayersSpawn').mockReturnValue([]);
            jest.spyOn(service as any, 'setRandomItems').mockImplementation(() => {});
            jest.spyOn(service as any, 'setOrderPlayers').mockReturnValue(players);

            service.startGame(serverMock, roomCode, players, games);

            expect(players[0].inventory).toEqual([]);
            expect(players[1].inventory).toEqual([]);
        });

        it('should log warning when game does not exist', () => {
            const roomCode = 'nonExistentRoom';
            const players = [] as Player[];
            const games = new Map<string, GameData>();

            service.startGame(serverMock, roomCode, players, games);

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(serverMock.emit).not.toHaveBeenCalled();
        });
    });

    describe('endGameWinVictories', () => {
        beforeEach(() => {
            service.endGameEmitted = false;
        });

        it('should not call handleSendGameLog if endGameEmitted is true', () => {
            const roomCode = 'room1';
            const winner = 'player1';

            service.gamesPlayers.set(roomCode, [{ name: 'player1' } as Player]);
            gameRoomGatewayMock.games.set(roomCode, { glocalStatistics: {} } as any);

            service.endGameEmitted = true;

            const handleSendGameLogSpy = jest.spyOn(gameLogGatewayMock, 'handleSendGameLog');
            handleSendGameLogSpy.mockClear();

            service.endGameWinVictories(serverMock, roomCode, winner);

            expect(handleSendGameLogSpy).not.toHaveBeenCalled();
        });

        it('should handle missing gameRoom gracefully', () => {
            const roomCode = 'nonexistentRoom';
            const winner = 'player1';

            service.gamesPlayers.set(roomCode, [{ name: 'player1' } as Player]);

            expect(() => {
                service.endGameWinVictories(serverMock, roomCode, winner);
            }).not.toThrow();

            expect(serverMock.to).toHaveBeenCalledWith(roomCode);
            expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndGameWinVictories, { winner });
        });

        it('should handle missing gamesPlayers entry gracefully', () => {
            const roomCode = 'nonexistentRoom';
            const winner = 'player1';

            expect(() => {
                service.endGameWinVictories(serverMock, roomCode, winner);
            }).not.toThrow();

            const expectedPayload = {
                type: 'combatStart',
                event: 'Fin de partie. Joueurs actifs : ',
                players: [],
                room: roomCode,
            };

            expect(gameLogGatewayMock.handleSendGameLog).toHaveBeenCalledWith(null, expectedPayload);
        });
    });

    describe('Private methods', () => {
        describe('setPlayersSpawn', () => {
            it('should place players on spawn tiles', () => {
                const game = {
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                        {
                            position: { x: 1, y: 1 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                    ],
                    map2: [] as Tile[],
                } as Game;

                const players = [{ name: 'player1' } as Player, { name: 'player2' } as Player];

                const updatedMap = service['setPlayersSpawn'](game, players);

                expect(updatedMap.some((tile) => tile.player && tile.player.name === 'player1')).toBeTruthy();
                expect(updatedMap.some((tile) => tile.player && tile.player.name === 'player2')).toBeTruthy();

                const player1 = players.find((p) => p.name === 'player1');
                const player2 = players.find((p) => p.name === 'player2');
                expect(player1.spawnPoint).toBeDefined();
                expect(player2.spawnPoint).toBeDefined();
            });

            it('should remove items from excess spawn tiles', () => {
                const game = {
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                        {
                            position: { x: 1, y: 1 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                        {
                            position: { x: 2, y: 2 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                    ],
                    map2: [] as Tile[],
                } as Game;

                const players = [{ name: 'player1' } as Player];
                jest.spyOn(service as any, 'shuffle').mockImplementation((arr) => arr);

                const updatedMap = service['setPlayersSpawn'](game, players);

                expect(updatedMap[0].player).toBeDefined();
                expect(updatedMap[0].player?.name).toBe('player1');

                expect(updatedMap[1].item).toBeUndefined();
                expect(updatedMap[2].item).toBeUndefined();
            });

            it('should safely handle undefined or null spawn positions', () => {
                const game = {
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                        {
                            position: null,
                            type: 'grass',
                            traversable: true,
                            item: { name: 'spawn' } as Item,
                            player: null,
                            image: 'grass.png',
                            cost: 1,
                        } as Tile,
                    ],
                    map2: [] as Tile[],
                } as Game;

                const players = [{ name: 'player1' } as Player];
                jest.spyOn(service as any, 'shuffle').mockImplementation((arr) => arr);

                const updatedMap = service['setPlayersSpawn'](game, players);

                expect(updatedMap[0].player?.name).toBe('player1');
                expect(updatedMap).toBeDefined();
            });

            it('should handle the case with more players than spawn points', () => {
                const game = {
                    map: [{ position: { x: 0, y: 0 }, item: { name: ITEM_TYPES.spawn } } as Tile, { position: { x: 1, y: 1 } } as Tile],
                    map2: [] as Tile[],
                } as Game;
                const players = [{ name: 'player1' } as Player, { name: 'player2' } as Player];
                jest.spyOn(service as any, 'shuffle').mockImplementation((arr) => arr);

                const updatedMap = service['setPlayersSpawn'](game, players);

                expect(updatedMap.find((t) => t.position?.x === 0 && t.position?.y === 0)?.player?.name).toBe('player1');
                expect(players[0].spawnPoint).toEqual({ x: 0, y: 0 });
                expect(players[1].spawnPoint).toBeUndefined();
            });
        });

        describe('shuffle', () => {
            it('should shuffle an array', () => {
                const array = [1, 2, 3, 4, 5];
                const originalArray = [...array];

                jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.1).mockReturnValueOnce(0.8).mockReturnValueOnce(0.3);

                service['shuffle'](array);

                expect(array).not.toEqual(originalArray);
                expect(array.sort()).toEqual(originalArray.sort());

                jest.spyOn(global.Math, 'random').mockRestore();
            });

            it('should handle empty arrays', () => {
                const array: any[] = [];

                expect(() => {
                    service['shuffle'](array);
                }).not.toThrow();

                expect(array).toEqual([]);
            });

            it('should handle arrays with one element', () => {
                const array = ['single'];

                service['shuffle'](array);

                expect(array).toEqual(['single']);
            });
        });

        describe('setOrderPlayers', () => {
            it('should sort players by speed in descending order', () => {
                const players = [{ name: 'A', speed: 5 } as Player, { name: 'B', speed: 10 } as Player, { name: 'C', speed: 7 } as Player];

                const result = (service as any).setOrderPlayers(players);

                expect(result.map((p) => p.name)).toEqual(['B', 'C', 'A']);
            });

            it('should randomize order when players have the same speed', () => {
                const players = [{ name: 'A', speed: 5 } as Player, { name: 'B', speed: 5 } as Player];

                const randomMock = jest.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValueOnce(0.4);

                const result1 = (service as any).setOrderPlayers([...players]);
                expect(result1.map((p) => p.name)).toEqual(['A', 'B']);

                const result2 = (service as any).setOrderPlayers([...players]);
                expect(result2.map((p) => p.name)).toEqual(['B', 'A']);

                randomMock.mockRestore();
            });
        });

        describe('setRandomTeams', () => {
            it('should assign teams to players by shuffling them', () => {
                const players = [
                    { name: 'Player1' } as Player,
                    { name: 'Player2' } as Player,
                    { name: 'Player3' } as Player,
                    { name: 'Player4' } as Player,
                ];

                jest.spyOn(service as any, 'shuffle').mockImplementation((arr) => arr);

                const result = (service as any).setRandomTeams(players);

                expect(result).toBe(players);

                expect(players[0].team).toBe('teamA');
                expect(players[1].team).toBe('teamA');
                expect(players[2].team).toBe('teamB');
                expect(players[3].team).toBe('teamB');
            });

            it('should handle odd number of players', () => {
                const players = [{ name: 'p1' }, { name: 'p2' }, { name: 'p3' }] as Player[];
                jest.spyOn(service as any, 'shuffle').mockImplementation((arr) => arr);

                const updatedPlayers = service['setRandomTeams'](players);

                expect(updatedPlayers[0].team).toBe('teamA');
                expect(updatedPlayers[1].team).toBe('teamA');
                expect(updatedPlayers[2].team).toBe('teamB');
            });
        });

        describe('setRandomItems', () => {
            beforeEach(() => {
                (service as any).ITEMS = dummyItems;
                (service as any).NUMBER_OF_ITEMS_TO_SELECT = NUMBER_OF_ITEMS_TO_SELECT;
            });

            it('should not modify tiles without random items', () => {
                const map = [{ item: { name: 'item1' } } as Tile, { item: { name: 'item2' } } as Tile];

                const originalMapCopy = JSON.parse(JSON.stringify(map));

                (service as any).setRandomItems(map);

                expect(map).toEqual(originalMapCopy);
            });

            it('should handle more random slots than available items', () => {
                const map = [
                    { item: { name: ITEM_TYPES.random } } as Tile,
                    { item: { name: ITEM_TYPES.random } } as Tile,
                    { item: { name: ITEM_TYPES.random } } as Tile,
                ];

                (service as any).NUMBER_OF_ITEMS_TO_SELECT = 2;

                expect(() => {
                    (service as any).setRandomItems(map);
                }).not.toThrow();

                expect(map[0].item).toBeDefined();
                expect(map[1].item).toBeDefined();
                expect(map[2].item).toBeDefined();
            });
        });

        describe('endGameCtf', () => {
            beforeEach(() => {
                gameRoomGatewayMock.games.set('room1', {
                    glocalStatistics: {},
                } as any);

                jest.spyOn(service as any, 'emitEndGameCtf').mockImplementation(() => {});
                jest.spyOn(Date, 'now').mockReturnValue(1234567890 * POURCENTAGE_CALCULATION);

                service.gamesPlayers.set('room1', [{ name: 'player1', team: 'teamA' } as Player, { name: 'player2', team: 'teamB' } as Player]);
            });

            it('should emit endGameCtf if player has the flag and is on spawn point', () => {
                const roomCode = 'room1';
                const player: Player = {
                    name: 'player1',
                    team: 'teamA',
                    coordinate: { x: 1, y: 2 },
                    spawnPoint: { x: 1, y: 2 },
                    inventory: [{ name: 'chestbox-2' } as Item],
                } as Player;

                const game: Game = {
                    gameMode: 'CTF',
                } as Game;

                (service as any).endGameCtf(serverMock, roomCode, player, game);

                expect((service as any).emitEndGameCtf).toHaveBeenCalledWith(serverMock, roomCode, 'teamA');
                expect(gameLogGatewayMock.handleSendGameLog).toHaveBeenCalled();
            });

            it('should not emit endGameCtf if player is not on spawn point', () => {
                const roomCode = 'room1';
                const player: Player = {
                    name: 'player1',
                    team: 'teamA',
                    coordinate: { x: 2, y: 2 },
                    spawnPoint: { x: 1, y: 2 },
                    inventory: [{ name: 'chestbox-2' } as Item],
                } as Player;

                const game: Game = { gameMode: 'CTF' } as Game;

                (service as any).endGameCtf(serverMock, roomCode, player, game);

                expect((service as any).emitEndGameCtf).not.toHaveBeenCalled();
            });

            it('should not emit endGameCtf if player does not have the flag', () => {
                const roomCode = 'room1';
                const player: Player = {
                    name: 'player1',
                    team: 'teamA',
                    coordinate: { x: 1, y: 2 },
                    spawnPoint: { x: 1, y: 2 },
                    inventory: [{ name: 'sword' } as Item],
                } as Player;

                const game: Game = { gameMode: 'CTF' } as Game;

                (service as any).endGameCtf(serverMock, roomCode, player, game);

                expect((service as any).emitEndGameCtf).not.toHaveBeenCalled();
            });

            it('should not check CTF conditions if game mode is not CTF', () => {
                const roomCode = 'room1';
                const player: Player = {
                    name: 'player1',
                    team: 'teamA',
                    coordinate: { x: 1, y: 2 },
                    spawnPoint: { x: 1, y: 2 },
                    inventory: [{ name: 'chestbox-2' } as Item],
                } as Player;

                const game: Game = { gameMode: 'solo' } as Game;

                (service as any).endGameCtf(serverMock, roomCode, player, game);

                expect((service as any).emitEndGameCtf).not.toHaveBeenCalled();
            });

            it('should handle player with empty inventory', () => {
                const roomCode = 'room1';
                const player: Player = {
                    name: 'player1',
                    team: 'teamA',
                    coordinate: { x: 1, y: 2 },
                    spawnPoint: { x: 1, y: 2 },
                    inventory: [],
                } as Player;

                const game: Game = { gameMode: 'CTF' } as Game;

                expect(() => {
                    (service as any).endGameCtf(serverMock, roomCode, player, game);
                }).not.toThrow();

                expect((service as any).emitEndGameCtf).not.toHaveBeenCalled();
            });
        });

        describe('emitEndGameCtf', () => {
            it('should emit endGameCtf event, change debug mode, stop timer and remove sockets', () => {
                const roomCode = 'ROOM1';
                const team = 'teamA';

                const debugModeChangedSpy = jest.spyOn(service, 'debugModeChanged').mockImplementation(() => {});

                (service as any).emitEndGameCtf(serverMock, roomCode, team);

                expect(serverMock.to).toHaveBeenCalledWith(roomCode);
                expect(serverMock.emit).toHaveBeenCalledWith(SocketPlayerMovementLabels.EndGameCtf, { team });
                expect(debugModeChangedSpy).toHaveBeenCalledWith(serverMock, roomCode, false);
                expect(timeServiceMock.stopTimer).toHaveBeenCalledWith(roomCode);
                expect(serverMock.socketsLeave).toHaveBeenCalledWith(roomCode);
            });
        });
    });
});
