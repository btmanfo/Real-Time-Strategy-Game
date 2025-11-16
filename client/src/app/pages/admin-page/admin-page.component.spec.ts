import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameService } from '@app/services/game-service/game.service';
import { AdminPageComponent } from './admin-page.component';
describe('AdminPageComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), GameService],
        }).compileComponents();
    });

    it('should create', () => {
        const fixture = TestBed.createComponent(AdminPageComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });
});
