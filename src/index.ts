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
export type ITracker = (skillName: string, type: string, payload: any) => void;
export function createServiceDog<T1 = any>(name?: string) {
  return new ServiceDog<T1>(name);
}
export class ServiceDog<T1 = any> {
  public name: string;
  private skills: ISkill<any>[] = [];
  private skillsDup: any[] = [];
  constructor(name = 'chappie') {
    this.name = name;
  }
  send<T>(type: string, value?: T1, options?: IOptions) {
    return new Promise<T>(yay => {
      return dispatch(yay, this.skills, type, value, options);
    });
  }
  sendSync(type: string, value?: T1, context: any = {}) {
    return dispatch(undefined, this.skills, type, value, context);
  }
  train<T = any>(skill: ISkill<T>): void;
  train<T = any>(name: string, skill: ISkill<T>): void;
  train<T = any>(
    name: string | ISkill<T> | undefined,
    skill?: ISkill<T>
  ): void {
    if (!skill && typeof name !== 'string') {
      skill = name;
      name = undefined;
    }
    if (!skill) {
      throw new Error('Please provide skill or name+skill');
    }
    // Is already learned?
    if (this.skillsDup.indexOf(skill) !== -1) {
      return;
    }
    this.skillsDup.push(skill);
    skill['$name'] = name || skill.name || `skill${this.skills.length}`;
    this.skills.push(skill);
  }
}

interface IOptions {
  tracker?: ITracker;
  [s: string]: any;
}
function dispatch(
  callback: Function | undefined,
  skills: ISkill<any>[] = [],
  type: string,
  value: any,
  options: IOptions = {}
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
    if (context.$return) {
      options.tracker('$return', type, value);
    } else if (context.$restart) {
      options.tracker('$restart', type, value);
    } else if (context.$nested) {
      options.tracker('$nested', type, value);
    } else {
      options.tracker('$start', type, value);
    }
  }
  function useSkill(value: any, i = 0): any {
    const skill = skills[i];
    function flowReturn(value: any) {
      if (nextFlows.length) {
        // Afterwares present, go for them
        return dispatch(callback, nextFlows, type, value, {
          ...context,
          $return: true
        });
      } else if (callback) {
        // Finish
        if (options.tracker) {
          options.tracker('$finish', type, value);
        }
        return callback(value);
      }
    }
    function flowRestart(type: string, value: any, con: any = {}) {
      return dispatch(callback, skills, type, value, {
        ...options,
        ...con,
        $return: undefined,
        $restart: true
      });
    }
    function flowSend<T>(type: string, value: any, con: any = {}) {
      return new Promise<T>(yay => {
        return dispatch(yay, skills, type, value, {
          ...options,
          ...con,
          $return: undefined,
          $nested: true
        });
      });
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill['$name'];
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        nextFlow.$name = `${skillName}.${nextFlow.name || 'next'}`;
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
      options.tracker(skillName, type, value);
    }
    if (context.$return) {
      return (skill as any)(value, flow);
    } else {
      return skill(type, value, flow);
    }
  }
  return useSkill(value);
}
