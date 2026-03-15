import { useWriteContract } from 'wagmi';
import { flexContracts } from '../contracts';
import { DAILY_AUCTIONS_ABI } from '../abis/dailyauctions';

export function useClaimBPDs() {
  const { writeContractAsync } = useWriteContract();

  const claimBPDs = async () => {
    return await writeContractAsync({
      address: flexContracts.auctions,
      abi: DAILY_AUCTIONS_ABI,
      functionName: 'claimUSDTFromBPD'
    });
  };

  return { claimBPDs };
}
