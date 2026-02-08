import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Tv, Radio, Eye, ArrowLeft, Monitor, Signal, ExternalLink } from 'lucide-react';

interface StreamTeam {
  name: string;
  badge: string;
}

interface StreamSource {
  source: string;
  id: string;
}

interface StreamMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  popular: boolean;
  teams: {
    home: StreamTeam;
    away: StreamTeam;
  };
  sources: StreamSource[];
}

interface StreamInfo {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers: number;
}

type ViewMode = 'list' | 'watching';

export default function StreamingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMatch, setSelectedMatch] = useState<StreamMatch | null>(null);
  const [selectedStream, setSelectedStream] = useState<StreamInfo | null>(null);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);

  const { data: liveMatches = [], isLoading: loadingLive } = useQuery<StreamMatch[]>({
    queryKey: ['/api/streaming/football'],
    refetchInterval: 60000,
  });

  const currentSource = selectedMatch?.sources?.[activeSourceIdx];

  const { data: streams = [], isLoading: loadingStreams } = useQuery<StreamInfo[]>({
    queryKey: ['/api/streaming/stream', currentSource?.source, currentSource?.id],
    queryFn: async () => {
      if (!currentSource) return [];
      const res = await fetch(`/api/streaming/stream/${currentSource.source}/${currentSource.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentSource && viewMode === 'watching',
    refetchInterval: 120000,
  });

  useEffect(() => {
    if (streams.length > 0 && !selectedStream) {
      setSelectedStream(streams[0]);
    }
  }, [streams, selectedStream]);

  const handleWatchMatch = (match: StreamMatch) => {
    setSelectedMatch(match);
    setSelectedStream(null);
    setActiveSourceIdx(0);
    setViewMode('watching');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedMatch(null);
    setSelectedStream(null);
    setActiveSourceIdx(0);
  };

  const isLive = (date: number) => {
    const now = Date.now();
    const diff = now - date;
    return diff >= 0 && diff < 3 * 60 * 60 * 1000;
  };

  const getMatchTime = (date: number) => {
    const now = Date.now();
    const diff = now - date;
    if (diff < 0) {
      return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const mins = Math.floor(diff / 60000);
    if (mins > 90) return 'FT';
    if (mins > 45 && mins < 50) return 'HT';
    return `${mins}'`;
  };

  const liveNow = liveMatches.filter(m => isLive(m.date));
  const upcoming = liveMatches.filter(m => !isLive(m.date));

  if (viewMode === 'watching' && selectedMatch) {
    return (
      <Layout title="Streaming" showBackButton={false}>
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-cyan-400 hover:text-cyan-300"
              data-testid="button-back-to-streams"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h2 className="text-lg font-bold text-white">{selectedMatch.title}</h2>
            {isLive(selectedMatch.date) && (
              <Badge className="bg-red-600 text-white text-xs">
                <Signal className="h-3 w-3 mr-1" />
                LIVE {getMatchTime(selectedMatch.date)}
              </Badge>
            )}
          </div>

          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            {loadingStreams ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <span className="ml-3 text-gray-400">Loading stream...</span>
              </div>
            ) : selectedStream ? (
              <iframe
                src={`/api/streaming/embed?url=${encodeURIComponent(selectedStream.embedUrl)}`}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="no-referrer"
                data-testid="stream-iframe"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <Tv className="h-12 w-12 mb-3" />
                <p>No stream available for this match</p>
              </div>
            )}
          </div>

          {streams.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Available Streams</h3>
              <div className="flex flex-wrap gap-2">
                {streams.map((stream) => (
                  <Button
                    key={`${stream.source}-${stream.streamNo}`}
                    variant={selectedStream?.streamNo === stream.streamNo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStream(stream)}
                    className={selectedStream?.streamNo === stream.streamNo 
                      ? "bg-cyan-600 text-white" 
                      : "border-gray-600 text-gray-300"}
                    data-testid={`button-stream-${stream.streamNo}`}
                  >
                    <Monitor className="h-3 w-3 mr-1" />
                    Stream {stream.streamNo}
                    {stream.hd && <span className="ml-1 text-xs text-green-400">HD</span>}
                    <span className="ml-2 text-xs opacity-70 flex items-center">
                      <Eye className="h-3 w-3 mr-0.5" />
                      {stream.viewers}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedMatch.sources.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Stream Sources</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMatch.sources.map((src, idx) => (
                  <Button
                    key={idx}
                    variant={activeSourceIdx === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setActiveSourceIdx(idx);
                      setSelectedStream(null);
                    }}
                    className={activeSourceIdx === idx
                      ? "bg-cyan-600 text-white"
                      : "border-gray-600 text-gray-300"}
                    data-testid={`button-source-${idx}`}
                  >
                    {src.source}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Streaming">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Tv className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Live Streams</h1>
          <Badge className="bg-red-600 text-white">
            <Radio className="h-3 w-3 mr-1" />
            {liveNow.length} Live
          </Badge>
        </div>

        {loadingLive ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="ml-3 text-gray-400">Loading matches...</span>
          </div>
        ) : liveMatches.length === 0 ? (
          <Card className="p-8 text-center bg-[#0b1618]/80 border-[#1e3a3f]">
            <Tv className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">No football streams available right now</p>
            <p className="text-gray-500 text-sm mt-2">Check back during match times for live streams</p>
          </Card>
        ) : (
          <>
            {liveNow.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Live Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {liveNow.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      isLive={true}
                      matchTime={getMatchTime(match.date)}
                      onWatch={() => handleWatchMatch(match)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-300">
                  Today's Matches ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcoming.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      isLive={false}
                      matchTime={getMatchTime(match.date)}
                      onWatch={() => handleWatchMatch(match)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function MatchCard({ match, isLive, matchTime, onWatch }: { 
  match: StreamMatch; 
  isLive: boolean;
  matchTime: string;
  onWatch: () => void;
}) {
  return (
    <Card 
      className="bg-[#0b1618]/90 border-[#1e3a3f] hover:border-cyan-500/40 transition-all cursor-pointer overflow-visible"
      onClick={onWatch}
      data-testid={`card-match-${match.id}`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-600 text-white text-xs px-1.5 py-0.5">
                <Signal className="h-2.5 w-2.5 mr-0.5" />
                {matchTime}
              </Badge>
            )}
            {match.popular && (
              <Badge className="bg-yellow-600/80 text-white text-xs px-1.5 py-0.5">
                Popular
              </Badge>
            )}
          </div>
          {!isLive && (
            <span className="text-xs text-gray-500">{matchTime}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-white truncate">{match.teams.home.name}</p>
          </div>
          <span className="text-xs text-gray-500 px-2 font-bold">VS</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white truncate">{match.teams.away.name}</p>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500"
          data-testid={`button-watch-${match.id}`}
        >
          <Play className="h-3 w-3 mr-1 fill-white" />
          Watch Stream
          {match.sources.length > 1 && (
            <span className="ml-1 text-xs opacity-80">({match.sources.length} sources)</span>
          )}
        </Button>
      </div>
    </Card>
  );
}