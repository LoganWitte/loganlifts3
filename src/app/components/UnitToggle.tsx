'use client'

// Simple lb/kg toggle switch.
type UnitToggleProps = {
    falseString: string; // Left value (false)
    trueString: string; // Right value (true)
    value: boolean;
    setValue: (value: boolean) => void;
}

const UnitToggle = ({ falseString, trueString, value, setValue }: UnitToggleProps) => {
    return (
        <div className="flex items-center justify-center text-center gap-2 sm:gap-3 mb-2">
            <div
                className={`sm:text-lg transition-all ${value ? "opacity-60" : "font-semibold underline underline-offset-2"} hover:cursor-pointer hover:opacity-100`}
                onClick={() => setValue(false)}
            >
                {falseString}
            </div>

            <button
                type="button"
                onClick={() => setValue(!value)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-orange-500 hover:cursor-pointer transition-colors hover:bg-[oklch(63.5%_0.213_47.604)] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label={`Toggle between ${falseString} and ${trueString}`}
                role="switch"
                aria-checked={value}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${value ? "translate-x-6" : "translate-x-1"}`}
                />
            </button>

            <div
                className={`sm:text-lg transition-all ${value ? "font-semibold underline underline-offset-2" : "opacity-60"} hover:cursor-pointer hover:opacity-100`}
                onClick={() => setValue(true)}
            >
                {trueString}
            </div>
        </div>
    );
}

export default UnitToggle;