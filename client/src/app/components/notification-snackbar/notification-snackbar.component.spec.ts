/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { NotificationSnackbarComponent } from './notification-snackbar.component';

describe('NotificationSnackbarComponent', () => {
    let component: NotificationSnackbarComponent;
    let fixture: ComponentFixture<NotificationSnackbarComponent>;
    let notificationService: NotificationService;

    beforeEach(async () => {
        const notificationServiceStub: Partial<NotificationService> = {
            showModal: false,
            errorMessages: [],
        };

        await TestBed.configureTestingModule({
            imports: [NotificationSnackbarComponent],
            providers: [
                { provide: NotificationService, useValue: notificationServiceStub },
                { provide: ChangeDetectorRef, useValue: { detectChanges: jasmine.createSpy('detectChanges') } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationSnackbarComponent);
        component = fixture.componentInstance;
        notificationService = TestBed.inject(NotificationService);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should not display the modal when showModal is false', () => {
        notificationService.showModal = false;
        fixture.detectChanges();
        const modalElement = fixture.debugElement.query(By.css('.modal-overlay'));
        expect(modalElement).toBeNull();
    });

    it('should display error messages when present', () => {
        notificationService.errorMessages = ['Erreur 1', 'Erreur 2'];
        notificationService.showModal = true;
        fixture.detectChanges();
        const errorElements = fixture.debugElement.queryAll(By.css('.snackbar'));
        expect(errorElements.length).toBe(2);
        expect(errorElements[0]?.nativeElement.textContent).toContain('Erreur 1');
        expect(errorElements[1]?.nativeElement.textContent).toContain('Erreur 2');
    });

    it('should not display error messages when none are present', () => {
        notificationService.errorMessages = [];
        fixture.detectChanges();
        const errorElements = fixture.debugElement.queryAll(By.css('.snackbar-container'));
        expect(errorElements.length).toBe(0);
    });

    it('should restart timeout on changes', () => {
        spyOn(component as any, 'restartTimeout');
        component.ngOnChanges();
        expect((component as any).restartTimeout).toHaveBeenCalled();
    });

    it('should restart timeout when restartTimeout is called', () => {
        spyOn(component['cdr'], 'detectChanges');
        component.restartTimeout();
        expect(component['cdr'].detectChanges).toHaveBeenCalled();
    });
    it('should close notifications after duration expires', fakeAsync(() => {
        spyOn(component, 'closeAllNotifications');

        component.ngOnInit();
        tick(component.duration);

        expect(component.closeAllNotifications).toHaveBeenCalled();
    }));

    it('should close notifications when closeAllNotifications is called', () => {
        spyOn(component['cdr'], 'detectChanges');
        component.closeAllNotifications();
        expect(notificationService.showModal).toBeFalse();
        expect(notificationService.errorMessages.length).toBe(0);
        expect(component['cdr'].detectChanges).toHaveBeenCalled();
    });

    it('should start timeout on init', () => {
        spyOn<any>(component, 'startTimeout');
        component.ngOnInit();
        expect((component as any).startTimeout).toHaveBeenCalled();
    });

    it('should set a timeout when startTimeout is called', fakeAsync(() => {
        spyOn(window, 'setTimeout');
        component['startTimeout']();
        expect(window.setTimeout).toHaveBeenCalledWith(jasmine.any(Function), component.duration);
    }));
});
