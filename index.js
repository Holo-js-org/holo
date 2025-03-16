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
    this.devtools = new DevTools(this);
    this.errorBoundary = new ErrorBoundary(this);
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

    this.devtools.logStateChange(prop, newValue, oldValue);
    
    this._updateStateBindings(prop);
  }

  _updateStateBindings(changedProp) {
    const bindingPattern = new RegExp(`{${changedProp}}`, 'g');
    
    document.querySelectorAll('[data-holo-binding]').forEach(element => {
      const bindings = element.getAttribute('data-holo-binding').split(',');
      
      if (bindings.includes(changedProp)) {
        const template = element.getAttribute('data-holo-template');
        if (template) {
          try {
            element.innerHTML = this._processTemplate(template);
          } catch (error) {
            this.errorBoundary.handleError(error, element, 'template-render');
          }
        }
      }
    });
  }

  _processTemplate(template) {
    try {
      return template.replace(/{(\w+)}/g, (match, stateName) => {
        return this.state[stateName] !== undefined ? this.state[stateName] : match;
      });
    } catch (error) {
      this.errorBoundary.handleError(error, null, 'template-processing');
      return template;
    }
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

  static init(prod) {
    const instance = new Holo();
    
    document.addEventListener("DOMContentLoaded", () => {
      document.title = instance.title;
      instance.readyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        instance.errorBoundary.handleError(error, null, 'ready-callback');
      }
});
if (!prod) instance.devtools.init();
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
    window.comp = instance.registerComponent;
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
  
  getTitle() {
	  return this.title;
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
        try {
          const startTime = performance.now();
          
          const attributes = Array.from(this.attributes)
            .map(attr => `${attr.name}="${attr.value}"`)
            .join(' ');
          
          const inner = this.innerHTML;
          let rendered;
          
          try {
            rendered = component.render(attributes, inner);
          } catch (error) {
            holoInstance.errorBoundary.handleError(error, this, 'component-render');
            rendered = holoInstance.errorBoundary.fallbackTemplates['default'];
          }
          
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
          
          const endTime = performance.now();
          holoInstance.devtools.logRender(name, endTime - startTime);
        } catch (error) {
          holoInstance.errorBoundary.handleError(error, this, 'component-lifecycle');
          this.outerHTML = holoInstance.errorBoundary.fallbackTemplates['default'];
        }
      }
    });
  }
  
  return this;
}

debug() {
  this.devtools.open();
  return {
    state: {...this.state},
    components: Array.from(this.componentRegistry.keys()),
    contexts: window.contextRegistry ? Array.from(window.contextRegistry.keys()) : [],
    inspect: (component) => {
      const comp = this.componentRegistry.get(component);
      return comp ? {...comp} : null;
    },
    dumpState: () => console.table({...this.state}),
    profile: async (callback) => {
      console.profile('Holo Performance');
      const start = performance.now();
      const result = await callback();
      const end = performance.now();
      console.profileEnd('Holo Performance');
      console.log(`Execution time: ${(end - start).toFixed(2)}ms`);
      return result;
    }
  };
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
  try {
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
    
    const startTime = performance.now();
    this.container.innerHTML = template;
    
    if (this.holoInstance) {
      this.holoInstance._setupStateBindings(this.container);
      const endTime = performance.now();
      this.holoInstance.devtools && this.holoInstance.devtools.logRender(`Route: ${path}`, endTime - startTime);
    }
    
    const event = new CustomEvent("route-changed", {
      detail: { path, template }
    });
    
    window.dispatchEvent(event);
  } catch (error) {
    if (this.holoInstance && this.holoInstance.errorBoundary) {
      this.holoInstance.errorBoundary.handleError(error, this.container, 'router-resolve');
      this.container.innerHTML = this.holoInstance.errorBoundary.fallbackTemplates['default'];
    } else {
      console.error('[Holo Router] Error during route resolution:', error);
      this.container.innerHTML = '<div style="padding:10px;color:#721c24;background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;">Router Error</div>';
    }
  }
}
}

