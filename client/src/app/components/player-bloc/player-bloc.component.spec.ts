/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Usage temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NUMBER_OF_ITEMS_BIG, NUMBER_OF_ITEMS_MEDIUM } from '@app/constants/constants';
import { ItemSelectorService } from '@app/services/item-selector-service/item-selector.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayerSelectionService } from '@app/services/player-selection-service/player-selection.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { Item, Player, PlayerPoints } from '@common/interfaces';
import { Subject } from 'rxjs';
import { PlayerInfoComponent } from './player-bloc.component';
class FakePlayerSelectionService {
    avatarLink = 'test-avatar';
    selectedInput = 'TestPlayer';
    selectedAttack = '6 Faces';
    selectedDefense = '6 Faces';
    baseStats = { attack: 10, defense: 5, speed: 3 };
    isLifeSelected = true;
}

class FakePlayingService {
    players: Player[] = [
        {
            name: 'TestPlayer',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: NUMBER_OF_ITEMS_BIG,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        },
    ];
    localPlayer: Player | null = this.players[0];
    players$ = new Subject<Player[]>();
    points$ = new Subject<PlayerPoints>();
    currentMovingPoints = 3;
    canAction = true;
}

describe('PlayerInfoComponent', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let fakePlayerSelectionService: FakePlayerSelectionService;
    let fakePlayingService: FakePlayingService;
    let fakeMovingGameService: jasmine.SpyObj<MovingGameService>;
    let fakeItemSelectorService: jasmine.SpyObj<ItemSelectorService>;

    beforeEach(async () => {
        fakePlayerSelectionService = new FakePlayerSelectionService();
        fakePlayingService = new FakePlayingService();
        fakeMovingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        fakeItemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);
        fakeMovingGameService.movePoints = 6;
        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent, HttpClientTestingModule],
            providers: [
                { provide: PlayerSelectionService, useValue: fakePlayerSelectionService },
                { provide: PlayingService, useValue: fakePlayingService },
                { provide: MovingGameService, useValue: fakeMovingGameService },
                { provide: ItemSelectorService, useValue: fakeItemSelectorService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    it('should create the component and set initial player from constructor', () => {
        expect(component).toBeTruthy();
        expect(component.player.name).toBe('TestPlayer');
        expect(component.player.avatarUrl).toBe('test-avatar');
        expect(component.currentLife).toBe(NUMBER_OF_ITEMS_BIG);
        expect(component.maxHealth).toBe(NUMBER_OF_ITEMS_BIG);
        expect(component.movementPoints).toBe(fakePlayingService.currentMovingPoints);
        expect(component.actionPoints).toBe(1);
        expect(component.baseAtk).toBe(fakePlayerSelectionService.baseStats.attack);
        expect(component.baseDef).toBe(fakePlayerSelectionService.baseStats.defense);
    });

    it('should use player from playerSelectionService when matching player is found', () => {
        fakePlayingService.localPlayer = null;
        fakePlayingService.players = [{ avatarUrl: 'ksdjdlkas' } as Player];
        expect(component.player.name).toBe(fakePlayerSelectionService.selectedInput);
        expect(component.player.avatarUrl).toBe(fakePlayerSelectionService.avatarLink);
        expect(component.player.attack).toBe(fakePlayerSelectionService.selectedAttack);
        expect(component.player.defense).toBe(fakePlayerSelectionService.selectedDefense);
    });

    it('should use fallback player from playerSelectionService when no matching player is found', () => {
        expect(component.player.name).toBe(fakePlayerSelectionService.selectedInput);
        expect(component.player.avatarUrl).toBe(fakePlayerSelectionService.avatarLink);
        expect(component.player.attack).toBe(fakePlayerSelectionService.selectedAttack);
        expect(component.player.defense).toBe(fakePlayerSelectionService.selectedDefense);
    });

    it('should set maxHealth and currentLife based on fallback life value', () => {
        expect(component.maxHealth).toBe(NUMBER_OF_ITEMS_BIG);
        expect(component.currentLife).toBe(NUMBER_OF_ITEMS_BIG);
    });

    it('ngOnInit should call initializePlayer, subscribeToPlayerUpdates, subscribeToPointsUpdates and set myname', () => {
        const customPlayer: Player = {
            name: 'CustomPlayer',
            avatarUrl: 'custom-avatar',
            attack: '4 Faces',
            defense: '4 Faces',
            speed: 5,
            life: NUMBER_OF_ITEMS_MEDIUM,
            isAdmin: false,
            coordinate: { x: 5, y: 5 },
        };
        fakePlayingService.localPlayer = customPlayer;
        component.ngOnInit();
        expect(component.player).toEqual(customPlayer);
        expect(component.currentLife).toBe(customPlayer.life);
        expect(component.maxHealth).toBe(customPlayer.life);

        expect(component.findName()).toBe('inexistant');
        expect(component.myname).toBe('inexistant');
    });

    it('getDiceAtkIcon should return correct icon based on selectedAttack', () => {
        fakePlayerSelectionService.selectedAttack = '6 Faces';
        expect(component.getDiceAtkIcon()).toBe('./assets/icon/perspective-dice-six-two.234x256.png');

        fakePlayerSelectionService.selectedAttack = '4 Faces';
        expect(component.getDiceAtkIcon()).toBe('./assets/icon/dice_four_face.PNG');
    });

    it('getDiceDefIcon should return correct icon based on selectedDefense', () => {
        fakePlayerSelectionService.selectedDefense = '6 Faces';
        expect(component.getDiceDefIcon()).toBe('./assets/icon/perspective-dice-six-two.234x256.png');

        fakePlayerSelectionService.selectedDefense = '4 Faces';
        expect(component.getDiceDefIcon()).toBe('./assets/icon/dice_four_face.PNG');
    });

    describe('findName', () => {
        it('should return the matching player name when found', () => {
            fakePlayingService.localPlayer = {
                avatarUrl: 'match-avatar',
                name: 'localPlayer',
                attack: '',
                defense: '',
                speed: 0,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
            };
            fakePlayingService.players = [
                {
                    avatarUrl: 'nomatch-avatar',
                    name: 'OtherPlayer',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 90,
                    isAdmin: false,
                    coordinate: { x: 1, y: 1 },
                },
                {
                    avatarUrl: 'match-avatar',
                    name: 'FoundPlayer',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 110,
                    isAdmin: false,
                    coordinate: { x: 2, y: 2 },
                },
            ];
            const name = component.findName();
            expect(name).toBe('FoundPlayer');
        });
        it('should return the matching player name when found', () => {
            fakePlayingService.localPlayer = {
                avatarUrl: 'a',
                attack: '',
                defense: '',
                speed: 0,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
            } as Player;
            fakePlayingService.players = [
                {
                    avatarUrl: 'a',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 90,
                    isAdmin: false,
                    coordinate: { x: 1, y: 1 },
                } as Player,
                {
                    avatarUrl: 'a',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 110,
                    isAdmin: false,
                    coordinate: { x: 2, y: 2 },
                } as Player,
            ];
            const name = component.findName();
            expect(name).toBe('defaultName');
        });

        it('should return "defaultName" when a matching player is found but its name is undefined', () => {
            fakePlayingService.localPlayer = {
                avatarUrl: 'match-avatar',
                name: 'localPlayer',
                attack: '',
                defense: '',
                speed: 0,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
            };
            fakePlayingService.players = [
                {
                    avatarUrl: 'match-avatar',
                    name: 'defaultName',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 110,
                    isAdmin: false,
                    coordinate: { x: 2, y: 2 },
                },
            ];
            const name = component.findName();
            expect(name).toBe('defaultName');
        });

        it('should return "inexistant" when no matching player is found', () => {
            fakePlayingService.localPlayer = {
                avatarUrl: 'non-existent-avatar',
                name: 'localPlayer',
                attack: '',
                defense: '',
                speed: 0,
                life: 100,
                isAdmin: false,
                coordinate: { x: 0, y: 0 },
            };
            fakePlayingService.players = [
                {
                    avatarUrl: 'other-avatar',
                    name: 'OtherPlayer',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 90,
                    isAdmin: false,
                    coordinate: { x: 1, y: 1 },
                },
            ];
            const name = component.findName();
            expect(name).toBe('inexistant');
        });

        it('should return "inexistant" when localPlayer is null', () => {
            fakePlayingService.localPlayer = null;
            fakePlayingService.players = [
                {
                    avatarUrl: 'any-avatar',
                    name: 'SomePlayer',
                    attack: '',
                    defense: '',
                    speed: 0,
                    life: 100,
                    isAdmin: false,
                    coordinate: { x: 0, y: 0 },
                },
            ];
            const name = component.findName();
            expect(name).toBe('inexistant');
        });
    });

    describe('initializePlayer', () => {
        it('should set player, maxHealth and currentLife if localPlayer exists', () => {
            const newPlayer: Player = {
                name: 'NewPlayer',
                avatarUrl: 'new-avatar',
                attack: '6 Faces',
                defense: '6 Faces',
                speed: 4,
                life: NUMBER_OF_ITEMS_MEDIUM,
                isAdmin: false,
                coordinate: { x: 2, y: 2 },
            };
            fakePlayingService.localPlayer = newPlayer;
            component['initializePlayer']();
            expect(component.player).toEqual(newPlayer);
            expect(component.maxHealth).toBe(newPlayer.life);
            expect(component.currentLife).toBe(newPlayer.life);
        });
    });

    describe('subscribeToPlayerUpdates', () => {
        it('should update player and currentLife when a matching updated player is emitted', () => {
            fakePlayingService.localPlayer = { ...component.player };
            const updatedPlayer: Player = {
                name: component.player.name,
                avatarUrl: component.player.avatarUrl,
                attack: '4 Faces',
                defense: '4 Faces',
                speed: 3,
                life: component.player.life + 20,
                isAdmin: false,
                coordinate: { x: 1, y: 1 },
            };
            fakePlayingService.players$.next([updatedPlayer]);
            fixture.detectChanges();
            expect(component.player).toEqual(updatedPlayer);
            expect(component.currentLife).toBe(updatedPlayer.life);
            expect(component.maxHealth).toBe(updatedPlayer.life);
        });

        it('should update localPlayer name if a player with matching avatar is found', () => {
            fakePlayingService.localPlayer = { ...component.player };
            const updatedPlayer: Player = {
                name: 'RenamedPlayer',
                avatarUrl: component.player.avatarUrl,
                attack: component.player.attack,
                defense: component.player.defense,
                speed: component.player.speed,
                life: component.player.life,
                isAdmin: false,
                coordinate: component.player.coordinate,
            };
            fakePlayingService.players$.next([updatedPlayer]);
            fixture.detectChanges();
            expect(component.player).toEqual(updatedPlayer);
            expect(fakePlayingService.localPlayer.name).toBe('RenamedPlayer');
        });

        it('should do nothing if localPlayer is not set', () => {
            fakePlayingService.localPlayer = null;
            const originalPlayer = component.player;
            fakePlayingService.players$.next([{ ...originalPlayer, name: 'Changed' }]);
            fixture.detectChanges();
            expect(component.player).toEqual(originalPlayer);
        });
    });

    describe('ngOnDestroy', () => {
        it('should unsubscribe from playerSubscription and pointsSubscription', () => {
            component['playerSubscription'] = { unsubscribe: jasmine.createSpy('unsubscribe') } as any;

            component.ngOnDestroy();

            if (component['playerSubscription']) {
                expect(component['playerSubscription'].unsubscribe).toHaveBeenCalled();
            }
        });
    });

    describe('getInventoryItem', () => {
        it('should return an empty item when localPlayer is null', () => {
            (component as any).playingService.localPlayer = null;
            const result = component.getInventoryItem(0);
            expect(result).toEqual({ name: '', description: '', image: '' } as Item);
        });

        it('should return an empty item when inventory is null', () => {
            (component as any).playingService.localPlayer = { inventory: null } as unknown as Player;
            const result = component.getInventoryItem(0);
            expect(result).toEqual({ name: '', description: '', image: '' } as Item);
        });

        it('should return an empty item when itemIndex is out of range', () => {
            (component as any).playingService.localPlayer = { inventory: [{ name: 'Potion' }] } as Player;
            const result = component.getInventoryItem(1);
            expect(result).toEqual({ name: '', description: '', image: '' } as Item);
        });

        it('should return the correct item from ItemSelectorService', () => {
            const item: Item = { name: 'Potion', description: 'Heals', image: 'potion.png' } as Item;
            (component as any).playingService.localPlayer = { inventory: [{ name: 'Potion' }] } as Player;
            (fakeItemSelectorService as any).items = [item];
            const result = component.getInventoryItem(0);
            expect(result).toEqual(item);
        });

        it('should return an empty item when item is not found in ItemSelectorService', () => {
            (component as any).playingService.localPlayer = { inventory: [{ name: 'Potion' }] } as Player;
            (fakeItemSelectorService as any).items = [];
            const result = component.getInventoryItem(0);
            expect(result).toEqual({ name: '', description: '', image: '' } as Item);
        });
    });
});

describe('Player initialization branches', () => {
    let fakePlayerSelectionService: FakePlayerSelectionService;
    let fakePlayingService: FakePlayingService;
    let fakeMovingGameService: jasmine.SpyObj<MovingGameService>;
    let fakeItemSelectorService: jasmine.SpyObj<ItemSelectorService>;
    let fakeActionService: any;

    beforeEach(() => {
        fakePlayerSelectionService = new FakePlayerSelectionService();
        fakePlayingService = new FakePlayingService();
        fakeMovingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        fakeItemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);
        fakeActionService = jasmine.createSpyObj('ActionService', [], {
            canAction: false,
        });
    });

    it('should find matching player by avatarUrl in playingService.players', () => {
        const matchingPlayer: Player = {
            name: 'MatchedPlayer',
            avatarUrl: 'test-avatar',
            attack: 'Matched Attack',
            defense: 'Matched Defense',
            speed: 7,
            life: 10,
            isAdmin: true,
            coordinate: { x: 5, y: 5 },
        };

        fakePlayingService.players = [
            { name: 'OtherPlayer', avatarUrl: 'other-avatar' } as Player,
            matchingPlayer,
            { name: 'AnotherPlayer', avatarUrl: 'another-avatar' } as Player,
        ];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player).toEqual(matchingPlayer);
    });

    it('should create fallback player when no matching player is found', () => {
        fakePlayingService.players = [
            { name: 'OtherPlayer', avatarUrl: 'other-avatar' } as Player,
            { name: 'AnotherPlayer', avatarUrl: 'another-avatar' } as Player,
        ];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player).toEqual({
            name: 'TestPlayer',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: NUMBER_OF_ITEMS_BIG,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
        });
    });

    it('should use empty string for name when selectedInput is null', () => {
        fakePlayerSelectionService.selectedInput = null as any;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.name).toBe('');
    });

    it('should use empty string for avatarUrl when avatarLink is null', () => {
        fakePlayerSelectionService.avatarLink = null as any;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.avatarUrl).toBe('');
    });

    it('should use empty string for attack when selectedAttack is null', () => {
        fakePlayerSelectionService.selectedAttack = null as any;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.attack).toBe('');
    });

    it('should use empty string for defense when selectedDefense is null', () => {
        fakePlayerSelectionService.selectedDefense = null as any;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.defense).toBe('');
    });

    it('should set life to NUMBER_OF_ITEMS_BIG when isLifeSelected is true', () => {
        fakePlayerSelectionService.isLifeSelected = true;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.life).toBe(NUMBER_OF_ITEMS_BIG);
    });

    it('should set life to NUMBER_OF_ITEMS_MEDIUM when isLifeSelected is false', () => {
        fakePlayerSelectionService.isLifeSelected = false;
        fakePlayingService.players = [];

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.player.life).toBe(NUMBER_OF_ITEMS_MEDIUM);
    });
});

