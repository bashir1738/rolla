require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const path = require("path");
const net = require("net");
const dns = require("dns");

// Force IPv4 — this environment has broken IPv6/NAT64 that causes Node.js ETIMEDOUT
dns.setDefaultResultOrder("ipv4first");
const _origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (options, ...rest) {
  if (options && typeof options === "object" && options.host && !options.family) {
    options = { ...options, family: 4 };
  }
  return _origConnect.call(this, options, ...rest);
};

// Load .env without requiring the dotenv package
try {
  const envFile = fs.readFileSync(path.resolve(__dirname, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch (_) {}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
        enabled: process.env.FORK === "true",
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};
