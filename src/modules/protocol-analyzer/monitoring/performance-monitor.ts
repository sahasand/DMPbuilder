// Performance Monitoring and Optimization for Protocol Analyzer
import { createModuleLogger, logInfo, logWarning, measurePerformance } from '../../../utils/logger';
import { EventEmitter } from 'events';

const logger = createModuleLogger('protocol-analyzer-performance');

export interface PerformanceMetrics {
  analysisId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  phases: {
    [phaseName: string]: {
      startTime: Date;
      endTime?: Date;
      duration?: number;
      memoryUsage?: NodeJS.MemoryUsage;
      cpuUsage?: NodeJS.CpuUsage;
    };
  };
  totalMemoryUsage: {
    peak: number;
    average: number;
    final: number;
  };
  resourceUtilization: {
    maxCpuPercent: number;
    avgCpuPercent: number;
    maxMemoryMB: number;
    avgMemoryMB: number;
  };
  throughput: {
    itemsProcessed: number;
    itemsPerSecond?: number;
  };
  errors: {
    count: number;
    recoverable: number;
    critical: number;
  };
  optimization: {
    suggestions: string[];
    bottlenecks: string[];
    score: number; // 0-100
  };
}

export interface PerformanceThresholds {
  maxAnalysisTime: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  minThroughput: number; // items per second
  warningThresholds: {
    analysisTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface OptimizationRecommendation {
  category: 'Performance' | 'Memory' | 'CPU' | 'Throughput' | 'Architecture';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  issue: string;
  recommendation: string;
  expectedImprovement: string;
  implementationComplexity: 'Low' | 'Medium' | 'High';
  estimatedCost: 'Low' | 'Medium' | 'High';
}

export class PerformanceMonitor extends EventEmitter {
  private activeAnalyses = new Map<string, PerformanceMetrics>();
  private historicalMetrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private maxHistorySize = 1000;
  private monitoringInterval?: NodeJS.Timeout;
  private cpuBaseline?: NodeJS.CpuUsage;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();
    this.thresholds = {
      maxAnalysisTime: 300000, // 5 minutes
      maxMemoryUsage: 2048, // 2GB
      maxCpuUsage: 80, // 80%
      minThroughput: 0.1, // 0.1 analyses per second
      warningThresholds: {
        analysisTime: 180000, // 3 minutes
        memoryUsage: 1024, // 1GB
        cpuUsage: 60 // 60%
      },
      ...thresholds
    };

    this.startMonitoring();
  }

  /**
   * Start monitoring an analysis
   */
  startAnalysis(analysisId: string): void {
    const startTime = new Date();
    this.cpuBaseline = process.cpuUsage();
    
    const metrics: PerformanceMetrics = {
      analysisId,
      startTime,
      phases: {},
      totalMemoryUsage: {
        peak: 0,
        average: 0,
        final: 0
      },
      resourceUtilization: {
        maxCpuPercent: 0,
        avgCpuPercent: 0,
        maxMemoryMB: 0,
        avgMemoryMB: 0
      },
      throughput: {
        itemsProcessed: 0
      },
      errors: {
        count: 0,
        recoverable: 0,
        critical: 0
      },
      optimization: {
        suggestions: [],
        bottlenecks: [],
        score: 100
      }
    };

    this.activeAnalyses.set(analysisId, metrics);
    
    logInfo('Performance monitoring started', {
      analysisId,
      startTime,
      initialMemory: this.getCurrentMemoryUsage()
    });

    this.emit('analysisStarted', { analysisId, metrics });
  }

  /**
   * Start monitoring a specific phase
   */
  startPhase(analysisId: string, phaseName: string): void {
    const metrics = this.activeAnalyses.get(analysisId);
    if (!metrics) {
      logWarning('Cannot start phase - analysis not found', { analysisId, phaseName });
      return;
    }

    metrics.phases[phaseName] = {
      startTime: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.cpuBaseline)
    };

    logInfo('Performance phase started', { analysisId, phaseName });
  }

  /**
   * End monitoring a specific phase
   */
  endPhase(analysisId: string, phaseName: string, itemsProcessed?: number): void {
    const metrics = this.activeAnalyses.get(analysisId);
    if (!metrics || !metrics.phases[phaseName]) {
      logWarning('Cannot end phase - phase not found', { analysisId, phaseName });
      return;
    }

    const phase = metrics.phases[phaseName];
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime.getTime();

    if (itemsProcessed !== undefined) {
      metrics.throughput.itemsProcessed += itemsProcessed;
    }

    // Check for performance issues in this phase
    this.checkPhasePerformance(analysisId, phaseName, phase);

    logInfo('Performance phase completed', {
      analysisId,
      phaseName,
      duration: phase.duration,
      itemsProcessed
    });

    this.emit('phaseCompleted', { analysisId, phaseName, phase });
  }

