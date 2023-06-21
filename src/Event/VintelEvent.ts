interface EventLister{
  name: String,
  callback: Function
}

export default class VintelEvent{
  private listeners: EventLister[] = [];

  emit(eventName: string, data: any) {
    this.listeners
      .filter(({ name }) => name === eventName)
      .forEach(
         ({ callback }) => {
          setTimeout(
            callback(data), 0
          );
        }
      )
  }

  on(name: string, callback: Function) {
    if (
      typeof callback === 'function'
      && typeof name === 'string'
    ) {
      this.listeners.push({ name, callback });
    }
  }

  off(eventName: string, callback: Function) {
    this.listeners = this.listeners.filter(
      (listener: any) => !(listener.name === eventName &&
        listener.callback === callback)
    );
  }

  destroy() {
    this.listeners.length = 0;
  }
}