describe('ActionPoints calculation', () => {
    let fakePlayerSelectionService: FakePlayerSelectionService;
    let fakePlayingService: FakePlayingService;
    let fakeMovingGameService: jasmine.SpyObj<MovingGameService>;
    let fakeItemSelectorService: jasmine.SpyObj<ItemSelectorService>;

    beforeEach(() => {
        fakePlayerSelectionService = new FakePlayerSelectionService();
        fakePlayingService = new FakePlayingService();
        fakeMovingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        fakeItemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);
    });

    it('should set actionPoints to 0 when canAction is truthy', () => {
        const fakeActionService = { canAction: true };

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.actionPoints).toBe(0);
    });

    it('should set actionPoints to 1 when canAction is falsy', () => {
        const fakeActionService = { canAction: false };

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.actionPoints).toBe(1);
    });

    it('should return 0 when canAction is 2', () => {
        const fakeActionService = { canAction: 2 };

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.getActionPoints()).toBe(0);
    });

    it('should return 1 when canAction is not 2', () => {
        const fakeActionService = { canAction: 1 };

        const testComponent = new PlayerInfoComponent(
            fakePlayerSelectionService as any,
            fakePlayingService as any,
            fakeMovingGameService as any,
            fakeItemSelectorService as any,
            fakeActionService as any,
        );

        expect(testComponent.getActionPoints()).toBe(1);
    });
});

