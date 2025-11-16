import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { GameLogEntry } from '@common/interfaces';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-game-log',
    templateUrl: './game-log.component.html',
    styleUrls: ['./game-log.component.scss'],
    imports: [CommonModule, FormsModule],
})
export class GameLogComponent implements OnInit, OnDestroy {
    @Output() switch = new EventEmitter<void>();
    @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
    logs: GameLogEntry[] = [];
    filteredLogs: GameLogEntry[] = [];
    filterText: string = '';
    private logSubscription!: Subscription;
    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(
        private readonly gameLogService: GameLogService,
        private readonly joinGameService: JoinGameService,
        private readonly playingService: PlayingService,
    ) {}

    ngOnInit(): void {
        const playerName = this.playingService.localPlayer?.name || '';
        this.gameLogService.joinRoom(this.joinGameService.pinCode, playerName);
        this.logSubscription = this.gameLogService.logs$.pipe(takeUntil(this.destroy$)).subscribe((logs) => {
            this.logs = logs;
            this.applyFilter();
        });
    }

    startNewGame(): void {
        const playerName = this.playingService.localPlayer?.name || '';
        this.gameLogService.startNewGame(this.joinGameService.pinCode, playerName);
    }

    applyFilter(): void {
        if (!this.filterText) {
            this.filteredLogs = this.logs;
            return;
        }
        const lowerFilter = this.filterText.toLowerCase();
        this.filteredLogs = this.logs.filter((log) => {
            const playersString = (log.players || [])
                .filter((player) => player && player.name)
                .map((player) => player.name?.toLowerCase())
                .join(' ');
            const eventString = (log.event || '').toLowerCase();
            const combinedString = playersString + ' ' + eventString;
            return combinedString.includes(lowerFilter);
        });
    }

    formatTime(timestamp: string | Date): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    ngOnDestroy(): void {
        this.logSubscription?.unsubscribe();
    }
}
