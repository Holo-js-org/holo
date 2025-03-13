![Banner](https://raw.githubusercontent.com/holo-js-org/holo/refs/heads/main/banner.png)
<div align="center">
<img src="https://img.shields.io/badge/License-GPL%203.0-green" alt="License"></img>
<img src="https://img.shields.io/badge/Status-Alpha-yellow" alt="Status"></img>
</div>

A lightweight, component-based JavaScript framework for building dynamic web applications with minimal boilerplate. Holo.js offers reactive state management, custom component registration, and flexible routing in a simple API.

## Features

- **Reactive State Management**: Auto-updating UI based on state changes
- **Custom Components**: Create reusable web components with simple API
- **Template Binding**: Easy templating with state variable interpolation
- **Flexible Routing**: Support for both hash and history routing modes
- **Route Guards**: Protect routes with custom logic
- **Persistent Storage**: Simple localStorage API integration
- **Minimal Size**: Lightweight framework with no dependencies
- **Progressive Web App Ready**: Built with modern web standards

## Installation

- `git clone` this repository.
- Copy over the `holo` folder to your project.
- Import it using ESM.

## Quick Start

```javascript
import { Holo, Router } from '/holo/index.js';

// Initialize the application
const app = Holo.init();

// Set application title
app.setTitle('My Holo App');

// Create state
app.state.counter = 0;
app.state.username = 'Guest';

// Define a component
app.registerComponent({
  name: 'counter-button',
  render: (attrs, inner) => `
    <button onclick="incrementCounter()">
      ${inner || 'Clicks'}: {counter}
    </button>
  `
});

// Global function
app.expose(function incrementCounter() {
  app.state.counter++;
});

// Render the main template
app.render(`
  <div id="app-content"></div>
  <div class="container">
    <h1>{username}'s App</h1>
    <counter-button>Count</counter-button>
  </div>
`);

// Setup router (optional)
const router = new Router({ mode: 'hash' })
  .setHoloInstance(app)
  .setContainer('#app-content')
  .add('/', '<h1>Home</h1><p>Welcome, {username}!</p>')
  .add('/about', '<h1>About</h1><p>This is a Holo app</p>')
  .setNotFoundTemplate('<h1>404</h1><p>Page not found</p>')
  .init();
```

## Core Concepts

### Application Instance

The core of every Holo application is an instance created with `Holo.init()`:

```javascript
const app = Holo.init();
```

### State Management

Holo uses a reactive state system that automatically updates the UI:

```javascript
// Define state
app.state.count = 0;
app.state.user = { name: 'Guest' };

// Update state (UI updates automatically)
app.state.count++;
app.state.user.name = 'John';

// Subscribe to state changes
app.subscribeToState('count', (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});
```

### Component Registration

Create reusable components with simple registration:

```javascript
app.registerComponent({
  name: 'user-card',
  render: (attrs, inner) => `
    <div class="card">
      <h3>{user.name}</h3>
      <div class="content">${inner}</div>
      <button onclick="greet('{user.name}')">Say Hello</button>
    </div>
  `
});

// Use the component
app.render(`
  <user-card>This is a user profile</user-card>
`);
```

### Templating

Templates use simple curly brace syntax for state interpolation:

```javascript
app.render(`
  <div>
    <h1>Welcome, {user.name}!</h1>
    <p>You have {notifications.length} notifications.</p>
  </div>
`);
```

### Routing

The Router provides navigation and content swapping:

```javascript
const router = new Router({ mode: 'hash' }) // or 'history'
  .setHoloInstance(app)
  .setContainer('#content')
  .add('/', homeTemplate)
  .add('/users', usersTemplate)
  .add('/users/:id', userDetailTemplate)
  .addGuard((from, to) => {
    // Return false to prevent navigation
    // Return string to redirect
    // Return undefined/true to continue
    if (to === '/admin' && !app.state.isAdmin) {
      return '/login';
    }
  })
  .init();

// Navigate programmatically
router.navigate('/users');
```

### Local Storage

Holo includes a simple storage API that is based on `localStorage`:

```javascript
// Store data
app.saves.set('user-prefs', { theme: 'dark', fontSize: 16 });

// Retrieve data
const prefs = app.saves.get('user-prefs');

// Remove item
app.saves.rm('user-prefs');

// Clear all app data
app.saves.clear();
```

## API Reference

### Holo Class

| Method | Description |
|--------|-------------|
| `Holo.init()` | Creates and initializes a new Holo application |
| `setTitle(title)` | Sets the document title |
| `registerComponent(component)` | Registers a custom component |
| `render(template, targetSelector)` | Renders a template to a DOM element |
| `onReady(callback)` | Executes code when DOM is loaded |
| `expose(fn, name)` | Exposes a function globally |
| `subscribeToState(prop, callback)` | Subscribes to state changes |

### Router Class

| Method | Description |
|--------|-------------|
| `new Router(options)` | Creates a new router instance |
| `setHoloInstance(app)` | Connects router to Holo instance |
| `setContainer(selector)` | Sets the container for route content |
| `add(path, template)` | Adds a route with content template |
| `setNotFoundTemplate(template)` | Sets 404 page template |
| `addGuard(guardFn)` | Adds a navigation guard function |
| `init()` | Initializes the router |
| `navigate(path)` | Navigates to a specific route |

### StorageManager Class

| Method | Description |
|--------|-------------|
| `set(key, value)` | Stores data in localStorage |
| `get(key)` | Retrieves data from localStorage |
| `rm(key)` | Removes data from localStorage |
| `clear()` | Clears all app data from localStorage |

## Best Practices

1. **Organize Components**: Create components for reusable UI elements
2. **State Structure**: Keep state organized with logical grouping
3. **Event Handling**: Use exposed functions for event handling
4. **Route Organization**: Group related routes for easier maintenance
5. **Error Handling**: Add error boundaries for component failures

## Examples

### Todo App

```javascript
import { Holo } from 'holo-js';

const app = Holo.init().setTitle('Holo Todo');

// Initial state
app.state.todos = [];
app.state.newTodo = '';

// Components
app.registerComponent({
  name: 'todo-item',
  render: (attrs, inner) => `
    <li>
      <input type="checkbox" onclick="toggleTodo(${inner})" 
        ${app.state.todos[inner].done ? 'checked' : ''}>
      <span style="${app.state.todos[inner].done ? 'text-decoration: line-through' : ''}">
        ${app.state.todos[inner].text}
      </span>
      <button onclick="removeTodo(${inner})">×</button>
    </li>
  `
});

// Global functions
app.expose(function addTodo() {
  if (app.state.newTodo.trim()) {
    app.state.todos = [...app.state.todos, { text: app.state.newTodo, done: false }];
    app.state.newTodo = '';
  }
});

app.expose(function removeTodo(index) {
  app.state.todos = app.state.todos.filter((_, i) => i !== index);
});

app.expose(function toggleTodo(index) {
  const newTodos = [...app.state.todos];
  newTodos[index].done = !newTodos[index].done;
  app.state.todos = newTodos;
});

app.expose(function updateInput(e) {
  app.state.newTodo = e.target.value;
});

// Render app
app.render(`
  <div class="todo-app">
    <h1>Holo Todo</h1>
    <div class="add-todo">
      <input type="text" value="{newTodo}" onkeyup="updateInput(event)" 
        onkeypress="if(event.key==='Enter')addTodo()">
      <button onclick="addTodo()">Add</button>
    </div>
    <ul>
      ${'{todos.map((_, i) => `<todo-item>${i}</todo-item>`).join("")}'}
    </ul>
    <div class="info">
      <p>{todos.length} items, {todos.filter(t => t.done).length} completed</p>
    </div>
  </div>
`);
```

## Browser Support

Holo.js supports all modern browser engines that implement the Web Components standard:

- Chromium
- Gecko
- WebKit
- (might support more, but we haven't tested)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0

see the [LICENSE](LICENSE) file for details.
