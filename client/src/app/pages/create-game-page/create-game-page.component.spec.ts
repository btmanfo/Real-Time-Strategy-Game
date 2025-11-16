/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { GameService } from '@app/services/game-service/game.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateGameModePageComponent } from './create-game-page.component';

describe('CreateGameModePage', () => {
    let component: CreateGameModePageComponent;
    let fixture: ComponentFixture<CreateGameModePageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let router: Router;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['setNewGame', 'formatDate']);
        mockGameService.formatDate.and.returnValue('2025-02-23T00:00:00Z');

        await TestBed.configureTestingModule({
            imports: [CreateGameModePageComponent, CommonModule, FormsModule],
            providers: [
                provideRouter([{ path: 'edition', component: CreateGameModePageComponent }]),
                { provide: GameService, useValue: mockGameService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGameModePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize newGame with default values', () => {
        expect(component.newGame).toEqual({
            id: jasmine.any(String),
            name: '',
            description: '',
            size: '',
            gameMode: '',
            visibility: false,
            map: [],
            map2: [],
            modificationDate: jasmine.any(String),
            screenshot: '',
        });
    });

    it('should call onSubmit method when form is submitted', fakeAsync(() => {
        spyOn(component, 'onSubmit').and.callThrough();

        component.onSubmit();
        tick();

        expect(component.onSubmit).toHaveBeenCalled();
        expect(mockGameService.setNewGame).toHaveBeenCalledWith(
            jasmine.objectContaining({
                id: component.newGame.id,
                name: component.newGame.name,
                description: component.newGame.description,
                size: component.newGame.size,
                gameMode: component.newGame.gameMode,
                visibility: component.newGame.visibility,
                map: component.newGame.map,
                map2: component.newGame.map2,
                modificationDate: component.newGame.modificationDate,
            }),
        );
    }));

    it('should navigate to /edition after form submission', fakeAsync(() => {
        spyOn(router, 'navigate');

        component.onSubmit();
        tick();

        expect(router.navigate).toHaveBeenCalledWith(['/edition']);
    }));

    it('should call gameService.setNewGame with the new game object on form submit', fakeAsync(() => {
        const newGame = {
            id: uuidv4(),
            name: 'Test Game',
            description: 'A test game description',
            size: '200MB',
            gameMode: 'Survival',
            visibility: true,
            map: [],
            map2: [],
            modificationDate: new Date().toISOString(),
            screenshot: '',
        };

        component.newGame = newGame;

        component.onSubmit();
        tick();

        expect(mockGameService.setNewGame).toHaveBeenCalledWith(jasmine.objectContaining(newGame));
    }));

    it('should set gameId and mapSize in localStorage after form submission', fakeAsync(() => {
        const newGame = {
            id: uuidv4(),
            name: 'Test Game',
            description: 'A test game description',
            size: '200MB',
            gameMode: 'Survival',
            visibility: true,
            map: [],
            map2: [],
            modificationDate: new Date().toISOString(),
            screenshot: '',
        };

        component.newGame = newGame;

        spyOn(localStorage, 'setItem');

        component.onSubmit();
        tick();

        expect(localStorage.setItem).toHaveBeenCalledWith('gameId', '');
        expect(localStorage.setItem).toHaveBeenCalledWith('mapSize', '200MB');
    }));

    it('should call gameService.formatDate on initialization of newGame', () => {
        expect(mockGameService.formatDate).toHaveBeenCalled();
        expect(component.newGame.modificationDate).toBe('2025-02-23T00:00:00Z');
    });
});
