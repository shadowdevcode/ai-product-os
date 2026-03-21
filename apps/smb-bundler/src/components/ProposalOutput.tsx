"use client";

import { motion } from "framer-motion";
import PricingCard, { type PricingData } from "./PricingCard";
import EmailPitchCard from "./EmailPitchCard";

export interface ProposalData {
  sessionId: string;
  pricing: PricingData;
  emailPitch: string;
}

interface ProposalOutputProps {
  proposal: ProposalData;
  onRebuild: () => void;
}

export default function ProposalOutput({ proposal, onRebuild }: ProposalOutputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Bundle Proposal
        </p>
        <button
          type="button"
          onClick={onRebuild}
          className="flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <span aria-hidden>←</span> Rebuild Bundle
        </button>
      </div>
      <PricingCard pricing={proposal.pricing} />
      <EmailPitchCard pitch={proposal.emailPitch} sessionId={proposal.sessionId} />
    </motion.div>
  );
}
