import { useState, useEffect } from 'react';
import { getUserContext } from '@/lib/auth';
import type { UserContext } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import { api, type ACOFeatures, type CombinedAssessmentResponse, type Model3Response, type Model5Response } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Users,
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';

type ModelType = 'combined' | 'model1' | 'model2' | 'model3' | 'model5';

export default function PayerPrediction() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Metadata from backend
  const [revExpCategories, setRevExpCategories] = useState<string[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [providerTypes, setProviderTypes] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Form state
  const [selectedModel, setSelectedModel] = useState<ModelType>('combined');
  const [acoFeatures, setAcoFeatures] = useState<Partial<ACOFeatures>>({
    N_AB: 14500,
    Previous_Savings_Rate: 0.045,
    Previous_Quality_Score: 88.5,
    Previous_Performance_Gap: -2.1,
    Expenditure_Growth: 3.2,
    Benchmark_Growth: 2.8,
    Quality_Change: 1.5,
    Beneficiary_Growth: 2.0,
    N_Hosp: 3,
    N_PCP: 180,
    N_Spec: 250,
    Rev_Exp_Cat: 'Low Revenue',
    Track: 'ENHANCED',
  });

  const [model3Input, setModel3Input] = useState({ aco_id: 'A1001', year: 2024 });
  const [model5Input, setModel5Input] = useState({
    Rndrng_NPI: '1003006115',
    Rndrng_Prvdr_Ent_Cd: 'I',
    Rndrng_Prvdr_State_Abrvtn: 'CA',
    Rndrng_Prvdr_Type: 'Internal Medicine',
    Rndrng_Prvdr_Mdcr_Prtcptg_Ind: 'Y',
    Tot_Benes: 500,
    Tot_Srvcs: 2000,
    Tot_Sbmtd_Chrg: 250000,
    Tot_Mdcr_Pymt_Amt: 68000,
    Tot_Mdcr_Stdzd_Amt: 67500,
    Bene_Avg_Risk_Scre: 1.85,
  });

  // Results
  const [combinedResult, setCombinedResult] = useState<CombinedAssessmentResponse | null>(null);
  const [model3Result, setModel3Result] = useState<Model3Response | null>(null);
  const [model5Result, setModel5Result] = useState<Model5Response | null>(null);

  useEffect(() => {
    getUserContext().then(ctx => setUserContext(ctx));
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [revExp, tracksData, providers, years] = await Promise.all([
        api.getRevExpCategories(),
        api.getTracks(),
        api.getProviderTypes(),
        api.getModel3AvailableYears(),
      ]);
      setRevExpCategories(revExp.values);
      setTracks(tracksData.values);
      setProviderTypes(providers.values);
      setAvailableYears(years.years);
    } catch (err) {
      console.error('Failed to load metadata:', err);
      // Set fallback values if backend is not available
      setRevExpCategories(['Low Revenue', 'High Revenue', 'Medium Revenue']);
      setTracks(['BASIC', 'ENHANCED', 'One-Sided', 'Two-Sided']);
      setProviderTypes(['Internal Medicine', 'Family Practice', 'Cardiology', 'Other']);
      setAvailableYears([2024, 2023, 2022, 2021, 2020]);
    }
  };

  const handleRunPrediction = async () => {
    setError(null);
    setLoading(true);
    setCombinedResult(null);
    setModel3Result(null);
    setModel5Result(null);

    try {
      if (selectedModel === 'combined' || selectedModel === 'model1' || selectedModel === 'model2') {
        if (!validateACOFeatures()) {
          setError('Please fill all ACO feature fields');
          setLoading(false);
          return;
        }
        const result = await api.acoAssess(acoFeatures as ACOFeatures);
        setCombinedResult(result);
      }

      if (selectedModel === 'model3') {
        if (!model3Input.aco_id) {
          setError('Please enter ACO ID');
          setLoading(false);
          return;
        }
        const result = await api.model3TwinsGet(model3Input.aco_id, model3Input.year);
        setModel3Result(result);
      }

      if (selectedModel === 'model5') {
        if (!model5Input.Rndrng_NPI) {
          setError('Please enter Provider NPI');
          setLoading(false);
          return;
        }
        const result = await api.model5ProviderRisk(model5Input);
        setModel5Result(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get prediction from backend');
    } finally {
      setLoading(false);
    }
  };

  const validateACOFeatures = () => {
    const required = ['N_AB', 'Previous_Savings_Rate', 'Previous_Quality_Score', 'Previous_Performance_Gap',
      'Expenditure_Growth', 'Benchmark_Growth', 'Quality_Change', 'Beneficiary_Growth',
      'N_Hosp', 'N_PCP', 'N_Spec', 'Rev_Exp_Cat', 'Track'];
    return required.every(key => acoFeatures[key as keyof ACOFeatures] !== undefined);
  };

  const renderResults = () => {
    if (!combinedResult && !model3Result && !model5Result) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Combined Assessment Results */}
        {combinedResult && (
          <>
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Prediction</p>
                      <p className="text-3xl font-bold">
                        {combinedResult.risk_classification.prediction}
                      </p>
                    </div>
                    <div className="text-right">
                      {combinedResult.risk_classification.prediction === 'At_Risk' ? (
                        <XCircle className="h-16 w-16 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">At Risk Probability</p>
                      <p className="text-2xl font-bold text-red-600">
                        {combinedResult.risk_classification.probability_at_risk}%
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Savings Probability</p>
                      <p className="text-2xl font-bold text-green-600">
                        {combinedResult.risk_classification.probability_savings}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Gap Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg ${
                    combinedResult.performance_gap.direction === 'Savings'
                      ? 'bg-green-50 dark:bg-green-950/30'
                      : 'bg-red-50 dark:bg-red-950/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Predicted Gap</p>
                        <p className="text-4xl font-bold flex items-center gap-2">
                          {combinedResult.performance_gap.predicted_performance_gap_pct > 0 ? '+' : ''}
                          {combinedResult.performance_gap.predicted_performance_gap_pct}%
                          {combinedResult.performance_gap.direction === 'Savings' ? (
                            <TrendingDown className="h-8 w-8 text-green-600" />
                          ) : (
                            <TrendingUp className="h-8 w-8 text-red-600" />
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {combinedResult.performance_gap.direction}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{combinedResult.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Model 3 Results */}
        {model3Result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Twin ACO Benchmarking
              </CardTitle>
              <CardDescription>
                Performance comparison with structurally similar ACOs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Selected ACO:</span>
                    <span className="text-lg font-bold">{model3Result.selected_aco}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Performance Year:</span>
                    <span className="text-lg font-bold">{model3Result.performance_year}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Twin ACOs</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {model3Result.twins.map((twin, idx) => (
                      <div
                        key={idx}
                        className={`p-3 border-2 rounded-lg text-center ${
                          twin === model3Result.best_twin
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-gray-200'
                        }`}
                      >
                        <p className="font-bold">{twin}</p>
                        {twin === model3Result.best_twin && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            ⭐ Best Twin
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Performance Metrics</h4>
                  <div className="space-y-3">
                    {model3Result.metrics.map((metric, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{metric.metric}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              metric.verdict === 'Better'
                                ? 'bg-green-100 text-green-700'
                                : metric.verdict === 'Worse'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {metric.verdict}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Your ACO</p>
                            <p className="font-bold">{metric.selected_value.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Peer Average</p>
                            <p className="font-bold">{metric.peer_average.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model 5 Results */}
        {model5Result && (
          <Card className={`border-2 ${
            model5Result.risk_status === 'High Risk' ? 'border-red-500' : 'border-green-500'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Provider Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-6 rounded-lg ${
                  model5Result.risk_status === 'High Risk'
                    ? 'bg-red-50 dark:bg-red-950/30'
                    : 'bg-green-50 dark:bg-green-950/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Provider NPI</p>
                      <p className="text-2xl font-bold">{model5Result.npi}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-6xl">{model5Result.emoji}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Risk Status</p>
                    <p className={`text-2xl font-bold ${
                      model5Result.risk_status === 'High Risk' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {model5Result.risk_status}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Risk Probability</p>
                    <p className="text-2xl font-bold">{model5Result.risk_probability_pct}%</p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">{model5Result.message}</p>
                  <p className="text-xs text-muted-foreground">{model5Result.disclaimer}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <AppShell userContext={userContext} pageTitle="AI Predictions">
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Analysis Type</CardTitle>
              <CardDescription>Choose the prediction model to run</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Button
                  variant={selectedModel === 'combined' ? 'default' : 'outline'}
                  onClick={() => setSelectedModel('combined')}
                  className="h-auto py-4 flex-col"
                >
                  <Target className="h-6 w-6 mb-2" />
                  <span className="text-xs">Combined Assessment</span>
                </Button>
                <Button
                  variant={selectedModel === 'model1' ? 'default' : 'outline'}
                  onClick={() => setSelectedModel('model1')}
                  className="h-auto py-4 flex-col"
                >
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  <span className="text-xs">Model 1: Risk</span>
                </Button>
                <Button
                  variant={selectedModel === 'model2' ? 'default' : 'outline'}
                  onClick={() => setSelectedModel('model2')}
                  className="h-auto py-4 flex-col"
                >
                  <Activity className="h-6 w-6 mb-2" />
                  <span className="text-xs">Model 2: Gap</span>
                </Button>
                <Button
                  variant={selectedModel === 'model3' ? 'default' : 'outline'}
                  onClick={() => setSelectedModel('model3')}
                  className="h-auto py-4 flex-col"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-xs">Model 3: Twins</span>
                </Button>
                <Button
                  variant={selectedModel === 'model5' ? 'default' : 'outline'}
                  onClick={() => setSelectedModel('model5')}
                  className="h-auto py-4 flex-col"
                >
                  <Building2 className="h-6 w-6 mb-2" />
                  <span className="text-xs">Model 5: Provider</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input Forms */}
          {(selectedModel === 'combined' || selectedModel === 'model1' || selectedModel === 'model2') && (
            <Card>
              <CardHeader>
                <CardTitle>ACO Features Input</CardTitle>
                <CardDescription>Enter the 13 required ACO-level features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assigned Beneficiaries</Label>
                    <Input
                      type="number"
                      value={acoFeatures.N_AB || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, N_AB: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Savings Rate</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={acoFeatures.Previous_Savings_Rate || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Previous_Savings_Rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Quality Score</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Previous_Quality_Score || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Previous_Quality_Score: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Performance Gap %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Previous_Performance_Gap || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Previous_Performance_Gap: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expenditure Growth %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Expenditure_Growth || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Expenditure_Growth: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Benchmark Growth %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Benchmark_Growth || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Benchmark_Growth: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quality Change</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Quality_Change || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Quality_Change: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beneficiary Growth %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={acoFeatures.Beneficiary_Growth || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Beneficiary_Growth: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Hospitals</Label>
                    <Input
                      type="number"
                      value={acoFeatures.N_Hosp || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, N_Hosp: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of PCPs</Label>
                    <Input
                      type="number"
                      value={acoFeatures.N_PCP || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, N_PCP: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Specialists</Label>
                    <Input
                      type="number"
                      value={acoFeatures.N_Spec || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, N_Spec: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue/Expenditure Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={acoFeatures.Rev_Exp_Cat || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Rev_Exp_Cat: e.target.value as any })}
                    >
                      {revExpCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Track</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={acoFeatures.Track || ''}
                      onChange={(e) => setAcoFeatures({ ...acoFeatures, Track: e.target.value as any })}
                    >
                      {tracks.map((track) => (
                        <option key={track} value={track}>{track}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedModel === 'model3' && (
            <Card>
              <CardHeader>
                <CardTitle>Twin ACO Lookup</CardTitle>
                <CardDescription>Enter ACO ID to find structural twins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ACO ID</Label>
                    <Input
                      value={model3Input.aco_id}
                      onChange={(e) => setModel3Input({ ...model3Input, aco_id: e.target.value })}
                      placeholder="e.g. A1001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year (Optional)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={model3Input.year || ''}
                      onChange={(e) => setModel3Input({ ...model3Input, year: Number(e.target.value) })}
                    >
                      <option value="">Latest</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedModel === 'model5' && (
            <Card>
              <CardHeader>
                <CardTitle>Provider Risk Assessment</CardTitle>
                <CardDescription>Enter provider details for risk scoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider NPI *</Label>
                    <Input
                      value={model5Input.Rndrng_NPI}
                      onChange={(e) => setModel5Input({ ...model5Input, Rndrng_NPI: e.target.value })}
                      placeholder="10-digit NPI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={model5Input.Rndrng_Prvdr_Type || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Rndrng_Prvdr_Type: e.target.value })}
                    >
                      {providerTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={model5Input.Rndrng_Prvdr_State_Abrvtn || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Rndrng_Prvdr_State_Abrvtn: e.target.value })}
                      placeholder="e.g. CA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Beneficiaries</Label>
                    <Input
                      type="number"
                      value={model5Input.Tot_Benes || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Tot_Benes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Services</Label>
                    <Input
                      type="number"
                      value={model5Input.Tot_Srvcs || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Tot_Srvcs: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Submitted Charges ($)</Label>
                    <Input
                      type="number"
                      value={model5Input.Tot_Sbmtd_Chrg || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Tot_Sbmtd_Chrg: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Medicare Payment ($)</Label>
                    <Input
                      type="number"
                      value={model5Input.Tot_Mdcr_Pymt_Amt || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Tot_Mdcr_Pymt_Amt: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Standardized Amount ($)</Label>
                    <Input
                      type="number"
                      value={model5Input.Tot_Mdcr_Stdzd_Amt || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Tot_Mdcr_Stdzd_Amt: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Risk Score</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={model5Input.Bene_Avg_Risk_Scre || ''}
                      onChange={(e) => setModel5Input({ ...model5Input, Bene_Avg_Risk_Scre: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Run Button */}
          <Card className="border-primary bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <Button
                onClick={handleRunPrediction}
                disabled={loading}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Running Prediction...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" />
                    Run Prediction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {renderResults()}
        </div>
      </div>
    </AppShell>
  );
}
