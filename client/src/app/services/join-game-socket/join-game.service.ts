import { Injectable, Injector, OnDestroy } from '@angular/core';
import {
    AllWaitingRoomInfo,
    CharacterToDeselectInterface,
    CreateCombatRoomInterface,
    IsFirstInterface,
    MessageReceivedInterface,
    RoomDestroyedInterface,
    VirtualPlayerEmit,
} from '@app/interfaces/interface';
import { GameLogService } from '@app/services/game-log-service/game-log.service';
import { GameService } from '@app/services/game-service/game.service';
import { PlayingService } from '@app/services/playing-service/playing.service';
import { SocketPlayerMovementLabels, SocketWaitRoomLabels } from '@common/constants';
import { GameData, GlobalStatistics, Player } from '@common/interfaces';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class JoinGameService implements OnDestroy {
    pinCode: string = '';
    socket: Socket;
    player: Player;

    readonly playersSubject = new BehaviorSubject<Player[]>([]);
    players$ = this.playersSubject.asObservable();
    private _playingService: PlayingService | null = null;

    constructor(
        private readonly gameService: GameService,
        private readonly injector: Injector,
        private readonly gameLogService: GameLogService,
    ) {
        this.socket = io(environment.serverUrlBase);
        this.initSocketPlayersList();
    }

    get playingService(): PlayingService {
        this._playingService ??= this.injector.get(PlayingService);
        return this._playingService;
    }

    ngOnDestroy(): void {
        this.socket.removeAllListeners();
        this.socket.disconnect();
    }

    createRoom(): Observable<string> {
        return new Observable((observer) => {
            this.socket.emit(SocketWaitRoomLabels.CreateRoom, this.gameService.getNewGame());
            this.socket.once(SocketWaitRoomLabels.RoomCreated, (roomCode: string) => {
                this.pinCode = roomCode;
                observer.next(roomCode);
                observer.complete();
            });
        });
    }

    initSocketPlayersList(): void {
        this.socket.on(SocketWaitRoomLabels.PlayersList, this.playerListHandler);
    }

    joinRoom(
        pinRoom: string,
        player: Player,
    ): Observable<{ success: boolean; error?: string; currentPlayers?: number; capacity?: number; playerJoin?: string }> {
        if (!player) {
            return new Observable((observer) => observer.complete());
        }
        this.player = player;
        this.socket.emit(SocketWaitRoomLabels.JoinRoom, { roomCode: pinRoom, player });
        this.pinCode = pinRoom;
        this.playingService.localPlayer = player;

        this.gameLogService.joinRoom(pinRoom, player.name ?? '');

        return new Observable((observer) => {
            this.socket.once(
                SocketWaitRoomLabels.RoomJoined,
                (response: {
                    success: boolean;
                    error?: string;
                    currentPlayers?: number;
                    capacity?: number;
                    player?: Player;
                    playerJoin?: string;
                }) => {
                    if (response.player) {
                        this.player = response.player;
                    }
                    observer.next(response);
                    observer.complete();
                },
            );
        });
    }

    joinRoomSelectCharacter(roomCode: string) {
        this.socket.emit(SocketWaitRoomLabels.JoinRoomSelectPlayer, roomCode);
    }

    onRoomDestroyed(): Observable<RoomDestroyedInterface> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.RoomDestroyed, (data: { message: string; redirect: string }) => {
                observer.next(data);
            });
        });
    }

    isRoomExist(roomCode: string): Observable<boolean> {
        this.socket.emit(SocketWaitRoomLabels.IsRoomExist, roomCode);
        return new Observable<boolean>((observer) => {
            this.socket.on(SocketWaitRoomLabels.IsRoomExistResponse, (exists: boolean) => {
                observer.next(exists);
                observer.complete();
            });
        });
    }

    isRoomLocked(roomCode: string): Observable<boolean> {
        this.socket.emit(SocketWaitRoomLabels.IsRoomLocked, roomCode);
        return new Observable<boolean>((observer) => {
            this.socket.once(SocketWaitRoomLabels.IsRoomLockedResponse, (isLocked: boolean) => {
                observer.next(isLocked);
                observer.complete();
            });
        });
    }

    isRoomFull(roomCode: string | null): Observable<boolean> {
        this.socket.emit(SocketWaitRoomLabels.IsRoomFull, String(roomCode));
        return new Observable<boolean>((observer) => {
            this.socket.once(SocketWaitRoomLabels.GetRoomFull, (getIsRoomFull: boolean) => {
                observer.next(getIsRoomFull);
                observer.complete();
            });
        });
    }

    toggleRoomLock(roomCode: string, isLocked: boolean): void {
        this.socket.emit(SocketWaitRoomLabels.ToggleRoomLock, { roomCode, isLocked });
    }

    validatePlayerSelection(roomCode: string, player: Player): void {
        this.socket.emit(SocketWaitRoomLabels.PlayerValidated, { roomCode, player });
    }

    onCharacterToDeselect(): Observable<CharacterToDeselectInterface> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.TheCharacterToDeselect, (data: CharacterToDeselectInterface) => {
                observer.next(data);
            });
        });
    }

    onCharacterDeselected(): Observable<CharacterToDeselectInterface> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.TheCharacterDeselected, (data: CharacterToDeselectInterface) => {
                observer.next(data);
            });
        });
    }

    getActivePlayers(roomCode: string): Observable<Player[]> {
        this.socket.emit(SocketWaitRoomLabels.GetActivePlayers, roomCode);
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.ActivePlayers, (players: Player[]) => {
                observer.next(players);
                observer.complete();
            });
        });
    }

    onPlayersList(): Observable<Player[]> {
        return this.players$;
    }

    isAdmin(roomCode: string, player: Player | undefined): Observable<boolean> {
        this.socket.emit(SocketWaitRoomLabels.IsFirstPlayer, { roomCode, player });
        return new Observable<boolean>((observer) => {
            this.socket.once(SocketWaitRoomLabels.IsFirstPlayerResponse, (response: IsFirstInterface) => {
                observer.next(response.isFirst);
                observer.complete();
            });
        });
    }

    getGameId(roomCode: string | null) {
        this.socket.emit(SocketWaitRoomLabels.GetGameID, roomCode);
        return new Observable<string>((observer) => {
            this.socket.on(SocketWaitRoomLabels.ReturnGameID, (idGame: string) => {
                observer.next(idGame);
                observer.complete();
            });
        });
    }

    getGameSize(roomCode: string) {
        this.socket.emit(SocketWaitRoomLabels.GetGameSize, roomCode);
        return new Observable<string>((observer) => {
            this.socket.on(SocketWaitRoomLabels.ReturnGameSize, (idGame: string) => {
                observer.next(idGame);
                observer.complete();
            });
        });
    }

    getAllINformation(player: string, roomCode: string): Observable<AllWaitingRoomInfo> {
        this.socket.emit(SocketWaitRoomLabels.GetAllPlayerAndGameInfo, { player, roomCode });

        return new Observable<AllWaitingRoomInfo>((observer) => {
            this.socket.on(SocketWaitRoomLabels.ToAllInformation, (allValue: AllWaitingRoomInfo) => {
                observer.next(allValue);
                observer.complete();
            });
        });
    }

    getAllGlobalInfo(roomCode: string): Observable<GlobalStatistics> {
        this.socket.emit(SocketWaitRoomLabels.GetAllGlobalInfo, { roomCode });

        return new Observable<GlobalStatistics>((observer) => {
            this.socket.on(SocketWaitRoomLabels.ToAllGlobalInfo, (allValue: GlobalStatistics) => {
                observer.next(allValue);
                observer.complete();
            });
        });
    }

    getAllInfo(roomCode: string): Observable<GameData> {
        this.socket.emit(SocketWaitRoomLabels.GetAllGame, { roomCode });

        return new Observable<GameData>((observer) => {
            this.socket.on(SocketWaitRoomLabels.ToAllForGame, (allValue: GameData) => {
                observer.next(allValue);
                observer.complete();
            });
        });
    }

    onKicked(): Observable<{ message: string; redirect: string }> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.Kicked, (data: { message: string; redirect: string }) => {
                observer.next(data);
            });
        });
    }

    selectCharacter(roomCode: string, avatarUrl: string): void {
        this.socket.emit(SocketWaitRoomLabels.CharacterSelected, { roomCode, player: this.player, avatarUrl });
    }

    deselectCharacterForRoom(roomCode: string, avatarUrl: string): void {
        this.socket.emit(SocketWaitRoomLabels.CharacterDeselected, { roomCode, avatarUrl });
    }

    onCharacterSelected(): Observable<string> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.CharacterSelected, (avatarUrl: string) => {
                observer.next(avatarUrl);
            });
        });
    }

    startGame(roomCode: string, players: Player[]): void {
        this.socket.emit(SocketPlayerMovementLabels.StartGame, { roomCode, players });
        this.socket.emit(SocketPlayerMovementLabels.EndTurn, {
            roomCode: this.pinCode,
            playerTurn: null,
            isNotification: true,
        });
    }

    joinAndCreateGameRoomCombat(firstPlayer: Player, secondPlayer: Player): void {
        this.socket.emit(SocketWaitRoomLabels.CreateAndJoinGameRoom, { firstPlayer, secondPlayer });
    }

    onRoomCreated(): Observable<CreateCombatRoomInterface> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.CodeGameCombatRoom, (data: CreateCombatRoomInterface) => {
                observer.next(data);
            });
        });
    }

    emitVirtualPlayer(): Observable<VirtualPlayerEmit> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.EmitVirtualPlayer, (data: VirtualPlayerEmit) => {
                observer.next(data);
            });
        });
    }

    onMessageReceived(): Observable<MessageReceivedInterface> {
        return new Observable((observer) => {
            this.socket.on(SocketWaitRoomLabels.OnSendMessageCombatRoom, (data: MessageReceivedInterface) => {
                observer.next(data);
            });
        });
    }

    sendMessage(roomCode: string, message: string, userName: string): void {
        this.socket.emit(SocketWaitRoomLabels.SendMessageCombatRoom, { roomCode, message, userName });
    }

    private readonly playerListHandler = (players: Player[]) => {
        this.playersSubject.next(players);
    };
}
