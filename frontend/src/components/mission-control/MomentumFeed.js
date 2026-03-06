import { CheckCircle2, AlertCircle, Mail, Calendar, ArrowRight } from "lucide-react";

function MomentumFeed({ signals }) {
  if (!signals || signals.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm" data-testid="momentum-feed-section">
        <h2 className="text-xl font-bold tracking-tight mb-4" style={{fontFamily: 'Manrope'}}>
          What Changed Today
        </h2>
        <p className="text-gray-500 text-sm text-center py-8">
          No new momentum signals yet today. Check back later.
        </p>
      </section>
    );
  }

  const getIcon = (iconName, sentiment) => {
    const colorClass = sentiment === 'positive' ? 'text-emerald-600' : 
                      sentiment === 'negative' ? 'text-red-600' : 'text-gray-600';
    
    switch (iconName) {
      case 'mail':
        return <Mail className={`w-4 h-4 ${colorClass}`} />;
      case 'calendar':
        return <Calendar className={`w-4 h-4 ${colorClass}`} />;
      case 'alert':
        return <AlertCircle className={`w-4 h-4 ${colorClass}`} />;
      case 'arrow-right':
        return <ArrowRight className={`w-4 h-4 ${colorClass}`} />;
      default:
        return <CheckCircle2 className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  const getTimeLabel = (hoursAgo) => {
    if (hoursAgo < 1) return 'Just now';
    if (hoursAgo < 2) return '1 hour ago';
    if (hoursAgo < 12) return `${Math.floor(hoursAgo)} hours ago`;
    if (hoursAgo < 24) return 'Earlier today';
    return 'Yesterday';
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm" data-testid="momentum-feed-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
          What Changed Today
        </h2>
        <button className="text-sm text-primary hover:underline font-medium" data-testid="view-all-activity">
          View all activity
        </button>
      </div>

      <div className="space-y-4">
        {signals.map((signal) => (
          <div
            key={signal.id}
            data-testid={`momentum-signal-${signal.id}`}
            className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${signal.sentiment === 'positive' ? 'bg-emerald-50' : 
                signal.sentiment === 'negative' ? 'bg-red-50' : 'bg-gray-50'}
            `}>
              {getIcon(signal.icon, signal.sentiment)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="font-semibold text-gray-900 text-sm">{signal.athleteName}</span>
                <span className="text-xs text-gray-500">{getTimeLabel(signal.hoursAgo)}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{signal.description}</p>
              {signal.school && (
                <span className="inline-block mt-1 text-xs text-gray-500">
                  {signal.school}
                </span>
              )}
            </div>

            <button 
              className="flex-shrink-0 text-primary hover:opacity-80 transition-opacity"
              data-testid={`signal-action-${signal.id}`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MomentumFeed;
