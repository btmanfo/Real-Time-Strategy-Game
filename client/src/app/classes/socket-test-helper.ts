/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Nous utilons des assions non null dans pour aider tests unitaires des sockets
/* eslint-disable @typescript-eslint/no-explicit-any */
// Les types any sont utilisés pour les tests unitaires
type CallbackSignature = (...params: any[]) => void;

export class SocketTestHelper {
    private readonly callbacks = new Map<string, CallbackSignature[]>();

    on(event: string, callback: CallbackSignature): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }

        this.callbacks.get(event)!.push(callback);
    }

    emit(event: string, ...params: any[]): void {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event)!.forEach((callback) => callback(...params));
        }
    }

    peerSideEmit(event: string, params?: any[]): void {
        this.emit(event, ...[params]);
    }

    disconnect(): void {
        return;
    }
}
