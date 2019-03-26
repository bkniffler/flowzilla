import { ServiceDog, createServiceDog } from './index';

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

test('tracker', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    flow(value);
  });
  const tracker: [string, string, any][] = [];
  await dog.send<any>('context', [0], {
    tracker: (x, y, z) => tracker.push([x, y, z])
  });
  expect(tracker.length).toBe(3);
});

test('edgecase', async () => {
  const dog = createServiceDog();
  dog.train('1', (type, value, flow) => {
    flow(value);
  });
  dog.train('1', (type, value, flow) => {
    flow(value);
  });
  expect(() => (dog.train as any)()).toThrow();
  expect(dog.numberOfSkills()).toBe(1);
});

test('resend', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    if (type === 'second') {
      flow.return('lo');
    } else {
      flow('hel');
    }
  });
  dog.train(async (type, value, flow) => {
    const part = await flow.send('second');
    flow(`${value}${part}`);
  });
  const tracker: [string, string, any][] = [];
  const result = await dog.send<any>('first', [0], {
    tracker: (x, y, z) => tracker.push([x, y, z])
  });
  expect(tracker.length).toBe(7);
  expect('hello').toBe(result);
});

test('restart', async () => {
  const dog = new ServiceDog();
  dog.train((type, value, flow) => {
    if (type === 'first') {
      flow.restart('second', value);
    } else {
      flow('hel');
    }
  });
  dog.train(async (type, value, flow) => {
    flow(`${value}`);
  });
  const tracker: [string, string, any][] = [];
  const result = await dog.send<any>('first', [0], {
    tracker: (x, y, z) => tracker.push([x, y, z])
  });
  expect(tracker.length).toBe(6);
  expect('hel').toBe(result);
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
