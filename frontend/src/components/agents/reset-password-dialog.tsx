"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";

import { agentsService } from "@/services/agents.service";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  agentId: string;
  agentName: string;
}

const MIN_LENGTH = 8;

export function ResetPasswordButton({ agentId, agentName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= MIN_LENGTH && password === confirm;

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setPassword("");
      setConfirm("");
      setVisible(false);
    }
  }

  const reset = useMutation({
    // Le service attend un objet { password }, pas une chaîne
    mutationFn: () => agentsService.resetPassword(agentId, { password }),
    onSuccess: () => {
      toast.success("Mot de passe réinitialisé");
      handleOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (canSubmit && !reset.isPending) {
      reset.mutate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound className="mr-2 h-4 w-4" />
          Réinitialiser le mot de passe
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour {agentName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                aria-invalid={tooShort}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground"
                aria-label={
                  visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
              >
                {visible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {tooShort && (
              <p className="text-xs text-destructive">
                Au moins {MIN_LENGTH} caractères.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirm-password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch && (
              <p className="text-xs text-destructive">
                Les mots de passe ne correspondent pas.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Communiquez-le à l&apos;agent par un canal sûr.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={reset.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit || reset.isPending}>
              {reset.isPending ? "Enregistrement..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}