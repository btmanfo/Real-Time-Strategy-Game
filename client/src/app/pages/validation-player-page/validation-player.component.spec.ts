/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Usage temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires */

import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ValidationPlayerComponent } from '@app/pages/validation-player-page/validation-player.component';
import { GameService } from '@app/services/game-service/game.service';
import { NotificationService } from '@app/services/notification-service/notification.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { ValidationPlayerService } from '@app/services/validation-player-service/validation-player-service.service';
import { GameSize, Player } from '@common/interfaces';
import { BehaviorSubject } from 'rxjs';

describe('ValidationPlayerComponent', () => {
    let component: ValidationPlayerComponent;
    let fixture: ComponentFixture<ValidationPlayerComponent>;

    let validationPlayerServiceMock: jasmine.SpyObj<ValidationPlayerService>;
    let routerMock: jasmine.SpyObj<Router>;
    let activatedRouteMock: { queryParams: BehaviorSubject<any> };
    let notificationServiceMock: jasmine.SpyObj<NotificationService>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let routerUrlValue = '/validation-player';

    function setRouterUrl(url: string): void {
        routerUrlValue = url;
    }

    const fakeGame = {
        name: 'TestMap',
        gameMode: 'CTF',
        id: '',
        description: '',
        size: GameSize.bigSize,
        visibility: false,
        map: [],
        map2: [],
        modificationDate: '',
        screenshot: '',
    };

    const mockPlayers: Player[] = [
        {
            name: 'player1',
            life: 0,
            speed: 0,
            attack: null,
            defense: null,
            avatarUrl: null,
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        },
        {
            name: 'player2',
            life: 0,
            speed: 0,
            attack: null,
            defense: null,
            avatarUrl: null,
            coordinate: { x: 0, y: 0 },
            isAdmin: false,
        },
    ];

    beforeEach(async () => {
        localStorage.removeItem('shouldRedirectToHome');

        validationPlayerServiceMock = jasmine.createSpyObj(
            'ValidationPlayerService',
            [
                'init',
                'destroy',
                'notifyServerOnLeave',
                'navigateHome',
                'adminManuallyKick',
                'toggleLock',
                'startGame',
                'isRoomFull',
                'canAddVirtualPlayer',
            ],
            {
                players: mockPlayers,
                accessCode: 'ABC123',
                isLocked: false,
                isAdministrateur: true,
                players$: new BehaviorSubject<Player[]>(mockPlayers),
            },
        );

        routerMock = jasmine.createSpyObj('Router', ['navigate']);
        Object.defineProperty(routerMock, 'url', {
            get: () => routerUrlValue,
        });

        activatedRouteMock = {
            queryParams: new BehaviorSubject({ source: 'player1', code: 'ABC123' }),
        };

        notificationServiceMock = jasmine.createSpyObj('NotificationService', [], {
            showModal: false,
            errorMessages: [],
        });

        const playingServiceMock = jasmine.createSpyObj('PlayingService', ['getGameWinner'], {
            localPlayer: mockPlayers[0],
            players: mockPlayers,
        });
        gameServiceMock = jasmine.createSpyObj('GameService', ['getNewGame']);
        gameServiceMock.getNewGame.and.returnValue(fakeGame);

        await TestBed.configureTestingModule({
            imports: [CommonModule, HttpClientTestingModule, RouterTestingModule, ValidationPlayerComponent],
            providers: [
                { provide: ValidationPlayerService, useValue: validationPlayerServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
                { provide: NotificationService, useValue: notificationServiceMock },
                { provide: PlayingService, useValue: playingServiceMock },
                { provide: GameService, useValue: gameServiceMock },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        })
            .overrideComponent(ValidationPlayerComponent, {
                set: {
                    providers: [
                        { provide: ValidationPlayerService, useValue: validationPlayerServiceMock },
                        { provide: Router, useValue: routerMock },
                        { provide: ActivatedRoute, useValue: activatedRouteMock },
                        { provide: NotificationService, useValue: notificationServiceMock },
                        { provide: PlayingService, useValue: playingServiceMock },
                        { provide: GameService, useValue: gameServiceMock },
                    ],
                },
            })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ValidationPlayerComponent);
        component = fixture.componentInstance;
        (validationPlayerServiceMock.players$ as BehaviorSubject<Player[]>).next(mockPlayers);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should initialize with query params', () => {
            expect(validationPlayerServiceMock.init).toHaveBeenCalledWith('player1', 'ABC123');
        });
    });

    describe('Getters', () => {
        it('should return accessCode from service', () => {
            expect(component.accessCodeValue).toBe('ABC123');
        });

        it('should return players from service', () => {
            expect(component.playersValue).toEqual(mockPlayers);
        });

        it('should return isLocked from service', () => {
            expect(component.isLockedValue).toBe(false);
        });

        it('should return isAdministrateur from service', () => {
            expect(component.isAdministrateurValue).toBe(true);
        });
    });

    describe('Virtual Player Management', () => {
        it('should open virtual player modal', () => {
            component.openVirtualPlayerModal();
            expect(component.showVirtualPlayerModal).toBe(true);
        });

        it('should close virtual player modal', () => {
            component.showVirtualPlayerModal = true;
            component.closeVirtualPlayerModal();
            expect(component.showVirtualPlayerModal).toBe(false);
        });

        it('should generate virtual player when conditions are met', () => {
            validationPlayerServiceMock.canAddVirtualPlayer.and.returnValue(true);
            component.generateVirtualPlayer();
            expect(component.showVirtualPlayerModal).toBe(true);
        });

        it('should not generate virtual player when conditions are not met', () => {
            validationPlayerServiceMock.canAddVirtualPlayer.and.returnValue(false);
            component.generateVirtualPlayer();
            expect(component.showVirtualPlayerModal).toBe(false);
        });
    });

    describe('Room Management', () => {
        it('should check if room is full', () => {
            validationPlayerServiceMock.isRoomFull.and.returnValue(true);
            expect(component.isRoomFull()).toBe(true);
        });

        it('should toggle lock', () => {
            component.toggleLock();
            expect(validationPlayerServiceMock.toggleLock).toHaveBeenCalled();
        });

        it('should start game', () => {
            component.startGame();
            expect(validationPlayerServiceMock.startGame).toHaveBeenCalled();
        });

        it('should toggle chat visibility', () => {
            const initialChatState = component.isChatOpen;
            component.displayChat();
            expect(component.isChatOpen).toBe(!initialChatState);
        });
    });

    describe('Leave Room Management', () => {
        it('should open leave confirmation popup', () => {
            component.confirmLeaveRoom();
            expect(component.showLeaveConfirmationPopup).toBe(true);
        });

        it('should close leave confirmation popup', () => {
            component.showLeaveConfirmationPopup = true;
            component.closeLeaveConfirmationPopup();
            expect(component.showLeaveConfirmationPopup).toBe(false);
        });

        it('should handle leave confirmation when confirmed', () => {
            spyOn(component, 'leaveRoom');
            component.handleLeaveConfirmation(true);
            expect(component.showLeaveConfirmationPopup).toBe(false);
            expect(component.leaveRoom).toHaveBeenCalled();
        });

        it('should handle leave confirmation when cancelled', () => {
            spyOn(component, 'leaveRoom');
            component.handleLeaveConfirmation(false);
            expect(component.showLeaveConfirmationPopup).toBe(false);
            expect(component.leaveRoom).not.toHaveBeenCalled();
        });

        it('should notify server and navigate home when leaving room', () => {
            component.leaveRoom();
            expect(validationPlayerServiceMock.notifyServerOnLeave).toHaveBeenCalled();
            expect(validationPlayerServiceMock.navigateHome).toHaveBeenCalled();
        });

        it('should notify server on window unload', () => {
            const event = new Event('beforeunload');
            component.onBeforeUnload(event);
            expect(validationPlayerServiceMock.notifyServerOnLeave).toHaveBeenCalled();
            expect(localStorage.getItem('shouldRedirectToHome')).toBe('true');
        });
    });

    describe('Player Management', () => {
        it('should kick player as admin', () => {
            const playerToKick = mockPlayers[1];
            component.adminManuallyKick(playerToKick);
            expect(validationPlayerServiceMock.adminManuallyKick).toHaveBeenCalledWith(playerToKick);
        });

        it('should not navigate home if other player is removed', fakeAsync(() => {
            const newPlayers = [mockPlayers[0]];
            (validationPlayerServiceMock.players$ as BehaviorSubject<Player[]>).next(newPlayers);
            tick();
            expect(validationPlayerServiceMock.navigateHome).not.toHaveBeenCalled();
        }));
    });

    describe('Component Lifecycle', () => {
        it('should destroy service on component destroy', () => {
            component.ngOnDestroy();
            expect(validationPlayerServiceMock.destroy).toHaveBeenCalled();
        });
    });

    it('should have modals closed by default', () => {
        expect(component.showVirtualPlayerModal).toBeFalse();
        expect(component.showLeaveConfirmationPopup).toBeFalse();
    });
    describe('ValidationPlayerComponent Additional Coverage', () => {
        describe('destroy$ Subject', () => {
            it('should unsubscribe from queryParams when component is destroyed', () => {
                validationPlayerServiceMock.destroy.calls.reset();

                component.ngOnDestroy();

                expect(validationPlayerServiceMock.destroy).toHaveBeenCalled();
            });
        });

        describe('shouldRedirectToHome', () => {
            it('should return true when shouldRedirectToHome is true and not on playingGame page', () => {
                localStorage.setItem('shouldRedirectToHome', 'true');

                setRouterUrl('/validation-player');

                const result = component['shouldRedirectToHome']();

                expect(result).toBeTrue();
            });

            it('should return false when on playingGame page, even if shouldRedirectToHome is true', () => {
                localStorage.setItem('shouldRedirectToHome', 'true');

                setRouterUrl('/playingGame');

                const result = component['shouldRedirectToHome']();

                expect(result).toBeFalse();
            });

            it('should return false when shouldRedirectToHome is false', () => {
                localStorage.setItem('shouldRedirectToHome', 'false');

                const result = component['shouldRedirectToHome']();

                expect(result).toBeFalse();
            });

            it('should return false when shouldRedirectToHome is not set', () => {
                localStorage.removeItem('shouldRedirectToHome');

                const result = component['shouldRedirectToHome']();

                expect(result).toBeFalse();
            });
        });

        describe('redirectToHome', () => {
            it('should set localStorage and navigate home', () => {
                component['redirectToHome']();

                expect(localStorage.getItem('shouldRedirectToHome')).toBe('false');

                expect(validationPlayerServiceMock.navigateHome).toHaveBeenCalled();
            });
        });

        describe('Component initialization with redirect', () => {
            it('should redirect to home and not initialize the component if shouldRedirectToHome returns true', () => {
                localStorage.setItem('shouldRedirectToHome', 'true');
                setRouterUrl('/validation-player');

                validationPlayerServiceMock.init.calls.reset();
                validationPlayerServiceMock.navigateHome.calls.reset();

                component.ngOnInit();

                expect(validationPlayerServiceMock.navigateHome).toHaveBeenCalled();

                expect(validationPlayerServiceMock.init).not.toHaveBeenCalled();
            });

            it('should initialize the component if shouldRedirectToHome returns false', () => {
                localStorage.setItem('shouldRedirectToHome', 'false');

                validationPlayerServiceMock.init.calls.reset();

                component.ngOnInit();

                expect(validationPlayerServiceMock.init).toHaveBeenCalled();
            });
        });

        describe('fetchQueryParams', () => {
            it('should handle empty query parameters', () => {
                activatedRouteMock.queryParams.next({});

                component['fetchQueryParams']();

                component['initComponent']();

                expect(validationPlayerServiceMock.init).toHaveBeenCalledWith('', '');
            });

            it('should handle partial query parameters', () => {
                activatedRouteMock.queryParams.next({ source: 'player1' });

                component['fetchQueryParams']();

                component['initComponent']();

                expect(validationPlayerServiceMock.init).toHaveBeenCalledWith('player1', '');
            });
        });
    });
});
