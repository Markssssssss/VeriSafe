// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract VeriSafe is SepoliaConfig {
    // 定义年龄门槛为不可变量，提高安全性和 Gas 效率
    uint32 private immutable MIN_AGE = 18;

    // 存储每个用户最后一次验证的结果（ebool）
    mapping(address => ebool) private lastVerificationResult;

    /**
     * @dev 验证用户是否达到法定年龄。
     * @param inputEuint32 外部加密的年龄 (externalEuint32)。
     * @param inputProof 零知识证明，用于验证加密输入的有效性。
     * @return 加密的布尔值，true if age is >= 18, false otherwise.
     *         注意：结果仍然是加密的，需要在前端使用 SDK 解密。
     */
    function verifyAge(
        externalEuint32 inputEuint32,
        bytes calldata inputProof
    ) public returns (ebool) {
        // 将外部加密输入转换为内部 euint32 类型，并验证证明
        // FHE.fromExternal will revert if the proof is invalid
        euint32 ageEncrypted = FHE.fromExternal(inputEuint32, inputProof);
        
        // 对加密的年龄进行同态比较，返回加密的布尔值
        // FHE.ge returns ebool: true if ageEncrypted >= MIN_AGE, false otherwise
        ebool isAgeValid = FHE.ge(ageEncrypted, FHE.asEuint32(MIN_AGE));

        // Allow the contract itself to use this ebool value (needed before storing in mapping)
        FHE.allowThis(isAgeValid);

        // 存储结果以便后续查询
        lastVerificationResult[msg.sender] = isAgeValid;
        
        // IMPORTANT: Allow the contract to use the stored value (needed after storing)
        // This ensures the value can be retrieved via view functions
        FHE.allowThis(lastVerificationResult[msg.sender]);

        // 允许调用者解密这个结果
        // This grants the caller permission to decrypt isAgeValid
        FHE.allow(isAgeValid, msg.sender);
        // Also allow the caller to decrypt the stored value
        FHE.allow(lastVerificationResult[msg.sender], msg.sender);

        return isAgeValid;
    }

    /**
     * @dev 获取调用者最后一次验证的结果（view 函数）
     * @return 加密的布尔值，true if age is >= 18, false otherwise.
     */
    function getLastVerificationResult() external view returns (ebool) {
        return lastVerificationResult[msg.sender];
    }
}