describe('MovePoints calculation', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let fakePlayerSelectionService: FakePlayerSelectionService;
    let fakePlayingService: FakePlayingService;
    let fakeMovingGameService: jasmine.SpyObj<MovingGameService>;
    let fakeItemSelectorService: jasmine.SpyObj<ItemSelectorService>;

    beforeEach(async () => {
        fakePlayerSelectionService = new FakePlayerSelectionService();
        fakePlayingService = new FakePlayingService();
        fakeMovingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        fakeItemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent, HttpClientTestingModule],
            providers: [
                { provide: PlayerSelectionService, useValue: fakePlayerSelectionService },
                { provide: PlayingService, useValue: fakePlayingService },
                { provide: MovingGameService, useValue: fakeMovingGameService },
                { provide: ItemSelectorService, useValue: fakeItemSelectorService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
    });

    it('should return movePoints when movePoints is positive', () => {
        fakeMovingGameService.movePoints = 5;
        expect(component.getMovePoints()).toBe(5);
    });

    it('should return movePoints when movePoints is zero', () => {
        fakeMovingGameService.movePoints = 0;
        expect(component.getMovePoints()).toBe(0);
    });

    it('should return 0 when movePoints is negative', () => {
        fakeMovingGameService.movePoints = -3;
        expect(component.getMovePoints()).toBe(0);
    });
});