  /**
   * Record an error during analysis
   */
  recordError(analysisId: string, error: Error, isCritical: boolean = false): void {
    const metrics = this.activeAnalyses.get(analysisId);
    if (!metrics) return;

    metrics.errors.count++;
    if (isCritical) {
      metrics.errors.critical++;
    } else {
      metrics.errors.recoverable++;
    }

    // Adjust optimization score based on errors
    const errorPenalty = isCritical ? 10 : 5;
    metrics.optimization.score = Math.max(0, metrics.optimization.score - errorPenalty);
  }

  /**
   * End monitoring an analysis
   */
  async endAnalysis(analysisId: string): Promise<PerformanceMetrics | null> {
    const metrics = this.activeAnalyses.get(analysisId);
    if (!metrics) {
      logWarning('Cannot end analysis - analysis not found', { analysisId });
      return null;
    }

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();

    // Calculate final memory usage
    const finalMemory = this.getCurrentMemoryUsage();
    metrics.totalMemoryUsage.final = finalMemory;

    // Calculate throughput
    if (metrics.duration > 0) {
      metrics.throughput.itemsPerSecond = metrics.throughput.itemsProcessed / (metrics.duration / 1000);
    }

    // Generate optimization analysis
    await this.generateOptimizationAnalysis(metrics);

    // Check overall performance
    this.checkOverallPerformance(metrics);

    // Move to historical data
    this.activeAnalyses.delete(analysisId);
    this.addToHistory(metrics);

    logInfo('Performance monitoring completed', {
      analysisId,
      duration: metrics.duration,
      memoryPeak: metrics.totalMemoryUsage.peak,
      optimizationScore: metrics.optimization.score
    });

    this.emit('analysisCompleted', { analysisId, metrics });

    return metrics;
  }

  /**
   * Get current performance summary
   */
  getCurrentPerformanceSummary(): {
    activeAnalyses: number;
    averageAnalysisTime: number;
    averageMemoryUsage: number;
    averageOptimizationScore: number;
    recentBottlenecks: string[];
    systemHealth: 'Excellent' | 'Good' | 'Warning' | 'Critical';
  } {
    const recentMetrics = this.historicalMetrics.slice(-10);
    
    const averageAnalysisTime = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / Math.max(recentMetrics.length, 1);
    const averageMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.totalMemoryUsage.peak, 0) / Math.max(recentMetrics.length, 1);
    const averageOptimizationScore = recentMetrics.reduce((sum, m) => sum + m.optimization.score, 0) / Math.max(recentMetrics.length, 1);
    
    const recentBottlenecks = recentMetrics
      .flatMap(m => m.optimization.bottlenecks)
      .filter((bottleneck, index, array) => array.indexOf(bottleneck) === index)
      .slice(0, 5);

    const systemHealth = this.assessSystemHealth(averageAnalysisTime, averageMemoryUsage, averageOptimizationScore);

