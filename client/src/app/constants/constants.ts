// Certaines variables ne suivent pas les bonnes conventions de CamelCase

import { Item, Player, Position, Tile } from '@common/interfaces';

/* eslint-disable @typescript-eslint/naming-convention */
export type GameSize = 'Grande Taille' | 'Moyenne Taille' | 'Petite Taille';
export const TIME_TURN = 30;
export const TIME_BETWEEN_TURNS_MS = 3000;
export const TIME_DECREMENTATION_OF_A_SECOND = 1000;
export const SCREEN_SHOT_SCALE = 0.35;
export const START_TIME_WITH_NO_ATTEMPT = 3;
export const START_TIME_WITH_ATTEMPT = 5;
export const FOUR = 4;
export const SIX = 6;

export enum SocketActionLabels {
    EndTurn = 'endTurn',
    QuitGame = 'quitGame',
    AnimatePlayerMove = 'animatePlayerMove',
    CombatEscaped = 'combatEscaped',
    CombatEnded = 'combatEnded',
    CombatUpdate = 'combatUpdate',
    ItemChoice = 'itemChoice',
    MovePlayer = 'movePlayer',
    ToggleDoor = 'toggleDoor',
}
export enum SocketPlayingLabels {
    EndGameWinVictories = 'endGameWinVictories',
    PlayerMoved = 'playerMoved',
    DebugModeChanged = 'debugModeChanged',
    TimeIncrement = 'timeIncrement',
    NotificationTurn = 'notificationTurn',
    EndAnimation = 'endAnimation',
    StartFight = 'startFight',
    EndGameCtf = 'endGameCtf',
    EmitVirtualPlayer = 'emitVirtualPlayer',
    RestartTurn = 'restartTurn',
}

export const NUMBER_OF_WINS_FOR_VICTORIES = 3;
export const pageName = {
    playerPage: 'SÉLECTIONNER VOTRE PERSONNAGE',
    mainPage: 'HEROIC ADVENTURE',
    createPage: 'SÉLECTIONNEZ VOTRE MODE DE JEU',
    chooseGamePage: 'CRÉATION DE VOTRE PARTIE',
    adminPage: 'ADMINISTRATION DE VOTRE PARTIE',
    joinGamePage: 'SAISISSEZ VOTRE PIN',
};

export const POTION1_EFFECT = 2;
export const SHIELD_EFFECT = 4;
export const RING_ITEM_ROLL_VALUE = 3;

export const COUNT_START = 3;
export const CLOSED_DOOR = './assets/images/Porte.png';
export const OPEN_DOOR = './assets/images/Porte-ferme.png';
export const CHESTBOX_NAME = 'chestbox-2';
export const tiles = [
    { description: 'Tuile mur', type: 'Mur', id: 0, traversable: false, image: './assets/images/Mur.png' },
    { description: 'Tuile eau', type: 'Eau', id: 1, traversable: true, image: './assets/images/Eau.jpg' },
    { description: 'Porte', type: 'Porte', id: 2, traversable: false, image: './assets/images/Porte.png' },
    { description: 'Tuile glace', type: 'Glace', id: 3, traversable: true, image: './assets/images/Glace.jpg' },
];
export const playerSelectionData = {
    isLifeSelected: false,
    isSpeedSelected: false,
    selectedAttack: null as string | null,
    selectedDefense: null as string | null,
    selectedInput: null as string | null,
    avatarLink: null as string | null,
};

export const playerSelectionDataError = {
    isLifeError: false,
    isSpeedError: false,
    selectedAttackError: false,
    selectedDefenseError: false,
    selectedInputError: false,
    avatarLinkError: false,
};

export const baseStats = {
    attack: 4,
    defense: 4,
    life: 4,
    speed: 4,
};

export const TILE_TYPES = {
    door: 'Porte',
    wall: 'Mur',
    water: 'Eau',
    ice: 'Glace',
    empty: '',
};

export const ITEM_TYPES = {
    random: 'random',
    spawn: 'spawn',
    flag: 'Drapeau',
};

export const GRID_SIZES = {
    LARGE: 20,
    MEDIUM: 15,
    SMALL: 10,
};

export const SPAWN_COUNTS = {
    LARGE: 6,
    MEDIUM: 4,
    SMALL: 2,
};

export enum MapSize {
    Large = 'Grande Taille',
    Medium = 'Moyenne Taille',
    Small = 'Petite Taille',
}

export interface MovePlayerPayload {
    nextTile: Tile;
    previousTile: Tile;
    player: Player;
}

export interface ItemChoicePayload {
    item: Item;
    playerPosition: Position;
    roomCode: string;
}

