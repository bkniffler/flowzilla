import {
  Flowzilla,
  createFlowzilla,
  ITrackerArg,
  treeizeTracker,
  ISkill
} from '../index';

test('basic', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    value.push(1);
    flow(value);
  });
  flowzilla.addSkill((type, value, flow) => {
    value.push(2);
    flow(value);
  });
  flowzilla.addSkill((type, value, flow) => {
    value.push(3);
    flow(value);
  });
  flowzilla.addSkill((type, value, flow) => {
    flow(value);
  });
  const result = await flowzilla.run<any>('hans', [0], {});
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(4);
});

test('context', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    flow.set('1', 1);
    flow.set('2', 2);
    flow(value);
  });
  flowzilla.addSkill((type, value, flow) => {
    flow(
      [...value, flow.get('1'), flow.get('2'), flow.get('3', 3)].reduce(
        (result, num) => result + num
      )
    );
  });
  const result = await flowzilla.run<any>('context', [0], {});
  expect(result).toBe(6);
});

test('callback', cb => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    flow(value);
  });
  flowzilla.run<any>('context', [0], {}, (err?: any, result?: any) => {
    expect(err).toBeFalsy();
    expect(result && result[0]).toBe(0);
    cb();
  });
});

test('tracker', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    flow(value);
  });
  const tracker: any = [];
  await flowzilla.run<any>('context', [0], {
    tracker: x => tracker.push(x)
  });
  expect(tracker.length).toBe(3);
});

test('depending', async () => {
  const flowzilla = new Flowzilla();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  // flowzilla.addSkill(skillB);
  flowzilla.addSkill([skillA, skillB, skillC]);
  const result = await flowzilla.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position', async () => {
  const flowzilla = new Flowzilla();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flowzilla.addSkill([skillB, skillC]);
  flowzilla.addSkill(skillA, 'BEFORE', skillB);
  const result = await flowzilla.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position2', async () => {
  const flowzilla = new Flowzilla();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flowzilla.addSkill([skillA, skillC]);
  flowzilla.addSkill(skillB, 'AFTER', skillA);
  const result = await flowzilla.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position-bystring', async () => {
  const flowzilla = new Flowzilla();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flowzilla.addSkill([skillA, skillC]);
  flowzilla.addSkill(skillB, 'AFTER', ['skillA']);
  const result = await flowzilla.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('edgecase', async () => {
  const flowzilla = createFlowzilla();
  flowzilla.addSkill('1', (type, value, flow) => {
    (flow as any)();
  });
  flowzilla.addSkill('1', (type, value, flow) => {
    (flow as any)();
  });
  flowzilla.addSkill('2', (type, value, flow) => {
    (flow as any)();
  });
  expect(() => (flowzilla.addSkill as any)()).toThrow();
  await flowzilla.run<any>('context', [0]);
  expect(flowzilla.skillCount).toBe(2);
});

test('reset', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill(async (type, value, flow) => {
    if (type === 'first') {
      flow.reset('third', 'hel');
    } else if (type === 'second') {
      await new Promise(yay => setTimeout(yay, 1000));
      flow.return('wor');
    } else if (type === 'secondb') {
      await new Promise(yay => setTimeout(yay, 500));
      flow.return('ld');
    } else {
      flow(
        value + 'lo',
        (x, n) => n(x + '!')
      );
    }
  });
  flowzilla.addSkill(async (type, value, flow) => {
    const [part, part2] = await Promise.all([
      flow.run('second'),
      flow.run('secondb')
    ]);
    flow(`${value}, ${part}${part2}`);
  });
  const tracker: ITrackerArg[] = [];
  const result = await flowzilla.run<any>('first', '', {
    tracker: x => tracker.push(x)
  });

  const tree = treeizeTracker(tracker);
  expect(Object.keys(tree).length).toBe(1);
  expect(tracker.length).toBe(14);
  expect('hello, world!').toBe(result);
});

test('sync', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value) => {
    value.push(1);
    return value;
  });
  const result = flowzilla.runSync('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('remove', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill('1', (type, value) => {
    value.push(1);
    return value;
  });
  expect(flowzilla.numberOfSkills()).toBe(1);
  flowzilla.removeSkill('1');
  expect(flowzilla.numberOfSkills()).toBe(0);
  function skill1(type: string, value: any) {
    value.push(1);
    return value;
  }
  flowzilla.addSkill(skill1);
  expect(flowzilla.numberOfSkills()).toBe(1);
  flowzilla.removeSkill(skill1);
  expect(flowzilla.numberOfSkills()).toBe(0);
});

test('hooks', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    value.push(1);
    flow(
      value,
      (x, flow) => flow([...x, 5])
    );
  });
  flowzilla.addSkill((type, value, flow) => {
    value.push(2);
    flow(
      value,
      (x, flow) => flow([...x, 4])
    );
  });
  flowzilla.addSkill((type, value, flow) => flow([...value, 3]));
  const result = await flowzilla.run<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(6);
  expect(result.join('')).toBe('012345');
});

test('error', async () => {
  const flowzilla = new Flowzilla();
  flowzilla.addSkill((type, value, flow) => {
    if (type !== 'hans') {
      flow.catch((err, next) => {
        next(undefined, 'hello');
      });
    }
    flow(value);
  });
  flowzilla.addSkill((type, value, flow) => {
    if (type === 'hans3') {
      return flow('hans3');
    }
    throw new Error('Error :(');
  });

  let err: any;
  await flowzilla.run<any>('hans', [0]).catch((er: any) => (err = er));
  const v = await flowzilla.run<any>('hans2', [0]);
  const v2 = await flowzilla.run<any>('hans3', [0]);
  expect(err).toBeTruthy();
  expect(v).toBe('hello');
  expect(v2).toBe('hans3');
  expect(() => flowzilla.runSync('hans')).toThrow();
});
