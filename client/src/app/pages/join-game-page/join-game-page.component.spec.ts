/* eslint-disable import/no-deprecated */
// Usage temporaire du module routerTestingModule pour les tests unitaires

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { of } from 'rxjs';
import { JoinGamePageComponent } from './join-game-page.component';

describe('JoinGamePageComponent', () => {
    let component: JoinGamePageComponent;
    let fixture: ComponentFixture<JoinGamePageComponent>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let notificationServiceSpy: NotificationService;
    let router: Router;

    beforeEach(async () => {
        const joinGameServiceMock = jasmine.createSpyObj('JoinGameService', [
            'isRoomExist',
            'joinRoomSelectCharacter',
            'isRoomLocked',
            'isRoomFull',
            'getGameId',
        ]);
        const notificationServiceMock = {
            showModal: false,
            errorMessages: [] as string[],
        };

        await TestBed.configureTestingModule({
            imports: [RouterTestingModule.withRoutes([]), JoinGamePageComponent],
            providers: [
                { provide: JoinGameService, useValue: joinGameServiceMock },
                { provide: NotificationService, useValue: notificationServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinGamePageComponent);
        component = fixture.componentInstance;

        joinGameServiceSpy = TestBed.inject(JoinGameService) as jasmine.SpyObj<JoinGameService>;
        notificationServiceSpy = TestBed.inject(NotificationService);
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        notificationServiceSpy.errorMessages = [];
        notificationServiceSpy.showModal = false;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the player value via the playerValue getter (undefined since not assigned)', () => {
        expect(component.playerValue).toBeUndefined();
    });

    it('should return the notifications via the notification getter', () => {
        notificationServiceSpy.showModal = true;
        notificationServiceSpy.errorMessages = ['Error 1'];
        const notif = component.notification;
        expect(notif.showModal).toBeTrue();
        expect(notif.errorMessages).toEqual(['Error 1']);
    });

    it('should format pin input correctly (formatPinInput)', () => {
        const event = {
            target: { value: '1a2b3!4' },
        } as unknown as Event;
        component.formatPinInput(event);
        expect(component.userInput).toBe('1234');
        expect(component.displayedInput).toBe('1 2 3 4');
    });

    it('should display an error for a non-numeric PIN when 4 characters provided (isRoomExist)', () => {
        component.userInput = '12a4';
        component.isRoomExist();
        expect(notificationServiceSpy.errorMessages).toContain('Veuillez entrer uniquement des chiffres pour le code NIP.');
        expect(notificationServiceSpy.showModal).toBeTrue();
    });

    it('should display an error if PIN length is not 4 (isRoomExist)', () => {
        component.userInput = '123';
        component.isRoomExist();
        expect(notificationServiceSpy.errorMessages).toContain('Veuillez entrer un NIP à 4 chiffres.');
        expect(notificationServiceSpy.showModal).toBeTrue();
    });

    it('should handle the case when the room does not exist (isRoomExist -> handleRoomDoesNotExist)', fakeAsync(() => {
        component.userInput = '1234';
        joinGameServiceSpy.isRoomExist.and.returnValue(of(false));
        component.isRoomExist();
        tick();
        expect(notificationServiceSpy.errorMessages).toContain('Le code NIP saisi est incorrect. Veuillez réessayer.');
        expect(notificationServiceSpy.showModal).toBeTrue();
    }));

    it('should handle the case when the room exists but is locked (isRoomExist -> isRoomLocked)', fakeAsync(() => {
        component.userInput = '1234';
        joinGameServiceSpy.isRoomExist.and.returnValue(of(true));
        joinGameServiceSpy.joinRoomSelectCharacter.and.stub();
        joinGameServiceSpy.isRoomLocked.and.returnValue(of(true));
        joinGameServiceSpy.isRoomFull.and.returnValue(of(false));

        component.isRoomExist();
        tick();
        expect(joinGameServiceSpy.joinRoomSelectCharacter).toHaveBeenCalledWith('1234');
        expect(notificationServiceSpy.errorMessages).toContain('La salle est verrouillée. Vous ne pouvez pas y entrer.');
        expect(notificationServiceSpy.showModal).toBeTrue();
    }));

    it('should handle the case when the room exists, is not locked but is full (isRoomExist -> isRoomFull)', fakeAsync(() => {
        component.userInput = '1234';
        joinGameServiceSpy.isRoomExist.and.returnValue(of(true));
        joinGameServiceSpy.joinRoomSelectCharacter.and.stub();
        joinGameServiceSpy.isRoomLocked.and.returnValue(of(false));
        joinGameServiceSpy.isRoomFull.and.returnValue(of(true));

        component.isRoomExist();
        tick();
        expect(joinGameServiceSpy.joinRoomSelectCharacter).toHaveBeenCalledWith('1234');
        expect(notificationServiceSpy.errorMessages).toContain('Le max de joueur a été atteint. Vous ne pouvez pas y entrer.');
        expect(notificationServiceSpy.showModal).toBeTrue();
    }));

    it('should navigate to selectCharacter when the room is valid (isRoomExist -> handleRoomExists)', fakeAsync(() => {
        component.userInput = '1234';
        joinGameServiceSpy.isRoomExist.and.returnValue(of(true));
        joinGameServiceSpy.joinRoomSelectCharacter.and.stub();
        joinGameServiceSpy.isRoomLocked.and.returnValue(of(false));
        joinGameServiceSpy.isRoomFull.and.returnValue(of(false));
        joinGameServiceSpy.getGameId.and.returnValue(of('gameIdValue'));

        component.isRoomExist();
        tick();
        expect(joinGameServiceSpy.joinRoomSelectCharacter).toHaveBeenCalledWith('1234');
        expect(router.navigate).toHaveBeenCalledWith(['/selectCharacter', 'gameIdValue'], { queryParams: { source: '1234', pin: '1234' } });
    }));

    it('should complete destroy$ on ngOnDestroy', () => {
        const nextSpy = spyOn(component['destroy$'], 'next').and.callThrough();
        const completeSpy = spyOn(component['destroy$'], 'complete').and.callThrough();
        component.ngOnDestroy();
        expect(nextSpy).toHaveBeenCalled();
        expect(completeSpy).toHaveBeenCalled();
    });
});
