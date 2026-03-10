import { ExternalLink } from "lucide-react";

const ICONS = {
  twitter: "\ud835\udd4f",
  instagram: "IG",
  facebook: "FB",
  youtube: "YT",
  tiktok: "TT",
};

export function CoachSocialLinks({ coachName, kbCoaches }) {
  try {
    if (!kbCoaches || !Array.isArray(kbCoaches) || kbCoaches.length === 0) return null;
    if (!coachName) return null;

    const nameLower = coachName.toLowerCase().trim();
    const match = kbCoaches.find((kc) => {
      if (!kc || !kc.name) return false;
      const kcName = kc.name.toLowerCase().trim();
      if (kcName === nameLower) return true;
      const parts = nameLower.split(" ");
      const lastName = parts[parts.length - 1];
      return lastName.length > 2 && kcName.includes(lastName);
    });

    if (!match || !match.social_links || typeof match.social_links !== "object") return null;

    const links = Object.entries(match.social_links).filter(([, url]) => url && typeof url === "string");
    if (links.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 mt-1" data-testid="coach-social-links">
        {links.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={platform}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
            style={{ color: "#0f766e", backgroundColor: "rgba(26,138,128,0.1)" }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`coach-social-${platform}`}
          >
            {ICONS[platform] || <ExternalLink className="w-3 h-3 inline" />}
          </a>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}
