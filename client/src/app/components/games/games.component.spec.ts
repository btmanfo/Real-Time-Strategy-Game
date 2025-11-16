import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Game } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { of } from 'rxjs';
import { GameCardComponent } from './games.component';

describe('GameCardComponent', () => {
    let component: GameCardComponent;
    let fixture: ComponentFixture<GameCardComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let router: Router;

    const mockGame: Game = {
        id: 'game123',
        name: 'Test Game',
        description: 'A fun test game',
        size: 'Grand Taille',
        gameMode: 'Petit Taille',
        visibility: true,
        map: [],
        map2: [],
        modificationDate: new Date().toISOString(),
        screenshot: 'mock-screenshot',
    };

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['deleteGame', 'updateVisibility', 'setNewGame', 'getGameById']);
        mockNotificationService = jasmine.createSpyObj('NotificationService', ['listenForDeletedGame', 'listenForNotifications']);

        await TestBed.configureTestingModule({
            imports: [GameCardComponent],
            providers: [
                provideRouter([]),
                { provide: GameService, useValue: mockGameService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCardComponent);
        component = fixture.componentInstance;
        component.game = mockGame;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should hide menu icon if showMenu is false', () => {
        component.showMenu = false;
        fixture.detectChanges();
        const menuIcon = fixture.debugElement.query(By.css('.menu-icon'));
        expect(menuIcon).toBeNull();
    });

    it('should confirm delete and open popup', () => {
        component.confirmDelete(mockGame.id);
        expect(component.selectedGameId).toBe(mockGame.id);
        expect(component.showPopup).toBeTrue();
    });

    it('should close popup', () => {
        component.showPopup = true;
        component.selectedGameId = mockGame.id;
        component.closePopup();
        expect(component.showPopup).toBeFalse();
        expect(component.selectedGameId).toBeNull();
    });

    it('should delete game and emit event', () => {
        mockGameService.deleteGame.and.returnValue(of(undefined));
        spyOn(component.gameDeleted, 'emit');

        component.deleteGame(mockGame);

        expect(mockGameService.deleteGame).toHaveBeenCalledWith(mockGame.id);
        expect(component.gameDeleted.emit).toHaveBeenCalledWith(mockGame.id);
        expect(mockNotificationService.listenForDeletedGame).toHaveBeenCalled();
    });

    it('should toggle game visibility', () => {
        mockGameService.updateVisibility.and.returnValue(of({ ...mockGame, visibility: false }));

        component.toggleVisibility(mockGame);

        expect(mockGameService.updateVisibility).toHaveBeenCalledWith(mockGame.id, false);
        expect(mockNotificationService.listenForNotifications).toHaveBeenCalled();
    });

    it('should navigate to edition when modifying a game', () => {
        spyOn(router, 'navigate');

        component.modifyGame(mockGame);

        expect(mockGameService.setNewGame).toHaveBeenCalledWith(mockGame);
        expect(router.navigate).toHaveBeenCalledWith(['/edition']);
    });

    it('should show description when showDescription is called', () => {
        component.showMenu = true;
        component.showDescriptions = false;

        component.showDescription();

        expect(component.showMenu).toBeFalse();
        expect(component.showDescriptions).toBeTrue();
    });

    it('should hide description when hideDescription is called', () => {
        component.showDescriptions = true;

        component.hideDescription();

        expect(component.showDescriptions).toBeFalse();
    });

    it('should get game', () => {
        mockGameService.getGameById.and.returnValue(of(mockGame));

        component.getGame();

        expect(mockGameService.getGameById).toHaveBeenCalledWith(mockGame.id);
        expect(mockGameService.setNewGame).toHaveBeenCalledWith(mockGame);
    });
});
