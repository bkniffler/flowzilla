/**
 * @jest-environment node
 */

import * as Benchmark from 'benchmark';
import {
  ServiceDog,
  createServiceDog,
  ITrackerArg,
  treeizeTracker,
  ISkill
} from './index';
import { insertToArray } from './utils';

test('array', async () => {
  const x0 = '01234';
  const start = insertToArray([1, 2, 3, 4], 0, 'START').join('');
  const end = insertToArray([0, 1, 2, 3], 4, 'END').join('');
  const def = insertToArray([0, 1, 2, 3], 4).join('');
  const before = insertToArray([0, 1, 2, 3], 4, 'BEFORE').join('');
  const before1 = insertToArray([1, 2, 3, 4], 0, 'BEFORE', 1).join('');
  const before14 = insertToArray([1, 2, 3, 4], 0, 'BEFORE', [1, 4]).join('');
  const before14b = insertToArray([1, 2, 3, 4], 0, 'BEFORE', [4, 1]).join('');
  const before2 = insertToArray([0, 2, 3, 4], 1, 'BEFORE', 2).join('');
  const before23 = insertToArray([0, 2, 3, 4], 1, 'BEFORE', [2, 3]).join('');
  const before3 = insertToArray([0, 1, 3, 4], 2, 'BEFORE', 3).join('');
  const before4 = insertToArray([0, 1, 2, 4], 3, 'BEFORE', 4).join('');
  const after = insertToArray([0, 1, 2, 3], 4, 'AFTER').join('');
  const after0 = insertToArray([0, 2, 3, 4], 1, 'AFTER', 0).join('');
  const after1 = insertToArray([0, 1, 3, 4], 2, 'AFTER', 1).join('');
  const after13 = insertToArray([0, 1, 2, 3], 4, 'AFTER', [1, 3]).join('');
  const after13b = insertToArray([0, 1, 2, 3], 4, 'AFTER', [3, 1]).join('');
  const after2 = insertToArray([0, 1, 2, 4], 3, 'AFTER', 2, x => x).join('');
  const after3 = insertToArray([0, 1, 2, 3], 4, 'AFTER', 3).join('');
  expect(def).toBe(x0);
  expect(start).toBe(x0);
  expect(end).toBe(x0);
  expect(before).toBe(x0);
  expect(before1).toBe(x0);
  expect(before14).toBe(x0);
  expect(before14b).toBe(x0);
  expect(before2).toBe(x0);
  expect(before23).toBe(x0);
  expect(before3).toBe(x0);
  expect(before4).toBe(x0);
  expect(after0).toBe(x0);
  expect(after1).toBe(x0);
  expect(after13).toBe(x0);
  expect(after13b).toBe(x0);
  expect(after2).toBe(x0);
  expect(after3).toBe(x0);
  expect(after).toBe(x0);
  expect(() =>
    insertToArray([0, 2, 3, 4], 1, 'AFTER', '0', x => undefined).join('')
  ).toThrow();
});

if (process.env.BENCHMARK) {
  test('benchmark', async cb => {
    const suite = new Benchmark.Suite();

    // FN
    function callback(type: any, value: any, cb: any) {
      value.push(1);
      callback2(type, value, cb);
    }
    function callback2(type: any, value: any, cb: any) {
      value.push(2);
      callback3(type, value, cb);
    }
    function callback3(type: any, value: any, cb: any) {
      value.push(3);
      cb(value);
    }
    // PROMISE
    function promise(type: any, value: any) {
      value.push(1);
      return new Promise(yay => yay(value))
        .then(value => promise2(type, value))
        .then(value => promise3(type, value));
    }
    function promise2(type: any, value: any) {
      value.push(2);
      return new Promise(yay => yay(value));
    }
    function promise3(type: any, value: any) {
      value.push(3);
      return new Promise(yay => yay(value));
    }
    // DOG
    const dog = new ServiceDog();
    dog.train((type, value, flow) => {
      value.push(1);
      flow(value);
    });
    dog.train((type, value, flow) => {
      value.push(2);
      flow(value);
    });
    dog.train((type, value, flow) => {
      value.push(3);
      flow(value);
    });

    suite
      .add(
        'callback',
        function(defer: any) {
          callback('hans', [0], () => defer.resolve());
        },
        { defer: true }
      )
      .add(
        'promise',
        function(defer: any) {
          promise('hans', [0]).then(() => defer.resolve());
        },
        { defer: true }
      )
      .add(
        'service-dog',
        function(defer: any) {
          dog.send<any>('hans', [0], {}).then(() => defer.resolve());
        },
        { defer: true }
      )
      .on('complete', function() {
        const result = suite.reduce((store: any, i: any) => {
          console.log(String(i));
          return { ...store, [i.name]: i.hz };
        }, {});
        expect(result['callback']).toBeLessThan(result['service-dog']);
        expect(result['service-dog']).toBeLessThan(result['promise']);
        const perfScore = (100 / result['promise']) * result['service-dog'];
        expect(perfScore).toBeGreaterThan(70);
        cb();
      })
      .run({ maxTime: 2, async: true });
  }, 40000);
}

test('basic', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    value.push(1);
    flow(value);
  });
  dog.train((type, value, flow) => {
    value.push(2);
    flow(value);
  });
  dog.train((type, value, flow) => {
    value.push(3);
    flow(value);
  });
  dog.train((type, value, flow) => {
    flow(value);
  });
  const result = await dog.send<any>('hans', [0], {});
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(4);
});

test('context', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    flow.set('1', 1);
    flow.set('2', 2);
    flow(value);
  });
  dog.train((type, value, flow) => {
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
  dog.train((type, value, flow) => {
    flow(value);
  });
  dog.send<any>('context', [0], {}, (result: any) => {
    expect(result[0]).toBe(0);
    cb();
  });
});

test('tracker', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
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
  // dog.train(skillB);
  dog.train([skillA, skillB, skillC]);
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
  dog.train([skillB, skillC]);
  dog.train(skillA, 'BEFORE', skillB);
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
  dog.train([skillA, skillC]);
  dog.train(skillB, 'AFTER', skillA);
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
  dog.train([skillA, skillC]);
  dog.train(skillB, 'AFTER', ['skillA']);
  const result = await dog.send<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('edgecase', async () => {
  const dog = createServiceDog();
  dog.train('1', (type, value, flow) => {
    (flow as any)();
  });
  dog.train('1', (type, value, flow) => {
    (flow as any)();
  });
  dog.train('2', (type, value, flow) => {
    (flow as any)();
  });
  expect(() => (dog.train as any)()).toThrow();
  await dog.send<any>('context', [0]);
  expect(dog.numberOfSkills()).toBe(2);
});

test('restart', async () => {
  const dog = new ServiceDog();
  dog.train(async (type, value, flow) => {
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
  dog.train(async (type, value, flow) => {
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
  dog.train((type, value) => {
    value.push(1);
    return value;
  });
  const result = dog.sendSync('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('hooks', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    value.push(1);
    flow(
      value,
      (x, flow) => flow([...x, 5])
    );
  });
  dog.train((type, value, flow) => {
    value.push(2);
    flow(
      value,
      (x, flow) => flow([...x, 4])
    );
  });
  dog.train((type, value, flow) => flow([...value, 3]));
  const result = await dog.send<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(6);
  expect(result.join('')).toBe('012345');
});
