import * as chains from "viem/chains";

export type ScaffoldConfig = {
  joiningFee: number;
  gameState: object;
  roles: object;
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

const scaffoldConfig = {
  joiningFee: 0.1,

  roles: ["Assassin", "Police", "Citizen"],

  gameState: [
    {
      state: "Waiting",
      desc: "Please wait till the other players to join.",
    },
    {
      state: "AssigningRoles",
      desc: "Assigning roles random bases.",
    },
    {
      state: "Night",
      desc: "Assasins’s turn - choose somebody to kill - 15 seconds.",
    },
    {
      state: "Day",
      desc: "Voting to kill - choose somebody available from the dropdown list to kill.",
    },
    {
      state: "Finished",
      desc: "Check for winners.",
    },
  ],

  // The networks on which your DApp is live
  targetNetworks: [chains.hardhat],

  // The interval at which your front-end polls the RPC servers for new data
  // it has no effect if you only target the local network (default is 4000)
  pollingInterval: 30000,

  // You can get your Alchemy's default API key at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",

  // This is ours WalletConnect's default project ID.
  // You can get your own at https://cloud.walletconnect.com
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",

  // Only show the Burner Wallet when running on hardhat network
  onlyLocalBurnerWallet: true,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
