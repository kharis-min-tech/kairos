'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api-client';
import { Card, Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@kairos/ui';
import { Loader2, Phone, Mail, User, Calendar } from 'lucide-react';

type RAGStatus = 'RED' | 'AMBER' | 'GREEN';

interface Soul {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  assignedMemberName: string | null;
  outreachName: string | null;
  lastFollowUpDate: string | null;
  daysSinceLastFollowUp: number | null;
  ragStatus: RAGStatus;
  ragReason: string;
  createdAt: string;
}

export function SoulsPipelineView() {
  const api = useApi();
  const [selectedRAG, setSelectedRAG] = useState<RAGStatus | null>(null);
  const [souls, setSouls] = useState<Soul[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);

  useEffect(() => {
    if (selectedRAG) {
      loadSouls(selectedRAG);
    }
  }, [selectedRAG]);

  const loadSouls = async (ragStatus: RAGStatus) => {
    try {
      setLoading(true);
      const res = await api.dashboard.souls({ ragStatus, limit: 100 });
      if (res.success && res.data) {
        setSouls(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load souls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRAGBadge = (status: RAGStatus) => {
    const config = {
      RED: { label: 'RED Critical', className: 'bg-rose-500/20 text-rose-300 border-rose-500' },
      AMBER: { label: 'AMBER Monitor', className: 'bg-amber-500/20 text-amber-300 border-amber-500' },
      GREEN: { label: 'GREEN All Good', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500' },
    };
    return config[status];
  };

  return (
    <div className="space-y-4">
      {/* RAG Filter Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => setSelectedRAG('RED')}
          variant={selectedRAG === 'RED' ? 'default' : 'outline'}
          className={`${
            selectedRAG === 'RED'
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'border-rose-500/50 text-rose-300 hover:bg-rose-500/10'
          }`}
        >
          RED Critical
        </Button>
        <Button
          onClick={() => setSelectedRAG('AMBER')}
          variant={selectedRAG === 'AMBER' ? 'default' : 'outline'}
          className={`${
            selectedRAG === 'AMBER'
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          AMBER Monitor
        </Button>
        <Button
          onClick={() => setSelectedRAG('GREEN')}
          variant={selectedRAG === 'GREEN' ? 'default' : 'outline'}
          className={`${
            selectedRAG === 'GREEN'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10'
          }`}
        >
          GREEN All Good
        </Button>
        {selectedRAG && (
          <Button
            onClick={() => {
              setSelectedRAG(null);
              setSouls([]);
            }}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Souls List */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && souls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {souls.map((soul) => (
            <Card
              key={soul.id}
              className="bg-card p-4 hover:shadow-ambient transition-all cursor-pointer"
              onClick={() => setSelectedSoul(soul)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {soul.firstName} {soul.lastName}
                    </h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {soul.status}
                    </Badge>
                  </div>
                  <Badge className={getRAGBadge(soul.ragStatus).className}>
                    {soul.ragStatus}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span>{soul.phone}</span>
                  </div>
                  {soul.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{soul.email}</span>
                    </div>
                  )}
                  {soul.assignedMemberName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{soul.assignedMemberName}</span>
                    </div>
                  )}
                  {soul.daysSinceLastFollowUp !== null && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{soul.daysSinceLastFollowUp} days since last contact</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  {soul.ragReason}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && selectedRAG && souls.length === 0 && (
        <Card className="bg-card p-12 text-center">
          <p className="text-muted-foreground">No souls found with {selectedRAG} status</p>
        </Card>
      )}

      {/* Soul Detail Dialog */}
      <Dialog open={!!selectedSoul} onOpenChange={() => setSelectedSoul(null)}>
        <DialogContent className="bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedSoul?.firstName} {selectedSoul?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedSoul && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getRAGBadge(selectedSoul.ragStatus).className}>
                  {getRAGBadge(selectedSoul.ragStatus).label}
                </Badge>
                <Badge variant="outline">{selectedSoul.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-medium">{selectedSoul.phone}</div>
                </div>
                {selectedSoul.email && (
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedSoul.email}</div>
                  </div>
                )}
                {selectedSoul.assignedMemberName && (
                  <div>
                    <div className="text-muted-foreground">Assigned To</div>
                    <div className="font-medium">{selectedSoul.assignedMemberName}</div>
                  </div>
                )}
                {selectedSoul.outreachName && (
                  <div>
                    <div className="text-muted-foreground">Outreach Program</div>
                    <div className="font-medium">{selectedSoul.outreachName}</div>
                  </div>
                )}
                {selectedSoul.daysSinceLastFollowUp !== null && (
                  <div>
                    <div className="text-muted-foreground">Days Since Last Contact</div>
                    <div className="font-medium">{selectedSoul.daysSinceLastFollowUp} days</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">
                    {new Date(selectedSoul.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">RAG Reason</div>
                <div className="text-foreground">{selectedSoul.ragReason}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
