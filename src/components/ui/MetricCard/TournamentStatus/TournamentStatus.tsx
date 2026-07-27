import { CheckCircle2, AlertTriangle, Trophy } from "lucide-react";

type Props = {
    organisation: string;
    competition: string;
    teams: number;
    groups: number;
    fixtures: number;
};

export default function TournamentStatus({
                                             organisation,
                                             competition,
                                             teams,
                                             groups,
                                             fixtures,
                                         }: Props) {

    const ready =
        teams >= 4 &&
        groups > 0;

    return (
        <div className="mb-8 rounded-3xl border border-lime-900/50 bg-gradient-to-r from-[#162012] via-[#1b2815] to-[#162012] p-8">

            <div className="flex items-center gap-3">

                <Trophy className="h-10 w-10 text-lime-400"/>

                <div>

                    <h2 className="text-3xl font-bold text-white">
                        {competition}
                    </h2>

                    <p className="text-slate-300">
                        {organisation}
                    </p>

                </div>

            </div>

            <div className="mt-8 flex items-center gap-3">

                {ready ? (
                    <>
                        <CheckCircle2 className="text-lime-400"/>
                        <span className="font-semibold text-lime-400">
                            Tournament Ready
                        </span>
                    </>
                ) : (
                    <>
                        <AlertTriangle className="text-amber-400"/>
                        <span className="font-semibold text-amber-400">
                            Setup Incomplete
                        </span>
                    </>
                )}

            </div>

            <div className="mt-8 grid grid-cols-3 gap-6">

                <div>
                    <div className="text-3xl font-bold text-white">
                        {teams}
                    </div>
                    <div className="text-slate-400">
                        Teams
                    </div>
                </div>

                <div>
                    <div className="text-3xl font-bold text-white">
                        {groups}
                    </div>
                    <div className="text-slate-400">
                        Groups
                    </div>
                </div>

                <div>
                    <div className="text-3xl font-bold text-white">
                        {fixtures}
                    </div>
                    <div className="text-slate-400">
                        Fixtures
                    </div>
                </div>

            </div>

        </div>
    );
}