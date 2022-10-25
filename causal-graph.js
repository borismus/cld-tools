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
          if (edge.targetName = nextNode.name) {
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
  toMermaid() {

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
    const oppositeEdges = this.edges.filter(edge => edge.isOpposite);
    if (oppositeEdges.length % 2 === 0) {
      return 'REINFORCING';
    } else {
      return 'BALANCING';
    }
  }
}