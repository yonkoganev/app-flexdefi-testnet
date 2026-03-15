import { flexContracts } from '../contracts';
import { useReadContract, useAccount } from 'wagmi';
import { DAILY_AUCTIONS_ABI } from '../abis/dailyauctions';

export function useGetClaimedBUSD() {
  const { address } = useAccount();

  return useReadContract({
    address: flexContracts.auctions,
    abi: DAILY_AUCTIONS_ABI,
    functionName: 'claimedUSDT',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });
}
