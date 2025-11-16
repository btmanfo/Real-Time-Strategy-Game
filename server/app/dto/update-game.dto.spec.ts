// Les any sont pas recommandés, mais sont utilisés ici pour simplifier le code de test.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { validate } from 'class-validator';
import { UpdateGameDto } from '@app/dto/update-game.dto';

describe('UpdateGameDto', () => {
    let dto: UpdateGameDto;

    const TEST_ID = '1';
    const TEST_DESCRIPTION = 'Updated Description';
    const TEST_NAME = 'Updated Game';
    const TEST_SIZE = 'Moyenne Taille';
    const TEST_GAME_MODE = 'CTF';
    const TEST_VISIBILITY = true;
    const TEST_MODIFICATION_DATE = '2023-01-01';
    const TEST_SCREENSHOT = 'imageTestUrl';
    const INVALID_VALUE = 123;
    const NO_ERRORS_EXPECTED = 0;
    const EXPECTED_ERRORS_GREATER_THAN = 0;

    beforeEach(() => {
        dto = new UpdateGameDto();
        dto.id = TEST_ID;
        dto.description = TEST_DESCRIPTION;
        dto.name = TEST_NAME;
        dto.size = TEST_SIZE;
        dto.gameMode = TEST_GAME_MODE;
        dto.visibility = TEST_VISIBILITY;
        dto.map = [];
        dto.map2 = [];
        dto.modificationDate = TEST_MODIFICATION_DATE;
        dto.screenshot = TEST_SCREENSHOT;
    });

    it('should be defined', () => {
        expect(dto).toBeDefined();
    });

    it('should validate all required properties correctly', async () => {
        const errors = await validate(dto);
        expect(errors.length).toBe(NO_ERRORS_EXPECTED);
    });

    it('should fail validation if id is empty', async () => {
        dto.id = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('id');
    });

    it('should fail validation if name is empty', async () => {
        dto.name = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('name');
    });

    it('should fail validation if visibility is not a boolean', async () => {
        dto.visibility = null;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('visibility');
    });

    it('should fail validation if map is not an array', async () => {
        dto.map = null;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('map');
    });

    it('should fail validation if map2 is not an array', async () => {
        dto.map2 = null;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('map2');
    });

    it('should fail validation if modificationDate is empty', async () => {
        dto.modificationDate = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('modificationDate');
    });

    it('should fail validation if id is not a string', async () => {
        dto.id = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('id');
    });

    it('should fail validation if description is not a string', async () => {
        dto.description = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('description');
    });

    it('should fail validation if name is not a string', async () => {
        dto.name = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('name');
    });

    it('should fail validation if size is not a string', async () => {
        dto.size = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('size');
    });

    it('should fail validation if gameMode is not a string', async () => {
        dto.gameMode = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('gameMode');
    });

    it('should fail validation if visibility is not a boolean', async () => {
        dto.visibility = 'true' as unknown as boolean;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('visibility');
    });

    it('should fail validation if modificationDate is not a string', async () => {
        dto.modificationDate = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('modificationDate');
    });

    it('should fail validation if visibility is not a string', async () => {
        dto.screenshot = INVALID_VALUE as unknown as string;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('screenshot');
    });

    it('should fail validation if screenshot is empty', async () => {
        dto.screenshot = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('screenshot');
    });
});
