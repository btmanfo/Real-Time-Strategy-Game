/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Sort } from '@angular/material/sort';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { AllWaitingRoomInfo } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { EndGameStats, Game, GameData, GameSize, GlobalStatistics, Player } from '@common/interfaces';
import { of, Subject } from 'rxjs';
import { EndGamePageComponent } from './end-game-page.component';

describe('EndGamePageComponent', () => {
    let component: EndGamePageComponent;
    let fixture: ComponentFixture<EndGamePageComponent>;
    let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockJoinGameService: jasmine.SpyObj<JoinGameService>;
    let mockPlayingService: jasmine.SpyObj<PlayingService>;

    const mockPlayer: Player = {
        name: 'TestPlayer' as string | null,
        team: 'Red',
        stats: {
            nbVictory: 0,
            nbDefeat: 0,
            nbDamage: 0,
            nbLifeLost: 0,
            nbCombat: 0,
            nbEvasion: 0,
            pourcentageOfTile: 0,
            name: null,
            nbItem: 0,
            nbDoors: 0,
        },
        life: 0,
        speed: 0,
        attack: null,
        defense: null,
        avatarUrl: null,
        coordinate: { x: 0, y: 0 },
        isAdmin: false,
    };

    const mockStats: GlobalStatistics = {
        allTime: 50,
        secondTime: 100,
        percentageOfTile: 0,
        percentageOfDors: 0,
        nbrPlayerOpenDoor: 0,
        allDoors: [],
        nbOfTakenFleg: 0,
    };

    const mockGame: Game = {
        name: 'TestMap',
        gameMode: 'CTF',
        id: '',
        description: '',
        size: GameSize.bigSize,
        visibility: false,
        map: [],
        map2: [],
        modificationDate: '',
        screenshot: '',
    };

    const mockAllWaitingRoomInfo: AllWaitingRoomInfo = {
        allPlayer: [mockPlayer],
        game: mockGame,
        playerIndex: '0',
        roomCode: 'testCode',
        roomSize: '1',
        playerName: '',
    };

    beforeEach(async () => {
        mockActivatedRoute = {
            queryParams: of({ source: 'testSource', code: 'testCode', winningTeam: 'Red' }),
        } as any;

        mockGameService = jasmine.createSpyObj('GameService', ['getNewGame']);
        mockGameService.getNewGame.and.returnValue({ name: 'TestMap', gameMode: 'CTF' } as Game);

        mockJoinGameService = jasmine.createSpyObj('JoinGameService', ['getAllINformation', 'getAllGlobalInfo', 'getAllInfo']);
        mockJoinGameService.getAllINformation.and.returnValue(of(mockAllWaitingRoomInfo));
        mockJoinGameService.getAllGlobalInfo.and.returnValue(of(mockStats));
        mockJoinGameService.getAllInfo.and.returnValue(of({} as GameData));

        mockPlayingService = jasmine.createSpyObj('PlayingService', ['checkWinner', 'getGameWinner'], {
            localPlayer: mockPlayer,
            players: [mockPlayer],
        });
        mockPlayingService.getGameWinner.and.returnValue('TestPlayer');

        await TestBed.configureTestingModule({
            imports: [BrowserAnimationsModule],
            providers: [
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: GameService, useValue: mockGameService },
                { provide: JoinGameService, useValue: mockJoinGameService },
                { provide: PlayingService, useValue: mockPlayingService },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(EndGamePageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should initialize component and fetch data', fakeAsync(() => {
            component.ngOnInit();
            tick();

            expect(component['source']).toBe('testSource');
            expect(component['code']).toBe('testCode');
            expect(component.mapName).toBe('TestMap');
            expect(mockJoinGameService.getAllINformation).toHaveBeenCalled();
            expect(mockJoinGameService.getAllGlobalInfo).toHaveBeenCalled();
            expect(mockJoinGameService.getAllInfo).toHaveBeenCalled();
        }));

        it('should evaluate game result for CTF mode correctly', fakeAsync(() => {
            component.ngOnInit();
            tick();
            expect(component.isWinner).toBeTrue();
        }));
    });

    describe('Data Fetching and Processing', () => {
        beforeEach(() => {
            component.ngOnInit();
        });

        it('should fetch and process player information', fakeAsync(() => {
            tick();
            expect(mockJoinGameService.getAllINformation).toHaveBeenCalledWith('testSource', 'testCode');
            expect(component.dataSource.data).toEqual([mockPlayer]);
        }));

        it('should fetch and process global statistics', fakeAsync(() => {
            tick();
            expect(mockJoinGameService.getAllGlobalInfo).toHaveBeenCalledWith('testCode');
            expect(component.endGameTime).toBe(50);
        }));
    });

    describe('Getters and Setters', () => {
        it('should get and set currentSortColumnValue', () => {
            component.currentSortColumnValue = 'testColumn';
            expect(component.currentSortColumnValue).toBe('testColumn');
        });

        it('should get and set currentSortDirectionValue', () => {
            component.currentSortDirectionValue = 'desc';
            expect(component.currentSortDirectionValue).toBe('desc');
        });
    });

    describe('getRightName', () => {
        it('should return correct translated stat name', () => {
            expect(component.getRightName('nbVictory')).toBe('victoire');
            expect(component.getRightName('nbItem')).toBe('items');
        });
    });

    describe('getSortIcon', () => {
        it('should return sort icon if not current column', () => {
            component.currentSortColumnValue = 'other';
            expect(component.getSortIcon('nom')).toBe('sort');
        });

        it('should return arrow_upward when direction is asc', () => {
            component.currentSortColumnValue = 'nom';
            component.currentSortDirectionValue = 'asc';
            expect(component.getSortIcon('nom')).toBe('arrow_upward');
        });

        it('should return arrow_downward when direction is desc', () => {
            component.currentSortColumnValue = 'nom';
            component.currentSortDirectionValue = 'desc';
            expect(component.getSortIcon('nom')).toBe('arrow_downward');
        });
    });

    describe('sortData', () => {
        beforeEach(() => {
            component.sort = {
                active: '',
                direction: 'asc',
                sortChange: {
                    emit: jasmine.createSpy('emit'),
                },
            } as any;
        });

        it('should toggle direction on same column', () => {
            component.currentSortColumnValue = 'nom';
            component.currentSortDirectionValue = 'asc';
            component.sortData('nom');
            expect(component.currentSortDirectionValue).toBe('desc');
        });

        it('should set new column and asc direction', () => {
            component.currentSortColumnValue = 'other';
            component.currentSortDirectionValue = 'desc';
            component.sortData('nom');
            expect(component.currentSortColumnValue).toBe('nom');
            expect(component.currentSortDirectionValue).toBe('asc');
        });
    });

    describe('evaluateGameResult - non CTF mode', () => {
        beforeEach(() => {
            mockGameService.getNewGame.and.returnValue({ name: 'TestMap', gameMode: 'Classic' } as Game);
            mockPlayingService.getGameWinner.and.returnValue('TestPlayer');
        });

        it('should evaluate winner for non-CTF mode', fakeAsync(() => {
            component.ngOnInit();
            tick();
            expect(component.isWinner).toBeTrue();
        }));
    });

    describe('Time Formatting', () => {
        it('should format time correctly', () => {
            expect(component.formatTime(65)).toBe('1:05');
            expect(component.formatTime(130)).toBe('2:10');
        });
    });

    describe('Cleanup', () => {
        it('should clean up subscriptions on destroy', () => {
            const destroySpy = spyOn(component['destroy$'], 'next');
            const completeSpy = spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(destroySpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });

        it('should return the GameService instance', () => {
            expect(component.serviceGameValue).toBe(mockGameService);
        });
    });

    describe('ngAfterViewInit', () => {
        beforeEach(() => {
            component.sort = {
                active: '',
                direction: 'asc',
                sortChange: new Subject<Sort>(),
            } as any;

            component.paginator = {
                pageSize: 10,
                pageIndex: 0,
                length: 0,
                page: new Subject(),
            } as any;

            component.dataSource = {
                sort: null,
                paginator: null,
                sortingDataAccessor: jasmine.createSpy('sortingDataAccessor'),
            } as any;
        });

        it('should set sort and paginator for dataSource', () => {
            component.ngAfterViewInit();

            expect(component.dataSource.sort).toBe(component.sort);
            expect(component.dataSource.paginator).toBe(component.paginator);
        });

        it('should set sortingDataAccessor for dataSource', () => {
            component.ngAfterViewInit();

            const localMockPlayer: Player = {
                name: 'TestPlayer',
                stats: {
                    nbVictory: 5,
                    nbDefeat: 2,
                } as EndGameStats,
            } as Player;

            const result = component.dataSource.sortingDataAccessor(localMockPlayer, 'nbVictory');
            expect(result).toBe(5);

            const resultDefault = component.dataSource.sortingDataAccessor(localMockPlayer, 'name');
            expect(resultDefault).toEqual(0);
        });

        it('should update currentSortColumn and currentSortDirection on sortChange', () => {
            component.ngAfterViewInit();

            const sortEvent: Sort = { active: 'nbVictory', direction: 'desc' };
            (component.sort.sortChange as Subject<Sort>).next(sortEvent);

            expect(component['currentSortColumn']).toBe('nbVictory');
            expect(component['currentSortDirection']).toBe('desc');
        });
    });
});
