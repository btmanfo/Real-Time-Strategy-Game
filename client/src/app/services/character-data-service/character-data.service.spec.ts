import { TestBed } from '@angular/core/testing';
import { CharacterDataService } from '@app/services/character-data-service/character-data.service';

describe('CharacterDataService', () => {
    let service: CharacterDataService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [CharacterDataService] });
        service = TestBed.inject(CharacterDataService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return an array of characters', () => {
        const characters = service.getCharacters();
        expect(characters).toBeTruthy();
        expect(Array.isArray(characters)).toBeTrue();
        expect(characters.length).toBeGreaterThan(0);
    });

    it('should return characters with correct structure', () => {
        const characters = service.getCharacters();
        characters.forEach((character) => {
            expect(typeof character.src).toBe('string');
            expect(typeof character.name).toBe('string');
        });
    });
});
