/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { of } from 'rxjs';

describe('GameService', () => {
    let service: GameService;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;

    let dummyGame: Game;

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'patch', 'delete']);
        TestBed.configureTestingModule({
            providers: [GameService, { provide: HttpClient, useValue: httpClientSpy }],
        });

        service = TestBed.inject(GameService);

        dummyGame = {
            id: '1',
            description: 'Test description',
            name: 'Test Game',
            size: 'Moyenne Taille',
            gameMode: 'Classique',
            visibility: true,
            map: [],
            map2: [],
            modificationDate: new Date().toISOString(),
            screenshot: 'mock-screenshot',
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('HTTP requests for games', () => {
        it('should call getGames and return the correct games', () => {
            const mockGames: Game[] = [dummyGame];
            httpClientSpy.get.and.returnValue(of(mockGames));
            service.getGames().subscribe((games: Game[]) => {
                expect(games).toEqual(mockGames);
                expect(httpClientSpy.get).toHaveBeenCalledWith(`${service['apiUrl']}`);
            });
        });

        it('should call getVisibleGames and return the correct games', () => {
            const mockGames: Game[] = [dummyGame];
            httpClientSpy.get.and.returnValue(of(mockGames));
            service.getVisibleGames().subscribe((games: Game[]) => {
                expect(games).toEqual(mockGames);
                expect(httpClientSpy.get).toHaveBeenCalledWith(`${service['apiUrl']}/visible`);
            });
        });

        it('should call getGameById and return the correct game', () => {
            httpClientSpy.get.and.returnValue(of(dummyGame));
            service.getGameById(dummyGame.id).subscribe((game: Game) => {
                expect(game).toEqual(dummyGame);
                expect(httpClientSpy.get).toHaveBeenCalledWith(`${service['apiUrl']}/${dummyGame.id}`);
            });
        });

        it('should call createGame and send the correct game', () => {
            httpClientSpy.post.and.returnValue(of(dummyGame));
            service.createGame(dummyGame).subscribe((game: Game) => {
                expect(game).toEqual(dummyGame);
                expect(httpClientSpy.post).toHaveBeenCalledWith(service['apiUrl'], dummyGame);
            });
        });

        it('should call deleteGame and delete the correct game', () => {
            httpClientSpy.delete.and.returnValue(of(undefined));
            service.deleteGame(dummyGame.id).subscribe(() => {
                expect().nothing();
                expect(httpClientSpy.delete).toHaveBeenCalledWith(`${service['apiUrl']}/${dummyGame.id}`);
            });
        });

        it('should call updateGame and send the updated game', () => {
            httpClientSpy.patch.and.returnValue(of(dummyGame));
            service.updateGame(dummyGame.id, dummyGame).subscribe((game: Game) => {
                expect(game).toEqual(dummyGame);
                expect(httpClientSpy.patch).toHaveBeenCalledWith(`${service['apiUrl']}/${dummyGame.id}`, dummyGame);
            });
        });

        it('should call updateVisibility and send the correct visibility change', () => {
            httpClientSpy.patch.and.returnValue(of(dummyGame));
            service.updateVisibility(dummyGame.id, false).subscribe((game: Game) => {
                expect(game).toEqual(dummyGame);
                expect(httpClientSpy.patch).toHaveBeenCalledWith(`${service['apiUrl']}/${dummyGame.id}/visibility`, { visibility: false });
            });
        });
    });

    it('should return a copy of the default game object', () => {
        const newGame = service.getNewGame();
        expect(newGame).toEqual({
            id: '',
            description: '',
            name: '',
            size: '',
            gameMode: '',
            visibility: false,
            map: [],
            map2: [],
            modificationDate: jasmine.any(String),
            screenshot: '',
        });
        expect(newGame).not.toBe(service['newGamePop']);
    });

    it('should format a valid date correctly', () => {
        const date = new Date(2023, 10, 21, 15, 30);
        const formattedDate = service.formatDate(date);
        expect(formattedDate).toEqual('2023/11/21 - 15:30');
    });

    it('should return "Invalid Date" for an invalid date', () => {
        const invalidDate = 'invalid-date';
        const formattedDate = service.formatDate(invalidDate);
        expect(formattedDate).toEqual('Invalid Date');
    });

    it('should set the new game object correctly', () => {
        const newDummyGame = { ...dummyGame, name: 'New Test Game' };
        service.setNewGame(newDummyGame);
        const newGame = service.getNewGame();
        expect(newGame).toEqual({
            ...newDummyGame,
            modificationDate: jasmine.any(String),
        });
        expect(newGame).not.toBe(service['newGamePop']);
    });
});