export class Context {
  constructor(name) {
    if (!name) {
      throw new Error("Context requires a name parameter");
    }
    
    this.name = name;
    this.values = {};
    this.subscribers = new Map();
    this._context = new Proxy({}, {
      set: (target, prop, value) => {
        const oldValue = target[prop];
        target[prop] = value;
        if (oldValue !== value) {
          this._notifyContextChange(prop, value, oldValue);
        }
        return true;
      },
      get: (target, prop) => {
        return target[prop];
      }
    });
  }

  get context() {
    return this._context;
  }

  _notifyContextChange(prop, newValue, oldValue) {
    const subscribers = this.subscribers.get(prop) || [];
    subscribers.forEach(callback => callback(newValue, oldValue));
    
    window.dispatchEvent(new CustomEvent('context:change', {
      detail: { contextName: this.name, prop, newValue, oldValue }
    }));
    
    this._updateContextBindings(prop);
  }

  _updateContextBindings(changedProp) {
    const contextSelector = `[data-context-binding~="${this.name}.${changedProp}"]`;
    document.querySelectorAll(contextSelector).forEach(element => {
      const template = element.getAttribute('data-context-template');
      if (template) {
        element.innerHTML = this._processTemplate(template);
      }
    });
  }

  _processTemplate(template) {
    const contextRegex = new RegExp(`{${this.name}\\.(\\w+)}`, 'g');
    return template.replace(contextRegex, (match, key) => {
      return this.context[key] !== undefined ? this.context[key] : match;
    });
  }

