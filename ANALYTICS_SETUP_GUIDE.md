# Analytics Setup Guide

## Overview
This guide explains the analytics features and the required BI Supabase functions for ATLAS Hostel.

## Changes Made

### 1. Currency Support
- Added `currency` field to `properties` table (defaults to 'USD')
- ATLAS Hostel is set to use HKD
- Currency is automatically displayed in all analytics components

### 2. New Analytics Components

#### Daily Performance Chart (`DailyPerformanceChart.tsx`)
Displays three visualizations:
- **Daily Occupancy %**: Area chart showing occupancy trends
- **Daily Revenue**: Bar chart showing daily revenue in property currency
- **ADR & Rooms Sold**: Combined chart with ADR (line) and rooms sold (bars)

#### Weekly Pickup Comparison (`WeeklyPickupComparison.tsx`)
Shows week-over-week comparison:
- Revenue, Reservations, Nights, Occupancy, ADR
- Percentage change indicators (up/down arrows)
- Visual comparison chart

### 3. Tab Organization
- **Overview Tab**: High-level KPIs, revenue performance, channel mix, occupancy, room types
- **Snapshot Tab**: Detailed metrics + new daily performance charts
- **Pickup Analysis Tab**: Week-over-week pickup comparison

## Required BI Supabase Functions

You need to create these two RPC functions in your BI Supabase database:

### Function 1: `rpc_get_daily_performance`

```sql
CREATE OR REPLACE FUNCTION rpc_get_daily_performance(p_property_id UUID)
RETURNS TABLE (
  date TEXT,
  occupancy NUMERIC,
  revenue NUMERIC,
  adr NUMERIC,
  rooms_sold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(stay_date, 'YYYY-MM-DD') as date,
    COALESCE(SUM(occupancy_percentage), 0) as occupancy,
    COALESCE(SUM(room_revenue), 0) as revenue,
    CASE 
      WHEN SUM(rooms_sold) > 0 THEN SUM(room_revenue) / SUM(rooms_sold)
      ELSE 0 
    END as adr,
    COALESCE(SUM(rooms_sold), 0)::INTEGER as rooms_sold
  FROM your_daily_metrics_table  -- Replace with your actual table name
  WHERE property_id = p_property_id
  GROUP BY stay_date
  ORDER BY stay_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Function 2: `rpc_get_weekly_pickup`

```sql
CREATE OR REPLACE FUNCTION rpc_get_weekly_pickup(p_property_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH this_week AS (
    SELECT 
      COALESCE(SUM(revenue), 0) as revenue,
      COALESCE(COUNT(DISTINCT reservation_id), 0) as reservations,
      COALESCE(SUM(nights), 0) as nights,
      COALESCE(AVG(occupancy), 0) as occupancy,
      CASE 
        WHEN SUM(nights) > 0 THEN SUM(revenue) / SUM(nights)
        ELSE 0 
      END as adr
    FROM your_reservations_table  -- Replace with your actual table name
    WHERE property_id = p_property_id
      AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
      AND created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
  ),
  last_week AS (
    SELECT 
      COALESCE(SUM(revenue), 0) as revenue,
      COALESCE(COUNT(DISTINCT reservation_id), 0) as reservations,
      COALESCE(SUM(nights), 0) as nights,
      COALESCE(AVG(occupancy), 0) as occupancy,
      CASE 
        WHEN SUM(nights) > 0 THEN SUM(revenue) / SUM(nights)
        ELSE 0 
      END as adr
    FROM your_reservations_table  -- Replace with your actual table name
    WHERE property_id = p_property_id
      AND created_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
      AND created_at < DATE_TRUNC('week', CURRENT_DATE)
  )
  SELECT json_build_object(
    'this_week', row_to_json(tw),
    'last_week', row_to_json(lw)
  ) INTO result
  FROM this_week tw, last_week lw;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Data Structure Requirements

For these functions to work correctly, your BI Supabase needs tables with:

### Daily Metrics Table
Should contain columns like:
- `property_id` (UUID)
- `stay_date` (DATE)
- `occupancy_percentage` (NUMERIC)
- `room_revenue` (NUMERIC)
- `rooms_sold` (INTEGER)

### Reservations Table
Should contain columns like:
- `property_id` (UUID)
- `reservation_id` (UUID or TEXT)
- `created_at` (TIMESTAMP)
- `revenue` (NUMERIC)
- `nights` (INTEGER)
- `occupancy` (NUMERIC)

## Next Steps

1. **Verify Data Structure**: Check that your BI Supabase has tables matching the structure above
2. **Create RPC Functions**: Run the SQL commands to create both functions
3. **Test Functions**: 
   ```sql
   -- Test daily performance
   SELECT * FROM rpc_get_daily_performance('0f95160f-fe69-47d5-93a0-f9e9fc15fcf8');
   
   -- Test weekly pickup
   SELECT * FROM rpc_get_weekly_pickup('0f95160f-fe69-47d5-93a0-f9e9fc15fcf8');
   ```
4. **Adjust Queries**: Modify the function queries to match your actual table and column names
5. **Check Permissions**: Ensure the functions have proper RLS policies

## Current Property IDs

- **ATLAS Hostel**: `0f95160f-fe69-47d5-93a0-f9e9fc15fcf8`

## Troubleshooting

If data doesn't appear:
1. Check browser console for errors
2. Verify RPC functions exist in BI Supabase
3. Ensure table/column names match your schema
4. Verify property_id is correct
5. Check that data exists for the selected property

## Features Included

✅ Currency support per property (HKD for ATLAS Hostel)
✅ Daily occupancy visualization (area chart)
✅ Daily revenue visualization (bar chart)
✅ ADR and rooms sold combined chart
✅ Weekly pickup analysis with comparison
✅ Percentage change indicators
✅ Responsive design
✅ Proper error handling and loading states