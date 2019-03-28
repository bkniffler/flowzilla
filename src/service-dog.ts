import { insertToArray } from './utils';
import { NAME, POSITION } from './constants';
import { ISkill, IOptions, IPosition, ITracker } from './types';
import { dispatch } from './dispatch';

export function createServiceDog<T1 = any>(name?: string) {
  return new ServiceDog<T1>(name);
}

export class ServiceDog<T1 = any> {
  public name: string;
  private $skillSet: any = {};
  private skills: ISkill<any>[] = [];
  tracker?: ITracker;
  constructor(name = 'chappie') {
    this.name = name;
  }
  public numberOfSkills() {
    return this.skills.length;
  }
  private appendTracker(options: IOptions = {}) {
    if (this.tracker && !options.tracker) {
      options.tracker = this.tracker;
    }
    return options;
  }
  send<T>(type: string, value?: T1, options?: IOptions, callback?: any) {
    options = this.appendTracker(options);
    if (callback) {
      return dispatch(callback, this.skills, type, value, options);
    }
    return new Promise<T>(yay => {
      return dispatch(yay, this.skills, type, value, options);
    });
  }
  sendSync(type: string, value?: T1, options?: IOptions) {
    options = this.appendTracker(options);
    return dispatch(undefined, this.skills, type, value, options);
  }
  removeSkill(skill: string | ISkill) {
    skill = typeof skill === 'string' ? this.$skillSet[skill] : skill;
    const index = this.skills.indexOf(skill as any);
    if (index >= 0) {
      delete this.$skillSet[skill as any];
      this.skills.splice(this.skills.indexOf(skill as any), 1);
    }
  }
  skill<T = any>(
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  skill<T = any>(
    name: string,
    skill: ISkill<T> | ISkill<T>[],
    position?: IPosition,
    otherSkill?: ISkill<any> | ISkill<T>[] | string | string[]
  ): void;
  skill<T = any>(
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
          ? this.skill(n as any, skill as any, p as any, o as any)
          : this.skill(skill as any, s as any, p as any)
      );
      return;
    }
    const name =
      (typeof n !== 'string' ? undefined : n) ||
      skill.name ||
      skill[NAME] ||
      `skill${this.skills.length}`;
    const otherSkill = ((typeof n !== 'string' ? p : o) ||
      skill['skills'] ||
      []) as ISkill<any> | ISkill<T>[] | string | string[];
    const position = ((typeof n !== 'string' ? s : p) ||
      skill[POSITION] ||
      'END') as IPosition;
    // Is already learned?
    if (this.skills.indexOf(skill) === -1 && !this.$skillSet[name]) {
      skill[NAME] = name;
      this.$skillSet[name] = skill;
      this.skills = insertToArray(
        this.skills,
        skill,
        position,
        otherSkill,
        s => this.$skillSet[s]
      );
    }
  }
}