    return {
      activeAnalyses: this.activeAnalyses.size,
      averageAnalysisTime,
      averageMemoryUsage,
      averageOptimizationScore,
      recentBottlenecks,
      systemHealth
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const summary = this.getCurrentPerformanceSummary();

    // Performance recommendations
    if (summary.averageAnalysisTime > this.thresholds.warningThresholds.analysisTime) {
      recommendations.push({
        category: 'Performance',
        priority: summary.averageAnalysisTime > this.thresholds.maxAnalysisTime ? 'Critical' : 'High',
        issue: 'Analysis time exceeds optimal thresholds',
        recommendation: 'Implement parallel processing for independent analysis components',
        expectedImprovement: '30-50% reduction in analysis time',
        implementationComplexity: 'Medium',
        estimatedCost: 'Medium'
      });
    }

    // Memory recommendations
    if (summary.averageMemoryUsage > this.thresholds.warningThresholds.memoryUsage) {
      recommendations.push({
        category: 'Memory',
        priority: summary.averageMemoryUsage > this.thresholds.maxMemoryUsage ? 'Critical' : 'High',
        issue: 'High memory usage detected',
        recommendation: 'Implement streaming processing and data chunking for large protocols',
        expectedImprovement: '40-60% reduction in memory usage',
        implementationComplexity: 'High',
        estimatedCost: 'Medium'
      });
    }

    // System health recommendations
    if (summary.systemHealth === 'Warning' || summary.systemHealth === 'Critical') {
      recommendations.push({
        category: 'Architecture',
        priority: summary.systemHealth === 'Critical' ? 'Critical' : 'High',
        issue: 'Overall system performance degradation',
        recommendation: 'Scale infrastructure and implement load balancing',
        expectedImprovement: 'Improved system reliability and performance',
        implementationComplexity: 'High',
        estimatedCost: 'High'
      });
    }

    // Bottleneck-specific recommendations
    if (summary.recentBottlenecks.includes('Risk Assessment')) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        issue: 'Risk assessment is a performance bottleneck',
        recommendation: 'Cache risk calculation results and optimize risk factor algorithms',
        expectedImprovement: '20-30% improvement in risk assessment speed',
        implementationComplexity: 'Low',
        estimatedCost: 'Low'
      });
    }

    if (summary.recentBottlenecks.includes('Endpoint Analysis')) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        issue: 'Endpoint analysis taking longer than expected',
        recommendation: 'Pre-compute common endpoint patterns and use lookup tables',
        expectedImprovement: '25-40% improvement in endpoint analysis speed',
        implementationComplexity: 'Medium',
        estimatedCost: 'Low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get detailed metrics for analysis
   */
  getAnalysisMetrics(analysisId: string): PerformanceMetrics | null {
    return this.activeAnalyses.get(analysisId) || 
           this.historicalMetrics.find(m => m.analysisId === analysisId) || null;
  }

  /**
   * Get historical performance trends
   */
  getPerformanceTrends(days: number = 7): {
    analysisTimesTrend: { date: string; avgTime: number }[];
    memoryUsageTrend: { date: string; avgMemory: number }[];
    optimizationScoreTrend: { date: string; avgScore: number }[];
    errorRateTrend: { date: string; errorRate: number }[];
  } {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentMetrics = this.historicalMetrics.filter(m => m.startTime >= cutoffDate);
    
    // Group by day
    const dailyGroups = new Map<string, PerformanceMetrics[]>();
    recentMetrics.forEach(metric => {
      const dateKey = metric.startTime.toISOString().split('T')[0];
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(metric);
    });

    const analysisTimesTrend: { date: string; avgTime: number }[] = [];
    const memoryUsageTrend: { date: string; avgMemory: number }[] = [];
    const optimizationScoreTrend: { date: string; avgScore: number }[] = [];
    const errorRateTrend: { date: string; errorRate: number }[] = [];

    dailyGroups.forEach((metrics, date) => {
      const avgTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length;
      const avgMemory = metrics.reduce((sum, m) => sum + m.totalMemoryUsage.peak, 0) / metrics.length;
      const avgScore = metrics.reduce((sum, m) => sum + m.optimization.score, 0) / metrics.length;
      const totalErrors = metrics.reduce((sum, m) => sum + m.errors.count, 0);
      const errorRate = totalErrors / metrics.length;

      analysisTimesTrend.push({ date, avgTime });
      memoryUsageTrend.push({ date, avgMemory });
      optimizationScoreTrend.push({ date, avgScore });
      errorRateTrend.push({ date, errorRate });
    });

    return {
      analysisTimesTrend: analysisTimesTrend.sort((a, b) => a.date.localeCompare(b.date)),
      memoryUsageTrend: memoryUsageTrend.sort((a, b) => a.date.localeCompare(b.date)),
      optimizationScoreTrend: optimizationScoreTrend.sort((a, b) => a.date.localeCompare(b.date)),
      errorRateTrend: errorRateTrend.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  /**
   * Private helper methods
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateResourceUtilization();
    }, 5000); // Update every 5 seconds
  }

  private updateResourceUtilization(): void {
    const currentMemory = this.getCurrentMemoryUsage();
    
    this.activeAnalyses.forEach((metrics, analysisId) => {
      // Update peak memory usage
      metrics.totalMemoryUsage.peak = Math.max(metrics.totalMemoryUsage.peak, currentMemory);
      
      // Update average memory usage
      const duration = Date.now() - metrics.startTime.getTime();
      const sampleCount = Math.max(1, Math.floor(duration / 5000)); // 5-second samples
      metrics.totalMemoryUsage.average = 
        (metrics.totalMemoryUsage.average * (sampleCount - 1) + currentMemory) / sampleCount;
    });
  }

  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private checkPhasePerformance(analysisId: string, phaseName: string, phase: any): void {
    const metrics = this.activeAnalyses.get(analysisId)!;
    
    // Check for slow phases
    if (phase.duration > 30000) { // 30 seconds
      metrics.optimization.bottlenecks.push(phaseName);
      metrics.optimization.score = Math.max(0, metrics.optimization.score - 5);
    }

    // Check memory usage during phase
    if (phase.memoryUsage && phase.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      metrics.optimization.suggestions.push(`Optimize memory usage in ${phaseName} phase`);
    }
  }

  private checkOverallPerformance(metrics: PerformanceMetrics): void {
    // Check overall duration
    if (metrics.duration && metrics.duration > this.thresholds.maxAnalysisTime) {
      metrics.optimization.suggestions.push('Overall analysis time exceeds recommended limits');
      metrics.optimization.score = Math.max(0, metrics.optimization.score - 15);
    }

    // Check memory usage
    if (metrics.totalMemoryUsage.peak > this.thresholds.maxMemoryUsage) {
      metrics.optimization.suggestions.push('Peak memory usage exceeds recommended limits');
      metrics.optimization.score = Math.max(0, metrics.optimization.score - 10);
    }

    // Check error rate
    const errorRate = metrics.errors.count / Math.max(1, metrics.throughput.itemsProcessed);
    if (errorRate > 0.1) { // 10% error rate
      metrics.optimization.suggestions.push('High error rate detected - review data quality');
      metrics.optimization.score = Math.max(0, metrics.optimization.score - 20);
    }
  }

  private async generateOptimizationAnalysis(metrics: PerformanceMetrics): Promise<void> {
    // Analyze phase performance
    const phaseAnalysis = Object.entries(metrics.phases).map(([name, phase]) => ({
      name,
      duration: phase.duration || 0,
      percentage: ((phase.duration || 0) / (metrics.duration || 1)) * 100
    })).sort((a, b) => b.duration - a.duration);

    // Identify bottlenecks
    phaseAnalysis.forEach(phase => {
      if (phase.percentage > 40) {
        metrics.optimization.bottlenecks.push(phase.name);
      }
    });

    // Generate suggestions based on analysis
    if (metrics.duration && metrics.duration > this.thresholds.warningThresholds.analysisTime) {
      if (phaseAnalysis.length > 0) {
        const slowestPhase = phaseAnalysis[0];
        metrics.optimization.suggestions.push(
          `Focus optimization on ${slowestPhase.name} phase (${slowestPhase.percentage.toFixed(1)}% of total time)`
        );
      }
    }

    if (metrics.totalMemoryUsage.peak > this.thresholds.warningThresholds.memoryUsage) {
      metrics.optimization.suggestions.push('Consider implementing streaming processing for large data sets');
    }

    if (metrics.throughput.itemsPerSecond && metrics.throughput.itemsPerSecond < this.thresholds.minThroughput) {
      metrics.optimization.suggestions.push('Throughput below optimal levels - consider parallel processing');
    }
  }

  private assessSystemHealth(avgTime: number, avgMemory: number, avgScore: number): 'Excellent' | 'Good' | 'Warning' | 'Critical' {
    let healthScore = 100;

    // Time impact
    if (avgTime > this.thresholds.maxAnalysisTime) healthScore -= 30;
    else if (avgTime > this.thresholds.warningThresholds.analysisTime) healthScore -= 15;

    // Memory impact
    if (avgMemory > this.thresholds.maxMemoryUsage) healthScore -= 25;
    else if (avgMemory > this.thresholds.warningThresholds.memoryUsage) healthScore -= 10;

    // Optimization score impact
    if (avgScore < 60) healthScore -= 20;
    else if (avgScore < 80) healthScore -= 10;

    if (healthScore >= 90) return 'Excellent';
    if (healthScore >= 75) return 'Good';
    if (healthScore >= 50) return 'Warning';
    return 'Critical';
  }

  private addToHistory(metrics: PerformanceMetrics): void {
    this.historicalMetrics.push(metrics);
    
    // Maintain maximum history size
    if (this.historicalMetrics.length > this.maxHistorySize) {
      this.historicalMetrics = this.historicalMetrics.slice(-this.maxHistorySize);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();