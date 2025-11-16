/* eslint-disable max-lines */
// La grande quantité de branches requiert beacoup de tests
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
import { CreateGameDto } from '@app/dto/create-game.dto';
import { UpdateGameDto } from '@app/dto/update-game.dto';
import { NotificationGateway } from '@app/gateways/notification/notification.gateway';
import { Game, GameDocument } from '@app/schema/game.schema';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { GameService } from './game.service';

describe('GameService', () => {
    let service: GameService;
    let model: Model<GameDocument>;
    let gateway: NotificationGateway;

    const mockGame = {
        id: '1',
        name: 'Game',
        description: 'Description Test',
        size: 'Grande Taille',
        gameMode: 'Classique',
        visibility: false,
        map: [],
        map2: [],
        modificationDate: '2023-01-01',
    };

    const mockGameModel = {
        find: jest.fn().mockResolvedValue([mockGame]),
        findOne: jest.fn().mockResolvedValue(mockGame),
        create: jest.fn().mockResolvedValue(mockGame),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        findOneAndUpdate: jest.fn().mockResolvedValue(mockGame),
    };

    const mockGameGateway = {
        sendVisibilityChangeNotification: jest.fn(),
        sendGameDeletionNotification: jest.fn(),
    };

    const mockLogger = {
        error: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameService,
                { provide: getModelToken(Game.name), useValue: mockGameModel },
                { provide: NotificationGateway, useValue: mockGameGateway },
                { provide: Logger, useValue: mockLogger },
            ],
        }).compile();

        service = module.get<GameService>(GameService);
        model = module.get<Model<GameDocument>>(getModelToken(Game.name));
        gateway = module.get<NotificationGateway>(NotificationGateway);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllGames', () => {
        it('should return an array of games', async () => {
            const result = await service.getAllGames();
            expect(result).toEqual([mockGame]);
            expect(model.find).toHaveBeenCalled();
        });
    });

    describe('getGameById', () => {
        it('should return a game by ID', async () => {
            const result = await service.getGameById(mockGame.id);
            expect(result).toEqual(mockGame);
            expect(model.findOne).toHaveBeenCalledWith({ id: mockGame.id });
        });

        it('should return null if game is not found', async () => {
            jest.spyOn(model, 'findOne').mockResolvedValueOnce(null);
            const result = await service.getGameById(mockGame.id);
            expect(result).toBeNull();
            expect(model.findOne).toHaveBeenCalledWith({ id: mockGame.id });
        });
    });

    describe('createGame', () => {
        it('should create a new game', async () => {
            const createGameDto: CreateGameDto = {
                id: mockGame.id,
                name: 'Game Creer',
                description: 'Description Test',
                size: 'Moyenne Taille',
                gameMode: 'Classique',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: '',
            };

            const mockCreatedGame = {
                ...createGameDto,
                id: expect.any(String),
                modificationDate: expect.any(String),
            };
            const result = await service.createGame(mockCreatedGame);
            expect(result).toEqual(mockGame);
            expect(model.create).toHaveBeenCalledWith(expect.objectContaining(mockCreatedGame));
        });
    });

    describe('deleteGame', () => {
        it('should delete a game', async () => {
            const result = await service.deleteGame(mockGame.id);

            expect(result).toBeUndefined();
            expect(model.findOne).toHaveBeenCalledWith({ id: mockGame.id });
            expect(model.deleteOne).toHaveBeenCalledWith({ id: mockGame.id });
            expect(gateway.sendGameDeletionNotification).toHaveBeenCalledWith(mockGame.id, mockGame.name);
        });
    });

    describe('updateGame', () => {
        it('should update the game', async () => {
            const updateGameDto: UpdateGameDto = {
                id: mockGame.id,
                name: 'Updated Game',
                description: 'Updated Description',
                size: 'Grande Taille',
                gameMode: 'Classique',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: 'updated-screenshot.png',
            };

            const updatedGame = {
                ...mockGame,
                ...updateGameDto,
                modificationDate: expect.any(String),
            };

            jest.spyOn(model, 'findOneAndUpdate').mockResolvedValue(updatedGame);

            const result = await service.updateGame(mockGame.id, updateGameDto);

            expect(model.findOneAndUpdate).toHaveBeenCalledWith(
                { id: mockGame.id },
                expect.objectContaining({
                    ...updateGameDto,
                    dateModification: expect.any(String),
                }),
                { new: true },
            );

            expect(result).toEqual(updatedGame);
        });

        it('should fail if screenshot is invalid', async () => {
            const updateGameDto: UpdateGameDto = {
                id: mockGame.id,
                name: 'Updated Game',
                description: 'Updated Description',
                size: 'Grande Taille',
                gameMode: 'Classique',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: '',
            };

            jest.spyOn(model, 'findOneAndUpdate').mockResolvedValue(null);

            const result = await service.updateGame(mockGame.id, updateGameDto);

            expect(result).toBeNull();
            expect(model.findOneAndUpdate).toHaveBeenCalledWith({ id: mockGame.id }, expect.objectContaining(updateGameDto), { new: true });
        });

        it('should throw an error if update fails', async () => {
            const updateGameDto: UpdateGameDto = {
                id: mockGame.id,
                name: 'Updated Game',
                description: 'Updated Description',
                size: 'Large',
                gameMode: 'Classic',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: 'updated-screenshot.png',
            };

            jest.spyOn(model, 'findOneAndUpdate').mockRejectedValueOnce(new Error('Update failed'));

            await expect(service.updateGame(mockGame.id, updateGameDto)).rejects.toThrow('Update failed');
            expect(model.findOneAndUpdate).toHaveBeenCalledWith(
                { id: mockGame.id },
                expect.objectContaining({
                    ...updateGameDto,
                    dateModification: expect.any(String),
                }),
                { new: true },
            );
        });
    });

    describe('updateVisibility', () => {
        it('should update the visibility of a game', async () => {
            const updatedGame = {
                ...mockGame,
                visibility: true,
                modificationDate: expect.any(String),
            };

            jest.spyOn(model, 'findOneAndUpdate').mockResolvedValue(updatedGame);

            const result = await service.updateVisibility(mockGame.id, true);

            expect(result).toEqual(updatedGame);
            expect(model.findOneAndUpdate).toHaveBeenCalledWith(
                { id: mockGame.id },
                { visibility: true, dateModification: expect.any(String) },
                { new: true },
            );
            expect(gateway.sendVisibilityChangeNotification).toHaveBeenCalledWith(mockGame.name, true);
        });

        it('should throw an error if update fails', async () => {
            jest.spyOn(model, 'findOneAndUpdate').mockRejectedValueOnce(new Error('Update failed'));

            await expect(service.updateVisibility(mockGame.id, true)).rejects.toThrow('Update failed');
            expect(model.findOneAndUpdate).toHaveBeenCalledWith(
                { id: mockGame.id },
                { visibility: true, dateModification: expect.any(String) },
                { new: true },
            );
        });
    });

    describe('getVisibleGames', () => {
        it('should return an array of visible games', async () => {
            const result = await service.getVisibleGames();
            expect(result).toEqual([mockGame]);
            expect(model.find).toHaveBeenCalledWith({ visibility: true });
        });
    });

    describe('findGameByAttributes', () => {
        it('should return a game if found by attributes', async () => {
            const result = await service.findGameByAttributes('Test Game');
            expect(result).toEqual(mockGame);
            expect(model.findOne).toHaveBeenCalledWith({
                name: 'Test Game',
            });
        });

        it('should return null if no game found by attributes', async () => {
            jest.spyOn(model, 'findOne').mockResolvedValueOnce(null);
            const result = await service.findGameByAttributes('Nonexistent Game');
            expect(result).toBeNull();
        });
    });

    describe('formatDate', () => {
        it('should return "Invalid Date" when given an invalid date', () => {
            const result = (service as any).formatDate('not-a-date');
            expect(result).toBe('Invalid Date');
        });

        it('should correctly format a valid date', () => {
            const mockDate = new Date(2023, 0, 15, 14, 30);
            const result = (service as any).formatDate(mockDate);
            expect(result).toBe('2023/01/15 - 14:30');
        });
    });
});
