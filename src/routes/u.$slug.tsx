import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/Avatar";
import { entryRouteId } from "@/lib/local-store";

const getProfile = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    const m = /^([a-zA-Z0-9_]{3,20})\.(\d{1,12})$/.exec(slug);
    if (!m) throw new Error("bad slug");
    return { username: m[1], uid: Number(m[2]) };
  })
  .handler(async ({ data }) => {
    const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: profile } = await sb
      .from("profiles")
      .select("id, uid, username, bio, avatar_url, accent_color")
      .eq("uid", data.uid)
      .maybeSingle();
    if (!profile || profile.username.toLowerCase() !== data.username.toLowerCase()) return null;
    const { data: pinned } = await sb
      .from("watchlist_entries")
      .select("id, mal_id, anilist_id, title, image_url, status, personal_score")
      .eq("user_id", profile.id)
      .eq("is_pinned", true)
      .order("updated_at", { ascending: false });
    const { id: _id, ...pub } = profile;
    return { profile: pub, pinned: pinned ?? [] };
  });

const profileQuery = (slug: string) =>
  queryOptions({ queryKey: ["profile", slug], queryFn: () => getProfile({ data: slug }), staleTime: 60_000 });

export const Route = createFileRoute("/u/$slug")({
  loader: async ({ params, context }) => {
    const res = await context.queryClient.ensureQueryData(profileQuery(params.slug)).catch(() => null);
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.profile.username ?? "Profile";
    const desc = loaderData?.profile.bio || `${name}'s favorite anime on AniTrack.`;
    return {
      meta: [
        { title: `${name} — AniTrack` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — AniTrack` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(profileQuery(slug));
  if (!data) return null;
  const { profile, pinned } = data;
  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-5 py-10 space-y-10">
        <div className="flex items-center gap-5">
          <Avatar profile={profile} className="h-20 w-20 text-2xl" />
          <div>
            <h1 className="font-display text-3xl font-semibold">{profile.username}</h1>
            {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
          </div>
        </div>
        <section className="space-y-4">
          <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Pinned anime</h2>
          {pinned.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pinned yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {pinned.map((e) => (
                <Link key={e.id} to="/anime/$id" params={{ id: entryRouteId(e) }} className="group">
                  <img src={e.image_url} alt={e.title} className="aspect-[2/3] w-full rounded-md object-cover" />
                  <div className="mt-2 line-clamp-2 text-sm group-hover:accent-text">{e.title}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
