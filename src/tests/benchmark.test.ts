/**
 * @jest-environment node
 */
import * as Benchmark from 'benchmark';
import { ServiceDog } from '../index';

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
} else {
  test('blank', () => expect(true).toBe(true));
}
