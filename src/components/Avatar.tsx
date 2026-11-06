export function Avatar({
  profile,
  className = "h-9 w-9 text-sm",
}: {
  profile: { username: string; avatar_url: string | null };
  className?: string;
}) {
  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.username} className={`${className} rounded-md object-cover`} />;
  }
  return (
    <span className={`${className} grid place-items-center rounded-md accent-bg font-semibold uppercase`}>
      {profile.username.slice(0, 1)}
    </span>
  );
}
