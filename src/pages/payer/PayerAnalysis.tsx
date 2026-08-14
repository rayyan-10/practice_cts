import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TrendingUp,
  Brain,
  AlertTriangle,
  Target,
  Users,
  Sparkles,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

interface AnalysisRequest {
  years: number[];
  acos: string[];
  analysisTypes: string[];
}

interface AnalysisResult {
  type: string;
  title: string;
  content: any;
}

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];

const AVAILABLE_ACOS = [
  { id: 'aco-001', name: 'Pioneer Health Network' },
  { id: 'aco-002', name: 'Community Care Alliance' },
  { id: 'aco-003', name: 'Regional Medical Group' },
  { id: 'aco-004', name: 'Integrated Health Systems' },
  { id: 'aco-005', name: 'Metro Health Partners' },
  { id: 'aco-006', name: 'Valley Care Network' },
];

const ANALYSIS_TYPES = [
  { id: 'future-risks', name: 'Future Risks', icon: AlertTriangle, description: 'Predict potential risk factors' },
  { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'Analyze performance trends' },
  { id: 'twin-acos', name: 'Twin ACOs', icon: Users, description: 'Compare with similar ACOs' },
  { id: 'risks', name: 'Risks', icon: Target, description: 'Identify current risk areas' },
  { id: 'improvement', name: 'Improvement', icon: Sparkles, description: 'Suggest improvement opportunities' },
];

