import {html, css, LitElement} from 'https://cdn.skypack.dev/lit';
import {CausalGraph} from './causal-graph.js';

export class CausalGraphElement extends LitElement {
  static get styles() {
    return css`p { color: blue }`;
  }

  static get properties() {
    return {
      name: {type: String},
      readonly: {type: Boolean},
      cgml: {type: String},
    }
  }

  constructor() {
    super();
    this.readonly = false;
    this.name = 'Somebody';
    this.cgml = '';
  }

  handleTextareaBlur(e) {
    console.log(`Blur`);
  }

  handleTextareaInput(e) {
    const textarea = e.target;
    const cgml = textarea.value;
    this.cgml = cgml;

    let myEvent = new CustomEvent('cgml-change', {
      detail: {cgml, message: 'my-event happened.'},
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(myEvent);

    try {
      const graph = new CausalGraph(cgml);
      graph.mermaidOrientation = 'LR';

      const mermaidGraph = graph.toMermaid({labelLoops: true});

      mermaid.mermaidAPI.render('graphDiv', mermaidGraph, (svgCode) => {
        this.shadowRoot.querySelector('.mermaid').innerHTML = svgCode;
      });
    } catch (e) {
      console.log('Bad graph.', e);
    }


  }

  render() {
    const textarea = !this.readonly ?
      html`<textarea cols=80 rows=10 placeholder="Your CGML graph goes in here." @input=${this.handleTextareaInput}
  @blur=${this.handleTextareaBlur}></textarea>` : html``;
    return html`
    <div style="display: flex; flex-direction: row">
      ${textarea}
      <div class="mermaid">Mermaid diagram comes out here</div>
    </div>
    `;
  }
}

customElements.define('causal-graph', CausalGraphElement);
