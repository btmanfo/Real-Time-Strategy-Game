/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Utilisation temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires */

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Player } from '@common/interfaces';
import { Subject, Subscription } from 'rxjs';
import { GamePlayerListComponent } from './game-player-list.component';

class FakePlayingService {
    playerTurn$ = new Subject<Player | null>();
}

describe('GamePlayerListComponent', () => {
    let component: GamePlayerListComponent;
    let fixture: ComponentFixture<GamePlayerListComponent>;
    let fakePlayingService: FakePlayingService;

    beforeEach(async () => {
        fakePlayingService = new FakePlayingService();
        await TestBed.configureTestingModule({
            imports: [GamePlayerListComponent, HttpClientTestingModule],
            providers: [{ provide: PlayingService, useValue: fakePlayingService }],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePlayerListComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to playerTurn$ and update currentPlayer in ngOnInit', () => {
        const testPlayer: Player = {
            name: 'TestPlayer',
            avatarUrl: 'test-avatar',
            attack: 'TestAttack',
            defense: 'TestDefense',
            speed: 1,
            life: 100,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        };

        component.ngOnInit();
        fakePlayingService.playerTurn$.next(testPlayer);
        expect((component as any).currentPlayer).toEqual(testPlayer);
    });

    it('should update disconnectedPlayers and players list in ngOnChanges', () => {
        const playerAlice: Player = {
            name: 'Alice',
            avatarUrl: 'alice-avatar',
            attack: 'A',
            defense: 'A',
            speed: 1,
            life: 50,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        };
        const playerBob: Player = {
            name: 'Bob',
            avatarUrl: 'bob-avatar',
            attack: 'B',
            defense: 'B',
            speed: 1,
            life: 60,
            isAdmin: false,
            coordinate: { x: 1, y: 1 },
        };

        (component as any).previousPlayers = [playerAlice, playerBob];
        component.players = [playerAlice];

        const changes: any = {
            players: {
                currentValue: [playerAlice],
                previousValue: [playerAlice, playerBob],
                firstChange: false,
                isFirstChange: () => false,
            },
        };

        component.ngOnChanges(changes);

        expect((component as any).disconnectedPlayers.has('Bob')).toBeTrue();
        expect(component.players).toContain(playerAlice);
        expect(component.players).toContain(playerBob);
    });

    it('should return true for disconnected player in isPlayerDisconnected', () => {
        (component as any).disconnectedPlayers.add('Charlie');
        expect(component.isPlayerDisconnected('Charlie')).toBeTrue();
        expect(component.isPlayerDisconnected('Alice')).toBeFalse();
        expect(component.isPlayerDisconnected(null)).toBeFalse();
    });

    it('should emit playerToDelete event when onDelete is called', () => {
        const testPlayer: Player = {
            name: 'TestPlayer',
            avatarUrl: 'test-avatar',
            attack: 'TestAttack',
            defense: 'TestDefense',
            speed: 1,
            life: 100,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        };
        spyOn(component.playerToDelete, 'emit');
        component.onDelete(testPlayer);
        expect(component.playerToDelete.emit).toHaveBeenCalledWith(testPlayer);
    });

    it('should update players list and emit playersUpdated event', () => {
        const newPlayers: Player[] = [
            {
                name: 'NewPlayer',
                avatarUrl: 'new-avatar',
                attack: 'NewAttack',
                defense: 'NewDefense',
                speed: 2,
                life: 90,
                isAdmin: false,
                coordinate: { x: 2, y: 2 },
            },
        ];
        spyOn(component.playersUpdated, 'emit');
        component.updatePlayers(newPlayers);
        expect(component.players).toEqual(newPlayers);
        expect(component.playersUpdated.emit).toHaveBeenCalledWith(newPlayers);
    });

    it('should return true if avatarUrl matches currentPlayer', () => {
        const testPlayer: Player = {
            name: 'CurrentPlayer',
            avatarUrl: 'current-avatar',
            attack: 'Attack',
            defense: 'Defense',
            speed: 1,
            life: 100,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        };
        (component as any).currentPlayer = testPlayer;
        expect(component.isCurrentPlayer('current-avatar')).toBeTrue();
        expect(component.isCurrentPlayer('different-avatar')).toBeFalse();
        expect(component.isCurrentPlayer(null)).toBeFalse();
    });

    it('should unsubscribe from playerTurn$ on destroy', () => {
        component.ngOnInit();
        const unsubscribeSpy = spyOn((component as any).playerTurnSubscription as Subscription, 'unsubscribe').and.callThrough();
        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    describe('hasFlag', () => {
        it('should return true if the player has an inventory containing an item with name "chestbox-2"', () => {
            const testPlayer: Player = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar',
                attack: 'TestAttack',
                defense: 'TestDefense',
                speed: 1,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
                inventory: [{ name: 'chestbox-2' } as Item],
            };

            const result = component.hasFlag(testPlayer);

            expect(result).toBeTrue();
        });

        it('should return false if the player does not have an inventory', () => {
            const testPlayer: Player = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar',
                attack: 'TestAttack',
                defense: 'TestDefense',
                speed: 1,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
                inventory: undefined,
            };

            const result = component.hasFlag(testPlayer);

            expect(result).toBeFalse();
        });

        it('should return false if the player\'s inventory does not contain an item with name "chestbox-2"', () => {
            const testPlayer: Player = {
                name: 'TestPlayer',
                avatarUrl: 'test-avatar',
                attack: 'TestAttack',
                defense: 'TestDefense',
                speed: 1,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
                inventory: [{ name: 'other-item' } as Item],
            };

            const result = component.hasFlag(testPlayer);

            expect(result).toBeFalse();
        });

        it('should return false if the player is null', () => {
            const result = component.hasFlag(null as unknown as Player);

            expect(result).toBeFalse();
        });

        it('should return the injected gameService via gameServiceValue getter', () => {
            const gameServiceFromGetter = component.gameServiceValue;
            expect(gameServiceFromGetter).toBe((component as any).gameService);
        });
    });
});
