var readline = require('readline');

var TESTING = false && !!process.env.TESTING;

var ARRIVAL = 0;
var DURATION = 1;

var BUFFER_SIZE = 0;
var PACKAGE_COUNT = 1;

var GETTER = 1;
var SETTER = 2;

var bufferSize;
var packagesLeft;
var packages = [];

var inputInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

/**
 * FIFO Queue
 *
 * Queue is implemented as array with limited size. In order to reuse released items without
 * moving of existing items, queue use two pointers: getter and setter. Getter means index, from
 * where to get item on next get or look call. Setter means, where to set item on put call.
 * After each action corresponding pointer is shifted forward, if pointer reach array border it
 * established at 0 index. So pointers could shift infinitely. The only question is to prevent
 * getter to be shifted over setter, to not to accidentally overwrite existing item or read from
 * released cell. Attribute _inverted is used to solve that problems. It shows, who of getter and
 * setter follows whom (default getter follows setter) and so, which index is not allowed to outrun
 * another.
 *
 * @param bufferSize Maximum allowed element in queue. Exceeding element will be ignored
 * @constructor
 */
function Queue(bufferSize) {
  this._bufferSize = bufferSize;
  this._line = new Array(this._bufferSize);
  this._inverted = false;
  this._getterPos = 0;
  this._setterPos = 0;
}

Queue.prototype = {
  constructor: Queue,

  /**
   * Puts item in queue, return flag which describes is item actually been saved in queue or ignored
   * @param item
   * @returns {boolean} true — item was saved, false — item was ignored
   */
  put: function (item) {
    var isFull = this.isFull();
    if (!isFull) {
      this._line[this._setterPos] = item;
      this._shift(SETTER);
    }
    return !isFull;
  },

  /**
   * Removes item from queue and return it as function result. Returns null, if there is no items
   * in queue. It means ambiguity for storing nulls in queue and is an objective for further
   * impovements. For now solution is to check isEmpty method or not to store nulls.
   * @returns {*}
   */
  get: function () {
    var item;
    if (!(this.isEmpty())) {
      item = this._line[this._getterPos];
      this._shift(GETTER);
      return item;
    }
    return null;
  },

  /**
   * Return first item without removing it from queue
   * @returns {*}
   */
  look: function () {
    if (!this.isEmpty()) {
      return this._line[this._getterPos];
    }
    return null;
  },

  isEmpty: function () {
    return !(this._inverted || this._getterPos !== this._setterPos);
  },

  isFull: function () {
    return !(!this._inverted || this._setterPos !== this._getterPos);
  },

  /**
   * @param kind
   * @private
   */
  _shift: function (kind) {
    var index;
    switch (kind) {
      case GETTER:
        index = this._getterPos;
        break;
      case SETTER:
        index = this._setterPos;
        break;
      default:
        throw new Error('Unknown kind "' + kind + '" of operation');
    }
    index += 1;
    if (index >= this._bufferSize) {
      this._inverted = !this._inverted;
      index = 0;
    }
    if (kind === GETTER) {
      this._getterPos = index;
    } else {
      this._setterPos = index;
    }
  }
};

function NetworkListenerEmulator(packages, bufferSize) {
  this._queue = new Queue(bufferSize);
  this._packages = packages;
  this._packagesCount = packages.length;
  this._nextPackageIndex = 0;

  // Time till which processor will be busy
  this._releaseTime = undefined;

  // Time mark to save start of processing
  this._time = 0;

  // Processor busyness flag
  this._idle = true;
}

