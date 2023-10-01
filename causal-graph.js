import {parseCGML} from "./cgml.js";
import {tarjanSCC} from "./tarjan.js";

/**
 * Represents a causal graph, takes simple Causal Graph Markup Language as input.
 * Syntax is dead simple
 */
export class CausalGraph {
  // Graphs are likely to be pretty sparse, lending itself well to an adjacency
  // list. This is a collection of Nodes.
  adjList = null;
  mermaidOrientation = 'TD'

  constructor(cgml) {
    this.adjList = parseCGML(cgml);
  }

  analyzeLoops() {
    // Run Tarjan's algorithm for finding strongly connected components (SCCs)
    // of a graph.
    const cycles = tarjanSCC(this.adjList);

    const out = [];
    for (const cycle of cycles) {
      const cl = new CausalLoop();
      cl.nodes = cycle;

      const edges = [];
      // Assuming uniqueness of edges from one node to another
      // (eg. can't have A -> B and A -> B), also find the edges involved.
      for (const [ind, node] of cl.nodes.entries()) {
        // TODO: is it safe to assume that the cycle is well ordered?
        let theEdge = null;
        const nextNode = cl.nodes[(ind + 1) % cl.nodes.length];
        // Find the edge in this node, pointing to nextNode.
        for (const edge of node.adjacentEdges) {
          if (edge.targetName === nextNode.name) {
            // Edge found.
            theEdge = edge;
            break;
          }
        }

        // If we didn't find the edge at all, something went horribly wrong.
        if (!theEdge) {
          throw new Error(`Could not find edge between "${node.name}" and "${nextNode.name}"`);
        }
        edges.push(theEdge);
      }

      cl.edges = edges;
      out.push(cl);
    }
    return out;
  }

  /**
   * @returns {string} This graph represented in mermaid.js.
   */
  toMermaid({labelLoops = false} = {}) {
    let out = `graph ${this.mermaidOrientation}\n`;

    // Calculate loops and mark each loop with R or B depending on loop type,
    // as well as the cycle index.
    const loops = labelLoops ? this.analyzeLoops() : [];
    if (labelLoops) {
      // console.log(`Found ${loops.length} loops.`);
    }
    // Give each node an index for mermaid output purposes.
    for (const [ind, node] of this.adjList.nodes.entries()) {
      node.index = ind;
    }

    // Iterate through nodes in the graph, partitioning by subgraph.
    const partitions = this.adjList.partitionSubgraphs();

    // 1. Layout the structure of the nodes into subgraphs.
    if (partitions.length === 0) {
      throw new Error(`No partitions.`);
    } else if (partitions.length === 1) {
      // Just one graph.
      out += nodeListToMermaidNodes(partitions[0]);
    } else {
      // Render each subgraph with a subgraph ... end declaration.
      for (const [ind, nodeList] of partitions.entries()) {
        out += `subgraph Graph ${ind + 1}\n`;
        out += nodeListToMermaidNodes(nodeList);
        out += `end\n`;
      }
    }

    out += this.nodeListToMermaidEdges(this.adjList.nodes, loops);

    return out.trim();
  }

  /**
   * XYZ
   * @param {CausalGraph} graph
   */
  concat(graph) {
    this.adjList.concat(graph.adjList);
  }

  nodeListToMermaidEdges(nodes, loops) {
    let out = '';
    // Go through adjacency list and spit out mermaid.js graph, edge by edge.
    for (const fromNode of nodes) {
      for (const edge of fromNode.adjacentEdges) {
        const toNode = this.adjList.findNodeByName(edge.targetName);
        const feedbackLabel = this.getFeedbackLoopLabel(fromNode, toNode, loops);
        let label = edge.label;
        if (feedbackLabel) {
          label += ` <b>${feedbackLabel}</b>`;
        }
        label = label.trim();
        if (label) {
          label = `|${label}|`;
        }
        const arrow = edge.isOpposite ? `-.->` : `-->`;
        const line = `${nodeToMermaid(fromNode)} ${arrow}${label} ${nodeToMermaid(toNode)}\n`;
        out += line;

        // Also save the edges that were added to the list of edges.
        // outEdges.push(edge);
      }
    }
    return out;
  }

  getFeedbackLoopLabel(fromNode, toNode, loops) {
    const loopLabels = [];
    for (const [ind, loop] of loops.entries()) {
      if (loop.isDirectlyConnected(fromNode, toNode)) {
        // console.log(`${fromNode.label} is connected to ${toNode.label}`);
        loopLabels.push(`${loop.typeShort}${ind + 1}`);
      }
    }
    let label = '';
    if (loopLabels.length > 0) {
      label = `${loopLabels.join(', ')}`;
    }
    return label;
  }
}

export class CausalLoop {
  // Which nodes are part of this loop.
  nodes = [];
  // Which edges are part of this loop.
  edges = [];

  /**
   * A balancing loop has an odd number of opposite edges (eg. 1)
   * A reinforcing loop has an even number of opposite edges (eg. 0, 2).
   *
   * @returns "BALANCING" | "REINFORCING"
   */
  get type() {
    return this.isBalancing ? 'BALANCING' : 'REINFORCING';
  }

  get isBalancing() {
    const oppositeEdges = this.edges.filter(edge => edge.isOpposite);
    return oppositeEdges.length % 2 !== 0;
  }

  get typeShort() {
    return this.isBalancing ? 'B' : 'R';
  }

  /**
   *
   * @param {Node} fromNode
   * @param {Node} toNode
   * @returns {boolean} true iff this loop contains an edge going from fromNode
   * to toNode.
   */
  isDirectlyConnected(fromNode, toNode) {
    // For two nodes to be directly connected and part of the loop, the edge
    // between them needs to be inside the edge.

    let theEdge = null;
    for (const edge of fromNode.adjacentEdges) {
      if (edge.targetName === toNode.name) {
        theEdge = edge;
        break;
      }
    }

    // Check that this edge exists in our list.
    return this.edges.includes(theEdge);
  }
}

function nodeToMermaid(node) {
  return `${node.index}[${node.label}]`;
}

function nodeListToMermaidNodes(nodeList) {
  let out = '';
  for (const node of nodeList) {
    out += `${nodeToMermaid(node)}\n`;
  }
  return out;
}