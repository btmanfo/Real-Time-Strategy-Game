import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MapValidityService } from '@app/services/map-validity-service/map-validity.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayerSelectionValidityService } from '@app/services/player-selection-validity/player-selection-validity.service';
import { NotificationPopupComponent } from './notification-popup.component';

describe('NotificationPopupComponent', () => {
    let component: NotificationPopupComponent;
    let fixture: ComponentFixture<NotificationPopupComponent>;
    let notificationService: NotificationService;
    let routerSpy: jasmine.SpyObj<Router>;
    let mapValidityServiceStub: Partial<MapValidityService>;
    let playerSelectionValidityServiceStub: Partial<PlayerSelectionValidityService>;

    beforeEach(async () => {
        const notificationServiceStub: Partial<NotificationService> = {
            showModal: false,
            errorMessages: [],
        };

        mapValidityServiceStub = {};
        playerSelectionValidityServiceStub = {};

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [NotificationPopupComponent],
            providers: [
                { provide: MapValidityService, useValue: mapValidityServiceStub },
                { provide: NotificationService, useValue: notificationServiceStub },
                { provide: PlayerSelectionValidityService, useValue: playerSelectionValidityServiceStub },
                { provide: Router, useValue: routerSpy },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationPopupComponent);
        component = fixture.componentInstance;
        notificationService = TestBed.inject(NotificationService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the modal, clear error messages, and emit closePage event without navigating when no success message is present', () => {
        notificationService.errorMessages = ['Erreur A', 'Erreur B'];
        notificationService.showModal = true;
        spyOn(component.closePage, 'emit');
        routerSpy.navigate.calls.reset();

        component.closeModal();

        expect(notificationService.showModal).toBeFalse();
        expect(notificationService.errorMessages).toEqual([]);
        expect(component.closePage.emit).toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /adminPage if errorMessages includes "Le jeu a été mis à jour avec succès !"', () => {
        notificationService.errorMessages = ['Le jeu a été mis à jour avec succès !'];
        notificationService.showModal = true;
        spyOn(component.closePage, 'emit');

        component.closeModal();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/adminPage']);
        expect(notificationService.showModal).toBeFalse();
        expect(notificationService.errorMessages).toEqual([]);
        expect(component.closePage.emit).toHaveBeenCalled();
    });

    it('should navigate to /adminPage if errorMessages includes "Le jeu a été créé avec succès !"', () => {
        notificationService.errorMessages = ['Le jeu a été créé avec succès !'];
        notificationService.showModal = true;
        spyOn(component.closePage, 'emit');

        component.closeModal();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/adminPage']);
        expect(notificationService.showModal).toBeFalse();
        expect(notificationService.errorMessages).toEqual([]);
        expect(component.closePage.emit).toHaveBeenCalled();
    });

    it('should display the modal when showModal is true', () => {
        notificationService.showModal = true;
        fixture.detectChanges();
        const modalElement = fixture.debugElement.query(By.css('.modal-overlay'));
        expect(modalElement).toBeTruthy();
    });

    it('should not display the modal when showModal is false', () => {
        notificationService.showModal = false;
        fixture.detectChanges();
        const modalElement = fixture.debugElement.query(By.css('.modal-overlay'));
        expect(modalElement).toBeNull();
    });

    it('should display error messages when they are present', () => {
        notificationService.errorMessages = ['Erreur 1', 'Erreur 2'];
        notificationService.showModal = true;
        fixture.detectChanges();
        const errorElements = fixture.debugElement.queryAll(By.css('.error-message'));
        expect(errorElements.length).toBe(2);
        expect(errorElements[0].nativeElement.textContent).toContain('Erreur 1');
        expect(errorElements[1].nativeElement.textContent).toContain('Erreur 2');
    });

    it('should not display error messages when they are absent', () => {
        notificationService.errorMessages = [];
        fixture.detectChanges();
        const errorElements = fixture.debugElement.queryAll(By.css('.error-message'));
        expect(errorElements.length).toBe(0);
    });
});
