/* eslint-disable @typescript-eslint/no-magic-numbers */
// Les nombres magiques sont utilisés pour les tests unitaires

import { PIN_LENGTH, MAX_PIN_VALUE } from '@app/constants/constants';
import { generatePin } from './pin-generator';
import * as sinon from 'sinon';

describe('Pin Generator', () => {
    let randomStub: sinon.SinonStub;

    beforeEach(() => {
        randomStub = sinon.stub(Math, 'random');
    });

    afterEach(() => {
        randomStub.restore();
    });

    it('should generate a string of correct length', () => {
        randomStub.returns(0.5);
        const pin = generatePin();
        expect(pin.length).toBe(PIN_LENGTH);
    });

    it('should pad with leading zeros for small values', () => {
        randomStub.returns(0.001);
        const pin = generatePin();
        expect(pin.startsWith('0')).toBe(true);
        expect(pin.length).toBe(PIN_LENGTH);
    });

    it('should handle maximum value correctly', () => {
        randomStub.returns(0.999);
        const pin = generatePin();
        expect(parseInt(pin, 10)).toBeLessThan(MAX_PIN_VALUE);
        expect(pin.length).toBe(PIN_LENGTH);
    });

    it('should handle minimum value correctly', () => {
        randomStub.returns(0);
        const pin = generatePin();
        expect(pin).toBe('0'.repeat(PIN_LENGTH));
    });

    it('should generate numeric strings only', () => {
        randomStub.returns(0.5);
        const pin = generatePin();
        expect(/^\d+$/.test(pin)).toBe(true);
    });
});
