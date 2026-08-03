import { useMemo, useState } from "react";
import { Search, Trophy, CalendarDays } from "lucide-react";
import type { Competition } from "../../types/competitionTypes";

type Props = {
    organisationName: string;
    competitions?: Competition[];
    backgroundColour: string;
    surfaceColour: string;
    textColour: string;
    accentColour: string;
    accentTextColour: string;
    basePath: string;
};

export function PublicCompetitionsPage({
                                           organisationName,
                                           competitions = [],
                                           backgroundColour,
                                           surfaceColour,
                                           textColour,
                                           accentColour,
                                           accentTextColour,
                                           basePath,
                                       }: Props) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return competitions.filter((c: any) => {
            const name = (c.name ?? c.title ?? "").toLowerCase();
            const desc = (c.description ?? "").toLowerCase();
            return !s || name.includes(s) || desc.includes(s);
        });
    }, [competitions, search]);

    return (
        <div className="min-h-screen" style={{background: backgroundColour, color: textColour}}>
            <section className="border-b py-16" style={{borderColor:`${accentColour}30`}}>
                <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
                    <p className="text-xs font-black uppercase tracking-[0.2em]" style={{color:accentColour}}>Competitions</p>
                    <h1 className="mt-3 text-5xl font-black">Competitions</h1>
                    <p className="mt-4 max-w-3xl opacity-75">
                        Browse published competitions organised by <strong>{organisationName}</strong>.
                    </p>
                </div>
            </section>

            <section className="py-8">
                <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"/>
                        <input
                            value={search}
                            onChange={e=>setSearch(e.target.value)}
                            placeholder="Search competitions..."
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4"
                            style={{color:textColour}}
                        />
                    </div>

                    {filtered.length===0 ? (
                        <div className="mt-8 rounded-2xl border p-12 text-center" style={{background:surfaceColour,borderColor:`${accentColour}30`}}>
                            <Trophy size={48} className="mx-auto" color={accentColour}/>
                            <h2 className="mt-4 text-2xl font-black">No competitions found</h2>
                        </div>
                    ) : (
                        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((c:any)=>(
                                <article key={c.id} className="rounded-2xl border p-6" style={{background:surfaceColour,borderColor:`${accentColour}30`}}>
                  <span className="rounded-full px-3 py-1 text-xs font-black" style={{background:`${accentColour}20`,color:accentColour}}>
                    {c.status ?? "Published"}
                  </span>
                                    <h2 className="mt-4 text-2xl font-black">{c.name ?? c.title ?? "Competition"}</h2>
                                    <p className="mt-3 text-sm opacity-75">{c.description ?? "Competition details will appear here."}</p>
                                    <div className="mt-5 flex items-center gap-2 text-sm opacity-70">
                                        <CalendarDays size={16}/>
                                        <span>{c.start_date ?? "Date TBC"}{c.end_date ? ` - ${c.end_date}`:""}</span>
                                    </div>
                                    <a
                                        href={`${basePath}/fixtures`}
                                        className="mt-6 inline-flex rounded-xl px-4 py-2 font-bold no-underline"
                                        style={{background:accentColour,color:accentTextColour}}
                                    >
                                        View Fixtures
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}