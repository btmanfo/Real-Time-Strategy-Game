/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires

import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatSocketService } from '@app/services/chat-system-socket/chat-system-socket.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { ChatMessage } from '@common/interfaces';
import { Subject } from 'rxjs';
import { ChatSystemComponent } from './chat-system.component';

describe('ChatSystemComponent', () => {
    let component: ChatSystemComponent;
    let fixture: ComponentFixture<ChatSystemComponent>;
    let chatSocketServiceSpy: jasmine.SpyObj<ChatSocketService>;
    let joinGameServiceSpy: jasmine.SpyObj<JoinGameService>;
    let playingServiceSpy: jasmine.SpyObj<PlayingService>;

    let chatHistorySubject: Subject<ChatMessage[]>;
    let newMessageSubject: Subject<ChatMessage>;
    let playerJoinedSubject: Subject<string>;
    let playerLeftSubject: Subject<string>;
    let errorSubject: Subject<string>;

    beforeEach(async () => {
        chatSocketServiceSpy = jasmine.createSpyObj('ChatSocketService', [
            'joinChatRoom',
            'leaveChatRoom',
            'onChatHistory',
            'onNewMessage',
            'onPlayerJoined',
            'onPlayerLeft',
            'onError',
            'emitMessage',
        ]);
        joinGameServiceSpy = jasmine.createSpyObj('JoinGameService', [], { pinCode: '1234' });
        playingServiceSpy = jasmine.createSpyObj('PlayingService', [], { localPlayer: { name: 'Player1' } });

        chatHistorySubject = new Subject<ChatMessage[]>();
        newMessageSubject = new Subject<ChatMessage>();
        playerJoinedSubject = new Subject<string>();
        playerLeftSubject = new Subject<string>();
        errorSubject = new Subject<string>();

        chatSocketServiceSpy.onChatHistory.and.returnValue(chatHistorySubject.asObservable());
        chatSocketServiceSpy.onNewMessage.and.returnValue(newMessageSubject.asObservable());
        chatSocketServiceSpy.onPlayerJoined.and.returnValue(playerJoinedSubject.asObservable());
        chatSocketServiceSpy.onPlayerLeft.and.returnValue(playerLeftSubject.asObservable());
        chatSocketServiceSpy.onError.and.returnValue(errorSubject.asObservable());

        await TestBed.configureTestingModule({
            imports: [ChatSystemComponent],
            providers: [
                { provide: JoinGameService, useValue: joinGameServiceSpy },
                { provide: PlayingService, useValue: playingServiceSpy },
            ],
        }).compileComponents();

        TestBed.overrideComponent(ChatSystemComponent, {
            set: {
                providers: [{ provide: ChatSocketService, useValue: chatSocketServiceSpy }],
            },
        });

        fixture = TestBed.createComponent(ChatSystemComponent);
        component = fixture.componentInstance;
        const scrollContainerMock = document.createElement('div');

        component['scrollAnchor'] = {
            nativeElement: scrollContainerMock,
        } as ElementRef;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call joinChatRoom on initialization if a player is present', () => {
        component.ngOnInit();
        expect(chatSocketServiceSpy.joinChatRoom).toHaveBeenCalledWith('1234', 'Player1');
    });

    it('should correctly update the message length', () => {
        component.currentMessage = 'Hello';
        component.maxMessageLength = 10;
        component.updateMessageLength();
        expect(component.isMessageTooLong).toBeFalse();

        component.currentMessage = 'Hello, this message is too long';
        component.updateMessageLength();
        expect(component.isMessageTooLong).toBeTrue();
    });

    it('should send a valid message', () => {
        component.ngOnInit();
        component.currentMessage = 'Test Message';
        component.isMessageTooLong = false;
        component.sendMessage();
        expect(chatSocketServiceSpy.emitMessage).toHaveBeenCalled();
        expect(component.currentMessage).toEqual('');
    });

    it('should not send a message if the message is empty or invalid', () => {
        component.ngOnInit();
        component.currentMessage = '   ';
        component.sendMessage();
        expect(chatSocketServiceSpy.emitMessage).not.toHaveBeenCalled();
    });

    it('should add a system message when a notification is received from playerJoined', () => {
        component.ngOnInit();
        const notificationText = 'Player joined the chat.';
        playerJoinedSubject.next(notificationText);
        const systemMessage = component.messages.find((msg: ChatMessage) => msg.playerName === 'System');
        expect(systemMessage).toBeTruthy();
        expect(systemMessage?.message).toContain(notificationText);
    });

    it('should add a system message when a notification is received from playerLeft', () => {
        component.ngOnInit();
        const notificationText = 'Player left the chat.';
        playerLeftSubject.next(notificationText);
        const systemMessage = component.messages.find((msg: ChatMessage) => msg.playerName === 'System');
        expect(systemMessage).toBeTruthy();
        expect(systemMessage?.message).toContain(notificationText);
    });

    it('should add a system error message when an error is received', () => {
        component.ngOnInit();
        const errorText = 'Unable to send message';
        errorSubject.next(errorText);
        const systemErrorMessage = component.messages.find((msg: ChatMessage) => msg.playerName === 'System');
        expect(systemErrorMessage).toBeTruthy();
        expect(systemErrorMessage?.message).toEqual(`Error: ${errorText}`);
    });

    it('should call leaveChatRoom on destruction if a player is present', () => {
        component.ngOnInit();
        component.ngOnDestroy();
        expect(chatSocketServiceSpy.leaveChatRoom).toHaveBeenCalledWith('1234', 'Player1');
    });

    it('should update the message list with history via onChatHistory', () => {
        const history: ChatMessage[] = [
            { message: 'History 1', playerName: 'PlayerA', timestamp: new Date() },
            { message: 'History 2', playerName: 'PlayerB', timestamp: new Date() },
        ];
        component.ngOnInit();
        chatHistorySubject.next(history);
        expect(component.messages).toEqual(history);
    });

    it('should add a new message via onNewMessage', () => {
        const newMsg: ChatMessage = { message: 'New message', playerName: 'PlayerC', timestamp: new Date() };
        component.ngOnInit();
        component.messages = [];
        newMessageSubject.next(newMsg);
        expect(component.messages).toContain(newMsg);
    });

    it('should correctly format a timestamp via formatTime', () => {
        const testDate = new Date('2023-01-01T10:20:30');
        const formatted = component.formatTime(testDate);
        expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should return formatted time via getTime', () => {
        const testDate = new Date('2023-01-01T10:20:30');
        const chatMessage: ChatMessage = { message: 'Test', playerName: 'Player', timestamp: testDate };
        const formatted = component.getTime(chatMessage);
        expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should call leaveChatRoom and unsubscribe from all subscriptions on destroy', () => {
        const mockSubscription1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        const mockSubscription2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);

        (component as any).subscriptions = [mockSubscription1, mockSubscription2];

        component.ngOnInit();
        component.ngOnDestroy();

        expect(chatSocketServiceSpy.leaveChatRoom).toHaveBeenCalledWith('1234', 'Player1');
        expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
        expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
    });

    it('should call leaveChatRoom and unsubscribe from all subscriptions if myPlayer is defined', () => {
        const mockSub1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        const mockSub2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);

        component.ngOnInit();

        (component as any).subscriptions = [mockSub1, mockSub2];

        component.ngOnDestroy();

        expect(chatSocketServiceSpy.leaveChatRoom).toHaveBeenCalledWith('1234', 'Player1');
        expect(mockSub1.unsubscribe).toHaveBeenCalled();
        expect(mockSub2.unsubscribe).toHaveBeenCalled();
    });

    it('should return a default value or handle missing timestamp gracefully in getTime', () => {
        const chatMessage: ChatMessage = { message: 'No timestamp', playerName: 'Player', timestamp: undefined as any };
        const formatted = component.getTime(chatMessage);

        expect(formatted).toBeDefined();
        expect(typeof formatted).toBe('string');
    });

    it('should call leaveChatRoom with correct pin and player name on destroy if myPlayer is defined', () => {
        component.ngOnInit();

        component.ngOnDestroy();

        expect(chatSocketServiceSpy.leaveChatRoom).toHaveBeenCalledWith('1234', 'Player1');
    });

    it('should call leaveChatRoom when myPlayer is defined', () => {
        component.ngOnInit();

        const mockSub1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        const mockSub2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
        (component as any).subscriptions = [mockSub1, mockSub2];

        component.ngOnDestroy();

        expect(chatSocketServiceSpy.leaveChatRoom).toHaveBeenCalledWith('1234', 'Player1');
        expect(mockSub1.unsubscribe).toHaveBeenCalled();
        expect(mockSub2.unsubscribe).toHaveBeenCalled();
    });

    it('should toggle isSwitched when swtichChatToLog is called', () => {
        const initialValue = component.isSwitched;
        component.swtichChatToLog();
        expect(component.isSwitched).toBe(!initialValue);
        component.swtichChatToLog();
        expect(component.isSwitched).toBe(initialValue);
    });

    it('should throw an error if scrollIntoView fails in scrollToBottom', () => {
        const faultyElementRef = {
            nativeElement: {
                scrollIntoView: () => {
                    throw new Error('Mock scroll failure');
                },
            },
        };
        (component as any).scrollAnchor = faultyElementRef;
        expect(() => (component as any).scrollToBottom()).toThrowError(/Scroll failed:Error: Mock scroll failure/);
    });
});
