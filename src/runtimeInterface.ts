import { EventEmitter } from "events";
import * as WebSocket from "ws";
import { LibSdbTypes } from 'solidity-debugger';
import { DebugProtocol } from 'vscode-debugprotocol';

const uuidv4 = require("uuid").v4;

export async function sleep(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

export class SdbRuntimeInterface extends EventEmitter {
    private _ws: WebSocket;

    private _debuggerMessages: Map<string, Function | undefined>;

    private _connected: boolean;
    private _disconnecting: boolean;

    constructor() {
        super();

        this._debuggerMessages = new Map<string, Function | undefined>();
        this._connected = false;
        this._disconnecting = false;
    }

    public async clearBreakpoints(path: string): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "clearBreakpoints",
            "content": {
                "path": path
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async setBreakpoint(path: string, line: number): Promise<LibSdbTypes.Breakpoint> {
        await this.waitForConnection();
        return new Promise<LibSdbTypes.Breakpoint>((resolve, reject) => {
            // only send if it's an open connection
            const payload = {
                "id": uuidv4(),
                "isRequest": true,
                "type": "setBreakpoint",
                "content": {
                    "path": path,
                    "line": line
                }
            };
            const message = JSON.stringify(payload);
            this._ws.send(message);
            this._debuggerMessages.set(payload.id, resolve);
        });
    }

    public async stack(startFrame: number, endFrame: number): Promise<any> {
        await this.waitForConnection();
        return new Promise<any>((resolve, reject) => {
            // only send if it's an open connection
            const payload = {
                "id": uuidv4(),
                "isRequest": true,
                "type": "stack",
                "content": {
                    "startFrame": startFrame,
                    "endFrame": endFrame
                }
            };
            const message = JSON.stringify(payload);
            this._ws.send(message);
            this._debuggerMessages.set(payload.id, resolve);
        });
    }

    public async variables(args?: DebugProtocol.VariablesArguments): Promise<any> {
        await this.waitForConnection();
        return new Promise<any>((resolve, reject) => {
            // only send if it's an open connection
            const payload = {
                "id": uuidv4(),
                "isRequest": true,
                "type": "variables",
                "content": args || null
            };
            const message = JSON.stringify(payload);
            this._ws.send(message);
            this._debuggerMessages.set(payload.id, resolve);
        });
    }

    public async continue(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "continue"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async continueReverse(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "continueReverse"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async stepOver(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "stepOver"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async stepBack(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "stepBack"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async stepIn(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "stepIn"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async stepOut(): Promise<void> {
        // only send if it's an open connection
        await this.waitForConnection();
        const payload = {
            "id": uuidv4(),
            "isRequest": true,
            "type": "uiAction",
            "content": {
                "action": "stepOut"
            }
        };
        const message = JSON.stringify(payload);
        this._ws.send(message);
    }

    public async evaluate(expression: string, context: string | undefined, frameId: number | undefined): Promise<any> {
        await this.waitForConnection();
        return new Promise<any>((resolve, reject) => {
            // only send if it's an open connection
            const payload = {
                "id": uuidv4(),
                "isRequest": true,
                "type": "evaluate",
                "content": {
                    "expression": expression,
                    "context": context,
                    "frameId": frameId
                }
            };
            const message = JSON.stringify(payload);
            this._ws.send(message);
            this._debuggerMessages.set(payload.id, resolve);
        });
    }

    private handleMessage(message: WebSocket.Data) {
        const data = JSON.parse(message.toString());

        if (data.isRequest) {
            switch (data.type) {
                case "event":
                    this.sendEvent(data.content.event, data.content.args);
                    break;
                case "ping":
                    const payload = {
                        "id": data.id,
                        "isRequest": false,
                        "type": "ping",
                        "content": {}
                    };
                    const message = JSON.stringify(payload);
                    this._ws.send(message);
                    break;
                default:
                    break;
            }
        }
        else {
            if (data.content.error) {
                throw new Error(data.content.error);
            }
            else {
                const debuggerMessage = this._debuggerMessages.get(data.id);
                if (debuggerMessage instanceof Function) {
                    debuggerMessage(data.content.data);
                }
                this._debuggerMessages.delete(data.id);
            }
        }
    }

    private async waitForConnection(): Promise<void> {
        while (true) {
            if (this._ws && this._ws.readyState === 1) {
                return;
            }
            await sleep(50);
        }
    }

    private async reconnect(host: string, port: number, resolve: Function): Promise<void> {
        const retryPeriod = 10000;
        console.log("Retrying to connect to debugger in " + retryPeriod + " milliseconds...");
        await sleep(retryPeriod);
        if (!this._disconnecting) {
            await this.attach(host, port);
        }
        resolve();
    }

    public disconnect() {
        this._disconnecting = true;
        this._ws.close();
    }

    public async attach(host: string, port: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this._disconnecting) {
                const url = "ws://" + host + ":" + port;
                this._ws = new WebSocket(url, {
                    "handshakeTimeout": 10000
                });

                this._ws.on("open", () => {
                    this._connected = true;
                    console.log("connected to debugger");
                    resolve();
                });

                this._ws.on("message", (message) => {
                    this.handleMessage(message);
                });

                this._ws.on("error", (error) => {
                    if (!this._connected) {
                        this._ws.removeAllListeners();
                        this.reconnect(host, port, resolve);
                    }
                    else {
                        throw new Error(JSON.stringify(error));
                    }
                });
            }
            else {
                resolve();
            }
        });
    }

    public sendEvent(event: string, ...args: any[]) {
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }
}