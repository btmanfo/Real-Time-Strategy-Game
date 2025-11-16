import { Component } from '@angular/core';
import { AppMaterialModule } from '@app/modules/material.module';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { TileService } from '@app/services/tool-service/tool.service';

@Component({
    selector: 'app-edition-tools',
    templateUrl: './edition-tools.component.html',
    styleUrls: ['./edition-tools.component.scss'],
    imports: [AppMaterialModule],
})
export class EditionToolsComponent {
    constructor(
        private readonly tileService: TileService,
        private readonly itemService: ItemSelectorService,
    ) {}

    /**
     * Getter for ItemSelectorService.
     * @returns ItemSelectorService - The injected ItemSelectorService instance.
     */
    get serviceItem(): ItemSelectorService {
        return this.itemService;
    }

    /**
     * Getter for TileService.
     * @returns TileService - The injected TileService instance.
     */
    get serviceTile(): TileService {
        return this.tileService;
    }

    selectTile(tileType: string) {
        if (this.tileService.getSelectedTile() !== null && this.tileService.getSelectedTile()?.type === tileType) {
            this.tileService.deselectTile();
        } else {
            this.itemService.deselectItem();
            const tile = this.tileService.createTile(tileType);
            this.tileService.selectTile(tile);
        }
    }
}
