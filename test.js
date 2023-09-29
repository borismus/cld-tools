import {CausalGraph} from './causal-graph.js';
import {parseCGML, parseCGMLLine} from './cgml.js';
import {downsample, GraphSimulatorSimple, meanBetween} from './graph-simulator.js';
import {adjacencyListToNumericGraph, tarjanSCC} from './tarjan.js';
import {arrayMean, distinfo, isStrictlyDecreasing, isSuperLinearlyIncreasing, sparkline} from './sparkline.js';


test('Parse single CGML line', () => {
  const result = parseCGMLLine('Parent Funding (PF) -> Educational Outcomes (EO)');
  expect(result.nodes.length).toBe(2);
  expect(result.findNodeByName('PF')).toBeDefined();
  expect(result.findNodeByName('Fake')).toBeNull();
  expect(result.findNodeByName('EO').label).toBe('Educational Outcomes');
  expect(result.findNodeByName('PF').label).toBe('Parent Funding');
  expect(result.findNodeByName('PF').adjacentEdges.length).toBe(1);
  expect(result.findNodeByName('EO').adjacentEdges.length).toBe(0);
});

test('Allow empty CGML lines', () => {
  const result = parseCGMLLine('');
  expect(result.nodes.length).toBe(0);
})

test('Allow CGML lines with comments starting with //', () => {
  const result = parseCGMLLine('// This is a comment and it will be ignored.');
  expect(result.nodes.length).toBe(0);
  const leadingResult = parseCGMLLine('   // Even comments with leading whitespace.');
  expect(leadingResult.nodes.length).toBe(0);
})

test('Parse two-line CGML', () => {
  const result = parseCGML(`
  Parent Funding (PF) -> Educational Outcomes (EO)
  EO -> Dog
  `);
  expect(result.nodes.length).toBe(3);
  expect(result.findNodeByName('Dog')).toBeDefined();
  expect(result.findNodeByName('Dog').name).toBe('Dog');
});

test(`Parse CGML labels`, () => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  `);
  expect(result.findNodeByName('PF').label).toBe('Parent Funding');
  expect(result.findNodeByName('AR').label).toBe('Academic Results');
  expect(result.findNodeByName('SG').label).toBe('Satisfaction Gap');
});

test('Parse CGML with loop', () => {
  const result = parseCGML(`
  Parent Funding (A) -> Academic Results (B)
  B -> Satisfaction Gap (C)
  C -> A
  `);
  expect(result.nodes).toHaveLength(3);
  expect(result.findNodeByName('A').label).toBe('Parent Funding');
  expect(result.findNodeByName('A').adjacentEdges).toHaveLength(1);
  expect(result.findNodeByName('B').adjacentEdges).toHaveLength(1);
  expect(result.findNodeByName('C').adjacentEdges).toHaveLength(1);
});


test(`Parse CGML with negatives`, () => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  expect(result.nodes.length).toBe(4);
  expect(result.findNodeByName('SE').adjacentEdges.length).toBe(1);
  expect(result.findNodeByName('PF').adjacentEdges[0].isOpposite).toBe(false);
  expect(result.findNodeByName('SE').adjacentEdges[0].isOpposite).toBe(true);
});


test(`Adjacency list to numeric graph`, () => {
  const result = parseCGML(`
  A -> B
  B -> C
  C -> A
  `);
  const numericGraph = adjacencyListToNumericGraph(result);
  expect(numericGraph).toEqual([[1], [2], [0]]);
});

test(`More complex adj list to num graph`, () => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  AR -> School Inequality (SI)
  SI o-> PF
  `);
  const numericGraph = adjacencyListToNumericGraph(result);
  expect(numericGraph).toEqual([[1], [2, 4], [3], [0], [0]]);
})

test(`Tarjan's SCC algorithm for single loop`, () => {
  const result = parseCGML(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);

  const sccs = tarjanSCC(result);
  // Expect that there is one strongly connected component.
  expect(sccs.length).toBe(1);
  // Expect that it's a loop of length 4.
  expect(sccs[0].length).toBe(4);
});

