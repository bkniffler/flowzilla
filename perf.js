const Benchmark = require('benchmark');
const { ServiceDog } = require('./lib');

async function go() {
  await new Promise(yay => setTimeout(yay, 10000));
  const suite = new Benchmark.Suite();

  // DOG
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

  suite
    .add(
      'service-dog',
      function(defer) {
        dog.send('hans', [0], {}).then(() => defer.resolve());
      },
      { defer: true }
    )
    .on('complete', function() {
      console.log('DONE');
    })
    .run({ maxTime: 10, async: true });
}

go();