NetworkListenerEmulator.prototype = {
  constructor: NetworkListenerEmulator,

  listen: function () {
    // Event-loop. Runs while waiting for packages or has unprocessed ones
    while (this._nextPackageIndex < this._packagesCount || !this._idle || !this._queue.isEmpty()) {
      // Start to process next package if it possible. Time mark is not changed.
      if (
        this._idle &&
        !this._queue.isEmpty()
      ) {
        this.process();
      }
      // Select closest event in time to handle
      else if (
        // handleArrival could be performed only if some packages remains unhandled
      this._nextPackageIndex < this._packagesCount && (
        // _releaseTime could remain from last tick.
        // Not to process if there is nothing to process
        this._idle ||
        this._queue.isEmpty() ||
        this._packages[this._nextPackageIndex].arrival < this._releaseTime
      )
      ) {
        this._time = this._packages[this._nextPackageIndex].arrival;
        this.handleArrival();
      }
      else {
        this._time = this._releaseTime;
        this.handleProcessed();
      }
    }
    return this._packages.map(function (packageObj) {
      return packageObj.startTime;
    });
  },

  handleArrival: function () {
    var isSuccessfullyAddedToQueue = this._queue.put(this._nextPackageIndex);
    if (!isSuccessfullyAddedToQueue) {
      this._packages[this._nextPackageIndex].startTime = -1;
    }
    this._nextPackageIndex += 1;
  },

  handleProcessed: function () {
    this._queue.get();
    this._idle = true;
  },

  process: function () {
    var processedPackageIndex = this._queue.look();
    var processedPackage = this._packages[processedPackageIndex];
    if (processedPackage) {
      processedPackage.startTime = this._time;
      this._releaseTime =
        Math.max(processedPackage.arrival, this._time) +
        processedPackage.duration;
      this._idle = false;
    }
  }
};

if (!TESTING) {
  inputInterface.on('line', function (input) {
    input = input.split(' ');
    if (typeof packagesLeft === 'undefined') {
      bufferSize = parseInt(input[BUFFER_SIZE]);
      packagesLeft = parseInt(input[PACKAGE_COUNT]);
    } else {
      packages.push({
        arrival: +input[ARRIVAL],
        duration: +input[DURATION]
      });
      packagesLeft -= 1;
      if (!packagesLeft) {
        new NetworkListenerEmulator(packages, bufferSize).listen().forEach(function (number) {
          process.stdout.write(number.toString() + '\n');
        });
        process.exit();
      }
    }
  });
} else {
  assertArrayShallowEquals(
    new NetworkListenerEmulator([], 1).listen(),
    []
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 0, duration: 0 }
    ], 1).listen(),
    [0]
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 0, duration: 1 },
      { arrival: 0, duration: 1 }
    ], 1).listen(),
    [0, -1]
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 0, duration: 1 },
      { arrival: 1, duration: 1 }
    ], 1).listen(),
    [0, 1]
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 0, duration: 2 },
      { arrival: 1, duration: 1 },
      { arrival: 2, duration: 1 }
    ], 1).listen(),
    [0, -1, 2]
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 4, duration: 4 },
      { arrival: 6, duration: 4 },
      { arrival: 6, duration: 2 },
      { arrival: 12, duration: 3 },
      { arrival: 13, duration: 0 },
      { arrival: 15, duration: 2 },
      { arrival: 15, duration: 2 },
      { arrival: 15, duration: 2 }
    ], 10).listen(),
    [4, 8, 12, 14, 17, 17, 19, 21]
  );
  assertArrayShallowEquals(
    new NetworkListenerEmulator([
      { arrival: 999999, duration: 1 },
      { arrival: 1000000, duration: 0 },
      { arrival: 1000000, duration: 1 },
      { arrival: 1000000, duration: 0 },
      { arrival: 1000000, duration: 0 }
    ], 1).listen(),
    [999999, 1000000, 1000000, -1, -1]
  );

  // Time test
  var data = [];
  for (var index = 1; index < 100000; index++) {
    data.push({ arrival: index, duration: index % 1000 });
  }
  var start = new Date();
  new NetworkListenerEmulator(data, 100000).listen();
  assert(new Date() - start < 3000, true);
  process.exit();
}

function assert(passed, failMessage) {
  assert.counter = (assert.counter || 0) + 1;
  if (!passed) {
    console.log('test #' + assert.counter + ' fail' + (failMessage ? ': ' : ''), failMessage);
  } else {
    console.log('test #' + assert.counter + ' pass')
  }
}

function assertArrayShallowEquals(left, right) {
  assert(
    left.length === right.length && left.every(function (item, index) {
      if (item !== right[index]) {
        console.log('!!', index, left[index], right[index])
      }
      return item === right[index];
    }),
    left.join(' ') + ' <> ' + right.join(' ')
  );
}