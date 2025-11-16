import { Component } from '@angular/core';
import { GameService } from '@app/services/game-service/game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';

@Component({
    selector: 'app-game-info',
    templateUrl: './game-info.component.html',
    styleUrls: ['./game-info.component.scss'],
})
export class GameInfoComponent {
    constructor(
        private readonly gameService: GameService,
        private readonly playingService: PlayingService,
    ) {}

    /**
     * Getter for GameService.
     * @returns GameService - The injected GameService instance.
     */
    get serviceGame(): GameService {
        return this.gameService;
    }

    /**
     * Getter for PlayingService.
     * @returns PlayingService - The injected PlayingService instance.
     */
    get servicePlaying(): PlayingService {
        return this.playingService;
    }
}
