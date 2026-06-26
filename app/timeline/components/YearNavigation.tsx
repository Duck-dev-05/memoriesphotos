import Link from "next/link";

interface YearNavigationProps {
  yearKeys: string[];
  selectedYear?: string;
}

export function YearNavigation({ yearKeys, selectedYear }: YearNavigationProps) {
  return (
    <nav className="tl-year-nav">
      <Link 
        href="/timeline" 
        className={`tl-year-pill ${!selectedYear ? 'active' : ''}`}
      >
        Tất cả
      </Link>
      {yearKeys.map((y) => (
        <Link 
          key={y} 
          href={`/timeline?year=${y}`} 
          className={`tl-year-pill ${selectedYear === y ? 'active' : ''}`}
        >
          {y}
        </Link>
      ))}
    </nav>
  );
}
