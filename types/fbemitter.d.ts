declare module 'fbemitter' {
  export class EventEmitter {
    addListener(eventType: string, listener: (...args: any[]) => void): { remove: () => void };
    emit(eventType: string, ...args: any[]): void;
    removeAllListeners(eventType?: string): void;
  }
} 