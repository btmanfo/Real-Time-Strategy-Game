import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterSelectionComponent } from '@app/components/character/character.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { NotificationSnackbarComponent } from '@app/components/notification-snackbar/notification-snackbar.component';
import { MESSAGES_ROOM, pageName } from '@app/constants/constants';
import { NotifcationInterface, SelectDeselectSubscriptionInterface } from '@app/interfaces/interface';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayerSelectionService } from '@app/services/player-selection-service/player-selection.service';
import { CHARACTERS, DiceType } from '@common/constants';
import { Character, Player } from '@common/interfaces';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-select-character',
    imports: [HeaderComponent, CommonModule, FormsModule, CharacterSelectionComponent, RouterLink, NotificationSnackbarComponent],
    templateUrl: './select-character.component.html',
    styleUrls: ['./select-character.component.scss'],
})
export class PlayerSelectionComponent implements OnInit, OnDestroy {
    characters: Character[] = CHARACTERS;
    diceType = DiceType;
    private readonly destroy$ = new Subject<void>();
    private readonly title: string = pageName.playerPage;
    private readonly baseUrl: string = './assets/images/Personnages/';
    private source: string;
    private selectedCharacterSrc: string | null = null;
    private pinCode: string | null = null;
    private selectSubscription: Subscription;
    private deselectSubscription: Subscription;

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly playerSelectionService: PlayerSelectionService,
        private readonly joingameSocketService: JoinGameService,
        private readonly notificationService: NotificationService,
    ) {}

    get titleValue(): string {
        return this.title;
    }

    get charactersValue(): Character[] {
        return this.characters;
    }

    get selectedCharacterSrcValue(): string | null {
        return this.selectedCharacterSrc;
    }

    get notification(): NotifcationInterface {
        return {
            showModal: this.notificationService.showModal,
            errorMessages: this.notificationService.errorMessages,
        };
    }

    get playerSelection(): PlayerSelectionService {
        return this.playerSelectionService;
    }

    @HostListener('window:unload', ['$event'])
    onBeforeUnload(event?: Event): void {
        localStorage.setItem('shouldRedirectToHome', 'true');
        if (event) {
            event.preventDefault();
        }
    }

    ngOnInit(): void {
        this.playerSelectionService.resetSelection();
        this.playerSelectionService.resetErrors();

        const shouldRedirect = localStorage.getItem('shouldRedirectToHome');
        if (shouldRedirect === 'true') {
            localStorage.setItem('shouldRedirectToHome', 'false');
            this.router.navigate(['/home']);
            return;
        }

        this.handleQueryParamsSubscription();
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.source = params['source'];
            this.pinCode = params['pin'];
            this.loadInitialData();
        });

        this.subscribeToCharacterToDeselect();
        this.subscribeToCharacterDeselected();
    }

    /**
     * Cleans up subscriptions when the component is destroyed.
     */
    ngOnDestroy(): void {
        if (this.selectSubscription) {
            this.selectSubscription.unsubscribe();
        }
        if (this.deselectSubscription) {
            this.deselectSubscription.unsubscribe();
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Handles character selection.
     *
     * - Deselects previously selected character (if any).
     * - Marks the new selection as disabled.
     * - Notifies the player selection service and the socket server.
     *
     * @param {string} avatarSrc - The source of the selected avatar.
     */
    onCharacterSelected(avatarSrc: string): void {
        if (this.source && this.pinCode) {
            if (this.selectedCharacterSrc) {
                const previousCharacter = this.characters.find((char) => char.src === this.selectedCharacterSrc);
                if (previousCharacter) {
                    previousCharacter.disabled = false;
                    this.joingameSocketService.deselectCharacterForRoom(this.source, this.baseUrl + previousCharacter.src);
                }
            }

            const selectedAvatar = this.characters.find((a) => a.src === avatarSrc);
            this.selectedCharacterSrc = avatarSrc;
            if (selectedAvatar) {
                selectedAvatar.disabled = true;
            }
            this.playerSelectionService.selectAvatar(avatarSrc);

            if (this.source && this.pinCode) {
                this.joingameSocketService.selectCharacter(this.source, this.baseUrl + avatarSrc);
            }
        } else {
            this.playerSelectionService.selectAvatar(avatarSrc);
        }
    }

    /**
     * Handles the room joining process.
     *
     * If a source is provided, it attempts to join the room.
     * It retrieves the current player and then calls the socket service to join the room.
     * If successful, it navigates to the validation page with the game ID and source code.
     */
    joinRoom(): void {
        if (!this.source) {
            return;
        }
        const currentPlayer = this.playerSelectionService.getCurrentPlayer();
        if (!currentPlayer) {
            return;
        }
        this.joingameSocketService
            .joinRoom(this.source, currentPlayer)
            .pipe(takeUntil(this.destroy$))
            .subscribe((response) => {
                if (response?.success) {
                    this.joingameSocketService
                        .getGameId(this.source)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe((gameIdValue: string) => {
                            this.router.navigate(['/validate', gameIdValue], { queryParams: { source: response.playerJoin, code: this.source } });
                        });
                }
            });
    }

    /**
     * Creates a new room and then automatically joins it.
     */
    createRoom(): void {
        this.joingameSocketService
            .createRoom()
            .pipe(takeUntil(this.destroy$))
            .subscribe((roomCode: string) => {
                this.source = roomCode;
                this.joinRoom();
            });
    }

    /**
     * Delegates the speed selection to the player selection service.
     */
    speedClick(): void {
        this.playerSelectionService.selectSpeed(true);
    }

    /**
     * Delegates the life selection to the player selection service.
     */
    lifeClick(): void {
        this.playerSelectionService.selectLife(true);
    }

    /**
     * Delegates the attack selection to the player selection service.
     *
     * @param {string} selected - The selected attack type.
     */
    onAttackSelection(selected: DiceType): void {
        this.playerSelectionService.selectAttack(selected);
    }

    /**
     * Delegates the defense selection to the player selection service.
     *
     * @param {string} selected - The selected defense type.
     */
    onDefenseSelection(selected: DiceType): void {
        this.playerSelectionService.selectDefense(selected);
    }

    /**
     * Validates the overall selection. If valid, saves the character and then either joins an existing room or creates a new room.
     */
    isAllValid(): void {
        if (!this.isSelectionValid()) return;

        this.playerSelectionService.saveCharacter();
        const player = this.playerSelectionService.getCurrentPlayer();

        if (player) {
            if (this.source) {
                this.handleExistingRoom(player);
            } else {
                this.createRoom();
            }
        }
    }

    /**
     * Subscribes to the "character to deselect" socket event.
     *
     * When the event is received and matches the current room,
     * the corresponding character is marked as disabled.
     */
    private subscribeToCharacterToDeselect(): void {
        this.selectSubscription = this.joingameSocketService
            .onCharacterToDeselect()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data: SelectDeselectSubscriptionInterface) => {
                if (this.source && this.pinCode && this.pinCode === data.theRoomCodeToDesable) {
                    const fileName = data.theUrlOfSelectPlayer.slice(this.baseUrl.length);
                    const character = this.characters.find((char) => char.src === fileName);
                    if (character) {
                        character.disabled = true;
                    }
                }
            });
    }

    /**
     * Subscribes to the "character deselected" socket event.
     *
     * When the event is received and matches the current room,
     * the corresponding character is marked as enabled.
     */
    private subscribeToCharacterDeselected(): void {
        this.deselectSubscription = this.joingameSocketService
            .onCharacterDeselected()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data: SelectDeselectSubscriptionInterface) => {
                if (this.source && this.pinCode && this.pinCode === data.theRoomCodeToDesable) {
                    const fileName = data.theUrlOfSelectPlayer.slice(this.baseUrl.length);
                    const character = this.characters.find((char) => char.src === fileName);
                    if (character) {
                        character.disabled = false;
                    }
                }
            });
    }

    /**
     * Handles joining an existing room.
     *
     * It checks whether the room is locked or full, displays error messages if necessary,
     * and if all checks pass, joins the room and validates the player's selection.
     *
     * @param {Player} player - The current player.
     */
    private handleExistingRoom(player: Player): void {
        this.joingameSocketService
            .isRoomLocked(this.source)
            .pipe(takeUntil(this.destroy$))
            .subscribe((isLocked: boolean) => {
                if (isLocked) {
                    this.notificationService.errorMessages.push(MESSAGES_ROOM.locked);
                    this.notificationService.showModal = true;
                    return;
                }
                this.joingameSocketService
                    .isRoomFull(this.source)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((isRoomFull: boolean) => {
                        if (isRoomFull) {
                            this.notificationService.errorMessages.push(MESSAGES_ROOM.roomFull);
                            this.notificationService.showModal = true;
                            return;
                        }
                        this.joinRoom();
                        this.joingameSocketService.validatePlayerSelection(this.source, player);
                    });
            });
    }

    private loadInitialData(): void {
        if (this.source) {
            this.joingameSocketService
                .getActivePlayers(this.source)
                .pipe(takeUntil(this.destroy$))
                .subscribe((players: Player[]) => {
                    this.updateCharactersDisabledState(players);
                });
            this.joingameSocketService
                .onPlayersList()
                .pipe(takeUntil(this.destroy$))
                .subscribe((players: Player[]) => {
                    this.updateCharactersDisabledState(players);
                });
        }
    }

    /**
     * Updates the disabled state of characters based on the avatars already taken by active players.
     *
     * @param {Player[]} players - The list of active players.
     */
    private updateCharactersDisabledState(players: Player[]): void {
        const takenAvatars = players.map((player) => player.avatarUrl);
        this.characters = CHARACTERS.map((avatar) => ({
            ...avatar,
            disabled: takenAvatars.includes(this.baseUrl + avatar.src),
        }));
    }

    /**
     * Validates the current selection.
     *
     * Checks if the selection meets all the requirements; if not, it sets error messages and displays a modal.
     *
     * @returns {boolean} True if the selection is valid, false otherwise.
     */
    private isSelectionValid(): boolean {
        if (!this.playerSelectionService.validateSelection()) {
            if (this.playerSelectionService.selectedInputError) {
                this.notificationService.errorMessages.push(MESSAGES_ROOM.nameRule);
            }
            if (this.playerSelectionService.avatarLinkError) {
                this.notificationService.errorMessages.push(MESSAGES_ROOM.pickAvatar);
            }
            if (this.playerSelectionService.selectedAttackError) {
                this.notificationService.errorMessages.push(MESSAGES_ROOM.pickAttack);
            }
            if (this.playerSelectionService.selectedDefenseError) {
                this.notificationService.errorMessages.push(MESSAGES_ROOM.pickDefense);
            }
            if (this.playerSelectionService.isLifeError || this.playerSelectionService.isSpeedError) {
                this.notificationService.errorMessages.push(MESSAGES_ROOM.pickLifeOrSpeed);
            }
            this.notificationService.showModal = true;
            return false;
        }
        return true;
    }

    private handleQueryParamsSubscription(): void {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            this.source = params['source'] ?? null;
            if (this.source) {
                this.joingameSocketService
                    .getActivePlayers(this.source)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((players: Player[]) => {
                        this.updateCharactersDisabledState(players);
                    });
                this.joingameSocketService
                    .onPlayersList()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((players: Player[]) => {
                        this.updateCharactersDisabledState(players);
                    });
            }
        });
    }
}
