import { PIN_LENGTH, MAX_PIN_VALUE } from '@app/constants/constants';

export function generatePin(): string {
    return Math.floor(Math.random() * MAX_PIN_VALUE)
        .toString()
        .padStart(PIN_LENGTH, '0');
}