export default function PayerAnalysis() {
  const navigate = useNavigate();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  useEffect(() => {
    getUserContext().then(ctx => setUserContext(ctx));
  }, []);

  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedACOs, setSelectedACOs] = useState<string[]>([]);
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>([]);

  // logout handled by AppShell

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const toggleACO = (acoId: string) => {
    setSelectedACOs((prev) =>
      prev.includes(acoId) ? prev.filter((id) => id !== acoId) : [...prev, acoId]
    );
  };

  const toggleAnalysisType = (typeId: string) => {
    setSelectedAnalysisTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const selectAllYears = () => {
    setSelectedYears(AVAILABLE_YEARS);
  };

  const clearAllYears = () => {
    setSelectedYears([]);
  };

  const selectAllACOs = () => {
    setSelectedACOs(AVAILABLE_ACOS.map((aco) => aco.id));
  };

  const clearAllACOs = () => {
    setSelectedACOs([]);
  };

  const selectAllAnalysisTypes = () => {
    setSelectedAnalysisTypes(ANALYSIS_TYPES.map((type) => type.id));
  };

  const clearAllAnalysisTypes = () => {
    setSelectedAnalysisTypes([]);
  };

  const handleViewAnalysis = async () => {
    if (selectedYears.length === 0) {
      alert('Please select at least one year');
      return;
    }
    if (selectedACOs.length === 0) {
      alert('Please select at least one ACO');
      return;
    }
    if (selectedAnalysisTypes.length === 0) {
      alert('Please select at least one analysis type');
      return;
    }

    setLoading(true);

    // requestData will be sent to the backend prediction API when connected
    const _requestData: AnalysisRequest = {
      years: selectedYears,
      acos: selectedACOs,
      analysisTypes: selectedAnalysisTypes,
    };
    void _requestData; // reserved for backend integration

    try {
      // Simulate API call to backend
      // In production, replace this with actual API endpoint
      // const response = await fetch('/api/analysis', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(requestData),
      // });
      // const data = await response.json();

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Mock analysis results
      const results: AnalysisResult[] = [];

      if (selectedAnalysisTypes.includes('future-risks')) {
        results.push({
          type: 'future-risks',
          title: 'Future Risk Prediction',
          content: {
            overallRisk: 'MEDIUM',
            predictions: [
              {
                year: 2026,
                riskLevel: 'MEDIUM',
                factors: ['Aging population', 'Chronic disease prevalence increasing'],
                probability: 68,
              },
              {
                year: 2027,
                riskLevel: 'HIGH',
                factors: ['Healthcare cost inflation', 'Provider shortages'],
                probability: 72,
              },
            ],
          },
        });
      }

      if (selectedAnalysisTypes.includes('performance')) {
        results.push({
          type: 'performance',
          title: 'Performance Analysis',
          content: {
            trend: 'IMPROVING',
            avgQualityScore: 88.4,
            avgSavings: 5200000,
            topPerformer: 'Pioneer Health Network',
            bottomPerformer: 'Regional Medical Group',
            yearOverYearGrowth: 4.2,
          },
        });
      }

      if (selectedAnalysisTypes.includes('twin-acos')) {
        results.push({
          type: 'twin-acos',
          title: 'Twin ACOs Comparison',
          content: {
            matches: [
              {
                aco: 'Pioneer Health Network',
                twin: 'Integrated Health Systems',
                similarity: 94,
                metrics: { beneficiaries: 12450, qualityScore: 91.2, savings: 5100000 },
              },
              {
                aco: 'Community Care Alliance',
                twin: 'Metro Health Partners',
                similarity: 88,
                metrics: { beneficiaries: 18230, qualityScore: 87.5, savings: 3800000 },
              },
            ],
          },
        });
      }

      if (selectedAnalysisTypes.includes('risks')) {
        results.push({
          type: 'risks',
          title: 'Current Risk Assessment',
          content: {
            highRisk: 2,
            mediumRisk: 5,
            lowRisk: 17,
            criticalIssues: [
              'Regional Medical Group: Cost overruns +4.5%',
              'Valley Care Network: Quality score declining',
            ],
          },
        });
      }

      if (selectedAnalysisTypes.includes('improvement')) {
        results.push({
          type: 'improvement',
          title: 'Improvement Opportunities',
          content: {
            recommendations: [
              {
                category: 'Cost Reduction',
                impact: 'HIGH',
                description: 'Implement care coordination programs',
                potentialSavings: 8500000,
              },
              {
                category: 'Quality Improvement',
                impact: 'MEDIUM',
                description: 'Enhance preventive care screening',
                potentialSavings: 3200000,
              },
              {
                category: 'Risk Management',
                impact: 'HIGH',
                description: 'Strengthen high-risk patient monitoring',
                potentialSavings: 6700000,
              },
            ],
          },
        });
      }

      setAnalysisResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to generate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setShowResults(false);
    setAnalysisResults([]);
  };

  if (showResults) {
    return (
      <AppShell userContext={userContext} pageTitle="Predictive Analysis">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={resetAnalysis}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/payer/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            {/* Analysis Results */}
            {analysisResults.map((result, index) => (
              <Card key={index} className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {ANALYSIS_TYPES.find((t) => t.id === result.type)?.icon &&
                      (() => {
                        const Icon = ANALYSIS_TYPES.find((t) => t.id === result.type)!.icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    {result.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.type === 'future-risks' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <span className="font-medium">Overall Risk Level</span>
                          <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-medium">
                            {result.content.overallRisk}
                          </span>
                        </div>
                        {result.content.predictions.map((pred: any, i: number) => (
                          <div key={i} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Year {pred.year}</h4>
                              <span className="text-sm text-muted-foreground">
                                {pred.probability}% probability
                              </span>
                            </div>
                            <p className="text-sm">Risk Level: {pred.riskLevel}</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {pred.factors.map((factor: string, j: number) => (
                                <li key={j}>{factor}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.type === 'performance' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground">Trend</p>
                          <p className="text-2xl font-bold text-green-600">{result.content.trend}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                          <p className="text-2xl font-bold">{result.content.avgQualityScore}%</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground">Avg Savings</p>
                          <p className="text-2xl font-bold">
                            ${(result.content.avgSavings / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground">YoY Growth</p>
                          <p className="text-2xl font-bold text-green-600">
                            +{result.content.yearOverYearGrowth}%
                          </p>
                        </div>
                      </div>
                    )}

                    {result.type === 'twin-acos' && (
                      <div className="space-y-4">
                        {result.content.matches.map((match: any, i: number) => (
                          <div key={i} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{match.aco}</p>
                                <p className="text-sm text-muted-foreground">
                                  Twin: {match.twin}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                {match.similarity}% similar
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Beneficiaries</p>
                                <p className="font-medium">{match.metrics.beneficiaries.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Quality Score</p>
                                <p className="font-medium">{match.metrics.qualityScore}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Savings</p>
                                <p className="font-medium">
                                  ${(match.metrics.savings / 1000000).toFixed(1)}M
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.type === 'risks' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">High Risk</p>
                            <p className="text-3xl font-bold text-red-600">{result.content.highRisk}</p>
                          </div>
                          <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">Medium Risk</p>
                            <p className="text-3xl font-bold text-yellow-600">
                              {result.content.mediumRisk}
                            </p>
                          </div>
                          <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">Low Risk</p>
                            <p className="text-3xl font-bold text-green-600">{result.content.lowRisk}</p>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Critical Issues</h4>
                          <ul className="space-y-2">
                            {result.content.criticalIssues.map((issue: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                <span className="text-sm">{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {result.type === 'improvement' && (
                      <div className="space-y-4">
                        {result.content.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{rec.category}</h4>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  rec.impact === 'HIGH'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                }`}
                              >
                                {rec.impact} Impact
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <p className="text-sm font-medium text-green-600">
                              Potential Savings: ${(rec.potentialSavings / 1000000).toFixed(1)}M
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userContext={userContext} pageTitle="Predictive Analysis">
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate('/payer/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Year Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Years</CardTitle>
              <CardDescription>Choose one or more years for analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllYears}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllYears}>
                  Clear All
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  {selectedYears.length} selected
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {AVAILABLE_YEARS.map((year) => (
                  <div
                    key={year}
                    className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedYears.includes(year)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleYear(year)}
                  >
                    <Checkbox
                      checked={selectedYears.includes(year)}
                      onCheckedChange={() => toggleYear(year)}
                    />
                    <Label className="cursor-pointer">{year}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ACO Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select ACOs</CardTitle>
              <CardDescription>Choose one or more ACOs for analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllACOs}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllACOs}>
                  Clear All
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  {selectedACOs.length} selected
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {AVAILABLE_ACOS.map((aco) => (
                  <div
                    key={aco.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedACOs.includes(aco.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleACO(aco.id)}
                  >
                    <Checkbox
                      checked={selectedACOs.includes(aco.id)}
                      onCheckedChange={() => toggleACO(aco.id)}
                    />
                    <Label className="cursor-pointer flex-1">{aco.name}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Required</CardTitle>
              <CardDescription>Select the types of analysis you want to perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnalysisTypes}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllAnalysisTypes}>
                  Clear All
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  {selectedAnalysisTypes.length} selected
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {ANALYSIS_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAnalysisTypes.includes(type.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleAnalysisType(type.id)}
                    >
                      <Checkbox
                        checked={selectedAnalysisTypes.includes(type.id)}
                        onCheckedChange={() => toggleAnalysisType(type.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" />
                          <Label className="cursor-pointer font-medium">{type.name}</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* View Analysis Button */}
          <Card className="border-primary bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <Button
                onClick={handleViewAnalysis}
                disabled={loading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Analysis...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" />
                    View Analysis
                  </>
                )}
              </Button>
              {!loading && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {selectedYears.length > 0 &&
                    selectedACOs.length > 0 &&
                    selectedAnalysisTypes.length > 0
                    ? `Ready to analyze ${selectedYears.length} year(s), ${selectedACOs.length} ACO(s) with ${selectedAnalysisTypes.length} analysis type(s)`
                    : 'Please select years, ACOs, and analysis types'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
