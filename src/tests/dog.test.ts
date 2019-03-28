import {
  ServiceDog,
  createServiceDog,
  ITrackerArg,
  treeizeTracker,
  ISkill
} from '../index';

test('basic', async () => {
  const dog = new ServiceDog();
  dog.skill((type, value, flow) => {
    value.push(1);
    flow(value);
  });
  dog.skill((type, value, flow) => {
    value.push(2);
    flow(value);
  });
  dog.skill((type, value, flow) => {
    value.push(3);
    flow(value);
  });
  dog.skill((type, value, flow) => {
    flow(value);
  });
  const result = await dog.send<any>('hans', [0], {});
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(4);
});

test('context', async () => {
  const dog = new ServiceDog();
  dog.skill((type, value, flow) => {
    flow.set('1', 1);
    flow.set('2', 2);
    flow(value);
  });
  dog.skill((type, value, flow) => {
    flow(
      [...value, flow.get('1'), flow.get('2'), flow.get('3', 3)].reduce(
        (result, num) => result + num
      )
    );
  });
  const result = await dog.send<any>('context', [0], {});
  expect(result).toBe(6);
});

test('callback', cb => {
  const dog = new ServiceDog();
  dog.skill((type, value, flow) => {
    flow(value);
  });
  dog.send<any>('context', [0], {}, (result: any) => {
    expect(result[0]).toBe(0);
    cb();
  });
});

test('tracker', async () => {
  const dog = new ServiceDog();
  dog.skill((type, value, flow) => {
    flow(value);
  });
  const tracker: any = [];
  await dog.send<any>('context', [0], {
    tracker: x => tracker.push(x)
  });
  expect(tracker.length).toBe(3);
});

test('depending', async () => {
  const dog = new ServiceDog();
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
  // dog.skill(skillB);
  dog.skill([skillA, skillB, skillC]);
  const result = await dog.send<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position', async () => {
  const dog = new ServiceDog();
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
  dog.skill([skillB, skillC]);
  dog.skill(skillA, 'BEFORE', skillB);
  const result = await dog.send<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position2', async () => {
  const dog = new ServiceDog();
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
  dog.skill([skillA, skillC]);
  dog.skill(skillB, 'AFTER', skillA);
  const result = await dog.send<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position-bystring', async () => {
  const dog = new ServiceDog();
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
  dog.skill([skillA, skillC]);
  dog.skill(skillB, 'AFTER', ['skillA']);
  const result = await dog.send<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('edgecase', async () => {
  const dog = createServiceDog();
  dog.skill('1', (type, value, flow) => {
    (flow as any)();
  });
  dog.skill('1', (type, value, flow) => {
    (flow as any)();
  });
  dog.skill('2', (type, value, flow) => {
    (flow as any)();
  });
  expect(() => (dog.skill as any)()).toThrow();
  await dog.send<any>('context', [0]);
  expect(dog.numberOfSkills()).toBe(2);
});

test('restart', async () => {
  const dog = new ServiceDog();
  dog.skill(async (type, value, flow) => {
    if (type === 'first') {
      flow.restart('third', 'hel');
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
  dog.skill(async (type, value, flow) => {
    const [part, part2] = await Promise.all([
      flow.send('second'),
      flow.send('secondb')
    ]);
    flow(`${value}, ${part}${part2}`);
  });
  const tracker: ITrackerArg[] = [];
  const result = await dog.send<any>('first', '', {
    tracker: x => tracker.push(x)
  });

  const tree = treeizeTracker(tracker);
  expect(Object.keys(tree).length).toBe(1);
  expect(tracker.length).toBe(14);
  expect('hello, world!').toBe(result);
});

test('sync', async () => {
  const dog = new ServiceDog();
  dog.skill((type, value) => {
    value.push(1);
    return value;
  });
  const result = dog.sendSync('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('remove', async () => {
  const dog = new ServiceDog();
  dog.skill('1', (type, value) => {
    value.push(1);
    return value;
  });
  expect(dog.numberOfSkills()).toBe(1);
  dog.removeSkill('1');
  expect(dog.numberOfSkills()).toBe(0);
  function skill1(type: string, value: any) {
    value.push(1);
    return value;
  }
  dog.skill(skill1);
  expect(dog.numberOfSkills()).toBe(1);
  dog.removeSkill(skill1);
  expect(dog.numberOfSkills()).toBe(0);
});

test('hooks', async () => {
  const dog = new ServiceDog();
  dog.skill((type, value, flow) => {
    value.push(1);
    flow(
      value,
      (x, flow) => flow([...x, 5])
    );
  });
  dog.skill((type, value, flow) => {
    value.push(2);
    flow(
      value,
      (x, flow) => flow([...x, 4])
    );
  });
  dog.skill((type, value, flow) => flow([...value, 3]));
  const result = await dog.send<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(6);
  expect(result.join('')).toBe('012345');
});
