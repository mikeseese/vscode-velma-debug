# <img src="https://user-images.githubusercontent.com/549323/41639879-a6eeb290-742d-11e8-8ece-bb1c292b407a.png" alt="" width="100" height="auto" valign="middle"> Velma Solidity Debugger - VS Code Extension
This repository contains the VS Code extension which integrates with the [Velma Solidity Debugger](https://github.com/seeseplusplus/velma). Design and implementation decisions for MVP v1.0.0 were heavily guided by the needs of Augur and Augur's application.

## Submitting Issues
Unless you know for certain the issue belongs in this repository, please submit issues related to the Velma Debugger at the [debugger main repo](https://github.com/seeseplusplus/velma/issues)

## Prerequisites
You must install a Solidity language VS Code extension; I suggest the one from Juan Blanco. I **suggest** that you change the keyboard shortcut this extension uses to compile the Solidity file as it defaults to `F5` and inhibits smooth debugging (if you left the default `F5` command for continuing while in a debug session). You can do this following the below instructions:
1. Press Ctrl+Shift+P (or Command+Shift+P) to open the settings quick open popup
1. Search for and open `Preferences: Open Keyboard Shortcuts` (with the preceeding `>` that should already be entered)
1. In the search box in the `Keyboard Shortcuts` tab, search for `solidity.compile.active`
1. Click the edit pencil on the left of the row and enter a different keyboard shortcut that isn't `F5`

## Installing the extension (which includes the debugger)
1. Go to https://github.com/seeseplusplus/vscode-velma-debug/releases and navigate to the latest versioned tag
1. Download the attached vscode-velma-debug-{version}.vsix file
1. Open VS Code
1. Go to the Extensions panel (default shortcut: Ctrl+Shift+X or Command+Shift+X)
1. Click the horizontal dots in the top right of the Extensions panel
1. Click "Install from VSIX..."
1. Select the downloaded VSIX file
1. Reload VS Code

## Current Limitations (of both Velma and Velma VS Code Extension)
- Currently only basic array (1-Dimensional, fixed-size (i.e. not dynamic)) variable inspection support.
- No `hover` REPL/Debug Console viewing support
- No backwards stepping support
- **Important**: Until my changes to 3rd party repos have been merged and released to NPM, you must use the associated GitHub links. You can find the supporting GitHub repositories at https://github.com/seeseplusplus. These versions of the repos (i.e. `1.0.0-rc.1` branches) are likely out of date from the upstream repo. **Please take this into consideration when testing**

## Sample project
For the scope of the [Augur bounty](https://github.com/AugurProject/augur-bounties#-bounty-2-portable-solidity-debugger), the only way you can currently use the debugger is through Ganache (formally TestRPC). The recommended method is by setting up a Mocha test which will compile the contracts, upload them to the Ganache, link the debug symbols (aka compilation output and contract addresses) to Velma, and execute transactions.

I **highly recommend** you familiarize yourself with the [test application](https://github.com/seeseplusplus/velma-sample) before integrating your own project.
