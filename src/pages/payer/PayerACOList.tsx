import { useState } from 'react';
import { Building2, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RiskBadge from '@/components/common/RiskBadge';
import { formatLargeCurrency, formatPercentage } from '@/lib/calculations/financial';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// Mock ACO data
const mockACOs = [
  {
    id: '1',
    name: 'Pioneer Health Network',
    identifier: 'ACO-2024-001',
    beneficiaries: 12450,
    benchmark: 124500000,
    actualExpenditure: 114300000,
    variance: -8.2,
    qualityScore: 91.2,
    projectedSavings: 5100000,
    riskLevel: 'LOW' as const,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Community Care Alliance',
    identifier: 'ACO-2024-007',
    beneficiaries: 18230,
    benchmark: 186200000,
    actualExpenditure: 178600000,
    variance: -4.1,
    qualityScore: 87.5,
    projectedSavings: 3800000,
    riskLevel: 'LOW' as const,
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Regional Medical Group',
    identifier: 'ACO-2024-015',
    beneficiaries: 9840,
    benchmark: 98400000,
    actualExpenditure: 102800000,
    variance: 4.5,
    qualityScore: 82.1,
    projectedSavings: -2200000,
    riskLevel: 'HIGH' as const,
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Integrated Health Partners',
    identifier: 'ACO-2024-012',
    beneficiaries: 15680,
    benchmark: 156800000,
    actualExpenditure: 149900000,
    variance: -4.4,
    qualityScore: 89.3,
    projectedSavings: 3450000,
    riskLevel: 'LOW' as const,
    status: 'ACTIVE',
  },
  {
    id: '5',
    name: 'Metropolitan Healthcare Network',
    identifier: 'ACO-2024-003',
    beneficiaries: 22100,
    benchmark: 221000000,
    actualExpenditure: 231500000,
    variance: 4.7,
    qualityScore: 79.8,
    projectedSavings: -5250000,
    riskLevel: 'CRITICAL' as const,
    status: 'ACTIVE',
  },
  {
    id: '6',
    name: 'Coastal Physicians Collaborative',
    identifier: 'ACO-2024-009',
    beneficiaries: 8920,
    benchmark: 89200000,
    actualExpenditure: 84100000,
    variance: -5.7,
    qualityScore: 93.1,
    projectedSavings: 2550000,
    riskLevel: 'LOW' as const,
    status: 'ACTIVE',
  },
];

export default function PayerACOList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filteredACOs = mockACOs.filter((aco) => {
    const matchesSearch =
      aco.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aco.identifier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'ALL' || aco.riskLevel === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ACO Portfolio</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all ACO contracts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter ACOs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or identifier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                  <option value="CRITICAL">Critical Risk</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ACO List */}
          <div className="space-y-4">
            {filteredACOs.map((aco) => (
              <Card
                key={aco.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => console.log('Navigate to ACO detail:', aco.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">{aco.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {aco.identifier} • {aco.beneficiaries.toLocaleString()} beneficiaries
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Benchmark</p>
                              <p className="font-semibold">{formatLargeCurrency(aco.benchmark)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Actual Expenditure</p>
                              <p className="font-semibold">{formatLargeCurrency(aco.actualExpenditure)}</p>
                              <p className={`text-xs ${aco.variance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {aco.variance > 0 ? '+' : ''}{formatPercentage(aco.variance)} variance
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                              <p className="font-semibold">{formatPercentage(aco.qualityScore)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Projected Impact</p>
                              <p className={`font-semibold ${aco.projectedSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatLargeCurrency(Math.abs(aco.projectedSavings))}
                                {aco.projectedSavings >= 0 ? ' savings' : ' loss'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <RiskBadge level={aco.riskLevel} />
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredACOs.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No ACOs found matching your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
