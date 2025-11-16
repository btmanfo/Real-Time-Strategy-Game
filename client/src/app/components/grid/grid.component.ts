/* eslint-disable max-params */
/*
Le constructeur possède plusieurs dépendances (NotificationService, BoardService, itemSelector, etc.). 
Cela est nécessaire pour coordonner la logique d'édition, les notifications et l'état du tableau.
*/
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import { GRID_SIZES, MapSize, SPAWN_COUNTS } from '@app/constants/constants';
import { AppMaterialModule } from '@app/modules/material.module';
import { BoardService } from '@app/services/board-service/board.service';
import { EditionGridService } from '@app/services/edition-grid-service/edition-grid.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingGridService } from '@app/services/playing-grid-service/playing-grid.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Tile } from '@common/interfaces';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
    imports: [CommonModule, AppMaterialModule, NotificationPopupComponent],
})
export class GridComponent implements OnInit, OnDestroy {
    @Output() mouseOverTile = new EventEmitter<Tile>();
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly _itemSelectorService: ItemSelectorService,
        private readonly _boardService: BoardService,
        private readonly _gameService: GameService,
        private readonly _playingService: PlayingService,
        private readonly _notificationService: NotificationService,
        private readonly _editionGridService: EditionGridService,
        private readonly _playingGridService: PlayingGridService,
    ) {}

    /**
     * Getter to access the PlayingService.
     * @returns {PlayingService} The injected PlayingService instance.
     */
    get playingService(): PlayingService {
        return this._playingService;
    }

    /**
     * Getter to access the NotificationService.
     * @returns {NotificationService} The injected NotificationService instance.
     */
    get notificationService(): NotificationService {
        return this._notificationService;
    }

    /**
     * Getter to access the BoardService.
     * @returns {BoardService} The injected BoardService instance.
     */
    get boardService(): BoardService {
        return this._boardService;
    }

    /**
     * Getter to access the EditionGridService.
     * @returns {EditionGridService} The injected EditionGridService instance.
     */
    get editionGridService(): EditionGridService {
        return this._editionGridService;
    }

    /**
     * Getter to access the PlayingGridService.
     * @returns {PlayingGridService} The injected PlayingGridService instance.
     */
    get playingGridService(): PlayingGridService {
        return this._playingGridService;
    }

    /**
     * Converts game size settings to grid dimensions and adjusts item spawns.
     */
    converterSize(): void {
        switch (this._gameService.getNewGame().size) {
            case MapSize.Large:
                this.boardService.gridSize = GRID_SIZES.LARGE;
                this._itemSelectorService.nSpawn = SPAWN_COUNTS.LARGE;
                this._itemSelectorService.maxItems = SPAWN_COUNTS.LARGE;
                break;
            case MapSize.Medium:
                this.boardService.gridSize = GRID_SIZES.MEDIUM;
                this._itemSelectorService.nSpawn = SPAWN_COUNTS.MEDIUM;
                this._itemSelectorService.maxItems = SPAWN_COUNTS.MEDIUM;
                break;
            case MapSize.Small:
                this.boardService.gridSize = GRID_SIZES.SMALL;
                this._itemSelectorService.nSpawn = SPAWN_COUNTS.SMALL;
                this._itemSelectorService.maxItems = SPAWN_COUNTS.SMALL;
                break;
            default:
                break;
        }
    }

    /**
     * Initialization logic for the GridComponent.
     * Sets grid size and initializes the board if the game is not in play.
     */
    ngOnInit(): void {
        this.converterSize();
        if (!this.playingService.isPlaying) {
            this.initializeMap();
        }
    }

    /**
     * Lifecycle hook called when the component is about to be destroyed.
     * Use this hook to unsubscribe from observables and perform cleanup.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Prevents the context menu from appearing.
     * @param {MouseEvent} event - The mouse event to prevent.
     */
    disableContextMenu(event: MouseEvent): void {
        event.preventDefault();
    }

    /**
     * Initializes the board's map either by using an existing map or by generating an empty one.
     */
    initializeMap(): void {
        const newTiles = this.getExistingMap() ?? this.generateEmptyMap(this.boardService.gridSize);
        this.boardService.setMap(newTiles, this.boardService.gridSize);
    }

    /**
     * Emits a tile when the mouse hovers over it.
     * @param {Tile} tile - The tile being hovered.
     */
    onMouseOverTile(tile: Tile): void {
        this.mouseOverTile.emit(tile);
    }

    /**
     * Retrieves an existing map from the current game if available.
     * @returns {Tile[] | null} The existing map tiles or null if none exist.
     */
    private getExistingMap(): Tile[] | null {
        const newGame = this._gameService.getNewGame();
        return newGame.map.length > 0 ? newGame.map.concat(newGame.map2) : null;
    }

    /**
     * Generates an empty map based on the provided grid size.
     * @param {number} gridSize - The size of the grid.
     * @returns {Tile[]} An array of empty tiles.
     */
    private generateEmptyMap(gridSize: number): Tile[] {
        const newTiles: Tile[] = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                newTiles.push({
                    traversable: true,
                    position: { x, y },
                    item: { name: '', position: {} } as Item,
                } as Tile);
            }
        }
        return newTiles;
    }
}
