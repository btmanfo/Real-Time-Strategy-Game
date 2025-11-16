import { TestBed } from '@angular/core/testing';
import { tiles } from '@app/constants/constants';
import { TileService } from '@app/services/tool-service/tool.service';
import { Player, Tile } from '@common/interfaces';

describe('TileService', () => {
    let service: TileService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TileService, { provide: 'tiles', useValue: tiles }],
        });
        service = TestBed.inject(TileService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return null if no tile is selected', () => {
        expect(service.getSelectedTile()).toBeNull();
    });

    it('should get the list of tiles', () => {
        expect(service.getTiles()).toEqual(tiles);
    });

    it('should select a tile', () => {
        const mockTile: Tile = {
            type: 'Eau',
            position: { x: 1, y: 2 },
            traversable: true,
            item: null,
            player: {} as unknown as Player,
            image: './assets/images/Eau.png',
            cost: 1,
        };
        service.selectTile(mockTile);
        expect(service.getSelectedTile()).toEqual(mockTile);
    });

    it('should not select a tile with an invalid type', () => {
        const mockTile: Tile = {
            type: 'Ciel',
            position: { x: 1, y: 2 },
            traversable: true,
            item: null,
            player: {} as unknown as Player,
            image: './assets/images/Eau.png',
            cost: 1,
        };
        service.selectTile(mockTile);
        expect(service.getSelectedTile()).toBeNull();
    });

    it('should deselect the tile', () => {
        const mockTile: Tile = {
            type: 'Eau',
            position: { x: 1, y: 2 },
            traversable: true,
            item: null,
            player: {} as unknown as Player,
            image: './assets/images/Eau.png',
            cost: 1,
        };

        service.selectTile(mockTile);
        service.deselectTile();
        expect(service.getSelectedTile()).toBeNull();
    });

    it('should create a wall tile', () => {
        const tileType = 'Mur';
        const tile = service.createTile(tileType);

        expect(tile.type).toBe('Mur');
        expect(tile.image).toBe('./assets/images/Mur.png');
        expect(tile.traversable).toBe(false);
    });

    it('should throw an error if an any tile type is passed to createTile', () => {
        expect(() => service.createTile('anyTile')).toThrowError('any tile type is invalid');
    });
});
