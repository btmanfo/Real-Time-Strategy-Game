/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable max-lines */
// Fichier de test volumineux toléré pour les tests unitaires
/* eslint-disable import/no-deprecated */
// usage de RouterTestingModule temporairement toléré dans les tests unitaires pour simuler la navigation */

import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MESSAGES_ROOM, pageName } from '@app/constants/constants';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayerSelectionService } from '@app/services/player-selection-service/player-selection.service';
import { CHARACTERS, DiceType } from '@common/constants';
import { Player } from '@common/interfaces';
import { of } from 'rxjs';
import { PlayerSelectionComponent } from './select-character.component';

describe('PlayerSelectionComponent', () => {
    let component: PlayerSelectionComponent;
    let fixture: ComponentFixture<PlayerSelectionComponent>;
    let router: Router;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let playerSelectionServiceSpy: jasmine.SpyObj<PlayerSelectionService>;
    let notificationServiceSpy: any;

    beforeEach(async () => {
        const playerSelectionServiceMock = jasmine.createSpyObj('PlayerSelectionService', [
            'resetSelection',
            'resetErrors',
            'selectAvatar',
            'selectSpeed',
            'selectLife',
            'selectAttack',
            'selectDefense',
            'validateSelection',
            'saveCharacter',
            'getCurrentPlayer',
        ]);

        const notificationServiceMock = {
            showModal: false,
            errorMessages: [] as string[],
        };

        const activatedRouteMock = {
            queryParams: of({ source: 'testRoom', pin: '1234' }),
        };

        const joinGameServiceMock = jasmine.createSpyObj(
            'JoinGameService',
            [
                'isRoomLocked',
                'isRoomFull',
                'validatePlayerSelection',
                'getActivePlayers',
                'onPlayersList',
                'onCharacterToDeselect',
                'onCharacterDeselected',
                'createRoom',
                'joinRoom',
                'getGameId',
                'selectCharacter',
                'deselectCharacterForRoom',
            ],
            {
                socket: {
                    disconnect: jasmine.createSpy('disconnect'),
                },
            },
        );

        joinGameServiceMock.isRoomLocked.and.returnValue(of(false));
        joinGameServiceMock.isRoomFull.and.returnValue(of(false));
        joinGameServiceMock.getActivePlayers.and.returnValue(of([]));
        joinGameServiceMock.onPlayersList.and.returnValue(of([]));
        joinGameServiceMock.onCharacterToDeselect.and.returnValue(
            of({ theUrlOfSelectPlayer: './assets/images/Personnages/char1.png', theRoomCodeToDesable: '1234' }),
        );
        joinGameServiceMock.onCharacterDeselected.and.returnValue(
            of({ theUrlOfSelectPlayer: './assets/images/Personnages/char1.png', theRoomCodeToDesable: '1234' }),
        );

        await TestBed.configureTestingModule({
            imports: [RouterTestingModule.withRoutes([]), PlayerSelectionComponent, CommonModule, FormsModule],
            providers: [
                { provide: JoinGameService, useValue: joinGameServiceMock },
                { provide: PlayerSelectionService, useValue: playerSelectionServiceMock },
                { provide: NotificationService, useValue: notificationServiceMock },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerSelectionComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        joinGameServiceSpy = TestBed.inject(JoinGameService) as jasmine.SpyObj<JoinGameService>;
        playerSelectionServiceSpy = TestBed.inject(PlayerSelectionService) as jasmine.SpyObj<PlayerSelectionService>;
        notificationServiceSpy = TestBed.inject(NotificationService);

        spyOn(router, 'navigate');
    });

    it('should return the title via the titleValue getter', () => {
        expect(component.titleValue).toEqual(pageName.playerPage);
    });

    it('should return the characters via the charactersValue getter', () => {
        expect(component.charactersValue).toEqual(CHARACTERS);
    });

    it('should return the selected character source as null initially', () => {
        expect(component.selectedCharacterSrcValue).toBeNull();
    });

    it('should return the notifications via the notification getter', () => {
        notificationServiceSpy.showModal = true;
        notificationServiceSpy.errorMessages = ['Test error'];
        const notif = component.notification;
        expect(notif.showModal).toBeTrue();
        expect(notif.errorMessages).toEqual(['Test error']);
    });

    it('should return the playerSelection service via the getter', () => {
        expect(component.playerSelection).toEqual(playerSelectionServiceSpy);
    });

    describe('onCharacterSelected', () => {
        it('should select a character when source and pinCode are set and no previous selection exists', () => {
            (component as any).source = 'room1';
            (component as any).pinCode = '1111';
            component.onCharacterSelected('char1.png');
            expect(playerSelectionServiceSpy.selectAvatar).toHaveBeenCalledWith('char1.png');
            expect(joinGameServiceSpy.selectCharacter).toHaveBeenCalledWith('room1', (component as any).baseUrl + 'char1.png');
            expect((component as any).selectedCharacterSrc).toEqual('char1.png');
            const selectedChar = component.characters.find((c) => c.src === 'char1.png');
            if (selectedChar) {
                expect(selectedChar.disabled).toBeTrue();
            }
        });

        it('should deselect the previous character if one was already selected', () => {
            (component as any).source = 'room1';
            (component as any).pinCode = '1111';
            component.characters = [
                { name: 'Test', src: 'char1.png', disabled: true },
                { name: 'Test', src: 'char2.png', disabled: false },
            ];
            (component as any).selectedCharacterSrc = 'char1.png';
            component.onCharacterSelected('char2.png');
            expect(joinGameServiceSpy.deselectCharacterForRoom).toHaveBeenCalledWith('room1', (component as any).baseUrl + 'char1.png');
            expect((component as any).selectedCharacterSrc).toEqual('char2.png');
            const char1 = component.characters.find((c) => c.src === 'char1.png');
            const char2 = component.characters.find((c) => c.src === 'char2.png');
            if (char1) {
                expect(char1.disabled).toBeFalse();
            }
            if (char2) {
                expect(char2.disabled).toBeTrue();
            }
            expect(playerSelectionServiceSpy.selectAvatar).toHaveBeenCalledWith('char2.png');
            expect(joinGameServiceSpy.selectCharacter).toHaveBeenCalledWith('room1', (component as any).baseUrl + 'char2.png');
        });

        it('should only select avatar if source or pinCode is not set', () => {
            (component as any).source = null;
            (component as any).pinCode = null;
            component.onCharacterSelected('char3.png');
            expect(playerSelectionServiceSpy.selectAvatar).toHaveBeenCalledWith('char3.png');
            expect(joinGameServiceSpy.selectCharacter).not.toHaveBeenCalled();
        });
    });

    describe('joinRoom', () => {
        it('should do nothing if source is not set', () => {
            (component as any).source = null;
            component.joinRoom();
            expect(joinGameServiceSpy.joinRoom).not.toHaveBeenCalled();
        });

        it('should do nothing if current player is not available', () => {
            (component as any).source = 'room1';
            playerSelectionServiceSpy.getCurrentPlayer.and.returnValue(null);
            component.joinRoom();
            expect(joinGameServiceSpy.joinRoom).not.toHaveBeenCalled();
        });

        it('should join the room and navigate if the response is successful', () => {
            (component as any).source = 'room1';
            const fakePlayer = { id: 'player1', avatarUrl: 'avatar.png' } as any;
            playerSelectionServiceSpy.getCurrentPlayer.and.returnValue(fakePlayer);
            joinGameServiceSpy.joinRoom.and.returnValue(of({ success: true, playerJoin: 'playerJoined' }));
            joinGameServiceSpy.getGameId.and.returnValue(of('gameIdValue'));

            component.joinRoom();
            expect(joinGameServiceSpy.joinRoom).toHaveBeenCalledWith('room1', fakePlayer);
            expect(joinGameServiceSpy.getGameId).toHaveBeenCalledWith('room1');
            expect(router.navigate).toHaveBeenCalledWith(['/validate', 'gameIdValue'], { queryParams: { source: 'playerJoined', code: 'room1' } });
        });
    });

    describe('createRoom', () => {
        it('should create a room and then join it', () => {
            spyOn(component, 'joinRoom');
            joinGameServiceSpy.createRoom.and.returnValue(of('newRoomCode'));
            component.createRoom();
            expect(joinGameServiceSpy.createRoom).toHaveBeenCalled();
            expect((component as any).source).toEqual('newRoomCode');
            expect(component.joinRoom).toHaveBeenCalled();
        });
    });

    describe('speedClick', () => {
        it('should delegate speed selection to playerSelectionService', () => {
            component.speedClick();
            expect(playerSelectionServiceSpy.selectSpeed).toHaveBeenCalledWith(true);
        });
    });

    describe('lifeClick', () => {
        it('should delegate life selection to playerSelectionService', () => {
            component.lifeClick();
            expect(playerSelectionServiceSpy.selectLife).toHaveBeenCalledWith(true);
        });
    });

    describe('onAttackSelection', () => {
        it('should delegate attack selection to playerSelectionService', () => {
            component.onAttackSelection(DiceType.FourFaces);
            expect(playerSelectionServiceSpy.selectAttack).toHaveBeenCalledWith(DiceType.FourFaces);
        });
    });

    describe('onDefenseSelection', () => {
        it('should delegate defense selection to playerSelectionService', () => {
            component.onDefenseSelection(DiceType.FourFaces);
            expect(playerSelectionServiceSpy.selectDefense).toHaveBeenCalledWith(DiceType.FourFaces);
        });
    });

    describe('isAllValid', () => {
        it('should do nothing if selection is not valid', () => {
            playerSelectionServiceSpy.validateSelection.and.returnValue(false);
            component.isAllValid();
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(playerSelectionServiceSpy.saveCharacter).not.toHaveBeenCalled();
        });

        it('should save character and handle existing room if selection is valid and source exists', () => {
            playerSelectionServiceSpy.validateSelection.and.returnValue(true);
            playerSelectionServiceSpy.getCurrentPlayer.and.returnValue({ id: 'p1' } as any);
            (component as any).source = 'room1';
            spyOn<any>(component, 'handleExistingRoom');
            component.isAllValid();
            expect(playerSelectionServiceSpy.saveCharacter).toHaveBeenCalled();
            expect((component as any).handleExistingRoom).toHaveBeenCalledWith({ id: 'p1' });
        });

        it('should save character and create room if selection is valid and no source exists', () => {
            playerSelectionServiceSpy.validateSelection.and.returnValue(true);
            playerSelectionServiceSpy.getCurrentPlayer.and.returnValue({ id: 'p1' } as any);
            (component as any).source = null;
            spyOn(component, 'createRoom');
            component.isAllValid();
            expect(playerSelectionServiceSpy.saveCharacter).toHaveBeenCalled();
            expect(component.createRoom).toHaveBeenCalled();
        });
    });

    describe('subscribeToCharacterToDeselect', () => {
        it('should disable character based on socket event for character to deselect', () => {
            (component as any).source = 'room1';
            (component as any).pinCode = '1111';
            component.characters = [{ name: 'Test', src: 'char1.png', disabled: false }];
            const eventData = { theUrlOfSelectPlayer: (component as any).baseUrl + 'char1.png', theRoomCodeToDesable: '1111' };
            joinGameServiceSpy.onCharacterToDeselect.and.returnValue(of(eventData));
            (component as any).subscribeToCharacterToDeselect();
            const char = component.characters.find((c) => c.src === 'char1.png');
            expect(char?.disabled).toBeTrue();
        });
    });

    describe('subscribeToCharacterDeselected', () => {
        it('should enable character based on socket event for character deselected', () => {
            (component as any).source = 'room1';
            (component as any).pinCode = '1111';
            component.characters = [{ name: 'Test', src: 'char1.png', disabled: true }];
            const eventData = { theUrlOfSelectPlayer: (component as any).baseUrl + 'char1.png', theRoomCodeToDesable: '1111' };
            joinGameServiceSpy.onCharacterDeselected.and.returnValue(of(eventData));
            (component as any).subscribeToCharacterDeselected();
            const char = component.characters.find((c) => c.src === 'char1.png');
            expect(char?.disabled).toBeFalse();
        });
    });

    describe('isSelectionValid', () => {
        it('should return false and set error messages if selection is invalid', () => {
            playerSelectionServiceSpy.validateSelection.and.returnValue(false);
            playerSelectionServiceSpy.selectedInputError = true;
            playerSelectionServiceSpy.avatarLinkError = true;
            playerSelectionServiceSpy.selectedAttackError = true;
            playerSelectionServiceSpy.selectedDefenseError = true;
            playerSelectionServiceSpy.isLifeError = true;
            const isValid = (component as any).isSelectionValid();
            expect(isValid).toBeFalse();
            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.nameRule);
            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.pickAvatar);
            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.pickAttack);
            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.pickDefense);
            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.pickLifeOrSpeed);
            expect(notificationServiceSpy.showModal).toBeTrue();
        });

        it('should return true if selection is valid', () => {
            playerSelectionServiceSpy.validateSelection.and.returnValue(true);
            const isValid = (component as any).isSelectionValid();
            expect(isValid).toBeTrue();
        });
    });

    describe('handleQueryParamsSubscription', () => {
        it('should update source and subscribe to active players if source exists', () => {
            joinGameServiceSpy.getActivePlayers.and.returnValue(of([]));
            joinGameServiceSpy.onPlayersList.and.returnValue(of([]));
            (component as any).handleQueryParamsSubscription();
            expect((component as any).source).toBeDefined();
        });
    });

    describe('handleExistingRoom', () => {
        const mockPlayer: Player = {
            name: 'Test Player',
            avatarUrl: 'test.png',
            life: 100,
            speed: 5,
            attack: 'test',
            defense: 'test',
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        };

        beforeEach(() => {
            component['source'] = 'testRoom';
            spyOn(component, 'joinRoom');
        });

        it('should show error when room is locked', fakeAsync(() => {
            joinGameServiceSpy.isRoomLocked.and.returnValue(of(true));

            (component as any).handleExistingRoom(mockPlayer);
            tick();

            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.locked);
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(component.joinRoom).not.toHaveBeenCalled();
            expect(joinGameServiceSpy.validatePlayerSelection).not.toHaveBeenCalled();
        }));

        it('should show error when room is full', fakeAsync(() => {
            joinGameServiceSpy.isRoomLocked.and.returnValue(of(false));
            joinGameServiceSpy.isRoomFull.and.returnValue(of(true));

            (component as any).handleExistingRoom(mockPlayer);
            tick();

            expect(notificationServiceSpy.errorMessages).toContain(MESSAGES_ROOM.roomFull);
            expect(notificationServiceSpy.showModal).toBeTrue();
            expect(component.joinRoom).not.toHaveBeenCalled();
            expect(joinGameServiceSpy.validatePlayerSelection).not.toHaveBeenCalled();
        }));

        it('should join room when room is not locked and not full', fakeAsync(() => {
            joinGameServiceSpy.isRoomLocked.and.returnValue(of(false));
            joinGameServiceSpy.isRoomFull.and.returnValue(of(false));

            (component as any).handleExistingRoom(mockPlayer);
            tick();

            expect(component.joinRoom).toHaveBeenCalled();
            expect(joinGameServiceSpy.validatePlayerSelection).toHaveBeenCalledWith('testRoom', mockPlayer);
            expect(notificationServiceSpy.showModal).toBeFalse();
            expect(notificationServiceSpy.errorMessages.length).toBe(0);
        }));
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    describe('loadInitialData', () => {
        it('should subscribe to getActivePlayers and onPlayersList if source is defined', () => {
            const mockPlayers: Player[] = [
                { name: 'P1', avatarUrl: 'char1.png', life: 100, speed: 1, attack: '4', defense: '6', coordinate: { x: 0, y: 0 }, isAdmin: false },
            ];

            const updateCharactersDisabledStateSpy = spyOn<any>(component, 'updateCharactersDisabledState');

            (component as any).source = 'testRoom';

            joinGameServiceSpy.getActivePlayers.and.returnValue(of(mockPlayers));
            joinGameServiceSpy.onPlayersList.and.returnValue(of(mockPlayers));

            (component as any).loadInitialData();

            expect(joinGameServiceSpy.getActivePlayers).toHaveBeenCalledWith('testRoom');
            expect(joinGameServiceSpy.onPlayersList).toHaveBeenCalled();
            expect(updateCharactersDisabledStateSpy).toHaveBeenCalledTimes(2);
            expect(updateCharactersDisabledStateSpy).toHaveBeenCalledWith(mockPlayers);
        });

        it('should not call services if source is not defined', () => {
            const updateCharactersDisabledStateSpy = spyOn<any>(component, 'updateCharactersDisabledState');
            (component as any).source = null;

            (component as any).loadInitialData();

            expect(joinGameServiceSpy.getActivePlayers).not.toHaveBeenCalled();
            expect(joinGameServiceSpy.onPlayersList).not.toHaveBeenCalled();
            expect(updateCharactersDisabledStateSpy).not.toHaveBeenCalled();
        });
    });

    describe('onBeforeUnload', () => {
        it('should set localStorage flag and prevent default if event is provided', () => {
            const mockEvent = jasmine.createSpyObj('Event', ['preventDefault']);
            component.onBeforeUnload(mockEvent as unknown as Event);
            expect(localStorage.getItem('shouldRedirectToHome')).toBe('true');
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should set localStorage flag even if no event is provided', () => {
            component.onBeforeUnload();
            expect(localStorage.getItem('shouldRedirectToHome')).toBe('true');
        });
    });

    describe('ngOnInit', () => {
        it('should reset selection and errors on initialization', () => {
            component.ngOnInit();
            expect(playerSelectionServiceSpy.resetSelection).toHaveBeenCalled();
            expect(playerSelectionServiceSpy.resetErrors).toHaveBeenCalled();
        });

        it('should not navigate to home if shouldRedirectToHome is not in localStorage', () => {
            localStorage.removeItem('shouldRedirectToHome');
            component.ngOnInit();
            expect(router.navigate).not.toHaveBeenCalledWith(['/home']);
        });
    });

    it('should set source to null if params["source"] is undefined', () => {
        const testParams = {};
        const queryParamsSubject = of(testParams);
        const activatedRouteMock = {
            queryParams: queryParamsSubject,
        };

        (component as any).route = activatedRouteMock;

        (component as any).handleQueryParamsSubscription();

        expect((component as any).source).toBeNull();
    });

    it('should navigate to /home and reset redirect flag if shouldRedirectToHome is true', () => {
        localStorage.setItem('shouldRedirectToHome', 'true');
        component.ngOnInit();

        expect(localStorage.getItem('shouldRedirectToHome')).toBe('false');
        expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
});
