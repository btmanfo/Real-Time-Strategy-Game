export interface Position {
    x: number;
    y: number;
}
export interface Item {
    position: Position;
    image: string;
    name: string;
    id: number;
    type: string;
    description: string;
    isOutOfContainer: boolean;
}
export interface Tile {
    type: string;
    position: Position;
    traversable: boolean;
    item: Item | null;
    player: Player | null;
    image: string;
    cost: number | null;
    isReachable?: boolean;
    isHighlighted?: boolean;
}
export interface TileAndCostInterface {
    tile: Tile;
    cost: number;
}
export interface Game {
    id: string;
    description: string;
    name: string;
    size: GameSize;
    gameMode: string;
    visibility: boolean;
    map: Tile[];
    map2: Tile[];
    modificationDate: string;
    screenshot: string;
}

export interface Player {
    name: string | null;
    life: number;
    speed: number;
    attack: string | null;
    defense: string | null;
    avatarUrl: string | null;
    coordinate: Position;
    isAdmin: boolean;
    isVirtualPlayer?: boolean;
    agressive?: boolean;
    spawnPoint?: Position;
    victories?: number;
    isOnIce?: boolean;
    inventory?: Item[];
    team?: string;
    stats?: EndGameStats | undefined;
    itemsUsed?: ItemsUsed[];
}

export interface ItemsUsed {
    name: string;
}

export enum GameSize {
    bigSize = 'Grande Taille',
    mediumSize = 'Moyenne Taille',
    smallSize = 'Petite Taille',
}

export interface GameData {
    isLocked: boolean;
    pin: string;
    players: Player[];
    size: string;
    updateMap?: Tile[];
    game: Game;
    roomCode?: string;
    player?: Player;
    map?: Tile[];
    playerPositions: Record<string, string[]>;
    pourcentagePlayerScareModeved?: Record<string, number>;
    tile?: Tile;
    glocalStatistics?: GlobalStatistics;
}
export interface GlobalStatistics {
    allTime: number;
    secondTime?: number;
    percentageOfTile: number;
    percentageOfDors: number;
    nbrPlayerOpenDoor: number;
    allDoors: Doors[];
    nbOfTakenFleg: number;
}
export interface Doors {
    coordinate: Position;
    isManipulated: boolean;
}
export interface Capacity {
    min: number;
    max: number;
}

export interface PlayerAndGame {
    newPlayer: string;
    newGame: GameData;
}

export interface Character {
    src: string;
    name: string;
    disabled: boolean;
}

export const sizeCapacity: Record<string, Capacity> = {
    [GameSize.bigSize]: { min: 2, max: 6 },
    [GameSize.mediumSize]: { min: 2, max: 4 },
    [GameSize.smallSize]: { min: 2, max: 2 },
};

export interface CombatState {
    attacker: Player;
    defender: Player;
    escapeAttempts: number;
    maxEscapeAttempts: number;
    escapeChance: number;
    isActive: boolean;
}

export interface PlayerPoints {
    movingPoints: number;
    actionPoints: number;
}

export interface CombatRollsData {
    attackerBonus: number;
    defenderBonus: number;
    roomCode?: string;
}

export interface CombatUpdateData {
    attacker: Player;
    defender: Player;
}

export interface ChatMessage {
    message: string;
    playerName: string;
    timestamp?: Date;
}

export interface GameLogEntry {
    type: string;
    event: string;
    players?: Player[];
    timestamp: Date;
}

export interface JoinInterface {
    roomCode: string;
    playerName: string;
}

export interface LeaveGameInterface {
    roomCode: string;
    playerName: string;
}

export interface RoomCodeInterface {
    roomCode: string;
}
export interface MessageInterface {
    message: ChatMessage;
    roomCode: string;
}

export interface SendGameLogInterface {
    type: string;
    event: string;
    players?: Player[];
    room?: string;
}
export interface LogPayload {
    type: string;
    event: string;
    players?: Player[];
    room?: string;
}

export interface CreateAndJoinInterface {
    firstPlayer: Player;
    secondPlayer: Player;
}

export interface UpdateBoardInterface {
    roomCode: string;
    board: Tile[];
}

