import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameLogComponent } from '@app/components/game-log/game-log.component';
import {
    CURRENT_MESSAGE,
    HIDE_SWITCH_BUTTON,
    IS_MESSAGE_TOO_LONG,
    IS_SWITCHED,
    MAX_CHAT_MESSAGE_LENGTH,
    TIME_FOR_DOM,
} from '@app/constants/constants';
import { ChatSocketService } from '@app/services/chat-system-socket/chat-system-socket.service';
import { JoinGameService } from '@app/services/join-game-socket/join-game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { ChatMessage } from '@common/interfaces';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-chat-system',
    standalone: true,
    imports: [FormsModule, CommonModule, GameLogComponent],
    templateUrl: './chat-system.component.html',
    styleUrls: ['./chat-system.component.scss'],
    providers: [ChatSocketService],
})
export class ChatSystemComponent implements OnInit, OnDestroy {
    @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
    currentMessage = CURRENT_MESSAGE;
    maxMessageLength = MAX_CHAT_MESSAGE_LENGTH;
    isMessageTooLong = IS_MESSAGE_TOO_LONG;
    isSwitched = IS_SWITCHED;
    hideSwitchButton = HIDE_SWITCH_BUTTON;
    messages: ChatMessage[] = [];
    private readonly subscriptions: Subscription[] = [];
    private readonly destroy$: Subject<void> = new Subject<void>();

    constructor(
        private readonly playingService: PlayingService,
        private readonly chatSocket: ChatSocketService,
        private readonly joinGameService: JoinGameService,
        private readonly router: Router,
    ) {}

    get myPlayer() {
        return this.playingService.localPlayer;
    }

    get canSendMessage(): boolean {
        return !!this.myPlayer && !this.isMessageTooLong;
    }

    updateMessageLength(): void {
        this.isMessageTooLong = this.currentMessage.length > this.maxMessageLength;
    }

    ngOnInit() {
        if (!this.myPlayer) return;

        this.hideSwitchButton = this.router.url.includes('/validate/');

        this.chatSocket.joinChatRoom(this.joinGameService.pinCode, this.myPlayer.name ?? '');
        this.subscribeToChatHistory();
        this.initializeSubscriptions();
    }

    formatTime(timestamp: string | Date): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    sendMessage(): void {
        if (!this.currentMessage.trim() || !this.canSendMessage || !this.myPlayer) return;

        const chatMessage: ChatMessage = {
            message: this.currentMessage,
            playerName: this.myPlayer.name ?? '',
            timestamp: new Date(),
        };

        this.chatSocket.emitMessage(chatMessage, this.joinGameService.pinCode);
        this.currentMessage = '';
        this.updateMessageLength();
        setTimeout(() => {
            this.scrollToBottom();
        }, TIME_FOR_DOM);
    }

    ngOnDestroy() {
        if (this.myPlayer) {
            this.chatSocket.leaveChatRoom(this.joinGameService.pinCode, this.myPlayer.name ?? '');
        }
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.destroy$.next();
        this.destroy$.complete();
    }

    getTime(message: ChatMessage): string {
        return this.formatTime(message.timestamp ?? '');
    }

    swtichChatToLog(): void {
        this.isSwitched = !this.isSwitched;
    }

    private addSystemMessage(message: string): void {
        this.messages.push({
            message,
            playerName: 'System',
            timestamp: new Date(),
        });
    }

    private subscribeToChatHistory(): void {
        this.subscriptions.push(
            this.chatSocket
                .onChatHistory()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (history: ChatMessage[]) => {
                        this.messages = history;
                    },
                }),
        );
    }

    private initializeSubscriptions(): void {
        this.subscribeToNewMessages();
        this.subscribeToPlayerJoined();
        this.subscribeToPlayerLeft();
        this.subscribeToErrors();
    }

    private subscribeToNewMessages(): void {
        this.subscriptions.push(
            this.chatSocket
                .onNewMessage()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (message: ChatMessage) => {
                        this.messages.push(message);
                    },
                }),
        );
    }

    private subscribeToPlayerJoined(): void {
        this.subscriptions.push(
            this.chatSocket
                .onPlayerJoined()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (notification: string) => {
                        this.addSystemMessage(notification);
                    },
                }),
        );
    }

    private subscribeToPlayerLeft(): void {
        this.subscriptions.push(
            this.chatSocket
                .onPlayerLeft()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (notification: string) => {
                        this.addSystemMessage(notification);
                    },
                }),
        );
    }

    private subscribeToErrors(): void {
        this.subscriptions.push(
            this.chatSocket
                .onError()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (error: string) => {
                        this.addSystemMessage(`Error: ${error}`);
                    },
                }),
        );
    }
    private scrollToBottom(): void {
        try {
            this.scrollAnchor.nativeElement.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            throw new Error('Scroll failed:' + err);
        }
    }
}
