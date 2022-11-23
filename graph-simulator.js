const DEFAULT_EDGE_ALPHA = 0.1;
const DEFAULT_INITIAL_VALUE = 1;

/**
 * Simulates a causal graph with initial values specified on each node.
 */
export class GraphSimulatorSimple {
  // Key: node name. Value: number array.
  history = {};
  // Key: node name. Value: current value.
  values = {};

  constructor(graph, {initialValue = DEFAULT_INITIAL_VALUE, edgeAlpha = DEFAULT_EDGE_ALPHA}) {
    this.graph = graph;
    this.initialValue = initialValue;
    this.edgeAlpha = edgeAlpha;

    for (const node of graph.adjList.nodes) {
      this.values[node.name] = this.initialValue;
      this.history[node.name] = [this.initialValue];
    }
  }

  run() {
    // For each node, calculate its future value based on current value and all
    // incoming edges and their weights.
    // N_t = N_{t-1} + \sum^{i\in in} \alpha_i I_i
    const newValues = structuredClone(this.values);
    const nodes = this.graph.adjList.nodes;

    // Calculate the new value for each node in the adjacency list.
    // For each node, get its incoming edges.
    for (const node of nodes) {
      let newValue = newValues[node.name];
      const inboundNodes = this.graph.adjList.findInboundAdjacentNodes(node.name);
      for (const [inboundNode, edge] of inboundNodes) {
        const oppositeMul = edge.isOpposite ? -1 : 1;
        const delta = this.values[inboundNode.name] * this.edgeAlpha * oppositeMul;
        // console.log(`${inboundNode.name} -> ${node.name}: delta ${delta}.`);
        // How much does this inbound node contribute to the value of the node.
        newValue += delta;
      }

      // New value can't be negative? Then the balancing loop does not work.
      // newValue = Math.max(0, newValue);

      // Reduce precision as needed.
      newValue = Number(newValue.toFixed(2));

      newValues[node.name] = newValue;

      // Save this value in history too.
      this.history[node.name].push(newValue);
    }

    this.values = newValues;
  }

  /**
   * @param {string} nodeName name of the node of interest
   * @returns {number[]} resampled history of this node consisting of N values between MIN and MAX.
   */
  getNormalizedHistory(nodeName, bins = 10, minValue = 0, maxValue = 1) {
    const history = this.history[nodeName];
    // Assume this history is quite long compared to the number of bins.
    // Naive implementation: pick values roughly at the right index, without
    // doing any binning. Pick the first and last values, and then bins-2 values
    // in between.
    const sampling = history.length / (bins - 1);
    let resampled = [];
    for (let i = 0; i < bins - 1; i++) {
      const ind = Math.round(i * sampling);
      resampled.push(history[ind]);
    }
    resampled.push(history[history.length - 1]);

    const min = Math.min(...history);
    const max = Math.max(...history);
    const normalized = resampled.map(res => (res - min) / (max - min));
    const out = normalized.map(norm => (norm * maxValue) + minValue);

    return out;
  }
}