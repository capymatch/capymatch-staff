import {
  Send, Mail, Phone, MapPin, Video,
  FileText, Clock, Dumbbell, Trophy, MessageCircle
} from "lucide-react";

export const RAIL_STAGES = [
  { key: "added", label: "Added", color: "#94a3b8" },
  { key: "outreach", label: "Outreach", color: "#1a8a80" },
  { key: "in_conversation", label: "Talking", color: "#22c55e" },
  { key: "campus_visit", label: "Visit", color: "#3b82f6" },
  { key: "offer", label: "Offer", color: "#a855f7" },
  { key: "committed", label: "Committed", color: "#fbbf24" },
];

export const BOARD_STAGE_LABELS = {
  needs_outreach: "Needs Outreach",
  waiting_on_reply: "Waiting on Reply",
  in_conversation: "In Conversation",
  overdue: "Follow-up Due",
  archived: "Archived",
};
