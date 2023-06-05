export interface EventMap {
  [eventType: string]: any;
}

export interface EventMapWithArgs {
  [eventType: string]: (...args: any) => any;
}
