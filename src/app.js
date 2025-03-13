import { Holo, Router } from "/holo/index.js";
import { registerComponents, HContainer } from "/holo/components/default.js";

const app = Holo.init();
app.setTitle("Holo App");
registerComponents(app);

const HHeader = {
  name: () => "h-header",
  render: (args, inner) => {
    return `<header class="holo-header" ${args}>${inner}</header>`;
  }
};
app.registerComponent(HHeader);

function authGuard(from, to) {
  const isAuthenticated = localStorage.getItem("auth_token") !== null;
  if (to === "/profile" && !isAuthenticated) {
    return "/login";
  }
  return true;
}

function toggleMenu() {
  const menu = document.querySelector(".menu");
  menu.classList.toggle("active");
}

app.expose(toggleMenu);

app.onReady(() => {
  app.render(`
    <h-container>
      <h-header>
        <h1>Holo.js Example</h1>
        <button onclick="toggleMenu()">Menu</button>
        <nav class="menu">
          <ul>
            <li><a href="/" data-router-link>Home</a></li>
            <li><a href="/about" data-router-link>About</a></li>
            <li><a href="/contact" data-router-link>Contact</a></li>
            <li><a href="/profile" data-router-link>Profile</a></li>
          </ul>
        </nav>
      </h-header>
      <h-container id="app-container"></h-container>
    </h-container>
  `);
  
  const router = new Router({ mode: "hash" })
    .addGuard(authGuard)
    .add('/', `
      <h-container>
        <h1>Home</h1>
        <p>Welcome to the homepage!</p>
        <h-card>
          <h3>Features</h3>
          <ul>
            <li>Simple component system</li>
            <li>Client-side routing</li>
            <li>Route guards</li>
          </ul>
        </h-card>
      </h-container>
    `)
    .add('/about', `
      <h-container>
        <h1>About</h1>
        <p>This is the about page for Holo.js framework.</p>
      </h-container>
    `)
    .add('/contact', `
      <h-container>
        <h1>Contact</h1>
        <p>Contact information goes here.</p>
        <h-button onclick="alert('Thank you for your message!')">Send Message</h-button>
      </h-container>
    `)
    .add('/profile', `
      <h-container>
        <h1>Profile</h1>
        <p>Welcome to your profile page.</p>
        <h-button onclick="localStorage.removeItem('auth_token'); window.location.reload();">Logout</h-button>
      </h-container>
    `)
    .add('/login', `
      <h-container>
        <h1>Login</h1>
        <p>Please login to continue.</p>
        <h-button onclick="localStorage.setItem('auth_token', 'fake_token'); window.location.hash = '/';">Login</h-button>
      </h-container>
    `)
    .setNotFoundTemplate(`
      <h-container>
        <h1>Page Not Found</h1>
        <p>The page you requested could not be found.</p>
        <a href="/" data-router-link>Go Home</a>
      </h-container>
    `)
    .setContainer("#app-container")
    .init();
});
