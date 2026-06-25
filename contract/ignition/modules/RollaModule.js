const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Sepolia testnet addresses
const SEPOLIA = {
  USDC:           "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  UNISWAP_ROUTER: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
  UNISWAP_QUOTER: "0xEd1f6473345F45b75833fd55D5ADbEb76d79229",
  AAVE_POOL:      "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  A_USDC:         "0x16dA4541aD1807f4443d92D26044C1147406EB80",
  CHAINLINK_ETH:  "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  WETH:           "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
};

module.exports = buildModule("RollaModule", (m) => {
  const usdc          = m.getParameter("usdc",          SEPOLIA.USDC);
  const uniswapRouter = m.getParameter("uniswapRouter", SEPOLIA.UNISWAP_ROUTER);
  const aavePool      = m.getParameter("aavePool",      SEPOLIA.AAVE_POOL);
  const aUsdc         = m.getParameter("aUsdc",         SEPOLIA.A_USDC);
  const weth          = m.getParameter("weth",          SEPOLIA.WETH);

  const ajoCircle = m.contract("AjoCircle", [usdc, uniswapRouter, weth]);

  const rollaVault = m.contract("RollaVault", [usdc, uniswapRouter, weth]);

  const usernameRegistry = m.contract("UsernameRegistry", []);

  return { ajoCircle, rollaVault, usernameRegistry };
});