  subscribe(prop, callback) {
    if (!this.subscribers.has(prop)) {
      this.subscribers.set(prop, []);
    }
    this.subscribers.get(prop).push(callback);
    
    return () => {
      const subscribers = this.subscribers.get(prop) || [];
      const index = subscribers.indexOf(callback);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  set(key, value) {
    this._context[key] = value;
    return this;
  }

  get(key) {
    return this._context[key];
  }

  update(keyOrObject, value) {
    if (typeof keyOrObject === 'object') {
      Object.entries(keyOrObject).forEach(([key, val]) => {
        this._context[key] = val;
      });
    } else {
      this._context[keyOrObject] = value;
    }
    return this;
  }

  clear(key) {
    if (key) {
      delete this._context[key];
    } else {
      Object.keys(this._context).forEach(k => delete this._context[k]);
    }
    return this;
  }

  setupBindings(root = document) {
    const bindingElements = root.querySelectorAll('*');
    const contextRegex = new RegExp(`{${this.name}\\.(\\w+)}`, 'g');
    
    bindingElements.forEach(element => {
      const innerHTML = element.innerHTML;
      const contextBindings = [];
      let match;
      
      while ((match = contextRegex.exec(innerHTML)) !== null) {
        contextBindings.push(`${this.name}.${match[1]}`);
      }
      
      if (contextBindings.length > 0) {
        const existingBindings = element.getAttribute('data-context-binding') || '';
        const newBindings = existingBindings ? 
          `${existingBindings} ${contextBindings.join(' ')}` : 
          contextBindings.join(' ');
        
        element.setAttribute('data-context-binding', newBindings);
        element.setAttribute('data-context-template', innerHTML);
        element.innerHTML = this._processTemplate(innerHTML);
      }
    });
    return this;
  }

  static new(name) {
    return new Context(name);
  }

  static global(name = 'app') {
    if (!window.contextRegistry) {
      window.contextRegistry = new Map();
    }
    
    if (!window.contextRegistry.has(name)) {
      window.contextRegistry.set(name, new Context(name));
    }
    
    return window.contextRegistry.get(name);
  }
  
  static getContext(name) {
    if (!window.contextRegistry || !window.contextRegistry.has(name)) {
      throw new Error(`Context with name '${name}' not found`);
    }
    return window.contextRegistry.get(name);
  }
  
  static processAllTemplates(template) {
    if (!window.contextRegistry) return template;
    
    let processed = template;
    window.contextRegistry.forEach((contextInstance, contextName) => {
      const contextRegex = new RegExp(`{${contextName}\\.(\\w+)}`, 'g');
      processed = processed.replace(contextRegex, (match, key) => {
        return contextInstance.context[key] !== undefined ? 
          contextInstance.context[key] : match;
      });
    });
    
    return processed;
  }
}

class DevTools {
  constructor(holoInstance) {
    this.holoInstance = holoInstance;
    this.isOpen = false;
    this.logs = [];
    this.maxLogs = 100;
    this.panelElement = null;
  }

  init() {
    if (localStorage.getItem('holo_devtools_enabled') === 'true') {
      this.createPanel();
    }
    
    document.addEventListener('keydown', (e) => {
      if ((e.shiftKey && e.key === "Tab")) {
        e.preventDefault();
        this.toggle();
      }
    });
    
    window.HoloDevTools = {
      open: () => this.open(),
      close: () => this.close(),
      toggle: () => this.toggle(),
      getState: () => ({...this.holoInstance.state}),
      setState: (key, value) => {
        this.holoInstance.state[key] = value;
        return true;
      },
      clearLogs: () => {
        this.logs = [];
        this.updatePanel();
      },
      getComponentRegistry: () => Array.from(this.holoInstance.componentRegistry.keys()),
      getRoutes: () => this.holoInstance.router ? Array.from(this.holoInstance.router.routes.keys()) : [],
      getContexts: () => window.contextRegistry ? Array.from(window.contextRegistry.keys()) : []
    };
  }

  createPanel() {
    if (this.panelElement) return;
    
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'holo-devtools';
    this.panelElement.style = 'position:fixed;bottom:0;right:0;width:400px;height:300px;background:#1e1e1e;color:#fff;z-index:9999;border:1px solid #555;display:flex;flex-direction:column;font-family:monospace;font-size:12px;resize:both;overflow:auto;';
    
    const header = document.createElement('div');
    header.innerHTML = 'Holo DevTools <span style="font-size:10px">(Shift+Tab to toggle)</span>';
    header.style = 'padding:5px;background:#333;display:flex;justify-content:space-between;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style = 'background:none;border:none;color:white;cursor:pointer;';
    closeBtn.onclick = () => this.close();
    
    header.appendChild(closeBtn);
    this.panelElement.appendChild(header);
    
    const tabs = document.createElement('div');
    tabs.style = 'display:flex;background:#2a2a2a;';
    
    const createTab = (name, isActive = false) => {
      const tab = document.createElement('div');
      tab.textContent = name;
      tab.style = `padding:5px 10px;cursor:pointer;${isActive ? 'background:#1e1e1e;' : ''}`;
      tab.onclick = () => this.switchTab(name.toLowerCase());
      return tab;
    };
    
    tabs.appendChild(createTab('Logs', true));
    tabs.appendChild(createTab('State'));
    tabs.appendChild(createTab('Components'));
    tabs.appendChild(createTab('Performance'));
    
    this.panelElement.appendChild(tabs);
    
    const content = document.createElement('div');
    content.className = 'devtools-content';
    content.style = 'flex:1;overflow:auto;padding:5px;';
    this.panelElement.appendChild(content);
    
    document.body.appendChild(this.panelElement);
    this.isOpen = true;
    
    this.switchTab('logs');
    localStorage.setItem('holo_devtools_enabled', 'true');
  }

  switchTab(tabName) {
    const content = this.panelElement.querySelector('.devtools-content');
    content.innerHTML = '';
    
    switch(tabName) {
      case 'logs':
        this.renderLogs(content);
        break;
      case 'state':
        this.renderState(content);
        break;
      case 'components':
        this.renderComponents(content);
        break;
      case 'performance':
        this.renderPerformance(content);
        break;
    }
    
    const tabs = this.panelElement.querySelectorAll('div[style*="padding:5px 10px"]');
    tabs.forEach(tab => {
      tab.style.background = tab.textContent.toLowerCase() === tabName ? '#1e1e1e' : '';
    });
  }

  renderLogs(container) {
    const logList = document.createElement('div');
    logList.style = 'height:100%;overflow:auto;';
    
    this.logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.style = `margin-bottom:3px;padding:3px;border-left:3px solid ${this.getLogColor(log.type)};`;
      
      const timestamp = document.createElement('span');
      timestamp.textContent = log.time;
      timestamp.style = 'color:#888;margin-right:5px;font-size:10px;';
      
      const message = document.createElement('span');
      message.textContent = log.message;
      
      logEntry.appendChild(timestamp);
      logEntry.appendChild(message);
      logList.appendChild(logEntry);
    });
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Logs';
    clearBtn.style = 'margin-bottom:5px;';
    clearBtn.onclick = () => {
      this.logs = [];
      this.updatePanel();
    };
    
    container.appendChild(clearBtn);
    container.appendChild(logList);
  }

