'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api-client';
import { Card, Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@kairos/ui';
import { Loader2, User, Calendar } from 'lucide-react';

type RAGStatus = 'RED' | 'AMBER' | 'GREEN';

interface FollowUp {
  id: string;
  soulId: string;
  soulName: string;
  contactStatus: string;
  followUpDate: string;
  memberName: string | null;
  ragStatus: RAGStatus;
  ragReason: string;
}

export function FollowUpRAGView() {
  const api = useApi();
  const [selectedRAG, setSelectedRAG] = useState<RAGStatus | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

  useEffect(() => {
    if (selectedRAG) {
      loadFollowUps(selectedRAG);
    }
  }, [selectedRAG]);

  const loadFollowUps = async (ragStatus: RAGStatus) => {
    try {
      setLoading(true);
      const res = await api.dashboard.followUps({ ragStatus, limit: 100 });
      if (res.success && res.data) {
        setFollowUps(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRAGBadge = (status: RAGStatus) => {
    const config = {
      RED: { label: 'RED Critical', className: 'bg-rose-500/20 text-rose-300 border-rose-500' },
      AMBER: { label: 'AMBER Monitor', className: 'bg-amber-500/20 text-amber-300 border-amber-500' },
      GREEN: { label: 'GREEN Successful', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500' },
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
          GREEN Successful
        </Button>
        {selectedRAG && (
          <Button
            onClick={() => {
              setSelectedRAG(null);
              setFollowUps([]);
            }}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Follow-ups List */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {!loading && followUps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {followUps.map((followUp) => (
            <Card
              key={followUp.id}
              className="bg-slate-900/50 border-slate-700 p-4 hover:border-emerald-500/50 transition-all cursor-pointer"
              onClick={() => setSelectedFollowUp(followUp)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{followUp.soulName}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {followUp.contactStatus}
                    </Badge>
                  </div>
                  <Badge className={getRAGBadge(followUp.ragStatus).className}>
                    {followUp.ragStatus}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-slate-400">
                  {followUp.memberName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{followUp.memberName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(followUp.followUpDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
                  {followUp.ragReason}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && selectedRAG && followUps.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700 p-12 text-center">
          <p className="text-slate-400">No follow-ups found with {selectedRAG} status</p>
        </Card>
      )}

      {/* Follow-up Detail Dialog */}
      <Dialog open={!!selectedFollowUp} onOpenChange={() => setSelectedFollowUp(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Follow-up Details</DialogTitle>
          </DialogHeader>
          {selectedFollowUp && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getRAGBadge(selectedFollowUp.ragStatus).className}>
                  {getRAGBadge(selectedFollowUp.ragStatus).label}
                </Badge>
                <Badge variant="outline">{selectedFollowUp.contactStatus}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Soul Name</div>
                  <div className="font-medium">{selectedFollowUp.soulName}</div>
                </div>
                {selectedFollowUp.memberName && (
                  <div>
                    <div className="text-slate-400">Follow-up By</div>
                    <div className="font-medium">{selectedFollowUp.memberName}</div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400">Follow-up Date</div>
                  <div className="font-medium">
                    {new Date(selectedFollowUp.followUpDate).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Contact Status</div>
                  <div className="font-medium">{selectedFollowUp.contactStatus}</div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Status Reason</div>
                <div className="text-white">{selectedFollowUp.ragReason}</div>
              </div>

              <Button
                onClick={() => {
                  // Navigate to soul detail
                  window.location.href = `/souls/${selectedFollowUp.soulId}`;
                }}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                View Soul Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
