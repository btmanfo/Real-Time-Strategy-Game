/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
/* eslint-disable import/no-deprecated */
// Usage temporaire de HttpClientTestingModule autorisée dans les fichiers de test unitaires */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardService } from '@app/services/board-service/board.service';
import { MovingGameService } from '@app/services/moving-game-service/moving-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { PlayingSocketService } from '@app/services/playing-socket-service/playing-socket.service';
import { Item, Player, Position, Tile } from '@common/interfaces';
import { Socket } from 'socket.io-client';
import { PopupItemChoiceComponent } from './popup-item-choice.component';

describe('PopupItemChoiceComponent', () => {
    let component: PopupItemChoiceComponent;
    let fixture: ComponentFixture<PopupItemChoiceComponent>;
    let movingGameServiceSpy: jasmine.SpyObj<MovingGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;
    let boardServiceSpy: jasmine.SpyObj<BoardService>;
    let mockPlayingSocketService: jasmine.SpyObj<PlayingSocketService>;
    beforeEach(async () => {
        const mockPlayer: Player = {
            name: 'Test Player',
            inventory: [
                {
                    name: 'Test Item',
                    position: { x: 2, y: 3 },
                    image: 'test-image.png',
                    id: 123,
                    type: 'test-type',
                    quantity: 1,
                    description: 'Test Description',
                    isOutOfContainer: false,
                } as Item,
                {
                    name: 'Test Item 2',
                    position: { x: 1, y: 1 },
                    image: 'test-image-2.png',
                    id: 456,
                    type: 'test-type-2',
                    quantity: 2,
                    description: 'Test Description 2',
                    isOutOfContainer: false,
                } as Item,
                {
                    name: 'Test Item 3',
                    position: { x: 2, y: 2 },
                    image: 'test-image-3.png',
                    id: 789,
                    type: 'test-type-3',
                    quantity: 3,
                    description: 'Test Description 3',
                    isOutOfContainer: false,
                },
            ],
            coordinate: { x: 0, y: 0 },
            victories: 0,
            avatarUrl: 'test-avatar.png',
        } as Player;
        const mockTile: Tile = {
            position: { x: 0, y: 0 },
            type: 'A',
            cost: 1,
            item: null,
        } as Tile;
        const mockSocket = {
            emit: jasmine.createSpy('emit'),
        } as any as Socket;
        mockPlayingSocketService = jasmine.createSpyObj('PlayingSocketService', ['endTurn']);
        movingGameServiceSpy = jasmine.createSpyObj('MovingGameService', ['getPlayerTile', 'isPopupItemChoiceVisible']);
        playingServiceSpy = jasmine.createSpyObj('PlayingService', ['localPlayer', 'socket', 'joinGameService']);
        boardServiceSpy = jasmine.createSpyObj('BoardService', ['tiles']);
        movingGameServiceSpy.getPlayerTile.and.returnValue(mockTile);
        playingServiceSpy.localPlayer = mockPlayer;
        playingServiceSpy.socket = mockSocket;
        (playingServiceSpy as any).joinGameService = { pinCode: '1234' } as any;
        boardServiceSpy.tiles = [mockTile];

        await TestBed.configureTestingModule({
            imports: [PopupItemChoiceComponent, HttpClientTestingModule],
            providers: [
                { provide: MovingGameService, useValue: movingGameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
                { provide: BoardService, useValue: boardServiceSpy },
                { provide: PlayingSocketService, useValue: mockPlayingSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PopupItemChoiceComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set isPopupItemChoiceVisible to false on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(movingGameServiceSpy.isPopupItemChoiceVisible).toBeFalse();
    });

    it('should not remove item if there is no localPlayer', () => {
        playingServiceSpy.localPlayer = null;
        component.chooseItem(0);
        expect(playingServiceSpy.localPlayer).toBeNull();
        expect(playingServiceSpy.socket.emit).toHaveBeenCalledWith('itemChoice', {
            item: undefined,
            playerPosition: {},
            roomCode: '1234',
        });
        expect(boardServiceSpy.tiles[0].item).toBeNull();
    });

    it('should remove item from inventory and place it on tile when chooseItem is called', () => {
        component.chooseItem(0);
        expect(playingServiceSpy.localPlayer?.inventory?.length).toBe(2);
        expect(boardServiceSpy.tiles[0].item?.name).toEqual('Test Item');
        expect(playingServiceSpy.localPlayer?.inventory).not.toContain({
            name: 'Test Item',
            position: { x: 2, y: 3 },
            image: 'test-image.png',
            id: 123,
            type: 'test-type',
            quantity: 1,
            description: 'Test Description',
            isOutOfContainer: false,
        } as Item);
        expect(playingServiceSpy.socket.emit).toHaveBeenCalledWith('itemChoice', {
            item: {
                name: 'Test Item',
                position: { x: 2, y: 3 },
                image: 'test-image.png',
                id: 123,
                type: 'test-type',
                quantity: 1,
                description: 'Test Description',
                isOutOfContainer: false,
            } as Item,
            playerPosition: { x: 0, y: 0 },
            roomCode: '1234',
        });
    });

    it('should handle playerPosition being undefined in chooseItem', () => {
        movingGameServiceSpy.getPlayerTile.and.returnValue(undefined);
        component.chooseItem(0);
        expect(playingServiceSpy.socket.emit).toHaveBeenCalledWith(
            'itemChoice',
            jasmine.objectContaining({
                playerPosition: {} as Position,
            }),
        );
    });
});
