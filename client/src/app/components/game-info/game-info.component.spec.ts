import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { GameInfoComponent } from './game-info.component';

describe('GameInfoComponent', () => {
    let component: GameInfoComponent;
    let fixture: ComponentFixture<GameInfoComponent>;

    const mockGameService = jasmine.createSpyObj('GameService', ['']);
    const mockJoinGameService = jasmine.createSpyObj('JoinGameService', [''], {
        socket: { on: jasmine.createSpy(), emit: jasmine.createSpy() },
        pinCode: '1234',
    });
    const mockPlayingService = jasmine.createSpyObj('PlayingService', ['movePlayer', 'nextPlayer'], {
        joinGameService: null,
        playerTurn: { avatarUrl: 'avatar1' },
        myPlayer: { avatarUrl: 'avatar1' },
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameInfoComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: PlayingService, useValue: mockPlayingService },
                { provide: JoinGameService, useValue: mockJoinGameService },
            ],
        }).compileComponents();

        mockPlayingService.joinGameService = mockJoinGameService;

        fixture = TestBed.createComponent(GameInfoComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the injected GameService instance', () => {
        expect(component.serviceGame).toBe(mockGameService);
    });

    it('should return the injected PlayingService instance', () => {
        expect(component.servicePlaying).toBe(mockPlayingService);
    });
});
