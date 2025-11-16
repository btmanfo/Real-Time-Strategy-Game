import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';
import { Tile } from '@common/interfaces';
import { EditionToolsComponent } from './edition-tools.component';
describe('EditionToolsComponent', () => {
    let component: EditionToolsComponent;
    let fixture: ComponentFixture<EditionToolsComponent>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    let itemServiceSpy: jasmine.SpyObj<ItemSelectorService>;

    const plate = { water: 'Eau', wall: 'Mur' };

    beforeEach(() => {
        tileServiceSpy = jasmine.createSpyObj('TileService', [
            'getSelectedTile',
            'getSelectedTileType',
            'selectTileType',
            'selectTile',
            'deselectTile',
            'deselectTileType',
            'createTile',
        ]);
        itemServiceSpy = jasmine.createSpyObj('ItemService', ['deselectItem']);

        TestBed.configureTestingModule({
            imports: [EditionToolsComponent],
            providers: [
                { provide: ItemSelectorService, useValue: itemServiceSpy },
                { provide: TileService, useValue: tileServiceSpy },
            ],
        });

        fixture = TestBed.createComponent(EditionToolsComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should select a tile', () => {
        const tileType = plate.water;
        tileServiceSpy.getSelectedTile.and.returnValue(null);
        tileServiceSpy.createTile.and.returnValue({ type: plate.water } as Tile);
        component.selectTile(tileType);

        expect(tileServiceSpy.getSelectedTile).toHaveBeenCalled();
        expect(tileServiceSpy.selectTile).toHaveBeenCalled();
        expect(tileServiceSpy.createTile).toHaveBeenCalled();
        expect(itemServiceSpy.deselectItem).toHaveBeenCalled();
    });

    it('should return the injected ItemSelectorService via serviceItem getter', () => {
        expect(component.serviceItem).toBe(itemServiceSpy);
    });

    it('should return the injected TileService via serviceTile getter', () => {
        expect(component.serviceTile).toBe(tileServiceSpy);
    });

    it('should deselect the tile if the same tile type is selected again', () => {
        const tileType = plate.water;
        const mockTile = { type: tileType };
        tileServiceSpy.getSelectedTile.and.returnValue(mockTile as Tile);
        component.selectTile(tileType);

        expect(tileServiceSpy.deselectTile).toHaveBeenCalled();
        expect(tileServiceSpy.getSelectedTile).toHaveBeenCalled();
    });

    it('should deselect the tile if the same tile type is selected again', () => {
        const tileType = plate.water;
        tileServiceSpy.getSelectedTile.and.returnValue(null);
        component.selectTile(tileType);

        expect(itemServiceSpy.deselectItem).toHaveBeenCalled();
        expect(tileServiceSpy.selectTile).toHaveBeenCalled();
        expect(tileServiceSpy.createTile).toHaveBeenCalled();
        expect(tileServiceSpy.getSelectedTile).toHaveBeenCalled();
    });

    it('should deselect the tile and reset selectedTile when another tile is selected', () => {
        const previousTileType = plate.water;
        const newTileType = plate.wall;
        const mockTile = { type: previousTileType };

        tileServiceSpy.getSelectedTile.and.returnValue(mockTile as Tile);

        component.selectTile(newTileType);
        expect(itemServiceSpy.deselectItem).toHaveBeenCalled();
        expect(tileServiceSpy.selectTile).toHaveBeenCalled();
        expect(tileServiceSpy.createTile).toHaveBeenCalled();
        expect(tileServiceSpy.getSelectedTile).toHaveBeenCalled();
    });
});
