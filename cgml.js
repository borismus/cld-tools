import {AdjacencyList, Edge, Node} from "./adjacency-list.js";

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
 * CGML format also supports edge labels in the following format:
 *
 *   S --> T // A pretty long edge label that may get turned into multiline.
 *
 * @param {string} cgml
 * @returns {AdjacencyList}
 */
export function parseCGML(cgml) {
  const graph = new AdjacencyList();
  for (const line of cgml.trim().split('\n')) {
    const subGraph = parseCGMLLine(line);
    graph.concat(subGraph);
  }
  // Flatten the subgraph to be just its own IDs.
  graph.flattenSubgraphs();
  return graph;
}

/**
 *
 * @param {string} line
 * @returns {Graph}
 */
export function parseCGMLLine(line) {
  // Ignore comments which start with //.
  if (line.trim().startsWith('//')) {
    return new AdjacencyList();
  }
  // Ignore empty lines.
  if (line.trim() === '') {
    return new AdjacencyList();
  }
  // Try to extract the edge label out of the line. It is denoted by a trailing
  // comment.
  let [nodeText, edgeLabel] = line.split('//');
  if (edgeLabel) {
    edgeLabel = edgeLabel.trim();
  }
  // First, split along the arrow. If there's no arrow, we're in bad shape.
  const split = nodeText.split('->');
  if (split.length !== 2) {
    throw new Error('Each line must contain exactly one arrow.');
  }
  let [left, right] = split;
  // Account for negative arrows.
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
  if (edgeLabel) {
    edge.label = edgeLabel;
  }
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