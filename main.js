import {CausalGraph} from "./causal-graph.js";
import {CausalGraphElement} from "./causal-graph-element.js";
mermaid.mermaidAPI.initialize({startOnLoad: false});

window.addEventListener('DOMContentLoaded', e => {
  const savedCGML = localStorage.getItem('CGML');
  if (savedCGML) {
    loadSavedCGML();
  } else {
    // Otherwise, create a placeholder graph node.
    createGraphElement();
  }

  for (const graph of getAllCausalGraphElements()) {
    graph.addEventListener('cgml-change', onCGMLChange);
  }

  // Hook up the add GraphElement button.
  const addButton = document.querySelector('button#add');
  addButton.addEventListener('click', e => {
    createGraphElement();
  });

  const saveButton = document.querySelector('button#save');
  saveButton.addEventListener('click', e => {
    localStorage.setItem('CGML', JSON.stringify(getAllCGML()));
  })

  const loadButton = document.querySelector('button#load');
  loadButton.addEventListener('click', e => {
    loadSavedCGML();
  })

});

window.addEventListener('unload', e => {
  // Save the graph structure in localStorage.
  console.log('Page Unloaded');
});

function loadSavedCGML() {
  getAllCausalGraphElements().map(el => el.remove());

  const savedCGML = localStorage.getItem('CGML');
  // If we have CGML saved, load them.
  try {
    const cgmls = JSON.parse(savedCGML);
    for (const cgml of cgmls) {
      console.log(`Loading CGML: "${cgml}".`);
      // Make a graph element for each CGML.
      createGraphElement(cgml);
    }
  } catch (e) {
    alert('Saved CGML is not JSON.');
    console.error(e);
  }
}

function createGraphElement(cgml = '') {
  const root = document.querySelector('#graph-list');
  const graph = new CausalGraphElement();
  graph.addEventListener('cgml-change', onCGMLChange);
  root.append(graph);

  graph.cgml = cgml;
}

function getAllCausalGraphElements() {
  const root = document.querySelector('#graph-list');
  const graphEls = root.querySelectorAll('causal-graph');
  return Array.from(graphEls);
}

function getAllCGML() {
  // Get CGML from all of the graphs.
  const graphEls = getAllCausalGraphElements();
  const cgmls = Array.from(graphEls).map(g => g.cgml);
  return cgmls;
}

function onCGMLChange() {
  const cgmls = getAllCGML();
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