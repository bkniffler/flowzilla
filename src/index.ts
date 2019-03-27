import { insertToArray, generateID } from './utils';

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
export function createServiceDog<T1 = any>(name?: string) {
  return new ServiceDog<T1>(name);
}
export type IPosition = 'START' | 'BEFORE' | 'AFTER' | 'END';
export class ServiceDog<T1 = any> {
  public name: string;
  private $skillSet: any = {};
  private skills: ISkill<any>[] = [];
  constructor(name = 'chappie') {
    this.name = name;
  }
  public numberOfSkills() {
    return this.skills.length;
  }
  send<T>(type: string, value?: T1, options?: IOptions, callback?: any) {
    if (callback) {
      return dispatch(callback, this.skills, type, value, options);
    }
    return new Promise<T>(yay => {
      return dispatch(yay, this.skills, type, value, options);
    });
  }
  sendSync(type: string, value?: T1, options?: IOptions) {
    return dispatch(undefined, this.skills, type, value, options);
  }
  train<T = any>(
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  train<T = any>(
    name: string,
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  train<T = any>(
    n: string | ISkill<T> | ISkill<T>[] | undefined,
    s?: ISkill<T> | ISkill<T>[] | IPosition,
    p?: IPosition | ISkill<any> | ISkill<T>[],
    o?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void {
    const skill = (typeof n !== 'string' ? n : s) as ISkill<T> | ISkill<T>[];
    if (!skill) {
      throw new Error('Please provide skill or name+skill');
    }
    if (Array.isArray(skill)) {
      skill.forEach(skill =>
        typeof n === 'string'
          ? this.train(n as any, skill as any, p as any, o as any)
          : this.train(skill as any, p as any, o as any)
      );
      return;
    }
    const name =
      (typeof n !== 'string' ? undefined : n) ||
      skill.name ||
      skill[constants.NAME] ||
      `skill${this.skills.length}`;
    const otherSkill = ((typeof n !== 'string' ? p : o) ||
      skill['skills'] ||
      []) as ISkill<any> | ISkill<T>[] | string | string[];
    const position = ((typeof n !== 'string' ? s : p) ||
      skill[constants.POSITION] ||
      'END') as IPosition;
    // Is already learned?
    if (this.skills.indexOf(skill) === -1 && !this.$skillSet[name]) {
      skill[constants.NAME] = name;
      this.$skillSet[name] = skill;
      insertToArray(
        this.skills,
        skill,
        position,
        otherSkill,
        s => this.$skillSet[s]
      );
    }
  }
}

const constants = {
  POSITION: 'position',
  NAME: '$name',
  STATUS: '$status',
  RETURN: '$return',
  START: '$start',
  COMPLETED: '$completed'
};
interface IOptions {
  tracker?: ITracker;
  [s: string]: any;
}
function dispatch(
  callback: Function | undefined,
  skills: ISkill<any>[],
  type: string,
  value: any,
  options: IOptions = {},
  parents: (string | number)[] = [],
  id = generateID()
) {
  let nextFlows: IFlow<any>[] = [];
  const context = { ...options };
  function setContext(key: string, value: any) {
    context[key] = value;
  }
  function getContext(key: string, defaultValue: any) {
    return context[key] !== undefined ? context[key] : defaultValue;
  }
  if (options.tracker) {
    if (options[constants.STATUS] === constants.RETURN) {
      options.tracker({
        skill: constants.RETURN,
        type,
        value,
        time: new Date().getTime(),
        id,
        parents
      });
    } else {
      options.tracker({
        skill: constants.START,
        type,
        value,
        time: new Date().getTime(),
        id,
        parents
      });
    }
  }
  function useSkill(value: any, i = 0): any {
    const skill = skills[i];
    function flowReturn(value: any) {
      if (nextFlows.length) {
        // Afterwares present, go for them
        return dispatch(
          callback,
          nextFlows,
          type,
          value,
          {
            ...context,
            [constants.STATUS]: constants.RETURN
          },
          parents,
          id
        );
      } else if (callback) {
        // Finish
        if (options.tracker) {
          options.tracker({
            skill: constants.COMPLETED,
            type,
            value,
            time: new Date().getTime(),
            id,
            parents
          });
        }
        return callback(value);
      }
    }
    function flowRestart(type: string, value: any, con: any = {}) {
      return dispatch(
        callback,
        skills,
        type,
        value,
        {
          ...options,
          ...con,
          [constants.STATUS]: constants.START
        },
        parents,
        id
      );
    }
    function flowSend<T>(type: string, value: any, con: any = {}) {
      return new Promise<T>(yay => {
        return dispatch(
          yay,
          skills,
          type,
          value,
          {
            ...options,
            ...con,
            [constants.STATUS]: constants.START
          },
          [...parents, skillId]
        );
      });
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill[constants.NAME];
    const skillId = `${id}.${i}${
      options[constants.STATUS] === constants.RETURN ? '-' : ''
    }`;
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        // nextFlow[constants.NAME] = `${skillName}.${nextFlow.name || 'next'}`;
        nextFlows = [nextFlow, ...nextFlows];
      }
      value = newValue || value;
      return useSkill(value, i + 1);
    }
    flow.restart = flowRestart;
    flow.return = flowReturn;
    flow.get = getContext;
    flow.set = setContext;
    flow.send = flowSend;
    if (options.tracker) {
      options.tracker({
        skill: skillName,
        type,
        value,
        time: new Date().getTime(),
        id: skillId,
        parents
      });
    }
    if (options[constants.STATUS] === constants.RETURN) {
      return (skill as any)(value, flow);
    } else {
      return skill(type, value, flow);
    }
  }
  return useSkill(value);
}

export function treeizeTracker(
  tracker: ITrackerArg[],
  ids: (string | number)[] = [],
  map = (x: ITrackerArg, prev?: ITrackerArg): any => {
    const { parents, id, ...rest } = x;
    rest.time = prev ? x.time - prev.time : 0;
    return rest;
  },
  prev?: ITrackerArg
): any {
  const path = ids.join('.');
  return tracker
    .filter(x => x.parents.join('.') === path)
    .reduce((state, x) => {
      const rawId = x.id.split('.')[0];
      const children = treeizeTracker(tracker, [...ids, x.id], map, x);

      const item = map(x, prev);
      if (Object.keys(children).length) {
        item.children = children;
      }
      if (!state[rawId]) {
        state[rawId] = [];
      }
      state[rawId].push(item);
      prev = x;
      return state;
    }, {});
}
