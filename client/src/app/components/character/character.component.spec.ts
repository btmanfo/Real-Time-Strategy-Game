import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CharacterSelectionComponent } from '@app/components/character/character.component';

describe('CharacterSelectionComponent', () => {
    let component: CharacterSelectionComponent;
    let fixture: ComponentFixture<CharacterSelectionComponent>;

    const mockCharacter = {
        src: 'character.png',
        name: 'Test Character',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CharacterSelectionComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterSelectionComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        component.character = mockCharacter;
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should emit select event with the correct character src when onSelect is called', () => {
        spyOn(component.selected, 'emit');

        component.character = mockCharacter;
        component.onSelect();

        expect(component.selected.emit).toHaveBeenCalledWith(mockCharacter.src);
    });

    it('should bind the character input correctly', () => {
        component.character = mockCharacter;
        fixture.detectChanges();

        const characterName = fixture.debugElement.query(By.css('.character-name')).nativeElement;
        expect(characterName.textContent).toBe(mockCharacter.name);
    });

    it('should emit the correct value when clicked', () => {
        spyOn(component.selected, 'emit');

        component.character = mockCharacter;
        fixture.detectChanges();

        const characterTile = fixture.debugElement.query(By.css('.character-tile'));
        characterTile.triggerEventHandler('click', null);

        expect(component.selected.emit).toHaveBeenCalledWith(mockCharacter.src);
    });

    it('should not emit event if the character is already selected', () => {
        spyOn(component.selected, 'emit');

        component.character = mockCharacter;
        component.selectedCharacterSrc = mockCharacter.src;
        component.onSelect();

        expect(component.selected.emit).not.toHaveBeenCalled();
    });

    it('should return true for isSelected when selectedCharacterSrc matches character src', () => {
        component.character = mockCharacter;
        component.selectedCharacterSrc = mockCharacter.src;
        expect(component.isSelected).toBeTrue();
    });

    it('should return false for isSelected when selectedCharacterSrc does not match character src', () => {
        component.character = mockCharacter;
        component.selectedCharacterSrc = 'another-character.png';
        expect(component.isSelected).toBeFalse();
    });
});
