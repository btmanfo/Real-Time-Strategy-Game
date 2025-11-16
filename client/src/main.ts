import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { ChooseGamePageComponent } from '@app/pages/choose-game-page/choose-game.component';
import { CreateGameModePageComponent } from '@app/pages/create-game-page/create-game-page.component';
import { CreditsComponent } from '@app/pages/credits-page/credits.component';
import { EditionPageComponent } from '@app/pages/edition-page/edition-page.component';
import { EndGamePageComponent } from '@app/pages/end-game-page/end-game-page.component';
import { JoinGamePageComponent } from '@app/pages/join-game-page/join-game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { PlayingGamePageComponent } from '@app/pages/playing-game-page/playing-game-page.component';
import { PlayerSelectionComponent } from '@app/pages/select-character-page/select-character.component';
import { ValidationPlayerComponent } from '@app/pages/validation-player-page/validation-player.component';
import { environment } from './environments/environment';
if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'creditsPage', component: CreditsComponent },
    { path: 'joinGame', component: JoinGamePageComponent },
    { path: 'adminPage', component: AdminPageComponent },
    { path: 'createGame', component: CreateGameModePageComponent },
    { path: 'chooseGame', component: ChooseGamePageComponent },
    { path: 'selectCharacter/:id', component: PlayerSelectionComponent },
    { path: 'validate/:id', component: ValidationPlayerComponent },
    { path: 'edition', component: EditionPageComponent },
    { path: 'playingGame', component: PlayingGamePageComponent },
    { path: 'endGame', component: EndGamePageComponent },
    { path: '**', redirectTo: '/home' },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
