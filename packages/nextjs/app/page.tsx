"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { Address as AddressType, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const [joined, setJoined] = useState(false);
  const [selectPlayers, setSelectPlayers] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const { address: connectedAddress } = useAccount();
  const { data: mafiaContract, isLoading: deployedContractLoading } = useDeployedContractInfo("MafiaGame");
  const { data: result, isPending, writeContractAsync } = useWriteContract();
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();

  const { data: allPlayerData = [], refetch: refetchJoinedPlayers } = useReadContract({
    address: mafiaContract?.address,
    functionName: "getAllPlayers",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  });

  const { data: currentState = 0, refetch: refetchCurrentState } = useReadContract({
    address: mafiaContract?.address,
    functionName: "currentState",
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
        refetchJoinedPlayers();
        refetchCurrentState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleJoin ~ error", e);
      }
    }
  };

  const handleAssassinKill = async (target: AddressType) => {
    if (writeContractAsync && mafiaContract?.address) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract.address,
            functionName: "assassinKill",
            abi: mafiaContract.abi,
            args: [target],
          });
        await writeTxn(makeWriteWithParams);
        refetchJoinedPlayers();
        refetchCurrentState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleAssassinKill ~ error", e);
      }
    }
  };

  useEffect(() => {
    if (typeof allPlayerData === "object" && allPlayerData?.length) {
      // Check if the connected address is in the player addresses
      allPlayerData[0]?.includes(connectedAddress) ? setJoined(true) : setJoined(false);
    }
  }, [allPlayerData, connectedAddress]);

  useEffect(() => {
    if (currentState && currentState === 2) {
      notification.info("Game Started");
    }
  }, [currentState]);

  console.log(
    allPlayerData[1]?.find(player => {
      return player.playerAddress == connectedAddress && player.role === scaffoldConfig.roles.Assassin;
    }),
  );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-48">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-8xl mb-2">Welcome to</span>
            <span className="block text-9xl font-bold">Mafia Game</span>
          </h1>

          {!joined && connectedAddress && (
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

          {joined &&
            currentState === 2 &&
            allPlayerData[1]?.find(player => {
              return player.playerAddress == connectedAddress && player.role === scaffoldConfig.roles.Assassin;
            }) !== undefined && (
              <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
                <button
                  className="btn btn-secondary btn-lg font-light hover:border-transparent bg-base-100 hover:bg-secondary"
                  onClick={() => setSelectPlayers(true)}
                >
                  Kill the other players!
                </button>
              </div>
            )}
          <p className="text-center text-lg">
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              {joined
                ? `Please wait until the game started (need 4 players to Join)`
                : `Get started by paying just ${scaffoldConfig.joiningFee} ETH`}
            </code>
          </p>
          <p className="text-center text-lg">
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              The winning prize will be paid after the game ended automatically!
            </code>
          </p>
        </div>

        {connectedAddress && (
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
                <p>{scaffoldConfig.gameState[currentState]?.state}</p>
                <p>{scaffoldConfig.gameState[currentState]?.desc}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
