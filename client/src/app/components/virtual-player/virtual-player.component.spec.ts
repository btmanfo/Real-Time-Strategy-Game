import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VirtualPlayerSocketService } from '@app/services/virtual-player/virtual-player-socket.service';
import { Player } from '@common/interfaces';
import { Subject } from 'rxjs';
import { VirtualPlayerComponent } from './virtual-player.component';

describe('VirtualPlayerComponent', () => {
    let component: VirtualPlayerComponent;
    let fixture: ComponentFixture<VirtualPlayerComponent>;
    let virtualPlayerServiceSpy: jasmine.SpyObj<VirtualPlayerSocketService>;
    let virtualPlayerInfoSubject: Subject<Player | null>;

    beforeEach(async () => {
        virtualPlayerInfoSubject = new Subject<Player | null>();
        virtualPlayerServiceSpy = jasmine.createSpyObj('VirtualPlayerSocketService', ['addAttackerVirtualPlayer', 'addDefensiveVirtualPlayer']);
        virtualPlayerServiceSpy.virtualPlayerInfo$ = virtualPlayerInfoSubject;

        await TestBed.configureTestingModule({
            imports: [VirtualPlayerComponent],
            providers: [{ provide: VirtualPlayerSocketService, useValue: virtualPlayerServiceSpy }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(VirtualPlayerComponent);
        component = fixture.componentInstance;
        component.roomCode = 'ROOM_TEST';
        fixture.detectChanges();
    });

    it('should create and subscribe to virtualPlayerInfo$', () => {
        expect(component).toBeTruthy();
        const mockBot: Player = {
            name: 'Player1',
            life: 100,
            speed: 50,
            attack: '20',
            defense: '10',
            avatarUrl: '',
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        };
        virtualPlayerInfoSubject.next(mockBot);
        expect(component.previewBot).toEqual(mockBot);
    });

    it('should update selectedBotType when selectBotType is called', () => {
        component.selectBotType('aggressive');
        expect(component.selectedBotType).toBe('aggressive');
        component.selectBotType('defensive');
        expect(component.selectedBotType).toBe('defensive');
    });

    describe('confirmAddBot', () => {
        let botAddedSpy: jasmine.Spy;
        let closeModalSpy: jasmine.Spy;

        beforeEach(() => {
            botAddedSpy = spyOn(component.botAdded, 'emit');
            closeModalSpy = spyOn(component.closeModal, 'emit');
            component.selectedBotType = null;
            component.showError = false;
        });

        it('should set showError to true and return if no bot type is selected', () => {
            component.selectedBotType = null;

            component.confirmAddBot();

            expect(component.showError).toBeTrue();
            expect(virtualPlayerServiceSpy.addAttackerVirtualPlayer).not.toHaveBeenCalled();
            expect(virtualPlayerServiceSpy.addDefensiveVirtualPlayer).not.toHaveBeenCalled();
            expect(botAddedSpy).not.toHaveBeenCalled();
            expect(closeModalSpy).not.toHaveBeenCalled();
        });

        it('should add attacker virtual player when selectedBotType is aggressive', () => {
            component.selectedBotType = 'aggressive';
            component.confirmAddBot();
            expect(virtualPlayerServiceSpy.addAttackerVirtualPlayer).toHaveBeenCalledWith('ROOM_TEST');
            expect(botAddedSpy).toHaveBeenCalled();
            expect(closeModalSpy).toHaveBeenCalled();
        });

        it('should add defensive virtual player when selectedBotType is defensive', () => {
            component.selectedBotType = 'defensive';
            component.confirmAddBot();
            expect(virtualPlayerServiceSpy.addDefensiveVirtualPlayer).toHaveBeenCalledWith('ROOM_TEST');
            expect(botAddedSpy).toHaveBeenCalled();
            expect(closeModalSpy).toHaveBeenCalled();
        });
    });

    it('should emit closeModal when cancelAddBot is called', () => {
        const closeModalSpy = spyOn(component.closeModal, 'emit');
        component.cancelAddBot();
        expect(closeModalSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from virtualPlayerInfo$ on destroy', () => {
        const nextSpy = spyOn(component['destroy$'], 'next');
        const completeSpy = spyOn(component['destroy$'], 'complete');
        component.ngOnDestroy();
        expect(nextSpy).toHaveBeenCalled();
        expect(completeSpy).toHaveBeenCalled();
    });
});
