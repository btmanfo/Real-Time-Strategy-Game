export const VALUE_RADOMISER = 0.5;
export const PIN_LENGTH = 4;
const PIN_SIZE = 10;
export const MAX_PIN_VALUE = PIN_SIZE ** PIN_LENGTH;

export const SPEED_SELECTOR = 0.5;
export const NUMBER_OF_ITEMS_TO_SELECT = 6;
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
export const CHESTBOX_NAME = 'chestbox-2';

export const ITEM_TYPES = {
    random: 'random',
    spawn: 'spawn',
};

export const TIME_TURN = 30;
export const TIME_BEFORE_TURN = 3;

export const VIRTUAL_PLAYER_STAT = {
    default: 4,
    max: 6,
};

export const POURCENTAGE_CALCULATION = 100;
export const TIME_BY_SECOND = 1000;
export const MAP_GRID_SIZE = {
    small: 100,
    medium: 225,
    large: 400,
};
export const ANIMATION_INTERVAL = 150;
export const TIME_TICK = 1000;
