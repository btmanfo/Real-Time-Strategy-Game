import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideRouter([])],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        });

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create the HeaderComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should render the @Input() data in the template', () => {
        const testData = 'Test Header Data';
        component.data = testData;

        fixture.detectChanges();

        const dataElement = fixture.debugElement.query(By.css('div'));
        expect(dataElement.nativeElement.textContent).toContain(testData);
    });
});
