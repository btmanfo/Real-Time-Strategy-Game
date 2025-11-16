/* eslint-disable max-len */
// Le code est plus long que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable max-lines */
// Le nombre ligne est plus grand que la normale car il y a plusieurs tests à faire pour chaque fonction
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { TIME_BEFORE_TURN } from '@app/constants/constants';
import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { PlayerGateway } from '@app/gateways/player-gateway/player.gateway';
import { CombatService } from '@app/services/combat-service/combat.service';
import { PlayerMovementService } from '@app/services/player-movement-service/player-movement.service';
import { PlayingManagerService } from '@app/services/playing-manager-service/playing-manager.service';
import { TimeService } from '@app/services/time-service/time.service';
import { TurnService } from '@app/services/turn-service/turn.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { Game, GameData, Player, Tile } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

describe('PlayerGateway', () => {
    let gateway: PlayerGateway;
    let playerMovementService: PlayerMovementService;
    let server: Server;
    let adminClient: Socket;
    let turnService: TurnService;
    let timeService: TimeService;
    let gameRoomGateway: GameRoomGateway;
    let playingManagerService: PlayingManagerService;
    let combatService: CombatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerGateway,
                {
                    provide: PlayerMovementService,
                    useValue: {
                        animatePlayerMove: jest.fn(),
                        endTurn: jest.fn(),
                        toggleDoor: jest.fn(),
                        playerMoved: jest.fn(),
                        notifyInventoryUpdate: jest.fn(),
                        choseItem: jest.fn(),
                    },
                },
                {
                    provide: TurnService,
                    useValue: {
                        endTurn: jest.fn(),
                        nextPlayer: jest.fn(),
                    },
                },
                {
                    provide: TimeService,
                    useValue: {
                        startTimer: jest.fn(),
                        stopTimer: jest.fn(),
                        gamesCounter: new Map<string, number>(),
                    },
                },
                {
                    provide: GameRoomGateway,
                    useValue: {
                        rooms: new Set<string>(),
                        games: new Map(),
                        selectionPlayerRoom: new Map<string, Set<string>>(),
                    },
                },
                {
                    provide: PlayingManagerService,
                    useValue: {
                        startGame: jest.fn(),
                        endGameWinVictories: jest.fn(),
                        endGame: jest.fn(),
                        quitGame: jest.fn(),
                        gamesPlayers: new Map<string, Player[]>(),
                        gamesPlayerTurn: new Map<string, Player>(),
                        debugModeChanged: jest.fn(),
                    },
                },
                {
                    provide: CombatService,
                    useValue: {
                        startFight: jest.fn(),
                        combatUpdate: jest.fn(),
                        combatEscaped: jest.fn(),
                        combatEnded: jest.fn(),
                        combatRolls: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<PlayerGateway>(PlayerGateway);
        playerMovementService = module.get<PlayerMovementService>(PlayerMovementService);
        turnService = module.get<TurnService>(TurnService);
        timeService = module.get<TimeService>(TimeService);
        gameRoomGateway = module.get<GameRoomGateway>(GameRoomGateway);
        playingManagerService = module.get<PlayingManagerService>(PlayingManagerService);
        combatService = module.get<CombatService>(CombatService);

        gateway.server = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
            emit: jest.fn(),
            socketsLeave: jest.fn(),
        } as any;
        server = gateway.server;

        adminClient = {
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
            id: 'adminClientId',
        } as any as Socket;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleSendMessage', () => {
        it('should emit a message back to the client with the correct event and payload', () => {
            const payload = { roomCode: 'ROOM123', message: 'Hello, world!', userName: 'thomas' };

            gateway.handleSendMessage(adminClient, payload);

            expect(adminClient.emit).toHaveBeenCalledTimes(1);
            expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.OnSendMessageCombatRoom, {
                message: payload.message,
                roomCode: payload.roomCode,
                userName: payload.userName,
            });
        });
    });

    describe('vitualPlayerAnimate', () => {
        it('should not call animatePlayerMove if gameData is not found', () => {
            const roomCode = 'nonExistingRoom';
            const path: Tile[] = [{ position: { x: 0, y: 0 } } as Tile];
            const player: Player = { name: 'virtualPlayer' } as Player;

            gateway.vitualPlayerAnimate(roomCode, path, player);

            expect(playerMovementService.animatePlayerMove).not.toHaveBeenCalled();
        });

        it('should call animatePlayerMove with correct parameters if gameData is found', () => {
            const roomCode = 'room123';
            const path: Tile[] = [{ position: { x: 0, y: 0 } } as Tile];
            const player: Player = { name: 'virtualPlayer' } as Player;
            const mockGame = { id: 'game1', gameMode: 'Classique' };

            gameRoomGateway.games.set(roomCode, { game: mockGame } as any);

            gateway.vitualPlayerAnimate(roomCode, path, player);

            expect(playerMovementService.animatePlayerMove).toHaveBeenCalledTimes(1);
            expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(server, roomCode, path, player, mockGame);
        });
    });

    describe('handleRestartTurn', () => {
        it('should emit RestartTurn event with the correct player and room code', () => {
            const roomCode = 'room123';
            const player: Player = {
                name: 'testPlayer',
                health: 100,
                life: 100,
                speed: 5,
                attack: '10',
                defense: '5',
                avatarUrl: '',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            } as Player;

            const data = { roomCode, player };

            const emitMock = jest.fn();
            gateway.server.to = jest.fn().mockReturnValue({ emit: emitMock });

            gateway.handleRestartTurn(adminClient, data);

            expect(gateway.server.to).toHaveBeenCalledWith(roomCode);
            expect(emitMock).toHaveBeenCalledWith(SocketPlayerMovementLabels.RestartTurn, {
                player,
            });
        });
    });

    describe('handleRestartTimer', () => {
        it('should call timeService.startTimer with the correct parameters', () => {
            const roomCode = 'room123';
            const time = 30;
            const currentPlayer = { name: 'testPlayer' } as Player;

            const data = { roomCode, time };

            playingManagerService.gamesPlayerTurn.set(roomCode, currentPlayer);

            gateway.handleRestartTimer(adminClient, data);

            expect(timeService.startTimer).toHaveBeenCalledTimes(1);
            expect(timeService.startTimer).toHaveBeenCalledWith(time, server, roomCode, currentPlayer);
        });

        it('should call timeService.startTimer with null as currentPlayer if no player is found', () => {
            const roomCode = 'room456';
            const time = 45;

            const data = { roomCode, time };

            gateway.handleRestartTimer(adminClient, data);

            expect(timeService.startTimer).toHaveBeenCalledTimes(1);
            expect(timeService.startTimer).toHaveBeenCalledWith(time, server, roomCode, undefined);
        });
    });

    describe('handleGetAllGlobalInfo', () => {
        it('should emit global statistics to the client if the room exists', () => {
            const roomCode = 'room123';
            const mockStats = { allTime: 100, percentageOfTile: 50 };
            const payload = { roomCode };

            gameRoomGateway.games.set(roomCode, { glocalStatistics: mockStats } as any);

            gateway.handleGetAllGlobalInfo(adminClient, payload);

            expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.ToAllGlobalInfo, mockStats);
        });

        it('should send an error if the room does not exist', () => {
            const roomCode = 'nonExistingRoom';
            const payload = { roomCode };

            gateway.handleGetAllGlobalInfo(adminClient, payload);

            expect(adminClient.emit).toHaveBeenCalledWith('error', { message: `Room ${roomCode} not found.` });
        });
    });

    describe('handleQuitGame', () => {
        it('should call quitGame and handleCurrentPlayerQuit, and leave the room if the quitting player is the current turn player', () => {
            const roomCode = 'room123';
            const player = { name: 'currentPlayer' } as Player;
            const map = [{ id: 1 }] as any;
            const data = { roomCode, player, map } as GameData;

            jest.spyOn(gateway as any, 'handleCurrentPlayerQuit').mockReturnValue(true);

            gateway.handleQuitGame(adminClient, data);

            expect(playingManagerService.quitGame).toHaveBeenCalledWith(server, roomCode, player, map, gameRoomGateway.games);
            expect(gateway['handleCurrentPlayerQuit']).toHaveBeenCalledWith(adminClient, data);
            expect(adminClient.leave).toHaveBeenCalledWith(roomCode);
            expect(playingManagerService.debugModeChanged).not.toHaveBeenCalled();
            expect(server.socketsLeave).not.toHaveBeenCalled();
        });

        it('should call quitGame, disable debug mode, and make all sockets leave if the quitting player is not the current turn player', () => {
            const roomCode = 'room123';
            const player = { name: 'otherPlayer' } as Player;
            const map = [{ id: 1 }] as any;
            const data = { roomCode, player, map } as GameData;

            jest.spyOn(gateway as any, 'handleCurrentPlayerQuit').mockReturnValue(false);

            gateway.handleQuitGame(adminClient, data);

            expect(playingManagerService.quitGame).toHaveBeenCalledWith(server, roomCode, player, map, gameRoomGateway.games);
            expect(gateway['handleCurrentPlayerQuit']).toHaveBeenCalledWith(adminClient, data);
            expect(adminClient.leave).not.toHaveBeenCalled();
            expect(playingManagerService.debugModeChanged).toHaveBeenCalledWith(server, roomCode, false);
            expect(server.socketsLeave).toHaveBeenCalledWith(roomCode);
        });
    });

    describe('handleStartFight', () => {
        it('should call playerMovementService.startFight', () => {
            const data: GameData = { roomCode: 'room1', players: [], isLocked: false } as GameData;
            gateway.handleStartFight(adminClient, data);
            expect(combatService.startFight).toHaveBeenCalledWith(server, data.roomCode, data.players, gameRoomGateway.games);
            expect(timeService.stopTimer).toHaveBeenCalledWith('room1');
        });
    });

    describe('handleStartGame', () => {
        it('should call playerMovementService.startGame', () => {
            const data: GameData = { roomCode: 'room1', players: [], isLocked: false } as GameData;
            gateway.handleStartGame(adminClient, data);
            expect(playingManagerService.startGame).toHaveBeenCalledWith(server, data.roomCode, data.players, gameRoomGateway.games);
        });
    });

    describe('handleAnimatePlayerMove', () => {
        it('should call playerMovementService.animatePlayerMove', () => {
            const data: GameData = { roomCode: 'room1', map: [], player: { name: 'dkaso' } as Player, game: { gameMode: 'CTF' } as any } as GameData;
            playingManagerService.gamesPlayerTurn.set(data.roomCode, data.player);
            playingManagerService.gamesPlayers.set(data.roomCode, [data.player]);
            gateway.handleAnimatePlayerMove(adminClient, data);
            expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(server, data.roomCode, [], { name: 'dkaso' }, {
                gameMode: 'CTF',
            } as Game);
        });
    });

    describe('handleJoinRoomSelectPlayer', () => {
        it('should join room for select player and emit playerJoined event', () => {
            const roomCode = 'room123';
            gameRoomGateway.rooms.add(roomCode);
            gameRoomGateway.selectionPlayerRoom.set(roomCode, new Set());
            const emitMock = jest.fn();
            server.to = jest.fn().mockReturnValue({ emit: emitMock });

            gateway.handleJoinRoomSelectPlayer(adminClient, roomCode);

            expect(adminClient.join).toHaveBeenCalledWith(roomCode);
            expect(gameRoomGateway.selectionPlayerRoom.get(roomCode).has(adminClient.id)).toBe(true);
            expect(emitMock).toHaveBeenCalledWith('playerJoined', { playerId: adminClient.id, roomCode });
        });

        it('should emit error event if room does not exist', () => {
            const roomCode = 'nonExistingRoom';

            gateway.handleJoinRoomSelectPlayer(adminClient, roomCode);

            expect(adminClient.emit).toHaveBeenCalledWith('error', { message: `Room ${roomCode} does not exist.` });
        });
    });

    describe('handleCharacterSelected', () => {
        it('should emit error event if room does not exist', () => {
            const roomCode = 'nonExistingRoom';
            const player: Player = { name: 'testPlayer' } as Player;
            const avatarUrl = 'avatarUrl';

            gateway.handleCharacterSelected(adminClient, { roomCode, player, avatarUrl });

            expect(adminClient.emit).toHaveBeenCalledWith('error', { message: `Room ${roomCode} does not exist.` });
        });

        it('should emit theCharacterToDeselect event with correct payload when room exists', () => {
            const roomCode = 'existingRoom';
            const player: Player = { name: 'testPlayer' } as Player;
            const avatarUrl = 'testAvatarUrl';

            gameRoomGateway.rooms.add(roomCode);

            gateway.handleCharacterSelected(adminClient, { roomCode, player, avatarUrl });

            expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.TheCharacterToDeselect, {
                theUrlOfSelectPlayer: avatarUrl,
                theRoomCodeToDesable: roomCode,
            });
        });
    });

    describe('handleCharacterDeselected', () => {
        it('should emit theCharacterDeselected event with correct payload', () => {
            const roomCode = 'room123';
            const avatarUrl = 'avatar1.png';

            gateway.handleCharacterDeselected(adminClient, { roomCode, avatarUrl });

            expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.TheCharacterDeselected, {
                theUrlOfSelectPlayer: avatarUrl,
                theRoomCodeToDesable: roomCode,
            });
        });
    });

    describe('handleGetAllGlobalInfo', () => {
        it('should emit global statistics to the client', () => {
            const roomCode = 'room123';
            const mockStats = { allTime: 100, percentageOfTile: 500 };

            gameRoomGateway.games.set(roomCode, { glocalStatistics: mockStats } as any);

            gateway.handleGetAllGlobalInfo(adminClient, { roomCode });

            expect(adminClient.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.ToAllGlobalInfo, mockStats);
        });
    });

    describe('handleToggleDoor', () => {
        it('should not process when gameData or tile is missing', () => {
            const data = { roomCode: 'room123' } as GameData;

            gateway.handleToggleDoor(adminClient, data);

            expect(playerMovementService.toggleDoor).not.toHaveBeenCalled();
        });
    });

    describe('handleEndGameWinVictories', () => {
        it('should not process CTF game mode', () => {
            const roomCode = 'room123';
            const winner = 'player1';

            gameRoomGateway.games.set(roomCode, {
                game: { gameMode: 'CTF' },
            } as any);

            gateway.handleEndGameWinVictories(adminClient, { roomCode, winner });

            expect(playingManagerService.endGameWinVictories).not.toHaveBeenCalled();
        });

        it('should process non-CTF game mode', () => {
            const roomCode = 'room123';
            const winner = 'player1';

            gameRoomGateway.games.set(roomCode, {
                game: { gameMode: 'Classique' },
            } as any);

            gateway.handleEndGameWinVictories(adminClient, { roomCode, winner });

            expect(playingManagerService.endGameWinVictories).toHaveBeenCalledWith(server, roomCode, winner);
            expect(playingManagerService.debugModeChanged).toHaveBeenCalledWith(server, roomCode, false);
            expect(timeService.stopTimer).toHaveBeenCalledWith(roomCode);
            expect(server.socketsLeave).toHaveBeenCalledWith(roomCode);
        });

        describe('handleToggleDoor', () => {
            it('should not process when gameData or tile is missing', () => {
                const data = { roomCode: 'room123' } as GameData;

                gateway.handleToggleDoor(adminClient, data);

                expect(playerMovementService.toggleDoor).not.toHaveBeenCalled();
            });

            it('should call toggleDoor and update door manipulation status', () => {
                const roomCode = 'room123';
                const tile = { position: { x: 5, y: 10 } };
                const data = { roomCode, tile } as GameData;
                const mockDoor = { coordinate: { x: 5, y: 10 }, isManipulated: false };

                const mockGameData = {
                    glocalStatistics: {
                        allDoors: [mockDoor],
                    },
                };
                gameRoomGateway.games.set(roomCode, mockGameData as any);

                jest.spyOn(gateway, 'calculateDoorManipulationPercentage').mockImplementation(() => 0);

                gateway.handleToggleDoor(adminClient, data);

                expect(playerMovementService.toggleDoor).toHaveBeenCalledWith(server, roomCode, tile);
                expect(mockDoor.isManipulated).toBe(true);
                expect(gateway.calculateDoorManipulationPercentage).toHaveBeenCalledWith(roomCode);
            });

            it('should not update door status if door is already manipulated', () => {
                const roomCode = 'room123';
                const tile = { position: { x: 5, y: 10 } };
                const data = { roomCode, tile } as GameData;
                const mockDoor = { coordinate: { x: 5, y: 10 }, isManipulated: true };

                const mockGameData = {
                    glocalStatistics: {
                        allDoors: [mockDoor],
                    },
                };
                gameRoomGateway.games.set(roomCode, mockGameData as any);

                jest.spyOn(gateway, 'calculateDoorManipulationPercentage').mockImplementation(() => 0);

                gateway.handleToggleDoor(adminClient, data);

                expect(playerMovementService.toggleDoor).toHaveBeenCalledWith(server, roomCode, tile);
                expect(mockDoor.isManipulated).toBe(true);
                expect(mockDoor.isManipulated).toBe(true);
                expect(gateway.calculateDoorManipulationPercentage).toHaveBeenCalledWith(roomCode);
            });

            it('should not modify any door status if no matching door is found', () => {
                const roomCode = 'room123';
                const tile = { position: { x: 99, y: 99 } };
                const data = { roomCode, tile } as GameData;
                const mockDoor = { coordinate: { x: 5, y: 10 }, isManipulated: false };

                const mockGameData = {
                    glocalStatistics: {
                        allDoors: [mockDoor],
                    },
                };
                gameRoomGateway.games.set(roomCode, mockGameData as any);

                jest.spyOn(gateway, 'calculateDoorManipulationPercentage').mockImplementation(() => 0);

                gateway.handleToggleDoor(adminClient, data);

                expect(playerMovementService.toggleDoor).toHaveBeenCalledWith(server, roomCode, tile);
                expect(mockDoor.isManipulated).toBe(false);
                expect(mockDoor.isManipulated).toBe(false);
                expect(gateway.calculateDoorManipulationPercentage).toHaveBeenCalledWith(roomCode);
            });

            describe('handleCombatUpdate', () => {
                it('should call playerMovementService.combatUpdate with correct parameters', () => {
                    const roomCode = 'room123';
                    const attacker = {
                        name: 'attacker',
                        health: 100,
                        life: 100,
                        speed: 5,
                        attack: '10',
                        defense: '5',
                        avatarUrl: '',
                        coordinate: { x: 0, y: 0 },
                        isAdmin: false,
                    } as Player;
                    const defender = {
                        name: 'defender',
                        health: 100,
                        life: 100,
                        speed: 5,
                        attack: '10',
                        defense: '5',
                        avatarUrl: '',
                        coordinate: { x: 0, y: 0 },
                        isAdmin: false,
                    } as Player;
                    const payload = { roomCode, attacker, defender };

                    gateway.handleCombatUpdate(adminClient, payload);

                    expect(combatService.combatUpdate).toHaveBeenCalledTimes(1);
                    expect(combatService.combatUpdate).toHaveBeenCalledWith(server, roomCode, attacker, defender);
                });

                describe('handleCombatEscaped', () => {
                    it('should call playerMovementService.combatEscaped with correct parameters', () => {
                        const roomCode = 'room123';
                        const escapee = 'player1';
                        const payload = { roomCode, escapee };

                        gateway.handleCombatEscaped(adminClient, payload);

                        expect(combatService.combatEscaped).toHaveBeenCalledTimes(1);
                        expect(combatService.combatEscaped).toHaveBeenCalledWith(server, roomCode, escapee);
                    });

                    describe('handleCombatEnded', () => {
                        it('should call playerMovementService.combatEnded with correct parameters', () => {
                            const roomCode = 'room123';
                            const winner = 'player1';
                            const loser = 'player2';
                            const payload = { roomCode, winner, loser };
                            const mockPlayer = { name: 'currentPlayer' } as Player;

                            timeService.gamesCounter.set(roomCode, 30);
                            playingManagerService.gamesPlayerTurn.set(roomCode, mockPlayer);

                            gateway.handleCombatEnded(adminClient, payload);

                            expect(combatService.combatEnded).toHaveBeenCalledTimes(1);
                            expect(combatService.combatEnded).toHaveBeenCalledWith(server, roomCode, winner, loser);
                        });

                        it('should start the timer with correct parameters after combat ends', () => {
                            const roomCode = 'room123';
                            const winner = 'player1';
                            const loser = 'player2';
                            const payload = { roomCode, winner, loser };
                            const mockPlayer = { name: 'currentPlayer' } as Player;
                            const mockTime = 30;

                            timeService.gamesCounter.set(roomCode, mockTime);
                            playingManagerService.gamesPlayerTurn.set(roomCode, mockPlayer);

                            gateway.handleCombatEnded(adminClient, payload);

                            expect(timeService.startTimer).toHaveBeenCalledTimes(1);
                            expect(timeService.startTimer).toHaveBeenCalledWith(mockTime, server, roomCode, mockPlayer);
                        });

                        describe('handlePlayerMoved', () => {
                            it('should call playerMovementService.playerMoved with correct parameters', () => {
                                const roomCode = 'room123';
                                const player = {
                                    name: 'testPlayer',
                                    health: 100,
                                    life: 100,
                                    speed: 5,
                                    attack: '10',
                                    defense: '5',
                                    avatarUrl: '',
                                    coordinate: { x: 0, y: 0 },
                                    isAdmin: false,
                                } as Player;
                                const nextPosition = { x: 1, y: 1 };
                                const payload = { roomCode, player, nextPosition };

                                gateway.handlePlayerMoved(adminClient, payload);

                                expect(playerMovementService.playerMoved).toHaveBeenCalledTimes(1);
                                expect(playerMovementService.playerMoved).toHaveBeenCalledWith(server, roomCode, player, nextPosition);
                            });

                            describe('handleDebugModeChange', () => {
                                it('should call playerMovementService.debugModeChanged with correct parameters', () => {
                                    const roomCode = 'room123';
                                    const isDebugMode = true;
                                    const data = { roomCode, isDebugMode };

                                    gateway.handleDebugModeChange(adminClient, data);

                                    expect(playingManagerService.debugModeChanged).toHaveBeenCalledTimes(1);
                                    expect(playingManagerService.debugModeChanged).toHaveBeenCalledWith(server, roomCode, isDebugMode);
                                });

                                it('should call playerMovementService.debugModeChanged with false parameter', () => {
                                    const roomCode = 'room123';
                                    const isDebugMode = false;
                                    const data = { roomCode, isDebugMode };

                                    gateway.handleDebugModeChange(adminClient, data);

                                    expect(playingManagerService.debugModeChanged).toHaveBeenCalledTimes(1);
                                    expect(playingManagerService.debugModeChanged).toHaveBeenCalledWith(server, roomCode, false);
                                });

                                describe('handleCombatRolls', () => {
                                    it('should call playerMovementService.combatRolls with correct parameters', () => {
                                        const roomCode = 'room123';
                                        const attackerBonus = 5;
                                        const defenderBonus = 3;
                                        const payload = { roomCode, attackerBonus, defenderBonus };

                                        gateway.handleCombatRolls(adminClient, payload);

                                        expect(combatService.combatRolls).toHaveBeenCalledTimes(1);
                                        expect(combatService.combatRolls).toHaveBeenCalledWith(server, roomCode, attackerBonus, defenderBonus);
                                    });

                                    it('should pass correct bonus values to playerMovementService.combatRolls', () => {
                                        const roomCode = 'room456';
                                        const attackerBonus = 10;
                                        const defenderBonus = 7;
                                        const payload = { roomCode, attackerBonus, defenderBonus };

                                        gateway.handleCombatRolls(adminClient, payload);

                                        expect(combatService.combatRolls).toHaveBeenCalledWith(server, roomCode, attackerBonus, defenderBonus);
                                    });

                                    describe('handleItemChoice', () => {
                                        it('should call playerMovementService.choseItem with correct parameters', () => {
                                            const roomCode = 'room123';
                                            const mockItem = {
                                                name: 'Potion',
                                                position: { x: 0, y: 0 },
                                                image: 'potion.png',
                                                id: 1,
                                                type: 'consumable',
                                                description: 'Restores health',
                                                isOutOfContainer: false,
                                            };
                                            const mockPosition = { x: 5, y: 7 };
                                            const data = { item: mockItem, playerPosition: mockPosition, roomCode };

                                            gateway.handleItemChoice(adminClient, data);

                                            expect(playerMovementService.choseItem).toHaveBeenCalledTimes(1);
                                            expect(playerMovementService.choseItem).toHaveBeenCalledWith(server, data);
                                        });

                                        it('should pass the complete data object to playerMovementService.choseItem', () => {
                                            const roomCode = 'room456';
                                            const mockItem = {
                                                name: 'Sword',
                                                position: { x: 0, y: 0 },
                                                image: 'sword.png',
                                                id: 2,
                                                type: 'weapon',
                                                description: 'Increases attack power',
                                                isOutOfContainer: false,
                                            };
                                            const mockPosition = { x: 10, y: 15 };
                                            const data = { item: mockItem, playerPosition: mockPosition, roomCode };

                                            gateway.handleItemChoice(adminClient, data);

                                            expect(playerMovementService.choseItem).toHaveBeenCalledWith(server, {
                                                item: mockItem,
                                                playerPosition: mockPosition,
                                                roomCode,
                                            });
                                        });

                                        describe('handleMovePlayer', () => {
                                            it('should call playerMovementService.animatePlayerMove with correct parameters', () => {
                                                const roomCode = 'room123';
                                                const path = [{ id: 1 }, { id: 2 }] as any;
                                                const player = {
                                                    name: 'testPlayer',
                                                    health: 100,
                                                    life: 100,
                                                    speed: 5,
                                                    attack: '10',
                                                    defense: '5',
                                                    avatarUrl: '',
                                                    coordinate: { x: 0, y: 0 },
                                                    isAdmin: false,
                                                } as Player;
                                                const mockGame = { id: 'game1', gameMode: 'Classique' };
                                                const data = { path, player, roomCode };

                                                gameRoomGateway.games.set(roomCode, { game: mockGame } as any);

                                                gateway.handleMovePlayer(adminClient, data);

                                                expect(playerMovementService.animatePlayerMove).toHaveBeenCalledTimes(1);
                                                expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(
                                                    server,
                                                    roomCode,
                                                    path,
                                                    player,
                                                    mockGame,
                                                );
                                            });
                                            it('should not call playerMovementService.animatePlayerMove when no game', () => {
                                                const roomCode = 'room123';
                                                const path = [{ id: 1 }, { id: 2 }] as any;
                                                const player = {
                                                    name: 'testPlayer',
                                                    health: 100,
                                                    life: 100,
                                                    speed: 5,
                                                    attack: '10',
                                                    defense: '5',
                                                    avatarUrl: '',
                                                    coordinate: { x: 0, y: 0 },
                                                    isAdmin: false,
                                                } as Player;
                                                const data = { path, player, roomCode };

                                                gameRoomGateway.games.set(roomCode, null);

                                                gateway.handleMovePlayer(adminClient, data);

                                                expect(playerMovementService.animatePlayerMove).not.toHaveBeenCalled();
                                            });

                                            it('should retrieve game information from gameRoomGateway.games', () => {
                                                const roomCode = 'room456';
                                                const path = [{ id: 3 }, { id: 4 }] as any;
                                                const player = {
                                                    name: 'testPlayer',
                                                    health: 100,
                                                    life: 100,
                                                    speed: 5,
                                                    attack: '10',
                                                    defense: '5',
                                                    avatarUrl: '',
                                                    coordinate: { x: 0, y: 0 },
                                                    isAdmin: false,
                                                } as Player;
                                                const mockGame = { id: 'game2', gameMode: 'CTF' };
                                                const data = { path, player, roomCode };

                                                gameRoomGateway.games.set(roomCode, { game: mockGame } as any);

                                                gateway.handleMovePlayer(adminClient, data);

                                                expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(
                                                    server,
                                                    roomCode,
                                                    path,
                                                    player,
                                                    mockGame,
                                                );
                                            });

                                            describe('handleInventoryUpdate', () => {
                                                it('should call playerMovementService.notifyInventoryUpdate with correct parameters', () => {
                                                    const roomCode = 'room123';
                                                    const player = {
                                                        name: 'testPlayer',
                                                        health: 100,
                                                        life: 100,
                                                        speed: 5,
                                                        attack: '10',
                                                        defense: '5',
                                                        avatarUrl: '',
                                                        coordinate: { x: 0, y: 0 },
                                                        isAdmin: false,
                                                        inventory: [
                                                            {
                                                                id: 1,
                                                                name: 'Potion',
                                                                position: { x: 0, y: 0 },
                                                                image: 'potion.png',
                                                                type: 'consumable',
                                                                description: 'A potion',
                                                                isOutOfContainer: false,
                                                            },
                                                        ],
                                                    } as Player;
                                                    const data = { roomCode, player };

                                                    gateway.handleInventoryUpdate(adminClient, data);

                                                    expect(playerMovementService.notifyInventoryUpdate).toHaveBeenCalledTimes(1);
                                                    expect(playerMovementService.notifyInventoryUpdate).toHaveBeenCalledWith(
                                                        server,
                                                        roomCode,
                                                        player,
                                                    );
                                                });

                                                it('should pass the correct server instance to playerMovementService.notifyInventoryUpdate', () => {
                                                    const roomCode = 'room456';
                                                    const player = {
                                                        name: 'anotherPlayer',
                                                        health: 90,
                                                        life: 100,
                                                        speed: 6,
                                                        attack: '12',
                                                        defense: '8',
                                                        avatarUrl: 'avatar.png',
                                                        coordinate: { x: 5, y: 5 },
                                                        isAdmin: true,
                                                        inventory: [
                                                            {
                                                                id: 2,
                                                                name: 'Sword',
                                                                position: { x: 0, y: 0 },
                                                                image: 'sword.png',
                                                                type: 'weapon',
                                                                description: 'A weapon',
                                                                isOutOfContainer: false,
                                                            },
                                                        ],
                                                    } as Player;
                                                    const data = { roomCode, player };

                                                    gateway.handleInventoryUpdate(adminClient, data);

                                                    expect(playerMovementService.notifyInventoryUpdate).toHaveBeenCalledWith(
                                                        server,
                                                        roomCode,
                                                        player,
                                                    );
                                                });

                                                describe('handleQuitGame', () => {
                                                    it('should call playerMovementService.quitGame with correct parameters', () => {
                                                        const roomCode = 'room123';
                                                        const player = { name: 'player1' } as Player;
                                                        const map = [{ id: 1 }] as any;
                                                        const data = { roomCode, player, map } as GameData;

                                                        gateway.handleQuitGame(adminClient, data);

                                                        expect(playingManagerService.quitGame).toHaveBeenCalledTimes(1);
                                                        expect(playingManagerService.quitGame).toHaveBeenCalledWith(
                                                            server,
                                                            roomCode,
                                                            player,
                                                            map,
                                                            gameRoomGateway.games,
                                                        );
                                                    });

                                                    it('should disable debug mode and make all sockets leave when quitting player is current turn player but last player', () => {
                                                        const roomCode = 'room123';
                                                        const player = { name: 'currentPlayer' } as Player;
                                                        const map = [{ id: 1 }] as any;
                                                        const data = { roomCode, player, map } as GameData;

                                                        playingManagerService.gamesPlayerTurn.set(roomCode, player);
                                                        playingManagerService.gamesPlayers.set(roomCode, [player]);

                                                        gateway.handleQuitGame(adminClient, data);

                                                        expect(turnService.endTurn).not.toHaveBeenCalled();
                                                        expect(adminClient.leave).not.toHaveBeenCalled();
                                                        expect(playingManagerService.debugModeChanged).toHaveBeenCalledWith(server, roomCode, false);
                                                        expect(server.socketsLeave).toHaveBeenCalledWith(roomCode);
                                                    });

                                                    describe('handleEndTurn', () => {
                                                        it('should call turnService.endTurn with correct parameters', () => {
                                                            const roomCode = 'room123';
                                                            const data = { roomCode } as GameData;

                                                            gateway.handleEndTurn(adminClient, data);

                                                            expect(turnService.endTurn).toHaveBeenCalledWith(server, roomCode);
                                                        });

                                                        it('should stop the timer for the room', () => {
                                                            const roomCode = 'room456';
                                                            const data = { roomCode } as GameData;

                                                            gateway.handleEndTurn(adminClient, data);

                                                            expect(timeService.stopTimer).toHaveBeenCalledWith(roomCode);
                                                        });

                                                        it('should restart the timer with the next player', () => {
                                                            const roomCode = 'room789';
                                                            const data = { roomCode } as GameData;
                                                            const nextPlayer = { name: 'nextPlayer' } as Player;

                                                            playingManagerService.gamesPlayerTurn.set(roomCode, nextPlayer);

                                                            gateway.handleEndTurn(adminClient, data);

                                                            expect(timeService.startTimer).toHaveBeenCalledWith(
                                                                TIME_BEFORE_TURN,
                                                                server,
                                                                roomCode,
                                                                nextPlayer,
                                                            );
                                                        });

                                                        it('should handle the complete turn cycle', () => {
                                                            const roomCode = 'roomComplete';
                                                            const data = { roomCode } as GameData;
                                                            const nextPlayer = {
                                                                name: 'nextPlayer',
                                                                health: 100,
                                                                life: 100,
                                                                speed: 5,
                                                                attack: '10',
                                                                defense: '5',
                                                                avatarUrl: '',
                                                                coordinate: { x: 0, y: 0 },
                                                                isAdmin: false,
                                                            } as Player;

                                                            playingManagerService.gamesPlayerTurn.set(roomCode, nextPlayer);

                                                            gateway.handleEndTurn(adminClient, data);

                                                            expect(turnService.endTurn).toHaveBeenCalledWith(server, roomCode);
                                                            expect(timeService.stopTimer).toHaveBeenCalledWith(roomCode);
                                                            expect(timeService.startTimer).toHaveBeenCalledWith(
                                                                TIME_BEFORE_TURN,
                                                                server,
                                                                roomCode,
                                                                nextPlayer,
                                                            );
                                                        });

                                                        describe('calculateDoorManipulationPercentage', () => {
                                                            it('should return 0 if gameData is not found for the room', () => {
                                                                const roomCode = 'nonExistingRoom';

                                                                const percentage = gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(percentage).toBe(0);
                                                            });

                                                            it('should return 0 if gameData.glocalStatistics is not defined', () => {
                                                                const roomCode = 'roomWithoutStats';
                                                                gameRoomGateway.games.set(roomCode, {} as any);

                                                                const percentage = gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(percentage).toBe(0);
                                                            });

                                                            it('should return 0 if there are no doors', () => {
                                                                const roomCode = 'emptyDoorsRoom';
                                                                gameRoomGateway.games.set(roomCode, {
                                                                    glocalStatistics: {
                                                                        allDoors: [],
                                                                    },
                                                                } as any);

                                                                const percentage = gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(percentage).toBe(0);
                                                            });

                                                            it('should calculate correct percentage when some doors are manipulated', () => {
                                                                const roomCode = 'roomWithDoors';
                                                                const mockDoors = [
                                                                    { coordinate: { x: 1, y: 1 }, isManipulated: true },
                                                                    { coordinate: { x: 2, y: 2 }, isManipulated: false },
                                                                    { coordinate: { x: 3, y: 3 }, isManipulated: true },
                                                                    { coordinate: { x: 4, y: 4 }, isManipulated: false },
                                                                ];

                                                                gameRoomGateway.games.set(roomCode, {
                                                                    glocalStatistics: {
                                                                        allDoors: mockDoors,
                                                                    },
                                                                } as any);

                                                                const percentage = gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(percentage).toBe(50);
                                                            });

                                                            it('should calculate 100% when all doors are manipulated', () => {
                                                                const roomCode = 'allDoorsManipulatedRoom';
                                                                const mockDoors = [
                                                                    { coordinate: { x: 1, y: 1 }, isManipulated: true },
                                                                    { coordinate: { x: 2, y: 2 }, isManipulated: true },
                                                                    { coordinate: { x: 3, y: 3 }, isManipulated: true },
                                                                ];

                                                                gameRoomGateway.games.set(roomCode, {
                                                                    glocalStatistics: {
                                                                        allDoors: mockDoors,
                                                                    },
                                                                } as any);

                                                                const percentage = gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(percentage).toBe(100);
                                                            });

                                                            it('should update the percentageOfDors property in gameData', () => {
                                                                const roomCode = 'updatePercentageRoom';
                                                                const mockDoors = [
                                                                    { coordinate: { x: 1, y: 1 }, isManipulated: true },
                                                                    { coordinate: { x: 2, y: 2 }, isManipulated: false },
                                                                    { coordinate: { x: 3, y: 3 }, isManipulated: false },
                                                                ];

                                                                const mockGameData = {
                                                                    glocalStatistics: {
                                                                        allDoors: mockDoors,
                                                                        percentageOfDors: 0,
                                                                    },
                                                                };

                                                                gameRoomGateway.games.set(roomCode, mockGameData as any);

                                                                gateway.calculateDoorManipulationPercentage(roomCode);

                                                                expect(mockGameData.glocalStatistics.percentageOfDors).toBe(33.33333333333333);
                                                                expect(mockGameData.glocalStatistics.percentageOfDors).toBe(33.33333333333333);
                                                            });

                                                            describe('emitVirtualPlayer', () => {
                                                                it('should emit a virtual player to all clients with correct event and payload', () => {
                                                                    const roomCode = 'room123';
                                                                    const virtualPlayer = {
                                                                        name: 'virtualPlayer',
                                                                        health: 100,
                                                                        life: 100,
                                                                        speed: 5,
                                                                        attack: '10',
                                                                        defense: '5',
                                                                        avatarUrl: 'avatar.png',
                                                                        coordinate: { x: 0, y: 0 },
                                                                        isAdmin: false,
                                                                    } as Player;

                                                                    gateway.emitVirtualPlayer(roomCode, virtualPlayer);

                                                                    expect(server.emit).toHaveBeenCalledTimes(1);
                                                                    expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.EmitVirtualPlayer, {
                                                                        codeRoom: roomCode,
                                                                        currentPlayer: virtualPlayer,
                                                                    });
                                                                });

                                                                it('should pass different virtual player data correctly to server.emit', () => {
                                                                    const roomCode = 'room456';
                                                                    const virtualPlayer = {
                                                                        name: 'botPlayer',
                                                                        health: 80,
                                                                        life: 90,
                                                                        speed: 3,
                                                                        attack: '8',
                                                                        defense: '7',
                                                                        avatarUrl: 'bot.png',
                                                                        coordinate: { x: 5, y: 10 },
                                                                        isAdmin: true,
                                                                    } as Player;

                                                                    gateway.emitVirtualPlayer(roomCode, virtualPlayer);

                                                                    expect(server.emit).toHaveBeenCalledWith(SocketWaitRoomLabels.EmitVirtualPlayer, {
                                                                        codeRoom: roomCode,
                                                                        currentPlayer: virtualPlayer,
                                                                    });
                                                                });

                                                                describe('vitualPlayerAnimate', () => {
                                                                    it('should call playerMovementService.animatePlayerMove with correct parameters', () => {
                                                                        const roomCode = 'room123';
                                                                        const path = [{ id: 1 }, { id: 2 }] as any;
                                                                        const player = {
                                                                            name: 'virtualPlayer',
                                                                            health: 100,
                                                                            life: 100,
                                                                            speed: 5,
                                                                            attack: '10',
                                                                            defense: '5',
                                                                            avatarUrl: '',
                                                                            coordinate: { x: 0, y: 0 },
                                                                            isAdmin: false,
                                                                        } as Player;
                                                                        const mockGame = { id: 'game1', gameMode: 'Classique' };

                                                                        gameRoomGateway.games.set(roomCode, { game: mockGame } as any);

                                                                        gateway.vitualPlayerAnimate(roomCode, path, player);

                                                                        expect(playerMovementService.animatePlayerMove).toHaveBeenCalledTimes(1);
                                                                        expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(
                                                                            server,
                                                                            roomCode,
                                                                            path,
                                                                            player,
                                                                            mockGame,
                                                                        );
                                                                    });

                                                                    it('should retrieve the game from gameRoomGateway.games using the room code', () => {
                                                                        const roomCode = 'room456';
                                                                        const path = [{ id: 3 }, { id: 4 }] as any;
                                                                        const player = {
                                                                            name: 'virtualBot',
                                                                            health: 90,
                                                                            life: 90,
                                                                            speed: 4,
                                                                            attack: '8',
                                                                            defense: '7',
                                                                            avatarUrl: 'bot.png',
                                                                            coordinate: { x: 5, y: 5 },
                                                                            isAdmin: false,
                                                                        } as Player;
                                                                        const mockGame = { id: 'game2', gameMode: 'CTF' };

                                                                        gameRoomGateway.games.set(roomCode, { game: mockGame } as any);

                                                                        gateway.vitualPlayerAnimate(roomCode, path, player);

                                                                        expect(playerMovementService.animatePlayerMove).toHaveBeenCalledWith(
                                                                            server,
                                                                            roomCode,
                                                                            path,
                                                                            player,
                                                                            mockGame,
                                                                        );
                                                                    });

                                                                    describe('handleToggleDoor', () => {
                                                                        it('should handle case when no door matches the tile position', () => {
                                                                            const roomCode = 'room123';
                                                                            const tile = { position: { x: 8, y: 8 } };
                                                                            const data = { roomCode, tile } as GameData;
                                                                            const mockDoors = [
                                                                                { coordinate: { x: 5, y: 10 }, isManipulated: false },
                                                                                { coordinate: { x: 10, y: 5 }, isManipulated: false },
                                                                            ];

                                                                            const mockGameData = {
                                                                                glocalStatistics: {
                                                                                    allDoors: mockDoors,
                                                                                    percentageOfDors: 0,
                                                                                },
                                                                            };
                                                                            gameRoomGateway.games.set(roomCode, mockGameData as any);

                                                                            jest.spyOn(
                                                                                gateway,
                                                                                'calculateDoorManipulationPercentage',
                                                                            ).mockImplementation(() => 0);

                                                                            gateway.handleToggleDoor(adminClient, data);

                                                                            expect(playerMovementService.toggleDoor).toHaveBeenCalledWith(
                                                                                server,
                                                                                roomCode,
                                                                                tile,
                                                                            );

                                                                            expect(mockDoors[0].isManipulated).toBe(false);
                                                                            expect(mockDoors[1].isManipulated).toBe(false);

                                                                            expect(gateway.calculateDoorManipulationPercentage).toHaveBeenCalledWith(
                                                                                roomCode,
                                                                            );
                                                                        });
                                                                    });
                                                                });
                                                                describe('handleCurrentPlayerQuit', () => {
                                                                    let clientMock: jest.Mocked<Socket>;
                                                                    let data: GameData;

                                                                    beforeEach(() => {
                                                                        clientMock = {
                                                                            leave: jest.fn(),
                                                                        } as any as jest.Mocked<Socket>;

                                                                        data = {
                                                                            roomCode: 'room123',
                                                                            player: { name: 'currentPlayer' } as Player,
                                                                        } as GameData;

                                                                        playingManagerService.gamesPlayerTurn.set(data.roomCode, {
                                                                            name: 'currentPlayer',
                                                                        } as Player);
                                                                        playingManagerService.gamesPlayers.set(data.roomCode, [
                                                                            { name: 'currentPlayer' } as Player,
                                                                            { name: 'otherPlayer' } as Player,
                                                                        ]);
                                                                    });

                                                                    it('should make the client leave the room and return true if the current player is the one quitting and there are more than one player', () => {
                                                                        const result = (gateway as any).handleCurrentPlayerQuit(clientMock, data);

                                                                        expect(clientMock.leave).toHaveBeenCalledWith(data.roomCode);
                                                                        expect(result).toBe(true);
                                                                    });

                                                                    it('should restart the timer and return true if the quitting player is not the current turn player but there are more than one player', () => {
                                                                        playingManagerService.gamesPlayerTurn.set(data.roomCode, {
                                                                            name: 'otherPlayer',
                                                                        } as Player);

                                                                        jest.spyOn(gateway as any, 'restartTimerAfterCombat').mockImplementation(
                                                                            jest.fn(),
                                                                        );

                                                                        const result = (gateway as any).handleCurrentPlayerQuit(clientMock, data);

                                                                        expect(clientMock.leave).not.toHaveBeenCalled();
                                                                        expect((gateway as any).restartTimerAfterCombat).toHaveBeenCalledWith(
                                                                            data.roomCode,
                                                                        );
                                                                        expect(result).toBe(true);
                                                                    });

                                                                    it('should return false if there is only one player left in the room', () => {
                                                                        playingManagerService.gamesPlayers.set(data.roomCode, [
                                                                            { name: 'currentPlayer' } as Player,
                                                                        ]);

                                                                        const result = (gateway as any).handleCurrentPlayerQuit(clientMock, data);

                                                                        expect(clientMock.leave).not.toHaveBeenCalled();
                                                                        expect(result).toBe(false);
                                                                    });

                                                                    it('should return false if the room does not exist in gamesPlayerTurn or gamesPlayers', () => {
                                                                        playingManagerService.gamesPlayerTurn.delete(data.roomCode);
                                                                        playingManagerService.gamesPlayers.delete(data.roomCode);

                                                                        const result = (gateway as any).handleCurrentPlayerQuit(clientMock, data);

                                                                        expect(clientMock.leave).not.toHaveBeenCalled();
                                                                        expect(result).toBe(false);
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