export interface EndTurnPayload {
    roomCode: string;
    playerTurn: Player;
    isNotification: boolean;
}

export interface InventoryUpdatePayload {
    playerName: string;
    inventory: Item[];
}

export interface QuitGamePayload {
    players: Player[];
    map: Tile[];
}

export interface CombatUpdatePayload {
    attacker: Player;
    defender: Player;
}

export interface SetPlayerPayload {
    nextTile: Tile;
    previousTile: Tile;
    player: Player;
}

export interface JoinRoomPayload {
    roomCode: string;
    playerName: string;
}

export interface GetGameLogsPayload {
    roomCode: string;
}

export interface NewGamePayload {
    roomCode: string;
    playerName: string;
}

export interface SendGameLogPayload {
    type: 'combat' | 'combatResult' | 'abandon' | 'global' | 'debug';
    event: string;
    players?: Player[];
    room: string;
}

export const ERROR_MESSAGES = {
    doorPlacement: 'Les portes doivent être placées entre deux murs \n',
    doorBorder: 'Les portes ne doivent pas être placées sur les bords de la carte \n',
    terrainTiles: "Les deux autres tuiles (dans l'autre axe) touchant la porte doivent être des tuiles de terrain \n",
    wallBlocking: 'Certaines tuiles accessibles sont bloquées par les murs! \n',
    mapTerrain: 'La carte doit être remplie de tuiles de terrain à plus de 50% \n',
    spawnPlacement: 'Vous devez placer tous les spawns \n',
    itemPlacement: 'Vous devez placer tous les items \n',
    flagRequired: 'Vous devez placer un drapeau dans le mode CTF \n',
};

export const MAP_SPLIT_LIMIT_1 = 225;
export const MAP_SPLIT_LIMIT_2 = 400;

export const LARGE_MAP_SIZE = 20;
export const MEDIUM_MAP_SIZE = 15;
export const SMALL_MAP_SIZE = 10;
export const HALF_MAP_LENGTH = 2;

export const DATA_ROUTE_NAME = 'application';
export const DATA_ROUTE_ITEM_ID = 'application/id';
export const DATA_ROUTE_ITEM_POSITIONX = 'application/posx';
export const DATA_ROUTE_ITEM_POSITIONY = 'application/posy';

export const NUMBER_OF_ITEMS_SMALL = 2;
export const NUMBER_OF_ITEMS_MEDIUM = 4;
export const NUMBER_OF_ITEMS_BIG = 6;

export const ID_ITEM_START = 10;
export const ITEMS_CATEGORIES = ['Potion', 'Épée', 'Bouclier', 'Drapeau', 'Random', 'Spawn'];
export const ITEMS = [
    {
        position: { x: 0, y: 0 },
        id: 0,
        type: 'Potion',
        name: 'potion1',
        image: './assets/images/potion1.png',
        description: "Effet combat: Imprègne tes attaques d'une puissance accrue : +2 dégâts en plus de la valeur du dé lancé",
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 1,
        type: 'Potion',
        name: 'potion2',
        image: './assets/images/potion2.png',
        description: 'Effet magique : lorsque vous appuyez sur le bouton Fin de tour, vous êtes téléporté à une case aléatoire. ',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 2,
        type: 'Épée',
        name: 'epee1',
        image: './assets/images/epee1.png',
        description: 'Effet combat: Le pouvoir de cet objet aiguise votre lame (+1 attaque), mais affaiblit votre garde (-1 défense).',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 3,
        type: 'Épée',
        name: 'epee2',
        image: './assets/images/epee2.png',
        description: 'Effet combat: Le pouvoir de cet objet aiguise votre lame (+2 attaque), mais affaiblit votre garde (-2 défense).',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 4,
        type: 'Bouclier',
        name: 'bouclier1',
        image: './assets/images/bouclier1.png',
        description:
            // Pour la description de notre item, qui fait plus que 150 caractères.
            // eslint-disable-next-line max-len
            'Effet combat: Lorsque vous êtes sur la glace, vous gagnez un bonus de +4 en défense. Cet effet annule le malus habituel de la glace et ajoute +2 défense supplémentaire.',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 5,
        type: 'Bouclier',
        name: 'bouclier2',
        image: './assets/images/bouclier2.png',
        description: 'Effet combat: Lorsque vous obtenez un 1 par malchance sur un dé, celui-ci est automatiquement transformé en un 3.',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 6,
        type: 'Drapeau',
        name: 'chestbox-2',
        image: './assets/images/chestbox-2.png',
        description: 'Rapportez ce trésor à votre château pour remporter la partie et assurer la gloire de votre royaume.',
        isOutOfContainer: false,
    },

    {
        position: { x: 0, y: 0 },
        id: 7,
        type: 'Spawn',
        name: 'spawn',
        image: './assets/images/spawn.png',
        description: 'Tuile du joueur',
        isOutOfContainer: false,
    },
    {
        position: { x: 0, y: 0 },
        id: 8,
        type: 'Random',
        name: 'random',
        image: 'assets/images/random1.png',
        description: 'Item aléatoire',
        isOutOfContainer: false,
    },
];

