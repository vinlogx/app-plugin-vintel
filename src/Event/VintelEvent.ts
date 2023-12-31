import { callback } from '../definitions';

interface EventLister {
  name: string;
  callback: (args?: object | string) => void;
}

export default class VintelEvent {
  private listeners: EventLister[] = [];

  emit(eventName: string, data: any) {
    this.listeners
      .filter(({ name }) => name === eventName)
      .forEach(({ callback }) => {
        setTimeout(callback(data) as any, 0);
      });
  }

  on(name: string, callback: callback) {
    if (typeof callback === 'function' && typeof name === 'string') {
      this.listeners.push({ name, callback });
    }
  }

  off(eventName: string, callback: callback) {
    this.listeners = this.listeners.filter(
      (listener: any) => !(listener.name === eventName && listener.callback === callback),
    );
  }

  destroy() {
    this.listeners.length = 0;
  }
}
