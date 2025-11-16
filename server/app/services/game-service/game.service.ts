import { CreateGameDto } from '@app/dto/create-game.dto';
import { UpdateGameDto } from '@app/dto/update-game.dto';
import { NotificationGateway } from '@app/gateways/notification/notification.gateway';
import { Game, GameDocument } from '@app/schema/game.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
    constructor(
        @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
        private readonly notificationGateway: NotificationGateway,
    ) {}

    async getAllGames(): Promise<Game[]> {
        return this.gameModel.find({});
    }

    /**
     * Retrieve a game by its ID.
     * @param id The ID of the game.
     */
    async getGameById(id: string): Promise<Game | null> {
        return this.gameModel.findOne({ id });
    }

    async getVisibleGames(): Promise<Game[]> {
        return this.gameModel.find({ visibility: true });
    }

    /**
     * Create a new game.
     * @param game The game data to create.
     */
    async createGame(game: CreateGameDto): Promise<Game> {
        const newGame = {
            ...game,
            id: uuidv4(),
            modificationDate: this.formatDate(new Date()),
            screenshot: game.screenshot || '',
        };
        return this.gameModel.create(newGame as Game);
    }

    /**
     * Update an existing game.
     * @param id The ID of the game to update.
     * @param game The updated game data.
     */
    async updateGame(id: string, game: UpdateGameDto): Promise<Game | null> {
        return this.gameModel.findOneAndUpdate(
            { id },
            { ...game, dateModification: this.formatDate(new Date()), screenshot: game.screenshot },
            { new: true },
        );
    }

    /**
     * Update the visibility of a game.
     * @param id The ID of the game.
     * @param visibility The new visibility status.
     */
    async updateVisibility(id: string, visibility: boolean): Promise<Game | null> {
        const game = await this.gameModel.findOneAndUpdate({ id }, { visibility, dateModification: this.formatDate(new Date()) }, { new: true });

        if (game) {
            this.notificationGateway.sendVisibilityChangeNotification(game.name, visibility);
        }

        return game;
    }

    /**
     * Delete a game by its ID.
     * @param id The ID of the game to delete.
     */
    async deleteGame(id: string): Promise<void> {
        const game = await this.gameModel.findOne({ id });
        if (game) {
            await this.gameModel.deleteOne({ id });
            this.notificationGateway.sendGameDeletionNotification(game.id, game.name);
        }
    }

    /**
     * Find a game by specific attributes.
     * @param name The name of the game.
     */
    async findGameByAttributes(name: string): Promise<Game | null> {
        return this.gameModel.findOne({ name });
    }

    /**
     * Formats a date to 'YYYY/MM/DD - HH:MM'
     * @param date The date to format.
     * @returns The formatted date string.
     */
    private formatDate(date: Date | string): string {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const pad = (num: number) => num.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());

        return `${year}/${month}/${day} - ${hours}:${minutes}`;
    }
}