test(`Tarjan's SCC algorithm for multiple loops`, () => {
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
  expect(sccs).toHaveLength(2);
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
  expect(threeLoop.length).toBe(3);
  expect(fourLoop.length).toBe(4);

  // Expect the 4-loop to be PF -> AR -> SG -> SE (-> PF)
  const fourNames = fourLoop.map(n => n.name);
  expect(fourNames.includes('PF')).toBeTruthy();
  expect(fourNames.includes('AR')).toBeTruthy();
  expect(fourNames.includes('SG')).toBeTruthy();
  expect(fourNames.includes('SE')).toBeTruthy();
  expect(fourNames.includes('SI')).toBeFalsy();

  // Expect the 3-loop to be PF -> AR -> SI (-> PF)
  const threeNames = threeLoop.map(n => n.name);
  expect(threeNames.includes('PF')).toBeTruthy();
  expect(threeNames.includes('AR')).toBeTruthy();
  expect(threeNames.includes('SI')).toBeTruthy();
  expect(threeNames.includes('SE')).toBeFalsy();
  expect(threeNames.includes('SG')).toBeFalsy();
});

test('Parse simple graphs without labels', () => {
  const graph = new CausalGraph('Parent Funding -> Educational Outcomes');
  expect(graph.adjList.nodes.length).toBe(2);
});

test(`Find reinforcing loops in simple causal graphs`, () => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);

  expect(graph.adjList.nodes.length).toBe(4);
  const loops = graph.analyzeLoops();
  expect(loops.length).toBe(1);
  expect(loops[0].type).toBe('BALANCING');
})


