import { TrendingUp, TrendingDown, Minus, ArrowRight, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function AthletesNeedingAttention({ athletes, selectedGradYear }) {
  if (!athletes || athletes.length === 0) {
    return (
      <section className="space-y-4" data-testid="athletes-attention-section">
        <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
          Athletes Needing Attention
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2" style={{fontFamily: 'Manrope'}}>
              No athletes need immediate attention
            </h3>
            <p className="text-sm text-gray-600">
              {selectedGradYear === 'all' 
                ? 'All athletes are looking good! Great work.' 
                : `All ${selectedGradYear} athletes are on track. Keep it up!`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const getMomentumIcon = (trend) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMomentumBadge = (trend, score) => {
    if (trend === 'rising') {
      return (
        <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          <span>+{score}</span>
        </span>
      );
    } else if (trend === 'declining') {
      return (
        <span className="inline-flex items-center space-x-1 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <TrendingDown className="w-3 h-3" />
          <span>{score}</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium">
          <Minus className="w-3 h-3" />
          <span>{score}</span>
        </span>
      );
    }
  };

  const getStageBadge = (stage) => {
    const stages = {
      exploring: { label: 'Exploring', color: 'bg-gray-100 text-gray-700 border-gray-200' },
      actively_recruiting: { label: 'Active', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      narrowing: { label: 'Narrowing', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    const stageInfo = stages[stage] || stages.exploring;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${stageInfo.color}`}>
        {stageInfo.label}
      </span>
    );
  };

  return (
    <section className="space-y-4" data-testid="athletes-attention-section">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
          Athletes Needing Attention
          <span className="ml-3 text-sm font-normal text-gray-500">
            {athletes.length} {athletes.length === 1 ? 'athlete' : 'athletes'}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {athletes.map((athlete) => (
          <div
            key={athlete.id}
            data-testid={`athlete-card-${athlete.id}`}
            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                  {athlete.fullName}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{athlete.gradYear}</span>
                  <span>•</span>
                  <span>{athlete.position}</span>
                </div>
              </div>
              {getMomentumBadge(athlete.momentumTrend, athlete.momentumScore)}
            </div>

            {/* Issue */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-1">{athlete.primaryIssue}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{getStageBadge(athlete.recruitingStage)}</span>
                <span>•</span>
                <span>{athlete.schoolTargets} schools</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full font-medium text-xs"
                data-testid={`athlete-view-pod-${athlete.id}`}
              >
                View Support Pod
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="p-2"
                data-testid={`athlete-log-note-${athlete.id}`}
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="p-2"
                data-testid={`athlete-message-${athlete.id}`}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AthletesNeedingAttention;
