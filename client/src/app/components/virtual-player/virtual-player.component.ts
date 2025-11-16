import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { VirtualPlayerSocketService } from '@app/services/virtual-player/virtual-player-socket.service';
import { Player } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';

type BotType = 'aggressive' | 'defensive';

@Component({
    selector: 'app-virtual-player',
    templateUrl: './virtual-player.component.html',
    styleUrls: ['./virtual-player.component.scss'],
})
export class VirtualPlayerComponent implements OnInit, OnDestroy {
    @Input() roomCode!: string;
    @Output() closeModal = new EventEmitter<void>();
    @Output() botAdded = new EventEmitter<void>();

    previewBot: Player | null = null;
    selectedBotType: BotType | null = null;
    showError = false;

    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(private readonly virtualPlayerService: VirtualPlayerSocketService) {}

    ngOnInit(): void {
        this.subscribeToVirtualPlayerInfo();
    }

    selectBotType(type: BotType): void {
        this.selectedBotType = type;
        this.showError = false;
    }

    confirmAddBot(): void {
        if (!this.isValidBotSelection()) {
            this.showError = true;
            return;
        }

        this.addSelectedBotToGame();
        this.botAdded.emit();
        this.closeModal.emit();
    }

    cancelAddBot(): void {
        this.closeModal.emit();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private isValidBotSelection(): boolean {
        return this.selectedBotType !== null;
    }

    private addSelectedBotToGame(): void {
        if (this.selectedBotType === 'aggressive') {
            this.virtualPlayerService.addAttackerVirtualPlayer(this.roomCode);
        } else if (this.selectedBotType === 'defensive') {
            this.virtualPlayerService.addDefensiveVirtualPlayer(this.roomCode);
        }
    }

    private subscribeToVirtualPlayerInfo(): void {
        this.virtualPlayerService.virtualPlayerInfo$.pipe(takeUntil(this.destroy$)).subscribe((bot: Player | null) => {
            this.previewBot = bot;
        });
    }
}
