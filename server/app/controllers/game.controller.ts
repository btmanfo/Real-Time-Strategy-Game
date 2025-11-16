import { CreateGameDto } from '@app/dto/create-game.dto';
import { UpdateGameDto } from '@app/dto/update-game.dto';
import { GameService } from '@app/services/game-service/game.service';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Logger, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('Game')
export class GameController {
    private readonly logger = new Logger(GameController.name);

    constructor(private readonly gameService: GameService) {}

    /**
     * Retrieve all games.
     * @returns An array of all games.
     */
    @Get()
    async getAllGames() {
        try {
            const games = await this.gameService.getAllGames();
            this.logger.log('Successfully retrieved all games.');
            return games;
        } catch (error) {
            throw new HttpException('Failed to get all games.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retrieve all visible games.
     * @returns An array of visible games.
     */
    @Get('visible')
    async getVisibleGames() {
        try {
            const visibleGames = await this.gameService.getVisibleGames();
            this.logger.log('Successfully retrieved all visible games.');
            return visibleGames;
        } catch (error) {
            throw new HttpException('An unexpected error occurred.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Retrieve a game by its ID.
     * @param id The ID of the game.
     * @returns The game data.
     */
    @Get(':id')
    async getGameById(@Param('id') id: string) {
        try {
            const game = await this.gameService.getGameById(id);
            if (!game) {
                throw new HttpException('Game not found.', HttpStatus.NOT_FOUND);
            }
            this.logger.log(`Game with ID ${id} found successfully.`);
            return game;
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new HttpException('Failed to fetch game.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create a new game.
     * @param createGameDto The data for creating a new game.
     * @returns The newly created game.
     */
    @Post()
    @UsePipes(new ValidationPipe())
    async createGame(@Body() createGameDto: CreateGameDto) {
        try {
            const existingGame = await this.gameService.findGameByAttributes(createGameDto.name);
            if (existingGame) {
                throw new HttpException('Failed to add game, it already exists', HttpStatus.CONFLICT);
            }
            const newGame = await this.gameService.createGame(createGameDto);
            this.logger.log(`Game "${createGameDto.name}" created successfully.`);
            return newGame;
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.CONFLICT) {
                throw error;
            }
        }
    }

    /**
     * Update an existing game.
     * @param id The ID of the game to update.
     * @param updateGameDto The updated game data.
     * @returns The updated game.
     */
    @Patch(':id')
    @UsePipes(new ValidationPipe())
    async updateGame(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto) {
        try {
            const game = await this.gameService.getGameById(id);
            if (!game) {
                throw new HttpException('Game not found.', HttpStatus.NOT_FOUND);
            }

            const updatedGame = await this.gameService.updateGame(id, updateGameDto);
            if (!updatedGame) {
                throw new HttpException('Failed to update game.', HttpStatus.BAD_REQUEST);
            }
            this.logger.log(`Game with ID ${id} updated successfully.`);
            return updatedGame;
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.BAD_REQUEST) {
                throw error;
            } else {
                throw new HttpException('Game not found.', HttpStatus.NOT_FOUND);
            }
        }
    }

    /**
     * Update the visibility of a game.
     * @param id The ID of the game.
     * @param visibility The new visibility status.
     * @returns The updated game.
     */
    @Patch(':id/visibility')
    async updateVisibility(@Param('id') id: string, @Body('visibility') visibility: boolean) {
        try {
            const updatedGame = await this.gameService.updateVisibility(id, visibility);
            if (!updatedGame) {
                throw new HttpException('Game not found.', HttpStatus.NOT_FOUND);
            }
            this.logger.log(`Visibility of game with ID ${id} updated to ${visibility}.`);
            return updatedGame;
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new HttpException('Failed to update visibility.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete a game by its ID.
     * @param id The ID of the game to delete.
     * @returns The deleted game.
     */
    @Delete(':id')
    async deleteGame(@Param('id') id: string) {
        try {
            const game = await this.gameService.getGameById(id);
            if (!game) {
                throw new HttpException('Game not found.', HttpStatus.NOT_FOUND);
            }
            const deletedGame = await this.gameService.deleteGame(id);
            this.logger.log(`Game with ID ${id} deleted successfully.`);
            return deletedGame;
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
                throw error;
            }
            throw new HttpException('Failed to delete game.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
