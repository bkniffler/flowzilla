import { ISkill, IOptions, IFlow } from './types';
import { generateID } from './utils';
import { constants } from './constants';

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
