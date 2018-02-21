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
- No storage support
- No memory support
- No `hover` REPL/Debug Console viewing support
- No backwards stepping support
- Not tested on Windows
- Not tested on Mac
- Port between SDB and Ganache is hardcoded to `8455`
- **Important**: Until my changes to 3rd party repos have been merged and released to NPM, you must use the associated GitHub links (using the `introduce-sdb` branch). You can find the supporting GitHub repositories at https://github.com/seeseplusplus. You will only need to make this concession for [ganache-core](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/package.json#L35) though.

## Sample project
For the scope of the [Augur bounty](https://github.com/AugurProject/augur-bounties#-bounty-2-portable-solidity-debugger), the only way you can currently use the debugger is through Ganache (formally TestRPC). The recommended method is by setting up a Mocha test which will compile the contracts, upload them to the Ganache, link the debug symbols (aka compilation output and contract addresses) to SDB, and execute transactions.

I **highly recommend** you familiarize yourself with the test application found within this repository before integrating your own project.

### Dev Dependencies Only
After cloning this repository, you will need to install the dev dependencies. You won't be able to install the normal dependencies since the debugger runtime is currently closed source. You can do this by executing:
```bash
npm install --only=dev
```

### Launch Configuration
Since this extension doesn't handle the compilation and linking of your contracts for you, you must treat its launch configuration as an `attach` configuration (but the type is actually `launch`). You can see the launch configuration setup for this [test application](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/test/test.ts) can be found in [.vscode/launch.json](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/.vscode/launch.json#L24-30). You can/should ignore the `debugServer` property and keep it commented out/removed; it's used for development purposes. Also in that file you can see a compound configuration which runs both my `Debug Solidity` and `Tests` configurations; this gives me the ability to just press `F5`/run to get started quickly.

### Contracts
Not much to say here other than your contracts should share some root directory as the extension expects a root and relative paths to the contract files.

### Mocha Test
I've tried to structure the [sample Mocha Test](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/test/test.ts) to the core steps to working with SDB. Some notes to consider:
- SDB expects that you use the [standard compiler input/output JSON structures](http://solidity.readthedocs.io/en/develop/using-the-compiler.html#compiler-input-and-output-json-description).
- The [ouputSelection](https://gitlab.com/seeseplusplus/vscode-sdb-debug/blob/master/test/test.ts#L44-54) options seen for the `CompilerInput` are the **minimum required fields** for SDB to function properly.
- The keys to `CompilerInput.sources` are designed to be relative (relative to the `sourceRoot`) paths to the files.
- You'll need an `addressMapping` which is an object which keys are the contract names (not file paths/etc) and values are the installed addresses as strings. It doesn't matter if the addresses have preceeding `0x` or have mixed-case letters (fun fact: the mixed-casing is used for an [optional checksum validation](https://github.com/ethereum/EIPs/issues/55#issuecomment-187159063)).
- You **must** link the debug symbols for the debugger to be able to do anything. The order of linking **must** be the compiler output, and then each contract's addresses. I highly suggest that you compile your contracts once and have one large `CompilerOutput` for all contracts. It might work to do compartmental builds, but it's not supported.