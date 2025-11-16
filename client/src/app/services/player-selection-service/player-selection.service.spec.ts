/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { TestBed } from '@angular/core/testing';
import { baseStats, playerSelectionData, playerSelectionDataError } from '@app/constants/constants';
import { PlayerSelectionService } from '@app/services/player-selection-service/player-selection.service';
import { DiceType } from '@common/constants';
import { Player } from '@common/interfaces';

describe('PlayerSelectionService', () => {
    let service: PlayerSelectionService;

    const BONUS_LIFE = 6;
    const BONUS_SPEED = 6;
    const DEFAULT_LIFE = 4;
    const DEFAULT_SPEED = 4;

    const DICE_ATTACK_4FACES = '4 Faces';
    const DICE_ATTACK_6FACES = '6 Faces';
    const DICE_DEFENSE_4FACES = '4 Faces';
    const DICE_DEFENSE_6FACES = '6 Faces';

    const TEST_PLAYER_NAME = 'Player1';
    const AVATAR_RELATIVE_PATH = 'Alita/Alita_Avant.png';
    const AVATAR_FULL_PATH = `./assets/images/Personnages/${AVATAR_RELATIVE_PATH}`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                PlayerSelectionService,
                { provide: 'baseStats', useValue: { ...baseStats } },
                { provide: 'playerSelectionData', useValue: { ...playerSelectionData } },
                { provide: 'playerSelectionDataError', useValue: { ...playerSelectionDataError } },
            ],
        });
        service = TestBed.inject(PlayerSelectionService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should select life and update stats correctly', () => {
        service.selectLife(true);
        expect(service.isLifeSelected).toBeTrue();
        expect(service.isSpeedSelected).toBeFalse();
        expect(service.baseStats.life).toBe(BONUS_LIFE);
        expect(service.baseStats.speed).toBe(DEFAULT_SPEED);

        service.selectLife(false);
        expect(service.isLifeSelected).toBeFalse();
        expect(service.isSpeedSelected).toBeTrue();
        expect(service.baseStats.life).toBe(DEFAULT_LIFE);
        expect(service.baseStats.speed).toBe(BONUS_SPEED);
    });

    it('should select speed and update stats correctly', () => {
        service.selectSpeed(true);
        expect(service.isSpeedSelected).toBeTrue();
        expect(service.isLifeSelected).toBeFalse();
        expect(service.baseStats.speed).toBe(BONUS_SPEED);
        expect(service.baseStats.life).toBe(DEFAULT_LIFE);
    });

    it('should update avatar link when selecting an avatar', () => {
        service.selectAvatar(AVATAR_RELATIVE_PATH);
        expect(service.avatarLink).toBe(AVATAR_FULL_PATH);
    });

    it('should select attack and update defense accordingly', () => {
        service.selectAttack(DiceType.FourFaces);
        expect(service.selectedAttack).toBe(DiceType.FourFaces);
        expect(service.selectedDefense).toBe(DiceType.SixFaces);

        service.selectAttack(DiceType.SixFaces);
        expect(service.selectedAttack).toBe(DiceType.SixFaces);
        expect(service.selectedDefense).toBe(DiceType.FourFaces);
    });

    it('should select defense and update attack accordingly', () => {
        service.selectDefense(DiceType.SixFaces);
        expect(service.selectedDefense).toBe(DiceType.SixFaces);
        expect(service.selectedAttack).toBe(DiceType.FourFaces);

        service.selectDefense(DiceType.FourFaces);
        expect(service.selectedDefense).toBe(DiceType.FourFaces);
        expect(service.selectedAttack).toBe(DiceType.SixFaces);
    });

    it('should validate selection when all required fields are filled', () => {
        service.isLifeSelected = true;
        service.selectedAttack = DICE_ATTACK_4FACES;
        service.selectedDefense = DICE_DEFENSE_6FACES;
        service.selectedInput = TEST_PLAYER_NAME;
        service.avatarLink = AVATAR_FULL_PATH;

        const isValid = service.validateSelection();
        expect(isValid).toBeTrue();
        expect(service.isLifeError).toBeFalse();
        expect(service.selectedAttackError).toBeFalse();
        expect(service.selectedDefenseError).toBeFalse();
        expect(service.selectedInputError).toBeFalse();
        expect(service.avatarLinkError).toBeFalse();
    });

    it('should show validation errors when fields are missing', () => {
        service.isLifeSelected = false;
        service.isSpeedSelected = false;
        service.selectedAttack = null;
        service.selectedDefense = null;
        service.selectedInput = null;
        service.avatarLink = null;

        const isValid = service.validateSelection();
        expect(isValid).toBeFalse();
        expect(service.isLifeError).toBeTrue();
        expect(service.selectedAttackError).toBeTrue();
        expect(service.selectedDefenseError).toBeTrue();
        expect(service.selectedInputError).toBeTrue();
        expect(service.avatarLinkError).toBeTrue();
    });

    describe('getSavedCharacters', () => {
        it('should return the list of saved characters', () => {
            const savedCharacter: Player = {
                name: 'TestName',
                life: 5,
                speed: 4,
                attack: '4 Faces',
                defense: '6 Faces',
                avatarUrl: 'testAvatarLink',
                coordinate: { x: 0, y: 0 },
                isAdmin: false,
            };

            (service as any).createdCharacters = [savedCharacter];

            const characters = service.getSavedCharacters();
            expect(characters.length).toBe(1);
            expect(characters[0].name).toBe('TestName');
        });

        it('should return an empty array if no characters are saved', () => {
            (service as any).createdCharacters = [];

            const characters = service.getSavedCharacters();
            expect(characters.length).toBe(0);
        });
    });

    it('should return the last created character when characters exist', () => {
        const mockPlayer: Player = {
            name: 'Player1',
            life: 4,
            speed: 4,
            attack: '4 Faces',
            defense: '6 Faces',
            avatarUrl: 'testAvatarLink',
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        };

        (service as any).createdCharacters = [mockPlayer];

        const currentPlayer = service.getCurrentPlayer();
        expect(currentPlayer).toEqual(mockPlayer);
    });

    it('should return null when no characters exist', () => {
        (service as any).createdCharacters = [];

        const currentPlayer = service.getCurrentPlayer();
        expect(currentPlayer).toBeNull();
    });

    it('should reset all selection values', () => {
        service.isLifeSelected = true;
        service.isSpeedSelected = true;
        service.selectedAttack = '4 Faces';
        service.selectedDefense = '6 Faces';
        service.selectedInput = 'TestName';
        service.avatarLink = 'testAvatarLink';

        service.resetSelection();

        expect(service.isLifeSelected).toBeFalse();
        expect(service.isSpeedSelected).toBeFalse();
        expect(service.selectedAttack).toBeNull();
        expect(service.selectedDefense).toBeNull();
        expect(service.selectedInput).toBeNull();
        expect(service.avatarLink).toBeNull();
    });

    it('should reset all error values', () => {
        service.isLifeError = true;
        service.selectedAttackError = true;
        service.selectedDefenseError = true;
        service.selectedInputError = true;
        service.avatarLinkError = true;

        service.resetErrors();

        expect(service.isLifeError).toBeFalse();
        expect(service.selectedAttackError).toBeFalse();
        expect(service.selectedDefenseError).toBeFalse();
        expect(service.selectedInputError).toBeFalse();
        expect(service.avatarLinkError).toBeFalse();
    });

    it('should reset all selection values', () => {
        service.isLifeSelected = true;
        service.isSpeedSelected = true;
        service.selectedAttack = '4 Faces';
        service.selectedDefense = '6 Faces';
        service.selectedInput = 'TestName';
        service.avatarLink = 'testAvatarLink';

        service.resetSelection();

        expect(service.isLifeSelected).toBeFalse();
        expect(service.isSpeedSelected).toBeFalse();
        expect(service.selectedAttack).toBeNull();
        expect(service.selectedDefense).toBeNull();
        expect(service.selectedInput).toBeNull();
        expect(service.avatarLink).toBeNull();
    });

    it('should add a new character to createdCharacters with correct properties', () => {
        service.selectedInput = TEST_PLAYER_NAME;
        service.avatarLink = AVATAR_FULL_PATH;
        service.selectedAttack = DICE_ATTACK_4FACES;
        service.selectedDefense = DICE_DEFENSE_6FACES;
        service.baseStats.life = BONUS_LIFE;
        service.baseStats.speed = DEFAULT_SPEED;

        service.saveCharacter();

        expect((service as any).createdCharacters.length).toBe(1);
        const savedCharacter = (service as any).createdCharacters[0];
        expect(savedCharacter.name).toBe(TEST_PLAYER_NAME);
        expect(savedCharacter.avatarUrl).toBe(AVATAR_FULL_PATH);
        expect(savedCharacter.attack).toBe(DICE_ATTACK_4FACES);
        expect(savedCharacter.defense).toBe(DICE_DEFENSE_6FACES);
        expect(savedCharacter.life).toBe(BONUS_LIFE);
        expect(savedCharacter.speed).toBe(DEFAULT_SPEED);
        expect(savedCharacter.coordinate).toEqual({ x: 0, y: 0 });
        expect(savedCharacter.isAdmin).toBeFalse();
    });

    it('should add multiple characters to createdCharacters', () => {
        service.selectedInput = TEST_PLAYER_NAME;
        service.avatarLink = AVATAR_FULL_PATH;
        service.selectedAttack = DICE_ATTACK_4FACES;
        service.selectedDefense = DICE_DEFENSE_6FACES;
        service.baseStats.life = BONUS_LIFE;
        service.baseStats.speed = DEFAULT_SPEED;

        service.saveCharacter();

        service.selectedInput = 'Player2';
        service.avatarLink = './assets/images/Personnages/AnotherAvatar.png';
        service.selectedAttack = DICE_ATTACK_6FACES;
        service.selectedDefense = DICE_DEFENSE_4FACES;
        service.baseStats.life = DEFAULT_LIFE;
        service.baseStats.speed = BONUS_SPEED;

        service.saveCharacter();

        expect((service as any).createdCharacters.length).toBe(2);
        expect((service as any).createdCharacters[0].name).toBe(TEST_PLAYER_NAME);
        expect((service as any).createdCharacters[1].name).toBe('Player2');
    });

    it('should return true if the avatar is already disabled (chosen)', () => {
        const mockPlayer: Player = {
            name: 'Player1',
            life: 4,
            speed: 4,
            attack: '4 Faces',
            defense: '6 Faces',
            avatarUrl: AVATAR_FULL_PATH,
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        };
        (service as any).createdCharacters = [mockPlayer];

        const result = service.isAvatarDisabled(AVATAR_RELATIVE_PATH);
        expect(result).toBeTrue();
    });

    it('should return false if the avatar is not disabled (not chosen)', () => {
        (service as any).createdCharacters = [];

        const result = service.isAvatarDisabled(AVATAR_RELATIVE_PATH);
        expect(result).toBeFalse();
    });

    it('should return false if the avatar is not in the list of disabled avatars', () => {
        const mockPlayer: Player = {
            name: 'Player1',
            life: 4,
            speed: 4,
            attack: '4 Faces',
            defense: '6 Faces',
            avatarUrl: './assets/images/Personnages/AnotherAvatar.png',
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        };
        (service as any).createdCharacters = [mockPlayer];

        const result = service.isAvatarDisabled(AVATAR_RELATIVE_PATH);
        expect(result).toBeFalse();
    });

    it('should select speed and update stats correctly when selected is true', () => {
        service.selectSpeed(true);

        expect(service.isSpeedSelected).toBeTrue();
        expect(service.isLifeSelected).toBeFalse();
        expect(service.baseStats.speed).toBe(BONUS_SPEED);
        expect(service.baseStats.life).toBe(DEFAULT_LIFE);
    });

    it('should deselect speed and update stats correctly when selected is false', () => {
        service.selectSpeed(false);

        expect(service.isSpeedSelected).toBeFalse();
        expect(service.isLifeSelected).toBeTrue();
        expect(service.baseStats.speed).toBe(DEFAULT_SPEED);
        expect(service.baseStats.life).toBe(BONUS_LIFE);
    });

    it('should toggle selection correctly when called multiple times', () => {
        service.selectSpeed(true);
        expect(service.isSpeedSelected).toBeTrue();
        expect(service.baseStats.speed).toBe(BONUS_SPEED);
        expect(service.baseStats.life).toBe(DEFAULT_LIFE);

        service.selectSpeed(false);
        expect(service.isSpeedSelected).toBeFalse();
        expect(service.baseStats.speed).toBe(DEFAULT_SPEED);
        expect(service.baseStats.life).toBe(BONUS_LIFE);

        service.selectSpeed(true);
        expect(service.isSpeedSelected).toBeTrue();
        expect(service.baseStats.speed).toBe(BONUS_SPEED);
        expect(service.baseStats.life).toBe(DEFAULT_LIFE);
    });
});
