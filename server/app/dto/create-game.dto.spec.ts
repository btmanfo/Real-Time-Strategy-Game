import { validate } from 'class-validator';
import { CreateGameDto } from '@app/dto/create-game.dto';

describe('CreateGameDto', () => {
    let dto: CreateGameDto;

    const TEST_ID = '1';
    const TEST_DESCRIPTION = 'Test Description';
    const TEST_NAME = 'Test Game';
    const TEST_SIZE = 'Grande Taille';
    const TEST_GAME_MODE = 'Classique';
    const TEST_VISIBILITY = true;
    const TEST_MODIFICATION_DATE = '2023-01-01';
    const TEST_SCREENSHOT = 'imageTestUrl';
    const NO_ERRORS_EXPECTED = 0;
    const EXPECTED_ERRORS_GREATER_THAN = 0;

    beforeEach(() => {
        dto = new CreateGameDto();
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

    it('should validate all properties correctly', async () => {
        const errors = await validate(dto);
        expect(errors.length).toBe(NO_ERRORS_EXPECTED);
    });

    it('should fail validation if id is empty', async () => {
        dto.id = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('id');
    });

    it('should fail validation if description is empty', async () => {
        dto.description = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('description');
    });

    it('should fail validation if name is empty', async () => {
        dto.name = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('name');
    });

    it('should fail validation if size is empty', async () => {
        dto.size = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('size');
    });

    it('should fail validation if gameMode is empty', async () => {
        dto.gameMode = '';
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('gameMode');
    });

    it('should fail validation if visibility is not a boolean', async () => {
        dto.visibility = null;
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(EXPECTED_ERRORS_GREATER_THAN);
        expect(errors[0].property).toBe('visibility');
    });

    it('should fail validation if visibility is not a string', async () => {
        dto.screenshot = null;
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
