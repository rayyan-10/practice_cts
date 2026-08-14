/**
 * ContractIQ API Client
 * Connects to FastAPI backend at http://localhost:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://staring-script-surpass.ngrok-free.dev';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ACOFeatures {
  N_AB: number;
  Previous_Savings_Rate: number;
  Previous_Quality_Score: number;
  Previous_Performance_Gap: number;
  Expenditure_Growth: number;
  Benchmark_Growth: number;
  Quality_Change: number;
  Beneficiary_Growth: number;
  N_Hosp: number;
  N_PCP: number;
  N_Spec: number;
  Rev_Exp_Cat: 'High Revenue' | 'Low Revenue';
  Track: 'BASIC' | 'ENHANCED' | 'One-Sided' | 'Two-Sided';
}

export interface Model1Response {
  prediction: 'At_Risk' | 'Savings';
  probability_at_risk: number;
  probability_savings: number;
  threshold: number;
  interpretation: string;
}

export interface Model2Response {
  predicted_performance_gap_pct: number;
  direction: 'Savings' | 'Overspend';
  interpretation: string;
}

export interface CombinedAssessmentResponse {
  risk_classification: {
    prediction: 'At_Risk' | 'Savings';
    probability_at_risk: number;
    probability_savings: number;
  };
  performance_gap: {
    predicted_performance_gap_pct: number;
    direction: 'Savings' | 'Overspend';
  };
  summary: string;
}

export interface TwinACOMetric {
  metric: string;
  selected_value: number;
  peer_average: number;
  verdict: 'Better' | 'Worse' | 'Similar';
}

export interface Model3Response {
  selected_aco: string;
  performance_year: number;
  twins: string[];
  metrics: TwinACOMetric[];
  best_twin: string;
  status?: string;
  error?: string;
}

export interface ProviderRiskRequest {
  Rndrng_NPI: string;
  Rndrng_Prvdr_Ent_Cd?: string;
  Rndrng_Prvdr_State_Abrvtn?: string;
  Rndrng_Prvdr_Type?: string;
  Rndrng_Prvdr_Mdcr_Prtcptg_Ind?: string;
  Rndrng_Prvdr_RUCA?: number;
  Tot_HCPCS_Cds?: number;
  Tot_Benes?: number;
  Tot_Srvcs?: number;
  Tot_Sbmtd_Chrg?: number;
  Tot_Mdcr_Alowd_Amt?: number;
  Tot_Mdcr_Pymt_Amt?: number;
  Tot_Mdcr_Stdzd_Amt?: number;
  Bene_Avg_Age?: number;
  Bene_Avg_Risk_Scre?: number;
  [key: string]: any;
}

export interface Model5Response {
  npi: string;
  risk_probability_pct: number;
  risk_status: 'High Risk' | 'Low Risk';
  emoji: string;
  threshold_used: number;
  message: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class ContractIQAPI {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODEL 1 - ACO Risk Classification
  // ───────────────────────────────────────────────────────────────────────────
  
  async model1Predict(features: ACOFeatures): Promise<Model1Response> {
    return this.request<Model1Response>('/model1/predict', {
      method: 'POST',
      body: JSON.stringify(features),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODEL 2 - Performance Gap Prediction
  // ───────────────────────────────────────────────────────────────────────────
  
  async model2Predict(features: ACOFeatures): Promise<Model2Response> {
    return this.request<Model2Response>('/model2/predict', {
      method: 'POST',
      body: JSON.stringify(features),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMBINED ASSESSMENT (Model 1 + 2)
  // ───────────────────────────────────────────────────────────────────────────
  
  async acoAssess(features: ACOFeatures): Promise<CombinedAssessmentResponse> {
    return this.request<CombinedAssessmentResponse>('/aco/assess', {
      method: 'POST',
      body: JSON.stringify(features),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODEL 3 - Twin ACO Benchmarking
  // ───────────────────────────────────────────────────────────────────────────
  
  async model3TwinsGet(acoId: string, year?: number): Promise<Model3Response> {
    const params = year ? `?year=${year}` : '';
    return this.request<Model3Response>(`/model3/twins/${acoId}${params}`);
  }

  async model3TwinsPost(acoId: string, year?: number): Promise<Model3Response> {
    return this.request<Model3Response>('/model3/twins', {
      method: 'POST',
      body: JSON.stringify({ aco_id: acoId, year }),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODEL 5 - Provider Risk (CMS/Payer only)
  // ───────────────────────────────────────────────────────────────────────────
  
  async model5ProviderRisk(provider: ProviderRiskRequest): Promise<Model5Response> {
    return this.request<Model5Response>('/model5/provider-risk', {
      method: 'POST',
      body: JSON.stringify(provider),
    });
  }

  async model5BatchProviderRisk(providers: ProviderRiskRequest[]): Promise<{ results: Model5Response[]; count: number }> {
    return this.request<{ results: Model5Response[]; count: number }>('/model5/batch-provider-risk', {
      method: 'POST',
      body: JSON.stringify(providers),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // METADATA ENDPOINTS
  // ───────────────────────────────────────────────────────────────────────────
  
  async getRevExpCategories(): Promise<{ values: string[] }> {
    return this.request<{ values: string[] }>('/meta/rev-exp-categories');
  }

  async getTracks(): Promise<{ values: string[] }> {
    return this.request<{ values: string[] }>('/meta/tracks');
  }

  async getProviderTypes(): Promise<{ values: string[] }> {
    return this.request<{ values: string[] }>('/meta/provider-types');
  }

  async getModel3AvailableYears(): Promise<{ years: number[] }> {
    return this.request<{ years: number[] }>('/meta/model3/available-years');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HEALTH CHECK
  // ───────────────────────────────────────────────────────────────────────────
  
  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

// Export singleton instance
export const api = new ContractIQAPI(API_BASE_URL);
