import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDraftStore } from "@/stores/draft-store";
import { useCallback, useEffect, useState } from "react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export function PlayerFilters() {
  const { filters, setSearch, togglePosition, setHideDrafted, setAustralianOnly } = useDraftStore();
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch), 250);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  const handleHideDraftedChange = useCallback(
    (checked: boolean | "indeterminate") => {
      setHideDrafted(checked === true);
    },
    [setHideDrafted],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <Input
        placeholder="Search players..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="w-full sm:w-64"
      />

      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground mr-1">Position:</span>
        {POSITIONS.map((pos) => {
          const isActive = filters.positions.includes(pos);
          return (
            <Badge
              key={pos}
              variant={isActive ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => togglePosition(pos)}
            >
              {pos}
            </Badge>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="hide-drafted" checked={filters.hideDrafted} onCheckedChange={handleHideDraftedChange} />
        <Label htmlFor="hide-drafted" className="text-sm cursor-pointer">
          Hide drafted
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="australian-only"
          checked={filters.australianOnly}
          onCheckedChange={(checked) => setAustralianOnly(checked === true)}
        />
        <Label htmlFor="australian-only" className="text-sm cursor-pointer">
          🇦🇺 Australians only
        </Label>
      </div>
    </div>
  );
}
