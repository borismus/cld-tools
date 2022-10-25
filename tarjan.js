import {AdjacencyList} from './adjacency-list.js';

const UNVISITED = -1;
/**
 *
 * @param {AdjacencyList} adjList
 *
 * @returns {Node[][]} List of node lists.
 */
export function tarjanSCC(adjList) {
  const numAdjList = adjacencyListToNumericGraph(adjList);
  const cycles = tarjanVacilando(numAdjList);
  const cycleInds = cycles.map(cycle => cycle.split('|'));
  const cycleNodes = cycleInds.map(cycleInd => cycleInd.map(ind => adjList.nodes[ind]));
  return cycleNodes;
}

/**
 * eg.
 * A -> B, B -> C, A -> C would be converted into
 *
 * 0: [1]
 * 1: [2]
 * 2: [0]
 *
 * @param {AdjacencyList} adjacencyList Input adjacency list.
 * @return {number[][]} Array of arrays, zero based.
 */
export function adjacencyListToNumericGraph(adjacencyList) {
  const out = [];
  for (const [ind, node] of adjacencyList.nodes.entries()) {
    let edges = [];
    // Get the index of each node's edges.
    for (const edge of node.adjacentEdges) {
      const ind = adjacencyList.findNodeIndexByName(edge.targetName);
      edges.push(ind);
    }
    out.push(edges);
  }
  return out;
}

/**
 * Implementation of Tarjan's algorithm cribbed from
 * https://github.com/Vacilando/js-tarjan/blob/main/tarjan.js.
 *
 * @param {Number[][]} numAdjList Numeric adjacency list in the expected format.
 */
function tarjanVacilando(numAdjList) {
  const $G = numAdjList;

  /**
   * COPIED CODE BEGINS HERE
   */

  // All the following must be global to pass them to recursive function js_tarjan().
  var $cycles;
  var $marked;
  var $marked_stack;
  var $point_stack;

  /*
   * js_tarjan_entry() iterates through the graph array rows, executing js_tarjan().
   */
  function js_tarjan_entry($G_local) {
    // Initialize global values that are so far undefined.
    $cycles = [];
    $marked = [];
    $marked_stack = [];
    $point_stack = [];

    for (let $x = 0; $x < $G_local.length; $x++) {
      $marked[$x] = false;
    }

    for (let $i = 0; $i < $G_local.length; $i++) {
      js_tarjan($i, $i);
      while ($marked_stack.length > 0) {
        $marked[$marked_stack.pop()] = false;
      }
      // console.log($i + 1 + ' / ' + $G_local.length); // Enable if you wish to follow progression through the array rows.
    }

    $cycles = Object.keys($cycles);

    return $cycles;
  }

  /*
   * Recursive function to detect strongly connected components (cycles, loops).
   */
  function js_tarjan($s, $v) {
    // Update global values.
    $marked[$v] = true;
    $marked_stack.push($v);
    $point_stack.push($v);

    // Define local values.
    let $f = false;
    let $t;

    // var $maxlooplength = 3; // Enable to Limit the length of loops to keep in the results (see below).

    $G[$v]?.forEach(($w) => {
      if ($w < $s) {
        $G[$w] = [];
      } else if ($w === $s) {
        // if ($point_stack.length == $maxlooplength){ // Enable to collect cycles of a given length only.
        // Add new cycles as array keys to avoid duplication. Way faster than using array search.
        $cycles[$point_stack.join('|')] = true;
        // }
        $f = true;
      } else if ($marked[$w] === false) {
        // if ($point_stack.length < $maxlooplength){ // Enable to only collect cycles up to $maxlooplength.
        $t = js_tarjan($s, $w);
        // }
        if ($f.length !== 0 || $t.length !== 0) {
          $f = true;
        }
      }
    });

    if ($f === true) {
      while ($marked_stack.slice(-1)[0] !== $v) {
        $marked[$marked_stack.pop()] = false;
      }
      $marked_stack.pop();
      $marked[$v] = false;
    }

    $point_stack.pop();

    return $f;
  }


  /**
   * COPIED CODE ENDS HERE.
   */


  var $cycles = js_tarjan_entry($G);
  // console.log('Cycles found: ' + $cycles.length);
  // console.log($cycles);

  return $cycles;
}