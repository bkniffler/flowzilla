export interface IFlow<T> {
  (value: T, onFlowBack?: INextFlow<T>): void;
  send: <T>(type: string, value?: T, context?: any) => Promise<T>;
  restart: (type: string, value?: T, context?: any) => void;
  return: (value: T) => void;
  set: (key: string, value: any) => void;
  get: (key: string, defaultValue?: any) => any;
}
export type INextFlow<T = any> = (
  result: T,
  flow: (value: any) => void
) => void;
export type ISkill<T = any> = (type: string, value: T, flow: IFlow<T>) => void;
export interface ITrackerArg {
  skill: string;
  type: string;
  time: number;
  value: any;
  id: string;
  parents: (string | number)[];
}
export type ITracker = (arg: ITrackerArg) => void;
export type IPosition = 'START' | 'BEFORE' | 'AFTER' | 'END';
export interface IOptions {
  tracker?: ITracker;
  [s: string]: any;
}
