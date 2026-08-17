import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * The user's picture wherever one is shown: the GitHub image when the account
 * has one, initials otherwise. Credentials accounts never have an image, so
 * the fallback is the common case rather than an edge case.
 */

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}

/** "Brad Traversy" -> "BT"; a single name gives one letter, email its first */
export function getInitials(name?: string | null, email?: string | null) {
  const fromName = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  if (fromName) {
    return fromName.toUpperCase();
  }

  return (email?.trim()[0] ?? "?").toUpperCase();
}

export function UserAvatar({
  name,
  email,
  image,
  size = "default",
  className,
}: UserAvatarProps) {
  const label = name ?? email ?? "Account";

  return (
    <Avatar size={size} title={label} className={className}>
      {image && <AvatarImage src={image} alt={label} />}
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  );
}
