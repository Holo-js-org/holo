import { Holo, Router } from "../../../index.js";
import { registerComponents, HContainer } from "https://esm.run/holo-js/holo/components/default.js"; // will be changed once version gets bumped

const app = Holo.init();
app.setTitle("Holo Example");
registerComponents(app);
const HHeader = {
  name: () => "h-header",
  render: (args, inner) => {
    return `<header class="holo-header" ${args}>${inner}</header>`;
  }
};
app.registerComponent(HHeader);

const HCounter = {
  name: () => "h-counter",
  render: (args, inner) => {
    return `
      <div class="counter-component" ${args}>
        <p>Current count: <strong>{count}</strong></p>
        <button onclick="incrementCounter()">Increment</button>
        <button onclick="decrementCounter()">Decrement</button>
        ${inner}
      </div>
    `;
  }
};
app.registerComponent(HCounter);

app.state.count = 1;
app.state.username = "Guest";

function incrementCounter() {
  app.state.count += 1;
}

function decrementCounter() {
  app.state.count -= 1;
}

function updateUsername() {
  const name = prompt("Enter your name:", app.state.username);
  if (name) {
    app.state.username = name;
    app.saves.set("username", name);
  }
}

const savedUsername = app.saves.get("username");
if (savedUsername) {
  app.state.username = savedUsername;
}

const isLoggedIn = app.saves.get("login");
const checkLogin = () => {
  return app.saves.get("login") === "true";
};

function login() {
  app.saves.set("login", "true");
  app.state.username = "Authenticated User";
  window.location.hash = "/";
}

function logout() {
  app.saves.rm("login");
  app.state.username = "Guest";
  window.location.hash = "/login";
}

function clearStorage() {
  app.saves.clear();
  alert("All app data has been cleared");
  window.location.reload();
}

app.expose(incrementCounter);
app.expose(decrementCounter);
app.expose(updateUsername);
app.expose(login);
app.expose(logout);
app.expose(clearStorage);
app.exposeAsApp(); // use Holo.js from within the HTML as "app"

function authGuard(from, to) {
  const protectedRoutes = ["/profile"];
  if (protectedRoutes.includes(to) && !checkLogin()) {
    return "/login";
  }
  return true;
}

function toggleMenu() {
  $(".menu").toggle();
}

app.expose(toggleMenu);

app.onReady(() => {
  app.render(`
    <h-container>
      <h-header>
        <h1>Holo.js Example</h1>
        <p>Welcome, {username}!</p>
        <button onclick="toggleMenu()">Menu</button>
        <nav class="menu">
          <ul>
            <li><a href="/" data-router-link>Home</a></li>
            <li><a href="/about" data-router-link>About</a></li>
            <li><a href="/contact" data-router-link>Contact</a></li>
            <li><a href="/counter" data-router-link>Counter</a></li>
            <li><a href="/profile" data-router-link>Profile</a></li>
          </ul>
        </nav>
      </h-header>
      <h-container id="app-container"></h-container>
    </h-container>
  `);
  
  const router = new Router({ mode: "hash" })
    .setHoloInstance(app)
    .addGuard(authGuard)
    .add('/', `
      <h-container>
        <h1>Home</h1>
        <p>Welcome to the homepage, {username}!</p>
        <h-card>
          <h3>Features</h3>
          <ul>
            <li>Simple component system</li>
            <li>Client-side routing</li>
            <li>Route guards</li>
            <li>State management with reactive updates</li>
            <li>LocalStorage integration</li>
          </ul>
        </h-card>
        <p>Counter value: {count}</p>
      </h-container>
    `)
    .add('/about', `
      <h-container>
        <h1>About</h1>
        <p>This is the about page for Holo.js framework.</p>
        <p>User: {username}</p>
      </h-container>
    `)
    .add('/contact', `
      <h-container>
        <h1>Contact</h1>
        <p>Contact information goes here.</p>
        <h-button onclick="alert('Thank you for your message, ' + app.state.username + '!')">Send Message</h-button>
      </h-container>
    `)
    .add('/counter', `
      <h-container>
        <h1>State Management Demo</h1>
        <h-counter>
          <p>This component demonstrates reactive state.</p>
        </h-counter>
        <p>The count value is stored in app.state.count: {count}</p>
        <p>Try navigating to other pages and coming back - the state persists!</p>
      </h-container>
    `)
    .add('/profile', `
      <h-container>
        <h1>Profile</h1>
        <p>Welcome to your profile, {username}!</p>
        <p>Count: {count}</p>
        <h-button onclick="updateUsername()">Change Username</h-button>
        <h-button onclick="logout()">Logout</h-button>
        <h-button onclick="clearStorage()">Clear All Data</h-button>
      </h-container>
    `)
    .add('/login', `
      <h-container>
        <h1>Login</h1>
        <p>Please login to continue, {username}.</p>
        <h-button onclick="login()">Login</h-button>
      </h-container>
    `)
    .setNotFoundTemplate(`
      <h-container>
        <h1>Page Not Found</h1>
        <p>The page you requested could not be found, {username}.</p>
        <a href="/" data-router-link>Go Home</a>
      </h-container>
    `)
    .setContainer("#app-container")
    .init();
});

app.subscribeToState('count', (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});
