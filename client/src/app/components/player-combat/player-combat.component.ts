import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DoCheck, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { COMBAT_ATTACKING_TIME, MAX_ESCAPE_ATTEMPTS } from '@app/constants/constants';
import { CombatService } from '@app/services/combat-service/combat-service.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels } from '@common/constants';
import { CombatRollsData, CombatUpdateData, Player } from '@common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type BotDamageMap = { [playerName: string]: boolean };

@Component({
    selector: 'app-player-combat',
    templateUrl: './player-combat.component.html',
    styleUrls: ['./player-combat.component.scss'],
    imports: [CommonModule],
})
export class PlayerCombatComponent implements OnInit, OnChanges, DoCheck, OnDestroy, AfterViewInit {
    @Output() emitFirstPlayer = new EventEmitter<Player[]>();
    @Input() isEmitValueToAttck = '';
    @Output() diceRolled = new EventEmitter<{ attackerRoll: number; defenderRoll: number }>();

    maxEscapeAttempts = MAX_ESCAPE_ATTEMPTS;
    attacker?: Player;
    defender?: Player;
    roomCode = '';

    private defenderDiceRoll = 0;
    private attackerDiceRoll = 0;
    private hasSentEscapeWarning = false;
    private previousDefenderName: string | null = null;
    private botReceivedDamage: BotDamageMap = {};
    private botActionTimer?: ReturnType<typeof setTimeout>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly combatService: CombatService,
        private readonly playingService: PlayingService,
        private readonly joinGameService: JoinGameService,
    ) {
        this.setupSocketListeners();
    }

    get previousDefenderNameValue(): string | null {
        return this.previousDefenderName;
    }

    get combatServiceValue(): CombatService {
        return this.combatService;
    }

    get playingServiceValue(): PlayingService {
        return this.playingService;
    }

    get defenderDiceRollValue(): number {
        return this.defenderDiceRoll;
    }

    get attackerDiceRollValue(): number {
        return this.attackerDiceRoll;
    }

    get hasPlayerSentEscapeWarning(): boolean {
        return this.hasSentEscapeWarning;
    }

    set hasPlayerSentEscapeWarning(value: boolean) {
        this.hasSentEscapeWarning = value;
    }

    set previousDefender(value: string | null) {
        this.previousDefenderName = value;
    }

    ngOnInit(): void {
        this.initializeCombat();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.isEmitValueToAttck) {
            this.attack();
        }
    }

    ngAfterViewInit(): void {
        this.setupRoomCreationListener();
    }

    ngDoCheck(): void {
        this.checkDefenderChange();
    }

    sendMessage(message: string, userToSendMessage: string): void {
        if (this.roomCode && message.trim()) {
            this.joinGameService.sendMessage(this.roomCode, message, userToSendMessage);
        }
    }

    attack(): void {
        if (!this.isMyTurn() || !this.attacker || !this.defender) {
            return;
        }

        this.combatService.attack(this.attacker, this.defender);
    }

    dodge(): void {
        if (!this.isMyTurn() || this.isEscapeDisabled()) {
            return;
        }

        this.combatService.dodge();
    }

    isEscapeDisabled(): boolean {
        const isLastAttempt = this.maxEscapeAttempts - this.combatService.escapeAttempts === 1;

        if (!this.hasSentEscapeWarning && isLastAttempt) {
            this.hasSentEscapeWarning = true;
        }

        return this.combatService.escapeAttempts >= this.maxEscapeAttempts;
    }

    isMyTurn(): boolean {
        return this.attacker?.name === this.playingService.localPlayer?.name;
    }

    isBot(player?: Player): boolean {
        return Boolean(player?.isVirtualPlayer);
    }

    isBotAggressive(bot?: Player): boolean {
        return Boolean(bot?.isVirtualPlayer && bot.agressive);
    }

    handleBotTurn(): void {
        this.clearBotActionTimer();

        if (this.attacker && this.isBot(this.attacker)) {
            this.botActionTimer = setTimeout(() => {
                this.executeBotAction();
            }, COMBAT_ATTACKING_TIME);
        }
    }

    executeBotAction(): void {
        if (!this.attacker || !this.defender) {
            return;
        }

        if (this.isBotAggressive(this.attacker)) {
            this.combatService.attack(this.attacker, this.defender);
            return;
        }

        if (this.isBot(this.attacker) && !this.isBotAggressive(this.attacker) && this.attacker.name) {
            const shouldDodge = this.botReceivedDamage[this.attacker.name] && !this.isEscapeDisabled();

            if (shouldDodge) {
                this.combatService.dodge();
                this.combatService.updateDodgeCount(this.attacker.name);
            } else {
                this.combatService.attack(this.attacker, this.defender);
            }
        }
    }

    ngOnDestroy(): void {
        this.clearBotActionTimer();
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupSocketListeners(): void {
        this.combatService.socket.on(SocketPlayerMovementLabels.CombatUpdate, (data: CombatUpdateData) => {
            this.attacker = data.attacker;
            this.defender = data.defender;
            this.handleBotTurn();
        });

        this.combatService.socket.on(SocketPlayerMovementLabels.CombatRolls, (data: CombatRollsData) => {
            this.attackerDiceRoll = data.attackerBonus;
            this.defenderDiceRoll = data.defenderBonus;
            this.diceRolled.emit({ attackerRoll: this.attackerDiceRoll, defenderRoll: this.defenderDiceRoll });

            if (this.defender?.name && this.isBot(this.defender) && data.attackerBonus > data.defenderBonus) {
                this.botReceivedDamage[this.defender.name] = true;
            }
        });
    }

    private initializeCombat(): void {
        this.attacker = this.combatService.attacker;
        this.defender = this.combatService.defender;
        this.joinGameService.joinAndCreateGameRoomCombat(this.attacker, this.defender);
        this.emitFirstPlayer.emit([this.attacker, this.defender]);

        this.joinGameService
            .onRoomCreated()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
                this.roomCode = data.codeRoom;
                this.handleBotTurn();
            });
    }

    private setupRoomCreationListener(): void {
        this.joinGameService
            .onRoomCreated()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
                this.roomCode = data.codeRoom;
                this.sendMessage('Count to 5', this.combatService.attacker.name ?? '');
                this.hasSentEscapeWarning = true;
                this.handleBotTurn();
            });
    }

    private checkDefenderChange(): void {
        if (!this.defender || this.defender.name === this.previousDefenderName) {
            return;
        }

        const messageType = this.maxEscapeAttempts - this.combatService.escapeAttempts === 0 ? 'Count to 3' : 'Count to 5';

        this.sendMessage(messageType, this.previousDefenderName ?? '');
        this.hasSentEscapeWarning = true;
        this.previousDefenderName = this.defender.name;
    }

    private clearBotActionTimer(): void {
        if (this.botActionTimer) {
            clearTimeout(this.botActionTimer);
        }
    }
}