describe('getActionPoints method', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let playerSelectionService: FakePlayerSelectionService;
    let playingService: FakePlayingService;
    let movingGameService: jasmine.SpyObj<MovingGameService>;
    let itemSelectorService: jasmine.SpyObj<ItemSelectorService>;
    let actionService: any;

    beforeEach(async () => {
        playerSelectionService = new FakePlayerSelectionService();
        playingService = new FakePlayingService();
        movingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        itemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);

        actionService = { canAction: false };

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent, HttpClientTestingModule],
            providers: [
                { provide: PlayerSelectionService, useValue: playerSelectionService },
                { provide: PlayingService, useValue: playingService },
                { provide: MovingGameService, useValue: movingGameService },
                { provide: ItemSelectorService, useValue: itemSelectorService },
                { provide: 'ActionService', useValue: actionService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
    });

    it('should return 0 when canAction is exactly 2', () => {
        Object.defineProperty(actionService, 'canAction', {
            get: () => 2,
        });

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;

        expect(component.getActionPoints()).toBe(1);
    });

    it('should return 1 when canAction is not 2 (value of 1)', () => {
        Object.defineProperty(actionService, 'canAction', {
            get: () => 1,
        });

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;

        expect(component.getActionPoints()).toBe(1);
    });

    it('should return 1 when canAction is not 2 (value of 0)', () => {
        Object.defineProperty(actionService, 'canAction', {
            get: () => 0,
        });

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;

        expect(component.getActionPoints()).toBe(1);
    });

    it('should return 1 when canAction is not 2 (value of 3)', () => {
        Object.defineProperty(actionService, 'canAction', {
            get: () => 3,
        });

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;

        expect(component.getActionPoints()).toBe(1);
    });
});

