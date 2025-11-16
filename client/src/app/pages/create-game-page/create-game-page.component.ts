import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { HeaderComponent } from '@app/components/header/header.component';
import { pageName } from '@app/constants/constants';
import { Game } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app-create-game-page',
    imports: [RouterLink, HeaderComponent, CommonModule, FormsModule],
    templateUrl: './create-game-page.component.html',
    styleUrl: './create-game-page.component.scss',
})
export class CreateGameModePageComponent {
    newGame: Game = {
        id: uuidv4(),
        name: '',
        description: '',
        size: '',
        gameMode: '',
        visibility: false,
        map: [],
        map2: [],
        modificationDate: this.gameService.formatDate(new Date()),
        screenshot: '',
    };
    private readonly title = pageName.createPage;

    constructor(
        private readonly gameService: GameService,
        private readonly router: Router,
    ) {}

    get titleValue(): string {
        return this.title;
    }

    onSubmit() {
        this.gameService.setNewGame(structuredClone(this.newGame));
        localStorage.setItem('gameId', '');
        localStorage.setItem('mapSize', this.newGame.size);
        this.router.navigate(['/edition']);
    }
}
