"use client";

import { Key, useEffect, useState } from "react";
import type { NextPage } from "next";
import { Address as AddressType, parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { SelectPlayerModal } from "~~/components/MafiaGame";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useTargetNetwork, useTransactor } from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [playerAddresses, setPlayerAddresses] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState({});
  const [selectPlayers, setSelectPlayers] = useState(false);
  const { address: connectedAddress } = useAccount();
  const { data: mafiaContract } = useDeployedContractInfo("MafiaGame");
  const { writeContractAsync } = useWriteContract();
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();

  const { data: players = [], refetch: refetchPlayers } = useReadContract({
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
      setLoading(true);
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract?.address,
            functionName: "joinGame",
            abi: mafiaContract?.abi,
            value: BigInt(parseUnits(scaffoldConfig.joiningFee.toString(), 18)),
          });
        await writeTxn(makeWriteWithParams);
        setJoined(true);
        refetchState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleJoin ~ error", e);
      }

      setLoading(false);
    }
  };

  const refetchState = async () => {
    await refetchPlayers();
    await refetchCurrentState();
  };

  const isAssassin = (_address: AddressType | undefined) => {
    return (
      players?.find((player: { playerAddress: string; role: number }) => {
        return player.playerAddress == _address && scaffoldConfig.roles[player.role] === "Assassin";
      }) !== undefined
    );
  };

  useEffect(() => {
    if (typeof players === "object" && players?.length) {
      const addresses = players?.map((player: { playerAddress: any }) => player.playerAddress);
      setPlayerAddresses(addresses);
      addresses.includes(connectedAddress) ? setJoined(true) : setJoined(false);

      setCurrentPlayer(
        (players?.filter(
          (player: { playerAddress: string | undefined }) => player.playerAddress === connectedAddress,
        ))[0],
      );
    }
  }, [players, connectedAddress]);

  useEffect(() => {
    if (currentState && currentState === 2) {
      notification.info("Game Started");
    }
  }, [currentState]);

  const availablePlayerAddresses = playerAddresses.filter(address => address !== connectedAddress);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-48">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-8xl mb-2">Welcome to</span>
            <span className="block text-9xl font-bold">Mafia Game</span>
          </h1>
          {!joined && connectedAddress && currentState === 0 && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <button
                className="btn btn-secondary btn-lg font-light hover:border-transparent bg-base-100 hover:bg-secondary"
                onClick={handleJoin}
                disabled={loading}
              >
                {!loading ? "JOIN GAME" : <span className="loading loading-spinner loading-sm" />}
              </button>
            </div>
          )}

          {joined && currentState === 2 && isAssassin(connectedAddress) && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <button
                className="btn btn-secondary btn-lg font-light hover:border-transparent bg-base-100 hover:bg-secondary"
                onClick={() => setSelectPlayers(true)}
              >
                <label htmlFor="selectPlayer-modal">Select player to kill!</label>
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
                <p>Joined Players: {playerAddresses?.length}</p>
                {players?.map((player: { playerAddress: string | undefined }, i: Key | null | undefined) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Address key={i} address={player.playerAddress} disableAddressLink />
                    {player.playerAddress === connectedAddress && <span className="text-sm">(YOU)</span>}
                  </div>
                ))}
              </div>
              <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
                <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
                <p>Game State: {scaffoldConfig.gameState[currentState]?.state}</p>
                <p>{scaffoldConfig.gameState[currentState]?.desc}</p>
                {joined && currentState === 2 && <p>Your Role: {scaffoldConfig.roles[currentPlayer?.role]}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
      {selectPlayers && (
        <SelectPlayerModal
          addresses={availablePlayerAddresses as AddressType[]}
          modalId="selectPlayer-modal"
          contractName={"MafiaGame"}
          refetchState={refetchState}
        />
      )}
    </>
  );
};

export default Home;
