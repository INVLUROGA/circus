import React from "react";

/**
 * JobCard
 * --------------------------------------------------------------
 * Un componente de tarjeta de oferta de trabajo inspirado en el diseño adjunto.
 * Estilos con TailwindCSS.
 *
 * Props:
 * - title: string
 * - company: string
 * - location: string
 * - tags: string[] (ej.: ["Remote", "Sketch"]) 
 * - salary: string (ej.: "8.8 – 13.7k PLN")
 * - postedAgo: string (ej.: "2 days ago")
 * - logoUrl?: string (si no hay, usa un logo placeholder SVG)
 * - docUrl: string (link de Google Docs o similar)
 */

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-100">
    {children}
  </span>
);

const Dot = () => (
  <span className="mx-2 inline-block h-1 w-1 rounded-full bg-slate-300 align-middle" />
);

const PlaceholderLogo = () => (
  <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M7.05 3 12 6.086 16.95 3 12 0 7.05 3Zm0 9.914L12 16l4.95-3.086L12 9l-4.95 3.914ZM12 24l4.95-3.086L12 18l-4.95 2.914L12 24Zm-9-6.172L7.05 15 3 12.914 0 15.086 3 17.828Zm21 0-3-2.742L16.95 15 21 17.828l3-2.742ZM7.05 9 12 12.086 16.95 9 12 6 7.05 9Z"/>
    </svg>
  </div>
);

export default function CardMof({
  title = "UX Designer",
  company = "Dropbox",
  location = "Warszawa",
  tags = ["Remote", "Sketch"],
  salary = "8.8 – 13.7k PLN",
  postedAgo = "2 days ago",
  logoUrl,
  docUrl = "https://docs.google.com",
}) {
  const handleClick = () => {
    window.open(docUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left"
      aria-label={`${title} at ${company}, ${location}`}
    >
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex min-w-0 items-center gap-4">
          {/* {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${company} logo`}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <PlaceholderLogo />
          )} */}
            <img style={{width: 'auto', height: '70px'}} className=" rounded-xl object-cover" src="https://www.pcc.edu/instructional-support/wp-content/uploads/sites/17/2018/03/Googledocslogo-250x250.png"></img>
            <div className="d-flex align-items-center fs-3">
                {title}
            </div>
        </div>
      </div>
    </button>
  );
}
