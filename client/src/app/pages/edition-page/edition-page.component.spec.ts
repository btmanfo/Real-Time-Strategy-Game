/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { HttpStatusCode } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { GRID_SIZES, ITEM_TYPES, MAP_SPLIT_LIMIT_1, MAP_SPLIT_LIMIT_2, MapSize, SPAWN_COUNTS } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { EditionGridService } from '@app/services/edition-grid-service/edition-grid.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { MapValidityService } from '@app/services/map-validity-service/map-validity.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Game, Item } from '@common/interfaces';
import html2canvas from 'html2canvas';
import { of, throwError } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';
describe('EditionPageComponent', () => {
    let component: EditionPageComponent;
    let fixture: ComponentFixture<EditionPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockItemSelectorService: jasmine.SpyObj<ItemSelectorService>;
    let mockBoardService: jasmine.SpyObj<BoardService>;
    let mockMapValidityService: jasmine.SpyObj<MapValidityService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let mockTileService: jasmine.SpyObj<TileService>;
    let mockEditionGridService: jasmine.SpyObj<EditionGridService>;
    let mockHtml2Canvas: jasmine.SpyObj<any>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['getNewGame', 'formatDate', 'createGame', 'updateGame', 'getGameById']);
        mockItemSelectorService = jasmine.createSpyObj('ItemSelectorService', [
            'deselectItem',
            'getDroppedItems',
            'addDroppedItem',
            'setDroppedItems',
            'getItems',
        ]);
        mockBoardService = jasmine.createSpyObj('BoardService', ['tiles', 'isPlaying', 'setMap', 'getMap']);
        mockBoardService.tiles = [];
        mockBoardService.isPlaying = false;
        mockMapValidityService = jasmine.createSpyObj('MapValidityService', ['isMapValid', 'checkMap']);
        mockNotificationService = jasmine.createSpyObj('NotificationService', ['showModal', 'errorMessages']);
        mockNotificationService.showModal = false;
        mockNotificationService.errorMessages = [];
        mockTileService = jasmine.createSpyObj('TileService', ['deselectTile']);
        mockEditionGridService = jasmine.createSpyObj('EditionGridService', ['setCostTiles']);
        mockHtml2Canvas = jasmine.createSpyObj('any', ['toDataURL']);
        await TestBed.configureTestingModule({
            imports: [EditionPageComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: ItemSelectorService, useValue: mockItemSelectorService },
                { provide: BoardService, useValue: mockBoardService },
                { provide: MapValidityService, useValue: mockMapValidityService },
                { provide: NotificationService, useValue: mockNotificationService },
                { provide: TileService, useValue: mockTileService },
                { provide: EditionGridService, useValue: mockEditionGridService },
                { provide: ActivatedRoute, useValue: { params: of({}) } },
                { provide: html2canvas, useValue: mockHtml2Canvas },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionPageComponent);
        component = fixture.componentInstance;
        component.editorGame = {
            size: 'Moyenne Taille',
            map: [],
            map2: [],
            items: [],
            nSpawn: 0,
            maxItems: 0,
            gridSize: GRID_SIZES.MEDIUM,
        } as any;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize editorGame and set isPlaying to false on ngOnInit', () => {
        const mockGame = { size: 'Moyenne Taille' } as any;
        mockGameService.getNewGame.and.returnValue(mockGame);

        component.ngOnInit();

        expect(component.editorGame).toEqual({
            ...mockGame,
            size: mockGame.size,
        });
        expect(mockBoardService.isPlaying).toBeFalse();
    });

    it('should clean up resources on ngOnDestroy', () => {
        const destroySpy = spyOn(component['destroy$'], 'next').and.callThrough();
        const completeSpy = spyOn(component['destroy$'], 'complete').and.callThrough();

        component.ngOnDestroy();

        expect(destroySpy).toHaveBeenCalled();
        expect(completeSpy).toHaveBeenCalled();
        expect(mockItemSelectorService.nItems).toBe(0);
        expect(mockTileService.deselectTile).toHaveBeenCalled();
        expect(mockItemSelectorService.deselectItem).toHaveBeenCalled();
    });

    it('should return notification details', () => {
        const notification = component.notification;

        expect(notification).toEqual({
            showModal: mockNotificationService.showModal,
            errorMessages: mockNotificationService.errorMessages,
        });
    });

    describe('converterSize', () => {
        it('should return the correct grid size for Large maps', () => {
            component.editorGame.size = 'Grande Taille';
            const result = component.converterSize();
            expect(result).toBe(GRID_SIZES.LARGE);
        });

        it('should return the correct grid size for Medium maps', () => {
            component.editorGame.size = 'Moyenne Taille';
            const result = component.converterSize();
            expect(result).toBe(GRID_SIZES.MEDIUM);
        });

        it('should return the correct grid size for Small maps', () => {
            component.editorGame.size = 'Petite Taille';
            const result = component.converterSize();
            expect(result).toBe(GRID_SIZES.SMALL);
        });

        it('should return 0 when game size is invalid', () => {
            component.editorGame.size = 'InvalidSize' as any;

            const result = component.converterSize();

            expect(result).toBe(0);
        });
    });

    describe('getSizeConfig', () => {
        it('should return the correct configuration for Large maps', () => {
            const result = component.getSizeConfig(MapSize.Large);
            expect(result).toEqual({
                nSpawn: SPAWN_COUNTS.LARGE,
                maxItems: SPAWN_COUNTS.LARGE,
                gridSize: GRID_SIZES.LARGE,
            });
        });

        it('should return the correct configuration for Medium maps', () => {
            const result = component.getSizeConfig(MapSize.Medium);
            expect(result).toEqual({
                nSpawn: SPAWN_COUNTS.MEDIUM,
                maxItems: SPAWN_COUNTS.MEDIUM,
                gridSize: GRID_SIZES.MEDIUM,
            });
        });

        it('should return the correct configuration for Small maps', () => {
            const result = component.getSizeConfig(MapSize.Small);
            expect(result).toEqual({
                nSpawn: SPAWN_COUNTS.SMALL,
                maxItems: SPAWN_COUNTS.SMALL,
                gridSize: GRID_SIZES.SMALL,
            });
        });
        it('should return the correct configuration for Small maps', () => {
            const result = component.getSizeConfig('test' as any);
            expect(result).toEqual({ nSpawn: 0, maxItems: 0, gridSize: 0 });
        });
    });

    describe('converterItems', () => {
        it('should update item counts and grid size based on game size', () => {
            const mockGame = { size: 'Moyenne Taille' } as any;
            mockGameService.getNewGame.and.returnValue(mockGame);

            component.converterItems();

            expect(mockItemSelectorService.nSpawn).toBe(SPAWN_COUNTS.MEDIUM);
            expect(mockItemSelectorService.maxItems).toBe(SPAWN_COUNTS.MEDIUM);
            expect(mockBoardService.gridSize).toBe(GRID_SIZES.MEDIUM);
        });
    });

    describe('resetInitialGrid', () => {
        it('should reset the grid and items', () => {
            component.editorGame.map = [{ position: { x: 0, y: 0 } }] as any;
            component.editorGame.map2 = [{ position: { x: 1, y: 1 } }] as any;
            const mockGame = { map: [{ position: { x: 2, y: 2 } }] } as any;
            mockGameService.getNewGame.and.returnValue(mockGame);

            spyOn(component, 'converterSize').and.returnValue(GRID_SIZES.MEDIUM);
            spyOn(component, 'converterItems');
            spyOn(component, 'resetItems');

            component.resetInitialGrid();

            expect(mockBoardService.setMap).toHaveBeenCalledWith([{ position: { x: 0, y: 0 } }] as any, GRID_SIZES.MEDIUM);
            expect(component.editorGame.map).toEqual(mockGame.map);
            expect(component.converterItems).toHaveBeenCalled();
            expect(component.resetItems).toHaveBeenCalled();
        });

        it('should use empty array when fullMap is empty', () => {
            component.editorGame.map = [];
            component.editorGame.map2 = [];

            spyOn(component, 'converterSize').and.returnValue(GRID_SIZES.MEDIUM);
            spyOn(component, 'converterItems');
            spyOn(component, 'resetItems');
            const mockGame = { map: [{ position: { x: 2, y: 2 } }] } as any;
            mockGameService.getNewGame.and.returnValue(mockGame);

            component.resetInitialGrid();

            expect(mockBoardService.setMap).toHaveBeenCalledWith([], GRID_SIZES.MEDIUM);
            expect(component.editorGame.map).toEqual(mockGame.map);
        });
    });

    describe('resetEdition', () => {
        it('should reset the edition page', () => {
            spyOn(component, 'resetInitialGrid');
            const mockGame = { size: 'Moyenne Taille' } as any;
            mockGameService.getNewGame.and.returnValue(mockGame);

            component.resetEdition();

            expect(component.resetInitialGrid).toHaveBeenCalled();
            expect(component.editorGame).toEqual({
                ...mockGame,
                size: component.editorGame.size,
            });
        });
    });

    describe('resetItems', () => {
        it('should reset dropped items and update their states', () => {
            spyOn(component as any, 'clearDroppedItems');
            spyOn(component as any, 'resetItemStates');
            spyOn(component as any, 'collectDroppedItemsFromMap');
            spyOn(component as any, 'updateItemStatesBasedOnDroppedItems');
            spyOn(component as any, 'updateCounter');

            component.resetItems();

            expect(component['clearDroppedItems']).toHaveBeenCalled();
            expect(component['resetItemStates']).toHaveBeenCalled();
            expect(component['collectDroppedItemsFromMap']).toHaveBeenCalled();
            expect(component['updateItemStatesBasedOnDroppedItems']).toHaveBeenCalled();
            expect(component['updateCounter']).toHaveBeenCalled();
        });
    });

    describe('setupMap', () => {
        it('should split the map into two parts if its length exceeds MAP_SPLIT_LIMIT_2', () => {
            const mockMap = Array(MAP_SPLIT_LIMIT_2 + 1).fill({ position: { x: 0, y: 0 } });
            mockBoardService.getMap.and.returnValue(mockMap);

            component.setupMap();

            expect(component.editorGame.map).toEqual(mockMap.slice(0, MAP_SPLIT_LIMIT_1));
            expect(component.editorGame.map2).toEqual(mockMap.slice(MAP_SPLIT_LIMIT_1, MAP_SPLIT_LIMIT_2));
        });

        it('should not split the map if its length is less than or equal to MAP_SPLIT_LIMIT_2', () => {
            const mockMap = Array(MAP_SPLIT_LIMIT_2).fill({ position: { x: 0, y: 0 } });
            mockBoardService.getMap.and.returnValue(mockMap);

            component.setupMap();

            expect(component.editorGame.map).toEqual(mockMap);
            expect(component.editorGame.map2).toEqual([]);
        });
    });

    describe('checkMap', () => {
        it('should call setupMap and register the page if the map is valid', () => {
            spyOn(component, 'setupMap');
            spyOn(component as any, 'isMapValid').and.returnValue(true);
            spyOn(component, 'registerPage');

            component.checkMap();

            expect(component.setupMap).toHaveBeenCalled();
            expect((component as any).isMapValid).toHaveBeenCalled();
            expect(mockTileService.deselectTile).toHaveBeenCalled();
            expect(component.registerPage).toHaveBeenCalled();
        });

        it('should call setupMap and validate inputs if the map is invalid', () => {
            spyOn(component, 'setupMap');
            spyOn(component as any, 'isMapValid').and.returnValue(false);
            spyOn(component as any, 'validateInputs');

            component.checkMap();

            expect(component.setupMap).toHaveBeenCalled();
            expect((component as any).isMapValid).toHaveBeenCalled();
            expect(component['validateInputs']).toHaveBeenCalled();
        });
    });

    describe('registerPage', () => {
        it('should call prepareGameForRegistration and checkGameExistenceAndRegister', async () => {
            spyOn(component as any, 'prepareGameForRegistration').and.returnValue(Promise.resolve());
            spyOn(component as any, 'checkGameExistenceAndRegister');

            await component.registerPage();

            expect(component['prepareGameForRegistration']).toHaveBeenCalled();
            expect(component['checkGameExistenceAndRegister']).toHaveBeenCalled();
        });
    });

    describe('createGame', () => {
        it('should call setCostTiles and createGame', () => {
            mockGameService.createGame.and.returnValue(of({} as Game));

            component.createGame();

            expect(mockEditionGridService.setCostTiles).toHaveBeenCalled();
            expect(mockGameService.createGame).toHaveBeenCalledWith(component.editorGame);
        });
    });

    describe('updateGame', () => {
        it('should call setCostTiles and updateGame', () => {
            mockGameService.updateGame.and.returnValue(of({} as Game));

            component.updateGame();

            expect(mockEditionGridService.setCostTiles).toHaveBeenCalled();
            expect(mockGameService.updateGame).toHaveBeenCalledWith(component.editorGame.id, component.editorGame);
        });
    });

    describe('clearDroppedItems', () => {
        it('should call setDroppedItems with an empty array', () => {
            component['clearDroppedItems']();

            expect(mockItemSelectorService.setDroppedItems).toHaveBeenCalledWith([]);
        });
    });

    describe('resetItemStates', () => {
        it('should set isOutOfContainer to false for all items', () => {
            const mockItems = [{ isOutOfContainer: true }, { isOutOfContainer: true }] as any;
            mockItemSelectorService.getItems.and.returnValue(mockItems);

            component['resetItemStates']();

            mockItems.forEach((item: Item) => {
                expect(item.isOutOfContainer).toBeFalse();
            });
        });
    });

    describe('collectDroppedItemsFromMap', () => {
        it('should add dropped items from the map to the item selector service', () => {
            const mockTiles = [{ item: { name: 'item1' } }, { item: { name: 'item2' } }, { item: null }] as any;
            mockBoardService.getMap.and.returnValue(mockTiles);

            component['collectDroppedItemsFromMap']();

            expect(mockItemSelectorService.addDroppedItem).toHaveBeenCalledWith({ name: 'item1' } as Item);
            expect(mockItemSelectorService.addDroppedItem).toHaveBeenCalledWith({ name: 'item2' } as Item);
        });
    });

    describe('updateItemStatesBasedOnDroppedItems', () => {
        it('should decrement nSpawn and set isOutOfContainer to true for spawn items when nSpawn reaches 0', () => {
            const mockDroppedItems = [{ name: 'spawn' } as Item];
            const mockItems = [{ name: 'spawn', isOutOfContainer: false } as Item];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.getItems.and.returnValue(mockItems);
            mockItemSelectorService.nSpawn = 1;

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItemSelectorService.nSpawn).toBe(0);
            expect(mockItems[0].isOutOfContainer).toBeTrue();
        });

        it('should not modify nItems or isOutOfContainer for flag items', () => {
            const mockDroppedItems = [{ name: 'chestbox-2', type: ITEM_TYPES.flag } as Item];
            mockItemSelectorService.nItems = 0;
            const mockItems = [{ name: 'chestbox-2', type: ITEM_TYPES.flag, isOutOfContainer: false } as Item];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.getItems.and.returnValue(mockItems);

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItemSelectorService.nItems).toBe(0);
            expect(mockItems[0].isOutOfContainer).toBeFalse();
        });
    });

    describe('updateItemStatesBasedOnDroppedItems', () => {
        it('should decrement nSpawn and set isOutOfContainer to true for spawn items when nSpawn reaches 0', () => {
            const mockDroppedItems = [{ name: 'spawn' } as Item];
            const mockItems = [{ name: 'spawn', isOutOfContainer: false } as Item];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.getItems.and.returnValue(mockItems);
            mockItemSelectorService.nSpawn = 1;

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItemSelectorService.nSpawn).toBe(0);
            expect(mockItems[0].isOutOfContainer).toBeTrue();
        });

        it('should not modify nItems or isOutOfContainer for flag items', () => {
            const mockDroppedItems = [{ name: 'chestbox-2', type: ITEM_TYPES.flag } as Item];
            const mockItems = [{ name: 'chestbox-2', type: ITEM_TYPES.flag, isOutOfContainer: false } as Item];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.getItems.and.returnValue(mockItems);

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItemSelectorService.nItems).toBe(0);
            expect(mockItems[0].isOutOfContainer).toBeFalse();
        });

        it('should increment nItems and set isOutOfContainer to true for non-flag items', () => {
            const mockDroppedItems = [{ name: 'item1', type: 'regular' } as Item];
            const mockItems = [{ name: 'item1', type: 'regular', isOutOfContainer: false } as Item];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.getItems.and.returnValue(mockItems);
            mockItemSelectorService.nItems = 0;

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItems[0].isOutOfContainer).toBeTrue();
        });

        it('should handle an empty list of dropped items gracefully', () => {
            mockItemSelectorService.getDroppedItems.and.returnValue([]);
            mockItemSelectorService.getItems.and.returnValue([]);
            mockBoardService.tiles = [];

            component['updateItemStatesBasedOnDroppedItems']();

            expect(mockItemSelectorService.nItems).toBe(0);
        });
    });

    describe('updateCounter', () => {
        it('should increment the counter by the number of dropped items', () => {
            const mockDroppedItems = [{ name: 'item1' }, { name: 'item2' }] as Item[];
            mockItemSelectorService.getDroppedItems.and.returnValue(mockDroppedItems);
            mockItemSelectorService.counter = 0;

            component['updateCounter']();

            expect(mockItemSelectorService.counter).toBe(2);
        });
    });

    describe('isValidString', () => {
        it('should return true for valid strings', () => {
            const result = component['isValidString']('Valid123');
            expect(result).toBeTrue();
        });

        it('should return false for strings with special characters', () => {
            const result = component['isValidString']('Invalid@123');
            expect(result).toBeFalse();
        });

        it('should return false for strings shorter than the minimum length', () => {
            const result = component['isValidString']('ab');
            expect(result).toBeFalse();
        });
    });

    describe('isMapValid', () => {
        it('should return true if the map is valid and name/description are valid strings', () => {
            mockMapValidityService.checkMap.and.returnValue(true);
            spyOn(component as any, 'isValidString').and.returnValue(true);

            const result = component['isMapValid']();

            expect(mockMapValidityService.checkMap).toHaveBeenCalledWith(component.editorGame);
            expect(result).toBeTrue();
        });

        it('should return false if the map is invalid', () => {
            mockMapValidityService.checkMap.and.returnValue(false);
            spyOn(component as any, 'isValidString').and.returnValue(true);

            const result = component['isMapValid']();

            expect(result).toBeFalse();
        });

        it('should return false if the name or description is invalid', () => {
            mockMapValidityService.checkMap.and.returnValue(true);
            spyOn(component as any, 'isValidString').and.callFake((value: string) => value !== 'invalid');

            component.editorGame.name = 'invalid';
            component.editorGame.description = 'valid';

            const result = component['isMapValid']();

            expect(result).toBeFalse();
        });
    });

    describe('validateInputs', () => {
        it('should add an error message if the name is missing', () => {
            component.editorGame.name = '';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith("Aucun nom n'a été écrit.");
        });

        it('should add an error message if the name contains invalid characters', () => {
            component.editorGame.name = 'Invalid@Name';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith('Le nom du jeu ne doit contenir que des lettres et des chiffres.');
        });

        it('should add an error message if the name is too short', () => {
            component.editorGame.name = 'ab';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith('Le nom du jeu doit contenir au moins 3 caractères.');
        });

        it('should add an error message if the description is missing', () => {
            component.editorGame.description = '';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith("Aucune description n'a été écrite.");
        });

        it('should add an error message if the description contains invalid characters', () => {
            component.editorGame.description = 'Invalid@Description';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith('La description du jeu ne doit contenir que des lettres et des chiffres.');
        });

        it('should add an error message if the description is too short', () => {
            component.editorGame.description = 'ab';
            spyOn(component as any, 'addErrorMessage');

            component['validateInputs']();

            expect(component['addErrorMessage']).toHaveBeenCalledWith('La description du jeu doit contenir au moins 3 caractères.');
        });
    });

    describe('addErrorMessage', () => {
        it('should add an error message and set showModal to true', () => {
            const message = 'Test error message';

            component['addErrorMessage'](message);

            expect(mockNotificationService.errorMessages).toContain(message);
            expect(mockNotificationService.showModal).toBeTrue();
        });
    });

    describe('prepareGameForRegistration', () => {
        it('should set modificationDate, screenshot, and update editorGame', async () => {
            const mockDate = '2023-01-01';
            const mockScreenshot = 'data:image/png;base64,example';
            spyOn(component, 'screenshot').and.returnValue(Promise.resolve(mockScreenshot));
            mockGameService.formatDate.and.returnValue(mockDate);

            await component['prepareGameForRegistration']();

            expect(component.editorGame.modificationDate).toBe(mockDate);
            expect(component.editorGame.screenshot).toBe(mockScreenshot);
            expect(component.editorGame).toEqual(
                jasmine.objectContaining({
                    name: component.editorGame.name,
                    description: component.editorGame.description,
                }),
            );
        });
    });

    describe('checkGameExistenceAndRegister', () => {
        it('should call handleExistingGame if the game exists', () => {
            spyOn(component as any, 'handleExistingGame');
            mockGameService.getGameById.and.returnValue(of({} as Game));

            component['checkGameExistenceAndRegister']();

            expect(component['handleExistingGame']).toHaveBeenCalled();
        });
        it('should call handleExistingGame if the game exists', () => {
            spyOn(component as any, 'createGame');
            mockGameService.getGameById.and.returnValue(of(undefined as unknown as Game));

            component['checkGameExistenceAndRegister']();

            expect(component['createGame']).toHaveBeenCalled();
        });

        it('should call handleGameCreation if the game does not exist', () => {
            spyOn(component as any, 'handleGameCreation');
            mockGameService.getGameById.and.returnValue(throwError({ status: HttpStatusCode.NotFound }));

            component['checkGameExistenceAndRegister']();

            expect(component['handleGameCreation']).toHaveBeenCalled();
        });

        it('should add an error message if there is an internal server error', () => {
            mockGameService.getGameById.and.returnValue(throwError({ status: HttpStatusCode.InternalServerError }));

            component['checkGameExistenceAndRegister']();

            expect(mockNotificationService.errorMessages).toContain('Erreur lors de la vérification du jeu.\n');
        });
    });

    describe('handleExistingGame', () => {
        it('should show a success message and call updateGame', () => {
            spyOn(component, 'updateGame');

            component['handleExistingGame']();

            expect(mockNotificationService.showModal).toBeTrue();
            expect(mockNotificationService.errorMessages).toContain('Le jeu a été mis à jour avec succès !');
            expect(component.updateGame).toHaveBeenCalled();
        });
    });

    describe('handleGameCreation', () => {
        it('should show a success message and call createGame', () => {
            spyOn(component, 'createGame');

            component['handleGameCreation']();

            expect(mockNotificationService.showModal).toBeTrue();
            expect(mockNotificationService.errorMessages).toContain('Le jeu a été créé avec succès !');
            expect(component.createGame).toHaveBeenCalled();
        });
    });
});
