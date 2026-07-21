const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const net = require('net');

let mainWindow = null;
let nextServerProcess = null;

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  initialize();
}

function initialize() {
  app.on('ready', async () => {
    // 1. Load Env
    loadEnv();

    let port = 3000;
    
    // 2. Start next server in production, or connect in dev
    if (app.isPackaged) {
      port = await getFreePort(3000);
      
      // Look for standalone server.js in packaged resources
      let serverPath = '';
      const pathsToTry = [
        path.join(app.getAppPath(), '.next/standalone/server.js'),
        path.join(app.getAppPath(), 'server.js'),
      ];
      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          serverPath = p;
          break;
        }
      }

      if (!serverPath) {
        dialog.showErrorBox(
          'Server Error',
          'Could not find the compiled Next.js server inside the application package. Please reinstall.'
        );
        app.quit();
        return;
      }

      try {
        startNextServer(serverPath, port);
        await waitForServer(port);
      } catch (err) {
        dialog.showErrorBox(
          'Server Launch Failed',
          `Failed to start the background server: ${err.message}`
        );
        app.quit();
        return;
      }
    } else {
      console.log('[Electron Main]: Running in development mode. Assumed port is 3000.');
    }

    createWindow(port);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('quit', () => {
    if (nextServerProcess) {
      console.log('[Electron Main]: Stopping Next.js server child process...');
      nextServerProcess.kill();
    }
  });
}

function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    console.log(`[Electron Main]: Loading environment from ${envPath}`);
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
            val = val.substring(1, val.length - 1);
          }
          if (val.length > 0 && val.charAt(0) === "'" && val.charAt(val.length - 1) === "'") {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      });
    } catch (e) {
      console.error(`[Electron Main]: Failed to read env file: ${envPath}`, e);
    }
  }
}

function loadEnv() {
  // Load bundled environment variables
  loadEnvFile(path.join(app.getAppPath(), '.env'));

  // Load developer or user override environment variables next to the exe
  if (app.isPackaged) {
    const userEnvPath = path.join(path.dirname(process.execPath), '.env');
    loadEnvFile(userEnvPath);
  }
}

function getFreePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getFreePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

function startNextServer(serverPath, port) {
  console.log(`[Electron Main]: Starting standalone Next.js server on port ${port}...`);
  
  const env = {
    ...process.env,
    PORT: port.toString(),
    HOSTNAME: '127.0.0.1' // Bind to localhost for security
  };

  nextServerProcess = childProcess.fork(serverPath, [], {
    env,
    cwd: path.dirname(serverPath),
    stdio: 'pipe'
  });

  nextServerProcess.stdout.on('data', (data) => {
    console.log(`[Next.js Server]: ${data.toString().trim()}`);
  });

  nextServerProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Server Error]: ${data.toString().trim()}`);
  });

  nextServerProcess.on('close', (code) => {
    console.log(`[Electron Main]: Server process exited with code ${code}`);
  });
}

function waitForServer(port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
        client.end();
        resolve();
      });
      client.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timeout waiting for Next.js server to start'));
        } else {
          setTimeout(check, 150);
        }
      });
    };
    check();
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Recall.ai',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
