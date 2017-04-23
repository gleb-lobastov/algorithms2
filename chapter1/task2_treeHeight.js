var readline = require('readline');

var TESTING = !!process.env.TESTING;
var treeCapacity;
var inputInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function Tree(bidirectionalLinkedTree, rootIndex) {
  this._structure = bidirectionalLinkedTree;
  this._root = rootIndex || bidirectionalLinkedTree.findIndex(function (item) {
    return item.parent === -1;
  });

  // define height for the root item
  this._structure[this._root].data = 1;
}

Tree.prototype.getHeight = function (/* nodeIndex */) {
  var
    pathTrace = [],
    height,
    maxHeight = 1;

  for (var index = 0, len = this._structure.length; index < len; index++) {
    var item = this._structure[index];

    // skip nodes with already defined height
    if (typeof item.data === 'undefined') {

      // stop on node with already defined height, one of which is root node
      while (!item.data || item.parent !== -1) {
        pathTrace.push(item);
        item = this._structure[item.parent];
      }
      height = item.data;

      // save computed height to nodes. Note, pathTrace revert to empty state
      while (pathTrace.length) {
        pathTrace.pop().data = height++;
      }
      maxHeight = Math.max(height, maxHeight);
    }
  }
  return maxHeight;

  // next algorithm is fine, but not for deep trees, which height excess max_recursion_depth
  // it use top to bottom links between nodes, while working one relies on bottom to top relations
  /*

  nodeIndex = typeof nodeIndex !== 'undefined' ? nodeIndex : this._root;
  return this._structure[nodeIndex].childes.map(this.getHeight, this).reduce(function (a, b) {
    return Math.max(a, b);
  }, 0) + 1;

  */
};

Tree.fromParentRefsArray = function (array) {
  var arrayLength = array.length;
  var rootIndex;
  var parentIndex;
  var bidirectionalLinkedTree = array.map(function (parent) {
    return {
      parent: parent,
      childes: [],
      data: undefined // used to store node heightt
    }
  });

  for (var index = 0; index < arrayLength; index++) {
    parentIndex = bidirectionalLinkedTree[index].parent;
    if (parentIndex >= 0) {
        bidirectionalLinkedTree[parentIndex].childes.push(index);
    } else {
      if (!rootIndex) {
        rootIndex = index;
      } else {
        throw new Error('Inconsistent structure: root index already defined')
      }
    }
  }
  return new Tree(bidirectionalLinkedTree, rootIndex);
};

function treatArrayAsTreeAndGetHeight(array) {
  return Tree.fromParentRefsArray(array).getHeight();
}

if (!TESTING) {
  inputInterface.on('line', function (input) {
    if (!treeCapacity) {
      treeCapacity = parseInt(input);
    } else {
      process.stdout.write(treatArrayAsTreeAndGetHeight(input.split(' ').map(Number)).toString());
      process.exit();
    }
  });
} else {
  assert(treatArrayAsTreeAndGetHeight([9, 7, 5, 5, 2, 9, 9, 9, 2, -1]), 4);
  assert(treatArrayAsTreeAndGetHeight([4, -1, 4, 1, 1]), 3);
  assert(treatArrayAsTreeAndGetHeight([-1, 0, 4, 0, 3]), 4);
  assert(treatArrayAsTreeAndGetHeight([-1]), 1);
  assert(treatArrayAsTreeAndGetHeight([-1, 0]), 2);
  assert(treatArrayAsTreeAndGetHeight([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8]), 10);
  assert(treatArrayAsTreeAndGetHeight([1, 2, 3, 4, 5, 6, 7, 8, 9, -1]), 10);

  var data = [];
  var index;

  // Recursion test
  for (index = 1; index < 100000; index++) {
    data.push(index);
  }
  data.push(-1);

  try {
    assert(treatArrayAsTreeAndGetHeight(data), 100000);
  } catch (error) {
    console.log('Recursion test fail')
  }

  // Time test
  data = [-1];
  for (index = 1; index < 100000; index++) {
    data.push(Math.floor(index/100));
  }
  var start = new Date();
  assert(treatArrayAsTreeAndGetHeight(data), 4);
  assert(new Date() - start < 3000, true);
  process.exit();
}

function assert(leftSide, rightSide) {
  assert.counter = (assert.counter || 0) + 1;
  if (leftSide !== rightSide) {
    console.log('test #' + assert.counter, 'fail: ', leftSide, '<>', rightSide)
  }
}