  renderState(container) {
    const stateWrapper = document.createElement('div');
    
    const stateEntries = Object.entries(this.holoInstance.state);
    
    if (stateEntries.length === 0) {
      stateWrapper.textContent = 'No state variables defined yet.';
    } else {
      const table = document.createElement('table');
      table.style = 'width:100%;border-collapse:collapse;';
      
      table.innerHTML = `
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #444;padding:5px;">Key</th>
            <th style="text-align:left;border-bottom:1px solid #444;padding:5px;">Value</th>
            <th style="text-align:left;border-bottom:1px solid #444;padding:5px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${stateEntries.map(([key, value]) => `
            <tr>
              <td style="padding:5px;border-bottom:1px solid #333;">${key}</td>
              <td style="padding:5px;border-bottom:1px solid #333;word-break:break-all;">${this.formatValue(value)}</td>
              <td style="padding:5px;border-bottom:1px solid #333;">
                <button onclick="HoloDevTools.setState('${key}', prompt('New value for ${key}:', '${this.escapeStr(value)}'))">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      stateWrapper.appendChild(table);
    }
    
    container.appendChild(stateWrapper);
  }

  renderComponents(container) {
    const componentsDiv = document.createElement('div');
    
    const componentsList = Array.from(this.holoInstance.componentRegistry.keys());
    
    if (componentsList.length === 0) {
      componentsDiv.textContent = 'No components registered yet.';
    } else {
      const list = document.createElement('ul');
      list.style = 'list-style:none;padding:0;margin:0;';
      
      componentsList.forEach(comp => {
        const item = document.createElement('li');
        item.style = 'padding:5px;border-bottom:1px solid #333;';
        item.textContent = comp;
        list.appendChild(item);
      });
      
      componentsDiv.appendChild(list);
    }
    
    container.appendChild(componentsDiv);
  }

  renderPerformance(container) {
    const perfDiv = document.createElement('div');
    
    const renderTimeDiv = document.createElement('div');
    renderTimeDiv.style = 'margin-bottom:10px;';
    renderTimeDiv.innerHTML = '<strong>Last Render Time:</strong> ' + 
      (this.lastRenderTime ? `${this.lastRenderTime.toFixed(2)}ms` : 'N/A');
    
    const stateUpdatesDiv = document.createElement('div');
    stateUpdatesDiv.innerHTML = '<strong>State Updates:</strong> ' + 
      this.logs.filter(log => log.type === 'state').length;
    
    const errorsDiv = document.createElement('div');
    errorsDiv.style = 'margin-top:10px;';
    errorsDiv.innerHTML = '<strong>Errors:</strong> ' + 
      this.logs.filter(log => log.type === 'error').length;
    
    perfDiv.appendChild(renderTimeDiv);
    perfDiv.appendChild(stateUpdatesDiv);
    perfDiv.appendChild(errorsDiv);
    
    container.appendChild(perfDiv);
  }

  open() {
    if (!this.isOpen) {
      this.createPanel();
    }
  }

