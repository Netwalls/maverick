"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = getServices;
const web3_js_1 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const maverickAgent_1 = require("../../src/agents/maverickAgent");
const agentRegistry_1 = require("../../src/core/agentRegistry");
const kalshiService_1 = require("../../src/core/kalshiService");
const transactionSigner_1 = require("../../src/core/transactionSigner");
const vaultManager_1 = require("../../src/core/vaultManager");
const walletManager_1 = require("../../src/core/walletManager");
const maverickAMM_1 = require("../../src/protocols/maverickAMM");
const maverickBank_1 = require("../../src/protocols/maverickBank");
const historyProvider_1 = require("../../src/utils/historyProvider");
const TARGET_ADDRESS = new web3_js_1.PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');
function resolveProjectRoot() {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'src')) && fs.existsSync(path.join(cwd, 'web'))) {
        return cwd;
    }
    const parent = path.resolve(cwd, '..');
    if (fs.existsSync(path.join(parent, 'src')) && fs.existsSync(path.join(parent, 'web'))) {
        return parent;
    }
    return cwd;
}
function getAgentEnvKeys() {
    const envKeys = Object.keys(process.env)
        .filter((key) => key.endsWith('_PRIVATE_KEY') && key !== 'VAULT_PRIVATE_KEY')
        .sort();
    if (envKeys.length > 0) {
        return envKeys;
    }
    return ['AGENT_PRIVATE_KEY', 'BETA_PRIVATE_KEY', 'GAMMA_PRIVATE_KEY'];
}
function toAgentName(envKey) {
    return envKey.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha');
}
async function initServices() {
    const projectRoot = resolveProjectRoot();
    dotenv.config({ path: path.join(projectRoot, '.env') });
    const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('devnet'), 'confirmed');
    const history = new historyProvider_1.HistoryProvider(projectRoot);
    const signer = new transactionSigner_1.TransactionSigner(connection);
    const registry = new agentRegistry_1.AgentRegistry();
    const vaultManager = await vaultManager_1.VaultManager.loadOrCreate(connection);
    const amm = new maverickAMM_1.MaverickAMM(connection, signer, history, vaultManager.getWallet(), vaultManager.getUSDCMint());
    const bank = new maverickBank_1.MaverickBank(connection, signer, history, vaultManager.getWallet(), amm);
    const agents = [];
    for (const key of getAgentEnvKeys()) {
        const wallet = new walletManager_1.WalletManager(connection, process.env[key], key);
        const name = toAgentName(key);
        const agent = new maverickAgent_1.MaverickAgent(connection, wallet, TARGET_ADDRESS, bank, name);
        registry.registerAgent(name, agent);
        bank.addParticipant(wallet);
        agents.push({ name, agent, wallet });
    }
    kalshiService_1.KalshiService.prefetch();
    return {
        connection,
        history,
        signer,
        registry,
        amm,
        bank,
        agents,
        vaultManager,
    };
}
const globalForMaverick = globalThis;
function getServices() {
    if (!globalForMaverick.__maverickServicesPromise) {
        globalForMaverick.__maverickServicesPromise = initServices().catch((error) => {
            globalForMaverick.__maverickServicesPromise = undefined;
            throw error;
        });
    }
    return globalForMaverick.__maverickServicesPromise;
}
//# sourceMappingURL=services.js.map