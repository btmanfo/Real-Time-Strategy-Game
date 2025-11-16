import { TestBed } from '@angular/core/testing';
import { PlayerSelectionValidityService } from './player-selection-validity.service';

describe('PlayerSelectionValidityService', () => {
    let service: PlayerSelectionValidityService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PlayerSelectionValidityService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('addError', () => {
        it('should add an error to the errorMessages array', () => {
            service.addError('Error 1');
            expect(service.errorMessages).toContain('Error 1');
        });

        it('should not add a duplicate error', () => {
            service.addError('Error 1');
            service.addError('Error 1');
            expect(service.errorMessages.length).toBe(1);
        });
    });

    describe('clearErrors', () => {
        it('should clear all error messages and hide the modal', () => {
            service.addError('Error 1');
            service.addError('Error 2');
            service.showModal = true;

            service.clearErrors();

            expect(service.errorMessages.length).toBe(0);
            expect(service.showModal).toBeFalse();
        });
    });
});
