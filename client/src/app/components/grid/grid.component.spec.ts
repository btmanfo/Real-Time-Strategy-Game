/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { GRID_SIZES, MapSize, SPAWN_COUNTS, TILE_TYPES } from '@app/constants/constants';
import { Game } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Tile } from '@common/interfaces';
import { GridComponent } from './grid.component';

@Component({ selector: 'app-notification-popup', standalone: true, template: '' })
class MockNotificationComponent {}

describe('GridComponent', () => {
    let component: GridComponent;
    let fixture: ComponentFixture<GridComponent>;
    let itemSelectorService: jasmine.SpyObj<ItemSelectorService>;
    let mapService: jasmine.SpyObj<BoardService>;
    let gameService: jasmine.SpyObj<GameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

    const mockGame: Game = {
        id: '1',
        description: 'A test game',
        name: 'Test Game',
        size: 'Moyenne Taille ',
        gameMode: 'Classique',
        visibility: true,
        map: [],
        map2: [],
        modificationDate: new Date().toISOString(),
        screenshot: '',
    };

    beforeEach(async () => {
        const itemSelectorSpy = jasmine.createSpyObj(
            'ItemSelectorService',
            [
                'getSelectedItemIndex',
                'selectItem',
                'selectItemIndex',
                'deselectItem',
                'getItems',
                'updateItemContainer',
                'set nSpawn',
                'set maxItems',
                'get nSpawn',
                'get maxItems',
            ],
            {
                items: [],
            },
        );
        playingServiceSpy = jasmine.createSpyObj('PlayingService', [
            'getPlayerTile',
            'findShortestPath',
            'startFight',
            'setReachableForTiles',
            'emitAnimation',
            'isPlaying',
            'getNeighbors',
            'currentMovingPoints',
            'myPlayer',
        ]);
        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['showModal', 'errorMessages']);
        const mapServiceSpy = jasmine.createSpyObj('BoardService', [
            'setMap',
            'clearTile',
            'toggleDoor',
            'removeItemFromTile',
            'handleTileModification',
            'changeTile',
            'placeTile',
            'isTileBlocked',
            'isReturningToContainer',
            'isMovingWithinMap',
            'isSpawningItem',
            'set gridSize',
            'get gridSize',
            'isPlaying',
        ]);
        const gameServiceSpy = jasmine.createSpyObj('GameService', ['getNewGame']);

        await TestBed.configureTestingModule({
            imports: [GridComponent],
            providers: [
                provideRouter([]),
                { provide: ItemSelectorService, useValue: itemSelectorSpy },
                { provide: BoardService, useValue: mapServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        }).compileComponents();
        TestBed.overrideComponent(GridComponent, {
            add: { imports: [MockNotificationComponent] },
            remove: { imports: [NotificationPopupComponent] },
        });
        itemSelectorService = TestBed.inject(ItemSelectorService) as jasmine.SpyObj<ItemSelectorService>;
        mapService = TestBed.inject(BoardService) as jasmine.SpyObj<BoardService>;
        gameService = TestBed.inject(GameService) as jasmine.SpyObj<GameService>;
    });

    beforeEach(() => {
        notificationServiceSpy.errorMessages = [];
        notificationServiceSpy.showModal = false;
        fixture = TestBed.createComponent(GridComponent);
        component = fixture.componentInstance;
        gameService.getNewGame.and.returnValue(mockGame);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the correct playingService via getter', () => {
        expect(component.playingService).toBe(playingServiceSpy);
    });

    it('should return the correct notificationService via getter', () => {
        expect(component.notificationService).toBe(notificationServiceSpy);
    });

    it('should return the correct boardService via getter', () => {
        expect(component.boardService).toBe(mapService);
    });

    it('should return the correct editionGridService via getter', () => {
        const dummyEditionGridService = {} as any;
        (component as any)._editionGridService = dummyEditionGridService;
        expect(component.editionGridService).toBe(dummyEditionGridService);
    });

    it('should return the correct playingGridService via getter', () => {
        const dummyPlayingGridService = {} as any;
        (component as any)._playingGridService = dummyPlayingGridService;
        expect(component.playingGridService).toBe(dummyPlayingGridService);
    });

    it('should initialize map if isPlaying is false', () => {
        playingServiceSpy.isPlaying = false;
        spyOn(component, 'initializeMap');
        component.ngOnInit();

        expect(component.initializeMap).toHaveBeenCalled();
    });

    describe('Context Menu', () => {
        it('should prevent default context menu', () => {
            const event = new MouseEvent('contextmenu');
            spyOn(event, 'preventDefault');

            component.disableContextMenu(event);

            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Map Size Conversion', () => {
        it('should set large size properties correctly', () => {
            const largeGame = { ...mockGame, size: MapSize.Large };
            gameService.getNewGame.and.returnValue(largeGame);
            mapService.gridSize = GRID_SIZES.LARGE;

            component.converterSize();

            expect(mapService.gridSize).toBe(GRID_SIZES.LARGE);
            expect(itemSelectorService.nSpawn).toBe(SPAWN_COUNTS.LARGE);
            expect(itemSelectorService.maxItems).toBe(SPAWN_COUNTS.LARGE);
        });

        it('should set small size properties correctly', () => {
            const smallGame = { ...mockGame, size: MapSize.Small };
            gameService.getNewGame.and.returnValue(smallGame);
            mapService.gridSize = GRID_SIZES.SMALL;

            component.converterSize();

            expect(mapService.gridSize).toBe(GRID_SIZES.SMALL);
            expect(itemSelectorService.nSpawn).toBe(SPAWN_COUNTS.SMALL);
            expect(itemSelectorService.maxItems).toBe(SPAWN_COUNTS.SMALL);
        });

        it('should set medium size properties correctly', () => {
            const mediumGame = { ...mockGame, size: MapSize.Medium };
            gameService.getNewGame.and.returnValue(mediumGame);
            mapService.gridSize = GRID_SIZES.MEDIUM;

            component.converterSize();

            expect(mapService.gridSize).toBe(GRID_SIZES.MEDIUM);
            expect(itemSelectorService.nSpawn).toBe(SPAWN_COUNTS.MEDIUM);
            expect(itemSelectorService.maxItems).toBe(SPAWN_COUNTS.MEDIUM);
        });
    });

    describe('initializeMap', () => {
        it('should initialize map from existing game maps', () => {
            const existingMaps = {
                ...mockGame,
                map: [{ type: TILE_TYPES.empty, position: { x: 0, y: 0 } } as Tile, { type: TILE_TYPES.wall, position: { x: 1, y: 0 } } as Tile],
                map2: [{ type: TILE_TYPES.empty, position: { x: 0, y: 1 } } as Tile, { type: TILE_TYPES.wall, position: { x: 1, y: 1 } } as Tile],
            };
            gameService.getNewGame.and.returnValue(existingMaps);
            mapService.gridSize = GRID_SIZES.SMALL;

            component.initializeMap();

            const expectedCombinedMaps = [...existingMaps.map, ...existingMaps.map2];
            expect(mapService.setMap).toHaveBeenCalledWith(expectedCombinedMaps, GRID_SIZES.SMALL);
        });

        it('should initialize empty map when no existing maps', () => {
            const emptyGame = { ...mockGame, map: [], map2: [] };
            gameService.getNewGame.and.returnValue(emptyGame);
            mapService.gridSize = GRID_SIZES.SMALL;

            component.initializeMap();

            const expectedNewTiles = [];
            for (let index = 0; index < GRID_SIZES.SMALL; index++) {
                for (let j = 0; j < GRID_SIZES.SMALL; j++) {
                    expectedNewTiles.push({
                        traversable: true,
                        position: { x: index, y: j },
                        item: { name: '', position: {} } as Item,
                    } as Tile);
                }
            }
            expect(mapService.setMap).toHaveBeenCalledWith(expectedNewTiles, GRID_SIZES.SMALL);
        });
    });

    it('should emit the mouseOverTile event when onMouseOverTile is called', () => {
        const tile: Tile = {
            traversable: true,
            position: { x: 0, y: 0 },
            item: { name: '', position: {} } as Item,
        } as Tile;
        spyOn(component.mouseOverTile, 'emit');

        component.onMouseOverTile(tile);

        expect(component.mouseOverTile.emit).toHaveBeenCalledWith(tile);
    });

    it('should execute ngOnDestroy without errors', () => {
        expect(() => component.ngOnDestroy()).not.toThrow();
    });
});
