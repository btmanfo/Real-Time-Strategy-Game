/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { ActionService } from '@app/services/action-service/action.service';
import { BoardService } from '@app/services/board-service/board.service';
import { GameService } from '@app/services/game-service/game.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Game, Item, Player, Tile } from '@common/interfaces';
import { PlayingGridService } from './playing-grid.service';

describe('PlayingGridService', () => {
    let service: PlayingGridService;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let actionServiceSpy: jasmine.SpyObj<ActionService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;

    beforeEach(() => {
        playingServiceSpy = jasmine.createSpyObj('PlayingService', [
            'isPlaying',
            'myPlayer',
            'startFight',
            'currentMovingPoints',
            'emitAnimation',
            'setCostTiles',
            'toggleDoor',
            'teleportPlayer',
            'joinGameService',
            'canAction',
            'isDebugMode',
            'gameService',
        ]);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['getNewGame']);
        gameServiceSpy.getNewGame.and.returnValue({ gameMode: 'Classique' } as Game);
        Object.defineProperty(playingServiceSpy, 'gameServiceValue', {
            get: () => gameServiceSpy,
        });
        actionServiceSpy = jasmine.createSpyObj('ActionService', [
            'checkSurroundingTiles',
            'checkEndTurn',
            'emitStartFight',
            'actionPlayer',
            'activateAction',
            'emitToggleDoor',
            'canAction',
        ]);
        actionServiceSpy.canAction = 0;
        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['errorMessages', 'showModal']);
        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', [
            'getNeighbors',
            'getAccessibleTiles',
            'getPlayerTile',
            'setReachableForTiles',
            'findShortestPath',
            'emitAnimation',
            'animatePlayerMovement',
        ]);
        boardServiceSpy = jasmine.createSpyObj('BoardService', ['tiles']);

        TestBed.configureTestingModule({
            providers: [
                PlayingGridService,
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: ActionService, useValue: actionServiceSpy },
            ],
        });

        service = TestBed.inject(PlayingGridService);

        playingServiceSpy.isPlaying = true;
        playingServiceSpy.localPlayer = {
            name: 'Player1',
            life: 100,
            speed: 10,
            attack: '20',
            defense: '15',
            coordinate: { x: 1, y: 1 },
            avatarUrl: '',
            isAdmin: false,
        } as Player;
        playingServiceSpy.playerTurn = structuredClone(playingServiceSpy.localPlayer);
        notificationServiceSpy.errorMessages = [];
        notificationServiceSpy.showModal = false;
        playingServiceSpy.currentMovingPoints = 4;
    });

    describe('toggleDoorAction', () => {
        let tile: Tile;
        let event: MouseEvent;

        beforeEach(() => {
            tile = { position: { x: 2, y: 2 }, image: './assets/images/Porte-ferme.png' } as Tile;
            event = { button: 0 } as MouseEvent;
            actionServiceSpy.canAction = 1;
            boardServiceSpy.tiles = [{ player: playingServiceSpy.localPlayer, position: { x: 1, y: 1 } } as Tile];
            movingGameServiceSpy.getNeighbors.and.returnValue([{ position: { x: 2, y: 2 } } as Tile]);
            Object.defineProperty(playingServiceSpy, 'joinGameService', {
                value: { socket: { emit: jasmine.createSpy() }, pinCode: '1234' },
                writable: false,
            });
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 2, y: 2 } } as Tile]);
        });

        it('should return if game is not playing', () => {
            playingServiceSpy.isPlaying = false;
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if tile has a player', () => {
            tile.player = { name: 'Player2' } as Player;
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if event button is not 0', () => {
            event = { button: 1 } as MouseEvent;
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if myPlayer is null', () => {
            playingServiceSpy.localPlayer = null;
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if tile image is not a door', () => {
            tile.image = './assets/images/autre.png';
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if canAction is not 1', () => {
            actionServiceSpy.canAction = 0;
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
        });

        it('should return if tile is not a neighbor', () => {
            movingGameServiceSpy.getNeighbors.and.returnValue([{ position: { x: 3, y: 3 } } as Tile]);
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).not.toHaveBeenCalled();
            expect(actionServiceSpy.canAction).toBe(0);
        });

        it('should toggle door and emit endTurn if no accessible tiles left', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([]);
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).toHaveBeenCalled();
            expect(playingServiceSpy.joinGameService.socket.emit).toHaveBeenCalledWith('endTurn', { roomCode: '1234' });
        });

        it('should set reachable tiles if it is the players turn and not in debug mode', () => {
            playingServiceSpy.isDebugMode = false;
            service.toggleDoorAction(event, tile);
            expect(movingGameServiceSpy.setReachableForTiles).toHaveBeenCalled();
        });

        it('should not set reachable tiles if it is not the players turn', () => {
            playingServiceSpy.playerTurn = { name: 'Player2' } as Player;
            service.toggleDoorAction(event, tile);
            expect(movingGameServiceSpy.setReachableForTiles).not.toHaveBeenCalled();
        });

        it('should toggle door and update tile image', () => {
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).toHaveBeenCalled();
            expect(tile.image).toBe('./assets/images/Porte.png');
        });

        it('should toggle door and update tile image back to closed', () => {
            tile.image = './assets/images/Porte.png';
            service.toggleDoorAction(event, tile);
            expect(actionServiceSpy.emitToggleDoor).toHaveBeenCalled();
            expect(tile.image).toBe('./assets/images/Porte-ferme.png');
        });

        it('should toggle door cost from 1 to -1', () => {
            tile = { position: { x: 2, y: 2 }, image: './assets/images/Porte-ferme.png', cost: 1 } as Tile;
            service.toggleDoorAction(event, tile);
            expect(tile.cost).toBe(1);
        });

        it('should toggle door cost from -1 to 1', () => {
            tile = { position: { x: 2, y: 2 }, image: './assets/images/Porte.png', cost: -1 } as Tile;
            service.toggleDoorAction(event, tile);
            expect(tile.cost).toBe(-1);
        });

        it('should toggle door cost temporary from 1 to -1 then back to 1', () => {
            tile = { position: { x: 2, y: 2 }, image: './assets/images/Porte-ferme.png', cost: 1 } as Tile;

            actionServiceSpy.emitToggleDoor.and.callFake((t: Tile) => {
                expect(t.cost).toBe(-1);
            });

            service.toggleDoorAction(event, tile);

            expect(tile.cost).toBe(1);
            expect(actionServiceSpy.emitToggleDoor).toHaveBeenCalled();
        });

        it('should toggle door cost temporary from -1 to 1 then back to -1', () => {
            tile = { position: { x: 2, y: 2 }, image: './assets/images/Porte.png', cost: -1 } as Tile;

            actionServiceSpy.emitToggleDoor.and.callFake((t: Tile) => {
                expect(t.cost).toBe(1);
            });

            service.toggleDoorAction(event, tile);

            expect(tile.cost).toBe(-1);
            expect(actionServiceSpy.emitToggleDoor).toHaveBeenCalled();
        });
    });

    describe('chooseTileForMove', () => {
        let tile: Tile;
        let event: MouseEvent;

        beforeEach(() => {
            tile = { position: { x: 2, y: 2 }, isReachable: true } as Tile;
            event = { button: 0 } as MouseEvent;
            movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 }, cost: 0 } as Tile);
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([{ position: { x: 2, y: 2 }, cost: 1 } as Tile]);
            movingGameServiceSpy.findShortestPath.and.returnValue([
                { position: { x: 1, y: 1 }, cost: 0 },
                { position: { x: 2, y: 2 }, cost: 1 },
            ] as Tile[]);
        });

        it('should not do anything if game not ongoing', () => {
            playingServiceSpy.isPlaying = false;
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should not move if myPlayer does not exist', () => {
            playingServiceSpy.localPlayer = null;
            playingServiceSpy.playerTurn = null;
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should not do anything if its not the player turn', () => {
            playingServiceSpy.playerTurn = { name: 'Player2' } as Player;
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should do nothing if the mouse button is not the left button', () => {
            event = new MouseEvent(event.type, { button: 1 });
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should do nothing if the tile is not reachable', () => {
            tile.isReachable = false;
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should do nothing if movement points are insufficient', () => {
            playingServiceSpy.currentMovingPoints = 0;
            tile.type = 'NOT_ICE';
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should call emitAnimation with the appropriate path', () => {
            movingGameServiceSpy.getAccessibleTiles.and.returnValue([
                { position: { x: 2, y: 2 }, cost: 1 },
                { position: { x: 3, y: 3 }, cost: 1 },
            ] as Tile[]);
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.animatePlayerMovement).toHaveBeenCalled();
        });

        it('should not start fight if an action has already been done', () => {
            tile.player = { name: 'Player2' } as Player;
            playingServiceSpy.localPlayer = { name: 'Player1' } as Player;
            actionServiceSpy.canAction = 2;
            service.chooseTileForMove(event, tile);
            expect(actionServiceSpy.emitStartFight).not.toHaveBeenCalled();
        });

        it('should start fight if the player is on a neighbor tile', () => {
            tile.player = { name: 'Player2' } as Player;
            actionServiceSpy.canAction = 1;
            playingServiceSpy.localPlayer = { name: 'Player1', coordinate: { x: 2, y: 1 } } as Player;
            movingGameServiceSpy.getNeighbors.and.returnValue([{ position: { x: 2, y: 1 } } as Tile]);
            service.chooseTileForMove(event, tile);
            expect(actionServiceSpy.emitStartFight).toHaveBeenCalled();
            expect(actionServiceSpy.canAction).toBe(2);
        });

        it('should not move if the player is already on the tile', () => {
            movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 2, y: 2 }, cost: 0 } as Tile);
            service.chooseTileForMove(event, tile);
            expect(movingGameServiceSpy.emitAnimation).not.toHaveBeenCalled();
        });

        it('should handle team checks in CTF mode', () => {
            gameServiceSpy.getNewGame.and.returnValue({ gameMode: 'CTF' } as Game);

            tile.player = { name: 'Enemy', team: 'red' } as Player;
            playingServiceSpy.localPlayer = {
                name: 'Player1',
                coordinate: { x: 1, y: 1 },
                team: 'blue',
            } as Player;

            actionServiceSpy.canAction = 1;
            movingGameServiceSpy.getNeighbors.and.returnValue([
                { position: { x: playingServiceSpy.localPlayer.coordinate.x, y: playingServiceSpy.localPlayer.coordinate.y } } as Tile,
            ]);

            service.chooseTileForMove(event, tile);

            expect(actionServiceSpy.emitStartFight).toHaveBeenCalled();
        });

        it('should not start fight for same team in CTF mode', () => {
            gameServiceSpy.getNewGame.and.returnValue({ gameMode: 'CTF' } as Game);

            tile.player = { name: 'Teammate', team: 'blue' } as Player;
            playingServiceSpy.localPlayer = {
                name: 'Player1',
                coordinate: { x: 1, y: 1 },
                team: 'blue',
            } as Player;

            actionServiceSpy.canAction = 1;
            movingGameServiceSpy.getNeighbors.and.returnValue([
                { position: { x: playingServiceSpy.localPlayer.coordinate.x, y: playingServiceSpy.localPlayer.coordinate.y } } as Tile,
            ]);

            service.chooseTileForMove(event, tile);

            expect(actionServiceSpy.emitStartFight).not.toHaveBeenCalled();
        });
    });

    describe('showInformation', () => {
        let tile: Tile;
        let event: MouseEvent;

        beforeEach(() => {
            tile = { type: 'Base', cost: 1 } as Tile;
            event = { button: 2 } as MouseEvent;
            playingServiceSpy.isPlaying = true;
            playingServiceSpy.isDebugMode = false;
            notificationServiceSpy.errorMessages = [];
        });

        it('should do nothing if the game is not running', () => {
            playingServiceSpy.isPlaying = false;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toEqual([]);
        });

        it('should do nothing if the mouse button is not the right button', () => {
            event = new MouseEvent(event.type, { button: 0 });
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toEqual([]);
        });

        it('should display basic tile information', () => {
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Type de tuile: Base, Coût: 1');
            expect(notificationServiceSpy.errorMessages).toContain('Description de tuile: Tuile de base');
            expect(notificationServiceSpy.showModal).toBeTrue();
        });

        it('should display item information if an item is present', () => {
            tile.item = { name: 'Potion', description: 'Donne de la vie' } as Item;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Item: Potion, Donne de la vie');
        });

        it('should display player information if a player is present', () => {
            tile.player = { name: 'Player2', avatarUrl: '/assets/avatars/player2/avatar.png' } as Player;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Joueur: Player2, Avatar: player2');
        });

        it('should use teleportPlayer in debug mode', () => {
            playingServiceSpy.isDebugMode = true;
            service.showInformation(event, tile);
            expect(playingServiceSpy.teleportPlayer).toHaveBeenCalledWith(tile);
            expect(notificationServiceSpy.errorMessages).toEqual([]);
            expect(notificationServiceSpy.showModal).toBeFalse();
        });

        it('should display "Base" if type is ""', () => {
            tile.type = '';
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Type de tuile: base, Coût: 1');
            expect(notificationServiceSpy.errorMessages).toContain('Description de tuile: tuile de base sans effet');
        });

        it('should extract the folder name from the avatarUrl', () => {
            tile.player = { name: 'Player3', avatarUrl: '/assets/avatars/player3/avatar.png' } as Player;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Joueur: Player3, Avatar: player3');
        });

        it('should display "Impossible de traverser" for tiles with cost -1', () => {
            tile = { type: 'Base', cost: -1 } as Tile;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Type de tuile: Base, Coût: Impossible de traverser');
        });

        it('should handle null or undefined tile type', () => {
            tile = { cost: 1 } as Tile;
            service.showInformation(event, tile);
            expect(notificationServiceSpy.errorMessages).toContain('Type de tuile: base, Coût: 1');
        });
    });

    describe('highlightTile', () => {
        let event: MouseEvent;
        let tile: Tile;
        const player: Player = {
            name: 'Player1',
            life: 100,
            speed: 10,
            attack: '20',
            defense: '15',
            coordinate: { x: 1, y: 1 },
            avatarUrl: '',
            isAdmin: false,
        } as Player;
        let boardTiles: Tile[];

        beforeEach(() => {
            event = {} as MouseEvent;
            tile = { position: { x: 2, y: 2 }, isReachable: true } as Tile;
            boardTiles = [
                { position: { x: 1, y: 1 }, isReachable: true } as Tile,
                { position: { x: 2, y: 2 }, isReachable: true } as Tile,
                { position: { x: 3, y: 3 }, isReachable: true } as Tile,
            ];
            boardServiceSpy.tiles = boardTiles;
            playingServiceSpy.localPlayer = player;
        });

        it('should do nothing if game is not playing', () => {
            playingServiceSpy.isPlaying = false;
            service.highlightTile(event, tile);
            expect(boardServiceSpy.tiles).toEqual(boardTiles);
        });

        it('should do nothing if myPlayer is null', () => {
            playingServiceSpy.localPlayer = null;
            service.highlightTile(event, tile);
            expect(boardServiceSpy.tiles).toEqual(boardTiles);
        });

        it('should highlight tiles in the shortest path', () => {
            const path = [{ position: { x: 1, y: 1 } } as Tile, { position: { x: 2, y: 2 } } as Tile];
            movingGameServiceSpy.findShortestPath.and.returnValue(path);
            service.highlightTile(event, tile);
            expect(boardServiceSpy.tiles[0].isHighlighted).toBeTrue();
            expect(boardServiceSpy.tiles[1].isHighlighted).toBeTrue();
            expect(boardServiceSpy.tiles[2].isHighlighted).toBeFalse();
        });

        it('should not highlight tiles if the tile is not reachable', () => {
            const path = [{ position: { x: 1, y: 1 } } as Tile, { position: { x: 2, y: 2 } } as Tile];
            movingGameServiceSpy.findShortestPath.and.returnValue(path);
            tile.isReachable = false;
            service.highlightTile(event, tile);
            expect(boardServiceSpy.tiles[0].isHighlighted).toBeFalse();
            expect(boardServiceSpy.tiles[1].isHighlighted).toBeFalse();
            expect(boardServiceSpy.tiles[2].isHighlighted).toBeFalse();
        });
    });

    describe('movePlayer', () => {
        let tile: Tile;

        beforeEach(() => {
            tile = { position: { x: 2, y: 2 }, isReachable: true } as Tile;
            movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 }, cost: 0 } as Tile);
            movingGameServiceSpy.findShortestPath.and.returnValue([
                { position: { x: 1, y: 1 }, cost: 0 },
                { position: { x: 2, y: 2 }, cost: 1 },
            ] as Tile[]);
            playingServiceSpy.localPlayer = {
                name: 'Player1',
                coordinate: { x: 1, y: 1 },
                avatarUrl: 'player1.png',
            } as Player;
        });

        it('should return early if player is already on the target tile', () => {
            const samePositionTile = { position: { x: 1, y: 1 }, isReachable: true } as Tile;
            movingGameServiceSpy.getPlayerTile.and.returnValue(samePositionTile);

            (service as any).movePlayer(samePositionTile);

            expect(movingGameServiceSpy.animatePlayerMovement).not.toHaveBeenCalled();
        });

        it('should return early if localPlayer is null', () => {
            playingServiceSpy.localPlayer = null;

            (service as any).movePlayer(tile);

            expect(movingGameServiceSpy.animatePlayerMovement).not.toHaveBeenCalled();
        });

        it('should reduce moving points by the path cost', () => {
            const initialPoints = 10;
            playingServiceSpy.currentMovingPoints = initialPoints;

            movingGameServiceSpy.findShortestPath.and.returnValue([
                { position: { x: 1, y: 1 }, cost: 0 },
                { position: { x: 2, y: 2 }, cost: 1 },
            ] as Tile[]);

            (service as any).movePlayer(tile);

            expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 1);
        });

        it('should call animatePlayerMovement with the path and player', () => {
            const path = [
                { position: { x: 1, y: 1 }, cost: 0 },
                { position: { x: 2, y: 2 }, cost: 1 },
            ] as Tile[];

            movingGameServiceSpy.findShortestPath.and.returnValue(path);

            const localPlayer = playingServiceSpy.localPlayer as Player;

            (service as any).movePlayer(tile);

            expect(movingGameServiceSpy.animatePlayerMovement).toHaveBeenCalledWith(path, localPlayer);
        });

        it('should clear reachable tiles before animation', () => {
            (service as any).movePlayer(tile);

            expect(movingGameServiceSpy.setReachableForTiles).toHaveBeenCalledWith([]);
        });

        it('should handle undefined costs in path gracefully in movePlayer', () => {
            const path = [{ position: { x: 1, y: 1 } } as Tile, { position: { x: 2, y: 2 }, cost: 2 } as Tile];

            movingGameServiceSpy.findShortestPath.and.returnValue(path);
            movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 } } as Tile);

            const initialPoints = 10;
            playingServiceSpy.currentMovingPoints = initialPoints;

            (service as any).movePlayer(tile);

            expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 2);
        });

        it('should handle undefined oldTile when calculating move cost in movePlayer', () => {
            movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
            const path = [
                { position: { x: 1, y: 1 }, cost: 1 },
                { position: { x: 2, y: 2 }, cost: 2 },
            ] as Tile[];

            movingGameServiceSpy.findShortestPath.and.returnValue(path);

            const initialPoints = 10;
            playingServiceSpy.currentMovingPoints = initialPoints;

            (service as any).movePlayer(tile);

            expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 3);
        });

        describe('moveVirtualPlayer', () => {
            let currentPlayer: Player;

            beforeEach(() => {
                tile = { position: { x: 2, y: 2 }, isReachable: true, cost: 1 } as Tile;
                currentPlayer = {
                    name: 'Player2',
                    coordinate: { x: 1, y: 1 },
                    avatarUrl: 'player2.png',
                } as Player;
                movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 }, cost: 0 } as Tile);
                movingGameServiceSpy.findShortestPath.and.returnValue([
                    { position: { x: 1, y: 1 }, cost: 0 },
                    { position: { x: 2, y: 2 }, cost: 1 },
                ] as Tile[]);
                movingGameServiceSpy.animatePlayerMovement = jasmine.createSpy('animatePlayerMovement');
                playingServiceSpy.localPlayer = {
                    name: 'Player1',
                    coordinate: { x: 1, y: 1 },
                    avatarUrl: 'player1.png',
                } as Player;
            });

            it('should return early if player is already on the target tile', () => {
                const samePositionTile = { position: { x: 1, y: 1 }, isReachable: true } as Tile;
                movingGameServiceSpy.getPlayerTile.and.returnValue(samePositionTile);

                service.moveVirtualPlayer(samePositionTile, currentPlayer);

                expect(movingGameServiceSpy.animatePlayerMovement).not.toHaveBeenCalled();
            });

            it('should return early if localPlayer is null', () => {
                playingServiceSpy.localPlayer = null;

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(movingGameServiceSpy.animatePlayerMovement).not.toHaveBeenCalled();
            });

            it('should reduce moving points by the path cost', () => {
                const initialPoints = 10;
                playingServiceSpy.currentMovingPoints = initialPoints;

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 1);
            });

            it('should call virtualPlayerMovement with the path and current player', () => {
                const path = [
                    { position: { x: 1, y: 1 }, cost: 0 },
                    { position: { x: 2, y: 2 }, cost: 1 },
                ] as Tile[];

                movingGameServiceSpy.findShortestPath.and.returnValue(path);

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(movingGameServiceSpy.animatePlayerMovement).toHaveBeenCalledWith(path, currentPlayer);
            });

            it('should clear reachable tiles before movement', () => {
                service.moveVirtualPlayer(tile, currentPlayer);

                expect(movingGameServiceSpy.setReachableForTiles).toHaveBeenCalledWith([]);
            });

            it('should calculate totalCost correctly with path costs', () => {
                const path = [
                    { position: { x: 1, y: 1 }, cost: 1 },
                    { position: { x: 1, y: 2 }, cost: 2 },
                    { position: { x: 2, y: 2 }, cost: 3 },
                ] as Tile[];

                movingGameServiceSpy.findShortestPath.and.returnValue(path);
                movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 }, cost: 1 } as Tile);

                const initialPoints = 20;
                playingServiceSpy.currentMovingPoints = initialPoints;

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 5);
            });

            it('should handle undefined costs in path gracefully', () => {
                const path = [{ position: { x: 1, y: 1 } } as Tile, { position: { x: 2, y: 2 }, cost: 2 } as Tile];

                movingGameServiceSpy.findShortestPath.and.returnValue(path);
                movingGameServiceSpy.getPlayerTile.and.returnValue({ position: { x: 1, y: 1 } } as Tile);

                const initialPoints = 10;
                playingServiceSpy.currentMovingPoints = initialPoints;

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 2);
            });

            it('should handle undefined oldTile when calculating move cost', () => {
                movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
                const path = [
                    { position: { x: 1, y: 1 }, cost: 1 },
                    { position: { x: 2, y: 2 }, cost: 2 },
                ] as Tile[];

                movingGameServiceSpy.findShortestPath.and.returnValue(path);

                const initialPoints = 10;
                playingServiceSpy.currentMovingPoints = initialPoints;

                service.moveVirtualPlayer(tile, currentPlayer);

                expect(playingServiceSpy.currentMovingPoints).toBe(initialPoints - 3);
            });
        });
    });
});
