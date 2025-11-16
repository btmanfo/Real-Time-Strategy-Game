import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Player } from '@common/interfaces';

@Component({
    selector: 'app-player-list',
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
    styleUrls: ['./player-list.component.scss'],
})
export class PlayerListComponent implements OnChanges {
    @Input() players: Player[] = [];
    @Input() isAdmin: boolean = false;
    @Output() playerToDelete = new EventEmitter<Player>();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.players) {
            this.players = changes.players.currentValue.map((player: Player) => {
                return { ...player, isAdmin: player.isAdmin || false };
            });
        }
    }

    /**
     * Method: Emits playerToDelete event for a player.
     * @param player Player to be deleted.
     */
    onDelete(player: Player) {
        this.playerToDelete.emit(player);
    }
}
