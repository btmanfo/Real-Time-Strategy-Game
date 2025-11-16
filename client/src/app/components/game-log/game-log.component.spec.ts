import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { GameLogEntry, Player } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';
import { GameLogComponent } from './game-log.component';

describe('GameLogComponent', () => {
    let component: GameLogComponent;
    let fixture: ComponentFixture<GameLogComponent>;

    let gameLogServiceSpy: jasmine.SpyObj<GameLogService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;

    let logsSubject: BehaviorSubject<GameLogEntry[]>;

    beforeEach(async () => {
        gameLogServiceSpy = jasmine.createSpyObj('GameLogService', ['joinRoom', 'startNewGame']);
        logsSubject = new BehaviorSubject<GameLogEntry[]>([]);
        gameLogServiceSpy.logs$ = logsSubject.asObservable();

        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', [], { pinCode: '1234' });
        playingServiceSpy = jasmine.createSpyObj('PlayingService', [], { localPlayer: { name: 'Player1' } });

        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, GameLogComponent],
            providers: [
                { provide: GameLogService, useValue: gameLogServiceSpy },
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameLogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call joinRoom on initialization with the correct parameters', () => {
        component.ngOnInit();
        expect(gameLogServiceSpy.joinRoom).toHaveBeenCalledWith('1234', 'Player1');
    });

    it('should subscribe to logs$ and update filteredLogs accordingly', () => {
        const logs: GameLogEntry[] = [
            {
                type: 'global',
                event: 'Turn passed from A to B',
                players: [{ name: 'PlayerA' } as Player, { name: 'PlayerB' } as Player],
                timestamp: new Date(),
            },
            { type: 'global', event: 'Door opened by PlayerA', players: [{ name: 'PlayerA' } as Player], timestamp: new Date() },
        ];
        logsSubject.next(logs);
        expect(component.logs).toEqual(logs);
        expect(component.filteredLogs).toEqual(logs);
    });

    it('should update filteredLogs when filterText is set', () => {
        const logs: GameLogEntry[] = [
            {
                type: 'global',
                event: 'Turn passed from A to B',
                players: [{ name: 'PlayerA' } as Player, { name: 'PlayerB' } as Player],
                timestamp: new Date(),
            },
            { type: 'global', event: 'Door opened by PlayerA', players: [{ name: 'PlayerA' } as Player], timestamp: new Date() },
            { type: 'global', event: 'Debug mode activated by PlayerC', players: [{ name: 'PlayerC' } as Player], timestamp: new Date() },
        ];
        logsSubject.next(logs);

        component.filterText = 'playera';
        component.applyFilter();
        expect(component.filteredLogs.length).toBe(2);
        expect(
            component.filteredLogs.every(
                (log) =>
                    log.event.toLowerCase().includes('playera') ||
                    (log.players && log.players.some((player) => player.name?.toLowerCase().includes('playera'))),
            ),
        ).toBeTrue();
    });

    it('should call startNewGame when startNewGame method is invoked', () => {
        component.startNewGame();
        expect(gameLogServiceSpy.startNewGame).toHaveBeenCalledWith('1234', 'Player1');
    });

    it('should format time correctly using formatTime method', () => {
        const testDate = new Date('2023-01-01T10:20:30');
        const formatted = component.formatTime(testDate);
        expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should unsubscribe from logs$ on destroy', () => {
        component.ngOnInit();
        spyOn(component['logSubscription'], 'unsubscribe');
        component.ngOnDestroy();
        expect(component['logSubscription'].unsubscribe).toHaveBeenCalled();
    });
});
