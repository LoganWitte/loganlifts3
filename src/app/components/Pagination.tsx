'use client'

import { useId, useRef, useState } from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

// Paged results controls with typeable page & per-page fields, plus first / previous / next / last buttons.
// 'page' is 1-based. Callers should clamp it to 'getPageCount' (e.g. when results shrink after filtering).

export const MAX_PER_PAGE = 500;

export function getPageCount(total: number, perPage: number): number {
    return Math.max(1, Math.ceil(total / perPage));
}

// Number input for the page & per-page fields:
// - Arrow keys, the spinner buttons & the mouse wheel apply immediately.
// - Typing is detected from the keys pressed (digits, Backspace, Delete) & pasting, or from the input event's
//   'inputType', since browsers report spinner clicks differently (e.g. Firefox sends an 'InputEvent' for them).
// - Typed values are kept as a draft, so the field can be cleared & retyped without snapping back mid-edit.
//   The draft is applied on Enter (each field is its own small form) or when the field loses focus.
// - Escape discards the draft. Empty / invalid drafts are discarded, and out-of-range values are clamped.
const NumberField = ({ id, value, min, max, label, onCommit }: {
    id?: string, value: number, min: number, max: number, label: string, onCommit: (value: number) => void
}) => {

    // null while not being edited, so the field always shows the current value otherwise
    const [draft, setDraft] = useState<string | null>(null);

    // Whether the next change comes from typing (kept as a draft) rather than stepping (applied immediately)
    const typing = useRef(false);

    function apply(raw: string) {
        const parsed = parseInt(raw);
        if (!isNaN(parsed)) onCommit(Math.min(max, Math.max(min, parsed)));
        setDraft(null);
        typing.current = false;
    }

    return (
        // 'noValidate' so out-of-range values are clamped on submit, rather than blocked by browser validation
        <form
            className="contents"
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                if (draft !== null) apply(draft);
            }}
        >
            <input
                id={id}
                type="number"
                inputMode="numeric"
                enterKeyHint="go"
                aria-label={label}
                min={min}
                max={max}
                step={1}
                className="w-14 p-0.5 text-center rounded-md border border-black bg-gray-300"
                value={draft ?? value}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                    const inputType = (e.nativeEvent as InputEvent).inputType ?? "";
                    const typed = typing.current || /^(insertText|insertFromPaste|insertCompositionText|delete)/.test(inputType);
                    if (typed) setDraft(e.target.value);
                    else apply(e.target.value);
                }}
                onBlur={() => {
                    if (draft !== null) apply(draft);
                    typing.current = false;
                }}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        typing.current = false;
                        setDraft(null);
                    }
                    else if (e.key === "ArrowUp" || e.key === "ArrowDown") typing.current = false;
                    else if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") typing.current = true;
                }}
                onPaste={() => { typing.current = true; }}
                // Spinner clicks apply immediately, even after typing
                onMouseDown={() => { typing.current = false; }}
            />
        </form>
    );
}

const PageButton = ({ title, disabled, onClick, children }: {
    title: string, disabled: boolean, onClick: () => void, children: React.ReactNode
}) => {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            // 'aria-disabled' rather than 'disabled', as browsers (e.g. Firefox) may restore a button's previous
            // disabled state after a reload, which wouldn't match the server-rendered HTML (hydration mismatch)
            aria-disabled={disabled}
            className={`p-0.5 rounded-full ${disabled ? "opacity-30 hover:cursor-not-allowed" : "hover:bg-stone-300 hover:cursor-pointer"}`}
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
        >
            {children}
        </button>
    );
}

type PaginationProps = {
    page: number;
    setPage: (page: number) => void;
    perPage: number;
    setPerPage: (perPage: number) => void;
    total: number;
    itemLabel?: string; // e.g. "results"
}

const Pagination = ({ page, setPage, perPage, setPerPage, total, itemLabel = "results" }: PaginationProps) => {

    // Unique per instance, since a page may show these controls more than once (e.g. above & below results)
    const perPageId = useId();

    const pageCount = getPageCount(total, perPage);
    const first = total === 0 ? 0 : (page - 1) * perPage + 1;
    const last = Math.min(page * perPage, total);

    return (
        <div className="flex flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md border-2 border-black bg-white px-2 py-1 select-none">

            <span className="whitespace-nowrap">
                {first}–{last} of {total} {itemLabel}
            </span>

            <div className="flex flex-row items-center gap-1">
                <PageButton title="First page" disabled={page <= 1} onClick={() => setPage(1)}>
                    <ChevronFirst size={22} />
                </PageButton>
                <PageButton title="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={22} />
                </PageButton>
                <span className="whitespace-nowrap">Page</span>
                <NumberField value={page} min={1} max={pageCount} label="Page number" onCommit={setPage} />
                <span className="whitespace-nowrap">of {pageCount}</span>
                <PageButton title="Next page" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
                    <ChevronRight size={22} />
                </PageButton>
                <PageButton title="Last page" disabled={page >= pageCount} onClick={() => setPage(pageCount)}>
                    <ChevronLast size={22} />
                </PageButton>
            </div>

            {/* Not wrapped in the label, as each field is its own form */}
            <div className="flex flex-row items-center gap-1 whitespace-nowrap">
                <label htmlFor={perPageId}>Per page</label>
                <NumberField id={perPageId} value={perPage} min={1} max={MAX_PER_PAGE} label="Results per page" onCommit={setPerPage} />
            </div>

        </div>
    );
}

export default Pagination;
