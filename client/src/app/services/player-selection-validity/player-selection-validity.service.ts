import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class PlayerSelectionValidityService {
    errorMessages: string[] = [];
    showModal: boolean = false;

    addError(error: string): void {
        if (!this.errorMessages.includes(error)) {
            this.errorMessages.push(error);
        }
    }

    clearErrors(): void {
        this.errorMessages = [];
        this.showModal = false;
    }
}
