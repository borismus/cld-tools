import {CausalGraph} from "./causal-graph.js";
mermaid.mermaidAPI.initialize({startOnLoad: false});


window.addEventListener('DOMContentLoaded', e => {

  const textarea = document.querySelector('textarea');
  const out = document.querySelector('#mermaid');

  textarea.addEventListener('blur', e => {
    console.log('Textarea blurred.');
    const cgml = textarea.value;
    const graph = new CausalGraph(cgml);
    const mermaidGraph = graph.toMermaid();

    mermaid.mermaidAPI.render('graphDiv', mermaidGraph, (svgCode) => {
      out.innerHTML = svgCode;
    });
  });

});