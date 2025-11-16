import { TestBed } from '@angular/core/testing';
import { CHARACTERS } from '@common/constants';
import { CharacterService } from './character-manager-service.service';

describe('CharacterService', () => {
    let service: CharacterService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CharacterService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return the list of characters', () => {
        const characters = service.getCharacters();
        expect(characters).toEqual(CHARACTERS);
    });

    it('should return the base URL', () => {
        const baseUrl = service.getBaseUrl();
        expect(baseUrl).toEqual('./assets/images/Personnages/');
    });

    it('should get character by source', () => {
        const character = service.getCharacterBySource('character2.png');
        expect(character).toEqual(CHARACTERS.find((char) => char.src === 'character2.png'));
    });

    it('should get character from full URL', () => {
        const fullUrl = './assets/images/Personnages/character3.png';
        const character = service.getCharacterFromFullUrl(fullUrl);
        expect(character).toEqual(CHARACTERS.find((char) => char.src === 'character3.png'));
    });

    it('should return undefined if character source does not exist', () => {
        const character = service.getCharacterBySource('nonexistent.png');
        expect(character).toBeUndefined();
    });

    it('should return undefined if character full URL does not exist', () => {
        const fullUrl = './assets/images/Personnages/nonexistent.png';
        const character = service.getCharacterFromFullUrl(fullUrl);
        expect(character).toBeUndefined();
    });

    it('should not set character disabled state when character does not exist', () => {
        service.setCharacterDisabled('nonexistent.png', true);
        expect(service.getCharacterBySource('nonexistent.png')).toBeUndefined();
    });

    describe('updateCharactersDisabledState', () => {
        it('should not disable any character if no avatar is taken', () => {
            const takenAvatars: (string | null)[] = [];
            const updatedCharacters = service.updateCharactersDisabledState(takenAvatars);

            updatedCharacters.forEach((char) => {
                expect(char.disabled).toBe(false);
            });
        });

        it('should handle an array containing only null values', () => {
            const takenAvatars: (string | null)[] = [null, null, null];
            const updatedCharacters = service.updateCharactersDisabledState(takenAvatars);

            updatedCharacters.forEach((char) => {
                expect(char.disabled).toBe(false);
            });
        });

        it('should handle an empty takenAvatars array', () => {
            const takenAvatars: (string | null)[] = [];
            const updatedCharacters = service.updateCharactersDisabledState(takenAvatars);

            updatedCharacters.forEach((char) => {
                expect(char.disabled).toBe(false);
            });
        });
        it('should set character disabled state when character exists', () => {
            const characterSrc = CHARACTERS[0].src;
            service.setCharacterDisabled(characterSrc, true);

            const updatedCharacter = service.getCharacterBySource(characterSrc);
            expect(updatedCharacter?.disabled).toBeTrue();
        });
    });
});
