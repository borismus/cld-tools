import {CausalGraph} from "./causal-graph.js";
import {CausalGraphElement} from "./causal-graph-element.js";
mermaid.mermaidAPI.initialize({startOnLoad: false});

window.addEventListener('DOMContentLoaded', e => {
  const root = document.querySelector('#graph-list');
  const graphs = root.querySelectorAll('causal-graph');
  for (const graph of graphs) {
    graph.addEventListener('cgml-change', onCGMLChange);
  }
});

function onCGMLChange() {
  // Get CGML from all of the graphs.
  const root = document.querySelector('#graph-list');
  const graphEls = root.querySelectorAll('causal-graph');

  const cgmls = Array.from(graphEls).map(g => g.cgml);
  for (const cgml of cgmls) {
    if (cgml == '') {
      return;
    }
  }

  const graphs = cgmls.map(cgml => new CausalGraph(cgml));
  const finalGraph = graphs[0];
  for (const graph of graphs.slice(1)) {
    finalGraph.concat(graph);
  }
  finalGraph.mermaidOrientation = 'LR';

  mermaid.mermaidAPI.render('graphDiv2', finalGraph.toMermaid({labelLoops: true}), svgCode => {
    console.log(`mermaid.mermaidAPI.render: ${svgCode.length} chars.`);
    const finalGraphEl = document.querySelector('#final');
    finalGraphEl.innerHTML = svgCode;
  });
}