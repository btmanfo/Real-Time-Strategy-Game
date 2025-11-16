/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Game } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { BehaviorSubject, of } from 'rxjs';
import { ChooseGamePageComponent } from './choose-game.component';

describe('ChooseGamePage', () => {
    let component: ChooseGamePageComponent;
    let fixture: ComponentFixture<ChooseGamePageComponent>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let notificationServiceSpy: any;

    const mockGames: Game[] = [
        {
            id: '1',
            name: 'Game1',
            description: 'Test1',
            size: 'large',
            gameMode: 'classic',
            visibility: true,
            map: [],
            map2: [],
            modificationDate: '2024-01-01',
            screenshot: '',
        },
        {
            id: '2',
            name: 'Game2',
            description: 'Test2',
            size: 'small',
            gameMode: 'CTF',
            visibility: false,
            map: [],
            map2: [],
            modificationDate: '2024-01-02',
            screenshot: '',
        },
    ];

    beforeEach(async () => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['getGames', 'getVisibleGames']);
        gameServiceSpy.getGames.and.returnValue(of(mockGames));
        gameServiceSpy.getVisibleGames.and.returnValue(of(mockGames.filter((g) => g.visibility)));

        notificationServiceSpy = {
            showModal: false,
            errorMessages: [],
            notification$: new BehaviorSubject<string>(''),
        };

        await TestBed.configureTestingModule({
            imports: [ChooseGamePageComponent],
            providers: [
                { provide: GameService, useValue: gameServiceSpy },
                { provide: NotificationService, useValue: notificationServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParams: {} }, paramMap: of(new Map()) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChooseGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should load games on init', () => {
            spyOn(component, 'loadGames');
            component.ngOnInit();
            expect(component.loadGames).toHaveBeenCalled();
        });
    });

    describe('Filter Operations', () => {
        beforeEach(() => {
            component.games = mockGames;
            component.extractFilterOptions();
        });

        it('should extract unique game modes', () => {
            expect(component.gameModes).toContain('classic');
            expect(component.gameModes).toContain('CTF');
        });

        it('should extract unique sizes', () => {
            expect(component.sizes).toContain('large');
            expect(component.sizes).toContain('small');
        });

        it('should filter by visibility', () => {
            component.visibilityFilter = 'visible';
            component.applyFilters();
            expect(component.filteredGames.length).toBe(1);
            expect(component.filteredGames[0].visibility).toBeTrue();
        });

        it('should filter by game mode', () => {
            component.gameModeFilter = 'CTF';
            component.applyFilters();
            expect(component.filteredGames.length).toBe(1);
            expect(component.filteredGames[0].gameMode).toBe('CTF');
        });

        it('should filter by size', () => {
            component.sizeFilter = 'large';
            component.applyFilters();
            expect(component.filteredGames.length).toBe(1);
            expect(component.filteredGames[0].size).toBe('large');
        });

        it('should reset all filters', () => {
            component.visibilityFilter = 'visible';
            component.gameModeFilter = 'CTF';
            component.sizeFilter = 'large';
            component.resetFilters();
            expect(component.visibilityFilter).toBe('all');
            expect(component.gameModeFilter).toBe('all');
            expect(component.sizeFilter).toBe('all');
        });
    });

    describe('Admin vs Non-Admin Operations', () => {
        it('should load all games for admin', fakeAsync(() => {
            component.isAdmin = true;
            component.loadGames();
            tick();
            expect(gameServiceSpy.getGames).toHaveBeenCalled();
            expect(component.games.length).toBe(mockGames.length);
        }));

        it('should load only visible games for non-admin', fakeAsync(() => {
            component.isAdmin = false;
            component.loadGames();
            tick();
            expect(gameServiceSpy.getVisibleGames).toHaveBeenCalled();
            expect(component.games.length).toBe(mockGames.filter((g) => g.visibility).length);
        }));
    });

    describe('Notification Handling', () => {
        it('should show notification when message received', fakeAsync(() => {
            const testMessage = 'Test notification';
            notificationServiceSpy.notification$.next(testMessage);
            tick();
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(notificationServiceSpy.errorMessages).toContain(testMessage);
        }));

        it('should hide popup and reload games', () => {
            spyOn(component, 'loadGames');
            component.hidePopup();
            expect(notificationServiceSpy.showModal).toBeFalse();
            expect(component.loadGames).toHaveBeenCalled();
        });
    });

    describe('Filter Change Events', () => {
        it('should apply filters on visibility change', () => {
            spyOn(component, 'applyFilters');
            component.onVisibilityFilterChange();
            expect(component.applyFilters).toHaveBeenCalled();
        });

        it('should apply filters on game mode change', () => {
            spyOn(component, 'applyFilters');
            component.onGameModeFilterChange();
            expect(component.applyFilters).toHaveBeenCalled();
        });

        it('should apply filters on size change', () => {
            spyOn(component, 'applyFilters');
            component.onSizeFilterChange();
            expect(component.applyFilters).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on destroy', () => {
            const nextSpy = spyOn(component['destroy$'], 'next');
            const completeSpy = spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });

    describe('Title Handling', () => {
        it('should return correct admin title', () => {
            expect(component.getTitleAdminValue).toBe('ADMINISTRATION DE VOTRE PARTIE');
        });

        it('should return correct regular title', () => {
            expect(component.getTitleValue).toBe('CRÉATION DE VOTRE PARTIE');
        });

        describe('Game Deletion', () => {
            it('should reload games when a game is deleted', () => {
                spyOn(component, 'loadGames');
                component.onGameDeleted();
                expect(component.loadGames).toHaveBeenCalled();
            });

            it('should update filtered games after deletion', () => {
                spyOn(component, 'loadGames').and.callFake(() => {
                    component.games = [mockGames[0]];
                    component.applyFilters();
                });
                component.onGameDeleted();
                expect(component.loadGames).toHaveBeenCalled();
                expect(component.filteredGames.length).toBe(1);
                expect(component.filteredGames[0].id).toBe('1');
            });
        });
    });
});
