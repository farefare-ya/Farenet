const avatarColors = [
  "#e17076", "#7bc862", "#65aadd", "#a695e7",
  "#ee7aae", "#faa774", "#6ec9cb",
];

function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return (
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ name, photoURL, size = 40, className = "" }: AvatarProps) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: avatarColorFor(name || "?"), fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  );
}
