import { ServiceDog } from './index';

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
  const result = await dog.send<any>('first', [0]);
  expect('hello').toBe(result);
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
