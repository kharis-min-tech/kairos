'use client';

import { useState } from 'react';
import { useRegions, useCreateRegion } from '@/hooks/use-branches';
import { Button, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { CONTINENTS, COUNTRIES_BY_CONTINENT } from '@/lib/countries';

export default function RegionsPage() {
  const { data: regions, isLoading } = useRegions();
  const createRegion = useCreateRegion();

  const [showDialog, setShowDialog] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [country, setCountry] = useState('');

  const availableCountries = regionName ? (COUNTRIES_BY_CONTINENT[regionName] ?? []) : [];

  const handleCreate = async () => {
    if (!regionName || !country) return;
    try {
      await createRegion.mutateAsync({ regionName, country });
      setRegionName('');
      setCountry('');
      setShowDialog(false);
    } catch {
      // error surfaced via createRegion.error in JSX
    }
  };

  return (
    <div className="space-y-6">
      {/* Purple gradient header */}
      <div className="-mx-6 -mt-6 rounded-b-2xl bg-gradient-to-br from-purple-900 to-purple-700 px-6 py-7 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Regions</h1>
            <p className="mt-0.5 text-sm text-purple-200">
              Manage geographic regions{regions ? ` — ${regions.length} total` : ''}
            </p>
          </div>
          <Button
            size="sm"
            variant="success"
            className="shrink-0"
            onClick={() => setShowDialog(true)}
          >
            + New Region
          </Button>
        </div>
      </div>

      {/* Create dialog */}
      {showDialog && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Region</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="regionName">Continent *</Label>
                <select
                  id="regionName"
                  value={regionName}
                  onChange={(e) => { setRegionName(e.target.value); setCountry(''); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select continent…</option>
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country *</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!regionName}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Select country…</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {createRegion.error && (
              <p className="text-sm text-rose-600">{(createRegion.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="success"
                disabled={!regionName || !country || createRegion.isPending}
                onClick={handleCreate}
              >
                {createRegion.isPending ? 'Creating...' : 'Create Region'}
              </Button>
              <Button variant="outline" onClick={() => { setShowDialog(false); setRegionName(''); setCountry(''); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regions grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading regions...</p>
        </div>
      ) : !regions || regions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No regions found. Create one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <Card key={region.id} className="transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{region.regionName}</CardTitle>
                  <span className="flex-shrink-0 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    Region
                  </span>
                </div>
                <CardDescription>{region.country}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground font-mono">{region.id}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
