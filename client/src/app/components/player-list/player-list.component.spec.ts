import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player } from '@common/interfaces';
import { PlayerListComponent } from './player-list.component';

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;
    let fixture: ComponentFixture<PlayerListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [],
            imports: [CommonModule, PlayerListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerListComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit playerToDelete event when onDelete is called', () => {
        const player: Player = {
            name: 'Player1',
            avatarUrl: 'url1',
            coordinate: { x: 0, y: 0 },
            life: 10,
            speed: 5,
            isAdmin: true,
            attack: '7',
            defense: '3',
        };
        component.players = [player];
        fixture.detectChanges();

        let emittedPlayer: Player | undefined;
        component.playerToDelete.subscribe((deletedPlayer) => (emittedPlayer = deletedPlayer));

        component.onDelete(player);

        expect(emittedPlayer).toEqual(player);
    });

    it('should set isAdmin to false if undefined in ngOnChanges', () => {
        const players: Player[] = [
            { name: 'Player1', avatarUrl: 'url1', coordinate: { x: 0, y: 0 }, life: 10, speed: 5, attack: '7', defense: '3' } as Player,
        ];
        component.players = players;
        component.ngOnChanges({
            players: { currentValue: players, previousValue: [], firstChange: true, isFirstChange: () => true },
        });

        expect(component.players[0].isAdmin).toBe(false);
    });
});
