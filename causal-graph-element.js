import {html, css, LitElement} from 'https://cdn.jsdelivr.net/npm/lit-element@3.3.3/+esm';
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@9.4.3/+esm';

import {CausalGraph} from './causal-graph.js';

export class CausalGraphElement extends LitElement {
  static get styles() {
    return css`
      p { color: blue; }
      .mermaid { width: 100%; }
      .mermaid svg {
        max-width: none !important;
        max-height: 100vh;
      }
      .wrap {
        display: flex;
        flex-direction: row;
        align-items: center;
        height: 100%;
      }
  `;
  }

  static get properties() {
    return {
      name: {type: String},
      cgml: {type: String, reflect: true},
      noTextarea: {type: Boolean, reflect: true},
    }
  }

  constructor() {
    super();
    this.name = 'Somebody';
    this.cgml = '';
    this.noTextarea = false;
  }

  updated(changedProps) {
    // console.log('updated', changedProps);
    if (changedProps.has('cgml')) {
      this.renderGraph(this.cgml);

      let myEvent = new CustomEvent('cgml-change', {
        detail: {cgml: this.cgml, message: 'my-event happened.'},
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(myEvent);

    }
  }

  handleTextareaBlur(e) {
    console.log(`Blur`);
  }

  handleTextareaInput(e) {
    const textarea = e.target;
    const cgml = textarea.value;
    this.cgml = cgml;

    // Triggered when you change this.cgml.
    // this.renderGraph(cgml);
  }

  renderGraph(cgml) {
    const mermaidEl = this.shadowRoot.querySelector('.mermaid');
    try {
      if (!cgml) {
        mermaidEl.innerHTML = '';
        return;
      }
      const graph = new CausalGraph(cgml);
      graph.mermaidOrientation = 'LR';

      const mermaidMarkup = graph.toMermaid({labelLoops: true});
      // console.log('Rendering mermaid.js', mermaidMarkup)

      mermaid.mermaidAPI.render('graphDiv', mermaidMarkup, (svgCode) => {
        mermaidEl.innerHTML = svgCode;
      });
    } catch (e) {
      console.log('Bad graph.', e);
    }
  }

  render() {
    const textarea = !this.noTextarea ?
      html`<textarea cols=80 rows=10 placeholder="Your CGML graph goes in here." @input=${this.handleTextareaInput}
  @blur=${this.handleTextareaBlur}>${this.cgml}</textarea>` : html``;
    return html`
    <div class="wrap">
      ${textarea}
      <div class="mermaid">Mermaid diagram comes out here</div>
    </div>
    `;
  }
}

customElements.define('causal-graph', CausalGraphElement);
