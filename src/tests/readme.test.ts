import { ServiceDog } from '../index';

test('dog', async () => {
  const dog = new ServiceDog();
  dog.skill('pickup', (type, payload, flow) => {
    if (type === 'throw') {
      flow({ ...payload, isInMouth: true });
    } else {
      flow(payload);
    }
  });
  dog.skill('bring-back', (type, payload, flow) => {
    if (type === 'throw' && payload.isInMouth) {
      flow({ ...payload, position: 'next-to-human' });
    } else {
      flow(payload);
    }
  });
  dog.skill('letfall', (type, payload, flow) => {
    if (
      type === 'throw' &&
      payload.isInMouth &&
      payload.position === 'next-to-human'
    ) {
      flow({ ...payload, isInMouth: false, drooled: true });
    } else {
      flow(payload);
    }
  });
  const result = await dog.send<any>('throw', {
    name: 'Stick #1',
    drooled: false,
    position: 'far-away'
  });
  expect(result.drooled).toBe(true);
  expect(result.position).toBe('next-to-human');
});
