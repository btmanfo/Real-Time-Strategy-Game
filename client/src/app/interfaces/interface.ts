import { Item, Tile } from '@common/interfaces';

export interface Game {
    id: string;
    description: string;
    name: string;
    size: string;
    gameMode: string;
    visibility: boolean;
    map: Tile[];
    map2: Tile[];
    modificationDate: string;
    screenshot: string;
}
export interface NotifcationInterface {
    showModal: boolean;
    errorMessages: string[];
}
export interface OnMessageReceivedInterface {
    message: string;
    roomCode: string;
    userName?: string;
}

export interface CalculateDiceRollsInterface {
    attackerBonus: number;
    defenderBonus: number;
}
export interface CreateRoomInterface {
    codeRoom: string;
    theFirstPlayer: Player;
    theSecondPlayer: Player;
}
export interface DebugModeInterface {
    isDebugMode: boolean;
}
export interface Coordinate {
    x: number;
    y: number;
}

export interface UpdateDiceRollsInterface {
    attackerRoll: number;
    defenderRoll: number;
}

export interface SelectDeselectSubscriptionInterface {
    theUrlOfSelectPlayer: string;
    theRoomCodeToDesable: string;
}
export interface Player {
    name: string | null;
    life: number;
    speed: number;
    attack: string | null;
    defense: string | null;
    avatarUrl: string | null;
    coordinate: Coordinate;
    isAdmin: boolean;
    numberOfWins?: number;
    isVirtualPlayer?: boolean;
    agressive?: boolean;
    spawnPoint?: Position;
    victories?: number;
    isOnIce?: boolean;
    inventory?: Item[];
    team?: string;
}

export interface AllWaitingRoomInfo {
    game: Game;
    playerName: string;
    playerIndex: string;
    roomCode: string;
    allPlayer: Player[];
    roomSize: string;
}

export interface RoomDestroyedInterface {
    message: string;
    redirect: string;
}
export interface CharacterToDeselectInterface {
    theUrlOfSelectPlayer: string;
    theRoomCodeToDesable: string;
}

export interface IsFirstInterface {
    isFirst: boolean;
}

export interface CreateCombatRoomInterface {
    codeRoom: string;
    theFirstPlayer: Player;
    theSecondPlayer: Player;
}

export interface VirtualPlayerEmit {
    codeRoom: string;
    currentPlayer: Player;
}

export interface MessageReceivedInterface {
    message: string;
    roomCode: string;
    userName: string;
}
export interface TileAndCostInterface {
    tile: Tile;
    cost: number;
}

export interface NotifcationVisibilityInterface {
    name: string;
    visibility: boolean;
}

export interface GameIdAndNameInterface {
    id: string;
    name: string;
}

export interface GameLogInterface {
    room: string;
    attacker: Player;
    defender: Player;
    roll1: number;
    roll2: number;
    result: string;
}

export interface GameWinHandlerInterface {
    name: string | null | undefined;
    winner: string;
}

export interface CombatUpdateHandlerInterface {
    attacker: Player;
    defender: Player;
}

export interface AnimatePlayerMoveHandle {
    map: Tile[];
    player: Player;
}

export interface CombatHandlerInterface {
    winner: string;
    loser: string;
}

export interface EscapedHandlerInterface {
    escapee: string;
}
export interface Position {
    x: number;
    y: number;
}

export interface PlayerMovementHandlerInterface {
    loser: Player;
    nextPosition: Position;
}

export enum ChatSocketEvent {
    JoinGameChat = 'joinGameChat',
    LeaveGameChat = 'leaveGameChat',
    SendMessage = 'sendMessage',
    NewMessage = 'newMessage',
    ChatHistory = 'chatHistory',
    PlayerJoinedChat = 'playerJoinedChat',
    PlayerLeftChat = 'playerLeftChat',
    ChatError = 'chatError',
}

export interface DFSParams {
    grid: string[][];
    size: number;
    start: Coordinate;
}

export interface StartPointParams {
    grid: string[][];
    size: number;
}

export interface NotificationState {
    showModal: boolean;
    errorMessages: string[];
}

export enum ItemName {
    Chestbox2 = 'chestbox-2',
}
