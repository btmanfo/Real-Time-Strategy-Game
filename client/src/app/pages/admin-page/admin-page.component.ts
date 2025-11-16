import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChooseGamePageComponent } from '@app/pages/choose-game-page/choose-game.component';

@Component({
    selector: 'app-admin-page',
    imports: [RouterLink, ChooseGamePageComponent],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {}
