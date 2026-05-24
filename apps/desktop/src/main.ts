import { app, BrowserWindow } from "electron";

function createWindow() {
    const window = new BrowserWindow({
        width: 1400,
        height: 900,
    });

    window.loadURL("http://localhost:3000");
}

app.whenReady().then(createWindow);
