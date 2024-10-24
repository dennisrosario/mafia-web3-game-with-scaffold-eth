"use client";

import { useState } from "react";
import { Address as AddressType } from "viem";
import { BanknotesIcon } from "@heroicons/react/24/outline";

type SelectModererModalProps = {
  addresses: AddressType[];
  modalId: string;
  setSelectedModerator: Function;
};

export const SelectModererModal = ({ addresses, modalId, setSelectedModerator }: SelectModererModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  return (
    <div>
      <label htmlFor={modalId} className="btn btn-primary btn-lg font-normal gap-1">
        <span>Find out the Moderator</span>
      </label>
      <input type="checkbox" id={modalId} className="modal-toggle" />
      <label htmlFor={modalId} className="modal cursor-pointer">
        <label className="modal-box relative">
          <h3 className="text-xl font-bold mb-3">Vote Who's Moderator</h3>
          <label htmlFor={modalId} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="space-y-3">
            <div className="flex w-full">
              <select
                className="select select-bordered w-full"
                value={selectedAddress}
                onChange={e => setSelectedAddress(e.target.value)}
              >
                <option value="" disabled>
                  Select a Moderator address
                </option>
                {addresses.map((address, index) => (
                  <option key={index} value={address}>
                    {address}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-3">
              <button
                className="h-10 btn btn-primary btn-sm px-2 rounded-full"
                onClick={() => setSelectedModerator()}
                disabled={loading}
              >
                {!loading ? (
                  <BanknotesIcon className="h-6 w-6" />
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                <span>Vote</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
