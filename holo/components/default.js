// holo/components.js
import { Holo } from './index.js';

export const HContainer = {
  name: () => "h-container",
  render: (args, inner) => {
    return `<div ${args}>${inner}</div>`;
  }
};

export const HButton = {
  name: () => "h-button",
  render: (args, inner) => {
    return `<button class="holo-button" ${args}>${inner}</button>`;
  }
};

export const HCard = {
  name: () => "h-card",
  render: (args, inner) => {
    return `<div class="holo-card" ${args}>${inner}</div>`;
  }
};

export function registerComponents(app) {
  app.registerComponent(HContainer);
  app.registerComponent(HButton);
  app.registerComponent(HCard);
  return app;
}
