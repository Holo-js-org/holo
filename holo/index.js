// holo/index.js
export class Holo {
  constructor() {
    this.title = "Holo App";
    this.components = {};
    this.readyCallbacks = [];
    this.rootElement = null;
    this.componentRegistry = new Map();
  }

  static init() {
    const instance = new Holo();
    
    document.addEventListener("DOMContentLoaded", () => {
      document.title = instance.title;
      instance.readyCallbacks.forEach(callback => callback());
    });
    
    return instance;
  }

  setTitle(title) {
    this.title = title;
    if (document.readyState !== "loading") {
      document.title = title;
    }
    return this;
  }

  registerComponent(component) {
    if (!component.name || !component.render) {
      throw new Error("Components must have name and render methods");
    }
    
    const name = typeof component.name === 'function' ? component.name() : component.name;
    
    this.componentRegistry.set(name, component);
    
    if (customElements.get(name) === undefined) {
      customElements.define(name, class extends HTMLElement {
        connectedCallback() {
          const attributes = Array.from(this.attributes)
            .map(attr => `${attr.name}="${attr.value}"`)
            .join(' ');
          
          const inner = this.innerHTML;
          const rendered = component.render(attributes, inner);
          
          this.outerHTML = rendered;
        }
      });
    }
    
    return this;
  }

  onReady(callback) {
    if (document.readyState !== "loading") {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
    return this;
  }

  render(template, targetSelector = 'body') {
    const target = targetSelector === 'body' ? document.body : document.querySelector(targetSelector);
    
    if (!target) {
      throw new Error(`Target element "${targetSelector}" not found`);
    }
    
    target.innerHTML = template;
    this.processComponents(target);
    return this;
  }

  processComponents(root) {
    this.componentRegistry.forEach((component, tagName) => {
      const elements = root.querySelectorAll(tagName);
      elements.forEach(element => {
        if (element.processed) return;
        element.processed = true;
      });
    });
    return this;
  }

  expose(fn, name) {
    window[name || fn.name] = fn;
    return this;
  }
}

export class Router {
  constructor(options = { mode: "hash" }) {
    this.routes = new Map();
    this.mode = options.mode === "history" && window.history.pushState ? "history" : "hash";
    this.container = null;
    this.notFoundTemplate = "<h1>404 - Page Not Found</h1>";
    this.guards = [];
    this.currentRoute = null;
  }

  add(path, template) {
    this.routes.set(path, template);
    return this;
  }

  setContainer(selector) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Container "${selector}" not found`);
    }
    return this;
  }

  setNotFoundTemplate(template) {
    this.notFoundTemplate = template;
    return this;
  }

  addGuard(guardFn) {
    this.guards.push(guardFn);
    return this;
  }

  init() {
    if (!this.container) {
      throw new Error("Container element must be set before initializing router");
    }
    
    window.addEventListener("popstate", () => this.resolve());
    
    document.addEventListener("click", (e) => {
      const routerLink = e.target.closest("[data-router-link]");
      if (!routerLink) return;
      
      e.preventDefault();
      const href = routerLink.getAttribute("href");
      this.navigate(href);
    });
    
    this.resolve();
    return this;
  }

  navigate(path) {
    if (this.mode === "history") {
      window.history.pushState(null, null, path);
    } else {
      window.location.hash = path;
    }
    this.resolve();
  }

  getPath() {
    if (this.mode === "history") {
      return window.location.pathname;
    } else {
      const hash = window.location.hash.substring(1);
      return hash || "/";
    }
  }

  async resolve() {
    const path = this.getPath();
    const to = path;
    const from = this.currentRoute;
    
    for (const guard of this.guards) {
      const result = await guard(from, to);
      
      if (result === false) {
        return;
      }
      
      if (typeof result === "string") {
        this.navigate(result);
        return;
      }
    }
    
    this.currentRoute = path;
    
    const template = this.routes.get(path) || this.notFoundTemplate;
    this.container.innerHTML = template;
    
    const event = new CustomEvent("route-changed", {
      detail: { path, template }
    });
    
    window.dispatchEvent(event);
  }
}
