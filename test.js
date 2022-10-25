import test from 'ava';
import {CausalGraph} from './causal-graph.js';
import {parseCGML, parseCGMLLine} from "./cgml.js";
import {adjacencyListToNumericGraph, tarjanSCC} from './tarjan.js';

test('Parse single CGML line', t => {
  const result = parseCGMLLine('Parent Funding (PF) -> Educational Outcomes (EO)');
  t.is(result.nodes.length, 2);
  t.not(result.findNodeByName('PF'), null);
  t.is(result.findNodeByName('Fake'), null);
  t.is(result.findNodeByName('EO').label, 'Educational Outcomes');
  t.is(result.findNodeByName('PF').label, 'Parent Funding');
  t.is(result.findNodeByName('PF').adjacentEdges.length, 1);
  t.is(result.findNodeByName('EO').adjacentEdges.length, 0);
});

test('Parse two-line CGML', t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Educational Outcomes (EO)
  EO -> Dog
  `);
  t.is(result.nodes.length, 3);
  t.not(result.findNodeByName('Dog'), null);
  t.is(result.findNodeByName('Dog').name, 'Dog');
});

test(`Parse CGML labels`, t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  `);
  t.is(result.findNodeByName('PF').label, 'Parent Funding');
  t.is(result.findNodeByName('AR').label, 'Academic Results');
  t.is(result.findNodeByName('SG').label, 'Satisfaction Gap');
});

test('Parse CGML with loop', t => {
  const result = parseCGML(`
  Parent Funding (A) -> Academic Results (B)
  B -> Satisfaction Gap (C)
  C -> A
  `);
  t.is(result.nodes.length, 3);
  t.is(result.findNodeByName('A').label, 'Parent Funding');
  t.is(result.findNodeByName('A').adjacentEdges.length, 1);
  t.is(result.findNodeByName('B').adjacentEdges.length, 1);
  t.is(result.findNodeByName('C').adjacentEdges.length, 1);
});


test(`Parse CGML with negatives`, t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  t.is(result.nodes.length, 4);
  t.is(result.findNodeByName('SE').adjacentEdges.length, 1);
  t.is(result.findNodeByName('PF').adjacentEdges[0].isOpposite, false);
  t.is(result.findNodeByName('SE').adjacentEdges[0].isOpposite, true);
});


test(`Adjacency list to numeric graph`, t => {
  const result = parseCGML(`
  A -> B
  B -> C
  C -> A
  `);
  const numericGraph = adjacencyListToNumericGraph(result);
  t.deepEqual(numericGraph, [[1], [2], [0]]);
});

test(`More complex adj list to num graph`, t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  AR -> School Inequality (SI)
  SI o-> PF
  `);
  const numericGraph = adjacencyListToNumericGraph(result);
  t.deepEqual(numericGraph, [[1], [2,4], [3], [0], [0]]);
})

test(`Tarjan's SCC algorithm for single loop`, t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);

  const sccs = tarjanSCC(result);
  // Expect that there is one strongly connected component.
  t.is(sccs.length, 1);
  // Expect that it's a loop of length 4.
  t.is(sccs[0].length, 4);
});

test(`Tarjan's SCC algorithm for multiple loops`, t => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  AR -> School Inequality (SI)
  SI o-> PF
  `);

  const sccs = tarjanSCC(result);
  // Expect that there is are two strongly connected components.
  t.is(sccs.length, 2);
  // Expect that one of the loops has length 4, and the other length 3.
  const [loop1, loop2] = sccs;
  let threeLoop, fourLoop
  if (loop1.length === 3) {
    threeLoop = loop1;
    fourLoop = loop2;
  } else {
    threeLoop = loop2;
    fourLoop = loop1;
  }
  t.is(threeLoop.length, 3);
  t.is(fourLoop.length, 4);

  // Expect the 4-loop to be PF -> AR -> SG -> SE (-> PF)
  const fourNames = fourLoop.map(n => n.name);
  t.true(fourNames.includes('PF'));
  t.true(fourNames.includes('AR'));
  t.true(fourNames.includes('SG'));
  t.true(fourNames.includes('SE'));
  t.false(fourNames.includes('SI'));

  // Expect the 3-loop to be PF -> AR -> SI (-> PF)
  const threeNames = threeLoop.map(n => n.name);
  t.true(threeNames.includes('PF'));
  t.true(threeNames.includes('AR'));
  t.true(threeNames.includes('SI'));
  t.false(threeNames.includes('SE'));
  t.false(threeNames.includes('SG'));
});

test(`Find reinforcing loops in simple causal graphs`, t => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);

  t.is(graph.adjList.nodes.length, 4);
  const loops = graph.analyzeLoops();
  t.is(loops.length, 1);
  t.is(loops[0].type, 'BALANCING');
})


test(`Find balancing loops in simple causal graphs`, t => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE -> PF
  `);

  t.is(graph.adjList.nodes.length, 4);
  const loops = graph.analyzeLoops();
  t.is(loops.length, 1);
  t.is(loops[0].type, 'REINFORCING');
});

test(`Convert to mermaid.js graph`, t => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const mermaid = graph.toMermaid();
  const lines = mermaid.split('\n');

  t.true(mermaid.startsWith('graph TD'));
  t.is(lines[0], 'graph TD');
  t.is(lines[1], `PF[Parent Funding] --> AR[Academic Results]`);
  t.is(lines[lines.length - 1], `SE[School Enrollment] -.-> PF[Parent Funding]`);
});

test(`Graph concatenation`, t => {
  const graph1 = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const graph2 = new CausalGraph(`
  AR (Academic Results) -> School Inequality (SI)
  SI o-> Parent Funding (PF)
  `);
  graph1.concat(graph2);

  t.is(graph1.adjList.nodes.length, 6);
});

test(`Subgraph IDs are assigned`, t => {
  const graph1 = new CausalGraph(`
  Hello (A) -> World (B)
  B -> C
  `);
  t.true(graph1.adjList.id != '');
  // Ensure just one subgraph ID here.
  for (const node of graph1.adjList.nodes) {
    t.is(node.subgraphs.length, 1);
  }
});

test(`Subgraph IDs persist through concat`, t => {
  const graph1 = new CausalGraph(`
  A -> B
  B -> C
  `);
  const graph2 = new CausalGraph(`
  C -> A
  D -> E
  `);
  graph1.concat(graph2);

  t.not(graph1.adjList.id, graph2.adjList.id);
  t.is(graph1.adjList.findNodeByName('B').subgraphs.length, 1);
  t.is(graph1.adjList.findNodeByName('D').subgraphs.length, 1);
  t.is(graph1.adjList.findNodeByName('E').subgraphs.length, 1);
  t.is(graph1.adjList.findNodeByName('C').subgraphs.length, 2);
  t.is(graph1.adjList.findNodeByName('A').subgraphs.length, 2);

  t.deepEqual(graph1.adjList.findNodeByName('A').subgraphs, [graph1.adjList.id, graph2.adjList.id]);
  t.deepEqual(graph1.adjList.findNodeByName('C').subgraphs, [graph1.adjList.id, graph2.adjList.id]);
  t.deepEqual(graph1.adjList.findNodeByName('B').subgraphs, [graph1.adjList.id]);
  t.deepEqual(graph1.adjList.findNodeByName('E').subgraphs, [graph2.adjList.id]);
});