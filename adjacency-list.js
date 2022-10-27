const NO_SUBGRAPH_ID = 'NO_SUBGRAPH';

export class AdjacencyList {
  nodes = [];
  id = '';

  constructor() {
    this.id = uuid();
  }

  /**
   * Adds another AdjacencyList to this one.
   * @param {AdjacencyList} otherAL
   */
  concat(otherAL) {
    for (const otherSource of otherAL.nodes) {
      // Find the corresponding source node in this graph.
      const thisSource = this.findNodeByName(otherSource.name);
      if (thisSource === null) {
        // If it's not found, add it and all of its adjacent nodes.
        const source = otherSource.clone();
        // console.log(`append: ${otherSource.name} not found: adding wholesale.`, source);
        this.nodes.push(source);
      } else {
        // If this source is found, see if the other source points to any
        // other targets.
        // console.log(`Found node named "${otherSource.name}":`, thisSource);
        for (const edge of otherSource.adjacentEdges) {
          const otherTargetName = edge.targetName;
          const otherTarget = otherAL.findNodeByName(edge.targetName);
          // Check if the other target is already in our target's adjacency list.
          const adjEdgeNames = thisSource.adjacentEdges.map(e => e.name);
          const isPresent = adjEdgeNames.includes(otherTargetName);
          if (isPresent) {
            // If present, assume the node also exists in the graph.
            continue;
          }
          // Otherwise, check if the node exists in the graph at all.
          let thisTarget = this.findNodeByName(otherTargetName);
          if (thisTarget === null) {
            // The other target doesn't exist in this node.
            // console.log(`Did not find target node named "${otherTargetName}". Creating.`);
            thisTarget = otherTarget.clone();
            // Reset the adjacent edges for this target.
            thisTarget.adjacentEdges = [];
            // thisTarget.subgraphs.push(this.id);
            this.nodes.push(thisTarget);
          } else {
            // This target exists in the graph, already, but still add the other
            // graph as a subgraph.
            // console.log(`Found target node named "${otherTargetName}" in graph.`);
            // thisTarget.subgraphs.push(otherAL.id);
          }

          // And then add the name to our adjacency list.
          // console.log(`Adding edge "${thisSource.name}" -> "${edge.targetName}"`);
          // console.log(`Existing edges`, thisSource.adjacentEdges);
          thisSource.adjacentEdges.push(edge.clone());
        }
      }
    }
  }

  /**
   *
   * @param {string} name
   */
  findNodeByName(name) {
    for (const node of this.nodes) {
      if (node.name === name) {
        return node;
      }
    }
    return null;
  }

  findNodeIndexByName(name) {
    for (const [ind, node] of this.nodes.entries()) {
      if (node.name === name) {
        return ind;
      }
    }
    return -1;
  }

  flattenSubgraphs() {
    this.nodes.map(node => node.subgraphs = [this.id]);
  }

  getSubgraphIds() {
    const subgraphs = [];
    this.nodes.map(node => subgraphs.push(...node.subgraphs))
    return new Set(subgraphs);
  }

  /**
   * @return {Node[][]} A partitioning of nodes, so that each node belongs to
   * its dominant subgraph.
   */
  partitionSubgraphs() {
    const partition = {};
    for (const node of this.nodes) {
      const subgraphId = (node.subgraphs && node.subgraphs.length > 0) ?
        node.subgraphs[0] : NO_SUBGRAPH_ID;

      if (partition[subgraphId] === undefined) {
        partition[subgraphId] = [];
      }
      partition[subgraphId].push(node);
    }

    return Object.values(partition);
  }

  /**
   * @return {NodePair[]} A list of list of all node pairs connected by
   * edges in this graph.
   */
  allNodePairs() {
    const out = [];
    for (const node of this.nodes) {
      for (const edge of node.adjacentEdges) {
        out.push(new NodePair(node, this.findNodeByName(edge.targetName)));
      }
    }
    return out;
  }

  /**
   *
   * @returns [NodePair[][], NodePair[]] Partitioned NodePairs as well as
   * unpartitioned nodepairs.
   */
  partitionedNodePairs() {
    // Get all node pairs in this graph.
    const nodePairs = this.allNodePairs();
    // Get the partitioned subgraphs.
    const partition = this.partitionSubgraphs();
    const partitionedPairs = partition.map(p => []);
    const unpartitionedPairs = [];
    // Arrange node pairs to map onto the partitions.
    for (const nodePair of nodePairs) {
      // For each node pair, check if its source and target is in the same
      // partition. If so, it belongs to that partition. Otherwise, it belongs
      // to the unpartitioned list.
      let isPartitioned = false;
      for (const [ind, part] of partition.entries()) {
        if (part.includes(nodePair.from) && part.includes(nodePair.to)) {
          console.log(`Partition ind=${ind} includes both ${nodePair.from.name} and ${nodePair.to.name}`);
          partitionedPairs[ind].push(nodePair);
          isPartitioned = true;
          break;
        }
      }
      if (!isPartitioned) {
        unpartitionedPairs.push(nodePair);
      }
    }

    return [partitionedPairs, unpartitionedPairs];
  }
}

export class NodePair {
  from = null;
  to = null;

  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}

export class Node {
  // TODO: Can we avoid having IDs at all?
  // The canonincal name for this node.
  name = '';
  // The human readable label (if specified).
  label = ''
  // List of node names this node links to.
  adjacentEdges = [];
  // Which subgraph IDs this node belongs to.
  subgraphs = [];

  clone() {
    const copy = new Node();
    copy.name = this.name;
    copy.label = this.label;
    copy.adjacentEdges = this.adjacentEdges.map(edge => edge.clone());
    copy.subgraphs = this.subgraphs.slice();
    return copy;
  }
}

export class Edge {
  // The name of the target node.
  targetName = '';
  // The valence of the label.
  isOpposite = false;

  clone() {
    const copy = new Edge();
    copy.targetName = this.targetName;
    copy.isOpposite = this.isOpposite;
    return copy;
  }
}

function uuid() {
  if (globalThis.crypto) {
    return crypto.randomUUID();
  } else {
    return generateUUID();
  }
}

function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if(d > 0){//Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {//Use microseconds since page-load if supported
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}