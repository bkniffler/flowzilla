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
  public numberOfSkills() {
    return this.skills.length;
  }
  send<T>(type: string, value?: T1, options?: IOptions) {
    return new Promise<T>(yay => {
      return dispatch(yay, this.skills, type, value, options);
    });
  }
  sendSync(type: string, value?: T1, options?: IOptions) {
    return dispatch(undefined, this.skills, type, value, options);
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
    skill[constants.NAME] = name || skill.name || `skill${this.skills.length}`;
    // Is already learned?
    if (
      this.skillsDup.indexOf(skill) !== -1 ||
      this.skills.find(
        x => x[constants.NAME] === (skill as any)[constants.NAME]
      )
    ) {
      return;
    }
    this.skillsDup.push(skill);
    this.skills.push(skill);
  }
}

const constants = {
  NAME: '$name',
  RETURN: '$return',
  RESTART: '$restart',
  NESTED: '$nested',
  START: '$start',
  FINISH: '$finish'
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
    if (options[constants.RETURN]) {
      options.tracker(constants.RETURN, type, value);
    } else if (options[constants.RESTART]) {
      options.tracker('', type, value);
    } else if (options[constants.NESTED]) {
      options.tracker(constants.NESTED, type, value);
    } else {
      options.tracker(constants.START, type, value);
    }
  }
  function useSkill(value: any, i = 0): any {
    const skill = skills[i];
    function flowReturn(value: any) {
      if (nextFlows.length) {
        // Afterwares present, go for them
        return dispatch(callback, nextFlows, type, value, {
          ...context,
          [constants.RETURN]: true
        });
      } else if (callback) {
        // Finish
        if (options.tracker) {
          options.tracker(constants.FINISH, type, value);
        }
        return callback(value);
      }
    }
    function flowRestart(type: string, value: any, con: any = {}) {
      return dispatch(callback, skills, type, value, {
        ...options,
        ...con,
        [constants.RETURN]: undefined,
        [constants.RESTART]: true
      });
    }
    function flowSend<T>(type: string, value: any, con: any = {}) {
      return new Promise<T>(yay => {
        return dispatch(yay, skills, type, value, {
          ...options,
          ...con,
          [constants.RETURN]: undefined,
          [constants.NESTED]: true
        });
      });
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill[constants.NAME];
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        nextFlow[constants.NAME] = `${skillName}.${nextFlow.name || 'next'}`;
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
    if (options[constants.RETURN]) {
      return (skill as any)(value, flow);
    } else {
      return skill(type, value, flow);
    }
  }
  return useSkill(value);
}
