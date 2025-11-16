import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Game, gameSchema, GameDocument } from '@app/schema/game.schema';
import mongoose, { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Game Schema', () => {
    let mongoServer: MongoMemoryServer;
    let gameModel: Model<GameDocument>;
    const VALID_GAME_DATA = {
        id: '1',
        description: 'Test Description',
        name: 'Test Game',
        size: 'Moyenne Taille',
        gameMode: 'CTF',
        visibility: true,
        map: [],
        map2: [],
        screenshot: 'imageTestUrl',
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        const compiledModel = mongoose.model<GameDocument>(Game.name, gameSchema);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: getModelToken(Game.name),
                    useValue: compiledModel,
                },
            ],
        }).compile();

        gameModel = module.get<Model<GameDocument>>(getModelToken(Game.name));
    });

    afterEach(async () => {
        await gameModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    it('should be defined', () => {
        expect(gameModel).toBeDefined();
    });

    it('should create a game document', async () => {
        const game = new gameModel(VALID_GAME_DATA);
        const savedGame = await game.save();

        expect(savedGame._id).toBeDefined();
        expect(savedGame.toObject()).toMatchObject(VALID_GAME_DATA);
        expect(savedGame.modificationDate).toBeDefined();
    });

    it('should have a default modificationDate', async () => {
        const game = new gameModel({ ...VALID_GAME_DATA, id: '2', name: 'Default Date Test Game' });
        const savedGame = await game.save();

        expect(savedGame.modificationDate).toBeDefined();
        expect(savedGame.modificationDate.toString().split('T')[0]).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should fail validation for invalid size', async () => {
        const invalidGameData = { ...VALID_GAME_DATA, id: '4', size: 'Extra Grande Taille' };
        const game = new gameModel(invalidGameData);

        await expect(game.save()).rejects.toThrowError(/is not a valid enum value/);
    });

    it('should trim strings for name and description', async () => {
        const trimmedGameData = {
            ...VALID_GAME_DATA,
            id: '6',
            name: '    Trim Test Name    ',
            description: '    Trim Test Description    ',
        };

        const game = new gameModel(trimmedGameData);
        const savedGame = await game.save();

        expect(savedGame.name).toBe('Trim Test Name');
        expect(savedGame.description).toBe('Trim Test Description');
    });

    it('should reject missing required fields', async () => {
        await expect(new gameModel({}).save()).rejects.toThrow();
    });
});
