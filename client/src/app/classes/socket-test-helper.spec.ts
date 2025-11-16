import { SocketTestHelper } from './socket-test-helper';

describe('SocketTestHelper', () => {
    let socketHelper: SocketTestHelper;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
    });

    it('should register and call event listeners correctly', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('testEvent', callback);

        socketHelper.emit('testEvent', 'data1', 'data2');

        expect(callback).toHaveBeenCalledOnceWith('data1', 'data2');
    });

    it('should not call a callback if the event is not registered', () => {
        const callback = jasmine.createSpy('callback');

        socketHelper.emit('nonExistentEvent', 'data');
        expect(callback).not.toHaveBeenCalled();
    });

    it('should allow multiple listeners for the same event', () => {
        const callback1 = jasmine.createSpy('callback1');
        const callback2 = jasmine.createSpy('callback2');

        socketHelper.on('multiEvent', callback1);
        socketHelper.on('multiEvent', callback2);

        socketHelper.emit('multiEvent', 'message');

        expect(callback1).toHaveBeenCalledOnceWith('message');
        expect(callback2).toHaveBeenCalledOnceWith('message');
    });

    it('should correctly call peerSideEmit()', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('peerEvent', callback);

        socketHelper.peerSideEmit('peerEvent', ['param1', 'param2']);

        expect(callback).toHaveBeenCalledOnceWith(['param1', 'param2']);
    });

    it('should do nothing when disconnect() is called', () => {
        expect(() => socketHelper.disconnect()).not.toThrow();
    });
});
