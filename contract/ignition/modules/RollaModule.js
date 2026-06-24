const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Sepolia testnet addresses (verified against deploy-and-export.js)
const SEPOLIA = {
  USDT:           "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
  UNISWAP_ROUTER: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
  UNISWAP_QUOTER: "0xEd1f6473345F45b75833fd55D5ADbEb76d79229",
  AAVE_POOL:      "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  A_USDT:         "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
  CHAINLINK_ETH:  "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  WETH:           "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
};

module.exports = buildModule("RollaModule", (m) => {
  const usdt          = m.getParameter("usdt",          SEPOLIA.USDT);
  const uniswapRouter = m.getParameter("uniswapRouter", SEPOLIA.UNISWAP_ROUTER);
  const aavePool      = m.getParameter("aavePool",      SEPOLIA.AAVE_POOL);
  const aUsdt         = m.getParameter("aUsdt",         SEPOLIA.A_USDT);
  const weth          = m.getParameter("weth",          SEPOLIA.WETH);

  const ajoCircle = m.contract("AjoCircle", [usdt, uniswapRouter, weth]);

  const rollaVault = m.contract("RollaVault", [
    usdt,
    uniswapRouter,
    aavePool,
    aUsdt,
    weth,
  ]);

  const usernameRegistry = m.contract("UsernameRegistry", []);

  return { ajoCircle, rollaVault, usernameRegistry };
});
