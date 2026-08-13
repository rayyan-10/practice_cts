# Predictive Analysis Feature

## Overview

The **Predictive Analysis** feature has been added to the CMS/Payer portal, allowing administrators to generate AI-powered insights and predictions for ACO performance.

## Access

**Location**: Payer Dashboard → Analysis Card (previously "Financial Performance")

**Route**: `/payer/analysis`

**User Role**: PAYER only

## Features

### 1. **Year Selection**
- Select one or multiple years for analysis
- Available range: 2016 - 2026
- Bulk actions: "Select All" / "Clear All"
- Visual feedback for selected years

### 2. **ACO Selection**
- Choose one or multiple ACOs to analyze
- Pre-configured ACO list:
  - Pioneer Health Network
  - Community Care Alliance
  - Regional Medical Group
  - Integrated Health Systems
  - Metro Health Partners
  - Valley Care Network
- Bulk actions: "Select All" / "Clear All"
- Interactive selection with visual feedback

### 3. **Analysis Types**

Users can select from 5 different analysis types:

#### **Future Risks**
- Icon: AlertTriangle
- Description: Predict potential risk factors
- Output: Risk level predictions for future years with probability scores

#### **Performance**
- Icon: TrendingUp
- Description: Analyze performance trends
- Output: Quality scores, savings trends, top/bottom performers

#### **Twin ACOs**
- Icon: Users
- Description: Compare with similar ACOs
- Output: Matching ACOs with similarity scores and comparative metrics

#### **Risks**
- Icon: Target
- Description: Identify current risk areas
- Output: Risk distribution (High/Medium/Low) and critical issues

#### **Improvement**
- Icon: Sparkles
- Description: Suggest improvement opportunities
- Output: Categorized recommendations with impact levels and potential savings

### 4. **View Analysis Button**
- Large, prominent call-to-action button
- Shows loading state with spinner during analysis
- Displays selection summary
- Disabled until all selections are made

## User Flow

### Step 1: Navigate to Analysis
1. Login as a PAYER user
2. Go to Payer Dashboard
3. Click the "Analysis" card (center position in Quick Actions)

### Step 2: Configure Analysis
1. **Select Years**: Click on year chips or use Select All
2. **Select ACOs**: Click on ACO cards or use Select All
3. **Select Analysis Types**: Click on analysis type cards with descriptions
4. Review the summary at the bottom

### Step 3: Generate Analysis
1. Click "View Analysis" button
2. Wait for analysis generation (2.5 second simulation)
3. Loading state displays "Generating Analysis..." with spinner

### Step 4: View Results
- Results display in organized cards
- Each analysis type shows relevant visualizations
- Color-coded risk levels and impact scores
- Actionable insights with specific recommendations

### Step 5: Actions
- **New Analysis**: Click "New Analysis" to reconfigure
- **Back to Dashboard**: Navigate back using "Back to Dashboard" button

## Design Features

### Visual Polish
- ✅ Smooth animations on page load
- ✅ Interactive hover states on all selection cards
- ✅ Color-coded visual feedback for selections
- ✅ Loading spinner during analysis generation
- ✅ Professional gradient background on CTA
- ✅ Responsive grid layouts
- ✅ Icon-based visual hierarchy

### UX Enhancements
- Bulk selection/deselection for efficiency
- Real-time selection counter
- Disabled state prevents premature submission
- Clear visual distinction between selected/unselected items
- Checkbox integration with card clicks
- Back navigation available at all times

## Backend Integration

### API Endpoint (To Be Implemented)

```typescript
POST /api/analysis

Request Body:
{
  "years": [2026, 2025, 2024],
  "acos": ["aco-001", "aco-002"],
  "analysisTypes": ["future-risks", "performance", "improvement"]
}

Response:
{
  "results": [
    {
      "type": "future-risks",
      "title": "Future Risk Prediction",
      "content": {
        // Analysis data structure
      }
    },
    // ... more results
  ]
}
```

### Current Implementation

The feature currently includes:
- ✅ Complete frontend UI
- ✅ Mock data generation
- ✅ API call structure (commented out)
- ⏳ Backend endpoint (to be implemented)

To integrate with your backend:

1. Uncomment the API call in `PayerAnalysis.tsx` (line ~280)
2. Replace the mock data with actual API response
3. Ensure backend returns data matching the expected structure

## Files Modified/Created

### New Files
- `src/pages/payer/PayerAnalysis.tsx` - Main analysis page
- `src/components/ui/checkbox.tsx` - Checkbox UI component
- `ANALYSIS_FEATURE.md` - This documentation

### Modified Files
- `src/pages/payer/PayerDashboard.tsx` - Changed "Financial Performance" to "Analysis"
- `src/App.tsx` - Added `/payer/analysis` route
- `src/index.css` - Added custom animations

## Testing Checklist

- [ ] Login as PAYER user
- [ ] Navigate to Analysis from dashboard
- [ ] Select multiple years
- [ ] Select multiple ACOs
- [ ] Select multiple analysis types
- [ ] Test bulk Select All / Clear All functions
- [ ] Click View Analysis with incomplete selections (should show alert)
- [ ] Click View Analysis with complete selections
- [ ] Verify loading state displays
- [ ] Verify results display correctly
- [ ] Test New Analysis button
- [ ] Test Back to Dashboard navigation
- [ ] Verify logout functionality

## Future Enhancements

1. **Export Results**: Add PDF/CSV export functionality
2. **Saved Analyses**: Store analysis configurations for quick re-run
3. **Scheduled Reports**: Automatic generation and email delivery
4. **Custom Date Ranges**: Allow specific date range selection
5. **Comparison Mode**: Compare two analysis results side-by-side
6. **Real-time Updates**: WebSocket integration for live data
7. **Advanced Filters**: Filter by ACO size, region, program type
8. **Visualization Charts**: Add interactive charts using Recharts
9. **AI Insights Summary**: Natural language summary of key findings
10. **Recommendation Actions**: One-click actions from recommendations

## Technical Notes

- Uses React hooks for state management
- Fully TypeScript typed
- Responsive design (mobile-friendly)
- Accessibility compliant (keyboard navigation, ARIA labels)
- Performance optimized (lazy loading, memoization ready)
- Dark mode compatible

## Support

For questions or issues with the Analysis feature:
1. Check browser console for errors
2. Verify PAYER role assignment
3. Ensure all required selections are made
4. Check network tab for API call status (when backend is implemented)