  close() {
    if (this.panelElement) {
      document.body.removeChild(this.panelElement);
      this.panelElement = null;
      this.isOpen = false;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
      localStorage.setItem('holo_devtools_enabled', 'false');
    } else {
      this.open();
      localStorage.setItem('holo_devtools_enabled', 'true');
    }
  }

  updatePanel() {
    if (this.isOpen && this.panelElement) {
      const content = this.panelElement.querySelector('.devtools-content');
      const activeTab = Array.from(this.panelElement.querySelectorAll('div[style*="padding:5px 10px"]'))
        .find(tab => tab.style.background === '#1e1e1e');
      
      if (activeTab) {
        this.switchTab(activeTab.textContent.toLowerCase());
      }
    }
  }

  log(message, type = 'info') {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    this.logs.unshift({
      message,
      type,
      time: timeStr
    });
    
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    this.updatePanel();
  }

  logStateChange(prop, newValue, oldValue) {
    this.log(`State changed: ${prop} = ${this.formatValue(newValue)} (was: ${this.formatValue(oldValue)})`, 'state');
  }

  logError(error, context) {
    this.log(`Error: ${error.message} in ${context || 'unknown context'}`, 'error');
  }

  logRender(component, renderTime) {
    this.lastRenderTime = renderTime;
    this.log(`Rendered ${component} in ${renderTime.toFixed(2)}ms`, 'render');
  }

  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
      } catch (e) {
        return '[Complex Object]';
      }
    }
    
    return String(value);
  }

  escapeStr(value) {
    if (typeof value === 'string') {
      return value.replace(/"/g, '\\"');
    }
    return value;
  }

  getLogColor(type) {
    switch(type) {
      case 'error': return '#ff5555';
      case 'warn': return '#ffaa00';
      case 'state': return '#55aaff';
      case 'render': return '#55ff55';
      default: return '#aaaaaa';
    }
  }
}

class ErrorBoundary {
  constructor(holoInstance) {
    this.holoInstance = holoInstance;
    this.fallbackTemplates = {
      default: '<div style="padding:10px;color:#721c24;background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;">Component Rendering Error</div>',
      'template-render': '<div style="padding:10px;color:#721c24;background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;">Template Rendering Error</div>'
    };
    this.errorHandlers = new Map();
  }

  setFallback(type, template) {
    this.fallbackTemplates[type] = template;
    return this;
  }

  registerErrorHandler(type, handler) {
    this.errorHandlers.set(type, handler);
    return this;
  }

handleError(error, element, type = 'default') {
    console.error(`[Holo Error Boundary] ${type}:`, error);
    
    if (this.holoInstance.devtools) {
      this.holoInstance.devtools.logError(error, type);
    }
    
    const handler = this.errorHandlers.get(type);
    if (handler) {
      try {
        handler(error, element);
        return;
      } catch (handlerError) {
        console.error('[Holo Error Boundary] Error in custom handler:', handlerError);
      }
    }

    if (element) {
      const fallback = this.fallbackTemplates[type] || this.fallbackTemplates.default;
      element.innerHTML = fallback;
    }
    
    window.dispatchEvent(new CustomEvent('holo:error', {
      detail: { error, type, element }
    }));
  }
  
  wrapMethod(object, methodName, errorType = 'method-call') {
    const originalMethod = object[methodName];
    const errorBoundary = this;
    
    object[methodName] = function(...args) {
      try {
        return originalMethod.apply(this, args);
      } catch (error) {
        errorBoundary.handleError(error, null, errorType);
        return null;
      }
    };
    
    return this;
  }
  
  withErrorHandling(fn, errorType = 'function', context = null) {
    return (...args) => {
      try {
        return fn.apply(context, args);
      } catch (error) {
        this.handleError(error, null, errorType);
        return null;
      }
    };
  }
  
  safeEval(code, context = {}) {
    try {
      const fn = new Function(...Object.keys(context), `return ${code}`);
      return fn(...Object.values(context));
    } catch (error) {
      this.handleError(error, null, 'code-evaluation');
      return null;
    }
  }
}
