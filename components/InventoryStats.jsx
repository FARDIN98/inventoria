'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAsyncOperation } from '@/lib/hooks/useAsyncOperation';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Hash, 
  Eye, 
  EyeOff,
  Info,
  Database
} from 'lucide-react';
import { generateAggregates } from '@/lib/utils/custom-fields-utils';
import { FIELD_TYPES } from '@/lib/utils/custom-fields-constants';

// Field type icons mapping
const FIELD_TYPE_ICONS = {
  [FIELD_TYPES.TEXT]: '📝',
  [FIELD_TYPES.TEXTAREA]: '📄',
  [FIELD_TYPES.NUMBER]: '🔢',
  [FIELD_TYPES.DOCUMENT]: '🔗',
  [FIELD_TYPES.BOOLEAN]: '☑️'
};

export default function InventoryStats({ inventory, items = [], fieldTemplates = [] }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  
  const asyncFunction = useMemo(() => async () => {
    const aggregates = await generateAggregates(items, fieldTemplates);
    setStats(aggregates);
    return aggregates;
  }, [items, fieldTemplates]);
  
  const { loading, error, execute: calculateStatsAsync } = useAsyncOperation(
    asyncFunction,
    {
      initialLoading: true,
      onError: (err) => {
        console.error('Error calculating statistics:', err);
      }
    }
  );

  useEffect(() => {
    calculateStatsAsync();
  }, [items, fieldTemplates]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Statistics Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to generate statistics for this inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatPercentage = (value) => {
    return typeof value === 'string' ? value : `${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat().format(value);
  };

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('inventory.stats.overview')}
          </CardTitle>
          <CardDescription>
            {t('inventory.stats.overviewDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.totalItems)}</p>
                <p className="text-sm text-blue-700">Total Items</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {formatNumber(stats.fixedFieldStats?.creators?.uniqueCreators || 0)}
                </p>
                <p className="text-sm text-green-700">Contributors</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Hash className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatNumber(stats.fixedFieldStats?.customId?.totalUnique || 0)}
                </p>
                <p className="text-sm text-purple-700">Unique IDs</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.fixedFieldStats?.dateRange?.daysSinceFirst || 0}
                </p>
                <p className="text-sm text-orange-700">Days Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields Statistics */}
      {fieldTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('inventory.stats.customFields')}
            </CardTitle>
            <CardDescription>
              {t('inventory.stats.customFieldsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(stats.fieldStats || {}).map(([fieldKey, fieldStat]) => {
                const template = fieldStat.template;
                if (!template) return null;

                return (
                  <div key={fieldKey} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {FIELD_TYPE_ICONS[template.fieldType] || '📋'}
                        </span>
                        <div>
                          <h4 className="font-semibold">{template.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.description || `${template.fieldType} field`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.fieldType}</Badge>
                        {template.isVisible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Fill Rate */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Fill Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {formatPercentage(fieldStat.stats.fillRate)}
                          </span>
                        </div>
                        <Progress 
                          value={parseFloat(fieldStat.stats.fillRate)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">
                          {fieldStat.stats.totalValues} of {stats.totalItems} items
                        </p>
                      </div>

                      {/* Type-specific statistics */}
                      {template.fieldType === FIELD_TYPES.TEXT || template.fieldType === FIELD_TYPES.TEXTAREA ? (
                        <>
                          <div>
                            <p className="text-sm font-medium">Unique Values</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.uniqueValues)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Avg Length</p>
                            <p className="text-2xl font-bold">{fieldStat.stats.averageLength}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Most Common</p>
                            <div className="space-y-1">
                              {fieldStat.stats.mostCommon?.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">{item.value}</span>
                                  <span className="text-muted-foreground ml-1">({item.count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : template.fieldType === FIELD_TYPES.NUMBER ? (
                        <>
                          <div>
                            <p className="text-sm font-medium">Min Value</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.min)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Max Value</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.max)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Average</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.average)}</p>
                          </div>
                        </>
                      ) : template.fieldType === FIELD_TYPES.BOOLEAN ? (
                        <>
                          <div>
                            <p className="text-sm font-medium">True Count</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.trueCount)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">False Count</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.falseCount)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">True Rate</p>
                            <p className="text-2xl font-bold">{formatPercentage(fieldStat.stats.truePercentage)}</p>
                          </div>
                        </>
                      ) : template.fieldType === FIELD_TYPES.DOCUMENT ? (
                        <>
                          <div>
                            <p className="text-sm font-medium">Unique URLs</p>
                            <p className="text-2xl font-bold">{formatNumber(fieldStat.stats.uniqueUrls)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Domains</p>
                            <div className="space-y-1">
                              {Object.entries(fieldStat.stats.domains || {}).slice(0, 2).map(([domain, count]) => (
                                <div key={domain} className="text-xs">
                                  <span className="font-medium">{domain}</span>
                                  <span className="text-muted-foreground ml-1">({count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div></div>
                        </>
                      ) : (
                        <div className="col-span-3">
                          <p className="text-sm text-muted-foreground">No additional statistics available for this field type.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Custom Fields Message */}
      {fieldTemplates.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t('inventory.stats.noCustomFields')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('inventory.stats.noCustomFieldsDescription')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}