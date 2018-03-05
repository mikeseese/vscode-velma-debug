import {
  Logger, logger,
  DebugSession,
  InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
  Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
import { LibSdbTypes } from 'solidity-debugger';
import { SdbRuntimeInterface } from './sdbRuntimeInterface';


/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  /** Automatically stop target after launch. If not specified, target does not stop. */
  stopOnEntry?: boolean;
  /** enable logging the Debug Adapter Protocol */
  trace?: boolean;
  /** change which host talks to sdb **/
  host?: string;
  /** change which port talks to sdb **/
  port?: number;
}

class SolidityDebugSession extends DebugSession {

  // we don't support multiple threads, so we can use a hardcoded ID for the default thread
  private static THREAD_ID = 1;

  // a Mock runtime (or debugger)
  private _runtime: SdbRuntimeInterface;

  private _variableHandles = new Handles<string>();

  /**
   * Creates a new debug adapter that is used for one debug session.
   * We configure the default implementation of a debug adapter here.
   */
  public constructor() {
    super();

    // this debugger uses zero-based lines and columns
    this.setDebuggerLinesStartAt1(false);
    this.setDebuggerColumnsStartAt1(false);

    this._runtime = new SdbRuntimeInterface();

    // setup event handlers
    this._runtime.on('stopOnEntry', () => {
      this.sendEvent(new StoppedEvent('entry', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('stopOnStepOver', () => {
      this.sendEvent(new StoppedEvent('step', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('stopOnStepIn', () => {
      this.sendEvent(new StoppedEvent('stepin', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('stopOnStepOut', () => {
      this.sendEvent(new StoppedEvent('stepout', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('stopOnBreakpoint', () => {
      this.sendEvent(new StoppedEvent('breakpoint', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('stopOnException', () => {
      this.sendEvent(new StoppedEvent('exception', SolidityDebugSession.THREAD_ID));
    });
    this._runtime.on('breakpointValidated', (bp: LibSdbTypes.Breakpoint) => {
      this.sendEvent(new BreakpointEvent('changed', <DebugProtocol.Breakpoint>{ verified: bp.verified, id: bp.id }));
    });
    this._runtime.on('output', (text, filePath, line, column) => {
      const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
      e.body.source = this.createSource(filePath);
      e.body.line = this.convertDebuggerLineToClient(line);
      e.body.column = this.convertDebuggerColumnToClient(column);
      this.sendEvent(e);
    });
    this._runtime.on('end', () => {
      this.sendEvent(new TerminatedEvent());
    });
  }

  /**
   * The 'initialize' request is the first request called by the frontend
   * to interrogate the features the debug adapter provides.
   */
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

    // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
    // we request them early by sending an 'initializeRequest' to the frontend.
    // The frontend will end the configuration sequence by calling 'configurationDone' request.
    this.sendEvent(new InitializedEvent());

    // build and return the capabilities of this debug adapter:
    response.body = response.body || {};

    // the adapter implements the configurationDoneRequest.
    response.body.supportsConfigurationDoneRequest = true;

    // make VS Code to use 'evaluate' when hovering over source
    response.body.supportsEvaluateForHovers = true;

    // make VS Code to show a 'step back' button
    response.body.supportsStepBack = true;

    this.sendResponse(response);
  }

  protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): Promise<void> {

    // make sure to 'Stop' the buffered logging if 'trace' is not set
    logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

    this.sendResponse(response);

    // start the program in the runtime
    await this._runtime.attach(args.host || "127.0.0.1", args.port || 8455);
  }

  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments) {
    this._runtime.disconnect();

    this.sendResponse(response);
  }

  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {

    const path = <string>args.source.path;
    const clientLines = args.lines || [];

    // clear all breakpoints for this file
    await this._runtime.clearBreakpoints(path);

    // set and verify breakpoint locations
    let actualBreakpoints: DebugProtocol.Breakpoint[] = [];
    for (let i = 0; i < clientLines.length; i++) {
      const l = clientLines[i];
      const debuggerBreakpoint = await this._runtime.setBreakpoint(path, this.convertClientLineToDebugger(l));
      if (debuggerBreakpoint) {
        const bp = <DebugProtocol.Breakpoint> new Breakpoint(debuggerBreakpoint.verified, this.convertDebuggerLineToClient(debuggerBreakpoint.line));
        bp.id = debuggerBreakpoint.id;
        actualBreakpoints.push(bp);
      }
    }

    // send back the actual breakpoint positions
    response.body = {
      breakpoints: actualBreakpoints
    };
    this.sendResponse(response);
  }

  protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {

    // runtime supports now threads so just return a default thread.
    response.body = {
      threads: [
        new Thread(SolidityDebugSession.THREAD_ID, "thread 1")
      ]
    };
    this.sendResponse(response);
  }

  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {

    const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
    const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
    const endFrame = startFrame + maxLevels;

    const stk = await this._runtime.stack(startFrame, endFrame);

    if (stk !== null) {
      response.body = {
        stackFrames: stk.frames.map(f => new StackFrame(f.index, f.name, this.createSource(f.file), this.convertDebuggerLineToClient(f.line))),
        totalFrames: stk.count
      };
    }
    else {
      response.body = {
        stackFrames: [],
        totalFrames: 0
      };
    }
    this.sendResponse(response);
  }

  protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

    const frameReference = args.frameId;
    const scopes = new Array<Scope>();
    scopes.push(new Scope("Local", this._variableHandles.create("local_" + frameReference), false));
    scopes.push(new Scope("Global", this._variableHandles.create("global_" + frameReference), true));

    response.body = {
      scopes: scopes
    };
    this.sendResponse(response);
  }

  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void> {
    const variables = await this._runtime.variables();

    response.body = {
      variables: variables
    };
    this.sendResponse(response);
  }

  protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
    // forward continue until breakpoint
    this._runtime.continue();
    this.sendResponse(response);
  }

  protected reverseContinueRequest(response: DebugProtocol.ReverseContinueResponse, args: DebugProtocol.ReverseContinueArguments) : void {
    // backward continue until breakpoint
    this._runtime.continueReverse();
    this.sendResponse(response);
   }

  protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
    // forward 1 step
    this._runtime.stepOver();
    this.sendResponse(response);
  }

  protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void {
    // backward 1 step
    this._runtime.stepBack();
    this.sendResponse(response);
  }

  protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
    // forward 1 step
    this._runtime.stepIn();
    this.sendResponse(response);
  }

  protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
    // forward 1 step
    this._runtime.stepOut();
    this.sendResponse(response);
  }

  // TODO: allow for evaluation/arbitrary code execution
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): Promise<void> {

    /*if (args.context === 'repl') {
      // 'evaluate' supports to create and delete breakpoints from the 'repl':
      const matches = /new +([0-9]+)/.exec(args.expression);
      if (matches && matches.length === 2) {
        const mbp = this._runtime.setBreakpoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
        const bp = <DebugProtocol.Breakpoint> new Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.line), undefined, this.createSource(this._runtime.sourceFile));
        bp.id= mbp.id;
        this.sendEvent(new BreakpointEvent('new', bp));
        reply = `breakpoint created`;
      } else {
        const matches = /del +([0-9]+)/.exec(args.expression);
        if (matches && matches.length === 2) {
          const mbp = this._runtime.clearBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
          if (mbp) {
            const bp = <DebugProtocol.Breakpoint> new Breakpoint(false);
            bp.id= mbp.id;
            this.sendEvent(new BreakpointEvent('removed', bp));
            reply = `breakpoint deleted`;
          }
        }
      }
    }*/

    const reply = await this._runtime.evaluate(args.expression, args.context, args.frameId);
    response.body = {
      result: reply,
      variablesReference: 0
    };
    this.sendResponse(response);
  }

  //---- helpers

  private createSource(filePath: string): Source {
    return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
  }
}

DebugSession.run(SolidityDebugSession);