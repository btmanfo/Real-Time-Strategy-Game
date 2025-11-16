/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Usage temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditionItemsComponent } from '@app/components/edition-items/edition-items.component';
import { ITEM_TYPES } from '@app/constants/constants';
import { BoardService } from '@app/services/board-service/board.service';
import { DragDropItems } from '@app/services/drag-drop-items-service/drag-drop-items.service';
import { GameService } from '@app/services/game-service/game.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Game, Item, Tile } from '@common/interfaces';
import { Subject } from 'rxjs';

describe('EditionItemsComponent', () => {
    let component: EditionItemsComponent;
    let fixture: ComponentFixture<EditionItemsComponent>;
    let itemService: jasmine.SpyObj<ItemSelectorService>;
    let tileService: jasmine.SpyObj<TileService>;
    let mapService: jasmine.SpyObj<BoardService>;
    let dragDropItems: jasmine.SpyObj<DragDropItems>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;

    beforeEach(() => {
        itemService = jasmine.createSpyObj('ItemSelectorService', [
            'counter',
            'getDroppedItems',
            'getItems',
            'nSpawn',
            'setDroppedItems',
            'addDroppedItem',
        ]);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['getNewGame']);
        tileService = jasmine.createSpyObj('TileService', ['deselectTile', 'deselectTileType']);
        mapService = jasmine.createSpyObj('BoardService', ['getMap']);
        dragDropItems = jasmine.createSpyObj('DragDropItems', ['onDragStart', 'allowDrop', 'onDrop']);

        itemService.counter = 0;
        itemService.nSpawn = 1;

        const mockTile = [{ item: { name: 'Potion' } as Item } as Tile];
        const mockItem = [{ name: 'Potion', isOutOfContainer: false } as Item];

        mapService.getMap.and.returnValue(mockTile);
        itemService.getItems.and.returnValue(mockItem);
        itemService.getDroppedItems.and.returnValue([]);

        TestBed.configureTestingModule({
            imports: [EditionItemsComponent, HttpClientTestingModule],
            providers: [
                { provide: ItemSelectorService, useValue: itemService },
                { provide: TileService, useValue: tileService },
                { provide: BoardService, useValue: mapService },
                { provide: DragDropItems, useValue: dragDropItems },
                { provide: GameService, useValue: gameServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionItemsComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call resetDroppedItems during ngOnInit', () => {
        const mockItem = [{ name: 'Potion', isOutOfContainer: true } as Item];
        mapService.getMap.and.returnValue([{ item: { name: 'Potion' } as Item } as Tile]);
        itemService.getDroppedItems.and.returnValue(mockItem);
        itemService.getItems.and.returnValue(mockItem);
        spyOn(component, 'resetDroppedItems');
        component.ngOnInit();
        expect(component.resetDroppedItems).toHaveBeenCalled();
    });

    it('should call populateDroppedItems during ngOnInit', () => {
        spyOn(component, 'populateDroppedItems');
        component.ngOnInit();
        expect(component.populateDroppedItems).toHaveBeenCalled();
    });

    it('should return the injected ItemSelectorService', () => {
        expect(component.serviceItem).toBe(itemService);
    });

    it('should return the injected TileService', () => {
        expect(component.serviceTile).toBe(tileService);
    });

    it('should return the injected BoardService', () => {
        expect(component.serviceMap).toBe(mapService);
    });

    it('should return the injected DragDropItems', () => {
        expect(component.serviceDragDrop).toBe(dragDropItems);
    });

    it('should call updateItemStates during ngOnInit', () => {
        const mockItem = [{ name: 'Potion', isOutOfContainer: true } as Item];
        mapService.getMap.and.returnValue([{ item: { name: 'Potion' } as Item } as Tile]);
        itemService.getDroppedItems.and.returnValue(mockItem);
        itemService.getItems.and.returnValue(mockItem);
        spyOn(component, 'updateItemStates');
        component.ngOnInit();
        expect(component.updateItemStates).toHaveBeenCalled();
    });

    it('should update itemService.counter on ngOnInit', () => {
        itemService.getDroppedItems.and.returnValue([{ name: 'Potion', isOutOfContainer: false } as Item]);
        component.ngOnInit();
        expect(itemService.counter).toBe(1);
    });

    it('should reset dropped items correctly', () => {
        itemService.getItems.and.returnValue([{ name: 'Potion', isOutOfContainer: true } as Item]);
        component.resetDroppedItems();
        expect(itemService.setDroppedItems).toHaveBeenCalledWith([]);
        expect(itemService.getItems).toHaveBeenCalled();
        expect(itemService.getDroppedItems().length).toBe(0);
        expect(itemService.getItems()[0].isOutOfContainer).toBe(false);
    });

    it('should not reset dropped items if there are no items', () => {
        itemService.getItems.and.returnValue([]);
        component.resetDroppedItems();
        expect(itemService.getItems).toHaveBeenCalled();
    });

    it('should populate dropped items based on map tiles', () => {
        const mockItemObj = { name: 'Potion', isOutOfContainer: false } as Item;
        mapService.getMap.and.returnValue([{ item: mockItemObj } as Tile]);
        component.populateDroppedItems();
        expect(itemService.addDroppedItem).toHaveBeenCalledOnceWith(mockItemObj);
    });

    it('should update item states correctly', () => {
        const mockItem = [{ name: 'Potion', isOutOfContainer: false } as Item];
        itemService.getItems.and.returnValue(mockItem);
        itemService.getDroppedItems.and.returnValue([{ name: 'Potion', isOutOfContainer: true } as Item]);
        component.updateItemStates();
        expect(itemService.getItems()[0].isOutOfContainer).toBe(true);
    });

    it('should update item states correctly with spawn', () => {
        const mockItem = [{ name: ITEM_TYPES.spawn, isOutOfContainer: false } as Item];
        itemService.getItems.and.returnValue(mockItem);
        itemService.getDroppedItems.and.returnValue([{ name: ITEM_TYPES.spawn, isOutOfContainer: true } as Item]);
        component.updateItemStates();
        expect(itemService.getItems()[0].isOutOfContainer).toBe(true);
    });

    it('should complete destroy$ on ngOnDestroy', () => {
        component.ngOnDestroy();
        const destroySubject = (component as any).destroy$ as Subject<void>;
        expect(destroySubject.isStopped).toBeTrue();
    });

    describe('isCaptureTheFlag', () => {
        it('should return true if the game mode is "CTF"', () => {
            gameServiceSpy.getNewGame.and.returnValue({ gameMode: 'CTF' } as Game);

            const result = component.isCaptureTheFlag();

            expect(result).toBeTrue();
            expect(gameServiceSpy.getNewGame).toHaveBeenCalled();
        });

        it('should return false if the game mode is not "CTF"', () => {
            gameServiceSpy.getNewGame.and.returnValue({ gameMode: 'OtherMode' } as Game);

            const result = component.isCaptureTheFlag();

            expect(result).toBeFalse();
            expect(gameServiceSpy.getNewGame).toHaveBeenCalled();
        });

        it('should return false if no game is returned', () => {
            gameServiceSpy.getNewGame.and.returnValue(null as unknown as Game);

            const result = component.isCaptureTheFlag();

            expect(result).toBeFalsy();
            expect(gameServiceSpy.getNewGame).toHaveBeenCalled();
        });
    });
});
