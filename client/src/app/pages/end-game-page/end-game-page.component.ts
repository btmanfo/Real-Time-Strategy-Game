/* eslint-disable no-unused-vars */
// Utilisation de fonction sans utiliser la totalité méthodes

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatSystemComponent } from '@app/components/chat-system/chat-system.component';
import { END_GAME_STATS, TIME_CONVERSION_MODULO } from '@app/constants/constants';
import { AllWaitingRoomInfo } from '@app/interfaces/interface';
import { GameService } from '@app/services/game-service/game.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { EndGameStats, GameData, GlobalStatistics, Player } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-end-game-page',
    templateUrl: './end-game-page.component.html',
    styleUrls: ['./end-game-page.component.scss'],
    standalone: true,
    imports: [CommonModule, MatTableModule, MatSortModule, MatPaginatorModule, MatButtonModule, ChatSystemComponent, MatIconModule, FormsModule],
})
export class EndGamePageComponent implements OnInit, OnDestroy, AfterViewInit {
    private static hasRefreshed = false;
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    dataSource = new MatTableDataSource<Player>();
    displayedColumns: string[] = ['name', 'nbVictory', 'nbCombat', 'nbEvasion', 'nbDefeat', 'nbLifeLost', 'nbDamage', 'nbItem', 'pourcentageOfTile'];
    globalStatics: GlobalStatistics;
    endGameTime = 0;
    isWinner: boolean = false;
    mapName: string = '';
    math = Math;
    private currentSortColumn: string = '';
    private currentSortDirection: 'asc' | 'desc' = 'asc';
    private readonly destroy$ = new Subject<void>();
    private source!: string;
    private code!: string;

    constructor(
        private readonly joinSocketGameService: JoinGameService,
        private readonly route: ActivatedRoute,
        private readonly serviceGame: GameService,
        private readonly playingService: PlayingService,
        private readonly router: Router,
    ) {}

    get currentSortColumnValue(): string {
        return this.currentSortColumn;
    }

    get serviceGameValue(): GameService {
        return this.serviceGame;
    }

    get currentSortDirectionValue(): 'asc' | 'desc' {
        return this.currentSortDirection;
    }

    set currentSortColumnValue(value: string) {
        this.currentSortColumn = value;
    }

    set currentSortDirectionValue(value: 'asc' | 'desc') {
        this.currentSortDirection = value;
    }

    /**
     * Lifecycle hook called on component initialization.
     * - Fetches query params
     * - Determines if local player is the winner
     * - Sets map name
     */
    ngOnInit(): void {
        this.fetchQueryParams();
        this.subscribeToQueryParams();
        this.evaluateGameResult();
        this.setMapName();
    }

    /**
     * Formats a time in seconds to mm:ss format.
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / TIME_CONVERSION_MODULO);
        const sec = seconds % TIME_CONVERSION_MODULO;
        return `${minutes}:${sec.toString().padStart(2, '0')}`;
    }

    /**
     * Lifecycle hook called after the view is initialized.
     * - Sets up sorting and pagination
     * - Adds custom data accessor for sorting
     */
    ngAfterViewInit(): void {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;

        this.dataSource.sortingDataAccessor = (player: Player, columnDef: string) => {
            if (columnDef !== 'nom' && player.stats) {
                return (player.stats as EndGameStats)[columnDef as keyof EndGameStats] ?? 0;
            }
            return (player as unknown as Record<keyof Player, string | number | null>)[columnDef as keyof Player] ?? '';
        };

        this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe((sort: Sort) => {
            this.currentSortColumn = sort.active;
            this.currentSortDirection = sort.direction as 'asc' | 'desc';
        });
    }

    /**
     * Sorts the data manually by column, toggling between ascending and descending.
     * @param {string} column - Column to sort
     */
    sortData(column: string) {
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'asc';
        }

        this.sort.active = column;
        this.sort.direction = this.currentSortDirection;
        this.sort.sortChange.emit({ active: column, direction: this.currentSortDirection });
    }

    /**
     * Returns the icon name based on current sort direction.
     * @param {string} column - Column name
     * @returns {string} Icon name
     */
    getSortIcon(column: string): string {
        if (this.currentSortColumn !== column) {
            return 'sort';
        }
        return this.currentSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }

    /**
     * Lifecycle hook called when the component is destroyed.
     * - Cleans up all subscriptions
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    refreshHomePage(): void {
        if (this.router.url === '/home') {
            if (!EndGamePageComponent.hasRefreshed) {
                EndGamePageComponent.hasRefreshed = true;
                window.location.reload();
            }
        } else {
            this.router.navigate(['/home']);
        }
    }

    getRightName(name: string) {
        return END_GAME_STATS[name];
    }

    /**
     * Subscribes to route query parameters and triggers data fetching when both 'source' and 'code' are available.
     */
    private fetchQueryParams(): void {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.source = params['source'] ?? null;
            this.code = params['code'] ?? null;
            if (this.source && this.code) {
                this.fetchRoomInfo();
            }
        });
    }

    /**
     * Fetches all room-related information:
     * - List of players and their stats
     * - Global game statistics
     * - General game data
     */
    private fetchRoomInfo(): void {
        this.fetchAllPlayerInfo();
        this.fetchGlobalStatistics();
        this.fetchGameData();
    }

    private fetchAllPlayerInfo(): void {
        this.joinSocketGameService
            .getAllINformation(this.source, this.code)
            .pipe(takeUntil(this.destroy$))
            .subscribe((info: AllWaitingRoomInfo) => {
                if (info?.allPlayer) {
                    this.dataSource.data = info.allPlayer;
                }
            });
    }

    private fetchGlobalStatistics(): void {
        this.joinSocketGameService
            .getAllGlobalInfo(this.code)
            .pipe(takeUntil(this.destroy$))
            .subscribe((info: GlobalStatistics) => {
                this.globalStatics = info;
                if (info.secondTime) {
                    this.endGameTime = info.secondTime - info.allTime;
                }
            });
    }

    private fetchGameData(): void {
        this.joinSocketGameService
            .getAllInfo(this.code)
            .pipe(takeUntil(this.destroy$))
            // Le subscribe est vide car on ne fait rien avec les données, mais on a besoin du subscribe
            /* eslint-disable-next-line @typescript-eslint/no-empty-function */
            .subscribe((info: GameData) => {});
    }

    private subscribeToQueryParams(): void {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.source = params['source'];
            this.code = params['code'];
        });
    }

    private evaluateGameResult(): void {
        const playerName = this.playingService.localPlayer?.name;
        const player = this.playingService.players.find((p) => p.name === playerName);
        if (!playerName || !player) return;

        if (this.serviceGame.getNewGame().gameMode === 'CTF') {
            this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
                const winningTeam = params['winningTeam'];
                this.isWinner = player.team === winningTeam;
            });
        } else {
            this.playingService.checkWinner(playerName);
            const winner = this.playingService.getGameWinner();
            this.isWinner = winner ? playerName === winner : false;
        }
    }

    private setMapName(): void {
        this.mapName = this.serviceGame.getNewGame().name;
    }
}
