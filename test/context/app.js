import { Holo, Context } from 'holo-js';

const app = Holo.init();
app.setTitle("Context Demo");

const userContext = Context.new('user');
const themeContext = Context.new('theme');
const appContext = Context.global('app');
userContext.update({
  username: "Guest User",
  isLoggedIn: false,
  notifications: 5,
  role: "visitor"
});

themeContext.update({
  mode: "light",
  primaryColor: "#4a90e2",
  fontSize: "medium"
});

appContext.update({
  pageTitle: "Dashboard",
  lastUpdated: new Date().toLocaleString()
});

app.registerComponent({
  name: "user-profile",
  render: () => `
    <div class="profile-card">
      <h2>Welcome, {user.username}!</h2>
      <div class="status">Status: ${userContext.get("isLoggedIn") ? "Online" : "Offline"}</div>
      <div class="role">Role: {user.role}</div>
      <div class="notifications">You have {user.notifications} unread notifications</div>
      <button onclick="toggleLogin()">Log ${userContext.get("isLoggedIn") ? 'Out' : 'In'}</button>
      <button onclick="clearNotifications()">Clear Notifications</button>
    </div>
  `
});

app.registerComponent({
  name: "theme-settings",
  render: () => `
    <div class="theme-container">
      <h3>Theme Settings</h3>
      <div>Current Mode: {theme.mode}</div>
      <div>Primary Color: <span style="color: {theme.primaryColor}">{theme.primaryColor}</span></div>
      <div>Font Size: {theme.fontSize}</div>
      <button onclick="toggleTheme()">Switch to ${themeContext.get("mode") === 'light' ? 'Dark' : 'Light'} Mode</button>
    </div>
  `
});

app.registerComponent({
  name: "app-header",
  render: () => `
    <header>
      <h1>{app.pageTitle}</h1>
      <div class="last-updated">Last updated: {app.lastUpdated}</div>
      <p>Using theme: {theme.mode} | User: {user.username}</p>
    </header>
  `
});

app.expose(function toggleTheme() {
  const currentTheme = themeContext.get('mode');
  themeContext.set('mode', currentTheme === 'light' ? 'dark' : 'light');
  themeContext.set('primaryColor', 
    currentTheme === 'light' ? '#6a5acd' : '#4a90e2');
  document.body.className = themeContext.get('mode') + '-theme';
});

app.expose(function toggleLogin() {
  const isLoggedIn = userContext.get('isLoggedIn');
  userContext.update({
    isLoggedIn: !isLoggedIn,
    username: !isLoggedIn ? "Logged User" : "Guest User",
    role: !isLoggedIn ? "member" : "visitor"
  });
  
  appContext.set('lastUpdated', new Date().toLocaleString());
});

app.expose(function clearNotifications() {
  userContext.set('notifications', 0);
  appContext.set('lastUpdated', new Date().toLocaleString());
});

app.expose(function refreshPage() {
  appContext.set('lastUpdated', new Date().toLocaleString());
  updateDebugView();
});

themeContext.subscribe('mode', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

userContext.subscribe('isLoggedIn', (newValue) => {
  console.log(`User is now ${newValue ? 'logged in' : 'logged out'}`);
});

app.onReady(() => {
  app.render(`
    <div class="container">
      <app-header></app-header>
      
      <main>
        <user-profile></user-profile>
        <theme-settings></theme-settings>
        
        <div class="context-debug">
          <h3>Current Context Values:</h3>
          <div class="debug-grid">
            <div class="debug-column">
              <h4>User Context</h4>
              <pre id="user-context-debug"></pre>
            </div>
            <div class="debug-column">
              <h4>Theme Context</h4>
              <pre id="theme-context-debug"></pre>
            </div>
            <div class="debug-column">
              <h4>App Context</h4>
              <pre id="app-context-debug"></pre>
            </div>
          </div>
          <button onclick="refreshPage()">Refresh</button>
        </div>
      </main>
      
      <footer>
        <p>Context Demo - ${new Date().getFullYear()}</p>
      </footer>
    </div>
  `);
  document.body.className = themeContext.get('mode') + '-theme';
  userContext.setupBindings();
  themeContext.setupBindings();
  appContext.setupBindings();
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    body { 
      font-family: system-ui, sans-serif; 
      margin: 0; 
      padding: 20px; 
      transition: background-color 0.3s, color 0.3s; 
    }
    .light-theme { background-color: #f5f5f5; color: #333; }
    .dark-theme { background-color: #333; color: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; }
    .profile-card, .theme-container, .context-debug { 
      padding: 20px; 
      margin-bottom: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
    }
    .light-theme .profile-card, .light-theme .theme-container, .light-theme .context-debug { 
      background-color: white; 
    }
    .dark-theme .profile-card, .dark-theme .theme-container, .dark-theme .context-debug { 
      background-color: #444; 
    }
    button { 
      padding: 8px 16px; 
      margin-right: 10px;
      margin-top: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: #4a90e2;
      color: white;
    }
    .dark-theme button { background-color: #6a5acd; }
    pre { 
      background: #f0f0f0; 
      padding: 10px; 
      border-radius: 4px; 
      overflow: auto;
      font-size: 14px;
    }
    .dark-theme pre { background: #222; color: #ddd; }
    .debug-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    .last-updated {
      font-size: 0.8em;
      color: #666;
    }
    .dark-theme .last-updated {
      color: #aaa;
    }
  `;
  document.head.appendChild(styleElement);
  
  updateDebugView();
});

function updateDebugView() {
  document.getElementById('user-context-debug').textContent = 
    JSON.stringify(userContext.context, null, 2);
  
  document.getElementById('theme-context-debug').textContent = 
    JSON.stringify(themeContext.context, null, 2);
  
  document.getElementById('app-context-debug').textContent = 
    JSON.stringify(appContext.context, null, 2);
}

window.userContext = userContext;
window.themeContext = themeContext;
window.appContext = appContext;
