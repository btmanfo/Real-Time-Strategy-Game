import { Injectable } from '@angular/core';
import { CHARACTERS } from '@common/constants';

@Injectable({
    providedIn: 'root',
})
export class CharacterDataService {
    private readonly characters = CHARACTERS;

    /**
     * Retrieves the list of available characters.
     * @returns {Array<{src: string, name: string}>} The list of characters.
     */
    getCharacters(): { src: string; name: string }[] {
        return this.characters;
    }
}
