const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UsernameRegistry with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const Registry = await ethers.getContractFactory("UsernameRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const addr = await registry.getAddress();
  console.log("\n✅ UsernameRegistry deployed to:", addr);
  console.log("   Sepolia explorer: https://sepolia.etherscan.io/address/" + addr);
  console.log("\nAdd to mobile/constants/addresses.ts:");
  console.log(`  USERNAME_REGISTRY: '${addr}' as \`0x\${string}\`,`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
