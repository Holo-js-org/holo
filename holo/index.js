export class Holo {
  constructor() {
    this.title = "Holo App";
    this.components = {};
    this.readyCallbacks = [];
    this.rootElement = null;
    this.componentRegistry = new Map();
    this._state = new Proxy({}, {
      set: (target, prop, value) => {
        const oldValue = target[prop];
        target[prop] = value;
        if (oldValue !== value) {
          this._notifyStateChange(prop, value, oldValue);
        }
        return true;
      }
    });
    this._stateSubscribers = new Map();
    this.saves = new StorageManager();
  }

  get state() {
    return this._state;
  }

  _notifyStateChange(prop, newValue, oldValue) {
    const subscribers = this._stateSubscribers.get(prop) || [];
    subscribers.forEach(callback => callback(newValue, oldValue));
    
    window.dispatchEvent(new CustomEvent('holo:state-change', {
      detail: { prop, newValue, oldValue }
    }));
    
    this._updateStateBindings(prop);
  }

  _updateStateBindings(changedProp) {
    const bindingPattern = new RegExp(`{${changedProp}}`, 'g');
    
    document.querySelectorAll('[data-holo-binding]').forEach(element => {
      const bindings = element.getAttribute('data-holo-binding').split(',');
      
      if (bindings.includes(changedProp)) {
        const template = element.getAttribute('data-holo-template');
        if (template) {
          element.innerHTML = this._processTemplate(template);
        }
      }
    });
  }

  _processTemplate(template) {
    return template.replace(/{(\w+)}/g, (match, stateName) => {
      return this.state[stateName] !== undefined ? this.state[stateName] : match;
    });
  }

  subscribeToState(prop, callback) {
    if (!this._stateSubscribers.has(prop)) {
      this._stateSubscribers.set(prop, []);
    }
    this._stateSubscribers.get(prop).push(callback);
    
    return () => {
      const subscribers = this._stateSubscribers.get(prop) || [];
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  static init() {
    const instance = new Holo();
    
    document.addEventListener("DOMContentLoaded", () => {
      document.title = instance.title;
      instance.readyCallbacks.forEach(callback => callback());
    });
	
		console.log(`                   
               :::::                                                                                                                          
             :::::::::                                                                                                                        
=-----      ::::- ::::                                                                          
=-----      -:::- :::::                                                 
--=+        ----- :::::::                                            
  %%%%   -------     :::::                                       
 %%%#+-------==        ----                           
  #*+=------=====+    +++++                                         
 =========== =====  ==++++                                       
 =======     ===== ====                                         
 =====+      +==== ====                                         
 +=====      ==========                                       
 =====      ==========                                                      
               =======                                       
                +=                                                                                                                                                                                                                                                           
`);
    window.comp = registerComponent;
    return instance;
  }

  setTitle(title) {
    this.title = title;
    if (document.readyState !== "loading") {
      document.title = title;
    }
    return this;
  }
  
  exposeAsApp() {
	  window.app = this;
  }

  registerComponent(component) {
    if (!component.name || !component.render) {
      throw new Error("Components must have name and render methods");
    }
    
    const name = typeof component.name === 'function' ? component.name() : component.name;
    
    this.componentRegistry.set(name, component);
    
    if (customElements.get(name) === undefined) {
      const holoInstance = this;
      
      customElements.define(name, class extends HTMLElement {
        connectedCallback() {
          const attributes = Array.from(this.attributes)
            .map(attr => `${attr.name}="${attr.value}"`)
            .join(' ');
          
          const inner = this.innerHTML;
          let rendered = component.render(attributes, inner);
          
          rendered = holoInstance._processTemplate(rendered);
          
          const stateBindings = [...rendered.matchAll(/{(\w+)}/g)].map(match => match[1]);
          
          if (stateBindings.length > 0) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = rendered;
            
            for (const element of tempContainer.querySelectorAll('*')) {
              const innerHTML = element.innerHTML;
              const bindings = [...innerHTML.matchAll(/{(\w+)}/g)].map(match => match[1]);
              
              if (bindings.length > 0) {
                element.setAttribute('data-holo-binding', bindings.join(','));
                element.setAttribute('data-holo-template', innerHTML);
              }
            }
            
            rendered = tempContainer.innerHTML;
          }
          
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
    
    const processedTemplate = this._processTemplate(template);
    
    target.innerHTML = processedTemplate;
    this.processComponents(target);
    this._setupStateBindings(target);
    
    return this;
  }

  _setupStateBindings(root) {
    const bindingElements = root.querySelectorAll('*');
    
    bindingElements.forEach(element => {
      const innerHTML = element.innerHTML;
      const bindings = [...innerHTML.matchAll(/{(\w+)}/g)].map(match => match[1]);
      
      if (bindings.length > 0) {
        element.setAttribute('data-holo-binding', bindings.join(','));
        element.setAttribute('data-holo-template', innerHTML);
        element.innerHTML = this._processTemplate(innerHTML);
      }
    });
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

class StorageManager {
  constructor(prefix = 'holo_') {
    this.prefix = prefix;
  }
  
  set(key, value) {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
    return this;
  }
  
  get(key) {
    const value = localStorage.getItem(this.prefix + key);
    try {
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return value;
    }
  }
  
  rm(key) {
    localStorage.removeItem(this.prefix + key);
    return this;
  }
  
  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
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
    this.holoInstance = null;
  }

  setHoloInstance(holoInstance) {
    this.holoInstance = holoInstance;
    return this;
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
    
    window.addEventListener('holo:state-change', () => {
      this.updateRouteContent();
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
	console.log(`[Holo.js] ${path}`);
  }

  getPath() {
    if (this.mode === "history") {
      return window.location.pathname;
    } else {
      const hash = window.location.hash.substring(1);
      return hash || "/";
    }
  }

  updateRouteContent() {
    const path = this.currentRoute;
    if (!path) return;
    
    let template = this.routes.get(path) || this.notFoundTemplate;
    
    if (this.holoInstance) {
      template = this.holoInstance._processTemplate(template);
    }
    
    this.container.innerHTML = template;
    
    if (this.holoInstance) {
      this.holoInstance._setupStateBindings(this.container);
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
    
    let template = this.routes.get(path) || this.notFoundTemplate;
    if (this.holoInstance) {
      template = this.holoInstance._processTemplate(template);
    }
    
    this.container.innerHTML = template;
    if (this.holoInstance) {
      this.holoInstance._setupStateBindings(this.container);
    }
    
    const event = new CustomEvent("route-changed", {
      detail: { path, template }
    });
    
    window.dispatchEvent(event);
  }
}