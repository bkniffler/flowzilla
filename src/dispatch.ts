import { ISkill, IOptions, IFlow } from './types';
import { generateID } from './utils';
import { STATUS, RETURN, START, COMPLETED, NAME } from './constants';

export function dispatch(
  callback: Function | undefined,
  skills: ISkill<any>[],
  type: string,
  value: any,
  options: IOptions = {},
  parents: (string | number)[] = [],
  id?: string
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
    id = id || generateID();
    if (options[STATUS] === RETURN) {
      options.tracker({
        skill: RETURN,
        type,
        value,
        time: new Date().getTime(),
        id,
        parents
      });
    } else {
      options.tracker({
        skill: START,
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
            [STATUS]: RETURN
          },
          parents,
          id
        );
      } else if (callback) {
        // Finish
        if (options.tracker && id) {
          options.tracker({
            skill: COMPLETED,
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
    function flowReset(type: string, value: any, con: any = {}) {
      return dispatch(
        callback,
        skills,
        type,
        value,
        {
          ...options,
          ...con,
          [STATUS]: START
        },
        parents,
        id
      );
    }
    function flowRun<T>(type: string, value: any, con: any = {}) {
      return new Promise<T>(yay => {
        return dispatch(
          yay,
          skills,
          type,
          value,
          {
            ...options,
            ...con,
            [STATUS]: START
          },
          options.tracker
            ? [...parents, `${id}.${i}${options[STATUS] === RETURN ? '-' : ''}`]
            : []
        );
      });
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill[NAME];
    function flow(newValue: any, nextFlow: any) {
      if (nextFlow) {
        nextFlow[NAME] = skillName;
        nextFlows = [nextFlow, ...nextFlows];
      }
      value = newValue || value;
      return useSkill(value, i + 1);
    }
    flow.reset = flowReset;
    flow.return = flowReturn;
    flow.get = getContext;
    flow.set = setContext;
    flow.run = flowRun;
    if (options.tracker) {
      options.tracker({
        skill: skillName,
        type,
        value,
        time: new Date().getTime(),
        id: `${id}.${i}${options[STATUS] === RETURN ? '-' : ''}`,
        parents
      });
    }
    if (options[STATUS] === RETURN) {
      return (skill as any)(value, flow);
    } else {
      return skill(type, value, flow);
    }
  }
  return useSkill(value);
}
