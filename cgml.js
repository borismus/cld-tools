import { AdjacencyList, Edge, Node } from "./adjacency-list.js";

/**
 * CGML format is a collection of lines that look like this:
 *
 *   Source Node (Alt1) --> Target Node (Alt2)
 *
 * Note that the (Alts) are optional and spaces between the arrow are required.
 * CGML also supports negative edges like this:
 *
 *   S o-> T
 *
 * @param {string} cgml
 * @returns {AdjacencyList}
 */
export function parseCGML(cgml) {
  const graph = new AdjacencyList();
  for (const line of cgml.trim().split('\n')) {
    const subGraph = parseCGMLLine(line);
    graph.append(subGraph);
  }
  return graph;
}

/**
 *
 * @param {string} line
 * @returns {Graph}
 */
export function parseCGMLLine(line) {
  // First, split along the arrow. If there's no arrow, we're in bad shape.
  const split = line.split('->');
  if (split.length !== 2) {
    throw new Error('Each line must contain exactly one arrow.');
  }
  let [left, right] = split;
  // Account for weird arrows.
  let isOpposite = false;
  if (left.endsWith('o')) {
    isOpposite = true;
    left = left.slice(0, left.length - 1);
  } else if (left.endsWith('-')) {
    left = left.slice(0, left.length - 1);
  }
  left = left.trim();
  right = right.trim();
  const source = parseNodeName(left);
  const target = parseNodeName(right);
  const edge = new Edge();
  edge.targetName = target.name;
  edge.isOpposite = isOpposite;
  source.adjacentEdges.push(edge);

  const graph = new AdjacencyList();
  graph.nodes = [source, target];

  return graph;
}

/**
 *
 * Given input that looks like "Hello World (HW)", parse out into ["HW", "Hello World"].
 * The short name in parens is optional, and becomes the main name for the node.
 * Nodes can also just have a long name, eg. " Hello World" will get parsed as ["Hello World"].
 *
 * @param {string} str
 * @return {Node}
 */
export function parseNodeName(str) {
  const doubleName = /(.*?)(\((.*)\))/;
  const match = str.match(doubleName);

  const node = new Node();

  if (match === null) {
    const name = str.trim();
    node.name = name;
    node.label = name;
  } else {
    node.name = match[3].trim();
    node.label = match[1].trim();
  }
  return node;
}