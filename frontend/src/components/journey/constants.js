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

export const PULSE_CONFIG = {
  hot:     { label: "Hot", color: "teal" },
  warm:    { label: "Warm", color: "amber" },
  neutral: { label: "Neutral", color: "gray" },
  cold:    { label: "Cold", color: "gray" },
};

export const CONV_CONFIG = {
  email_sent:     { label: "Email Sent", color: "teal", side: "right" },
  email_received: { label: "Coach Reply", color: "emerald", side: "left" },
  coach_reply:    { label: "Coach Reply", color: "emerald", side: "left" },
  phone_call:     { label: "Phone Call", color: "blue", side: "right" },
  video_call:     { label: "Video Call", color: "purple", side: "right" },
  text_message:   { label: "Text Message", color: "cyan", side: "right" },
  campus_visit:   { label: "Campus Visit", color: "green", side: "center" },
  visit:          { label: "Campus Visit", color: "green", side: "center" },
  camp:           { label: "Camp/Clinic", color: "orange", side: "center" },
  camp_meeting:   { label: "Camp/Clinic", color: "orange", side: "center" },
  showcase:       { label: "Showcase", color: "amber", side: "center" },
  stage_update:   { label: "Stage Update", color: "slate", side: "center" },
  ai_gmail_insight: { label: "AI Detected", color: "violet", side: "left" },
  coach_directive: { label: "Coach Directive", color: "amber", side: "center" },
  flag_completed: { label: "Flag Completed", color: "emerald", side: "center" },
  coach_message:  { label: "Coach Message", color: "teal", side: "left" },
  athlete_message: { label: "Your Message", color: "slate", side: "right" },
  interaction:    { label: "Interaction", color: "slate", side: "right" },
};

export const BOARD_STAGE_LABELS = {
  needs_outreach: "Needs Outreach",
  waiting_on_reply: "Waiting on Reply",
  in_conversation: "In Conversation",
  overdue: "Follow-up Due",
  archived: "Archived",
};

export const NEXT_STEP_RULES = {
  camp: {
    icon: Dumbbell, iconColor: "#f97316", iconBg: "rgba(249,115,22,0.12)",
    title: "How did the camp go?",
    desc: "Log your experience and follow up with the coach while it's fresh.",
    actions: ["email", "log", "followup"],
  },
  camp_meeting: {
    icon: Dumbbell, iconColor: "#f97316", iconBg: "rgba(249,115,22,0.12)",
    title: "How did the camp go?",
    desc: "Log your experience and follow up with the coach while it's fresh.",
    actions: ["email", "log", "followup"],
  },
  campus_visit: {
    icon: MapPin, iconColor: "#22c55e", iconBg: "rgba(34,197,94,0.12)",
    title: "Great visit! What's next?",
    desc: "Send a thank you note and express your continued interest.",
    actions: ["email", "log"],
  },
  phone_call: {
    icon: Phone, iconColor: "#3b82f6", iconBg: "rgba(59,130,246,0.12)",
    title: "Nice call! Follow up.",
    desc: "Send a thank you email to keep the conversation going.",
    actions: ["email", "followup"],
  },
  video_call: {
    icon: Video, iconColor: "#8b5cf6", iconBg: "rgba(139,92,246,0.12)",
    title: "Good chat! Keep the momentum.",
    desc: "Send a follow-up email summarizing key takeaways.",
    actions: ["email", "followup"],
  },
  email_sent: {
    icon: Send, iconColor: "#0d9488", iconBg: "rgba(26,138,128,0.12)",
    title: "Email sent! A 14-day follow-up has been set.",
    desc: "We'll remind you if you don't hear back. In the meantime, keep logging your activities.",
    actions: ["log"],
  },
  showcase: {
    icon: Trophy, iconColor: "#fbbf24", iconBg: "rgba(251,191,36,0.12)",
    title: "How was the showcase?",
    desc: "Reach out to coaches you connected with while you're on their radar.",
    actions: ["email", "log"],
  },
  text_message: {
    icon: MessageCircle, iconColor: "#06b6d4", iconBg: "rgba(6,182,212,0.12)",
    title: "Keep the conversation going.",
    desc: "Consider scheduling a call or setting a follow-up.",
    actions: ["followup", "log"],
  },
};

export const ACTION_BUTTONS = {
  email:    { label: "Email Coach",        icon: Mail,     testId: "nextstep-email" },
  log:      { label: "Log Notes",          icon: FileText, testId: "nextstep-log" },
  followup: { label: "Schedule Follow-up", icon: Clock,    testId: "nextstep-followup" },
};

export const STAGE_LABELS = {
  added: "Added",
  outreach: "Outreach",
  in_conversation: "In Conversation",
  campus_visit: "Visit",
  offer: "Offer",
  committed: "Committed",
};
