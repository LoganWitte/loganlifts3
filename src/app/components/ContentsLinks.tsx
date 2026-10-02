// Row of links to sections on the same page (e.g. '/calculator/info', '/account').
// Each target section needs a matching 'id', and 'scroll-mt-4' so it isn't flush with the top after jumping.
type ContentsLinksProps = {
    links: { id: string, label: string }[];
}

const ContentsLinks = ({ links }: ContentsLinksProps) => {
    return (
        <nav aria-label="Page contents" className="flex flex-row flex-wrap justify-center gap-2 text-sm">
            {links.map(({ id, label }) => (
                <a
                    key={id}
                    href={`#${id}`}
                    className="px-2 py-0.5 rounded-md border border-black bg-white hover:bg-orange-100"
                >
                    {label}
                </a>
            ))}
        </nav>
    );
}

export default ContentsLinks;
