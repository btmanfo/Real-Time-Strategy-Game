/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { ERROR_MESSAGES, ITEM_TYPES, LARGE_MAP_SIZE, MEDIUM_MAP_SIZE, SMALL_MAP_SIZE, TILE_TYPES } from '@app/constants/constants';
import { Game } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { MapValidityService } from '@app/services/map-validity-service/map-validity.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { Tile } from '@common/interfaces';

describe('MapValidityService', () => {
    let service: MapValidityService;
    let carteServiceSpy: jasmine.SpyObj<BoardService>;
    let itemSelectorServiceSpy: jasmine.SpyObj<ItemSelectorService>;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

    const mockGame: Game = {
        id: '1',
        description: 'A test game',
        name: 'Test Game',
        size: 'Moyenne Game',
        gameMode: 'Classique',
        visibility: true,
        map: [],
        map2: [],
        modificationDate: new Date().toISOString(),
        screenshot: '',
    };

    beforeEach(() => {
        carteServiceSpy = jasmine.createSpyObj('CarteService', ['getMap', 'setMap']);
        itemSelectorServiceSpy = jasmine.createSpyObj('ItemSelectorService', ['nSpawn']);
        notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['errorMessages']);
        notificationServiceSpy.errorMessages = [];
        TestBed.configureTestingModule({
            providers: [
                MapValidityService,
                { provide: BoardService, useValue: carteServiceSpy },
                { provide: ItemSelectorService, useValue: itemSelectorServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        });

        service = TestBed.inject(MapValidityService);
        service.editorGame = { ...mockGame };
    });

    it('should return 20 for "Grande Taille"', () => {
        service.editorGame = { ...mockGame, size: 'Grande Taille' };
        expect(service.converterSize()).toBe(LARGE_MAP_SIZE);
    });

    it('should return 15 for "Moyenne Taille"', () => {
        service.editorGame = { ...mockGame, size: 'Moyenne Taille' };
        expect(service.converterSize()).toBe(MEDIUM_MAP_SIZE);
    });

    it('should return 10 for "Petite Taille"', () => {
        service.editorGame = { ...mockGame, size: 'Petite Taille' };
        expect(service.converterSize()).toBe(SMALL_MAP_SIZE);
    });

    it('should return 0 for invalid size', () => {
        service.editorGame = {
            ...mockGame,
            size: 'Invalid Size',
        };
        const result = service.converterSize();
        expect(result).toBe(0);
    });

    it('should return true for a valid map', () => {
        spyOn(service, 'checkDoorValidity').and.returnValue(true);
        spyOn(service, 'checkWallPlacement').and.returnValue(true);
        spyOn(service as any, 'checkMapUsage').and.returnValue(true);
        spyOn(service, 'checkSpawnUsage').and.returnValue(true);

        const validGame: Game = { ...mockGame, map: [] };
        expect(service.checkMap(validGame)).toBe(true);
    });

    it('should return true if no spawns are left to place', () => {
        service['itemService'].nSpawn = 0;
        spyOn(console, 'log');
        expect(service.checkSpawnUsage()).toBe(true);
    });

    it('should return false if there are spawns left to place', () => {
        service['itemService'].nSpawn = 1;
        expect(service.checkSpawnUsage()).toBe(false);
        expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.spawnPlacement);
    });

    it('should check door validity when door is found', () => {
        const gameWithDoor = {
            ...mockGame,
            map: [{ type: 'Porte', position: { x: 1, y: 1 } } as Tile],
        };
        service.editorGame = gameWithDoor;
        spyOn(service, 'isValidDoorPlacement').and.returnValue(true);

        const result = service.checkDoorValidity();

        expect(result).toBe(true);
        expect(service.isValidDoorPlacement).toHaveBeenCalled();
    });

    it('should return false when door placement is invalid', () => {
        const gameWithInvalidDoor = {
            ...mockGame,
            map: [{ type: TILE_TYPES.door, position: { x: 1, y: 1 } } as Tile],
        };
        service.editorGame = gameWithInvalidDoor;
        spyOn(service, 'isValidDoorPlacement').and.returnValue(false);

        const result = service.checkDoorValidity();

        expect(result).toBeFalse();
        expect(service.isValidDoorPlacement).toHaveBeenCalledWith(0);
    });

    it('should return false when no accessible tiles are found', () => {
        const testGame: Game = {
            id: '1',
            description: 'A test game',
            name: 'Test Game',
            size: 'Petite Taille',
            gameMode: 'Classique',
            visibility: true,
            map: [{ type: 'Mur', position: { x: 0, y: 0 } } as Tile],
            map2: [],
            modificationDate: new Date().toISOString(),
            screenshot: '',
        };
        service.editorGame = testGame;

        const result = service.checkWallPlacement();

        expect(result).toBeFalse();
    });

    it('should return true when all accessible tiles are connected', () => {
        service.editorGame = {
            ...mockGame,
            size: 'Petite Taille',
            map: [
                { type: TILE_TYPES.empty, position: { x: 0, y: 0 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 1, y: 0 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 0, y: 1 } } as Tile,
            ],
        };
        const result = service.checkWallPlacement();
        expect(result).toBeTrue();
    });

    it('should return false when some accessible tiles are blocked by walls', () => {
        const mapSize = 10;
        service.editorGame = {
            ...mockGame,
            size: 'Petite Taille',
            map: [
                { type: TILE_TYPES.empty, position: { x: 0, y: 0 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 1, y: 0 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 2, y: 0 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 0, y: 1 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 1, y: 1 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 2, y: 1 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 0, y: 2 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 1, y: 2 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 2, y: 2 } } as Tile,
            ],
        };
        spyOn(service, 'converterSize').and.returnValue(mapSize);
        const result = service.checkWallPlacement();
        expect(result).toBeFalse();
        expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.wallBlocking);
    });

    it('should check wall placement with blocked tiles', () => {
        service.editorGame = {
            ...service.editorGame,
            size: 'Petite Taille',
            map: [
                { type: TILE_TYPES.empty, position: { x: 0, y: 0 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 1, y: 0 } } as Tile,
                { type: TILE_TYPES.wall, position: { x: 0, y: 1 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 1, y: 1 } } as Tile,
            ],
        };
        const result = service.checkWallPlacement();
        expect(result).toBeFalse();
        expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.wallBlocking);
    });

    it('should validate connected accessible tiles', () => {
        service.editorGame = {
            ...service.editorGame,
            size: 'Petite Taille',
            map: [
                { type: TILE_TYPES.empty, position: { x: 0, y: 0 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 1, y: 0 } } as Tile,
                { type: TILE_TYPES.empty, position: { x: 0, y: 1 } } as Tile,
            ],
        };
        spyOn(console, 'log');

        const result = service.checkWallPlacement();

        expect(result).toBeTrue();
    });

    describe('Map Usage', () => {
        it('should allow maps with exactly 50% wall tiles', () => {
            service.editorGame = {
                ...mockGame,
                map: [
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                ],
            };
            const result = service.checkMapUsage();
            expect(result).toBeTrue();
        });

        it('should reject maps with more than 50% wall tiles', () => {
            service.editorGame = {
                ...mockGame,
                map: [
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                ],
            };
            const result = service.checkMapUsage();
            expect(result).toBeFalse();
            expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.mapTerrain);
        });

        it('should allow maps with less than 50% wall tiles', () => {
            service.editorGame = {
                ...mockGame,
                map: [
                    { type: TILE_TYPES.wall } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                    { type: TILE_TYPES.empty } as Tile,
                ],
            };
            const result = service.checkMapUsage();
            expect(result).toBeTrue();
        });
    });

    describe('Ground Type Tests', () => {
        describe('notGroundType', () => {
            it('should return true for wall and door tiles', () => {
                expect(service.notGroundType(TILE_TYPES.wall)).toBeTrue();
                expect(service.notGroundType(TILE_TYPES.door)).toBeTrue();
            });

            it('should return false for ground tiles', () => {
                expect(service.notGroundType(TILE_TYPES.empty)).toBeFalse();
                expect(service.notGroundType(TILE_TYPES.water)).toBeFalse();
                expect(service.notGroundType(TILE_TYPES.ice)).toBeFalse();
            });
        });
    });

    describe('Door Tests', () => {
        describe('Door Placement Validation', () => {
            it('should validate vertical door placement', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.wall },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.door },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.wall },
                        { type: TILE_TYPES.empty },
                    ],
                } as Game;

                spyOn(service, 'isVerticalDoor').and.returnValue(true);
                spyOn(service, 'checkVerticalDoor').and.returnValue(true);

                expect(service.isValidDoorPlacement(4)).toBeTrue();
                expect(service.isVerticalDoor).toHaveBeenCalledWith(4);
                expect(service.checkVerticalDoor).toHaveBeenCalledWith(4);
            });

            it('should validate horizontal door placement', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.wall },
                        { type: TILE_TYPES.door },
                        { type: TILE_TYPES.wall },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                    ],
                } as Game;

                spyOn(service, 'isVerticalDoor').and.returnValue(false);
                spyOn(service, 'isHorizontalDoor').and.returnValue(true);
                spyOn(service, 'checkHorizontalDoor').and.returnValue(true);

                expect(service.isValidDoorPlacement(4)).toBeTrue();
                expect(service.isHorizontalDoor).toHaveBeenCalledWith(4);
                expect(service.checkHorizontalDoor).toHaveBeenCalledWith(4);
            });

            it('should reject door not between walls', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.door },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                        { type: TILE_TYPES.empty },
                    ],
                } as Game;

                spyOn(service, 'isVerticalDoor').and.returnValue(false);
                spyOn(service, 'isHorizontalDoor').and.returnValue(false);

                expect(service.isValidDoorPlacement(4)).toBeFalse();
                expect(notificationServiceSpy.errorMessages[0]).toEqual('Les portes doivent être placées entre deux murs \n');
            });

            it('should reject door placement on map edges', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [{ type: TILE_TYPES.door }, { type: TILE_TYPES.wall }, { type: TILE_TYPES.empty }],
                } as Game;

                spyOn(service, 'isVerticalDoor').and.throwError('Edge error');

                expect(service.isValidDoorPlacement(0)).toBeFalse();
                expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.doorPlacement);
            });
        });

        describe('Door Orientation', () => {
            it('should return true when door is between vertical walls', () => {
                const mapSize = 3;
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty, position: { x: 0, y: 0 } },
                        { type: TILE_TYPES.wall, position: { x: 1, y: 0 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 0 } },
                        { type: TILE_TYPES.empty, position: { x: 0, y: 1 } },
                        { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 1 } },
                        { type: TILE_TYPES.empty, position: { x: 0, y: 2 } },
                        { type: TILE_TYPES.wall, position: { x: 1, y: 2 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 2 } },
                    ],
                } as Game;

                spyOn(service, 'converterSize').and.returnValue(mapSize);
                expect(service.isVerticalDoor(4)).toBeTrue();
            });

            it('should return false when vertical walls are missing', () => {
                const mapSize = 3;
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty, position: { x: 0, y: 0 } },
                        { type: TILE_TYPES.empty, position: { x: 1, y: 0 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 0 } },
                        { type: TILE_TYPES.empty, position: { x: 0, y: 1 } },
                        { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 1 } },
                        { type: TILE_TYPES.empty, position: { x: 0, y: 2 } },
                        { type: TILE_TYPES.wall, position: { x: 1, y: 2 } },
                        { type: TILE_TYPES.empty, position: { x: 2, y: 2 } },
                    ],
                } as Game;

                spyOn(service, 'converterSize').and.returnValue(mapSize);
                expect(service.isVerticalDoor(4)).toBeFalse();
            });

            it('should return true when door is between horizontal walls', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.wall, position: { x: 0, y: 1 } },
                        { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                        { type: TILE_TYPES.wall, position: { x: 2, y: 1 } },
                    ],
                } as Game;

                expect(service.isHorizontalDoor(1)).toBeTrue();
            });

            it('should return false when horizontal walls are missing', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [
                        { type: TILE_TYPES.empty, position: { x: 0, y: 1 } },
                        { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                        { type: TILE_TYPES.wall, position: { x: 2, y: 1 } },
                    ],
                } as Game;

                expect(service.isHorizontalDoor(1)).toBeFalse();
            });

            it('should throw error when accessing out of bounds indices', () => {
                service.editorGame = {
                    size: 'Petite Taille',
                    map: [{ type: TILE_TYPES.door, position: { x: 0, y: 0 } }],
                } as Game;

                expect(() => service.isHorizontalDoor(0)).toThrow();
            });
        });

        describe('Door Adjacent Tiles', () => {
            describe('checkVerticalDoor', () => {
                it('should return true when adjacent tiles are ground type', () => {
                    const mapSize = 3;
                    service.editorGame = {
                        size: 'Petite Taille',
                        map: [
                            { type: TILE_TYPES.wall, position: { x: 1, y: 0 } },
                            { type: TILE_TYPES.empty, position: { x: 0, y: 1 } },
                            { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                            { type: TILE_TYPES.water, position: { x: 2, y: 1 } },
                            { type: TILE_TYPES.wall, position: { x: 1, y: 2 } },
                        ],
                    } as Game;

                    spyOn(service, 'converterSize').and.returnValue(mapSize);
                    expect(service.checkVerticalDoor(2)).toBeTrue();
                });

                it('should return false when left tile is not ground type', () => {
                    service.editorGame = {
                        map: [{ type: TILE_TYPES.wall }, { type: TILE_TYPES.door }, { type: TILE_TYPES.empty }],
                    } as Game;

                    expect(service.checkVerticalDoor(1)).toBeFalse();
                    expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.terrainTiles);
                });

                it('should return false when right tile is not ground type', () => {
                    service.editorGame = {
                        map: [{ type: TILE_TYPES.empty }, { type: TILE_TYPES.door }, { type: TILE_TYPES.door }],
                    } as Game;

                    expect(service.checkVerticalDoor(1)).toBeFalse();
                    expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.terrainTiles);
                });
            });

            describe('checkHorizontalDoor', () => {
                it('should return true when adjacent tiles are ground type', () => {
                    const mapSize = 3;
                    service.editorGame = {
                        size: 'Petite Taille',
                        map: [
                            { type: TILE_TYPES.empty, position: { x: 0, y: 0 } },
                            { type: TILE_TYPES.empty, position: { x: 1, y: 0 } },
                            { type: TILE_TYPES.empty, position: { x: 2, y: 0 } },
                            { type: TILE_TYPES.wall, position: { x: 0, y: 1 } },
                            { type: TILE_TYPES.door, position: { x: 1, y: 1 } },
                            { type: TILE_TYPES.wall, position: { x: 2, y: 1 } },
                            { type: TILE_TYPES.empty, position: { x: 0, y: 2 } },
                            { type: TILE_TYPES.empty, position: { x: 1, y: 2 } },
                            { type: TILE_TYPES.empty, position: { x: 2, y: 2 } },
                        ],
                    } as Game;

                    spyOn(service, 'converterSize').and.returnValue(mapSize);
                    expect(service.checkHorizontalDoor(4)).toBeTrue();
                });

                it('should return false when top tile is not ground type', () => {
                    const mapSize = 3;
                    service.editorGame = {
                        map: [
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.empty },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.door },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.empty },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.empty },
                        ],
                    } as Game;

                    spyOn(service, 'converterSize').and.returnValue(mapSize);
                    expect(service.checkHorizontalDoor(4)).toBeFalse();
                    expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.terrainTiles);
                });

                it('should return false when bottom tile is not ground type', () => {
                    const mapSize = 3;
                    service.editorGame = {
                        map: [
                            { type: TILE_TYPES.empty },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.empty },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.door },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.wall },
                            { type: TILE_TYPES.empty },
                        ],
                    } as Game;

                    spyOn(service, 'converterSize').and.returnValue(mapSize);
                    expect(service.checkHorizontalDoor(4)).toBeFalse();
                    expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.terrainTiles);
                });

                describe('findErrorMessage', () => {
                    it('should return true when error message exists', () => {
                        const testMessage = 'test error message';
                        notificationServiceSpy.errorMessages = [testMessage];
                        expect(service.findErrorMessage(testMessage)).toBeTrue();
                    });

                    it('should return false when error message does not exist', () => {
                        const testMessage = 'test error message';
                        notificationServiceSpy.errorMessages = ['different message'];
                        expect(service.findErrorMessage(testMessage)).toBeFalse();
                    });

                    it('should return false when error messages array is empty', () => {
                        notificationServiceSpy.errorMessages = [];
                        expect(service.findErrorMessage('any message')).toBeFalse();
                    });
                });
            });
        });
    });
    describe('isMapValid', () => {
        it('should show the error modal when error messages exist', () => {
            spyOn(service, 'checkDoorValidity').and.returnValue(true);
            spyOn(service, 'checkWallPlacement').and.returnValue(true);
            spyOn(service, 'checkMapUsage').and.returnValue(true);
            spyOn(service, 'checkSpawnUsage').and.returnValue(true);

            notificationServiceSpy.errorMessages = ['Test error message'];
            notificationServiceSpy.showModal = false;

            const result = service.isMapValid();

            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(result).toBeTrue();
        });
    });

    describe('Item Placement Tests', () => {
        beforeEach(() => {
            Object.defineProperty(itemSelectorServiceSpy, 'nItems', { get: jasmine.createSpy('nItemsGetter') });
            Object.defineProperty(itemSelectorServiceSpy, 'maxItems', { get: jasmine.createSpy('maxItemsGetter') });
        });

        it('should return true when all items are placed', () => {
            (Object.getOwnPropertyDescriptor(itemSelectorServiceSpy, 'nItems')?.get as jasmine.Spy).and.returnValue(5);
            (Object.getOwnPropertyDescriptor(itemSelectorServiceSpy, 'maxItems')?.get as jasmine.Spy).and.returnValue(5);

            const result = (service as any)['checkNumberOfItems']();

            expect(result).toBeTrue();
            expect(notificationServiceSpy.errorMessages.length).toBe(0);
        });

        it('should return false when items are missing', () => {
            (Object.getOwnPropertyDescriptor(itemSelectorServiceSpy, 'nItems')?.get as jasmine.Spy).and.returnValue(3);
            (Object.getOwnPropertyDescriptor(itemSelectorServiceSpy, 'maxItems')?.get as jasmine.Spy).and.returnValue(5);

            notificationServiceSpy.errorMessages = [];

            const result = (service as any)['checkNumberOfItems']();

            expect(result).toBeFalse();
            expect(notificationServiceSpy.errorMessages.length).toBe(1);
            expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.itemPlacement);
        });

        it('should be called during map validation', () => {
            spyOn<any>(service, 'checkNumberOfItems').and.returnValue(true);

            service.isMapValid();

            expect(service['checkNumberOfItems']).toHaveBeenCalled();
        });

        describe('Flag Validation Tests', () => {
            beforeEach(() => {
                service = TestBed.inject(MapValidityService);
                service.editorGame = { ...mockGame };
                notificationServiceSpy.errorMessages = [];
            });

            it('should return true for classic game mode regardless of flag presence', () => {
                service.editorGame = {
                    ...mockGame,
                    gameMode: 'Classique',
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            item: null,
                            type: '',
                            traversable: false,
                            player: null,
                            image: '',
                            cost: null,
                        },
                    ],
                };
                expect(service.checkFlagInMode()).toBeTrue();
                expect(notificationServiceSpy.errorMessages.length).toBe(0);
            });

            it('should return true for CTF game mode when flag is present', () => {
                service.editorGame = {
                    ...mockGame,
                    gameMode: 'CTF',
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            item: {
                                type: ITEM_TYPES.flag,
                                position: { x: 0, y: 0 },
                                image: '',
                                name: '',
                                id: 0,
                                description: '',
                                isOutOfContainer: false,
                            },
                            type: '',
                            traversable: false,
                            player: null,
                            image: '',
                            cost: null,
                        },
                    ],
                };
                expect(service.checkFlagInMode()).toBeTrue();
                expect(notificationServiceSpy.errorMessages.length).toBe(0);
            });

            it('should return false for CTF game mode when flag is not present', () => {
                service.editorGame = {
                    ...mockGame,
                    gameMode: 'CTF',
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            item: null,
                            type: '',
                            traversable: false,
                            player: null,
                            image: '',
                            cost: null,
                        },
                    ],
                };
                expect(service.checkFlagInMode()).toBeFalse();
                expect(notificationServiceSpy.errorMessages.length).toBe(1);
                expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.flagRequired);
            });

            it('should not add duplicate error message when flag is missing in CTF mode', () => {
                service.editorGame = {
                    ...mockGame,
                    gameMode: 'CTF',
                    map: [
                        {
                            position: { x: 0, y: 0 },
                            item: null,
                            type: '',
                            traversable: false,
                            player: null,
                            image: '',
                            cost: null,
                        },
                    ],
                };

                notificationServiceSpy.errorMessages.push(ERROR_MESSAGES.flagRequired);

                service.checkFlagInMode();

                expect(notificationServiceSpy.errorMessages.length).toBe(1);
                expect(notificationServiceSpy.errorMessages[0]).toEqual(ERROR_MESSAGES.flagRequired);
            });

            it('should be called during map validation', () => {
                spyOn(service, 'checkFlagInMode').and.returnValue(true);
                service.isMapValid();
                expect(service.checkFlagInMode).toHaveBeenCalled();
            });
        });
    });
});
