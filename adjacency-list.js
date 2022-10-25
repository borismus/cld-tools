export class AdjacencyList {
  nodes = [];

  /**
   * Adds another AdjacencyList to this one.
   * @param {AdjacencyList} otherAL
   */
  append(otherAL) {
    for (const otherSource of otherAL.nodes) {
      // Find the corresponding source node in this graph.
      const thisSource = this.findNodeByName(otherSource.name);
      if (thisSource === null) {
        // If it's not found, add it and all of its adjacent nodes.
        // console.log(`append: ${otherSource.name} not found: adding wholesale.`);
        this.nodes.push(otherSource.clone());
      } else {
        // If this source is found, see if the other source points to any
        // other targets.
        // console.log(`Found otherSource`, otherSource);
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
            // console.log(`Did not find node named "${otherTargetName}". Creating.`);
            this.nodes.push(otherTarget.clone());
          }

          // And then add the name to our adjacency list.
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
}

export class Node {
  // TODO: Can we avoid having IDs at all?
  // The canonincal name for this node.
  name = '';
  // The human readable label (if specified).
  label = ''
  // List of node names this node links to.
  adjacentEdges = [];

  clone() {
    const copy = new Node();
    copy.name = this.name;
    copy.label = this.label;
    copy.adjacentEdges = this.adjacentEdges.map(edge => edge.clone());
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