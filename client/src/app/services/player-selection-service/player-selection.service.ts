import { Injectable } from '@angular/core';
import { baseStats, FOUR, playerSelectionData, playerSelectionDataError, SIX, START_TIME_WITH_NO_ATTEMPT } from '@app/constants/constants';
import { DiceType } from '@common/constants';
import { Player } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class PlayerSelectionService {
    isLifeSelected = playerSelectionData.isLifeSelected;
    isSpeedSelected = playerSelectionData.isSpeedSelected;
    selectedAttack: string | null = playerSelectionData.selectedAttack;
    selectedDefense: string | null = playerSelectionData.selectedDefense;
    selectedInput: string | null = playerSelectionData.selectedInput;
    avatarLink = playerSelectionData.avatarLink;

    isLifeError = playerSelectionDataError.isLifeError;
    isSpeedError = playerSelectionDataError.isSpeedError;
    selectedAttackError = playerSelectionDataError.selectedAttackError;
    selectedDefenseError = playerSelectionDataError.selectedDefenseError;
    selectedInputError = playerSelectionDataError.selectedInputError;
    avatarLinkError = playerSelectionDataError.avatarLinkError;

    baseStats = { ...baseStats };

    private readonly createdCharacters: Player[] = [];

    saveCharacter(): void {
        const newCharacter: Player = {
            name: this.selectedInput,
            life: this.baseStats.life,
            speed: this.baseStats.speed,
            attack: this.selectedAttack,
            defense: this.selectedDefense,
            avatarUrl: this.avatarLink,
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
            stats: {
                name: this.selectedInput,
                ctf: 0,
                nbVictory: 0,
                nbCombat: 0,
                nbEvasion: 0,
                nbDefeat: 0,
                nbLifeLost: 0,
                nbDamage: 0,
                nbItem: 0,
                pourcentageOfTile: 0,
                nbDoors: 0,
            },
        };

        this.createdCharacters.push(newCharacter);
    }

    isAvatarDisabled(avatarSrc: string): boolean {
        const fullUrl = './assets/images/Personnages/' + avatarSrc;
        return this.createdCharacters.some((character) => character.avatarUrl === fullUrl);
    }

    getSavedCharacters(): Player[] {
        return this.createdCharacters;
    }

    selectLife(selected: boolean): void {
        this.isLifeSelected = selected;
        this.isSpeedSelected = !selected;
        this.baseStats.life = selected ? SIX : FOUR;
        this.baseStats.speed = selected ? FOUR : SIX;
    }

    selectSpeed(selected: boolean): void {
        this.isSpeedSelected = selected;
        this.isLifeSelected = !selected;
        this.baseStats.life = selected ? FOUR : SIX;
        this.baseStats.speed = selected ? SIX : FOUR;
    }

    selectAvatar(selectedAvatarSrc: string): void {
        const baseUrl = './assets/images/Personnages/';
        this.avatarLink = baseUrl + selectedAvatarSrc;
    }

    selectAttack(selected: DiceType): void {
        this.selectedAttack = selected;
        this.selectedDefense = selected === DiceType.FourFaces ? DiceType.SixFaces : DiceType.FourFaces;
    }

    selectDefense(selected: DiceType): void {
        this.selectedDefense = selected;
        this.selectedAttack = selected === DiceType.FourFaces ? DiceType.SixFaces : DiceType.FourFaces;
    }

    validateSelection(): boolean {
        this.isLifeError = !this.isLifeSelected && !this.isSpeedSelected;
        this.isSpeedError = !this.isLifeSelected && !this.isSpeedSelected;
        this.selectedAttackError = !this.selectedAttack;
        this.selectedDefenseError = !this.selectedDefense;
        this.selectedInputError =
            !this.selectedInput || this.selectedInput.length < START_TIME_WITH_NO_ATTEMPT || !/^[a-zA-Z0-9]+$/.test(this.selectedInput);
        this.avatarLinkError = !this.avatarLink;

        return (
            !this.isSpeedError &&
            !this.isLifeError &&
            !this.selectedAttackError &&
            !this.selectedDefenseError &&
            !this.selectedInputError &&
            !this.avatarLinkError
        );
    }

    getCurrentPlayer(): Player | null {
        return this.createdCharacters.length > 0 ? this.createdCharacters[this.createdCharacters.length - 1] : null;
    }

    resetErrors(): void {
        this.isLifeError = false;
        this.isSpeedError = false;
        this.selectedAttackError = false;
        this.selectedDefenseError = false;
        this.selectedInputError = false;
        this.avatarLinkError = false;
    }

    resetSelection(): void {
        this.baseStats.life = 4;
        this.baseStats.speed = 4;
        this.isLifeSelected = false;
        this.isSpeedSelected = false;
        this.selectedAttack = null;
        this.selectedDefense = null;
        this.selectedInput = null;
        this.avatarLink = null;
    }
}
