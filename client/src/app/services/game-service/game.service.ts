import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/interface';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private readonly apiUrl = environment.serverUrl;
    // On doit initialiser socket sinon on a une erreur de type "Cannot read property of undefined"
    // eslint-disable-next-line @typescript-eslint/member-ordering
    socket: Socket = io(this.apiUrl);
    private newGamePop: Game = {
        id: '',
        description: '',
        name: '',
        size: '',
        gameMode: '',
        visibility: false,
        map: [],
        map2: [],
        modificationDate: this.formatDate(new Date()),
        screenshot: '',
    };

    constructor(private readonly http: HttpClient) {}

    /**
     * Formats a date to 'YYYY/MM/DD - HH:MM'
     * @param date The date to format.
     * @returns The formatted date string.
     */
    formatDate(date: Date | string): string {
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

    /**
     * Fetches all games.
     * @returns An Observable containing all games.
     */
    getGames(): Observable<Game[]> {
        return this.http.get<Game[]>(`${this.apiUrl}`);
    }

    /**
     * Fetches visible games.
     * @returns An Observable containing the visible games.
     */
    getVisibleGames(): Observable<Game[]> {
        return this.http.get<Game[]>(`${this.apiUrl}/visible`);
    }

    /**
     * Fetches a specific game by its ID.
     * @param id The ID of the game to fetch.
     * @returns An Observable containing the requested game.
     */
    getGameById(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.apiUrl}/${id}`);
    }

    /**
     * Fetches a copy of the default game object.
     * @returns A copy of the default game object.
     */
    getNewGame(): Game {
        return JSON.parse(JSON.stringify(this.newGamePop));
    }

    /**
     * Sets a new game by modifying the properties of the default game object.
     * @param game The game to set.
     */
    setNewGame(game: Game): void {
        this.newGamePop = {
            ...game,
            modificationDate: this.formatDate(new Date()),
        };
    }

    /**
     * Creates a new game.
     * @param game The game to create.
     * @returns An Observable containing the created game.
     */
    createGame(game: Game): Observable<Game> {
        return this.http.post<Game>(this.apiUrl, game);
    }

    /**
     * Deletes a game by its ID.
     * @param id The ID of the game to delete.
     * @returns An Observable indicating the game has been deleted.
     */
    deleteGame(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Updates an existing game.
     * @param id The ID of the game to update.
     * @param game The updated game data.
     * @returns An Observable containing the updated game.
     */
    updateGame(id: string, game: Game): Observable<Game> {
        return this.http.patch<Game>(`${this.apiUrl}/${id}`, game);
    }

    /**
     * Updates the visibility of a game.
     * @param id The ID of the game to modify.
     * @param visibility The new visibility status of the game.
     * @returns An Observable containing the game with the updated visibility.
     */
    updateVisibility(id: string, visibility: boolean): Observable<Game> {
        return this.http.patch<Game>(`${this.apiUrl}/${id}/visibility`, { visibility });
    }
}
