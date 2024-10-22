"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  ContractInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import scaffoldConfig from "~~/scaffold.config";
import { Contract, ContractCodeStatus, ContractName, contracts } from "~~/utils/scaffold-eth/contract";

const Home: NextPage = () => {
  const [joined, setJoined] = useState(false);
  const { address: connectedAddress } = useAccount();
  const { data: mafiaContract, isLoading: deployedContractLoading } = useDeployedContractInfo("MafiaGame");
  const { data: result, isPending, writeContractAsync } = useWriteContract();
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();

  const {
    data: allPlayerData = [],
    isFetching,
    refetch: refetchJoinedPlayers,
    error,
  } = useReadContract({
    address: mafiaContract?.address,
    functionName: "getAllPlayers",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  });

  const handleJoin = async () => {
    if (writeContractAsync && mafiaContract?.address) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract.address,
            functionName: "joinGame",
            abi: mafiaContract.abi,
            value: BigInt(parseUnits(scaffoldConfig.joiningFee.toString(), 18)),
          });
        await writeTxn(makeWriteWithParams);
        setJoined(true);
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleJoin ~ error", e);
      }
    }
  };

  useEffect(() => {
    if (typeof allPlayerData === "object" && allPlayerData?.length) {
      // Check if the connected address is in the player addresses
      console.log({ allPlayerData });
      allPlayerData[0]?.includes(connectedAddress) ? setJoined(true) : setJoined(false);
    }
  }, [allPlayerData, connectedAddress]);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-48">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-8xl mb-2">Welcome to</span>
            <span className="block text-9xl font-bold">Mafia Game</span>
          </h1>

          {!joined && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <button
                className="btn btn-secondary btn-lg font-light hover:border-transparent bg-base-100 hover:bg-secondary"
                onClick={handleJoin}
              >
                JOIN GAME
              </button>
              {/* <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} /> */}
            </div>
          )}
          <p className="text-center text-lg">
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              {joined
                ? `Please wait until the game started(need 4 players to Join)`
                : `Get started by paying just ${scaffoldConfig.joiningFee} ETH`}
            </code>
          </p>
          <p className="text-center text-lg">
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              The winning prize will be paid after game ended automatically!
            </code>
          </p>
        </div>

        <div className="flex-grow w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-2xl w-xl rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>Joined Players: {allPlayerData[0]?.length}</p>
              {allPlayerData[1]?.map((player, i) => (
                <div key={i}>
                  <Address key={i} address={player.playerAddress} />
                  {player.playerAddress == connectedAddress && "(you)"}
                </div>
              ))}
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>Game State</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
