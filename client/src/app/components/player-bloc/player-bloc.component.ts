import { Component, OnDestroy, OnInit } from '@angular/core';
import { NUMBER_OF_ITEMS_BIG, NUMBER_OF_ITEMS_MEDIUM } from '@app/constants/constants';
import { ActionService } from '@app/services/action-service/action.service';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayerSelectionService } from '@app/services/player-selection-service/player-selection.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Player } from '@common/interfaces';
import { Subject, Subscription, takeUntil } from 'rxjs';
@Component({
    selector: 'app-player-info',
    templateUrl: './player-bloc.component.html',
    styleUrls: ['./player-bloc.component.scss'],
})
export class PlayerInfoComponent implements OnInit, OnDestroy {
    maxHealth: number;
    myname: string = '';
    currentLife: number;
    player: Player;
    movementPoints = this.playingService.currentMovingPoints;
    actionPoints = this.actionService.canAction ? 0 : 1;
    baseAtk = this.playerSelectionService.baseStats.attack;
    baseDef = this.playerSelectionService.baseStats.defense;

    private playerSubscription: Subscription | null = null;
    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(
        private readonly playerSelectionService: PlayerSelectionService,
        private readonly playingService: PlayingService,
        private readonly movingGameService: MovingGameService,
        private readonly itemSelectorService: ItemSelectorService,
        private readonly actionService: ActionService,
    ) {
        this.player = this.playingService.players.find((element) => element.avatarUrl === this.playerSelectionService.avatarLink) || {
            name: this.playerSelectionService.selectedInput ?? '',
            avatarUrl: this.playerSelectionService.avatarLink ?? '',
            attack: this.playerSelectionService.selectedAttack ?? '',
            defense: this.playerSelectionService.selectedDefense ?? '',
            speed: this.playerSelectionService.baseStats.speed,
            life: this.playerSelectionService.isLifeSelected ? NUMBER_OF_ITEMS_BIG : NUMBER_OF_ITEMS_MEDIUM,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        };

        this.maxHealth = this.player.life;
        this.currentLife = this.player.life;
    }

    ngOnInit(): void {
        this.initializePlayer();
        this.subscribeToPlayerUpdates();
        this.myname = this.findName();
    }

    ngOnDestroy(): void {
        this.playerSubscription?.unsubscribe();
    }

    getMovePoints(): number {
        return this.movingGameService.movePoints >= 0 ? this.movingGameService.movePoints : 0;
    }

    getActionPoints(): number {
        return this.actionService.canAction === 2 ? 0 : 1;
    }

    getDiceAtkIcon(): string {
        return this.playerSelectionService.selectedAttack === '6 Faces'
            ? './assets/icon/perspective-dice-six-two.234x256.png'
            : './assets/icon/dice_four_face.PNG';
    }

    getDiceDefIcon(): string {
        return this.playerSelectionService.selectedDefense === '6 Faces'
            ? './assets/icon/perspective-dice-six-two.234x256.png'
            : './assets/icon/dice_four_face.PNG';
    }

    findName(): string {
        const foundPlayer = this.playingService.players.find((element) => this.playingService.localPlayer?.avatarUrl === element.avatarUrl);
        return foundPlayer ? foundPlayer.name ?? 'defaultName' : 'inexistant';
    }

    getInventoryItem(itemIndex: number): Item {
        if (this.playingService.localPlayer?.inventory && this.playingService.localPlayer?.inventory.length > itemIndex) {
            const itemToPlace = this.itemSelectorService.items.find(
                (item) => item.name === (this.playingService.localPlayer?.inventory?.[itemIndex]?.name ?? ''),
            );
            return itemToPlace ?? ({ name: '', description: '', image: '' } as Item);
        }
        return { name: '', description: '', image: '' } as Item;
    }

    private initializePlayer(): void {
        if (this.playingService.localPlayer) {
            this.player = this.playingService.localPlayer;
            this.maxHealth = this.player.life;
            this.currentLife = this.player.life;
        }
    }

    private subscribeToPlayerUpdates(): void {
        this.playerSubscription = this.playingService.players$.pipe(takeUntil(this.destroy$)).subscribe((players: Player[]) => {
            if (!this.playingService.localPlayer) return;

            const myUpdatedPlayer = players.find((p) => p.name === this.playingService.localPlayer?.name);
            const myPlayersName = players.find((p) => p.avatarUrl === this.playingService.localPlayer?.avatarUrl);

            if (myUpdatedPlayer) {
                this.player = myUpdatedPlayer;
                this.currentLife = myUpdatedPlayer.life;
                if (myUpdatedPlayer.life > this.maxHealth) {
                    this.maxHealth = myUpdatedPlayer.life;
                }
            }
            if (myPlayersName) {
                this.player = myPlayersName;
                this.playingService.localPlayer.name = myPlayersName.name;
            }
        });
    }
}