test(`Find balancing loops in simple causal graphs`, () => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE -> PF
  `);

  expect(graph.adjList.nodes.length).toBe(4);
  const loops = graph.analyzeLoops();
  expect(loops.length).toBe(1);
  expect(loops[0].type).toBe('REINFORCING');
});

test(`Convert to mermaid.js graph`, () => {
  const graph = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const mermaid = graph.toMermaid();

  expect(mermaid.startsWith('graph TD')).toBeTruthy();
  expect(mermaid.match(/^.*Academic Results.*-->.*Satisfaction Gap.*$/gm)).toBeDefined();
  expect(mermaid.match(/^.*School Enrollment.*-.->.*Parent Funding.*$/gm)).toBeDefined();
});

test(`Graph concatenation`, () => {
  const graph1 = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const graph2 = new CausalGraph(`
  AR -> School Inequality (SI)
  SI o-> Parent Funding (PF)
  `);

  graph1.concat(graph2);

  expect(graph1.adjList.nodes.length).toBe(5);
  expect(graph1.adjList.findNodeByName('PF').adjacentEdges.length).toBe(1);
  expect(graph1.adjList.findNodeByName('AR').adjacentEdges.length).toBe(2);
  expect(graph1.adjList.findNodeByName('SG').adjacentEdges.length).toBe(1);
  expect(graph1.adjList.findNodeByName('SE').adjacentEdges.length).toBe(1);

  const arEdgeNames = graph1.adjList.findNodeByName('AR').adjacentEdges.map(e => e.targetName);
  expect(arEdgeNames).toEqual(['SG', 'SI']);

  // Check that we only have one outgoing edge for SI.
  const siEdges = graph1.adjList.findNodeByName('SI').adjacentEdges;
  expect(siEdges.length).toBe(1);
});

test(`Subgraph IDs are assigned`, () => {
  const graph1 = new CausalGraph(`
  Hello (A) -> World (B)
  B -> C
  `);
  expect(graph1.adjList.id).not.toBe('');
  // Ensure just one subgraph ID here.
  for (const node of graph1.adjList.nodes) {
    expect(node.subgraphs.length).toBe(1);
  }
});

test(`Subgraph IDs persist through concat`, () => {
  const graph1 = new CausalGraph(`
  A -> B
  B -> C
  `);
  const graph2 = new CausalGraph(`
  C -> A
  D -> E
  `);
  graph1.concat(graph2);

  expect(graph1.adjList.id).not.toBe(graph2.adjList.id);
  expect(graph1.adjList.findNodeByName('B').subgraphs).toHaveLength(1);
  expect(graph1.adjList.findNodeByName('D').subgraphs).toHaveLength(1);
  expect(graph1.adjList.findNodeByName('E').subgraphs).toHaveLength(1);
  expect(graph1.adjList.findNodeByName('C').subgraphs).toHaveLength(1);
  expect(graph1.adjList.findNodeByName('A').subgraphs).toHaveLength(1);

  expect(graph1.adjList.findNodeByName('A').subgraphs).toEqual([graph1.adjList.id]);
  expect(graph1.adjList.findNodeByName('C').subgraphs).toEqual([graph1.adjList.id]);
  expect(graph1.adjList.findNodeByName('B').subgraphs).toEqual([graph1.adjList.id]);
  expect(graph1.adjList.findNodeByName('E').subgraphs).toEqual([graph2.adjList.id]);
});

test(`Node membership remains correct through subgraphs`, () => {
  const graph1 = new CausalGraph(`
  A -> B
  B -> C
  `);
  const graph2 = new CausalGraph(`
  C -> A
  A -> D
  E -> B
  `);
  graph1.concat(graph2);

  // Even though there's a link from A -> D and B -> E, expect D and E to be
  // part of graph2.
  expect(graph1.adjList.findNodeByName('D').subgraphs).toEqual([graph2.adjList.id]);
  expect(graph1.adjList.findNodeByName('E').subgraphs).toEqual([graph2.adjList.id]);
});

test(`Partitions work as expected.`, () => {
  const graph1 = new CausalGraph(`
  A -> B
  B -> C
  `);
  const graph2 = new CausalGraph(`
  C -> A
  A -> D
  E -> B
  `);
  graph1.concat(graph2);

  const partition = graph1.adjList.partitionSubgraphs();
  const partitionLengths = partition.map(p => p.length);
  expect(partitionLengths).toEqual([3, 2]);
});

test(`More complex partitions work as expected.`, () => {
  const graph1 = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const graph2 = new CausalGraph(`
  Academic Results (AR) -> School Inequality (SI)
  SI o-> Parent Funding (PF)
  `);
  graph1.concat(graph2);

  const partition = graph1.adjList.partitionSubgraphs();
  const partitionLengths = partition.map(p => p.length);
  expect(partitionLengths).toEqual([4, 1]);
});

test(`Subgraphs are rendered in mermaid diagrams`, () => {
  const graph1 = new CausalGraph(`
  A -> B
  B -> C
  `);
  const graph2 = new CausalGraph(`
  C -> A
  D -> E
  `);
  graph1.concat(graph2);

  // Expect A, B, C to be part of graph 1.
  // Expect D, E to be part of graph 2.
  const mermaid = graph1.toMermaid();

  const lines = mermaid.split('\n');
  expect(lines.includes('subgraph Graph 1')).toBeTruthy();
  expect(lines.includes('subgraph Graph 2')).toBeTruthy();
});

test(`Cycles are rendered in mermaid diagrams`, () => {
  // Verify that the edges that belong to a cycle are labeled with [RB][0-9]+,
  // for example R1 for the first reinforcing loop, or B3 for the third
  // balancing loop.
  const graph1 = new CausalGraph(`
  Parent Funding (PF) -> Academic Results (AR)
  AR -> Satisfaction Gap (SG)
  SG -> School Enrollment (SE)
  SE o-> PF
  `);
  const graph2 = new CausalGraph(`
  Academic Results (AR) -> School Inequality (SI)
  SI o-> Parent Funding (PF)
  `);
  graph1.concat(graph2);

  const mermaid = graph1.toMermaid({labelLoops: true});
  expect(mermaid.match(/^.*Academic Results.*-.->.*|B2|.*School Inequality.*$/gm)).toBeDefined();
  expect(mermaid.match(/^.*School Inequality.*-.->.*|B2|.*Parent Funding.*$/gm)).toBeDefined();

});

test(`Reinforcing and balancing loops are labeled in complex mermaid diagrams`, () => {
  const g1 = new CausalGraph(`
  A -> B
  B -> C
  A -> D
  `);
  const g2 = new CausalGraph(`
  C -> A
  D -> C
  C o-> E
  E -> A
  F -> B
  C -> F
  `);
  g1.concat(g2);
  const mermaid = g1.toMermaid({labelLoops: true});

  expect(mermaid.match(/^.*F.*-->.*|R5|.*B.*$/gm)).toBeDefined();
  expect(mermaid.match(/^.*C.*-->.*|R5|.*F.*$/gm)).toBeDefined();
});

test(`Simple graph simulation initializes to correct init values.`, () => {
  const g = new CausalGraph(`
  Parent Funding (A) -> Academic Results (B)
  B -> Satisfaction Gap (C)
  C -> A
  `);

  const sim = new GraphSimulatorSimple(g, {initialValues: {A: 3}, edgeAlpha: 0.1});
  expect(sim.values['A']).toBe(3);
  expect(sim.values['B']).toBe(1);
  expect(sim.values['C']).toBe(1);
  expect(sim.edgeAlpha).toBe(0.1);
});

test(`Adjacency list inbound nodes calculations work for simple graph.`, () => {
  const al = new parseCGML(`
  A -> B
  B -> C
  `);
  expect(() => al.findInboundAdjacentNodes('X')).toThrow();
  expect(al.findInboundAdjacentNodes('A')).toHaveLength(0);
  expect(al.findInboundAdjacentNodes('B')).toHaveLength(1);
  expect(al.findInboundAdjacentNodes('C')).toHaveLength(1);
});

test(`Adjacency list inbound nodes calculations work for more complex graph.`, () => {
  const al = new parseCGML(`
  A -> D
  B -> D
  C -> D
  `);
  expect(al.findInboundAdjacentNodes('D')).toHaveLength(3);
  expect(al.findInboundAdjacentNodes('A')).toHaveLength(0);
  expect(al.findInboundAdjacentNodes('B')).toHaveLength(0);
  expect(al.findInboundAdjacentNodes('C')).toHaveLength(0);
})

test(`Graph sim running works reasonably for a few iterations`, () => {
  const g = new CausalGraph(`
  Parent Funding (A) -> Academic Results (B)
  B -> Satisfaction Gap (C)
  C -> A
  `);
  const sim = new GraphSimulatorSimple(g);

  // First iteration.
  sim.run();
  expect(sim.values['A']).toBe(1.1);
  expect(sim.values['B']).toBe(1.1);
  expect(sim.values['C']).toBe(1.1);

  sim.run();
  expect(sim.values['A']).toBe(1.21);
  expect(sim.values['B']).toBe(1.21);
  expect(sim.values['C']).toBe(1.21);

  sim.run();
  expect(sim.values['A']).toBe(1.33);
  expect(sim.values['B']).toBe(1.33);
  expect(sim.values['C']).toBe(1.33);
});

test(`Graph reinforcing loop simulation and expect an exponential`, () => {
  const g = new CausalGraph(`
  Parent Funding (A) -> Academic Results (B)
  B -> Satisfaction Gap (C)
  C -> A
  `);
  const sim = new GraphSimulatorSimple(g);

  for (let i = 0; i < 100; i++) {
    sim.run();
  }
  // Expect the initial value plus one new value for each run.
  expect(sim.history['A']).toHaveLength(101);

  const history = sim.getNormalizedHistory('A', 10);
  // Expect normalized history to be the right length.
  expect(history).toHaveLength(10);

  // console.log(history.join(' '));
});

test(`Balancing loop simulation behaves right for the first few iters.`, () => {
  const g = new CausalGraph(`
  A -> B
  B o-> A
  `);
  const sim = new GraphSimulatorSimple(g);

  sim.run();
  expect(sim.values['A']).toBe(0.9);
  expect(sim.values['B']).toBe(1.1);

  sim.run();
  expect(sim.values['A']).toBe(0.79);
  expect(sim.values['B']).toBe(1.19);

  sim.run();
  expect(sim.values['A']).toBe(0.67);
  expect(sim.values['B']).toBe(1.27);
});

test(`Balancing loop simulation without targets hovers around zero asymptote.`, () => {
  const g = new CausalGraph(`
  A -> B
  B o-> A
  `);
  const sim = new GraphSimulatorSimple(g);

  for (let i = 0; i < 100; i++) {
    sim.run();
  }
  const array = sim.history['A'];
  const average = arrayMean(array);
  // console.log(array.join(' '));
  // console.log(sum);
  const delta = Math.abs(average);
  const EPS = 0.5;
  // console.log(sparkline(array));
  // console.log(array.join(' '));
  expect(delta < EPS).toBeTruthy();
});

test(`Sparkline works reasonably`, () => {
  expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8])).toBe('▁▂▃▄▅▆▇█');
  expect(sparkline([-5, -4, -3, -2, -1, 0, 1, 2])).toBe('▁▂▃▄▅▆▇█');
  expect(sparkline([1, 5, 10])).toBe('▁▄█');
  expect(sparkline([1, 100])).toBe('▁█');
  expect(sparkline([100, 99])).toBe('█▁');
  expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1])).toBe('▁▂▃▄▅▆▇█▇▆▅▄▃▂▁');
  expect(sparkline([1.5, 0.5, 3.5, 2.5, 5.5, 4.5, 7.5, 6.5])).toBe('▂▁▄▃▆▅█▇')
  // TODO: Figure out the numeric problem causing this case to fail.
  // expect(sparkline([0, 999, 4000, 4999, 7000, 7999]), '▁▁▅▅██');
});

test(`isSuperLinearlyIncreasing works`, () => {
  expect(isSuperLinearlyIncreasing([1, 2, 4, 8])).toBeTruthy();
  expect(isSuperLinearlyIncreasing([1, 2, 4, 8, 9])).toBeFalsy();
  expect(isSuperLinearlyIncreasing([1, 2, 3, 4, 5, 6])).toBeFalsy();
  expect(isSuperLinearlyIncreasing([1, 2, 3, 4, 5, 10])).toBeFalsy();
  expect(isSuperLinearlyIncreasing([5, 4, 2, -1, -100])).toBeFalsy();
});

test(`isStrictlyDecreasing works`, () => {
  expect(isStrictlyDecreasing([5, 4, 3, 2])).toBeTruthy();
  expect(isStrictlyDecreasing([1, 2, 4, 8, 9])).toBeFalsy();
});

test(`Balancing loop with target behaves right`, () => {
  const g = new CausalGraph(`
  A -> B
  B o-> A
  `);
  const sim = new GraphSimulatorSimple(g, {initialValue: 1, edgeAlpha: 0.1, targets: {'B': 10}});
  for (let i = 0; i < 100; i++) {
    sim.run();
  }

  const history = sim.history['B'];
  // console.log(sparkline(history), Math.min(...history), Math.max(...history));
  // Probably remove this no-op.
  expect(true).toBeTruthy();
});

test(`Balancing loop with invalid target throws error`, () => {
  const g = new CausalGraph(`
  A -> B
  B o-> A
  `);
  expect(() => {
    const sim = new GraphSimulatorSimple(g, {initialValue: 1, edgeAlpha: 0.1, targets: {'X': 10}});
  }).toThrow();
})

test(`Behavior of a reinforcing and balancing loop works (adopter / saturation).`, () => {
  const g = new CausalGraph(`
  Potential Adopters (PA) -> Adoption Rate (AR)
  AR o-> PA
  AR -> Actual Adopters (A)
  A -> AR
  `);
  const sim = new GraphSimulatorSimple(g, {initialValues: {AR: 0.1, PA: 10000}});
  for (let i = 0; i < 100; i++) {
    sim.run();
  }

  // console.log(sim.textSummary());

  expect(isSuperLinearlyIncreasing(sim.history['A'])).toBeTruthy();
  expect(isStrictlyDecreasing(sim.history['PA'])).toBeTruthy();
});

test(`SPS causal graphs work as expected.`, () => {
  const graph = new CausalGraph(`
Parental expectations (PE) o-> Satisfaction Gap (SG)
Academic <br/>Performance (AR) -> SG
SG -> Parental Funding (PF)
AR -> School Equality Gap (SI)
SI o-> PF
School Board <br/>Equity Desires (SB) o-> SI
SG o-> School enrollment(SE)
Parent funding (PF) -> AR
SE -> PF
  `)
  // There are three underlying loops:
  //
  // R1. Concerned parents can join as a collective (PTA) and fund new programs
  //     in the school. The more money they contribute, the better the school
  //     program becomes.
  // B2. The school board strives for more equal outcomes for schools in their
  //     district. This means focusing funding on needy schools, and
  //     also restricting funding on parental contributions in affluent areas.
  // B3. Parents have expectations for their children's performance. If
  //     expectations are not met, parents withdraw children from school, which
  //     reduces the amount of funding the school gets.
  const loops = graph.analyzeLoops();
  expect(loops).toHaveLength(3);

  // Hypothesis: if the school board has too strict a limit on contribution
  // limits for parents, academic outcomes will suffer, parents will withdraw
  // their children from the school and overall school funding will decrease.
  // Params:
  // - B2 goal: high (school board aims for equality)
  // - B3 goal: high (parents are ambitious)
  // Expectations:
  // - Academic Results plummet
  // - School Enrollment decreases
  // - Parent Funding decreases
  const sim = new GraphSimulatorSimple(graph, {targets: {'PE': 100, 'SB': 100}});
  for (let i = 0; i < 100; i++) {
    sim.run();
  }
  console.log(sim.textSummary({completeHistory: true}));

  // Hypothesis: if parents have relatively low expectations for their kids,
  // then their children can remain in school and their expectations can be met.
  // Params:
  // - B2 goal: high (school board aims for equality)
  // - B3 goal: low (parents are not ambitious)
  // Expectations:
  // - Academic Results is low
  // - School Enrollment is stable
  // - Parent Funding is low
  const sim2 = new GraphSimulatorSimple(graph, {targets: {'PE': -100, 'SB': 100}});
  for (let i = 0; i < 100; i++) {
    sim2.run();
  }
  console.log(sim2.textSummary({completeHistory: true}));

  // Hypothesis: if the school board does not care about academic equality,
  // even the most ambitious parents needs can be met in public schools.
  // Params:
  // - B2 goal: low (school board is fine with inequality)
  // - B3 goal: high (parents are ambitious)
  // Expectations:
  // - Academic Results is relatively high
  // - School Enrolment is stable
  // - Parent funding is high.
});

test(`Downsampling works as expected.`, () => {
  const result = downsample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  expect(result).toEqual([2, 5, 8]);

  const r2 = downsample([1, 2, 3, 4, 5, 6, 7], 2);
  expect(r2).toEqual([2, 5.5]);


  const r3 = downsample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 4);
  expect(r3).toEqual([1, 4.5, 8, 11.5]);
});

test(`meanBetween works as expected`, () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  expect(meanBetween(arr, 0, 2)).toBe(2);
  expect(meanBetween(arr, 3, 5)).toBe(5);
  expect(meanBetween(arr, 6, 8)).toBe(8);
  expect(meanBetween(arr, 1, 4)).toBe(3.5);
});