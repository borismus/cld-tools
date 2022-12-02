import {distinfo, sparkline} from './sparkline.js';

const DEFAULT_EDGE_ALPHA = 0.1;
const DEFAULT_INITIAL_VALUE = 1;

class BalancingLoopTarget {
  nodeName = '';
  target = 0;
}

/**
 * Simulates a causal graph with initial values specified on each node.
 */
export class GraphSimulatorSimple {
  // Key: node name. Value: number array.
  history = {};
  // Key: node name. Value: current value.
  values = {};
  // Key: node name. Value: the target value.
  targets = {};

  constructor(graph, {initialValues = {}, edgeAlpha = DEFAULT_EDGE_ALPHA, targets = {}} = {}) {
    this.graph = graph;
    this.edgeAlpha = edgeAlpha;

    for (const node of graph.adjList.nodes) {
      let initialValue = initialValues[node.name] || DEFAULT_INITIAL_VALUE;
      this.values[node.name] = initialValue;
      this.history[node.name] = [initialValue];
    }

    for (const nodeName in initialValues) {
      if (this.values[nodeName] === undefined) {
        throw new Error(`Initial value for "${nodeName}" provided but node does not exist.`);
        continue;
      }
    }

    for (const nodeName in targets) {
      // Check that the provided targets correspond to nodes in the graph.
      if (this.values[nodeName] === undefined) {
        throw new Error(`Target for "${nodeName}" provided but node does not exist.`);
        continue;
      }
      const target = targets[nodeName];
      this.targets[nodeName] = target;
      console.log(`Added ${nodeName} -> ${target} to targets list.`);
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
        let target = this.targets[inboundNode.name] || 0;
        const oppositeMul = edge.isOpposite ? -1 : 1;
        const delta = (this.values[inboundNode.name] - target) * this.edgeAlpha * oppositeMul;
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

  textSummary({historyChars = 40, labelChars=20, showDistInfo=false} = {}) {
    // Produce a table containing information about each node in the graph.
    let out = '';
    for (const node of this.graph.adjList.nodes) {
      const label = padOrCut(node.label, labelChars);
      const series = this.history[node.name].slice(-historyChars);
      const history = sparkline(series);
      let line = `| ${label} | ${history} |`;
      if (showDistInfo) {
        const {min, max, mean} = distinfo(series);
        line += ` [${min}, ${max}], µ=${mean} |`;
      }
      out += `${line}\n`;
    }
    return out;
  }
}

function padOrCut(str, length=20) {
  if (str.length > length) {
    return str.substr(0, length);
  } else {
    return str.padEnd(length);
  }
}