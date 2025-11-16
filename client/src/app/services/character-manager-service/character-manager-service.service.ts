import { Injectable } from '@angular/core';
import { CHARACTERS } from '@common/constants';
import { Character } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class CharacterService {
    private readonly baseUrl: string = './assets/images/Personnages/';
    private characters: Character[] = CHARACTERS;

    getCharacters(): Character[] {
        return this.characters;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    updateCharactersDisabledState(takenAvatars: (string | null)[]): Character[] {
        this.characters = CHARACTERS.map((avatar) => ({
            ...avatar,
            disabled: takenAvatars.includes(this.baseUrl + avatar.src),
        }));
        return this.characters;
    }

    getCharacterBySource(avatarSrc: string): Character | undefined {
        return this.characters.find((char) => char.src === avatarSrc);
    }

    setCharacterDisabled(avatarSrc: string, disabled: boolean): void {
        const character = this.getCharacterBySource(avatarSrc);
        if (character) {
            character.disabled = disabled;
        }
    }

    getCharacterFromFullUrl(fullUrl: string): Character | undefined {
        const fileName = fullUrl.slice(this.baseUrl.length);
        return this.getCharacterBySource(fileName);
    }
}
