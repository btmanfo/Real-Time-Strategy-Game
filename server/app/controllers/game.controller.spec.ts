import { GameController } from '@app/controllers/game.controller';
import { CreateGameDto } from '@app/dto/create-game.dto';
import { UpdateGameDto } from '@app/dto/update-game.dto';
import { GameService } from '@app/services/game-service/game.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('GameController', () => {
    let controller: GameController;
    let gameService: GameService;
    const USER_ID = '1';
    const GAME_NAME = {
        test: 'Test Game',
        update: 'Updated Game',
    };
    const messagesError = {
        notFound: 'Game not found.',
        failedDelete: 'Failed to delete game.',
        unexpectedError: 'Unexpected error',
        failedVisibility: 'Failed to update visibility.',
        updateGame: 'Failed to update game.',
        alreadyExist: 'Failed to add game, it already exist',
        addGame: 'Failed to add a game.',
        fetchGame: 'Failed to fetch game.',
        getAllGame: 'Failed to get all games.',
    };

    const mockGameService = {
        getAllGames: jest.fn(),
        getVisibleGames: jest.fn(),
        getGameById: jest.fn(),
        createGame: jest.fn(),
        updateGame: jest.fn(),
        updateVisibility: jest.fn(),
        deleteGame: jest.fn(),
        findGameByAttributes: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [{ provide: GameService, useValue: mockGameService }],
        }).compile();

        controller = module.get<GameController>(GameController);
        gameService = module.get<GameService>(GameService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllGames', () => {
        it('should return an array of games', async () => {
            const mockGames = [{ id: USER_ID, name: GAME_NAME.test }];
            mockGameService.getAllGames.mockResolvedValue(mockGames);

            const result = await controller.getAllGames();
            expect(result).toEqual(mockGames);
            expect(gameService.getAllGames).toHaveBeenCalledTimes(1);
        });

        it('should throw an HttpException if an error occurs', async () => {
            mockGameService.getAllGames.mockRejectedValue(new Error());

            await expect(controller.getAllGames()).rejects.toThrow(HttpException);
            await expect(controller.getAllGames()).rejects.toThrow(messagesError.getAllGame);
        });
    });

    describe('getVisibleGames', () => {
        it('should return visible games', async () => {
            const mockVisibleGames = [{ id: USER_ID, name: GAME_NAME.test, visibility: true }];
            mockGameService.getVisibleGames.mockResolvedValue(mockVisibleGames);

            const result = await controller.getVisibleGames();
            expect(result).toEqual(mockVisibleGames);
            expect(gameService.getVisibleGames).toHaveBeenCalledTimes(1);
        });

        it('should throw an HttpException if an error occurs', async () => {
            mockGameService.getVisibleGames.mockRejectedValue(new Error());

            await expect(controller.getVisibleGames()).rejects.toThrow(HttpException);
            await expect(controller.getVisibleGames()).rejects.toThrow('An unexpected error occurred.');
        });
    });

    describe('getGameById', () => {
        it('should return a game by ID', async () => {
            const mockGame = { id: USER_ID, name: GAME_NAME.test };
            mockGameService.getGameById.mockResolvedValue(mockGame);

            const result = await controller.getGameById(USER_ID);
            expect(result).toEqual(mockGame);
            expect(gameService.getGameById).toHaveBeenCalledWith(USER_ID);
        });

        it('should throw an HttpException if game is not found', async () => {
            mockGameService.getGameById.mockResolvedValue(null);

            await expect(controller.getGameById(USER_ID)).rejects.toThrow(HttpException);
            await expect(controller.getGameById(USER_ID)).rejects.toThrow(messagesError.notFound);
        });

        it('should throw an HttpException if an error occurs', async () => {
            mockGameService.getGameById.mockRejectedValue(new Error());

            await expect(controller.getGameById(USER_ID)).rejects.toThrow(HttpException);
            await expect(controller.getGameById(USER_ID)).rejects.toThrow(messagesError.fetchGame);
        });
    });

    describe('createGame', () => {
        it('should add a new game', async () => {
            const createGameDto: CreateGameDto = {
                id: USER_ID,
                description: 'Test Description',
                name: GAME_NAME.test,
                size: 'Moyenne Taille',
                gameMode: 'CTF',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: '',
            };
            const mockGame = { ...createGameDto };
            mockGameService.createGame.mockResolvedValue(mockGame);

            const result = await controller.createGame(createGameDto);
            expect(result).toEqual(mockGame);
            expect(gameService.createGame).toHaveBeenCalledWith(createGameDto);
        });

        it('should throw an HttpException if game already exists', async () => {
            const createGameDto: CreateGameDto = {
                id: USER_ID,
                description: 'Test Description',
                name: GAME_NAME.test,
                size: 'Moyenne Taille',
                gameMode: 'CTF',
                visibility: true,
                map: [],
                map2: [],
                modificationDate: '2023-01-01',
                screenshot: '',
            };

            mockGameService.findGameByAttributes.mockResolvedValue(createGameDto);

            await expect(controller.createGame(createGameDto)).rejects.toThrow(HttpException);
            await expect(controller.createGame(createGameDto)).rejects.toThrow(messagesError.alreadyExist);
        });
    });

    describe('updateGame', () => {
        it('should update the game', async () => {
            const updateGameDto: UpdateGameDto = {
                name: GAME_NAME.update,
                id: '',
                description: '',
                size: '',
                gameMode: '',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '',
                screenshot: '',
            };
            const updatedGame = { id: USER_ID, name: GAME_NAME.update };
            mockGameService.getGameById.mockResolvedValue(updatedGame);
            mockGameService.updateGame.mockResolvedValue(updatedGame);

            const result = await controller.updateGame(USER_ID, updateGameDto);
            expect(result).toEqual(updatedGame);
            expect(gameService.updateGame).toHaveBeenCalledWith(USER_ID, updateGameDto);
        });

        it('should throw an HttpException if game is not found', async () => {
            const updateGameDto: UpdateGameDto = {
                name: GAME_NAME.update,
                id: '',
                description: '',
                size: '',
                gameMode: '',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '',
                screenshot: '',
            };
            mockGameService.getGameById.mockResolvedValue(null);

            await expect(controller.updateGame(USER_ID, updateGameDto)).rejects.toThrow(HttpException);
            await expect(controller.updateGame(USER_ID, updateGameDto)).rejects.toThrow(messagesError.notFound);
        });

        it('should throw an HttpException if update fails', async () => {
            const updateGameDto: UpdateGameDto = {
                name: GAME_NAME.update,
                id: '',
                description: '',
                size: '',
                gameMode: '',
                visibility: false,
                map: [],
                map2: [],
                modificationDate: '',
                screenshot: '',
            };
            mockGameService.getGameById.mockResolvedValue({ id: USER_ID, name: 'Old Game' });
            mockGameService.updateGame.mockResolvedValue(null);

            await expect(controller.updateGame(USER_ID, updateGameDto)).rejects.toThrow(HttpException);
            await expect(controller.updateGame(USER_ID, updateGameDto)).rejects.toThrow(messagesError.updateGame);
        });
    });

    describe('updateVisibility', () => {
        it('should update the visibility of a game', async () => {
            const id = USER_ID;
            const visibility = true;
            const mockGame = { id, name: GAME_NAME.test, visibility };
            mockGameService.updateVisibility.mockResolvedValue(mockGame);

            const result = await controller.updateVisibility(id, visibility);
            expect(result).toEqual(mockGame);
            expect(gameService.updateVisibility).toHaveBeenCalledWith(id, visibility);
        });

        it('should throw an HttpException if game is not found', async () => {
            mockGameService.updateVisibility.mockResolvedValue(null);

            await expect(controller.updateVisibility(USER_ID, true)).rejects.toThrow(HttpException);
            await expect(controller.updateVisibility(USER_ID, true)).rejects.toThrow(messagesError.notFound);
        });

        it('should throw an HttpException if an error occurs', async () => {
            const id = USER_ID;
            const visibility = true;
            mockGameService.updateVisibility.mockRejectedValue(new Error());

            await expect(controller.updateVisibility(id, visibility)).rejects.toThrow(HttpException);
            await expect(controller.updateVisibility(id, visibility)).rejects.toThrow(messagesError.failedVisibility);
        });
    });

    describe('deleteGame', () => {
        it('should delete a game and return it', async () => {
            const mockGame = { id: USER_ID, name: GAME_NAME.test };
            mockGameService.getGameById.mockResolvedValue(mockGame);
            mockGameService.deleteGame.mockResolvedValue(mockGame);

            const result = await controller.deleteGame(USER_ID);
            expect(result).toEqual(mockGame);
            expect(gameService.getGameById).toHaveBeenCalledWith(USER_ID);
            expect(gameService.deleteGame).toHaveBeenCalledWith(USER_ID);
        });

        it('should throw an HttpException if game is not found in getGameById', async () => {
            mockGameService.getGameById.mockResolvedValue(null);

            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(HttpException);
            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(messagesError.notFound);
            expect(gameService.getGameById).toHaveBeenCalledWith(USER_ID);
            expect(gameService.deleteGame).toHaveBeenCalledWith(USER_ID);
        });

        it('should throw an HttpException if deleteGame fails unexpectedly', async () => {
            const mockGame = { id: USER_ID, name: GAME_NAME.test };
            mockGameService.getGameById.mockResolvedValue(mockGame);
            mockGameService.deleteGame.mockRejectedValue(new Error(messagesError.unexpectedError));

            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(HttpException);
            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(messagesError.failedDelete);
            expect(gameService.getGameById).toHaveBeenCalledWith(USER_ID);
            expect(gameService.deleteGame).toHaveBeenCalledWith(USER_ID);
        });

        it('should rethrow a notFound HttpException if thrown in deleteGame', async () => {
            const mockGame = { id: USER_ID, name: GAME_NAME.test };
            mockGameService.getGameById.mockResolvedValue(mockGame);
            mockGameService.deleteGame.mockRejectedValue(new HttpException(messagesError.notFound, HttpStatus.NOT_FOUND));

            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(HttpException);
            await expect(controller.deleteGame(USER_ID)).rejects.toThrow(messagesError.notFound);
            expect(gameService.getGameById).toHaveBeenCalledWith(USER_ID);
            expect(gameService.deleteGame).toHaveBeenCalledWith(USER_ID);
        });
    });
});