describe('getInventoryItem method nullish coalescing', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let playerSelectionService: FakePlayerSelectionService;
    let playingService: FakePlayingService;
    let movingGameService: jasmine.SpyObj<MovingGameService>;
    let itemSelectorService: jasmine.SpyObj<ItemSelectorService>;

    beforeEach(async () => {
        playerSelectionService = new FakePlayerSelectionService();
        playingService = new FakePlayingService();
        movingGameService = jasmine.createSpyObj('MovingGameService', ['movePoints']);
        itemSelectorService = jasmine.createSpyObj('ItemSelectorService', ['getItems', 'items']);

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent, HttpClientTestingModule],
            providers: [
                { provide: PlayerSelectionService, useValue: playerSelectionService },
                { provide: PlayingService, useValue: playingService },
                { provide: MovingGameService, useValue: movingGameService },
                { provide: ItemSelectorService, useValue: itemSelectorService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
    });

    it('should handle inventory item name lookup with actual item', () => {
        const testItems = [
            { name: 'Health Potion', description: 'Heals you', image: 'potion.png' } as Item,
            { name: 'Magic Scroll', description: 'Casts a spell', image: 'scroll.png' } as Item,
        ];

        (itemSelectorService as any).items = testItems;

        playingService.localPlayer = {
            name: 'Test Player',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: 10,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
            inventory: [{ name: 'Health Potion' } as Item],
        };

        const result = component.getInventoryItem(0);
        expect(result).toEqual(testItems[0]);
    });

    it('should handle null inventory', () => {
        const testItems = [{ name: 'Health Potion', description: 'Heals you', image: 'potion.png' } as Item];

        (itemSelectorService as any).items = testItems;

        playingService.localPlayer = {
            name: 'Test Player',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: 10,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
            inventory: undefined,
        };

        const result = component.getInventoryItem(0);
        expect(result).toEqual({ name: '', description: '', image: '' } as Item);
    });

    it('should handle undefined inventory item', () => {
        const testItems = [{ name: 'Health Potion', description: 'Heals you', image: 'potion.png' } as Item];

        (itemSelectorService as any).items = testItems;

        playingService.localPlayer = {
            name: 'Test Player',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: 10,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
            inventory: [],
        };

        const result = component.getInventoryItem(0);
        expect(result).toEqual({ name: '', description: '', image: '' } as Item);
    });

    it('should handle undefined item name', () => {
        const testItems = [{ name: 'Health Potion', description: 'Heals you', image: 'potion.png' } as Item];

        (itemSelectorService as any).items = testItems;

        playingService.localPlayer = {
            name: 'Test Player',
            avatarUrl: 'test-avatar',
            attack: '6 Faces',
            defense: '6 Faces',
            speed: 3,
            life: 10,
            isAdmin: false,
            coordinate: { x: 0, y: 0 },
            inventory: [{ description: 'Mysterious item' } as Item],
        };

        const result = component.getInventoryItem(0);
        expect(result).toEqual({ name: '', description: '', image: '' } as Item);
    });

    it('should handle null player', () => {
        const testItems = [{ name: 'Health Potion', description: 'Heals you', image: 'potion.png' } as Item];

        (itemSelectorService as any).items = testItems;

        playingService.localPlayer = null;

        const result = component.getInventoryItem(0);
        expect(result).toEqual({ name: '', description: '', image: '' } as Item);
    });
});
