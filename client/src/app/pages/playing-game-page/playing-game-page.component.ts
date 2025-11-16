import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ChatSystemComponent } from '@app/components/chat-system/chat-system.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { GamePlayerListComponent } from '@app/components/game-player-list/game-player-list.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { PlayerInfoComponent } from '@app/components/player-bloc/player-bloc.component';
import { PlayerCombatComponent } from '@app/components/player-combat/player-combat.component';
import { PopupItemChoiceComponent } from '@app/components/popup-item-choice/popup-item-choice.component';
import { DEBUG_KEY } from '@app/constants/constants';
import { UpdateDiceRollsInterface } from '@app/interfaces/interface';
import { AppMaterialModule } from '@app/modules/material.module';
import { ActionService } from '@app/services/action-service/action.service';
import { PlayingGameService } from '@app/services/playing-game-service/playing-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Tile } from '@common/interfaces';

@Component({
    selector: 'app-playing-game-page',
    templateUrl: './playing-game-page.component.html',
    styleUrls: ['./playing-game-page.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AppMaterialModule,
        GridComponent,
        GameInfoComponent,
        NotificationPopupComponent,
        PlayerCombatComponent,
        PlayerInfoComponent,
        GamePlayerListComponent,
        PopupItemChoiceComponent,
        ChatSystemComponent,
    ],
})
export class PlayingGamePageComponent implements OnInit, OnDestroy {
    constructor(
        public actionService: ActionService,
        private readonly playingGameService: PlayingGameService,
        private readonly playingService: PlayingService,
    ) {}

    get isDebugMode(): boolean {
        return this.playingGameService.isDebugMode;
    }

    get playingServiceValue(): PlayingService {
        return this.playingService;
    }

    get showLeaveConfirmationPopup(): boolean {
        return this.playingGameService.showLeaveConfirmationPopup;
    }

    get isInFight(): boolean {
        return this.playingGameService.isInFight;
    }

    get count(): number {
        return this.playingGameService.count;
    }

    get emitValueToAttack(): string {
        return this.playingGameService.emitValueToAttack;
    }

    get attackerRoll(): number {
        return this.playingGameService.attackerRoll;
    }

    get defenderRoll(): number {
        return this.playingGameService.defenderRoll;
    }

    get notification() {
        return this.playingGameService.notification;
    }

    get inCombat(): boolean {
        return this.playingGameService.inCombat;
    }

    get actionTriggered(): boolean {
        return this.playingGameService.actionTriggered;
    }

    set actionTriggered(value: boolean) {
        this.playingGameService.actionTriggered = value;
    }

    @HostListener('window:beforeunload', ['$event'])
    unloadNotification(): void {
        this.playingGameService.unloadNotification();
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') return;
        if (event.key.toLowerCase() === DEBUG_KEY) {
            const currentPlayerName = this.playingService.localPlayer?.name;
            const admin = this.playingService.players.find((player) => player.isAdmin);
            const isCurrentPlayerAdmin = currentPlayerName && admin?.name === currentPlayerName;

            this.playingGameService.toggleDebugMode(isCurrentPlayerAdmin as boolean);
        }
    }

    ngOnInit(): void {
        this.playingGameService.initialize();
    }

    ngOnDestroy(): void {
        this.playingGameService.ngOnDestroy();
    }

    emitIsInAttack(): void {
        this.playingGameService.emitIsInAttack();
    }

    isInCombatPlayer(): boolean {
        return this.playingGameService.isInCombatPlayer();
    }

    activateInAttack(): void {
        this.playingGameService.activateInAttack();
    }

    activateAction(): void {
        this.playingGameService.activateAction();
    }

    endTurn(): void {
        this.playingGameService.endTurn();
    }

    mouseOverTile(tile: Tile): void {
        this.playingGameService.mouseOverTile(tile);
    }

    onTileRightClick(event: MouseEvent, tile: Tile): void {
        event.preventDefault();
        this.playingGameService.onTileRightClick(tile);
    }

    toggleCombat(): boolean {
        return this.playingGameService.toggleCombat();
    }

    inCombatToggle(): void {
        this.playingGameService.inCombatToggle();
    }

    executeFunction(): string {
        return this.playingGameService.executeFunction();
    }

    updateDiceRolls(event: UpdateDiceRollsInterface): void {
        this.playingGameService.updateDiceRolls(event);
    }

    quitGame(): void {
        this.playingGameService.quitGame();
    }

    handleLeaveConfirmation(condition: boolean): void {
        this.playingGameService.handleLeaveConfirmation(condition);
    }

    closeLeaveConfirmationPopup(): void {
        this.playingGameService.closeLeaveConfirmationPopup();
    }

    emitEndTurn(): void {
        this.playingGameService.emitEndTurn();
    }

    checkForBotTurn(): void {
        this.playingGameService.checkForBotTurn();
    }
}
