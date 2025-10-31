import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVeriSafe = await deploy("VeriSafe", {
    from: deployer,
    log: true,
  });

  console.log(`VeriSafe contract: `, deployedVeriSafe.address);
};
export default func;
func.id = "deploy_verisafe";
func.tags = ["VeriSafe"];

