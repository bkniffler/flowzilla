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
        if (options.tracker) {
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
    function flowRestart(type: string, value: any, con: any = {}) {
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
            [STATUS]: START
          },
          [...parents, skillId]
        );
      });
    }
    if (!skill) {
      return flowReturn(value);
    }
    const skillName = skill[NAME];
    const skillId = `${id}.${i}${options[STATUS] === RETURN ? '-' : ''}`;
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
    if (options[STATUS] === RETURN) {
      return (skill as any)(value, flow);
    } else {
      return skill(type, value, flow);
    }
  }
  return useSkill(value);
}
