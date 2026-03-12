// config/index.js
import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bscTestnet } from '@reown/appkit/networks';

export const projectId = 'ab7c272315eba51041b8e3762c27cba0'; // From cloud.reown.com

if (!projectId) {
  throw new Error('Project ID is not defined');
}

export const networks = [bscTestnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
  wagmiConfigOptions: {
    autoConnect: true
  }
});

export const config = wagmiAdapter.wagmiConfig;
