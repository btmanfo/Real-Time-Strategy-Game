/* eslint-disable max-params */
/*
Le constructeur possède plusieurs dépendances (GameService, MapService, MapValidity, Notification, etc.).
Cela est nécessaire pour coordonner la logique d'édition, la validité de la carte, l'enregistrement de la carte et…
*/
import { HttpStatusCode } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EditionItemsComponent } from '@app/components/edition-items/edition-items.component';
import { EditionToolsComponent } from '@app/components/edition-tools/edition-tools.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { NotificationPopupComponent } from '@app/components/notification-popup/notification-popup.component';
import {
    GameSize,
    GRID_SIZES,
    ITEM_TYPES,
    MAP_SPLIT_LIMIT_1,
    MAP_SPLIT_LIMIT_2,
    MapSize,
    SCREEN_SHOT_SCALE,
    SPAWN_COUNTS,
    START_TIME_WITH_NO_ATTEMPT,
} from '@app/constants/constants';
import { Game } from '@app/interfaces/interface';
import { BoardService } from '@app/services/board-service/board.service';
import { EditionGridService } from '@app/services/edition-grid-service/edition-grid.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { MapValidityService } from '@app/services/map-validity-service/map-validity.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { TileService } from '@app/services/tool-service/tool.service';
import html2canvas from 'html2canvas';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-edition-page',
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [EditionItemsComponent, EditionToolsComponent, GridComponent, FormsModule, RouterLink, NotificationPopupComponent],
    standalone: true,
})
export class EditionPageComponent implements OnInit, OnDestroy {
    editorGame: Game & { size: GameSize };
    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(
        private readonly gameService: GameService,
        private readonly itemSelectorService: ItemSelectorService,
        private readonly mapService: BoardService,
        private readonly mapValidityService: MapValidityService,
        private readonly notificationService: NotificationService,
        private readonly toolService: TileService,
        private readonly editionGridService: EditionGridService,
    ) {}

