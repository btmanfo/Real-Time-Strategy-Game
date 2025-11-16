import { Component, OnDestroy } from '@angular/core';
import { SocketActionLabels } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { PlayingSocketService } from '@app/services/playing-socket-service/playing-socket.service';
import { Item, Position } from '@common/interfaces';

@Component({
    selector: 'app-popup-item-choice',
    templateUrl: './popup-item-choice.component.html',
    styleUrls: ['./popup-item-choice.component.scss'],
})
export class PopupItemChoiceComponent implements OnDestroy {
    constructor(
        private readonly _movingGameService: MovingGameService,
        private readonly _playingService: PlayingService,
        private readonly boardService: BoardService,
        private readonly playingSocketService: PlayingSocketService,
    ) {}

    get movingGameService(): MovingGameService {
        return this._movingGameService;
    }
    get playingService(): PlayingService {
        return this._playingService;
    }

    ngOnDestroy(): void {
        this.movingGameService.isPopupItemChoiceVisible = false;
    }

    chooseItem(itemIndex: number): void {
        const itemToRemove = this.getAndRemoveInventoryItem(itemIndex);
        const playerPosition = this.getPlayerPosition();

        this.placeItemOnBoard(itemToRemove, playerPosition);
        this.finishItemChoice(itemToRemove, playerPosition);
    }

    private getAndRemoveInventoryItem(itemIndex: number): Item | undefined {
        if (!this.playingService.localPlayer) {
            return undefined;
        }

        const itemToRemove = structuredClone(this.playingService.localPlayer.inventory?.[itemIndex] as Item);
        this.playingService.localPlayer.inventory?.splice(itemIndex, 1);
        return itemToRemove;
    }

    private getPlayerPosition(): Position {
        return this.playingService.localPlayer
            ? this.movingGameService.getPlayerTile(this.playingService.localPlayer)?.position || ({} as Position)
            : ({} as Position);
    }

    private placeItemOnBoard(item: Item | undefined, position: Position): void {
        if (!item) {
            return;
        }

        const targetTile = this.boardService.tiles.find((tile) => tile.position === position);
        if (targetTile) {
            targetTile.item = item;
        }
    }

    private finishItemChoice(item: Item | undefined, playerPosition: Position): void {
        this.movingGameService.isPopupItemChoiceVisible = false;
        this.emitItemChoice(item, playerPosition);
        this.playingSocketService.endTurn();
    }

    private emitItemChoice(item: Item | undefined, playerPosition: Position): void {
        this.playingService.socket.emit(SocketActionLabels.ItemChoice, {
            item,
            playerPosition,
            roomCode: this.playingService.joinGameService.pinCode,
        });
    }
}
