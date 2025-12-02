import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  ArrowLeft,
  Brain
} from "lucide-react";

interface AnalysisScreenProps {
  aiName: string;
  userName: string;
  onClose: () => void;
}

interface AnalysisCategory {
  title: string;
  score: number;
  icon: any;
  insights: string[];
  color: string;
}

export function AnalysisScreen({ aiName, userName, onClose }: AnalysisScreenProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Simulate analyzing process
    const progressInterval = setInterval(() => {
      setCurrentProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setIsAnalyzing(false);
            setShowResults(true);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  const analysisCategories: AnalysisCategory[] = [
    {
      title: "Communication Style",
      score: 85,
      icon: MessageCircle,
      insights: [
        "You value open and honest conversations",
        "Prefer expressing feelings through words",
        "Need regular emotional check-ins"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Emotional Intelligence",
      score: 78,
      icon: Heart,
      insights: [
        "You're empathetic and understanding",
        "Can sometimes overthink situations",
        "Value emotional depth in relationships"
      ],
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Relationship Goals",
      score: 92,
      icon: TrendingUp,
      insights: [
        "Looking for long-term commitment",
        "Value personal growth together",
        "Want a partner who shares your ambitions"
      ],
      color: "from-purple-500 to-indigo-500"
    }
  ];

  const problems = [
    {
      issue: "Difficulty expressing needs clearly",
      solution: "Practice using 'I feel' statements to communicate your emotions without blame"
    },
    {
      issue: "Tendency to avoid confrontation",
      solution: "Remember that healthy conflict leads to growth. Schedule time for important discussions"
    },
    {
      issue: "High expectations from partners",
      solution: "Balance idealism with acceptance. Focus on core values that truly matter to you"
    }
  ];

  const recommendations = [
    "Set aside dedicated time for meaningful conversations with your partner",
    "Practice active listening - focus on understanding before responding",
    "Work on expressing appreciation daily, even for small gestures",
    "Be patient with yourself and your partner during difficult moments"
  ];

  if (isAnalyzing) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-pink-100 via-purple-100 to-orange-100 items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <Brain className="w-20 h-20 text-purple-500 animate-pulse" />
              <Sparkles className="w-8 h-8 text-pink-400 absolute -top-2 -right-2 animate-bounce" />
            </div>
            <h2 className="text-2xl mb-2 text-gray-800 text-center">Analyzing Your Profile</h2>
            <p className="text-gray-600 text-center mb-6">
              {aiName} is understanding your relationship patterns...
            </p>
            <Progress value={currentProgress} className="w-full h-3 mb-2" />
            <p className="text-sm text-gray-500">{currentProgress}% Complete</p>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-white">Your Relationship Analysis</h2>
              <p className="text-white/80 text-sm">Personalized insights by {aiName}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Introduction */}
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6">
            <h3 className="text-xl mb-3 text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Hello {userName}!
            </h3>
            <p className="text-gray-700">
              Based on our conversation, I've identified your relationship style and areas where 
              you can grow. Let's explore what makes you unique in relationships.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg text-gray-800">Your Relationship Strengths</h3>
            {analysisCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={index} className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-gradient-to-r ${category.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-gray-800">{category.title}</h4>
                    </div>
                    <span className="text-2xl text-gray-800">{category.score}%</span>
                  </div>
                  <Progress value={category.score} className="h-2 mb-4" />
                  <ul className="space-y-2">
                    {category.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Problems & Solutions */}
          <div className="space-y-4">
            <h3 className="text-lg text-gray-800">Areas for Growth</h3>
            {problems.map((item, index) => (
              <div key={index} className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-800">{item.issue}</p>
                </div>
                <div className="pl-8">
                  <div className="bg-white rounded-xl p-3 border-l-4 border-green-500">
                    <p className="text-sm text-gray-700">
                      <span className="text-green-600">💡 Solution:</span> {item.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <h3 className="text-lg text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Action Steps for You
            </h3>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 text-sm flex-1">{rec}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Final Message */}
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl p-6 text-white">
            <h3 className="text-lg mb-3">Remember</h3>
            <p className="text-white/90">
              Every relationship is a journey of growth. Your awareness of these patterns is the 
              first step to building healthier connections. I'm here to support you every step of the way!
            </p>
            <p className="mt-3 text-sm text-white/80">- {aiName}</p>
          </div>

          {/* Back to Chat Button */}
          <Button 
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-full shadow-lg transition-colors"
          >
            Continue Conversation
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

