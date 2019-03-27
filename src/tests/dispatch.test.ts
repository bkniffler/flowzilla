import { dispatch } from '../index';

test('dispatch', async cb => {
  dispatch(
    (result: any) => {
      expect(result.length).toBe(2);
      expect(result.join('')).toBe('12');
      cb();
    },
    [
      (type, value, flow) => {
        value.push(1);
        flow(value);
      },
      (type, value, flow) => {
        value.push(2);
        flow(value);
      }
    ],
    'test',
    []
  );
});