export const mockPlayer = {
    name: '',
    life: 0,
    speed: 0,
    attack: '',
    defense: '',
    avatarUrl: '',
    coordinate: { x: 0, y: 0 },
    isAdmin: false,
};

export const mockAllWaitingRoomInfo = {
    roomInfo: {
        roomId: 'mockRoomId',
        roomName: 'Salle de Mock Test',
        isLocked: false,
    },
    players: [mockPlayer],
};

export const mockTile = {
    traversable: true,
    cost: 1,
    isHighlighted: false,
    isReachable: false,
    item: { name: '' },
    position: { x: 0, y: 0 },
} as Tile;

export const LOG_TEMPLATES = {
    combatResult: 'Résultat du combat : {attacker} vs {defender} => {result}',
    door: '{player} a {state} la porte',
    debug: '{player} a {state} le mode débogage',
    abandon: '{player} a abandonné la partie',
    combatAttack: 'Attaque : {attacker} attaque {defender} (jet atk : {roll1} et jet def : {roll2} ) => {result}',
    combatEvasion: "Tentative d'évasion : {defender} tente d'esquiver {attacker} (pourcentage de chance  : {chances} % ) => {result}",
};

export function formatLog(template: string, values: { [key: string]: string }): string {
    return template.replace(/{(\w+)}/g, (_, key) => values[key] || '');
}

export const MAX_ESCAPE_ATTEMPTS = 2;
export const ESCAPE_CHANCE = 0.3;
export const ICE_PENALTY = 2;
export const MAX_HEALTH = 4;
export const FOUR_SIDED_DICE = 4;
export const SIX_SIDED_DICE = 6;
export const DELAY = 5000;
export const NOTIFICANTION_DELAY = 3000;

export const MESSAGES_ROOM = {
    locked: 'La salle est verrouillée. Vous ne pouvez pas y entrer.',
    roomFull: 'Le max de joueur a été atteint. Vous ne pouvez pas y entrer.',
    nameRule: 'Le nom doit contenir au moins 3 caractères et être alphanumérique.',
    pickAvatar: 'Veuillez sélectionner un avatar.',
    pickAttack: "Veuillez sélectionner un type d'attaque.",
    pickDefense: 'Veuillez sélectionner un type de défense.',
    pickLifeOrSpeed: 'Veuillez sélectionner un type de vie ou de vitesse.',
    lockRoom: 'La salle doit être verrouillée pour démarrer la partie.',
    noUnlockedRoom: 'Impossible de déverrouiller la salle, le nombre maximal de joueurs est atteint.',
};

export const INITIAL_NUMBER_OF_COUNTER = 3;
export const DECREMENT_COUNTER_BY_ONE_SECOND = 1000;

export const MAX_CHAT_MESSAGE_LENGTH = 200;
export const CURRENT_MESSAGE = '';
export const IS_MESSAGE_TOO_LONG = false;
export const IS_OPEN = false;
export const IS_SWITCHED = false;
export const HIDE_SWITCH_BUTTON = false;

export const TIME_TICK = 1000;
export const RETRY_COUNT = 3;
export const COMBAT_FACTOR = 100;
export const RANDOM_WINNING_CHANCE = 0.5;
export const MIN_BOT_START_TURN = 10000;
export const MAX_BOT_START_TURN = 20000;
export const BOT_ACTION_TIME = 1500;
export const BOT_TOGGLE_DOOR_TIME = 5000;
export const BOT_TIME_BETWEEN_TRIES = 800;
export const FORMAT_INPUT_COUNT = 4;
export const TIME_CONVERSION_MODULO = 60;
export const COMBAT_ATTACKING_TIME = 1000;
export const TIME_FOR_DOM = 100;
export const DEBUG_KEY = 'd';

export const END_GAME_STATS: Record<string, string> = {
    nbVictory: 'victoire',
    nbCombat: 'combat',
    nbEvasion: 'évasion',
    nbDefeat: 'défaite',
    nbLifeLost: 'vie perdue',
    nbDamage: 'dégât',
    nbItem: 'items',
    pourcentageOfTile: 'pourcentage de tuile',
};
