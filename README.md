# SDB VS Code Extension
This repository contains the VS Code extension which integrates with the [Solidity Debugger (SDB)](https://gitlab.com/seeseplusplus/solidity-debugger) (repository closed source until the [Augur bounty](https://github.com/AugurProject/augur-bounties#-bounty-2-portable-solidity-debugger) is claimed). Design and implementation decisions for MVP v1.0.0 were heavily guided by the needs of Augur and Augur's application.

## Prerequisites
You must install a Solidity language VS Code extension; I suggest the one from Juan Blanco. I **suggest** that you change the keyboard shortcut this extension uses to compile the Solidity file as it defaults to `F5` and inhibits smooth debugging (if you left the default `F5` command for continuing while in a debug session). You can do this following the below instructions:
1. Press Ctrl+Shift+P (or Command+Shift+P) to open the settings quick open popup
1. Search for and open `Preferences: Open Keyboard Shortcuts` (with the preceeding `>` that should already be entered)
1. In the search box in the `Keyboard Shortcuts` tab, search for `solidity.compile.active`
1. Click the edit pencil on the left of the row and enter a different keyboard shortcut that isn't `F5`

## Installing the extension (which includes the debugger)
1. Go to https://gitlab.com/seeseplusplus/vscode-sdb-debug/tags and navigate to the latest versioned tag
1. Download the attached vscode-sdb-debug-x.y.z.vsix file
1. Open VS Code
1. Go to the Extensions panel (default shortcut: Ctrl+Shift+X or Command+Shift+X)
1. Click the horizontal dots in the top right of the Extensions panel
1. Click "Install from VSIX..."
1. Select the downloaded VSIX file
1. Reload VS Code

## Current Limitations (of both SDB and SDB VS Code Extension)
- No storage or storage variable inspection support (will be supported in v0.2.0 in the coming days [as of 2/20/2018])
    - Note: This is currently under work and mostly just tedious implementation of the different types and supporting correct visualization within the extension.
- No `hover` REPL/Debug Console viewing support
- No backwards stepping support (will be supported in v0.3.0 in the next week [as of 2/20/2018])
- Port between SDB and Ganache is hardcoded to `8455`
- Currently the debugger will step through stack variable declaration before executing instructions
- **Important**: Until my changes to 3rd party repos have been merged and released to NPM, you must use the associated GitHub links (using the `introduce-sdb` branch). You can find the supporting GitHub repositories at https://github.com/seeseplusplus. You will only need to make this concession for [ganache-core](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/package.json#L35) though.

## Sample project
For the scope of the [Augur bounty](https://github.com/AugurProject/augur-bounties#-bounty-2-portable-solidity-debugger), the only way you can currently use the debugger is through Ganache (formally TestRPC). The recommended method is by setting up a Mocha test which will compile the contracts, upload them to the Ganache, link the debug symbols (aka compilation output and contract addresses) to SDB, and execute transactions.

I **highly recommend** you familiarize yourself with the [test application](https://gitlab.com/seeseplusplus/sdb-sample) before integrating your own project.
