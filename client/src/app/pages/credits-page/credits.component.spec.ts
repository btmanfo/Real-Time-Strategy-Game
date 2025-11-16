import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CreditsComponent } from './credits.component';

describe('CreditsComponent', () => {
    let component: CreditsComponent;
    let fixture: ComponentFixture<CreditsComponent>;

    const CSS_CLASSES = {
        logoImage: '.logo img',
        membersGrid: '.members-grid .member',
        teamName: '.team-name',
        returnButton: '.return-button',
    };

    const TEXTS = {
        teamName: 'ÉQUIPE 107',
        returnButton: 'RETOURNER',
        logoAlt: 'Heroic Adventure Logo',
        logoSrc: './assets/Logo.PNG',
    };

    const ROUTES = {
        home: '/home',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreditsComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(CreditsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the logo with the correct source and alt text', () => {
        const logoElement = fixture.debugElement.query(By.css(CSS_CLASSES.logoImage));
        expect(logoElement).toBeTruthy();
        expect(logoElement.attributes['src']).toBe(TEXTS.logoSrc);
        expect(logoElement.attributes['alt']).toBe(TEXTS.logoAlt);
    });

    it('should display the correct team name', () => {
        const teamNameElement = fixture.debugElement.query(By.css(CSS_CLASSES.teamName));
        expect(teamNameElement).toBeTruthy();
        expect(teamNameElement.nativeElement.textContent.trim()).toBe(TEXTS.teamName);
    });

    it('should display a return button with the correct routerLink', () => {
        const buttonElement = fixture.debugElement.query(By.css(CSS_CLASSES.returnButton));
        expect(buttonElement).toBeTruthy();
        expect(buttonElement.attributes['routerLink']).toBe(ROUTES.home);
        expect(buttonElement.nativeElement.textContent.trim()).toBe(TEXTS.returnButton);
    });

    it('should display a return button in the view', () => {
        const buttonElement = fixture.debugElement.query(By.css(CSS_CLASSES.returnButton));
        expect(buttonElement).toBeTruthy();
    });
});
