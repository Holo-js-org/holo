import { Holo } from '../../index.js';

const app = Holo.init();

app.registerComponent({
  name: 'risky-component',
  render: (attrs, inner) => {
    try {
      const data = JSON.parse(inner);
      return `<div>${data.name}</div>`;
    } catch (error) {
      throw new Error('Failed to parse JSON data');
    }
  }
});

app.render(`
<h1>Error Boundary Test:</h1>
<risky-component>noJSON</risky-component>
`);
