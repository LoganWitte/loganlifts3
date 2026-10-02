'use client'

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { getEquivalentWeight, getOneRepMax } from '@/lib/formulas';

// Example exercises for the bodyweight explorer below. Coefficients match the exercise library.
const EXAMPLE_EXERCISES: { name: string, k: number }[] = [
    { name: "Pull-Up", k: 1 },
    { name: "Dip", k: 1 },
    { name: "Decline Push-Up", k: 0.72 },
    { name: "Push-Up", k: 0.65 },
    { name: "Incline Push-Up", k: 0.48 },
    { name: "Dead Bug", k: 0 },
];
const CUSTOM_EXERCISE = "Custom";

// Section heading, linked from the contents list
const SectionHeading = ({ id, children }: { id: string, children: ReactNode }) => {
    return (
        <h2 id={id} className="scroll-mt-4 text-lg sm:text-xl font-semibold mt-6 mb-2 text-center">
            {children}
        </h2>
    );
}

// White card used to group each part of a section, matching cards elsewhere in this project
const Card = ({ children }: { children: ReactNode }) => {
    return (
        <div className="w-full flex flex-col gap-2 text-left p-3 rounded-md border-2 border-black bg-white">
            {children}
        </div>
    );
}

const Page = () => {

    // Bodyweight explorer inputs (unit-agnostic: any unit works, as long as both weights use the same one)
    const [exampleName, setExampleName] = useState("Push-Up");
    const [customK, setCustomK] = useState<number | undefined>(0.65);
    const [bodyWeight, setBodyWeight] = useState<number | undefined>(180);
    const [addedWeight, setAddedWeight] = useState<number | undefined>(45);
    const [reps, setReps] = useState<number | undefined>(5);

    const k = exampleName === CUSTOM_EXERCISE ? customK : EXAMPLE_EXERCISES.find((ex) => ex.name === exampleName)?.k;

    // Results of the explorer. Undefined while any input is empty or invalid.
    const equivalent = (bodyWeight !== undefined && bodyWeight > 0 && k !== undefined)
        ? getEquivalentWeight(bodyWeight, addedWeight ?? 0, k)
        : undefined;
    const movedLoad = (equivalent !== undefined && k !== undefined && k > 0) ? (k * bodyWeight!) + (addedWeight ?? 0) : undefined;
    const oneRepMax = (equivalent !== undefined && reps !== undefined && reps > 0) ? getOneRepMax(equivalent, reps, "Recommended") : undefined;

    function parseInput(raw: string): number | undefined {
        const value = parseFloat(raw);
        return (isNaN(value) || value < 0) ? undefined : value;
    }

    function format(value: number | undefined): string {
        return value === undefined ? "—" : (Math.round(value * 100) / 100).toString();
    }

    const inputClass = "bg-gray-300 border border-black p-1 w-24 rounded-md";

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 sm:m-4 bg-slate-200 sm:border-t border-b sm:border-l sm:border-r border-black text-black min-w-full sm:min-w-160 sm:w-[60vw] sm:max-w-4xl">

            <div className="flex flex-row justify-center text-xl sm:text-2xl font-semibold mb-2">
                Calculation Info & Formulae
            </div>

            <Link
                href="/calculator"
                className="flex flex-row items-center gap-1 text-sm font-medium underline hover:text-orange-600 mb-2"
            >
                <ArrowLeft size={16} />
                Back to calculator
            </Link>

            {/* Contents */}
            <nav className="flex flex-row flex-wrap justify-center gap-2 text-sm">
                <a href="#one-rep-max" className="px-2 py-0.5 rounded-md border border-black bg-white hover:bg-orange-100">Estimating your 1RM</a>
                <a href="#bodyweight" className="px-2 py-0.5 rounded-md border border-black bg-white hover:bg-orange-100">Bodyweight exercises</a>
                <a href="#explorer" className="px-2 py-0.5 rounded-md border border-black bg-white hover:bg-orange-100">Try it</a>
                <a href="#logging" className="px-2 py-0.5 rounded-md border border-black bg-white hover:bg-orange-100">Logging & tables</a>
            </nav>

            <div className="w-full flex flex-col items-center px-0 sm:px-4">

                {/* ---------- 1RM ---------- */}
                <SectionHeading id="one-rep-max">Estimating your 1RM</SectionHeading>

                <Card>
                    <p>
                        Your <span className="font-semibold">1RM</span> (one-rep max) is the most weight you could lift for a single repetition.
                        It&apos;s a common way to measure strength in a movement, but testing it directly is tiring and risky.
                        Instead, it can be estimated from a longer set, such as 8 reps, using one of the formulas below.
                    </p>
                    <p>
                        Every lift you log stores an estimated 1RM using the <span className="font-semibold">Recommended</span> formula,
                        so your progress can be compared across different weights and rep counts. A set of 1 rep is always its own 1RM.
                    </p>
                </Card>

                <div className="my-3">Our &quot;Recommended&quot; formula uses the following method:</div>
                <div className="flex flex-col items-center max-w-full overflow-x-auto">
                    <div className="grid grid-cols-[1fr_2fr_3fr] w-fit p-2 font-sans">
                        {/* Header */}
                        <div className="font-semibold text-center border-b border-black pb-1 flex items-center justify-center px-2 sm:px-4"># Reps</div>
                        <div className="font-semibold text-center border-b border-black pb-1 flex items-center justify-center px-2 sm:px-4">Method</div>
                        <div className="font-semibold text-center border-b border-black pb-1 flex items-center justify-center px-2 sm:px-4">Math</div>
                        {/* Row 1 */}
                        <div className="text-center pb-1 my-1 border-b border-black flex items-center justify-center px-2 sm:px-4">1-8</div>
                        <div className="text-center pb-1 my-1 border-b border-black flex items-center justify-center px-2 sm:px-4">Brzycki formula</div>
                        <div className="text-xs pb-1 my-1 border-b border-black flex items-center justify-center px-2 sm:px-4">
                            <BlockMath math={String.raw`\frac{weight \times 36}{37 - reps}`} />
                        </div>
                        {/* Row 2 */}
                        <div className="text-center pb-1 mb-1 border-b border-black flex items-center justify-center px-2 sm:px-4">9-10</div>
                        <div className="text-center pb-1 mb-1 border-b border-black flex items-center justify-center px-2 sm:px-4">Brzycki & Epley average</div>
                        <div className="text-xs  pb-1 mb-1 border-b border-black flex items-center justify-center px-2 sm:px-4">
                            <BlockMath math={String.raw`\frac{Brzycki + Epley}{2}`} />
                        </div>
                        {/* Row 3 */}
                        <div className="text-center flex items-center justify-center px-2 sm:px-4">11+</div>
                        <div className="text-center flex items-center justify-center px-2 sm:px-4">Epley formula</div>
                        <div className="text-xs flex items-center justify-center px-2 sm:px-4">
                            <BlockMath math={String.raw`weight \times (1 + \frac{reps}{30})`} />
                        </div>
                    </div>
                </div>

                <div className="my-3">Each formula can also be selected on its own:</div>
                <div className="flex flex-col items-center max-w-full overflow-x-auto">
                    <div className="grid grid-cols-[1fr_1fr] w-fit p-2 font-sans">
                        {/*Header*/}
                        <div className="font-semibold text-center border-b border-black pb-1 flex items-center justify-center px-4">
                            Method
                        </div>
                        <div className="font-semibold text-center border-b border-black pb-1 flex items-center justify-center px-4">
                            Math
                        </div>
                        {/*Row 1*/}
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            Brzycki formula
                        </div>
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            <div className="text-xs flex items-center justify-center px-4">
                                <BlockMath math={String.raw`\frac{weight \times 36}{37 - reps}`} />
                            </div>
                        </div>
                        {/*Row 2*/}
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            Epley formula
                        </div>
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            <div className="text-xs flex items-center justify-center px-4">
                                <BlockMath math={String.raw`weight \times (1 + \frac{reps}{30})`} />
                            </div>
                        </div>
                        {/*Row 3*/}
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            Lombardi formula
                        </div>
                        <div className="text-center border-b border-black py-1 flex items-center justify-center px-4">
                            <div className="text-xs flex items-center justify-center px-4">
                                <BlockMath math={String.raw`weight \times reps^{0.1}`} />
                            </div>
                        </div>
                        {/*Row 4*/}
                        <div className="text-center pt-1 flex items-center justify-center px-4">
                            O&apos;Connor formula
                        </div>
                        <div className="text-center pt-1 flex items-center justify-center px-4">
                            <div className="text-xs flex items-center justify-center px-4">
                                <BlockMath math={String.raw`weight \times (1 + 0.025 \times reps)`} />
                            </div>
                        </div>
                    </div>
                </div>

                <Card>
                    <div className="font-semibold">Accuracy</div>
                    <ul className="list-disc ml-5 flex flex-col gap-1">
                        <li>Estimates are most reliable for sets of about 10 reps or fewer. Beyond that, endurance plays a bigger role than strength, and the formulas drift apart.</li>
                        <li>Brzycki can&apos;t be used for 37 or more reps, so the calculator shows &quot;N/A&quot; there. The Recommended formula switches to Epley above 10 reps to avoid this.</li>
                        <li>Every formula is an approximation. Use your estimated 1RM to track progress over time, not as a guarantee of what you can lift.</li>
                    </ul>
                </Card>

                {/* ---------- Bodyweight ---------- */}
                <SectionHeading id="bodyweight">Bodyweight exercises & added weight</SectionHeading>

                <Card>
                    <p>
                        On exercises like pull-ups, dips and push-ups, your body is the weight. To compare these sets with each other
                        (and to estimate a 1RM), each set is converted into a single <span className="font-semibold">equivalent weight</span>,
                        built from your body weight and any weight you add with a belt, vest, plate or dumbbell.
                    </p>
                    <div className="text-sm sm:text-base">
                        <BlockMath math={String.raw`\text{equivalent weight} = \text{body weight} + \frac{\text{added weight}}{k}`} />
                    </div>
                    <p>
                        <InlineMath math="k" /> is the exercise&apos;s <span className="font-semibold">added weight coefficient</span>:
                        roughly the share of your body weight the exercise actually moves.
                    </p>
                </Card>

                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 my-2">
                    <Card>
                        <div className="font-semibold">Traditional</div>
                        <div className="text-sm text-stone-600">k is empty</div>
                        <p className="text-sm">Barbell, dumbbell, kettlebell and machine exercises. You enter the weight directly, and body weight isn&apos;t part of the calculation.</p>
                    </Card>
                    <Card>
                        <div className="font-semibold">Weighted bodyweight</div>
                        <div className="text-sm text-stone-600">k greater than 0</div>
                        <p className="text-sm">Pull-ups, dips, push-ups, lunges and more. You enter your body weight and any added weight, and both count toward the lift.</p>
                    </Card>
                    <Card>
                        <div className="font-semibold">Bodyweight only</div>
                        <div className="text-sm text-stone-600">k = 0</div>
                        <p className="text-sm">Exercises where added weight can&apos;t be compared fairly. The equivalent weight is just your body weight. Added weight is still recorded, but not counted.</p>
                    </Card>
                </div>

                <Card>
                    <div className="font-semibold">Why divide by k?</div>
                    <p>
                        In a pull-up you lift your whole body, so <InlineMath math="k = 1" /> and a 45 lb belt counts as 45 lb.
                        In a push-up your feet carry part of your weight, so your arms only press about 65% of it (<InlineMath math="k = 0.65" />).
                    </p>
                    <p>
                        For a 180 lb lifter, a push-up moves about <InlineMath math="0.65 \times 180 = 117" /> lb. A 45 lb plate on the back
                        raises that to 162 lb, a 38% increase. To make a push-up that hard without the plate, you&apos;d have to weigh 38% more:
                        about 249 lb. Dividing by <InlineMath math="k" /> does exactly this conversion:
                    </p>
                    <div className="text-sm sm:text-base">
                        <BlockMath math={String.raw`180 + \frac{45}{0.65} \approx 249 \text{ lb}`} />
                    </div>
                    <p>
                        So added weight counts for more on exercises that move less of your body, because each pound is a bigger share of the load.
                        Equivalent weights are always expressed in &quot;body weight terms&quot;, which keeps sets with and without added weight on the same scale.
                    </p>
                </Card>

                <div className="my-3">Examples for a 180 lb lifter adding 45 lb:</div>
                <div className="flex flex-col items-center max-w-full overflow-x-auto">
                    <div className="grid grid-cols-[auto_auto_auto] w-fit p-2 font-sans">
                        <div className="font-semibold text-center border-b border-black pb-1 px-2 sm:px-4">Exercise</div>
                        <div className="font-semibold text-center border-b border-black pb-1 px-2 sm:px-4">k</div>
                        <div className="font-semibold text-center border-b border-black pb-1 px-2 sm:px-4">Equivalent weight</div>
                        {EXAMPLE_EXERCISES.map((ex) => (
                            <div key={ex.name} className="contents">
                                <div className={`text-center py-1 px-2 sm:px-4 ${ex.k !== 0 ? "border-b border-black" : ""}`}>{ex.name}</div>
                                <div className={`text-center py-1 px-2 sm:px-4 ${ex.k !== 0 ? "border-b border-black" : ""}`}>{ex.k}</div>
                                <div className={`text-center py-1 px-2 sm:px-4 ${ex.k !== 0 ? "border-b border-black" : ""}`}>
                                    {format(getEquivalentWeight(180, 45, ex.k))} lb{ex.k === 0 && " (added weight not counted)"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Card>
                    <div className="font-semibold">Where do the coefficients come from?</div>
                    <ul className="list-disc ml-5 flex flex-col gap-1">
                        <li>Pull-ups, chin-ups, dips and muscle-ups use <InlineMath math="k = 1" />, since the whole body is lifted and added weight hangs in line with it.</li>
                        <li>Push-up values (flat 0.65, incline 0.48, decline 0.72) are based on research measuring how much body weight the hands support.</li>
                        <li>Most other values are estimates based on body segment weights and leverage, and may be refined over time.</li>
                        <li>When there&apos;s no fair way to compare added weight, k is set to 0 and only body weight counts.</li>
                    </ul>
                </Card>

                {/* ---------- Explorer ---------- */}
                <SectionHeading id="explorer">Try it</SectionHeading>

                <Card>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <label htmlFor="explorer-exercise" className="font-semibold">Exercise:</label>
                            <div className="flex flex-row items-center gap-2">
                                <select
                                    id="explorer-exercise"
                                    value={exampleName}
                                    onChange={(e) => setExampleName(e.target.value)}
                                    className="bg-gray-300 border border-black p-1 rounded-md hover:cursor-pointer"
                                >
                                    {EXAMPLE_EXERCISES.map((ex) => (
                                        <option key={ex.name} value={ex.name}>{ex.name} (k = {ex.k})</option>
                                    ))}
                                    <option value={CUSTOM_EXERCISE}>Custom k</option>
                                </select>
                                {exampleName === CUSTOM_EXERCISE && (
                                    <input
                                        type="number" aria-label="Custom coefficient" min="0" step="0.01"
                                        defaultValue={customK ?? ""}
                                        className={`${inputClass} w-20`}
                                        onChange={(e) => setCustomK(parseInput(e.target.value))}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex flex-row items-center justify-between gap-2">
                            <label htmlFor="explorer-body-weight" className="font-semibold">Body weight:</label>
                            <input
                                type="number" id="explorer-body-weight" min="0" step="any" defaultValue={bodyWeight ?? ""}
                                className={inputClass}
                                onChange={(e) => setBodyWeight(parseInput(e.target.value))}
                            />
                        </div>
                        <div className="flex flex-row items-center justify-between gap-2">
                            <label htmlFor="explorer-added-weight" className="font-semibold">Added weight:</label>
                            <input
                                type="number" id="explorer-added-weight" min="0" step="any" defaultValue={addedWeight ?? ""}
                                className={inputClass}
                                onChange={(e) => setAddedWeight(parseInput(e.target.value))}
                            />
                        </div>
                        <div className="flex flex-row items-center justify-between gap-2">
                            <label htmlFor="explorer-reps" className="font-semibold">Reps:</label>
                            <input
                                type="number" id="explorer-reps" min="1" step="1" defaultValue={reps ?? ""}
                                className={inputClass}
                                onChange={(e) => setReps(parseInput(e.target.value))}
                            />
                        </div>
                        <div className="text-xs text-stone-600">Any unit works, as long as both weights use the same one.</div>
                    </div>

                    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-black">
                        <div className="flex flex-row justify-between gap-2">
                            <span>Load actually moved:</span>
                            <span className="font-semibold">{k === 0 ? "Not calculable" : format(movedLoad)}</span>
                        </div>
                        <div className="flex flex-row justify-between gap-2">
                            <span>Equivalent weight:</span>
                            <span className="font-semibold">{format(equivalent)}</span>
                        </div>
                        <div className="flex flex-row justify-between gap-2">
                            <span>Estimated 1RM (Recommended):</span>
                            <span className="font-semibold">{format(oneRepMax)}</span>
                        </div>
                        {k === 0 && (addedWeight ?? 0) > 0 && (
                            <div className="text-sm text-stone-600">With k = 0, the added weight is recorded but not counted.</div>
                        )}
                    </div>
                </Card>

                {/* ---------- Logging ---------- */}
                <SectionHeading id="logging">Logging & equivalent lift tables</SectionHeading>

                <Card>
                    <ul className="list-disc ml-5 flex flex-col gap-1">
                        <li>
                            <span className="font-semibold">Body weight per lift.</span> Bodyweight lifts store the body weight you entered for that set.
                            If you leave it empty, your account body weight is used for the calculation.
                        </li>
                        <li>
                            <span className="font-semibold">Automatic body weight updates.</span> If enabled on your account page, logging a lift with a body weight
                            updates your account body weight, as long as the lift is newer than the last update.
                        </li>
                        <li>
                            <span className="font-semibold">Body weight changes are reflected.</span> If you lose weight and do the same set, your equivalent weight
                            goes down, because you really are moving less. Matching your old numbers then takes more reps or added weight, which is real progress.
                        </li>
                        <li>
                            <span className="font-semibold">Added weight column.</span> On weighted bodyweight exercises, the Equivalent Lifts table also shows how much
                            weight to add for each rep count:
                            <div className="text-sm">
                                <BlockMath math={String.raw`\text{added weight} = (\text{equivalent weight} - \text{body weight}) \times k`} />
                            </div>
                            A &quot;—&quot; means your body weight alone is already enough for that many reps.
                        </li>
                        <li>
                            <span className="font-semibold">Coefficient updates.</span> If an exercise&apos;s coefficient is refined, every lift logged to it is
                            recalculated from its recorded body weight and added weight, so your history stays consistent.
                        </li>
                    </ul>
                </Card>

            </div>

        </div>
    );
}

export default Page;