export interface JoinRoomInterfaceHandler {
    roomCode: string | number;
    player: Player;
}

export interface LeaveRoomInterfaceHandler {
    roomCode: string;
    player: Player;
    isAdmin: boolean;
}
export interface EndGameStats {
    name: string | null;
    ctf?: number;
    nbVictory: number;
    nbCombat: number;
    nbEvasion: number;
    nbDefeat: number;
    nbLifeLost: number;
    nbDamage: number;
    nbItem: number;
    pourcentageOfTile: number;
    nbDoors: number;
}

export interface PlayerMovementParams {
    tile: Tile;
    player: Player;
    roomCode: string;
    path: Tile[];
    tileIndex: number;
}

export interface KickPlayerInterface {
    roomCode: string;
    player: Player;
}

export interface ToogleRoomLockInterface {
    roomCode: string;
    isLocked: boolean;
}

export interface FirstPlayerInterface {
    roomCode: string;
    player: Player;
}

export interface GetAllInformationInterface {
    roomCode: string;
    player: string;
}

export interface UpdatePlayerVictoriesInterface {
    currentPlayer: string;
    roomCode: string;
    nbVictories: number;
}

export interface UpdatePlayerLoseInterface {
    currentPlayer: string;
    roomCode: string;
    nbLoses: number;
}

export interface UpdatePlayerCombatCountInterface {
    currentPlayer: string;
    roomCode: string;
    theSecondPlayer: string;
}

export interface UpdatePlayerDodgeCountInterface {
    currentPlayer: string;
    roomCode: string;
}

export interface DamageInterface {
    roomCode: string;
    playerName: string;
    dealDamage: number;
}

export interface RoomAndPlayerInterface {
    roomCode: string;
    playerName: string;
}

export interface FindGameInterface {
    id: string;
    name: string;
}

export interface NotifVisibilityInterface {
    name: string;
    visibility: boolean;
}

export interface PlayerInGameInterface {
    roomCode: string;
    playerName: string;
}

export interface MessageInRoomInterface {
    message: ChatMessage;
    roomCode: string;
}
export interface GameLogPayload {
    type: string;
    event: string;
    players?: Player[];
    room?: string;
}

export interface RoomJoinData {
    roomCode: string;
    playerName: string;
}

export interface RoomJoinPayload {
    roomCode: string | number;
    player: Player;
}

export interface RoomLeavePayload {
    roomCode: string;
    player: Player;
    isAdmin: boolean;
}

export interface PlayerActionPayload {
    roomCode: string;
    player: Player;
}

export interface ToggleLockPayload {
    roomCode: string;
    isLocked: boolean;
}

export interface PlayerInfoPayload {
    player: string;
    roomCode: string;
}

export interface UpdateBoardPayload {
    roomCode: string;
    board: Tile[];
}

export interface CombatRoomPayload {
    firstPlayer: Player;
    secondPlayer: Player;
}

export interface StatisticsUpdatePayload {
    currentPlayer: string;
    roomCode: string;
    nbVictories?: number;
    nbLoses?: number;
    theSecondPlayer?: string;
}

export interface DamagePayload {
    playerName: string;
    roomCode: string;
    dealDamage: number;
}

export interface VisibilityChangePayload {
    name: string;
    visibility: boolean;
}

export interface GameDeletionPayload {
    id: string;
    name: string;
}

export interface RoomCodePayload {
    roomCode: string;
}

export interface MessagePayload extends RoomCodePayload {
    message: string;
    userName: string;
}

export interface CharacterPayload extends RoomCodePayload {
    player?: Player;
    avatarUrl: string;
}

export interface CombatPayload extends RoomCodePayload {
    attacker?: Player;
    defender?: Player;
    winner?: string;
    loser?: string;
    attackerBonus?: number;
    defenderBonus?: number;
    escapee?: string;
}

export interface PlayerMovePayload extends RoomCodePayload {
    player: Player;
    nextPosition: Position;
}

export interface ItemChoicePayload {
    item: Item;
    playerPosition: Position;
    roomCode: string;
}

export interface PlayerPathPayload {
    path: Tile[];
    player: Player;
    roomCode: string;
}