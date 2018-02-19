import { provider } from "ganache-core";
import { CompilerInput, CompilerOutput, compileStandardWrapper } from "solc";
import { resolve as resolvePath } from "path";
import { readFileSync } from "fs";

const Web3 = require("web3");

describe("SdbTest", () => {
    const sourceRoot = resolvePath(__dirname, "../../test/");
    const contractPath = resolvePath(sourceRoot, "test.sol");
    let web3;
    let ganacheProvider;
    let compilerOutput: CompilerOutput;
    let contractName;
    let Test;
    let testInstance;
    let accounts;
    let addressMapping = {};

    before("initialize/connect to testrpc/ganache-core", (callback) => {
        ganacheProvider = provider({
            sdb: true
        }, callback);
    });

    before("set web3 provider", (callback) => {
        web3 = new Web3(ganacheProvider);
        callback();
    });

    before("get accounts", function() {
      return web3.eth.getAccounts().then(accs => {
        accounts = accs;
      });
    });

    before("compile contract", (callback) => {
        let inputJson: CompilerInput = {
            language: "Solidity",
            settings: {
                optimizer: {
                    enabled: false
                },
                outputSelection: {
                    "*": {
                        "*": [
                            "abi",
                            "evm.bytecode.object",
                            "evm.deployedBytecode.object",
                            "evm.deployedBytecode.sourceMap",
                            "evm.methodIdentifiers"
                        ],
                        "": [ "legacyAST" ]
                    }
                }
            },
            sources: {}
        };
        const filePath = contractPath.replace(sourceRoot, "").replace(/\\/g, "/").replace(/^\//, "");
        inputJson.sources[filePath] = { content : readFileSync(contractPath, "utf8") };

        const compilerOutputJson = compileStandardWrapper(JSON.stringify(inputJson));
        compilerOutput = JSON.parse(compilerOutputJson);
        contractName = Object.keys(compilerOutput.contracts[filePath])[0];
        callback();
    });

    before("upload contract", () => {
        const filePath = contractPath.replace(sourceRoot, "").replace(/\\/g, "/").replace(/^\//, "");
        Test = new web3.eth.Contract(compilerOutput.contracts[filePath][contractName].abi);
        Test._code = "0x" + compilerOutput.contracts[filePath][contractName].evm.bytecode.object;

        return Test.deploy({ data: Test._code }).send({from: accounts[0], gas: 3141592}).then(instance => {
            testInstance = instance;

            addressMapping[contractName] = instance._address;

            // TODO: ugly workaround - not sure why this is necessary.
            if (!testInstance._requestManager.provider) {
                testInstance._requestManager.setProvider(web3.eth._provider);
            }
        });
    });

    before("link debug symbols", (callback) => {
        const sdbHook = ganacheProvider.manager.state.sdbHook;
        if (sdbHook) {
            sdbHook.linkCompilerOutput(sourceRoot, compilerOutput);
            const keys = Object.keys(addressMapping);
            for (let i = 0; i < keys.length; i++) {
                const contractName = keys[i];
                sdbHook.linkContractAddress(contractName, addressMapping[keys[i]]);
            }
        }
        callback();
    });

    it("#sdbTest", async () => {
        // We want to trace the transaction that sets the value to 26
        return testInstance.methods.test5().call({from: accounts[0], gas: 3411592});
    });
})