    get notification(): { showModal: boolean; errorMessages: string[] } {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    ngOnInit(): void {
        const newGame = this.gameService.getNewGame();
        this.editorGame = {
            ...structuredClone(newGame),
            size: newGame.size as GameSize,
        };
        this.mapService.isPlaying = false;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.itemSelectorService.nItems = 0;
        this.toolService.deselectTile();
        this.itemSelectorService.deselectItem();
    }

    /**
     * Converts the game size to a numerical value.
     * @returns {number} Corresponding size value.
     */
    converterSize(): number {
        const sizeMap = {
            [MapSize.Large]: GRID_SIZES.LARGE,
            [MapSize.Medium]: GRID_SIZES.MEDIUM,
            [MapSize.Small]: GRID_SIZES.SMALL,
        };
        return sizeMap[this.editorGame.size] || 0;
    }

    /**
     * Returns configuration for a given game size.
     * Provides spawn count, max items, and grid size based on the selected map size.
     *
     * @param {MapSize} size - The size of the map (Large, Medium, or Small).
     * @returns {Object} Configuration containing:
     * - `nSpawn`: Number of spawn points.
     * - `maxItems`: Maximum number of items.
     * - `gridSize`: Grid size for the map.
     */
    getSizeConfig = (size: MapSize) => {
        switch (size) {
            case MapSize.Large:
                return { nSpawn: SPAWN_COUNTS.LARGE, maxItems: SPAWN_COUNTS.LARGE, gridSize: GRID_SIZES.LARGE };
            case MapSize.Medium:
                return { nSpawn: SPAWN_COUNTS.MEDIUM, maxItems: SPAWN_COUNTS.MEDIUM, gridSize: GRID_SIZES.MEDIUM };
            case MapSize.Small:
                return { nSpawn: SPAWN_COUNTS.SMALL, maxItems: SPAWN_COUNTS.SMALL, gridSize: GRID_SIZES.SMALL };
            default:
                return { nSpawn: 0, maxItems: 0, gridSize: 0 };
        }
    };

    converterItems(): void {
        const size = this.gameService.getNewGame().size as GameSize;
        const configuration = this.getSizeConfig(size as MapSize);

        this.itemSelectorService.nSpawn = configuration.nSpawn;
        this.itemSelectorService.maxItems = configuration.maxItems;
        if (configuration.gridSize !== undefined) {
            this.mapService.gridSize = configuration.gridSize;
        }
    }

    resetInitialGrid(): void {
        const fullMap = [...this.editorGame.map, ...this.editorGame.map2];
        const newMap = fullMap.length > 0 ? this.editorGame.map : [];

        this.mapService.setMap(newMap, this.converterSize());
        this.editorGame.map = structuredClone(this.gameService.getNewGame().map);
        this.converterItems();
        this.resetItems();
    }

    resetEdition(): void {
        this.resetInitialGrid();
        this.editorGame = {
            ...structuredClone(this.gameService.getNewGame()),
            size: this.editorGame.size,
        };
    }

    resetItems(): void {
        this.clearDroppedItems();
        this.resetItemStates();
        this.collectDroppedItemsFromMap();
        this.updateItemStatesBasedOnDroppedItems();
        this.updateCounter();
    }

    setupMap() {
        const map = this.mapService.getMap();

        if (map.length > MAP_SPLIT_LIMIT_2) {
            this.editorGame.map = map.slice(0, MAP_SPLIT_LIMIT_1);
            this.editorGame.map2 = map.slice(MAP_SPLIT_LIMIT_1, MAP_SPLIT_LIMIT_2);
        } else {
            this.editorGame.map = map;
            this.editorGame.map2 = [];
        }
    }

    checkMap(): void {
        this.setupMap();

        if (this.isMapValid()) {
            this.toolService.deselectTile();
            this.registerPage();
        } else {
            this.validateInputs();
        }
    }

    /**
     * Takes a screenshot of the grid and returns it as a base64 string.
     * @returns {Promise<string>} Screenshot in base64 format.
     */
    async screenshot(): Promise<string> {
        const element = document.querySelector('.grid') as HTMLElement;
        const style = document.createElement('style');
        style.innerHTML = `
            * {
                animation: none !important;
                transition: none !important;
                filter: none !important;
                opacity: 1 !important;
            }
            .tile {
                background-color: #a18a68 !important;
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(style);

        const canvas = await html2canvas(element, {
            scale: SCREEN_SHOT_SCALE,
            backgroundColor: null,
            useCORS: true,
            removeContainer: true,
            logging: true,
        });

        document.head.removeChild(style);

        return canvas.toDataURL('image/png');
    }

    async registerPage() {
        await this.prepareGameForRegistration();
        this.checkGameExistenceAndRegister();
    }

    createGame() {
        this.editionGridService.setCostTiles();
        this.gameService
            .createGame(this.editorGame)
            .pipe(takeUntil(this.destroy$))
            // Le subscribe est vide car on ne fait rien avec les données, mais on a besoin du subscribe
            /* eslint-disable-next-line @typescript-eslint/no-empty-function */
            .subscribe({ next: () => {} });
    }

    updateGame() {
        this.editionGridService.setCostTiles();
        this.gameService
            .updateGame(this.editorGame.id, this.editorGame)
            .pipe(takeUntil(this.destroy$))
            // Le subscribe est vide car on ne fait rien avec les données, mais on a besoin du subscribe
            /* eslint-disable-next-line @typescript-eslint/no-empty-function */
            .subscribe({ next: () => {} });
    }

    private clearDroppedItems(): void {
        this.itemSelectorService.setDroppedItems([]);
    }

    private resetItemStates(): void {
        this.itemSelectorService.getItems().forEach((item) => {
            item.isOutOfContainer = false;
        });
    }

    private collectDroppedItemsFromMap(): void {
        this.mapService.getMap().forEach((tile) => {
            if (tile.item?.name) {
                this.itemSelectorService.addDroppedItem(tile.item);
            }
        });
    }

    private updateItemStatesBasedOnDroppedItems(): void {
        const droppedItems = this.itemSelectorService.getDroppedItems();
        droppedItems.forEach((dropped) => {
            this.itemSelectorService.getItems().forEach((item) => {
                if (item.name === dropped.name) {
                    if (item.name === 'spawn') {
                        this.itemSelectorService.nSpawn--;
                        item.isOutOfContainer = this.itemSelectorService.nSpawn <= 0;
                    } else if (item.type !== ITEM_TYPES.flag) {
                        item.isOutOfContainer = true;
                        this.itemSelectorService.nItems++;
                    }
                }
            });
        });
        let numberOfItems = 0;
        this.mapService.tiles.forEach((tile) => {
            if (tile.item?.name && tile.item.name !== 'spawn') {
                numberOfItems++;
            }
        });
        this.itemSelectorService.nItems = numberOfItems;
    }

    private updateCounter(): void {
        this.itemSelectorService.counter += this.itemSelectorService.getDroppedItems().length;
    }

    private isValidString(value: string): boolean {
        return /^[a-zA-Z0-9]+$/.test(value) && value.length >= START_TIME_WITH_NO_ATTEMPT;
    }

    private isMapValid(): boolean {
        return (
            this.mapValidityService.checkMap(this.editorGame) &&
            this.isValidString(this.editorGame.name) &&
            this.isValidString(this.editorGame.description)
        );
    }

    private validateInputs(): void {
        if (!this.editorGame.name) {
            this.addErrorMessage("Aucun nom n'a été écrit.");
        } else if (!/^[a-zA-Z0-9]+$/.test(this.editorGame.name)) {
            this.addErrorMessage('Le nom du jeu ne doit contenir que des lettres et des chiffres.');
        } else if (this.editorGame.name.length < START_TIME_WITH_NO_ATTEMPT) {
            this.addErrorMessage('Le nom du jeu doit contenir au moins 3 caractères.');
        }

        if (!this.editorGame.description) {
            this.addErrorMessage("Aucune description n'a été écrite.");
        } else if (!/^[a-zA-Z0-9]+$/.test(this.editorGame.description)) {
            this.addErrorMessage('La description du jeu ne doit contenir que des lettres et des chiffres.');
        } else if (this.editorGame.description.length < START_TIME_WITH_NO_ATTEMPT) {
            this.addErrorMessage('La description du jeu doit contenir au moins 3 caractères.');
        }
    }

    private addErrorMessage(message: string): void {
        this.notificationService.errorMessages.push(message);
        this.notificationService.showModal = true;
    }

    private async prepareGameForRegistration(): Promise<void> {
        this.editorGame.modificationDate = this.gameService.formatDate(new Date());
        this.editorGame.screenshot = await this.screenshot();
        this.editorGame = { ...this.editorGame, name: this.editorGame.name, description: this.editorGame.description };
    }

    private checkGameExistenceAndRegister(): void {
        this.gameService
            .getGameById(this.editorGame.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (existingGame) => {
                    if (existingGame) {
                        this.handleExistingGame();
                    } else {
                        this.createGame();
                    }
                },
                error: (error) => {
                    if (error.status === HttpStatusCode.NotFound) {
                        this.handleGameCreation();
                    } else if (error.status === HttpStatusCode.InternalServerError) {
                        this.notificationService.errorMessages.push('Erreur lors de la vérification du jeu.\n');
                    }
                },
            });
    }

    private handleExistingGame(): void {
        this.notificationService.showModal = true;
        this.notificationService.errorMessages.push('Le jeu a été mis à jour avec succès !');
        this.updateGame();
    }

    private handleGameCreation(): void {
        this.notificationService.showModal = true;
        this.notificationService.errorMessages.push('Le jeu a été créé avec succès !');
        this.createGame();
    }
}
