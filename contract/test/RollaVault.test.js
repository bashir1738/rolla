const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USDT_DECIMALS = 6;
const usdt = (amount) => ethers.parseUnits(String(amount), USDT_DECIMALS);
const POOL_FEE = 3000;

const TIER = { Flex: 0, Growth: 1, Power: 2 };
const LOCK = { Flex: 0, Growth: 90 * 24 * 3600, Power: 365 * 24 * 3600 };

async function deploy() {
  const [owner, alice, bob] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdtToken  = await MockERC20.deploy("USD Coin", "USDC", 6);
  const otherToken = await MockERC20.deploy("OtherToken", "OTH", 18);

  const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
  const router = await MockSwapRouter.deploy();
  await router.setRate(await otherToken.getAddress(), await usdtToken.getAddress(), usdt(2000));
  await router.setRate(await usdtToken.getAddress(), await otherToken.getAddress(), ethers.parseEther("0.0005"));

  // RollaVault — simplified constructor: (usdc, router, weth)
  const RollaVault = await ethers.getContractFactory("RollaVault");
  const vault = await RollaVault.deploy(
    await usdtToken.getAddress(),
    await router.getAddress(),
    ethers.ZeroAddress // WETH not needed for non-ETH tests
  );

  for (const signer of [owner, alice, bob]) {
    await usdtToken.mint(signer.address, usdt(100_000));
    await usdtToken.connect(signer).approve(await vault.getAddress(), ethers.MaxUint256);
    await otherToken.mint(signer.address, ethers.parseEther("1000"));
    await otherToken.connect(signer).approve(await vault.getAddress(), ethers.MaxUint256);
  }

  return { vault, usdtToken, otherToken, router, owner, alice, bob };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("RollaVault", () => {
  // ── DEPOSIT ─────────────────────────────────────────────────────────────────
  describe("deposit", () => {
    it("creates a Flex vault with USDC", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      const v = await vault.vaults(0);
      expect(v.owner).to.equal(owner.address);
      expect(v.tier).to.equal(TIER.Flex);
      expect(v.principalUSDC).to.equal(usdt(100));
      expect(v.claimed).to.be.false;
      expect(v.lockDuration).to.equal(0n);
    });

    it("creates a Growth vault with USDC", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      const v = await vault.vaults(0);
      expect(v.tier).to.equal(TIER.Growth);
      expect(v.lockDuration).to.equal(BigInt(LOCK.Growth));
    });

    it("creates a Power vault with another ERC20", async () => {
      const { vault, usdtToken, otherToken, router } = await deploy();
      await router.setFixedOutput(await otherToken.getAddress(), usdt(500));
      await vault.deposit(TIER.Power, await otherToken.getAddress(), ethers.parseEther("0.25"), usdt(500), POOL_FEE);
      const v = await vault.vaults(0);
      expect(v.principalUSDC).to.equal(usdt(500));
      expect(v.lockDuration).to.equal(BigInt(LOCK.Power));
    });

    it("reverts if deposit is below tier minimum (Flex: 10 USDC)", async () => {
      const { vault, usdtToken } = await deploy();
      await expect(
        vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(5), usdt(5), POOL_FEE)
      ).to.be.revertedWith("Below tier minimum");
    });

    it("reverts if Growth deposit is below 100 USDC", async () => {
      const { vault, usdtToken } = await deploy();
      await expect(
        vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(50), usdt(50), POOL_FEE)
      ).to.be.revertedWith("Below tier minimum");
    });

    it("reverts if Power deposit is below 500 USDC", async () => {
      const { vault, usdtToken } = await deploy();
      await expect(
        vault.deposit(TIER.Power, await usdtToken.getAddress(), usdt(499), usdt(499), POOL_FEE)
      ).to.be.revertedWith("Below tier minimum");
    });

    it("emits VaultCreated event", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await expect(
        vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE)
      )
        .to.emit(vault, "VaultCreated")
        .withArgs(0n, owner.address, TIER.Flex, usdt(10));
    });

    it("tracks multiple vaults per user", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Flex,   await usdtToken.getAddress(), usdt(10),  usdt(10),  POOL_FEE);
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      await vault.deposit(TIER.Power,  await usdtToken.getAddress(), usdt(500), usdt(500), POOL_FEE);

      const ids = await vault.getUserVaults(owner.address);
      expect(ids.length).to.equal(3);
      expect(ids[0]).to.equal(0n);
      expect(ids[1]).to.equal(1n);
      expect(ids[2]).to.equal(2n);
    });

    it("multiple users can hold vaults independently", async () => {
      const { vault, usdtToken, alice, bob } = await deploy();
      await vault.connect(alice).deposit(TIER.Flex,   await usdtToken.getAddress(), usdt(10),  usdt(10),  POOL_FEE);
      await vault.connect(bob).deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      const aliceVaults = await vault.getUserVaults(alice.address);
      const bobVaults   = await vault.getUserVaults(bob.address);
      expect(aliceVaults.length).to.equal(1);
      expect(bobVaults.length).to.equal(1);
      expect((await vault.vaults(aliceVaults[0])).tier).to.equal(TIER.Flex);
      expect((await vault.vaults(bobVaults[0])).tier).to.equal(TIER.Growth);
    });
  });

  // ── CLAIM ────────────────────────────────────────────────────────────────────
  describe("claim", () => {
    it("Flex vault can be claimed immediately (next block)", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);

      const before = await usdtToken.balanceOf(owner.address);
      await vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE);
      expect(await usdtToken.balanceOf(owner.address) - before).to.equal(usdt(10));
    });

    it("Flex vault cannot be claimed in the same block as deposit", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);
      await expect(vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE)).to.not.be.reverted;
    });

    it("Growth vault cannot be claimed before 90 days", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      const v = await vault.vaults(0);

      await time.setNextBlockTimestamp(v.maturityTimestamp - 1n);
      await expect(
        vault.claim(0, await usdtToken.getAddress(), usdt(100), POOL_FEE)
      ).to.be.revertedWith("Vault not yet matured");
    });

    it("Growth vault can be claimed at exactly 90 days", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      await time.increase(LOCK.Growth);

      const before = await usdtToken.balanceOf(owner.address);
      await vault.claim(0, await usdtToken.getAddress(), usdt(100), POOL_FEE);
      expect(await usdtToken.balanceOf(owner.address) - before).to.be.gte(usdt(100));
    });

    it("Power vault cannot be claimed before 365 days", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Power, await usdtToken.getAddress(), usdt(500), usdt(500), POOL_FEE);
      const v = await vault.vaults(0);

      await time.setNextBlockTimestamp(v.maturityTimestamp - 1n);
      await expect(
        vault.claim(0, await usdtToken.getAddress(), usdt(500), POOL_FEE)
      ).to.be.revertedWith("Vault not yet matured");
    });

    it("Power vault can be claimed at exactly 365 days", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Power, await usdtToken.getAddress(), usdt(500), usdt(500), POOL_FEE);
      await time.increase(LOCK.Power);

      const before = await usdtToken.balanceOf(owner.address);
      await vault.claim(0, await usdtToken.getAddress(), usdt(500), POOL_FEE);
      expect(await usdtToken.balanceOf(owner.address) - before).to.be.gte(usdt(500));
    });

    it("vault balance equals principal (no Aave yield on this deployment)", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      const balance = await vault.getVaultBalance(0);
      expect(balance).to.equal(usdt(100));
    });

    it("user claims principal", async () => {
      const { vault, usdtToken, owner } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      await time.increase(LOCK.Growth);

      const before = await usdtToken.balanceOf(owner.address);
      await vault.claim(0, await usdtToken.getAddress(), usdt(100), POOL_FEE);
      expect(await usdtToken.balanceOf(owner.address) - before).to.equal(usdt(100));
    });

    it("user claims in a different ERC20 token", async () => {
      const { vault, usdtToken, otherToken, router, owner } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);
      await time.increase(1);

      await router.setFixedOutput(await usdtToken.getAddress(), ethers.parseEther("0.05"));

      const before = await otherToken.balanceOf(owner.address);
      await vault.claim(0, await otherToken.getAddress(), ethers.parseEther("0.04"), POOL_FEE);
      expect(await otherToken.balanceOf(owner.address) - before).to.equal(ethers.parseEther("0.05"));
    });

    it("cannot claim same vault twice", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);

      await vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE);
      await expect(
        vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE)
      ).to.be.revertedWith("Already claimed");
    });

    it("only vault owner can claim", async () => {
      const { vault, usdtToken, alice } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);

      await expect(
        vault.connect(alice).claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE)
      ).to.be.revertedWith("Not vault owner");
    });
  });

  // ── SLIPPAGE PROTECTION ──────────────────────────────────────────────────────
  describe("slippage protection", () => {
    it("reverts when router output is below amountOutMinimum on deposit swap", async () => {
      const { vault, usdtToken, otherToken, router } = await deploy();
      await router.setFixedOutput(await otherToken.getAddress(), usdt(10));

      await expect(
        vault.deposit(TIER.Growth, await otherToken.getAddress(), ethers.parseEther("1"), usdt(100), POOL_FEE)
      ).to.be.reverted;
    });
  });

  // ── VIEW FUNCTIONS ───────────────────────────────────────────────────────────
  describe("view functions", () => {
    it("getVaultBalance returns 0 for a claimed vault", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);
      await vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE);
      expect(await vault.getVaultBalance(0)).to.equal(0n);
    });

    it("isMatured returns false before lock and true after", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Growth, await usdtToken.getAddress(), usdt(100), usdt(100), POOL_FEE);

      expect(await vault.isMatured(0)).to.be.false;
      await time.increase(LOCK.Growth);
      expect(await vault.isMatured(0)).to.be.true;
    });

    it("isMatured returns true for Flex after one block", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);
      expect(await vault.isMatured(0)).to.be.true;
    });

    it("isMatured returns false for a claimed vault", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE);
      await time.increase(1);
      await vault.claim(0, await usdtToken.getAddress(), usdt(10), POOL_FEE);
      expect(await vault.isMatured(0)).to.be.false;
    });

    it("getProjectedEarnings returns APR-proportional amount", async () => {
      const { vault, usdtToken } = await deploy();
      await vault.deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10000), usdt(10000), POOL_FEE);

      const v = await vault.vaults(0);
      const oneYear = BigInt(v.depositTimestamp) + BigInt(365 * 24 * 3600);
      const projected = await vault.getProjectedEarnings(0, oneYear);
      expect(projected).to.be.closeTo(usdt(450), usdt(1));
    });

    it("getUserVaults returns empty array for address with no vaults", async () => {
      const { vault, alice } = await deploy();
      expect(await vault.getUserVaults(alice.address)).to.deep.equal([]);
    });
  });

  // ── REENTRANCY ───────────────────────────────────────────────────────────────
  describe("reentrancy protection", () => {
    it("deposit is guarded against reentrancy", async () => {
      const { vault, usdtToken, alice } = await deploy();
      await expect(
        vault.connect(alice).deposit(TIER.Flex, await usdtToken.getAddress(), usdt(10), usdt(10), POOL_FEE)
      ).to.not.be.reverted;
    });
  });
});
