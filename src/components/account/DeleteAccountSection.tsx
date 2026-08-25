"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function DeleteAccountSection() {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
  }

  async function handleDelete() {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    setError(null);
    const { success, message } = await deleteAccount(password);
    setDeleting(false);
    if (!success) {
      setError(message ?? "Could not delete your account.");
    }
    // On success, deleteAccount() already redirects away — nothing left to do here.
  }

  return (
    <div className="mt-6 max-w-2xl rounded-card border border-red-200 bg-red-50 p-6">
      <h2 className="font-bold text-red-900">Danger zone</h2>
      <p className="mt-1 text-sm text-red-800">
        Deleting your account permanently removes your profile and access. This cannot be undone.
      </p>
      <Button variant="outline" className="mt-4 border-red-600 text-red-600 hover:bg-red-100" onClick={() => setOpen(true)}>
        Delete my account
      </Button>

      <Modal open={open} onClose={close} title="Confirm account deletion">
        <p className="text-sm text-body">
          Enter your password to permanently delete your account. This cannot be undone.
        </p>
        <div className="mt-4">
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete my account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
