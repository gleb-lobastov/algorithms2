var readline = require('readline');

var TESTING = !!process.env.TESTING;
var SUCCESS = 'Success';
var inputInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

if (!TESTING) {
  inputInterface.once('line', function (input) {
    process.stdout.write(parseBrackets(input).toString());
    process.exit();
  });
} else {
  assert(parseBrackets('[]'), SUCCESS);
  assert(parseBrackets('{}[]'), SUCCESS);
  assert(parseBrackets('[()]'), SUCCESS);
  assert(parseBrackets('(())'), SUCCESS);
  assert(parseBrackets('{'), 1);
  assert(parseBrackets('{[}'), 3);
  assert(parseBrackets('foo(bar);'), SUCCESS);
  assert(parseBrackets('foo(bar[i);'), 10);
  assert(parseBrackets('([](){([])})'), SUCCESS);
  assert(parseBrackets('()[]}'), 5);
  assert(parseBrackets('{{[()]]'), 7);
  assert(parseBrackets('{{[()]'), 2);
  assert(parseBrackets(']'), 1);
  process.exit();
}

function fitIndex(index) {
  return index + 1;
}

function parseBrackets(input) {
  var
    char,
    stack = [],
    accordance = {
      '(': ')',
      '[': ']',
      '{': '}'
    },
    opening = Object.keys(accordance),
    closing = opening.map(function (opener) {
      return accordance[opener];
    });

  for (var index = 0; index <= input.length; index++) {
    char = input[index];
    if (opening.indexOf(char) >= 0) {
      stack.push({
        char: char,
        index: index // keep location to return it if found that current bracket is unclosed
      });
    } else if (closing.indexOf(char) >= 0) {
      if (!stack.length || char !== accordance[stack.pop().char]) {
        // step here means wrong brackets order
        return fitIndex(index);
      }
    }
  }
  // last check to make sure that none of unclosed brackets has remained
  return stack.length ? fitIndex(stack.pop().index) : SUCCESS;
}

function assert(leftSide, rightSide) {
  assert.counter = (assert.counter || 0) + 1;
  if (leftSide !== rightSide) {
    console.log('test #' + assert.counter, 'fail: ', leftSide, '<>', rightSide)
  }
}
